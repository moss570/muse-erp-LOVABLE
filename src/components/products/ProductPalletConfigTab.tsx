import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProductSizes, ProductSize } from "@/hooks/useProductSizes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Layers, Scale, Box, Save } from "lucide-react";
import { toast } from "sonner";
import { PalletVisualizer } from "./PalletVisualizer";

interface ProductPalletConfigTabProps {
  productId: string;
}

interface BoxMaterial {
  id: string;
  code: string;
  name: string;
  box_weight_kg: number | null;
  box_length_in: number | null;
  box_width_in: number | null;
  box_height_in: number | null;
}

const STANDARD_PALLET_WEIGHT_KG = 20; // Standard wooden pallet ~20kg

export function ProductPalletConfigTab({ productId }: ProductPalletConfigTabProps) {
  const queryClient = useQueryClient();
  const { sizes, isLoading: loadingSizes } = useProductSizes(productId);
  
  // Selected size state
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  
  // Form state for pallet configuration
  const [boxMaterialId, setBoxMaterialId] = useState<string>("");
  const [unitsPerCase, setUnitsPerCase] = useState<number>(1);
  const [tiCount, setTiCount] = useState<number | null>(null);
  const [hiCount, setHiCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch box materials with dimensions
  const { data: boxMaterials = [], isLoading: loadingBoxes } = useQuery({
    queryKey: ["box-materials-with-dims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, code, name, box_weight_kg, box_length_in, box_width_in, box_height_in")
        .eq("category", "Boxes")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as BoxMaterial[];
    },
  });

  // Fetch container sizes for target weight lookup
  const { data: containerSizes = [], isLoading: loadingContainers } = useQuery({
    queryKey: ["container-sizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("container_sizes")
        .select("id, name, sku_code, volume_gallons, target_weight_kg")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  // Get selected size details
  const selectedSize = useMemo(() => {
    return sizes.find(s => s.id === selectedSizeId) as (ProductSize & {
      packaging_material_id?: string;
      ti_count?: number;
      hi_count?: number;
      box_material_id?: string;
    }) | undefined;
  }, [sizes, selectedSizeId]);

  // Get the target weight from container size matching the selected size's size_value (volume)
  const targetWeightKg = useMemo(() => {
    if (!selectedSize) return null;
    // Match by size_value (volume in gallons) to container_sizes
    const container = containerSizes.find(c => 
      Math.abs(c.volume_gallons - selectedSize.size_value) < 0.001
    );
    return container?.target_weight_kg ?? null;
  }, [selectedSize, containerSizes]);

  // Get selected box material details
  const selectedBox = useMemo(() => {
    return boxMaterials.find(b => b.id === boxMaterialId);
  }, [boxMaterials, boxMaterialId]);

  // Initialize form when size changes
  useEffect(() => {
    if (selectedSize) {
      setBoxMaterialId((selectedSize as any).packaging_material_id || (selectedSize as any).box_material_id || "");
      setUnitsPerCase(selectedSize.units_per_case || 1);
      setTiCount((selectedSize as any).ti_count || null);
      setHiCount((selectedSize as any).hi_count || null);
    }
  }, [selectedSize]);

  // Auto-select first active size
  useEffect(() => {
    if (sizes.length > 0 && !selectedSizeId) {
      const activeSize = sizes.find(s => s.is_active) || sizes[0];
      setSelectedSizeId(activeSize.id);
    }
  }, [sizes, selectedSizeId]);

  // Calculate case cube (in cubic feet) from inches
  const caseCubeFt3 = useMemo(() => {
    if (!selectedBox?.box_length_in || !selectedBox?.box_width_in || !selectedBox?.box_height_in) {
      return null;
    }
    // Convert cubic inches to cubic feet (1 ft³ = 1728 in³)
    const volumeIn3 = selectedBox.box_length_in * selectedBox.box_width_in * selectedBox.box_height_in;
    return volumeIn3 / 1728;
  }, [selectedBox]);

  // Calculate case cube in m³ for storage
  const caseCubeM3 = useMemo(() => {
    if (!caseCubeFt3) return null;
    return caseCubeFt3 / 35.3147; // ft³ to m³
  }, [caseCubeFt3]);

  // Calculate case weight: (units × target weight) + box weight
  const caseWeightKg = useMemo(() => {
    if (!targetWeightKg || !unitsPerCase) return null;
    
    const productWeight = unitsPerCase * targetWeightKg;
    const boxWeight = selectedBox?.box_weight_kg || 0;
    return productWeight + boxWeight;
  }, [targetWeightKg, unitsPerCase, selectedBox]);

  // Calculate cases per pallet
  const casesPerPallet = useMemo(() => {
    if (!tiCount || !hiCount) return null;
    return tiCount * hiCount;
  }, [tiCount, hiCount]);

  // Calculate total pallet weight
  const palletWeightKg = useMemo(() => {
    if (!caseWeightKg || !casesPerPallet) return null;
    return (caseWeightKg * casesPerPallet) + STANDARD_PALLET_WEIGHT_KG;
  }, [caseWeightKg, casesPerPallet]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSizeId) throw new Error("No size selected");
      
      const { error } = await supabase
        .from("product_sizes")
        .update({
          packaging_material_id: boxMaterialId || null,
          units_per_case: unitsPerCase,
          ti_count: tiCount,
          hi_count: hiCount,
          case_weight_kg: caseWeightKg,
          case_cube_m3: caseCubeM3,
        })
        .eq("id", selectedSizeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-sizes", productId] });
      toast.success("Pallet configuration saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingSizes || loadingBoxes || loadingContainers) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sizes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No product sizes configured.</p>
          <p className="text-sm mt-1">Add sizes in the "Sizes & UPC" tab first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Size Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Product Size
          </CardTitle>
          <CardDescription>
            Configure pallet settings for each product size
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedSizeId} onValueChange={setSelectedSizeId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a size to configure" />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((size) => (
                <SelectItem key={size.id} value={size.id}>
                  {size.size_name} ({size.size_value} {size.size_unit?.code || ""})
                  {size.is_default && <Badge variant="secondary" className="ml-2">Default</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSize && (
        <>
          {/* Case Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5" />
                Case Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Box Material</Label>
                  <Select 
                    value={boxMaterialId || "__none__"} 
                    onValueChange={(v) => setBoxMaterialId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select box material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None selected</SelectItem>
                      {boxMaterials.map((mat) => (
                        <SelectItem key={mat.id} value={mat.id}>
                          {mat.code} - {mat.name}
                          {mat.box_length_in && mat.box_width_in && mat.box_height_in && (
                            <span className="text-muted-foreground ml-1">
                              ({mat.box_length_in}×{mat.box_width_in}×{mat.box_height_in}")
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBox && !selectedBox.box_length_in && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Box dimensions not set. Configure in Materials settings.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Units Per Case</Label>
                  <Input
                    type="number"
                    min="1"
                    value={unitsPerCase}
                    onChange={(e) => setUnitsPerCase(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <Separator />

              {/* Calculated Values */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Case Cube</Label>
                  <p className="text-lg font-semibold">
                    {caseCubeFt3 ? `${caseCubeFt3.toFixed(3)} ft³` : "—"}
                  </p>
                  {caseCubeM3 && (
                    <p className="text-xs text-muted-foreground">
                      {caseCubeM3.toFixed(6)} m³
                    </p>
                  )}
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Case Weight</Label>
                  <p className="text-lg font-semibold">
                    {caseWeightKg ? `${caseWeightKg.toFixed(2)} kg` : "—"}
                  </p>
                  {caseWeightKg && (
                    <p className="text-xs text-muted-foreground">
                      {(caseWeightKg * 2.20462).toFixed(2)} lbs
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pallet Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Pallet Configuration
              </CardTitle>
              <CardDescription>
                Standard 48" × 40" pallet (GMA/ISO)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ti (Cases per Layer)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g., 8"
                    value={tiCount ?? ""}
                    onChange={(e) => setTiCount(e.target.value ? parseInt(e.target.value) : null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of cases that fit in one layer
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Hi (Number of Layers)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="e.g., 5"
                    value={hiCount ?? ""}
                    onChange={(e) => setHiCount(e.target.value ? parseInt(e.target.value) : null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of stacked layers on pallet
                  </p>
                </div>
              </div>

              <Separator />

              {/* Pallet Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Cases per Pallet</Label>
                  <p className="text-xl font-bold text-primary">
                    {casesPerPallet ?? "—"}
                  </p>
                  {tiCount && hiCount && (
                    <p className="text-xs text-muted-foreground">
                      {tiCount} Ti × {hiCount} Hi
                    </p>
                  )}
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-muted-foreground text-xs">Total Units</Label>
                  <p className="text-xl font-bold">
                    {casesPerPallet ? casesPerPallet * unitsPerCase : "—"}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground text-xs">Pallet Weight</Label>
                    <p className="text-xl font-bold">
                      {palletWeightKg ? `${palletWeightKg.toFixed(1)} kg` : "—"}
                    </p>
                    {palletWeightKg && (
                      <p className="text-xs text-muted-foreground">
                        {(palletWeightKg * 2.20462).toFixed(1)} lbs
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual Representation */}
          {selectedBox?.box_length_in && selectedBox?.box_width_in && selectedBox?.box_height_in && tiCount && hiCount && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pallet Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <PalletVisualizer
                  ti={tiCount}
                  hi={hiCount}
                  boxLengthIn={selectedBox.box_length_in}
                  boxWidthIn={selectedBox.box_width_in}
                  boxHeightIn={selectedBox.box_height_in}
                />
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Pallet Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
