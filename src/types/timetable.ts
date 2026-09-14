export interface TimeTable {
  id: string;
  school: string;
  class_group: string;
  term: string;
  academic_year: string;
  is_published: boolean;
  start_time: string;
  period_duration: number;
  period_count: number;
  short_break_after_period: number | null;
  short_break_duration: number | null;
  long_break_after_period: number | null;
  long_break_duration: number | null;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  timetable: string;
  day: 0 | 1 | 2 | 3 | 4;
  period: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  room: string | null;
}
