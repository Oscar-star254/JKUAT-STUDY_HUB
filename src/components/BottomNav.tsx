import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Layers, Calendar, BarChart2, FileText } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const ITEMS = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard', end: true },
  { to: '/library', icon: BookOpen, labelKey: 'library' },
  { to: '/units', icon: Layers, labelKey: 'units' },
  { to: '/timetable', icon: Calendar, labelKey: 'timetable' },
  { to: '/grades', icon: BarChart2, labelKey: 'grades' },
  { to: '/notes', icon: FileText, labelKey: 'notes' },
];

export default function BottomNav() {
  const { t } = useApp();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 flex items-stretch border-t z-30"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {ITEMS.map(({ to, icon: Icon, labelKey, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors min-w-0"
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--fg-muted)',
            fontFamily: 'var(--font-display)',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="truncate text-[10px]">{t(labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
