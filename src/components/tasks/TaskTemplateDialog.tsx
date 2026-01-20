import { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTaskTemplate, useCreateTaskTemplate, useUpdateTaskTemplate } from '@/hooks/useTaskTemplates';
import { useTaskCategories } from '@/hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EmployeeCombobox from '@/components/shared/EmployeeCombobox';
import ChecklistBuilder from '@/components/tasks/ChecklistBuilder';
import type { ChecklistItem } from '@/types/tasks';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  
  default_assignee_type: z.enum(['specific', 'role', 'department']),
  default_assignee_id: z.string().optional(),
  default_role: z.string().optional(),
  default_department_id: z.string().optional(),
  
  estimated_duration_minutes: z.number().optional(),
  default_priority: z.enum(['low', 'medium', 'high', 'urgent']),
  
  requires_photo: z.boolean(),
  photo_min_count: z.number().optional(),
  requires_signature: z.boolean(),
  requires_notes: z.boolean(),
  
  is_food_safety: z.boolean(),
  food_safety_type: z.string().optional(),
  
  is_recurring: z.boolean(),
  recurrence_pattern: z.string().optional(),
  recurrence_time: z.string().optional(),
  recurrence_days_of_week: z.array(z.number()).optional(),
  recurrence_day_of_month: z.number().optional(),
  
  checklist_items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    required: z.boolean(),
  })).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface TaskTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const TaskTemplateDialog = ({ open, onOpenChange, templateId }: TaskTemplateDialogProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const isEdit = !!templateId;
  
  const { data: template, isLoading: templateLoading } = useTaskTemplate(templateId || undefined);
  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const { data: categories } = useTaskCategories();
  
  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').eq('is_active', true);
      return data;
    },
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      default_assignee_type: 'specific',
      default_priority: 'medium',
      requires_photo: false,
      photo_min_count: 0,
      requires_signature: false,
      requires_notes: false,
      is_food_safety: false,
      is_recurring: false,
      recurrence_days_of_week: [],
      checklist_items: [],
    },
  });
  
  // Load template data when editing
  useEffect(() => {
    if (template && isEdit) {
      form.reset({
        name: template.name,
        description: template.description || '',
        category_id: template.category_id || undefined,
        default_assignee_type: template.default_assignee_type as 'specific' | 'role' | 'department',
        default_assignee_id: template.default_assignee_id || undefined,
        default_role: template.default_role || undefined,
        default_department_id: template.default_department_id || undefined,
        estimated_duration_minutes: template.estimated_duration_minutes || undefined,
        default_priority: template.default_priority as 'low' | 'medium' | 'high' | 'urgent',
        requires_photo: template.requires_photo,
        photo_min_count: template.photo_min_count || 0,
        requires_signature: template.requires_signature,
        requires_notes: template.requires_notes,
        is_food_safety: template.is_food_safety,
        food_safety_type: template.food_safety_type || undefined,
        is_recurring: template.is_recurring,
        recurrence_pattern: template.recurrence_pattern || undefined,
        recurrence_time: template.recurrence_time || undefined,
        recurrence_days_of_week: template.recurrence_days_of_week || [],
        recurrence_day_of_month: template.recurrence_day_of_month || undefined,
        checklist_items: template.checklist_items || [],
      });
    } else if (!isEdit) {
      form.reset({
        name: '',
        description: '',
        default_assignee_type: 'specific',
        default_priority: 'medium',
        requires_photo: false,
        photo_min_count: 0,
        requires_signature: false,
        requires_notes: false,
        is_food_safety: false,
        is_recurring: false,
        recurrence_days_of_week: [],
        checklist_items: [],
      });
    }
  }, [template, isEdit, form]);
  
  const assigneeType = form.watch('default_assignee_type');
  const requiresPhoto = form.watch('requires_photo');
  const isFoodSafety = form.watch('is_food_safety');
  const isRecurring = form.watch('is_recurring');
  const recurrencePattern = form.watch('recurrence_pattern');
  const selectedDays = form.watch('recurrence_days_of_week') || [];
  
  // Auto-enable photo requirement for food safety templates
  useEffect(() => {
    if (isFoodSafety && !requiresPhoto) {
      form.setValue('requires_photo', true);
      form.setValue('photo_min_count', 1);
    }
  }, [isFoodSafety, requiresPhoto, form]);
  
  const onSubmit = async (data: FormData) => {
    if (isEdit && templateId) {
      await updateTemplate.mutateAsync({ 
        id: templateId, 
        ...data,
        checklist_items: (data.checklist_items || []) as ChecklistItem[],
      });
    } else {
      await createTemplate.mutateAsync({
        name: data.name,
        description: data.description,
        category_id: data.category_id,
        default_assignee_type: data.default_assignee_type,
        default_assignee_id: data.default_assignee_id,
        default_role: data.default_role,
        default_department_id: data.default_department_id,
        estimated_duration_minutes: data.estimated_duration_minutes,
        default_priority: data.default_priority,
        requires_photo: data.requires_photo,
        requires_signature: data.requires_signature,
        requires_notes: data.requires_notes,
        photo_min_count: data.photo_min_count ?? 0,
        checklist_items: (data.checklist_items || []) as ChecklistItem[],
        is_food_safety: data.is_food_safety,
        food_safety_type: data.food_safety_type,
        is_recurring: data.is_recurring,
        recurrence_pattern: data.recurrence_pattern,
        recurrence_time: data.recurrence_time,
        recurrence_days_of_week: data.recurrence_days_of_week,
        recurrence_day_of_month: data.recurrence_day_of_month,
      });
    }
    onOpenChange(false);
  };
  
  const toggleDay = (day: number) => {
    const current = selectedDays;
    if (current.includes(day)) {
      form.setValue('recurrence_days_of_week', current.filter(d => d !== day));
    } else {
      form.setValue('recurrence_days_of_week', [...current, day].sort());
    }
  };

  if (isEdit && templateLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Template' : 'Create Task Template'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="assignment">Assignment</TabsTrigger>
                <TabsTrigger value="requirements">Requirements</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>
              
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Morning Temperature Check" {...field} />
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
                        <Textarea placeholder="Describe this task template..." {...field} />
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
                    name="default_priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Priority</FormLabel>
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
                
                <FormField
                  control={form.control}
                  name="is_food_safety"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5">
                      <div>
                        <FormLabel className="text-destructive">Food Safety Template</FormLabel>
                        <p className="text-sm text-muted-foreground">Marks all tasks as food safety verification</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Assignment Tab */}
              <TabsContent value="assignment" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="default_assignee_type"
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
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                {assigneeType === 'specific' && (
                  <FormField
                    control={form.control}
                    name="default_assignee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Assignee</FormLabel>
                        <EmployeeCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select employee"
                        />
                      </FormItem>
                    )}
                  />
                )}
                
                {assigneeType === 'role' && (
                  <FormField
                    control={form.control}
                    name="default_role"
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
                
                {assigneeType === 'department' && (
                  <FormField
                    control={form.control}
                    name="default_department_id"
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
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Requirements Tab */}
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
                              value={field.value || 1}
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
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              {/* Schedule Tab */}
              <TabsContent value="schedule" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <FormLabel>Recurring Task</FormLabel>
                        <p className="text-sm text-muted-foreground">Automatically create tasks on a schedule</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {isRecurring && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <FormField
                      control={form.control}
                      name="recurrence_pattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurrence Pattern</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="shift_start">At Shift Start</SelectItem>
                              <SelectItem value="shift_end">At Shift End</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    {recurrencePattern === 'weekly' && (
                      <div className="space-y-2">
                        <Label>Days of Week</Label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <div key={day.value} className="flex items-center gap-1">
                              <Checkbox
                                id={`day-${day.value}`}
                                checked={selectedDays.includes(day.value)}
                                onCheckedChange={() => toggleDay(day.value)}
                              />
                              <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {recurrencePattern === 'monthly' && (
                      <FormField
                        control={form.control}
                        name="recurrence_day_of_month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Month</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1}
                                max={31}
                                placeholder="1-31"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {(recurrencePattern === 'daily' || recurrencePattern === 'weekly' || recurrencePattern === 'monthly') && (
                      <FormField
                        control={form.control}
                        name="recurrence_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Time</FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                value={field.value || ''}
                                onChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskTemplateDialog;
