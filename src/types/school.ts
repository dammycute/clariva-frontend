export interface School {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  accent_color: string | null;
  address: string | null;
  lga: string | null;
  state: string | null;
  school_type: string | null;
  proprietor_name: string | null;
  proprietor_phone: string | null;
  current_term: string | null;
  current_academic_year: string | null;
  plan: 'trial' | 'basic' | 'standard' | 'premium';
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
}

export interface ClassGroup {
  id: string;
  school: string;
  name: string;
  year_group: string | null;
  arm: string | null;
  form_teacher: string | null;
  academic_year: string | null;
  created_at: string;
}

export interface Analytics {
  school_name: string;
  current_term: string;
  current_academic_year: string;
  students: number;
  total_students: number;
  staff: number;
  classes: number;
  subjects: number;
  fees: {
    total_due: number;
    total_paid: number;
    outstanding: number;
  };
  attendance: {
    total: number;
    present: number;
    rate: number;
  };
  exams: {
    total_sessions: number;
    submitted: number;
    avg_score: number;
  };
}
