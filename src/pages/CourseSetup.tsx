import { useState } from 'react';
import { BookOpen, GraduationCap } from 'lucide-react';
import { Select } from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export default function CourseSetup() {
  const { courses, refreshProfile, signOut } = useAuth();
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function continueToStudyHub() {
    if (!courseId) return;
    setSaving(true);
    setError('');
    try {
      await apiRequest<{ profile: UserProfile }>('/profile', {
        method: 'PATCH',
        body: JSON.stringify({ courseId }),
      });
      await refreshProfile();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const activeCourses = courses.filter(course => course.active);

  return (
    <div className="min-h-dvh flex items-center justify-center p-5" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="w-full max-w-lg rounded-3xl border p-7 md:p-9 shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <GraduationCap size={27} />
        </div>
        <p className="text-2xl font-bold font-display">Choose your course</p>
        <p className="text-sm mt-2 mb-6" style={{ color: 'var(--fg-muted)' }}>
          Your units, PDFs, grades, and notes will be organised under this course.
        </p>
        <label className="text-sm font-medium font-display">Course</label>
        <Select value={courseId} onChange={event => setCourseId(event.target.value)} className="mt-2">
          <option value="">Select your course</option>
          {activeCourses.map(course => (
            <option key={course.id} value={course.id}>{course.code} · {course.name}</option>
          ))}
        </Select>
        {activeCourses.length === 0 && (
          <p className="text-sm mt-3 text-amber-600">No active courses are available. Ask an administrator to add one.</p>
        )}
        {error && <p className="text-sm mt-3 text-red-500">{error}</p>}
        <button
          onClick={continueToStudyHub}
          disabled={!courseId || saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mt-6 disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          <BookOpen size={17} /> {saving ? 'Saving…' : 'Continue'}
        </button>
        <button onClick={signOut} className="w-full mt-4 text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>Sign out</button>
      </div>
    </div>
  );
}
