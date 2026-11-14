import { createPortal } from "react-dom";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { toast } from "sonner";
import { Field, inputCls } from "./login";
import { Download, Eye, Lock, Wallet, MessageCircle } from "lucide-react";
import { DriveMedia } from "@/components/drive-media";
import { driveToDownload } from "@/lib/supabase";
import { isCommissionSalePackage } from "@/lib/commission-sale";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Daily WhatsApp Challenge" },
      { name: "description", content: "Your tasks and wallet." }
    ]
  }),
  component: Dashboard,
});

type Task = {
  id: string;
  type: "free" | "paid";
  name: string;
  image_url: string;
  required_views: number;
  payout: number;
  unlock_amount: number;
  max_takers: number;
  commission_sale?: boolean;
  commission_phone?: string | null;
  commission_percent?: number | null;
};

type Assign = {
  id: string;
  task_id: string;
  status: string;
  whatsapp_number: string;
  assigned_at: string;
  task?: Task;
};

type CommissionListing = {
  id: string;
  business_username: string;
  image_url: string;
  package_name: string;
  product_name: string | null;
  product_description: string | null;
  seller_commission: number;
  commission_sale_enabled: boolean;
  status: string;
  business?: {
    name: string;
    phone: string;
  };
};

function Dashboard() {
  const nav = useNavigate();

  const [me, setMe] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState<Assign[]>([]);
  const [maxFree, setMaxFree] = useState(2);
  const [upi, setUpi] = useState("");
  const [takers, setTakers] = useState<Record<string, number>>({});

  const [commissionListings, setCommissionListings] =
    useState<CommissionListing[]>([]);

  const load = useCallback(async () => {
    const s = getSession();

    if (!s || s.role !== "user") {
      nav({ to: "/login" });
      return;
    }

    const { data: u } = await supabase
      .from("app_users")
      .select("*")
      .eq("username", s.username)
      .maybeSingle();

    setMe(u);

    const { data: t } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    setTasks(t || []);

    const { data: a } = await supabase
      .from("assignments")
      .select("*, task:tasks(*)")
      .eq("user_username", s.username)
      .order("assigned_at", { ascending: false });

    setMine(a || []);

    const { data: counts } = await supabase
      .from("assignments")
      .select("task_id")
      .in("status", ["assigned", "submitted", "approved"]);

    const map: Record<string, number> = {};

    (counts || []).forEach((row: any) => {
      map[row.task_id] = (map[row.task_id] || 0) + 1;
    });

    setTakers(map);

    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settings) {
      setMaxFree(Number(settings.max_free_tasks) || 2);
      setUpi(settings.upi_id || "");
    }

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select(`
        id,
        business_username,
        image_url,
        package_name,
        product_name,
        product_description,
        seller_commission,
        commission_sale_enabled,
        status,
        business:business_users (
          name,
          phone
        )
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    const eligible = (campaigns || []).filter((c: any) => {
      return (
        c.commission_sale_enabled === true ||
        isCommissionSalePackage(c.package_name)
      );
    });

    setCommissionListings(eligible as CommissionListing[]);
  }, [nav]);

  useEffect(() => {
    load();
  }, [load]);

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const freeTakenLast24h = mine.filter(
    (a) => a.task?.type === "free" && a.assigned_at >= since24h
  ).length;

  const freeLimitReached = freeTakenLast24h >= maxFree;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">

        {/* Top bar with wallet balance and link to dedicated wallet page */}
        <div className="glass mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Welcome back
            </div>
            <div className="text-xl font-bold">{me?.name || me?.username}</div>
            <div className="text-xs text-muted-foreground">
              User ID: <span className="font-mono text-primary">{me?.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Wallet balance</div>
              <div className="text-2xl font-black text-primary">
                ₹{me?.wallet ?? 0}
              </div>
            </div>

            <Link
              to="/wallet"
              className="btn-premium flex items-center gap-2 text-sm"
            >
              <Wallet className="h-4 w-4" />
              Open Wallet
            </Link>
          </div>
        </div>

        {/* Rolling 24-hour limit status banner */}
        <div className="mb-6 rounded-2xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
          Free tasks taken in last 24 hours:{" "}
          <span className="font-semibold text-foreground">
            {freeTakenLast24h} / {maxFree}
          </span>
          {freeLimitReached && (
            <span className="ml-2 font-semibold text-amber-400">
              (24h free limit reached — wait for slots to clear or take sponsored tasks)
            </span>
          )}
        </div>

        {/* MY ACTIVE / RECENT TASKS */}
        {mine.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-bold">My Tasks</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {mine.map((a) => (
                <div key={a.id} className="glass rounded-3xl p-5">
                  <div className="flex items-start gap-4">
                    <DriveMedia
                      src={a.task?.image_url}
                      className="h-20 w-20 rounded-xl object-cover"
                    />

                    <div className="flex-1">
                      <div className="font-semibold">{a.task?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Views required: {a.task?.required_views} · Payout: ₹{a.task?.payout}
                      </div>
                      <div className="mt-2 text-xs">
                        Status:{" "}
                        <span className="font-semibold text-primary">
                          {a.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {a.status === "assigned" && (
                    <SubmitProof assign={a} onDone={load} />
                  )}

                  <a
                    href={driveToDownload(a.task?.image_url || "")}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost-emerald mt-3 w-full text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Status Media
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* COMMISSION SALE SECTION */}
        <section className="mb-10">
          <SectionTitle
            title="Commission Sale"
            subtitle="Promote business products and earn commission on every sale"
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {commissionListings.map((listing) => (
              <CommissionSaleCard key={listing.id} listing={listing} />
            ))}
          </div>

          {commissionListings.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">
              No commission products available right now. Check back soon.
            </div>
          )}
        </section>

        {/* AVAILABLE TASKS */}
        <section>
          <SectionTitle
            title="Available Tasks"
            subtitle="Put to WhatsApp status, verify views, get paid"
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                myAssigns={mine}
                freeLimitReached={freeLimitReached}
                upi={upi}
                takenCount={takers[t.id] || 0}
                onDone={load}
              />
            ))}
          </div>

          {tasks.length === 0 && (
            <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
              No tasks available right now. Check back soon.
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function CommissionSaleCard({
  listing,
}: {
  listing: CommissionListing;
}) {
  const [open, setOpen] = useState(false);

  const phone = (listing.business?.phone || "").trim();
  const rawNumber = phone.replace(/[^0-9]/g, "");

  const title =
    listing.product_name?.trim() ||
    listing.package_name ||
    "Promote Business Product";

  const desc =
    listing.product_description?.trim() ||
    "Earn direct commission for every customer who buys this product through your WhatsApp promotion.";

  const commission = Number(listing.seller_commission ?? 0);

  const whatsappMessage = encodeURIComponent(
    `Hi ${listing.business?.name || "Business"}, I saw your commission sale campaign "${title}" on Daily WhatsApp Challenge. I want to sell this product and earn commission. Please share details and my sales link.`
  );

  return (
    <>
      <div className="glass flex flex-col justify-between rounded-3xl p-5">
        <div>
          <DriveMedia
            src={listing.image_url}
            className="h-36 w-full rounded-2xl object-cover"
          />

          <div className="mt-3 font-semibold">{title}</div>

          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {desc}
          </p>

          <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <div className="text-[11px] text-muted-foreground">
              Your commission per completed sale
            </div>

            <div className="text-xl font-bold text-primary">
              ₹{commission.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="btn-ghost-emerald flex-1 text-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>

          <a
            href={driveToDownload(listing.image_url)}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost-emerald flex-1 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Media
          </a>
        </div>
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">{title}</h3>

            <DriveMedia
              src={listing.image_url}
              className="max-h-72 w-full rounded-2xl object-contain"
            />

            <p className="text-xs text-muted-foreground">{desc}</p>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground">Commission</div>
              <div className="text-2xl font-bold text-primary">
                ₹{commission.toLocaleString("en-IN")}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/40 p-3 text-xs text-muted-foreground">
              Contact the business directly. Sales and commission payments are handled manually.
            </div>

            {rawNumber ? (
              <a
                href={`https://wa.me/${rawNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
                className="btn-premium flex w-full items-center justify-center gap-2 text-xs"
              >
                <MessageCircle className="h-4 w-4" />
                Contact Business on WhatsApp
              </a>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                No phone number provided by business.
              </p>
            )}

            <button
              onClick={() => setOpen(false)}
              className="btn-ghost-emerald w-full text-xs"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function TaskCard({
  task,
  myAssigns,
  freeLimitReached,
  upi,
  takenCount,
  onDone,
}: {
  task: Task;
  myAssigns: Assign[];
  freeLimitReached: boolean;
  upi: string;
  takenCount: number;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [txId, setTxId] = useState("");
  const [loading, setLoading] = useState(false);

  const assign = myAssigns.find((a) => a.task_id === task.id);
  const hasCapacity = (task.max_takers || 0) > 0;
  const full = hasCapacity && takenCount >= task.max_takers;

  async function take() {
    if (!phone.trim()) {
      toast.error("Enter your WhatsApp number");
      return;
    }

    if (task.type === "paid" && !txId.trim()) {
      toast.error("Enter payment transaction ID");
      return;
    }

    setLoading(true);

    const s = getSession();

    const { error } = await supabase.from("assignments").insert({
      user_username: s?.username,
      task_id: task.id,
      whatsapp_number: phone.trim(),
      sponsor_tx_id: task.type === "paid" ? txId.trim() : null,
      status: "assigned",
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Task assigned! Post to WhatsApp status now.");
      setOpen(false);
      onDone();
    }
  }

  const qrUrl = upi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        `upi://pay?pa=${upi}&pn=DailyChallenge&am=${task.unlock_amount}&cu=INR`
      )}`
    : "";

  return (
    <>
      <div className="glass flex flex-col justify-between rounded-3xl p-5">
        <div>
          <div className="relative">
            <DriveMedia
              src={task.image_url}
              className="h-44 w-full rounded-2xl object-cover"
            />

            <span
              className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                task.type === "paid"
                  ? "bg-amber-400 text-black"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {task.type === "paid" ? "Sponsored" : "Free"}
            </span>
          </div>

          <div className="mt-3 font-semibold">{task.name}</div>

          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Views required: {task.required_views}</span>
            <span className="font-bold text-primary">Payout: ₹{task.payout}</span>
          </div>

          {task.type === "paid" && (
            <div className="mt-1 text-xs text-amber-400">
              Unlock fee: ₹{task.unlock_amount}
            </div>
          )}
        </div>

        {hasCapacity && (
          <div
            className={`mt-2 text-xs font-semibold ${
              full ? "text-rose-400" : "text-muted-foreground"
            }`}
          >
            {full
              ? "Task fully occupied"
              : `Taken ${takenCount}/${task.max_takers}`}
          </div>
        )}

        {/* BEFORE TAKING TASK: show label only */}
        {!assign && task.commission_sale && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <span>includes + additional commision when saled</span>
          </div>
        )}

        {assign ? (
          <div className="mt-4 space-y-2">

            <div className="text-xs">
              Status: <span className="text-primary">{assign.status}</span>
            </div>

            {/* ONLY WHEN TASK IS TAKEN: show commission instructions & contact */}
            {task.commission_sale && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary-foreground/90">
                <div className="font-semibold text-primary">
                  Commission Sale Active
                </div>
                <p className="mt-1 text-muted-foreground">
                  When product is sold, get{" "}
                  <span className="font-bold text-primary">₹{task.commission_percent}</span>.
                </p>
                {task.commission_phone && (
                  <div className="mt-2 flex flex-col gap-1 border-t border-primary/20 pt-2 text-[11px]">
                    <span className="text-muted-foreground">
                      When sale is done, contact:{" "}
                      <span className="font-bold text-foreground">{task.commission_phone}</span>
                    </span>
                    <a
                      href={`https://wa.me/${task.commission_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I took the task "${task.name}" and made a product sale.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center justify-center rounded-lg bg-primary/20 px-3 py-1 font-medium text-primary hover:bg-primary/30"
                    >
                      Message business on WhatsApp →
                    </a>
                  </div>
                )}
              </div>
            )}

            {assign.status === "assigned" && (
              <SubmitProof assign={assign} onDone={onDone} />
            )}

            <a
              href={driveToDownload(task.image_url)}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost-emerald w-full text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>

          </div>
        ) : (
          <button
            disabled={(task.type === "free" && freeLimitReached) || full}
            onClick={() => setOpen(true)}
            className="btn-premium mt-4 w-full text-sm"
          >
            {full
              ? "Task fully occupied"
              : task.type === "free" && freeLimitReached
              ? "24h Free Limit Reached"
              : "Assign to me"}
          </button>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Assign Task: {task.name}</h3>

            <Field label="Your WhatsApp phone number (where you'll post status)">
              <input
                className={inputCls}
                placeholder="10-digit WhatsApp number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>

            {task.type === "paid" && (
              <div className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
                <div className="text-xs font-semibold text-amber-400">
                  Sponsor Unlock: Pay ₹{task.unlock_amount}
                </div>

                {qrUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={qrUrl}
                      alt="UPI QR"
                      className="h-44 w-44 rounded-xl border border-border bg-white p-2"
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      UPI ID: <span className="font-mono text-foreground">{upi}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Admin has not configured UPI yet.
                  </div>
                )}

                <Field label="Transaction ID / UTR after payment">
                  <input
                    className={inputCls}
                    placeholder="Enter UPI transaction ID"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                  />
                </Field>
              </div>
            )}

            <button
              onClick={take}
              disabled={loading}
              className="btn-premium w-full"
            >
              {loading ? "Assigning..." : "Confirm & Download"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function SubmitProof({
  assign,
  onDone,
}: {
  assign: Assign;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [views, setViews] = useState("");
  const [loading, setLoading] = useState(false);

  const assigned = new Date(assign.assigned_at).getTime();
  const elapsedHours = (Date.now() - assigned) / (1000 * 60 * 60);

  const canSubmit = elapsedHours >= 18 && elapsedHours <= 24;

  async function submit() {
    if (!proofUrl.trim() || !views.trim()) {
      toast.error("Provide Google Drive proof URL and views count");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("assignments")
      .update({
        proof_url: proofUrl.trim(),
        views_reported: Number(views) || 0,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", assign.id);

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Proof submitted! Waiting for admin approval.");
      setOpen(false);
      onDone();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-premium w-full text-xs"
      >
        Submit Proof
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Submit Views Proof</h3>

            {!canSubmit && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-400">
                Note: Proof submission is typically allowed between 18–24 hours
                after taking task (currently {elapsedHours.toFixed(1)}h).
              </div>
            )}

            <div className="rounded-xl border border-border bg-card/40 p-3 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">
                How to get screenshot link:
              </div>
              1. Take screenshot of status views at 24h
              <br />
              2. Upload to Google Drive
              <br />
              3. Share → Anyone with link → Viewer
              <br />
              4. Paste link below
            </div>

            <Field label="Google Drive Screenshot Link">
              <input
                className={inputCls}
                placeholder="https://drive.google.com/file/d/..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
            </Field>

            <Field label="Total Views Count (matching screenshot)">
              <input
                type="number"
                className={inputCls}
                placeholder="e.g. 150"
                value={views}
                onChange={(e) => setViews(e.target.value)}
              />
            </Field>

            <button
              onClick={submit}
              disabled={loading}
              className="btn-premium w-full"
            >
              {loading ? "Submitting..." : "Send for Approval"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

