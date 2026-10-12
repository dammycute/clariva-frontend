'use client';

import { useState, useEffect } from 'react';
import { request } from '@/lib/api';

interface School {
  id: string; name: string; subdomain: string; status: string;
  plan: string; current_academic_year: string; created_at: string;
  address?: string; state?: string; school_type?: string;
}

export default function SuperAdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await request<{ results: School[] }>('GET', '/schools/');
        setSchools(data.results || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all' ? schools : schools.filter(s => s.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Schools</h1>
          <p className="text-xs text-muted mt-0.5">{schools.length} total · {schools.filter(s => s.status === 'active').length} active</p>
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'suspended'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filter === f ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted hover:bg-brand-soft'
              }`}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-surface rounded animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-line rounded p-8 text-center text-sm text-muted">No schools found.</div>
      ) : (
        <div className="bg-surface border border-line rounded overflow-hidden">
          <div className="divide-y divide-line">
            {filtered.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{s.name}</p>
                  <p className="text-xs text-muted">{s.subdomain}.clariva.ng · {s.plan} · {s.current_academic_year}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p className="text-xs text-muted">{s.state || '-'}</p>
                    <p className="text-xs text-muted">{s.school_type || '-'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                    s.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'
                  }`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
