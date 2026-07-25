export type Role = "admin" | "business" | "user";
export interface Session {
  role: Role;
  username: string;
}

const KEY = "dwc_session";

export const SUPER_ADMIN = { username: "shahasad5656", password: "shahasad@challenge" };

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function randomCode(len: number, digitsOnly = false): string {
  const chars = digitsOnly
    ? "0123456789"
    : "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
