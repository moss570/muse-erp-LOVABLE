import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  User,
  Eye,
  EyeOff,
  Pencil,
  FileText,
  Settings,
  Save,
} from 'lucide-react';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import type { Enums } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;

interface PermissionResource {
  id: string;
  resource_type: 'page' | 'feature' | 'field' | 'report';
  resource_key: string;
  resource_name: string;
  parent_key: string | null;
  description: string | null;
  sort_order: number;
}

interface RolePermission {
  id: string;
  role: AppRole;
  resource_key: string;
  access_level: 'full' | 'read' | 'none';
}

const ROLES: { value: AppRole; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'admin', label: 'Administrator', icon: ShieldAlert, description: 'Full system access' },
  { value: 'manager', label: 'Manager', icon: ShieldCheck, description: 'Department management' },
  { value: 'supervisor', label: 'Supervisor', icon: Shield, description: 'Team oversight' },
  { value: 'employee', label: 'Employee', icon: User, description: 'Standard user' },
];

const ACCESS_LEVELS = [
  { value: 'full', label: 'Full Access', icon: Pencil, color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'read', label: 'Read Only', icon: Eye, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'none', label: 'No Access', icon: EyeOff, color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

const RESOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  page: Settings,
  feature: Pencil,
  field: FileText,
  report: FileText,
};

export default function RolePermissions() {
  const [activeRole, setActiveRole] = useState<AppRole>('manager');
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch permission resources
  const { data: resources, isLoading: resourcesLoading } = useQuery({
    queryKey: ['permission-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permission_resources')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as PermissionResource[];
    },
  });

  // Fetch role permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  // Save permissions mutation
  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, string>) => {
      const updates = Object.entries(changes).map(([resource_key, access_level]) => ({
        role: activeRole,
        resource_key,
        access_level,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('role_permissions')
          .upsert(update, { onConflict: 'role,resource_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['all-user-permissions'] });
      setPendingChanges({});
      toast({ title: 'Permissions saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving permissions', description: error.message, variant: 'destructive' });
    },
  });

  const getPermissionLevel = (resourceKey: string): string => {
    // Check pending changes first
    if (pendingChanges[resourceKey]) {
      return pendingChanges[resourceKey];
    }
    // Then check saved permissions
    const perm = permissions?.find(p => p.role === activeRole && p.resource_key === resourceKey);
    return perm?.access_level || 'none';
  };

  const handlePermissionChange = (resourceKey: string, newLevel: string) => {
    const currentSaved = permissions?.find(p => p.role === activeRole && p.resource_key === resourceKey);
    
    if (currentSaved?.access_level === newLevel) {
      // Remove from pending if it matches saved value
      const { [resourceKey]: _, ...rest } = pendingChanges;
      setPendingChanges(rest);
    } else {
      setPendingChanges(prev => ({ ...prev, [resourceKey]: newLevel }));
    }
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) return;
    saveMutation.mutate(pendingChanges);
  };

  const handleRoleChange = (role: AppRole) => {
    if (Object.keys(pendingChanges).length > 0) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setPendingChanges({});
    setActiveRole(role);
  };

  // Group resources by type
  const groupedResources = resources?.reduce((acc, resource) => {
    if (!acc[resource.resource_type]) {
      acc[resource.resource_type] = [];
    }
    acc[resource.resource_type].push(resource);
    return acc;
  }, {} as Record<string, PermissionResource[]>) || {};

  const isLoading = resourcesLoading || permissionsLoading;
  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Role Permissions" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Permissions</h1>
          <p className="text-muted-foreground">
            Configure access levels for each user role
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes ({Object.keys(pendingChanges).length})
          </Button>
        )}
      </div>

      {/* Role Selector */}
      <div className="grid gap-4 md:grid-cols-4">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isActive = activeRole === role.value;
          const isAdmin = role.value === 'admin';
          return (
            <Card 
              key={role.value}
              className={`cursor-pointer transition-colors ${
                isActive ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
              } ${isAdmin ? 'opacity-60' : ''}`}
              onClick={() => !isAdmin && handleRoleChange(role.value)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <CardTitle className="text-base">{role.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{role.description}</p>
                {isAdmin && (
                  <Badge variant="secondary" className="mt-2 text-xs">Always Full Access</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeRole === 'admin' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Administrators have full access</p>
            <p className="text-muted-foreground">Admin permissions cannot be modified</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="page" className="space-y-4">
          <TabsList>
            <TabsTrigger value="page" className="gap-2">
              <Settings className="h-4 w-4" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="feature" className="gap-2">
              <Pencil className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {['page', 'feature', 'report'].map((type) => (
            <TabsContent key={type} value={type}>
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">{type} Permissions</CardTitle>
                  <CardDescription>
                    Set access levels for {type}s for the {ROLES.find(r => r.value === activeRole)?.label} role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Resource</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[180px]">Access Level</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedResources[type]?.map((resource) => {
                          const currentLevel = getPermissionLevel(resource.resource_key);
                          const isPending = pendingChanges[resource.resource_key] !== undefined;
                          const Icon = RESOURCE_TYPE_ICONS[resource.resource_type] || Settings;
                          
                          return (
                            <TableRow key={resource.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{resource.resource_name}</span>
                                  {isPending && (
                                    <Badge variant="outline" className="text-xs">Modified</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {resource.description || '-'}
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={currentLevel}
                                  onValueChange={(value) => handlePermissionChange(resource.resource_key, value)}
                                >
                                  <SelectTrigger className="w-[160px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ACCESS_LEVELS.map((level) => {
                                      const LevelIcon = level.icon;
                                      return (
                                        <SelectItem key={level.value} value={level.value}>
                                          <div className="flex items-center gap-2">
                                            <LevelIcon className="h-4 w-4" />
                                            {level.label}
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(!groupedResources[type] || groupedResources[type].length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              No {type} permissions configured
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
