// ============================================================
//  utils/supabase.ts — Supabase client
// ============================================================
import { createClient } from '@supabase/supabase-js';

const url     = import.meta.env.VITE_SUPABASE_URL     as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
}

export const supabase = createClient(url, anonKey, {
  auth: { flowType: 'implicit' },
});
