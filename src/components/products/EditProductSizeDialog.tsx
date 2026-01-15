import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContainerSizes } from "@/hooks/useContainerSizes";
import { usePackagingIndicators } from "@/hooks/usePackagingIndicators";
import { useProductSizes, ProductSize } from "@/hooks/useProductSizes";
import { generateProductSizeSKU } from "@/lib/skuGenerator";
import { generateUPCPair } from "@/lib/upcGenerator";
import {
  validateTiConfiguration,
  calculateOverhang,
  getOverhangSeverity,
  getOverhangColorClass,
  calculatePalletMetrics,
  getHeightWarning,
  PALLET_TYPES,
} from "@/lib/palletCalculations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Loader2, Wand2, Layers, Scale, AlertTriangle, CheckCircle2, Package, Box, Ruler } from "lucide-react";
import { toast } from "sonner";
import { PalletVisualizer } from "./PalletVisualizer";

const STANDARD_PALLET_WEIGHT_KG = 20; // Standard wooden pallet ~20kg

interface EditProductSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productSku: string;
  size: ProductSize | null;
  onSave: () => void;
}

export function EditProductSizeDialog({
  open,
  onOpenChange,
  productId,
  productSku,
  size,
  onSave,
}: EditProductSizeDialogProps) {
  const isEditing = !!size;
  const { activeContainerSizes, isLoading: loadingContainers } = useContainerSizes();
  const { data: packagingIndicators = [] } = usePackagingIndicators();
  const { createSize, updateSize } = useProductSizes(productId);

  // Form state
  const [containerSizeId, setContainerSizeId] = useState<string>("");
  const [unitsPerCase, setUnitsPerCase] = useState<number>(4);
  const [boxMaterialId, setBoxMaterialId] = useState<string>("");
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [minWeight, setMinWeight] = useState<number | null>(null);
  const [maxWeight, setMaxWeight] = useState<number | null>(null);
  const [variancePercent, setVariancePercent] = useState<number>(3.5);
  const [tubUpc, setTubUpc] = useState<string>("");
  const [caseUpc, setCaseUpc] = useState<string>("");
  const [caseWeightKg, setCaseWeightKg] = useState<number | null>(null);
  const [caseCubeM3, setCaseCubeM3] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingUpc, setIsGeneratingUpc] = useState(false);
  const [weightSectionOpen, setWeightSectionOpen] = useState(false);
  const [upcSectionOpen, setUpcSectionOpen] = useState(false);
  const [palletSectionOpen, setPalletSectionOpen] = useState(false);
  const [tiCount, setTiCount] = useState<number | null>(null);
  const [hiCount, setHiCount] = useState<number | null>(null);

  // Fetch box materials (materials with category = 'Boxes') with dimensions
  const { data: boxMaterials = [] } = useQuery({
    queryKey: ["box-materials-with-dims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, code, name, sub_category, box_weight_kg, box_length_in, box_width_in, box_height_in")
        .eq("category", "Boxes")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get available case pack sizes from packaging indicators
  const casePackSizes = useMemo(() => {
    return packagingIndicators
      .map(pi => pi.case_pack_size)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);
  }, [packagingIndicators]);

  // Get selected container size details
  const selectedContainer = useMemo(() => {
    return activeContainerSizes.find(c => c.id === containerSizeId);
  }, [activeContainerSizes, containerSizeId]);

  // Get selected box material details
  const selectedBoxMaterial = useMemo(() => {
    return boxMaterials.find(b => b.id === boxMaterialId);
  }, [boxMaterials, boxMaterialId]);

  // Generate SKU based on selections
  const generatedSku = useMemo(() => {
    if (!selectedContainer || !productSku) return "";
    return generateProductSizeSKU(productSku, selectedContainer.sku_code, unitsPerCase);
  }, [productSku, selectedContainer, unitsPerCase]);

  // Auto-calculate Case Cube from box dimensions (box dims are in inches)
  const calculatedCaseCubeM3 = useMemo(() => {
    if (!selectedBoxMaterial?.box_length_in || !selectedBoxMaterial?.box_width_in || !selectedBoxMaterial?.box_height_in) {
      return null;
    }
    // Convert cubic inches to cubic meters: 1 in³ = 0.0000163871 m³
    const volumeIn3 = selectedBoxMaterial.box_length_in * selectedBoxMaterial.box_width_in * selectedBoxMaterial.box_height_in;
    return Math.round(volumeIn3 * 0.0000163871 * 1000000) / 1000000; // Round to 6 decimals
  }, [selectedBoxMaterial]);

  // Auto-calculate Case Weight: (units × target weight) + box weight
  const calculatedCaseWeightKg = useMemo(() => {
    if (!targetWeight || !unitsPerCase) return null;
    const productWeight = unitsPerCase * targetWeight;
    const boxWeight = selectedBoxMaterial?.box_weight_kg || 0;
    return Math.round((productWeight + boxWeight) * 100) / 100;
  }, [targetWeight, unitsPerCase, selectedBoxMaterial]);

  // Calculate case cube in cubic feet for display
  const caseCubeFt3 = useMemo(() => {
    if (!selectedBoxMaterial?.box_length_in || !selectedBoxMaterial?.box_width_in || !selectedBoxMaterial?.box_height_in) {
      return null;
    }
    const volumeIn3 = selectedBoxMaterial.box_length_in * selectedBoxMaterial.box_width_in * selectedBoxMaterial.box_height_in;
    return volumeIn3 / 1728; // Convert cubic inches to cubic feet
  }, [selectedBoxMaterial]);

  // Ti validation with overhang detection
  const tiValidation = useMemo(() => {
    if (!tiCount || !selectedBoxMaterial?.box_length_in || !selectedBoxMaterial?.box_width_in) {
      return null;
    }
    return validateTiConfiguration(
      tiCount,
      selectedBoxMaterial.box_length_in,
      selectedBoxMaterial.box_width_in,
      PALLET_TYPES.US_STANDARD.lengthIn,
      PALLET_TYPES.US_STANDARD.widthIn
    );
  }, [tiCount, selectedBoxMaterial]);

  // Calculate overhang
  const overhang = useMemo(() => {
    if (!tiCount || !selectedBoxMaterial?.box_length_in || !selectedBoxMaterial?.box_width_in) {
      return null;
    }
    return calculateOverhang(
      tiCount,
      selectedBoxMaterial.box_length_in,
      selectedBoxMaterial.box_width_in,
      PALLET_TYPES.US_STANDARD.lengthIn,
      PALLET_TYPES.US_STANDARD.widthIn
    );
  }, [tiCount, selectedBoxMaterial]);

  const overhangSeverity = useMemo(() => {
    if (!overhang) return 'none';
    return getOverhangSeverity(overhang.maxOverhang);
  }, [overhang]);

  // Calculate comprehensive pallet metrics
  const palletMetrics = useMemo(() => {
    if (!tiCount || !hiCount) return null;
    return calculatePalletMetrics(
      tiCount,
      hiCount,
      unitsPerCase,
      calculatedCaseWeightKg || 0,
      selectedBoxMaterial?.box_length_in || 0,
      selectedBoxMaterial?.box_width_in || 0,
      selectedBoxMaterial?.box_height_in || 0,
      PALLET_TYPES.US_STANDARD.lengthIn,
      PALLET_TYPES.US_STANDARD.widthIn
    );
  }, [tiCount, hiCount, unitsPerCase, calculatedCaseWeightKg, selectedBoxMaterial]);

  // Height warning
  const heightWarning = useMemo(() => {
    if (!palletMetrics) return null;
    return getHeightWarning(palletMetrics.stackHeightIn);
  }, [palletMetrics]);

  // Legacy calculations for backward compatibility
  const casesPerPallet = palletMetrics?.casesPerPallet ?? null;
  const totalUnitsPerPallet = palletMetrics?.totalUnits ?? null;
  const palletWeightKg = palletMetrics?.totalWeightKg ?? null;

  // Reset form when dialog opens/closes or size changes
  useEffect(() => {
    if (open) {
      if (size) {
        setContainerSizeId((size as any).container_size_id || "");
        setUnitsPerCase(size.units_per_case || 4);
        setBoxMaterialId((size as any).box_material_id || "");
        const target = (size as any).target_weight_kg || null;
        const min = (size as any).min_weight_kg || null;
        const max = (size as any).max_weight_kg || null;
        setTargetWeight(target);
        setMinWeight(min);
        setMaxWeight(max);
        // Calculate variance percent from existing data if possible
        if (target && min) {
          const calculatedVariance = ((target - min) / target) * 100;
          setVariancePercent(Math.round(calculatedVariance * 10) / 10);
        } else {
          setVariancePercent(3.5);
        }
        setTubUpc(size.upc_code || "");
        setCaseUpc(size.case_upc_code || "");
        setCaseWeightKg(size.case_weight_kg || null);
        setCaseCubeM3(size.case_cube_m3 || null);
        setIsDefault(size.is_default || false);
        setIsActive(size.is_active);
        setTiCount((size as any).ti_count || null);
        setHiCount((size as any).hi_count || null);
      } else {
        // Reset to defaults for new size
        setContainerSizeId("");
        setUnitsPerCase(4);
        setBoxMaterialId("");
        setTargetWeight(null);
        setMinWeight(null);
        setMaxWeight(null);
        setVariancePercent(3.5);
        setTubUpc("");
        setCaseUpc("");
        setCaseWeightKg(null);
        setCaseCubeM3(null);
        setIsDefault(false);
        setIsActive(true);
        setTiCount(null);
        setHiCount(null);
      }
      setWeightSectionOpen(false);
      setUpcSectionOpen(false);
      setPalletSectionOpen(false);
    }
  }, [open, size]);

  // Auto-calculate Min/Max when Target or variance changes
  useEffect(() => {
    if (targetWeight !== null && targetWeight > 0) {
      const variance = variancePercent / 100;
      const calculatedMin = Math.round((targetWeight * (1 - variance)) * 100) / 100;
      const calculatedMax = Math.round((targetWeight * (1 + variance)) * 100) / 100;
      setMinWeight(calculatedMin);
      setMaxWeight(calculatedMax);
    }
  }, [targetWeight, variancePercent]);

  // Auto-update Case Weight when dependencies change
  useEffect(() => {
    if (calculatedCaseWeightKg !== null) {
      setCaseWeightKg(calculatedCaseWeightKg);
    }
  }, [calculatedCaseWeightKg]);

  // Auto-update Case Cube when dependencies change
  useEffect(() => {
    if (calculatedCaseCubeM3 !== null) {
      setCaseCubeM3(calculatedCaseCubeM3);
    }
  }, [calculatedCaseCubeM3]);

  const handleGenerateUpc = async () => {
    setIsGeneratingUpc(true);
    try {
      const { tubUpc: newTubUpc, caseUpc: newCaseUpc } = await generateUPCPair(unitsPerCase);
      
      if (!newTubUpc) {
        toast.error("GS1 company prefix not configured. Please set it in Company Settings.");
        return;
      }

      setTubUpc(newTubUpc);
      setCaseUpc(newCaseUpc);
      toast.success("UPC codes generated");
    } catch (error) {
      toast.error(`Failed to generate UPC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingUpc(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!containerSizeId) {
      toast.error("Please select a container size");
      return;
    }

    if (!selectedContainer) {
      toast.error("Invalid container size");
      return;
    }

    // Validate weights if provided
    if (minWeight !== null && targetWeight !== null && minWeight >= targetWeight) {
      toast.error("Min weight must be less than target weight");
      return;
    }

    if (targetWeight !== null && maxWeight !== null && targetWeight >= maxWeight) {
      toast.error("Target weight must be less than max weight");
      return;
    }

    // Validate Ti configuration - prevent saving with dangerous overhang
    if (tiValidation && !tiValidation.isValid) {
      toast.error(tiValidation.message || "Invalid Ti configuration");
      return;
    }

    // Warn but allow saving with dangerous overhang
    if (overhangSeverity === 'danger') {
      toast.error("Cannot save: Dangerous overhang detected (>1 inch). Please reduce Ti value.");
      return;
    }

    setIsSaving(true);
    try {
      const sizeData = {
        product_id: productId,
        size_name: selectedContainer.name,
        size_value: selectedContainer.volume_gallons,
        container_size_id: containerSizeId,
        box_material_id: boxMaterialId || null,
        sku: generatedSku,
        units_per_case: unitsPerCase,
        target_weight_kg: targetWeight,
        min_weight_kg: minWeight,
        max_weight_kg: maxWeight,
        upc_code: tubUpc || null,
        case_upc_code: caseUpc || null,
        case_weight_kg: caseWeightKg,
        case_cube_m3: caseCubeM3,
        is_default: isDefault,
        is_active: isActive,
        ti_count: tiCount,
        hi_count: hiCount,
      };

      if (isEditing && size) {
        await updateSize.mutateAsync({ id: size.id, ...sizeData });
      } else {
        await createSize.mutateAsync(sizeData);
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = loadingContainers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Product Size" : "Add Product Size"}
          </DialogTitle>
          <DialogDescription>
            Configure container size, case pack, and weight specifications
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <div className="space-y-4">
          {/* Container Size */}
          <div className="space-y-2">
            <Label htmlFor="container-size">Container Size *</Label>
            <Select value={containerSizeId || "__none__"} onValueChange={(v) => setContainerSizeId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select container size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select container...</SelectItem>
                {activeContainerSizes.map((cs) => (
                  <SelectItem key={cs.id} value={cs.id}>
                    {cs.name} ({cs.volume_gallons} gal) - Code {cs.sku_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Case Pack Quantity */}
          <div className="space-y-2">
            <Label htmlFor="units-per-case">Case Pack Quantity *</Label>
            <Select 
              value={String(unitsPerCase)} 
              onValueChange={(v) => setUnitsPerCase(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select case pack" />
              </SelectTrigger>
              <SelectContent>
                {casePackSizes.length > 0 ? (
                  casePackSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} units per case
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="1">1 unit per case</SelectItem>
                    <SelectItem value="4">4 units per case</SelectItem>
                    <SelectItem value="6">6 units per case</SelectItem>
                    <SelectItem value="8">8 units per case</SelectItem>
                    <SelectItem value="12">12 units per case</SelectItem>
                    <SelectItem value="24">24 units per case</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Box Material */}
          <div className="space-y-2">
            <Label htmlFor="box-material">Box Material</Label>
            <Select 
              value={boxMaterialId || "__none__"} 
              onValueChange={(v) => setBoxMaterialId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select box material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {boxMaterials.map((mat) => (
                  <SelectItem key={mat.id} value={mat.id}>
                    {mat.code} - {mat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generated SKU Display */}
          {generatedSku && (
            <div className="space-y-2">
              <Label>Generated SKU</Label>
              <div className="p-2 bg-muted rounded-md">
                <code className="text-sm font-mono">{generatedSku}</code>
              </div>
            </div>
          )}

          {/* Weight Specifications - Collapsible */}
          <Collapsible open={weightSectionOpen} onOpenChange={setWeightSectionOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
              Weight Specifications
              <ChevronDown className={`h-4 w-4 transition-transform ${weightSectionOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Enter target weight. Min/Max are auto-calculated based on variance %.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Target (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={targetWeight ?? ""}
                    onChange={(e) => setTargetWeight(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g., 2.27"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Variance %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={variancePercent}
                    onChange={(e) => setVariancePercent(e.target.value ? parseFloat(e.target.value) : 3.5)}
                    placeholder="3.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Min (kg) - calculated</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={minWeight ?? ""}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Max (kg) - calculated</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maxWeight ?? ""}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* UPC Codes - Collapsible */}
          <Collapsible open={upcSectionOpen} onOpenChange={setUpcSectionOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
              UPC Codes
              <ChevronDown className={`h-4 w-4 transition-transform ${upcSectionOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tub UPC (12-digit)</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={handleGenerateUpc}
                    disabled={isGeneratingUpc}
                  >
                    {isGeneratingUpc ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-1" />
                    )}
                    Generate
                  </Button>
                </div>
                <Input
                  value={tubUpc}
                  onChange={(e) => setTubUpc(e.target.value)}
                  placeholder="Enter or generate UPC"
                  maxLength={12}
                />
              </div>
              <div className="space-y-2">
                <Label>Case UPC / GTIN-14 (14-digit)</Label>
                <Input
                  value={caseUpc}
                  onChange={(e) => setCaseUpc(e.target.value)}
                  placeholder="Enter or generate GTIN-14"
                  maxLength={14}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Case Specifications - Auto-calculated */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={calculatedCaseWeightKg !== null ? "text-muted-foreground" : ""}>
                Case Weight (kg){calculatedCaseWeightKg !== null ? " - calculated" : ""}
              </Label>
              <Input
                type="number"
                step="0.01"
                value={caseWeightKg ?? ""}
                onChange={(e) => setCaseWeightKg(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={calculatedCaseWeightKg !== null ? "Auto-calculated" : "Total case weight"}
                readOnly={calculatedCaseWeightKg !== null}
                className={calculatedCaseWeightKg !== null ? "bg-muted" : ""}
              />
              {calculatedCaseWeightKg === null && targetWeight && (
                <p className="text-xs text-muted-foreground">
                  Select box material to auto-calculate
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={calculatedCaseCubeM3 !== null ? "text-muted-foreground" : ""}>
                Case Cube (m³){calculatedCaseCubeM3 !== null ? " - calculated" : ""}
              </Label>
              <Input
                type="number"
                step="0.0001"
                value={caseCubeM3 ?? ""}
                onChange={(e) => setCaseCubeM3(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={calculatedCaseCubeM3 !== null ? "Auto-calculated" : "Cubic volume"}
                readOnly={calculatedCaseCubeM3 !== null}
                className={calculatedCaseCubeM3 !== null ? "bg-muted" : ""}
              />
              {calculatedCaseCubeM3 === null && boxMaterialId && (
                <p className="text-xs text-amber-600">
                  Box dimensions not set in Materials
                </p>
              )}
            </div>
          </div>

          {/* Pallet Configuration - Collapsible */}
          <Collapsible open={palletSectionOpen} onOpenChange={setPalletSectionOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Pallet Configuration
                {overhangSeverity === 'danger' && (
                  <Badge variant="destructive" className="text-xs">Overhang</Badge>
                )}
                {overhangSeverity === 'warning' && (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Minor Overhang</Badge>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${palletSectionOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Configure how cases stack on a standard 48" × 40" pallet (GMA/ISO)
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Ti (Cases per Layer)
                    {tiValidation?.optimalTi && tiCount === tiValidation.optimalTi && (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    )}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g., 8"
                    value={tiCount ?? ""}
                    onChange={(e) => setTiCount(e.target.value ? parseInt(e.target.value) : null)}
                    className={tiValidation && !tiValidation.isValid ? "border-destructive" : ""}
                  />
                  {/* Ti validation messages */}
                  {tiValidation && !tiValidation.isValid && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {tiValidation.message}
                    </p>
                  )}
                  {tiValidation?.isValid && tiValidation.message && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {tiValidation.message}
                    </p>
                  )}
                  {selectedBoxMaterial?.box_length_in && tiValidation?.optimalTi && !tiCount && (
                    <p className="text-xs text-muted-foreground">
                      Suggested: {tiValidation.optimalTi} cases ({tiValidation.optimalArrangement?.cols}×{tiValidation.optimalArrangement?.rows})
                    </p>
                  )}
                  {!selectedBoxMaterial?.box_length_in && (
                    <p className="text-xs text-muted-foreground">
                      Select box material to validate
                    </p>
                  )}
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
                    Stacked layers on pallet
                  </p>
                </div>
              </div>

              {/* Overhang Warning */}
              {overhang && overhang.hasOverhang && (
                <div className={`p-3 rounded-lg border ${
                  overhangSeverity === 'danger' 
                    ? 'bg-red-50 border-red-300 dark:bg-red-950/20' 
                    : 'bg-amber-50 border-amber-300 dark:bg-amber-950/20'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                      overhangSeverity === 'danger' ? 'text-destructive' : 'text-amber-600'
                    }`} />
                    <div className="text-sm">
                      <p className={`font-medium ${
                        overhangSeverity === 'danger' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {overhangSeverity === 'danger' ? 'Dangerous Overhang' : 'Minor Overhang Detected'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cases extend {overhang.maxOverhang.toFixed(2)}" beyond pallet edge.
                        {overhangSeverity === 'danger' && ' Reduce Ti to save configuration.'}
                      </p>
                      <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                        {overhang.front > 0 && <span>Front: {overhang.front.toFixed(2)}"</span>}
                        {overhang.back > 0 && <span>Back: {overhang.back.toFixed(2)}"</span>}
                        {overhang.left > 0 && <span>Left: {overhang.left.toFixed(2)}"</span>}
                        {overhang.right > 0 && <span>Right: {overhang.right.toFixed(2)}"</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No Overhang Success */}
              {overhang && !overhang.hasOverhang && tiCount && (
                <div className="p-2 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>No overhang - Cases fit within pallet boundaries</span>
                  </div>
                </div>
              )}

              {/* Pallet Metrics */}
              {(tiCount || hiCount) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 bg-muted/50 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-muted-foreground text-xs">Cases</Label>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {casesPerPallet ?? "—"}
                      </p>
                      {tiCount && hiCount && (
                        <p className="text-xs text-muted-foreground">
                          {tiCount}×{hiCount}
                        </p>
                      )}
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Box className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-muted-foreground text-xs">Units</Label>
                      </div>
                      <p className="text-lg font-bold">
                        {totalUnitsPerPallet ?? "—"}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg text-center ${
                      palletMetrics?.isOverweight 
                        ? 'bg-red-50 border border-red-200 dark:bg-red-950/20' 
                        : 'bg-muted/50'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        <Scale className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-muted-foreground text-xs">Weight</Label>
                      </div>
                      <p className={`text-lg font-bold ${palletMetrics?.isOverweight ? 'text-destructive' : ''}`}>
                        {palletWeightKg ? `${palletWeightKg.toFixed(0)}kg` : "—"}
                      </p>
                      {palletWeightKg && (
                        <p className="text-xs text-muted-foreground">
                          {(palletWeightKg * 2.20462).toFixed(0)} lbs
                        </p>
                      )}
                    </div>
                    <div className={`p-2 rounded-lg text-center ${
                      heightWarning 
                        ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20' 
                        : 'bg-muted/50'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        <Ruler className="h-3 w-3 text-muted-foreground" />
                        <Label className="text-muted-foreground text-xs">Height</Label>
                      </div>
                      <p className={`text-lg font-bold ${heightWarning ? 'text-amber-600' : ''}`}>
                        {palletMetrics?.stackHeightIn ? `${palletMetrics.stackHeightIn.toFixed(1)}"` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Weight Warning */}
                  {palletMetrics?.weightWarning && (
                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20">
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{palletMetrics.weightWarning}</span>
                      </div>
                    </div>
                  )}

                  {/* Height Warning */}
                  {heightWarning && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20">
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{heightWarning}</span>
                      </div>
                    </div>
                  )}

                  {/* Additional Metrics */}
                  {palletMetrics && (palletMetrics.cubicFeet > 0 || palletMetrics.cubeUtilization > 0) && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between items-center px-2">
                        <span className="text-muted-foreground">Cubic Feet:</span>
                        <span className="font-medium">{palletMetrics.cubicFeet.toFixed(1)} ft³</span>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <span className="text-muted-foreground">Cube Utilization:</span>
                        <span className={`font-medium ${
                          palletMetrics.cubeUtilization >= 70 ? 'text-green-600' :
                          palletMetrics.cubeUtilization >= 50 ? 'text-amber-600' : 'text-muted-foreground'
                        }`}>
                          {palletMetrics.cubeUtilization.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Pallet Visualization */}
              {selectedBoxMaterial?.box_length_in && selectedBoxMaterial?.box_width_in && selectedBoxMaterial?.box_height_in && tiCount && hiCount && (
                <div className="pt-2">
                  <PalletVisualizer
                    ti={tiCount}
                    hi={hiCount}
                    boxLengthIn={selectedBoxMaterial.box_length_in}
                    boxWidthIn={selectedBoxMaterial.box_width_in}
                    boxHeightIn={selectedBoxMaterial.box_height_in}
                    overhang={overhang}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
                id="is-default"
              />
              <Label htmlFor="is-default">Default Size</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                id="is-active"
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Size"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
