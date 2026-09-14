export interface Attendance {
  id: string;
  school: string;
  student: string;
  class_group: string | null;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string | null;
  marked_at: string;
}

export interface AttendanceSummary {
  rate: number | null;
  present: number;
  absent: number;
  late: number;
  total: number;
}
