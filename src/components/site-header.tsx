import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { getSession, clearSession } from "@/lib/session";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogIn, LogOut, Menu, Sparkles, Wallet, X } from "lucide-react";

export function SiteHeader() {
  const [session, setS] = useState<ReturnType<typeof getSession>>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();

  const logout = () => {
    clearSession();
    setS(null);
    setOpen(false);
    nav({ to: "/" });
  };

  useEffect(() => { setS(getSession()); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashHref =
    session?.role === "admin" ? "/admin"
    : session?.role === "business" ? "/business"
    : session?.role === "user" ? "/dashboard"
    : "/login";

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-8">
        <div
          className={`glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-2.5 transition-all duration-300 sm:rounded-full sm:px-5 ${
            scrolled ? "shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]" : ""
          }`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-glow to-primary font-display text-sm font-extrabold text-primary-foreground">
              <span className="absolute inset-0 rounded-xl bg-primary/40 blur-lg" aria-hidden />
              <span className="relative">D</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-[0.95rem] font-bold leading-tight tracking-tight">
                Daily WhatsApp Challenge
              </span>
              <span className="hidden text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground sm:block">
                Status earning network
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex">
            {session ? (
              <>
                <Link to={dashHref} className="btn-soft">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                {session?.role === "user" && (
                  <Link to="/wallet" className="btn-soft">
                    <Wallet className="h-4 w-4" /> Wallet
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="btn-soft"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-soft"><LogIn className="h-4 w-4" /> Login</Link>
                <Link to="/signup-user" className="btn-premium"><Sparkles className="h-4 w-4" /> Join free</Link>
              </>
            )}
          </nav>

          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {open && (
          <div className="glass mt-2 animate-fade-up rounded-2xl p-3 sm:hidden">
            <div className="flex flex-col gap-2">
              {session ? (
                <>
                  <Link to={dashHref} className="btn-soft w-full"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
                  {session?.role === "user" && (
                    <Link to="/wallet" className="btn-soft w-full"><Wallet className="h-4 w-4" /> Wallet</Link>
                  )}
                  <button onClick={logout} className="btn-soft w-full">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-soft w-full"><LogIn className="h-4 w-4" /> Login</Link>
                  <Link to="/signup-user" className="btn-premium w-full"><Sparkles className="h-4 w-4" /> Join free</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
