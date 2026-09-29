import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ title, open, onClose, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === 'sm' ? 380 : size === 'lg' ? 680 : 520;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full rounded-t-2xl md:rounded-2xl flex flex-col max-h-[90dvh] overflow-hidden shadow-2xl"
        style={{ maxWidth: maxW, background: 'var(--bg-card)', color: 'var(--fg)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2
            className="font-semibold text-base"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-5 py-3 border-t shrink-0 flex justify-end gap-2"
            style={{ borderColor: 'var(--border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Btn({
  children, onClick, variant = 'primary', type = 'button', disabled = false, className = ''
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'danger';
  type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  const styles: Record<string, string> = {
    primary: 'bg-[color:var(--primary)] text-[color:var(--primary-fg)] hover:opacity-90',
    ghost: 'bg-transparent text-[color:var(--fg-muted)] hover:bg-[color:var(--border)]',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${styles[variant]} ${className}`}
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </button>
  );
}

export function Field({
  label, children, required,
}: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-all ${className}`}
      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
    />
  );
}

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-all ${className}`}
      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
    />
  );
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-[color:var(--accent)] transition-all resize-none ${className}`}
      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
    />
  );
}
