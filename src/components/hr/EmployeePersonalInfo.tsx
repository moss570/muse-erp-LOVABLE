import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';
import type { EmployeeWithRelations } from '@/hooks/useEmployees';

interface EmployeePersonalInfoProps {
  employee: EmployeeWithRelations;
  onEdit: () => void;
}

export function EmployeePersonalInfo({ employee, onEdit }: EmployeePersonalInfoProps) {
  const formatAddress = () => {
    const parts = [];
    if (employee.address_line1) parts.push(employee.address_line1);
    if (employee.address_line2) parts.push(employee.address_line2);
    if (employee.city || employee.state || employee.zip) {
      const cityStateZip = [
        employee.city,
        employee.state,
        employee.zip,
      ].filter(Boolean).join(', ');
      parts.push(cityStateZip);
    }
    return parts.length > 0 ? parts : ['Not provided'];
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Contact Information</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{employee.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{employee.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile Phone</p>
                <p className="font-medium">{employee.mobile_phone || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <div className="font-medium">
                {formatAddress().map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Personal Details</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {employee.date_of_birth 
                  ? format(new Date(employee.date_of_birth), 'MMMM d, yyyy')
                  : 'Not provided'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Preferred Name</p>
              <p className="font-medium">{employee.preferred_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employee Number</p>
              <p className="font-medium font-mono">{employee.employee_number}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Emergency Contact</CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {employee.emergency_contact_name ? (
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{employee.emergency_contact_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{employee.emergency_contact_phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Relationship</p>
                <p className="font-medium">{employee.emergency_contact_relationship || 'Not provided'}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No emergency contact information provided</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
