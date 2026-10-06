import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Search, ShieldCheck, UserRound, Users } from 'lucide-react';
import { Btn, Field, Input } from '@/components/Modal';
import { apiRequest } from '@/lib/supabase';
import type { Course, UserProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function Admin() {
  const { refreshCourses } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const result = await apiRequest<{ users: UserProfile[]; courses: Course[] }>('/admin/overview');
      setUsers(result.users);
      setCourses(result.courses);
      setError('');
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateUser(id: string, patch: Partial<UserProfile>) {
    const result = await apiRequest<{ profile: UserProfile }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setUsers(current => current.map(user => user.id === id ? result.profile : user));
  }

  async function addCourse(event: React.FormEvent) {
    event.preventDefault();
    const result = await apiRequest<{ course: Course }>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify({ code: courseCode, name: courseName }),
    });
    setCourses(current => [...current, result.course].sort((a, b) => a.name.localeCompare(b.name)));
    setCourseCode('');
    setCourseName('');
    refreshCourses();
  }

  async function toggleCourse(course: Course) {
    const result = await apiRequest<{ course: Course }>(`/admin/courses/${course.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !course.active }),
    });
    setCourses(current => current.map(item => item.id === course.id ? result.course : item));
    refreshCourses();
  }

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter(user => `${user.fullName} ${user.email}`.toLowerCase().includes(query));
  }, [search, users]);

  const paid = users.filter(user => user.paymentStatus === 'paid').length;
  const admins = users.filter(user => user.role === 'admin').length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-2xl md:text-3xl font-bold font-display">Admin dashboard</p>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Manage platform access, users, payments, and courses.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<Users size={20} />} label="Total users" value={String(users.length)} />
        <Metric icon={<CheckCircle2 size={20} />} label="Unlocked" value={String(paid)} />
        <Metric icon={<ShieldCheck size={20} />} label="Administrators" value={String(admins)} />
        <Metric icon={<BookOpen size={20} />} label="Active courses" value={String(courses.filter(course => course.active).length)} />
      </div>

      {error && <div className="rounded-xl border p-3 text-sm text-red-500" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>{error}</div>}

      <section className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="font-semibold font-display">Users and access</p>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Approve payments, suspend accounts, or assign administrators.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <Search size={15} style={{ color: 'var(--fg-muted)' }} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search users" className="bg-transparent outline-none text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm" style={{ color: 'var(--fg-muted)' }}>Loading users…</p>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--bg)', color: 'var(--fg-muted)' }}>
                <tr><th className="text-left p-3">User</th><th className="text-left p-3">Access</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="p-3">
                      <p className="font-medium">{user.fullName || 'Unnamed user'}</p>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user.email}</p>
                    </td>
                    <td className="p-3">
                      <button onClick={() => updateUser(user.id, { paymentStatus: user.paymentStatus === 'paid' ? 'pending' : 'paid' })} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: user.paymentStatus === 'paid' ? 'var(--success)' : 'var(--border)', color: user.paymentStatus === 'paid' ? 'white' : 'var(--fg-muted)' }}>
                        {user.paymentStatus === 'paid' ? 'Unlocked' : 'Pending'}
                      </button>
                    </td>
                    <td className="p-3">
                      <select value={user.role} onChange={event => updateUser(user.id, { role: event.target.value as UserProfile['role'] })} className="rounded-lg border px-2 py-1.5 text-xs" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                        <option value="user">User</option><option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <button onClick={() => updateUser(user.id, { suspended: !user.suspended })} className="text-xs font-medium" style={{ color: user.suspended ? 'var(--danger)' : 'var(--fg-muted)' }}>
                        {user.suspended ? 'Suspended · Restore' : 'Active · Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-2xl border p-4 md:p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="mb-4">
          <p className="font-semibold font-display">Course catalog</p>
          <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Only active courses are available during registration.</p>
        </div>
        <form onSubmit={addCourse} className="grid sm:grid-cols-[10rem_1fr_auto] gap-3 items-end">
          <Field label="Course code"><Input value={courseCode} onChange={event => setCourseCode(event.target.value)} placeholder="BSc IT" required /></Field>
          <Field label="Course name"><Input value={courseName} onChange={event => setCourseName(event.target.value)} placeholder="Bachelor of Science…" required /></Field>
          <Btn type="submit">Add course</Btn>
        </form>
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          {courses.map(course => (
            <div key={course.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <UserRound size={17} style={{ color: 'var(--fg-muted)' }} />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium">{course.code}</p><p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>{course.name}</p></div>
              <button onClick={() => toggleCourse(course)} className="text-xs font-semibold" style={{ color: course.active ? 'var(--success)' : 'var(--fg-muted)' }}>{course.active ? 'Active' : 'Inactive'}</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2" style={{ color: 'var(--fg-muted)' }}>{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold mt-2 font-display">{value}</p>
    </div>
  );
}
