import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50 px-4 auth-layout">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-slate-300/20 blur-3xl" />
      </div>
      <Card className="w-full max-w-md rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-900/8 relative z-10">
        <CardHeader className="text-center pt-8">
          <img src="/logo.png" alt="DT. Wijaya Celluler Logo" className="mx-auto mb-4 size-16 rounded-2xl object-cover shadow-xl border border-zinc-200" />
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
            DT. Wijaya Celluler
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">Sistem Inventaris Konter Handphone</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-slate-700">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@toko.com" className="rounded-lg h-11 border-slate-200 bg-white focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-slate-700">Kata Sandi</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="*********" className="rounded-lg h-11 border-slate-200 bg-white focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all" />
            </div>
            <Button type="submit" className="w-full h-12 rounded-lg bg-gradient-to-r from-slate-800 to-blue-700 hover:from-slate-700 hover:to-blue-600 text-white font-bold shadow-lg shadow-slate-800/20 transition-all duration-300 hover:scale-[1.01] cursor-pointer" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Masuk Ke Sistem
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
