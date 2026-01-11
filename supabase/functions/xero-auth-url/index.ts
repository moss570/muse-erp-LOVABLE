const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, redirect_url } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
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
    const params = new URLSearchParams({
      response_type: "code",
      client_id: XERO_CLIENT_ID,
      redirect_uri: `${SUPABASE_URL}/functions/v1/xero-oauth-callback`,
      scope: "openid profile email accounting.transactions accounting.contacts offline_access",
      state,
    });

    const authUrl = `https://login.xero.com/identity/connect/authorize?${params.toString()}`;

    console.log("Generated Xero auth URL for user:", user_id);

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
