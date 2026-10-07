import { AuthProvider, useAuth } from '@/context/AuthContext';
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
import CourseSetup from '@/pages/CourseSetup';
import EmailConfirm from '@/pages/EmailConfirm';
import { useAuth } from '@/context/AuthContext';

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
  const { session, profile, loading, authError, refreshProfile, signOut } = useAuth();

  if (window.location.pathname === '/auth/confirm') return <EmailConfirm />;
  if (loading) {
    return <div className="min-h-dvh grid place-items-center text-sm" style={{ background: 'var(--bg)', color: 'var(--fg-muted)' }}>Loading Study Hub…</div>;
  }
  if (!session) return <AuthPage />;
  if (!profile) {
    return (
      <div className="min-h-dvh grid place-items-center p-5" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="max-w-md text-center">
          <p className="text-xl font-bold font-display">Account setup could not finish</p>
          <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>{authError ?? 'Please try again.'}</p>
          <div className="flex justify-center gap-3 mt-5">
            <button onClick={() => refreshProfile()} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Try again</button>
            <button onClick={signOut} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }
  if (profile?.suspended) return <Paywall />;
  if (!profile?.courseId) return <CourseSetup />;
  // Administrators always bypass the one-time payment requirement.
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
