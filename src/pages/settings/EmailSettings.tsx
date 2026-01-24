import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Mail,
  Bell,
  UserPlus,
  FileText,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useEmailSettings, useUpdateEmailSetting, EmailSetting, EMAIL_TYPE_LABELS } from '@/hooks/useEmailSettings';

const EMAIL_TYPE_ICONS: Record<string, React.ElementType> = {
  noreply: Bell,
  employee_welcome: UserPlus,
  invoices: FileText,
  purchase_orders: ShoppingCart,
  '3pl_releases': Warehouse,
  sales: TrendingUp,
};

function EmailSettingCard({
  setting,
  onUpdate,
  isUpdating,
}: {
  setting: EmailSetting;
  onUpdate: (id: string, updates: Partial<EmailSetting>) => void;
  isUpdating: boolean;
}) {
  const [localFromName, setLocalFromName] = useState(setting.from_name);
  const [localFromEmail, setLocalFromEmail] = useState(setting.from_email);
  const [localReplyTo, setLocalReplyTo] = useState(setting.reply_to || '');

  const Icon = EMAIL_TYPE_ICONS[setting.email_type] || Mail;
  const typeLabel = EMAIL_TYPE_LABELS[setting.email_type]?.label || setting.email_type;

  const handleBlur = (field: string, value: string) => {
    const originalValue = field === 'from_name' ? setting.from_name
      : field === 'from_email' ? setting.from_email
      : (setting.reply_to || '');

    if (value !== originalValue) {
      onUpdate(setting.id, { [field]: value || null });
    }
  };

  const handleToggleActive = (checked: boolean) => {
    onUpdate(setting.id, { is_active: checked });
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const emailValid = isValidEmail(localFromEmail);

  return (
    <Card className={!setting.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {typeLabel}
                {setting.is_active ? (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Disabled
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {setting.description}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={setting.is_active}
            onCheckedChange={handleToggleActive}
            disabled={isUpdating}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${setting.id}-from-name`}>From Name</Label>
            <Input
              id={`${setting.id}-from-name`}
              value={localFromName}
              onChange={(e) => setLocalFromName(e.target.value)}
              onBlur={() => handleBlur('from_name', localFromName)}
              placeholder="Company Name"
              disabled={isUpdating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${setting.id}-from-email`}>From Email</Label>
            <div className="relative">
              <Input
                id={`${setting.id}-from-email`}
                type="email"
                value={localFromEmail}
                onChange={(e) => setLocalFromEmail(e.target.value)}
                onBlur={() => handleBlur('from_email', localFromEmail)}
                placeholder="noreply@example.com"
                disabled={isUpdating}
                className={!emailValid && localFromEmail ? 'border-destructive' : ''}
              />
              {emailValid && localFromEmail && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              )}
            </div>
            {!emailValid && localFromEmail && (
              <p className="text-xs text-destructive">Please enter a valid email address</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${setting.id}-reply-to`}>Reply-To Email (optional)</Label>
          <Input
            id={`${setting.id}-reply-to`}
            type="email"
            value={localReplyTo}
            onChange={(e) => setLocalReplyTo(e.target.value)}
            onBlur={() => handleBlur('reply_to', localReplyTo)}
            placeholder="Same as From Email if empty"
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function EmailSettings() {
  const { data: emailSettings, isLoading, error } = useEmailSettings();
  const updateMutation = useUpdateEmailSetting();

  const handleUpdate = (id: string, updates: Partial<EmailSetting>) => {
    updateMutation.mutate({ id, updates });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-muted-foreground">Configure email addresses for system notifications</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load email settings. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground">Configure email addresses for system notifications</p>
      </div>

      {/* Resend Status */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg p-2 bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Resend Email Service</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Emails are sent via Resend. Make sure your domain is verified at{' '}
                <a
                  href="https://resend.com/domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  resend.com/domains
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  musescoop.com verified
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {emailSettings?.map((setting) => (
            <EmailSettingCard
              key={setting.id}
              setting={setting}
              onUpdate={handleUpdate}
              isUpdating={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Help Text */}
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertTitle>Email Configuration</AlertTitle>
        <AlertDescription>
          All emails must be sent from verified domains. The "From Email" must match your verified domain 
          (e.g., @musescoop.com). Changes are saved automatically when you move to the next field.
        </AlertDescription>
      </Alert>
    </div>
  );
}
