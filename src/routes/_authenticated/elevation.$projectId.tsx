import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { Elevation, type Side } from "@/components/planner/Elevation";
import { normalizePlan } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/elevation/$projectId")({
  head: () => ({
    meta: [
      { title: "Elevations — EDIFICE" },
      {
        name: "description",
        content:
          "Front, rear and side elevation drawings generated automatically from your floor plan, with roof and floor-height controls.",
      },
      { property: "og:title", content: "Elevations — EDIFICE" },
      { property: "og:description", content: "Auto-generated facade drawings for your home design." },
    ],
  }),
  component: ElevationPage,
});

const SIDES: Side[] = ["front", "back", "left", "right"];

function ElevationPage() {
  const { projectId } = useParams({ from: "/_authenticated/elevation/$projectId" });
  const [side, setSide] = useState<Side>("front");
  const [wallH, setWallH] = useState(9);
  const [roof, setRoof] = useState<"flat" | "gable" | "parapet">("gable");

  const { data, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const plan = normalizePlan(data?.plan);
  const plot = (data?.plot ?? {}) as Record<string, unknown>;
  const req = (data?.requirements ?? {}) as Record<string, unknown>;
  const floors = Math.max(1, Math.min(4, Number(req["floors"]) || 1));

  return (
    <AppShell
      title={`Elevations — ${data?.name ?? "Project"}`}
      actions={
        <Link
          to="/view/$projectId"
          params={{ projectId }}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to 3D
        </Link>
      }
    >
      <h1 className="text-3xl font-bold sm:text-4xl">Elevations</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Facade drawings derived from your plan — {floors} floor{floors > 1 ? "s" : ""} at {wallH} ft each.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-border p-1">
          {SIDES.map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`rounded-full px-4 py-1.5 text-xs capitalize ${
                side === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {(["flat", "gable", "parapet"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoof(r)}
              className={`rounded-full px-4 py-1.5 text-xs capitalize ${
                roof === r ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Floor height
          <input
            type="range"
            min={7}
            max={14}
            value={wallH}
            onChange={(e) => setWallH(Number(e.target.value))}
            className="accent-[var(--primary)]"
          />
          {wallH} ft
        </label>
      </div>

      <div className="mt-6">
        <Elevation
          plan={plan}
          plot={{ w: Number(plot["width"]) || 40, h: Number(plot["length"]) || 50 }}
          side={side}
          floors={floors}
          wallH={wallH}
          roof={roof}
        />
      </div>
    </AppShell>
  );
}
