# 3PL Release Email Edge Function

Sends pick release requests to third-party warehouse providers via email when a pick request is created with source type "third_party_warehouse".

## Trigger

Automatically invoked from `PickingTab.tsx` when creating a pick request with `source_type = 'third_party_warehouse'`.

## Input

```json
{
  "pick_request_id": "uuid"
}
```

## Process

1. Fetches pick request with sales order and customer details
2. Fetches order items with product information
3. Generates HTML email with pick list
4. Sends email to 3PL warehouse via Resend
5. Updates pick_request with email_sent_at timestamp

## Environment Variables

### Required
- `SUPABASE_URL` - Supabase project URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-provided)

### Optional
- `RESEND_API_KEY` - Resend API key for sending emails (if not set, function returns success but doesn't send)
- `TPL_WAREHOUSE_EMAIL` - 3PL warehouse email address (defaults to warehouse@3pl.example.com)

## Setup

1. Sign up for Resend at https://resend.com
2. Get your API key
3. Set environment variable:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   supabase secrets set TPL_WAREHOUSE_EMAIL=warehouse@your3pl.com
   ```

## Email Format

The email includes:
- Pick request number
- Sales order number
- Customer information
- Ship date
- Line items table (SKU, Product Name, Quantity)
- Action required notice
- Company contact information

## Database Updates

Adds columns to pick_requests table:
- `email_sent_at` - Timestamp when email was sent
- `email_sent_to` - Email address where request was sent

## Error Handling

- Returns success even if email fails (logs error)
- Does not block pick request creation
- Allows manual email if automated send fails
