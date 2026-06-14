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
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-md bg-background min-h-screen shadow-sm">
        <header className="sticky top-0 z-10 bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">Kasir Staf</h1>
            <p className="text-xs opacity-80">{profile.email}</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => { signOut(); navigate({ to: "/auth" }); }}>
            <LogOut className="size-4" />
          </Button>
        </header>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none">
            <TabsTrigger value="scan"><ShoppingCart className="mr-2 size-4" />Transaksi</TabsTrigger>
            <TabsTrigger value="stock"><Package className="mr-2 size-4" />Lihat Stok</TabsTrigger>
          </TabsList>
          <TabsContent value="scan" className="p-4"><TransaksiTab /></TabsContent>
          <TabsContent value="stock" className="p-4"><StockTab /></TabsContent>
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
    <div className="space-y-4">
      <Button size="lg" className="w-full h-20 text-lg" onClick={() => setScanning(true)}>
        <Camera className="mr-3 size-7" />Buka Kamera Scan
      </Button>

      <form onSubmit={(e) => { e.preventDefault(); findAndAdd(manualSku); setManualSku(""); }} className="flex gap-2">
        <Input placeholder="atau ketik SKU manual" value={manualSku} onChange={(e) => setManualSku(e.target.value)} />
        <Button type="submit" variant="outline">Tambah</Button>
      </form>

      {scanning && <ScannerOverlay onClose={() => setScanning(false)} onDecode={(t) => { setScanning(false); findAndAdd(t); }} />}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Keranjang ({cart.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Scan barang untuk memulai</p>}
          {cart.map(c => (
            <div key={c.item.sku} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{c.item.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{c.item.sku}</p>
                <p className="text-xs text-muted-foreground">Rp {Number(c.item.price ?? 0).toLocaleString("id-ID")}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="size-8" onClick={() => changeQty(c.item.sku, -1)}><Minus className="size-3" /></Button>
                <span className="w-8 text-center font-semibold">{c.qty}</span>
                <Button size="icon" variant="outline" className="size-8" onClick={() => changeQty(c.item.sku, +1)}><Plus className="size-3" /></Button>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setCart(cart.filter(x => x.item.sku !== c.item.sku))}>
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {cart.length > 0 && (
        <div className="sticky bottom-0 -mx-4 border-t bg-background p-4 space-y-3">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span><span>Rp {total.toLocaleString("id-ID")}</span>
          </div>
          <Button size="lg" className="w-full h-14 text-base" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <span className="font-medium">Scan Barcode</span>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/10" onClick={onClose}><X /></Button>
      </div>
      <div ref={ref} className="flex-1" />
      <p className="text-white/70 text-center text-sm p-4">Arahkan kamera ke barcode produk</p>
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
    <div className="space-y-3">
      <Input placeholder="Cari nama atau SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin" /></div> :
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Tidak ada hasil</p>}
          {filtered.map(i => (
            <div key={i.id} className="flex justify-between items-center rounded-lg border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{i.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{i.sku}</p>
              </div>
              <div className={"text-sm font-semibold px-3 py-1 rounded-full " + (i.quantity <= 0 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}>
                {i.quantity}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
