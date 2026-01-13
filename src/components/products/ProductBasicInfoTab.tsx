import { UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProductCategories } from "@/hooks/useProductCategories";
import type { ProductFormData } from "./ProductFormDialog";

interface ProductBasicInfoTabProps {
  form: UseFormReturn<ProductFormData>;
}

export function ProductBasicInfoTab({ form }: ProductBasicInfoTabProps) {
  const { activeCategories, isLoading: categoriesLoading } = useProductCategories();

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

  // Fetch base products (products that can be flavor families)
  const { data: baseProducts = [] } = useQuery({
    queryKey: ["base-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("is_base_product", true)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU *</FormLabel>
              <FormControl>
                <Input placeholder="Enter SKU" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="product_category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Category</FormLabel>
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
                  {activeCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="flavor_family_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flavor Family (Base Product)</FormLabel>
              <Select
                value={field.value || "__none__"}
                onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select base product" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">None (Standalone)</SelectItem>
                  {baseProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
