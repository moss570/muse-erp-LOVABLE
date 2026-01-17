import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, Printer } from 'lucide-react';
import { NutritionFactsLabel, NutritionData } from './NutritionFactsLabel';
import { toast } from 'sonner';

interface NutritionLabelExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  nutritionData: NutritionData | null;
}

type LabelFormat = 'standard' | 'linear' | 'tabular' | 'dual-column';

export function NutritionLabelExportDialog({
  open,
  onOpenChange,
  productName,
  nutritionData,
}: NutritionLabelExportDialogProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showOptionalNutrients, setShowOptionalNutrients] = useState(false);
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('standard');
  const [dpi, setDpi] = useState<number>(300);
  const [servingSize, setServingSize] = useState(nutritionData?.servingSize || '');
  const [servingsPerContainer, setServingsPerContainer] = useState(nutritionData?.servingsPerContainer || '');

  const getScaleFactor = useCallback(() => {
    // Base is 96 DPI (standard screen), scale up for print quality
    return dpi / 96;
  }, [dpi]);

  const handleExportPNG = useCallback(async () => {
    if (!labelRef.current || !nutritionData) return;

    setIsExporting(true);
    try {
      const scale = getScaleFactor();
      
      const dataUrl = await toPng(labelRef.current, {
        quality: 1,
        pixelRatio: scale,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${productName.replace(/\s+/g, '-').toLowerCase()}-nutrition-facts-${dpi}dpi.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Nutrition label exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export nutrition label');
    } finally {
      setIsExporting(false);
    }
  }, [nutritionData, productName, dpi, getScaleFactor]);

  const handlePrint = useCallback(() => {
    if (!labelRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const labelHtml = labelRef.current.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nutrition Facts - ${productName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            @page { size: auto; margin: 10mm; }
          }
          body {
            font-family: Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        ${labelHtml}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [productName]);

  if (!nutritionData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Nutrition Label</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            No nutrition data available. Please calculate nutrition first.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const labelData: NutritionData = {
    ...nutritionData,
    servingSize: servingSize || nutritionData.servingSize,
    servingsPerContainer: servingsPerContainer || nutritionData.servingsPerContainer,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Nutrition Facts Label</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Settings */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium">Label Settings</h3>
              
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="servingSize">Serving Size</Label>
                    <Input
                      id="servingSize"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="e.g., 2/3 cup (55g)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servingsPerContainer">Servings Per Container</Label>
                    <Input
                      id="servingsPerContainer"
                      value={servingsPerContainer}
                      onChange={(e) => setServingsPerContainer(e.target.value)}
                      placeholder="e.g., 8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Label Format</Label>
                  <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as LabelFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Vertical</SelectItem>
                      <SelectItem value="linear" disabled>Linear (Coming Soon)</SelectItem>
                      <SelectItem value="tabular" disabled>Tabular (Coming Soon)</SelectItem>
                      <SelectItem value="dual-column" disabled>Dual Column (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Export Resolution</Label>
                  <Select value={dpi.toString()} onValueChange={(v) => setDpi(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="150">150 DPI (Screen)</SelectItem>
                      <SelectItem value="300">300 DPI (Print Quality)</SelectItem>
                      <SelectItem value="600">600 DPI (High Quality Print)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    300 DPI recommended for package printing
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Optional Nutrients</Label>
                    <p className="text-xs text-muted-foreground">
                      Display additional vitamins and minerals
                    </p>
                  </div>
                  <Switch
                    checked={showOptionalNutrients}
                    onCheckedChange={setShowOptionalNutrients}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Export Options</h3>
              <div className="flex gap-2">
                <Button onClick={handleExportPNG} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PNG ({dpi} DPI)
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <h3 className="font-medium">Preview</h3>
            <div className="border rounded-lg p-4 bg-muted/50 flex justify-center">
              <NutritionFactsLabel
                ref={labelRef}
                data={labelData}
                productName={productName}
                showOptionalNutrients={showOptionalNutrients}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              FDA 2020 compliant format
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
