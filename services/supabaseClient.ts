import { createClient } from '@supabase/supabase-js';

// Use environment variable first, fall back to the provided URL for convenience
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://xggnswfyegchwlplzvto.supabase.co";
// Use provided ANON key (JWT) as fallback.
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZ25zd2Z5ZWdjaHdscGx6dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4Njk5MDgsImV4cCI6MjA4MTQ0NTkwOH0.rlOkk6PZHHTDzJttj3Kgb5FGiJSmOEKpkIgQT5zKeVw";

// Check if we have a key (URL is now guaranteed via fallback)
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_KEY);

let client;

if (isSupabaseConfigured) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_KEY!);
    console.log("Supabase Client Initialized");
  } catch (error) {
    console.error("Supabase client init failed:", error);
    client = createMockClient();
  }
} else {
  console.warn("Supabase credentials missing. App running in Offline/Demo mode.");
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