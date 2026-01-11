import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID");
const XERO_CLIENT_SECRET = Deno.env.get("XERO_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshXeroToken(supabase: any, connection: any) {
  console.log("Refreshing Xero token for tenant:", connection.tenant_name);
  
  const response = await fetch("https://identity.xero.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh failed:", errorText);
    throw new Error("Failed to refresh Xero token");
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabase
    .from("xero_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq("id", connection.id);

  return tokens.access_token;
}

async function getValidAccessToken(supabase: any, userId: string) {
  const { data: connections, error } = await supabase
    .from("xero_connections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !connections?.length) {
    throw new Error("No Xero connection found. Please connect to Xero first.");
  }

  const connection = connections[0];
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    return {
      accessToken: await refreshXeroToken(supabase, connection),
      tenantId: connection.tenant_id,
    };
  }

  return {
    accessToken: connection.access_token,
    tenantId: connection.tenant_id,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const { batchDate } = await req.json();

    console.log(`Production journal sync request for date: ${batchDate}`);

    if (!batchDate) {
      return new Response(JSON.stringify({ error: "Batch date required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service client for data operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get account mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from("xero_manufacturing_account_mappings")
      .select("*");

    if (mappingsError) {
      console.error("Error fetching account mappings:", mappingsError);
      throw new Error("Failed to fetch account mappings");
    }

    const mappingsByKey = Object.fromEntries(
      (mappings || []).map((m: any) => [m.mapping_key, m])
    );

    // Validate required mappings
    const requiredMappings = ['applied_labor', 'applied_overhead', 'wip_inventory', 'raw_material_inventory'];
    const missingMappings = requiredMappings.filter(
      key => !mappingsByKey[key]?.xero_account_code
    );

    if (missingMappings.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Missing Xero account mappings: ${missingMappings.join(', ')}. Please configure them in Settings > Xero Configuration.`,
        code: "missing_mappings"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unsynced completed production lots for this date
    const { data: productionLots, error: lotsError } = await supabase
      .from("production_lots")
      .select("*")
      .eq("production_date", batchDate)
      .eq("is_synced_to_xero", false)
      .in("status", ["completed", "Completed", "COMPLETED"]);

    if (lotsError) {
      console.error("Error fetching production lots:", lotsError);
      throw new Error("Failed to fetch production lots");
    }

    if (!productionLots || productionLots.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "No unsynced production runs found for this date.",
        lotsProcessed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${productionLots.length} unsynced production lots`);

    // Aggregate costs from all production lots
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalOverheadCost = 0;
    const lotIds: string[] = [];

    for (const lot of productionLots) {
      totalMaterialCost += Number(lot.material_cost) || 0;
      totalLaborCost += Number(lot.labor_cost) || 0;
      totalOverheadCost += Number(lot.overhead_cost) || 0;
      lotIds.push(lot.id);
    }

    const totalWipAmount = totalMaterialCost + totalLaborCost + totalOverheadCost;

    console.log(`Aggregated costs - Material: ${totalMaterialCost}, Labor: ${totalLaborCost}, Overhead: ${totalOverheadCost}, Total WIP: ${totalWipAmount}`);

    if (totalWipAmount === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "No costs to sync - all production runs have zero costs.",
        lotsProcessed: productionLots.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get valid Xero access token
    const { accessToken, tenantId } = await getValidAccessToken(supabase, userId);

    // Build Xero Manual Journal payload
    // Transaction 1: Production Run (The "Make" Event)
    // Debit: WIP Inventory Asset
    // Credit: Raw Material Inventory Asset
    // Credit: Applied Labor (Expense - creates contra-expense effect)
    // Credit: Applied Overhead (Expense - creates contra-expense effect)
    
    const journalLines = [
      // DEBIT: WIP Inventory (total of all costs)
      {
        Description: `Production WIP - ${batchDate} (${productionLots.length} runs)`,
        LineAmount: totalWipAmount.toFixed(2),
        AccountCode: mappingsByKey['wip_inventory'].xero_account_code,
      },
      // CREDIT: Raw Material Inventory (material cost)
      {
        Description: `Raw Materials consumed - ${batchDate}`,
        LineAmount: (-totalMaterialCost).toFixed(2),
        AccountCode: mappingsByKey['raw_material_inventory'].xero_account_code,
      },
    ];

    // Only add labor credit if there's labor cost
    if (totalLaborCost > 0) {
      journalLines.push({
        Description: `Applied Labor - ${batchDate}`,
        LineAmount: (-totalLaborCost).toFixed(2),
        AccountCode: mappingsByKey['applied_labor'].xero_account_code,
      });
    }

    // Only add overhead credit if there's overhead cost
    if (totalOverheadCost > 0) {
      journalLines.push({
        Description: `Applied Overhead - ${batchDate}`,
        LineAmount: (-totalOverheadCost).toFixed(2),
        AccountCode: mappingsByKey['applied_overhead'].xero_account_code,
      });
    }

    const manualJournal = {
      Date: batchDate,
      Narration: `Daily Production Journal - ${batchDate} (${productionLots.length} production runs)`,
      Status: "POSTED",
      JournalLines: journalLines,
    };

    console.log("Sending Manual Journal to Xero:", JSON.stringify(manualJournal, null, 2));

    // Create Manual Journal in Xero
    const xeroResponse = await fetch("https://api.xero.com/api.xro/2.0/ManualJournals", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ ManualJournals: [manualJournal] }),
    });

    const xeroResult = await xeroResponse.json();

    if (!xeroResponse.ok) {
      console.error("Xero API error:", JSON.stringify(xeroResult, null, 2));
      
      const safeErrorMessage = xeroResult?.Message || 
        xeroResult?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
        'Journal sync failed';
      const sanitizedError = String(safeErrorMessage).substring(0, 200);

      // Create batch record with error
      await supabase
        .from("xero_journal_batches")
        .insert({
          batch_date: batchDate,
          batch_type: 'production',
          status: 'error',
          sync_error: sanitizedError,
          total_wip_amount: totalWipAmount,
          total_material_amount: totalMaterialCost,
          total_labor_amount: totalLaborCost,
          total_overhead_amount: totalOverheadCost,
          production_lot_ids: lotIds,
          created_by: userId,
        });

      return new Response(JSON.stringify({ 
        error: "Failed to sync journal to Xero. Please check account mappings and try again.",
        code: "xero_sync_failed"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xeroJournalId = xeroResult.ManualJournals?.[0]?.ManualJournalID;
    console.log("Xero Manual Journal created:", xeroJournalId);

    const syncedAt = new Date().toISOString();

    // Update all production lots as synced
    const { error: updateLotsError } = await supabase
      .from("production_lots")
      .update({
        is_synced_to_xero: true,
        xero_journal_id: xeroJournalId,
        synced_at: syncedAt,
      })
      .in("id", lotIds);

    if (updateLotsError) {
      console.error("Error updating production lots:", updateLotsError);
    }

    // Create batch record
    await supabase
      .from("xero_journal_batches")
      .insert({
        batch_date: batchDate,
        batch_type: 'production',
        xero_journal_id: xeroJournalId,
        status: 'synced',
        synced_at: syncedAt,
        total_wip_amount: totalWipAmount,
        total_material_amount: totalMaterialCost,
        total_labor_amount: totalLaborCost,
        total_overhead_amount: totalOverheadCost,
        production_lot_ids: lotIds,
        created_by: userId,
      });

    return new Response(JSON.stringify({ 
      success: true, 
      xero_journal_id: xeroJournalId,
      message: `Successfully synced ${productionLots.length} production runs to Xero`,
      lotsProcessed: productionLots.length,
      totals: {
        material: totalMaterialCost,
        labor: totalLaborCost,
        overhead: totalOverheadCost,
        wip: totalWipAmount,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Production journal sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
