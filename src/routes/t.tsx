import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
export const Route = createFileRoute("/t")({ component: T });
function T() {
  const { scrollYProgress } = useScroll();
  const o = useTransform(scrollYProgress, [0, 1], [0.2, 1]);
  return <div style={{ height: "300vh" }}><motion.div style={{ opacity: o }}>A</motion.div></div>;
}
