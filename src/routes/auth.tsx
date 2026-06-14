import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Masuk — Konter Handphone" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && profile) {
      navigate({ to: profile.role === "admin" ? "/admin/dashboard" : "/staff/counter" });
    }
  }, [loading, session, profile, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error("Gagal masuk: " + error);
    else toast.success("Berhasil masuk");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-md rounded-2xl border-zinc-200/70 shadow-xl shadow-primary/5">
        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Smartphone className="size-7" />
          </div>
          <CardTitle className="text-2xl tracking-tight">Konter Handphone</CardTitle>
          <CardDescription>Masuk untuk mengakses sistem inventaris</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@toko.com" className="rounded-xl h-11 border-zinc-200 focus-visible:ring-primary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl h-11 border-zinc-200 focus-visible:ring-primary" />
            </div>
            <Button type="submit" className="w-full h-11 rounded-xl shadow-md shadow-primary/30 transition-all duration-300 hover:scale-[1.01]" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
