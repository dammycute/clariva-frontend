'use client';

import { useState } from 'react';
import SubjectsTab from './subjects-tab';
import GradeEntryTab from './grade-entry-tab';
import ReportCardTab from './report-card-tab';
import GradingSettingsTab from './grading-settings-tab';

export default function GradesPage() {
  const [tab, setTab] = useState<'subjects' | 'entry' | 'reports' | 'settings'>('subjects');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Grades & Report Cards</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Subjects · Enter scores · WAEC-format report cards</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-white border border-[#DDE5F0] rounded-xl p-1 w-fit">
        <button onClick={() => setTab('subjects')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'subjects' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}>📚 Subjects</button>
        <button onClick={() => setTab('entry')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'entry' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}>📝 Grade Entry</button>
        <button onClick={() => setTab('reports')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'reports' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}>📄 Report Cards</button>
        <button onClick={() => setTab('settings')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'settings' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}>⚙️ Settings</button>
      </div>

      {tab === 'subjects' && <SubjectsTab key={`sub-${refreshKey}`} onRefresh={refresh} />}
      {tab === 'entry' && <GradeEntryTab key={`entry-${refreshKey}`} onRefresh={refresh} />}
      {tab === 'reports' && <ReportCardTab key={`rep-${refreshKey}`} onRefresh={refresh} />}
      {tab === 'settings' && <GradingSettingsTab key={`gs-${refreshKey}`} />}
    </div>
  );
}
