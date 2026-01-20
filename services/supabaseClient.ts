
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  ? import.meta.env.VITE_SUPABASE_URL 
  : 'https://xggnswfyegchwlplzvto.supabase.co';

const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
  ? import.meta.env.VITE_SUPABASE_ANON_KEY 
  : 'sb_publishable_SrP6OJaEA9J1Xz22Tr3jdA_5QNPSwox';

if (!SUPABASE_URL || typeof SUPABASE_URL !== 'string') {
  throw new Error("Supabase URL is missing or invalid.");
}

if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== 'string') {
  throw new Error("Supabase Anon Key is missing or invalid.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'himas-hospital' },
  },
});
