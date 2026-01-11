-- =============================================
-- HR/EMPLOYEE MODULE - Phase 1 Database Schema
-- Inspired by Homebase for Food Manufacturing
-- =============================================

-- Employee Positions/Job Roles (different from app_role which is for access)
CREATE TABLE public.job_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Main Employees table (HR records - separate from profiles/users)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Link to user profile (optional - some employees may not have app access)
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL UNIQUE,
  
  -- Basic Info
  employee_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  
  -- Employment Info
  job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  hire_date DATE,
  termination_date DATE,
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contractor', 'seasonal', 'intern')),
  employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated', 'on_leave', 'pending')),
  
  -- Payroll Info
  pay_type TEXT DEFAULT 'hourly' CHECK (pay_type IN ('hourly', 'salary')),
  hourly_rate NUMERIC(10,2),
  salary_amount NUMERIC(12,2),
  pay_frequency TEXT DEFAULT 'biweekly' CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  payroll_id TEXT, -- External payroll system ID
  
  -- Personal Info
  date_of_birth DATE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Profile
  avatar_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Employee wage history (track raises, role changes)
CREATE TABLE public.employee_wage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'salary')),
  hourly_rate NUMERIC(10,2),
  salary_amount NUMERIC(12,2),
  job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Employee Shifts (scheduled work shifts)
CREATE TABLE public.employee_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  notes TEXT,
  color TEXT, -- For calendar display
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Time entries (actual clock in/out)
CREATE TABLE public.employee_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.employee_shifts(id) ON DELETE SET NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  break_start TIMESTAMP WITH TIME ZONE,
  break_end TIMESTAMP WITH TIME ZONE,
  total_hours NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  job_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  notes TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee Documents (HR documents, I-9, W-4, etc.)
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'i9', 'w4', 'offer_letter', 'handbook_ack', 'other'
  document_name TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_url TEXT,
  expiry_date DATE,
  is_required BOOLEAN DEFAULT false,
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Employee Training Records (SOP training, certifications)
CREATE TABLE public.employee_training (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_type TEXT, -- 'sop', 'safety', 'food_safety', 'equipment', 'certification', 'other'
  description TEXT,
  trainer_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  training_date DATE NOT NULL,
  completion_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'expired')),
  score NUMERIC(5,2),
  passing_score NUMERIC(5,2),
  certificate_number TEXT,
  notes TEXT,
  file_path TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Progressive Discipline Records
CREATE TABLE public.employee_discipline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL,
  discipline_type TEXT NOT NULL CHECK (discipline_type IN ('verbal_warning', 'written_warning', 'final_warning', 'suspension', 'termination')),
  category TEXT, -- 'attendance', 'performance', 'conduct', 'safety', 'policy_violation', 'other'
  description TEXT NOT NULL,
  action_taken TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  witness_name TEXT,
  employee_signature_date DATE,
  manager_signature_date DATE,
  is_closed BOOLEAN DEFAULT false,
  file_path TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Employee Time Off / PTO
CREATE TABLE public.employee_time_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  time_off_type TEXT NOT NULL CHECK (time_off_type IN ('vacation', 'sick', 'personal', 'bereavement', 'jury_duty', 'unpaid', 'holiday', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_requested NUMERIC(5,2),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Employee Availability (recurring availability)
CREATE TABLE public.employee_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  is_available BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  preference TEXT CHECK (preference IN ('preferred', 'available', 'unavailable')),
  notes TEXT,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to generate employee number
CREATE OR REPLACE FUNCTION public.generate_employee_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 4) AS integer)), 0) + 1 
  INTO v_sequence
  FROM public.employees 
  WHERE employee_number LIKE 'EMP%' 
    AND LENGTH(employee_number) = 9
    AND SUBSTRING(employee_number FROM 4) ~ '^[0-9]+$';
  
  RETURN 'EMP' || lpad(v_sequence::text, 6, '0');
END;
$$;

