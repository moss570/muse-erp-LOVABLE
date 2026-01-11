-- Create shift_templates table for reusable shift patterns
CREATE TABLE public.shift_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  department_id UUID REFERENCES public.departments(id),
  job_position_id UUID REFERENCES public.job_positions(id),
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create labor_budgets table for budget vs actual tracking
CREATE TABLE public.labor_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_date DATE NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  budget_hours NUMERIC(10,2),
  budget_amount NUMERIC(12,2),
  target_gallons NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(budget_date, department_id)
);

-- Enable RLS on new tables
ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shift_templates
CREATE POLICY "Shift templates are viewable by authenticated users" 
ON public.shift_templates FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Shift templates are editable by authenticated users" 
ON public.shift_templates FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Shift templates are updatable by authenticated users" 
ON public.shift_templates FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Shift templates are deletable by authenticated users" 
ON public.shift_templates FOR DELETE 
TO authenticated
USING (true);

-- Create RLS policies for labor_budgets
CREATE POLICY "Labor budgets are viewable by authenticated users" 
ON public.labor_budgets FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Labor budgets are editable by authenticated users" 
ON public.labor_budgets FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Labor budgets are updatable by authenticated users" 
ON public.labor_budgets FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Labor budgets are deletable by authenticated users" 
ON public.labor_budgets FOR DELETE 
TO authenticated
USING (true);

-- Add updated_at trigger for shift_templates
CREATE TRIGGER update_shift_templates_updated_at
BEFORE UPDATE ON public.shift_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for labor_budgets
CREATE TRIGGER update_labor_budgets_updated_at
BEFORE UPDATE ON public.labor_budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();