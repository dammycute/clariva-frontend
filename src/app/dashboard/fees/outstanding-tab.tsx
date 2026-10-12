'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Search, CheckCircle2 } from 'lucide-react';

interface StudentBalance { student_id: string; student_name: string; class_name: string; total_due: number; total_paid: number; balance: number; status: string; }

export default function OutstandingTab() {
  const [report, setReport] = useState<StudentBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    setLoading(true);
    const [invRes, stuRes, clsRes] = await Promise.all([
      api.feeInvoices.list(),
      api.students.list({ status: 'active' }),
      api.classes.list(),
    ]);

    const students = stuRes as { id: string; first_name: string; last_name: string; class_group: string | null }[];
    const classes = clsRes as { id: string; name: string }[];
    const invoices = invRes as { student: string; amount_due: number; amount_paid: number }[];

    const classMap = new Map(classes.map(c => [c.id, c.name]));
    const agg = new Map<string, { due: number; paid: number }>();

    for (const inv of invoices) {
      const existing = agg.get(inv.student) || { due: 0, paid: 0 };
      existing.due += Number(inv.amount_due);
      existing.paid += Number(inv.amount_paid);
      agg.set(inv.student, existing);
    }

    const rows: StudentBalance[] = [];
    for (const [student_id, { due, paid }] of agg) {
      const student = students.find(s => s.id === student_id);
      if (!student) continue;
      const balance = due - paid;
      if (balance <= 0) continue;
      rows.push({
        student_id, student_name: `${student.first_name} ${student.last_name}`.trim(),
        class_name: classMap.get(student.class_group || '') || '-',
        total_due: due, total_paid: paid, balance,
        status: paid === 0 ? 'unpaid' : 'partial',
      });
    }
    rows.sort((a, b) => b.balance - a.balance);
    setReport(rows);
    setLoading(false);
  }

  const filtered = report.filter(r => {
    if (filterClass && r.class_name !== filterClass) return false;
    if (searchQuery && !r.student_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const totalOutstanding = filtered.reduce((a, r) => a + r.balance, 0);
  const uniqueClasses = [...new Set(report.map(r => r.class_name))];

  return (
    <div>
      <div className="bg-warning/10 border border-[#FDE68A] rounded px-4 py-3.5 mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-warning">Total Outstanding</p>
          <p className="text-2xl font-semibold text-ink mt-0.5">₦{totalOutstanding.toLocaleString()}</p>
        </div>
        <p className="text-xs text-muted">{report.length} students with balances</p>
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" aria-hidden="true"><Search size={16} /></span>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student…"
            className="w-full pl-8 pr-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="text-sm border border-line rounded px-3 py-2 bg-surface text-muted outline-none">
          <option value="">All classes</option>
          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => { setSearchQuery(''); setFilterClass(''); }} className="text-xs text-brand hover:underline">Clear</button>
        <p className="text-xs text-muted ml-auto">{filtered.length} of {report.length} students</p>
      </div>

      <div className="bg-surface border border-line rounded overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-muted">Loading report…</div>
        : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">{report.length === 0
            ? <><CheckCircle2 size={16} className="inline align-[-3px] mr-1" aria-hidden="true" />All fees fully paid!</>
            : 'No students match your filter.'}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-xs font-semibold text-muted bg-page">
                <th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Class</th><th className="text-left px-4 py-3">Total Due</th>
                <th className="text-left px-4 py-3">Total Paid</th><th className="text-left px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.student_id} className="hover:bg-page border-t border-line">
                  <td className="px-4 py-3 text-muted">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{r.student_name}</td>
                  <td className="px-4 py-3 text-muted">{r.class_name}</td>
                  <td className="px-4 py-3">₦{r.total_due.toLocaleString()}</td>
                  <td className="px-4 py-3 text-brand">₦{r.total_paid.toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-danger">₦{r.balance.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${r.status === 'unpaid' ? 'bg-danger-soft text-danger' : 'bg-warning/10 text-warning'}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
