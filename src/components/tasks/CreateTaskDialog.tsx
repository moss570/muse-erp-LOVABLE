import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateTask, useTaskCategories } from '@/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EmployeeCombobox from '@/components/shared/EmployeeCombobox';
import ChecklistBuilder from '@/components/tasks/ChecklistBuilder';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  
  assignment_type: z.enum(['specific', 'role', 'department', 'available']),
  assigned_to: z.string().optional(),
  assigned_role: z.string().optional(),
  assigned_department_id: z.string().optional(),
  
  location_id: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  estimated_duration_minutes: z.number().optional(),
  
  requires_photo: z.boolean(),
  photo_min_count: z.number().optional(),
  requires_signature: z.boolean(),
  requires_notes: z.boolean(),
  
  is_food_safety: z.boolean(),
  checklist_items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    required: z.boolean(),
  })).default([]),
});

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

type FormData = z.infer<typeof formSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<FormData>;
  canEdit?: boolean;
}

const CreateTaskDialog = ({ open, onOpenChange, defaultValues, canEdit = true }: CreateTaskDialogProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const createTask = useCreateTask();
  const { data: categories } = useTaskCategories();
  const isFieldsDisabled = !canEdit;
  
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').eq('is_active', true);
      return data;
    },
  });
  
  const { data: locations } = useQuery({
    queryKey: ['locations-active'],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('*').eq('is_active', true);
      return data;
    },
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assignment_type: 'specific',
      requires_photo: false,
      photo_min_count: 0,
      requires_signature: false,
      requires_notes: false,
      is_food_safety: false,
      checklist_items: [],
      ...defaultValues,
    },
  });
  
  const assignmentType = form.watch('assignment_type');
  const requiresPhoto = form.watch('requires_photo');
  const isFoodSafety = form.watch('is_food_safety');
  
  useEffect(() => {
    if (isFoodSafety && !requiresPhoto) {
      form.setValue('requires_photo', true);
      form.setValue('photo_min_count', 1);
    }
  }, [isFoodSafety, requiresPhoto, form]);
  
  const onSubmit = async (data: FormData) => {
    await createTask.mutateAsync({
      title: data.title,
      description: data.description,
      category_id: data.category_id,
      priority: data.priority,
      assignment_type: data.assignment_type,
      assigned_to: data.assigned_to,
      assigned_role: data.assigned_role,
      assigned_department_id: data.assigned_department_id,
      location_id: data.location_id,
      due_date: data.due_date,
      due_time: data.due_time,
      estimated_duration_minutes: data.estimated_duration_minutes,
      requires_photo: data.requires_photo,
      requires_signature: data.requires_signature,
      requires_notes: data.requires_notes,
      photo_min_count: data.photo_min_count,
      is_food_safety: data.is_food_safety,
      checklist_items: data.checklist_items as ChecklistItem[],
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="assignment">Assignment</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Task title..." {...field} />
                      </FormControl>
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
                        <Textarea placeholder="Task description..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="due_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_food_safety"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
                      <div>
                        <FormLabel className="text-destructive">Food Safety Task</FormLabel>
                        <p className="text-sm text-destructive/80">Marks this as a food safety verification task</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="assignment" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="assignment_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignment Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="specific">Specific Employee</SelectItem>
                          <SelectItem value="role">By Role</SelectItem>
                          <SelectItem value="department">By Department</SelectItem>
                          <SelectItem value="available">Available (Anyone Can Claim)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                {assignmentType === 'specific' && (
                  <FormField
                    control={form.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <EmployeeCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select employee"
                        />
                      </FormItem>
                    )}
                  />
                )}
                
                {assignmentType === 'role' && (
                  <FormField
                    control={form.control}
                    name="assigned_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To Role</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="warehouse">Warehouse</SelectItem>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="qa">Quality Assurance</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
                
                {assignmentType === 'department' && (
                  <FormField
                    control={form.control}
                    name="assigned_department_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To Department</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments?.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
                
                {assignmentType === 'available' && (
                  <div className="p-4 border rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      This task will be available for any employee to claim. 
                      If unclaimed, it can be manually assigned later.
                    </p>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="estimated_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 30"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="requirements" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requires_photo"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Requires Photo</FormLabel>
                          <p className="text-sm text-muted-foreground">Employee must attach photo(s) to complete</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {requiresPhoto && (
                    <FormField
                      control={form.control}
                      name="photo_min_count"
                      render={({ field }) => (
                        <FormItem className="pl-4">
                          <FormLabel>Minimum Photos Required</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1}
                              {...field}
                              value={field.value ?? 1}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="requires_signature"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Requires Signature</FormLabel>
                          <p className="text-sm text-muted-foreground">Employee must sign to complete</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="requires_notes"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Requires Notes</FormLabel>
                          <p className="text-sm text-muted-foreground">Employee must add notes to complete</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="checklist_items"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Checklist Items</FormLabel>
                        <p className="text-sm text-muted-foreground mb-2">
                          Add checklist items the employee must complete
                        </p>
                        <ChecklistBuilder
                          items={(field.value || []) as ChecklistItem[]}
                          onChange={(items) => field.onChange(items)}
                        />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
