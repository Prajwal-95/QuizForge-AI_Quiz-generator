import re
from dataclasses import dataclass


DEMO_QUESTIONS = [
    {"question": "Which scheduling algorithm gives each process a fixed time slice?", "options": ["Round Robin", "FIFO", "Shortest Job First", "Priority Scheduling"], "correct_answer": "Round Robin", "explanation": "Round Robin cycles through processes using a time quantum.", "difficulty": "easy", "topic": "CPU Scheduling", "cognitive_level": "remember"},
    {"question": "A deadlock requires mutual exclusion, hold and wait, no preemption, and what fourth condition?", "options": ["Circular wait", "Shared memory", "Paging", "Starvation"], "correct_answer": "Circular wait", "explanation": "The four Coffman conditions include circular wait.", "difficulty": "medium", "topic": "Process Synchronization", "cognitive_level": "understand"},
    {"question": "True or false: Virtual memory lets a process use more address space than the available physical memory.", "options": ["True", "False"], "correct_answer": "True", "explanation": "Virtual memory maps logical addresses to disk-backed pages and RAM.", "difficulty": "easy", "topic": "Memory Management", "cognitive_level": "understand"},
    {"question": "Which page replacement strategy evicts the page that has not been used for the longest time?", "options": ["LRU", "FIFO", "Clock", "Optimal"], "correct_answer": "LRU", "explanation": "Least Recently Used tracks the most distant prior access.", "difficulty": "medium", "topic": "Memory Management", "cognitive_level": "remember"},
    {"question": "True or false: A semaphore can be used to control access to a shared resource.", "options": ["True", "False"], "correct_answer": "True", "explanation": "Semaphores coordinate concurrent access through wait and signal operations.", "difficulty": "easy", "topic": "Process Synchronization", "cognitive_level": "understand"},
    {"question": "What is the primary purpose of a system call?", "options": ["To request an operating-system service", "To compile a program", "To allocate a CPU core", "To encrypt a file"], "correct_answer": "To request an operating-system service", "explanation": "System calls provide a controlled interface from programs to the kernel.", "difficulty": "easy", "topic": "Operating Systems", "cognitive_level": "remember"},
]


@dataclass
class ValidationResult:
    valid: bool
    score: float
    issues: list[str]
    source_grounded: bool


def validate_question(question: dict, source: str = "") -> ValidationResult:
    issues = []
    required = ("question", "type", "options", "correct_answer", "explanation")
    issues.extend(f"missing:{key}" for key in required if not question.get(key))
    options = question.get("options", [])
    qtype = question.get("type")
    if qtype == "mcq" and len(options) != 4:
        issues.append("mcq_requires_four_options")
    if qtype == "true_false" and len(options) != 2:
        issues.append("true_false_requires_two_options")
    if len({str(option).strip().lower() for option in options}) != len(options):
        issues.append("duplicate_options")
    # A correct_answer that appears in the option list is always acceptable;
    # for free-text types (short_answer) allow a formatted answer too.
    if question.get("correct_answer") not in options:
        if qtype != "short_answer":
            issues.append("correct_answer_not_in_options")
    if len(str(question.get("question", "")).split()) < 5:
        issues.append("question_too_short")
    source_grounded = not source or any(word in source.lower() for word in re.findall(r"[a-zA-Z]{5,}", question.get("question", "").lower()))
    if not source_grounded:
        issues.append("not_source_grounded")
    score = max(0.0, 1 - len(issues) * 0.15)
    return ValidationResult(not issues, round(score, 2), issues, source_grounded)


def normalize_question(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


def is_duplicate(candidate: str, existing: list[str], threshold: float = 0.85) -> bool:
    candidate_words = set(normalize_question(candidate).split())
    return any(candidate_words and len(candidate_words & set(normalize_question(item).split())) / len(candidate_words | set(normalize_question(item).split())) >= threshold for item in existing)


def demo_questions(count: int, difficulty: str, question_types: list[str] | None = None) -> list[dict]:
    pool = DEMO_QUESTIONS if difficulty == "mixed" else [q for q in DEMO_QUESTIONS if q["difficulty"] == difficulty] or DEMO_QUESTIONS
    if question_types:
        typed = [q for q in pool if ("true_false" in question_types and len(q["options"]) == 2) or ("mcq" in question_types and len(q["options"]) == 4)]
        if typed:
            pool = typed
    return [dict(pool[index % len(pool)], type="true_false" if len(pool[index % len(pool)]["options"]) == 2 else "mcq", confidence=0.96, source_references=["Demo: Operating Systems primer"], validation_score=0.96) for index in range(count)]
