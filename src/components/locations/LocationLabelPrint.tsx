import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, MapPin } from "lucide-react";
import JsBarcode from "jsbarcode";

interface LocationLabelPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationCode: string;
  locationName: string;
  locationBarcode: string;
  locationType?: string;
  zone?: string;
}

const getLocationTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    'production': 'Production Area',
    'dry_warehouse': 'Dry Warehouse',
    'cooler': 'Cooler Warehouse',
    'freezer': 'Onsite Freezer',
    '3pl': '3rd Party Storage',
    'shipping': 'Shipping Dock',
    'receiving': 'Receiving Dock',
  };
  return types[type] || type;
};

export function LocationLabelPrint({ 
  open, 
  onOpenChange, 
  locationCode,
  locationName,
  locationBarcode,
  locationType,
  zone
}: LocationLabelPrintProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      if (barcodeRef.current && locationBarcode) {
        try {
          JsBarcode(barcodeRef.current, locationBarcode, {
            format: "CODE128",
            width: 3,
            height: 60,
            displayValue: true,
            fontSize: 16,
            margin: 10,
            textMargin: 5,
            font: "monospace",
            fontOptions: "bold"
          });
        } catch (error) {
          console.error("Error generating barcode:", error);
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [open, locationBarcode]);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=500,height=400');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Location Label - ${locationCode}</title>
            <style>
              @page {
                size: 4in 2in;
                margin: 0.15in;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0.25in;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .label-container {
                border: 3px solid #1f2937;
                border-radius: 8px;
                padding: 12px;
                width: 100%;
                max-width: 3.7in;
                box-sizing: border-box;
                background: white;
              }
              .location-header {
                background-color: #1e40af;
                color: white;
                padding: 8px 12px;
                text-align: center;
                margin: -12px -12px 12px -12px;
                border-radius: 5px 5px 0 0;
              }
              .location-header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 1px;
                font-family: monospace;
              }
              .location-name {
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 8px;
                color: #1f2937;
              }
              .location-type {
                font-size: 12px;
                color: #6b7280;
                text-align: center;
                margin-bottom: 10px;
              }
              .barcode-container {
                text-align: center;
                margin: 8px 0;
                background: white;
                padding: 5px;
              }
              .barcode-container svg {
                max-width: 100%;
                height: auto;
              }
              .scan-instruction {
                font-size: 11px;
                color: #6b7280;
                text-align: center;
                margin-top: 8px;
                font-style: italic;
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
            Print Location Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div 
            ref={printRef}
            className="border-2 border-foreground rounded-lg overflow-hidden"
          >
            {/* Header with Location Code */}
            <div className="bg-primary text-primary-foreground p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-wide font-mono">{locationCode}</h2>
            </div>

            {/* Label Content */}
            <div className="p-4 bg-background">
              {/* Location Name */}
              <div className="text-center mb-2">
                <p className="text-base font-semibold text-foreground">{locationName}</p>
              </div>

              {/* Location Type */}
              {locationType && (
                <div className="text-center mb-3">
                  <p className="text-sm text-muted-foreground">
                    {getLocationTypeLabel(locationType)}
                    {zone && ` • ${zone}`}
                  </p>
                </div>
              )}

              {/* Barcode */}
              <div className="text-center my-3 bg-white p-2 rounded">
                <svg ref={barcodeRef} />
              </div>

              {/* Scan instruction */}
              <div className="text-center text-xs text-muted-foreground italic mt-2">
                Scan to confirm location
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
