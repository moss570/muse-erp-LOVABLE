-- =============================================
-- SALES MODULE - PHASE 2-8: ORDERS, SHIPPING, INVOICING, PAYMENTS, RETURNS
-- Complete sales workflow from order to payment
-- =============================================

-- =============================================
-- 1. SALES ORDERS
-- =============================================

CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,

  -- Customer & Dates
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date DATE,
  promised_delivery_date DATE,

  -- Status Workflow
  -- draft → confirmed → picking → picked → packing → packed → shipped → invoiced → closed → cancelled
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'confirmed', 'picking', 'partially_picked', 'picked',
    'packing', 'packed', 'shipping', 'partially_shipped', 'shipped',
    'invoicing', 'partially_invoiced', 'invoiced', 'closed', 'cancelled'
  )),

  -- Backorder handling
  allow_backorders BOOLEAN,  -- Copied from customer at creation
  has_backorders BOOLEAN DEFAULT false,

  -- Partial shipment tracking
  is_partially_shipped BOOLEAN DEFAULT false,
  shipment_count INTEGER DEFAULT 0,

  -- Shipping info
  ship_to_name TEXT,
  ship_to_address TEXT,
  ship_to_city TEXT,
  ship_to_state TEXT,
  ship_to_zip TEXT,
  ship_to_country TEXT DEFAULT 'USA',
  shipping_method TEXT,
  carrier TEXT,

  -- Warehouse handling
  warehouse_location_id UUID REFERENCES public.locations(id),
  is_3pl_order BOOLEAN DEFAULT false,

  -- Financial
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax_rate NUMERIC(5,4) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  shipping_charge NUMERIC(12,2) DEFAULT 0,  -- Manual entry
  total_amount NUMERIC(12,2) DEFAULT 0,

  -- Payment
  payment_terms TEXT,

  -- Fulfillment tracking
  pick_request_id UUID,  -- Will add FK later

  -- Audit
  sales_rep_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for sales_orders
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX idx_sales_orders_order_date ON public.sales_orders(order_date);
CREATE INDEX idx_sales_orders_partial_shipped ON public.sales_orders(is_partially_shipped) WHERE is_partially_shipped = true;
CREATE INDEX idx_sales_orders_backorders ON public.sales_orders(has_backorders) WHERE has_backorders = true;
CREATE INDEX idx_sales_orders_pick_request ON public.sales_orders(pick_request_id);

-- =============================================
-- 2. SALES ORDER ITEMS
-- =============================================

CREATE TABLE public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,

  -- Product reference
  product_id UUID NOT NULL REFERENCES public.products(id),

  -- Ordered quantities
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  unit_type TEXT DEFAULT 'case' CHECK (unit_type IN ('case', 'pallet', 'each')),

  -- Pricing (captured at order time)
  unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price >= 0),
  discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (
    quantity_ordered * unit_price * (1 - discount_percent / 100)
  ) STORED,

  -- Fulfillment tracking with partial shipment support
  quantity_picked INTEGER DEFAULT 0 CHECK (quantity_picked >= 0),
  quantity_packed INTEGER DEFAULT 0 CHECK (quantity_packed >= 0),
  quantity_shipped INTEGER DEFAULT 0 CHECK (quantity_shipped >= 0),
  quantity_invoiced INTEGER DEFAULT 0 CHECK (quantity_invoiced >= 0),
  quantity_backordered INTEGER DEFAULT 0 CHECK (quantity_backordered >= 0),
  quantity_cancelled INTEGER DEFAULT 0 CHECK (quantity_cancelled >= 0),

  -- Derived status
  is_fully_picked BOOLEAN GENERATED ALWAYS AS (
    (quantity_picked + quantity_cancelled) >= quantity_ordered
  ) STORED,
  is_fully_shipped BOOLEAN GENERATED ALWAYS AS (
    (quantity_shipped + quantity_cancelled + quantity_backordered) >= quantity_ordered
  ) STORED,
  is_backordered BOOLEAN GENERATED ALWAYS AS (quantity_backordered > 0) STORED,

  -- Notes
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for sales_order_items
CREATE INDEX idx_sales_order_items_order ON public.sales_order_items(sales_order_id);
CREATE INDEX idx_sales_order_items_product ON public.sales_order_items(product_id);
CREATE INDEX idx_sales_order_items_backordered ON public.sales_order_items(is_backordered) WHERE is_backordered = true;

-- =============================================
-- 3. SALES SHIPMENTS (for Partial Shipments)
-- =============================================

