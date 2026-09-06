from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class QuizSettings(BaseModel):
    count: int = Field(default=10, ge=1, le=25)
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"
    question_types: list[Literal["mcq", "true_false", "short_answer"]] = ["mcq", "true_false"]
    cognitive_level: Literal["remember", "understand", "apply", "analyze", "mixed"] = "mixed"
    time_limit: int = Field(default=0, ge=0, le=1800)
    shuffle_questions: bool = True
    shuffle_options: bool = True


class GenerateQuizRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    text: str = Field(default="", max_length=200000)
    settings: QuizSettings = Field(default_factory=QuizSettings)


class UrlFetchRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)


class AttemptRequest(BaseModel):
    answers: dict[str, str | None]
    duration_seconds: int = Field(default=0, ge=0)


class AnswerSubmission(BaseModel):
    question_id: int
    value: str = ""


class SubmitRequest(BaseModel):
    answers: list[AnswerSubmission]
    duration_seconds: int = Field(default=0, ge=0)


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    token: str
    user: dict


# ── Quiz editor models ──────────────────────────────────────────────

class OptionIn(BaseModel):
    option_text: str = Field(min_length=1, max_length=500)
    is_correct: bool = False


class QuestionIn(BaseModel):
    question_text: str = Field(min_length=1)
    explanation: str = ""
    points: int = Field(default=1, ge=0, le=100)
    options: list[OptionIn] = Field(min_length=2, max_length=6)


class QuizCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    subject: str = ""
    difficulty: str = "mixed"
    time_limit: int = Field(default=0, ge=0, le=360)
    questions: list[QuestionIn] = []


class QuizUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    subject: str | None = None
    difficulty: str | None = None
    time_limit: int | None = Field(default=None, ge=0, le=360)
    questions: list[QuestionIn] | None = None


# ── Student attempt models ──────────────────────────────────────────

class AttemptCreate(BaseModel):
    student_name: str = Field(min_length=1, max_length=120)
    student_identifier: str = Field(default="", max_length=120)


class AnswerIn(BaseModel):
    question_id: int
    selected_option_id: int | None = None


class AttemptSubmit(BaseModel):
    answers: list[AnswerIn]
    read_only: bool = False  # reserved; always server-evaluated

