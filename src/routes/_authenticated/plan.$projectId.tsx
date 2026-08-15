import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { PlanEditor } from "@/components/planner/PlanEditor";
import { generateFloorPlan } from "@/lib/ai-plan.functions";
import { emptyPlan, normalizePlan, planArea, type FloorPlan } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/plan/$projectId")({
  head: () => ({
    meta: [
      { title: "2D floor plan editor — EDIFICE" },
      {
        name: "description",
        content: "Draw rooms, place doors and windows, and let AI lay out your floor plan on a live grid canvas.",
      },
      { property: "og:title", content: "2D floor plan editor — EDIFICE" },
      { property: "og:description", content: "Edit your home layout room by room." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { projectId } = useParams({ from: "/_authenticated/plan/$projectId" });
  const generate = useServerFn(generateFloorPlan);

  const { data, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  const [plan, setPlan] = useState<FloorPlan>(emptyPlan);
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [thinking, setThinking] = useState(false);

  const plot = (data?.plot ?? {}) as Record<string, unknown>;
  const req = (data?.requirements ?? {}) as Record<string, unknown>;
  const plotSize = {
    w: Number(plot["width"]) || 40,
    h: Number(plot["length"]) || 50,
  };

  useEffect(() => {
    if (data) setPlan(normalizePlan(data.plan));
  }, [data]);

  useEffect(() => {
    if (!data || prompt) return;
    setPrompt(
      `A ${req["style"] ?? "modern"} ${req["floors"] ?? 1}-floor home with ${req["bedrooms"] ?? 3} bedrooms, ${
        req["bathrooms"] ?? 2
      } bathrooms, living room, kitchen and dining. Extras: ${
        Array.isArray(req["extras"]) ? (req["extras"] as string[]).join(", ") : "none"
      }. ${req["notes"] ?? ""}`.trim(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ plan, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Plan saved");
  }

  async function aiGenerate() {
    setThinking(true);
    try {
      const result = await generate({
        data: { prompt, plotW: plotSize.w, plotH: plotSize.h },
      });
      setPlan(normalizePlan(result));
      toast.success("Plan generated — drag anything to refine it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setThinking(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Step 2 of 3 — ${data?.name ?? "Floor plan"}`}
      actions={
        <>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
          <Link
            to="/cad/$projectId"
            params={{ projectId }}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs"
          >
            Open CAD editor
          </Link>
          <Link
            to="/view/$projectId"
            params={{ projectId }}
            onClick={save}
            className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background"
          >
            View in 3D <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      }
    >
      <div className="surface-card mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Describe the layout
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1200}
            rows={2}
            className="field mt-2 resize-none"
          />
        </label>
        <button
          onClick={aiGenerate}
          disabled={thinking}
          className="flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate with AI
        </button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Plot {plotSize.w} × {plotSize.h} ft · {plan.rooms.length} rooms · {planArea(plan)} sq ft built-up
      </p>

      <PlanEditor plan={plan} onChange={setPlan} plot={plotSize} />
    </AppShell>
  );
}
