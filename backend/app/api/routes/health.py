from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "quizforge-api"}


@router.get("/runtime")
def runtime() -> dict[str, str | bool]:
    settings = get_settings()
    live = settings.llm_provider.lower() == "groq" and bool(settings.groq_api_key)
    return {"provider": "groq" if live else "demo", "live": live}
