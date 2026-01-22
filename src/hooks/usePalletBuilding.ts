import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Pallet {
  id: string;
  pallet_number: string;
  status: string;
  purpose: string | null;
  location_id: string | null;
  customer_id: string | null;
  total_cases: number | null;
  total_weight_kg: number | null;
  created_at: string;
  updated_at: string;
  location?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
}

export interface PalletCase {
  id: string;
  pallet_id: string;
  production_lot_id: string | null;
  case_label_id: string | null;
  quantity: number;
  added_at: string;
  removed_at: string | null;
  production_lot?: {
    id: string;
    lot_number: string;
    quantity_available: number;
    expiration_date: string | null;
    product?: { id: string; name: string; sku: string } | null;
    product_size?: { id: string; sku: string; size_name: string } | null;
  } | null;
}

export interface AvailableCase {
  id: string;
  lot_number: string;
  product_name: string;
  product_sku: string;
  size_sku: string | null;
  size_name: string | null;
  quantity_available: number;
  cases_on_pallets: number;
  available_for_palletization: number;
  expiration_date: string | null;
}

export function usePalletBuilding() {
  const queryClient = useQueryClient();

  // Fetch pallets that are currently being built
  const { data: activePallets = [], isLoading: loadingPallets } = useQuery({
    queryKey: ["active-pallets"],
    queryFn: async (): Promise<Pallet[]> => {
      const { data, error } = await supabase
        .from("pallets")
        .select(`
          *,
          location:locations(id, name),
          customer:customers(id, name)
        `)
        .eq("status", "building")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Pallet[];
    },
  });

  // Fetch cases for a specific pallet
  const usePalletCases = (palletId: string | null) => {
    return useQuery({
      queryKey: ["pallet-cases", palletId],
      queryFn: async (): Promise<PalletCase[]> => {
        if (!palletId) return [];
        
        const { data, error } = await supabase
          .from("pallet_cases")
          .select(`
            *,
            production_lot:production_lots(
              id,
              lot_number,
              quantity_available,
              expiration_date,
              product:products(id, name, sku),
              product_size:product_sizes(id, sku, size_name)
            )
          `)
          .eq("pallet_id", palletId)
          .is("removed_at", null)
          .order("added_at", { ascending: false });

        if (error) throw error;
        return (data || []) as unknown as PalletCase[];
      },
      enabled: !!palletId,
    });
  };

  // Fetch available cases for palletization (approved case-packed lots)
  const { data: availableCases = [], isLoading: loadingCases } = useQuery({
    queryKey: ["available-cases-for-palletization"],
    queryFn: async (): Promise<AvailableCase[]> => {
      // Get all approved case-pack lots
      const { data: lots, error } = await supabase
        .from("production_lots")
        .select(`
          id,
          lot_number,
          quantity_available,
          expiration_date,
          product:products(id, name, sku),
          product_size:product_sizes(id, sku, size_name, size_type)
        `)
        .eq("approval_status", "Approved")
        .gt("quantity_available", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get cases already on pallets
      const { data: palletCases, error: pcError } = await supabase
        .from("pallet_cases")
        .select("production_lot_id, quantity")
        .is("removed_at", null);

      if (pcError) throw pcError;

      // Calculate cases on pallets per lot
      const casesOnPalletsMap = new Map<string, number>();
      (palletCases || []).forEach((pc: any) => {
        if (pc.production_lot_id) {
          casesOnPalletsMap.set(
            pc.production_lot_id,
            (casesOnPalletsMap.get(pc.production_lot_id) || 0) + pc.quantity
          );
        }
      });

      // Filter to only case-type sizes and calculate available quantities
      const result: AvailableCase[] = [];
      for (const lot of (lots || [])) {
        const lotData = lot as any;
        const sizeType = lotData.product_size?.size_type;
        
        // Only include case-type sizes for palletization
        if (sizeType === "case") {
          const casesOnPallets = casesOnPalletsMap.get(lotData.id) || 0;
          const availableForPalletization = lotData.quantity_available - casesOnPallets;
          
          if (availableForPalletization > 0) {
            result.push({
              id: lotData.id,
              lot_number: lotData.lot_number,
              product_name: lotData.product?.name || "",
              product_sku: lotData.product?.sku || "",
              size_sku: lotData.product_size?.sku || null,
              size_name: lotData.product_size?.size_name || null,
              quantity_available: lotData.quantity_available,
              cases_on_pallets: casesOnPallets,
              available_for_palletization: availableForPalletization,
              expiration_date: lotData.expiration_date,
            });
          }
        }
      }

      return result;
    },
  });

  // Create a new pallet
  const createPalletMutation = useMutation({
    mutationFn: async (purpose: string = "storage") => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Generate pallet number (PLT-YYYY-XXXX)
      const year = new Date().getFullYear();
      const { data: lastPallet } = await supabase
        .from("pallets")
        .select("pallet_number")
        .ilike("pallet_number", `PLT-${year}-%`)
        .order("pallet_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      let sequence = 1;
      if (lastPallet?.pallet_number) {
        const match = lastPallet.pallet_number.match(/PLT-\d{4}-(\d+)/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }

      const palletNumber = `PLT-${year}-${String(sequence).padStart(4, "0")}`;

      const { data, error } = await supabase
        .from("pallets")
        .insert({
          pallet_number: palletNumber,
          status: "building",
          purpose: purpose,
          created_by: userData?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["active-pallets"] });
      toast.success("Pallet created", {
        description: `${(data as any).pallet_number} is ready for building`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to create pallet", { description: error.message });
    },
  });

  // Add case to pallet
  const addCaseToPalletMutation = useMutation({
    mutationFn: async ({
      palletId,
      productionLotId,
      quantity,
    }: {
      palletId: string;
      productionLotId: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase
        .from("pallet_cases")
        .insert({
          pallet_id: palletId,
          production_lot_id: productionLotId,
          quantity: quantity,
          product_id: null, // Will be set by trigger if needed
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update pallet total cases
      const { data: palletCases } = await supabase
        .from("pallet_cases")
        .select("quantity")
        .eq("pallet_id", palletId)
        .is("removed_at", null);

      const totalCases = (palletCases || []).reduce((sum, pc) => sum + pc.quantity, 0);
      
      await supabase
        .from("pallets")
        .update({ total_cases: totalCases })
        .eq("id", palletId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pallet-cases", variables.palletId] });
      queryClient.invalidateQueries({ queryKey: ["available-cases-for-palletization"] });
      queryClient.invalidateQueries({ queryKey: ["active-pallets"] });
      toast.success("Cases added to pallet");
    },
    onError: (error: any) => {
      toast.error("Failed to add cases", { description: error.message });
    },
  });

  // Remove case from pallet
  const removeCaseFromPalletMutation = useMutation({
    mutationFn: async ({ palletCaseId, palletId }: { palletCaseId: string; palletId: string }) => {
      const { error } = await supabase
        .from("pallet_cases")
        .update({ removed_at: new Date().toISOString() })
        .eq("id", palletCaseId);

      if (error) throw error;

      // Update pallet total cases
      const { data: palletCases } = await supabase
        .from("pallet_cases")
        .select("quantity")
        .eq("pallet_id", palletId)
        .is("removed_at", null);

      const totalCases = (palletCases || []).reduce((sum, pc) => sum + pc.quantity, 0);
      
      await supabase
        .from("pallets")
        .update({ total_cases: totalCases })
        .eq("id", palletId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pallet-cases", variables.palletId] });
      queryClient.invalidateQueries({ queryKey: ["available-cases-for-palletization"] });
      queryClient.invalidateQueries({ queryKey: ["active-pallets"] });
      toast.success("Case removed from pallet");
    },
    onError: (error: any) => {
      toast.error("Failed to remove case", { description: error.message });
    },
  });

  // Complete pallet
  const completePalletMutation = useMutation({
    mutationFn: async ({
      palletId,
      locationId,
      purpose,
      customerId,
    }: {
      palletId: string;
      locationId?: string;
      purpose?: string;
      customerId?: string;
    }) => {
      const updateData: Record<string, any> = {
        status: "complete",
      };
      
      if (locationId) updateData.location_id = locationId;
      if (purpose) updateData.purpose = purpose;
      if (customerId) updateData.customer_id = customerId;

      const { data, error } = await supabase
        .from("pallets")
        .update(updateData)
        .eq("id", palletId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["active-pallets"] });
      queryClient.invalidateQueries({ queryKey: ["pallet-cases"] });
      toast.success("Pallet completed", {
        description: `${(data as any).pallet_number} is ready for storage/shipping`,
      });
    },
    onError: (error: any) => {
      toast.error("Failed to complete pallet", { description: error.message });
    },
  });

  return {
    activePallets,
    loadingPallets,
    availableCases,
    loadingCases,
    usePalletCases,
    createPallet: createPalletMutation.mutate,
    isCreatingPallet: createPalletMutation.isPending,
    addCaseToPallet: addCaseToPalletMutation.mutate,
    isAddingCase: addCaseToPalletMutation.isPending,
    removeCaseFromPallet: removeCaseFromPalletMutation.mutate,
    isRemovingCase: removeCaseFromPalletMutation.isPending,
    completePallet: completePalletMutation.mutate,
    isCompletingPallet: completePalletMutation.isPending,
  };
}
