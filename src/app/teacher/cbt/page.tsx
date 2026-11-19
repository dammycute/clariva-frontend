'use client';

import { ExamList } from '@/components/cbt/exam-list';

export default function Page() {
  return <ExamList base="/teacher" ownSubjectsOnly />;
}
