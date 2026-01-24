import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetPasswordRequest {
  userId: string;
  newPassword: string;
  forceSignOut?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the requesting user
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only administrators can set user passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { userId, newPassword, forceSignOut = true }: SetPasswordRequest = await req.json();

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: "userId and newPassword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password complexity
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return new Response(
        JSON.stringify({ 
          error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent admin from changing their own password via this endpoint
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "Administrators cannot change their own password using this tool. Use the standard password change flow." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target user info for audit log
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (targetError || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Force sign out all sessions if requested
    if (forceSignOut) {
      try {
        await supabaseAdmin.auth.admin.signOut(userId, "global");
      } catch (signOutError) {
        console.warn("Warning: Could not sign out user sessions:", signOutError);
        // Continue - password was still updated
      }
    }

    // Log to admin audit
    const { error: auditError } = await supabaseAdmin
      .from("admin_audit_log")
      .insert({
        admin_user_id: requestingUser.id,
        target_user_id: userId,
        action_type: "password_set",
        action_details: {
          target_email: targetUser.user.email,
          forced_signout: forceSignOut,
        },
        justification: "Password set by administrator",
      });

    if (auditError) {
      console.warn("Warning: Could not create audit log entry:", auditError);
      // Continue - the password change was still successful
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password updated successfully",
        sessionInvalidated: forceSignOut 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
