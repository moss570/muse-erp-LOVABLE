import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticatedUserId = claimsData.claims.sub;

    const { user_id, redirect_url } = await req.json();

    // Validate that the requested user_id matches the authenticated user
    if (!user_id || user_id !== authenticatedUserId) {
      console.error("User ID mismatch:", { requested: user_id, authenticated: authenticatedUserId });
      return new Response(JSON.stringify({ error: "Unauthorized - user ID mismatch" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!XERO_CLIENT_ID) {
      return new Response(JSON.stringify({ error: "Xero not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create state with user info
    const state = btoa(JSON.stringify({ user_id, redirect_url }));

    // Build Xero OAuth URL
    // `prompt=consent` forces Xero to show the consent screen again, which is required
    // when you add new scopes (like `accounting.settings`) after a previous connection.
    const params = new URLSearchParams({
      response_type: "code",
      client_id: XERO_CLIENT_ID,
      redirect_uri: `${SUPABASE_URL}/functions/v1/xero-oauth-callback`,
      scope: "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access",
      prompt: "consent",
      state,
    });

    const authUrl = `https://login.xero.com/identity/connect/authorize?${params.toString()}`;

    console.log("Generated Xero auth URL for authenticated user:", authenticatedUserId);

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating Xero auth URL:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
