import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Users, Shield, ShieldCheck, ShieldAlert, User, KeyRound, LogOut, Loader2, Trash2 } from 'lucide-react';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import type { Tables, Enums } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;
type Department = Tables<'departments'>;

interface UserWithRole extends Profile {
  role?: Enums<'app_role'>;
  department?: Department;
}

const ROLES: { value: Enums<'app_role'>; label: string; icon: React.ElementType }[] = [
  { value: 'admin', label: 'Administrator', icon: ShieldAlert },
  { value: 'hr', label: 'HR', icon: ShieldCheck },
  { value: 'manager', label: 'Manager', icon: ShieldCheck },
  { value: 'supervisor', label: 'Supervisor', icon: Shield },
  { value: 'employee', label: 'Employee', icon: User },
];

const USER_STATUSES: { value: Enums<'user_status'>; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const userRoleSchema = z.object({
  role: z.enum(['admin', 'hr', 'manager', 'supervisor', 'employee']),
});

type UserRoleFormData = z.infer<typeof userRoleSchema>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];

const ROLE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  ...ROLES.map(r => ({ value: r.value, label: r.label })),
];

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmAction, setConfirmAction] = useState<'reset-password' | 'signout' | 'delete' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserRoleFormData>({
    resolver: zodResolver(userRoleSchema),
    defaultValues: {
      role: 'employee',
    },
  });

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, departments:department_id(*)')
        .order('last_name')
        .order('first_name');
      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      if (rolesError) throw rolesError;

      // Map roles to profiles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role,
          department: profile.departments as Department | undefined,
        };
      });

      return usersWithRoles;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Enums<'app_role'> }) => {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({ title: 'User role updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating user role', description: error.message, variant: 'destructive' });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (user: UserWithRole) => {
      const { data, error } = await supabase.functions.invoke('admin-reset-user-password', {
        body: {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Password reset email sent', description: 'The user will receive an email with instructions to reset their password.' });
      setConfirmAction(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error sending password reset', description: error.message, variant: 'destructive' });
      setConfirmAction(null);
    },
  });

  // Sign out user mutation
  const signoutUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-signout-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'User signed out', description: 'The user has been signed out from all sessions.' });
      setConfirmAction(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error signing out user', description: error.message, variant: 'destructive' });
      setConfirmAction(null);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({ title: 'User deleted', description: 'The user account has been permanently deleted.' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting user', description: error.message, variant: 'destructive' });
      setConfirmAction(null);
    },
  });

  const handleOpenDialog = (user: UserWithRole) => {
    setEditingUser(user);
    form.reset({
      role: user.role || 'employee',
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    form.reset();
    setConfirmAction(null);
  };

  const onSubmit = (data: UserRoleFormData) => {
    if (editingUser) {
      updateRoleMutation.mutate({ userId: editingUser.id, role: data.role });
    }
  };

  const handleResetPassword = () => {
    if (editingUser) {
      resetPasswordMutation.mutate(editingUser);
    }
  };

  const handleSignoutUser = () => {
    if (editingUser) {
      signoutUserMutation.mutate(editingUser.id);
    }
  };

  const handleDeleteUser = () => {
    if (editingUser) {
      deleteUserMutation.mutate(editingUser.id);
    }
  };

  const getRoleBadge = (role?: Enums<'app_role'>) => {
    if (!role) {
      return <Badge variant="outline" className="text-muted-foreground">No Role</Badge>;
    }
    
    const roleInfo = ROLES.find(r => r.value === role);
    const Icon = roleInfo?.icon || User;
    
    const colors: Record<Enums<'app_role'>, string> = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      hr: 'bg-amber-100 text-amber-800 border-amber-200',
      manager: 'bg-purple-100 text-purple-800 border-purple-200',
      supervisor: 'bg-blue-100 text-blue-800 border-blue-200',
      employee: 'bg-green-100 text-green-800 border-green-200',
    };

    return (
      <Badge variant="outline" className={`gap-1 ${colors[role]}`}>
        <Icon className="h-3 w-3" />
        {roleInfo?.label || role}
      </Badge>
    );
  };

  const getStatusBadge = (status: Enums<'user_status'>) => {
    const colors: Record<Enums<'user_status'>, string> = {
      active: 'active',
      inactive: 'inactive',
      pending: 'pending',
    };
    return <StatusIndicator status={colors[status] as 'active' | 'inactive' | 'pending'} />;
  };

  const getInitials = (user: UserWithRole) => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getFullName = (user: UserWithRole) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email || 'Unknown User';
  };

  // Filter and paginate
  const filteredUsers = users?.filter((u) => {
    const fullName = getFullName(u).toLowerCase();
    const matchesSearch = 
      fullName.includes(search.toLowerCase()) ||
      (u.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (u.employee_id?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const totalItems = filteredUsers?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="User Management" />
      
      <DataTableHeader
        title="User Management"
        subtitle="Manage user accounts, roles, and permissions"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search users..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={users?.length}
        filteredCount={filteredUsers?.length}
      />

      {/* Role Filter */}
      <div className="flex items-center gap-2">
        <Select value={roleFilter} onValueChange={(value) => { setRoleFilter(value); setCurrentPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTER_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No users found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers?.map((user) => (
                    <TableRow 
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(user)}
                    >
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{getInitials(user)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{getFullName(user)}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {user.employee_id || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.department?.name || '-'}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(user);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={editingUser.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(editingUser)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{getFullName(editingUser)}</p>
                  <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROLES.map((role) => {
                              const Icon = role.icon;
                              return (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    {role.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={updateRoleMutation.isPending}>
                      {updateRoleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Role'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

              <Separator />
              
              {/* Account Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Account Actions</h4>
                
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => setConfirmAction('reset-password')}
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Send Password Reset Email
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={() => setConfirmAction('signout')}
                    disabled={signoutUserMutation.isPending}
                  >
                    {signoutUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Sign Out All Sessions
                  </Button>
                  
                  <Button
                    variant="destructive"
                    className="justify-start gap-2"
                    onClick={() => setConfirmAction('delete')}
                    disabled={deleteUserMutation.isPending}
                  >
                    {deleteUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete User Account
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'reset-password' && 'Send Password Reset Email?'}
              {confirmAction === 'signout' && 'Sign Out User?'}
              {confirmAction === 'delete' && 'Delete User Account?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {confirmAction === 'reset-password' && (
                  <p>This will send a password reset email to {editingUser?.email}. The user will need to click the link in the email to set a new password.</p>
                )}
                {confirmAction === 'signout' && (
                  <p>This will sign out {editingUser ? getFullName(editingUser) : 'the user'} from all devices and sessions. They will need to log in again.</p>
                )}
                {confirmAction === 'delete' && (
                  <>
                    <p className="font-medium text-destructive">This action cannot be undone.</p>
                    <p>This will permanently delete the user's login credentials and revoke all access for {editingUser ? getFullName(editingUser) : 'this user'}.</p>
                    <p className="text-muted-foreground">The employee's HR records (shifts, wage history, training) will be preserved in the Team Roster.</p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={
                confirmAction === 'reset-password' 
                  ? handleResetPassword 
                  : confirmAction === 'signout' 
                    ? handleSignoutUser 
                    : handleDeleteUser
              }
              className={confirmAction === 'signout' || confirmAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmAction === 'reset-password' && 'Send Email'}
              {confirmAction === 'signout' && 'Sign Out'}
              {confirmAction === 'delete' && 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
