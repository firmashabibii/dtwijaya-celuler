import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Camera, Plus, Minus, Trash2, LogOut, ShoppingCart, Package, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export const Route = createFileRoute("/staff/counter")({
  head: () => ({ meta: [{ title: "Kasir Staf — Konter Handphone" }] }),
  component: StaffCounter,
});

type Item = { id: number; name: string; sku: string; quantity: number; price: number | null };
type CartLine = { item: Item; qty: number };

function StaffCounter() {
  const { loading, session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (profile && profile.role !== "staf") navigate({ to: "/admin/dashboard" });
  }, [loading, session, profile, navigate]);

  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto max-w-md bg-white min-h-screen shadow-xl shadow-zinc-300/30">
        <header className="sticky top-0 z-10 bg-white border-b border-zinc-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <ShoppingCart className="size-5" />
            </div>
            <div>
              <h1 className="font-semibold tracking-tight text-zinc-950">Kasir Staf</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{profile.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl text-zinc-600 hover:bg-zinc-100 transition-colors" onClick={() => { signOut(); navigate({ to: "/auth" }); }}>
            <LogOut className="size-5" />
          </Button>
        </header>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none bg-white border-b border-zinc-100 h-auto p-0">
            <TabsTrigger value="scan" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3.5 font-medium transition-colors"><ShoppingCart className="mr-2 size-4" />Transaksi</TabsTrigger>
            <TabsTrigger value="stock" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3.5 font-medium transition-colors"><Package className="mr-2 size-4" />Lihat Stok</TabsTrigger>
          </TabsList>
          <TabsContent value="scan" className="p-5"><TransaksiTab /></TabsContent>
          <TabsContent value="stock" className="p-5"><StockTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TransaksiTab() {
  const qc = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [manualSku, setManualSku] = useState("");

  async function findAndAdd(sku: string) {
    const cleaned = sku.trim();
    if (!cleaned) return;
    const existing = cart.find(c => c.item.sku === cleaned);
    if (existing) {
      if (existing.qty + 1 > existing.item.quantity) {
        toast.warning(`Stok ${existing.item.name} hanya ${existing.item.quantity}`);
        return;
      }
      setCart(cart.map(c => c.item.sku === cleaned ? { ...c, qty: c.qty + 1 } : c));
      return;
    }
    const { data, error } = await supabase.from("items").select("id,name,sku,quantity,price").eq("sku", cleaned).maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!data) { toast.error(`Barang dengan SKU ${cleaned} tidak ditemukan`); return; }
    if (data.quantity < 1) { toast.warning(`Stok ${data.name} habis`); return; }
    setCart(c => [...c, { item: data as Item, qty: 1 }]);
    toast.success(`${data.name} ditambahkan`);
  }

  function changeQty(sku: string, delta: number) {
    setCart(cart.flatMap(c => {
      if (c.item.sku !== sku) return [c];
      const newQty = c.qty + delta;
      if (newQty <= 0) return [];
      if (newQty > c.item.quantity) { toast.warning(`Stok ${c.item.name} hanya ${c.item.quantity}`); return [c]; }
      return [{ ...c, qty: newQty }];
    }));
  }

  const checkout = useMutation({
    mutationFn: async () => {
      // re-validate
      for (const line of cart) {
        const { data, error } = await supabase.from("items").select("quantity,name").eq("id", line.item.id).single();
        if (error) throw error;
        if ((data?.quantity ?? 0) < line.qty) throw new Error(`Stok ${data?.name} tidak cukup`);
      }
      const rows = cart.map(c => ({ item_id: c.item.id, type: "OUT" as const, quantity: c.qty }));
      const { error } = await supabase.from("transactions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pembelian berhasil dicatat");
      setCart([]);
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["stock-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = cart.reduce((s, c) => s + (Number(c.item.price ?? 0) * c.qty), 0);

  return (
    <div className="space-y-5">
      <Button size="lg" className="pulse-ring w-full h-24 text-lg rounded-2xl shadow-md shadow-primary/30 transition-all duration-300 active:scale-[0.98]" onClick={() => setScanning(true)}>
        <Camera className="mr-3 size-7" />Buka Kamera Scan
      </Button>

      <form onSubmit={(e) => { e.preventDefault(); findAndAdd(manualSku); setManualSku(""); }} className="flex gap-2">
        <Input className="rounded-xl h-12 border-zinc-200 focus-visible:ring-primary" placeholder="atau ketik SKU manual" value={manualSku} onChange={(e) => setManualSku(e.target.value)} />
        <Button type="submit" variant="outline" className="rounded-xl h-12 px-5 border-zinc-200 hover:border-primary hover:text-primary transition-all">Tambah</Button>
      </form>

      {scanning && <ScannerOverlay onClose={() => setScanning(false)} onDecode={(t) => { setScanning(false); findAndAdd(t); }} />}

      <Card className="rounded-2xl border-zinc-200/70 shadow-sm">
        <CardHeader className="p-5 pb-3"><CardTitle className="text-base tracking-tight">Keranjang <span className="text-muted-foreground font-normal">({cart.length})</span></CardTitle></CardHeader>
        <CardContent className="space-y-2 p-5 pt-0">
          {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Scan barang untuk memulai</p>}
          {cart.map(c => (
            <div key={c.item.sku} className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 transition-colors hover:border-primary/30">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-zinc-950">{c.item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{c.item.sku}</p>
                <p className="text-xs text-primary font-semibold mt-0.5">Rp {Number(c.item.price ?? 0).toLocaleString("id-ID")}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="size-9 rounded-lg border-zinc-200" onClick={() => changeQty(c.item.sku, -1)}><Minus className="size-3" /></Button>
                <span className="w-8 text-center font-semibold tabular-nums">{c.qty}</span>
                <Button size="icon" variant="outline" className="size-9 rounded-lg border-zinc-200" onClick={() => changeQty(c.item.sku, +1)}><Plus className="size-3" /></Button>
                <Button size="icon" variant="ghost" className="size-9 rounded-lg" onClick={() => setCart(cart.filter(x => x.item.sku !== c.item.sku))}>
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {cart.length > 0 && (
        <div className="sticky bottom-0 -mx-5 border-t border-zinc-100 bg-white/95 backdrop-blur p-5 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Total</span>
            <span className="text-2xl font-bold tracking-tight tabular-nums">Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <Button size="lg" className="w-full h-14 text-base rounded-2xl shadow-md shadow-primary/30 transition-all duration-300 active:scale-[0.98]" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
            {checkout.isPending ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Check className="mr-2 size-5" />}
            Konfirmasi Pembelian
          </Button>
        </div>
      )}
    </div>
  );
}

function ScannerOverlay({ onClose, onDecode }: { onClose: () => void; onDecode: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const id = "qr-reader-" + Math.random().toString(36).slice(2);
    ref.current.id = id;
    const s = new Html5Qrcode(id);
    scannerRef.current = s;
    s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } },
      (text) => { onDecode(text); },
      () => {}
    ).catch((e) => { toast.error("Gagal akses kamera: " + e.message); onClose(); });
    return () => {
      if (scannerRef.current?.isScanning) scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      <div className="flex justify-between items-center p-5 text-white">
        <span className="font-semibold tracking-tight">Scan Barcode</span>
        <Button size="icon" variant="ghost" className="rounded-xl text-white hover:bg-white/10" onClick={onClose}><X /></Button>
      </div>
      <div className="relative flex-1">
        <div ref={ref} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-[280px] h-[180px] rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_oklch(0.16_0.01_250/0.55)]">
            <span className="absolute -top-px -left-px size-6 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <span className="absolute -top-px -right-px size-6 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <span className="absolute -bottom-px -left-px size-6 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <span className="absolute -bottom-px -right-px size-6 border-b-4 border-r-4 border-primary rounded-br-2xl" />
            <div className="scan-line absolute left-2 right-2 top-1/2 h-[3px] rounded-full bg-primary shadow-[0_0_12px_oklch(0.55_0.22_258)]" />
          </div>
        </div>
      </div>
      <p className="text-white/70 text-center text-sm p-5">Arahkan kamera ke barcode produk</p>
    </div>
  );
}

function StockTab() {
  const [q, setQ] = useState("");
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["stock-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id,name,sku,quantity").order("name");
      if (error) throw error;
      return data as { id: number; name: string; sku: string; quantity: number }[];
    },
  });
  const filtered = items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <Input className="rounded-xl h-12 border-zinc-200 focus-visible:ring-primary" placeholder="Cari nama atau SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" /></div> :
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Tidak ada hasil</p>}
          {filtered.map(i => (
            <div key={i.id} className="flex justify-between items-center rounded-xl border border-zinc-100 bg-white p-4 transition-colors hover:border-primary/30">
              <div className="min-w-0">
                <p className="font-medium truncate text-zinc-950">{i.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{i.sku}</p>
              </div>
              <div className={"text-sm font-semibold px-3 py-1 rounded-full tabular-nums " + (i.quantity <= 0 ? "bg-zinc-100 text-zinc-500" : "bg-primary/10 text-primary")}>
                {i.quantity}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
