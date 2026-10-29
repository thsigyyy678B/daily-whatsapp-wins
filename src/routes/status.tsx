import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";
import { DriveMedia } from "@/components/drive-media";
import { getSession } from "@/lib/session";
import { Eye, Flame, Rocket, TrendingUp, XCircle } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Campaign Status — Daily WhatsApp Challenge" },
      { name: "description", content: "Live view tracking for your WhatsApp status ad campaigns." },
      { property: "og:title", content: "Campaign Status — Daily WhatsApp Challenge" },
      { property: "og:description", content: "Live view tracking for your WhatsApp status ad campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatusPage,
});

type Campaign = {
  id: string;
  image_url: string;
  transaction_id: string;
  amount: number;
  status: string;
  reject_reason: string | null;
  views: number;
  package_name: string;
  expected_views: number;
  created_at: string;
};

function StatusPage() {
  const nav = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [camps, setCamps] = useState<Campaign[]>([]);

  const load = useCallback(async () => {
    const s = getSession();
    if (!s || s.role !== "business") {
      nav({ to: "/login" });
      return;
    }
    const [{ data: b }, { data: c }] = await Promise.all([
      supabase.from("businesses").select("*").eq("username", s.username).maybeSingle(),
      supabase.from("campaigns").select("*").eq("business_username", s.username).order("created_at", { ascending: false }),
    ]);
    setMe(b);
    setCamps((c ?? []) as Campaign[]);
  }, [nav]);

  useEffect(() => {
    load();
  }, [load]);

  if (!me)
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="p-10 text-center text-muted-foreground">Loading…</div>
      </div>
    );

  const live = camps.filter((c) => c.status === "approved");
  const others = camps.filter((c) => c.status !== "approved");
  const totalViews = live.reduce((n, c) => n + (c.views ?? 0), 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="glass rounded-3xl p-6">
          <div className="text-xs uppercase tracking-widest text-primary">Business status</div>
          <h1 className="mt-2 font-display text-3xl font-bold">Campaign status</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            @{me.username} · {live.length} live campaign{live.length === 1 ? "" : "s"} · {totalViews.toLocaleString("en-IN")} total views
          </div>
        </div>

        {live.length > 0 && (
          <div className="mt-8 space-y-8">
            {live.map((c) => (
              <LiveAdCard key={c.id} c={c} />
            ))}
          </div>
        )}

        {live.length === 0 && (
          <div className="glass mt-8 rounded-3xl p-12 text-center">
            <Rocket className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-4 font-display text-xl font-bold">No live campaigns yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Once your campaign payment is confirmed and approved by the admin, your live view tracking appears right here.
            </p>
          </div>
        )}

        {others.length > 0 && (
          <>
            <h2 className="mt-12 mb-4 font-display text-2xl font-bold">Other submissions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {others.map((c) => (
                <div key={c.id} className="glass rounded-2xl p-4">
                  <DriveMedia url={c.image_url} alt="Campaign creative" className="aspect-video w-full rounded-xl object-cover" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Txn: {c.transaction_id} · ₹{c.amount}</div>
                    <span className={`rounded-full px-3 py-1 text-xs ${c.status === "rejected" ? "bg-destructive/20 text-destructive-foreground" : "bg-muted"}`}>{c.status}</span>
                  </div>
                  {c.reject_reason && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive-foreground/80">
                      <XCircle className="h-3.5 w-3.5" /> {c.reject_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function useCountUp(target: number, duration = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function LiveAdCard({ c }: { c: Campaign }) {
  const shown = useCountUp(c.views ?? 0);
  const target = c.expected_views ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round(((c.views ?? 0) / target) * 100)) : null;

  return (
    <div className="glass glow-emerald overflow-hidden rounded-3xl">
      <div className="grid md:grid-cols-[280px_1fr]">
        <DriveMedia url={c.image_url} alt="Campaign creative" className="h-full min-h-[220px] w-full object-cover md:border-r md:border-border/60" />
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              LIVE
            </span>
            {c.package_name && <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground">{c.package_name}</span>}
            <span className="text-xs text-muted-foreground">Txn: {c.transaction_id}</span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-gradient-emerald font-display text-5xl font-extrabold tabular-nums sm:text-6xl">
              {shown.toLocaleString("en-IN")}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="h-4 w-4 text-primary" /> views
            </span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-primary" />
            <span>
              Your ad reached <b className="text-primary">{(c.views ?? 0).toLocaleString("en-IN")}</b> views
              {target > 0 && <> out of {target.toLocaleString("en-IN")} expected</>}
            </span>
          </p>

          {pct !== null && (
            <>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/60 to-emerald-glow shadow-[0_0_18px_rgba(16,185,129,0.55)] transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" /> {pct}% of package reach
                </span>
                <span>{pct >= 100 ? "Target reached 🎉" : `${(target - (c.views ?? 0)).toLocaleString("en-IN")} to go`}</span>
              </div>
              <MilestoneBars views={c.views ?? 0} target={target} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MilestoneBars({ views, target }: { views: number; target: number }) {
  const pct = (views / target) * 100;
  const steps = [25, 50, 75, 100];
  const H = 92;
  return (
    <div className="mt-6 rounded-2xl border border-border bg-black/30 p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">Reach milestones</div>
      <div className="mt-3 flex items-end gap-3">
        {steps.map((s) => {
          const reached = pct >= s;
          const fill = Math.max(0.05, Math.min(1, pct / s));
          return (
            <div key={s} className="flex flex-1 flex-col items-center gap-2">
              <span className={`font-display text-xs font-bold ${reached ? "text-primary" : "text-muted-foreground"}`}>{s}%</span>
              <div className="relative w-full max-w-[70px] overflow-hidden rounded-t-lg bg-white/5" style={{ height: H }}>
                <div
                  className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-1000 ${
                    reached ? "bg-gradient-to-t from-primary to-emerald-glow shadow-[0_0_24px_rgba(16,185,129,0.55)]" : "bg-primary/35"
                  }`}
                  style={{ height: `${fill * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
