import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContainerSizes } from "@/hooks/useContainerSizes";
import { usePackagingIndicators } from "@/hooks/usePackagingIndicators";
import { useProductSizes, ProductSize } from "@/hooks/useProductSizes";
import { generateProductSizeSKU } from "@/lib/skuGenerator";
import { generateUPCPair } from "@/lib/upcGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

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

  // Fetch box materials (materials with category = 'Boxes')
  const { data: boxMaterials = [] } = useQuery({
    queryKey: ["box-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, code, name, sub_category")
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

  // Generate SKU based on selections
  const generatedSku = useMemo(() => {
    if (!selectedContainer || !productSku) return "";
    return generateProductSizeSKU(productSku, selectedContainer.sku_code, unitsPerCase);
  }, [productSku, selectedContainer, unitsPerCase]);

  // Reset form when dialog opens/closes or size changes
  useEffect(() => {
    if (open) {
      if (size) {
        setContainerSizeId((size as any).container_size_id || "");
        setUnitsPerCase(size.units_per_case || 4);
        setBoxMaterialId((size as any).box_material_id || "");
        setTargetWeight((size as any).target_weight_kg || null);
        setMinWeight((size as any).min_weight_kg || null);
        setMaxWeight((size as any).max_weight_kg || null);
        setTubUpc(size.upc_code || "");
        setCaseUpc(size.case_upc_code || "");
        setCaseWeightKg(size.case_weight_kg || null);
        setCaseCubeM3(size.case_cube_m3 || null);
        setIsDefault(size.is_default || false);
        setIsActive(size.is_active);
      } else {
        // Reset to defaults for new size
        setContainerSizeId("");
        setUnitsPerCase(4);
        setBoxMaterialId("");
        setTargetWeight(null);
        setMinWeight(null);
        setMaxWeight(null);
        setTubUpc("");
        setCaseUpc("");
        setCaseWeightKg(null);
        setCaseCubeM3(null);
        setIsDefault(false);
        setIsActive(true);
      }
      setWeightSectionOpen(false);
      setUpcSectionOpen(false);
    }
  }, [open, size]);

  // Auto-populate weight fields when container size changes
  useEffect(() => {
    if (selectedContainer && !size) {
      // Only auto-populate for new sizes, not edits
      setTargetWeight(selectedContainer.target_weight_kg);
      setMinWeight(selectedContainer.min_weight_kg);
      setMaxWeight(selectedContainer.max_weight_kg);
    }
  }, [selectedContainer, size]);

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

  if (loadingContainers) {
    return null;
  }

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
                Defaults loaded from container size. Override only if product-specific variance needed.
              </p>
              <div className="grid grid-cols-3 gap-3">
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
                  <Label>Min (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={minWeight ?? ""}
                    onChange={(e) => setMinWeight(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g., 2.20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maxWeight ?? ""}
                    onChange={(e) => setMaxWeight(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="e.g., 2.35"
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

          {/* Case Specifications */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Case Weight (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={caseWeightKg ?? ""}
                onChange={(e) => setCaseWeightKg(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Total case weight"
              />
            </div>
            <div className="space-y-2">
              <Label>Case Cube (m³)</Label>
              <Input
                type="number"
                step="0.0001"
                value={caseCubeM3 ?? ""}
                onChange={(e) => setCaseCubeM3(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Cubic volume"
              />
            </div>
          </div>

          {/* Status Flags */}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Size"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
