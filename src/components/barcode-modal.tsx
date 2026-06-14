import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sku: string;
  name: string;
}

export function BarcodeModal({ open, onOpenChange, sku, name }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !sku) return;
    const draw = (c: HTMLCanvasElement | null, scale: number, height: number) => {
      if (!c) return;
      try {
        bwipjs.toCanvas(c, {
          bcid: "code128", text: sku, scale, height, includetext: true, textxalign: "center",
        });
      } catch (e) { console.error(e); }
    };
    draw(canvasRef.current, 3, 12);
    draw(printRef.current, 2, 10);
  }, [open, sku]);

  const print = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md print:hidden">
        <DialogHeader><DialogTitle>Barcode Label — {name}</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-2 py-4">
          <canvas ref={canvasRef} />
          <p className="text-sm text-muted-foreground">{sku}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={print}><Printer className="mr-2 size-4" />Cetak</Button>
        </DialogFooter>
      </DialogContent>
      {open && (
        <div className="print-label hidden print:block">
          <div className="label-name">{name}</div>
          <canvas ref={printRef} />
        </div>
      )}
    </Dialog>
  );
}