CREATE TABLE public.sales_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL UNIQUE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id),

  -- Shipment details
  ship_date DATE NOT NULL DEFAULT CURRENT_DATE,
  carrier TEXT,
  tracking_number TEXT,
  freight_cost NUMERIC(12,2),

  -- BOL reference
  bol_id UUID REFERENCES public.bills_of_lading(id),

  -- Status
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready', 'shipped', 'in_transit', 'delivered')),
  delivered_date DATE,

  -- Totals
  total_cases INTEGER DEFAULT 0,
  total_pallets INTEGER DEFAULT 0,

  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for sales_shipments
CREATE INDEX idx_sales_shipments_order ON public.sales_shipments(sales_order_id);
CREATE INDEX idx_sales_shipments_bol ON public.sales_shipments(bol_id);
CREATE INDEX idx_sales_shipments_status ON public.sales_shipments(status);

-- =============================================
-- 4. SALES SHIPMENT ITEMS (links order items to shipments)
-- =============================================

CREATE TABLE public.sales_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.sales_shipments(id) ON DELETE CASCADE,
  sales_order_item_id UUID NOT NULL REFERENCES public.sales_order_items(id),

  quantity_shipped INTEGER NOT NULL CHECK (quantity_shipped > 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(shipment_id, sales_order_item_id)
);

-- Indexes for sales_shipment_items
CREATE INDEX idx_sales_shipment_items_shipment ON public.sales_shipment_items(shipment_id);
CREATE INDEX idx_sales_shipment_items_order_item ON public.sales_shipment_items(sales_order_item_id);

-- =============================================
-- 5. SALES INVOICES
-- =============================================

CREATE TABLE public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,

  -- Invoice type
  invoice_type TEXT DEFAULT 'invoice' CHECK (invoice_type IN ('invoice', 'credit_memo')),

  -- References
  sales_order_id UUID REFERENCES public.sales_orders(id),
  sales_shipment_id UUID REFERENCES public.sales_shipments(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  rma_id UUID,  -- Will add FK later

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,

  -- Amounts
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  shipping_charge NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Early pay discount
  early_pay_discount_percent NUMERIC(5,2) DEFAULT 0,
  early_pay_days INTEGER DEFAULT 0,
  early_pay_amount NUMERIC(12,2) GENERATED ALWAYS AS (
    total_amount * (early_pay_discount_percent / 100)
  ) STORED,

  -- Payment tracking
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue', 'credited')),
  amount_paid NUMERIC(12,2) DEFAULT 0,
  amount_credited NUMERIC(12,2) DEFAULT 0,
  balance_due NUMERIC(12,2) GENERATED ALWAYS AS (
    total_amount - amount_paid - amount_credited
  ) STORED,

  -- Xero sync
  xero_invoice_id TEXT UNIQUE,
  xero_synced_at TIMESTAMPTZ,
  xero_sync_status TEXT DEFAULT 'pending' CHECK (xero_sync_status IN ('pending', 'synced', 'error')),
  xero_sync_error TEXT,

  -- Audit
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for sales_invoices
CREATE INDEX idx_sales_invoices_customer ON public.sales_invoices(customer_id);
CREATE INDEX idx_sales_invoices_order ON public.sales_invoices(sales_order_id);
CREATE INDEX idx_sales_invoices_shipment ON public.sales_invoices(sales_shipment_id);
CREATE INDEX idx_sales_invoices_xero ON public.sales_invoices(xero_invoice_id);
CREATE INDEX idx_sales_invoices_payment_status ON public.sales_invoices(payment_status);
CREATE INDEX idx_sales_invoices_type ON public.sales_invoices(invoice_type);

-- =============================================
-- 6. SALES INVOICE ITEMS
-- =============================================

CREATE TABLE public.sales_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
  sales_order_item_id UUID REFERENCES public.sales_order_items(id),

  -- Item details
  product_id UUID REFERENCES public.products(id),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price >= 0),
  discount_percent NUMERIC(5,2) DEFAULT 0,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (
    quantity * unit_price * (1 - discount_percent / 100)
  ) STORED,

  -- Revenue recognition GL account
  revenue_account_code TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for sales_invoice_items
CREATE INDEX idx_sales_invoice_items_invoice ON public.sales_invoice_items(invoice_id);
CREATE INDEX idx_sales_invoice_items_product ON public.sales_invoice_items(product_id);
CREATE INDEX idx_sales_invoice_items_order_item ON public.sales_invoice_items(sales_order_item_id);

-- =============================================
-- 7. PAYMENT RECEIPTS (with AI Remittance Reading)
-- =============================================

