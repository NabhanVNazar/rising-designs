/**
 * BuildSequence — SCFO-inspired scroll-driven immersive scene sequence
 *
 * Architecture:
 * - 600vh sticky section; scroll progress [0→1] drives everything
 * - 4 stages × 25% each; each stage has its own spatial layout
 * - Frame scrubber plays 115 PNGs on a canvas (object-contain, centred)
 * - Text, frame, and background each move on independent parallax tracks
 * - Backgrounds blend via opacity cross-fade between stage accent glows
 * - No abrupt cuts — all transitions use cubic-bezier easing springs
 */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

/* ─── Stage definitions ──────────────────────────────────────────────────── */
const STAGES = [
  {
    step: "01",
    tag: "Foundation",
    title: "Define\nthe plot",
    body: "Enter your plot dimensions, orientation, and family requirements. EDIFICE maps the buildable envelope in seconds.",
    accent: "oklch(0.72 0.11 250)",
    accentRaw: [120, 160, 220] as [number, number, number],
    sub: "Plot · Orientation · Envelope",
  },
  {
    step: "02",
    tag: "Blueprint",
    title: "Generate\nthe plan",
    body: "AI drafts a code-aware 2-D layout — rooms, load paths and circulation resolved in under a minute.",
    accent: "oklch(0.76 0.14 195)",
    accentRaw: [80, 190, 210] as [number, number, number],
    sub: "AI Layout · Load Paths · Rooms",
  },
  {
    step: "03",
    tag: "Structure",
    title: "Rise\ninto 3D",
    body: "Walls, roof and openings lift into a live model you can orbit, walk through and edit as you go.",
    accent: "oklch(0.78 0.12 150)",
    accentRaw: [80, 200, 140] as [number, number, number],
    sub: "Massing · Roof · Openings",
  },
  {
    step: "04",
    tag: "Complete",
    title: "Build-ready\nset",
    body: "Pick an elevation style, confirm cost estimates, then export CAD, PDF and renders your contractor can build from.",
    accent: "oklch(0.82 0.09 85)",
    accentRaw: [210, 185, 80] as [number, number, number],
    sub: "CAD · PDF · Renders · Cost",
  },
] as const;

const TOTAL_FRAMES = 115;
const SCROLL_MULT = 6; // 600vh

/* ─── Frame asset loading ────────────────────────────────────────────────── */
const frameModules = import.meta.glob<{ default: string }>(
  "/src/assets/build/frame_*.png",
  { eager: true },
);
const FRAME_URLS: string[] = Object.keys(frameModules)
  .sort()
  .map((k) => frameModules[k].default);

function useFrameImages(urls: string[]) {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    let done = 0;
    urls.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        done += 1;
        setLoaded(done);
        if (done === urls.length) setImages([...imgs]);
      };
      imgs[i] = img;
    });
  }, [urls]);

  return { images, loaded, total: urls.length };
}

/* ─── Canvas painter ─────────────────────────────────────────────────────── */
function FrameCanvas({
  images,
  frameIndex,
}: {
  images: HTMLImageElement[];
  frameIndex: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const idx = Math.max(0, Math.min(images.length - 1, Math.round(frameIndex)));

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = images[idx];
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * devicePixelRatio) {
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
    }
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const sw = img.naturalWidth * scale;
    const sh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
  }, [images, idx]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: "auto" }}
    />
  );
}

/* ─── Loading overlay ────────────────────────────────────────────────────── */
function LoadingOverlay({ pct }: { pct: number }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-background">
      <div className="relative h-px w-56 bg-border overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
        Preparing frames — {Math.round(pct)}%
      </p>
    </div>
  );
}

/* ─── Lerp helper ─────────────────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/* ─── Scene background — blends between stage glows ─────────────────────── */
function SceneBackground({ progress }: { progress: MotionValue<number> }) {
  const [stage, setStage] = useState(0);
  const [blend, setBlend] = useState(0);

  useEffect(() => {
    return progress.on("change", (v) => {
      const raw = v * 4;
      const s = Math.min(3, Math.floor(raw));
      const b = raw % 1;
      setStage(s);
      setBlend(b);
    });
  }, [progress]);

  const curr = STAGES[stage];
  const next = STAGES[Math.min(3, stage + 1)];

  const r = Math.round(lerp(curr.accentRaw[0], next.accentRaw[0], blend));
  const g = Math.round(lerp(curr.accentRaw[1], next.accentRaw[1], blend));
  const b = Math.round(lerp(curr.accentRaw[2], next.accentRaw[2], blend));

  return (
    <>
      {/* Deep bg tint */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-700"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 60%, rgba(${r},${g},${b},0.07) 0%, transparent 70%)`,
        }}
      />
      {/* Top-left glow anchor */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl"
        style={{ background: `rgba(${r},${g},${b},0.09)` }}
      />
      {/* Bottom-right glow anchor */}
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `rgba(${r},${g},${b},0.06)` }}
      />
    </>
  );
}

