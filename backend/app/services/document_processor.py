import re
from html.parser import HTMLParser
from io import BytesIO

import fitz
from docx import Document as DocxDocument


class _TextExtractor(HTMLParser):
    """Pulls visible text out of a web page while skipping markup noise."""

    SKIP_TAGS = {"script", "style", "noscript", "svg", "head", "iframe", "template"}
    BLOCK_TAGS = {"p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "section", "article", "blockquote", "pre"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in self.SKIP_TAGS:
            self.skip_depth += 1
        elif tag in self.BLOCK_TAGS and not self.skip_depth:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self.SKIP_TAGS:
            self.skip_depth = max(0, self.skip_depth - 1)
        elif tag in self.BLOCK_TAGS and not self.skip_depth:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.skip_depth:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(html)
        parser.close()
    except Exception:
        # Tolerate malformed markup; any text already collected is still useful.
        pass
    raw = " ".join(parser.parts)
    return clean_text(re.sub(r"[ \t]+", " ", raw))


def clean_text(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"[ \t]+", " ", text)).strip()


def extract_document(filename: str, content: bytes) -> tuple[str, int]:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix == "txt":
        text = content.decode("utf-8", errors="replace")
        return clean_text(text), 1
    if suffix == "pdf":
        pdf = fitz.open(stream=content, filetype="pdf")
        return clean_text("\n\n".join(page.get_text() for page in pdf)), len(pdf)
    if suffix == "docx":
        doc = DocxDocument(BytesIO(content))
        return clean_text("\n".join(paragraph.text for paragraph in doc.paragraphs)), 1
    raise ValueError("Unsupported file type. Use PDF, DOCX, or TXT.")


def chunk_text(text: str, size: int = 900, overlap: int = 120) -> list[str]:
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        if end < len(text):
            boundary = text.rfind(" ", start + size // 2, end)
            end = boundary if boundary > start else end
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return [chunk for chunk in chunks if chunk]
