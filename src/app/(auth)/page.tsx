'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await auth.login(email, password);
      const user = await auth.me();
      if (user.role === 'parent' || user.role === 'guardian') {
        router.push('/guardian/dashboard');
      } else if (user.role === 'teacher') {
        router.push('/teacher');
      } else if (user.role === 'student') {
        router.push('/student');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: '#0D2B55',
        backgroundImage:
          'radial-gradient(ellipse at 20% 50%, #1A3F6E 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0F2D5A 0%, transparent 50%)',
      }}
    >
      <div className="w-full max-w-[420px] mx-4">
        <form onSubmit={handleLogin}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="font-semibold text-xl text-white">Clariva</span>
          </div>

          <p className="text-white/60 text-sm mb-7 leading-relaxed">
            Nigeria&apos;s school management platform.
            <br />WAEC-compliant CBT. Every school, one portal.
          </p>

          <div className="mb-3.5">
            <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">EMAIL</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="admin@school.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
          </div>

          <div className="mb-3.5">
            <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">PASSWORD</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
          </div>

          {error && <p className="text-red-300 text-xs mb-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold cursor-pointer hover:bg-[#14663D] disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in to portal →'}
          </button>

          <p className="mt-5 text-center text-xs text-white/40">
            Don&apos;t have an account?{' '}
            <Link href="/onboard" className="text-white/70 underline">Set up your school →</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
