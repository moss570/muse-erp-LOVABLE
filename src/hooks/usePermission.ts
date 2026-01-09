import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Permission {
  resource_key: string;
  access_level: 'full' | 'read' | 'none';
}

export function usePermission(resourceKey: string) {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get user's role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role')
        .limit(1)
        .single();

      if (!roleData) return [];

      // Admin has full access to everything
      if (roleData.role === 'admin') {
        return [{ resource_key: '*', access_level: 'full' as const }];
      }

      // Get role permissions
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('resource_key, access_level')
        .eq('role', roleData.role);

      return (perms || []) as Permission[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const hasAccess = (level: 'read' | 'full' = 'read'): boolean => {
    if (isLoading || !permissions) return false;
    
    // Check for admin wildcard
    const adminPerm = permissions.find(p => p.resource_key === '*');
    if (adminPerm && adminPerm.access_level === 'full') return true;

    const perm = permissions.find(p => p.resource_key === resourceKey);
    if (!perm || perm.access_level === 'none') return false;
    
    if (level === 'full') {
      return perm.access_level === 'full';
    }
    
    return perm.access_level === 'read' || perm.access_level === 'full';
  };

  const canRead = hasAccess('read');
  const canWrite = hasAccess('full');

  return {
    canRead,
    canWrite,
    isLoading,
    accessLevel: permissions?.find(p => p.resource_key === resourceKey)?.access_level || 
                 (permissions?.find(p => p.resource_key === '*') ? 'full' : 'none'),
  };
}

export function usePermissions() {
  const { user } = useAuth();

  const { data: allPermissions, isLoading } = useQuery({
    queryKey: ['all-user-permissions', user?.id],
    queryFn: async () => {
      if (!user) return { role: null, permissions: [] as Permission[] };
      
      // Get user's role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role')
        .limit(1)
        .single();

      if (!roleData) return { role: null, permissions: [] as Permission[] };

      // Get role permissions
      const { data: perms } = await supabase
        .from('role_permissions')
        .select('resource_key, access_level')
        .eq('role', roleData.role);

      return { 
        role: roleData.role, 
        permissions: (perms || []) as Permission[],
        isAdmin: roleData.role === 'admin'
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const checkPermission = (resourceKey: string, level: 'read' | 'full' = 'read'): boolean => {
    if (!allPermissions) return false;
    if (allPermissions.isAdmin) return true;

    const perm = allPermissions.permissions.find(p => p.resource_key === resourceKey);
    if (!perm || perm.access_level === 'none') return false;
    
    if (level === 'full') {
      return perm.access_level === 'full';
    }
    
    return perm.access_level === 'read' || perm.access_level === 'full';
  };

  return {
    role: allPermissions?.role,
    isAdmin: allPermissions?.isAdmin || false,
    permissions: allPermissions?.permissions || [],
    isLoading,
    checkPermission,
  };
}
