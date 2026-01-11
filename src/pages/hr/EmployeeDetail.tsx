import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { EmployeeFormDialog } from '@/components/hr/EmployeeFormDialog';
import { EmployeeJobDetails } from '@/components/hr/EmployeeJobDetails';
import { EmployeePersonalInfo } from '@/components/hr/EmployeePersonalInfo';
import { EmployeeDocuments } from '@/components/hr/EmployeeDocuments';
import { EmployeePerformance } from '@/components/hr/EmployeePerformance';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Pencil,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import type { EmployeeWithRelations } from '@/hooks/useEmployees';

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: employee, isLoading, refetch } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          job_position:job_positions(*),
          department:departments(*),
          location:locations(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as EmployeeWithRelations;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Employee not found</div>
      </div>
    );
  }

  const getInitials = () => {
    return `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  };

  const getTitle = () => {
    const parts = [];
    if (employee.job_position?.name) parts.push(employee.job_position.name);
    if (employee.location?.name) parts.push(`at ${employee.location.name}`);
    return parts.join(' ') || 'Team Member';
  };

  const getStatusBadge = () => {
    const styles: Record<string, { bg: string; text: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
      terminated: { bg: 'bg-red-100', text: 'text-red-800' },
      on_leave: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      pending: { bg: 'bg-orange-100', text: 'text-orange-800' },
    };
    
    const status = employee.employment_status || 'active';
    const style = styles[status] || styles.active;
    
    return (
      <Badge variant="outline" className={`${style.bg} ${style.text}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="link" 
        className="p-0 h-auto text-primary"
        onClick={() => navigate('/hr/team')}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={employee.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {employee.first_name} {employee.last_name}
              </h1>
              {getStatusBadge()}
            </div>
            <p className="text-lg text-muted-foreground">{getTitle()}</p>
            
            <div className="flex items-center gap-4 text-sm">
              {employee.phone && (
                <a 
                  href={`tel:${employee.phone}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {employee.phone}
                </a>
              )}
              {employee.phone && employee.email && (
                <span className="text-muted-foreground">|</span>
              )}
              {employee.email && (
                <a 
                  href={`mailto:${employee.email}`}
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {employee.email}
                </a>
              )}
            </div>
            
            {employee.updated_at && (
              <p className="text-sm text-muted-foreground">
                Last updated {format(new Date(employee.updated_at), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="destructive" 
            className="bg-red-500 hover:bg-red-600"
            disabled={employee.employment_status === 'terminated'}
          >
            Terminate
          </Button>
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="job-details" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="job-details"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
          >
            Job Details
          </TabsTrigger>
          <TabsTrigger 
            value="personal"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
          >
            Personal Information
          </TabsTrigger>
          <TabsTrigger 
            value="documents"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
          >
            Documents
          </TabsTrigger>
          <TabsTrigger 
            value="performance"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
          >
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="job-details" className="mt-6">
          <EmployeeJobDetails 
            employee={employee} 
            onEdit={() => setIsEditDialogOpen(true)}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="personal" className="mt-6">
          <EmployeePersonalInfo 
            employee={employee} 
            onEdit={() => setIsEditDialogOpen(true)} 
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <EmployeeDocuments employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <EmployeePerformance employeeId={employee.id} />
        </TabsContent>
      </Tabs>

      <EmployeeFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        employee={employee}
        onSuccess={() => {
          refetch();
          setIsEditDialogOpen(false);
        }}
      />
    </div>
  );
}
