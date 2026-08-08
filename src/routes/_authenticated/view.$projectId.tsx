import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { View3D } from "@/components/planner/View3D";
import { normalizePlan, planArea } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/view/$projectId")({
  head: () => ({
    meta: [
      { title: "3D walkthrough — EDIFICE" },
      {
        name: "description",
        content: "See your 2D floor plan extruded into a live 3D model you can rotate, tilt and inspect.",
      },
      { property: "og:title", content: "3D walkthrough — EDIFICE" },
      { property: "og:description", content: "Your floor plan, in three dimensions." },
    ],
  }),
  component: ViewPage,
});

function ViewPage() {
  const { projectId } = useParams({ from: "/_authenticated/view/$projectId" });

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

  return (
    <AppShell
      title={`Step 3 of 3 — ${data?.name ?? "3D model"}`}
      actions={
        <>
          <Link
            to="/plan/$projectId"
            params={{ projectId }}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to 2D
          </Link>
          <Link
            to="/elevation/$projectId"
            params={{ projectId }}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Elevations <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      }
    >
      <h1 className="text-3xl font-bold sm:text-4xl">{data?.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {plan.rooms.length} rooms · {planArea(plan)} sq ft built-up · drag to orbit the model.
      </p>

      <div className="mt-8">
        <View3D
          plan={plan}
          plot={{ w: Number(plot["width"]) || 40, h: Number(plot["length"]) || 50 }}
        />
      </div>
    </AppShell>
  );
}
