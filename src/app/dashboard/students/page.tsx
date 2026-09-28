'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import StudentsTab from './students-tab';
import ClassesTab from './classes-tab';
import { Users, BookOpen } from 'lucide-react';

function StudentsPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'students' | 'classes'>('students');
  useEffect(() => {
    if (searchParams.get('tab') === 'classes') setTab('classes');
  }, [searchParams]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Students & Classes</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Manage student records and class structure</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-[#DDE5F0] rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('students')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'students' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}
        >
          <Users size={16} aria-hidden="true" className="inline align-[-3px] mr-1.5" />Students
        </button>
        <button
          onClick={() => setTab('classes')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'classes' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
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
