import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { setSession, SUPER_ADMIN } from "@/lib/session";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Daily WhatsApp Challenge" }, { name: "description", content: "Login to your account." }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
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
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <div className="glass rounded-3xl p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <LogIn className="h-5 w-5" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">One login for earners, business & admin.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Username">
              <input value={username} onChange={(e) => setU(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setP(e.target.value)} className={inputCls} required />
            </Field>
            <button disabled={loading} className="btn-premium w-full">{loading ? "Logging in…" : "Login"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export const inputCls = "w-full rounded-xl bg-input px-4 py-3 text-sm outline-none ring-1 ring-border focus:ring-primary/60 transition";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
