import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Normalize domain if user configured .supabase.com instead of .supabase.co
function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  // Strip trailing slash
  clean = clean.replace(/\/+$/, '');
  // Fix common typo: .supabase.com -> .supabase.co
  if (clean.includes('.supabase.com')) {
    clean = clean.replace('.supabase.com', '.supabase.co');
  }
  return clean;
}

const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://chlpymcsnpzvgfeurkai.supabase.co';
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jZc6AWSAmzCHRK4WojLNUQ_9idb0tdV';

export const SUPABASE_URL = normalizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = (rawKey || '').trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL && 
    SUPABASE_URL.startsWith('https://') && 
    SUPABASE_ANON_KEY && 
    SUPABASE_ANON_KEY.length > 10
  );
}

// Reusable Supabase client configuration
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'dasasurya_supabase_auth_token',
    },
  }
);
