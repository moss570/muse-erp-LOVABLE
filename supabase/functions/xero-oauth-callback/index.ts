import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID");
const XERO_CLIENT_SECRET = Deno.env.get("XERO_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // Contains user_id and redirect_url
    const error = url.searchParams.get("error");

    console.log("Xero OAuth callback received", { code: !!code, state: !!state, error });

    if (error) {
      console.error("Xero OAuth error:", error);
      return new Response(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>${error}</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(JSON.stringify({ error: "Missing code or state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse state to get user info
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, redirect_url } = stateData;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${SUPABASE_URL}/functions/v1/xero-oauth-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return new Response(JSON.stringify({ error: "Token exchange failed", details: errorText }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokens = await tokenResponse.json();
    console.log("Token exchange successful");

    // Get connected tenants (organizations)
    const tenantsResponse = await fetch("https://api.xero.com/connections", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!tenantsResponse.ok) {
      const errorText = await tenantsResponse.text();
      console.error("Failed to get tenants:", errorText);
      return new Response(JSON.stringify({ error: "Failed to get Xero tenants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenants = await tenantsResponse.json();
    console.log("Tenants retrieved:", tenants.length);

    if (tenants.length === 0) {
      return new Response(`
        <html>
          <body>
            <h1>No Organizations Found</h1>
            <p>Please connect a Xero organization to your app.</p>
          </body>
        </html>
      `, {
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    // Store tokens for each tenant (usually just one for demo company)
    // Use service role to bypass RLS for server-side token storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    for (const tenant of tenants) {
      const { error: upsertError } = await supabase
        .from("xero_connections")
        .upsert({
          user_id,
          tenant_id: tenant.tenantId,
          tenant_name: tenant.tenantName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
        }, {
          onConflict: "user_id,tenant_id",
        });

      if (upsertError) {
        console.error("Failed to store Xero connection:", upsertError);
      } else {
        console.log(`Stored connection for tenant: ${tenant.tenantName}`);
      }
    }

    // Redirect back to the app with success
    const successUrl = redirect_url || "/";
    return new Response(`
      <html>
        <body>
          <h1>Connected to Xero!</h1>
          <p>Connected to: ${tenants.map((t: any) => t.tenantName).join(", ")}</p>
          <p>Redirecting...</p>
          <script>
            setTimeout(() => {
              window.opener?.postMessage({ type: 'xero-connected', success: true }, '*');
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });

  } catch (error: unknown) {
    console.error("Xero OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
