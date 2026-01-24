-- =============================================
-- Sales Helper Functions
-- Number generation and utility functions
-- =============================================

-- Generate pick request number
CREATE OR REPLACE FUNCTION public.generate_pick_request_number(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INTEGER;
  v_number TEXT;
BEGIN
  -- Format: PR-YYYYMMDD-NNN
  v_date_part := to_char(p_date, 'YYYYMMDD');

  -- Get the next sequence number for this date
  SELECT COALESCE(MAX(
    CAST(
      substring(request_number from 'PR-[0-9]+-([0-9]+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM public.pick_requests
  WHERE request_number LIKE 'PR-' || v_date_part || '-%';

  v_number := 'PR-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_number;
END;
$$;

-- Generate shipment number
CREATE OR REPLACE FUNCTION public.generate_shipment_number(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INTEGER;
  v_number TEXT;
BEGIN
  -- Format: SHIP-YYYYMMDD-NNN
  v_date_part := to_char(p_date, 'YYYYMMDD');

  -- Get the next sequence number for this date
  SELECT COALESCE(MAX(
    CAST(
      substring(shipment_number from 'SHIP-[0-9]+-([0-9]+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM public.sales_shipments
  WHERE shipment_number LIKE 'SHIP-' || v_date_part || '-%';

  v_number := 'SHIP-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_number;
END;
$$;

-- Generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INTEGER;
  v_number TEXT;
BEGIN
  -- Format: INV-YYYYMMDD-NNN
  v_date_part := to_char(p_date, 'YYYYMMDD');

  -- Get the next sequence number for this date
  SELECT COALESCE(MAX(
    CAST(
      substring(invoice_number from 'INV-[0-9]+-([0-9]+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM public.sales_invoices
  WHERE invoice_number LIKE 'INV-' || v_date_part || '-%';

  v_number := 'INV-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_number;
END;
$$;

-- Generate payment receipt number
CREATE OR REPLACE FUNCTION public.generate_payment_receipt_number(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INTEGER;
  v_number TEXT;
BEGIN
  -- Format: PMT-YYYYMMDD-NNN
  v_date_part := to_char(p_date, 'YYYYMMDD');

  -- Get the next sequence number for this date
  SELECT COALESCE(MAX(
    CAST(
      substring(receipt_number from 'PMT-[0-9]+-([0-9]+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM public.payment_receipts
  WHERE receipt_number LIKE 'PMT-' || v_date_part || '-%';

  v_number := 'PMT-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_number;
END;
$$;

-- Generate RMA number
CREATE OR REPLACE FUNCTION public.generate_rma_number(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_part TEXT;
  v_sequence INTEGER;
  v_number TEXT;
BEGIN
  -- Format: RMA-YYYYMMDD-NNN
  v_date_part := to_char(p_date, 'YYYYMMDD');

  -- Get the next sequence number for this date
  SELECT COALESCE(MAX(
    CAST(
      substring(rma_number from 'RMA-[0-9]+-([0-9]+)')
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM public.rma_requests
  WHERE rma_number LIKE 'RMA-' || v_date_part || '-%';

  v_number := 'RMA-' || v_date_part || '-' || LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_number;
END;
$$;

-- Apply payment to invoices
-- Automatically distributes payment across multiple invoices for a customer
CREATE OR REPLACE FUNCTION public.apply_payment_to_invoices(
  p_payment_receipt_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC
)
RETURNS TABLE (
  invoice_id UUID,
  amount_applied NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining NUMERIC := p_amount;
  v_invoice RECORD;
  v_to_apply NUMERIC;
BEGIN
  -- Get unpaid invoices for customer (oldest first)
  FOR v_invoice IN
    SELECT id, balance_due
    FROM public.sales_invoices
    WHERE customer_id = p_customer_id
      AND balance_due > 0
      AND payment_status != 'paid'
    ORDER BY invoice_date ASC, created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- Apply as much as possible to this invoice
    v_to_apply := LEAST(v_remaining, v_invoice.balance_due);

    -- Create payment application
    INSERT INTO public.payment_applications (
      payment_receipt_id,
      invoice_id,
      amount_applied,
      applied_at
    ) VALUES (
      p_payment_receipt_id,
      v_invoice.id,
      v_to_apply,
      now()
    );

    -- Update invoice balance
    UPDATE public.sales_invoices
    SET balance_due = balance_due - v_to_apply,
        payment_status = CASE
          WHEN balance_due - v_to_apply <= 0 THEN 'paid'
          WHEN balance_due - v_to_apply < total_amount THEN 'partially_paid'
          ELSE payment_status
        END,
        updated_at = now()
    WHERE id = v_invoice.id;

    -- Return application details
    invoice_id := v_invoice.id;
    amount_applied := v_to_apply;
    RETURN NEXT;

    v_remaining := v_remaining - v_to_apply;
  END LOOP;

  -- If there's remaining amount, it becomes an overpayment/credit
  IF v_remaining > 0 THEN
    -- Create customer credit
    INSERT INTO public.customer_credits (
      customer_id,
      payment_receipt_id,
      credit_amount,
      balance,
      created_at
    ) VALUES (
      p_customer_id,
      p_payment_receipt_id,
      v_remaining,
      v_remaining,
      now()
    );
  END IF;
END;
$$;

-- Get customer balance (total outstanding invoices)
CREATE OR REPLACE FUNCTION public.get_customer_balance(
  p_customer_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(balance_due), 0)
  FROM public.sales_invoices
  WHERE customer_id = p_customer_id
    AND balance_due > 0
    AND payment_status != 'paid';
$$;

-- Get master company balance (consolidated across all child locations)
CREATE OR REPLACE FUNCTION public.get_master_company_balance(
  p_master_company_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(balance_due), 0)
  FROM public.sales_invoices
  WHERE master_company_id = p_master_company_id
    AND balance_due > 0
    AND payment_status != 'paid';
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_pick_request_number(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_shipment_number(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_payment_receipt_number(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_rma_number(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_to_invoices(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_master_company_balance(UUID) TO authenticated;
