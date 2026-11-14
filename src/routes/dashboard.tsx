import { createPortal } from "react-dom";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { DriveMedia } from "@/components/drive-media";
import { getSession } from "@/lib/session";
import { toast } from "sonner";
import { Field, inputCls } from "./login";
import { getCommissionSalePackageName, isCommissionSalePackage } from "@/lib/commission-sale";
import { Plus, Trash2 } from "lucide-react";
import {
  BUSINESS_COUNT_CHANGED_EVENT,
  calculateBusinessMonthlyDue,
  calculateEarnerMonthlyDue,
  MAX_BUSINESSES,
  MAX_USERS,
  countRows,
} from "@/lib/limits";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Super Admin — Daily WhatsApp Challenge" },
      { name: "description", content: "Manage earner and business capacity, fees, tasks, and platform activity." },
      { property: "og:title", content: "Super Admin — Daily WhatsApp Challenge" },
      { property: "og:description", content: "Manage platform capacity and live month-end totals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const TABS = ["Users", "Tasks", "Submissions", "Businesses", "Campaigns", "Withdrawals", "Settings"] as const;
type Tab = (typeof TABS)[number];

// Silent backend cleanup: an earner account with no task taken in the last
// 3 days is deleted, together with its assignments, wallet history and
// withdrawal requests. Runs when the super admin opens the panel.
const INACTIVITY_DAYS = 3;

async function purgeInactiveUsers(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: users, error: userErr } = await supabase
      .from("app_users")
      .select("username, created_at");
    if (userErr || !users || users.length === 0) return 0;

    const { data: assigns, error: assignErr } = await supabase
      .from("task_assignments")
      .select("user_username, assigned_at");
    if (assignErr) return 0;

    const lastTakenByUser = new Map<string, string>();
    for (const a of assigns ?? []) {
      const prev = lastTakenByUser.get(a.user_username);
      if (!prev || new Date(a.assigned_at) > new Date(prev)) {
        lastTakenByUser.set(a.user_username, a.assigned_at);
      }
    }

    const toDelete: string[] = [];
    for (const u of users) {
      const lastTaken = lastTakenByUser.get(u.username);
      if (lastTaken) {
        if (new Date(lastTaken) < new Date(cutoff)) toDelete.push(u.username);
      } else {
        if (u.created_at && new Date(u.created_at) < new Date(cutoff)) toDelete.push(u.username);
      }
    }

    if (toDelete.length === 0) return 0;

    await supabase.from("task_assignments").delete().in("user_username", toDelete);
    await supabase.from("wallet_history").delete().in("user_username", toDelete);
    await supabase.from("withdrawals").delete().in("user_username", toDelete);
    const { error: delErr } = await supabase.from("app_users").delete().in("username", toDelete);
    if (delErr) return 0;

    return toDelete.length;
  } catch {
    return 0;
  }
}

