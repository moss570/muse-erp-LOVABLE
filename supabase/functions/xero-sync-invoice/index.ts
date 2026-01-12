import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID");
const XERO_CLIENT_SECRET = Deno.env.get("XERO_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  // Update stored tokens
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
  // Get the user's Xero connection
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
  
  // Check if token is expired or about to expire (5 min buffer)
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const { invoiceId, action } = await req.json();

    console.log(`Xero sync request: action=${action}, invoiceId=${invoiceId}`);

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Invoice ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get default account mapping for fallback
    const { data: mappings } = await supabase
      .from("xero_manufacturing_account_mappings")
      .select("*")
      .eq("mapping_key", "raw_material_inventory")
      .single();

    const defaultAccountCode = mappings?.xero_account_code || "300"; // Default fallback

    // Get invoice with supplier and line items including material GL account
    const { data: invoice, error: invoiceError } = await supabase
      .from("purchase_order_invoices")
      .select(`
        *,
        supplier:suppliers(*),
        line_items:invoice_line_items(
          *,
          material:materials(
            name,
            code,
            gl_account:gl_accounts(id, account_code, account_name)
          )
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get valid Xero access token
    const { accessToken, tenantId } = await getValidAccessToken(supabase, userId);

    // Build Xero invoice payload with material-level GL accounts
    const xeroInvoice = {
      Type: "ACCPAY", // Accounts Payable (supplier invoice)
      Contact: {
        Name: invoice.supplier?.name || "Unknown Supplier",
        EmailAddress: invoice.supplier?.email,
      },
      InvoiceNumber: invoice.invoice_number,
      Date: invoice.invoice_date,
      DueDate: invoice.due_date || invoice.invoice_date,
      Status: "AUTHORISED",
      LineItems: invoice.line_items?.map((item: any) => {
        // Use material's GL account code if available, otherwise fallback to default
        const accountCode = item.material?.gl_account?.account_code || defaultAccountCode;
        
        return {
          Description: item.description,
          Quantity: item.quantity,
          UnitAmount: item.unit_cost,
          AccountCode: accountCode,
          TaxType: "NONE",
        };
      }) || [],
    };

    // Add freight as a line item if present
    if (invoice.freight_amount && invoice.freight_amount > 0) {
      xeroInvoice.LineItems.push({
        Description: "Freight",
        Quantity: 1,
        UnitAmount: invoice.freight_amount,
        AccountCode: defaultAccountCode,
        TaxType: "NONE",
      });
    }

    // Add tax if present
    if (invoice.tax_amount && invoice.tax_amount > 0) {
      xeroInvoice.LineItems.push({
        Description: "Tax",
        Quantity: 1,
        UnitAmount: invoice.tax_amount,
        AccountCode: defaultAccountCode,
        TaxType: "NONE",
      });
    }

    console.log("Sending invoice to Xero:", JSON.stringify(xeroInvoice, null, 2));

    // Create or update invoice in Xero
    const xeroUrl = invoice.xero_invoice_id
      ? `https://api.xero.com/api.xro/2.0/Invoices/${invoice.xero_invoice_id}`
      : "https://api.xero.com/api.xro/2.0/Invoices";

    const xeroResponse = await fetch(xeroUrl, {
      method: invoice.xero_invoice_id ? "POST" : "PUT",
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
      // Log full error details server-side only for debugging
      console.error("Xero API error:", JSON.stringify(xeroResult, null, 2));
      
      // Extract safe error message for storage and client response
      const safeErrorMessage = xeroResult?.Message || 
        xeroResult?.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
        'Invoice sync failed';
      // Truncate to safe length and sanitize
      const sanitizedError = String(safeErrorMessage).substring(0, 200);
      
      // Update invoice with sanitized error (no sensitive details)
      await supabase
        .from("purchase_order_invoices")
        .update({
          xero_sync_status: "error",
          xero_sync_error: sanitizedError,
        })
        .eq("id", invoiceId);

      // Return generic error to client (no internal details exposed)
      return new Response(JSON.stringify({ 
        error: "Failed to sync invoice to Xero. Please check the invoice details and try again.",
        code: "xero_sync_failed"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xeroInvoiceId = xeroResult.Invoices?.[0]?.InvoiceID;
    console.log("Xero invoice created/updated:", xeroInvoiceId);

    // Update invoice with Xero reference
    await supabase
      .from("purchase_order_invoices")
      .update({
        xero_invoice_id: xeroInvoiceId,
        xero_sync_status: "synced",
        xero_synced_at: new Date().toISOString(),
        xero_sync_error: null,
      })
      .eq("id", invoiceId);

    return new Response(JSON.stringify({ 
      success: true, 
      xero_invoice_id: xeroInvoiceId,
      message: "Invoice synced to Xero successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Xero sync error:", error);
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