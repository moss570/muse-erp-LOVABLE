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
import { useProductCategories } from "@/hooks/useProductCategories";
import { generateProductSKU, checkSkuUniqueness } from "@/lib/skuGenerator";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { ProductFormData } from "./ProductFormDialog";

interface ProductBasicInfoTabProps {
  form: UseFormReturn<ProductFormData>;
  isEditing?: boolean;
}

export function ProductBasicInfoTab({ form, isEditing = false }: ProductBasicInfoTabProps) {
  const { activeCategories, isLoading: categoriesLoading } = useProductCategories();
  const [skuCheckStatus, setSkuCheckStatus] = useState<'idle' | 'checking' | 'unique' | 'duplicate'>('idle');
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  // Fetch units of measure
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
              <Input placeholder="e.g., Vanilla" {...field} />
            </FormControl>
            <FormDescription>
              Used to generate the flavor code portion of the SKU
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

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
                  disabled={isEditing}
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
              <Textarea placeholder="Enter product description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="unit_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Base Unit</FormLabel>
            <Select
              value={field.value || "__none__"}
              onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

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
                />
              </FormControl>
              <FormLabel className="!mt-0">Requires UPC Code</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_base_product"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="!mt-0">Is Base Product</FormLabel>
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
