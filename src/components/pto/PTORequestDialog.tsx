import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePTOTypes, useMyPTOBalances, useCreatePTORequest, calculatePTOHours } from '@/hooks/usePTO';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  pto_type_id: z.string().min(1, 'Please select a PTO type'),
  start_date: z.date({ required_error: 'Start date is required' }),
  end_date: z.date({ required_error: 'End date is required' }),
  notes: z.string().optional(),
});

interface PTORequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PTORequestDialog = ({ open, onOpenChange }: PTORequestDialogProps) => {
  const { data: ptoTypes } = usePTOTypes();
  const { data: balances } = useMyPTOBalances();
  const createRequest = useCreatePTORequest();
  const [calculatedHours, setCalculatedHours] = useState(0);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { notes: '' },
  });
  
  const selectedTypeId = form.watch('pto_type_id');
  const startDate = form.watch('start_date');
  const endDate = form.watch('end_date');
  
  const selectedType = ptoTypes?.find(t => t.id === selectedTypeId);
  const selectedBalance = balances?.find(b => b.pto_type_id === selectedTypeId);
  
  useEffect(() => {
    if (startDate && endDate) {
      setCalculatedHours(calculatePTOHours(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')));
    } else {
      setCalculatedHours(0);
    }
  }, [startDate, endDate]);
  
  const hasEnoughBalance = selectedBalance ? selectedBalance.current_balance >= calculatedHours : true;
  const meetsAdvanceNotice = selectedType && startDate
    ? differenceInDays(startDate, new Date()) >= (selectedType.advance_notice_days || 0) 
    : true;
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    await createRequest.mutateAsync({
      pto_type_id: data.pto_type_id,
      start_date: format(data.start_date, 'yyyy-MM-dd'),
      end_date: format(data.end_date, 'yyyy-MM-dd'),
      total_hours: calculatedHours,
      notes: data.notes,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField 
              control={form.control} 
              name="pto_type_id" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Off Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ptoTypes?.map((type) => {
                        const balance = balances?.find(b => b.pto_type_id === type.id);
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2 w-2 rounded-full" 
                                style={{ backgroundColor: type.color }} 
                              />
                              {type.name} ({balance?.current_balance || 0}h)
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField 
                control={form.control} 
                name="start_date" 
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, 'PP') : 'Pick date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={field.onChange} 
                          disabled={(date) => date < new Date()} 
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              <FormField 
                control={form.control} 
                name="end_date" 
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, 'PP') : 'Pick date'}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={field.value} 
                          onSelect={field.onChange} 
                          disabled={(date) => date < (startDate || new Date())} 
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} 
              />
            </div>
            
            {calculatedHours > 0 && (
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Hours</span>
                  <span>{calculatedHours}h</span>
                </div>
                {selectedBalance && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Remaining Balance</span>
                    <span>{selectedBalance.current_balance - calculatedHours}h</span>
                  </div>
                )}
              </div>
            )}
            
            {!hasEnoughBalance && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient balance. You have {selectedBalance?.current_balance || 0}h available.
                </AlertDescription>
              </Alert>
            )}
            
            {!meetsAdvanceNotice && selectedType && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Doesn't meet {selectedType.advance_notice_days}-day advance notice requirement.
                </AlertDescription>
              </Alert>
            )}
            
            <FormField 
              control={form.control} 
              name="notes" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Add any notes for your manager..." 
                      rows={3} 
                    />
                  </FormControl>
                </FormItem>
              )} 
            />
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createRequest.isPending || !hasEnoughBalance || calculatedHours === 0}
              >
                Submit Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PTORequestDialog;
