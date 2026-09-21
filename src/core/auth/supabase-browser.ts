import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

let supabaseBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (supabaseBrowserClient) return supabaseBrowserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseBrowserClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return supabaseBrowserClient;
    } catch (e) {
      console.error('[SupabaseBrowser] Failed to initialize Supabase browser client', e);
    }
  }

  return null;
}

/**
 * Helper to get the current bearer auth token for fetch calls
 */
export async function getAuthHeader(): Promise<HeadersInit> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return {
          Authorization: `Bearer ${session.access_token}`,
        };
      }
    } catch (e) {
      // Return empty headers if no session
    }
  }

  // Fallback to local token if stored
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('supabase_auth_token');
    if (localToken) {
      return {
        Authorization: `Bearer ${localToken}`,
      };
    }
  }

  return {};
}
