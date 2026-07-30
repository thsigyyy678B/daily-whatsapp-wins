import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { randomCode, setSession } from "@/lib/session";
import { toast } from "sonner";
import { Check, Copy, FileText, KeyRound, PartyPopper, ShieldCheck, UserRound } from "lucide-react";
import { PageShell, Field, inputCls, Spinner } from "@/components/ui-kit";
import { CLOSED_MESSAGE, MAX_USERS, countRows } from "@/lib/limits";


export const Route = createFileRoute("/signup-user")({
  head: () => ({
    meta: [
      { title: "Create your earner account — Daily WhatsApp Challenge" },
      { name: "description", content: "Premium onboarding for WhatsApp status earners. Sign up, accept the terms and start taking paid tasks." },
      { property: "og:title", content: "Create your earner account" },
      { property: "og:description", content: "Join the WhatsApp status earning network in under two minutes." },
    ],
  }),
  component: SignupUser,
});

function embed(url: string) {
  if (!url) return "";
  if (url.includes("/edit")) return url.replace("/edit", "/preview");
  if (url.includes("docs.google.com/document")) return url + (url.includes("?") ? "&" : "?") + "embedded=true";
  return url;
}

const STEPS = [
  { n: 1, label: "Your details", icon: UserRound },
  { n: 2, label: "Terms", icon: FileText },
  { n: 3, label: "How it works", icon: ShieldCheck },
  { n: 4, label: "Credentials", icon: KeyRound },
];

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
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<{ u: string; p: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [full, setFull] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("key,value").in("key", ["terms_url", "about_url"]).then(({ data }) => {
      data?.forEach((r) => {
        if (r.key === "terms_url") setTermsUrl(String(r.value ?? ""));
        if (r.key === "about_url") setAboutUrl(String(r.value ?? ""));
      });
    });
    countRows("app_users").then((c) => setFull(c >= MAX_USERS));
  }, []);


  async function createAccount() {
    setBusy(true);
    try {
      if ((await countRows("app_users")) >= MAX_USERS) {
        setFull(true);
        toast.error(CLOSED_MESSAGE);
        return;
      }
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
        <Stepper step={step} />

        <div key={step} className="glass mt-8 animate-fade-up rounded-[1.75rem] p-7 sm:p-9">
          {step === 1 && (
            <>
              <div className="eyebrow">Step 01</div>
              <h1 className="mt-3 font-display text-3xl font-bold">Tell us about you</h1>
              <p className="mt-2 text-sm text-muted-foreground">Basic details so we can route your payouts correctly.</p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <Field label="Full name" className="sm:col-span-2">
                  <input className={inputCls} placeholder="Your legal name" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="WhatsApp number" hint="Statuses will be posted from this number.">
                  <input className={inputCls} inputMode="tel" placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                <Field label="Referral code" hint="Optional — a friend earns a bonus.">
                  <input className={`${inputCls} font-mono tracking-[0.25em] uppercase`} placeholder="ABCDE" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} />
                </Field>
              </div>
              <div className="mt-9 flex justify-end">
                <button className="btn-premium px-7 py-3" disabled={!name || !phone} onClick={() => setStep(2)}>Continue</button>
              </div>
            </>
          )}

          {step === 2 && (
            <DocStep
              eyebrow="Step 02"
              title="Terms & Conditions"
              subtitle="Please review the full agreement before continuing."
              url={termsUrl}
              fallback="Terms document has not been published by the administrator yet."
              checked={agree1}
              onCheck={setAgree1}
              checkLabel="I have read the agreement in full and accept all terms and conditions listed above."
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextLabel="Continue"
            />
          )}

          {step === 3 && (
            <DocStep
              eyebrow="Step 03"
              title="How the platform works"
              subtitle="Payouts, verification rules and approval timelines."
              url={aboutUrl}
              fallback="Information document has not been published by the administrator yet."
              checked={agree2}
              onCheck={setAgree2}
              checkLabel="I understand how tasks, approvals and payouts operate on this platform."
              onBack={() => setStep(2)}
              onNext={createAccount}
              nextLabel={busy ? "Creating account…" : "Create my account"}
              busy={busy}
            />
          )}

          {step === 4 && creds && (
            <>
              <div className="icon-tile"><PartyPopper className="h-5 w-5" /></div>
              <h1 className="mt-5 font-display text-3xl font-bold">Your account is ready</h1>
              <p className="mt-2 flex items-start gap-2 text-sm text-destructive-foreground/90">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Screenshot these credentials now — they cannot be recovered once lost.
              </p>

              <div className="glow-emerald mt-7 grid gap-5 rounded-[1.5rem] bg-black/40 p-7 text-center sm:grid-cols-2">
                {[["Username", creds.u], ["Password", creds.p]].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">{k}</div>
                    <div className="mt-2 font-display text-4xl font-bold tracking-[0.18em] text-gradient-emerald">{v}</div>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Username: ${creds.u}\nPassword: ${creds.p}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="btn-soft mx-auto"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied to clipboard" : "Copy credentials"}
                  </button>
                </div>
              </div>

              <button
                className="btn-premium mt-7 w-full py-3.5"
                onClick={() => { setSession({ role: "user", username: creds.u }); nav({ to: "/dashboard" }); }}
              >
                Enter my dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function DocStep({
  eyebrow, title, subtitle, url, fallback, checked, onCheck, checkLabel, onBack, onNext, nextLabel, busy,
}: {
  eyebrow: string; title: string; subtitle: string; url: string; fallback: string;
  checked: boolean; onCheck: (v: boolean) => void; checkLabel: string;
  onBack: () => void; onNext: () => void; nextLabel: string; busy?: boolean;
}) {
  return (
    <>
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="mt-3 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-black/40">
        {url ? (
          <iframe src={embed(url)} className="h-full w-full" title={title} />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">{fallback}</div>
        )}
      </div>
      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-white/[0.02] p-4 text-sm transition hover:border-primary/30">
        <input type="checkbox" checked={checked} onChange={(e) => onCheck(e.target.checked)} className="check-premium mt-0.5" />
        <span className="text-muted-foreground">{checkLabel}</span>
      </label>
      <div className="mt-8 flex flex-wrap justify-between gap-3">
        <button className="btn-soft" onClick={onBack}>Back</button>
        <button className="btn-premium px-7 py-3" disabled={!checked || busy} onClick={onNext}>
          {busy && <Spinner />} {nextLabel}
        </button>
      </div>
    </>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="glass grid grid-cols-4 gap-1 rounded-2xl p-2">
      {STEPS.map((s) => {
        const active = s.n === step;
        const done = s.n < step;
        return (
          <li
            key={s.n}
            className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition ${
              active ? "bg-primary/12 text-primary" : done ? "text-primary/70" : "text-muted-foreground"
            }`}
          >
            <s.icon className="h-4 w-4" />
            <span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.12em] sm:block">{s.label}</span>
            <span className="text-[0.68rem] font-semibold sm:hidden">{s.n}</span>
          </li>
        );
      })}
    </ol>
  );
}
