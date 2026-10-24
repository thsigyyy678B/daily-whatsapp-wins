import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { toast } from "sonner";
import { Field, inputCls } from "./login";
import { Download, Eye, Gift, Lock, Share2, Wallet } from "lucide-react";
import { DriveMedia } from "@/components/drive-media";
import { driveToDownload } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Daily WhatsApp Challenge" }, { name: "description", content: "Your tasks and wallet." }] }),
  component: Dashboard,
});

type Task = { id: string; type: "free" | "paid"; name: string; image_url: string; required_views: number; payout: number; unlock_amount: number };
type Assign = { id: string; task_id: string; status: string; whatsapp_number: string; task?: Task };

function Dashboard() {
  const nav = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState<Assign[]>([]);
  const [maxFree, setMaxFree] = useState(5);
  const [upi, setUpi] = useState("");
  const [refPct, setRefPct] = useState(10);

  const load = useCallback(async () => {
    const s = getSession();
    if (!s || s.role !== "user") { nav({ to: "/login" }); return; }
    const [{ data: u }, { data: t }, { data: a }, { data: settings }] = await Promise.all([
      supabase.from("app_users").select("*").eq("username", s.username).maybeSingle(),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("task_assignments").select("*").eq("user_username", s.username).order("assigned_at", { ascending: false }),
      supabase.from("settings").select("key,value").in("key", ["max_free_task_per_user", "upi_id", "referral_percent"]),
    ]);
    setMe(u);
    setTasks((t ?? []) as Task[]);
    setMine((a ?? []) as Assign[]);
    settings?.forEach((r) => {
      if (r.key === "max_free_task_per_user") setMaxFree(Number(r.value));
      if (r.key === "upi_id") setUpi(String(r.value ?? ""));
      if (r.key === "referral_percent") setRefPct(Number(r.value));
    });
  }, [nav]);

  useEffect(() => { load(); }, [load]);

  if (!me) return <div className="min-h-screen"><SiteHeader /><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  const freeAssignedToday = mine.filter((a) => a.status !== "rejected" && tasks.find((t) => t.id === a.task_id)?.type === "free").length;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Wallet */}
        <div className="glass glow-emerald flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Wallet balance</div>
            <div className="mt-1 font-display text-4xl font-bold text-gradient-emerald">₹{Number(me.wallet).toFixed(2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Tasks done: {me.tasks_done} · @{me.username}</div>
          </div>
          <div className="flex gap-2">
            <ReferralBtn code={me.referral_code} pct={refPct} />
            <WithdrawBtn me={me} onDone={load} />
            <HistoryBtn username={me.username} />
          </div>
        </div>

        {/* Sponsored */}
        <SectionTitle title="Sponsored tasks" subtitle="Higher payout · Unlock to take" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.filter((t) => t.type === "paid").map((t) => (
            <TaskCard key={t.id} task={t} mine={mine} me={me} upi={upi} onDone={load} />
          ))}
          {tasks.filter((t) => t.type === "paid").length === 0 && <Empty label="No sponsored tasks yet" />}
        </div>

        {/* Free */}
        <SectionTitle title="Free tasks" subtitle={`Take up to ${maxFree} active free tasks`} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.filter((t) => t.type === "free").map((t) => (
            <TaskCard key={t.id} task={t} mine={mine} me={me} upi={upi} onDone={load} freeLimitReached={freeAssignedToday >= maxFree} />
          ))}
          {tasks.filter((t) => t.type === "free").length === 0 && <Empty label="No free tasks right now" />}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mt-10 mb-4 flex items-end justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="glass col-span-full rounded-2xl p-10 text-center text-sm text-muted-foreground">{label}</div>;
}

