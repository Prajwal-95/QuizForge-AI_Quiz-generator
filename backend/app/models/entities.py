from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # Nullable: password accounts set a bcrypt hash; Google sign-in users have none.
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    quizzes: Mapped[list["Quiz"]] = relationship(back_populates="creator", cascade="all, delete-orphan")


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(primary_key=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    subject: Mapped[str] = mapped_column(String(120), default="")
    difficulty: Mapped[str] = mapped_column(String(20), default="mixed")
    time_limit: Mapped[int] = mapped_column(Integer, default=0)  # minutes; 0 = none
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | published | closed
    share_code: Mapped[str | None] = mapped_column(String(12), unique=True, index=True, nullable=True)
    settings_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    creator: Mapped["User"] = relationship(back_populates="quizzes")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="quiz", cascade="all, delete-orphan", order_by="Question.order_index"
    )
    attempts: Mapped[list["Attempt"]] = relationship(back_populates="quiz", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_quizzes_creator_status", "creator_id", "status"),)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), index=True)
    question_text: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text, default="")
    points: Mapped[int] = mapped_column(Integer, default=1)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    type: Mapped[str] = mapped_column(String(20), default="mcq")
    difficulty: Mapped[str] = mapped_column(String(20), default="mixed")
    cognitive_level: Mapped[str] = mapped_column(String(20), default="mixed")
    source_references: Mapped[list] = mapped_column(JSON, default=list)

    quiz: Mapped["Quiz"] = relationship(back_populates="questions")
    options: Mapped[list["Option"]] = relationship(
        back_populates="question", cascade="all, delete-orphan", order_by="Option.option_index"
    )
    answers: Mapped[list["Answer"]] = relationship(back_populates="question")

    __table_args__ = (Index("ix_questions_quiz_order", "quiz_id", "order_index"),)


class Option(Base):
    __tablename__ = "options"
    __table_args__ = (UniqueConstraint("question_id", "option_index", name="uq_option_question_index"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), index=True)
    option_text: Mapped[str] = mapped_column(String(500))
    option_index: Mapped[int] = mapped_column(Integer, default=0)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    question: Mapped["Question"] = relationship(back_populates="options")


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), index=True)
    student_name: Mapped[str] = mapped_column(String(120))
    student_identifier: Mapped[str] = mapped_column(String(120), default="")
    score: Mapped[float] = mapped_column(Float, default=0.0)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    percentage: Mapped[float] = mapped_column(Float, default=0.0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    incorrect_count: Mapped[int] = mapped_column(Integer, default=0)
    unanswered_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    time_taken: Mapped[int] = mapped_column(Integer, default=0)  # seconds
    status: Mapped[str] = mapped_column(String(20), default="in_progress")  # in_progress | completed

    quiz: Mapped["Quiz"] = relationship(back_populates="attempts")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan", passive_deletes=True
    )

    __table_args__ = (Index("ix_attempts_quiz_status", "quiz_id", "status"),)


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("attempts.id"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"), index=True)
    selected_option_id: Mapped[int | None] = mapped_column(ForeignKey("options.id"), nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0)

    attempt: Mapped["Attempt"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship(back_populates="answers")

    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),)


# ── Document ingestion (legacy AI-pipeline support) ─────────────────
# Retained as a working, separable feature. These tables are independent
# of the quiz/attempt ownership model above.

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(20))
    text: Mapped[str] = mapped_column(Text)
    pages: Mapped[int] = mapped_column(Integer, default=1)
    characters: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    chunks: Mapped[list["DocumentChunk"]] = relationship(cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"))
    chunk_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
