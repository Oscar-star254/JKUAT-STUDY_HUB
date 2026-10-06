import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Library from '@/pages/Library';
import Viewer from '@/pages/Viewer';
import Units from '@/pages/Units';
import Timetable from '@/pages/Timetable';
import Grades from '@/pages/Grades';
import Notes from '@/pages/Notes';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import AuthPage from '@/pages/Auth';
import Paywall from '@/pages/Paywall';
import { AuthProvider, useAuth } from '@/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { session, profile, loading } = useAuth();

  if (loading || (session && !profile)) {
    return <div className="min-h-dvh grid place-items-center text-sm" style={{ background: 'var(--bg)', color: 'var(--fg-muted)' }}>Loading Study Hub…</div>;
  }
  if (!session) return <AuthPage />;
  if (profile?.suspended) return <Paywall />;
  if (profile?.paymentStatus !== 'paid' && profile?.role !== 'admin') return <Paywall />;

  return (
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="units" element={<Units />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="grades" element={<Grades />} />
            <Route path="notes" element={<Notes />} />
            <Route path="settings" element={<Settings />} />
            {profile?.role === 'admin' && <Route path="admin" element={<Admin />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          {/* Viewer is fullscreen outside layout */}
          <Route path="/library/:id" element={<Viewer />} />
        </Routes>
  );
}
