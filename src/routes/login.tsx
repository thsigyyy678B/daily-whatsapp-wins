import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { setSession, SUPER_ADMIN } from "@/lib/session";
import { toast } from "sonner";
import { Eye, EyeOff, Fingerprint, Lock, ShieldCheck, User, Zap } from "lucide-react";
import { PageShell, Field, inputCls, Spinner } from "@/components/ui-kit";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Secure Login — Daily WhatsApp Challenge" },
      { name: "description", content: "Sign in to your earner, business or admin workspace on Daily WhatsApp Challenge." },
      { property: "og:title", content: "Secure Login — Daily WhatsApp Challenge" },
      { property: "og:description", content: "One secure login for earners, businesses and administrators." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setL] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setL(true);
    try {
      if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
        setSession({ role: "admin", username });
        toast.success("Welcome, Super Admin");
        nav({ to: "/admin" });
        return;
      }
      const { data: u } = await supabase.from("app_users").select("username,password").eq("username", username).maybeSingle();
      if (u && u.password === password) {
        setSession({ role: "user", username });
        toast.success("Logged in");
        nav({ to: "/dashboard" });
        return;
      }
      const { data: b } = await supabase.from("businesses").select("username,password").eq("username", username).maybeSingle();
      if (b && b.password === password) {
        setSession({ role: "business", username });
        toast.success("Welcome back");
        nav({ to: "/business" });
        return;
      }
      toast.error("Invalid credentials");
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setL(false);
    }
  }

  return (
    <PageShell>
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:items-center lg:py-20">
        {/* Illustration side */}
        <section className="hidden animate-fade-up lg:block">
          <div className="eyebrow">Secure workspace access</div>
          <h1 className="mt-4 font-display text-5xl font-bold leading-[1.02]">
            One key for the<br />
            <span className="text-gradient-emerald">entire network.</span>
          </h1>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Earners, businesses and administrators all sign in here. Your workspace is resolved automatically.
          </p>

          <div className="relative mt-12 h-[320px] w-full max-w-lg">
            <div className="absolute inset-0 rounded-[2rem] bg-primary/10 blur-3xl" aria-hidden />
            <div className="glass absolute left-0 top-4 w-64 animate-float rounded-2xl p-5" style={{ animationDelay: "-1s" }}>
              <div className="icon-tile"><Zap className="h-5 w-5" /></div>
              <div className="mt-4 font-display text-2xl font-bold">₹1,250</div>
              <div className="text-xs text-muted-foreground">Credited · Task approved</div>
            </div>
            <div className="glass absolute right-2 top-24 w-60 animate-float rounded-2xl p-5" style={{ animationDelay: "-4s" }}>
              <div className="icon-tile"><ShieldCheck className="h-5 w-5" /></div>
              <div className="mt-4 text-sm font-semibold">Verified views</div>
              <div className="text-xs text-muted-foreground">Reviewed by admin team</div>
            </div>
            <div className="glass absolute bottom-0 left-16 w-72 animate-float rounded-2xl p-5" style={{ animationDelay: "-7s" }}>
              <div className="flex items-center gap-3">
                <div className="icon-tile"><Fingerprint className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">Encrypted session</div>
                  <div className="text-xs text-muted-foreground">Role-aware routing</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Card */}
        <section className="glass mx-auto w-full max-w-md animate-fade-up rounded-[1.75rem] p-7 sm:p-9">
          <div className="icon-tile"><Lock className="h-5 w-5" /></div>
          <h2 className="mt-5 font-display text-2xl font-bold">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter the credentials issued at sign-up.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Username">
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={username}
                  onChange={(e) => setU(e.target.value)}
                  className={`${inputCls} pl-10`}
                  placeholder="e.g. 4X7K"
                  autoComplete="username"
                  required
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setP(e.target.value)}
                  className={`${inputCls} pl-10 pr-11`}
                  placeholder="••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <button disabled={loading} className="btn-premium mt-2 w-full py-3">
              {loading ? <><Spinner /> Verifying…</> : "Sign in securely"}
            </button>
          </form>

          <div className="divider-glow my-7" />
          <div className="flex flex-col gap-2 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account?</span>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/signup-user" className="btn-soft">Join as earner</Link>
              <Link to="/signup-business" className="btn-soft">Register a business</Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export { inputCls, Field } from "@/components/ui-kit";
