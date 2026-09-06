#!/usr/bin/env python
"""Seed script for QuizForge AI development/demo data.

Creates:
  1 demo creator account
  2 demo quizzes (one draft, one published with share code)
  10 demo student attempts with per-question answers

Run from the backend directory:
    ..\venv\Scripts\python.exe seed.py
"""
import random
from datetime import datetime, timedelta

from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.models import Answer, Attempt, Option, Question, Quiz, User


def make_options(question_text: str, correct_index: int) -> list[dict]:
    stems = [
        [f"Opt A: {question_text}", f"Opt B: {question_text}", f"Opt C: {question_text}", f"Opt D: {question_text}"],
        [f"First answer for '{question_text}'", f"Second answer for '{question_text}'", f"Third answer for '{question_text}'", f"Fourth answer for '{question_text}'"],
    ]
    options = stems[len(question_text) % len(stems)]
    return [{"option_text": options[i], "option_index": i, "is_correct": i == correct_index} for i in range(4)]


def add_question(db, quiz: Quiz, text: str, points: int, order_index: int) -> Question:
    q = Question(
        quiz_id=quiz.id,
        question_text=text,
        explanation=f"Explanation for: {text}",
        points=points,
        order_index=order_index,
        type="mcq",
        difficulty=quiz.difficulty,
    )
    db.add(q)
    db.flush()
    for opt in make_options(text, order_index % 4):
        db.add(Option(question_id=q.id, **opt))
    return q

def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    creator = db.query(User).filter(User.email == "creator@quizforge.dev").first()
    if not creator:
        creator = User(
            name="Demo Creator",
            email="creator@quizforge.dev",
            password_hash=hash_password("creator123"),
        )
        db.add(creator)
        db.flush()
        print("Created demo creator: creator@quizforge.dev / creator123")
    else:
        print("Demo creator already exists.")

    pub = db.query(Quiz).filter(Quiz.title == "DBMS Fundamentals").first()
    if not pub:
        pub = Quiz(
            creator_id=creator.id,
            title="DBMS Fundamentals",
            description="Core database concepts: normalization, keys, transactions, and SQL.",
            subject="Computer Science",
            difficulty="medium",
            time_limit=15,
            status="published",
            share_code="QFDBMS1",
            published_at=datetime.utcnow(),
        )
        db.add(pub)
        db.flush()
        texts = [
            "Which normal form removes partial dependencies on the primary key?",
            "A foreign key in a relational table references what?",
            "Which SQL clause filters grouped rows after aggregation?",
            "What does ACID stand for in transaction processing?",
            "Which command removes a table definition from the database?",
        ]
        for i, t in enumerate(texts):
            add_question(db, pub, t, 1, i)
        print("Created published quiz 'DBMS Fundamentals' (QFDBMS1).")

    draft = db.query(Quiz).filter(Quiz.title == "Python Basics (draft)").first()
    if not draft:
        draft = Quiz(
            creator_id=creator.id,
            title="Python Basics (draft)",
            description="Introductory Python: data types, control flow, functions.",
            subject="Computer Science",
            difficulty="easy",
            time_limit=10,
            status="draft",
        )
        db.add(draft)
        db.flush()
        texts = [
            "Which keyword defines a function in Python?",
            "What built-in type is used for immutable sequences?",
            "Which function returns the length of an iterable?",
            "What exception is raised for dividing by zero?",
        ]
        for i, t in enumerate(texts):
            add_question(db, draft, t, 1, i)
        print("Created draft quiz 'Python Basics (draft)'.")

    db.commit()

    if pub:
        existing = db.query(Attempt).filter(Attempt.quiz_id == pub.id, Attempt.status == "completed").count()
        target = 10
        if existing < target:
            try:
                for i in range(existing, target):
                    attempt = Attempt(
                        quiz_id=pub.id,
                        student_name=f"Student {i + 1}",
                        student_identifier=f"2AG23CS{100 + i}",
                        status="completed",
                        started_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 30)),
                        submitted_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 25)),
                    )
                    db.add(attempt)
                    db.flush()
                    score = 0
                    correct = 0
                    unanswered = 0
                    for q in pub.questions:
                        roll = random.random()
                        if roll < 0.18:
                            selected_idx = None
                        elif roll < 0.75:
                            selected_idx = next((o.id for o in q.options if o.is_correct), None)
                        else:
                            wrong = [o.id for o in q.options if not o.is_correct]
                            selected_idx = wrong[random.randrange(len(wrong))] if wrong else None
                        is_correct = bool(selected_idx is not None and any(o.id == selected_idx and o.is_correct for o in q.options))
                        awarded = q.points if is_correct else 0
                        score += awarded
                        if is_correct:
                            correct += 1
                        elif selected_idx is None:
                            unanswered += 1
                        db.add(Answer(
                            attempt_id=attempt.id,
                            question_id=q.id,
                            selected_option_id=selected_idx,
                            is_correct=is_correct,
                            points_awarded=awarded,
                        ))
                    total_points = sum(q.points for q in pub.questions)
                    attempt.score = score
                    attempt.total_points = total_points
                    attempt.percentage = round(score / total_points * 100, 1) if total_points else 0
                    attempt.correct_count = correct
                    attempt.incorrect_count = len(pub.questions) - correct - unanswered
                    attempt.unanswered_count = unanswered
                    attempt.time_taken = random.randint(120, 780)
                db.commit()
                print(f"Seeded {target} demo student attempts.")
            except Exception as error:
                db.rollback()
                print(f"Attempt seeding skipped: {error}")
        else:
            print("Demo attempts already present.")

    db.close()
    print("Seed complete.")


if __name__ == "__main__":
    main()
