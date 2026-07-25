import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { randomCode, setSession } from "@/lib/session";
import { toast } from "sonner";
import { inputCls, Field } from "./login";
import { Check, Copy } from "lucide-react";

export const Route = createFileRoute("/signup-business")({
  head: () => ({ meta: [{ title: "Business Sign Up — Daily WhatsApp Challenge" }, { name: "description", content: "Run WhatsApp status ad campaigns." }] }),
  component: SignupBusiness,
});

function SignupBusiness() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", phone: "", category: "", employees: "", target_audience: "" });
  const [creds, setCreds] = useState<{ u: string; p: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = "B" + randomCode(3, true);
    const p = randomCode(4, true);
    const { error } = await supabase.from("businesses").insert({ ...f, username: u, password: p });
    if (error) { toast.error(error.message); return; }
    setCreds({ u, p });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="glass rounded-3xl p-8">
          {!creds ? (
            <>
              <div className="text-xs uppercase tracking-widest text-primary">For business</div>
              <h1 className="mt-2 font-display text-2xl font-bold">Start a campaign</h1>
              <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Business name"><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                <Field label="Phone"><input required className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
                <Field label="Category"><input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
                <Field label="Employees"><input className={inputCls} value={f.employees} onChange={(e) => setF({ ...f, employees: e.target.value })} /></Field>
                <div className="sm:col-span-2">
                  <Field label="Target audience"><textarea className={inputCls} rows={3} value={f.target_audience} onChange={(e) => setF({ ...f, target_audience: e.target.value })} /></Field>
                </div>
                <div className="sm:col-span-2">
                  <button className="btn-premium w-full">Create business account</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">Save these credentials</h1>
              <p className="mt-1 text-sm text-destructive-foreground/90">⚠ Screenshot now — cannot be recovered.</p>
              <div className="glow-emerald mt-6 rounded-2xl bg-background/60 p-6 text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Username</div>
                <div className="mt-1 font-display text-3xl font-bold tracking-widest text-gradient-emerald">{creds.u}</div>
                <div className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Password</div>
                <div className="mt-1 font-display text-3xl font-bold tracking-widest text-gradient-emerald">{creds.p}</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(`Username: ${creds.u}\nPassword: ${creds.p}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="btn-ghost-emerald mx-auto mt-6 text-sm"
                >{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</button>
              </div>
              <button className="btn-premium mt-6 w-full" onClick={() => { setSession({ role: "business", username: creds.u }); nav({ to: "/business" }); }}>Go to dashboard</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
