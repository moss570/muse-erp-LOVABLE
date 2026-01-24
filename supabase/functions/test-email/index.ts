import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  email_type: string;
  test_email: string;
}

const TEST_EMAIL_CONTENT: Record<string, { subject: string; html: string }> = {
  noreply: {
    subject: "[TEST] System Notification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">System Notification Test</h1>
        <p>This is a test email for the <strong>System Notifications</strong> email type.</p>
        <p>These emails are used for general system notifications, password resets, and other automated messages.</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0; color: #666;">Example: "Your password has been successfully reset."</p>
        </div>
        <p style="color: #888; font-size: 12px;">This is a test email. No action is required.</p>
      </div>
    `,
  },
  employee_welcome: {
    subject: "[TEST] Welcome to the Team!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Welcome to the Team!</h1>
        <p>This is a test email for the <strong>Employee Welcome</strong> email type.</p>
        <p>These emails are sent to new employees when their account is created.</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0;">Dear [Employee Name],</p>
          <p style="margin: 0 0 12px 0;">Your account has been created. Please click the button below to set up your password.</p>
          <a href="#" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Set Up Your Password</a>
        </div>
        <p style="color: #888; font-size: 12px;">This is a test email. No action is required.</p>
      </div>
    `,
  },
  invoices: {
    subject: "[TEST] Invoice #INV-2025-0001",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Invoice Notification Test</h1>
        <p>This is a test email for the <strong>Customer Invoices</strong> email type.</p>
        <p>These emails are sent to customers with their invoices attached.</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Invoice #:</strong></td><td>INV-2025-0001</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Amount:</strong></td><td>$1,234.56</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Due Date:</strong></td><td>February 1, 2025</td></tr>
          </table>
        </div>
        <p style="color: #888; font-size: 12px;">This is a test email. No action is required.</p>
      </div>
    `,
  },
  purchase_orders: {
    subject: "[TEST] Purchase Order #PO-2025-0001",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Purchase Order Test</h1>
        <p>This is a test email for the <strong>Purchase Orders</strong> email type.</p>
        <p>These emails are sent to suppliers when a purchase order is created.</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>PO #:</strong></td><td>PO-2025-0001</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Supplier:</strong></td><td>Sample Supplier Inc.</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Total:</strong></td><td>$5,678.90</td></tr>
          </table>
        </div>
        <p style="color: #888; font-size: 12px;">This is a test email. No action is required.</p>
      </div>
    `,
  },
  "3pl_releases": {
    subject: "[TEST] Pick Release Request #REL-2025-0001",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">3PL Release Test</h1>
        <p>This is a test email for the <strong>3PL Releases</strong> email type.</p>
        <p>These emails are sent to third-party logistics providers for pick/release requests.</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Release #:</strong></td><td>REL-2025-0001</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Customer:</strong></td><td>Sample Customer</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Items:</strong></td><td>15 cases</td></tr>
          </table>
        </div>
        <p style="color: #888; font-size: 12px;">This is a test email. No action is required.</p>
      </div>
    `,
  },
  sales: {
    subject: "[TEST] New Order Confirmation #ORD-2025-0001",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a1a1a;">Sales Notification Test</h1>
        <p>This is a test email for the <strong>Sales Notifications</strong> email type.</p>
        <p>These emails are sent for sales-related notifications and order confirmations.</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0;"><strong>Order #:</strong></td><td>ORD-2025-0001</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Customer:</strong></td><td>Sample Retailer</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Total:</strong></td><td>$2,345.67</td></tr>
          </table>
        </div>
        <p style="color: #888; font-size: 12px;">This is a test email. No action is required.</p>
      </div>
    `,
  },
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_type, test_email }: TestEmailRequest = await req.json();

    // Validate required fields
    if (!email_type || !test_email) {
      throw new Error("Missing required fields: email_type and test_email");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch email settings for this type
    const { data: emailSettings, error: settingsError } = await supabase
      .from("email_settings")
      .select("from_name, from_email, reply_to, is_active")
      .eq("email_type", email_type)
      .single();

    if (settingsError) {
      console.error("Error fetching email settings:", settingsError);
      throw new Error(`Email settings not found for type: ${email_type}`);
    }

    if (!emailSettings.is_active) {
      throw new Error(`Email type "${email_type}" is currently disabled`);
    }

    // Get test content
    const testContent = TEST_EMAIL_CONTENT[email_type];
    if (!testContent) {
      throw new Error(`No test content available for email type: ${email_type}`);
    }

    const fromName = emailSettings.from_name || "Muse Scoop";
    const fromEmail = emailSettings.from_email || "noreply@musescoop.com";

    console.log(`Sending test email to ${test_email} from ${fromName} <${fromEmail}>`);

    // Send test email
    const emailResponse = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [test_email],
      reply_to: emailSettings.reply_to || undefined,
      subject: testContent.subject,
      html: testContent.html,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email sent to ${test_email}`,
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in test-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
