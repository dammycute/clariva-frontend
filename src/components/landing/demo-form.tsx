'use client';

import { useState } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { ApiError, request } from '@/lib/api';
import { WHATSAPP_DISPLAY, WHATSAPP_LINK } from '@/lib/pricing';

const ROLES = [['proprietor', 'Proprietor or owner'], ['principal', 'Principal or head teacher'], ['admin', 'School administrator'], ['other', 'Other']] as const;
const FIELD = 'mt-1.5 h-11 w-full rounded-xl border border-line bg-page px-3.5 text-[15px] text-ink outline-none focus:border-brand';
const LABEL = 'block text-sm font-medium text-ink';

/** The landing page's "Request a demo" form. The server saves it and emails the team. */
export function DemoForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failed, setFailed] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setErrors({});
    setFailed(false);
    try {
      await request('POST', '/leads/demo/', {
        name: f.name, school_name: f.school_name, role: f.role, phone: f.phone,
        email: f.email, students: f.students ? Number(f.students) : null, message: f.message, website: f.website,
      });
      setDone(true);
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {};
      setErrors(fields);
      if (Object.keys(fields).length === 0) setFailed(true);   // not a mistake in the form: the server or network let us down
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div role="status" className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <Check size={28} className="text-success" aria-hidden="true" />
        <h3 className="mt-3 text-xl font-semibold text-ink">Thank you. We have your request.</h3>
        <p className="mt-2 text-muted text-pretty">We will contact you by phone or WhatsApp to arrange your demo. If you would rather not wait, message us now.</p>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-brand-ink hover:opacity-90">
          <MessageCircle size={16} aria-hidden="true" /> Chat on WhatsApp
        </a>
      </div>
    );
  }

  const err = (k: string) => errors[k]?.[0] && <p role="alert" className="mt-1 text-[13px] text-danger">{errors[k][0]}</p>;

  return (
    <form onSubmit={submit} noValidate className="rounded-3xl border border-line bg-surface p-5 sm:p-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label htmlFor="d-name" className={LABEL}>Your name</label>
          <input id="d-name" name="name" required autoComplete="name" className={FIELD} />{err('name')}</div>
        <div><label htmlFor="d-school" className={LABEL}>School name</label>
          <input id="d-school" name="school_name" required autoComplete="organization" className={FIELD} />{err('school_name')}</div>
        <div><label htmlFor="d-role" className={LABEL}>Your role</label>
          <select id="d-role" name="role" defaultValue="principal" className={FIELD}>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>{err('role')}</div>
        <div><label htmlFor="d-students" className={LABEL}>Number of students <span className="font-normal text-muted">(optional)</span></label>
          <input id="d-students" name="students" type="number" inputMode="numeric" min={1} className={FIELD} />{err('students')}</div>
        <div><label htmlFor="d-phone" className={LABEL}>Phone or WhatsApp number</label>
          <input id="d-phone" name="phone" type="tel" required autoComplete="tel" placeholder="0803 000 0000" className={FIELD} />{err('phone')}</div>
        <div><label htmlFor="d-email" className={LABEL}>Email <span className="font-normal text-muted">(optional)</span></label>
          <input id="d-email" name="email" type="email" autoComplete="email" className={FIELD} />{err('email')}</div>
      </div>
      <div><label htmlFor="d-message" className={LABEL}>Anything you want us to know <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="d-message" name="message" rows={3} maxLength={2000} className={`${FIELD} h-auto py-2.5`} />{err('message')}</div>
      {/* Bot trap: hidden from people, filled in by scripts. */}
      <div aria-hidden="true" className="absolute -left-[9999px]"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      {failed && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          We could not send your request just now. Please try again in a moment, or message us on WhatsApp ({WHATSAPP_DISPLAY}) and we will reply.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" disabled={busy}
          className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-medium text-brand-ink hover:opacity-90 disabled:opacity-50 cursor-pointer">
          {busy ? 'Sending…' : 'Request a demo'}
        </button>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink py-3">
          <MessageCircle size={16} aria-hidden="true" /> Or chat on WhatsApp: {WHATSAPP_DISPLAY}
        </a>
      </div>
    </form>
  );
}
