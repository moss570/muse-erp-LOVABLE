import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEmployees, useEmployeeShifts } from '@/hooks/useEmployees';
import { Trash2 } from 'lucide-react';

const shiftFormSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  shift_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  break_minutes: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  color: z.string().optional(),
});

type ShiftFormValues = z.infer<typeof shiftFormSchema>;

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: any;
  defaultDate?: Date | null;
}

const colorOptions = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
];

export function ShiftFormDialog({ open, onOpenChange, shift, defaultDate }: ShiftFormDialogProps) {
  const { employees } = useEmployees();
  const { createShift, updateShift, deleteShift } = useEmployeeShifts();
  const isEditing = !!shift;

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      employee_id: '',
      shift_date: '',
      start_time: '09:00',
      end_time: '17:00',
      break_minutes: 30,
      notes: '',
      color: '#3b82f6',
    },
  });

  useEffect(() => {
    if (shift) {
      form.reset({
        employee_id: shift.employee_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time?.slice(0, 5) || '09:00',
        end_time: shift.end_time?.slice(0, 5) || '17:00',
        break_minutes: shift.break_minutes || 30,
        notes: shift.notes || '',
        color: shift.color || '#3b82f6',
      });
    } else if (defaultDate) {
      form.reset({
        employee_id: '',
        shift_date: format(defaultDate, 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 30,
        notes: '',
        color: '#3b82f6',
      });
    } else {
      form.reset({
        employee_id: '',
        shift_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 30,
        notes: '',
        color: '#3b82f6',
      });
    }
  }, [shift, defaultDate, form]);

  const onSubmit = async (data: ShiftFormValues) => {
    try {
      if (isEditing) {
        await updateShift.mutateAsync({
          id: shift.id,
          employee_id: data.employee_id,
          shift_date: data.shift_date,
          start_time: data.start_time,
          end_time: data.end_time,
          break_minutes: data.break_minutes,
          notes: data.notes || null,
          color: data.color || null,
        });
      } else {
        await createShift.mutateAsync({
          employee_id: data.employee_id,
          shift_date: data.shift_date,
          start_time: data.start_time,
          end_time: data.end_time,
          break_minutes: data.break_minutes,
          notes: data.notes || null,
          color: data.color || null,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving shift:', error);
    }
  };

  const handleDelete = async () => {
    if (!shift) return;
    try {
      await deleteShift.mutateAsync(shift.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  // Calculate hours preview
  const startTime = form.watch('start_time');
  const endTime = form.watch('end_time');
  const breakMinutes = form.watch('break_minutes');
  
  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const start = parseInt(startTime.split(':')[0]) + parseInt(startTime.split(':')[1]) / 60;
    const end = parseInt(endTime.split(':')[0]) + parseInt(endTime.split(':')[1]) / 60;
    return Math.max(0, end - start - (breakMinutes || 0) / 60);
  };

  const totalHours = calculateHours();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update shift details' : 'Schedule a new shift for a team member'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees?.filter(e => e.employment_status === 'active').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
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
              name="shift_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="break_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Break (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Total Hours: {totalHours.toFixed(2)}h</div>
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: field.value }}
                            />
                            {colorOptions.find(c => c.value === field.value)?.label || 'Select color'}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteShift.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createShift.isPending || updateShift.isPending}>
                {isEditing ? 'Update' : 'Create'} Shift
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
