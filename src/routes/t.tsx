import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
export const Route = createFileRoute("/t")({ component: T });
function T() {
  const ref = useRef<HTMLDivElement>(null);
  const a = useScroll({ target: ref });
  const o = useTransform(a.scrollYProgress, [0, 1], [0.2, 1]);
  return <div ref={ref} style={{ height: "300vh" }}><motion.div style={{ opacity: o }}>A</motion.div></div>;
}
