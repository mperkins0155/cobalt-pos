import { createClient } from '@supabase/supabase-js';
import { appEnv, hasSupabaseEnv } from '@/lib/appEnv';

if (!hasSupabaseEnv) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(
  appEnv.supabaseUrl || 'https://placeholder.supabase.co',
  appEnv.supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
