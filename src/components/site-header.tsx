import { Link } from "@tanstack/react-router";
import { getSession, clearSession } from "@/lib/session";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [session, setS] = useState<ReturnType<typeof getSession>>(null);
  useEffect(() => { setS(getSession()); }, []);

  const dashHref =
    session?.role === "admin" ? "/admin"
    : session?.role === "business" ? "/business"
    : session?.role === "user" ? "/dashboard"
    : "/login";

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="glass flex items-center justify-between rounded-full px-5 py-2.5">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_-2px_var(--emerald)]">D</span>
            <span className="text-gradient-emerald text-lg">Daily WhatsApp Challenge</span>
          </Link>
          <nav className="flex items-center gap-2">
            {session ? (
              <>
                <Link to={dashHref} className="btn-ghost-emerald text-sm">Dashboard</Link>
                <button
                  onClick={() => { clearSession(); window.location.href = "/"; }}
                  className="text-sm text-muted-foreground hover:text-foreground px-3"
                >Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost-emerald text-sm">Login</Link>
                <Link to="/signup-user" className="btn-premium text-sm">Join</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
