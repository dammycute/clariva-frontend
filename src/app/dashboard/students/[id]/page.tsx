'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, request } from '@/lib/api';
import Link from 'next/link';
import { ChevronLeft, Banknote, CheckCircle2, Key, Users, X } from 'lucide-react';

interface Student {
  id: string; admission_no: string; first_name: string; last_name: string; gender: string | null;
  date_of_birth: string | null; state_of_origin: string | null; lga_of_origin: string | null;
  class_group: string | null; class_name: string | null;
  guardian_name: string | null; guardian_phone: string | null; guardian_email: string | null;
  student_status: string; academic_year: string | null;
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

  if (loading) return <div className="text-sm text-muted p-8">Loading student…</div>;
  if (!student) return null;

  const totalDue = invoices.reduce((a, i) => a + Number(i.amount_due), 0);
  const totalPaid = invoices.reduce((a, i) => a + Number(i.amount_paid), 0);
  const balance = totalDue - totalPaid;
  const present = attendance.filter(a => a.status === 'present').length;
  const attRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/dashboard/students')} className="text-sm text-muted hover:text-ink inline-flex items-center gap-1"><ChevronLeft size={16} aria-hidden="true" /> Back</button>
        <div className="h-4 w-px bg-line" />
        <h1 className="text-xl font-semibold text-ink">{student.first_name} {student.last_name}</h1>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${student.student_status === 'active' ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>{student.student_status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="bg-surface border border-line rounded p-5">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-brand-ink font-semibold text-lg mb-3">
            {`${student.first_name} ${student.last_name}`.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <h2 className="text-base font-semibold text-ink">{student.first_name} {student.last_name}</h2>
          <p className="text-xs text-muted">{student.admission_no}</p>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted">Class</span><span className="font-semibold">{student.class_name || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Gender</span><span className="font-semibold">{student.gender || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted">DOB</span><span className="font-semibold">{student.date_of_birth || '-'}</span></div>
            {student.has_account && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">Login Email</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs">{student.user_email}</span>
                  <button onClick={() => navigator.clipboard.writeText(student.user_email ?? '')} className="text-xs px-1.5 py-0.5 rounded bg-surface-2 border border-line hover:bg-brand-soft">Copy</button>
                </div>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted">State of Origin</span><span className="font-semibold">{student.state_of_origin || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted">LGA</span><span className="font-semibold">{student.lga_of_origin || '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Academic Year</span><span className="font-semibold">{student.academic_year || '-'}</span></div>
          </div>
        </div>

        {/* Fee Status */}
        <div className="bg-surface border border-line rounded p-5">
          <h3 className="text-sm font-semibold text-ink mb-3 inline-flex items-center gap-1.5"><Banknote size={16} aria-hidden="true" /> Fee Summary</h3>
          {invoices.length === 0 ? (
            <p className="text-xs text-muted">No invoices yet.</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs"><span className="text-muted">Total Due</span><span className="font-semibold">₦{totalDue.toLocaleString()}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted">Total Paid</span><span className="font-semibold text-brand">₦{totalPaid.toLocaleString()}</span></div>
              <div className="border-t border-line pt-2 flex justify-between text-xs">
                <span className="text-muted">Balance</span>
                <span className={`font-semibold ${balance > 0 ? 'text-danger' : 'text-brand'}`}>
                  {balance > 0 ? `₦${balance.toLocaleString()}` : '₦0 - Clear'}
                </span>
              </div>
              <Link href="/dashboard/fees" className="block text-center text-xs mt-3 px-3 py-2 rounded bg-surface-2 text-ink hover:bg-brand-soft">View Fees</Link>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="bg-surface border border-line rounded p-5">
          <h3 className="text-sm font-semibold text-ink mb-3 inline-flex items-center gap-1.5"><CheckCircle2 size={16} aria-hidden="true" /> Attendance</h3>
          {attendance.length === 0 ? (
            <p className="text-xs text-muted">No attendance records.</p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs"><span className="text-muted">Present</span><span className="font-semibold text-brand">{present}/{attendance.length}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted">Rate</span>
                <span className={`font-semibold ${attRate >= 75 ? 'text-brand' : 'text-danger'}`}>{attRate}%</span>
              </div>
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${attRate >= 75 ? 'bg-brand' : 'bg-danger'}`} style={{ width: `${attRate}%` }} />
              </div>
              <div className="mt-3 space-y-1 max-h-[120px] overflow-y-auto">
                {attendance.slice(-7).reverse().map(a => (
                  <div key={a.id} className="flex justify-between text-xs">
                    <span className="text-muted">{new Date(a.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                    <span className={`font-semibold ${a.status === 'present' ? 'text-brand' : a.status === 'late' ? 'text-warning' : 'text-danger'}`}>{a.status}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/attendance" className="block text-center text-xs mt-2 px-3 py-2 rounded bg-surface-2 text-ink hover:bg-brand-soft">View Attendance</Link>
            </div>
          )}
        </div>
      </div>

      {/* Account Actions */}
      {student.has_account ? (
        <div className="bg-surface border border-line rounded p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink inline-flex items-center gap-1.5"><Key size={16} aria-hidden="true" /> Account Credentials</h3>
            <button onClick={async () => {
              setResetting(true);
              try {
                const data = await request<{ password?: string }>('POST', `/students/${id}/reset_password/`);
                if (data.password) setPwdResult(data as { email: string; password: string });
              } finally {
                setResetting(false);
              }
            }} disabled={resetting}
              className="text-xs px-3 py-1.5 rounded bg-brand text-brand-ink hover:bg-brand disabled:opacity-50">
              {resetting ? '…' : 'Reset Password'}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-surface-2 rounded px-3.5 py-2.5 w-fit">
            <span className="text-xs text-muted">Login:</span>
            <strong className="text-xs text-ink">{student.user_email}</strong>
            <button onClick={() => { navigator.clipboard.writeText(student.user_email ?? ''); }} className="text-xs px-2 py-0.5 rounded bg-surface border border-line hover:bg-brand-soft">Copy</button>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded p-5 mt-4">
          <h3 className="text-sm font-semibold text-ink inline-flex items-center gap-1.5"><Key size={16} aria-hidden="true" /> Account</h3>
          <p className="text-xs text-muted mt-0.5">No login account. Create one from the Classes tab.</p>
        </div>
      )}

      {pwdResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setPwdResult(null)}>
          <div className="bg-surface rounded w-[400px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">Password Reset</h2>
              <button onClick={() => setPwdResult(null)} className="text-muted hover:text-ink text-lg" aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-surface-2 rounded p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div><span className="text-muted">Email:</span> <strong className="text-ink ml-1">{pwdResult.email}</strong></div>
                  <button onClick={() => navigator.clipboard.writeText(pwdResult.email)} className="text-xs px-2 py-0.5 rounded bg-surface border border-line hover:bg-brand-soft">Copy</button>
                </div>
                <div className="flex items-center justify-between">
                  <div><span className="text-muted">Password:</span> <strong className="text-brand ml-1">{pwdResult.password}</strong></div>
                  <button onClick={() => navigator.clipboard.writeText(pwdResult.password)} className="text-xs px-2 py-0.5 rounded bg-surface border border-line hover:bg-brand-soft">Copy</button>
                </div>
              </div>
              <button onClick={() => setPwdResult(null)} className="w-full text-sm px-4 py-2.5 rounded bg-brand text-brand-ink hover:bg-brand">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Guardian Info */}
      <div className="bg-surface border border-line rounded p-5 mt-4">
        <h3 className="text-sm font-semibold text-ink mb-3 inline-flex items-center gap-1.5"><Users size={16} aria-hidden="true" /> Guardian</h3>
        {student.guardian_name ? (
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div><span className="text-muted">Name</span><p className="font-semibold">{student.guardian_name}</p></div>
            <div><span className="text-muted">Phone</span><p className="font-semibold">{student.guardian_phone || '-'}</p></div>
            <div><span className="text-muted">Email</span><p className="font-semibold">{student.guardian_email || '-'}</p></div>
          </div>
        ) : (
          <p className="text-xs text-muted">No guardian information.</p>
        )}
      </div>
    </div>
  );
}
