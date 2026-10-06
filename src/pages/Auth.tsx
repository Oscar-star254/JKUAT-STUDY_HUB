import { useState } from 'react';
import { BookOpen, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Field, Input } from '@/components/Modal';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === 'signup' && !result.data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
    }
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="hidden lg:flex flex-col justify-between p-12" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>SH</div>
          <div>
            <p className="font-bold text-lg font-display">JKUAT Study Hub</p>
            <p className="text-sm opacity-70">Independent academic companion</p>
          </div>
        </div>
        <div className="max-w-lg">
          <p className="text-4xl font-bold leading-tight font-display">Your course, units, notes, and progress in one private study space.</p>
          <div className="mt-8 grid gap-4 text-sm">
            <p className="flex items-center gap-3"><BookOpen size={20} /> Organise every unit and PDF by course</p>
            <p className="flex items-center gap-3"><LockKeyhole size={20} /> One-time $1 access fee</p>
            <p className="flex items-center gap-3"><ShieldCheck size={20} /> Secure account-based access</p>
          </div>
        </div>
        <p className="text-xs opacity-60">Not an official JKUAT product.</p>
      </div>

      <div className="flex items-center justify-center p-5 md:p-10">
        <div className="w-full max-w-md rounded-3xl border p-6 md:p-8 shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="lg:hidden flex items-center gap-2 mb-7">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>SH</div>
            <p className="font-bold font-display">JKUAT Study Hub</p>
          </div>
          <p className="text-2xl font-bold font-display">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</p>
          <p className="text-sm mt-1 mb-6" style={{ color: 'var(--fg-muted)' }}>
            {mode === 'signin' ? 'Sign in to continue studying.' : 'Create your account, then choose your course.'}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <Field label="Full name" required>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" />
              </Field>
            )}
            <Field label="Email" required>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </Field>
            <Field label="Password" required>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </Field>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {message && <p className="text-sm text-emerald-600">{message}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }} className="w-full mt-4 text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
