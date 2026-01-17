import { useEffect, useState } from 'react';
import { Building2, Globe, Phone, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { 
  AutoSaveProvider, 
  AutoSaveInput, 
  FormSaveStatus 
} from '@/components/ui/auto-save';

export default function CompanySettings() {
  const { data: settings, isLoading } = useCompanySettings();
  
  // Local state for form values
  const [formValues, setFormValues] = useState({
    company_name: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    gs1_company_prefix: '',
  });

  // Sync form values when settings load
  useEffect(() => {
    if (settings) {
      setFormValues({
        company_name: settings.company_name || '',
        phone: settings.phone || '',
        fax: settings.fax || '',
        email: settings.email || '',
        website: settings.website || '',
        address_line1: settings.address_line1 || '',
        address_line2: settings.address_line2 || '',
        city: settings.city || '',
        state: settings.state || '',
        zip: settings.zip || '',
        country: settings.country || 'USA',
        gs1_company_prefix: settings.gs1_company_prefix || '',
      });
    }
  }, [settings]);

  const updateValue = (field: keyof typeof formValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SettingsBreadcrumb currentPage="Company Settings" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AutoSaveProvider
      tableName="company_settings"
      recordId={settings?.id}
      queryKey={['company-settings']}
      enabled={!!settings?.id}
    >
      <div className="space-y-6">
        <SettingsBreadcrumb currentPage="Company Settings" />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
            <p className="text-muted-foreground">
              Configure your company information. Changes save automatically.
            </p>
          </div>
          <FormSaveStatus />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Company Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>Company Information</CardTitle>
              </div>
              <CardDescription>
                Basic company details used across the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <AutoSaveInput
                  id="company_name"
                  name="company_name"
                  value={formValues.company_name}
                  onValueChange={(v) => updateValue('company_name', v)}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-3.5 w-3.5 inline mr-1" />
                    Phone
                  </Label>
                  <AutoSaveInput
                    id="phone"
                    name="phone"
                    value={formValues.phone}
                    onValueChange={(v) => updateValue('phone', v)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fax">Fax</Label>
                  <AutoSaveInput
                    id="fax"
                    name="fax"
                    value={formValues.fax}
                    onValueChange={(v) => updateValue('fax', v)}
                    placeholder="(555) 123-4568"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-3.5 w-3.5 inline mr-1" />
                  Email
                </Label>
                <AutoSaveInput
                  id="email"
                  name="email"
                  type="email"
                  value={formValues.email}
                  onValueChange={(v) => updateValue('email', v)}
                  placeholder="info@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">
                  <Globe className="h-3.5 w-3.5 inline mr-1" />
                  Website
                </Label>
                <AutoSaveInput
                  id="website"
                  name="website"
                  value={formValues.website}
                  onValueChange={(v) => updateValue('website', v)}
                  placeholder="www.company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gs1_company_prefix">GS1 Company Prefix</Label>
                <AutoSaveInput
                  id="gs1_company_prefix"
                  name="gs1_company_prefix"
                  value={formValues.gs1_company_prefix}
                  onValueChange={(v) => updateValue('gs1_company_prefix', v)}
                  placeholder="e.g., 0123456"
                  maxLength={11}
                />
                <p className="text-xs text-muted-foreground">
                  Used for automatic UPC code generation
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Address Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Address</CardTitle>
              </div>
              <CardDescription>
                Company address for documents and shipping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <AutoSaveInput
                  id="address_line1"
                  name="address_line1"
                  value={formValues.address_line1}
                  onValueChange={(v) => updateValue('address_line1', v)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <AutoSaveInput
                  id="address_line2"
                  name="address_line2"
                  value={formValues.address_line2}
                  onValueChange={(v) => updateValue('address_line2', v)}
                  placeholder="Suite 100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <AutoSaveInput
                    id="city"
                    name="city"
                    value={formValues.city}
                    onValueChange={(v) => updateValue('city', v)}
                    placeholder="Orlando"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <AutoSaveInput
                    id="state"
                    name="state"
                    value={formValues.state}
                    onValueChange={(v) => updateValue('state', v)}
                    placeholder="FL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <AutoSaveInput
                    id="zip"
                    name="zip"
                    value={formValues.zip}
                    onValueChange={(v) => updateValue('zip', v)}
                    placeholder="32819"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <AutoSaveInput
                    id="country"
                    name="country"
                    value={formValues.country}
                    onValueChange={(v) => updateValue('country', v)}
                    placeholder="USA"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AutoSaveProvider>
  );
}
