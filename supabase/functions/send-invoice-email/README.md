# Invoice Email Edge Function

Generates and sends professional invoice emails to customers with formatted HTML invoice details.

## Trigger

Can be invoked from:
- Invoices page UI (manual send button)
- Automated workflows after invoice generation
- Batch invoice sending

## Input

```json
{
  "invoice_id": "uuid",
  "send_to_email": "optional@override.com"  // Optional: Override customer email
}
```

## Process

1. Fetches invoice with all line items, customer, and shipment details
2. Fetches company settings for branding
3. Generates professional HTML invoice email
4. Sends email via Resend
5. Updates invoice with email_sent_at timestamp

## Environment Variables

### Required
- `SUPABASE_URL` - Supabase project URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-provided)

### Optional
- `RESEND_API_KEY` - Resend API key for sending emails (if not set, returns mock success)

## Invoice Email Format

The email includes:
- Company logo and branding
- Invoice number and dates
- Bill To address (master company if applicable)
- Shipping information (tracking, carrier)
- Detailed line items table
- Subtotal, tax, freight breakdown
- Total amount and balance due
- Payment terms
- Company contact information

## Setup

1. Sign up for Resend at https://resend.com
2. Get your API key
3. Set environment variable:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   ```

## Database Updates

Adds columns to sales_invoices table:
- `email_sent_at` - Timestamp when invoice was emailed
- `email_sent_to` - Email address where invoice was sent

## Usage Examples

### From UI (Invoices page)
```typescript
const sendInvoice = async (invoiceId: string) => {
  const { data, error } = await supabase.functions.invoke('send-invoice-email', {
    body: { invoice_id: invoiceId }
  });

  if (error) {
    toast.error('Failed to send invoice');
  } else {
    toast.success('Invoice sent successfully');
  }
};
```

### Override recipient email
```typescript
await supabase.functions.invoke('send-invoice-email', {
  body: {
    invoice_id: 'uuid',
    send_to_email: 'accounting@customer.com'
  }
});
```

## Future Enhancements

- PDF attachment generation (using jsPDF or similar)
- Custom email templates per customer
- Multi-language support
- Batch invoice sending
- Email delivery tracking
