import { createClient } from '@supabase/supabase-js';

// Só usado para login. Os dados passam sempre pela API (Nest).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
