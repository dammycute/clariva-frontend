export interface Subject {
  id: string;
  school: string;
  name: string;
  code: string;
  year_group: string | null;
  teacher: string | null;
  is_core: boolean;
  grading_mode: 'cbt' | 'manual' | 'hybrid';
  created_at: string;
}

export interface Exam {
  id: string;
  school: string;
  title: string;
  subject: string;
  class_group: string | null;
  duration_mins: number;
  pass_mark: number;
  question_count: number;
  instructions: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  component: 'ca1' | 'ca2' | 'assignment' | 'exam';
  term: string | null;
  academic_year: string | null;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  time_limit_enforced: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  school: string;
  exam: string;
  body: string;
  image_url: string | null;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  options: Record<string, string>;
  correct_answer: string;
  topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  mark: number;
  order: number;
  created_at: string;
}

export interface ExamSession {
  id: string;
  school: string;
  exam: string;
  student: string;
  session_code: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  passed: boolean | null;
  answers: Record<string, string>;
  tab_switches: number;
  late_submission: boolean;
  status: 'pending' | 'active' | 'submitted' | 'graded';
}

export interface ExamResult {
  score: number;
  total_marks: number;
  passed: boolean;
  percentage: number;
  late_submission: boolean;
}
