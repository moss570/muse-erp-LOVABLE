import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Globe, Phone, Mail, MapPin, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';

const companySettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  phone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  gs1_company_prefix: z.string().optional(),
  default_packaging_indicator: z.string().optional(),
});

type CompanySettingsForm = z.infer<typeof companySettingsSchema>;

export default function CompanySettings() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateMutation = useUpdateCompanySettings();

  const form = useForm<CompanySettingsForm>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
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
      default_packaging_indicator: '1',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
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
        default_packaging_indicator: settings.default_packaging_indicator || '1',
      });
    }
  }, [settings, form]);

  const onSubmit = (data: CompanySettingsForm) => {
    updateMutation.mutate(data);
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
    <div className="space-y-6">
      <SettingsBreadcrumb currentPage="Company Settings" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Configure your company information. This data is used in documents, emails, and reports.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Phone className="h-3.5 w-3.5 inline mr-1" />
                          Phone
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fax</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4568" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Mail className="h-3.5 w-3.5 inline mr-1" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="info@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Globe className="h-3.5 w-3.5 inline mr-1" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="www.company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gs1_company_prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GS1 Company Prefix</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 0123456" maxLength={11} {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Used for automatic UPC code generation
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="default_packaging_indicator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Packaging Indicator</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1" 
                          maxLength={1} 
                          {...field} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-8]/g, '');
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Used for GTIN-14 case UPC generation (1-8). 1=inner carton, 2=outer case.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <FormField
                  control={form.control}
                  name="address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Suite 100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Orlando" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="FL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="32819" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="USA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
