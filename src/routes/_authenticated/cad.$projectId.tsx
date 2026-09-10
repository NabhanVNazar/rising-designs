import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CadEditor } from "@/components/cad/CadEditor";
import { cadUid, normalizeDoc, emptyDoc, type CadDoc } from "@/lib/cad/types";

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

type Page = { id: string; name: string; doc: CadDoc };

function readPages(plan: Record<string, unknown>, fallbackName: string): Page[] {
  const raw = plan["cadPages"];
  if (Array.isArray(raw) && raw.length) {
    return raw.map((p, i) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return {
        id: typeof o["id"] === "string" ? (o["id"] as string) : cadUid(),
        name: typeof o["name"] === "string" ? (o["name"] as string) : `Page ${i + 1}`,
        doc: normalizeDoc(o["doc"]),
      };
    });
  }
  return [{ id: cadUid(), name: "Page 1", doc: normalizeDoc({ ...(plan["cad"] as object | undefined), name: fallbackName }) }];
}

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

  const [pages, setPages] = useState<Page[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const plan = useMemo(() => (data?.plan ?? {}) as Record<string, unknown>, [data]);

  useEffect(() => {
    if (!data || pages) return;
    const loaded = readPages(plan, data.name ?? "Floor plan");
    setPages(loaded);
    const saved = plan["activeCadPage"];
    setActiveId(
      typeof saved === "string" && loaded.some((p) => p.id === saved) ? saved : loaded[0]!.id,
    );
  }, [data, plan, pages]);

  if (isLoading || !pages || !activeId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const active = pages.find((p) => p.id === activeId) ?? pages[0]!;

  async function store(nextPages: Page[], nextActive: string) {
    const activeDoc = (nextPages.find((p) => p.id === nextActive) ?? nextPages[0]!).doc;
    const { error } = await supabase
      .from("projects")
      .update({
        plan: {
          ...plan,
          cadPages: nextPages,
          activeCadPage: nextActive,
          cad: activeDoc,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
    if (error) toast.error(error.message);
  }

  async function persist(next: CadDoc) {
    const nextPages = pages!.map((p) => (p.id === activeId ? { ...p, doc: next } : p));
    setPages(nextPages);
    await store(nextPages, activeId!);
  }

  function addPage() {
    const name = `Page ${pages!.length + 1}`;
    const page: Page = { id: cadUid(), name, doc: emptyDoc(name) };
    const nextPages = [...pages!, page];
    setPages(nextPages);
    setActiveId(page.id);
    void store(nextPages, page.id);
    toast.success(`${name} added — earlier pages are kept`);
  }

  function selectPage(id: string) {
    setActiveId(id);
    void store(pages!, id);
  }

  function renamePage(id: string, name: string) {
    const nextPages = pages!.map((p) => (p.id === id ? { ...p, name } : p));
    setPages(nextPages);
    void store(nextPages, activeId!);
  }

  function deletePage(id: string) {
    if (pages!.length < 2) return;
    const nextPages = pages!.filter((p) => p.id !== id);
    const nextActive = id === activeId ? nextPages[0]!.id : activeId!;
    setPages(nextPages);
    setActiveId(nextActive);
    void store(nextPages, nextActive);
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <Link to="/dashboard" className="font-display text-xs font-bold tracking-widest">
          EDIFICE
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <Link to="/view/$projectId" params={{ projectId }} className="rounded-md border border-border px-3 py-1.5">
            3D
          </Link>
          <Link to="/elevation/$projectId" params={{ projectId }} className="rounded-md border border-border px-3 py-1.5">
            Elevation
          </Link>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CadEditor
          key={active.id}
          initialDoc={active.doc}
          onPersist={persist}
          projectName={`${data?.name ?? "Floor plan"} · ${active.name}`}
          pages={pages.map((p) => ({ id: p.id, name: p.name }))}
          activePageId={active.id}
          onSelectPage={selectPage}
          onAddPage={addPage}
          onRenamePage={renamePage}
          onDeletePage={deletePage}
        />
      </div>
    </div>
  );
}
