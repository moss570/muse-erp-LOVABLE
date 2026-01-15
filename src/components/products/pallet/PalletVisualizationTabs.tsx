import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Grid3X3, Eye } from "lucide-react";
import { PalletTopView } from "./PalletTopView";
import { PalletSideViews } from "./PalletSideViews";
import { Pallet3DView } from "./Pallet3DView";
import { OverhangResult } from "@/lib/palletCalculations";

type ViewMode = 'top' | 'side' | '3d';

interface PalletVisualizationTabsProps {
  ti: number;
  hi: number;
  boxLengthIn: number;
  boxWidthIn: number;
  boxHeightIn: number;
  palletLengthIn: number;
  palletWidthIn: number;
  overhang?: OverhangResult | null;
}

export function PalletVisualizationTabs({
  ti,
  hi,
  boxLengthIn,
  boxWidthIn,
  boxHeightIn,
  palletLengthIn,
  palletWidthIn,
  overhang,
}: PalletVisualizationTabsProps) {
  const [activeView, setActiveView] = useState<ViewMode>('top');
  const [showGrid, setShowGrid] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);

  const handleExport = () => {
    // Get the SVG element based on current view
    const svgElement = document.querySelector(`[data-view="${activeView}"] svg`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `pallet-${activeView}-view.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <Card>
      <CardHeader className="py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Pallet Visualization</CardTitle>
          <div className="flex items-center gap-2">
            {activeView !== '3d' && (
              <>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="show-grid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                    className="scale-75"
                  />
                  <Label htmlFor="show-grid" className="text-xs cursor-pointer">
                    <Grid3X3 className="h-3 w-3" />
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="show-dims"
                    checked={showDimensions}
                    onCheckedChange={setShowDimensions}
                    className="scale-75"
                  />
                  <Label htmlFor="show-dims" className="text-xs cursor-pointer">
                    <Eye className="h-3 w-3" />
                  </Label>
                </div>
              </>
            )}
            {activeView !== '3d' && (
              <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 px-2">
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewMode)}>
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="top" className="text-xs">Top View</TabsTrigger>
            <TabsTrigger value="side" className="text-xs">Side Views</TabsTrigger>
            <TabsTrigger value="3d" className="text-xs">3D View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="top" className="mt-0" data-view="top">
            <div className="flex justify-center">
              <PalletTopView
                ti={ti}
                boxLengthIn={boxLengthIn}
                boxWidthIn={boxWidthIn}
                palletLengthIn={palletLengthIn}
                palletWidthIn={palletWidthIn}
                overhang={overhang}
                showGrid={showGrid}
                showDimensions={showDimensions}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="side" className="mt-0" data-view="side">
            <PalletSideViews
              ti={ti}
              hi={hi}
              boxLengthIn={boxLengthIn}
              boxWidthIn={boxWidthIn}
              boxHeightIn={boxHeightIn}
              palletLengthIn={palletLengthIn}
              palletWidthIn={palletWidthIn}
            />
          </TabsContent>
          
          <TabsContent value="3d" className="mt-0" data-view="3d">
            <Pallet3DView
              ti={ti}
              hi={hi}
              boxLengthIn={boxLengthIn}
              boxWidthIn={boxWidthIn}
              boxHeightIn={boxHeightIn}
              palletLengthIn={palletLengthIn}
              palletWidthIn={palletWidthIn}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
