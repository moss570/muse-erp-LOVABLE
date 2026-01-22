import { useState, useEffect, useCallback, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useProductCategories } from "@/hooks/useProductCategories";
import { generateProductSKU, checkSkuUniqueness } from "@/lib/skuGenerator";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Crown, Users } from "lucide-react";
import type { ProductFormData } from "./ProductFormDialog";

interface ProductBasicInfoTabProps {
  form: UseFormReturn<ProductFormData>;
  isEditing?: boolean;
  isFieldsDisabled?: boolean;
  currentProductId?: string;
}

export function ProductBasicInfoTab({ form, isEditing = false, isFieldsDisabled = false, currentProductId }: ProductBasicInfoTabProps) {
  const { activeCategories, isLoading: categoriesLoading } = useProductCategories();
  const [skuCheckStatus, setSkuCheckStatus] = useState<'idle' | 'checking' | 'unique' | 'duplicate'>('idle');
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  // Fetch units of measure for auto-setting based on category
  const { data: units = [] } = useQuery({
    queryKey: ["units-of-measure-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units_of_measure")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch family head products for linking
  const { data: familyHeadProducts = [] } = useQuery({
    queryKey: ["family-head-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("is_active", true)
        .eq("is_family_head", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch child products if this is a family head
  const { data: childProducts = [] } = useQuery({
    queryKey: ["child-products", currentProductId],
    queryFn: async () => {
      if (!currentProductId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("family_head_id", currentProductId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentProductId,
  });

  const watchedIsFamilyHead = form.watch("is_family_head");

  // Get categories with SKU prefix for display
  const categoriesWithPrefix = useMemo(() => {
    return activeCategories.map(cat => ({
      ...cat,
      sku_prefix: (cat as any).sku_prefix as string | null
    }));
  }, [activeCategories]);

  const watchedCategoryId = form.watch("product_category_id");
  const watchedName = form.watch("name");
  const watchedSku = form.watch("sku");

  // Auto-set unit_id based on category: BASE = KG, everything else = EACH
  useEffect(() => {
    if (!watchedCategoryId || units.length === 0) return;
    
    const selectedCategory = activeCategories.find(cat => cat.id === watchedCategoryId);
    if (!selectedCategory) return;
    
    // BASE category uses KG, all finished products (Gelato, Ice Cream, etc.) use EACH
    const isBaseCategory = selectedCategory.code === 'BASE';
    const targetUnitCode = isBaseCategory ? 'KG' : 'EACH';
    const targetUnit = units.find(u => u.code === targetUnitCode);
    
    if (targetUnit) {
      form.setValue("unit_id", targetUnit.id);
    }
  }, [watchedCategoryId, units, activeCategories, form]);

  // Auto-generate SKU when category or name changes (only for new products)
  const generateSku = useCallback(async () => {
    if (isEditing || !watchedCategoryId || !watchedName?.trim()) {
      return;
    }

    setIsGeneratingSku(true);
    try {
      const { sku, isUnique } = await generateProductSKU(watchedCategoryId, watchedName);
      if (sku) {
        form.setValue("sku", sku);
        setSkuCheckStatus(isUnique ? 'unique' : 'duplicate');
      }
    } catch (error) {
      console.error("Failed to generate SKU:", error);
    } finally {
      setIsGeneratingSku(false);
    }
  }, [isEditing, watchedCategoryId, watchedName, form]);

  // Debounced SKU generation
  useEffect(() => {
    if (isEditing) return;
    
    const timer = setTimeout(() => {
      generateSku();
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedCategoryId, watchedName, generateSku, isEditing]);

  // Check SKU uniqueness when manually edited
  useEffect(() => {
    if (!watchedSku?.trim()) {
      setSkuCheckStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setSkuCheckStatus('checking');
      const isUnique = await checkSkuUniqueness(watchedSku);
      setSkuCheckStatus(isUnique ? 'unique' : 'duplicate');
    }, 300);

    return () => clearTimeout(timer);
  }, [watchedSku]);

  return (
    <div className="space-y-6">
      {/* Category Selection - First */}
      <FormField
        control={form.control}
        name="product_category_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Category *</FormLabel>
            <Select
              disabled={isFieldsDisabled}
              value={field.value || "__none__"}
              onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {categoriesWithPrefix.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                    {category.sku_prefix && (
                      <span className="text-muted-foreground ml-2">({category.sku_prefix})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Category determines the SKU prefix for this product
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Product Name - Second */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Vanilla" {...field} disabled={isFieldsDisabled} />
            </FormControl>
            <FormDescription>
              Used to generate the flavor code portion of the SKU
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Family Head Toggle - Right after Product Name */}
      <FormField
        control={form.control}
        name="is_family_head"
        render={({ field }) => (
          <FormItem className="flex items-center gap-2">
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) {
                    form.setValue("family_head_id", undefined);
                  }
                }}
                disabled={isFieldsDisabled}
              />
            </FormControl>
            <div>
              <FormLabel className="!mt-0 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" />
                Family Head Product
              </FormLabel>
              <FormDescription className="text-xs">
                Groups related sizes (e.g., G-MINT groups G-MINT-08, G-MINT-16)
              </FormDescription>
            </div>
          </FormItem>
        )}
      />

      {/* Show linked children if family head */}
      {watchedIsFamilyHead && childProducts.length > 0 && (
        <div className="rounded-md bg-muted p-3 -mt-3">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Users className="h-4 w-4" />
            Linked Products ({childProducts.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {childProducts.map((child) => (
              <Badge key={child.id} variant="secondary">
                {child.sku}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Parent Family Head selector (only if not a family head) */}
      {!watchedIsFamilyHead && (
        <FormField
          control={form.control}
          name="family_head_id"
          render={({ field }) => (
            <FormItem className="-mt-3">
              <FormLabel>Parent Family Head</FormLabel>
              <Select
                disabled={isFieldsDisabled}
                value={field.value || "__none__"}
                onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select family head (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="z-[200]">
                  <SelectItem value="__none__">None (standalone)</SelectItem>
                  {familyHeadProducts
                    .filter(p => p.id !== currentProductId)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* SKU - Third */}
      {!isEditing && (
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            SKU cannot be changed after product is created. Please verify it's correct before saving.
          </AlertDescription>
        </Alert>
      )}
      
      <FormField
        control={form.control}
        name="sku"
        render={({ field }) => (
          <FormItem>
            <FormLabel>SKU *</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  placeholder="Auto-generated from category + name" 
                  {...field} 
                  disabled={isEditing || isFieldsDisabled}
                  className={isEditing ? "bg-muted cursor-not-allowed" : ""}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isGeneratingSku && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!isGeneratingSku && skuCheckStatus === 'checking' && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!isGeneratingSku && skuCheckStatus === 'unique' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {!isGeneratingSku && skuCheckStatus === 'duplicate' && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            </FormControl>
            {isEditing ? (
              <FormDescription>
                SKU cannot be changed once product is created
              </FormDescription>
            ) : (
              <FormDescription>
                Auto-generated: {"{Category Prefix}-{Flavor Code}"}
                {skuCheckStatus === 'duplicate' && (
                  <span className="text-destructive block mt-1">
                    This SKU already exists. Please modify it manually.
                  </span>
                )}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Enter product description" {...field} disabled={isFieldsDisabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Unit is auto-set based on category: BASE = KG, finished products = EACH */}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="shelf_life_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shelf Life (Days)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 365"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={isFieldsDisabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="storage_requirements"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Storage Requirements</FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., Keep frozen at -18°C or below"
                {...field}
                disabled={isFieldsDisabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="handling_instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Handling Instructions</FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g., Thaw in refrigerator before serving"
                {...field}
                disabled={isFieldsDisabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex items-center gap-6 flex-wrap">
        <FormField
          control={form.control}
          name="requires_upc"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isFieldsDisabled}
                />
              </FormControl>
              <FormLabel className="!mt-0">Requires UPC Code</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isFieldsDisabled}
                />
              </FormControl>
              <FormLabel className="!mt-0">Active</FormLabel>
            </FormItem>
          )}
        />
      </div>

    </div>
  );
}
