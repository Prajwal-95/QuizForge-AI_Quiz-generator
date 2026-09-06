
import io
import json
import random
import string

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen.canvas import Canvas
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import Answer, Attempt, Option, Question, Quiz, User
from app.schemas import (
    AttemptCreate,
    AttemptSubmit,
    GenerateQuizRequest,
    QuestionIn,
    QuizCreate,
    QuizUpdate,
)
from app.services.llm_service import generate_validated_questions, get_provider
from app.services.question_engine import demo_questions

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

SHARE_ALPHABET = string.ascii_uppercase + string.digits


def _new_share_code(db: Session) -> str:
    for _ in range(100):
        code = "QF" + "".join(random.choices(SHARE_ALPHABET, k=5))
        if not db.query(Quiz).filter(Quiz.share_code == code).first():
            return code
    raise HTTPException(500, "Could not generate a unique share code.")


def option_dict(o: Option) -> dict:
    return {"id": o.id, "option_text": o.option_text, "option_index": o.option_index, "is_correct": o.is_correct}


def question_dict(q: Question, include_answers: bool = True) -> dict:
    data = {
        "id": q.id,
        "question_text": q.question_text,
        "explanation": q.explanation,
        "points": q.points,
        "order_index": q.order_index,
        "type": q.type,
        "difficulty": q.difficulty,
        "cognitive_level": q.cognitive_level,
    }
    if include_answers:
        data["options"] = [option_dict(o) for o in q.options]
    else:
        data["options"] = [
            {"id": o.id, "option_text": o.option_text, "option_index": o.option_index}
            for o in q.options
        ]
    return data


def quiz_payload(quiz, include_questions=True, include_answers=True):
    payload = {
        "id": quiz.id,
        "creator_id": quiz.creator_id,
        "title": quiz.title,
        "description": quiz.description,
        "subject": quiz.subject,
        "difficulty": quiz.difficulty,
        "time_limit": quiz.time_limit,
        "status": quiz.status,
        "share_code": quiz.share_code,
        "settings": quiz.settings_json or {},
        "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
        "updated_at": quiz.updated_at.isoformat() if quiz.updated_at else None,
        "published_at": quiz.published_at.isoformat() if quiz.published_at else None,
    }
    if include_questions:
        payload["question_count"] = len(quiz.questions)
        payload["questions"] = [question_dict(q, include_answers=include_answers) for q in quiz.questions]
    return payload


def _owned_quiz(quiz_id, user, db):
    quiz = db.get(Quiz, quiz_id)
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    if quiz.creator_id != user.id:
        raise HTTPException(403, "You do not have permission to access this quiz.")
    return quiz


def _apply_questions(db, quiz, questions):
    for q in quiz.questions:
        db.delete(q)
    db.flush()
    for index, qin in enumerate(questions):
        question = Question(
            quiz_id=quiz.id,
            question_text=qin.question_text.strip(),
            explanation=qin.explanation,
            points=qin.points,
            order_index=index,
            type="mcq",
            difficulty=quiz.difficulty,
        )
        db.add(question)
        db.flush()
        for oi, opt in enumerate(qin.options):
            db.add(Option(
                question_id=question.id,
                option_text=opt.option_text.strip(),
                option_index=oi,
                is_correct=opt.is_correct,
            ))


def _validate_quiz_for_publish(quiz):
    if not quiz.title or not quiz.title.strip():
        raise HTTPException(400, "Give the quiz a title before publishing.")
    if not quiz.questions:
        raise HTTPException(400, "Add at least one question before publishing.")
    for q in quiz.questions:
        if len(q.options) < 2:
            raise HTTPException(400, f"Question {q.order_index + 1} needs at least two options.")
        if sum(1 for o in q.options if o.is_correct) != 1:
            raise HTTPException(400, f"Question {q.order_index + 1} must have exactly one correct answer.")
        if q.points < 0:
            raise HTTPException(400, f"Question {q.order_index + 1} has invalid points.")

# ── Creator CRUD ────────────────────────────────────────────────────

