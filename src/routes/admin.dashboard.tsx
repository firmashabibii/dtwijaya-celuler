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
import { BulkBarcodeModal } from "@/components/bulk-barcode-modal";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Barcode, LogOut, Loader2, AlertTriangle, Package, TrendingUp, DollarSign, Bell, Smartphone, Layers, Upload } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Admin — Konter Handphone" }] }),
  component: AdminDashboard,
});

type Item = {
  id: number; name: string; sku: string; quantity: number; min_stock: number;
  price: number | null; category_id: number | null; updated_at: string;
};
type Category = { id: number; name: string; image: string | null };

function AdminDashboard() {
  const { loading, session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("items");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (profile && profile.role !== "admin") navigate({ to: "/staff/counter" });
  }, [loading, session, profile, navigate]);

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50/80 to-blue-50/60 text-foreground admin-dashboard-layout">
      <header className="border-b border-white/40 bg-white/70 backdrop-blur-xl sticky top-0 z-10 h-auto py-3 sm:py-0 sm:h-16 flex items-center">
        <div className="container mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 w-full">
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <img src="/logo.png" alt="DT. Wijaya Celluler Logo" className="size-11 rounded-xl object-cover shadow-md border border-zinc-200" />
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">DT. Wijaya Celluler</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold">Dashboard Admin</p>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-zinc-200/50 sm:border-t-0">
            <span className="text-xs text-zinc-500 font-semibold sm:inline">{profile.email}</span>
            <Button variant="outline" size="sm" className="rounded-xl border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-300 hover:scale-[1.02] cursor-pointer text-xs sm:text-sm h-8 sm:h-9" onClick={() => { signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="mr-1.5 size-3.5 sm:size-4" />Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-zinc-200/70 rounded-2xl p-1.5 h-auto shadow-sm flex flex-row overflow-x-auto max-w-full gap-1 scrollbar-none w-full flex-nowrap shrink-0">
            <TabsTrigger value="items" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 transition-all duration-300 shrink-0"><Package className="mr-2 size-4" />Kelola Barang</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 transition-all duration-300 shrink-0"><Layers className="mr-2 size-4" />Kelola Kategori</TabsTrigger>
            <TabsTrigger value="monitor" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 transition-all duration-300 shrink-0"><AlertTriangle className="mr-2 size-4" />Monitoring & Notifikasi</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 transition-all duration-300 shrink-0"><TrendingUp className="mr-2 size-4" />Analisis Penjualan</TabsTrigger>
          </TabsList>
          <TabsContent value="items" className="mt-8">
            <ItemsTab 
              selectedCategoryId={selectedCategoryId} 
              setSelectedCategoryId={setSelectedCategoryId} 
            />
          </TabsContent>
          <TabsContent value="categories" className="mt-8">
            <CategoriesTab 
              onViewItems={(catId) => {
                setSelectedCategoryId(String(catId));
                setActiveTab("items");
              }} 
            />
          </TabsContent>
          <TabsContent value="monitor" className="mt-8"><MonitorTab /></TabsContent>
          <TabsContent value="sales" className="mt-8"><SalesTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============== Items CRUD ==============
function ItemsTab({
  selectedCategoryId,
  setSelectedCategoryId,
}: {
  selectedCategoryId: string;
  setSelectedCategoryId: (v: string) => void;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [barcodeFor, setBarcodeFor] = useState<Item | null>(null);
  const [bulkBarcodeOpen, setBulkBarcodeOpen] = useState(false);

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
      const { data, error } = await supabase.from("categories").select("*").order("id", { ascending: true });
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

  const filteredItems = useMemo(() => {
    if (selectedCategoryId === "all") return items;
    return items.filter(it => it.category_id === Number(selectedCategoryId));
  }, [items, selectedCategoryId]);

  return (
    <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
        <div>
          <CardTitle className="text-lg sm:text-xl tracking-tight">Daftar Barang</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Kelola spare part dan stok konter</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {items.length > 0 && (
            <Button onClick={() => setBulkBarcodeOpen(true)} variant="outline" className="rounded-xl border-zinc-200 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto cursor-pointer">
              <Barcode className="mr-2 size-4" />Cetak Semua Barcode
            </Button>
          )}
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="rounded-xl shadow-sm shadow-primary/30 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto cursor-pointer">
            <Plus className="mr-2 size-4" />Tambah Barang
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {/* Category Pills Filter Bar */}
        <div className="flex flex-row overflow-x-auto gap-2 pb-4 mb-6 border-b border-zinc-150 scrollbar-none w-full flex-nowrap shrink-0">
          <button 
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              selectedCategoryId === "all" 
                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            Semua Barang ({items.length})
          </button>
          {categories.map(c => {
            const count = items.filter(it => it.category_id === c.id).length;
            return (
              <button 
                key={c.id}
                type="button"
                onClick={() => setSelectedCategoryId(String(c.id))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                  selectedCategoryId === String(c.id) 
                    ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <CategoryImage src={getCategoryImage(c.name, c.id, c.image)} alt="" className="size-4 rounded-full object-cover shrink-0" />
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Mobile Grid Layout */}
            <div className="space-y-4 md:hidden">
              {filteredItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 bg-white/40 rounded-2xl border border-dashed border-zinc-200">
                  {selectedCategoryId === "all" ? "Belum ada barang" : "Tidak ada barang di kategori ini"}
                </div>
              ) : (
                filteredItems.map((it) => {
                  const cat = categories.find(c => c.id === it.category_id);
                  const low = it.quantity <= it.min_stock;
                  return (
                    <div key={it.id} className="bg-white/70 border border-zinc-200/80 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-zinc-900 text-sm truncate">{it.name}</h4>
                          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{it.sku}</p>
                        </div>
                        {low ? (
                          <Badge variant="secondary" className="rounded-full bg-amber-500/10 text-amber-700 font-semibold border-0 text-[10px] px-2 py-0.5 whitespace-nowrap shrink-0">Stok Menipis</Badge>
                        ) : (
                          <Badge className="rounded-full bg-teal-500/10 text-teal-700 font-semibold border-0 text-[10px] px-2 py-0.5 whitespace-nowrap shrink-0">Stok Aman</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {cat ? (
                          <div className="flex items-center gap-1.5 bg-zinc-50/50 border border-zinc-200/50 rounded-lg px-2 py-0.5">
                            <CategoryImage src={getCategoryImage(cat.name, cat.id, cat.image)} alt="" className="size-4 rounded-full object-cover shrink-0" />
                            <span className="text-[10px] font-bold text-zinc-650">{cat.name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="rounded-md border-zinc-205 text-zinc-550 bg-zinc-50/50 text-[10px] font-medium py-0.5">Tanpa Kategori</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-100/80">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Harga</p>
                          <p className="text-xs font-extrabold text-blue-700 tabular-nums">Rp {Number(it.price ?? 0).toLocaleString("id-ID")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Stok</p>
                          <p className="text-xs font-bold text-zinc-800 tabular-nums">{it.quantity} Unit</p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 mt-3 pt-2.5 border-t border-zinc-100/80">
                        <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs px-2.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer" onClick={() => setBarcodeFor(it)}>
                          <Barcode className="mr-1.5 size-3.5" /> Barcode
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs px-2.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer" onClick={() => { setEditing(it); setOpen(true); }}>
                          <Pencil className="mr-1.5 size-3.5" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs px-2.5 text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer" onClick={() => { if (confirm(`Hapus ${it.name}?`)) del.mutate(it.id); }}>
                          <Trash2 className="mr-1.5 size-3.5" /> Hapus
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block rounded-xl border border-zinc-200/70 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-zinc-200/70">
                    <TableHead>SKU</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {items.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-lg text-[10px] sm:text-xs font-bold border-zinc-200 bg-white hover:bg-zinc-50 hover:text-primary transition-all cursor-pointer shadow-xs shrink-0 py-1"
                            onClick={() => setBulkBarcodeOpen(true)}
                          >
                            <Barcode className="mr-1.5 size-3.5" /> Cetak Semua Barcode
                          </Button>
                        )}
                        <span className="font-bold text-zinc-500">Aksi</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {selectedCategoryId === "all" ? "Belum ada barang" : "Tidak ada barang di kategori ini"}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredItems.map((it) => {
                    const cat = categories.find(c => c.id === it.category_id);
                    const low = it.quantity <= it.min_stock;
                    return (
                      <TableRow key={it.id} className="border-zinc-100 hover:bg-primary/[0.03] transition-colors duration-200">
                        <TableCell className="font-mono text-xs text-muted-foreground">{it.sku}</TableCell>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {cat ? (
                            <div className="flex items-center gap-2.5">
                              <CategoryImage src={getCategoryImage(cat.name, cat.id, cat.image)} alt="" className="size-7 rounded-full object-cover border border-zinc-200/80 shadow-xs shrink-0" />
                              <span className="font-semibold text-zinc-800">{cat.name}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 font-medium">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">Rp {Number(it.price ?? 0).toLocaleString("id-ID")}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{it.quantity}</TableCell>
                        <TableCell>
                          {low ? (
                            <Badge variant="secondary" className="rounded-full bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-medium border-0">Stok Menipis</Badge>
                          ) : (
                            <Badge className="rounded-full bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 font-medium border-0">Stok Aman</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" onClick={() => setBarcodeFor(it)} title="Cetak Barcode">
                              <Barcode className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer" onClick={() => { setEditing(it); setOpen(true); }} title="Edit">
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer" onClick={() => { if (confirm(`Hapus ${it.name}?`)) del.mutate(it.id); }} title="Hapus">
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
          </>
        )}
      </CardContent>
      <ItemDialog open={open} onOpenChange={setOpen} editing={editing} categories={categories} />
      {barcodeFor && (
        <BarcodeModal open={!!barcodeFor} onOpenChange={(v) => !v && setBarcodeFor(null)} sku={barcodeFor.sku} name={barcodeFor.name} />
      )}
      <BulkBarcodeModal open={bulkBarcodeOpen} onOpenChange={setBulkBarcodeOpen} items={filteredItems} />
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

  const autoSelectCategory = (itemName: string) => {
    if (!categories || categories.length === 0) return;
    const lower = itemName.toLowerCase();
    const matchedCategory = categories.find(c => {
      const cName = c.name.toLowerCase();
      if (cName.includes("baterai") || cName.includes("battery")) {
        return lower.includes("baterai") || lower.includes("battery") || lower.includes("batere");
      }
      if (cName.includes("layar") || cName.includes("lcd") || cName.includes("screen") || cName.includes("touchscreen")) {
        return lower.includes("layar") || lower.includes("lcd") || lower.includes("screen") || lower.includes("touchscreen") || lower.includes("kaca");
      }
      if (cName.includes("kabel") || cName.includes("charger") || cName.includes("cas")) {
        return lower.includes("kabel") || lower.includes("charger") || lower.includes("cas") || lower.includes("konektor") || lower.includes("usb");
      }
      if (cName.includes("casing") || cName.includes("case") || cName.includes("backdoor") || cName.includes("frame")) {
        return lower.includes("casing") || lower.includes("case") || lower.includes("backdoor") || lower.includes("frame");
      }
      if (cName.includes("mesin") || cName.includes("ic") || cName.includes("chip")) {
        return lower.includes("mesin") || lower.includes("ic") || lower.includes("chip") || lower.includes("flexibel") || lower.includes("kamera");
      }
      if (cName.includes("alat") || cName.includes("tools") || cName.includes("solder") || cName.includes("obeng")) {
        return lower.includes("alat") || lower.includes("tools") || lower.includes("solder") || lower.includes("obeng") || lower.includes("pinset");
      }
      if (cName.includes("aksesoris") || cName.includes("accessory") || cName.includes("tempered") || cName.includes("tg")) {
        return lower.includes("aksesoris") || lower.includes("accessory") || lower.includes("tempered") || lower.includes("tg") || lower.includes("headset") || lower.includes("earphone");
      }
      return lower.includes(cName);
    });

    if (matchedCategory) {
      setForm(prev => ({ ...prev, category_id: String(matchedCategory.id) }));
    }
  };

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
            <Input required value={form.name} onChange={(e) => {
              const val = e.target.value;
              setForm(prev => ({ ...prev, name: val }));
              autoSelectCategory(val);
            }} />
          </div>
          <div className="space-y-2">
            <Label>SKU <span className="text-xs text-muted-foreground">(opsional — dibuat otomatis bila kosong)</span></Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SP-00001" />
          </div>
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger className="rounded-xl bg-white/50 border-zinc-200/80">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <div className="flex items-center gap-2">
                      <CategoryImage src={getCategoryImage(c.name, c.id, c.image)} alt="" className="size-5 rounded-full object-cover border border-zinc-200" />
                      <span className="font-semibold text-xs text-zinc-800">{c.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2"><Label className="font-semibold text-zinc-700">Harga (Rp)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-2"><Label className="font-semibold text-zinc-700">Stok</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="rounded-xl" /></div>
            <div className="space-y-2"><Label className="font-semibold text-zinc-700">Stok Min.</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className="rounded-xl" /></div>
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

  const { data: salesTransactions = [], isLoading: isTxLoading } = useQuery({
    queryKey: ["sales-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          id,
          created_at,
          price_per_unit,
          quantity,
          type,
          item:items(name, sku),
          user:profiles(email)
        `)
        .eq("type", "OUT")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
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

      <div className="grid gap-6 md:grid-cols-2">
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

      <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
        <CardHeader className="p-6">
          <CardTitle className="text-lg tracking-tight">Detail Barang Terjual (Riwayat Transaksi)</CardTitle>
          <CardDescription>Daftar transaksi penjualan spare part</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {isTxLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : salesTransactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 bg-white/40 rounded-2xl border border-dashed border-zinc-200">
              Belum ada barang terjual.
            </div>
          ) : (
            <>
              {/* Mobile List View */}
              <div className="space-y-4 md:hidden">
                {salesTransactions.map((tx) => {
                  const totalVal = Number(tx.price_per_unit ?? 0) * tx.quantity;
                  return (
                    <div key={tx.id} className="bg-white/70 border border-zinc-200/80 rounded-2xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-zinc-900 text-sm truncate">{tx.item?.name ?? "Barang Dihapus"}</h4>
                          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{tx.item?.sku ?? "-"}</p>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                          {tx.quantity} pcs
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-100/80 text-xs">
                        <div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Total Penjualan</p>
                          <p className="font-extrabold text-blue-700 mt-0.5">Rp {totalVal.toLocaleString("id-ID")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Kasir Staf</p>
                          <p className="font-semibold text-zinc-700 truncate mt-0.5">{tx.user?.email ?? "Sistem"}</p>
                        </div>
                      </div>
                      <p className="text-[9px] text-zinc-400 mt-2 text-right">
                        {new Date(tx.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-xl border border-zinc-200/70 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-zinc-200/70">
                      <TableHead>Waktu Transaksi</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-right">Total Pendapatan</TableHead>
                      <TableHead>Kasir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesTransactions.map((tx) => {
                      const totalVal = Number(tx.price_per_unit ?? 0) * tx.quantity;
                      return (
                        <TableRow key={tx.id} className="border-zinc-100 hover:bg-primary/[0.03] transition-colors duration-200">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{tx.item?.sku ?? "-"}</TableCell>
                          <TableCell className="font-semibold text-zinc-800">{tx.item?.name ?? "Barang Dihapus"}</TableCell>
                          <TableCell className="text-right tabular-nums">Rp {Number(tx.price_per_unit ?? 0).toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{tx.quantity} unit</TableCell>
                          <TableCell className="text-right font-bold text-blue-700 tabular-nums">Rp {totalVal.toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-xs text-zinc-500 font-medium">{tx.user?.email ?? "Staf"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to get illustrative category images dynamically based on keywords
export function getCategoryImage(name: string, id?: number, dbImage?: string | null): string {
  if (dbImage) return dbImage;
  if (id) {
    const customImages = localStorage.getItem("category_custom_images");
    if (customImages) {
      try {
        const map = JSON.parse(customImages);
        if (map[id]) return map[id];
      } catch (e) {
        console.error(e);
      }
    }
  }

  const lower = name.toLowerCase();
  if (lower.includes("layar") || lower.includes("lcd") || lower.includes("screen") || lower.includes("touchscreen")) {
    return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=85"; // Screen / LCD mockup
  }
  if (lower.includes("kabel") || lower.includes("charger") || lower.includes("cas") || lower.includes("konektor") || lower.includes("usb")) {
    return "https://images.unsplash.com/photo-1622445262465-2481c4574875?w=600&auto=format&fit=crop&q=85"; // Charger cable
  }
  if (lower.includes("baterai") || lower.includes("battery") || lower.includes("batere")) {
    return "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=85"; // Lithium Battery
  }
  if (lower.includes("casing") || lower.includes("case") || lower.includes("backdoor") || lower.includes("frame")) {
    return "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=85"; // Phone Case
  }
  if (lower.includes("mesin") || lower.includes("ic") || lower.includes("chip") || lower.includes("processor") || lower.includes("cpu")) {
    return "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=85"; // Logic board chip / IC
  }
  if (lower.includes("alat") || lower.includes("tools") || lower.includes("solder") || lower.includes("obeng") || lower.includes("pinset")) {
    return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=85"; // Microelectronics tools
  }
  if (lower.includes("aksesoris") || lower.includes("accessory") || lower.includes("tempered") || lower.includes("tg") || lower.includes("headset") || lower.includes("earphone")) {
    return "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=85"; // Accessories / Smartwatch
  }
  // Default image representing mobile phone repair
  return "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=85"; 
}

// Component to render category images with automatic fallback to standard icons if external URLs fail to load (e.g. offline/firewall blocking)
export function CategoryImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div className={`bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center shrink-0 ${className}`}>
        <Layers className="size-1/2" />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt || ""} 
      className={className} 
      onError={() => setError(true)} 
    />
  );
}

// ============== Categories CRUD ==============
function CategoriesTab({ onViewItems }: { onViewItems: (id: number) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("id", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*");
      if (error) throw error;
      return data as Item[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      // Check if there are items using this category
      const { count, error: countError } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("category_id", id);
      
      if (countError) throw countError;
      if (count && count > 0) {
        throw new Error(`Tidak dapat menghapus kategori ini karena sedang digunakan oleh ${count} barang.`);
      }

      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initDefaults = useMutation({
    mutationFn: async () => {
      const defaults = [
        { name: "Aksesoris" },
        { name: "Baterai" },
        { name: "Charger & Kabel" },
        { name: "Layar & LCD" },
        { name: "Casing & Frame" },
        { name: "Mesin & IC" },
        { name: "Alat Servis" },
        { name: "Lain-lain" },
      ];
      const { error } = await supabase.from("categories").insert(defaults);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kategori default berhasil ditambahkan");
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6">
        <div>
          <CardTitle className="text-lg sm:text-xl tracking-tight">Kelola Kategori</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Kelola kategori spare part/barang konter</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {categories.length === 0 && (
            <Button
              variant="outline"
              onClick={() => initDefaults.mutate()}
              disabled={initDefaults.isPending}
              className="rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all duration-300 w-full sm:w-auto cursor-pointer"
            >
              {initDefaults.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Inisialisasi Kategori Default
            </Button>
          )}
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="rounded-xl shadow-sm shadow-primary/30 transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto cursor-pointer"
          >
            <Plus className="mr-2 size-4" />Tambah Kategori
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {categories.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 bg-white/40 rounded-2xl border border-dashed border-zinc-200">
                Belum ada kategori. Silakan tambah baru atau gunakan inisialisasi default.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categories.map((c, index) => {
                  const count = items.filter(it => it.category_id === c.id).length;
                  return (
                    <Card key={c.id} className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/50 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col justify-between">
                      <div className="h-32 w-full overflow-hidden relative bg-zinc-100">
                        <CategoryImage 
                          src={getCategoryImage(c.name, c.id, c.image)} 
                          alt={c.name} 
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-end p-3">
                          <span className="text-[9px] font-mono font-bold text-white/90 bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-full">
                            No: #{index + 1}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm sm:text-base line-clamp-2 min-h-[40px] flex items-center">{c.name}</h4>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="mt-2.5 w-full text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 h-8.5"
                            onClick={() => onViewItems(c.id)}
                          >
                            <Package className="size-3.5 text-blue-500" />
                            Lihat {count} Barang
                          </Button>
                        </div>
                        <div className="flex gap-1.5 justify-end pt-3 border-t border-zinc-100">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-lg h-8 text-xs px-2.5 hover:bg-violet-50 hover:text-violet-650 hover:border-violet-200 transition-colors cursor-pointer" 
                            onClick={() => { setEditing(c); setOpen(true); }}
                          >
                            <Pencil className="mr-1 size-3" /> Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-lg h-8 text-xs px-2.5 text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer" 
                            onClick={() => { if (confirm(`Hapus kategori "${c.name}"?`)) del.mutate(c.id); }}
                          >
                            <Trash2 className="mr-1 size-3" /> Hapus
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
      <CategoryDialog open={open} onOpenChange={setOpen} editing={editing} />
    </Card>
  );
}

// Helper to compress and scale uploaded files using HTML5 Canvas for safe localStorage storage
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal memproses gambar"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
}

function CategoryDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Category | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      if (editing.image) {
        setImageUrl(editing.image);
      } else {
        const customImages = localStorage.getItem("category_custom_images");
        if (customImages) {
          try {
            const map = JSON.parse(customImages);
            setImageUrl(map[editing.id] || "");
          } catch (e) {
            setImageUrl("");
          }
        } else {
          setImageUrl("");
        }
      }
    } else {
      setName("");
      setImageUrl("");
    }
  }, [editing, open]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Nama kategori harus diisi");
      const imgVal = imageUrl.trim() || null;

      if (editing) {
        const { error } = await supabase
          .from("categories")
          .update({ name: trimmedName, image: imgVal })
          .eq("id", editing.id);
        if (error) throw error;
        return { id: editing.id };
      } else {
        const { data, error } = await supabase
          .from("categories")
          .insert({ name: trimmedName, image: imgVal })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      if (data && data.id) {
        const customImages = localStorage.getItem("category_custom_images") || "{}";
        try {
          const map = JSON.parse(customImages);
          if (imageUrl.trim()) {
            map[data.id] = imageUrl.trim();
          } else {
            delete map[data.id];
          }
          localStorage.setItem("category_custom_images", JSON.stringify(map));
        } catch (e) {
          console.error(e);
        }
      }
      toast.success(editing ? "Kategori diperbarui" : "Kategori ditambahkan");
      qc.invalidateQueries({ queryKey: ["categories"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          <DialogDescription>Lengkapi detail kategori spare part di bawah ini.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Nama Kategori</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Baterai, Aksesoris"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex justify-between items-center font-semibold text-zinc-700">
              <span>Gambar Kategori (Upload dari HP/PC)</span>
              {imageUrl && (
                <button 
                  type="button" 
                  onClick={() => setImageUrl("")} 
                  className="text-[10px] text-rose-500 hover:underline font-normal cursor-pointer"
                >
                  Hapus Gambar
                </button>
              )}
            </Label>
            <div className="flex flex-col items-center justify-center gap-3 py-2">
              <input 
                type="file" 
                id="category-image-input"
                accept="image/*" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const base64 = await compressImage(file);
                      setImageUrl(base64);
                    } catch (err) {
                      toast.error("Gagal memproses gambar");
                    }
                  }
                }} 
              />
              
              {imageUrl ? (
                <label 
                  htmlFor="category-image-input"
                  className="relative size-36 rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 flex items-center justify-center shadow-md cursor-pointer hover:border-violet-400 group transition-all duration-200"
                  title="Klik untuk mengganti gambar"
                >
                  <img src={imageUrl} alt="Pratinjau Kategori" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/95 text-zinc-800 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      Ganti Gambar
                    </span>
                  </div>
                  {/* Small overlay indicator for mobile/touch screens */}
                  <div className="absolute top-2 right-2 size-6 rounded-full bg-black/55 backdrop-blur-xs flex items-center justify-center text-white md:hidden">
                    <Upload className="size-3" />
                  </div>
                </label>
              ) : (
                <label 
                  htmlFor="category-image-input"
                  className="flex flex-col items-center justify-center size-36 border-2 border-dashed border-zinc-300 hover:border-violet-400 hover:bg-violet-50/10 rounded-2xl cursor-pointer transition-all duration-200 p-3 text-center"
                >
                  <Upload className="size-5 text-zinc-400 mb-1.5" />
                  <p className="text-[10px] font-bold text-zinc-650">Pilih gambar</p>
                  <p className="text-[8px] text-zinc-400 mt-0.5">PNG/JPG (Resizer)</p>
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
