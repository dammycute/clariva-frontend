'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Search, UserPlus, X } from 'lucide-react';
import { auth } from '@/lib/api';
import { listAll, type AdminSchool } from '@/lib/admin';

type Person = {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  school_id: string | null;
};

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-danger-soft text-danger',
  school_admin: 'bg-brand-soft text-brand',
  admin_officer: 'bg-brand-soft text-brand',
  principal: 'bg-brand-soft text-brand',
  teacher: 'bg-success/10 text-success',
  bursary: 'bg-warning/10 text-warning',
  student: 'bg-surface-2 text-muted',
  parent: 'bg-warning/10 text-warning',
};

export default function ConsoleUsers() {
  const [users, setUsers] = useState<Person[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [schoolId, setSchoolId] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirst, setInviteFirst] = useState('');
  const [inviteLast, setInviteLast] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      listAll<Person>('/auth/users/'),
      listAll<AdminSchool>('/schools/').catch(() => [] as AdminSchool[]),
    ])
      .then(([people, list]) => { setUsers(people); setSchools(list); })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load users.'))
      .finally(() => setLoading(false));
  }, []);

  const schoolNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schools) map.set(s.id, s.name);
    return map;
  }, [schools]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) counts[u.role] = (counts[u.role] || 0) + 1;
    return counts;
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u => {
      if (role !== 'all' && u.role !== role) return false;
      if (schoolId !== 'all' && u.school_id !== schoolId) return false;
      if (!q) return true;
      const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      return [name, u.email, u.username].some(v => (v || '').toLowerCase().includes(q));
    });
  }, [users, query, role, schoolId]);

  const activeCount = users.filter(u => u.is_active).length;

  function closeInvite() {
    if (inviting) return;
    setInviteOpen(false);
    setInviteEmail(''); setInviteFirst(''); setInviteLast('');
    setInviteError(''); setCreated(null); setCopied(false);
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      const data = await auth.generateAdminLogin({
        email: inviteEmail.trim(),
        first_name: inviteFirst.trim(),
        last_name: inviteLast.trim(),
      });
      setCreated({ email: data.email, password: data.password });
      setUsers(prev => [data.user as unknown as Person, ...prev]);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setInviting(false);
    }
  }

  async function copyCreds() {
    if (!created) return;
    await navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
  }

  return (
    <div className="max-w-[1120px]">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-ink leading-tight">Users</h1>
          <p className="text-[13px] text-muted mt-1">
            {users.length} accounts across every school · {activeCount} active
          </p>
        </div>
        <button
          onClick={() => { setCreated(null); setInviteError(''); setInviteOpen(true); }}
          className="shrink-0 h-10 px-4 rounded bg-brand text-brand-ink text-sm font-medium hover:opacity-90 cursor-pointer inline-flex items-center gap-1.5"
        >
          <UserPlus size={15} />
          New admin
        </button>
      </header>

      {error && (
        <div role="alert" className="mb-4 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, email, username…"
            aria-label="Search users"
            className="w-full h-11 pl-9 pr-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
          />
        </div>
        <select
          value={schoolId}
          onChange={e => setSchoolId(e.target.value)}
          aria-label="Filter by school"
          className="h-11 px-3 rounded border border-line bg-surface text-[13px] text-ink outline-none focus:border-brand max-w-[260px]"
        >
          <option value="all">All schools</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button
          onClick={() => setRole('all')}
          aria-pressed={role === 'all'}
          className={`px-3 h-9 rounded text-xs font-medium transition-colors cursor-pointer ${
            role === 'all' ? 'bg-brand text-brand-ink' : 'bg-surface border border-line text-muted hover:text-ink'
          }`}
        >
          All {users.length}
        </button>
        {Object.entries(roleCounts).sort(([, a], [, b]) => b - a).map(([r, count]) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            aria-pressed={role === r}
            className={`px-3 h-9 rounded text-xs font-medium capitalize transition-colors cursor-pointer ${
              role === r ? 'bg-brand text-brand-ink' : 'bg-surface border border-line text-muted hover:text-ink'
            }`}
          >
            {r.replace('_', ' ')} {count}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse" aria-hidden="true">
                <div className="h-4 w-1/4 rounded bg-surface-2" />
                <div className="h-3 w-1/5 rounded bg-surface-2 mt-2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted text-center">
            {users.length === 0 ? 'No users yet.' : 'No users match these filters.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(u => {
              const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
              return (
                <li key={u.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-brand text-brand-ink text-xs font-semibold flex items-center justify-center shrink-0">
                    {(u.first_name?.[0] || name[0] || '?').toUpperCase()}
                    {(u.last_name?.[0] || '').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{name}</span>
                    <span className="block text-xs text-muted truncate">{u.email}</span>
                  </span>
                  <span className="hidden sm:block text-xs text-muted truncate max-w-[220px] shrink-0">
                    {u.school_id ? schoolNames.get(u.school_id) || 'School' : 'No school'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded capitalize shrink-0 ${ROLE_BADGE[u.role] || 'bg-surface-2 text-muted'}`}>
                    {u.role.replace('_', ' ')}
                  </span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${u.is_active ? 'bg-success' : 'bg-danger'}`} aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted mt-3">Showing {filtered.length} of {users.length} accounts.</p>
      )}

      {inviteOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !inviting && closeInvite()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-admin-title"
            className="w-full max-w-md bg-surface border border-line rounded-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line">
              <div>
                <h2 id="new-admin-title" className="text-base font-semibold text-ink">New admin login</h2>
                <p className="text-xs text-muted mt-0.5">
                  The server generates the password. They set their own on first sign-in.
                </p>
              </div>
              <button
                onClick={closeInvite}
                disabled={inviting}
                aria-label="Close"
                className="text-muted hover:text-ink cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {created ? (
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-ink">
                  Share these with the new admin once. The password is not shown again.
                </p>
                <dl className="rounded border border-line bg-page px-3 py-2.5 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted text-xs">Email</dt>
                    <dd className="text-ink font-medium truncate">{created.email}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted text-xs">Password</dt>
                    <dd className="text-brand font-semibold font-mono">{created.password}</dd>
                  </div>
                </dl>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={copyCreds}
                    className="h-10 px-4 rounded border border-line text-sm text-ink hover:bg-surface-2 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={closeInvite}
                    className="h-10 px-4 rounded bg-brand text-brand-ink text-sm hover:opacity-90 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={createAdmin} className="px-5 py-4 space-y-3">
                {inviteError && (
                  <div role="alert" className="text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
                    {inviteError}
                  </div>
                )}
                <div>
                  <label htmlFor="invite-email" className="block text-xs font-semibold text-muted mb-1">Email</label>
                  <input
                    id="invite-email"
                    type="email"
                    autoFocus
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="invite-first" className="block text-xs font-semibold text-muted mb-1">First name</label>
                    <input
                      id="invite-first"
                      value={inviteFirst}
                      onChange={e => setInviteFirst(e.target.value)}
                      className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label htmlFor="invite-last" className="block text-xs font-semibold text-muted mb-1">Last name</label>
                    <input
                      id="invite-last"
                      value={inviteLast}
                      onChange={e => setInviteLast(e.target.value)}
                      className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeInvite}
                    className="h-10 px-4 rounded border border-line text-sm text-muted hover:text-ink cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="h-10 px-4 rounded bg-brand text-brand-ink text-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {inviting ? 'Creating…' : 'Generate login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
