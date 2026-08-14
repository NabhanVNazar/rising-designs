import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { Counter, Magnetic, MaskLine, Spotlight } from "@/components/landing/motion-bits";
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

const stats: { value: number; prefix?: string; suffix?: string; label: string }[] = [
  { value: 60, suffix: "s", label: "First blueprint" },
  { value: 12000, suffix: "+", label: "Homes designed" },
  { value: 0, prefix: "₹", label: "CAD skill needed" },
  { value: 4, label: "Export formats" },
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
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 900], ["0%", "22%"]);
  const opacity = useTransform(scrollY, [0, 700], [1, 0]);
  const scale = useTransform(scrollY, [0, 900], [1, 1.15]);


  return (
    <section ref={ref} className="relative h-screen overflow-hidden hero-gradient">
      <motion.video
        style={{ scale }}
        className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale"
        src={buildVideo.url}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 grid-blueprint" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--background)_0%,transparent_35%,transparent_55%,var(--background)_100%)]" />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
        >
          <Building2 className="h-3 w-3" /> Edifice studio
        </motion.span>

        <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
          {["Defines", "your"].map((w, i) => (
            <span key={w} className="mr-4 inline-block overflow-hidden align-bottom">
              <motion.span
                initial={{ y: "115%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 1, delay: 0.15 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block"
              >
                {w}
              </motion.span>
            </span>
          ))}
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span
              initial={{ y: "115%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 1, delay: 0.33, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block text-gradient"
            >
              lifestyle
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.9 }}
          className="mt-7 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Watch your home rise from bare plot to finished elevation — AI blueprints, live 3D
          and construction-ready exports in one flow.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Magnetic>
            <button
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-md bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
            >
              Start designing
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Magnetic>
          <Magnetic strength={0.25}>
            <button
              onClick={onDemo}
              className="inline-flex items-center gap-2 rounded-md border border-border px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              <Play className="h-3.5 w-3.5" /> Watch the build
            </button>
          </Magnetic>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
      >
        Scroll to build
        <motion.span
          animate={{ scaleY: [0, 1, 0], originY: [0, 0, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="block h-8 w-px bg-border"
        />
      </motion.div>
    </section>

  );
}

export function Marquee() {
  const words = ["Plot input", "AI blueprint", "2D editing", "3D walkthrough", "Elevations", "Cost estimate", "CAD export"];
  return (
    <div className="overflow-hidden border-y border-border py-4">
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
            {w} <Ruler className="h-3.5 w-3.5 text-muted-foreground/60" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-28">
      <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Toolkit</p>
      <h2 className="mt-5 max-w-2xl text-4xl font-semibold sm:text-5xl">
        <MaskLine text="Everything an architect does, minus the six-month wait." />
      </h2>
      <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.05}>
            <Tilt className="h-full" max={5}>
              <Spotlight className="group h-full bg-background p-8 transition-colors hover:bg-surface/60">
                <motion.div
                  whileHover={{ rotate: -8, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 320, damping: 16 }}
                  className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors group-hover:border-primary/60 group-hover:text-primary"
                >
                  <f.icon className="h-4.5 w-4.5" />
                </motion.div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </Spotlight>
            </Tilt>
          </Reveal>
        ))}
      </div>

    </section>
  );
}

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-28">
      <div className="grid gap-10 border-y border-border py-12 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07}>
            <div>
              <div className="font-display text-4xl font-semibold tracking-tight">
                <Counter value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
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
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.14, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden px-6 py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <motion.div
          style={{ y }}
          initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
          whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-lg border border-border"
        >
          <motion.img
            src={stage4}
            alt="Finished modern home rendered by EDIFICE"
            width={1024}
            height={768}
            loading="lazy"
            style={{ scale: imgScale }}
            className="relative block w-full"
          />
        </motion.div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">The finish line</p>
          <h2 className="mt-5 text-4xl font-semibold sm:text-5xl">
            <MaskLine text="From your requirements to a build-ready set." />
          </h2>
          <Reveal delay={0.1}>
            <p className="mt-5 text-muted-foreground">
              Every design leaves EDIFICE with dimensioned plans, elevations, a material takeoff
              and a cost estimate — so contractors quote from facts, not guesses.
            </p>
            <Magnetic className="mt-9 inline-block">
              <button
                onClick={onStart}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-foreground px-7 py-3.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
              >
                Design my home <ArrowRight className="h-4 w-4" />
              </button>
            </Magnetic>
          </Reveal>
        </div>
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
        <div className="hidden items-center gap-8 text-sm text-muted-foreground sm:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <Link to="/auth" search={{ mode: "signin" }} className="transition-colors hover:text-foreground">
            Log in
          </Link>
        </div>
        <button
          onClick={onStart}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="rounded-md border border-border px-5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          {open ? "Let's build" : "Get started"}
        </button>
      </nav>
    </header>
  );
}
