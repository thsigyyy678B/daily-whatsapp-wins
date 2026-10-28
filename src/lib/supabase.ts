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

// Extract the file id from any Google Drive share link or bare ?id= link.
export function driveId(link: string): string | null {
  if (!link) return null;
  const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const p = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return p ? p[1] : null;
}

// Convert Google Drive share links to a direct image URL that <img> can load.
export function driveToDirect(link: string): string {
  if (!link) return link;
  const id = driveId(link);
  return id ? `https://lh3.googleusercontent.com/d/${id}` : link;
}

// Google serves some files through different URL formats, so images try these
// in order until one loads.
export function driveCandidates(link: string): string[] {
  if (!link) return [link];
  const id = driveId(link);
  if (!id) return [link];
  return [
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w2000`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];
}

// In-browser preview embed; works for both images and Drive videos (playable).
export function driveToPreview(link: string): string {
  const id = driveId(link);
  return id ? `https://drive.google.com/file/d/${id}/preview` : link;
}

// Force a file download (images and videos) instead of opening the Drive viewer.
export function driveToDownload(link: string): string {
  const id = driveId(link);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : link;
}
