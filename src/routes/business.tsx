import { createPortal } from "react-dom";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { DriveMedia } from "@/components/drive-media";
import { getSession } from "@/lib/session";
import { toast } from "sonner";
import { Field, inputCls } from "./login";
import { BarChart3, Rocket } from "lucide-react";

export const Route = createFileRoute("/business")({
  head: () => ({ meta: [{ title: "Business — Daily WhatsApp Challenge" }, { name: "description", content: "Run status ad campaigns." }] }),
  component: Business,
});

function Business() {
  const nav = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [upi, setUpi] = useState("");
  const [rejTerms, setRejTerms] = useState("");
  const [camps, setCamps] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const s = getSession();
    if (!s || s.role !== "business") { nav({ to: "/login" }); return; }
    const [{ data: b }, { data: settings }, { data: c }] = await Promise.all([
      supabase.from("businesses").select("*").eq("username", s.username).maybeSingle(),
      supabase.from("settings").select("key,value").in("key", ["business_packages", "business_package", "upi_id", "rejection_terms_url"]),
      supabase.from("campaigns").select("*").eq("business_username", s.username).order("created_at", { ascending: false }),
    ]);
    setMe(b);
    setCamps(c ?? []);
    let list: any[] = [];
    settings?.forEach((r) => {
      if (r.key === "upi_id") setUpi(String(r.value ?? ""));
      if (r.key === "rejection_terms_url") setRejTerms(String(r.value ?? ""));
      if (r.key === "business_packages" && Array.isArray(r.value)) list = [...r.value];
      if (r.key === "business_package" && (r.value as any)?.name && list.length === 0) list = [r.value];
    });
    while (list.length < 3) list.push({});
    setPkgs(list.slice(0, 3));
  }, [nav]);

  useEffect(() => { load(); }, [load]);

  if (!me) return <div className="min-h-screen"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="glass rounded-3xl p-6">
          <div className="text-xs uppercase tracking-widest text-primary">Business account</div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-bold">{me.name}</h1>
            <Link to="/status" className="btn-soft"><BarChart3 className="h-4 w-4" /> Status page</Link>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">@{me.username} · {me.category}</div>
        </div>

        {/* Packages */}
        <div className="mt-6 glass glow-emerald rounded-3xl p-8">
          <div className="text-xs uppercase tracking-widest text-primary">Available packages</div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {pkgs.filter((p) => p?.name).map((p, i) => (
              <div key={i} className="flex flex-col rounded-2xl border border-border bg-black/30 p-5">
                <h2 className="font-display text-xl font-bold">{p.name}</h2>
                <div className="text-gradient-emerald mt-1 font-display text-2xl">₹{p.amount}</div>
                <div className="mt-1 text-xs text-muted-foreground">{p.views}+ views · {p.duration}</div>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.short}</p>
                {p.long_url && <a href={p.long_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary underline">Full details →</a>}
                <button onClick={() => { setSel(p); setOpen(true); }} className="btn-premium mt-4"><Rocket className="h-4 w-4" /> Create campaign</button>
              </div>
            ))}
            {pkgs.filter((p) => p?.name).length === 0 && (
              <p className="text-sm text-muted-foreground md:col-span-3">No packages configured yet — check back soon.</p>
            )}
          </div>
        </div>

        {/* Campaigns */}
        <h2 className="mt-10 mb-4 font-display text-2xl font-bold">Your campaigns</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {camps.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-4">
              <DriveMedia url={c.image_url} alt="Campaign creative" className="aspect-video w-full rounded-xl object-cover" />
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Txn: {c.transaction_id}</div>
                <span className={`rounded-full px-3 py-1 text-xs ${c.status === "approved" ? "bg-primary/20 text-primary" : c.status === "rejected" ? "bg-destructive/20" : "bg-muted"}`}>{c.status}</span>
              </div>
              {c.reject_reason && <div className="mt-2 text-xs text-destructive-foreground/80">Reason: {c.reject_reason}</div>}
            </div>
          ))}
          {camps.length === 0 && <div className="glass col-span-full rounded-2xl p-10 text-center text-sm text-muted-foreground">No campaigns yet.</div>}
        </div>
      </div>

      {open && sel?.name && <CampaignModal pkg={sel} upi={upi} rejTerms={rejTerms} me={me} onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function embed(url: string) {
  if (!url) return "";
  if (url.includes("/edit")) return url.replace("/edit", "/preview");
  if (url.includes("docs.google.com/document")) return url + (url.includes("?") ? "&" : "?") + "embedded=true";
  return url;
}

function CampaignModal({ pkg, upi, rejTerms, me, onClose, onDone }: any) {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState("");
  const [txn, setTxn] = useState("");
  async function submit() {
    const { error } = await supabase.from("campaigns").insert({
      business_username: me.username, image_url: image, transaction_id: txn, amount: pkg.amount,
      package_name: pkg.name ?? "", expected_views: Number(pkg.views) || 0,
    });
    if (error) toast.error(error.message); else { toast.success("Submitted for approval"); onDone(); }
  }
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="glass w-full max-w-lg rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        {step === 1 && (
          <>
            <h3 className="font-display text-xl font-bold">Upload your ad creative</h3>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Open Google Drive & upload your image.</li>
              <li>Right-click → Share → Anyone with the link.</li>
              <li>Copy the link and paste below.</li>
            </ol>
            <div className="mt-4">
              <Field label="Google Drive image URL"><input className={inputCls} value={image} onChange={(e) => setImage(e.target.value)} /></Field>
            </div>
            <div className="mt-4 flex justify-end"><button className="btn-premium" disabled={!image} onClick={() => setStep(2)}>Next</button></div>
          </>
        )}
        {step === 2 && (
          <>
            <h3 className="font-display text-xl font-bold">Rejection terms</h3>
            <div className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-border">
              {rejTerms ? <iframe src={embed(rejTerms)} className="h-full w-full" /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">Not configured</div>}
            </div>
            <div className="mt-4 flex justify-between">
              <button className="btn-ghost-emerald" onClick={() => setStep(1)}>Back</button>
              <button className="btn-premium" onClick={() => setStep(3)}>I agree, continue</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h3 className="font-display text-xl font-bold">Pay ₹{pkg.amount}</h3>
            <div className="mt-4 rounded-xl bg-background/50 p-4 text-center">
              <img alt="qr" className="mx-auto h-44 w-44 rounded-lg bg-white p-2" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${upi}&am=${pkg.amount}&cu=INR&tn=${pkg.name}`)}`} />
              <div className="mt-2 text-xs text-muted-foreground">UPI: {upi}</div>
            </div>
            <div className="mt-4"><Field label="Transaction ID"><input className={inputCls} value={txn} onChange={(e) => setTxn(e.target.value)} /></Field></div>
            <button disabled={!txn} onClick={submit} className="btn-premium mt-4 w-full">Submit for approval</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
