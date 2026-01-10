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
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2, MapPin, Thermometer, Snowflake } from 'lucide-react';
import { RequireRole } from '@/components/auth/RequireRole';
import { DataTableHeader, StatusIndicator } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table/DataTablePagination';
import { SettingsBreadcrumb } from '@/components/settings/SettingsBreadcrumb';
import type { Tables } from '@/integrations/supabase/types';

const LOCATION_TYPES = [
  { value: 'production', label: 'Production Area' },
  { value: 'dry_warehouse', label: 'Dry Warehouse' },
  { value: 'cooler', label: 'Cooler Warehouse' },
  { value: 'freezer', label: 'Onsite Freezer' },
  { value: '3pl', label: '3rd Party Storage (3PL)' },
  { value: 'shipping', label: 'Shipping Dock' },
  { value: 'receiving', label: 'Receiving Dock' },
] as const;

const locationSchema = z.object({
  location_code: z.string()
    .min(1, 'Location code is required')
    .max(20, 'Code must be 20 characters or less')
    .regex(/^[A-Z0-9-]+$/, 'Code must be uppercase letters, numbers, and hyphens only'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  location_type: z.string().min(1, 'Location type is required'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  is_3pl: z.boolean().default(false),
  temperature_controlled: z.boolean().default(false),
  target_temperature_min: z.coerce.number().optional(),
  target_temperature_max: z.coerce.number().optional(),
  is_active: z.boolean().default(true),
  // Address fields
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
}).refine(
  (data) => {
    if (data.temperature_controlled) {
      return data.target_temperature_min !== undefined && data.target_temperature_max !== undefined;
    }
    return true;
  },
  { message: 'Temperature range required for temperature-controlled locations', path: ['target_temperature_min'] }
).refine(
  (data) => {
    if (data.target_temperature_min !== undefined && data.target_temperature_max !== undefined) {
      return data.target_temperature_min <= data.target_temperature_max;
    }
    return true;
  },
  { message: 'Min temperature must be less than or equal to max', path: ['target_temperature_min'] }
);

type LocationFormData = z.infer<typeof locationSchema>;
type Location = Tables<'locations'>;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...LOCATION_TYPES.map(t => ({ value: t.value, label: t.label })),
];

function LocationsContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      location_code: '',
      name: '',
      location_type: '',
      description: '',
      is_3pl: false,
      temperature_controlled: false,
      target_temperature_min: undefined,
      target_temperature_max: undefined,
      is_active: true,
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
    },
  });

  const temperatureControlled = form.watch('temperature_controlled');
  const locationType = form.watch('location_type');

  const handleLocationTypeChange = (value: string) => {
    form.setValue('location_type', value);
    if (value === '3pl') {
      form.setValue('is_3pl', true);
    }
    if (value === 'cooler' || value === 'freezer') {
      form.setValue('temperature_controlled', true);
      if (value === 'freezer') {
        form.setValue('target_temperature_min', -25);
        form.setValue('target_temperature_max', -18);
      } else {
        form.setValue('target_temperature_min', 0);
        form.setValue('target_temperature_max', 4);
      }
    }
  };

  const { data: locations, isLoading, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Location[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const { error } = await supabase.from('locations').insert([{
        location_code: data.location_code.toUpperCase(),
        name: data.name,
        location_type: data.location_type,
        description: data.description || null,
        is_3pl: data.is_3pl,
        temperature_controlled: data.temperature_controlled,
        target_temperature_min: data.temperature_controlled ? data.target_temperature_min : null,
        target_temperature_max: data.temperature_controlled ? data.target_temperature_max : null,
        is_active: data.is_active,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        country: data.country || null,
        contact_name: data.contact_name || null,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Location created successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating location', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: LocationFormData & { id: string }) => {
      const { id, ...rest } = data;
      const { error } = await supabase
        .from('locations')
        .update({
          location_code: rest.location_code.toUpperCase(),
          name: rest.name,
          location_type: rest.location_type,
          description: rest.description || null,
          is_3pl: rest.is_3pl,
          temperature_controlled: rest.temperature_controlled,
          target_temperature_min: rest.temperature_controlled ? rest.target_temperature_min : null,
          target_temperature_max: rest.temperature_controlled ? rest.target_temperature_max : null,
          is_active: rest.is_active,
          address_line1: rest.address_line1 || null,
          address_line2: rest.address_line2 || null,
          city: rest.city || null,
          state: rest.state || null,
          zip: rest.zip || null,
          country: rest.country || null,
          contact_name: rest.contact_name || null,
          contact_phone: rest.contact_phone || null,
          contact_email: rest.contact_email || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Location updated successfully' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating location', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Location deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting location', description: error.message, variant: 'destructive' });
    },
  });

  const handleOpenDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      form.reset({
        location_code: location.location_code,
        name: location.name,
        location_type: location.location_type,
        description: location.description || '',
        is_3pl: location.is_3pl ?? false,
        temperature_controlled: location.temperature_controlled ?? false,
        target_temperature_min: location.target_temperature_min ?? undefined,
        target_temperature_max: location.target_temperature_max ?? undefined,
        is_active: location.is_active,
        address_line1: (location as any).address_line1 || '',
        address_line2: (location as any).address_line2 || '',
        city: (location as any).city || '',
        state: (location as any).state || '',
        zip: (location as any).zip || '',
        country: (location as any).country || 'USA',
        contact_name: (location as any).contact_name || '',
        contact_phone: (location as any).contact_phone || '',
        contact_email: (location as any).contact_email || '',
      });
    } else {
      setEditingLocation(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    form.reset();
  };

  const onSubmit = (data: LocationFormData) => {
    if (editingLocation) {
      updateMutation.mutate({ ...data, id: editingLocation.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const getLocationTypeLabel = (type: string) => {
    return LOCATION_TYPES.find(t => t.value === type)?.label || type;
  };

  // Filter and paginate
  const filteredLocations = locations?.filter((l) => {
    const matchesSearch = 
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.location_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && l.is_active) ||
      (statusFilter === 'inactive' && !l.is_active);
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredLocations?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedLocations = filteredLocations?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <SettingsBreadcrumb currentPage="Locations" />
      <DataTableHeader
        title="Locations"
        subtitle="Manage storage locations, warehouses, and production areas"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search locations..."
        filterValue={statusFilter}
        onFilterChange={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="All Status"
        onAdd={() => handleOpenDialog()}
        addLabel="Add Location"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        totalCount={locations?.length}
        filteredCount={filteredLocations?.length}
      />

      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLocations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <MapPin className="mx-auto h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No locations found</p>
                      <p className="text-sm">Try adjusting your search or filter</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLocations?.map((location) => (
                    <TableRow 
                      key={location.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDialog(location)}
                    >
                      <TableCell>
                        <StatusIndicator 
                          status={location.is_active ? 'active' : 'inactive'} 
                        />
                      </TableCell>
                      <TableCell className="font-mono font-bold">{location.location_code}</TableCell>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getLocationTypeLabel(location.location_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {location.temperature_controlled ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            {location.location_type === 'freezer' ? (
                              <Snowflake className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Thermometer className="h-4 w-4 text-cyan-500" />
                            )}
                            <span>{location.target_temperature_min}°F - {location.target_temperature_max}°F</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {location.is_3pl && (
                            <Badge variant="secondary" className="text-xs">3PL</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDialog(location);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(location.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="location_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="PROD-01" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          maxLength={20}
                        />
                      </FormControl>
                      <FormDescription>Unique identifier (e.g., FRZ-01)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Freezer" {...field} maxLength={100} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Type</FormLabel>
                    <Select onValueChange={handleLocationTypeChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LOCATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Location details..." {...field} maxLength={500} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="is_3pl"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                          disabled={locationType === '3pl'}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">3rd Party Location (3PL)</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="temperature_controlled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Temperature Controlled</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              {temperatureControlled && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <FormField
                    control={form.control}
                    name="target_temperature_min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Temperature (°F)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="-20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="target_temperature_max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Temperature (°F)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Address Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ship-To Address
                </h4>
                <div className="space-y-4">
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
                  <div className="grid grid-cols-3 gap-4">
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
                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP</FormLabel>
                          <FormControl>
                            <Input placeholder="32819" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Contact Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingLocation ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Locations() {
  return (
    <RequireRole allowedRoles={['admin', 'manager']}>
      <LocationsContent />
    </RequireRole>
  );
}
