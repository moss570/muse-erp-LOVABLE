import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const WORK_DAYS_PER_YEAR = 260;
const DEFAULT_WORK_DAYS_PER_MONTH = 21;

export interface DailyComplianceData {
  date: string;
  
  // Targets (from daily_production_targets settings)
  targetGallons: number;
  targetHourlyCostPerGal: number;
  
  // Overhead (auto-calculated from salary + fixed costs)
  overheadTotal: number;
  overheadCostPerGal: number;
  
  // Actual hourly labor (calculated from scheduled shifts)
  actualHourlyLaborCost: number;
  actualHourlyCostPerGal: number;
  
  // Budgets
  hourlyLaborBudget: number; // targetHourlyCostPerGal * targetGallons
  
  // Combined
  combinedTargetCostPerGal: number;
  actualTotalCostPerGal: number;
  
  // Compliance status
  isHourlyCompliant: boolean;
  isOverallCompliant: boolean;
  complianceStatus: 'compliant' | 'warning' | 'over_budget' | 'no_target';
}

export interface ScheduleComplianceSummary {
  dailyData: DailyComplianceData[];
  
  // Totals for the period
  totalTargetGallons: number;
  totalHourlyLaborBudget: number;
  totalActualHourlyLabor: number;
  totalOverhead: number;
  
  // Overall compliance
  overallHourlyCompliance: boolean;
  overallComplianceStatus: 'compliant' | 'warning' | 'over_budget' | 'no_targets';
}

