import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type ConfirmationState = 'confirming' | 'success' | 'error';

export default function EmailConfirm() {
  const navigate = useNavigate();
  const [state, setState] = useState<ConfirmationState>('confirming');
  const [message, setMessage] = useState('Confirming your email address…');

  useEffect(() => {
    async function confirmEmail() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = (params.get('type') ?? 'email') as EmailOtpType;
      const code = params.get('code');

      let error: Error | null = null;
      if (tokenHash) {
        const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        error = result.error;
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else {
        error = new Error('This confirmation link is incomplete or has expired.');
      }

      if (error) {
        setState('error');
        setMessage(error.message);
        return;
      }

      window.history.replaceState({}, document.title, '/');
      setState('success');
      setMessage('Your email is confirmed. Your account is ready.');
    }

    confirmEmail();
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center p-5" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="w-full max-w-md rounded-3xl border p-8 text-center shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-5" style={{ background: 'var(--bg)', color: state === 'error' ? 'var(--danger)' : 'var(--primary)' }}>
          {state === 'confirming' && <LoaderCircle size={27} className="animate-spin" />}
          {state === 'success' && <CheckCircle2 size={27} />}
          {state === 'error' && <XCircle size={27} />}
        </div>
        <p className="text-2xl font-bold font-display">
          {state === 'confirming' ? 'Confirming email' : state === 'success' ? 'Email confirmed' : 'Confirmation failed'}
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>{message}</p>
        {state !== 'confirming' && (
          <button onClick={() => navigate('/', { replace: true })} className="w-full py-3 rounded-xl text-sm font-semibold mt-6" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            {state === 'success' ? 'Continue to Study Hub' : 'Return to sign in'}
          </button>
        )}
      </div>
    </div>
  );
}
