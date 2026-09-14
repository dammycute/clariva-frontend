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
          <h1 className="text-2xl font-bold text-[#0D2B55]">Schools</h1>
          <p className="text-xs text-[#64748B] mt-0.5">{schools.length} total · {schools.filter(s => s.status === 'active').length} active</p>
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'suspended'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-[#0D2B55] text-white' : 'bg-[#F0F4FA] text-[#64748B] hover:bg-[#E8F0FA]'
              }`}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">No schools found.</div>
      ) : (
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#DDE5F0]">
            {filtered.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0D2B55] truncate">{s.name}</p>
                  <p className="text-[11px] text-[#64748B]">{s.subdomain}.clariva.ng · {s.plan} · {s.current_academic_year}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p className="text-[11px] text-[#64748B]">{s.state || '—'}</p>
                    <p className="text-[10px] text-[#64748B]">{s.school_type || '—'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                    s.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'
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
