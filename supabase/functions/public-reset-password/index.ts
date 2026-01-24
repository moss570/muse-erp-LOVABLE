import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Record start time for timing attack prevention
  const startTime = Date.now();
  const MIN_RESPONSE_TIME = 1000; // Minimum 1 second response time

  try {
    // Parse request body
    const requestBody: ResetPasswordRequest = await req.json();
    const { email } = requestBody;

    // Validate email format
    if (!email || typeof email !== 'string') {
      // Wait minimum time before responding
      await ensureMinResponseTime(startTime, MIN_RESPONSE_TIME);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, you will receive a password reset link.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await ensureMinResponseTime(startTime, MIN_RESPONSE_TIME);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, you will receive a password reset link.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
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

    // Try to generate a password reset link
    // This will fail silently if the user doesn't exist
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    // If there's an error or no link, still return success (prevents email enumeration)
    if (linkError || !linkData?.properties?.action_link) {
      console.log('No user found or error generating link for:', email);
      await ensureMinResponseTime(startTime, MIN_RESPONSE_TIME);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, you will receive a password reset link.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send the password reset email using Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      await ensureMinResponseTime(startTime, MIN_RESPONSE_TIME);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'If an account exists with this email, you will receive a password reset link.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const actionLink = linkData.properties.action_link;

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

    const fromEmail = emailSettings?.from_email || 'noreply@musescoop.com';
    const fromName = emailSettings?.from_name || companyName;

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
              
              <p>You requested to reset your password. Click the button below to set a new password:</p>
              
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
    }

    // Always return success to prevent email enumeration
    await ensureMinResponseTime(startTime, MIN_RESPONSE_TIME);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error in public-reset-password:', error);
    
    // Always return success to prevent email enumeration
    await ensureMinResponseTime(startTime, MIN_RESPONSE_TIME);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});

async function ensureMinResponseTime(startTime: number, minTime: number): Promise<void> {
  const elapsed = Date.now() - startTime;
  if (elapsed < minTime) {
    await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
  }
}
