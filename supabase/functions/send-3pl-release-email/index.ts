import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PickRequestEmailData {
  pick_request_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { pick_request_id } = await req.json() as PickRequestEmailData

    if (!pick_request_id) {
      throw new Error('pick_request_id is required')
    }

    // Fetch pick request with sales order details
    const { data: pickRequest, error: pickError } = await supabaseClient
      .from('pick_requests')
      .select(`
        *,
        sales_order:sales_orders(
          *,
          customer:customers(id, code, name, email),
          sales_order_items(
            *,
            product:products(id, name, sku)
          )
        )
      `)
      .eq('id', pick_request_id)
      .single()

    if (pickError || !pickRequest) {
      throw new Error(`Pick request not found: ${pickError?.message}`)
    }

    // Get 3PL warehouse email from company settings or environment
    const tplEmail = Deno.env.get('TPL_WAREHOUSE_EMAIL') || 'warehouse@3pl.example.com'

    // Get company settings for sender info
    const { data: companySettings } = await supabaseClient
      .from('company_settings')
      .select('company_name, email, phone')
      .single()

    const companyName = companySettings?.company_name || 'Your Company'
    const companyEmail = companySettings?.email || 'orders@yourcompany.com'

    // Build email HTML
    const orderItems = pickRequest.sales_order.sales_order_items
      .map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.sku}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity_ordered}</td>
        </tr>
      `)
      .join('')

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pick Release Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="margin: 0; color: #333;">Pick Release Request</h1>
            <p style="margin: 10px 0 0 0; color: #666;">From ${companyName}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Request Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; width: 200px; font-weight: bold;">Pick Request #:</td>
                <td style="padding: 8px;">${pickRequest.request_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Sales Order #:</td>
                <td style="padding: 8px;">${pickRequest.sales_order.order_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Customer:</td>
                <td style="padding: 8px;">${pickRequest.sales_order.customer.name} (${pickRequest.sales_order.customer.code})</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Order Date:</td>
                <td style="padding: 8px;">${new Date(pickRequest.sales_order.order_date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Ship Date:</td>
                <td style="padding: 8px;">${pickRequest.sales_order.ship_date ? new Date(pickRequest.sales_order.ship_date).toLocaleDateString() : 'TBD'}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Items to Pick</h2>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
              <thead>
                <tr style="background-color: #007bff; color: white;">
                  <th style="padding: 12px; text-align: left;">SKU</th>
                  <th style="padding: 12px; text-align: left;">Product Name</th>
                  <th style="padding: 12px; text-align: right;">Quantity (Cases)</th>
                </tr>
              </thead>
              <tbody>
                ${orderItems}
              </tbody>
            </table>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">Action Required</h3>
            <p style="margin: 0; color: #856404;">
              Please pick and prepare the above items for shipment. Once ready, please confirm pick completion
              and provide shipping details.
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p><strong>${companyName}</strong></p>
            <p>Email: ${companyEmail}</p>
            ${companySettings?.phone ? `<p>Phone: ${companySettings.phone}</p>` : ''}
          </div>
        </body>
      </html>
    `

    // Send email using Resend or similar service
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set, email not sent (would send to:', tplEmail, ')')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email skipped - RESEND_API_KEY not configured',
          mock: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: companyEmail,
        to: [tplEmail],
        subject: `Pick Release Request ${pickRequest.request_number} - Order ${pickRequest.sales_order.order_number}`,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const emailData = await emailResponse.json()

    // Update pick request to mark email sent
    await supabaseClient
      .from('pick_requests')
      .update({
        email_sent_at: new Date().toISOString(),
        email_sent_to: tplEmail
      })
      .eq('id', pick_request_id)

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-3pl-release-email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
