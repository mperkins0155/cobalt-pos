const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value === '') return defaultValue;
  return value.toLowerCase() === 'true';
}

export const appEnv = {
  supabaseUrl,
  supabaseAnonKey,
  appName: import.meta.env.VITE_APP_NAME?.trim() || 'Cobalt POS',
  appUrl:
    import.meta.env.VITE_APP_URL?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'),
  basePath: import.meta.env.VITE_BASE_PATH?.trim() || '/',
  cardPaymentsEnabled: parseBoolean(import.meta.env.VITE_ENABLE_CARD_PAYMENTS, false),
  emailReceiptsEnabled: parseBoolean(import.meta.env.VITE_ENABLE_EMAIL_RECEIPTS, false),
};

export const hasSupabaseEnv = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
