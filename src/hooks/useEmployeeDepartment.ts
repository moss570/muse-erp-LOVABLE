import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { MobileDepartment } from '@/contexts/MobileModeContext';

interface EmployeeDepartmentInfo {
  employeeId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentType: string | null;
  jobPositionName: string | null;
  mobileDepartment: MobileDepartment;
  isLoading: boolean;
  error: Error | null;
}

// Map department types to mobile modes
function mapDepartmentToMobileMode(departmentType: string | null): MobileDepartment {
  if (!departmentType) return 'employee';
  
  const type = departmentType.toLowerCase();
  
  // Production/Manufacturing departments
  if (type.includes('production') || type.includes('manufacturing')) {
    return 'manufacturing';
  }
  
  // Warehouse/Logistics departments
  if (type.includes('warehouse') || type.includes('logistics') || type.includes('shipping') || type.includes('receiving')) {
    return 'warehouse';
  }
  
  // Quality departments
  if (type.includes('quality') || type.includes('qa') || type.includes('qc')) {
    return 'quality';
  }
  
  // Default to general employee mode
  return 'employee';
}

export function useEmployeeDepartment(): EmployeeDepartmentInfo {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-department', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try to get the employee linked to this user's profile
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          department_id,
          job_position_id,
          department:departments(id, name, department_type),
          job_position:job_positions(id, name)
        `)
        .eq('profile_id', user.id)
        .maybeSingle();

      if (empError) {
        console.error('Error fetching employee department:', empError);
        throw empError;
      }

      return employee;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const departmentType = (data?.department as any)?.department_type || null;
  const mobileDepartment = mapDepartmentToMobileMode(departmentType);

  return {
    employeeId: data?.id || null,
    departmentId: data?.department_id || null,
    departmentName: (data?.department as any)?.name || null,
    departmentType,
    jobPositionName: (data?.job_position as any)?.name || null,
    mobileDepartment,
    isLoading,
    error: error as Error | null,
  };
}
