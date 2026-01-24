import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendWelcomeEmailRequest {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  isResend?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

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

    // Verify the requesting user using getClaims
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
      throw new Error('Insufficient permissions');
    }

    // Parse request body
    const requestBody: SendWelcomeEmailRequest = await req.json();
    const { employeeId, email, firstName, lastName, isResend = false } = requestBody;

    if (!employeeId || !email) {
      throw new Error('Missing required fields: employeeId and email are required');
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

    // Get the employee's profile_id to find the user
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('profile_id')
      .eq('id', employeeId)
      .single();

    if (empError || !employee?.profile_id) {
      throw new Error('Employee does not have a user account');
    }

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError || !resetData?.properties?.action_link) {
      console.error('Failed to generate reset link:', resetError);
      throw new Error('Failed to generate password setup link');
    }

    const resetUrl = resetData.properties.action_link;

    // Get company settings for branding
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('company_name, email, logo_url')
      .limit(1)
      .single();

    // Fetch email settings for employee welcome emails
    const { data: emailSettings } = await supabaseAdmin
      .from('email_settings')
      .select('from_name, from_email, reply_to, is_active')
      .eq('email_type', 'employee_welcome')
      .single();

    const companyName = companySettings?.company_name || 'Our Company';
    const supportEmail = companySettings?.email || 'support@example.com';

    const fromName = emailSettings?.from_name || companyName;
    const fromEmail = emailSettings?.from_email || 'noreply@musescoop.com';

    // Send email via Resend
    const resend = new Resend(resendApiKey);

    const emailSubject = isResend
      ? `Reminder: Set Up Your ${companyName} Account`
      : `Welcome to ${companyName} - Set Up Your Account`;

    const emailResponse = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      reply_to: emailSettings?.reply_to || supportEmail,
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #eee;">
                      <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                        ${isResend ? 'Account Setup Reminder' : 'Welcome to ' + companyName + '!'}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                        Hi ${firstName || 'there'},
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                        ${isResend
                          ? `This is a reminder that your ${companyName} account is ready and waiting for you. Please set up your password to access the system.`
                          : `Your account has been created for ${companyName}'s management system. To get started, please set your password using the button below.`
                        }
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" 
                               style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                              Set My Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 15px; color: #666; font-size: 14px; line-height: 1.6;">
                        <strong>Your login email:</strong> ${email}
                      </p>
                      
                      <p style="margin: 0 0 15px; color: #666; font-size: 14px; line-height: 1.6;">
                        This link will expire in 24 hours for security reasons. If you need a new link, please contact your HR administrator.
                      </p>
                      
                      <p style="margin: 20px 0 0; color: #999; font-size: 13px; line-height: 1.6;">
                        If you didn't request this email, you can safely ignore it.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #fafafa; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0; color: #999; font-size: 12px; text-align: center;">
                        Questions? Contact us at <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a>
                      </p>
                      <p style="margin: 10px 0 0; color: #999; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} ${companyName}. All rights reserved.
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
    });

    console.log('Welcome email sent successfully:', emailResponse);

    // Record the invitation in the database
    const { data: invitationRecord, error: inviteError } = await supabaseAdmin
      .from('employee_account_invitations')
      .insert({
        employee_id: employeeId,
        user_id: employee.profile_id,
        email: email,
        invited_by: requestingUserId,
        invitation_type: isResend ? 'resend' : 'initial',
        email_sent: true,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to record invitation:', inviteError);
      // Don't throw - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Welcome email sent successfully',
        invitationId: invitationRecord?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error sending welcome email:', error);
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
