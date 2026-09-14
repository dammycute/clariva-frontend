export interface Grade {
  id: string;
  school: string;
  student: string;
  subject: string;
  term: string;
  academic_year: string;
  ca1: number | null;
  ca2: number | null;
  assignment: number | null;
  exam: number | null;
  total: number | null;
  grade: string | null;
  results_status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_note: string | null;
  created_at: string;
  student_name?: string;
  subject_name?: string;
}

export interface ReportCard {
  id: string;
  school: string;
  student: string;
  term: string;
  academic_year: string;
  grades: GradeSnapshot[];
  total_score: number;
  total_possible: number;
  average: number | null;
  class_rank: number | null;
  is_released: boolean;
  released_at: string | null;
  generated_at: string;
}

export interface GradeSnapshot {
  subject: string;
  scores: {
    ca1: number;
    ca2: number;
    assignment: number;
    exam: number;
  };
  total: number | null;
  grade: string | null;
}
