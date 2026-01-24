# Payment Remittance AI Processing Edge Function

This Supabase Edge Function processes payment remittance files using **Lovable Cloud AI** to automatically extract invoice numbers and amounts, then matches them to outstanding invoices.

## Features

- 📄 **PDF & Image Support**: Processes uploaded remittance PDFs or images
- 🤖 **AI-Powered Extraction**: Uses Lovable Cloud to extract:
  - Invoice numbers
  - Payment amounts
  - Total payment amount
  - Payment date
  - Reference numbers
- 🎯 **Auto-Matching**: Automatically matches extracted invoices to open invoices (≥85% confidence)
- 📊 **Confidence Scoring**: Tracks AI confidence for each extraction
- 🔄 **Async Processing**: Runs asynchronously after file upload

## How It Works

### 1. User Uploads Remittance File
From `/sales/payments`, user:
1. Selects customer
2. Enters payment amount
3. Uploads remittance file (PDF/image)
4. Clicks "Record Payment"

### 2. File Storage
File is uploaded to Supabase Storage bucket: `payment-remittances`

### 3. Edge Function Invoked
```typescript
await supabase.functions.invoke('process-payment-remittance', {
  body: { payment_receipt_id: payment.id }
})
```

### 4. AI Processing
Function:
1. Downloads file from storage
2. Converts to base64
3. Sends to Lovable Cloud API
4. Receives extracted data

### 5. Auto-Application
If confidence ≥ 85%:
- Creates `payment_applications` records
- Updates invoice `balance_due`
- Updates invoice `payment_status`

## Setup Instructions

### 1. Create Storage Bucket

In Supabase Dashboard:
```sql
-- Run this in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-remittances', 'payment-remittances', false);
```

Or use Supabase Dashboard:
1. Go to Storage
2. Create new bucket: `payment-remittances`
3. Set to **Private**

### 2. Set Storage Policies

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload remittances"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-remittances');

-- Allow service role to read
CREATE POLICY "Service role can read remittances"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'payment-remittances');
```

### 3. Configure Lovable Cloud API Key

Set environment variable in Supabase:

```bash
# In Supabase Dashboard → Settings → Edge Functions
LOVABLE_CLOUD_API_KEY=your_lovable_cloud_api_key_here
```

### 4. Deploy Edge Function

```bash
# From project root
supabase functions deploy process-payment-remittance
```

### 5. Test the Function

```bash
# Test locally
supabase functions serve

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/process-payment-remittance' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"payment_receipt_id": "uuid-here"}'
```

## Database Schema

### payment_receipts Table

```sql
-- AI processing fields
remittance_file_url TEXT,           -- Storage path
ai_processed BOOLEAN DEFAULT false, -- Processing status
ai_processed_at TIMESTAMPTZ,        -- When completed
ai_confidence_score NUMERIC(3,2),   -- 0.00 to 1.00
ai_extracted_data JSONB,            -- Full extraction results
```

### Example ai_extracted_data:

```json
{
  "invoices": [
    {
      "invoice_number": "INV-20260124-001",
      "amount": 1250.00,
      "confidence": 0.95
    },
    {
      "invoice_number": "INV-20260124-002",
      "amount": 750.00,
      "confidence": 0.92
    }
  ],
  "total_amount": 2000.00,
  "payment_date": "2026-01-24",
  "reference_number": "CHK#12345"
}
```

## Lovable Cloud API

### Endpoint
```
POST https://api.lovable.cloud/v1/extract-remittance
```

### Request Format
```json
{
  "file": "base64_encoded_file",
  "file_type": "pdf" | "image",
  "extract_fields": [
    "invoice_numbers",
    "amounts",
    "total",
    "payment_date",
    "reference_number"
  ],
  "context": {
    "customer_id": "uuid",
    "expected_amount": 2000.00
  }
}
```

### Response Format
```json
{
  "invoices": [
    {
      "invoice_number": "string",
      "amount": number,
      "confidence": number
    }
  ],
  "total_amount": number,
  "payment_date": "string",
  "reference_number": "string"
}
```

## Error Handling

- ❌ **File Not Found**: Returns 400 if remittance_file_url is null
- ❌ **Download Error**: Returns 400 if file can't be downloaded from storage
- ❌ **AI API Error**: Returns 400 if Lovable Cloud API fails
- ⚠️ **Low Confidence**: If confidence < 85%, data is saved but not auto-applied
- ⚠️ **Invoice Not Found**: Logs warning, continues with other invoices

## Manual Review

If confidence score < 85% or invoices not found:
1. Payment receipt is saved with `ai_processed: true`
2. `ai_extracted_data` contains extraction results
3. User can manually review and apply payments
4. UI shows "AI Processed" badge with confidence score

## UI Integration

### Payments.tsx Displays:
- ✅ AI Processed status
- 📊 Confidence score
- 📋 Extracted invoice data
- 🔗 Applied invoice links
- ⚠️ Manual review needed flag

### Future Enhancements:
- Email-based remittance processing (parse incoming emails)
- Multi-page PDF support
- Handwriting recognition
- Check image processing
- Bank statement parsing

## Security

- ✅ Service role key required
- ✅ Private storage bucket
- ✅ RLS policies on payment_receipts
- ✅ Customer_id validation
- ✅ Invoice ownership verification

## Monitoring

Check Edge Function logs:
```bash
supabase functions logs process-payment-remittance
```

Monitor AI processing:
```sql
-- Check processing status
SELECT
  receipt_number,
  ai_processed,
  ai_confidence_score,
  ai_extracted_data->'invoices' as extracted_invoices
FROM payment_receipts
WHERE ai_processed = true
ORDER BY created_at DESC;
```

## Support

For Lovable Cloud API issues:
- Documentation: https://docs.lovable.cloud
- Support: support@lovable.cloud

For Supabase Edge Functions:
- Documentation: https://supabase.com/docs/guides/functions
