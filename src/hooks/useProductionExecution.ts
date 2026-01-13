import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Types
export interface Product {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  approval_status: string | null;
}

export interface ProductRecipe {
  id: string;
  recipe_name: string;
  recipe_version: string | null;
  batch_size: number;
  batch_unit_id: string | null;
  is_default: boolean | null;
  is_active: boolean | null;
  standard_labor_hours: number | null;
  standard_machine_hours: number | null;
  instructions: string | null;
  batch_unit?: { code: string; name: string } | null;
}

export interface RecipeItem {
  id: string;
  listed_material_id: string | null;
  material_id: string | null; // Legacy for backward compatibility
  quantity_required: number;
  unit_id: string | null;
  wastage_percentage: number | null;
  sort_order: number | null;
  notes: string | null;
  listed_material: {
    id: string;
    name: string;
    code: string;
  } | null;
  material: {
    id: string;
    name: string;
    code: string;
    allergens: string[] | null;
    usage_unit_id: string | null;
    usage_unit?: { code: string; name: string } | null;
  } | null;
  unit?: { code: string; name: string } | null;
}

export interface LinkedMaterial {
  id: string;
  name: string;
  code: string;
  allergens: string[] | null;
  usage_unit_id: string | null;
  usage_unit?: { code: string; name: string } | null;
}

export interface AvailableLot {
  id: string;
  internal_lot_number: string;
  supplier_lot_number: string | null;
  expiry_date: string | null;
  current_quantity: number | null;
  current_location_id: string | null;
  status: string | null;
  landed_cost?: { cost_per_base_unit: number } | null;
}

export interface Machine {
  id: string;
  name: string;
  machine_number: string;
  is_active: boolean | null;
}

export interface WeighedIngredient {
  recipeItemId: string;
  materialId: string;
  materialName: string;
  requiredQuantity: number;
  unitAbbreviation: string;
  weighedQuantity: number;
  selectedLotId: string;
  selectedLotNumber: string;
  costPerUnit: number;
  totalCost: number;
  isCompleted: boolean;
}

