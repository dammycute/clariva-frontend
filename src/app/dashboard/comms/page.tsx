'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Smartphone, Megaphone, Pencil, X } from 'lucide-react';

interface Announcement {
  id: string; title: string; body: string; audience: string | null;
  created_by: number | null; created_by_name: string | null;
  published_at: string | null; created_at: string;
}

const AUDIENCES = ['All', 'Teachers Only', 'Students Only', 'Parents Only'];

export default function CommunicationsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', audience: 'All' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await api.announcements.list();
    setItems(data as Announcement[]);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ title: '', body: '', audience: 'All' });
    setShowModal(true);
  }
  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, audience: a.audience || 'All' });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.announcements.update(editingId, form);
      } else {
        await api.announcements.create(form);
      }
      setShowModal(false);
      load();
    } catch { toast.error('Failed to save announcement'); }
    finally { setSaving(false); }
  }

  async function togglePublish(a: Announcement) {
    if (a.published_at) {
      await api.announcements.update(a.id, { published_at: null } as Partial<Announcement>);
    } else {
      await api.announcements.update(a.id, { published_at: new Date().toISOString() } as Partial<Announcement>);
    }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Communications</h1>
          <p className="text-xs text-muted mt-0.5">{items.filter(a => a.published_at).length} published · {items.length} total</p>
        </div>
        <div className="flex gap-2">
          <button className="text-sm px-3.5 py-2 rounded border border-brand text-ink hover:bg-surface-2 inline-flex items-center gap-1.5"><Smartphone size={16} aria-hidden="true" /> SMS Broadcast</button>
          <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded bg-brand text-brand-ink hover:opacity-90">+ New Announcement</button>
        </div>
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading announcements…</div>
        ) : items.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="text-4xl mb-3" aria-hidden="true"><Megaphone size={24} /></div>
            <h3 className="text-base font-semibold text-ink mb-1">No announcements yet</h3>
            <p className="text-xs text-muted">Create your first announcement to notify teachers, students, or parents.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {items.map(a => (
              <div key={a.id} className="px-4 py-3.5 hover:bg-page">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${a.published_at ? 'text-ink' : 'text-muted'}`}>{a.title}</h3>
                      {a.published_at && <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded font-semibold">Published</span>}
                      {!a.published_at && <span className="text-xs bg-surface-2 text-muted px-1.5 py-0.5 rounded">Draft</span>}
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{a.body}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                      <span>Audience: <strong>{a.audience || 'All'}</strong></span>
                      <span>By {a.created_by_name || 'System'}</span>
                      <span>{new Date(a.created_at).toLocaleDateString('en-NG')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(a)}
                      className="text-xs px-2 py-1 rounded border border-line hover:bg-surface-2" aria-label="Edit"><Pencil size={16} aria-hidden="true" /></button>
                    <button onClick={() => togglePublish(a)}
                      className={`text-xs px-2 py-1 rounded border ${a.published_at ? 'border-danger-soft text-danger hover:bg-danger-soft' : 'border-success/10 text-success hover:bg-success/10'}`}>
                      {a.published_at ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded w-[520px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-ink text-lg" aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Message</label>
                <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required rows={4}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Audience</label>
                <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                  {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded border border-line bg-surface hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Create Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
