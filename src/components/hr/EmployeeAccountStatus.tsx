import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  UserPlus,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  Loader2,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';

interface EmployeeAccountStatusProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    employee_number: string;
    profile_id?: string | null;
  };
  onCreateAccount: () => void;
}

interface InvitationRecord {
  id: string;
  email: string;
  invited_at: string;
  invitation_type: string;
  invited_by: string | null;
  email_sent: boolean;
  inviter?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface UserProfile {
  id: string;
  email: string | null;
  status: string | null;
  created_at: string;
}

export function EmployeeAccountStatus({ employee, onCreateAccount }: EmployeeAccountStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isResending, setIsResending] = useState(false);

  // Fetch the latest invitation record
  const { data: latestInvitation, isLoading: invitationLoading } = useQuery({
    queryKey: ['employee-invitation', employee.id],
    queryFn: async () => {
      if (!employee.profile_id) return null;

      const { data, error } = await supabase
        .from('employee_account_invitations')
        .select(`
          id,
          email,
          invited_at,
          invitation_type,
          invited_by,
          email_sent,
          inviter:profiles!employee_account_invitations_invited_by_fkey(first_name, last_name)
        `)
        .eq('employee_id', employee.id)
        .order('invited_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching invitation:', error);
        return null;
      }

      return data as InvitationRecord | null;
    },
    enabled: !!employee.profile_id,
  });

  // Fetch user profile data including last sign in
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', employee.profile_id],
    queryFn: async () => {
      if (!employee.profile_id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, status, created_at')
        .eq('id', employee.profile_id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as UserProfile;
    },
    enabled: !!employee.profile_id,
  });

  // Fetch user role
  const { data: userRole } = useQuery({
    queryKey: ['user-role', employee.profile_id],
    queryFn: async () => {
      if (!employee.profile_id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', employee.profile_id)
        .single();

      if (error) return null;
      return data?.role;
    },
    enabled: !!employee.profile_id,
  });

  // Resend email mutation
  const resendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-employee-welcome-email', {
        body: {
          employeeId: employee.id,
          email: employee.email,
          firstName: employee.first_name,
          lastName: employee.last_name,
          isResend: true,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Email sent',
        description: `Password setup email has been resent to ${employee.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ['employee-invitation', employee.id] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send email',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleResendEmail = async () => {
    if (!employee.email) {
      toast({
        title: 'No email address',
        description: 'This employee does not have an email address on file.',
        variant: 'destructive',
      });
      return;
    }
    setIsResending(true);
    try {
      await resendMutation.mutateAsync();
    } finally {
      setIsResending(false);
    }
  };

  // Check if resend is throttled (within 1 hour of last send)
  const isResendThrottled = latestInvitation
    ? differenceInHours(new Date(), new Date(latestInvitation.invited_at)) < 1
    : false;

  const isLoading = invitationLoading || profileLoading;

  // No account state
  if (!employee.profile_id) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            User Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                This employee does not have a user account yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Create an account to allow them to access the system.
              </p>
            </div>
            <Button onClick={onCreateAccount} variant="default">
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            User Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading account status...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine status based on profile data
  // Since we can't access auth.users.last_sign_in_at directly, we'll use the profile status
  // A user who has never logged in might still have status 'active' from account creation
  // We'll check if there's an invitation and use that as an indicator
  const hasLoggedIn = userProfile?.status === 'active' && !latestInvitation;
  const isPending = !!latestInvitation;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            User Account
          </CardTitle>
          {isPending ? (
            <Badge variant="secondary" className="text-warning">
              <Clock className="h-3 w-3 mr-1" />
              Pending First Login
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-primary">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="font-medium">{userProfile?.email || employee.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Role</p>
            <p className="font-medium capitalize">{userRole || 'Employee'}</p>
          </div>
        </div>

        <Separator />

        {/* Invitation Info or Active Status */}
        {isPending && latestInvitation ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg border border-border">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Awaiting first login
                </p>
                <p className="text-xs text-muted-foreground">
                  {latestInvitation.invitation_type === 'resend' ? 'Reminder' : 'Welcome'} email sent{' '}
                  {formatDistanceToNow(new Date(latestInvitation.invited_at), { addSuffix: true })}
                  {latestInvitation.inviter && (
                    <> by {latestInvitation.inviter.first_name} {latestInvitation.inviter.last_name}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {isResendThrottled
                  ? `Wait ${60 - differenceInHours(new Date(), new Date(latestInvitation.invited_at))} more minutes before resending`
                  : 'Need to resend the setup email?'}
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendEmail}
                        disabled={isResending || isResendThrottled}
                      >
                        {isResending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Resend Email
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isResendThrottled && (
                    <TooltipContent>
                      <p>Email was sent recently. Please wait before resending.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Account is active and in use</span>
            </div>
            {userProfile?.created_at && (
              <p className="text-xs text-muted-foreground">
                Account created {format(new Date(userProfile.created_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
