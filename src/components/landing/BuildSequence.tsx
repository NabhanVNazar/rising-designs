import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import stage1 from "@/assets/stage-1.jpg";
import stage2 from "@/assets/stage-2.jpg";
import stage3 from "@/assets/stage-3.jpg";
import stage4 from "@/assets/stage-4.jpg";

const stages = [
  {
    src: stage1,
    step: "01",
    title: "Foundation",
    body: "Enter your plot size, orientation and family needs. EDIFICE stakes out the buildable envelope instantly.",
  },
  {
    src: stage2,
    step: "02",
    title: "Structure",
    body: "AI generates a code-aware 2D blueprint — rooms, circulation and load paths resolved in seconds.",
  },
  {
    src: stage3,
    step: "03",
    title: "Enclosure",
    body: "Walls, roof and openings rise into a live 3D model you can walk through and edit as you go.",
  },
  {
    src: stage4,
    step: "04",
    title: "Complete",
    body: "Pick an elevation style, get cost estimates, then export CAD, PDF and renders ready for site.",
  },
];

function StageLayer({
  progress,
  index,
  total,
  src,
  alt,
}: {
  progress: MotionValue<number>;
  index: number;
  total: number;
  src: string;
  alt: string;
}) {
  const seg = 1 / total;
  const start = index * seg;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const stops = [
    clamp(start - seg * 0.45),
    clamp(start + seg * 0.15),
    clamp(start + seg * 0.85),
    clamp(start + seg * 1.35),
  ];
  const opacity = useTransform(
    progress,
    stops.map((v, i) => v + i * 0.0001),
    index === 0 ? [1, 1, 1, 0] : index === total - 1 ? [0, 1, 1, 1] : [0, 1, 1, 0],
  );
  const scale = useTransform(
    progress,
    [clamp(start - seg), clamp(start + seg) + 0.0001],
    [1.12, 1],
  );
  const y = useTransform(
    progress,
    [clamp(start - seg), clamp(start + seg) + 0.0001],
    [60, 0],
  );


  return (
    <motion.img
      src={src}
      alt={alt}
      width={1024}
      height={768}
      loading="lazy"
      style={{ opacity, scale, y }}
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
}

export function BuildSequence() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="how" ref={ref} className="relative h-[420vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 lg:grid-cols-2">
          <div className="relative order-2 h-[46vh] lg:order-1 lg:h-[72vh]">
            {stages.map((s, i) => (
              <StageLayer
                key={s.step}
                progress={scrollYProgress}
                index={i}
                total={stages.length}
                src={s.src}
                alt={`${s.title} stage of an AI generated home design`}
              />
            ))}
          </div>

          <div className="order-1 lg:order-2">
            <p className="mb-6 text-xs uppercase tracking-[0.4em] text-primary">
              Base to complete
            </p>
            <div className="relative pl-8">
              <div className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-border">
                <motion.div
                  style={{ scaleY: railScale }}
                  className="h-full w-full origin-top bg-primary"
                />
              </div>
              {stages.map((s, i) => (
                <StageCopy key={s.step} {...s} index={i} progress={scrollYProgress} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StageCopy({
  step,
  title,
  body,
  index,
  progress,
}: {
  step: string;
  title: string;
  body: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const seg = 1 / stages.length;
  const start = index * seg;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const stops = [
    clamp(start - seg * 0.5),
    clamp(start + seg * 0.2),
    clamp(start + seg * 0.9),
    clamp(start + seg * 1.3),
  ].map((v, i) => v + i * 0.0001);
  const opacity = useTransform(progress, stops, [0.25, 1, 1, 0.25]);
  const x = useTransform(
    progress,
    [clamp(start - seg * 0.5), clamp(start + seg * 0.3) + 0.0001],
    [24, 0],
  );


  return (
    <motion.div style={{ opacity, x }} className="py-6 lg:py-8">
      <div className="flex items-baseline gap-4">
        <span className="font-display text-sm text-primary">{step}</span>
        <h3 className="text-2xl font-semibold lg:text-4xl">{title}</h3>
      </div>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground lg:text-base">
        {body}
      </p>
    </motion.div>
  );
}