-- Trigger to calculate total hours on time entries
CREATE OR REPLACE FUNCTION public.calculate_time_entry_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_break_hours NUMERIC;
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    -- Calculate break hours if break times are recorded
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      v_break_hours := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600;
    ELSE
      v_break_hours := 0;
    END IF;
    
    -- Calculate total hours worked
    NEW.total_hours := ROUND(
      (EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600) - v_break_hours,
      2
    );
    
    -- Calculate overtime (anything over 8 hours in a day)
    IF NEW.total_hours > 8 THEN
      NEW.overtime_hours := ROUND(NEW.total_hours - 8, 2);
    ELSE
      NEW.overtime_hours := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_time_entry_hours_trigger
BEFORE INSERT OR UPDATE ON public.employee_time_entries
FOR EACH ROW
EXECUTE FUNCTION public.calculate_time_entry_hours();

-- Enable RLS on all tables
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_wage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_discipline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_positions (managers+ can manage, all can read)
CREATE POLICY "Anyone can view job positions" ON public.job_positions
FOR SELECT USING (true);

CREATE POLICY "Managers can manage job positions" ON public.job_positions
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for employees (managers+ can manage, employees can view own)
CREATE POLICY "Managers can view all employees" ON public.employees
FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own record" ON public.employees
FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Managers can manage employees" ON public.employees
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for wage history (managers only)
CREATE POLICY "Managers can manage wage history" ON public.employee_wage_history
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own wage history" ON public.employee_wage_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

-- RLS Policies for shifts (managers manage, all can view)
CREATE POLICY "Anyone can view published shifts" ON public.employee_shifts
FOR SELECT USING (is_published = true OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own shifts" ON public.employee_shifts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

CREATE POLICY "Managers can manage shifts" ON public.employee_shifts
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for time entries
CREATE POLICY "Managers can manage time entries" ON public.employee_time_entries
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own time entries" ON public.employee_time_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

CREATE POLICY "Employees can create own time entries" ON public.employee_time_entries
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

-- RLS Policies for documents
CREATE POLICY "Managers can manage employee documents" ON public.employee_documents
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own documents" ON public.employee_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

-- RLS Policies for training
CREATE POLICY "Managers can manage training" ON public.employee_training
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own training" ON public.employee_training
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

-- RLS Policies for discipline (managers only)
CREATE POLICY "Managers can manage discipline" ON public.employee_discipline
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- RLS Policies for time off
CREATE POLICY "Managers can manage time off" ON public.employee_time_off
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can view own time off" ON public.employee_time_off
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

CREATE POLICY "Employees can create own time off requests" ON public.employee_time_off
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

-- RLS Policies for availability
CREATE POLICY "Managers can manage availability" ON public.employee_availability
FOR ALL USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Employees can manage own availability" ON public.employee_availability
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_id AND e.profile_id = auth.uid()
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_job_positions_updated_at BEFORE UPDATE ON public.job_positions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_shifts_updated_at BEFORE UPDATE ON public.employee_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_time_entries_updated_at BEFORE UPDATE ON public.employee_time_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON public.employee_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_training_updated_at BEFORE UPDATE ON public.employee_training
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_discipline_updated_at BEFORE UPDATE ON public.employee_discipline
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_time_off_updated_at BEFORE UPDATE ON public.employee_time_off
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_availability_updated_at BEFORE UPDATE ON public.employee_availability
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX idx_employees_department_id ON public.employees(department_id);
CREATE INDEX idx_employees_employment_status ON public.employees(employment_status);
CREATE INDEX idx_employee_shifts_employee_date ON public.employee_shifts(employee_id, shift_date);
CREATE INDEX idx_employee_shifts_date ON public.employee_shifts(shift_date);
CREATE INDEX idx_employee_time_entries_employee ON public.employee_time_entries(employee_id);
CREATE INDEX idx_employee_time_entries_clock_in ON public.employee_time_entries(clock_in);
CREATE INDEX idx_employee_training_employee ON public.employee_training(employee_id);
CREATE INDEX idx_employee_time_off_employee_dates ON public.employee_time_off(employee_id, start_date, end_date);