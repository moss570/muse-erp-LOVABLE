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
    const { batchDate, productionLotIds } = await req.json();

    console.log(`FG Completion journal sync for date: ${batchDate}, lots: ${productionLotIds?.length || 0}`);

    if (!batchDate || !productionLotIds?.length) {
      return new Response(JSON.stringify({ error: "Batch date and production lot IDs required" }), {
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
      throw new Error("Failed to fetch account mappings");
    }

    const mappingsByKey = Object.fromEntries(
      (mappings || []).map((m: any) => [m.mapping_key, m])
    );

    // Validate required mappings
    const requiredMappings = ['wip_inventory', 'finished_goods_inventory'];
    const missingMappings = requiredMappings.filter(
      key => !mappingsByKey[key]?.xero_account_code
    );

    if (missingMappings.length > 0) {
      return new Response(JSON.stringify({ 
        error: `Missing Xero account mappings: ${missingMappings.join(', ')}`,
        code: "missing_mappings"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the production lots
    const { data: productionLots, error: lotsError } = await supabase
      .from("production_lots")
      .select("*")
      .in("id", productionLotIds);

    if (lotsError || !productionLots?.length) {
      return new Response(JSON.stringify({ error: "Production lots not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate total WIP value to transfer to FG
    let totalWipValue = 0;
    for (const lot of productionLots) {
      totalWipValue += Number(lot.total_cost) || 0;
    }

    if (totalWipValue === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "No WIP value to transfer - all lots have zero costs.",
        lotsProcessed: productionLots.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get valid Xero access token
    const { accessToken, tenantId } = await getValidAccessToken(supabase, userId);

    // Build Xero Manual Journal for FG Completion
    // Transaction 2: Completion (Finished Goods)
    // Debit: Finished Goods Inventory Asset
    // Credit: WIP Inventory Asset
    
    const journalLines = [
      {
        Description: `Finished Goods - ${batchDate} (${productionLots.length} lots completed)`,
        LineAmount: totalWipValue.toFixed(2),
        AccountCode: mappingsByKey['finished_goods_inventory'].xero_account_code,
      },
      {
        Description: `WIP Transfer to FG - ${batchDate}`,
        LineAmount: (-totalWipValue).toFixed(2),
        AccountCode: mappingsByKey['wip_inventory'].xero_account_code,
      },
    ];

    const manualJournal = {
      Date: batchDate,
      Narration: `FG Completion Journal - ${batchDate} (${productionLots.length} production lots)`,
      Status: "POSTED",
      JournalLines: journalLines,
    };

    console.log("Sending FG Completion Journal to Xero:", JSON.stringify(manualJournal, null, 2));

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

      // Create batch record with error
      await supabase
        .from("xero_journal_batches")
        .insert({
          batch_date: batchDate,
          batch_type: 'completion',
          status: 'error',
          sync_error: String(safeErrorMessage).substring(0, 200),
          total_wip_amount: totalWipValue,
          production_lot_ids: productionLotIds,
          created_by: userId,
        });

      return new Response(JSON.stringify({ 
        error: "Failed to sync FG completion journal to Xero.",
        code: "xero_sync_failed"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xeroJournalId = xeroResult.ManualJournals?.[0]?.ManualJournalID;
    console.log("Xero FG Completion Journal created:", xeroJournalId);

    // Create batch record
    await supabase
      .from("xero_journal_batches")
      .insert({
        batch_date: batchDate,
        batch_type: 'completion',
        xero_journal_id: xeroJournalId,
        status: 'synced',
        synced_at: new Date().toISOString(),
        total_wip_amount: totalWipValue,
        production_lot_ids: productionLotIds,
        created_by: userId,
      });

    return new Response(JSON.stringify({ 
      success: true, 
      xero_journal_id: xeroJournalId,
      message: `FG Completion journal synced (${productionLots.length} lots, $${totalWipValue.toFixed(2)})`,
      lotsProcessed: productionLots.length,
      totalValue: totalWipValue,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("FG Completion journal sync error:", error);
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
