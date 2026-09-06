from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Answer, Attempt, Question, Quiz, User

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _scoped_quizzes(user: User, db: Session):
    return db.query(Quiz).filter(Quiz.creator_id == user.id).all()


def _topic_stats(db: Session, quiz_ids: list[int]) -> dict[str, dict]:
    quizzes = db.query(Quiz).filter(Quiz.id.in_(quiz_ids)).all()
    stats: dict[str, list[int]] = defaultdict(list)
    for quiz in quizzes:
        for q in quiz.questions:
            answers = [a for a in q.answers if a.attempt.status == "completed"]
            key = q.difficulty or quiz.subject or "general"
            for a in answers:
                stats[key].append(1 if a.is_correct else 0)
    return {
        key: {
            "answered": len(values),
            "correct": sum(values),
            "accuracy": round(sum(values) / len(values) * 100, 1) if values else 0,
        }
        for key, values in stats.items()
        if values
    }


@router.get("/overview")
def overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quizzes = _scoped_quizzes(user, db)
    quiz_ids = [q.id for q in quizzes]
    attempts = []
    for q in quizzes:
        attempts.extend(a for a in q.attempts if a.status == "completed")
    scores = [a.percentage for a in attempts]
    total_students = len({(a.student_name, a.student_identifier) for a in attempts})
    topic_stats = _topic_stats(db, quiz_ids)
    ranked = sorted(topic_stats.items(), key=lambda item: item[1]["accuracy"])
    return {
        "total_quizzes": len(quizzes),
        "total_students": total_students,
        "total_attempts": len(attempts),
        "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "strongest_topic": ranked[-1][0] if ranked else None,
        "weakest_topic": ranked[0][0] if ranked else None,
    }


@router.get("/history")
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = []
    for q in _scoped_quizzes(user, db):
        for a in q.attempts:
            if a.status == "completed":
                rows.append(
                    {
                        "id": a.id,
                        "quiz_id": q.id,
                        "quiz_title": q.title,
                        "student_name": a.student_name,
                        "percentage": a.percentage,
                        "correct_count": a.correct_count,
                        "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                    }
                )
    rows.sort(key=lambda r: r["submitted_at"] or "", reverse=True)
    return rows


@router.get("/topics")
def topics(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz_ids = [q.id for q in _scoped_quizzes(user, db)]
    stats = _topic_stats(db, quiz_ids)
    return [
        {"topic": topic, "answered": data["answered"], "correct": data["correct"], "accuracy": data["accuracy"]}
        for topic, data in sorted(stats.items(), key=lambda item: item[1]["accuracy"], reverse=True)
    ]
