import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Set them in .env",
  );
}

export const supabase = createClient(url ?? "http://localhost", key ?? "public-anon-key", {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Convert Google Drive share links (https://drive.google.com/file/d/<ID>/view) to direct image URLs.
export function driveToDirect(link: string): string {
  if (!link) return link;
  const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  const idParam = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) return `https://drive.google.com/uc?export=view&id=${idParam[1]}`;
  return link;
}
