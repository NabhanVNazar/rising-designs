import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import {
  ArrowRight,
  Box,
  Building2,
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
import stage4 from "@/assets/stage-4.jpg";

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

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Hero({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <section ref={ref} className="relative h-screen overflow-hidden hero-gradient">
      <motion.video
        style={{ scale }}
        className="absolute inset-0 h-full w-full object-cover opacity-45"
        src={buildVideo.url}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 grid-blueprint opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,var(--background)_85%)]" />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs uppercase tracking-[0.28em] text-primary backdrop-blur"
        >
          <Building2 className="h-3.5 w-3.5" /> Edifice
        </motion.span>

        <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.95] sm:text-7xl lg:text-8xl">
          {"Defines your".split(" ").map((w, i) => (
            <motion.span
              key={w}
              initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="mr-4 inline-block"
            >
              {w}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block text-gradient"
          >
            lifestyle
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-7 max-w-xl text-base text-muted-foreground sm:text-lg"
        >
          Watch your home rise from bare plot to finished elevation — AI blueprints, live 3D
          and construction-ready exports in one flow.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.8 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={onStart}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] glow-ring"
          >
            Start designing
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={onDemo}
            className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            <Play className="h-4 w-4" /> Watch the build
          </button>
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
  const words = ["Plot input", "AI blueprint", "2D editing", "3D walkthrough", "Elevations", "Cost estimate", "CAD export"];
  return (
    <div className="overflow-hidden border-y border-border bg-surface/40 py-4">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        className="flex w-max gap-10 pr-10"
      >
        {[...words, ...words].map((w, i) => (
          <span
            key={i}
            className="flex items-center gap-10 whitespace-nowrap text-sm uppercase tracking-[0.3em] text-muted-foreground"
          >
            {w} <Ruler className="h-3.5 w-3.5 text-primary" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-28">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Toolkit</p>
        <h2 className="mt-5 max-w-2xl text-4xl font-bold sm:text-5xl">
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
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
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
              <div className="font-display text-4xl font-bold text-gradient">{s.value}</div>
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
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const rotate = useTransform(scrollYProgress, [0, 1], [4, -4]);

  return (
    <section ref={ref} className="relative overflow-hidden px-6 py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <motion.div style={{ y, rotate }} className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
          <img
            src={stage4}
            alt="Finished modern home rendered by EDIFICE"
            width={1024}
            height={768}
            loading="lazy"
            className="relative rounded-3xl border border-border"
          />
        </motion.div>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.4em] text-primary">The finish line</p>
          <h2 className="mt-5 text-4xl font-bold sm:text-5xl">
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

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
        <span className="flex items-center gap-2 font-display text-sm text-foreground">
          <Building2 className="h-4 w-4 text-primary" /> EDIFICE
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-6 backdrop-blur"
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
        <video src={buildVideo.url} className="w-full rounded-xl" controls autoPlay loop />
      </motion.div>
    </div>
  );
}

export function Nav({ onStart }: { onStart: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/60 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2 font-display text-sm font-bold tracking-widest">
          <Building2 className="h-4 w-4 text-primary" /> EDIFICE
        </a>
        <div className="hidden gap-8 text-sm text-muted-foreground sm:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
        </div>
        <button
          onClick={onStart}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="rounded-full border border-primary/40 px-5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {open ? "Let's build" : "Get started"}
        </button>
      </nav>
    </header>
  );
}
