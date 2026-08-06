import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import {
  ArrowRight,
  Box,
  Building2,
  Check,
  Download,
  Grid3X3,
  Palette,
  Play,
  Ruler,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import buildVideo from "@/assets/build-loop.mp4.asset.json";
import phase1 from "@/assets/phase-1.jpg";
import phase2 from "@/assets/phase-2.jpg";
import phase3 from "@/assets/phase-3.jpg";
import phase4 from "@/assets/phase-4.jpg";

const features = [
  {
    icon: Sparkles,
    title: "AI blueprints",
    body: "Describe the home you want. Get a professional floor plan in under a minute.",
  },
  {
    icon: Grid3X3,
    title: "2D editor",
    body: "Drag walls, resize rooms, swap doors — with live area and code feedback.",
  },
  {
    icon: Box,
    title: "3D walkthrough",
    body: "Step inside the model with realistic lighting before a single brick is laid.",
  },
  {
    icon: Palette,
    title: "Elevation styles",
    body: "Modern, traditional or contemporary facades generated on your massing.",
  },
  {
    icon: Download,
    title: "Pro exports",
    body: "CAD, PDF and high-res renders your contractor can actually build from.",
  },
  {
    icon: Users,
    title: "Shared reviews",
    body: "Send a link to family, engineers and contractors. Comments land in one place.",
  },
];

const stats = [
  { value: "60s", label: "First blueprint" },
  { value: "12k+", label: "Homes designed" },
  { value: "₹0", label: "CAD skill needed" },
  { value: "4", label: "Export formats" },
];

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Loads and plays the video only once it is near the viewport. */
function LazyVideo({
  className,
  poster,
  controls = false,
}: {
  className?: string;
  poster?: string;
  controls?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSrc(buildVideo.url);
            io.disconnect();
          }
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      preload="none"
      autoPlay
      muted
      loop
      playsInline
      controls={controls}
    />
  );
}

