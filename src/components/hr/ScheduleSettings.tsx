import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const settingsFormSchema = z.object({
  labor_cost_per_gallon: z.coerce.number().min(0, 'Must be positive'),
  default_break_minutes: z.coerce.number().min(0).max(120),
  overtime_threshold_daily: z.coerce.number().min(0).max(24),
  overtime_threshold_weekly: z.coerce.number().min(0).max(168),
  overtime_multiplier: z.coerce.number().min(1).max(3),
  show_labor_costs: z.boolean(),
  auto_calculate_overtime: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface ScheduleSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleSettings({ open, onOpenChange }: ScheduleSettingsProps) {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      labor_cost_per_gallon: 2.50,
      default_break_minutes: 30,
      overtime_threshold_daily: 8,
      overtime_threshold_weekly: 40,
      overtime_multiplier: 1.5,
      show_labor_costs: true,
      auto_calculate_overtime: true,
    },
  });

  // In a real implementation, this would load from database
  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('schedule_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        form.reset(parsed);
      } catch (e) {
        console.error('Failed to parse saved settings');
      }
    }
  }, [form]);

  const onSubmit = async (data: SettingsFormValues) => {
    // In a real implementation, this would save to database
    localStorage.setItem('schedule_settings', JSON.stringify(data));
    toast.success('Settings saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Settings</DialogTitle>
          <DialogDescription>
            Configure labor cost calculations and scheduling defaults
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Labor Cost KPI
              </h3>
              
              <FormField
                control={form.control}
                name="labor_cost_per_gallon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Labor Cost per Gallon ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Used to calculate required production gallons to meet labor cost targets
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="show_labor_costs"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Show Labor Costs</FormLabel>
                      <FormDescription>
                        Display labor cost calculations on schedule
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Overtime Rules
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="overtime_threshold_daily"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily OT Threshold (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overtime_threshold_weekly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weekly OT Threshold (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="168" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="overtime_multiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overtime Multiplier</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" min="1" max="3" {...field} />
                    </FormControl>
                    <FormDescription>
                      e.g., 1.5 for time-and-a-half
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="auto_calculate_overtime"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Auto-Calculate Overtime</FormLabel>
                      <FormDescription>
                        Automatically apply overtime rates when thresholds are exceeded
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Defaults
              </h3>

              <FormField
                control={form.control}
                name="default_break_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Break (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="120" step="5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Settings</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
