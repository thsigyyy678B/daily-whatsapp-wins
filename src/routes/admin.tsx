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

    const [feeRes, usersWithTasksRes] = await Promise.all([
      supabase.from("earner_signup_fees").select("total_fees").eq("id", 1).maybeSingle(),
      supabase.from("app_users").select("tasks_completed"),
    ]);

    if (!feeRes.error && feeRes.data?.total_fees !== undefined) {
      setEarnerSignupFees(Number(feeRes.data.total_fees) || 0);
    } else {
      setEarnerSignupFees(null);
    }

    if (!usersWithTasksRes.error && usersWithTasksRes.data) {
      const due = calculateEarnerMonthlyDue(usersWithTasksRes.data.map((row) => ({ tasks_completed: row.tasks_completed })));
      setEarnerMonthlyDue(due);
    } else {
      setEarnerMonthlyDue(null);
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
              ₹{earnerMonthlyDue === null ? "—" : earnerMonthlyDue.toLocaleString("en-IN")}
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
                <td className="p-3 font-semibold">₹{u.wallet_balance}</td>
                <td className="p-3">{u.tasks_completed}</td>
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
    const { error: err1 } = await supabase.from("app_users").update({ wallet_balance: Number(user.wallet_balance) + n }).eq("username", user.username);
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
        <Field label="Reason (max 50)"><input maxLength={50} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <button className="btn-premium mt-4 w-full" onClick={submit}>Credit</button>
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
      toast.error("Please enter both commission amount and contact phone number.");
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

    const { data: taken, error: takenError } = await supabase
      .from("task_assignments")
      .select("id")
      .eq("task_id", t.id)
      .in("status", ["assigned", "submitted"])
      .limit(1);

    if (takenError) {
      toast.error(`Could not check task assignments: ${takenError.message}`);
      return;
    }

    if (taken && taken.length > 0) {
      toast.error("Cannot delete — task currently taken by a user.");
      return;
    }

    setDeleting(true);

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", t.id)
      .select("id");

    setDeleting(false);

    if (error) {
      console.error("Task deletion failed:", error);
      toast.error(`Delete failed: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      toast.error("No task was deleted. Please refresh and try again.");
      await load();
      return;
    }

    toast.success("Task deleted successfully");
    setDeleteTarget(null);
    await load();
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
        {rows.map((t) => (
          <div key={t.id} className="glass overflow-hidden rounded-2xl">
            <DriveMedia url={t.image_url} alt={t.name} className="aspect-video w-full object-cover" />
            <div className="p-4">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs uppercase text-primary">{t.type}</div>
                  <div className="font-semibold">{t.name}</div>
                </div>
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
            <h3 className="font-display text-lg font-bold">
              Delete task?
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              This permanently deletes the task "{deleteTarget.name}". This action
              cannot be undone.
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
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("task_assignments")
      .select("user_username,whatsapp_number,status,assigned_at")
      .eq("task_id", taskId)
      .then(({ data }) => setRows(data ?? []));
  }, [taskId]);
  const active = rows.filter((r) => r.status === "assigned" || r.status === "submitted").length;
  const limited = (maxTakers ?? 0) > 0;
  if (rows.length === 0)
    return <div className="mt-3 text-xs text-muted-foreground">{limited ? `0/${maxTakers} taken` : "No takers."}</div>;
  return (
    <div className="mt-3">
      <div className="text-xs uppercase text-muted-foreground">{limited ? `Taken by · ${active}/${maxTakers}` : "Taken by"}</div>
      <ul className="mt-1 space-y-1 text-xs">
        {rows.map((r, i) => (
          <li key={i} className="text-primary">
            @{r.user_username} · {r.whatsapp_number} · {r.status}
            {r.assigned_at && (
              <span className="text-muted-foreground">
                {" "}· Taken: {new Date(r.assigned_at).toLocaleString()}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmissionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("task_assignments")
      .select("*, task:tasks(*)")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  async function approve(a: any) {
    const payout = a.task?.payout ?? 0;
    const { data: u } = await supabase.from("app_users").select("wallet_balance,tasks_completed").eq("username", a.user_username).single();
    if (u) {
      await supabase.from("app_users").update({
        wallet_balance: Number(u.wallet_balance) + payout,
        tasks_completed: Number(u.tasks_completed) + 1,
      }).eq("username", a.user_username);
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
            <div className="flex max-h-[75vh] w-full items-center justify-center overflow-auto rounded-2xl bg-black/40 p-2">
              <DriveMedia
                url={previewProof}
                alt="Submitted proof full view"
                className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
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
      toast.success(`Deleted business @${b.username}`);
      setDeleteTarget(null);
      await load();
      window.dispatchEvent(new Event(BUSINESS_COUNT_CHANGED_EVENT));
      onBusinessChanged?.();
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} businesses registered</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((b) => (
          <div key={b.id} className="glass rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="font-semibold">{b.name}</div>
                <button
                  onClick={() => setDeleteTarget(b)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Delete business"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs font-mono text-primary">@{b.username} · {b.phone}</div>
              <div className="mt-2 text-xs text-muted-foreground">Category: {b.category} · {b.employees} employees</div>
              <div className="text-xs text-muted-foreground">Target: {b.target_audience}</div>
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground">Joined: {new Date(b.created_at).toLocaleDateString()}</div>
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
            <h3 className="font-display text-lg font-bold">Delete business @{deleteTarget.username}?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This permanently deletes "{deleteTarget.name}" and all campaigns created under this business account.
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
  const [viewsInput, setViewsInput] = useState<Record<string, string>>({});
  const [savingViews, setSavingViews] = useState<string | null>(null);

  const load = () => supabase.from("campaigns").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function setStatus(c: any, status: string) {
    await supabase.from("campaigns").update({ status }).eq("id", c.id);
    toast.success(`Marked as ${status}`);
    load();
  }

  async function updateViews(c: any) {
    const raw = viewsInput[c.id];
    const val = Math.max(0, Number(raw) || 0);
    setSavingViews(c.id);
    const { error } = await supabase.from("campaigns").update({ views: val }).eq("id", c.id);
    setSavingViews(null);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
    } else {
      toast.success(`Views updated to ${val}`);
      load();
    }
  }

  async function del(c: any) {
    if (!confirm(`Delete campaign "${c.package_name ?? "Campaign"}"?`)) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Campaign deleted");
      load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} campaigns</div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="glass overflow-hidden rounded-2xl">
            <DriveMedia url={c.image_url} alt="Campaign ad" className="aspect-video w-full object-cover" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{getCommissionSalePackageName(c.package_name ?? "Campaign")}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-primary">{c.status}</span>
                  <button onClick={() => del(c)} className="text-destructive-foreground/80 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {isCommissionSalePackage(c.package_name) && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  Commission Sale Add-on
                </div>
              )}
              <div className="text-xs font-mono text-muted-foreground">@{c.business_username} · ₹{c.amount} · Txn: {c.transaction_id}</div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/30 p-2">
                <span className="text-xs text-muted-foreground">Views reached:</span>
                <input
                  type="number"
                  min={0}
                  className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  placeholder={String(c.views ?? 0)}
                  value={viewsInput[c.id] ?? String(c.views ?? 0)}
                  onChange={(e) => setViewsInput({ ...viewsInput, [c.id]: e.target.value })}
                />
                <button
                  disabled={savingViews === c.id}
                  onClick={() => updateViews(c)}
                  className="rounded-lg bg-primary/20 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/30 disabled:opacity-50"
                >
                  {savingViews === c.id ? "Saving…" : "Update"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-premium text-xs" onClick={() => setStatus(c, "approved")}>Approve</button>
                <button className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => setStatus(c, "rejected")}>Reject</button>
                <button className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => setStatus(c, "running")}>Mark Running</button>
                <button className="rounded-full bg-secondary px-3 py-1 text-xs" onClick={() => setStatus(c, "completed")}>Mark Completed</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WithdrawalsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  async function done(w: any) {
    await supabase.from("withdrawals").update({ status: "withdrawn", processed_at: new Date().toISOString() }).eq("id", w.id);
    await supabase.from("wallet_history").insert({
      user_username: w.user_username,
      amount: -Number(w.amount),
      type: "withdrawal",
      reason: `Payout completed via ${w.method}`,
    });
    toast.success("Marked as withdrawn");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">{rows.length} requests</div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((w) => (
          <div key={w.id} className="glass rounded-2xl p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-display text-xl font-bold">₹{w.amount}</div>
                <div className="text-xs font-mono text-primary">@{w.user_username}</div>
              </div>
              <span className={`text-xs uppercase font-semibold ${w.status === "withdrawn" ? "text-primary" : "text-amber-400"}`}>{w.status}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Method: <b className="text-foreground">{w.method.toUpperCase()}</b></div>
            {w.method === "upi" && <div className="text-xs text-muted-foreground">UPI ID: {w.details?.upi_id}</div>}
            {w.method === "bank" && <div className="text-xs text-muted-foreground">A/C: {w.details?.account_number} · IFSC: {w.details?.ifsc}</div>}
            {w.method === "coupon" && <div className="text-xs text-muted-foreground">Coupon 2x · WhatsApp: {w.details?.whatsapp} (Value: ₹{w.details?.coupon_value})</div>}
            <div className="mt-1 text-[11px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
            {w.status === "waiting" && (
              <button className="btn-premium mt-3 text-xs" onClick={() => done(w)}>Mark as done (Withdrawn)</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

type Pkg = { name?: string; amount?: number; views?: number; duration?: string; short?: string; long_url?: string; commission_sale_eligible?: boolean };

function emptyPkg(): Pkg {
  return { name: "", amount: 0, views: 0, duration: "", short: "", long_url: "", commission_sale_eligible: false };
}

function SettingsTab() {
  const [s, setS] = useState<Record<string, any>>({});
  const [pkgs, setPkgs] = useState<Pkg[]>(Array.from({ length: 6 }, () => emptyPkg()));

  const load = async () => {
    const { data } = await supabase.from("settings").select("*");
    const m: Record<string, any> = {};
    (data ?? []).forEach((r) => { m[r.key] = r.value; });
    setS(m);

    let parsed: Pkg[] = [];
    if (m.business_packages) {
      try {
        const raw = typeof m.business_packages === "string" ? JSON.parse(m.business_packages) : m.business_packages;
        if (Array.isArray(raw)) parsed = raw;
      } catch {
        parsed = [];
      }
    } else if (m.business_package) {
      try {
        const single = typeof m.business_package === "string" ? JSON.parse(m.business_package) : m.business_package;
        if (single && typeof single === "object") parsed = [single];
      } catch {
        parsed = [];
      }
    }

    const filled: Pkg[] = Array.from({ length: 6 }, (_, i) => ({ ...emptyPkg(), ...(parsed[i] ?? {}) }));
    setPkgs(filled);
  };
  useEffect(() => { load(); }, []);

  const upd = (k: string, v: any) => setS((prev) => ({ ...prev, [k]: v }));

  async function save(k: string, v: any) {
    const { error } = await supabase.from("settings").upsert({ key: k, value: v }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else { toast.success("Saved"); load(); }
  }

  return (
    <div className="space-y-6">
      <Section title="Payment details">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Single UPI ID (used for QR code generation)"><input className={inputCls} value={s.upi_id ?? ""} onChange={(e) => upd("upi_id", e.target.value)} /></Field>
          <button className="btn-premium" onClick={() => save("upi_id", s.upi_id)}>Save UPI</button>
        </div>
      </Section>

      <Section title="Homepage image carousel (Google Drive links, max 2)">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Slide 1 Drive URL"><input className={inputCls} value={s.carousel_image_1 ?? ""} onChange={(e) => upd("carousel_image_1", e.target.value)} /></Field>
            <div className="flex gap-2">
              <button className="btn-premium" onClick={() => save("carousel_image_1", s.carousel_image_1)}>Save</button>
              {s.carousel_image_1 && (
                <button className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary" onClick={() => { upd("carousel_image_1", ""); save("carousel_image_1", ""); }}>Remove</button>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Slide 2 Drive URL"><input className={inputCls} value={s.carousel_image_2 ?? ""} onChange={(e) => upd("carousel_image_2", e.target.value)} /></Field>
            <div className="flex gap-2">
              <button className="btn-premium" onClick={() => save("carousel_image_2", s.carousel_image_2)}>Save</button>
              {s.carousel_image_2 && (
                <button className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary" onClick={() => { upd("carousel_image_2", ""); save("carousel_image_2", ""); }}>Remove</button>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Terms & About links (Google Docs)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="T&Cs Google Docs URL"><input className={inputCls} value={s.terms_url ?? ""} onChange={(e) => upd("terms_url", e.target.value)} /></Field>
          <Field label="About platform Google Docs URL"><input className={inputCls} value={s.about_url ?? ""} onChange={(e) => upd("about_url", e.target.value)} /></Field>
          <Field label="Campaign rejection terms Google Docs URL"><input className={inputCls} value={s.rejection_terms_url ?? ""} onChange={(e) => upd("rejection_terms_url", e.target.value)} /></Field>
        </div>
        <button className="btn-premium mt-4" onClick={() => { save("terms_url", s.terms_url); save("about_url", s.about_url); save("rejection_terms_url", s.rejection_terms_url); }}>Save URLs</button>
      </Section>

      <Section title="Referral program">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="First task referral reward (%)"><input type="number" className={inputCls} value={s.referral_percent ?? 10} onChange={(e) => upd("referral_percent", Number(e.target.value))} /></Field>
          <button className="btn-premium" onClick={() => save("referral_percent", Number(s.referral_percent))}>Save referral %</button>
        </div>
      </Section>

      <Section title="Limits">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Max free tasks per earner in rolling 24 hours">
            <input type="number" min={1} className={inputCls} value={s.free_tasks_per_24h ?? 2} onChange={(e) => upd("free_tasks_per_24h", Math.max(1, Number(e.target.value) || 1))} />
          </Field>
          <button className="btn-premium" onClick={() => save("free_tasks_per_24h", Math.max(1, Number(s.free_tasks_per_24h) || 1))}>Save limit</button>
        </div>
      </Section>

      <Section title="Business packages (up to 6)">
        <div className="space-y-4">
          {pkgs.map((p, i) => (
            <div key={i} className="rounded-2xl border border-border bg-black/30 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-primary">Package {i + 1}{p.name ? ` · ${p.name}` : " · empty"}</div>
                {p.name && (
                  <button className="text-xs text-destructive-foreground/80 hover:underline" onClick={() => { const n = [...pkgs]; n[i] = emptyPkg(); setPkgs(n); save("business_packages", n); }}>Clear</button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Package name"><input className={inputCls} value={p.name ?? ""} onChange={(e) => { const n = [...pkgs]; n[i] = { ...p, name: e.target.value }; setPkgs(n); }} /></Field>
                <Field label="Amount (₹)"><input type="number" className={inputCls} value={p.amount ?? 0} onChange={(e) => { const n = [...pkgs]; n[i] = { ...p, amount: Number(e.target.value) }; setPkgs(n); }} /></Field>
                <Field label="Expected reach (views)"><input type="number" className={inputCls} value={p.views ?? 0} onChange={(e) => { const n = [...pkgs]; n[i] = { ...p, views: Number(e.target.value) }; setPkgs(n); }} /></Field>
                <Field label="Campaign duration"><input className={inputCls} value={p.duration ?? ""} onChange={(e) => { const n = [...pkgs]; n[i] = { ...p, duration: e.target.value }; setPkgs(n); }} /></Field>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={p.commission_sale_eligible ?? false} onChange={(e) => { const n = [...pkgs]; n[i] = { ...p, commission_sale_eligible: e.target.checked }; setPkgs(n); }} />
                  Allow Commission Sale add-on
                </label>
                <div className="sm:col-span-2"><Field label="Short description (≤100 chars)"><input maxLength={100} className={inputCls} value={p.short ?? ""} onChange={(e) => { const n = [...pkgs]; n[i] = { ...p, short: e.target.value }; setPkgs(n); }} /></Field></div>
                <div className="sm:col-span-2"><Field label="Long description Google Docs URL"><input className={inputCls} value={p.long_url ?? ""} onChange={(e) => { const n = [...pkgs]; n[i] = { ...p, long_url: e.target.value }; setPkgs(n); }} /></Field></div>
              </div>
              <button className="btn-premium mt-4" onClick={() => save("business_packages", pkgs)}>Save package {i + 1}</button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Fill at least the package name to make a package visible to businesses. Each Save button saves all 6 slots.</p>
      </Section>

      <Section title="Commission Sale add-on">
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

