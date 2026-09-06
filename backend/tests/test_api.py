"""End-to-end API tests for the QuizForge platform flow.

Covers: auth → quiz creation → publishing → student attempt → scoring →
results → analytics → security boundaries (ownership, duplicate submit).
"""
from fastapi.testclient import TestClient


def _register(client, name="Creator One", email="creator1@test.dev", password="secret123"):
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


SAMPLE_QUESTIONS = [
    {
        "question_text": "What does SQL stand for?",
        "explanation": "Structured Query Language",
        "points": 1,
        "options": [
            {"option_text": "Structured Query Language", "is_correct": True},
            {"option_text": "Simple Query Language", "is_correct": False},
            {"option_text": "Sequential Query Logic", "is_correct": False},
            {"option_text": "System Query Language", "is_correct": False},
        ],
    },
    {
        "question_text": "Which SQL clause filters grouped rows?",
        "explanation": "HAVING filters groups after aggregation.",
        "points": 2,
        "options": [
            {"option_text": "WHERE", "is_correct": False},
            {"option_text": "HAVING", "is_correct": True},
            {"option_text": "GROUP BY", "is_correct": False},
            {"option_text": "ORDER BY", "is_correct": False},
        ],
    },
]


def create_sample_quiz(client, token):
    response = client.post(
        "/api/quizzes",
        headers=_auth_headers(token),
        json={
            "title": "SQL Basics",
            "description": "Intro to SQL",
            "subject": "Databases",
            "difficulty": "medium",
            "time_limit": 10,
            "questions": SAMPLE_QUESTIONS,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_auth_register_login_and_me(client):
    data = _register(client)
    assert data["user"]["email"] == "creator1@test.dev"
    me = client.get("/api/auth/me", headers=_auth_headers(data["token"]))
    assert me.status_code == 200
    assert me.json()["name"] == "Creator One"
    login = client.post("/api/auth/login", json={"email": "creator1@test.dev", "password": "secret123"})
    assert login.status_code == 200
    bad = client.post("/api/auth/login", json={"email": "creator1@test.dev", "password": "wrong"})
    assert bad.status_code == 401


def test_full_flow_creator_and_student(client):
    creator = _register(client, "Flow Creator", "flow@test.dev", "password123")
    token = creator["token"]

    quiz = create_sample_quiz(client, token)
    quiz_id = quiz["id"]
    assert quiz["status"] == "draft"
    assert quiz["question_count"] == 2

    published = client.post(f"/api/quizzes/{quiz_id}/publish", headers=_auth_headers(token))
    assert published.status_code == 200, published.text
    share_code = published.json()["share_code"]
    assert share_code and share_code.startswith("QF")

    public = client.get(f"/api/quizzes/share/{share_code}")
    assert public.status_code == 200
    assert public.json()["title"] == "SQL Basics"
    assert public.json()["status"] == "published"

    started = client.post(
        f"/api/quizzes/share/{share_code}/attempts",
        json={"student_name": "Prajwal", "student_identifier": "2AG23CS077"},
    )
    assert started.status_code == 200, started.text
    attempt_id = started.json()["attempt_id"]
    questions = started.json()["questions"]
    assert len(questions) == 2
    for q in questions:
        for opt in q["options"]:
            assert "is_correct" not in opt  # anti-cheating: never leak answers

    q1 = questions[0]
    correct_opt = q1["options"][0]
    submitted = client.post(
        f"/api/quizzes/share/{share_code}/attempts/{attempt_id}/submit",
        json={"answers": [{"question_id": q1["id"], "selected_option_id": correct_opt["id"]}]},
    )
    assert submitted.status_code == 200, submitted.text
    result = submitted.json()
    assert result["score"] == 1  # Q1 = 1pt answered; Q2 = 2pt unanswered
    assert result["total_points"] == 3
    assert result["correct"] == 1

    results = client.get(f"/api/quizzes/{quiz_id}/results", headers=_auth_headers(token))
    assert results.status_code == 200
    assert len(results.json()) == 1
    assert results.json()[0]["student_name"] == "Prajwal"

    analytics = client.get(f"/api/quizzes/{quiz_id}/analytics", headers=_auth_headers(token))
    assert analytics.status_code == 200
    body = analytics.json()
    assert body["total_attempts"] == 1
    assert body["question_accuracy"][0]["total_attempts"] == 1

    detail = client.get(f"/api/quizzes/{quiz_id}/attempts/{attempt_id}", headers=_auth_headers(token))
    assert detail.status_code == 200
    assert detail.json()["student_identifier"] == "2AG23CS077"
    assert detail.json()["questions"][0]["points_awarded"] == 1
    assert detail.json()["questions"][1]["points_awarded"] == 0


def test_duplicate_submission_rejected(client):
    creator = _register(client, "Dup Creator", "dup@test.dev", "password123")
    token = creator["token"]
    quiz = create_sample_quiz(client, token)
    quiz_id = quiz["id"]
    published = client.post(f"/api/quizzes/{quiz_id}/publish", headers=_auth_headers(token))
    share_code = published.json()["share_code"]
    started = client.post(
        f"/api/quizzes/share/{share_code}/attempts",
        json={"student_name": "Student", "student_identifier": "S1"},
    ).json()
    attempt_id = started["attempt_id"]
    payload = {"answers": [{"question_id": s["id"], "selected_option_id": None} for s in started["questions"]]}
    first = client.post(f"/api/quizzes/share/{share_code}/attempts/{attempt_id}/submit", json=payload)
    assert first.status_code == 200
    second = client.post(f"/api/quizzes/share/{share_code}/attempts/{attempt_id}/submit", json=payload)
    assert second.status_code == 409


def test_ownership_isolation(client):
    alice = _register(client, "Alice", "alice@test.dev", "password123")
    bob = _register(client, "Bob", "bob@test.dev", "password123")
    alice_quiz = create_sample_quiz(client, alice["token"])
    quiz_id = alice_quiz["id"]

    assert client.get(f"/api/quizzes/{quiz_id}", headers=_auth_headers(bob["token"])).status_code == 403
    assert client.put(f"/api/quizzes/{quiz_id}", headers=_auth_headers(bob["token"]), json={"title": "hack"}).status_code == 403
    assert client.delete(f"/api/quizzes/{quiz_id}", headers=_auth_headers(bob["token"])).status_code == 403
    assert client.get(f"/api/quizzes/{quiz_id}/results", headers=_auth_headers(bob["token"])).status_code == 403
    assert client.get(f"/api/quizzes/{quiz_id}/analytics", headers=_auth_headers(bob["token"])).status_code == 403


def test_publish_requires_valid_question(client):
    creator = _register(client, "Req Creator", "req@test.dev", "password123")
    token = creator["token"]
    quiz = create_sample_quiz(client, token)
    quiz_id = quiz["id"]
    bad_question = {
        "question_text": "No correct answer here",
        "points": 1,
        "options": [
            {"option_text": "A", "is_correct": False},
            {"option_text": "B", "is_correct": False},
        ],
    }
    client.put(f"/api/quizzes/{quiz_id}", headers=_auth_headers(token), json={"questions": [bad_question]})
    response = client.post(f"/api/quizzes/{quiz_id}/publish", headers=_auth_headers(token))
    assert response.status_code == 400
    client.put(f"/api/quizzes/{quiz_id}", headers=_auth_headers(token), json={"title": " ", "questions": SAMPLE_QUESTIONS})
    response = client.post(f"/api/quizzes/{quiz_id}/publish", headers=_auth_headers(token))
    assert response.status_code == 400


def test_demo_generation_requires_auth_and_creates_draft(client):
    response = client.post("/api/quizzes/generate", json={"topic": "Operating Systems", "settings": {"count": 2}})
    assert response.status_code == 401
    creator = _register(client, "Gen Creator", "gen@test.dev", "password123")
    response = client.post(
        "/api/quizzes/generate",
        headers=_auth_headers(creator["token"]),
        json={"topic": "Operating Systems", "settings": {"count": 2, "question_types": ["mcq"]}},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "draft"
    assert len(body["questions"]) == 2
    assert body["questions"][0]["options"][0]["option_text"]
    assert sum(o["is_correct"] for o in body["questions"][0]["options"]) == 1


def test_closed_quiz_rejects_new_attempts(client):
    creator = _register(client, "Close Creator", "close@test.dev", "password123")
    token = creator["token"]
    quiz = create_sample_quiz(client, token)
    quiz_id = quiz["id"]
    published = client.post(f"/api/quizzes/{quiz_id}/publish", headers=_auth_headers(token))
    share_code = published.json()["share_code"]
    client.post(f"/api/quizzes/{quiz_id}/close", headers=_auth_headers(token))
    opened = client.get(f"/api/quizzes/share/{share_code}")
    assert opened.status_code == 403  # closed quiz is not fetchable
    started = client.post(
        f"/api/quizzes/share/{share_code}/attempts",
        json={"student_name": "Student", "student_identifier": "S1"},
    )
    assert started.status_code == 403
