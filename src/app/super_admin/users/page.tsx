'use client';

import { useState, useEffect } from 'react';
import { request } from '@/lib/api';

interface User {
  id: string; username: string; email: string; first_name: string; last_name: string;
  role: string; is_active: boolean; school: string | null; school_id: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-[#FEE2E2] text-[#B91C1C]',
  school_admin: 'bg-[#E8F0FA] text-[#0D2B55]',
  admin_officer: 'bg-[#E8F0FA] text-[#0D2B55]',
  principal: 'bg-[#F3E8FF] text-[#7C3AED]',
  teacher: 'bg-[#DCFCE7] text-[#1A7A4A]',
  bursary: 'bg-[#FEF3C7] text-[#D4930A]',
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
        <h1 className="text-2xl font-bold text-[#0D2B55]">Users</h1>
        <p className="text-xs text-[#64748B] mt-0.5">{users.length} total users across all schools</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setRoleFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            roleFilter === 'all' ? 'bg-[#0D2B55] text-white' : 'bg-[#F0F4FA] text-[#64748B] hover:bg-[#E8F0FA]'
          }`}>All ({users.length})</button>
        {Object.entries(roleCounts).sort(([,a],[,b]) => b - a).map(([role, count]) => (
          <button key={role} onClick={() => setRoleFilter(role)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === role ? 'bg-[#0D2B55] text-white' : 'bg-[#F0F4FA] text-[#64748B] hover:bg-[#E8F0FA]'
            }`}>{role.replace('_', ' ')} ({count})</button>
        ))}
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search by name, email, or username..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] focus:border-transparent" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">No users found.</div>
      ) : (
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#DDE5F0]">
            {filtered.map(u => (
              <div key={u.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#0D2B55] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0D2B55] truncate">{u.first_name} {u.last_name}</p>
                    <p className="text-[10px] text-[#64748B] truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_COLORS[u.role] || 'bg-[#F0F4FA] text-[#64748B]'}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-[#1A7A4A]' : 'bg-[#B91C1C]'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
