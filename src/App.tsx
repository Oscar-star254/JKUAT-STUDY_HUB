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

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="units" element={<Units />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="grades" element={<Grades />} />
            <Route path="notes" element={<Notes />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          {/* Viewer is fullscreen outside layout */}
          <Route path="/library/:id" element={<Viewer />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
