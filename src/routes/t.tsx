import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
export const Route = createFileRoute("/t")({ component: T });
function T() {
  return (
    <div>
      <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }}>marquee</motion.div>
      <motion.div initial={{ opacity: 0, y: 40, filter: "blur(12px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>blur</motion.div>
    </div>
  );
}
