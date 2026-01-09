import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  DialogTrigger,
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
import { Plus, Search, Pencil, Trash2, MapPin, Thermometer } from 'lucide-react';
import { RequireRole } from '@/components/auth/RequireRole';
import type { Tables } from '@/integrations/supabase/types';

// Location types for the dropdown
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

function LocationsContent() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
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
    },
  });

  const temperatureControlled = form.watch('temperature_controlled');
  const locationType = form.watch('location_type');

  // Auto-set is_3pl when location type is 3pl
  const handleLocationTypeChange = (value: string) => {
    form.setValue('location_type', value);
    if (value === '3pl') {
      form.setValue('is_3pl', true);
    }
    // Auto-enable temperature control for cooler/freezer
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

  const { data: locations, isLoading } = useQuery({
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

  const filteredLocations = locations?.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.location_code.toLowerCase().includes(search.toLowerCase())
  );

  const getLocationTypeLabel = (type: string) => {
    return LOCATION_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage storage locations, warehouses, and production areas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </DialogTrigger>
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
                        <Textarea 
                          placeholder="Location details..." 
                          {...field} 
                          maxLength={500}
                        />
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>3PL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <MapPin className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No locations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations?.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-mono font-bold">{location.location_code}</TableCell>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getLocationTypeLabel(location.location_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {location.temperature_controlled ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Thermometer className="h-4 w-4 text-blue-500" />
                            {location.target_temperature_min}°F to {location.target_temperature_max}°F
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {location.is_3pl ? (
                          <Badge variant="secondary">3PL</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.is_active ? 'default' : 'secondary'}>
                          {location.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(location)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(location.id)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export with role protection - only admin and manager can access
export default function Locations() {
  return (
    <RequireRole allowedRoles={['admin', 'manager']}>
      <LocationsContent />
    </RequireRole>
  );
}
