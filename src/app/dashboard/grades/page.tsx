'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, FilePenLine, FileText, Settings } from 'lucide-react';
import SubjectsTab from './subjects-tab';
import GradeEntryTab from './grade-entry-tab';
import ReportCardTab from './report-card-tab';
import GradingSettingsTab from './grading-settings-tab';

type Tab = 'subjects' | 'entry' | 'reports' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'subjects', label: 'Subjects', icon: <BookOpen size={16} /> },
  { id: 'entry', label: 'Grade Entry', icon: <FilePenLine size={16} /> },
  { id: 'reports', label: 'Report Cards', icon: <FileText size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

const TAB_IDS: Tab[] = TABS.map(t => t.id);

function GradesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('subjects');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && (TAB_IDS as string[]).includes(t)) setTab(t as Tab);
  }, [searchParams]);

  function go(id: Tab) {
    setTab(id);
    router.replace(id === 'subjects' ? '/dashboard/grades' : `/dashboard/grades?tab=${id}`, { scroll: false });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Grades & Report Cards</h1>
          <p className="text-xs text-muted mt-0.5">Subjects · Enter scores · WAEC-format report cards</p>
        </div>
      </div>

      <div role="tablist" aria-label="Grade management sections" className="flex gap-1 mb-5 bg-surface border border-line rounded p-1 w-fit overflow-x-auto max-w-full">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => go(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded transition-colors whitespace-nowrap cursor-pointer min-h-[40px] ${
              tab === t.id ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'subjects' && <SubjectsTab key={`sub-${refreshKey}`} onRefresh={refresh} />}
        {tab === 'entry' && <GradeEntryTab key={`entry-${refreshKey}`} onRefresh={refresh} />}
        {tab === 'reports' && <ReportCardTab key={`rep-${refreshKey}`} onRefresh={refresh} />}
        {tab === 'settings' && <GradingSettingsTab key={`gs-${refreshKey}`} />}
      </div>
    </div>
  );
}

export default function GradesPage() {
  return <Suspense><GradesPageInner /></Suspense>;
}