CREATE TABLE public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,

  -- Customer
  customer_id UUID NOT NULL REFERENCES public.customers(id),

  -- Payment details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_amount NUMERIC(12,2) NOT NULL CHECK (payment_amount > 0),
  payment_method TEXT CHECK (payment_method IN ('check', 'ach', 'wire', 'credit_card', 'cash')),
  reference_number TEXT,  -- Check number, transaction ID

  -- Early pay discount applied
  early_pay_discount_taken NUMERIC(12,2) DEFAULT 0,
  early_pay_discount_gl_account TEXT,  -- GL code for discount expense

  -- Remittance processing (Lovable Cloud AI)
  remittance_file_url TEXT,  -- URL to uploaded PDF/image
  remittance_email_id TEXT,  -- Email message ID if from email
  ai_processed BOOLEAN DEFAULT false,
  ai_processed_at TIMESTAMPTZ,
  ai_confidence_score NUMERIC(3,2),  -- 0.00 to 1.00
  ai_extracted_data JSONB,  -- Raw AI extraction

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'partially_applied', 'unapplied')),
  amount_applied NUMERIC(12,2) DEFAULT 0,
  amount_unapplied NUMERIC(12,2) GENERATED ALWAYS AS (
    payment_amount - amount_applied
  ) STORED,

  -- Bank reconciliation
  is_cleared BOOLEAN DEFAULT false,
  cleared_date DATE,

  -- Xero sync
  xero_payment_id TEXT,
  xero_synced_at TIMESTAMPTZ,

  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payment_receipts
CREATE INDEX idx_payment_receipts_customer ON public.payment_receipts(customer_id);
CREATE INDEX idx_payment_receipts_date ON public.payment_receipts(payment_date);
CREATE INDEX idx_payment_receipts_ai ON public.payment_receipts(ai_processed) WHERE ai_processed = false;
CREATE INDEX idx_payment_receipts_status ON public.payment_receipts(status);

-- =============================================
-- 8. PAYMENT APPLICATIONS (link payments to invoices)
-- =============================================

CREATE TABLE public.payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_receipt_id UUID NOT NULL REFERENCES public.payment_receipts(id) ON DELETE CASCADE,
  sales_invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id),

  amount_applied NUMERIC(12,2) NOT NULL CHECK (amount_applied > 0),
  early_pay_discount_applied NUMERIC(12,2) DEFAULT 0,

  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID REFERENCES public.profiles(id),

  UNIQUE(payment_receipt_id, sales_invoice_id)
);

-- Indexes for payment_applications
CREATE INDEX idx_payment_applications_receipt ON public.payment_applications(payment_receipt_id);
CREATE INDEX idx_payment_applications_invoice ON public.payment_applications(sales_invoice_id);

-- =============================================
-- 9. RMA (RETURN MERCHANDISE AUTHORIZATION)
-- =============================================

CREATE TABLE public.rma_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_number TEXT NOT NULL UNIQUE,

  -- References
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sales_order_id UUID REFERENCES public.sales_orders(id),
  sales_invoice_id UUID REFERENCES public.sales_invoices(id),

  -- Return details
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL CHECK (reason IN ('damaged', 'expired', 'wrong_product', 'quality_issue', 'customer_error', 'other')),
  reason_detail TEXT,
  requested_by TEXT,  -- Customer contact name

  -- Approval workflow
  status TEXT DEFAULT 'requested' CHECK (status IN (
    'requested', 'pending_approval', 'approved', 'rejected',
    'in_transit', 'received', 'inspected', 'credited', 'closed'
  )),
  submitted_for_approval_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,

  -- Inspection
  received_date DATE,
  received_by UUID REFERENCES public.profiles(id),
  inspection_notes TEXT,
  disposition TEXT CHECK (disposition IN ('destroy', 'return_to_stock', 'hold_for_qa', 'send_to_supplier')),

  -- Credit memo link
  credit_memo_id UUID REFERENCES public.sales_invoices(id),

  -- Lot traceability (CRITICAL - track returned lots)
  returned_lots JSONB,  -- Array of {production_lot_id, quantity, reason}

  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for rma_requests
CREATE INDEX idx_rma_requests_customer ON public.rma_requests(customer_id);
CREATE INDEX idx_rma_requests_order ON public.rma_requests(sales_order_id);
CREATE INDEX idx_rma_requests_invoice ON public.rma_requests(sales_invoice_id);
CREATE INDEX idx_rma_requests_status ON public.rma_requests(status);
CREATE INDEX idx_rma_requests_credit_memo ON public.rma_requests(credit_memo_id);

