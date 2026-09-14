export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'attendance'
  | 'exam'
  | 'fee'
  | 'announcement'
  | 'grade'
  | 'system';

export interface Announcement {
  id: string;
  school: string;
  title: string;
  body: string;
  audience: string;
  created_by: string;
  published_at: string;
  created_at: string;
}
