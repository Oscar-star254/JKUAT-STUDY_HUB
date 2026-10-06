import { Check, LockKeyhole, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Paywall() {
  const { profile, signOut } = useAuth();
  return (
    <div className="min-h-dvh flex items-center justify-center p-5" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="w-full max-w-lg rounded-3xl border overflow-hidden shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="p-7 text-center" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            <LockKeyhole size={26} />
          </div>
          <p className="text-2xl font-bold font-display">Unlock Study Hub</p>
          <p className="text-sm opacity-70 mt-1">One payment. Lifetime access for this account.</p>
        </div>
        <div className="p-7">
          <div className="flex items-end justify-center gap-2 mb-6">
            <span className="text-5xl font-bold font-display">$1</span>
            <span className="text-sm mb-1" style={{ color: 'var(--fg-muted)' }}>one time</span>
          </div>
          <div className="space-y-3 text-sm mb-7">
            {['Unlimited units and notes', 'Offline PDF library and annotations', 'Timetable, grades, GPA, and backups'].map(item => (
              <p key={item} className="flex items-center gap-3"><Check size={17} className="text-emerald-500" /> {item}</p>
            ))}
          </div>
          <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold opacity-60" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Smartphone size={18} /> M-Pesa STK Push coming soon
          </button>
          <p className="text-xs text-center mt-3" style={{ color: 'var(--fg-muted)' }}>
            Daraja payment processing is being connected. Your account is {profile?.email}.
          </p>
          <button onClick={signOut} className="w-full mt-5 text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
