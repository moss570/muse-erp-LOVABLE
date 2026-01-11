import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID");
const XERO_CLIENT_SECRET = Deno.env.get("XERO_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function refreshTokenIfNeeded(supabase: any, connection: any) {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  
  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token;
  }

  console.log("Refreshing Xero token...");
  
  const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
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

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token refresh failed:", errorText);
    throw new Error("Failed to refresh Xero token");
  }

  const tokens = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Update stored tokens
  await supabase
    .from("xero_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq("id", connection.id);

  console.log("Token refreshed successfully");
  return tokens.access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from JWT
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Xero connection for user
    const { data: connection, error: connError } = await supabaseClient
      .from("xero_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "No Xero connection found. Please connect to Xero first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabaseClient, connection);

    // Validate scopes before calling Xero APIs
    const scopes = getXeroTokenScopes(accessToken);
    if (!scopes.includes("accounting.settings")) {
      console.warn("Xero token missing accounting.settings scope", { scopes });
      return new Response(
        JSON.stringify({
          error: "Missing required Xero permission: accounting.settings. Please reconnect to Xero.",
          code: "xero_missing_scope",
          required_scope: "accounting.settings",
          scopes,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch accounts from Xero
    console.log("Fetching accounts from Xero...");
    const accountsResponse = await fetch(
      "https://api.xero.com/api.xro/2.0/Accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Xero-tenant-id": connection.tenant_id,
          Accept: "application/json",
        },
      }
    );

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error("Failed to fetch Xero accounts:", errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch accounts from Xero", details: errorText }), {
        status: accountsResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountsData = await accountsResponse.json();
    console.log(`Fetched ${accountsData.Accounts?.length || 0} accounts from Xero`);

    // Transform accounts to a simpler format
    const accounts = (accountsData.Accounts || []).map((account: any) => ({
      xero_account_id: account.AccountID,
      account_code: account.Code || "",
      account_name: account.Name,
      account_type: mapXeroAccountType(account.Type, account.Class),
      xero_type: account.Type,
      xero_class: account.Class,
      status: account.Status,
      tax_type: account.TaxType,
    }));

    return new Response(JSON.stringify({ accounts, tenant_name: connection.tenant_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error fetching Xero accounts:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getXeroTokenScopes(accessToken: string): string[] {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return [];
    const payload = parts[1];
    const json = JSON.parse(atob(base64UrlToBase64(payload)));
    const scope = json.scope;
    if (Array.isArray(scope)) return scope;
    if (typeof scope === "string") return scope.split(" ");
    return [];
  } catch (e) {
    console.warn("Unable to parse Xero token scopes", e);
    return [];
  }
}

function base64UrlToBase64(input: string): string {
  return input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
}

function mapXeroAccountType(xeroType: string, xeroClass: string): string {
  // Map Xero account types to our internal types
  const typeMap: Record<string, string> = {
    BANK: "asset",
    CURRENT: "asset",
    CURRLIAB: "liability",
    DEPRECIATN: "expense",
    DIRECTCOSTS: "cogs",
    EQUITY: "equity",
    EXPENSE: "expense",
    FIXED: "asset",
    INVENTORY: "asset",
    LIABILITY: "liability",
    NONCURRENT: "asset",
    OTHERINCOME: "revenue",
    OVERHEADS: "expense",
    PREPAYMENT: "asset",
    REVENUE: "revenue",
    SALES: "revenue",
    TERMLIAB: "liability",
    PAYGLIABILITY: "liability",
    SUPERANNUATIONEXPENSE: "expense",
    SUPERANNUATIONLIABILITY: "liability",
    WAGESEXPENSE: "expense",
  };

  return typeMap[xeroType] || (xeroClass === "REVENUE" ? "revenue" : "expense");
}
