import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import { useEffect } from "react";

interface HoldLabelPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialName: string;
  lotNumber: string;
  internalLotNumber?: string;
  holdReason?: string;
}

export function HoldLabelPrint({ 
  open, 
  onOpenChange, 
  materialName, 
  lotNumber,
  internalLotNumber,
  holdReason 
}: HoldLabelPrintProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const internalBarcodeRef = useRef<SVGSVGElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && barcodeRef.current && lotNumber) {
      try {
        JsBarcode(barcodeRef.current, lotNumber, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          textMargin: 3
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }

    if (open && internalBarcodeRef.current && internalLotNumber) {
      try {
        JsBarcode(internalBarcodeRef.current, internalLotNumber, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          textMargin: 3
        });
      } catch (error) {
        console.error("Error generating internal barcode:", error);
      }
    }
  }, [open, lotNumber, internalLotNumber]);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Hold Label - ${lotNumber}</title>
            <style>
              @page {
                size: 4in 3in;
                margin: 0.25in;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0.5in;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .label-container {
                border: 4px solid #dc2626;
                border-radius: 8px;
                padding: 16px;
                width: 100%;
                max-width: 3.5in;
                box-sizing: border-box;
              }
              .warning-header {
                background-color: #dc2626;
                color: white;
                padding: 12px;
                text-align: center;
                margin: -16px -16px 16px -16px;
                border-radius: 4px 4px 0 0;
              }
              .warning-header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 2px;
              }
              .warning-icon {
                font-size: 32px;
                margin-bottom: 4px;
              }
              .material-name {
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 12px;
                color: #1f2937;
              }
              .barcode-container {
                text-align: center;
                margin: 12px 0;
              }
              .barcode-container svg {
                max-width: 100%;
                height: auto;
              }
              .lot-label {
                font-size: 11px;
                font-weight: bold;
                color: #374151;
                margin-bottom: 2px;
              }
              .barcodes-row {
                display: flex;
                gap: 12px;
                justify-content: center;
                align-items: flex-start;
              }
              .barcode-item {
                text-align: center;
                flex: 1;
              }
              .hold-reason {
                font-size: 12px;
                color: #4b5563;
                text-align: center;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid #e5e7eb;
              }
              .do-not-use {
                background-color: #fef2f2;
                border: 2px dashed #dc2626;
                color: #dc2626;
                padding: 8px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
                margin-top: 12px;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Hold Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div 
            ref={printRef}
            className="border-4 border-destructive rounded-lg overflow-hidden"
          >
            {/* Warning Header */}
            <div className="bg-destructive text-destructive-foreground p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold tracking-widest">ON HOLD</h2>
            </div>

            {/* Label Content */}
            <div className="p-4 bg-white">
              {/* Material Name */}
              <div className="text-center mb-3">
                <p className="text-lg font-bold text-foreground">{materialName}</p>
              </div>

              {/* Barcodes */}
              <div className="flex gap-3 justify-center my-3">
                {/* Supplier Lot */}
                <div className="flex-1 text-center">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Supplier Lot#</p>
                  <svg ref={barcodeRef} />
                </div>

                {/* Internal Lot */}
                {internalLotNumber && (
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Internal Lot#</p>
                    <svg ref={internalBarcodeRef} />
                  </div>
                )}
              </div>

              {/* Hold Reason */}
              {holdReason && (
                <div className="text-center text-sm text-muted-foreground border-t pt-2 mt-2">
                  <p>Reason: {holdReason}</p>
                </div>
              )}

              {/* Do Not Use Warning */}
              <div className="bg-destructive/10 border-2 border-dashed border-destructive text-destructive p-2 text-center font-bold text-sm mt-3 rounded">
                ⚠️ DO NOT USE ⚠️
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Label
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}