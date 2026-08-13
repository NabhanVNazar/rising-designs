import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/requirements")({
  head: () => ({
    meta: [
      { title: "Land & building requirements — EDIFICE" },
      {
        name: "description",
        content: "Tell EDIFICE about your plot and what you need, and get a floor plan built around it.",
      },
      { property: "og:title", content: "Land & building requirements — EDIFICE" },
      { property: "og:description", content: "Capture plot size, facing, budget, rooms and style." },
    ],
  }),
  component: Requirements,
});

const schema = z.object({
  name: z.string().trim().min(1, "Give your project a name").max(80),
  length: z.number().min(10, "Plot length must be at least 10 ft").max(500),
  width: z.number().min(10, "Plot width must be at least 10 ft").max(500),
  facing: z.string().max(20),
  location: z.string().trim().max(120),
  budget: z.number().min(0).max(1_000_000_000),
  floors: z.number().min(1).max(5),
  bedrooms: z.number().min(0).max(12),
  bathrooms: z.number().min(0).max(12),
  style: z.string().max(30),
  notes: z.string().trim().max(1000),
});

const facings = ["North", "South", "East", "West"];
const styles = ["Modern", "Contemporary", "Traditional", "Minimal"];
const extras = ["Parking", "Garden", "Pooja room", "Home office", "Balcony", "Servant room"];

function Requirements() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "My dream home",
    length: 50,
    width: 40,
    facing: "North",
    location: "",
    budget: 3000000,
    floors: 1,
    bedrooms: 3,
    bathrooms: 2,
    style: "Modern",
    notes: "",
  });
  const [picked, setPicked] = useState<string[]>(["Parking"]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Session expired — log in again.");

      const v = parsed.data;
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: v.name,
          plot: {
            length: v.length,
            width: v.width,
            facing: v.facing,
            location: v.location,
            budget: v.budget,
          },
          requirements: {
            floors: v.floors,
            bedrooms: v.bedrooms,
            bathrooms: v.bathrooms,
            style: v.style,
            extras: picked,
            notes: v.notes,
          },
        })
        .select("id")
        .single();
      if (error) throw error;
      navigate({ to: "/plan/$projectId", params: { projectId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Step 1 of 3 — Requirements">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Step 1</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Your land & building brief</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything here shapes the floor plan you'll edit in the next step.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-8">
          <section className="surface-card space-y-5 p-7">
            <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The land</h2>
            <Field label="Project name">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className="field" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plot length (ft)">
                <input
                  type="number"
                  value={form.length}
                  onChange={(e) => set("length", Number(e.target.value))}
                  className="field"
                />
              </Field>
              <Field label="Plot width (ft)">
                <input
                  type="number"
                  value={form.width}
                  onChange={(e) => set("width", Number(e.target.value))}
                  className="field"
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plot facing">
                <Chips options={facings} value={form.facing} onSelect={(v) => set("facing", v)} />
              </Field>
              <Field label="Location">
                <input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  maxLength={120}
                  placeholder="City / area"
                  className="field"
                />
              </Field>
            </div>
            <Field label="Budget (₹)">
              <input
                type="number"
                value={form.budget}
                onChange={(e) => set("budget", Number(e.target.value))}
                className="field"
              />
            </Field>
          </section>

          <section className="surface-card space-y-5 p-7">
            <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The building</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["floors", "bedrooms", "bathrooms"] as const).map((k) => (
                <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)}>
                  <input
                    type="number"
                    min={0}
                    value={form[k]}
                    onChange={(e) => set(k, Number(e.target.value))}
                    className="field"
                  />
                </Field>
              ))}
            </div>
            <Field label="Style">
              <Chips options={styles} value={form.style} onSelect={(v) => set("style", v)} />
            </Field>
            <Field label="Must-haves">
              <div className="flex flex-wrap gap-2">
                {extras.map((x) => {
                  const on = picked.includes(x);
                  return (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setPicked((p) => (on ? p.filter((i) => i !== x) : [...p, x]))}
                      className={`rounded-md border px-4 py-2 text-xs transition-colors ${
                        on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      {x}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Anything else">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Open kitchen, north-lit study, elderly-friendly ground floor…"
                className="field resize-none"
              />
            </Field>
          </section>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground py-4 text-sm font-semibold text-background disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue to floor plan <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Chips({
  options,
  value,
  onSelect,
}: {
  options: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(o)}
          className={`rounded-md border px-4 py-2 text-xs transition-colors ${
            value === o ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
