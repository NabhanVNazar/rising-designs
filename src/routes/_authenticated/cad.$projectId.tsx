import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CadEditor } from "@/components/cad/CadEditor";
import { normalizeDoc, type CadDoc } from "@/lib/cad/types";

export const Route = createFileRoute("/_authenticated/cad/$projectId")({
  head: () => ({
    meta: [
      { title: "2D CAD editor — EDIFICE" },
      {
        name: "description",
        content:
          "Draw walls, rooms, doors, windows, furniture and dimensions with snapping, layers and exact coordinate input.",
      },
      { property: "og:title", content: "2D CAD editor — EDIFICE" },
      { property: "og:description", content: "A beginner-friendly architectural CAD workspace in your browser." },
    ],
  }),
  component: CadPage,
});

function CadPage() {
  const { projectId } = useParams({ from: "/_authenticated/cad/$projectId" });

  const { data, isLoading } = useQuery({
    queryKey: ["project-cad", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const plan = (data?.plan ?? {}) as Record<string, unknown>;
  const doc = normalizeDoc({ ...(plan["cad"] as object | undefined), name: data?.name ?? "Floor plan" });

  async function persist(next: CadDoc) {
    const { error } = await supabase
      .from("projects")
      .update({ plan: { ...plan, cad: next }, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <Link to="/dashboard" className="font-display text-xs font-bold tracking-widest">
          EDIFICE
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Link to="/plan/$projectId" params={{ projectId }} className="rounded-md border border-border px-3 py-1.5">
            Quick plan
          </Link>
          <Link to="/view/$projectId" params={{ projectId }} className="rounded-md border border-border px-3 py-1.5">
            3D
          </Link>
          <Link to="/elevation/$projectId" params={{ projectId }} className="rounded-md border border-border px-3 py-1.5">
            Elevation
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CadEditor initialDoc={doc} onPersist={persist} projectName={data?.name ?? "Floor plan"} />
      </div>
    </div>
  );
}
