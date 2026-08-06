import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import {
  DemoModal,
  Features,
  Footer,
  Hero,
  Marquee,
  Nav,
  Showcase,
  Stats,
} from "@/components/landing/Sections";
import { BuildSequence } from "@/components/landing/BuildSequence";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EDIFICE — AI Home Design That Defines Your Lifestyle" },
      {
        name: "description",
        content:
          "Design your dream home with AI: instant blueprints, live 3D walkthroughs, elevation styles and construction-ready CAD exports. No architect required.",
      },
      { property: "og:title", content: "EDIFICE — AI Home Design That Defines Your Lifestyle" },
      {
        property: "og:description",
        content:
          "From bare plot to finished elevation: AI blueprints, 3D walkthroughs and build-ready exports.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [demo, setDemo] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const start = () => {
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="top" className="relative min-h-screen bg-background">
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-primary"
      />
      <Nav onStart={start} />
      <main>
        <Hero onStart={start} onDemo={() => setDemo(true)} />
        <Marquee />
        <BuildSequence />
        <Features />
        <Stats />
        <Showcase onStart={start} />
      </main>
      <Footer />
      <DemoModal open={demo} onClose={() => setDemo(false)} />
    </div>
  );
}
