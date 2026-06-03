export type School = {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  accent_color: string;
  address: string | null;
  lga: string | null;
  state: string | null;
  school_type: string | null;
  proprietor_name: string | null;
  proprietor_phone: string | null;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRole = 'super_admin' | 'school_admin' | 'principal' | 'teacher' | 'student' | 'parent';

export type User = {
  id: string;
  school_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  password_hash: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
};

export type Student = {
  id: string;
  school_id: string;
  admission_no: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  lga_of_origin: string | null;
  state_of_origin: string | null;
  photo_url: string | null;
  class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  status: string;
  academic_year: string | null;
  created_at: string;
  updated_at: string;
};

export type Class = {
  id: string;
  school_id: string;
  name: string;
  year_group: string | null;
  arm: string | null;
  form_teacher_id: string | null;
  academic_year: string | null;
  created_at: string;
};

export type Subject = {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  class_id: string | null;
  teacher_id: string | null;
  is_core: boolean;
  created_at: string;
};

export type Staff = {
  id: string;
  school_id: string;
  user_id: string | null;
  full_name: string;
  role: string;
  qualification: string | null;
  subjects: string[] | null;
  phone: string | null;
  email: string | null;
  date_joined: string | null;
  status: string;
  created_at: string;
};

export type Attendance = {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string | null;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string | null;
  marked_at: string;
};

export type Grade = {
  id: string;
  school_id: string;
  student_id: string;
  subject_id: string;
  term: string;
  academic_year: string;
  ca1: number | null;
  ca2: number | null;
  assignment: number | null;
  exam: number | null;
  total: number | null;
  grade: string | null;
  created_at: string;
};

export type FeeItem = {
  id: string;
  school_id: string;
  name: string;
  amount: number;
  class_id: string | null;
  term: string | null;
  academic_year: string | null;
  is_mandatory: boolean;
  created_at: string;
};

export type FeeInvoice = {
  id: string;
  school_id: string;
  student_id: string;
  fee_item_id: string;
  amount_due: number;
  amount_paid: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  due_date: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  created_at: string;
};

export type Exam = {
  id: string;
  school_id: string;
  title: string;
  subject_id: string | null;
  class_id: string | null;
  duration_mins: number;
  pass_mark: number;
  question_count: number | null;
  instructions: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'archived';
  shuffle_questions: boolean;
  shuffle_options: boolean;
  created_at: string;
};

export type Question = {
  id: string;
  school_id: string;
  exam_id: string | null;
  body: string;
  image_url: string | null;
  type: 'mcq' | 'true_false' | 'short_answer';
  options: { label: string; text: string }[] | null;
  correct_answer: string;
  topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  mark: number;
  created_at: string;
};

export type ExamSession = {
  id: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  session_code: string | null;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  passed: boolean | null;
  answers: Record<string, unknown> | null;
  tab_switches: number;
  device_info: Record<string, unknown> | null;
  status: 'pending' | 'active' | 'submitted' | 'terminated';
};

export type Announcement = {
  id: string;
  school_id: string;
  title: string;
  body: string;
  audience: string | null;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
};
