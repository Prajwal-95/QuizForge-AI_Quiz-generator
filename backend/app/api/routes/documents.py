from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

import httpx

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Document, DocumentChunk, User
from app.schemas import UrlFetchRequest
from app.services.document_processor import chunk_text, extract_document, html_to_text

router = APIRouter(prefix="/documents", tags=["documents"])

USER_AGENT = "QuizForge/1.0 (assessment generator; educational use)"


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await file.read()
    if len(content) > get_settings().max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, "The uploaded file is larger than the configured limit.")
    try:
        text, pages = extract_document(file.filename or "", content)
    except (ValueError, UnicodeError) as error:
        raise HTTPException(400, {"error": "DOCUMENT_EXTRACTION_FAILED", "message": str(error)}) from error
    except Exception as error:
        raise HTTPException(422, {"error": "DOCUMENT_EXTRACTION_FAILED", "message": "The PDF could not be read. Make sure it is not corrupted or password protected."}) from error
    if not text:
        raise HTTPException(422, "The uploaded document does not contain extractable text.")
    document = Document(name=file.filename or "untitled", source_type=(file.filename or "").rsplit(".", 1)[-1], text=text, pages=pages, characters=len(text))
    db.add(document); db.flush()
    chunks = chunk_text(text)
    for index, chunk in enumerate(chunks):
        db.add(DocumentChunk(document_id=document.id, chunk_index=index, text=chunk, metadata_json={"chunk_id": f"{document.id}-{index}"}))
    db.commit(); db.refresh(document)
    return {"id": document.id, "name": document.name, "pages": pages, "characters": len(text), "chunks": len(chunks), "text": text, "status": "processed"}


@router.post("/fetch-url")
async def fetch_url(
    payload: UrlFetchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    url = payload.url.strip()
    try:
        response = httpx.get(url, headers={"User-Agent": USER_AGENT}, timeout=35, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(422, {"error": "URL_FETCH_FAILED", "message": f"Could not retrieve the page. Check the URL or try again: {error}"}) from error
    content = response.content
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, "The retrieved page is larger than the configured limit.")
    content_type = response.headers.get("content-type", "").lower()
    name = url.split("//", 1)[-1].split("/", 1)[0] or "webpage"
    try:
        if "pdf" in content_type:
            text, pages = extract_document("page.pdf", content)
        elif "html" in content_type or name.endswith((".htm", ".html")):
            text = html_to_text(content.decode("utf-8", errors="replace"))
            pages = 1
        else:
            text = content.decode("utf-8", errors="replace")
            pages = 1
    except Exception as error:
        raise HTTPException(422, {"error": "URL_FETCH_FAILED", "message": "The page could not be read as text."}) from error
    if not text:
        raise HTTPException(422, "The page does not contain extractable text.")
    document = Document(name=name, source_type="url", text=text, pages=pages, characters=len(text))
    db.add(document); db.flush()
    chunks = chunk_text(text)
    for index, chunk in enumerate(chunks):
        db.add(DocumentChunk(document_id=document.id, chunk_index=index, text=chunk, metadata_json={"chunk_id": f"{document.id}-{index}", "source_url": url}))
    db.commit(); db.refresh(document)
    return {"id": document.id, "name": document.name, "pages": pages, "characters": len(text), "chunks": len(chunks), "text": text, "status": "processed", "source_url": url}


@router.get("")
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": d.id, "name": d.name, "pages": d.pages, "characters": d.characters, "chunks": len(d.chunks), "created_at": d.created_at} for d in db.query(Document).all()]