@router.post("")
def create_quiz(payload: QuizCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = Quiz(
        creator_id=user.id,
        title=payload.title.strip(),
        description=payload.description,
        subject=payload.subject,
        difficulty=payload.difficulty,
        time_limit=payload.time_limit,
        status="draft",
    )
    db.add(quiz)
    db.flush()
    _apply_questions(db, quiz, payload.questions)
    db.commit()
    db.refresh(quiz)
    return quiz_payload(quiz)


@router.get("")
def list_quizzes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(Quiz.creator_id == user.id).order_by(Quiz.created_at.desc()).all()
    result = []
    for q in quizzes:
        attempts = [a for a in q.attempts if a.status == "completed"]
        total = len(attempts)
        avg_pct = round(sum(a.percentage for a in attempts) / total, 1) if total else 0
        highest = max((a.percentage for a in attempts), default=0)
        result.append({
            "id": q.id,
            "title": q.title,
            "subject": q.subject,
            "difficulty": q.difficulty,
            "status": q.status,
            "share_code": q.share_code,
            "question_count": len(q.questions),
            "attempts": total,
            "average_score": avg_pct,
            "highest_score": round(highest, 1),
            "completion_rate": round(total / len(q.attempts) * 100, 1) if q.attempts else 0,
            "total_students": len({a.student_identifier for a in attempts}),
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "published_at": q.published_at.isoformat() if q.published_at else None,
        })
    return result


@router.get("/{quiz_id}")
def get_quiz(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    payload = quiz_payload(quiz)
    payload["creator_name"] = quiz.creator.name if quiz.creator else None
    return payload


@router.put("/{quiz_id}")
def update_quiz(quiz_id: int, payload: QuizUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    if payload.title is not None:
        quiz.title = payload.title.strip()
    if payload.description is not None:
        quiz.description = payload.description
    if payload.subject is not None:
        quiz.subject = payload.subject
    if payload.difficulty is not None:
        quiz.difficulty = payload.difficulty
    if payload.time_limit is not None:
        quiz.time_limit = payload.time_limit
    if payload.questions is not None:
        _apply_questions(db, quiz, payload.questions)
    db.commit()
    db.refresh(quiz)
    return quiz_payload(quiz)


@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    db.delete(quiz)
    db.commit()
    return {"id": quiz_id, "deleted": True}


# ── Publishing / lifecycle ──────────────────────────────────────────

from datetime import datetime, timezone as _tz


def _utcnow():
    return datetime.now(_tz.utc)


def _set_status(quiz_id, user, db, status):
    quiz = _owned_quiz(quiz_id, user, db)
    if status == "published":
        _validate_quiz_for_publish(quiz)
        if not quiz.share_code:
            quiz.share_code = _new_share_code(db)
        quiz.published_at = quiz.published_at or _utcnow()
    quiz.status = status
    db.commit()
    db.refresh(quiz)
    return quiz_payload(quiz, include_questions=False)


@router.post("/{quiz_id}/publish")
def publish_quiz(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _set_status(quiz_id, user, db, "published")


@router.post("/{quiz_id}/close")
def close_quiz(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _set_status(quiz_id, user, db, "closed")


@router.post("/{quiz_id}/reopen")
def reopen_quiz(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _set_status(quiz_id, user, db, "published")

# ── Public student endpoints ────────────────────────────────────────

@router.get("/share/{share_code}")
def get_public_quiz(share_code: str, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.share_code == share_code.upper()).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found. Check the code and try again.")
    if quiz.status != "published":
        raise HTTPException(403, "This quiz is not open for responses right now.")
    payload = quiz_payload(quiz, include_questions=False)
    payload["creator_name"] = quiz.creator.name if quiz.creator else "QuizForge"
    payload["question_count"] = len(quiz.questions)
    payload["total_points"] = sum(q.points for q in quiz.questions)
    return payload


@router.post("/share/{share_code}/attempts")
def start_attempt(share_code: str, payload: AttemptCreate, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.share_code == share_code.upper()).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found.")
    if quiz.status != "published":
        raise HTTPException(403, "This quiz is no longer accepting responses.")
    attempt = Attempt(
        quiz_id=quiz.id,
        student_name=payload.student_name.strip(),
        student_identifier=payload.student_identifier.strip(),
        status="in_progress",
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return {
        "attempt_id": attempt.id,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "time_limit": quiz.time_limit,
        "questions": [question_dict(q, include_answers=False) for q in quiz.questions],
    }


@router.post("/share/{share_code}/attempts/{attempt_id}/submit")
def submit_attempt(share_code: str, attempt_id: int, payload: AttemptSubmit, db: Session = Depends(get_db)):
    from datetime import datetime, timezone

    quiz = db.query(Quiz).filter(Quiz.share_code == share_code.upper()).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found.")
    attempt = db.get(Attempt, attempt_id)
    if not attempt or attempt.quiz_id != quiz.id:
        raise HTTPException(404, "Attempt not found.")
    if attempt.status == "completed":
        raise HTTPException(409, "This quiz has already been submitted.")
    if quiz.status != "published":
        raise HTTPException(403, "This quiz is no longer accepting responses.")

    started = attempt.started_at
    submitted_at = datetime.now(timezone.utc)
    elapsed = int((submitted_at - started.astimezone(timezone.utc)).total_seconds()) if started else 0
    if quiz.time_limit > 0:
        max_seconds = quiz.time_limit * 60
        if elapsed > max_seconds:
            elapsed = max_seconds

    questions = {q.id: q for q in quiz.questions}
    total_points = sum(q.points for q in quiz.questions)
    score = 0
    correct = 0
    incorrect = 0
    unanswered = 0

    for ans in payload.answers:
        question = questions.get(ans.question_id)
        if not question:
            continue
        selected = None
        if ans.selected_option_id is not None:
            selected = next((o for o in question.options if o.id == ans.selected_option_id), None)
        is_correct = bool(selected and selected.is_correct)
        awarded = question.points if is_correct else 0
        if is_correct:
            correct += 1
        elif selected is None:
            unanswered += 1
        else:
            incorrect += 1
        score += awarded
        db.add(Answer(
            attempt_id=attempt.id,
            question_id=question.id,
            selected_option_id=ans.selected_option_id,
            is_correct=is_correct,
            points_awarded=awarded,
        ))

    percentage = round(score / total_points * 100, 1) if total_points else 0.0

    attempt.score = score
    attempt.total_points = total_points
    attempt.percentage = percentage
    attempt.correct_count = correct
    attempt.incorrect_count = incorrect
    attempt.unanswered_count = unanswered
    attempt.time_taken = elapsed
    attempt.submitted_at = submitted_at
    attempt.status = "completed"

    db.commit()
    db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "score": score,
        "total_points": total_points,
        "percentage": percentage,
        "correct": correct,
        "incorrect": incorrect,
        "unanswered": unanswered,
        "time_taken": elapsed,
        "submitted_at": submitted_at.isoformat(),
    }

# ── AI generation → draft ───────────────────────────────────────────

@router.post("/generate")
def generate_quiz(payload: GenerateQuizRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    provider = get_provider()
    settings = payload.settings
    source = payload.text or f"Generate a general assessment about {payload.topic}"
    validation_source = payload.text
    try:
        generated, validation_results = (
            generate_validated_questions(
                payload.topic, validation_source, settings.count, settings.difficulty,
                settings.cognitive_level, settings.question_types,
            )
            if provider
            else ([], [])
        )
    except RuntimeError as error:
        raise HTTPException(502, {"error": "AI_PROVIDER_ERROR", "message": str(error)}) from error
    if provider and len(generated) < settings.count:
        raise HTTPException(502, {"error": "AI_GENERATION_FAILED", "message": "The AI response did not produce enough valid questions."})
    items = generated if provider else demo_questions(settings.count, settings.difficulty, settings.question_types)
    mode = "groq" if provider else "demo"
    if settings.shuffle_options:
        for item in items:
            options = list(item.get("options") or [])
            random.shuffle(options)
            item["options"] = options
    if settings.shuffle_questions:
        random.shuffle(items)

    quiz = Quiz(
        creator_id=user.id,
        title=f"{payload.topic} assessment",
        description="",
        subject=payload.topic,
        difficulty=settings.difficulty,
        time_limit=settings.time_limit,
        status="draft",
        settings_json={**settings.model_dump(), "mode": mode},
    )
    db.add(quiz)
    db.flush()
    for index, item in enumerate(items):
        qin = QuestionIn(
            question_text=item.get("question", f"Question {index + 1}"),
            explanation=item.get("explanation", ""),
            points=1,
            options=[
                {"option_text": opt, "is_correct": item.get("correct_answer") == opt}
                for opt in (item.get("options") or [])
            ],
        )
        _apply_questions(db, quiz, [qin])
    db.commit()
    db.refresh(quiz)
    payload_out = quiz_payload(quiz)
    payload_out["mode"] = mode
    return payload_out

# ── Creator results & analytics ─────────────────────────────────────

@router.get("/{quiz_id}/results")
def quiz_results(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    attempts = [a for a in quiz.attempts if a.status == "completed"]
    attempts.sort(key=lambda a: a.submitted_at or datetime(1970, 1, 1), reverse=True)
    return [
        {
            "id": a.id,
            "student_name": a.student_name,
            "student_identifier": a.student_identifier,
            "score": a.score,
            "total_points": a.total_points,
            "percentage": a.percentage,
            "correct": a.correct_count,
            "incorrect": a.incorrect_count,
            "time_taken": a.time_taken,
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "status": a.status,
        }
        for a in attempts
    ]


@router.get("/{quiz_id}/analytics")
def quiz_analytics(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    attempts = [a for a in quiz.attempts if a.status == "completed"]
    total = len(attempts)
    avg_pct = round(sum(a.percentage for a in attempts) / total, 1) if total else 0
    highest = round(max((a.percentage for a in attempts), default=0), 1)
    distribution = {label: 0 for label in ["0-20", "21-40", "41-60", "61-80", "81-100"]}
    for a in attempts:
        p = a.percentage
        if p <= 20:
            distribution["0-20"] += 1
        elif p <= 40:
            distribution["21-40"] += 1
        elif p <= 60:
            distribution["41-60"] += 1
        elif p <= 80:
            distribution["61-80"] += 1
        else:
            distribution["81-100"] += 1
    from collections import Counter
    by_date = Counter()
    for a in attempts:
        d = (a.submitted_at or a.started_at).date()
        by_date[d] += 1
    question_stats = []
    for q in quiz.questions:
        answers = [ans for ans in q.answers if ans.attempt.status == "completed"]
        answered = len(answers)
        correct = sum(1 for ans in answers if ans.is_correct)
        question_stats.append({
            "question_id": q.id,
            "order_index": q.order_index,
            "question_text": q.question_text,
            "total_attempts": answered,
            "correct_attempts": correct,
            "incorrect_attempts": answered - correct,
            "accuracy": round(correct / answered * 100, 1) if answered else 0,
        })
    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "total_attempts": total,
        "average_score": avg_pct,
        "highest_score": highest,
        "passed": sum(1 for a in attempts if a.percentage >= 50),
        "failed": sum(1 for a in attempts if a.percentage < 50),
        "pass_rate": round(sum(1 for a in attempts if a.percentage >= 50) / total * 100, 1) if total else 0,
        "distribution": distribution,
        "attempts_over_time": [{"date": d.isoformat(), "count": c} for d, c in sorted(by_date.items())],
        "question_accuracy": question_stats,
    }


@router.get("/{quiz_id}/attempts/{attempt_id}")
def get_attempt_detail(quiz_id: int, attempt_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    attempt = db.get(Attempt, attempt_id)
    if not attempt or attempt.quiz_id != quiz.id:
        raise HTTPException(404, "Attempt not found.")
    answers_by_q = {a.question_id: a for a in attempt.answers}
    questions = []
    for q in quiz.questions:
        ans = answers_by_q.get(q.id)
        selected = None
        if ans and ans.selected_option_id:
            selected = next((o for o in q.options if o.id == ans.selected_option_id), None)
        questions.append({
            "question_id": q.id,
            "order_index": q.order_index,
            "question_text": q.question_text,
            "points": q.points,
            "points_awarded": ans.points_awarded if ans else 0,
            "is_correct": ans.is_correct if ans else False,
            "answered": bool(ans and ans.selected_option_id),
            "selected_option_text": selected.option_text if selected else None,
            "correct_option_text": next((o.option_text for o in q.options if o.is_correct), None),
        })
    return {
        "attempt_id": attempt.id,
        "student_name": attempt.student_name,
        "student_identifier": attempt.student_identifier,
        "quiz_title": quiz.title,
        "score": attempt.score,
        "total_points": attempt.total_points,
        "percentage": attempt.percentage,
        "correct": attempt.correct_count,
        "incorrect": attempt.incorrect_count,
        "unanswered": attempt.unanswered_count,
        "time_taken": attempt.time_taken,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "questions": questions,
    }


@router.get("/attempts/{attempt_id}/result")
def public_attempt_result(attempt_id: int, db: Session = Depends(get_db)):
    attempt = db.get(Attempt, attempt_id)
    if not attempt or attempt.status != "completed":
        raise HTTPException(404, "Result not found.")
    quiz = attempt.quiz
    return {
        "attempt_id": attempt.id,
        "quiz_title": quiz.title,
        "student_name": attempt.student_name,
        "score": attempt.score,
        "total_points": attempt.total_points,
        "percentage": attempt.percentage,
        "correct": attempt.correct_count,
        "incorrect": attempt.incorrect_count,
        "time_taken": attempt.time_taken,
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
    }


# ── Exports (creator scoped) ────────────────────────────────────────

@router.get("/{quiz_id}/export/json")
def export_json(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    data = {
        "title": quiz.title,
        "subject": quiz.subject,
        "questions": [
            {
                "question": q.question_text,
                "points": q.points,
                "options": [{"text": o.option_text, "correct": o.is_correct} for o in q.options],
            }
            for q in quiz.questions
        ],
    }
    content = json.dumps(data, indent=2)
    return Response(content, media_type="application/json", headers={"Content-Disposition": f'attachment; filename="quiz-{quiz_id}.json"'})


@router.get("/{quiz_id}/export/pdf")
def export_pdf(quiz_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, user, db)
    output = io.BytesIO()
    canvas = Canvas(output, pagesize=letter)
    canvas.setFont("Helvetica-Bold", 18); canvas.drawString(48, 750, quiz.title)
    canvas.setFont("Helvetica", 11); y = 720
    for question in quiz.questions:
        canvas.drawString(48, y, f"{question.order_index + 1}. {question.question_text}"); y -= 18
        for option in question.options:
            canvas.drawString(64, y, f"[ ] {option.option_text}"); y -= 15
        y -= 12
        if y < 80:
            canvas.showPage(); y = 750
    canvas.save()
    return Response(output.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="quiz-{quiz_id}.pdf"'})
