'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { generateReceiptPDF } from '@/lib/receipt';
import { Search, FileText, X, ChevronDown, ChevronRight } from 'lucide-react';

interface InvoiceItem {
  id: string;
  fee_item: string | null;
  fee_name: string | null;
  amount_due: number;
  amount_paid: number;
}

interface Invoice {
  id: string;
  student: string;
  fee_item: string | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  student_name?: string;
  fee_name?: string;
  items: InvoiceItem[];
}

interface FeeItem { id: string; name: string; amount: number; class_group: string | null; year_group: string | null; arm: string | null; pricing_tiers: Record<string, number> | null; is_mandatory: boolean; }
interface Student { id: string; first_name: string; last_name: string; class_group: string | null; }
interface Cls { id: string; name: string; year_group: string | null; arm: string | null; }

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque'];
const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
const CATEGORY_GROUPS = ['JSS', 'SS'];
const ARMS = ['A', 'B', 'C'];

export default function InvoicesTab({ onRefresh }: { onRefresh: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schoolName, setSchoolName] = useState('Clariva');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ fee_item_id: '', class_group: '', year_group: '', student_ids: [] as string[] });
  const [genStudents, setGenStudents] = useState<Student[]>([]);
  const [genError, setGenError] = useState('');
  const [generating, setGenerating] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', ref: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedFeeItemIds, setSelectedFeeItemIds] = useState<Set<string>>(new Set());

  function filteredInvoices() {
    return invoices.filter(inv => {
      if (searchQuery && !inv.student_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter && inv.status !== statusFilter) return false;
      return true;
    });
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [invRes, feeRes, stuRes, clsRes, me] = await Promise.all([
        api.feeInvoices.list(),
        api.feeItems.list(),
        api.students.list({ status: 'active' }),
        api.classes.list(),
        auth.me(),
      ]);
      setInvoices(invRes as Invoice[]);
      setFeeItems(feeRes as FeeItem[]);
      setStudents(stuRes as Student[]);
      setClsList(clsRes as Cls[]);
      if (me?.school_id) setSchoolName('Clariva');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function openGenerate() {
    setGenForm({ fee_item_id: '', class_group: '', year_group: '', student_ids: [] });
    setGenStudents([]);
    setGenError('');
    setSelectedFeeItemIds(new Set(feeItems.filter(f => f.is_mandatory).map(f => f.id)));
    setShowGenerate(true);
  }

  function handleClassSelect(value: string) {
    if (value.startsWith('yg:')) {
      const yg = value.slice(3);
      setGenForm({ ...genForm, class_group: '', year_group: yg, student_ids: [] });
      setGenStudents(students.filter(s => {
        const sc = clsList.find(c => c.id === s.class_group);
        if (!sc?.year_group) return false;
        return CATEGORY_GROUPS.includes(yg) ? sc.year_group.startsWith(yg) : sc.year_group === yg;
      }));
    } else {
      setGenForm({ ...genForm, class_group: value, year_group: '', student_ids: [] });
      setGenStudents(value ? students.filter(s => String(s.class_group) === value) : students);
    }
  }

  function toggleStudent(id: string) {
    setGenForm(prev => ({ ...prev, student_ids: prev.student_ids.includes(id) ? prev.student_ids.filter(s => s !== id) : [...prev.student_ids, id] }));
  }
  function selectAll() { setGenForm({ ...genForm, student_ids: genStudents.map(s => s.id) }); }
  function deselectAll() { setGenForm({ ...genForm, student_ids: [] }); }

  function getStudentInfo(studentId: string): { arm: string | null; yg: string | null } {
    const student = students.find(s => s.id === studentId);
    if (!student) return { arm: null, yg: null };
    const cls = clsList.find(c => c.id === student.class_group);
    return { arm: cls?.arm ?? null, yg: cls?.year_group ?? null };
  }

  function effectiveAmount(fee: FeeItem, yg: string | null): number {
    if (fee.pricing_tiers && yg && fee.pricing_tiers[yg]) return fee.pricing_tiers[yg];
    return Number(fee.amount);
  }

  function getApplicableFeeItems(studentId: string): FeeItem[] {
    const student = students.find(s => s.id === studentId);
    if (!student) return [];
    const studentCls = clsList.find(c => c.id === student.class_group);
    return feeItems.filter(f => {
      if (f.class_group) return String(f.class_group) === String(student.class_group);
      const ygMatch = !f.year_group || (studentCls?.year_group?.startsWith(f.year_group) ?? false);
      const armMatch = !f.arm || studentCls?.arm === f.arm;
      if (f.year_group || f.arm) return ygMatch && armMatch;
      return true;
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError('');
    const feeItemId = genForm.fee_item_id;
    const studentIds = genForm.student_ids;
    if (!feeItemId) { setGenError('Select a fee item or "All Fee Items".'); return; }
    if (studentIds.length === 0) { setGenError('Select at least one student.'); return; }
    setGenerating(true);

    try {
      // Fetch fresh invoices to avoid duplicate generation from stale state
      const freshInvoices = await api.feeInvoices.list() as Invoice[];
      const existingStudentIds = new Set(freshInvoices.map(inv => inv.student));

      if (feeItemId === '__all__') {
        for (const studentId of studentIds) {
          if (existingStudentIds.has(studentId)) continue;
          const applicable = getApplicableFeeItems(studentId).filter(f => selectedFeeItemIds.has(f.id));
          if (applicable.length === 0) continue;
          const info = getStudentInfo(studentId);
          const items = applicable.map(f => ({ fee_item: f.id, amount_due: effectiveAmount(f, info.yg), amount_paid: 0 }));
          const total = items.reduce((s, it) => s + it.amount_due, 0);
          await api.feeInvoices.create({
            student: studentId,
            amount_due: total,
            amount_paid: 0,
            status: 'unpaid',
            items,
          } as Partial<Invoice>);
        }
      } else {
        const feeItem = feeItems.find(f => f.id === feeItemId);
        if (!feeItem) { setGenError('Fee item not found.'); return; }
        for (const studentId of studentIds) {
          if (existingStudentIds.has(studentId)) continue;
          const info = getStudentInfo(studentId);
          const amt = effectiveAmount(feeItem, info.yg);
          await api.feeInvoices.create({
            student: studentId,
            amount_due: amt,
            amount_paid: 0,
            status: 'unpaid',
            items: [{ fee_item: feeItemId, amount_due: amt, amount_paid: 0 }],
          } as Partial<Invoice>);
        }
      }
      setShowGenerate(false);
      loadAll();
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setGenError(msg);
    } finally {
      setGenerating(false);
    }
  }

  function openPayment(inv: Invoice) {
    setPayInvoice(inv);
    setPayForm({ amount: String(Number(inv.amount_due) - Number(inv.amount_paid)), method: 'Cash', ref: '' });
    setShowPayment(true);
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payInvoice) return;
    const payAmount = Number(payForm.amount);
    if (payAmount <= 0) return;

    const newPaid = Number(payInvoice.amount_paid) + payAmount;
    const newStatus = newPaid >= Number(payInvoice.amount_due) ? 'paid' : 'partial';

    await api.feeInvoices.patch(payInvoice.id, {
      amount_paid: newPaid,
      status: newStatus,
      payment_method: payForm.method,
      payment_ref: payForm.ref || null,
      paid_at: new Date().toISOString(),
    } as Partial<Invoice>);

    setShowPayment(false);
    loadAll();
    onRefresh();
  }

  function handleDownloadReceipt(inv: Invoice) {
    const items = inv.items || [];
    generateReceiptPDF({
      schoolName,
      studentName: inv.student_name || 'Student',
      admissionNo: '',
      items: items.map(it => ({ feeName: it.fee_name || 'Fee', amountDue: Number(it.amount_due) })),
      amountDue: Number(inv.amount_due),
      amountPaid: Number(inv.amount_paid),
      balance: Number(inv.amount_due) - Number(inv.amount_paid),
      paymentMethod: inv.payment_method,
      paymentRef: inv.payment_ref,
      date: new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { paid: 'bg-success/10 text-success', partial: 'bg-warning/10 text-warning', unpaid: 'bg-danger-soft text-danger' };
    return map[s] || map.unpaid;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-ink">Invoices</h3>
        <button onClick={openGenerate} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90">+ Generate Invoices</button>
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/30 text-danger rounded p-6 text-center mb-4">
          <p className="text-sm mb-3">{error}</p>
          <button onClick={loadAll} className="text-sm px-4 py-2 rounded bg-danger text-white hover:bg-danger">Try Again</button>
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" aria-hidden="true"><Search size={16} /></span>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student…"
            className="w-full pl-8 pr-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-line rounded px-3 py-2 bg-surface text-muted outline-none">
          <option value="">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <p className="text-xs text-muted ml-auto">{filteredInvoices().length} of {invoices.length} invoices</p>
      </div>

      <div className="bg-surface border border-line rounded overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-muted">Loading invoices…</div>
        : filteredInvoices().length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">{invoices.length === 0 ? 'No invoices yet. Click Generate Invoices to create them.' : 'No invoices match your filters.'}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-xs font-semibold text-muted bg-page">
                <th className="text-left px-4 py-3 w-8"></th>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Items</th>
                <th className="text-left px-4 py-3">Total Due</th>
                <th className="text-left px-4 py-3">Paid</th>
                <th className="text-left px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices().map(inv => {
                const items = inv.items || [];
                const balance = Number(inv.amount_due) - Number(inv.amount_paid);
                const isExpanded = expanded.has(inv.id);
                return (
                  <>
                    <tr key={inv.id} className="hover:bg-page border-t border-line">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleExpand(inv.id)} className="text-muted hover:text-ink" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                          {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold">{inv.student_name}</td>
                      <td className="px-4 py-3 text-muted">{items.length} fee{items.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3">₦{Number(inv.amount_due).toLocaleString()}</td>
                      <td className="px-4 py-3 text-brand">₦{Number(inv.amount_paid).toLocaleString()}</td>
                      <td className={`px-4 py-3 font-semibold ${balance > 0 ? 'text-danger' : 'text-brand'}`}>₦{balance.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${statusBadge(inv.status)}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {Number(inv.amount_paid) < Number(inv.amount_due) && (
                          <button onClick={() => openPayment(inv)} className="text-xs px-2.5 py-1 rounded bg-brand text-brand-ink hover:opacity-90">Pay</button>
                        )}
                        {Number(inv.amount_paid) > 0 && (
                          <button onClick={() => handleDownloadReceipt(inv)} aria-label="Download receipt" className="text-xs px-2 py-1 rounded border border-line bg-surface hover:bg-surface-2 ml-1.5"><FileText size={16} aria-hidden="true" /></button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`detail-${inv.id}`}>
                        <td colSpan={8} className="px-4 py-3 bg-page">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-xs font-semibold text-muted">
                                <th className="text-left py-1.5">Fee Item</th>
                                <th className="text-right py-1.5">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map(it => (
                                <tr key={it.id} className="border-t border-line">
                                  <td className="py-2">{it.fee_name || 'Deleted fee'}</td>
                                  <td className="py-2 text-right">₦{Number(it.amount_due).toLocaleString()}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-line font-semibold">
                                <td className="py-2 text-ink">Total</td>
                                <td className="py-2 text-right text-ink">₦{Number(inv.amount_due).toLocaleString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showGenerate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowGenerate(false)}>
          <div className="bg-surface rounded w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">Generate Invoices</h2>
              <button onClick={() => setShowGenerate(false)} className="text-muted hover:text-ink text-lg" aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Fee Item</label>
                  <select value={genForm.fee_item_id} onChange={e => setGenForm({ ...genForm, fee_item_id: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                    <option value="">Select fee item</option>
                    <option value="__all__">All Fee Items</option>
                    {feeItems.map(f => <option key={f.id} value={f.id}>{f.name} - ₦{Number(f.amount).toLocaleString()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Class</label>
                  <select value={genForm.year_group ? `yg:${genForm.year_group}` : genForm.class_group} onChange={e => handleClassSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                    <option value="">All classes</option>
                    <option disabled className="text-muted bg-page">- Categories -</option>
                    {CATEGORY_GROUPS.map(cg => (
                      <option key={cg} value={`yg:${cg}`}>{cg} (All Classes)</option>
                    ))}
                    <option disabled className="text-muted bg-page">- Year Groups -</option>
                    {YEAR_GROUPS.map(yg => (
                      <option key={yg} value={`yg:${yg}`}>{yg} (All Arms)</option>
                    ))}
                    <option disabled className="text-muted bg-page">- Specific Classes -</option>
                    {clsList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {genForm.fee_item_id === '__all__' && (
                <div>
                  <label className="text-xs font-semibold text-muted mb-1.5 block">Fee Items to Include</label>
                  <div className="border border-line rounded divide-y divide-line max-h-[180px] overflow-y-auto">
                    {feeItems
                      .slice()
                      .sort((a, b) => (a.is_mandatory === b.is_mandatory ? 0 : a.is_mandatory ? -1 : 1))
                      .map(f => {
                        const checked = selectedFeeItemIds.has(f.id);
                        return (
                          <label key={f.id} className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-page ${f.is_mandatory ? 'bg-[#F0FBF4]' : ''}`}>
                            <input type="checkbox" checked={checked}
                              onChange={() => setSelectedFeeItemIds(prev => { const n = new Set(prev); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })}
                              className="w-4 h-4 rounded border-line text-brand focus:ring-brand" />
                            <span className="text-sm text-ink flex-1">{f.name}</span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${f.is_mandatory ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{f.is_mandatory ? 'Mandatory' : 'Optional'}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
              {genStudents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-muted">{genStudents.length} students</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAll} className="text-xs text-brand hover:underline">Select all</button>
                      <button type="button" onClick={deselectAll} className="text-xs text-muted hover:underline">Deselect</button>
                    </div>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto border border-line rounded divide-y divide-line">
                    {genStudents.map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-page">
                        <input type="checkbox" checked={genForm.student_ids.includes(s.id)} onChange={() => toggleStudent(s.id)}
                          className="w-4 h-4 rounded border-line text-brand focus:ring-brand" />
                        <span className="text-sm text-ink">{s.first_name} {s.last_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {genError && <p className="text-xs text-danger">{genError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowGenerate(false)} className="text-sm px-4 py-2 rounded border border-line bg-surface hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={generating || genForm.student_ids.length === 0 || !genForm.fee_item_id}
                  className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">
                  {generating ? 'Generating…' : genForm.fee_item_id === '__all__' ? 'Generate Invoices' : `Generate ${genForm.student_ids.length} Invoice${genForm.student_ids.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayment && payInvoice && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowPayment(false)}>
          <div className="bg-surface rounded w-[440px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">Record Payment</h2>
              <button onClick={() => setShowPayment(false)} className="text-muted hover:text-ink text-lg" aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <div className="px-5 py-3 bg-page mx-5 rounded mb-3">
              <p className="text-xs text-muted">{payInvoice.student_name}</p>
              <p className="text-xs text-muted">
                {(payInvoice.items || []).map(it => it.fee_name).filter(Boolean).join(', ') || 'Fee'}
                {' - '}Balance: <strong className="text-ink">₦{(Number(payInvoice.amount_due) - Number(payInvoice.amount_paid)).toLocaleString()}</strong>
              </p>
            </div>
            <form onSubmit={handlePayment} className="p-5 pt-0 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Amount</label>
                  <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required min="1"
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Method</label>
                  <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Reference (optional)</label>
                <input value={payForm.ref} onChange={e => setPayForm({ ...payForm, ref: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPayment(false)} className="text-sm px-4 py-2 rounded border border-line bg-surface hover:bg-surface-2">Cancel</button>
                <button type="submit" className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
