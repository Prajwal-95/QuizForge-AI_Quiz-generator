from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

# For SQLite, make sure the database file's parent directory exists before the
# engine connects — critical on Render where the DB lives on a mounted disk
# (e.g. sqlite:////var/data/quizforge.db) that may not exist on first boot.
if settings.database_url.startswith("sqlite") and settings.database_url != "sqlite://":
    db_file = settings.database_url.replace("sqlite:///", "", 1)
    if db_file and db_file != ":memory:":
        Path(db_file).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
