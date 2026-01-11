import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { EmployeeFormDialog } from '@/components/hr/EmployeeFormDialog';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Download, 
  Printer,
  Users,
  Mail,
  Phone,
} from 'lucide-react';
import type { EmployeeWithRelations } from '@/hooks/useEmployees';

export default function TeamRoster() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showTerminated, setShowTerminated] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['employees', showTerminated],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select(`
          *,
          job_position:job_positions(*),
          department:departments(*),
          location:locations(*)
        `)
        .order('last_name')
        .order('first_name');
      
      if (!showTerminated) {
        query = query.neq('employment_status', 'terminated');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeWithRelations[];
    },
  });

  const filteredEmployees = employees?.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const searchLower = search.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.employee_number?.toLowerCase().includes(searchLower) ||
      emp.job_position?.name?.toLowerCase().includes(searchLower)
    );
  });

  const totalItems = filteredEmployees?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedEmployees = filteredEmployees?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getInitials = (emp: EmployeeWithRelations) => {
    return `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
  };

  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      terminated: 'bg-red-100 text-red-800 border-red-200',
      on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    
    const labels: Record<string, string> = {
      active: 'Active',
      inactive: 'Inactive',
      terminated: 'Terminated',
      on_leave: 'On Leave',
      pending: 'Needs Invite',
    };
    
    return (
      <Badge variant="outline" className={styles[status || 'active']}>
        {labels[status || 'active']}
      </Badge>
    );
  };

  const formatWage = (emp: EmployeeWithRelations) => {
    if (emp.pay_type === 'salary' && emp.salary_amount) {
      return `$${emp.salary_amount.toLocaleString()}/yr`;
    } else if (emp.pay_type === 'hourly' && emp.hourly_rate) {
      return `$${emp.hourly_rate.toFixed(2)}/hr`;
    }
    return <span className="text-primary cursor-pointer hover:underline">Add wage</span>;
  };

  const handleRowClick = (emp: EmployeeWithRelations) => {
    navigate(`/hr/team/${emp.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team roster</h1>
          <p className="text-muted-foreground">{totalItems} team members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline">Bulk actions</Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add team member
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-terminated"
              checked={showTerminated}
              onCheckedChange={setShowTerminated}
            />
            <Label htmlFor="show-terminated" className="text-sm">
              Show terminated
            </Label>
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[280px]">Team Member</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Wage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No team members found</p>
                      <p className="text-sm">Add your first team member to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees?.map((emp) => (
                    <TableRow 
                      key={emp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(emp)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-sm bg-primary/10 text-primary">
                              {getInitials(emp)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-primary hover:underline">
                              {emp.first_name} {emp.last_name}
                            </p>
                            {emp.employment_type && (
                              <p className="text-xs text-muted-foreground capitalize">
                                {emp.employment_type.replace('_', '-')} Employee
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {emp.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{emp.email}</span>
                            </div>
                          )}
                          {emp.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                          {!emp.email && !emp.phone && (
                            <span className="text-sm text-muted-foreground">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.location?.name || 'Muse Gelato'}
                      </TableCell>
                      <TableCell>
                        {emp.job_position?.name || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatWage(emp)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(emp.employment_status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/hr/team/${emp.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Message</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Terminate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalItems > 0 && (
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      <EmployeeFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          refetch();
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
