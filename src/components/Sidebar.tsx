import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Layers, Calendar, BarChart2,
  FileText, Settings, Sun, Moon, Languages,
  ShieldCheck, LogOut,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard', end: true },
  { to: '/library', icon: BookOpen, labelKey: 'library' },
  { to: '/units', icon: Layers, labelKey: 'units' },
  { to: '/timetable', icon: Calendar, labelKey: 'timetable' },
  { to: '/grades', icon: BarChart2, labelKey: 'grades' },
  { to: '/notes', icon: FileText, labelKey: 'notes' },
  { to: '/settings', icon: Settings, labelKey: 'settings' },
];

interface Props { onNavigate: () => void; }

export default function Sidebar({ onNavigate }: Props) {
  const { t, dark, toggleDark, toggleLang, lang } = useApp();
  const { profile, signOut } = useAuth();
  const items = profile?.role === 'admin'
    ? [...NAV_ITEMS, { to: '/admin', icon: ShieldCheck, labelKey: 'admin' }]
    : NAV_ITEMS;

  return (
    <div className="flex flex-col h-full">
      {/* Brand — desktop only (mobile shows in Layout header) */}
      <div
        className="hidden md:flex items-center gap-2 px-5 h-16 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
        >
          SH
        </div>
        <div>
          <div className="font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            JKUAT Study Hub
          </div>
          <div className="text-xs leading-tight" style={{ color: 'var(--fg-muted)' }}>
            Academic Companion
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
        {items.map(({ to, icon: Icon, labelKey, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'active-nav'
                  : 'hover:bg-[color:var(--border)] hover:text-[color:var(--fg)]'
              }`
            }
            style={({ isActive }) => isActive
              ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
              : { color: 'var(--fg-muted)' }
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            <span style={{ fontFamily: 'var(--font-display)' }}>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-1 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <div className="px-3 pb-2">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>{profile?.fullName || 'Study Hub user'}</p>
          <p className="text-[10px] truncate" style={{ color: 'var(--fg-muted)' }}>{profile?.email}</p>
        </div>
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'var(--fg-muted)' }}
        >
          {dark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          <span style={{ fontFamily: 'var(--font-display)' }}>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button
          onClick={toggleLang}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'var(--fg-muted)' }}
        >
          <Languages size={18} strokeWidth={1.8} />
          <span style={{ fontFamily: 'var(--font-display)' }}>{lang === 'en' ? 'Kiswahili' : 'English'}</span>
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'var(--fg-muted)' }}
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span style={{ fontFamily: 'var(--font-display)' }}>Sign out</span>
        </button>
      </div>
    </div>
  );
}
