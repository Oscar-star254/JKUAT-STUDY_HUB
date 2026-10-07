import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  useSyncExternalStore, type Context, type ReactNode,
} from 'react';
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

const globalForAuth = globalThis as typeof globalThis & {
  __jkuatStudyHubAuthContext?: Context<AuthContextValue | null>;
  __jkuatStudyHubAuthValue?: AuthContextValue;
  __jkuatStudyHubAuthListeners?: Set<() => void>;
};

const AuthContext = globalForAuth.__jkuatStudyHubAuthContext
  ?? createContext<AuthContextValue | null>(null);

globalForAuth.__jkuatStudyHubAuthContext = AuthContext;

const authListeners = globalForAuth.__jkuatStudyHubAuthListeners ?? new Set<() => void>();
globalForAuth.__jkuatStudyHubAuthListeners = authListeners;

const emptyAuthValue: AuthContextValue = {
  session: null,
  profile: null,
  courses: [],
  loading: true,
  authError: null,
  refreshProfile: async () => {},
  refreshCourses: async () => {},
  signOut: async () => {},
};

function subscribeToAuth(listener: () => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function getAuthSnapshot() {
  return globalForAuth.__jkuatStudyHubAuthValue ?? emptyAuthValue;
}

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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    courses,
    loading,
    authError,
    refreshProfile,
    refreshCourses,
    signOut,
  }), [session, profile, courses, loading, authError, refreshProfile, refreshCourses, signOut]);

  globalForAuth.__jkuatStudyHubAuthValue = value;

  useEffect(() => {
    authListeners.forEach(listener => listener());
  }, [value]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  const externalValue = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, getAuthSnapshot);
  return context ?? externalValue;
}