export function useScheduleCompliance(startDate: string, endDate: string) {
  // Fetch daily production targets for the date range
  const targetsQuery = useQuery({
    queryKey: ['schedule-compliance-targets', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_production_targets')
        .select('*')
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('target_date');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch employee shifts for hourly labor calculation
  const shiftsQuery = useQuery({
    queryKey: ['schedule-compliance-shifts', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_shifts')
        .select(`
          *,
          employee:employees(id, first_name, last_name, hourly_rate, pay_type)
        `)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch active salaried employees
  const salaryEmployeesQuery = useQuery({
    queryKey: ['schedule-compliance-salary-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, salary_amount, pay_type, employment_status')
        .eq('pay_type', 'salary')
        .eq('employment_status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch active fixed costs
  const fixedCostsQuery = useQuery({
    queryKey: ['schedule-compliance-fixed-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch work days per month setting
  const settingsQuery = useQuery({
    queryKey: ['schedule-compliance-work-days'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overhead_settings')
        .select('*')
        .eq('setting_key', 'work_days_per_month')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const workDaysPerMonth = settingsQuery.data?.setting_value ?? DEFAULT_WORK_DAYS_PER_MONTH;

  // Calculate compliance data
  const getComplianceData = (): ScheduleComplianceSummary => {
    const targets = targetsQuery.data || [];
    const shifts = shiftsQuery.data || [];
    const salaryEmployees = salaryEmployeesQuery.data || [];
    const fixedCosts = fixedCostsQuery.data || [];

    // Calculate daily overhead (same for all days)
    const dailySalaryPortion = salaryEmployees.reduce(
      (sum, emp) => sum + ((emp.salary_amount || 0) / WORK_DAYS_PER_YEAR), 
      0
    );
    const dailyFixedPortion = fixedCosts.reduce(
      (sum, cost) => sum + ((cost.monthly_amount || 0) / workDaysPerMonth), 
      0
    );
    const dailyOverhead = dailySalaryPortion + dailyFixedPortion;

    // Build daily compliance data
    const dailyData: DailyComplianceData[] = [];
    const targetsByDate = new Map(targets.map(t => [t.target_date, t]));

    // Group shifts by date
    const shiftsByDate = new Map<string, typeof shifts>();
    shifts.forEach(shift => {
      const existing = shiftsByDate.get(shift.shift_date) || [];
      existing.push(shift);
      shiftsByDate.set(shift.shift_date, existing);
    });

    // Get unique dates from both targets and shifts
    const allDates = new Set([
      ...targets.map(t => t.target_date),
      ...shifts.map(s => s.shift_date),
    ]);

    // Calculate for each date
    allDates.forEach(dateStr => {
      const target = targetsByDate.get(dateStr);
      const dayShifts = shiftsByDate.get(dateStr) || [];

      const targetGallons = target?.target_quantity || 0;
      const targetHourlyCostPerGal = target?.target_labor_cost || 0;

      // Calculate actual hourly labor from shifts
      let actualHourlyLaborCost = 0;
      dayShifts.forEach(shift => {
        if (shift.employee?.pay_type === 'hourly') {
          const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
          const endHour = parseInt(shift.end_time?.split(':')[0] || '0');
          const hours = Math.max(0, endHour - startHour - (shift.break_minutes || 0) / 60);
          const rate = shift.employee?.hourly_rate || 0;
          actualHourlyLaborCost += hours * rate;
        }
      });

      // Calculate cost per gallon values
      const overheadCostPerGal = targetGallons > 0 ? dailyOverhead / targetGallons : 0;
      const actualHourlyCostPerGal = targetGallons > 0 ? actualHourlyLaborCost / targetGallons : 0;
      const hourlyLaborBudget = targetHourlyCostPerGal * targetGallons;
      const combinedTargetCostPerGal = targetHourlyCostPerGal + overheadCostPerGal;
      const actualTotalCostPerGal = actualHourlyCostPerGal + overheadCostPerGal;

      // Determine compliance
      const isHourlyCompliant = actualHourlyLaborCost <= hourlyLaborBudget;
      const isOverallCompliant = actualTotalCostPerGal <= combinedTargetCostPerGal;
      
      let complianceStatus: DailyComplianceData['complianceStatus'] = 'no_target';
      if (targetGallons > 0 && targetHourlyCostPerGal > 0) {
        const overBudgetPercent = hourlyLaborBudget > 0 
          ? (actualHourlyLaborCost - hourlyLaborBudget) / hourlyLaborBudget 
          : 0;
        
        if (isHourlyCompliant) {
          complianceStatus = 'compliant';
        } else if (overBudgetPercent <= 0.1) {
          complianceStatus = 'warning';
        } else {
          complianceStatus = 'over_budget';
        }
      }

      dailyData.push({
        date: dateStr,
        targetGallons,
        targetHourlyCostPerGal,
        overheadTotal: dailyOverhead,
        overheadCostPerGal,
        actualHourlyLaborCost,
        actualHourlyCostPerGal,
        hourlyLaborBudget,
        combinedTargetCostPerGal,
        actualTotalCostPerGal,
        isHourlyCompliant,
        isOverallCompliant,
        complianceStatus,
      });
    });

    // Sort by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const totalTargetGallons = dailyData.reduce((sum, d) => sum + d.targetGallons, 0);
    const totalHourlyLaborBudget = dailyData.reduce((sum, d) => sum + d.hourlyLaborBudget, 0);
    const totalActualHourlyLabor = dailyData.reduce((sum, d) => sum + d.actualHourlyLaborCost, 0);
    const totalOverhead = dailyData.reduce((sum, d) => sum + d.overheadTotal, 0);

    // Overall compliance
    const hasTargets = dailyData.some(d => d.targetGallons > 0 && d.targetHourlyCostPerGal > 0);
    const overallHourlyCompliance = totalActualHourlyLabor <= totalHourlyLaborBudget;
    
    let overallComplianceStatus: ScheduleComplianceSummary['overallComplianceStatus'] = 'no_targets';
    if (hasTargets) {
      const overBudgetPercent = totalHourlyLaborBudget > 0 
        ? (totalActualHourlyLabor - totalHourlyLaborBudget) / totalHourlyLaborBudget 
        : 0;
      
      if (overallHourlyCompliance) {
        overallComplianceStatus = 'compliant';
      } else if (overBudgetPercent <= 0.1) {
        overallComplianceStatus = 'warning';
      } else {
        overallComplianceStatus = 'over_budget';
      }
    }

    return {
      dailyData,
      totalTargetGallons,
      totalHourlyLaborBudget,
      totalActualHourlyLabor,
      totalOverhead,
      overallHourlyCompliance,
      overallComplianceStatus,
    };
  };

  const isLoading = 
    targetsQuery.isLoading || 
    shiftsQuery.isLoading || 
    salaryEmployeesQuery.isLoading || 
    fixedCostsQuery.isLoading ||
    settingsQuery.isLoading;

  return {
    isLoading,
    getComplianceData,
    refetch: () => {
      targetsQuery.refetch();
      shiftsQuery.refetch();
    },
  };
}