// Hooks
export function useApprovedProducts() {
  return useQuery({
    queryKey: ["approved-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, is_active, approval_status")
        .eq("is_active", true)
        .eq("approval_status", "Approved")
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductRecipes(productId: string | null) {
  return useQuery({
    queryKey: ["product-recipes", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_recipes")
        .select(`
          id,
          recipe_name,
          recipe_version,
          batch_size,
          batch_unit_id,
          is_default,
          is_active,
          standard_labor_hours,
          standard_machine_hours,
          instructions,
          batch_unit:units_of_measure!product_recipes_batch_unit_id_fkey(code, name)
        `)
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("is_default", { ascending: false });

      if (error) throw error;
      return data as ProductRecipe[];
    },
    enabled: !!productId,
  });
}

export function useRecipeItems(recipeId: string | null) {
  return useQuery({
    queryKey: ["recipe-items", recipeId],
    queryFn: async () => {
      if (!recipeId) return [];
      
      const { data, error } = await supabase
        .from("product_recipe_items")
        .select(`
          id,
          listed_material_id,
          material_id,
          quantity_required,
          unit_id,
          wastage_percentage,
          sort_order,
          notes,
          listed_material:listed_material_names!product_recipe_items_listed_material_id_fkey(
            id, name, code
          ),
          material:materials!product_recipe_items_material_id_fkey(
            id,
            name,
            code,
            allergens,
            usage_unit_id,
            usage_unit:units_of_measure!materials_usage_unit_id_fkey(code, name)
          ),
          unit:units_of_measure!product_recipe_items_unit_id_fkey(code, name)
        `)
        .eq("recipe_id", recipeId)
        .order("sort_order", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as RecipeItem[];
    },
    enabled: !!recipeId,
  });
}

// Fetch linked materials for a listed material
export function useLinkedMaterials(listedMaterialId: string | null) {
  return useQuery({
    queryKey: ["linked-materials", listedMaterialId],
    queryFn: async () => {
      if (!listedMaterialId) return [];
      
      const { data, error } = await supabase
        .from("material_listed_material_links")
        .select(`
          material:materials!material_listed_material_links_material_id_fkey(
            id,
            name,
            code,
            allergens,
            usage_unit_id,
            usage_unit:units_of_measure!materials_usage_unit_id_fkey(code, name)
          )
        `)
        .eq("listed_material_id", listedMaterialId);

      if (error) throw error;
      
      // Extract materials from the junction table result
      return data
        .map((link: any) => link.material)
        .filter(Boolean) as LinkedMaterial[];
    },
    enabled: !!listedMaterialId,
  });
}

export function useAvailableLots(materialId: string | null) {
  return useQuery({
    queryKey: ["available-lots-fefo", materialId],
    queryFn: async () => {
      if (!materialId) return [];
      
      // Get receiving lots with current quantity > 0, ordered by expiry (FEFO)
      const { data, error } = await supabase
        .from("receiving_lots")
        .select(`
          id,
          internal_lot_number,
          supplier_lot_number,
          expiry_date,
          current_quantity,
          current_location_id,
          status
        `)
        .eq("material_id", materialId)
        .eq("status", "available")
        .gt("current_quantity", 0)
        .order("expiry_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch landed costs for each lot
      const lotsWithCosts = await Promise.all(
        (data || []).map(async (lot) => {
          const { data: costData } = await supabase
            .from("landed_cost_allocations")
            .select("cost_per_base_unit")
            .eq("receiving_lot_id", lot.id)
            .maybeSingle();
          
          return {
            ...lot,
            landed_cost: costData,
          };
        })
      );
      
      return lotsWithCosts as AvailableLot[];
    },
    enabled: !!materialId,
  });
}

export function useActiveMachines() {
  return useQuery({
    queryKey: ["active-machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("machines")
        .select("id, name, machine_number, is_active")
        .eq("is_active", true)
        .order("machine_number");

      if (error) throw error;
      return data as Machine[];
    },
  });
}

export function useCreateProductionLot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      productId,
      machineId,
      recipeId,
      quantityProduced,
      weighedIngredients,
      laborHours,
      machineHours,
      notes,
      isTrialBatch = false,
      trialCanvasData,
    }: {
      productId: string;
      machineId: string;
      recipeId: string;
      quantityProduced: number;
      weighedIngredients: WeighedIngredient[];
      laborHours: number;
      machineHours: number;
      notes?: string;
      isTrialBatch?: boolean;
      trialCanvasData?: string | null;
    }) => {
      // Get the lot number using the database function
      const { data: lotNumberData, error: lotNumberError } = await supabase
        .rpc("generate_production_lot_number", {
          p_machine_id: machineId,
          p_production_date: new Date().toISOString().split("T")[0],
        });

      if (lotNumberError) throw lotNumberError;

      const productionDate = new Date();
      const julianDay = Math.floor(
        (productionDate.getTime() - new Date(productionDate.getFullYear(), 0, 0).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // Calculate costs
      const totalMaterialCost = weighedIngredients.reduce(
        (sum, ing) => sum + ing.totalCost,
        0
      );

      // Get overhead settings
      const { data: overheadData } = await supabase
        .from("overhead_settings")
        .select("setting_key, setting_value");
      
      const overheadSettings = (overheadData || []).reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, number | null>);

      const laborRate = overheadSettings["labor_rate_per_hour"] || 25;
      const machineRate = overheadSettings["machine_rate_per_hour"] || 15;
      const overheadRate = overheadSettings["overhead_rate_per_unit"] || 0.5;

      const laborCost = laborHours * laborRate;
      const overheadCost = quantityProduced * overheadRate;
      const totalCost = totalMaterialCost + laborCost + overheadCost;

      // Get batch number for today
      const { data: existingLots } = await supabase
        .from("production_lots")
        .select("batch_number")
        .eq("machine_id", machineId)
        .eq("production_date", productionDate.toISOString().split("T")[0])
        .order("batch_number", { ascending: false })
        .limit(1);

      const batchNumber = (existingLots?.[0]?.batch_number || 0) + 1;

      // Create production lot
      const { data: productionLot, error: lotError } = await supabase
        .from("production_lots")
        .insert({
          lot_number: lotNumberData,
          product_id: productId,
          machine_id: machineId,
          recipe_id: recipeId,
          production_date: productionDate.toISOString().split("T")[0],
          julian_day: julianDay,
          batch_number: batchNumber,
          quantity_produced: quantityProduced,
          quantity_available: quantityProduced,
          material_cost: totalMaterialCost,
          labor_cost: laborCost,
          labor_hours: laborHours,
          machine_hours: machineHours,
          overhead_cost: overheadCost,
          total_cost: totalCost,
          status: "completed",
          approval_status: isTrialBatch ? "Trial" : "Pending_QA",
          produced_by: user?.id,
          notes,
          is_trial_batch: isTrialBatch,
          trial_canvas_url: trialCanvasData || null,
          cost_category: isTrialBatch ? "r_and_d" : "production",
        })
        .select()
        .single();

      if (lotError) throw lotError;

      // Create production lot materials and deduct from inventory
      for (const ingredient of weighedIngredients) {
        // Link material to production lot
        await supabase.from("production_lot_materials").insert({
          production_lot_id: productionLot.id,
          receiving_lot_id: ingredient.selectedLotId,
          quantity_used: ingredient.weighedQuantity,
        });

        // Deduct from receiving lot
        const { data: currentLot } = await supabase
          .from("receiving_lots")
          .select("current_quantity")
          .eq("id", ingredient.selectedLotId)
          .single();

        if (currentLot) {
          const newQuantity = (currentLot.current_quantity || 0) - ingredient.weighedQuantity;
          await supabase
            .from("receiving_lots")
            .update({ 
              current_quantity: newQuantity,
              last_transaction_at: new Date().toISOString()
            })
            .eq("id", ingredient.selectedLotId);
        }

        // Create inventory transaction
        await supabase.from("inventory_transactions").insert({
          transaction_type: "production_consume",
          receiving_lot_id: ingredient.selectedLotId,
          production_lot_id: productionLot.id,
          quantity: ingredient.weighedQuantity,
          material_id: ingredient.materialId,
          performed_by: user?.id,
          notes: `Consumed for production lot ${lotNumberData}`,
        });
      }

      return productionLot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-lots"] });
      queryClient.invalidateQueries({ queryKey: ["available-lots-fefo"] });
      queryClient.invalidateQueries({ queryKey: ["receiving-lots"] });
      toast({
        title: "Production lot created",
        description: "The production batch has been completed and saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating production lot",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
