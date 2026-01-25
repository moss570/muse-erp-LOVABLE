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

    // Get email settings for the noreply email type
    const { data: emailSettings } = await supabaseAdmin
      .from('email_settings')
      .select('from_email, from_name, reply_to')
      .eq('email_type', 'noreply')
      .eq('is_active', true)
      .single();

    // Fetch email template
    const { data: emailTemplate } = await supabaseAdmin
      .from('email_templates')
      .select('subject, heading, body_text, button_text, footer_text')
      .eq('email_type', 'admin_password_reset')
      .eq('is_active', true)
      .single();

    const fromEmail = emailSettings?.from_email || 'noreply@musescoop.com';
    const fromName = emailSettings?.from_name || companyName;

    // Use template values or defaults
    const subject = (emailTemplate?.subject || 'Password Reset Request')
      .replace(/\{\{COMPANY_NAME\}\}/g, companyName);
    
    const heading = (emailTemplate?.heading || 'Password Reset Request')
      .replace(/\{\{COMPANY_NAME\}\}/g, companyName);
    
    const bodyText = (emailTemplate?.body_text || 'A password reset has been requested for your account. Click the button below to set a new password.')
      .replace(/\{\{COMPANY_NAME\}\}/g, companyName);
    
    const buttonText = emailTemplate?.button_text || 'Reset Password';
    const footerText = (emailTemplate?.footer_text || "If you didn't request this password reset, you can safely ignore this email.")
      .replace(/\{\{COMPANY_NAME\}\}/g, companyName);

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <!--[if mso]>
            <noscript>
              <xml>
                <o:OfficeDocumentSettings>
                  <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
              </xml>
            </noscript>
            <![endif]-->
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 20px;">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background-color: #2563eb; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">${companyName}</h1>
                      </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                      <td style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
                        <h2 style="color: #333; margin-top: 0;">${heading}</h2>
                        
                        <p style="color: #333; font-size: 16px; line-height: 1.6;">${bodyText}</p>
                        
                        <!-- CTA Button - Table-based for maximum email client compatibility -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <!--[if mso]>
                              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionLink}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="16%" strokecolor="#2563eb" fillcolor="#2563eb">
                                <w:anchorlock/>
                                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">${buttonText}</center>
                              </v:roundrect>
                              <![endif]-->
                              <!--[if !mso]><!-->
                              <a href="${actionLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">${buttonText}</a>
                              <!--<![endif]-->
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Fallback link -->
                        <p style="margin: 20px 0 10px; color: #666; font-size: 13px; text-align: center;">
                          If the button above doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="margin: 0 0 20px; color: #2563eb; font-size: 12px; text-align: center; word-break: break-all;">
                          <a href="${actionLink}" style="color: #2563eb;">${actionLink}</a>
                        </p>
                        
                        <p style="color: #666; font-size: 14px;">${footerText}</p>
                        
                        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
                        
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center;">
                          This is an automated message from ${companyName}.<br>
                          Please do not reply to this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
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
