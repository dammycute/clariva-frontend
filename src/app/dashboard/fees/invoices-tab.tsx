'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { generateReceiptPDF } from '@/lib/receipt';

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

interface FeeItem { id: string; name: string; amount: number; class_group: string | null; year_group: string | null; }
interface Student { id: string; full_name: string; class_group: string | null; }
interface Cls { id: string; name: string; year_group: string | null; }

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'POS', 'Cheque'];
const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

export default function InvoicesTab({ onRefresh }: { onRefresh: () => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [loading, setLoading] = useState(true);
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

  async function loadAll() {
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
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  function openGenerate() {
    setGenForm({ fee_item_id: '', class_group: '', year_group: '', student_ids: [] });
    setGenStudents([]);
    setGenError('');
    setShowGenerate(true);
  }

  function handleClassSelect(value: string) {
    if (value.startsWith('yg:')) {
      const yg = value.slice(3);
      setGenForm({ ...genForm, class_group: '', year_group: yg, student_ids: [] });
      setGenStudents(students.filter(s => {
        const sc = clsList.find(c => c.id === s.class_group);
        return sc?.year_group === yg;
      }));
    } else {
      setGenForm({ ...genForm, class_group: value, year_group: '', student_ids: [] });
      setGenStudents(value ? students.filter(s => s.class_group === value) : []);
    }
  }

  function toggleStudent(id: string) {
    setGenForm(prev => ({ ...prev, student_ids: prev.student_ids.includes(id) ? prev.student_ids.filter(s => s !== id) : [...prev.student_ids, id] }));
  }
  function selectAll() { setGenForm({ ...genForm, student_ids: genStudents.map(s => s.id) }); }
  function deselectAll() { setGenForm({ ...genForm, student_ids: [] }); }

  function getApplicableFeeItems(studentId: string): FeeItem[] {
    const student = students.find(s => s.id === studentId);
    if (!student) return [];
    const studentCls = clsList.find(c => c.id === student.class_group);
    return feeItems.filter(f => {
      if (f.class_group) return f.class_group === student.class_group;
      if (f.year_group) return studentCls?.year_group === f.year_group;
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
          const applicable = getApplicableFeeItems(studentId);
          if (applicable.length === 0) continue;
          const total = applicable.reduce((s, f) => s + Number(f.amount), 0);
          await api.feeInvoices.create({
            student: studentId,
            amount_due: total,
            amount_paid: 0,
            status: 'unpaid',
            items: applicable.map(f => ({ fee_item: f.id, amount_due: f.amount, amount_paid: 0 })),
          } as Partial<Invoice>);
        }
      } else {
        const feeItem = feeItems.find(f => f.id === feeItemId);
        if (!feeItem) { setGenError('Fee item not found.'); return; }
        for (const studentId of studentIds) {
          if (existingStudentIds.has(studentId)) continue;
          await api.feeInvoices.create({
            student: studentId,
            amount_due: feeItem.amount,
            amount_paid: 0,
            status: 'unpaid',
            items: [{ fee_item: feeItemId, amount_due: feeItem.amount, amount_paid: 0 }],
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
    const map: Record<string, string> = { paid: 'bg-[#D1FAE5] text-[#065F46]', partial: 'bg-[#FEF3C7] text-[#D4930A]', unpaid: 'bg-[#FEE2E2] text-[#B91C1C]' };
    return map[s] || map.unpaid;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-[#0D2B55]">Invoices</h3>
        <button onClick={openGenerate} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ Generate Invoices</button>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading invoices…</div>
        : invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No invoices yet. Click Generate Invoices to create them.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
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
              {invoices.map(inv => {
                const items = inv.items || [];
                const balance = Number(inv.amount_due) - Number(inv.amount_paid);
                const isExpanded = expanded.has(inv.id);
                return (
                  <>
                    <tr key={inv.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleExpand(inv.id)} className="text-[#64748B] hover:text-[#0D2B55]">
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold">{inv.student_name}</td>
                      <td className="px-4 py-3 text-[#64748B]">{items.length} fee{items.length !== 1 ? 's' : ''}</td>
                      <td className="px-4 py-3">₦{Number(inv.amount_due).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#1A7A4A]">₦{Number(inv.amount_paid).toLocaleString()}</td>
                      <td className={`px-4 py-3 font-bold ${balance > 0 ? 'text-[#B91C1C]' : 'text-[#1A7A4A]'}`}>₦{balance.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(inv.status)}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {Number(inv.amount_paid) < Number(inv.amount_due) && (
                          <button onClick={() => openPayment(inv)} className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">Pay</button>
                        )}
                        {Number(inv.amount_paid) > 0 && (
                          <button onClick={() => handleDownloadReceipt(inv)} className="text-xs px-2 py-1 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA] ml-1.5">🧾</button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`detail-${inv.id}`}>
                        <td colSpan={8} className="px-4 py-3 bg-[#F7F9FC]">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[11px] font-bold text-[#64748B] uppercase">
                                <th className="text-left py-1.5">Fee Item</th>
                                <th className="text-right py-1.5">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map(it => (
                                <tr key={it.id} className="border-t border-[#DDE5F0]">
                                  <td className="py-2">{it.fee_name || 'Deleted fee'}</td>
                                  <td className="py-2 text-right">₦{Number(it.amount_due).toLocaleString()}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-[#DDE5F0] font-bold">
                                <td className="py-2 text-[#0D2B55]">Total</td>
                                <td className="py-2 text-right text-[#0D2B55]">₦{Number(inv.amount_due).toLocaleString()}</td>
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
          <div className="bg-white rounded-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">Generate Invoices</h2>
              <button onClick={() => setShowGenerate(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Fee Item</label>
                  <select value={genForm.fee_item_id} onChange={e => setGenForm({ ...genForm, fee_item_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select fee item</option>
                    <option value="__all__">📋 All Fee Items</option>
                    {feeItems.map(f => <option key={f.id} value={f.id}>{f.name} — ₦{Number(f.amount).toLocaleString()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Class</label>
                  <select value={genForm.year_group ? `yg:${genForm.year_group}` : genForm.class_group} onChange={e => handleClassSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">All classes</option>
                    <option disabled className="text-[#64748B] bg-[#F7F9FC]">— Year Groups —</option>
                    {YEAR_GROUPS.map(yg => (
                      <option key={yg} value={`yg:${yg}`}>{yg} (All Arms)</option>
                    ))}
                    <option disabled className="text-[#64748B] bg-[#F7F9FC]">— Specific Classes —</option>
                    {clsList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {genStudents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-[#64748B] uppercase">{genStudents.length} students</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAll} className="text-[11px] text-[#1A7A4A] hover:underline">Select all</button>
                      <button type="button" onClick={deselectAll} className="text-[11px] text-[#64748B] hover:underline">Deselect</button>
                    </div>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto border border-[#DDE5F0] rounded-lg divide-y divide-[#DDE5F0]">
                    {genStudents.map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#F8FAFF]">
                        <input type="checkbox" checked={genForm.student_ids.includes(s.id)} onChange={() => toggleStudent(s.id)}
                          className="w-4 h-4 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
                        <span className="text-sm text-[#0D2B55]">{s.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {genError && <p className="text-[11px] text-[#B91C1C]">{genError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowGenerate(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" disabled={generating || genForm.student_ids.length === 0 || !genForm.fee_item_id}
                  className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
                  {generating ? 'Generating…' : genForm.fee_item_id === '__all__' ? 'Generate Invoices' : `Generate ${genForm.student_ids.length} Invoice${genForm.student_ids.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPayment && payInvoice && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowPayment(false)}>
          <div className="bg-white rounded-2xl w-[440px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">Record Payment</h2>
              <button onClick={() => setShowPayment(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <div className="px-5 py-3 bg-[#F7F9FC] mx-5 rounded-lg mb-3">
              <p className="text-xs text-[#64748B]">{payInvoice.student_name}</p>
              <p className="text-[11px] text-[#64748B]">
                {(payInvoice.items || []).map(it => it.fee_name).filter(Boolean).join(', ') || 'Fee'}
                {' — '}Balance: <strong className="text-[#0D2B55]">₦{(Number(payInvoice.amount_due) - Number(payInvoice.amount_paid)).toLocaleString()}</strong>
              </p>
            </div>
            <form onSubmit={handlePayment} className="p-5 pt-0 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Amount</label>
                  <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required min="1"
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Method</label>
                  <select value={payForm.method} onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Reference (optional)</label>
                <input value={payForm.ref} onChange={e => setPayForm({ ...payForm, ref: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPayment(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
