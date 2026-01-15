import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Printer, FileText, QrCode, Package, Barcode } from "lucide-react";
import JsBarcode from "jsbarcode";

interface PalletLabelData {
  productName: string;
  productSku: string;
  sizeName: string;
  caseUpc?: string;
  tubUpc?: string;
  ti: number;
  hi: number;
  casesPerPallet: number;
  unitsPerCase: number;
  totalUnits: number;
  palletWeightKg?: number;
  palletWeightLbs?: number;
  caseWeightKg?: number;
  boxDimensions?: string;
  palletType: string;
  stackHeightIn?: number;
}

interface PalletLabelPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PalletLabelData;
}

type LabelSize = '4x6' | '4x4' | '6x4';

const LABEL_SIZES: { value: LabelSize; label: string; width: string; height: string }[] = [
  { value: '4x6', label: '4" × 6" (Shipping)', width: '4in', height: '6in' },
  { value: '4x4', label: '4" × 4" (Square)', width: '4in', height: '4in' },
  { value: '6x4', label: '6" × 4" (Landscape)', width: '6in', height: '4in' },
];

export function PalletLabelPrintDialog({
  open,
  onOpenChange,
  data,
}: PalletLabelPrintDialogProps) {
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState<LabelSize>('4x6');
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includeTiHi, setIncludeTiHi] = useState(true);
  const [includeWeight, setIncludeWeight] = useState(true);
  const [includeDimensions, setIncludeDimensions] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const selectedLabelSize = useMemo(() => 
    LABEL_SIZES.find(s => s.value === labelSize) || LABEL_SIZES[0]
  , [labelSize]);

  const generateLabelHtml = (): string => {
    const { width, height } = selectedLabelSize;
    const isLandscape = labelSize === '6x4';
    
    // Determine barcode value (prefer case UPC/GTIN-14)
    const barcodeValue = data.caseUpc || data.tubUpc || data.productSku;
    const barcodeFormat = data.caseUpc && data.caseUpc.length === 14 ? 'ITF14' : 
                          data.caseUpc && data.caseUpc.length === 12 ? 'UPC' : 'CODE128';

    return `
      <div class="pallet-label" style="
        width: ${width};
        height: ${height};
        padding: 0.15in;
        font-family: Arial, sans-serif;
        border: 1px solid #000;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        page-break-after: always;
      ">
        <!-- Header -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 0.1in;
          margin-bottom: 0.1in;
        ">
          <div style="flex: 1;">
            <div style="font-size: ${isLandscape ? '14pt' : '16pt'}; font-weight: bold; line-height: 1.2;">
              ${data.productName}
            </div>
            <div style="font-size: ${isLandscape ? '10pt' : '11pt'}; color: #333;">
              ${data.sizeName} - SKU: ${data.productSku}
            </div>
          </div>
        </div>

        <!-- Ti × Hi Section -->
        ${includeTiHi ? `
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f5f5f5;
          padding: 0.15in;
          margin-bottom: 0.1in;
          border-radius: 4px;
        ">
          <div style="text-align: center;">
            <div style="font-size: ${isLandscape ? '24pt' : '32pt'}; font-weight: bold; line-height: 1;">
              ${data.ti} × ${data.hi}
            </div>
            <div style="font-size: ${isLandscape ? '10pt' : '11pt'}; color: #666; margin-top: 2px;">
              Ti × Hi
            </div>
          </div>
          <div style="
            width: 1px;
            height: 40px;
            background: #ccc;
            margin: 0 0.25in;
          "></div>
          <div style="text-align: center;">
            <div style="font-size: ${isLandscape ? '18pt' : '22pt'}; font-weight: bold; color: #0066cc;">
              ${data.casesPerPallet}
            </div>
            <div style="font-size: ${isLandscape ? '9pt' : '10pt'}; color: #666;">
              Cases/Pallet
            </div>
          </div>
          <div style="
            width: 1px;
            height: 40px;
            background: #ccc;
            margin: 0 0.25in;
          "></div>
          <div style="text-align: center;">
            <div style="font-size: ${isLandscape ? '16pt' : '18pt'}; font-weight: bold;">
              ${data.totalUnits}
            </div>
            <div style="font-size: ${isLandscape ? '9pt' : '10pt'}; color: #666;">
              Total Units
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Specifications Grid -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.08in;
          font-size: ${isLandscape ? '9pt' : '10pt'};
          margin-bottom: 0.1in;
        ">
          ${includeWeight && data.palletWeightLbs ? `
            <div style="display: flex; justify-content: space-between; padding: 3px 6px; background: #f9f9f9; border-radius: 2px;">
              <span style="color: #666;">Pallet Weight:</span>
              <span style="font-weight: 600;">${data.palletWeightLbs.toFixed(0)} lbs</span>
            </div>
          ` : ''}
          ${includeWeight && data.caseWeightKg ? `
            <div style="display: flex; justify-content: space-between; padding: 3px 6px; background: #f9f9f9; border-radius: 2px;">
              <span style="color: #666;">Case Weight:</span>
              <span style="font-weight: 600;">${(data.caseWeightKg * 2.20462).toFixed(1)} lbs</span>
            </div>
          ` : ''}
          ${includeDimensions && data.stackHeightIn ? `
            <div style="display: flex; justify-content: space-between; padding: 3px 6px; background: #f9f9f9; border-radius: 2px;">
              <span style="color: #666;">Stack Height:</span>
              <span style="font-weight: 600;">${data.stackHeightIn.toFixed(1)}"</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 3px 6px; background: #f9f9f9; border-radius: 2px;">
            <span style="color: #666;">Units/Case:</span>
            <span style="font-weight: 600;">${data.unitsPerCase}</span>
          </div>
          ${includeDimensions && data.boxDimensions ? `
            <div style="display: flex; justify-content: space-between; padding: 3px 6px; background: #f9f9f9; border-radius: 2px; grid-column: span 2;">
              <span style="color: #666;">Case Dims:</span>
              <span style="font-weight: 600;">${data.boxDimensions}</span>
            </div>
          ` : ''}
        </div>

        <!-- Barcode Section -->
        ${includeBarcode && barcodeValue ? `
        <div style="
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0.1in;
          border-top: 1px solid #ddd;
        ">
          <div class="barcode-container" 
               data-value="${barcodeValue}" 
               data-format="${barcodeFormat}"
               data-width="${isLandscape ? '280' : '220'}"
               style="text-align: center;">
          </div>
          <div style="font-size: 10pt; font-family: monospace; margin-top: 4px; letter-spacing: 1px;">
            ${barcodeValue}
          </div>
          ${data.caseUpc ? `
            <div style="font-size: 8pt; color: #666; margin-top: 2px;">
              GTIN-14 (Case)
            </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="
          display: flex;
          justify-content: space-between;
          font-size: 8pt;
          color: #888;
          border-top: 1px solid #ddd;
          padding-top: 0.05in;
          margin-top: auto;
        ">
          <span>Pallet: ${data.palletType.replace('_', ' ')}</span>
          <span>Printed: ${new Date().toLocaleDateString()}</span>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    setIsPrinting(true);

    const labelHtml = generateLabelHtml();
    const labelsHtml = Array(copies).fill(labelHtml).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Pallet Labels</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            .pallet-label { page-break-after: always; }
            .pallet-label:last-child { page-break-after: auto; }
          }
          @page {
            size: ${selectedLabelSize.width} ${selectedLabelSize.height};
            margin: 0;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 0.25in;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          // Render barcodes
          document.querySelectorAll('.barcode-container').forEach(function(container) {
            var value = container.getAttribute('data-value') || '123456789';
            var format = container.getAttribute('data-format') || 'CODE128';
            var containerWidth = parseInt(container.getAttribute('data-width') || '200');
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            container.appendChild(svg);
            try {
              JsBarcode(svg, value, {
                format: format,
                width: 2,
                height: 50,
                displayValue: false,
                margin: 0,
              });
            } catch (e) {
              // Fallback to CODE128 if format fails
              try {
                JsBarcode(svg, value, {
                  format: 'CODE128',
                  width: 2,
                  height: 50,
                  displayValue: false,
                  margin: 0,
                });
              } catch (e2) {
                container.innerHTML = '<span style="color: red;">Barcode Error</span>';
              }
            }
          });

          // Trigger print after short delay for barcode rendering
          setTimeout(function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }, 300);
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
    setIsPrinting(false);
  };

  const handlePreview = () => {
    const labelHtml = generateLabelHtml();

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) return;

    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label Preview</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex;
            justify-content: center;
            padding: 1in;
            background: #f0f0f0;
          }
        </style>
      </head>
      <body>
        ${labelHtml}
        <script>
          document.querySelectorAll('.barcode-container').forEach(function(container) {
            var value = container.getAttribute('data-value') || '123456789';
            var format = container.getAttribute('data-format') || 'CODE128';
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            container.appendChild(svg);
            try {
              JsBarcode(svg, value, {
                format: format,
                width: 2,
                height: 50,
                displayValue: false,
                margin: 0,
              });
            } catch (e) {
              try {
                JsBarcode(svg, value, {
                  format: 'CODE128',
                  width: 2,
                  height: 50,
                  displayValue: false,
                  margin: 0,
                });
              } catch (e2) {
                container.innerHTML = '<span style="color: red;">Barcode Error</span>';
              }
            }
          });
        </script>
      </body>
      </html>
    `);
    previewWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Pallet Labels
          </DialogTitle>
          <DialogDescription>
            Configure and print pallet specification labels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info Preview */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-1">
            <div className="font-medium">{data.productName}</div>
            <div className="text-sm text-muted-foreground">
              {data.sizeName} • {data.ti}×{data.hi} = {data.casesPerPallet} cases
            </div>
          </div>

          <Separator />

          {/* Label Size */}
          <div className="space-y-2">
            <Label>Label Size</Label>
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Copies */}
          <div className="space-y-2">
            <Label>Number of Copies</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <Separator />

          {/* Content Options */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">Include on Label</Label>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Barcode (GTIN-14)</span>
              </div>
              <Switch checked={includeBarcode} onCheckedChange={setIncludeBarcode} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Ti × Hi Layout</span>
              </div>
              <Switch checked={includeTiHi} onCheckedChange={setIncludeTiHi} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Weight Info</span>
              </div>
              <Switch checked={includeWeight} onCheckedChange={setIncludeWeight} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Dimensions</span>
              </div>
              <Switch checked={includeDimensions} onCheckedChange={setIncludeDimensions} />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePreview}>
            Preview
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting}>
            <Printer className="h-4 w-4 mr-2" />
            Print Labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
