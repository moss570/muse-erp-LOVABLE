import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvoiceEmailData {
  invoice_id: string
  send_to_email?: string // Optional override for customer email
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

    const { invoice_id, send_to_email } = await req.json() as InvoiceEmailData

    if (!invoice_id) {
      throw new Error('invoice_id is required')
    }

    // Fetch invoice with all related data
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('sales_invoices')
      .select(`
        *,
        customer:customers(id, code, name, email, address, city, state, zip),
        master_company:customers!master_company_id(name, address, city, state, zip),
        invoice_items:sales_invoice_items(
          *,
          shipment_item:sales_shipment_items(
            *,
            order_item:sales_order_items(
              *,
              product:products(id, name, sku)
            )
          )
        ),
        shipment:sales_shipments(tracking_number, carrier, ship_date)
      `)
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`)
    }

    // Get company settings
    const { data: companySettings } = await supabaseClient
      .from('company_settings')
      .select('*')
      .single()

    const companyName = companySettings?.company_name || 'Your Company'
    const companyEmail = companySettings?.email || 'billing@yourcompany.com'
    const companyAddress = companySettings?.address || ''
    const companyCity = companySettings?.city || ''
    const companyState = companySettings?.state || ''
    const companyZip = companySettings?.zip || ''
    const companyPhone = companySettings?.phone || ''

    // Determine recipient email
    const recipientEmail = send_to_email || invoice.customer.email

    if (!recipientEmail) {
      throw new Error('No email address available for customer')
    }

    // Build invoice line items HTML
    const lineItems = invoice.invoice_items
      .map((item: any) => {
        const product = item.shipment_item?.order_item?.product || { sku: 'N/A', name: 'Unknown Product' }
        const quantity = item.quantity || 0
        const unitPrice = item.unit_price || 0
        const lineTotal = quantity * unitPrice

        return `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${product.sku}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${product.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${unitPrice.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${lineTotal.toFixed(2)}</td>
          </tr>
        `
      })
      .join('')

    // Build totals section
    const subtotal = invoice.subtotal || 0
    const taxAmount = invoice.tax_amount || 0
    const freightAmount = invoice.freight_amount || 0
    const totalAmount = invoice.total_amount || 0
    const balanceDue = invoice.balance_due || 0

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 850px; margin: 0 auto; padding: 20px;">

          <!-- Header -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <h1 style="margin: 0; font-size: 32px; color: #007bff;">INVOICE</h1>
              <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${companyName}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-weight: bold; font-size: 18px;">Invoice #${invoice.invoice_number}</p>
              <p style="margin: 5px 0; color: #666;">Date: ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              <p style="margin: 5px 0; color: #666;">Due: ${new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
          </div>

          <!-- Company and Customer Info -->
          <div style="display: table; width: 100%; margin-bottom: 30px;">
            <div style="display: table-cell; width: 50%; padding-right: 20px;">
              <h3 style="margin: 0 0 10px 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px;">From</h3>
              <p style="margin: 5px 0;"><strong>${companyName}</strong></p>
              ${companyAddress ? `<p style="margin: 5px 0;">${companyAddress}</p>` : ''}
              ${companyCity || companyState || companyZip ? `<p style="margin: 5px 0;">${companyCity}${companyCity && (companyState || companyZip) ? ', ' : ''}${companyState} ${companyZip}</p>` : ''}
              ${companyPhone ? `<p style="margin: 5px 0;">Phone: ${companyPhone}</p>` : ''}
              ${companyEmail ? `<p style="margin: 5px 0;">Email: ${companyEmail}</p>` : ''}
            </div>
            <div style="display: table-cell; width: 50%;">
              <h3 style="margin: 0 0 10px 0; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px;">Bill To</h3>
              <p style="margin: 5px 0;"><strong>${invoice.master_company?.name || invoice.customer.name}</strong></p>
              <p style="margin: 5px 0; color: #666; font-size: 12px;">Customer #${invoice.customer.code}</p>
              ${invoice.customer.address ? `<p style="margin: 5px 0;">${invoice.customer.address}</p>` : ''}
              ${invoice.customer.city || invoice.customer.state || invoice.customer.zip ? `<p style="margin: 5px 0;">${invoice.customer.city}${invoice.customer.city && (invoice.customer.state || invoice.customer.zip) ? ', ' : ''}${invoice.customer.state} ${invoice.customer.zip}</p>` : ''}
            </div>
          </div>

          <!-- Shipping Info -->
          ${invoice.shipment ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333;">Shipping Information</h3>
            <p style="margin: 5px 0;"><strong>Ship Date:</strong> ${new Date(invoice.shipment.ship_date).toLocaleDateString()}</p>
            ${invoice.shipment.carrier ? `<p style="margin: 5px 0;"><strong>Carrier:</strong> ${invoice.shipment.carrier}</p>` : ''}
            ${invoice.shipment.tracking_number ? `<p style="margin: 5px 0;"><strong>Tracking #:</strong> ${invoice.shipment.tracking_number}</p>` : ''}
          </div>
          ` : ''}

          <!-- Line Items -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #007bff; color: white;">
                <th style="padding: 12px; text-align: left;">SKU</th>
                <th style="padding: 12px; text-align: left;">Description</th>
                <th style="padding: 12px; text-align: right;">Qty</th>
                <th style="padding: 12px; text-align: right;">Unit Price</th>
                <th style="padding: 12px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${lineItems}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end;">
            <div style="width: 300px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
                  <td style="padding: 8px; text-align: right;">$${subtotal.toFixed(2)}</td>
                </tr>
                ${taxAmount > 0 ? `
                <tr>
                  <td style="padding: 8px; text-align: right;">Tax:</td>
                  <td style="padding: 8px; text-align: right;">$${taxAmount.toFixed(2)}</td>
                </tr>
                ` : ''}
                ${freightAmount > 0 ? `
                <tr>
                  <td style="padding: 8px; text-align: right;">Freight:</td>
                  <td style="padding: 8px; text-align: right;">$${freightAmount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #333;">
                  <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px;">Total:</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px;">$${totalAmount.toFixed(2)}</td>
                </tr>
                <tr style="background-color: #fff3cd;">
                  <td style="padding: 8px; text-align: right; font-weight: bold; color: #856404;">Amount Due:</td>
                  <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 18px; color: #856404;">$${balanceDue.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Payment Terms -->
          ${invoice.payment_terms ? `
          <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff;">
            <p style="margin: 0; color: #004085;"><strong>Payment Terms:</strong> ${invoice.payment_terms}</p>
          </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 5px 0;">Thank you for your business!</p>
            <p style="margin: 5px 0;">Questions about this invoice? Contact us at ${companyEmail}${companyPhone ? ` or ${companyPhone}` : ''}</p>
          </div>

        </body>
      </html>
    `

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set, email not sent (would send to:', recipientEmail, ')')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email skipped - RESEND_API_KEY not configured',
          mock: true,
          html: emailHtml
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
        to: [recipientEmail],
        subject: `Invoice ${invoice.invoice_number} from ${companyName}`,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    const emailData = await emailResponse.json()

    // Update invoice to mark email sent
    await supabaseClient
      .from('sales_invoices')
      .update({
        email_sent_at: new Date().toISOString(),
        email_sent_to: recipientEmail
      })
      .eq('id', invoice_id)

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-invoice-email:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
