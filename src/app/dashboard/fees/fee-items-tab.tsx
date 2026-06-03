'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ConfirmDialog from '@/components/confirm-dialog';

const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

interface FeeItem { id: string; name: string; amount: number; class_group: string | null; year_group: string | null; term: string | null; academic_year: string | null; is_mandatory: boolean; class_name?: string; }
interface Class { id: string; name: string; year_group: string | null; }

const TERMS = ['1st Term', '2nd Term', '3rd Term'];

function feeClassLabel(item: FeeItem, classes: Class[]): string {
  if (item.year_group) return `${item.year_group} (All Arms)`;
  if (item.class_group) return classes.find(c => c.id === item.class_group)?.name || '—';
  return 'All Classes';
}

export default function FeeItemsTab({ onRefresh }: { onRefresh: () => void }) {
  const [items, setItems] = useState<FeeItem[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', amount: '', class_group: '', year_group: '', term: '', academic_year: '2025/2026', is_mandatory: true });
  const [showBulk, setShowBulk] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    const [itRes, clRes] = await Promise.all([api.feeItems.list(), api.classes.list()]);
    setClasses(clRes as Class[]);
    setItems((itRes as FeeItem[]).map(i => ({ ...i, class_name: feeClassLabel(i, clRes as Class[]) })));
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ name: '', amount: '', class_group: '', year_group: '', term: '', academic_year: '2025/2026', is_mandatory: true });
    setShowModal(true);
  }
  function openEdit(i: FeeItem) {
    setEditingId(i.id);
    setForm({ name: i.name, amount: String(i.amount), class_group: i.class_group || '', year_group: i.year_group || '', term: i.term || '', academic_year: i.academic_year || '2025/2026', is_mandatory: i.is_mandatory });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      amount: Number(form.amount),
      class_group: form.class_group || null,
      year_group: form.year_group || null,
      term: form.term || null,
      academic_year: form.academic_year || null,
      is_mandatory: form.is_mandatory,
    };
    if (editingId) {
      await api.feeItems.update(editingId, payload);
    } else {
      await api.feeItems.create(payload);
    }
    setShowModal(false);
    loadItems();
    onRefresh();
  }

  async function handleDelete(id: string) {
    await api.feeItems.delete(id);
    setConfirmDelete(null);
    loadItems();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#64748B]">{items.length} fee items configured</p>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="text-sm px-3.5 py-2 rounded-lg border border-[#1A7A4A] text-[#1A7A4A] hover:bg-[#F0FBF4]">Bulk Create</button>
          <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ Add Fee Item</button>
        </div>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading fee items…</div>
        : items.length === 0 ? <div className="p-8 text-center text-sm text-[#64748B]">No fee items yet.</div>
        : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Term</th>
                <th className="text-left px-4 py-3">Academic Year</th>
                <th className="text-left px-4 py-3">Mandatory</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                  <td className="px-4 py-3 font-semibold">{i.name}</td>
                  <td className="px-4 py-3">₦{Number(i.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#64748B]">{i.class_name}</td>
                  <td className="px-4 py-3">{i.term || '—'}</td>
                  <td className="px-4 py-3">{i.academic_year || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${i.is_mandatory ? 'bg-[#FEF3C7] text-[#D4930A]' : 'bg-[#F7F9FC] text-[#64748B]'}`}>{i.is_mandatory ? 'Yes' : 'No'}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(i)} className="text-xs px-2 py-1 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">✏️</button>
                      <button onClick={() => setConfirmDelete(i.id)} className="text-xs px-2 py-1 rounded-lg border border-[#FEE2E2] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-[480px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">{editingId ? 'Edit Fee Item' : 'Add Fee Item'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Fee name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Amount (₦)</label>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="0"
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Applies to</label>
                  <select value={form.class_group || form.year_group ? (form.year_group ? `yg:${form.year_group}` : form.class_group) : ''}
                    onChange={e => {
                      const v = e.target.value;
                      if (v.startsWith('yg:')) setForm({ ...form, year_group: v.slice(3), class_group: '' });
                      else setForm({ ...form, class_group: v, year_group: '' });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">All Classes</option>
                    <option disabled className="text-[#64748B] bg-[#F7F9FC]">— Year Groups —</option>
                    {YEAR_GROUPS.map(yg => (
                      <option key={yg} value={`yg:${yg}`}>{yg} (All Arms)</option>
                    ))}
                    <option disabled className="text-[#64748B] bg-[#F7F9FC]">— Specific Classes —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Term</label>
                  <select value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">All Terms</option>
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Academic year</label>
                  <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mandatory" checked={form.is_mandatory} onChange={e => setForm({ ...form, is_mandatory: e.target.checked })}
                  className="w-4 h-4 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
                <label htmlFor="mandatory" className="text-sm text-[#0D2B55]">Mandatory fee</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">{editingId ? 'Save Changes' : 'Add Fee Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!confirmDelete} title="Delete Fee Item" message="Delete this fee item? It will also affect existing invoices." onConfirm={() => confirmDelete && handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />
      {showBulk && <BulkCreateModal classes={classes} onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); loadItems(); onRefresh(); }} />}
    </div>
  );
}

function BulkCreateModal({ classes, onClose, onDone }: { classes: Class[]; onClose: () => void; onDone: () => void }) {
  const activeYgs = [...new Set(classes.map(c => c.year_group).filter(Boolean) as string[])];
  const columns = ['__all__', ...YEAR_GROUPS.filter(yg => activeYgs.includes(yg))];
  const [rows, setRows] = useState<{ name: string; amounts: Record<string, string>; term: string; academic_year: string; is_mandatory: boolean }[]>([
    { name: 'Tuition', amounts: {}, term: '1st Term', academic_year: '2025/2026', is_mandatory: true },
    { name: 'PTA Levy', amounts: {}, term: '1st Term', academic_year: '2025/2026', is_mandatory: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function addRow() {
    setRows([...rows, { name: '', amounts: {}, term: '1st Term', academic_year: '2025/2026', is_mandatory: true }]);
  }
  function removeRow(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
  }
  function setCell(rowIdx: number, colKey: string, val: string) {
    const next = [...rows];
    next[rowIdx] = { ...next[rowIdx], amounts: { ...next[rowIdx].amounts, [colKey]: val } };
    setRows(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const toCreate: { name: string; amount: number; year_group: string | null; term: string | null; academic_year: string | null; is_mandatory: boolean }[] = [];
    for (const row of rows) {
      if (!row.name.trim()) continue;
      for (const [colKey, val] of Object.entries(row.amounts)) {
        const amt = Number(val);
        if (!amt || amt <= 0) continue;
        toCreate.push({
          name: row.name.trim(),
          amount: amt,
          year_group: colKey === '__all__' ? null : colKey,
          term: row.term || null,
          academic_year: row.academic_year || null,
          is_mandatory: row.is_mandatory,
        });
      }
    }
    if (toCreate.length === 0) { setError('Fill at least one amount cell.'); return; }
    setSubmitting(true);
    try {
      await Promise.all(toCreate.map(item => api.feeItems.create(item)));
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create fees');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90vw] max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-base font-bold text-[#0D2B55]">Bulk Create Fees</h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 flex-1 overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F9FC]">
                  <th className="sticky left-0 bg-[#F7F9FC] z-10 text-left px-3 py-2.5 text-[11px] font-bold text-[#64748B] uppercase min-w-[140px]">Fee Name</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-bold text-[#1A7A4A] uppercase min-w-[100px]">All Classes</th>
                  {YEAR_GROUPS.filter(yg => activeYgs.includes(yg)).map(yg => (
                    <th key={yg} className="text-left px-3 py-2.5 text-[11px] font-bold text-[#0D2B55] uppercase min-w-[100px]">{yg}</th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-[#DDE5F0]">
                    <td className="sticky left-0 bg-white z-10 px-3 py-2">
                      <input value={row.name} onChange={e => { const n = [...rows]; n[ri] = { ...n[ri], name: e.target.value }; setRows(n); }}
                        placeholder="Fee name" required
                        className="w-full px-2 py-1.5 rounded border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                    </td>
                    {columns.map(colKey => (
                      <td key={colKey} className="px-3 py-2">
                        <input type="number" min="0" placeholder="₦" value={row.amounts[colKey] || ''}
                          onChange={e => setCell(ri, colKey, e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      {rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(ri)} className="text-[#B91C1C] text-sm hover:text-red-700">✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addRow} className="text-sm text-[#1A7A4A] hover:underline">+ Add another fee type</button>
          <div className="flex items-center gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Term</label>
              <select value={rows[0]?.term || '1st Term'} onChange={e => setRows(rows.map(r => ({ ...r, term: e.target.value })))}
                className="px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Academic year</label>
              <input value={rows[0]?.academic_year || '2025/2026'} onChange={e => setRows(rows.map(r => ({ ...r, academic_year: e.target.value })))}
                className="px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="bulk-mandatory" checked={rows[0]?.is_mandatory ?? true}
                onChange={e => setRows(rows.map(r => ({ ...r, is_mandatory: e.target.checked })))}
                className="w-4 h-4 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
              <label htmlFor="bulk-mandatory" className="text-sm text-[#0D2B55]">Mandatory</label>
            </div>
          </div>
          {error && <p className="text-[11px] text-[#B91C1C]">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5F0]">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
            <button type="submit" disabled={submitting} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
              {submitting ? 'Creating…' : `Create ${rows.reduce((sum, r) => sum + Object.values(r.amounts).filter(v => Number(v) > 0).length, 0)} Fees`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
