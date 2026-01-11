import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';
import type { EmployeeWithRelations } from '@/hooks/useEmployees';

interface EmployeeJobDetailsProps {
  employee: EmployeeWithRelations;
  onEdit: () => void;
  onRefresh: () => void;
}

export function EmployeeJobDetails({ employee, onEdit, onRefresh }: EmployeeJobDetailsProps) {
  const { data: wageHistory } = useQuery({
    queryKey: ['employee-wage-history', employee.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_wage_history')
        .select('*, job_position:job_positions(*), created_by_profile:profiles!employee_wage_history_created_by_fkey(*)')
        .eq('employee_id', employee.id)
        .order('effective_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const formatWage = () => {
    if (employee.pay_type === 'salary' && employee.salary_amount) {
      return `$${employee.salary_amount.toLocaleString()}/year`;
    } else if (employee.pay_type === 'hourly' && employee.hourly_rate) {
      return `$${employee.hourly_rate.toFixed(2)}/hr`;
    }
    return 'Not set';
  };

  const getRoleWages = () => {
    const role = employee.job_position?.name || 'Team Member';
    const wage = formatWage();
    return `${role}, ${wage}`;
  };

  return (
    <div className="space-y-6">
      {/* Access, Roles & Wages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Access, Roles & Wages</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">{employee.location?.name || 'Muse Gelato'}</h4>
            </div>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Access:</p>
                <p className="font-medium">
                  {employee.employment_type === 'full_time' ? 'Employee' : 
                   employee.employment_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">PIN:</p>
                <p className="font-medium">******</p>
              </div>
              <div>
                <p className="text-muted-foreground">Start Date:</p>
                <p className="font-medium">
                  {employee.hire_date ? format(new Date(employee.hire_date), 'MM/dd/yyyy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payroll ID:</p>
                <p className="font-medium font-mono text-xs">
                  {employee.payroll_id || employee.id.slice(0, 8) + '...'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Role(s) & Wage(s):</p>
                <p className="font-medium">{getRoleWages()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Payroll Information</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Payroll Classification:</p>
              <p className="font-medium">
                {employee.pay_type === 'salary' ? 'Salary - Exempt' : 'Hourly - Non-Exempt'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pay Frequency:</p>
              <p className="font-medium capitalize">
                {employee.pay_frequency?.replace('_', '-') || 'Bi-weekly'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Department:</p>
              <p className="font-medium">
                {employee.department?.name || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Job History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Job History</CardTitle>
          <Button variant="link" className="text-primary">
            View all job history
          </Button>
        </CardHeader>
        <CardContent>
          {wageHistory && wageHistory.length > 0 ? (
            <div className="space-y-4">
              {wageHistory.slice(0, 5).map((history) => (
                <div key={history.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {history.reason || 'Wage change'} as a {history.job_position?.name || employee.job_position?.name} 
                      {' '}
                      ({history.pay_type === 'salary' 
                        ? `$${history.salary_amount?.toLocaleString()}`
                        : `$${history.hourly_rate?.toFixed(2)}/hr`
                      })
                    </p>
                    {history.created_by_profile && (
                      <p className="text-sm text-muted-foreground">
                        {history.created_by_profile.first_name} {history.created_by_profile.last_name}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(history.effective_date), 'EEE, MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="font-medium">
                  Started as a {employee.job_position?.name || 'Team Member'} 
                  {employee.hourly_rate ? ` ($${employee.hourly_rate.toFixed(2)}/hr)` : 
                   employee.salary_amount ? ` ($${employee.salary_amount.toLocaleString()}/yr)` : ''}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                {employee.hire_date 
                  ? format(new Date(employee.hire_date), 'EEE, MMM d, yyyy')
                  : format(new Date(employee.created_at), 'EEE, MMM d, yyyy')
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
