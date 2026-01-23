import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, UserPlus, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface CreateUserAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    employee_number: string;
  };
  onSuccess?: () => void;
}

export function CreateUserAccountDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: CreateUserAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(employee.email || '');
  const [role, setRole] = useState<'employee' | 'supervisor' | 'manager' | 'admin'>('employee');
  const [sendPasswordEmail, setSendPasswordEmail] = useState(true);

  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!email) {
        throw new Error('Email is required');
      }

      // Generate a temporary password (user will reset via email)
      const temporaryPassword = `${employee.first_name}${Math.random().toString(36).slice(2, 10)}`;

      // Create the user via Supabase Admin API (requires service role)
      // For now, we'll use a Supabase Edge Function for this
      const { data: authData, error: authError } = await supabase.functions.invoke(
        'create-employee-user',
        {
          body: {
            email,
            password: temporaryPassword,
            firstName: employee.first_name,
            lastName: employee.last_name,
            employeeId: employee.id,
            role,
            sendPasswordResetEmail: sendPasswordEmail,
          },
        }
      );

      if (authError) {
        throw authError;
      }

      return authData;
    },
    onSuccess: () => {
      toast({
        title: 'User account created',
        description: sendPasswordEmail
          ? `An email has been sent to ${email} with instructions to set their password.`
          : 'User account has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create user account',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create User Account
          </DialogTitle>
          <DialogDescription>
            Create a user account for {employee.first_name} {employee.last_name} (
            {employee.employee_number}) to access the application.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@company.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              This will be used for login and password reset emails.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">User Role *</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Employee</span>
                    <span className="text-xs text-muted-foreground">
                      Access to My Portal dashboard only
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="supervisor">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Supervisor</span>
                    <span className="text-xs text-muted-foreground">
                      Manage team schedules and approve time entries
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Manager</span>
                    <span className="text-xs text-muted-foreground">
                      Full department access and reporting
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Administrator</span>
                    <span className="text-xs text-muted-foreground">
                      Full system access including settings
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendEmail"
              checked={sendPasswordEmail}
              onCheckedChange={(checked) => setSendPasswordEmail(checked as boolean)}
            />
            <Label
              htmlFor="sendEmail"
              className="text-sm font-normal cursor-pointer"
            >
              Send password setup email to the employee
            </Label>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {sendPasswordEmail ? (
                <>
                  The employee will receive an email with a link to set their password. The
                  account will be created immediately but they'll need to set a password
                  before logging in.
                </>
              ) : (
                <>
                  A temporary password will be generated. You'll need to manually share the
                  password with the employee and have them change it on first login.
                </>
              )}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              {createUserMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