/* ─── Stage counter / step rail ──────────────────────────────────────────── */
/* Primary blue & border colours as real values so motion can interpolate them */
const CLR_PRIMARY = "oklch(0.72 0.11 250)";
const CLR_BORDER  = "oklch(1 0 0 / 10%)";
const CLR_TRANSPARENT = "oklch(0 0 0 / 0%)";

function StepRail({ activeIndex, progress }: { activeIndex: number; progress: number }) {
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="relative h-40 w-px bg-border/40 overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 origin-top"
          style={{ height: `${Math.min(100, progress * 100)}%`, background: CLR_PRIMARY }}
        />
      </div>
      <div className="flex flex-col gap-4 py-2">
        {STAGES.map((s, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <div key={s.step} className="flex items-center gap-3">
              <motion.div
                animate={{
                  scale: current ? 1.5 : 1,
                  backgroundColor: done || current ? CLR_PRIMARY : CLR_TRANSPARENT,
                  borderColor:     done || current ? CLR_PRIMARY : CLR_BORDER,
                }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="h-2 w-2 rounded-full border"
              />
              <motion.span
                animate={{ opacity: current ? 1 : 0.3, x: current ? 0 : -6 }}
                transition={{ duration: 0.35 }}
                className="hidden whitespace-nowrap text-[9px] uppercase tracking-[0.38em] text-foreground xl:block"
              >
                {s.tag}
              </motion.span>
            </div>
          );
        })}
      </div>
      <div className="h-40 w-px bg-border/40" />
    </div>
  );
}

/* ─── Single stage copy block ─────────────────────────────────────────────── */
function StageCopy({
  stage,
  active,
}: {
  stage: (typeof STAGES)[number];
  active: boolean;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-center"
      initial={false}
      animate={active ? "show" : "hide"}
    >
      {/* Tag pill */}
      <motion.div
        variants={{
          show: { opacity: 1, x: 0, transition: { duration: 0.55, delay: 0.04, ease: [0.22, 1, 0.36, 1] } },
          hide: { opacity: 0, x: -18, transition: { duration: 0.3 } },
        }}
        className="mb-5 flex items-center gap-3"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.32em]"
          style={{
            borderColor: `color-mix(in oklab, ${stage.accent} 35%, transparent)`,
            color: stage.accent,
            background: `color-mix(in oklab, ${stage.accent} 9%, transparent)`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: stage.accent }}
          />
          {stage.tag}
        </span>
        <span className="font-mono text-[9px] tabular-nums text-muted-foreground/50">
          {stage.step} / 04
        </span>
      </motion.div>

      {/* Title — each line clips individually */}
      <div className="mb-5 space-y-1">
        {stage.title.split("\n").map((line, li) => (
          <div key={li} className="overflow-hidden">
            <motion.h3
              variants={{
                show: {
                  y: "0%",
                  opacity: 1,
                  transition: { duration: 0.7, delay: 0.1 + li * 0.09, ease: [0.16, 1, 0.3, 1] },
                },
                hide: {
                  y: "110%",
                  opacity: 0,
                  transition: { duration: 0.3 },
                },
              }}
              className="text-4xl font-semibold leading-[1.05] tracking-tight lg:text-5xl xl:text-[3.5rem]"
            >
              {line}
            </motion.h3>
          </div>
        ))}
      </div>

      {/* Body */}
      <motion.p
        variants={{
          show: { opacity: 1, y: 0, transition: { duration: 0.65, delay: 0.26, ease: [0.22, 1, 0.36, 1] } },
          hide: { opacity: 0, y: 14, transition: { duration: 0.25 } },
        }}
        className="max-w-sm text-sm leading-relaxed text-muted-foreground lg:text-base"
      >
        {stage.body}
      </motion.p>

      {/* Sub-tags */}
      <motion.p
        variants={{
          show: { opacity: 1, transition: { duration: 0.5, delay: 0.38 } },
          hide: { opacity: 0, transition: { duration: 0.2 } },
        }}
        className="mt-4 text-[9px] uppercase tracking-[0.35em]"
        style={{ color: stage.accent }}
      >
        {stage.sub}
      </motion.p>

      {/* Accent rule */}
      <motion.div
        variants={{
          show: { scaleX: 1, transition: { duration: 0.75, delay: 0.32, ease: [0.22, 1, 0.36, 1] } },
          hide: { scaleX: 0, transition: { duration: 0.2 } },
        }}
        className="mt-6 h-px w-20 origin-left"
        style={{ background: stage.accent }}
      />

      {/* Ghost step number */}
      <motion.div
        variants={{
          show: { opacity: 0.055, rotate: 0, scale: 1, transition: { duration: 1, delay: 0.05 } },
          hide: { opacity: 0, rotate: 12, scale: 0.85, transition: { duration: 0.25 } },
        }}
        className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 select-none font-display text-[9rem] font-black leading-none tracking-tighter text-foreground lg:text-[13rem]"
        aria-hidden
      >
        {stage.step}
      </motion.div>
    </motion.div>
  );
}