function TaskCard({ task, mine, me, upi, onDone, freeLimitReached }: any) {
  const [open, setOpen] = useState(false);
  const assign = mine.find((a: any) => a.task_id === task.id);

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div className="relative aspect-square overflow-hidden bg-black/50">
        <DriveMedia url={task.image_url} alt={task.name} className="h-full w-full object-cover" />
        <div className="absolute left-3 top-3 rounded-full bg-background/70 px-3 py-1 text-xs backdrop-blur">
          {task.type === "paid" ? "⭐ Sponsored" : "Free"}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-bold text-primary-foreground">₹{task.payout}</div>
      </div>
      <div className="p-4">
        <div className="font-semibold">{task.name}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> {task.required_views}+ views · 24h</div>
        {assign ? (
          <div className="mt-4 space-y-2">
            <div className="text-xs">Status: <span className="text-primary">{assign.status}</span></div>
            {assign.status === "assigned" && <SubmitProof assign={assign} onDone={onDone} />}
            <a href={driveToDownload(task.image_url)} target="_blank" rel="noreferrer" className="btn-ghost-emerald w-full text-xs">
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        ) : (
          <button
            disabled={task.type === "free" && freeLimitReached}
            onClick={() => setOpen(true)}
            className="btn-premium mt-4 w-full text-sm"
          >
            {task.type === "paid" ? <><Lock className="h-4 w-4" /> Unlock ₹{task.unlock_amount}</> : "Take task"}
          </button>
        )}
      </div>
      {open && <AssignModal task={task} me={me} upi={upi} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onDone(); }} />}
    </div>
  );
}

function AssignModal({ task, me, upi, onClose, onDone }: any) {
  const [wa, setWa] = useState(me.phone ?? "");
  const [txn, setTxn] = useState("");
  const [busy, setBusy] = useState(false);
  async function take() {
    setBusy(true);
    const { error } = await supabase.from("task_assignments").insert({
      task_id: task.id, user_username: me.username, whatsapp_number: wa,
      unlock_transaction_id: task.type === "paid" ? txn : null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Task assigned"); onDone(); }
    setBusy(false);
  }
  return (
    <Modal onClose={onClose}>
      <h3 className="font-display text-xl font-bold">{task.type === "paid" ? "Unlock sponsored task" : "Take task"}</h3>
      <div className="mt-4 space-y-3">
        <Field label="WhatsApp number to post from"><input className={inputCls} value={wa} onChange={(e) => setWa(e.target.value)} /></Field>
        {task.type === "paid" && (
          <>
            <div className="rounded-xl bg-background/50 p-4 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Scan & pay ₹{task.unlock_amount}</div>
              <img alt="qr" className="mx-auto mt-2 h-40 w-40 rounded-lg bg-white p-2" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upi}&am=${task.unlock_amount}&cu=INR&tn=${task.name}`)}`} />
              <div className="mt-2 text-xs text-muted-foreground">UPI: {upi}</div>
            </div>
            <Field label="Transaction ID"><input className={inputCls} value={txn} onChange={(e) => setTxn(e.target.value)} /></Field>
          </>
        )}
        <button disabled={busy || !wa || (task.type === "paid" && !txn)} onClick={take} className="btn-premium w-full">Confirm</button>
      </div>
    </Modal>
  );
}

function SubmitProof({ assign, onDone }: any) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [views, setViews] = useState("");
  async function submit() {
    const { error } = await supabase.from("task_assignments").update({
      status: "submitted", proof_image_url: url, views: Number(views), submitted_at: new Date().toISOString(),
    }).eq("id", assign.id);
    if (error) toast.error(error.message); else { toast.success("Submitted for approval"); onDone(); setOpen(false); }
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-premium w-full text-xs">Upload proof</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="font-display text-xl font-bold">Submit proof</h3>
          <p className="mt-1 text-xs text-muted-foreground">Upload screenshot to Google Drive (anyone with link) → paste URL below.</p>
          <div className="mt-4 space-y-3">
            <Field label="Google Drive image URL"><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
            <Field label="Views count"><input type="number" className={inputCls} value={views} onChange={(e) => setViews(e.target.value)} /></Field>
            <button onClick={submit} className="btn-premium w-full">Send for approval</button>
          </div>
        </Modal>
      )}
    </>
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
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
