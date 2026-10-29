import { createPortal } from "react-dom";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { DriveMedia } from "@/components/drive-media";
import { getSession } from "@/lib/session";
import { toast } from "sonner";
import { Field, inputCls } from "./login";
import { Plus, Trash2 } from "lucide-react";
import { MAX_BUSINESSES, MAX_USERS, countRows } from "@/lib/limits";


export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Super Admin — Daily WhatsApp Challenge" }, { name: "description", content: "Platform control panel." }] }),
  component: Admin,
});

const TABS = ["Users", "Tasks", "Submissions", "Businesses", "Campaigns", "Withdrawals", "Settings"] as const;
type Tab = (typeof TABS)[number];

function Admin() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("Tasks");
  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") nav({ to: "/login" });
  }, [nav]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="glass rounded-3xl p-6">
          <div className="text-xs uppercase tracking-widest text-primary">Super admin</div>
          <h1 className="mt-2 font-display text-3xl font-bold">Control panel</h1>
          <CapacityBar />
        </div>


        <div className="glass mt-6 flex flex-wrap gap-2 rounded-full p-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "Users" && <UsersTab />}
          {tab === "Tasks" && <TasksTab />}
          {tab === "Submissions" && <SubmissionsTab />}
          {tab === "Businesses" && <BusinessesTab />}
          {tab === "Campaigns" && <CampaignsTab />}
          {tab === "Withdrawals" && <WithdrawalsTab />}
          {tab === "Settings" && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function CapacityBar() {
  const [c, setC] = useState({ users: 0, biz: 0 });
  useEffect(() => {
    Promise.all([countRows("app_users"), countRows("businesses")]).then(([users, biz]) => setC({ users, biz }));
  }, []);
  const items = [
    { label: "Earner signups", used: c.users, max: MAX_USERS },
    { label: "Business signups", used: c.biz, max: MAX_BUSINESSES },
  ];
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {items.map((it) => {
        const pct = Math.min(100, Math.round((it.used / it.max) * 100));
        const done = it.used >= it.max;
        return (
          <div key={it.label} className="rounded-2xl border border-border bg-black/30 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{it.label}</span>
              <span className={`font-display text-lg font-bold ${done ? "text-destructive-foreground" : "text-primary"}`}>
                {it.used}/{it.max}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-all ${done ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {done ? "Limit reached — signups closed" : `${it.max - it.used} seats remaining`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UsersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("app_users").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  return (
    <div className="glass overflow-x-auto rounded-3xl p-4">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="p-3 text-left">Username</th><th className="text-left">Name</th><th className="text-left">Phone</th><th>Wallet</th><th>Done</th><th>Joined</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.username} className="border-t border-border/50">
              <td className="p-3 font-mono text-primary">{u.username}</td>
              <td>{u.name}</td><td>{u.phone}</td>
              <td className="text-center">₹{u.wallet}</td>
              <td className="text-center">{u.tasks_done}</td>
              <td className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</td>
              <td><AddMoneyBtn user={u} onDone={load} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">No users yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AddMoneyBtn({ user, onDone }: any) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(""); const [reason, setReason] = useState("");
  async function submit() {
    const a = Number(amt);
    if (!a || a <= 0) return;
    await supabase.from("app_users").update({ wallet: Number(user.wallet) + a }).eq("username", user.username);
    await supabase.from("wallet_history").insert({ user_username: user.username, amount: a, type: "admin_credit", note: reason.slice(0, 50) });
    toast.success("Credited");
    setOpen(false); onDone();
  }
  return (
    <>
      <button className="btn-ghost-emerald text-xs" onClick={() => setOpen(true)}>+ Add</button>
      {open && <ModalAdmin onClose={() => setOpen(false)}>
        <h3 className="font-display text-lg font-bold">Add money to @{user.username}</h3>
        <Field label="Amount (₹)"><input type="number" className={inputCls} value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
        <Field label="Reason (max 50)"><input maxLength={50} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <button className="btn-premium mt-4 w-full" onClick={submit}>Credit</button>
      </ModalAdmin>}
    </>
  );
}

function TasksTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [type, setType] = useState<"free" | "paid">("free");
  const [f, setF] = useState({ name: "", image_url: "", required_views: "", payout: "", unlock_amount: "" });
  const load = () => supabase.from("tasks").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function add() {
    const active = rows.filter((r) => r.type === type).length;
    if (active >= 25) { toast.error(`Max 25 ${type} tasks reached. Delete one first.`); return; }
    const { error } = await supabase.from("tasks").insert({
      type, name: f.name, image_url: f.image_url,
      required_views: Number(f.required_views), payout: Number(f.payout),
      unlock_amount: type === "paid" ? Number(f.unlock_amount) : 0,
    });
    if (error) toast.error(error.message);
    else { toast.success("Added"); setF({ name: "", image_url: "", required_views: "", payout: "", unlock_amount: "" }); load(); }
  }
  async function del(t: any) {
    const { data: taken } = await supabase.from("task_assignments").select("id").eq("task_id", t.id).in("status", ["assigned", "submitted"]).limit(1);
    if (taken && taken.length) { toast.error("Cannot delete — task currently taken by a user."); return; }
    if (!confirm("Delete task?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="flex gap-2">
          {(["free", "paid"] as const).map((k) => (
            <button key={k} onClick={() => setType(k)} className={`rounded-full px-4 py-1.5 text-sm ${type === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{k.toUpperCase()}</button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Task name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Status image (Google Drive URL)"><input className={inputCls} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></Field>
          <Field label="Required views"><input type="number" className={inputCls} value={f.required_views} onChange={(e) => setF({ ...f, required_views: e.target.value })} /></Field>
          <Field label="Payout (₹)"><input type="number" className={inputCls} value={f.payout} onChange={(e) => setF({ ...f, payout: e.target.value })} /></Field>
          {type === "paid" && <Field label="Unlock amount (₹)"><input type="number" className={inputCls} value={f.unlock_amount} onChange={(e) => setF({ ...f, unlock_amount: e.target.value })} /></Field>}
        </div>
        <button className="btn-premium mt-4" onClick={add}><Plus className="h-4 w-4" /> Add task</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <div key={t.id} className="glass overflow-hidden rounded-2xl">
            <DriveMedia url={t.image_url} alt={t.name} className="aspect-video w-full object-cover" />
            <div className="p-4">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs uppercase text-primary">{t.type}</div>
                  <div className="font-semibold">{t.name}</div>
                </div>
                <button onClick={() => del(t)} className="text-destructive-foreground/80"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">₹{t.payout} · {t.required_views}+ views{t.type === "paid" && ` · unlock ₹${t.unlock_amount}`}</div>
              <TakenList taskId={t.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TakenList({ taskId }: { taskId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("task_assignments").select("user_username,whatsapp_number,status").eq("task_id", taskId).then(({ data }) => setRows(data ?? []));
  }, [taskId]);
  if (rows.length === 0) return <div className="mt-3 text-xs text-muted-foreground">No takers.</div>;
  return (
    <div className="mt-3">
      <div className="text-xs uppercase text-muted-foreground">Taken by</div>
      <ul className="mt-1 space-y-1 text-xs">
        {rows.map((r, i) => <li key={i} className="text-primary">@{r.user_username} · {r.whatsapp_number} · {r.status}</li>)}
      </ul>
    </div>
  );
}

function SubmissionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("task_assignments").select("*, task:tasks(*)").eq("status", "submitted").order("submitted_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  async function approve(a: any) {
    const { data: u } = await supabase.from("app_users").select("*").eq("username", a.user_username).maybeSingle();
    if (!u) return;
    const payout = Number(a.task.payout);
    await supabase.from("app_users").update({
      wallet: Number(u.wallet) + payout,
      tasks_done: u.tasks_done + 1,
      first_task_done: true,
    }).eq("username", u.username);
    await supabase.from("wallet_history").insert({ user_username: u.username, amount: payout, type: "task_payout", note: a.task.name });
    await supabase.from("task_assignments").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", a.id);
    // Referral bonus on FIRST task only
    if (!u.first_task_done && u.referred_by) {
      const { data: settings } = await supabase.from("settings").select("value").eq("key", "referral_percent").maybeSingle();
      const pct = Number(settings?.value ?? 10);
      const bonus = (payout * pct) / 100;
      const { data: refUser } = await supabase.from("app_users").select("wallet").eq("username", u.referred_by).maybeSingle();
      if (refUser) {
        await supabase.from("app_users").update({ wallet: Number(refUser.wallet) + bonus }).eq("username", u.referred_by);
        await supabase.from("wallet_history").insert({ user_username: u.referred_by, amount: bonus, type: "referral", note: `From @${u.username}` });
      }
    }
    toast.success("Approved & credited"); load();
  }
  async function reject(a: any, reason: string) {
    await supabase.from("task_assignments").update({ status: "rejected", reject_reason: reason, reviewed_at: new Date().toISOString() }).eq("id", a.id);
    toast.success("Rejected"); load();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((a) => (
        <div key={a.id} className="glass rounded-2xl p-4">
          <div className="flex gap-3">
            {a.proof_image_url && <DriveMedia url={a.proof_image_url} alt="proof" className="h-24 w-24 rounded-xl object-cover" />}
            <div className="flex-1">
              <div className="font-semibold">{a.task?.name}</div>
              <div className="text-xs text-muted-foreground">@{a.user_username} · WA: {a.whatsapp_number}</div>
              <div className="text-xs">Views: <b>{a.views}</b> / {a.task?.required_views} · ₹{a.task?.payout}</div>
              {a.unlock_transaction_id && <div className="text-xs text-primary">Unlock Txn: {a.unlock_transaction_id}</div>}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => approve(a)} className="btn-premium text-xs">Approve</button>
            <RejectBtn onReject={(r) => reject(a, r)} isPaid={a.task?.type === "paid"} />
          </div>
        </div>
      ))}
      {rows.length === 0 && <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground">No pending submissions.</div>}
    </div>
  );
}

function RejectBtn({ onReject, isPaid }: { onReject: (r: string) => void; isPaid: boolean }) {
  const [open, setOpen] = useState(false);
  const reasons = [
    "Target views not reached",
    "Contact us to know more",
    ...(isPaid ? ["Sponsor unlock payment not received"] : []),
  ];
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border border-destructive/50 px-4 py-1.5 text-xs text-destructive-foreground">Reject</button>
      {open && <ModalAdmin onClose={() => setOpen(false)}>
        <h3 className="font-display text-lg font-bold">Rejection reason</h3>
        <div className="mt-4 space-y-2">
          {reasons.map((r) => (
            <button key={r} onClick={() => { onReject(r); setOpen(false); }} className="w-full rounded-xl bg-background/60 p-3 text-left text-sm hover:bg-primary/10">{r}</button>
          ))}
        </div>
      </ModalAdmin>}
    </>
  );
}

function BusinessesTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("businesses").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, []);
  return (
    <div className="glass overflow-x-auto rounded-3xl p-4">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr><th className="p-3 text-left">Username</th><th className="text-left">Name</th><th className="text-left">Phone</th><th className="text-left">Category</th><th>Joined</th></tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.username} className="border-t border-border/50">
              <td className="p-3 font-mono text-primary">{b.username}</td><td>{b.name}</td><td>{b.phone}</td><td>{b.category}</td>
              <td className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No businesses.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function CampaignsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [viewsDraft, setViewsDraft] = useState<Record<string, string>>({});
  const load = () => supabase.from("campaigns").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  async function setViews(c: any) {
    const n = Number(viewsDraft[c.id]);
    if (!Number.isFinite(n) || n < 0) { toast.error("Enter a valid number of views"); return; }
    const { error } = await supabase.from("campaigns").update({ views: n }).eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("Views updated"); setViewsDraft({ ...viewsDraft, [c.id]: "" }); load(); }
  }
  async function act(c: any, status: "approved" | "rejected") {
    const reason = status === "rejected" ? prompt("Reason?") ?? "" : null;
    await supabase.from("campaigns").update({ status, reject_reason: reason }).eq("id", c.id);
    toast.success(status); load();
  }
  async function del(c: any) {
    if (!confirm("Delete this campaign? This removes it permanently.")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((c) => (
        <div key={c.id} className="glass overflow-hidden rounded-2xl">
          <DriveMedia url={c.image_url} alt="Campaign creative" className="aspect-video w-full object-cover" />
          <div className="p-4">
            <div className="text-xs uppercase text-primary">@{c.business_username}</div>
            <div className="text-sm">₹{c.amount} · Txn: {c.transaction_id}</div>
            <div className="mt-1 text-xs text-muted-foreground">Status: {c.status}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.status === "pending" && (
                <>
                  <button onClick={() => act(c, "approved")} className="btn-premium text-xs">Approve</button>
                  <button onClick={() => act(c, "rejected")} className="rounded-full border border-destructive/50 px-4 py-1.5 text-xs">Reject</button>
                </>
              )}
              <button onClick={() => del(c)} className="rounded-full border border-destructive/50 px-4 py-1.5 text-xs">Delete</button>
            </div>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div className="glass col-span-full rounded-2xl p-10 text-center text-muted-foreground">No campaigns.</div>}
    </div>
  );
}

function WithdrawalsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  async function done(w: any) {
    await supabase.from("withdrawals").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", w.id);
    await supabase.from("wallet_history").insert({ user_username: w.user_username, amount: 0, type: "withdraw_done", note: `₹${w.amount} via ${w.method}` });
    toast.success("Marked done"); load();
  }
  return (
    <div className="glass overflow-x-auto rounded-3xl p-4">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-muted-foreground">
          <tr><th className="p-3 text-left">User</th><th>Amount</th><th className="text-left">Method</th><th className="text-left">Details</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id} className="border-t border-border/50">
              <td className="p-3 font-mono text-primary">@{w.user_username}</td>
              <td className="text-center">₹{w.amount}</td>
              <td>{w.method}</td>
              <td className="text-xs">{w.details}</td>
              <td className="text-center">{w.status}</td>
              <td>{w.status === "pending" && <button onClick={() => done(w)} className="btn-premium text-xs">Mark done</button>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No requests.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from("settings").select("key,value").then(({ data }) => {
      const o: Record<string, any> = {};
      data?.forEach((r) => { o[r.key] = r.value; });
      setS(o); setLoaded(true);
    });
  }, []);

  async function save(key: string, value: any) {
    const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else toast.success("Saved");
  }
  function upd(k: string, v: any) { setS({ ...s, [k]: v }); }

  if (!loaded) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  const pkg = s.business_package ?? { name: "", amount: 0, views: 0, short: "", long_url: "", duration: "" };
  const carousel: string[] = Array.isArray(s.carousel_images) ? s.carousel_images : [];

  return (
    <div className="space-y-6">
      <Section title="Payments & referral">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="UPI ID"><input className={inputCls} value={s.upi_id ?? ""} onChange={(e) => upd("upi_id", e.target.value)} onBlur={() => save("upi_id", s.upi_id)} /></Field>
          <Field label="Referral % (first task)"><input type="number" className={inputCls} value={s.referral_percent ?? 10} onChange={(e) => upd("referral_percent", Number(e.target.value))} onBlur={() => save("referral_percent", Number(s.referral_percent))} /></Field>
          <Field label="Max active free tasks per user"><input type="number" className={inputCls} value={s.max_free_task_per_user ?? 5} onChange={(e) => upd("max_free_task_per_user", Number(e.target.value))} onBlur={() => save("max_free_task_per_user", Number(s.max_free_task_per_user))} /></Field>
        </div>
      </Section>

      <Section title="Document links (Google Docs)">
        <div className="grid gap-3">
          {(["terms_url", "about_url", "rejection_terms_url"] as const).map((k) => (
            <Field key={k} label={k}><input className={inputCls} value={s[k] ?? ""} onChange={(e) => upd(k, e.target.value)} onBlur={() => save(k, s[k])} /></Field>
          ))}
        </div>
      </Section>

      <Section title="Homepage carousel (2 images, changes every 6s)">
        {[0, 1].map((i) => (
          <Field key={i} label={`Image ${i + 1} Drive URL`}>
            <div className="flex gap-2">
              <input className={inputCls} value={carousel[i] ?? ""} onChange={(e) => {
                const c = [...carousel]; c[i] = e.target.value; upd("carousel_images", c);
              }} onBlur={() => save("carousel_images", carousel)} />
              <button
                className="btn-soft shrink-0"
                onClick={() => {
                  const c = [...carousel]; c[i] = "";
                  upd("carousel_images", c);
                  save("carousel_images", c);
                }}
              >
                Remove
              </button>
            </div>
          </Field>
        ))}
      </Section>

      <Section title="Business package (only 1 active)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Package name"><input className={inputCls} value={pkg.name} onChange={(e) => upd("business_package", { ...pkg, name: e.target.value })} /></Field>
          <Field label="Amount (₹)"><input type="number" className={inputCls} value={pkg.amount} onChange={(e) => upd("business_package", { ...pkg, amount: Number(e.target.value) })} /></Field>
          <Field label="Expected reach (views)"><input type="number" className={inputCls} value={pkg.views} onChange={(e) => upd("business_package", { ...pkg, views: Number(e.target.value) })} /></Field>
          <Field label="Campaign duration"><input className={inputCls} value={pkg.duration} onChange={(e) => upd("business_package", { ...pkg, duration: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Short description (≤100 chars)"><input maxLength={100} className={inputCls} value={pkg.short} onChange={(e) => upd("business_package", { ...pkg, short: e.target.value })} /></Field></div>
          <div className="sm:col-span-2"><Field label="Long description Google Docs URL"><input className={inputCls} value={pkg.long_url} onChange={(e) => upd("business_package", { ...pkg, long_url: e.target.value })} /></Field></div>
        </div>
        <button className="btn-premium mt-4" onClick={() => save("business_package", pkg)}>Save package</button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ModalAdmin({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={onClose}>
      <div className="glass w-full max-w-md rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>,
    document.body,
  );
}
