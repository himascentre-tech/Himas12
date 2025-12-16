import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_KEY);

let client;

if (isSupabaseConfigured) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.warn("Supabase client init failed:", error);
    client = createMockClient();
  }
} else {
  console.warn("Supabase credentials missing. Using offline mock.");
  client = createMockClient();
}

function createMockClient() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'Offline mode' } }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      upsert: async () => ({ error: null }),
      insert: async () => ({ select: async () => ({ data: null, error: null }) }),
      update: async () => ({ eq: () => ({ select: async () => ({ data: null, error: null }) }) }),
    }),
  } as any;
}

export const supabase = client;