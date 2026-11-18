'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StudentsTab from './students-tab';
import ClassesTab from './classes-tab';
import { Users, BookOpen } from 'lucide-react';

function StudentsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<'students' | 'classes'>('students');
  useEffect(() => {
    setTab(searchParams.get('tab') === 'classes' ? 'classes' : 'students');
  }, [searchParams]);

  function go(next: 'students' | 'classes') {
    setTab(next);
    router.replace(next === 'classes' ? '/dashboard/students?tab=classes' : '/dashboard/students', { scroll: false });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Students & Classes</h1>
          <p className="text-xs text-muted mt-0.5">Manage student records and class structure</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface border border-line rounded p-1 w-fit">
        <button
          onClick={() => go('students')}
          className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
            tab === 'students' ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <Users size={16} aria-hidden="true" className="inline align-[-3px] mr-1.5" />Students
        </button>
        <button
          onClick={() => go('classes')}
          className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
            tab === 'classes' ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
          }`}
        >
          <BookOpen size={16} aria-hidden="true" className="inline align-[-3px] mr-1.5" />Classes
        </button>
      </div>

      {tab === 'students' ? <StudentsTab /> : <ClassesTab />}
    </div>
  );
}

export default function StudentsPage() {
  return <Suspense><StudentsPageInner /></Suspense>;
}
