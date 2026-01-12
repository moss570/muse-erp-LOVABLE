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
    const { purchaseOrderId } = await req.json();

    console.log(`PO Bill sync request for PO: ${purchaseOrderId}`);

    if (!purchaseOrderId) {
      return new Response(JSON.stringify({ error: "Purchase Order ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service client for data operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get default account mapping for raw material inventory (fallback)
    const { data: mappings } = await supabase
      .from("xero_manufacturing_account_mappings")
      .select("*")
      .eq("mapping_key", "raw_material_inventory")
      .single();

    const defaultAccountCode = mappings?.xero_account_code || "630"; // Default fallback

    // Check if already synced
    const { data: existingPO } = await supabase
      .from("purchase_orders")
      .select("xero_invoice_id, po_number, order_date, status")
      .eq("id", purchaseOrderId)
      .single();

    if (existingPO?.xero_invoice_id) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "PO already synced to Xero",
        xero_invoice_id: existingPO.xero_invoice_id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get PO with supplier and line items including material GL account
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          material:materials(
            name, 
            code,
            gl_account:gl_accounts(id, account_code, account_name)
          )
        )
      `)
      .eq("id", purchaseOrderId)
      .single();

    if (poError || !po) {
      return new Response(JSON.stringify({ error: "Purchase Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate status
    if (po.status !== 'received' && po.status !== 'partially_received') {
      return new Response(JSON.stringify({ 
        error: "Only received POs can be synced to Xero",
        code: "invalid_status"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get valid Xero access token
    const { accessToken, tenantId } = await getValidAccessToken(supabase, userId);

    // Build Xero Bill (ACCPAY Invoice) payload
    // Use material-level GL account with fallback to default
    const xeroInvoice = {
      Type: "ACCPAY",
      Contact: {
        Name: po.supplier?.name || "Unknown Supplier",
        EmailAddress: po.supplier?.email,
      },
      InvoiceNumber: po.po_number,
      Reference: `PO-${po.po_number}`,
      Date: po.order_date,
      DueDate: po.expected_delivery_date || po.order_date,
      Status: "AUTHORISED",
      LineItems: po.items?.map((item: any) => {
        // Use material's GL account code if available, otherwise fallback to default
        const accountCode = item.material?.gl_account?.account_code || defaultAccountCode;
        
        return {
          Description: `${item.material?.name || 'Material'} (${item.material?.code || ''})`,
          Quantity: item.quantity_received || item.quantity_ordered,
          UnitAmount: item.unit_cost,
          AccountCode: accountCode,
          TaxType: "NONE",
        };
      }) || [],
    };

    // Add shipping as a line item if present
    if (po.shipping_amount && po.shipping_amount > 0) {
      xeroInvoice.LineItems.push({
        Description: "Freight / Shipping",
        Quantity: 1,
        UnitAmount: po.shipping_amount,
        AccountCode: defaultAccountCode,
        TaxType: "NONE",
      });
    }

    console.log("Sending Bill to Xero:", JSON.stringify(xeroInvoice, null, 2));

    // Create Bill in Xero
    const xeroResponse = await fetch("https://api.xero.com/api.xro/2.0/Invoices", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ Invoices: [xeroInvoice] }),
    });

    const xeroResult = await xeroResponse.json();

    if (!xeroResponse.ok) {
      console.error("Xero API error:", JSON.stringify(xeroResult, null, 2));
      
      const safeErrorMessage = xeroResult?.Message || 
        xeroResult?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
        'Bill sync failed';

      return new Response(JSON.stringify({ 
        error: "Failed to sync Bill to Xero. Please check the details and try again.",
        details: String(safeErrorMessage).substring(0, 200),
        code: "xero_sync_failed"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xeroInvoiceId = xeroResult.Invoices?.[0]?.InvoiceID;
    console.log("Xero Bill created:", xeroInvoiceId);

    // Update PO with Xero reference
    await supabase
      .from("purchase_orders")
      .update({
        xero_invoice_id: xeroInvoiceId,
        xero_synced_at: new Date().toISOString(),
      })
      .eq("id", purchaseOrderId);

    return new Response(JSON.stringify({ 
      success: true, 
      xero_invoice_id: xeroInvoiceId,
      message: "Purchase Order synced to Xero as Bill"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("PO Bill sync error:", error);
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