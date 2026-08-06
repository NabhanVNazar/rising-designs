import { createFileRoute } from "@tanstack/react-router";
import { motion, useMotionValue, useTransform } from "motion/react";
export const Route = createFileRoute("/t")({ component: T });
function T() {
  const mv = useMotionValue(0.3);
  const o = useTransform(mv, [0, 1], [0, 1]);
  return <motion.div style={{ opacity: o }}>A</motion.div>;
}
