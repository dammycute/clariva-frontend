export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  school: number | null;
  school_id: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  lga_of_origin: string | null;
  state_of_origin: string | null;
  admission_no: string | null;
  class_group: string | null;
  class_name: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  student_status: string | null;
  academic_year: string | null;
}

export type UserRole =
  | 'super_admin'
  | 'school_admin'
  | 'admin_officer'
  | 'principal'
  | 'teacher'
  | 'bursary'
  | 'student'
  | 'parent';

export interface AuthTokens {
  access: string;
  refresh: string;
  role?: UserRole;
}
