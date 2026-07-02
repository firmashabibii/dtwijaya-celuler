import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Camera,
  Plus,
  Minus,
  Trash2,
  LogOut,
  ShoppingCart,
  Package,
  Loader2,
  X,
  Check,
  User,
  Flashlight,
  RefreshCw,
  Sparkles,
  Search
} from "lucide-react";
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
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (profile && profile.role !== "staf") navigate({ to: "/admin/dashboard" });
  }, [loading, session, profile, navigate]);

  async function findAndAdd(skuOrName: string) {
    let cleaned = skuOrName.trim();
    if (!cleaned) return;

    // Automatically strip common label prefixes like "SKU:","SKU-","CODE:" etc.
    cleaned = cleaned.replace(/^(sku|code|barcode)[:\s\-]+/i, "").trim();

    // Check if item is already in the cart (by exact SKU or exact Name match)
    const existingIndex = cart.findIndex(c => c.item.sku === cleaned || c.item.name === cleaned);
    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      if (existing.qty + 1 > existing.item.quantity) {
        toast.warning(`Stok ${existing.item.name} hanya ${existing.item.quantity}`);
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex] = { ...existing, qty: existing.qty + 1 };
      setCart(newCart);
      toast.success(`Jumlah ${existing.item.name} bertambah`);
      return;
    }

    // 1. Query by exact SKU first
    let { data, error } = await supabase.from("items").select("id,name,sku,quantity,price").eq("sku", cleaned).maybeSingle();
    if (error) { toast.error(error.message); return; }

    // 2. If not found, try exact name match
    if (!data) {
      const { data: byName, error: nameError } = await supabase
        .from("items")
        .select("id,name,sku,quantity,price")
        .eq("name", cleaned)
        .maybeSingle();
      if (nameError) { toast.error(nameError.message); return; }
      data = byName;
    }

    // 3. If still not found, try partial SKU match (e.g. "041" matches "SKU-041")
    if (!data) {
      const { data: bySKUPartial, error: skuPartialError } = await supabase
        .from("items")
        .select("id,name,sku,quantity,price")
        .ilike("sku", `%${cleaned}`)
        .limit(1)
        .maybeSingle();
      if (skuPartialError) { toast.error(skuPartialError.message); return; }
      data = bySKUPartial;
    }

    // 4. If still not found, try partial name match (case-insensitive)
    if (!data) {
      const { data: byNamePartial, error: namePartialError } = await supabase
        .from("items")
        .select("id,name,sku,quantity,price")
        .ilike("name", `%${cleaned}%`)
        .limit(1)
        .maybeSingle();
      if (namePartialError) { toast.error(namePartialError.message); return; }
      data = byNamePartial;
    }

    if (!data) {
      toast.error(`Barang dengan SKU/Nama "${cleaned}" tidak ditemukan`);
      return;
    }

    if (data.quantity < 1) {
      toast.warning(`Stok ${data.name} habis`);
      return;
    }

    setCart(c => [...c, { item: data as Item, qty: 1 }]);
    toast.success(`${data.name} ditambahkan`);
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 gap-3">
        <Loader2 className="size-9 animate-spin text-primary" />
        <p className="text-sm font-medium text-zinc-500">Memuat profil staf...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50/80 to-blue-50/60 text-zinc-950 font-sans transition-all staff-counter-layout">
      {/* Premium Navbar with Glassmorphism */}
      <header className="sticky top-0 z-10 w-full h-auto py-3 sm:h-16 sm:py-0 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-xs">
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 h-full flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DT. Wijaya Celluler Logo" className="size-11 rounded-xl object-cover shadow-md border border-zinc-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base tracking-tight text-zinc-950">DT. Wijaya Celluler</h1>
                <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold ring-1 ring-inset ring-blue-200">
                  Staf
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px] font-semibold">{profile.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl text-zinc-500 hover:text-red-650 hover:bg-red-50 active:scale-95 transition-all duration-200 cursor-pointer size-9 sm:size-10" 
            onClick={() => { signOut(); navigate({ to: "/auth" }); }}
            title="Keluar"
          >
            <LogOut className="size-4 sm:size-5" />
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column — Transaction & Scanner */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingCart className="size-5" />
                </div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-900">Transaksi Penjualan</h2>
              </div>
              <span className="inline-flex self-start sm:self-auto text-[9px] sm:text-[10px] font-bold text-zinc-400 bg-zinc-200/50 px-2.5 py-1 rounded-full items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="size-3 text-blue-400 animate-pulse" /> POS Terintegrasi
              </span>
            </div>
            <div className="bg-white/70 rounded-3xl shadow-lg border border-white/60 p-6 backdrop-blur-xl transition-all hover:shadow-xl duration-300">
              <TransaksiSection cart={cart} setCart={setCart} findAndAdd={findAndAdd} />
            </div>
          </div>

          {/* Right Column — Stock Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
                  <Package className="size-5" />
                </div>
                <h2 className="text-lg font-extrabold tracking-tight text-zinc-900">Informasi Stok Barang</h2>
              </div>
            </div>
            <div className="bg-white/70 rounded-3xl shadow-lg border border-white/60 p-6 backdrop-blur-xl transition-all hover:shadow-xl duration-300">
              <StockSection onSelectItem={(sku) => findAndAdd(sku)} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TransaksiSection({
  cart,
  setCart,
  findAndAdd,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  findAndAdd: (skuOrName: string) => Promise<void>;
}) {
  const qc = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

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
    <div className="space-y-6">
      {/* Main Barcode Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Live Camera Scanner Button */}
        <Button 
          size="lg" 
          className="pulse-ring h-20 text-base font-bold rounded-xl shadow-md transition-all duration-300 active:scale-[0.97] hover:scale-[1.01] bg-gradient-to-r from-slate-800 to-blue-700 hover:from-slate-700 hover:to-blue-600 text-white shadow-slate-800/20 hover:shadow-slate-800/30 flex items-center justify-center gap-2.5 cursor-pointer" 
          onClick={() => setScanning(true)}
        >
          <Camera className="size-6 animate-pulse" />
          Buka Kamera Scan
        </Button>
        
        {/* Barcode/SKU Number Input Card for Barcode Gun & Manual input */}
        <div className="h-20 rounded-xl border border-slate-200 bg-white/60 hover:bg-white/90 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 px-4 py-3 flex items-center gap-3 transition-all duration-300">
          <div className="p-2 rounded-xl bg-zinc-200/85 text-zinc-500">
            <Search className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Input Angka Barcode / SKU</p>
            <input
              type="text"
              placeholder="Ketik kode / scan barcode gun..."
              className="w-full bg-transparent text-sm font-semibold text-zinc-950 placeholder-zinc-400 focus:outline-none mt-0.5"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  findAndAdd(barcodeInput);
                  setBarcodeInput("");
                }
              }}
            />
          </div>
          {barcodeInput.trim() && (
            <Button 
              size="sm"
              className="h-8 rounded-lg px-3 bg-gradient-to-r from-slate-800 to-blue-700 text-white hover:opacity-90 text-xs font-semibold shrink-0 animate-in fade-in zoom-in-95 duration-150 active:scale-90 cursor-pointer"
              onClick={() => {
                findAndAdd(barcodeInput);
                setBarcodeInput("");
              }}
            >
              Tambah
            </Button>
          )}
        </div>
      </div>

      {scanning && (
        <ScannerOverlay 
          onClose={() => setScanning(false)} 
          onDecode={(t) => { 
            setScanning(false); 
            findAndAdd(t); 
          }} 
        />
      )}

      {/* Cart Container Card */}
      <Card className="rounded-2xl border-zinc-200/60 shadow-xs overflow-hidden">
        <CardHeader className="bg-zinc-50/50 border-b border-zinc-150 px-6 py-4">
          <CardTitle className="text-sm font-bold text-zinc-900 flex items-center justify-between">
            <span>Daftar Keranjang Belanja</span>
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              {cart.length} item
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100/80 p-0">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <div className="size-12 rounded-full bg-zinc-50 flex items-center justify-center border border-dashed border-zinc-200 mb-3">
                <ShoppingCart className="size-5 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500 font-medium">Keranjang Belanja Kosong</p>
              <p className="text-xs text-zinc-400 max-w-[240px] mt-1">Scan barcode atau ketik angka SKU untuk memulai transaksi.</p>
            </div>
          )}
          {cart.map(c => (
            <div key={c.item.sku} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-zinc-50/30 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate text-zinc-900 text-sm">{c.item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-zinc-100 text-zinc-500 font-mono px-2 py-0.5 rounded-md border border-zinc-200/50">
                    SKU: {c.item.sku}
                  </span>
                  {c.item.quantity <= 5 && (
                    <span className="text-[9px] bg-amber-50 text-amber-600 font-semibold px-1.5 py-0.5 rounded border border-amber-200/30">
                      Sisa: {c.item.quantity}
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-700 font-extrabold mt-1.5">Rp {Number(c.item.price ?? 0).toLocaleString("id-ID")}</p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-zinc-100/80 sm:border-t-0">
                <div className="flex items-center gap-1.5">
                  <Button size="icon" variant="outline" className="size-8 rounded-lg border-zinc-200 bg-white shadow-xs hover:border-blue-200 active:scale-90 transition-all cursor-pointer" onClick={() => changeQty(c.item.sku, -1)}><Minus className="size-3" /></Button>
                  <span className="w-8 text-center font-bold text-sm tabular-nums text-zinc-800">{c.qty}</span>
                  <Button size="icon" variant="outline" className="size-8 rounded-lg border-zinc-200 bg-white shadow-xs hover:border-blue-200 active:scale-90 transition-all cursor-pointer" onClick={() => changeQty(c.item.sku, +1)}><Plus className="size-3" /></Button>
                </div>
                <Button size="icon" variant="ghost" className="size-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all ml-1 cursor-pointer" onClick={() => setCart(cart.filter(x => x.item.sku !== c.item.sku))}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Checkout Section - Modern POS style with glass and neon glow */}
      {cart.length > 0 && (
        <div className="bg-slate-900 p-6 space-y-4 rounded-2xl border border-slate-800 shadow-xl text-white transition-all overflow-hidden relative">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 size-48 rounded-full bg-blue-500/8 blur-3xl" />
          
          <div className="flex justify-between items-center border-b border-slate-700/60 pb-4 relative z-10">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Total Pembayaran</span>
              <p className="text-slate-500 text-[10px] mt-0.5">Sudah termasuk PPN jika berlaku</p>
            </div>
            <span className="text-3xl font-extrabold tracking-tight tabular-nums text-blue-300 font-mono">
              Rp {total.toLocaleString("id-ID")}
            </span>
          </div>
          
          <Button 
            size="lg" 
            className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-md shadow-blue-900/30 hover:shadow-lg transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 relative z-10 cursor-pointer" 
            onClick={() => checkout.mutate()} 
            disabled={checkout.isPending}
          >
            {checkout.isPending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5 stroke-[3px]" />}
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

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [starting, setStarting] = useState(true);

  // 1. Fetch available cameras on mount
  useEffect(() => {
    let isMounted = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          const formatted = devices.map((d, index) => ({
            id: d.id,
            label: d.label || `Kamera ${index + 1}`
          }));
          setCameras(formatted);
          
          // Try to select environment/back camera automatically
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes("back") || 
            d.label.toLowerCase().includes("rear") || 
            d.label.toLowerCase().includes("environment") || 
            d.label.toLowerCase().includes("belakang")
          );
          setCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraId("environment");
        }
      })
      .catch((err) => {
        console.error("Gagal mendapatkan daftar kamera", err);
        setCameraId("environment");
      });
      
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize and start the live scanner
  useEffect(() => {
    if (!ref.current || !cameraId) return;
    
    let isMounted = true;
    setStarting(true);
    setTorchOn(false);
    setHasTorch(false);
    
    const id = "qr-reader-" + Math.random().toString(36).slice(2);
    ref.current.id = id;
    
    const s = new Html5Qrcode(id);
    scannerRef.current = s;
    
    const config = {
      fps: 15,
      qrbox: (width: number, height: number) => {
        const minEdge = Math.min(width, height);
        // Barcode-friendly rectangular shape (80% width, 45% height)
        return {
          width: Math.floor(minEdge * 0.8),
          height: Math.floor(minEdge * 0.45)
        };
      }
    };
    
    const startPromise = cameraId === "environment"
      ? s.start({ facingMode: "environment" }, config, onDecode, () => {})
      : s.start(cameraId, config, onDecode, () => {});
      
    startPromise
      .then(() => {
        if (!isMounted) {
          s.stop().then(() => s.clear()).catch(() => {});
          return;
        }
        setStarting(false);
        
        // Determine torch capabilities once active
        try {
          const capabilities = s.getRunningTrackCapabilities();
          setHasTorch(!!(capabilities as any).torch);
        } catch (e) {
          console.warn("Lampu senter tidak didukung pada kamera ini", e);
        }
      })
      .catch((e) => {
        if (isMounted) {
          toast.error("Gagal memulai kamera: " + e.message);
          onClose();
        }
      });
      
    return () => {
      isMounted = false;
      if (s.isScanning) {
        s.stop().then(() => s.clear()).catch(() => {});
      } else {
        try {
          s.clear();
        } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !scannerRef.current.isScanning || !hasTorch) return;
    const newTorchState = !torchOn;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newTorchState } as any]
      });
      setTorchOn(newTorchState);
      toast.success(newTorchState ? "Senter dinyalakan" : "Senter dimatikan");
    } catch (e: any) {
      toast.error("Gagal mengontrol senter: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-xl flex flex-col justify-between select-none">
      {/* Overlay Header */}
      <div className="flex justify-between items-center p-5 bg-gradient-to-b from-black/85 to-transparent text-white z-10">
        <div className="flex items-center gap-2.5">
          <Camera className="size-5 text-indigo-400 animate-pulse" />
          <span className="font-bold tracking-tight text-sm sm:text-base">Kamera Pemindai Barcode</span>
        </div>
        <Button size="icon" variant="ghost" className="rounded-xl text-white hover:bg-white/10 active:scale-95 transition-transform" onClick={onClose}>
          <X className="size-6" />
        </Button>
      </div>

      {/* Main Scanner Floating Viewport */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative w-full max-w-[480px] aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900">
          {/* Camera Video View */}
          <div ref={ref} className="absolute inset-0 w-full h-full object-cover" />
          
          {starting && (
            <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center gap-3 z-20">
              <Loader2 className="size-10 animate-spin text-indigo-500" />
              <p className="text-zinc-400 text-xs font-semibold">Mengaktifkan kamera...</p>
            </div>
          )}

          {/* Futuristic Laser Frame Overlay */}
          {!starting && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
              <div className="relative w-[85%] h-[60%] rounded-2xl border border-white/20">
                {/* Neon Corners */}
                <span className="absolute -top-1.5 -left-1.5 size-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl shadow-[0_0_12px_oklch(0.55_0.22_258/0.7)]" />
                <span className="absolute -top-1.5 -right-1.5 size-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl shadow-[0_0_12px_oklch(0.55_0.22_258/0.7)]" />
                <span className="absolute -bottom-1.5 -left-1.5 size-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl shadow-[0_0_12px_oklch(0.55_0.22_258/0.7)]" />
                <span className="absolute -bottom-1.5 -right-1.5 size-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl shadow-[0_0_12px_oklch(0.55_0.22_258/0.7)]" />
                
                {/* Glowing Laser Sweep Line */}
                <div className="scan-line absolute left-2 right-2 top-1/2 h-[3px] rounded-full bg-indigo-500 shadow-[0_0_15px_oklch(0.55_0.22_258)]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Area (Bottom Panel) - Glassmorphic design */}
      <div className="mx-auto w-full max-w-[540px] px-6 pb-8 flex flex-col gap-5 z-10">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          {/* Dynamic camera selection dropdown */}
          {cameras.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pilih Lensa Kamera</label>
              <div className="relative">
                <select 
                  value={cameraId} 
                  onChange={(e) => setCameraId(e.target.value)}
                  className="w-full bg-zinc-900/60 text-zinc-200 rounded-xl border border-white/10 h-11 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer pr-10 hover:bg-zinc-900/80"
                >
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id} className="bg-zinc-950 text-white">{cam.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center text-zinc-400">
                  <RefreshCw className="size-4 animate-spin-hover" />
                </div>
              </div>
            </div>
          )}

          {/* Torch toggle button */}
          {hasTorch && (
            <Button 
              onClick={toggleTorch}
              variant="outline"
              className={`w-full h-12 rounded-xl text-sm border-white/5 transition-all font-semibold active:scale-95 cursor-pointer ${
                torchOn ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/80'
              }`}
            >
              <Flashlight className={`mr-2 size-5 ${torchOn ? 'fill-amber-300 text-amber-300 animate-pulse' : ''}`} />
              {torchOn ? "Matikan Lampu" : "Nyalakan Lampu"}
            </Button>
          )}
          
          <p className="text-zinc-400 text-center text-xs font-semibold">
            Posisikan barcode horizontal di tengah kotak pemindai.
          </p>
        </div>
      </div>
    </div>
  );
}

function StockSection({ onSelectItem }: { onSelectItem: (sku: string) => void }) {
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
    <div className="space-y-5">
      <div className="relative">
        <Input 
          className="rounded-xl h-11 pl-9 border-zinc-200 focus-visible:ring-indigo-500 transition-colors" 
          placeholder="Cari nama atau SKU spareparts..." 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <Search className="size-4" />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-400">
          <Loader2 className="size-7 animate-spin text-violet-600" />
          <p className="text-xs font-semibold">Memuat daftar stok...</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-zinc-500 py-10 font-semibold">
              Tidak ada barang yang cocok.
            </div>
          )}
          {filtered.map(i => {
            let stockColor = "bg-violet-50 text-violet-750 border-violet-200/40";
            if (i.quantity <= 0) {
              stockColor = "bg-rose-50 text-rose-700 border-rose-200/40";
            } else if (i.quantity <= 5) {
              stockColor = "bg-amber-50 text-amber-705 border-amber-200/40";
            }
            
            return (
              <div 
                key={i.id} 
                onClick={() => i.quantity > 0 && onSelectItem(i.sku)}
                className={`flex justify-between items-center rounded-2xl border border-zinc-200/80 bg-white/40 p-4 transition-all duration-200 select-none ${
                  i.quantity <= 0 
                    ? "opacity-60 cursor-not-allowed" 
                    : "cursor-pointer hover:bg-white/70 hover:border-violet-400 hover:shadow-md active:scale-[0.99]"
                }`}
                title={i.quantity <= 0 ? "Stok Habis" : "Klik untuk tambah ke keranjang"}
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-zinc-800 text-sm truncate">{i.name}</p>
                  <p className="text-xs text-zinc-400 font-mono mt-1 font-semibold">{i.sku}</p>
                </div>
                <div className={`text-xs font-bold px-3 py-1 rounded-full border tabular-nums ${stockColor}`}>
                  {i.quantity <= 0 ? "Habis" : `${i.quantity} Unit`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
