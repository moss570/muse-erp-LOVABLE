import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const UNIT_TYPES = [
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'count', label: 'Count / Each' },
];

interface CreateUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnitCreated?: (unitId: string) => void;
}

export function CreateUnitDialog({ open, onOpenChange, onUnitCreated }: CreateUnitDialogProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unitType, setUnitType] = useState('count');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .insert([{
          name: name.trim(),
          code: code.trim().toUpperCase(),
          unit_type: unitType,
          is_active: true,
          is_base_unit: false,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unit created successfully' });
      onUnitCreated?.(data.id);
      handleClose();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error creating unit', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const handleClose = () => {
    setName('');
    setCode('');
    setUnitType('count');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="unit-name">Unit Name</Label>
            <Input
              id="unit-name"
              placeholder="e.g., 5 Gallon Bag, Tote, Pallet"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit-code">Code (Abbreviation)</Label>
            <Input
              id="unit-code"
              placeholder="e.g., 5GAL, TOTE, PLT"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Unit Type</Label>
            <Select value={unitType} onValueChange={setUnitType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
