import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase, driveToDirect } from "@/lib/supabase";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Coins, Eye, Gift, Megaphone,
  Rocket, ShieldCheck, Sparkles, Target, Users, Wallet,
} from "lucide-react";
import { PageShell, Container, Card } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily WhatsApp Challenge — Do tasks. Get paid daily." },
      { name: "description", content: "Post brand statuses on WhatsApp. Earn cash for every verified view. Businesses reach real audiences at scale." },
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
  return { images, index: i, setIndex: setI };
}

function Home() {
  const { images, index, setIndex } = useCarousel();

  return (
    <PageShell>
      <SiteHeader />

      {/* HERO */}
      <section className="relative">
        <Container className="pb-24 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live network · Payouts settled within 24 hours
            </div>

            <h1 className="mt-7 animate-fade-up display-xl" style={{ animationDelay: "60ms" }}>
              Do a task.<br />
              <span className="text-gradient-emerald">Post it. Get paid.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ animationDelay: "120ms" }}>
              India's premium WhatsApp status earning network. Real brands, verified views and instant cash rewards straight to your wallet.
            </p>

            <div className="mt-9 flex animate-fade-up flex-wrap justify-center gap-3" style={{ animationDelay: "180ms" }}>
              <Link to="/signup-user" className="btn-premium px-7 py-3.5">
                Start earning <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/signup-business" className="btn-ghost-emerald px-7 py-3.5">
                <Megaphone className="h-4 w-4" /> Advertise with us
              </Link>
              <Link to="/login" className="btn-soft px-6 py-3.5">Sign in</Link>
            </div>
          </div>

          {/* Floating showcase */}
          <div className="relative mx-auto mt-20 hidden max-w-5xl md:block">
            <div className="absolute inset-x-10 -top-6 h-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <div className="relative grid grid-cols-3 gap-5">
              {[
                { icon: Wallet, k: "Wallet", t: "Instant credit", d: "Approved tasks hit your balance immediately.", delay: "-1s" },
                { icon: BadgeCheck, k: "Verification", t: "Human reviewed", d: "Every proof screenshot checked by our team.", delay: "-5s" },
                { icon: Gift, k: "Rewards", t: "2× coupon mode", d: "Convert balance into double-value coupons.", delay: "-3s" },
              ].map((c) => (
                <div key={c.k} className="glass card-lift animate-float rounded-3xl p-6" style={{ animationDelay: c.delay }}>
                  <div className="icon-tile"><c.icon className="h-5 w-5" /></div>
                  <div className="mt-5 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{c.k}</div>
                  <div className="mt-1 font-display text-lg font-semibold">{c.t}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative">
        <Container className="pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow justify-center">The loop</div>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Three steps. No friction.</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
              A workflow engineered so a payout never takes more than a day.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: Rocket, t: "Pick a task", d: "Choose a free or sponsored brand task from your dashboard." },
              { icon: Eye, t: "Post to status", d: "Upload the supplied creative to your WhatsApp status for 24 hours." },
              { icon: Coins, t: "Get paid", d: "Submit proof, admin approves and cash lands in your wallet." },
            ].map((f, i) => (
              <Card key={f.t} className="group relative overflow-hidden p-7">
                <span className="absolute right-5 top-4 font-display text-6xl font-bold text-white/[0.04]">0{i + 1}</span>
                <div className="icon-tile"><f.icon className="h-5 w-5" /></div>
                <h3 className="mt-6 font-display text-xl font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* TWO CATEGORIES */}
      <section>
        <Container className="pb-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="relative overflow-hidden p-8 sm:p-10">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="eyebrow"><Users className="h-3.5 w-3.5" /> For earners</div>
                <h3 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Status Hustlers</h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Turn your WhatsApp status into a payday. Free tasks every day, sponsored tasks for serious payouts.
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["Free & sponsored task tiers", "Referral bonus on a friend's first task", "Wallet · UPI · Bank · 2× coupons"].map((li) => (
                    <li key={li} className="flex items-start gap-2.5 text-muted-foreground">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {li}
                    </li>
                  ))}
                </ul>
                <Link to="/signup-user" className="btn-premium mt-8">
                  Join as earner <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>

            <Card className="relative overflow-hidden p-8 sm:p-10">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-glow/12 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> For business</div>
                <h3 className="mt-4 font-display text-3xl font-bold sm:text-4xl">Reach real audiences</h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Pay once. Your creative appears on thousands of genuine WhatsApp statuses with guaranteed reach.
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {["Audience curated by category", "Fixed-price, no-surprise campaigns", "Verified view proof per participant"].map((li) => (
                    <li key={li} className="flex items-start gap-2.5 text-muted-foreground">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {li}
                    </li>
                  ))}
                </ul>
                <Link to="/signup-business" className="btn-premium mt-8">
                  Register business <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* CAROUSEL */}
      {images.length > 0 && (
        <section>
          <Container className="pb-24">
            <div className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> Featured campaigns</div>
            <div className="glass relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-[1.75rem] sm:aspect-[16/7]">
              {images.map((src, idx) => (
                <img
                  key={src + idx}
                  src={src}
                  alt={`Featured campaign ${idx + 1}`}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ${
                    idx === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
                  }`}
                />
              ))}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-background via-background/70 to-transparent p-6">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live on status</div>
                <div className="flex gap-2">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setIndex(idx)}
                      aria-label={`Show slide ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${idx === index ? "w-8 bg-primary" : "w-3 bg-white/25"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* CTA */}
      <section>
        <Container className="pb-24">
          <div className="glass glow-emerald relative overflow-hidden rounded-[1.75rem] px-6 py-14 text-center sm:px-14">
            <div className="absolute inset-0 grid-fade" aria-hidden />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-4xl">
                Your status is already being seen.<br />
                <span className="text-gradient-emerald">Start getting paid for it.</span>
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/signup-user" className="btn-premium px-7 py-3.5">Create free account <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/login" className="btn-ghost-emerald px-7 py-3.5">I already have an account</Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FOOTER */}
      <footer className="hairline">
        <Container className="grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-glow to-primary font-display text-sm font-extrabold text-primary-foreground">D</span>
              <span className="font-display font-bold">Daily WhatsApp Challenge</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              A verified WhatsApp status advertising network connecting brands with real everyday audiences.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Earners</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/signup-user" className="text-muted-foreground transition hover:text-primary">Create account</Link></li>
              <li><Link to="/login" className="text-muted-foreground transition hover:text-primary">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Business</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/signup-business" className="text-muted-foreground transition hover:text-primary">Register</Link></li>
              <li><Link to="/business" className="text-muted-foreground transition hover:text-primary">Campaign console</Link></li>
            </ul>
          </div>
        </Container>
        <div className="hairline">
          <Container className="py-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Daily WhatsApp Challenge. All rights reserved.
          </Container>
        </div>
      </footer>
    </PageShell>
  );
}
