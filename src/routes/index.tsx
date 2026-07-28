import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase, driveToDirect } from "@/lib/supabase";
import { ArrowRight, Coins, Eye, Rocket, ShieldCheck, Sparkles, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily WhatsApp Challenge — Do tasks. Get paid daily." },
      { name: "description", content: "Post brand statuses on WhatsApp. Earn cash for every verified view. Businesses reach real audiences." },
      { property: "og:title", content: "Daily WhatsApp Challenge" },
      { property: "og:description", content: "Do tasks. Post to WhatsApp status. Get paid." },
    ],
  }),
  component: Home,
});

function useCarousel() {
  const [images, setImages] = useState<string[]>([]);
  const [i, setI] = useState(0);
  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "carousel_images").maybeSingle()
      .then(({ data }) => {
        const arr = (data?.value as string[] | null) ?? [];
        setImages(arr.filter(Boolean).map(driveToDirect));
      });
  }, []);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);
  return { images, index: i };
}

function Home() {
  const { images, index } = useCarousel();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-fade" />
      <SiteHeader />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Live · Payouts within 24h
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            Do a task.<br />
            <span className="text-gradient-emerald">Post it. Get paid.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            India's premium WhatsApp status earning network. Real brands. Verified views. Instant cash rewards straight to your wallet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="btn-premium">
              Login <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/signup-user" className="btn-ghost-emerald">Sign up as User</Link>
            <Link to="/signup-business" className="btn-ghost-emerald">Business Sign Up</Link>
          </div>
        </div>

      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">How it works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">A three-step loop. No fluff.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: Rocket, t: "Pick a task", d: "Choose a free or sponsored brand task from your dashboard." },
            { icon: Eye, t: "Post to status", d: "Upload the given image to your WhatsApp status for 24 hours." },
            { icon: Coins, t: "Get paid", d: "Submit proof, admin approves, cash lands in your wallet." },
          ].map((f, i) => (
            <div key={f.t} className="glass rounded-3xl p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-5 text-xs uppercase tracking-widest text-muted-foreground">Step 0{i+1}</div>
              <h3 className="mt-1 text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TWO CATEGORIES */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Earners */}
          <div className="glass relative overflow-hidden rounded-3xl p-8">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Users className="h-4 w-4" /> FOR EARNERS
              </div>
              <h3 className="mt-4 font-display text-3xl font-bold">Status Hustlers</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Turn your WhatsApp status into a payday. Free tasks daily, sponsored tasks for bigger payouts.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li>• Free & sponsored tasks</li>
                <li>• Referral bonuses on first task</li>
                <li>• Wallet · UPI · Bank · 2× Coupons</li>
              </ul>
              <div className="mt-7 flex gap-3">
                <Link to="/signup-user" className="btn-premium text-sm">Choose Earner <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>

          {/* Business */}
          <div className="glass relative overflow-hidden rounded-3xl p-8">
            <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-glow/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <ShieldCheck className="h-4 w-4" /> FOR BUSINESS
              </div>
              <h3 className="mt-4 font-display text-3xl font-bold">Reach real audiences</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Pay once. Your creative shows on thousands of real WhatsApp statuses. Guaranteed reach.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li>• Curated audience by category</li>
                <li>• Fixed-price campaigns</li>
                <li>• Verified view proof per user</li>
              </ul>
              <div className="mt-7 flex gap-3">
                <Link to="/signup-business" className="btn-premium text-sm">Choose Business <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAROUSEL */}
      {images.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="glass relative aspect-[16/7] w-full overflow-hidden rounded-3xl">
            {images.map((src, idx) => (
              <img
                key={src + idx}
                src={src}
                alt="Featured"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${idx === index ? "opacity-100" : "opacity-0"}`}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/80 to-transparent p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Featured</div>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Daily WhatsApp Challenge · Built with premium care.
      </footer>
    </div>
  );
}
