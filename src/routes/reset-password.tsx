import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — EDIFICE" },
      { name: "description", content: "Choose a new password for your EDIFICE account." },
      { property: "og:title", content: "Reset your password — EDIFICE" },
      { property: "og:description", content: "Set a new EDIFICE password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      navigate({ to: "/dashboard", replace: true });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 font-display text-sm font-bold tracking-widest">
          <Building2 className="h-4 w-4 text-primary" /> EDIFICE
        </div>
        <form onSubmit={submit} className="surface-card space-y-5 p-8">
          <h1 className="text-lg font-semibold">Set a new password</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            maxLength={72}
            placeholder="New password"
            className="field"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Update password
          </button>
        </form>
      </div>
    </div>
  );
}
