// Fixed: Removed failing vite/client type reference to resolve "Cannot find type definition file" error
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly SENDGRID_API_KEY: string;
  readonly API_KEY: string;
  readonly VITE_GOOGLE_SHEETS_WEBHOOK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
