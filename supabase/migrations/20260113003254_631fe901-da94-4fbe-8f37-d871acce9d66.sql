-- Create work order type enum
CREATE TYPE public.work_order_type AS ENUM ('base', 'flavoring', 'freezing', 'case_pack');

-- Create work order status enum  
CREATE TYPE public.work_order_status AS ENUM ('draft', 'scheduled', 'in_progress', 'pending_qa', 'completed', 'cancelled');

-- Create production_work_orders table
CREATE TABLE public.production_work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_number TEXT NOT NULL UNIQUE,
  work_order_type public.work_order_type NOT NULL,
  status public.work_order_status NOT NULL DEFAULT 'draft',
  
  -- Product & Quantity
  product_id UUID REFERENCES public.products(id),
  target_quantity NUMERIC NOT NULL,
  actual_quantity NUMERIC,
  unit_id UUID REFERENCES public.units_of_measure(id),
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME,
  estimated_duration_hours NUMERIC,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  deadline DATE,
  
  -- Assignment
  machine_id UUID REFERENCES public.machines(id),
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  
  -- Parent work order / lot linkage (for flavoring/freezing/case_pack)
  parent_work_order_id UUID REFERENCES public.production_work_orders(id),
  source_production_lot_id UUID REFERENCES public.production_lots(id),
  quantity_to_consume NUMERIC,
  
  -- Customer/Sales tracking
  customer_id UUID REFERENCES public.customers(id),
  sales_order_reference TEXT,
  
  -- Notes & metadata
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create work order assignments table for multiple employees
CREATE TABLE public.work_order_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.production_work_orders(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  role TEXT, -- e.g., 'lead', 'operator', 'helper'
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(work_order_id, employee_id)
);

-- Link production lots to work orders
ALTER TABLE public.production_lots 
ADD COLUMN work_order_id UUID REFERENCES public.production_work_orders(id);

-- Enable RLS
ALTER TABLE public.production_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for production_work_orders
CREATE POLICY "Users can view work orders" ON public.production_work_orders
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create work orders" ON public.production_work_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update work orders" ON public.production_work_orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete work orders" ON public.production_work_orders
  FOR DELETE USING (public.is_admin_or_manager(auth.uid()));

-- RLS policies for work_order_assignments
CREATE POLICY "Users can view assignments" ON public.work_order_assignments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage assignments" ON public.work_order_assignments
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to generate work order numbers
CREATE OR REPLACE FUNCTION public.generate_work_order_number(p_type public.work_order_type, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_sequence INTEGER;
BEGIN
  v_prefix := CASE p_type
    WHEN 'base' THEN 'WO-B'
    WHEN 'flavoring' THEN 'WO-F'
    WHEN 'freezing' THEN 'WO-Z'
    WHEN 'case_pack' THEN 'WO-C'
  END;
  
  SELECT COALESCE(MAX(CAST(SPLIT_PART(work_order_number, '-', 4) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.production_work_orders
  WHERE work_order_number LIKE v_prefix || '-' || to_char(p_date, 'YYMMDD') || '-%';
  
  RETURN v_prefix || '-' || to_char(p_date, 'YYMMDD') || '-' || lpad(v_sequence::TEXT, 3, '0');
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_production_work_orders_updated_at
  BEFORE UPDATE ON public.production_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();