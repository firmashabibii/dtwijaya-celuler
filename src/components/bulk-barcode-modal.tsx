import { useCallback, useState } from "react";
import bwipjs from "bwip-js/browser";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface Item {
  id: number;
  name: string;
  sku: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: Item[];
}

// Label dimensions in mm (thermal 50x30)
const LABEL_W = 50;
const LABEL_H = 30;

function generateBarcodeDataUrl(sku: string): string | null {
  try {
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, {
      bcid: "code128",
      text: sku,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function BulkBarcodeModal({ open, onOpenChange, items }: Props) {
  const [loading, setLoading] = useState(false);

  const downloadPdf = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [LABEL_W, LABEL_H],
      });

      items.forEach((item, index) => {
        if (index > 0) doc.addPage([LABEL_W, LABEL_H], "landscape");

        // Draw white background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, LABEL_W, LABEL_H, "F");

        // Draw name text at top
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        const displayName = item.name.length > 30 ? item.name.substring(0, 30) + "…" : item.name;
        doc.text(displayName, LABEL_W / 2, 5, { align: "center" });

        // Draw barcode image
        const dataUrl = generateBarcodeDataUrl(item.sku);
        if (dataUrl) {
          // Center barcode: 40mm wide, 16mm tall, starting at x=5, y=7
          doc.addImage(dataUrl, "PNG", 5, 7, 40, 16);
        }

        // Draw SKU text at bottom
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(item.sku, LABEL_W / 2, 27, { align: "center" });
      });

      doc.save(`barcode-semua-${items.length}-barang.pdf`);
    } catch (err) {
      console.error("Gagal membuat PDF:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cetak Semua Barcode ({items.length} Barang)</DialogTitle>
          <DialogDescription className="sr-only">Unduh seluruh barcode barang dalam bentuk PDF ukuran 50mm x 30mm.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
          {items.map((item) => (
            <BarcodeItem key={item.id} sku={item.sku} name={item.name} />
          ))}
        </div>
        <DialogFooter className="sticky bottom-0 bg-white pt-3 border-t border-zinc-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={downloadPdf} disabled={loading}>
            {loading
              ? <><Loader2 className="mr-2 size-4 animate-spin" />Membuat PDF...</>
              : <><Download className="mr-2 size-4" />Unduh PDF Barcode</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BarcodeItem({ sku, name }: { sku: string; name: string }) {
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node && sku) {
      try {
        bwipjs.toCanvas(node, {
          bcid: "code128",
          text: sku,
          scale: 2,
          height: 10,
          includetext: true,
          textxalign: "center",
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [sku]);

  return (
    <div className="flex flex-col items-center p-3 border border-zinc-200 rounded-xl bg-zinc-50/50 shadow-xs">
      <p className="text-xs font-bold text-zinc-700 truncate w-full text-center mb-2" title={name}>
        {name}
      </p>
      <canvas ref={canvasRef} className="max-w-full h-auto" />
    </div>
  );
}
