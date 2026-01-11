import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// HTML escape function to prevent XSS/HTML injection in emails
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface SendPOEmailRequest {
  poId: string;
  toEmails: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  subject?: string;
  message?: string;
  templateId?: string; // Optional template ID to use
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-po-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { poId, toEmails, ccEmails, bccEmails, subject, message, templateId }: SendPOEmailRequest = await req.json();
    
    console.log("Request data:", { poId, toEmails, ccEmails, subject, templateId });

    if (!poId || !toEmails || toEmails.length === 0) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: poId and toEmails are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company settings
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    const company = companySettings || {
      company_name: "Company",
      phone: "",
      website: "",
      address_line1: "",
      city: "",
      state: "",
      zip: "",
    };

    // Fetch PO details with location address
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(name, email, address, city, state, zip, phone),
        delivery_location:locations(name, location_code, address_line1, address_line2, city, state, zip, country, contact_name, contact_phone),
        created_by_profile:profiles!purchase_orders_created_by_fkey(first_name, last_name, email)
      `)
      .eq("id", poId)
      .single();

    if (poError || !po) {
      console.error("PO fetch error:", poError);
      return new Response(
        JSON.stringify({ error: "Purchase order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("PO fetched:", po.po_number);

    // Fetch PO line items
    const { data: lineItems, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select(`
        *,
        material:materials(name, code),
        unit:units_of_measure(code, name)
      `)
      .eq("purchase_order_id", poId)
      .order("sort_order");

    if (itemsError) {
      console.error("Line items fetch error:", itemsError);
    }

    console.log("Line items fetched:", lineItems?.length);

    // Fetch template if specified, otherwise use default PO template
    let template = null;
    if (templateId) {
      const { data: t } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      template = t;
    } else {
      // Get default purchase template
      const { data: t } = await supabase
        .from("document_templates")
        .select("*")
        .eq("category", "purchase")
        .eq("is_default", true)
        .eq("is_active", true)
        .limit(1)
        .single();
      template = t;
    }

    // Build line items HTML with escaped content
    const lineItemsHtml = (lineItems || []).map((item, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px;">${escapeHtml(item.material?.name) || 'N/A'}</td>
        <td style="padding: 12px; font-family: monospace;">${escapeHtml(item.material?.code) || 'N/A'}</td>
        <td style="padding: 12px; font-family: monospace;">${escapeHtml(item.supplier_item_number) || '-'}</td>
        <td style="padding: 12px; text-align: right;">${item.quantity_ordered} ${escapeHtml(item.unit?.code) || ''}</td>
        <td style="padding: 12px; text-align: right;">$${Number(item.unit_cost).toFixed(2)}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600;">$${Number(item.line_total).toFixed(2)}</td>
      </tr>
    `).join('');

    // Format dates
    const orderDate = new Date(po.order_date).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    const expectedDate = po.expected_delivery_date 
      ? new Date(po.expected_delivery_date).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        })
      : 'TBD';

    // Build ship-to address with escaped content
    const location = po.delivery_location as any;
    const shipToAddress = location ? [
      escapeHtml(location.name),
      escapeHtml(location.address_line1),
      escapeHtml(location.address_line2),
      [escapeHtml(location.city), escapeHtml(location.state), escapeHtml(location.zip)].filter(Boolean).join(', ')
    ].filter(Boolean).join('<br>') : '';

    // Build company address with escaped content
    const companyAddress = [
      escapeHtml(company.address_line1),
      escapeHtml(company.address_line2),
      [escapeHtml(company.city), escapeHtml(company.state), escapeHtml(company.zip)].filter(Boolean).join(', ')
    ].filter(Boolean).join(', ');

    // Merge field replacements - all user content is escaped
    const mergeFields: Record<string, string> = {
      '{{PO_NUMBER}}': escapeHtml(po.po_number),
      '{{ORDER_DATE}}': orderDate,
      '{{EXPECTED_DATE}}': expectedDate,
      '{{SUPPLIER_NAME}}': escapeHtml(po.supplier?.name),
      '{{SUPPLIER_ADDRESS}}': [escapeHtml(po.supplier?.address), [escapeHtml(po.supplier?.city), escapeHtml(po.supplier?.state), escapeHtml(po.supplier?.zip)].filter(Boolean).join(', ')].filter(Boolean).join('<br>'),
      '{{SUPPLIER_PHONE}}': escapeHtml(po.supplier?.phone),
      '{{COMPANY_NAME}}': escapeHtml(company.company_name),
      '{{COMPANY_ADDRESS}}': companyAddress,
      '{{COMPANY_PHONE}}': escapeHtml(company.phone),
      '{{COMPANY_WEBSITE}}': escapeHtml(company.website),
      '{{SHIP_TO_LOCATION}}': escapeHtml(location?.name),
      '{{SHIP_TO_ADDRESS}}': shipToAddress,
      '{{LINE_ITEMS}}': lineItemsHtml,
      '{{SUBTOTAL}}': `$${Number(po.subtotal || 0).toFixed(2)}`,
      '{{TAX_AMOUNT}}': po.tax_amount ? `$${Number(po.tax_amount).toFixed(2)}` : '$0.00',
      '{{SHIPPING_AMOUNT}}': po.shipping_amount ? `$${Number(po.shipping_amount).toFixed(2)}` : '$0.00',
      '{{TOTAL_AMOUNT}}': `$${Number(po.total_amount || 0).toFixed(2)}`,
      '{{NOTES}}': escapeHtml(po.notes),
      '{{MESSAGE}}': escapeHtml(message),
    };

    // Build email HTML - use template or default
    let emailHtml: string;
    let emailSubject = subject || `Purchase Order ${po.po_number}`;

    if (template?.email_html) {
      // Replace merge fields in template
      emailHtml = template.email_html;
      for (const [key, value] of Object.entries(mergeFields)) {
        emailHtml = emailHtml.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      }
      if (template.email_subject) {
        emailSubject = template.email_subject;
        for (const [key, value] of Object.entries(mergeFields)) {
          emailSubject = emailSubject.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        }
      }
    } else {
      // Default HTML template
      emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Purchase Order ${escapeHtml(po.po_number)}</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #374151;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <table style="width: 100%;">
            <tr>
              <td style="vertical-align: top;">
                <h1 style="margin: 0; font-size: 28px;">Purchase Order</h1>
                <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: 600;">${escapeHtml(po.po_number)}</p>
              </td>
              <td style="text-align: right; vertical-align: top; color: rgba(255,255,255,0.9);">
                <p style="margin: 0; font-weight: 600;">${escapeHtml(company.company_name)}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">${escapeHtml(company.address_line1)}</p>
                <p style="margin: 0; font-size: 14px;">${[escapeHtml(company.city), escapeHtml(company.state), escapeHtml(company.zip)].filter(Boolean).join(', ')}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">${escapeHtml(company.phone)}</p>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <table style="width: 100%;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <h3 style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Order Date</h3>
                <p style="margin: 0; font-size: 16px;">${orderDate}</p>
              </td>
              <td style="vertical-align: top; width: 50%;">
                <h3 style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Expected Delivery</h3>
                <p style="margin: 0; font-size: 16px;">${expectedDate}</p>
              </td>
            </tr>
          </table>
        </div>

        <div style="display: flex; border: 1px solid #e5e7eb; border-top: none;">
          <div style="flex: 1; padding: 20px; border-right: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Supplier</h3>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">${escapeHtml(po.supplier?.name) || 'N/A'}</p>
            ${po.supplier?.address ? `<p style="margin: 5px 0 0 0; color: #6b7280;">${escapeHtml(po.supplier.address)}</p>` : ''}
            ${po.supplier?.city ? `<p style="margin: 0; color: #6b7280;">${escapeHtml(po.supplier.city)}, ${escapeHtml(po.supplier.state)} ${escapeHtml(po.supplier.zip)}</p>` : ''}
            ${po.supplier?.phone ? `<p style="margin: 5px 0 0 0; color: #6b7280;">Phone: ${escapeHtml(po.supplier.phone)}</p>` : ''}
          </div>
          ${location ? `
          <div style="flex: 1; padding: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Ship To</h3>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">${escapeHtml(company.company_name)}</p>
            <p style="margin: 5px 0 0 0; color: #374151; font-weight: 500;">${escapeHtml(location.name)}</p>
            ${location.address_line1 ? `<p style="margin: 2px 0 0 0; color: #6b7280;">${escapeHtml(location.address_line1)}</p>` : ''}
            ${location.address_line2 ? `<p style="margin: 0; color: #6b7280;">${escapeHtml(location.address_line2)}</p>` : ''}
            ${location.city ? `<p style="margin: 0; color: #6b7280;">${escapeHtml(location.city)}, ${escapeHtml(location.state)} ${escapeHtml(location.zip)}</p>` : ''}
            ${location.contact_name ? `<p style="margin: 5px 0 0 0; color: #6b7280;">Attn: ${escapeHtml(location.contact_name)}</p>` : ''}
            ${location.contact_phone ? `<p style="margin: 0; color: #6b7280;">Phone: ${escapeHtml(location.contact_phone)}</p>` : ''}
          </div>
          ` : ''}
        </div>

        ${message ? `
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; background: #fef3c7;">
          <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 12px; text-transform: uppercase;">Message</h3>
          <p style="margin: 0; color: #92400e;">${escapeHtml(message)}</p>
        </div>
        ` : ''}

        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 12px; text-align: center; font-weight: 600;">#</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">Material</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">Our Code</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">Supplier #</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">Qty</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">Unit Cost</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineItemsHtml}
            </tbody>
          </table>
        </div>

        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; background: #f9fafb;">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="text-align: right; padding: 5px 0;">
                <span style="color: #6b7280;">Subtotal:</span>
                <span style="margin-left: 20px; font-weight: 600;">$${Number(po.subtotal || 0).toFixed(2)}</span>
              </td>
            </tr>
            ${po.tax_amount ? `
            <tr>
              <td style="text-align: right; padding: 5px 0;">
                <span style="color: #6b7280;">Tax:</span>
                <span style="margin-left: 20px;">$${Number(po.tax_amount).toFixed(2)}</span>
              </td>
            </tr>
            ` : ''}
            ${po.shipping_amount ? `
            <tr>
              <td style="text-align: right; padding: 5px 0;">
                <span style="color: #6b7280;">Shipping:</span>
                <span style="margin-left: 20px;">$${Number(po.shipping_amount).toFixed(2)}</span>
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="text-align: right; padding: 10px 0; border-top: 2px solid #e5e7eb;">
                <span style="font-size: 18px; font-weight: 700;">Total:</span>
                <span style="margin-left: 20px; font-size: 18px; font-weight: 700; color: #1e40af;">$${Number(po.total_amount || 0).toFixed(2)}</span>
              </td>
            </tr>
          </table>
        </div>

        ${po.notes ? `
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h3 style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Notes</h3>
          <p style="margin: 0; color: #374151;">${escapeHtml(po.notes)}</p>
        </div>
        ` : ''}

        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">${escapeHtml(company.company_name)} | ${escapeHtml(company.phone)} | ${escapeHtml(company.website)}</p>
          <p style="margin: 5px 0 0 0;">Please contact us if you have any questions.</p>
        </div>
      </body>
      </html>
    `;
    }

    console.log("Sending email to:", toEmails);

    // Determine BCC addresses
    const finalBcc = [...(bccEmails || []), ...(template?.bcc_addresses || [])].filter(Boolean);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${company.company_name} <onboarding@resend.dev>`,
      to: toEmails,
      cc: ccEmails && ccEmails.length > 0 ? ccEmails : undefined,
      bcc: finalBcc.length > 0 ? finalBcc : undefined,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update PO with sent information
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        sent_at: new Date().toISOString(),
        sent_to_emails: toEmails,
        status: po.status === 'draft' ? 'sent' : po.status,
      })
      .eq("id", poId);

    if (updateError) {
      console.error("Failed to update PO sent status:", updateError);
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-po-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);