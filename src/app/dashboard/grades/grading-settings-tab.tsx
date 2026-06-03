'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

interface GradeBoundary { name: string; min_pct: number; }
interface GradingConfig {
  id?: string; school: number; max_ca1: number; max_ca2: number; max_assignment: number; max_exam: number;
  grade_boundaries: GradeBoundary[];
}

const WAEC_BOUNDARIES: GradeBoundary[] = [
  { name: 'A1', min_pct: 75 }, { name: 'B2', min_pct: 70 }, { name: 'B3', min_pct: 65 },
  { name: 'C4', min_pct: 60 }, { name: 'C5', min_pct: 55 }, { name: 'C6', min_pct: 50 },
  { name: 'D7', min_pct: 45 }, { name: 'E8', min_pct: 40 }, { name: 'F9', min_pct: 0 },
];

export default function GradingSettingsTab() {
  const [config, setConfig] = useState<GradingConfig>({
    max_ca1: 30, max_ca2: 30, max_assignment: 40, max_exam: 100,
    grade_boundaries: WAEC_BOUNDARIES,
    school: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.me();
        if (me?.school_id) {
          const gc = await api.gradingConfig.get(me.school_id) as unknown as GradingConfig;
          setConfig({ ...config, ...gc, school: me.school_id });
        }
      } catch { /* use defaults */ }
      setLoading(false);
    })();
  }, []);

  function updateField(field: keyof GradingConfig, value: number | GradeBoundary[]) {
    setConfig(prev => ({ ...prev, [field]: value }));
  }

  function updateBoundary(idx: number, field: 'name' | 'min_pct', value: string | number) {
    setConfig(prev => {
      const bounds = [...prev.grade_boundaries];
      bounds[idx] = { ...bounds[idx], [field]: value };
      return { ...prev, grade_boundaries: bounds };
    });
  }

  function addBoundary() {
    setConfig(prev => ({
      ...prev,
      grade_boundaries: [...prev.grade_boundaries, { name: '', min_pct: 0 }],
    }));
  }

  function removeBoundary(idx: number) {
    setConfig(prev => ({
      ...prev,
      grade_boundaries: prev.grade_boundaries.filter((_, i) => i !== idx),
    }));
  }

  async function handleSave() {
    setMessage('');
    setSaving(true);
    try {
      const me = await auth.me();
      if (!me?.school_id) { setMessage('No school ID'); setSaving(false); return; }
      const sorted = [...config.grade_boundaries].sort((a, b) => b.min_pct - a.min_pct);
      await api.gradingConfig.update(me.school_id, { ...config, grade_boundaries: sorted });
      setMessage('Grading settings saved.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const maxTotal = config.max_ca1 + config.max_ca2 + config.max_assignment + config.max_exam;

  return (
    <div>
      <div className="max-w-2xl">
        <h3 className="text-lg font-bold text-[#0D2B55] mb-1">Grading Configuration</h3>
        <p className="text-xs text-[#64748B] mb-4">Set the maximum scores and grade boundaries for your school.</p>

        {message && (
          <div className={`px-4 py-2 rounded-lg text-xs mb-3 ${message.includes('Saved') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
            {message}
          </div>
        )}

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5 mb-4">
          <h4 className="text-sm font-bold text-[#0D2B55] mb-3">Maximum Scores</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">CA1 Max</label>
              <input type="number" min="0" max="200" value={config.max_ca1} onChange={e => updateField('max_ca1', parseInt(e.target.value) || 0)}
                className="w-full text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">CA2 Max</label>
              <input type="number" min="0" max="200" value={config.max_ca2} onChange={e => updateField('max_ca2', parseInt(e.target.value) || 0)}
                className="w-full text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Assignment Max</label>
              <input type="number" min="0" max="200" value={config.max_assignment} onChange={e => updateField('max_assignment', parseInt(e.target.value) || 0)}
                className="w-full text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Exam Max</label>
              <input type="number" min="0" max="200" value={config.max_exam} onChange={e => updateField('max_exam', parseInt(e.target.value) || 0)}
                className="w-full text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none" />
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] mt-2">Total possible score: <strong className="text-[#0D2B55]">{maxTotal}</strong></p>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-[#0D2B55]">Grade Boundaries</h4>
            <button onClick={addBoundary}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A2240]">
              Add Grade
            </button>
          </div>
          <p className="text-[10px] text-[#64748B] mb-3">Boundaries are checked top-down (highest % first).</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-bold text-[#64748B] uppercase">
                <th className="text-left px-2 py-1">Grade</th>
                <th className="text-left px-2 py-1">Minimum %</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {[...config.grade_boundaries].sort((a, b) => b.min_pct - a.min_pct).map((boundary, idx) => (
                <tr key={idx} className="border-t border-[#DDE5F0]">
                  <td className="px-2 py-1.5">
                    <input value={boundary.name} onChange={e => updateBoundary(idx, 'name', e.target.value)}
                      className="w-full text-sm px-2 py-1 rounded border border-[#DDE5F0] outline-none" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" max="100" value={boundary.min_pct} onChange={e => updateBoundary(idx, 'min_pct', parseInt(e.target.value) || 0)}
                      className="w-full text-sm px-2 py-1 rounded border border-[#DDE5F0] outline-none" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeBoundary(idx)}
                      className="text-[#B91C1C] hover:text-[#991B1B] text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={handleSave} disabled={saving || loading}
          className="text-sm px-6 py-2.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Grading Settings'}
        </button>
      </div>
    </div>
  );
}
