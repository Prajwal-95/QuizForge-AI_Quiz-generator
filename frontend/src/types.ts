export type View =
  | "dashboard"
  | "create"
  | "my-quizzes"
  | "quizzes"
  | "results"
  | "attempt"
  | "analytics"
  | "attempt-detail"
  | "quiz"
  | "result"
  | "bank"
  | "history"
  | "about"
  | "help";

export type SourceMode = "topic" | "document" | "text" | "url";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  provider?: string;
} | null;

export type QuizStatus = "draft" | "published" | "closed";

/* ── Question / quiz editor types ─────────────────────────────── */

export type OptionInput = {
  option_text: string;
  is_correct: boolean;
};

export type QuestionInput = {
  question_text: string;
  explanation: string;
  points: number;
  options: OptionInput[];
};

export type EditorQuestion = QuestionInput & { localId: number };

export type QuizMeta = {
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  time_limit: number;
};

/* ── API response types ───────────────────────────────────────── */

export type QuizOption = {
  id: number;
  option_text: string;
  option_index: number;
  is_correct: boolean;
};

export type QuizQuestion = {
  id: number;
  question_text: string;
  explanation: string;
  points: number;
  order_index: number;
  type?: string;
  difficulty?: string;
  cognitive_level?: string;
  options: QuizOption[];
};

export type Quiz = {
  id: number;
  creator_id?: number;
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  time_limit: number;
  status: QuizStatus;
  share_code: string | null;
  settings?: Record<string, unknown>;
  question_count?: number;
  questions?: QuizQuestion[];
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  creator_name?: string;
  mode?: string;
};

export type QuizSummary = {
  id: number;
  title: string;
  subject: string;
  difficulty: string;
  status: QuizStatus;
  share_code: string | null;
  question_count: number;
  attempts: number;
  average_score: number;
  highest_score: number;
  completion_rate: number;
  total_students: number;
  created_at: string | null;
  published_at: string | null;
};

export type QuizResultRow = {
  id: number;
  student_name: string;
  student_identifier: string;
  score: number;
  total_points: number;
  percentage: number;
  correct: number;
  incorrect: number;
  time_taken: number;
  submitted_at: string | null;
  status: string;
};

export type AttemptDetail = {
  attempt_id: number;
  student_name: string;
  student_identifier: string;
  quiz_title: string;
  score: number;
  total_points: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  time_taken: number;
  started_at: string | null;
  submitted_at: string | null;
  questions: Array<{
    question_id: number;
    order_index: number;
    question_text: string;
    points: number;
    points_awarded: number;
    is_correct: boolean;
    answered: boolean;
    selected_option_text: string | null;
    correct_option_text: string | null;
  }>;
};

export type QuestionAccuracy = {
  question_id: number;
  order_index: number;
  question_text: string;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  accuracy: number;
};

export type QuizAnalytics = {
  quiz_id: number;
  title: string;
  total_attempts: number;
  average_score: number;
  highest_score: number;
  passed: number;
  failed: number;
  pass_rate: number;
  distribution: Record<string, number>;
  attempts_over_time: Array<{ date: string; count: number }>;
  question_accuracy: QuestionAccuracy[];
};

export type StudentQuizInfo = {
  id: number;
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  time_limit: number;
  status: string;
  share_code: string;
  creator_name: string;
  question_count: number;
  total_points: number;
};

export type StudentQuestion = {
  id: number;
  question_text: string;
  points: number;
  order_index: number;
  options: Array<{ id: number; option_text: string; option_index: number }>;
};

export type StudentAttemptStart = {
  attempt_id: number;
  started_at: string | null;
  time_limit: number;
  questions: StudentQuestion[];
};

export type StudentSubmissionResult = {
  attempt_id: number;
  student_name?: string;
  score: number;
  total_points: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  time_taken: number;
  submitted_at: string;
};

export type Metrics = {
  total_quizzes?: number;
  total_students?: number;
  total_attempts?: number;
  average_score?: number;
  strongest_topic?: string | null;
  weakest_topic?: string | null;
};

export type Attempt = {
  id: number;
  quiz_id: number;
  quiz_title?: string;
  student_name?: string;
  percentage?: number;
  score?: number;
  correct_count?: number;
  submitted_at?: string | null;
};