'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface StudentBalance { student_id: string; student_name: string; class_name: string; total_due: number; total_paid: number; balance: number; status: string; }

export default function OutstandingTab() {
  const [report, setReport] = useState<StudentBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => { loadReport(); }, []);

  async function loadReport() {
    setLoading(true);
    const [invRes, stuRes, clsRes] = await Promise.all([
      api.feeInvoices.list(),
      api.students.list({ status: 'active' }),
      api.classes.list(),
    ]);

    const students = stuRes as { id: string; full_name: string; class_group: string | null }[];
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
        student_id, student_name: student.full_name,
        class_name: classMap.get(student.class_group || '') || '—',
        total_due: due, total_paid: paid, balance,
        status: paid === 0 ? 'unpaid' : 'partial',
      });
    }
    rows.sort((a, b) => b.balance - a.balance);
    setReport(rows);
    setLoading(false);
  }

  const filtered = filterClass ? report.filter(r => r.class_name === filterClass) : report;
  const totalOutstanding = filtered.reduce((a, r) => a + r.balance, 0);
  const uniqueClasses = [...new Set(report.map(r => r.class_name))];

  return (
    <div>
      <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl px-4 py-3.5 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-[#D4930A] uppercase">Total Outstanding</p>
          <p className="text-2xl font-bold text-[#0D2B55] mt-0.5">₦{totalOutstanding.toLocaleString()}</p>
        </div>
        <p className="text-xs text-[#64748B]">{report.length} students with balances</p>
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#64748B] outline-none">
          <option value="">All classes</option>
          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {filterClass && <button onClick={() => setFilterClass('')} className="text-xs text-[#1A7A4A] hover:underline">Clear</button>}
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading report…</div>
        : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">{report.length === 0 ? '🎉 All fees fully paid!' : 'No students match your filter.'}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Class</th><th className="text-left px-4 py-3">Total Due</th>
                <th className="text-left px-4 py-3">Total Paid</th><th className="text-left px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.student_id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                  <td className="px-4 py-3 text-[#64748B]">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold">{r.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.class_name}</td>
                  <td className="px-4 py-3">₦{r.total_due.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#1A7A4A]">₦{r.total_paid.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-[#B91C1C]">₦{r.balance.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'unpaid' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF3C7] text-[#D4930A]'}`}>{r.status}</span>
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
