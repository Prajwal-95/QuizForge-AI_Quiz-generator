from app.services.document_processor import chunk_text, clean_text
from app.services.question_engine import is_duplicate, validate_question


def test_clean_text_and_short_chunk():
    assert clean_text("  one   two\n\n\nthree ") == "one two\n\nthree"
    assert chunk_text("small source") == ["small source"]


def test_question_validation_rejects_duplicate_options():
    result = validate_question({"question": "What is a useful operating system service?", "type": "mcq", "options": ["A", "A", "B", "C"], "correct_answer": "A", "explanation": "It is a service."})
    assert not result.valid
    assert "duplicate_options" in result.issues


def test_duplicate_detection():
    assert is_duplicate("Which scheduling algorithm gives each process a time slice?", ["Which scheduling algorithm gives each process a time slice?"])