function Admin() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("Users");
  const [userCount, setUserCount] = useState<number | null>(null);
  const [businessCount, setBusinessCount] = useState<number | null>(null);
  const [earnerSignupFees, setEarnerSignupFees] = useState<number | null>(null);
  const [earnerMonthlyDue, setEarnerMonthlyDue] = useState<number | null>(null);

  const refreshCounts = useCallback(async () => {
    const [u, b] = await Promise.all([
      countRows("app_users"),
      countRows("businesses"),
    ]);
    setUserCount(u);
    setBusinessCount(b);

    const [feeRes1, feeRes2, userRowsRes] = await Promise.all([
      supabase.from("earner_signup_fee_totals").select("total_amount").eq("id", true).maybeSingle(),
      supabase.from("earner_signup_fees").select("total_fees").eq("id", 1).maybeSingle(),
      supabase.from("app_users").select("*"),
    ]);

    let fee: number | null = null;
    if (!feeRes1.error && feeRes1.data?.total_amount !== undefined) {
      fee = Number(feeRes1.data.total_amount) || 0;
    } else if (!feeRes2.error && feeRes2.data?.total_fees !== undefined) {
      fee = Number(feeRes2.data.total_fees) || 0;
    }
    setEarnerSignupFees(fee);

    if (!userRowsRes.error && userRowsRes.data) {
      const taskCounts = userRowsRes.data.map((row: any) =>
        Number(row.tasks_done ?? row.tasks_completed ?? 0)
      );
      setEarnerMonthlyDue(calculateEarnerMonthlyDue(taskCounts));
    } else {
      setEarnerMonthlyDue(0);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "admin") {
      nav({ to: "/login" });
      return;
    }
    purgeInactiveUsers().then(() => refreshCounts());
    const onBizChange = () => refreshCounts();
    window.addEventListener(BUSINESS_COUNT_CHANGED_EVENT, onBizChange);
    return () => window.removeEventListener(BUSINESS_COUNT_CHANGED_EVENT, onBizChange);
  }, [nav, refreshCounts]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Super Admin</h1>
            <p className="text-sm text-muted-foreground">Manage earners, businesses, tasks, submissions and payouts.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              title="Registered earners vs maximum capacity"
            >
              Earners: {userCount === null ? "…" : `${userCount}/${MAX_USERS}`}
            </span>
            <span
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              title="Registered businesses vs maximum capacity"
            >
              Businesses: {businessCount === null ? "…" : `${businessCount}/${MAX_BUSINESSES}`}
            </span>
          </div>
        </div>

        {/* Accounting & Due Summary */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-primary/20 bg-background/40 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Signup fee (accumulated)</div>
            <div className="mt-1 font-display text-2xl font-bold text-primary">
              ₹{earnerSignupFees === null ? "—" : earnerSignupFees.toLocaleString("en-IN")}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Permanent mandate fee (₹10/signup, never decreases)</div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-background/40 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Month end due · Earners</div>
            <div className="mt-1 font-display text-2xl font-bold text-primary">
              ₹{(earnerMonthlyDue ?? 0).toLocaleString("en-IN")}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Live tiered sum: ≤2: ₹25, 3-4: ₹35, 5-10: ₹45, &gt;10: ₹50</div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-background/40 p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Month end due · Businesses</div>
            <div className="mt-1 font-display text-2xl font-bold text-primary">
              ₹{businessCount === null ? "—" : calculateBusinessMonthlyDue(businessCount).toLocaleString("en-IN")}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">Live calculation: ₹50 per currently registered business</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                tab === t ? "bg-primary text-primary-foreground font-semibold" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "Users" && <UsersTab onUsersChanged={refreshCounts} />}
          {tab === "Tasks" && <TasksTab />}
          {tab === "Submissions" && <SubmissionsTab />}
          {tab === "Businesses" && <BusinessesTab onBusinessChanged={refreshCounts} />}
          {tab === "Campaigns" && <CampaignsTab />}
          {tab === "Withdrawals" && <WithdrawalsTab />}
          {tab === "Settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

function UsersTab({ onUsersChanged }: { onUsersChanged?: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => supabase.from("app_users").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function del(u: any) {
    if (deleting) return;
    setDeleting(true);
    await supabase.from("task_assignments").delete().eq("user_username", u.username);
    await supabase.from("wallet_history").delete().eq("user_username", u.username);
    await supabase.from("withdrawals").delete().eq("user_username", u.username);
    const { error } = await supabase.from("app_users").delete().eq("username", u.username);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Deleted @${u.username}`);
      setDeleteTarget(null);
      await load();
      onUsersChanged?.();
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} registered earners</div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Name</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Wallet</th>
              <th className="p-3">Tasks</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/20">
                <td className="p-3 font-mono font-bold text-primary">@{u.username}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.phone}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</td>
                <td className="p-3 font-semibold">₹{u.wallet ?? u.wallet_balance ?? 0}</td>
                <td className="p-3">{u.tasks_done ?? u.tasks_completed ?? 0}</td>
                <td className="p-3 flex items-center gap-2">
                  <AddMoneyModal user={u} onDone={load} />
                  <button
                    onClick={() => setDeleteTarget(u)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="glass w-full max-w-md rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">Delete earner @{deleteTarget.username}?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently deletes the user account, their task assignments, wallet history, and withdrawal requests.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={() => del(deleteTarget)}
                className="rounded-full border border-destructive/50 px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddMoneyModal({ user, onDone }: { user: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState("");
  const [reason, setReason] = useState("");

  async function submit() {
    const n = Number(amt);
    if (!n || n <= 0) { toast.error("Enter a valid amount"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    const currentBal = Number(user.wallet ?? user.wallet_balance ?? 0);
    const updatePayload: Record<string, any> = {};
    if ("wallet" in user) updatePayload.wallet = currentBal + n;
    if ("wallet_balance" in user || !("wallet" in user)) updatePayload.wallet_balance = currentBal + n;
    const { error: err1 } = await supabase.from("app_users").update(updatePayload).eq("username", user.username);
    if (err1) { toast.error(err1.message); return; }
    await supabase.from("wallet_history").insert({ user_username: user.username, amount: n, type: "bonus", reason: reason.slice(0, 50) });
    toast.success(`Added ₹${n}`);
    setOpen(false);
    onDone();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20">+ Money</button>
      {open && <ModalAdmin onClose={() => setOpen(false)}>
        <h3 className="font-display text-lg font-bold">Add money to @{user.username}</h3>
        <Field label="Amount (₹)"><input type="number" className={inputCls} value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
        <Field label="Reason (max 50 chars)"><input maxLength={50} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Activity bonus" /></Field>
        <button className="btn-premium mt-4 w-full" onClick={submit}>Credit wallet</button>
      </ModalAdmin>}
    </>
  );
}

function TasksTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [type, setType] = useState<"free" | "paid">("free");
  const [f, setF] = useState({
    name: "",
    image_url: "",
    required_views: "",
    payout: "",
    unlock_amount: "",
    max_takers: "",
    commission_sale: false,
    commission_phone: "",
    commission_percent: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => supabase.from("tasks").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function add() {
    const active = rows.filter((r) => r.type === type).length;
    if (active >= 25) { toast.error(`Max 25 ${type} tasks reached. Delete one first.`); return; }
    if (f.commission_sale && (!f.commission_phone.trim() || !f.commission_percent)) {
      toast.error("Please enter both commission percentage and contact phone number.");
      return;
    }
    const { error } = await supabase.from("tasks").insert({
      type,
      name: f.name,
      image_url: f.image_url,
      required_views: Number(f.required_views),
      payout: Number(f.payout),
      unlock_amount: type === "paid" ? Number(f.unlock_amount) : 0,
      max_takers: Math.max(0, Number(f.max_takers) || 0),
      commission_sale: Boolean(f.commission_sale),
      commission_phone: f.commission_sale ? f.commission_phone.trim() : null,
      commission_percent: f.commission_sale ? Number(f.commission_percent) || 0 : null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Added");
      setF({
        name: "",
        image_url: "",
        required_views: "",
        payout: "",
        unlock_amount: "",
        max_takers: "",
        commission_sale: false,
        commission_phone: "",
        commission_percent: "",
      });
      load();
    }
  }

  async function del(t: any) {
    if (deleting) return;
    setDeleting(true);
    const { data: takes } = await supabase.from("task_assignments").select("id").eq("task_id", t.id).limit(1);
    if (takes && takes.length > 0) {
      setDeleting(false);
      toast.error("Cannot delete: users have taken this task. Delete only when all are complete and no one currently has it.");
      return;
    }
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    setDeleting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted from database");
      setDeleteTarget(null);
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="flex gap-2">
          <button onClick={() => setType("free")} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${type === "free" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Free tasks ({rows.filter((r) => r.type === "free").length}/25)</button>
          <button onClick={() => setType("paid")} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${type === "paid" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Sponsored tasks ({rows.filter((r) => r.type === "paid").length}/25)</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Task name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Status image (Google Drive link)"><input className={inputCls} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://drive.google.com/..." /></Field>
          <Field label="Required views"><input type="number" className={inputCls} value={f.required_views} onChange={(e) => setF({ ...f, required_views: e.target.value })} /></Field>
          <Field label="Payout (₹)"><input type="number" className={inputCls} value={f.payout} onChange={(e) => setF({ ...f, payout: e.target.value })} /></Field>
          {type === "paid" && <Field label="Unlock amount (₹)"><input type="number" className={inputCls} value={f.unlock_amount} onChange={(e) => setF({ ...f, unlock_amount: e.target.value })} /></Field>}
          <Field label="Max takers (0 = unlimited)"><input type="number" className={inputCls} value={f.max_takers} onChange={(e) => setF({ ...f, max_takers: e.target.value })} /></Field>
        </div>

        {/* Commission Sale Option */}
        <div className="mt-4 rounded-2xl border border-border/50 bg-background/30 p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-primary"
              checked={f.commission_sale}
              onChange={(e) => setF({ ...f, commission_sale: e.target.checked })}
            />
            <span>Commission sale option (optional)</span>
          </label>
          {f.commission_sale && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Commission percentage (%)">
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 15"
                  className={inputCls}
                  value={f.commission_percent}
                  onChange={(e) => setF({ ...f, commission_percent: e.target.value })}
                />
              </Field>
              <Field label="Business contact phone number (when sales happen)">
                <input
                  placeholder="WhatsApp / Phone number"
                  className={inputCls}
                  value={f.commission_phone}
                  onChange={(e) => setF({ ...f, commission_phone: e.target.value })}
                />
              </Field>
            </div>
          )}
        </div>

        <button className="btn-premium mt-4" onClick={add}><Plus className="h-4 w-4" /> Add task</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.filter((r) => r.type === type).map((t) => (
          <div key={t.id} className="glass flex flex-col overflow-hidden rounded-2xl">
            <DriveMedia url={t.image_url} alt={t.name} className="h-44 w-full object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{t.name}</h4>
                <button onClick={() => setDeleteTarget(t)} className="text-destructive-foreground/80"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">₹{t.payout} · {t.required_views}+ views{t.type === "paid" && ` · unlock ₹${t.unlock_amount}`}</div>

              {t.commission_sale && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                  <span>Commission Sale: {t.commission_percent}%</span>
                  {t.commission_phone && <span>· 📞 {t.commission_phone}</span>}
                </div>
              )}

              <TakenList taskId={t.id} maxTakers={t.max_takers} />
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="glass w-full max-w-md rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">Delete task "{deleteTarget.name}"?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently remove the task from the database. It can only be deleted if no users currently have it active.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={() => del(deleteTarget)}
                className="rounded-full border border-destructive/50 px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TakenList({ taskId, maxTakers }: { taskId: string; maxTakers?: number }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("task_assignments").select("user_username,whatsapp_number,status,assigned_at").eq("task_id", taskId).then(({ data }) => setList(data ?? []));
  }, [taskId]);
  const activeCount = list.filter((x) => x.status !== "rejected").length;
  const isCapped = typeof maxTakers === "number" && maxTakers > 0;
  return (
    <div className="mt-3 border-t border-border/50 pt-2 text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Taken by ({list.length}):</span>
        {isCapped && (
          <span className={`font-mono text-[11px] font-semibold ${activeCount >= maxTakers ? "text-amber-400" : "text-primary"}`}>
            {activeCount}/{maxTakers} {activeCount >= maxTakers ? "(full)" : "slots"}
          </span>
        )}
      </div>
      <div className="mt-1 max-h-24 space-y-1 overflow-y-auto">
        {list.map((x, i) => (
          <div key={i} className="flex flex-col text-muted-foreground">
            <div className="flex justify-between">
              <span className="font-mono text-foreground">@{x.user_username}</span>
              <span>{x.whatsapp_number}</span>
            </div>
            {x.assigned_at && (
              <span className="text-[10px] text-muted-foreground/80">
                Taken: {new Date(x.assigned_at).toLocaleString()}
              </span>
            )}
          </div>
        ))}
        {list.length === 0 && <span className="text-muted-foreground">No one yet</span>}
      </div>
    </div>
  );
}

function SubmissionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  const load = () => {
    supabase.from("task_assignments")
      .select("*, task:tasks(*)")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  };
  useEffect(() => { load(); }, []);

  async function approve(a: any) {
    const payout = a.task?.payout ?? 0;
    const { data: u } = await supabase.from("app_users").select("*").eq("username", a.user_username).maybeSingle();
    if (u) {
      const curWallet = Number(u.wallet ?? u.wallet_balance ?? 0);
      const curTasks = Number(u.tasks_done ?? u.tasks_completed ?? 0);
      const updatePayload: Record<string, any> = {};
      if ("wallet" in u) updatePayload.wallet = curWallet + payout;
      if ("wallet_balance" in u || !("wallet" in u)) updatePayload.wallet_balance = curWallet + payout;
      if ("tasks_done" in u) updatePayload.tasks_done = curTasks + 1;
      if ("tasks_completed" in u || !("tasks_done" in u)) updatePayload.tasks_completed = curTasks + 1;

      await supabase.from("app_users").update(updatePayload).eq("username", a.user_username);
      await supabase.from("wallet_history").insert({
        user_username: a.user_username,
        amount: payout,
        type: "task_payout",
        reason: `Completed: ${a.task?.name ?? "task"}`,
      });
    }
    await supabase.from("task_assignments").update({ status: "approved" }).eq("id", a.id);
    toast.success("Approved and credited");
    load();
  }

  async function reject(a: any, reason: string) {
    await supabase.from("task_assignments").update({ status: "rejected", reject_reason: reason }).eq("id", a.id);
    toast.success("Rejected");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} pending submissions</div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((a) => (
          <div key={a.id} className="glass rounded-2xl p-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPreviewProof(a.proof_image_url)}
                className="group relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border/50 text-left focus:outline-none focus:ring-2 focus:ring-primary"
                title="Click to view full screen"
              >
                <DriveMedia url={a.proof_image_url} alt="Proof screenshot" className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[10px] font-medium text-white backdrop-blur">
                  Click to view
                </span>
              </button>
              <div className="flex-1">
                <div className="font-semibold">{a.task?.name}</div>
                <div className="text-xs text-primary font-mono">@{a.user_username} · {a.whatsapp_number}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Views submitted: <b className="text-foreground">{a.proof_views}</b> (req: {a.task?.required_views}) · Payout: ₹{a.task?.payout}
                </div>
                {a.assigned_at && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Taken: {new Date(a.assigned_at).toLocaleString()}
                  </div>
                )}
                {a.unlock_transaction_id && <div className="text-xs text-muted-foreground">Unlock txn: {a.unlock_transaction_id}</div>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-premium text-xs" onClick={() => approve(a)}>Approve</button>
              <button className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => reject(a, "target views not reached")}>Reject: Views</button>
              <button className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => reject(a, "contact to know more")}>Reject: Contact</button>
              {a.task?.type === "paid" && (
                <button className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => reject(a, "sponsor unlock payment was not received")}>Reject: No unlock payment</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {previewProof && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"
          onClick={() => setPreviewProof(null)}
        >
          <div
            className="glass relative flex max-h-[90vh] w-full max-w-4xl flex-col items-center overflow-hidden rounded-3xl p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between pb-3">
              <h3 className="font-display text-base font-bold sm:text-lg">Submitted proof screenshot</h3>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs font-semibold hover:bg-secondary"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex max-h-[75vh] w-full items-center justify-center overflow-auto p-2">
              <DriveMedia
                url={previewProof}
                alt="Full proof screenshot"
                className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessesTab({ onBusinessChanged }: { onBusinessChanged?: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => supabase.from("businesses").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function del(b: any) {
    if (deleting) return;
    setDeleting(true);
    await supabase.from("campaigns").delete().eq("business_username", b.username);
    const { error } = await supabase.from("businesses").delete().eq("username", b.username);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Deleted @${b.username}`);
      setDeleteTarget(null);
      await load();
      onBusinessChanged?.();
      window.dispatchEvent(new CustomEvent(BUSINESS_COUNT_CHANGED_EVENT));
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} registered businesses</div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Category</th>
              <th className="p-3">Employees</th>
              <th className="p-3">Audience</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-secondary/20">
                <td className="p-3 font-mono font-bold text-primary">@{b.username}</td>
                <td className="p-3">{b.name}</td>
                <td className="p-3">{b.phone}</td>
                <td className="p-3">{b.category}</td>
                <td className="p-3">{b.employees}</td>
                <td className="p-3">{b.audience}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete business"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="glass w-full max-w-md rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">Delete business @{deleteTarget.username}?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently deletes the business account and all associated ad campaigns.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={() => del(deleteTarget)}
                className="rounded-full border border-destructive/50 px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [viewsMap, setViewsMap] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    supabase.from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  };
  useEffect(() => { load(); }, []);

  async function approve(c: any) {
    await supabase.from("campaigns").update({ status: "approved" }).eq("id", c.id);
    toast.success("Campaign approved");
    load();
  }

  async function reject(c: any) {
    await supabase.from("campaigns").update({ status: "rejected" }).eq("id", c.id);
    toast.success("Campaign rejected");
    load();
  }

  async function updateViews(c: any) {
    const v = Number(viewsMap[c.id] ?? c.current_views ?? 0);
    if (isNaN(v) || v < 0) {
      toast.error("Enter a valid view number");
      return;
    }
    const { error } = await supabase.from("campaigns").update({ current_views: v }).eq("id", c.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Updated views to ${v}`);
      load();
    }
  }

  async function del(c: any) {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Campaign deleted");
      setDeleteTarget(null);
      load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} total campaigns</div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="glass rounded-2xl p-4">
            <div className="flex gap-4">
              <DriveMedia url={c.image_url} alt="Campaign ad" className="h-28 w-28 rounded-xl object-cover" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{c.package_name ?? "Campaign"}</div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    c.status === "approved" ? "bg-primary/20 text-primary" : c.status === "rejected" ? "bg-destructive/20 text-destructive-foreground" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-primary font-mono">@{c.business_username}</div>
                <div className="text-xs text-muted-foreground">Txn: <span className="font-mono">{c.transaction_id}</span></div>
                <div className="text-xs text-muted-foreground">Reach: {c.expected_reach} views · Duration: {c.duration_days} days</div>

                {isCommissionSalePackage(c.package_name) && (
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    <span>✨ {getCommissionSalePackageName()} selected</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border/60 bg-secondary/30 p-2.5">
              <div className="text-xs font-medium text-muted-foreground">Update views shown to business:</div>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  placeholder={`Current: ${c.current_views ?? 0}`}
                  value={viewsMap[c.id] ?? ""}
                  onChange={(e) => setViewsMap({ ...viewsMap, [c.id]: e.target.value })}
                />
                <button
                  onClick={() => updateViews(c)}
                  className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/30"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-2">
                {c.status === "pending" && (
                  <>
                    <button className="btn-premium text-xs" onClick={() => approve(c)}>Approve</button>
                    <button className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => reject(c)}>Reject</button>
                  </>
                )}
              </div>
              <button
                onClick={() => setDeleteTarget(c)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Delete campaign
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="glass w-full max-w-md rounded-3xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">Delete campaign?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently remove this campaign and its ad poster from the database.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={() => del(deleteTarget)}
                className="rounded-full border border-destructive/50 px-4 py-2 text-sm text-destructive-foreground disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WithdrawalsTab() {
  const [rows, setRows] = useState<any[]>([]);

  const load = () => supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function markDone(w: any) {
    await supabase.from("withdrawals").update({ status: "done" }).eq("id", w.id);
    toast.success("Marked as done");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} withdrawal requests</div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Details</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((w) => (
              <tr key={w.id} className="hover:bg-secondary/20">
                <td className="p-3 font-mono font-bold text-primary">@{w.user_username}</td>
                <td className="p-3 font-semibold">₹{w.amount}</td>
                <td className="p-3 uppercase text-xs">{w.method}</td>
                <td className="p-3 text-xs">{w.details}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    w.status === "done" ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {w.status}
                  </span>
                </td>
                <td className="p-3">
                  {w.status === "pending" && (
                    <button className="btn-premium text-xs" onClick={() => markDone(w)}>Done</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase.from("settings").select("*").then(({ data }) => {
      const map: Record<string, any> = {};
      data?.forEach((r) => { map[r.key] = r.value; });
      setS(map);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  async function save(key: string, value: any) {
    const { error } = await supabase.from("settings").upsert({ key, value });
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  function upd(key: string, val: any) {
    setS((prev) => ({ ...prev, [key]: val }));
  }

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading settings…</div>;

  const rawPackages: any[] = Array.isArray(s.business_packages)
    ? s.business_packages
    : s.business_package
    ? [s.business_package]
    : [];

  const packages: any[] = rawPackages.slice(0, 6);
  while (packages.length < 3) {
    packages.push({
      name: `Package ${packages.length + 1}`,
      amount: 0,
      reach: 0,
      duration: 30,
      short_desc: "",
      long_desc_url: "",
    });
  }

  function updatePackage(idx: number, patch: Partial<any>) {
    const next = packages.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    upd("business_packages", next);
  }

  function addPackageSlot() {
    if (packages.length >= 6) {
      toast.error("Maximum 6 business packages allowed");
      return;
    }
    const next = [
      ...packages,
      {
        name: `Package ${packages.length + 1}`,
        amount: 0,
        reach: 0,
        duration: 30,
        short_desc: "",
        long_desc_url: "",
      },
    ];
    upd("business_packages", next);
  }

  function removePackageSlot(idx: number) {
    if (packages.length <= 1) {
      toast.error("At least one package is required");
      return;
    }
    const next = packages.filter((_, i) => i !== idx);
    upd("business_packages", next);
  }

  async function saveAllPackages() {
    await save("business_packages", packages);
    if (packages[0]) await save("business_package", packages[0]);
  }

  return (
    <div className="space-y-6">
      <Section title="Payment QR & UPI ID">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Platform UPI ID (generates payment QR codes)"><input className={inputCls} value={s.upi_id ?? ""} onChange={(e) => upd("upi_id", e.target.value)} /></Field>
          <button className="btn-premium" onClick={() => save("upi_id", s.upi_id)}>Save UPI</button>
        </div>
      </Section>

      <Section title="Task Limits & Referrals">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Field label="Max free tasks per earner every 24 hours">
              <input type="number" min={1} className={inputCls} value={s.free_tasks_per_24h ?? 2} onChange={(e) => upd("free_tasks_per_24h", Number(e.target.value) || 1)} />
            </Field>
            <p className="text-[11px] text-muted-foreground">Rolling 24-hour window; sponsored tasks are not restricted by this limit.</p>
            <button className="btn-premium" onClick={() => save("free_tasks_per_24h", Number(s.free_tasks_per_24h) || 2)}>Save limit</button>
          </div>

          <div className="space-y-2">
            <Field label="First-task referral reward (%)">
              <input type="number" className={inputCls} value={s.referral_percent ?? 10} onChange={(e) => upd("referral_percent", Number(e.target.value))} />
            </Field>
            <p className="text-[11px] text-muted-foreground">Credited to referrer on the new earner's first completed task only.</p>
            <button className="btn-premium" onClick={() => save("referral_percent", Number(s.referral_percent))}>Save referral %</button>
          </div>
        </div>
      </Section>

      <Section title="Homepage Carousel Images (2 images)">
        <p className="text-xs text-muted-foreground">Provide Google Drive links for the 6-second alternating carousel on the homepage.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Carousel image 1 (Google Drive link)"><input className={inputCls} value={s.carousel_image_1 ?? ""} onChange={(e) => upd("carousel_image_1", e.target.value)} /></Field>
          <Field label="Carousel image 2 (Google Drive link)"><input className={inputCls} value={s.carousel_image_2 ?? ""} onChange={(e) => upd("carousel_image_2", e.target.value)} /></Field>
        </div>
        <button className="btn-premium mt-3" onClick={async () => { await save("carousel_image_1", s.carousel_image_1); await save("carousel_image_2", s.carousel_image_2); }}>Save carousel images</button>
      </Section>

      <Section title="Links & Policy URLs">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="T&Cs Google Docs URL"><input className={inputCls} value={s.terms_url ?? ""} onChange={(e) => upd("terms_url", e.target.value)} /></Field>
          <Field label="About Platform URL"><input className={inputCls} value={s.about_url ?? ""} onChange={(e) => upd("about_url", e.target.value)} /></Field>
          <Field label="Rejection Terms URL"><input className={inputCls} value={s.rejection_terms_url ?? ""} onChange={(e) => upd("rejection_terms_url", e.target.value)} /></Field>
        </div>
        <button className="btn-premium mt-3" onClick={async () => { await save("terms_url", s.terms_url); await save("about_url", s.about_url); await save("rejection_terms_url", s.rejection_terms_url); }}>Save URLs</button>
      </Section>

      <Section title={`Business Packages (${packages.length} active, up to 6)`}>
        <p className="text-xs text-muted-foreground">Configure the advertising packages offered to businesses in their portal.</p>
        <div className="mt-4 space-y-6">
          {packages.map((pkg, idx) => (
            <div key={idx} className="rounded-2xl border border-border/80 bg-secondary/20 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Package #{idx + 1}</span>
                {packages.length > 1 && (
                  <button onClick={() => removePackageSlot(idx)} className="text-xs text-destructive-foreground hover:underline">Remove</button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Package name"><input className={inputCls} value={pkg.name ?? ""} onChange={(e) => updatePackage(idx, { name: e.target.value })} /></Field>
                <Field label="Amount (₹)"><input type="number" className={inputCls} value={pkg.amount ?? 0} onChange={(e) => updatePackage(idx, { amount: Number(e.target.value) })} /></Field>
                <Field label="Expected reach (views)"><input type="number" className={inputCls} value={pkg.reach ?? 0} onChange={(e) => updatePackage(idx, { reach: Number(e.target.value) })} /></Field>
                <Field label="Duration (days)"><input type="number" className={inputCls} value={pkg.duration ?? 30} onChange={(e) => updatePackage(idx, { duration: Number(e.target.value) })} /></Field>
                <Field label="Short description (<100 chars)"><input maxLength={100} className={inputCls} value={pkg.short_desc ?? ""} onChange={(e) => updatePackage(idx, { short_desc: e.target.value })} /></Field>
                <Field label="Long description (Google Docs URL)"><input className={inputCls} value={pkg.long_desc_url ?? ""} onChange={(e) => updatePackage(idx, { long_desc_url: e.target.value })} /></Field>
              </div>

              <div className="mt-3 border-t border-border/40 pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-primary"
                    checked={Boolean(pkg.allows_commission_sale)}
                    onChange={(e) => updatePackage(idx, { allows_commission_sale: e.target.checked })}
                  />
                  <span>Allow Commission Sale add-on with this package (at seller-set price)</span>
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-premium" onClick={saveAllPackages}>Save all packages</button>
          {packages.length < 6 && (
            <button className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold" onClick={addPackageSlot}>+ Add package slot</button>
          )}
        </div>
      </Section>

      <Section title="Commission Sale Add-On (Business)">
        <p className="text-xs text-muted-foreground">
          Sellers can optionally offer this add-on to businesses at checkout. Status earners receive an option to help sell the product for a commission, and contact details are routed via WhatsApp.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Add-on price (₹)">
            <input type="number" min={0} className={inputCls} value={s.commission_sale_price ?? 0} onChange={(e) => upd("commission_sale_price", Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <button className="btn-premium" onClick={() => save("commission_sale_price", Math.max(0, Number(s.commission_sale_price) || 0))}>Save add-on price</button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Businesses can add Commission Sale only to packages marked above.</p>
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

