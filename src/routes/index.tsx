import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import {
  Contact,
  DemoModal,
  Features,
  Footer,
  Hero,
  Marquee,
  Nav,
  Newsletter,
  Showcase,
  SideScroll,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [demo, setDemo] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  const start = () => {
    document.getElementById("access")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="top" className="relative min-h-screen bg-background">
      <motion.div
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-accent"
      />
      <Nav onStart={start} />
      <main>
        <Hero onStart={start} onDemo={() => setDemo(true)} />
        <Marquee />
        <BuildSequence />
        <SideScroll />
        <Features />
        <Stats />
        <Showcase onStart={start} />
        <Newsletter />
        <Contact />
      </main>
      <Footer />
      <DemoModal open={demo} onClose={() => setDemo(false)} />
    </div>
  );
}
