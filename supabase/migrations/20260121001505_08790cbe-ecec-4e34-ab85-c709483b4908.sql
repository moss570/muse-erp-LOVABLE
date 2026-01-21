-- Create employee_schedules table for production scheduling integration
-- This is separate from employee_shifts (HR scheduling) as it has production-specific fields

CREATE TABLE IF NOT EXISTS public.employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  employee_id UUID REFERENCES public.employees(id) NOT NULL,
  schedule_date DATE NOT NULL,
  
  -- Shift Details
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  scheduled_hours DECIMAL(5,2) NOT NULL,
  
  -- Assignment to production
  assigned_production_line_id UUID REFERENCES public.production_lines(id),
  assigned_task VARCHAR(100),
  
  -- Labor Cost
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 18.00,
  
  -- Status
  schedule_status VARCHAR(50) DEFAULT 'Scheduled' CHECK (schedule_status IN ('Scheduled', 'Confirmed', 'Called Off', 'No Show')),
  is_absent BOOLEAN DEFAULT false,
  absence_reason TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_emp_schedule_date_time UNIQUE (employee_id, schedule_date, shift_start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emp_sched_date ON public.employee_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_emp_sched_employee ON public.employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_sched_line ON public.employee_schedules(assigned_production_line_id);
CREATE INDEX IF NOT EXISTS idx_emp_sched_date_line ON public.employee_schedules(schedule_date, assigned_production_line_id);

-- RLS
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee schedules"
  ON public.employee_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage employee schedules"
  ON public.employee_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update trigger
CREATE TRIGGER update_employee_schedules_updated_at
  BEFORE UPDATE ON public.employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();