'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Student {
  id: string; admission_no: string; full_name: string; gender: string | null;
  dob: string | null; state_of_origin: string | null; lga_of_origin: string | null;
  class_group: string | null; class_name: string | null;
  guardian_name: string | null; guardian_phone: string | null; guardian_email: string | null;
  status: string; academic_year: string | null;
  has_account: boolean; user_email: string | null;
}

interface FeeInvoice { id: string; amount_due: number; amount_paid: number; student: string; student_name?: string; }
interface Attendance { id: string; status: string; date: string; }

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwdResult, setPwdResult] = useState<{ email: string; password: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const id = params?.id as string;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [s, inv, att] = await Promise.all([
          api.students.get(id),
          api.feeInvoices.list({ student_id: id }),
          api.attendance.list({ student_id: id }),
        ]);
        setStudent(s as Student);
        setInvoices(Array.isArray(inv) ? inv as FeeInvoice[] : []);
        setAttendance(Array.isArray(att) ? att as Attendance[] : []);
      } catch { router.push('/dashboard/students'); }
      finally { setLoading(false); }
    })();
  }, [id, router]);

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading student…</div>;
  if (!student) return null;

  const totalDue = invoices.reduce((a, i) => a + Number(i.amount_due), 0);
  const totalPaid = invoices.reduce((a, i) => a + Number(i.amount_paid), 0);
  const balance = totalDue - totalPaid;
  const present = attendance.filter(a => a.status === 'present').length;
  const attRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/dashboard/students')} className="text-sm text-[#64748B] hover:text-[#0D2B55]">← Back</button>
        <div className="h-4 w-px bg-[#DDE5F0]" />
        <h1 className="text-xl font-bold text-[#0D2B55]">{student.full_name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${student.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{student.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <div className="w-14 h-14 rounded-full bg-[#0D2B55] flex items-center justify-center text-white font-bold text-lg mb-3">
            {student.full_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <h2 className="text-base font-bold text-[#0D2B55]">{student.full_name}</h2>
          <p className="text-xs text-[#64748B]">{student.admission_no}</p>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-[#64748B]">Class</span><span className="font-semibold">{student.class_name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Gender</span><span className="font-semibold">{student.gender || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">DOB</span><span className="font-semibold">{student.dob || '—'}</span></div>
            {student.has_account && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64748B]">Login Email</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-[10px]">{student.user_email}</span>
                  <button onClick={() => navigator.clipboard.writeText(student.user_email ?? '')} className="text-[9px] px-1.5 py-0.5 rounded bg-[#F0F4FA] border border-[#DDE5F0] hover:bg-[#E8F0FA]">Copy</button>
                </div>
              </div>
            )}
            <div className="flex justify-between"><span className="text-[#64748B]">State of Origin</span><span className="font-semibold">{student.state_of_origin || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">LGA</span><span className="font-semibold">{student.lga_of_origin || '—'}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Academic Year</span><span className="font-semibold">{student.academic_year || '—'}</span></div>
          </div>
        </div>

        {/* Fee Status */}
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#0D2B55] mb-3">💰 Fee Summary</h3>
          {invoices.length === 0 ? (
            <p className="text-xs text-[#64748B]">No invoices yet.</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs"><span className="text-[#64748B]">Total Due</span><span className="font-bold">₦{totalDue.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#64748B]">Total Paid</span><span className="font-bold text-[#1A7A4A]">₦{totalPaid.toLocaleString()}</span></div>
              <div className="border-t border-[#DDE5F0] pt-2 flex justify-between text-xs">
                <span className="text-[#64748B]">Balance</span>
                <span className={`font-bold ${balance > 0 ? 'text-[#B91C1C]' : 'text-[#1A7A4A]'}`}>
                  {balance > 0 ? `₦${balance.toLocaleString()}` : '₦0 — Clear'}
                </span>
              </div>
              <Link href="/dashboard/fees" className="block text-center text-xs mt-3 px-3 py-2 rounded-lg bg-[#F0F4FA] text-[#0D2B55] hover:bg-[#E8F0FA]">View Fees</Link>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h3 className="text-sm font-bold text-[#0D2B55] mb-3">✅ Attendance</h3>
          {attendance.length === 0 ? (
            <p className="text-xs text-[#64748B]">No attendance records.</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs"><span className="text-[#64748B]">Present</span><span className="font-bold text-[#1A7A4A]">{present}/{attendance.length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-[#64748B]">Rate</span>
                <span className={`font-bold ${attRate >= 75 ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{attRate}%</span>
              </div>
              <div className="h-2 bg-[#F0F4FA] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${attRate >= 75 ? 'bg-[#1A7A4A]' : 'bg-[#B91C1C]'}`} style={{ width: `${attRate}%` }} />
              </div>
              <div className="mt-3 space-y-1 max-h-[120px] overflow-y-auto">
                {attendance.slice(-7).reverse().map(a => (
                  <div key={a.id} className="flex justify-between text-[10px]">
                    <span className="text-[#64748B]">{new Date(a.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                    <span className={`font-bold ${a.status === 'present' ? 'text-[#1A7A4A]' : a.status === 'late' ? 'text-[#D4930A]' : 'text-[#B91C1C]'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/attendance" className="block text-center text-xs mt-2 px-3 py-2 rounded-lg bg-[#F0F4FA] text-[#0D2B55] hover:bg-[#E8F0FA]">View Attendance</Link>
            </div>
          )}
        </div>
      </div>

      {/* Account Actions */}
      {student.has_account ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#0D2B55]">🔑 Account Credentials</h3>
            <button onClick={async () => {
              setResetting(true);
              const token = localStorage.getItem('access_token');
              const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
              const res = await fetch(`${base}/students/${id}/reset_password/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
              });
              const data = await res.json();
              setResetting(false);
              if (data.password) setPwdResult(data);
            }} disabled={resetting}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D] disabled:opacity-50">
              {resetting ? '…' : 'Reset Password'}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-[#F0F4FA] rounded-lg px-3.5 py-2.5 w-fit">
            <span className="text-xs text-[#64748B]">Login:</span>
            <strong className="text-xs text-[#0D2B55]">{student.user_email}</strong>
            <button onClick={() => { navigator.clipboard.writeText(student.user_email ?? ''); }} className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#DDE5F0] hover:bg-[#E8F0FA]">Copy</button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5 mt-4">
          <h3 className="text-sm font-bold text-[#0D2B55]">🔑 Account</h3>
          <p className="text-xs text-[#64748B] mt-0.5">No login account. Create one from the Classes tab.</p>
        </div>
      )}

      {pwdResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setPwdResult(null)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">Password Reset</h2>
              <button onClick={() => setPwdResult(null)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-[#F0F4FA] rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div><span className="text-[#64748B]">Email:</span> <strong className="text-[#0D2B55] ml-1">{pwdResult.email}</strong></div>
                  <button onClick={() => navigator.clipboard.writeText(pwdResult.email)} className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#DDE5F0] hover:bg-[#E8F0FA]">Copy</button>
                </div>
                <div className="flex items-center justify-between">
                  <div><span className="text-[#64748B]">Password:</span> <strong className="text-[#1A7A4A] ml-1">{pwdResult.password}</strong></div>
                  <button onClick={() => navigator.clipboard.writeText(pwdResult.password)} className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#DDE5F0] hover:bg-[#E8F0FA]">Copy</button>
                </div>
              </div>
              <button onClick={() => setPwdResult(null)} className="w-full text-sm px-4 py-2.5 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D]">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Guardian Info */}
      <div className="bg-white border border-[#DDE5F0] rounded-xl p-5 mt-4">
        <h3 className="text-sm font-bold text-[#0D2B55] mb-3">👨‍👩‍👧 Guardian</h3>
        {student.guardian_name ? (
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div><span className="text-[#64748B]">Name</span><p className="font-semibold">{student.guardian_name}</p></div>
            <div><span className="text-[#64748B]">Phone</span><p className="font-semibold">{student.guardian_phone || '—'}</p></div>
            <div><span className="text-[#64748B]">Email</span><p className="font-semibold">{student.guardian_email || '—'}</p></div>
          </div>
        ) : (
          <p className="text-xs text-[#64748B]">No guardian information.</p>
        )}
      </div>
    </div>
  );
}
