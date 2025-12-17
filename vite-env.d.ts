declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    SENDGRID_API_KEY: string;
    [key: string]: string | undefined;
  }
}