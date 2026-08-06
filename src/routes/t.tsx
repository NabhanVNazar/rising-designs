import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
export const Route = createFileRoute("/t")({ component: T });
function T() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const o = useTransform(scrollYProgress, [0, 0.25, 0.5, 1], [0, 1, 1, 0]);
  const s = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <div ref={ref} style={{ height: "400vh" }}>
      <div className="sticky top-0">
        <motion.div style={{ opacity: o }}>A</motion.div>
        <motion.div style={{ scaleY: s }} className="h-20 w-2 origin-top bg-primary" />
      </div>
    </div>
  );
}