/* ─── Floating data chip (top-right overlay on canvas) ───────────────────── */
function DataChip({
  frameIndex,
  activeStage,
  progress,
}: {
  frameIndex: number;
  activeStage: number;
  progress: number;
}) {
  const stage = STAGES[activeStage];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute bottom-4 left-4 right-4 flex items-end justify-between"
    >
      {/* Frame counter */}
      <div className="rounded-full border border-border/60 bg-background/55 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground backdrop-blur-md">
        {String(frameIndex + 1).padStart(3, "0")} / {String(TOTAL_FRAMES).padStart(3, "0")}
      </div>

      {/* Stage progress pill */}
      <div
        className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest backdrop-blur-md"
        style={{
          borderColor: `color-mix(in oklab, ${stage.accent} 30%, transparent)`,
          background: `color-mix(in oklab, ${stage.accent} 10%, oklch(0.16 0.003 250 / 70%))`,
          color: stage.accent,
        }}
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: stage.accent }}
        />
        {stage.tag} · {Math.round(progress * 100)}%
      </div>
    </motion.div>
  );
}

/* ─── Horizontal stage ticker (bottom of screen) ─────────────────────────── */
function StageTicker({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="absolute bottom-0 inset-x-0 flex border-t border-border/30">
      {STAGES.map((s, i) => {
        const active = i === activeIndex;
        return (
          <motion.div
            key={s.step}
            animate={{
              opacity: active ? 1 : 0.3,
              backgroundColor: active
                ? `color-mix(in oklab, ${s.accent} 8%, transparent)`
                : "transparent",
            }}
            transition={{ duration: 0.4 }}
            className="flex flex-1 items-center gap-2 border-r border-border/30 px-4 py-2.5 last:border-r-0"
          >
            <span className="font-mono text-[9px] text-muted-foreground/60">{s.step}</span>
            <span className="hidden text-[9px] uppercase tracking-[0.28em] text-foreground sm:block">
              {s.tag}
            </span>
            {active && (
              <motion.div
                layoutId="ticker-active"
                className="ml-auto h-1 w-6 rounded-full"
                style={{ background: s.accent }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function BuildSequence() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 55,
    damping: 17,
    mass: 0.45,
  });

  const [frameIndex, setFrameIndex] = useState(0);
  const [activeStage, setActiveStage] = useState(0);
  const [railProgress, setRailProgress] = useState(0);

  const { images, loaded, total } = useFrameImages(FRAME_URLS);
  const isReady = loaded === total && images.length === total;
  const loadPct = total > 0 ? (loaded / total) * 100 : 0;

  useEffect(() => {
    return smoothProgress.on("change", (v) => {
      const fi = Math.round(v * (TOTAL_FRAMES - 1));
      setFrameIndex(Math.max(0, Math.min(TOTAL_FRAMES - 1, fi)));
      setActiveStage(Math.min(3, Math.floor(v * 4)));
      setRailProgress(v);
    });
  }, [smoothProgress]);

  /* Parallax transforms — canvas and text move in opposite directions */
  const canvasY = useTransform(smoothProgress, [0, 1], ["0%", "6%"]);
  const canvasScale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.04, 1.02]);
  const textX = useTransform(smoothProgress, [0, 1], ["0%", "-2%"]);

  /* Canvas frame opacity — slight cross-fade at stage boundaries */
  const stageEdges = [0, 0.25, 0.5, 0.75, 1];
  const canvasOpacity = useTransform(
    smoothProgress,
    stageEdges.flatMap((v, i) =>
      i < stageEdges.length - 1 ? [v, v + 0.05, v + 0.2, v + 0.25] : [v],
    ),
    stageEdges.flatMap((_, i) =>
      i < stageEdges.length - 1 ? [1, 0.82, 0.9, 1] : [1],
    ),
  );

  /* Scroll-hint opacity */
  const hintOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0]);

  return (
    <section
      id="how"
      ref={sectionRef}
      className="relative"
      style={{ height: `${SCROLL_MULT * 100}vh` }}
    >
      {/* ── Section header (above sticky area) ── */}
      <div className="mx-auto max-w-7xl px-6 pt-28 pb-10">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[10px] uppercase tracking-[0.42em] text-primary"
        >
          Base to complete
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, delay: 0.09, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl"
        >
          Watch your home rise,{" "}
          <span className="text-gradient">scene by scene.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.18 }}
          className="mt-4 max-w-lg text-sm text-muted-foreground"
        >
          Scroll to walk through every stage of the build — foundation to
          finished elevation.
        </motion.p>
      </div>

      {/* ── Sticky viewport ── */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Blueprint grid */}
        <div className="absolute inset-0 grid-blueprint opacity-25" />

        {/* Scene background glows */}
        <SceneBackground progress={smoothProgress} />

        {/* Loading state */}
        {!isReady && <LoadingOverlay pct={loadPct} />}

        {isReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative h-full"
          >
            {/* ── Main layout grid ── */}
            <div className="mx-auto grid h-full max-w-7xl grid-cols-1 items-center gap-0 px-6 pb-12 pt-4 lg:grid-cols-[auto_1fr_1fr] lg:gap-8">

              {/* Left rail (desktop) */}
              <div className="hidden lg:flex items-center justify-center px-4">
                <StepRail activeIndex={activeStage} progress={railProgress} />
              </div>

              {/* Centre: full-height canvas with parallax */}
              <motion.div
                style={{ y: canvasY, scale: canvasScale }}
                className="relative order-2 flex h-[46vh] items-center lg:order-1 lg:h-[78vh]"
              >
                <div className="relative h-full w-full overflow-hidden rounded-xl border border-border/40 shadow-2xl">
                  {/* Inner glass vignette */}
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-[radial-gradient(ellipse_at_center,transparent_60%,oklch(0.16_0.003_250/35%)_100%)]" />

                  <motion.div style={{ opacity: canvasOpacity }} className="h-full w-full">
                    <FrameCanvas images={images} frameIndex={frameIndex} />
                  </motion.div>

                  {/* Data chip overlay */}
                  <DataChip
                    frameIndex={frameIndex}
                    activeStage={activeStage}
                    progress={railProgress}
                  />
                </div>
              </motion.div>

              {/* Right: text choreography with parallax */}
              <motion.div
                style={{ x: textX }}
                className="relative order-1 h-56 lg:order-2 lg:h-[78vh]"
              >
                {STAGES.map((stage, i) => (
                  <StageCopy
                    key={stage.step}
                    stage={stage}
                    active={i === activeStage}
                  />
                ))}
              </motion.div>
            </div>

            {/* ── Stage ticker bar (bottom) ── */}
            <StageTicker activeIndex={activeStage} />

            {/* ── Mobile step dots ── */}
            <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 items-center gap-2 lg:hidden">
              {STAGES.map((s, i) => (
                <motion.div
                  key={s.step}
                  animate={{
                    width: i === activeStage ? 22 : 5,
                    opacity: i === activeStage ? 1 : 0.4,
                    backgroundColor:
                      i === activeStage ? CLR_PRIMARY : CLR_BORDER,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="h-1.5 rounded-full"
                />
              ))}
            </div>

            {/* ── Scroll hint ── */}
            <motion.div
              style={{ opacity: hintOpacity }}
              className="absolute bottom-16 right-8 hidden flex-col items-end gap-2 lg:flex"
            >
              <span className="text-[8px] uppercase tracking-[0.45em] text-muted-foreground/60">
                Scroll to build
              </span>
              <motion.div
                animate={{ scaleY: [0, 1, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="h-8 w-px origin-top bg-primary/50"
              />
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
