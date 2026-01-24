// Supabase Edge Function: process-payment-remittance
// Processes payment remittance files using Lovable Cloud AI
// Extracts invoice numbers and amounts, auto-matches to invoices

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RemittanceData {
  invoices: Array<{
    invoice_number: string;
    amount: number;
    confidence: number;
  }>;
  total_amount: number;
  payment_date?: string;
  reference_number?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { payment_receipt_id } = await req.json()

    if (!payment_receipt_id) {
      throw new Error('payment_receipt_id is required')
    }

    // Fetch payment receipt
    const { data: paymentReceipt, error: fetchError } = await supabaseClient
      .from('payment_receipts')
      .select('*')
      .eq('id', payment_receipt_id)
      .single()

    if (fetchError) throw fetchError
    if (!paymentReceipt.remittance_file_url) {
      throw new Error('No remittance file attached')
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('payment-remittances')
      .download(paymentReceipt.remittance_file_url)

    if (downloadError) throw downloadError

    // Convert file to base64 for Lovable Cloud
    const arrayBuffer = await fileData.arrayBuffer()
    const base64File = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )

    // Call Lovable Cloud AI API (replace with actual Lovable Cloud endpoint)
    const lovableCloudApiKey = Deno.env.get('LOVABLE_CLOUD_API_KEY') ?? ''

    const aiResponse = await fetch('https://api.lovable.cloud/v1/extract-remittance', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableCloudApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: base64File,
        file_type: paymentReceipt.remittance_file_url.endsWith('.pdf') ? 'pdf' : 'image',
        extract_fields: ['invoice_numbers', 'amounts', 'total', 'payment_date', 'reference_number'],
        context: {
          customer_id: paymentReceipt.customer_id,
          expected_amount: paymentReceipt.amount
        }
      })
    })

    if (!aiResponse.ok) {
      throw new Error(`Lovable Cloud API error: ${aiResponse.statusText}`)
    }

    const aiData: RemittanceData = await aiResponse.json()

    // Calculate average confidence
    const avgConfidence = aiData.invoices.length > 0
      ? aiData.invoices.reduce((sum, inv) => sum + inv.confidence, 0) / aiData.invoices.length
      : 0

    // Update payment receipt with AI results
    const { error: updateError } = await supabaseClient
      .from('payment_receipts')
      .update({
        ai_processed: true,
        ai_processed_at: new Date().toISOString(),
        ai_confidence_score: avgConfidence,
        ai_extracted_data: aiData,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment_receipt_id)

    if (updateError) throw updateError

    // Auto-apply to invoices if confidence is high enough
    if (avgConfidence >= 0.85 && aiData.invoices.length > 0) {
      for (const invoiceData of aiData.invoices) {
        // Find matching invoice
        const { data: invoice, error: invoiceError } = await supabaseClient
          .from('sales_invoices')
          .select('id, balance_due')
          .eq('invoice_number', invoiceData.invoice_number)
          .eq('customer_id', paymentReceipt.customer_id)
          .gt('balance_due', 0)
          .single()

        if (invoiceError || !invoice) {
          console.log(`Invoice ${invoiceData.invoice_number} not found or already paid`)
          continue
        }

        // Apply payment to invoice
        const amountToApply = Math.min(invoiceData.amount, invoice.balance_due)

        // Create payment application
        const { error: applyError } = await supabaseClient
          .from('payment_applications')
          .insert({
            payment_receipt_id: payment_receipt_id,
            invoice_id: invoice.id,
            amount_applied: amountToApply,
            applied_at: new Date().toISOString()
          })

        if (applyError) {
          console.error(`Error applying payment to invoice ${invoiceData.invoice_number}:`, applyError)
          continue
        }

        // Update invoice balance
        const newBalance = invoice.balance_due - amountToApply
        const { error: invoiceUpdateError } = await supabaseClient
          .from('sales_invoices')
          .update({
            balance_due: newBalance,
            payment_status: newBalance <= 0 ? 'paid' :
                           newBalance < invoice.balance_due ? 'partially_paid' : 'unpaid',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoice.id)

        if (invoiceUpdateError) {
          console.error(`Error updating invoice ${invoiceData.invoice_number}:`, invoiceUpdateError)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_receipt_id,
        ai_confidence: avgConfidence,
        invoices_extracted: aiData.invoices.length,
        auto_applied: avgConfidence >= 0.85
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error processing remittance:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
