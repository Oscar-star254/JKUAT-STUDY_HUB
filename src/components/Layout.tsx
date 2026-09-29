import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { Menu, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark } = useApp();

  return (
    <div
      className="flex h-dvh w-full overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col shrink-0 border-r"
        style={{ width: 'var(--sidebar-w)', borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        <Sidebar onNavigate={() => {}} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 flex flex-col border-r z-50"
            style={{ width: 260, background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <AppBrand />
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:opacity-70"
                style={{ color: 'var(--fg-muted)' }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile topbar */}
        <header
          className="flex md:hidden items-center gap-3 px-4 h-14 shrink-0 border-b"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg"
            style={{ color: 'var(--fg-muted)' }}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <AppBrand />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </div>
  );
}

function AppBrand() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
      >
        SH
      </div>
      <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
        Study Hub
      </span>
    </div>
  );
}