export function EmailField({
  cta,
  onDone,
  dark = false,
}: {
  cta: string;
  onDone?: (email: string) => void;
  dark?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isEmail(email)) {
          setState("error");
          return;
        }
        setState("done");
        onDone?.(email.trim());
      }}
      className="w-full max-w-md"
    >
      <div
        className={`flex items-center gap-2 rounded-full border p-1.5 ${
          dark ? "border-border bg-card" : "border-border bg-card"
        }`}
      >
        <input
          type="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder="you@email.com"
          aria-label="Email address"
          className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          {state === "done" ? <Check className="h-4 w-4" /> : null}
          {state === "done" ? "Added" : cta}
        </button>
      </div>
      <p
        className={`mt-2 pl-4 text-xs ${
          state === "error" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {state === "error"
          ? "Enter a valid email address."
          : state === "done"
            ? "You're on the list — we'll be in touch shortly."
            : "Free early access. No spam, unsubscribe anytime."}
      </p>
    </form>
  );
}

export function Hero({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], ["0%", "16%"]);
  const opacity = useTransform(scrollY, [0, 700], [1, 0]);

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden hero-gradient pt-24">
      <div className="absolute inset-0 grid-blueprint opacity-70" />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-muted-foreground"
          >
            <Building2 className="h-3.5 w-3.5 text-accent" /> Edifice
          </motion.span>

          <h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">
            {"Defines your".split(" ").map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, y: 32, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, delay: 0.12 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="mr-4 inline-block"
              >
                {w}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0, y: 32, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-gradient"
            >
              lifestyle
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-7 max-w-lg text-base text-muted-foreground sm:text-lg"
          >
            Watch your home rise from bare plot to finished elevation — AI blueprints, live 3D
            and construction-ready exports in one calm, considered flow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.8 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <button
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] glow-ring"
            >
              Start designing free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={onDemo}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              <Play className="h-4 w-4 text-accent" /> Watch the build
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-8"
          >
            <EmailField cta="Get early access" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:block"
        >
          <div className="overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-lift)]">
            <LazyVideo
              poster={phase4}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
      >
        Scroll to build
      </motion.div>
    </section>
  );
}

export function Marquee() {
  const words = [
    "Plot input",
    "AI blueprint",
    "2D editing",
    "3D walkthrough",
    "Elevations",
    "Cost estimate",
    "CAD export",
  ];
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "120px" });
  return (
    <div ref={ref} className="overflow-hidden border-y border-border bg-card py-4">
      <motion.div
        animate={{ x: inView ? ["0%", "-50%"] : "0%" }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="flex w-max gap-10 pr-10"
      >
        {[...words, ...words].map((w, i) => (
          <span
            key={i}
            className="flex items-center gap-10 whitespace-nowrap text-xs uppercase tracking-[0.32em] text-muted-foreground"
          >
            {w} <Ruler className="h-3.5 w-3.5 text-accent" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** Horizontal (side) scroll gallery driven by vertical scroll progress. */
export function SideScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: [0, 1] });
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-62%"]);

  const panels = [
    { src: phase1, title: "Site", body: "Plot, setbacks and orientation captured in one screen." },
    { src: phase2, title: "Frame", body: "Structural grid and load paths resolved automatically." },
    { src: phase3, title: "Shell", body: "Walls, roof and openings shaped to your brief." },
    { src: phase4, title: "Home", body: "Elevation, materials and cost — ready to build." },
  ];

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 w-full max-w-7xl px-6">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">Side by side</p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold sm:text-4xl">
            Scroll across the whole journey.
          </h2>
        </div>
        <motion.div style={{ x }} className="flex gap-6 pl-6 will-change-transform">
          {panels.map((p) => (
            <article
              key={p.title}
              className="w-[78vw] shrink-0 overflow-hidden rounded-2xl border border-border bg-card sm:w-[52vw] lg:w-[38vw]"
            >
              <img
                src={p.src}
                alt={`${p.title} phase of an EDIFICE home design`}
                width={1280}
                height={960}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </div>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-28">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.4em] text-accent">Toolkit</p>
        <h2 className="mt-5 max-w-2xl text-4xl font-semibold sm:text-5xl">
          Everything an architect does, minus the six-month wait.
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06}>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="surface-card h-full p-7"
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-28">
      <div className="surface-card grid gap-8 p-10 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08}>
            <div>
              <div className="font-display text-4xl font-semibold text-gradient">{s.value}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Showcase({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={ref} className="relative overflow-hidden px-6 py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <motion.div style={{ y }} className="relative">
          <img
            src={phase4}
            alt="Finished minimal modern home rendered by EDIFICE"
            width={1280}
            height={960}
            loading="lazy"
            decoding="async"
            className="relative rounded-3xl border border-border"
          />
        </motion.div>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.4em] text-accent">The finish line</p>
          <h2 className="mt-5 text-4xl font-semibold sm:text-5xl">
            From your requirements to a build-ready set.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Every design leaves EDIFICE with dimensioned plans, elevations, a material takeoff
            and a cost estimate — so contractors quote from facts, not guesses.
          </p>
          <button
            onClick={onStart}
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:scale-[1.03]"
          >
            Design my home <ArrowRight className="h-4 w-4" />
          </button>
        </Reveal>
      </div>
    </section>
  );
}

export function Newsletter() {
  return (
    <section id="access" className="mx-auto max-w-7xl px-6 pb-28">
      <Reveal>
        <div className="surface-card flex flex-col items-start gap-8 p-10 sm:p-14 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-accent">Early access</p>
            <h2 className="mt-4 max-w-lg text-3xl font-semibold sm:text-4xl">
              Get your first blueprint free.
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Join the waitlist for new elevation packs, cost data updates and product releases.
            </p>
          </div>
          <EmailField cta="Join waitlist" />
        </div>
      </Reveal>
    </section>
  );
}

export function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next['name'] = "Please enter your name.";
    if (form.name.trim().length > 100) next['name'] = "Name must be under 100 characters.";
    if (!isEmail(form.email)) next['email'] = "Enter a valid email address.";
    if (form.message.trim().length < 10) next['message'] = "Tell us a little more (10+ characters).";
    if (form.message.length > 1000) next['message'] = "Message must be under 1000 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSent(true);
    setForm({ name: "", email: "", message: "" });
  };

  const field =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-accent";

  return (
    <section id="contact" className="mx-auto max-w-7xl px-6 pb-28">
      <div className="grid gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.4em] text-accent">Contact</p>
          <h2 className="mt-5 text-4xl font-semibold sm:text-5xl">Talk to a designer.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">
            Send your plot details or a question about exports, cost estimates or team plans.
            We reply within one working day.
          </p>
          <div className="mt-8 space-y-2 text-sm text-muted-foreground">
            <p>hello@edifice.design</p>
            <p>Mon–Fri, 9:00–18:00 IST</p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <form onSubmit={submit} className="surface-card space-y-4 p-7 sm:p-9" noValidate>
            <div>
              <label htmlFor="c-name" className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Name
              </label>
              <input
                id="c-name"
                className={field}
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors['name'] ? <p className="mt-1 text-xs text-destructive">{errors['name']}</p> : null}
            </div>
            <div>
              <label htmlFor="c-email" className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Email
              </label>
              <input
                id="c-email"
                type="email"
                className={field}
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors['email'] ? <p className="mt-1 text-xs text-destructive">{errors['email']}</p> : null}
            </div>
            <div>
              <label htmlFor="c-msg" className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Message
              </label>
              <textarea
                id="c-msg"
                rows={5}
                className={`${field} resize-none`}
                maxLength={1000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              {errors['message'] ? (
                <p className="mt-1 text-xs text-destructive">{errors['message']}</p>
              ) : null}
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              {sent ? <Check className="h-4 w-4" /> : null}
              {sent ? "Message sent" : "Send message"}
            </button>
            {sent ? (
              <p className="text-center text-xs text-muted-foreground">
                Thanks — we'll get back to you shortly.
              </p>
            ) : null}
          </form>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
        <span className="flex items-center gap-2 font-display text-sm text-foreground">
          <Building2 className="h-4 w-4 text-accent" /> EDIFICE
        </span>
        <span>© {new Date().getFullYear()} Edifice — Defines your lifestyle.</span>
      </div>
    </footer>
  );
}

export function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-6 backdrop-blur"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface-card w-full max-w-4xl overflow-hidden p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end p-1">
          <button onClick={onClose} aria-label="Close demo" className="rounded-full p-2 hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <LazyVideo className="w-full rounded-xl" poster={phase4} controls />
      </motion.div>
    </div>
  );
}

export function Nav({ onStart }: { onStart: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2 font-display text-sm font-bold tracking-widest">
          <Building2 className="h-4 w-4 text-accent" /> EDIFICE
        </a>
        <div className="hidden gap-8 text-sm text-muted-foreground sm:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#contact" className="transition-colors hover:text-foreground">Contact</a>
        </div>
        <button
          onClick={onStart}
          className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.04]"
        >
          Get started
        </button>
      </nav>
    </header>
  );
}
