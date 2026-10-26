import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { toast } from "sonner";
import { Field, inputCls } from "./login";
import { Gift, Share2, Wallet } from "lucide-react";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Daily WhatsApp Challenge" },
      { name: "description", content: "Your balance, withdrawals, history and referral rewards." },
      { property: "og:title", content: "Wallet — Daily WhatsApp Challenge" },
      { property: "og:description", content: "Your balance, withdrawals, history and referral rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [refPct, setRefPct] = useState(10);

  const load = useCallback(async () => {
    const s = getSession();
    if (!s || s.role !== "user") { nav({ to: "/login" }); return; }
    const [{ data: u }, { data: settings }] = await Promise.all([
      supabase.from("app_users").select("*").eq("username", s.username).maybeSingle(),
      supabase.from("settings").select("key,value").in("key", ["referral_percent"]),
    ]);
    setMe(u);
    settings?.forEach((r) => {
      if (r.key === "referral_percent") setRefPct(Number(r.value));
    });
  }, [nav]);

  useEffect(() => { load(); }, [load]);

  if (!me) return <div className="min-h-screen"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="glass glow-emerald rounded-3xl p-8 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Wallet balance</div>
          <div className="mt-2 font-display text-5xl font-bold text-gradient-emerald">₹{Number(me.wallet).toFixed(2)}</div>
          <div className="mt-2 text-xs text-muted-foreground">Tasks done: {me.tasks_done} · @{me.username}</div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <ReferralBtn code={me.referral_code} pct={refPct} />
            <WithdrawBtn me={me} onDone={load} />
            <HistoryBtn username={me.username} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WithdrawBtn({ me, onDone }: any) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"bank" | "upi" | "coupon">("upi");
  const [d1, setD1] = useState(""); const [d2, setD2] = useState("");
  async function submit() {
    if (Number(me.wallet) <= 0) { toast.error("Wallet empty"); return; }
    const details = method === "bank" ? `Acc: ${d1}, IFSC: ${d2}` : method === "upi" ? d1 : "Coupon (2× benefit)";
    const { error } = await supabase.from("withdrawals").insert({
      user_username: me.username, amount: me.wallet, method, details, status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("app_users").update({ wallet: 0 }).eq("username", me.username);
    await supabase.from("wallet_history").insert({ user_username: me.username, amount: -Number(me.wallet), type: "withdraw_pending", note: `via ${method}` });
    toast.success("Withdrawal requested");
    setOpen(false); onDone();
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-premium text-sm"><Wallet className="h-4 w-4" /> Withdraw</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="font-display text-xl font-bold">Withdraw ₹{me.wallet}</h3>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["upi", "bank", "coupon"] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`rounded-xl border p-3 text-xs ${method === m ? "border-primary bg-primary/10" : "border-border"}`}>
                {m === "coupon" ? "Coupon 2×" : m.toUpperCase()}
              </button>
            ))}
          </div>
          {method === "coupon" && (
            <div className="mt-4 rounded-xl bg-primary/10 p-4 text-center text-sm">
              🎁 You'll receive a <b className="text-gradient-emerald">₹{Number(me.wallet) * 2}</b> shopping coupon on WhatsApp.
            </div>
          )}
          {method === "upi" && <Field label="UPI ID"><input className={inputCls} value={d1} onChange={(e) => setD1(e.target.value)} /></Field>}
          {method === "bank" && (
            <>
              <Field label="Account number"><input className={inputCls} value={d1} onChange={(e) => setD1(e.target.value)} /></Field>
              <Field label="IFSC"><input className={inputCls} value={d2} onChange={(e) => setD2(e.target.value)} /></Field>
            </>
          )}
          <button onClick={submit} className="btn-premium mt-5 w-full">Request withdrawal</button>
        </Modal>
      )}
    </>
  );
}

function HistoryBtn({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!open) return;
    supabase.from("wallet_history").select("*").eq("user_username", username).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [open, username]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost-emerald text-sm">History</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="font-display text-xl font-bold">Wallet history</h3>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="flex justify-between rounded-xl bg-background/40 p-3 text-sm">
                <div><div>{r.type}</div><div className="text-xs text-muted-foreground">{r.note}</div></div>
                <div className={r.amount >= 0 ? "text-primary" : "text-destructive-foreground/80"}>{r.amount >= 0 ? "+" : ""}₹{r.amount}</div>
              </div>
            ))}
            {rows.length === 0 && <div className="text-center text-sm text-muted-foreground">No activity yet.</div>}
          </div>
        </Modal>
      )}
    </>
  );
}

function ReferralBtn({ code, pct }: { code: string; pct: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost-emerald text-sm"><Gift className="h-4 w-4" /> Refer</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="font-display text-xl font-bold">Your referral code</h3>
          <div className="glow-emerald mt-4 rounded-2xl bg-background/60 p-6 text-center">
            <div className="font-display text-4xl font-bold tracking-widest text-gradient-emerald">{code}</div>
            <p className="mt-3 text-xs text-muted-foreground">Earn {pct}% of your friend's first-task payout.</p>
          </div>
          <button className="btn-premium mt-4 w-full" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}><Share2 className="h-4 w-4" /> Copy code</button>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
