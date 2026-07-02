import { useCallback } from "react";
import bwipjs from "bwip-js/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogPortal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sku: string;
  name: string;
}

export function BarcodeModal({ open, onOpenChange, sku, name }: Props) {
  // Use useCallback ref to guarantee canvas rendering once the element mounts in the DOM
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node && sku) {
      try {
        bwipjs.toCanvas(node, {
          bcid: "code128",
          text: sku,
          scale: 2,
          height: 12,
          includetext: true,
          textxalign: "center",
        });
      } catch (e) {
        console.error("Gagal menggambar barcode:", e);
      }
    }
  }, [sku]);

  const printCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
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
        console.error("Gagal menggambar barcode cetak:", e);
      }
    }
  }, [sku]);

  const print = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md print:hidden overflow-hidden">
        <DialogHeader><DialogTitle>Barcode Label — {name}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center justify-center gap-2 py-4 w-full max-w-full overflow-hidden">
          <canvas ref={canvasRef} className="max-w-full h-auto object-contain mx-auto" />
          <p className="text-sm text-muted-foreground mt-1">{sku}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={print}><Printer className="mr-2 size-4" />Cetak</Button>
        </DialogFooter>
      </DialogContent>
      {open && (
        <DialogPortal>
          <div className="print-label">
            <div className="label-name">{name}</div>
            <canvas ref={printCanvasRef} />
          </div>
        </DialogPortal>
      )}
    </Dialog>
  );
}
