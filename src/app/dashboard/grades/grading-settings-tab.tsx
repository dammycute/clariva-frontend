'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { X } from 'lucide-react';

interface GradeBoundary { name: string; min_pct: number; }
interface GradingConfig {
  id?: string; school: number;
  components: { key: string; label: string; max: number; enabled: boolean }[];
  grade_boundaries: GradeBoundary[];
}

const WAEC_BOUNDARIES: GradeBoundary[] = [
  { name: 'A1', min_pct: 75 }, { name: 'B2', min_pct: 70 }, { name: 'B3', min_pct: 65 },
  { name: 'C4', min_pct: 60 }, { name: 'C5', min_pct: 55 }, { name: 'C6', min_pct: 50 },
  { name: 'D7', min_pct: 45 }, { name: 'E8', min_pct: 40 }, { name: 'F9', min_pct: 0 },
];

const DEFAULT_COMPONENTS = [
  { key: 'ca1', label: 'CA 1', max: 30, enabled: true },
  { key: 'ca2', label: 'CA 2', max: 30, enabled: true },
  { key: 'assignment', label: 'Assignment', max: 40, enabled: true },
  { key: 'exam', label: 'Exam', max: 100, enabled: true },
];

export default function GradingSettingsTab() {
  const [config, setConfig] = useState<GradingConfig>({
    components: DEFAULT_COMPONENTS,
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
          setConfig(prev => ({ ...prev, ...gc, school: me.school_id! }));
        }
      } catch { /* use defaults */ }
      setLoading(false);
    })();
  }, []);

  function updateComponentField(idx: number, field: 'label' | 'max' | 'enabled', value: string | number | boolean) {
    setConfig(prev => {
      const comps = [...prev.components];
      comps[idx] = { ...comps[idx], [field]: value };
      return { ...prev, components: comps };
    });
  }

  function toggleComponent(key: string) {
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c),
    }));
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

  const enabledComponents = config.components.filter(c => c.enabled !== false);
  const maxTotal = enabledComponents.reduce((sum, c) => sum + c.max, 0);

  return (
    <div>
      <div className="max-w-2xl">
        <h3 className="text-lg font-semibold text-ink mb-1">Grading Configuration</h3>
        <p className="text-xs text-muted mb-4">Set the maximum scores and grade boundaries for your school.</p>

        {message && (
          <div className={`px-4 py-2 rounded text-xs mb-3 ${message.includes('Saved') ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>
            {message}
          </div>
        )}

        <div className="bg-surface border border-line rounded p-5 mb-4">
          <h4 className="text-sm font-semibold text-ink mb-3">Assessment Components</h4>
          <div className="space-y-3">
            {config.components.map((comp, idx) => (
              <div key={comp.key} className="flex items-center gap-3">
                <input type="checkbox" checked={comp.enabled !== false} onChange={() => toggleComponent(comp.key)}
                  className="w-4 h-4 accent-brand" />
                <input value={comp.label} onChange={e => updateComponentField(idx, 'label', e.target.value)}
                  className="flex-1 text-sm border border-line rounded px-3 py-2 bg-surface text-ink outline-none" />
                <span className="text-xs text-muted">Max</span>
                <input type="number" min="0" max="200" value={comp.max} onChange={e => updateComponentField(idx, 'max', parseInt(e.target.value) || 0)}
                  disabled={comp.enabled === false}
                  className="w-20 text-sm border border-line rounded px-3 py-2 bg-surface text-ink outline-none disabled:opacity-40" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">Total possible score: <strong className="text-ink">{maxTotal}</strong></p>
        </div>

        <div className="bg-surface border border-line rounded p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-ink">Grade Boundaries</h4>
            <button onClick={addBoundary}
              className="text-xs px-2.5 py-1 rounded bg-brand text-brand-ink hover:opacity-90">
              Add Grade
            </button>
          </div>
          <p className="text-xs text-muted mb-3">Boundaries are checked top-down (highest % first).</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-xs font-semibold text-muted">
                <th className="text-left px-2 py-1">Grade</th>
                <th className="text-left px-2 py-1">Minimum %</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {[...config.grade_boundaries].sort((a, b) => b.min_pct - a.min_pct).map((boundary, idx) => (
                <tr key={idx} className="border-t border-line">
                  <td className="px-2 py-1.5">
                    <input value={boundary.name} onChange={e => updateBoundary(idx, 'name', e.target.value)}
                      className="w-full text-sm px-2 py-1 rounded border border-line outline-none" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min="0" max="100" value={boundary.min_pct} onChange={e => updateBoundary(idx, 'min_pct', parseInt(e.target.value) || 0)}
                      className="w-full text-sm px-2 py-1 rounded border border-line outline-none" />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeBoundary(idx)} aria-label="Remove grade"
                      className="text-danger hover:text-danger text-xs"><X size={16} aria-hidden="true" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={handleSave} disabled={saving || loading}
          className="text-sm px-6 py-2.5 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Grading Settings'}
        </button>
      </div>
    </div>
  );
}