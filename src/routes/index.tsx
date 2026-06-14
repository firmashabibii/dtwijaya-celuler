import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Konter Handphone" }] }),
  component: Index,
});

function Index() {
  const { loading, session, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth" }); return; }
    if (profile?.role === "admin") navigate({ to: "/admin/dashboard" });
    else if (profile?.role === "staf") navigate({ to: "/staff/counter" });
  }, [loading, session, profile, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
