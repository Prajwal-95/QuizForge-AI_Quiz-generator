from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import httpx
import jwt as pyjwt

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.db.database import get_db
from app.models import User
from app.schemas import GoogleTokenIn, TokenResponse, UserCreate, UserLogin

router = APIRouter(prefix="/auth", tags=["auth"])

# Google's public OAuth2 signing certs, cached in-process (refresh if fetch fails).
_GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_google_certs: dict | None = None


def user_payload(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email}


@router.post("/register", response_model=TokenResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    exists = db.query(User).filter(User.email == email).first()
    if exists:
        raise HTTPException(409, "An account with this email already exists.")
    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_access_token(user.id), "user": user_payload(user)}


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        # A valid password_hash is required for email/password login, so a
        # Google-only account can't be brute-forced through this endpoint.
        raise HTTPException(401, "Invalid email or password.")
    return {"token": create_access_token(user.id), "user": user_payload(user)}


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleTokenIn, db: Session = Depends(get_db)):
    """Exchange a Google ID token (from Sign in with Google) for a QuizForge session."""
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(403, "Google sign-in is not enabled on this server.")
    try:
        info = _verify_google_id_token(payload.credential, settings.google_client_id)
    except ValueError as exc:
        raise HTTPException(401, str(exc))

    email = (info.get("email") or "").strip().lower()
    if not email or not info.get("email_verified"):
        raise HTTPException(401, "Your Google account email could not be verified.")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        name = (info.get("name") or info.get("email") or "User").strip()[:120] or "User"
        user = User(name=name, email=email, password_hash=None)
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"token": create_access_token(user.id), "user": user_payload(user)}


def _verify_google_id_token(credential: str, client_id: str) -> dict:
    """Verify the JWT from Google and return its claims (iss, aud, email, ...)."""
    global _google_certs
    try:
        if _google_certs is None:
            _google_certs = httpx.get(_GOOGLE_CERTS_URL, timeout=15).json()
        claims = pyjwt.decode(
            credential,
            _google_certs,
            algorithms=["RS256"],
            audience=client_id,
        )
    except (pyjwt.PyJWTError, httpx.HTTPError, ValueError) as exc:
        # Refresh the cached certs and retry once before failing.
        _google_certs = None
        try:
            _google_certs = httpx.get(_GOOGLE_CERTS_URL, timeout=15).json()
            claims = pyjwt.decode(
                credential,
                _google_certs,
                algorithms=["RS256"],
                audience=client_id,
            )
        except (pyjwt.PyJWTError, httpx.HTTPError, ValueError) as retry_exc:
            raise ValueError("Could not verify your Google sign-in with Google's servers.") from retry_exc

    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("The Google sign-in token came from an unexpected issuer.")
    return claims


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_payload(user)
