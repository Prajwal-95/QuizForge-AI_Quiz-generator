import json
from abc import ABC, abstractmethod

import httpx

from app.core.config import get_settings
from app.services.question_engine import ValidationResult, validate_question


TYPE_ALIASES = {
    "multiple_choice": "mcq",
    "multiple-choice": "mcq",
    "single_choice": "mcq",
    "single-choice": "mcq",
    "multiple choice": "mcq",
    "true/false": "true_false",
    "true or false": "true_false",
    "boolean": "true_false",
    "true false": "true_false",
    "true_false": "true_false",
    "short answer": "short_answer",
    "short-answer": "short_answer",
    "fill in the blank": "short_answer",
    "fill-in-the-blank": "short_answer",
    "short_answer": "short_answer",
    "one word": "short_answer",
}


CONFIDENCE_MAP = {"high": 0.95, "medium": 0.85, "low": 0.7}


def _as_float_confidence(value):
    if isinstance(value, bool):
        return 0.9 if value else 0.7
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return 0.9
    text = str(value).strip().lower()
    if text in CONFIDENCE_MAP:
        return CONFIDENCE_MAP[text]
    try:
        return float(text)
    except (TypeError, ValueError):
        return 0.9


def normalize_candidate(question: dict) -> dict:
    """Canonicalize loose LLM output so strict validation has a real chance of passing."""
    qtype = str(question.get("type", "")).strip().lower()
    question["type"] = TYPE_ALIASES.get(qtype, qtype)
    if question.get("difficulty"):
        question["difficulty"] = str(question["difficulty"]).strip().lower()
    if question.get("cognitive_level"):
        question["cognitive_level"] = str(question["cognitive_level"]).strip().lower()
    refs = question.get("source_references")
    if not refs:
        question["source_references"] = []
    elif isinstance(refs, str):
        question["source_references"] = [refs]
    if question.get("options") is None:
        question["options"] = []
    question["confidence"] = _as_float_confidence(question.get("confidence", 0.9))
    return question
class LLMProvider(ABC):
    @abstractmethod
    def generate_questions(self, topic: str, source: str, count: int, difficulty: str, cognitive_level: str, question_types: list[str] | None = None) -> list[dict]:
        raise NotImplementedError


class GroqProvider(LLMProvider):
    model = "openai/gpt-oss-20b"

    def generate_questions(self, topic: str, source: str, count: int, difficulty: str, cognitive_level: str, question_types: list[str] | None = None) -> list[dict]:
        settings = get_settings()
        source_instruction = f"Use ONLY the source context below. If the context does not support a claim, do not use it.\nSOURCE CONTEXT:\n{source[:settings.max_llm_context_chars]}" if source else "Use your reliable general knowledge about the topic. Do not invent niche or time-sensitive facts."
        type_instruction = "Use mcq with exactly four options, or true_false with exactly two options." if not question_types else f"Use ONLY the question type(s): {', '.join(question_types)}."
        allowed = ", ".join(sorted(TYPE_ALIASES.values()))
        prompt = f"""Create {count} high-quality assessment questions about {topic}.
Difficulty: {difficulty}. Cognitive level: {cognitive_level}.
Use EXACTLY these JSON keys for every item: question, type, options, correct_answer, explanation, difficulty, topic, cognitive_level, source_references, confidence.
Set type to one of: {allowed} (lowercase).
Set difficulty to one of: easy, medium, hard (lowercase). Set cognitive_level to one of: remember, understand, apply, analyze (lowercase).
{type_instruction} The correct_answer must exactly match one of the options.
    {source_instruction}
"""
        body = {
            "model": self.model,
            "temperature": 0.2,
            "max_completion_tokens": 8000,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You generate source-grounded quiz questions. Return JSON with a questions array."},
                {"role": "user", "content": prompt},
            ],
        }
        try:
            response = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json=body,
                timeout=90,
            )
            response.raise_for_status()
            payload = response.json()
            content = payload["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.replace("```json", "", 1).replace("```", "").strip()
            parsed = json.loads(content)
            if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
                questions = parsed["questions"]
            elif isinstance(parsed, list):
                questions = parsed
            elif isinstance(parsed, dict) and parsed.get("question"):
                questions = [parsed]
            else:
                questions = []
            if not isinstance(questions, list):
                raise ValueError("Groq returned an invalid questions payload")
            return [normalize_candidate(question) for question in questions]
        except httpx.HTTPStatusError as error:
            detail = error.response.text[:500]
            raise RuntimeError(f"Groq API error {error.response.status_code}: {detail}") from error
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
            raise RuntimeError(f"AI generation failed: {error}") from error


def get_provider() -> LLMProvider | None:
    settings = get_settings()
    if settings.llm_provider.lower() == "groq" and settings.groq_api_key:
        return GroqProvider()
    return None
def generate_validated_questions(topic: str, source: str, count: int, difficulty: str, cognitive_level: str, question_types: list[str] | None = None) -> tuple[list[dict], list[ValidationResult]]:
    provider = get_provider()
    if provider is None:
        return [], []
    settings = get_settings()
    max_attempts = max(1, settings.max_correction_attempts)
    accepted: list[dict] = []
    results: list[ValidationResult] = []
    seen: list[str] = []
    for _ in range(max_attempts):
        candidates = provider.generate_questions(topic, source, count, difficulty, cognitive_level, question_types)
        for candidate in candidates:
            candidate.setdefault("type", "mcq")
            if question_types and candidate.get("type") not in question_types:
                continue
            result = validate_question(candidate, source)
            normalized = candidate.get("question", "").strip().lower()
            if result.valid and normalized not in seen:
                candidate["validation_score"] = result.score
                accepted.append(candidate)
                seen.append(normalized)
                results.append(result)
            if len(accepted) == count:
                return accepted, results
    return accepted, results