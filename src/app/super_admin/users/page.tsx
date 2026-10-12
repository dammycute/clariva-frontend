'use client';

import { useState, useEffect } from 'react';
import { request } from '@/lib/api';

interface User {
  id: string; username: string; email: string; first_name: string; last_name: string;
  role: string; is_active: boolean; school: string | null; school_id: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-danger-soft text-danger',
  school_admin: 'bg-brand-soft text-ink',
  admin_officer: 'bg-brand-soft text-ink',
  principal: 'bg-brand-soft text-brand',
  teacher: 'bg-success/10 text-success',
  bursary: 'bg-warning/10 text-warning',
  student: 'bg-[#E0F2FE] text-[#0369A1]',
  parent: 'bg-[#FFF7ED] text-[#C2410C]',
};

export default function SuperAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await request<{ results: User[] }>('GET', '/auth/users/');
        setUsers(data.results || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) ||
             u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
    }
    return true;
  });

  const roleCounts = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">Users</h1>
        <p className="text-xs text-muted mt-0.5">{users.length} total users across all schools</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setRoleFilter('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            roleFilter === 'all' ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted hover:bg-brand-soft'
          }`}>All ({users.length})</button>
        {Object.entries(roleCounts).sort(([,a],[,b]) => b - a).map(([role, count]) => (
          <button key={role} onClick={() => setRoleFilter(role)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              roleFilter === role ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted hover:bg-brand-soft'
            }`}>{role.replace('_', ' ')} ({count})</button>
        ))}
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search by name, email, or username..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-surface rounded animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-line rounded p-8 text-center text-sm text-muted">No users found.</div>
      ) : (
        <div className="bg-surface border border-line rounded overflow-hidden">
          <div className="divide-y divide-line">
            {filtered.map(u => (
              <div key={u.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand text-brand-ink text-xs font-semibold flex items-center justify-center shrink-0">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[u.role] || 'bg-surface-2 text-muted'}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-brand' : 'bg-danger'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
