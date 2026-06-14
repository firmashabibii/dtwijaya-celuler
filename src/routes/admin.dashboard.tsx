import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarcodeModal } from "@/components/barcode-modal";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Barcode, LogOut, Loader2, AlertTriangle, Package, TrendingUp, DollarSign, Bell, Smartphone } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Admin — Konter Handphone" }] }),
  component: AdminDashboard,
});

type Item = {
  id: number; name: string; sku: string; quantity: number; min_stock: number;
  price: number | null; category_id: number | null; updated_at: string;
};
type Category = { id: number; name: string };

function AdminDashboard() {
  const { loading, session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (profile && profile.role !== "admin") navigate({ to: "/staff/counter" });
  }, [loading, session, profile, navigate]);

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-foreground">
      <header className="border-b border-zinc-200/70 bg-white/80 backdrop-blur-lg sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Dashboard Admin</h1>
              <p className="text-xs text-muted-foreground">Konter Handphone</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile.email}</span>
            <Button variant="outline" size="sm" className="rounded-xl transition-all duration-300 hover:scale-[1.02] hover:border-primary/40 hover:text-primary" onClick={() => { signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="mr-2 size-4" />Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="items">
          <TabsList className="bg-white border border-zinc-200/70 rounded-2xl p-1.5 h-auto shadow-sm">
            <TabsTrigger value="items" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 transition-all duration-300"><Package className="mr-2 size-4" />Kelola Barang</TabsTrigger>
            <TabsTrigger value="monitor" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 transition-all duration-300"><AlertTriangle className="mr-2 size-4" />Monitoring & Notifikasi</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 transition-all duration-300"><TrendingUp className="mr-2 size-4" />Analisis Penjualan</TabsTrigger>
          </TabsList>
          <TabsContent value="items" className="mt-8"><ItemsTab /></TabsContent>
          <TabsContent value="monitor" className="mt-8"><MonitorTab /></TabsContent>
          <TabsContent value="sales" className="mt-8"><SalesTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============== Items CRUD ==============
function ItemsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [barcodeFor, setBarcodeFor] = useState<Item | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("id", { ascending: false });
      if (error) throw error;
      return data as Item[];
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Barang dihapus"); qc.invalidateQueries({ queryKey: ["items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-6">
        <div>
          <CardTitle className="text-xl tracking-tight">Daftar Barang</CardTitle>
          <CardDescription>Kelola spare part dan stok konter</CardDescription>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="rounded-xl shadow-sm shadow-primary/30 transition-all duration-300 hover:scale-[1.02]">
          <Plus className="mr-2 size-4" />Tambah Barang
        </Button>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (
          <div className="rounded-xl border border-zinc-200/70 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-zinc-200/70">
                <TableHead>SKU</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada barang</TableCell></TableRow>
              )}
              {items.map((it) => {
                const cat = categories.find(c => c.id === it.category_id);
                const low = it.quantity <= it.min_stock;
                return (
                  <TableRow key={it.id} className="border-zinc-100 hover:bg-primary/[0.03] transition-colors duration-200">
                    <TableCell className="font-mono text-xs text-muted-foreground">{it.sku}</TableCell>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cat?.name ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">Rp {Number(it.price ?? 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{it.quantity}</TableCell>
                    <TableCell>
                      {low ? (
                        <Badge variant="secondary" className="rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-100 font-medium border-0">Stok Menipis</Badge>
                      ) : (
                        <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10 font-medium border-0">Stok Aman</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => setBarcodeFor(it)} title="Cetak Barcode">
                          <Barcode className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => { setEditing(it); setOpen(true); }} title="Edit">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-destructive/10 transition-colors" onClick={() => { if (confirm(`Hapus ${it.name}?`)) del.mutate(it.id); }} title="Hapus">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
      <ItemDialog open={open} onOpenChange={setOpen} editing={editing} categories={categories} />
      {barcodeFor && (
        <BarcodeModal open={!!barcodeFor} onOpenChange={(v) => !v && setBarcodeFor(null)} sku={barcodeFor.sku} name={barcodeFor.name} />
      )}
    </Card>
  );
}

function ItemDialog({ open, onOpenChange, editing, categories }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Item | null; categories: Category[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", sku: "", quantity: "0", min_stock: "5", price: "0", category_id: "" });

  useEffect(() => {
    if (editing) setForm({
      name: editing.name, sku: editing.sku, quantity: String(editing.quantity),
      min_stock: String(editing.min_stock), price: String(editing.price ?? 0),
      category_id: editing.category_id ? String(editing.category_id) : "",
    });
    else setForm({ name: "", sku: "", quantity: "0", min_stock: "5", price: "0", category_id: "" });
  }, [editing, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        sku: form.sku.trim(), // trigger generates if empty
        quantity: parseInt(form.quantity || "0"),
        min_stock: parseInt(form.min_stock || "5"),
        price: parseFloat(form.price || "0"),
        category_id: form.category_id ? parseInt(form.category_id) : null,
      };
      if (editing) {
        const { error } = await supabase.from("items").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Barang diperbarui" : "Barang ditambahkan");
      qc.invalidateQueries({ queryKey: ["items"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
          <DialogDescription>Lengkapi detail spare part di bawah ini.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Barang</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>SKU <span className="text-xs text-muted-foreground">(opsional — dibuat otomatis bila kosong)</span></Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SP-00001" />
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Harga (Rp)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="space-y-2"><Label>Stok</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
            <div className="space-y-2"><Label>Stok Min.</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============== Monitor ==============
function MonitorTab() {
  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("quantity");
      if (error) throw error;
      return data as Item[];
    },
  });
  const { data: notifs = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as { id: number; title: string; message: string; created_at: string; is_read: boolean }[];
    },
  });
  const low = items.filter(i => i.quantity <= i.min_stock);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600"><AlertTriangle className="size-4" /></span>Barang Stok Menipis</CardTitle>
          <CardDescription>{low.length} item perlu restock</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {low.length === 0 ? <p className="text-sm text-muted-foreground py-4">Semua stok aman.</p> : (
            <ul className="space-y-2">
              {low.map(i => (
                <li key={i.id} className="flex justify-between items-center rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 transition-colors hover:bg-primary/[0.04]">
                  <div><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground font-mono">{i.sku}</p></div>
                  <Badge className="rounded-full bg-zinc-200 text-zinc-700 hover:bg-zinc-200 border-0 font-medium">{i.quantity} / min {i.min_stock}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center gap-2 text-lg tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell className="size-4" /></span>Notifikasi</CardTitle>
          <CardDescription>Peringatan terbaru dari sistem</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {notifs.length === 0 ? <p className="text-sm text-muted-foreground py-4">Belum ada notifikasi.</p> : (
            <ul className="space-y-2">
              {notifs.map(n => (
                <li key={n.id} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============== Sales ==============
type SalesRow = { sale_date: string; item_name: string; sku: string; total_items_sold: number; total_revenue: number };

function SalesTab() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sales_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_analytics" as any).select("*").order("sale_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SalesRow[];
    },
  });

  const byDate = useMemo(() => {
    const m = new Map<string, { date: string; items: number; revenue: number }>();
    rows.forEach(r => {
      const k = r.sale_date;
      const e = m.get(k) ?? { date: k, items: 0, revenue: 0 };
      e.items += Number(r.total_items_sold);
      e.revenue += Number(r.total_revenue);
      m.set(k, e);
    });
    return Array.from(m.values());
  }, [rows]);

  const totals = byDate.reduce((acc, r) => ({ items: acc.items + r.items, revenue: acc.revenue + r.revenue }), { items: 0, revenue: 0 });
  const byItem = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => m.set(r.item_name, (m.get(r.item_name) ?? 0) + Number(r.total_items_sold)));
    return Array.from(m.entries()).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="rounded-2xl border-zinc-200/70 shadow-sm bg-gradient-to-br from-white to-primary/[0.03] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Pendapatan</CardTitle>
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><DollarSign className="size-5" /></span>
          </CardHeader>
          <CardContent className="p-6 pt-2"><div className="text-3xl font-bold tracking-tight tabular-nums">Rp {totals.revenue.toLocaleString("id-ID")}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-zinc-200/70 shadow-sm bg-gradient-to-br from-white to-primary/[0.03] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Item Terjual</CardTitle>
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package className="size-5" /></span>
          </CardHeader>
          <CardContent className="p-6 pt-2"><div className="text-3xl font-bold tracking-tight tabular-nums">{totals.items}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-zinc-200/70 shadow-sm bg-gradient-to-br from-white to-primary/[0.03] transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
          <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hari Tercatat</CardTitle>
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-5" /></span>
          </CardHeader>
          <CardContent className="p-6 pt-2"><div className="text-3xl font-bold tracking-tight tabular-nums">{byDate.length}</div></CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
        <CardHeader className="p-6"><CardTitle className="text-lg tracking-tight">Tren Penjualan Harian</CardTitle><CardDescription>Pendapatan per hari</CardDescription></CardHeader>
        <CardContent className="h-[340px] p-6 pt-0">
          {isLoading ? <div className="flex h-full items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div> :
            byDate.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">Belum ada data penjualan.</p> :
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byDate} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.55 0.22 258)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="oklch(0.55 0.22 258)" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 250)" vertical={false} />
                <XAxis dataKey="date" stroke="oklch(0.55 0.015 250)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.55 0.015 250)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid oklch(0.93 0.006 250)", borderRadius: 12, boxShadow: "0 8px 24px -8px oklch(0.55 0.22 258 / 0.2)" }} labelStyle={{ color: "oklch(0.16 0.01 250)", fontWeight: 600 }} itemStyle={{ color: "oklch(0.55 0.22 258)" }} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.55 0.22 258)" fill="url(#g)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          }
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
        <CardHeader className="p-6"><CardTitle className="text-lg tracking-tight">Barang Terlaris</CardTitle><CardDescription>Total item terjual per produk</CardDescription></CardHeader>
        <CardContent className="h-[340px] p-6 pt-0">
          {byItem.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">Belum ada data.</p> :
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byItem} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 250)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.55 0.015 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.55 0.015 250)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "oklch(0.55 0.22 258 / 0.06)" }} contentStyle={{ background: "white", border: "1px solid oklch(0.93 0.006 250)", borderRadius: 12, boxShadow: "0 8px 24px -8px oklch(0.55 0.22 258 / 0.2)" }} labelStyle={{ color: "oklch(0.16 0.01 250)", fontWeight: 600 }} itemStyle={{ color: "oklch(0.55 0.22 258)" }} />
                <Bar dataKey="qty" fill="oklch(0.55 0.22 258)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        </CardContent>
      </Card>
    </div>
  );
}
