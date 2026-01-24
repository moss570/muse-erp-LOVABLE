import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token to verify permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the requesting user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;

    // Check if user has admin, manager, or hr role
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId);

    if (roleError) {
      throw new Error('Failed to verify user permissions');
    }

    const hasPermission = userRoles?.some(
      (r) => r.role === 'admin' || r.role === 'manager' || r.role === 'hr'
    );

    if (!hasPermission) {
      throw new Error('Insufficient permissions. Only admins, managers, and HR can reset passwords.');
    }

    // Parse request body
    const requestBody: ResetPasswordRequest = await req.json();
    const { userId, email } = requestBody;

    // Validate required fields
    if (!userId || !email) {
      throw new Error('Missing required fields: userId and email are required');
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate a password reset link (type: 'recovery')
    // This uses the recovery flow which will trigger PASSWORD_RECOVERY event
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (linkError) {
      throw new Error(`Failed to generate recovery link: ${linkError.message}`);
    }

    // Send the password reset email using Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    // Extract the token from the link
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      throw new Error('Failed to generate action link');
    }

    // Get company settings for branding
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('company_name, logo_url')
      .single();

    const companyName = companySettings?.company_name || 'Muse ERP';

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Muse ERP <noreply@musegelato.com>',
        to: [email],
        subject: 'Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${companyName}</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
              
              <p>A password reset has been requested for your account. Click the button below to set a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">Reset Password</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              
              <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated message from ${companyName}.<br>
                Please do not reply to this email.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errorData = await emailRes.text();
      console.error('Resend error:', errorData);
      throw new Error('Failed to send password reset email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error resetting user password:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
