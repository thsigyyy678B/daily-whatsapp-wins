import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { randomCode, setSession } from "@/lib/session";
import { toast } from "sonner";
import { inputCls, Field } from "./login";
import { Check, Copy } from "lucide-react";

export const Route = createFileRoute("/signup-user")({
  head: () => ({ meta: [{ title: "Sign up — Daily WhatsApp Challenge" }, { name: "description", content: "Create your earner account." }] }),
  component: SignupUser,
});

function embed(url: string) {
  if (!url) return "";
  if (url.includes("/edit")) return url.replace("/edit", "/preview");
  if (url.includes("docs.google.com/document")) return url + (url.includes("?") ? "&" : "?") + "embedded=true";
  return url;
}

function SignupUser() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [aboutUrl, setAboutUrl] = useState("");
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [creds, setCreds] = useState<{ u: string; p: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("key,value").in("key", ["terms_url", "about_url"]).then(({ data }) => {
      data?.forEach((r) => {
        if (r.key === "terms_url") setTermsUrl(String(r.value ?? ""));
        if (r.key === "about_url") setAboutUrl(String(r.value ?? ""));
      });
    });
  }, []);

  async function createAccount() {
    const u = randomCode(4, true);
    const p = randomCode(4, true);
    let referred_by: string | null = null;
    if (ref.trim()) {
      const { data } = await supabase.from("app_users").select("username").eq("referral_code", ref.trim().toUpperCase()).maybeSingle();
      if (data) referred_by = data.username;
    }
    const referral_code = randomCode(5);
    const { error } = await supabase.from("app_users").insert({
      username: u, password: p, name, phone, referral_code, referred_by,
    });
    if (error) { toast.error(error.message); return; }
    setCreds({ u, p });
    setStep(4);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <StepDots step={step} total={4} />
        <div className="glass mt-6 rounded-3xl p-8">
          {step === 1 && (
            <>
              <h1 className="font-display text-2xl font-bold">Tell us about you</h1>
              <p className="mt-1 text-sm text-muted-foreground">Basic details so we can send payouts.</p>
              <div className="mt-6 space-y-4">
                <Field label="Full name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="WhatsApp number"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
                <Field label="Referral code (optional)"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} /></Field>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="btn-premium" disabled={!name || !phone} onClick={() => setStep(2)}>Next</button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="font-display text-2xl font-bold">Terms & Conditions</h1>
              <p className="mt-1 text-sm text-muted-foreground">Please review carefully before continuing.</p>
              <div className="mt-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-black/40">
                {termsUrl ? (
                  <iframe src={embed(termsUrl)} className="h-full w-full" title="Terms" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">Terms document not yet configured by admin.</div>
                )}
              </div>
              <label className="mt-5 flex items-start gap-3 text-sm">
                <input type="checkbox" checked={agree1} onChange={(e) => setAgree1(e.target.checked)} className="mt-1 h-4 w-4 accent-[oklch(0.78_0.19_155)]" />
                <span>I have read and I fully accept all the terms & conditions listed above.</span>
              </label>
              <div className="mt-6 flex justify-between">
                <button className="btn-ghost-emerald" onClick={() => setStep(1)}>Back</button>
                <button className="btn-premium" disabled={!agree1} onClick={() => setStep(3)}>Next</button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="font-display text-2xl font-bold">How the platform works</h1>
              <p className="mt-1 text-sm text-muted-foreground">Payouts, verification & rules explained.</p>
              <div className="mt-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-black/40">
                {aboutUrl ? (
                  <iframe src={embed(aboutUrl)} className="h-full w-full" title="About" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-muted-foreground">Info document not yet configured by admin.</div>
                )}
              </div>
              <label className="mt-5 flex items-start gap-3 text-sm">
                <input type="checkbox" checked={agree2} onChange={(e) => setAgree2(e.target.checked)} className="mt-1 h-4 w-4 accent-[oklch(0.78_0.19_155)]" />
                <span>I understand how payouts, tasks and approvals work.</span>
              </label>
              <div className="mt-6 flex justify-between">
                <button className="btn-ghost-emerald" onClick={() => setStep(2)}>Back</button>
                <button className="btn-premium" disabled={!agree2} onClick={createAccount}>Create account</button>
              </div>
            </>
          )}
          {step === 4 && creds && (
            <>
              <h1 className="font-display text-2xl font-bold">Your account is ready</h1>
              <p className="mt-1 text-sm text-destructive-foreground/90">
                ⚠ Screenshot this now — credentials cannot be recovered if lost.
              </p>
              <div className="mt-6 glow-emerald rounded-2xl bg-background/60 p-6 text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Username</div>
                <div className="mt-1 font-display text-4xl font-bold tracking-widest text-gradient-emerald">{creds.u}</div>
                <div className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Password</div>
                <div className="mt-1 font-display text-4xl font-bold tracking-widest text-gradient-emerald">{creds.p}</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Username: ${creds.u}\nPassword: ${creds.p}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="btn-ghost-emerald mx-auto mt-6 text-sm"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                className="btn-premium mt-6 w-full"
                onClick={() => { setSession({ role: "user", username: creds.u }); nav({ to: "/dashboard" }); }}
              >Continue to dashboard</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 <= step ? "w-10 bg-primary" : "w-6 bg-border"}`} />
      ))}
    </div>
  );
}
