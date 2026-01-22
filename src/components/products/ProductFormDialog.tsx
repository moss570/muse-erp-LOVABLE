import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil } from "lucide-react";
import { ProductBasicInfoTab } from "./ProductBasicInfoTab";
import { ProductSizesTab } from "./ProductSizesTab";
import { ProductQATab } from "./ProductQATab";
import { ProductBOMTab } from "./ProductBOMTab";
import { ProductSpecSheetTab } from "./ProductSpecSheetTab";
import { ProductInventoryTab } from "./ProductInventoryTab";
import { ProductAnalyticsTab } from "./ProductAnalyticsTab";
import { ProductNutritionTab } from "./ProductNutritionTab";
import { useFormDialogUnsavedChanges } from "@/hooks/useFormDialogUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/ui/staged-edit";

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  product_category_id: z.string().optional(),
  unit_id: z.string().optional(),
  is_base_product: z.boolean().default(false),
  is_active: z.boolean().default(true),
  requires_upc: z.boolean().default(false),
  shelf_life_days: z.number().optional(),
  storage_requirements: z.string().optional(),
  handling_instructions: z.string().optional(),
  is_family_head: z.boolean().default(false),
  family_head_id: z.string().optional().nullable(),
});

export type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    product_category_id?: string | null;
    unit_id?: string | null;
    is_base_product?: boolean | null;
    is_active?: boolean | null;
    requires_upc?: boolean | null;
    shelf_life_days?: number | null;
    storage_requirements?: string | null;
    handling_instructions?: string | null;
    is_family_head?: boolean | null;
    family_head_id?: string | null;
  } | null;
  onSubmit: (data: ProductFormData) => void;
  isSubmitting?: boolean;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
  isSubmitting = false,
}: ProductFormDialogProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [isEditMode, setIsEditMode] = useState(false);
  const isExistingProduct = !!product?.id;
  
  // For existing products, start in view mode. For new products, start in edit mode
  const isFieldsDisabled = isExistingProduct && !isEditMode;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      product_category_id: undefined,
      unit_id: undefined,
      is_base_product: false,
      is_active: true,
      requires_upc: false,
      shelf_life_days: undefined,
      storage_requirements: "",
      handling_instructions: "",
      is_family_head: false,
      family_head_id: undefined,
    },
  });

  // Reset form and edit mode when product changes
  useEffect(() => {
    if (product) {
      form.reset({
        sku: product.sku || "",
        name: product.name || "",
        description: product.description || "",
        product_category_id: product.product_category_id || undefined,
        unit_id: product.unit_id || undefined,
        is_base_product: product.is_base_product || false,
        is_active: product.is_active ?? true,
        requires_upc: product.requires_upc || false,
        shelf_life_days: product.shelf_life_days || undefined,
        storage_requirements: product.storage_requirements || "",
        handling_instructions: product.handling_instructions || "",
        is_family_head: product.is_family_head || false,
        family_head_id: product.family_head_id || undefined,
      });
      setIsEditMode(false); // Start in view mode for existing products
    } else {
      form.reset({
        sku: "",
        name: "",
        description: "",
        product_category_id: undefined,
        unit_id: undefined,
        is_base_product: false,
        is_active: true,
        requires_upc: false,
        shelf_life_days: undefined,
        storage_requirements: "",
        handling_instructions: "",
        is_family_head: false,
        family_head_id: undefined,
      });
      setIsEditMode(true); // New products start in edit mode
    }
  }, [product, form]);

  // Only reset to basic tab when the main dialog opens (not child dialogs)
  useEffect(() => {
    if (open) {
      setActiveTab("basic");
    }
  }, [open]);

  const handleFormSubmit = (data: ProductFormData) => {
    onSubmit(data);
  };

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    if (product) {
      form.reset({
        sku: product.sku || "",
        name: product.name || "",
        description: product.description || "",
        product_category_id: product.product_category_id || undefined,
        unit_id: product.unit_id || undefined,
        is_base_product: product.is_base_product || false,
        is_active: product.is_active ?? true,
        requires_upc: product.requires_upc || false,
        shelf_life_days: product.shelf_life_days || undefined,
        storage_requirements: product.storage_requirements || "",
        handling_instructions: product.handling_instructions || "",
        is_family_head: product.is_family_head || false,
        family_head_id: product.family_head_id || undefined,
      });
    }
    setIsEditMode(false);
  };

  const {
    showUnsavedChangesDialog,
    setShowUnsavedChangesDialog,
    handleDialogOpenChange,
    handleDiscardChanges,
    handleSaveAndClose,
  } = useFormDialogUnsavedChanges({
    form,
    onOpenChange,
    onSave: async () => {
      const isValid = await form.trigger();
      if (isValid) {
        await form.handleSubmit(handleFormSubmit)();
      }
    },
  });

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <DialogTitle>
              {isExistingProduct ? product?.name : "Add New Product"}
            </DialogTitle>
            {isExistingProduct && (
              <Badge variant={isEditMode ? "default" : "secondary"}>
                {isEditMode ? "Editing" : "Viewing"}
              </Badge>
            )}
          </div>
          {isExistingProduct && !isEditMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="bom" disabled={!isExistingProduct}>Recipe</TabsTrigger>
            <TabsTrigger value="nutrition" disabled={!isExistingProduct}>Nutrition</TabsTrigger>
            <TabsTrigger value="qa" disabled={!isExistingProduct}>QA</TabsTrigger>
            <TabsTrigger value="sizes" disabled={!isExistingProduct}>Sizes & UPC</TabsTrigger>
            <TabsTrigger value="spec" disabled={!isExistingProduct}>Spec Sheet</TabsTrigger>
            <TabsTrigger value="inventory" disabled={!isExistingProduct}>Inventory</TabsTrigger>
            <TabsTrigger value="analytics" disabled={!isExistingProduct}>Analytics</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Basic tab is inside the form for submission */}
            <TabsContent value="basic" className="mt-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} id="product-form">
                  <ProductBasicInfoTab 
                    form={form} 
                    isEditing={isExistingProduct} 
                    isFieldsDisabled={isFieldsDisabled}
                    currentProductId={product?.id}
                  />
                </form>
              </Form>
            </TabsContent>

            {/* Other tabs are outside the form to prevent button conflicts */}
            <TabsContent value="sizes" className="mt-0">
              {product?.id && (
                <ProductSizesTab 
                  productId={product.id}
                  productSku={product.sku || ""}
                  productName={product.name}
                  requiresUpc={product.requires_upc || false}
                  isFieldsDisabled={isFieldsDisabled}
                />
              )}
            </TabsContent>

            <TabsContent value="qa" className="mt-0">
              {product?.id && (
                <ProductQATab 
                  productId={product.id} 
                  productCategoryId={product.product_category_id || undefined}
                  isFieldsDisabled={isFieldsDisabled}
                />
              )}
            </TabsContent>

            <TabsContent value="bom" className="mt-0">
              {product?.id && (
                <ProductBOMTab 
                  productId={product.id} 
                  productName={product.name}
                  isFieldsDisabled={isFieldsDisabled}
                />
              )}
            </TabsContent>

            <TabsContent value="nutrition" className="mt-0">
              {product?.id && (
                <ProductNutritionTab 
                  productId={product.id} 
                  productName={product.name}
                  isFieldsDisabled={isFieldsDisabled}
                />
              )}
            </TabsContent>

            <TabsContent value="spec" className="mt-0">
              {product?.id && <ProductSpecSheetTab productId={product.id} productName={product.name} />}
            </TabsContent>

            <TabsContent value="inventory" className="mt-0">
              {product?.id && <ProductInventoryTab productId={product.id} />}
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              {product?.id && <ProductAnalyticsTab productId={product.id} productName={product.name} />}
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {isExistingProduct && isEditMode ? (
            <>
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                Cancel Edit
              </Button>
              {activeTab === "basic" && (
                <Button type="submit" form="product-form" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              )}
            </>
          ) : isExistingProduct && !isEditMode ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="product-form" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Product
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    <UnsavedChangesDialog
      open={showUnsavedChangesDialog}
      onOpenChange={setShowUnsavedChangesDialog}
      onDiscard={handleDiscardChanges}
      onKeepEditing={() => setShowUnsavedChangesDialog(false)}
      onSaveAndClose={handleSaveAndClose}
      showSaveOption={activeTab === "basic" && isEditMode}
      isSaving={isSubmitting}
    />
    </>
  );
}
