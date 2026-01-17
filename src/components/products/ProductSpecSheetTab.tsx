import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProductSizes } from "@/hooks/useProductSizes";
import { useProductQARequirements } from "@/hooks/useProductQARequirements";
import { useProductAttributes } from "@/hooks/useProductAttributes";
import { getIngredientStatementPreview } from "@/lib/ingredientStatement";
import { formatUPCForDisplay } from "@/lib/upcUtils";
import { aggregateAllergensForRecipe } from "@/lib/bomAggregation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, Loader2 } from "lucide-react";

interface ProductSpecSheetTabProps {
  productId: string;
  productName: string;
}

export function ProductSpecSheetTab({ productId, productName }: ProductSpecSheetTabProps) {
  const { sizes, isLoading: sizesLoading } = useProductSizes(productId);
  const { requirements } = useProductQARequirements(productId);
  const { claims } = useProductAttributes(productId);
  const [ingredientStatement, setIngredientStatement] = useState<string>("");
  const [bomAllergens, setBomAllergens] = useState<string[]>([]);

  // Fetch product details
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_category:product_categories(name, code),
          unit:units_of_measure(name, code)
        `)
        .eq("id", productId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch company info for header
  const { data: company } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch primary recipe ID for this product
  const { data: primaryRecipe } = useQuery({
    queryKey: ["primary-recipe-for-spec", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_recipes")
        .select("id")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("recipe_version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load ingredient statement and BOM-aggregated allergens
  useEffect(() => {
    async function loadData() {
      const result = await getIngredientStatementPreview(productId);
      setIngredientStatement(result.statement);

      // Load allergens from primary recipe if available
      if (primaryRecipe?.id) {
        const allergens = await aggregateAllergensForRecipe(primaryRecipe.id);
        setBomAllergens(allergens);
      } else {
        setBomAllergens([]);
      }
    }
    loadData();
  }, [productId, primaryRecipe?.id]);

  const handlePrint = () => {
    window.print();
  };

  if (sizesLoading || productLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Spec Sheet
        </Button>
      </div>

      {/* Spec Sheet Content */}
      <div className="border rounded-lg p-6 bg-card print:border-0 print:p-0">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{company?.company_name || "Company"}</h1>
          <h2 className="text-xl font-semibold mt-2">Product Specification Sheet</h2>
          <p className="text-lg mt-1">{productName}</p>
          {product?.sku && (
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Product Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold mb-2">Product Information</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="w-32 text-muted-foreground">Category:</dt>
                <dd>{product?.product_category?.name || "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-muted-foreground">Shelf Life:</dt>
                <dd>{product?.shelf_life_days ? `${product.shelf_life_days} days` : "N/A"}</dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-muted-foreground">Storage:</dt>
                <dd>{product?.storage_requirements || "See label"}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Certifications & Claims</h3>
            <div className="flex flex-wrap gap-1">
              {claims.map((c) => (
                <Badge key={c.id} variant="outline" className="text-xs">
                  {c.attribute_value}
                </Badge>
              ))}
              {claims.length === 0 && (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Pack Sizes */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Available Pack Sizes</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Units/Case</TableHead>
                <TableHead>Tub UPC</TableHead>
                <TableHead>Case UPC</TableHead>
                <TableHead>Case Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size) => (
                <TableRow key={size.id}>
                  <TableCell className="font-medium">
                    {size.size_name}
                    {size.is_default && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{size.units_per_case}</TableCell>
                  <TableCell>
                    {size.upc_code ? formatUPCForDisplay(size.upc_code) : "-"}
                  </TableCell>
                  <TableCell>
                    {size.case_upc_code ? formatUPCForDisplay(size.case_upc_code) : "-"}
                  </TableCell>
                  <TableCell>
                    {size.case_weight_kg ? `${size.case_weight_kg} kg` : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {sizes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No sizes configured
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Separator className="my-4" />

        {/* Ingredient Statement */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Ingredient Statement</h3>
          <p className="text-sm bg-muted p-3 rounded">
            {ingredientStatement || "No ingredients configured"}
          </p>
        </div>

        {/* Allergen Declaration - Auto-aggregated from BOM */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Allergen Declaration</h3>
          <div className="text-sm">
            {bomAllergens.length > 0 ? (
              <p>
                <strong>Contains:</strong> {bomAllergens.join(", ")}
              </p>
            ) : (
              <p className="text-muted-foreground">No allergens in recipe materials</p>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Quality Limits */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Quality & Food Safety Limits</h3>
          {requirements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Critical</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.parameter_name}</TableCell>
                    <TableCell>{req.target_value || "-"}</TableCell>
                    <TableCell>{req.min_value ?? "-"}</TableCell>
                    <TableCell>{req.max_value ?? "-"}</TableCell>
                    <TableCell>{req.uom || "-"}</TableCell>
                    <TableCell>
                      {req.is_critical ? (
                        <Badge variant="destructive">CCP</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No QA requirements configured</p>
          )}
        </div>

        {/* Handling Instructions */}
        {product?.handling_instructions && (
          <>
            <Separator className="my-4" />
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Handling Instructions</h3>
              <p className="text-sm">{product.handling_instructions}</p>
            </div>
          </>
        )}

        {/* Footer */}
        <Separator className="my-4" />
        <div className="text-xs text-muted-foreground text-center">
          <p>
            Document generated on {new Date().toLocaleDateString()} • {company?.company_name}
          </p>
          <p className="mt-1">
            This specification sheet is for internal use only. Contact Quality Assurance for official documentation.
          </p>
        </div>
      </div>
    </div>
  );
}