-- =============================================
-- 10. RMA ITEMS
-- =============================================

CREATE TABLE public.rma_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rma_id UUID NOT NULL REFERENCES public.rma_requests(id) ON DELETE CASCADE,

  -- Product
  product_id UUID NOT NULL REFERENCES public.products(id),
  sales_order_item_id UUID REFERENCES public.sales_order_items(id),

  -- Quantities
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  quantity_received INTEGER DEFAULT 0,
  quantity_approved INTEGER DEFAULT 0,
  quantity_rejected INTEGER DEFAULT 0,

  -- Lot traceability - which specific lots are being returned
  production_lot_id UUID REFERENCES public.production_lots(id),
  lot_number TEXT,
  expiry_date DATE,

  -- Pricing (for credit calculation)
  unit_price NUMERIC(12,4),
  credit_amount NUMERIC(12,2),

  -- Reason
  reason_detail TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for rma_items
CREATE INDEX idx_rma_items_rma ON public.rma_items(rma_id);
CREATE INDEX idx_rma_items_product ON public.rma_items(product_id);
CREATE INDEX idx_rma_items_lot ON public.rma_items(production_lot_id);

-- =============================================
-- 11. LOT RETURNS (track returned lots with disposition)
-- =============================================

CREATE TABLE public.lot_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Return reference
  rma_id UUID NOT NULL REFERENCES public.rma_requests(id),
  rma_item_id UUID NOT NULL REFERENCES public.rma_items(id),

  -- Lot details
  production_lot_id UUID NOT NULL REFERENCES public.production_lots(id),
  product_id UUID NOT NULL REFERENCES public.products(id),

  -- Quantities
  quantity_returned INTEGER NOT NULL CHECK (quantity_returned > 0),

  -- Disposition
  disposition TEXT NOT NULL CHECK (disposition IN ('destroy', 'return_to_stock', 'hold', 'send_to_supplier')),
  disposal_reason TEXT,

  -- Location
  returned_to_location_id UUID REFERENCES public.locations(id),

  -- Audit
  returned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  processed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lot_returns
CREATE INDEX idx_lot_returns_rma ON public.lot_returns(rma_id);
CREATE INDEX idx_lot_returns_lot ON public.lot_returns(production_lot_id);
CREATE INDEX idx_lot_returns_product ON public.lot_returns(product_id);

-- =============================================
-- 12. ENHANCE PICK REQUESTS FOR SALES ORDERS
-- =============================================

-- Add sales_order_id to existing pick_requests table
ALTER TABLE public.pick_requests
ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id),
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'internal' CHECK (source_type IN ('internal', 'third_party_warehouse')),
ADD COLUMN IF NOT EXISTS third_party_warehouse_id UUID REFERENCES public.locations(id),

-- 3PL email workflow fields
ADD COLUMN IF NOT EXISTS release_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS release_email_to TEXT,
ADD COLUMN IF NOT EXISTS release_confirmation_received_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS release_confirmation_number TEXT,
ADD COLUMN IF NOT EXISTS release_confirmation_file_url TEXT;

-- Add index
CREATE INDEX IF NOT EXISTS idx_pick_requests_sales_order ON public.pick_requests(sales_order_id);

-- Now add FK from sales_orders to pick_requests
ALTER TABLE public.sales_orders
ADD CONSTRAINT fk_sales_orders_pick_request
FOREIGN KEY (pick_request_id) REFERENCES public.pick_requests(id);

-- Add RMA FK to sales_invoices
ALTER TABLE public.sales_invoices
ADD CONSTRAINT fk_sales_invoices_rma
FOREIGN KEY (rma_id) REFERENCES public.rma_requests(id);

-- =============================================
-- 13. ENHANCE PICK REQUEST PICKS FOR LOT TRACEABILITY
-- =============================================

-- Add case-level tracking and expiry date to existing pick_request_picks
ALTER TABLE public.pick_request_picks
ADD COLUMN IF NOT EXISTS cases_picked INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- =============================================
-- 14. EXTEND LOT CONSUMPTION FOR SALES TRACKING
-- =============================================

-- Add sales tracking to existing lot_consumption table
ALTER TABLE public.lot_consumption
ADD COLUMN IF NOT EXISTS sales_shipment_id UUID REFERENCES public.sales_shipments(id),
ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id),
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- =============================================
-- MIGRATION COMPLETE - PART 1/2
-- Continue in next comment block for functions and triggers
-- =============================================
