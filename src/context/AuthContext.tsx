import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Course, UserProfile } from '@/types';
import { apiRequest, supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  courses: Course[];
  loading: boolean;
  authError: string | null;
  refreshProfile: () => Promise<void>;
  refreshCourses: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshCourses = useCallback(async () => {
    try {
      const result = await apiRequest<{ courses: Course[] }>('/courses');
      setCourses(result.courses);
    } catch {
      setCourses([]);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setAuthError(null);
    const { data: { session: current } } = await supabase.auth.getSession();
    if (!current) {
      setProfile(null);
      return;
    }
    try {
      const result = await apiRequest<{ profile: UserProfile }>('/profile');
      setProfile(result.profile);
    } catch {
      const metadata = current.user.user_metadata;
      try {
        const result = await apiRequest<{ profile: UserProfile }>('/profile', {
          method: 'POST',
          body: JSON.stringify({ fullName: metadata.full_name ?? '' }),
        });
        setProfile(result.profile);
      } catch (profileError) {
        setProfile(null);
        setAuthError((profileError as Error).message);
        throw profileError;
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        setSession(data.session);
        await Promise.all([refreshCourses(), data.session ? refreshProfile() : Promise.resolve()]);
      } catch {
        // The account setup error is exposed through authError for a recoverable UI.
      } finally {
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
      else setTimeout(() => refreshProfile().catch(() => {}), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshCourses, refreshProfile]);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, courses, loading, authError, refreshProfile, refreshCourses, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
