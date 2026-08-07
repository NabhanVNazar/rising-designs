import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { normalizePlan, planArea } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your projects — EDIFICE" },
      { name: "description", content: "All your home designs, floor plans and 3D walkthroughs in one place." },
      { property: "og:title", content: "Your projects — EDIFICE" },
      { property: "og:description", content: "Manage your EDIFICE home designs." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  }

  return (
    <AppShell
      actions={
        <button
          onClick={() => navigate({ to: "/requirements" })}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> New design
        </button>
      }
    >
      <h1 className="text-3xl font-bold sm:text-4xl">Your designs</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every project keeps its land details, requirements, 2D plan and 3D model together.
      </p>

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="surface-card mt-10 flex flex-col items-center gap-4 p-14 text-center">
          <p className="text-sm text-muted-foreground">No designs yet.</p>
          <Link
            to="/requirements"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Start your first home <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => {
            const plan = normalizePlan(p.plan);
            const plot = (p.plot ?? {}) as Record<string, unknown>;
            return (
              <div key={p.id} className="surface-card group flex flex-col p-6">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Number(plot["length"]) || 0} × {Number(plot["width"]) || 0} ft plot ·{" "}
                  {plan.rooms.length} rooms · {planArea(plan)} sq ft
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <Link
                    to="/plan/$projectId"
                    params={{ projectId: p.id }}
                    className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-xs font-semibold text-primary-foreground"
                  >
                    Open editor
                  </Link>
                  <Link
                    to="/view/$projectId"
                    params={{ projectId: p.id }}
                    className="rounded-full border border-border px-4 py-2 text-xs"
                  >
                    3D
                  </Link>
                  <button
                    onClick={() => remove(p.id)}
                    aria-label={`Delete ${p.name}`}
                    className="rounded-full border border-border p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
