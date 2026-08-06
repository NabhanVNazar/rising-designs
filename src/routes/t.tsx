import { createFileRoute } from "@tanstack/react-router";
import { BuildSequence } from "@/components/landing/BuildSequence";
export const Route = createFileRoute("/t")({ component: T });
function T() { return <div><div style={{height:"100vh"}} /><BuildSequence /></div>; }
