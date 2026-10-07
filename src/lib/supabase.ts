import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const globalForSupabase = globalThis as typeof globalThis & {
  __jkuatStudyHubSupabase?: SupabaseClient;
};

export const supabase = globalForSupabase.__jkuatStudyHubSupabase ?? createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      storageKey: 'jkuat-study-hub-auth-v1',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

globalForSupabase.__jkuatStudyHubSupabase = supabase;

export const apiBase = `https://${projectId}.supabase.co/functions/v1/make-server-28aff273`;

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Request failed');
  return body as T;
}
