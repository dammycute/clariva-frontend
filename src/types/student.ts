export interface Student {
  id: string;
  user: string;
  admission_no: string;
  class_group: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  student_status: 'active' | 'inactive' | 'graduated' | 'transferred';
  academic_year: string | null;
  created_at: string;
}

export interface StudentProfile {
  id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    gender: string | null;
    avatar_url: string | null;
    photo_url: string | null;
  };
  admission_no: string;
  class_group: {
    id: string;
    name: string;
    year_group: string | null;
    arm: string | null;
  } | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  student_status: string;
  academic_year: string | null;
}
