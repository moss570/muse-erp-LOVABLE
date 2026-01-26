import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info } from 'lucide-react';
import {
  useCreatePolicyType,
  useUpdatePolicyType,
} from '@/hooks/usePolicyTypes';
import type { PolicyType, PolicyTypeFormData } from '@/types/policies';
import { toast } from 'sonner';

interface TypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: PolicyType | null;
}

export function TypeDialog({ open, onOpenChange, type }: TypeDialogProps) {
  const createType = useCreatePolicyType();
  const updateType = useUpdatePolicyType();

  const isEditMode = !!type;

  const [formData, setFormData] = useState<PolicyTypeFormData>({
    type_name: '',
    abbreviation: '',
    description: '',
    number_format: '{abbreviation}-{number:4}',
    next_number: 1,
    is_active: true,
  });

  useEffect(() => {
    if (type) {
      setFormData({
        type_name: type.type_name,
        abbreviation: type.abbreviation,
        description: type.description || '',
        number_format: type.number_format || '{abbreviation}-{number:4}',
        next_number: type.next_number || 1,
        is_active: type.is_active,
      });
    } else {
      setFormData({
        type_name: '',
        abbreviation: '',
        description: '',
        number_format: '{abbreviation}-{number:4}',
        next_number: 1,
        is_active: true,
      });
    }
  }, [type, open]);

  const handleFieldChange = (field: keyof PolicyTypeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-generate abbreviation from type name
    if (field === 'type_name' && !isEditMode) {
      const abbr = value
        .toUpperCase()
        .replace(/[^A-Z\s]/g, '')
        .split(' ')
        .map((word: string) => word.charAt(0))
        .join('')
        .slice(0, 6);
      setFormData(prev => ({ ...prev, abbreviation: abbr || prev.abbreviation }));
    }
  };

  const handleSave = async () => {
    if (!formData.type_name.trim()) {
      toast.error('Type name is required');
      return;
    }

    if (!formData.abbreviation.trim()) {
      toast.error('Abbreviation is required');
      return;
    }

    if (formData.abbreviation.length > 10) {
      toast.error('Abbreviation must be 10 characters or less');
      return;
    }

    try {
      if (isEditMode) {
        await updateType.mutateAsync({ id: type!.id, updates: formData });
        toast.success('Policy type updated successfully');
      } else {
        await createType.mutateAsync(formData);
        toast.success('Policy type created successfully');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update policy type' : 'Failed to create policy type');
    }
  };

  const isSaving = createType.isPending || updateType.isPending;

  // Preview policy number
  const previewNumber = formData.number_format
    .replace('{abbreviation}', formData.abbreviation || 'XXX')
    .replace('{number:4}', String(formData.next_number || 1).padStart(4, '0'))
    .replace('{number}', String(formData.next_number || 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Policy Type' : 'Create New Policy Type'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the policy type details below'
              : 'Define a new policy type with unique abbreviation and numbering'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type Name */}
          <div className="space-y-2">
            <Label htmlFor="type_name">
              Type Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="type_name"
              value={formData.type_name}
              onChange={(e) => handleFieldChange('type_name', e.target.value)}
              placeholder="e.g., Standard Operating Procedure"
            />
          </div>

          {/* Abbreviation */}
          <div className="space-y-2">
            <Label htmlFor="abbreviation">
              Abbreviation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="abbreviation"
              value={formData.abbreviation}
              onChange={(e) => handleFieldChange('abbreviation', e.target.value.toUpperCase())}
              placeholder="e.g., SOP, POL, WI"
              maxLength={10}
              className="font-mono font-bold"
            />
            <p className="text-xs text-muted-foreground">
              Short code used in policy numbers (max 10 characters)
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Describe this policy type..."
              rows={3}
            />
          </div>

          {/* Number Format */}
          <div className="space-y-2">
            <Label htmlFor="number_format">Number Format</Label>
            <Input
              id="number_format"
              value={formData.number_format}
              onChange={(e) => handleFieldChange('number_format', e.target.value)}
              placeholder="{abbreviation}-{number:4}"
              className="font-mono"
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Format tokens:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  <li><code className="bg-muted px-1">{'{abbreviation}'}</code> - Policy type abbreviation</li>
                  <li><code className="bg-muted px-1">{'{number}'}</code> - Sequential number</li>
                  <li><code className="bg-muted px-1">{'{number:4}'}</code> - Number padded to 4 digits (0001)</li>
                </ul>
                <div className="mt-2">
                  <strong>Preview:</strong> <code className="bg-muted px-2 py-1 rounded font-bold">{previewNumber}</code>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Next Number */}
          <div className="space-y-2">
            <Label htmlFor="next_number">Next Number</Label>
            <Input
              id="next_number"
              type="number"
              min="1"
              value={formData.next_number}
              onChange={(e) => handleFieldChange('next_number', parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-muted-foreground">
              The next sequential number to be assigned (auto-increments after each policy creation)
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive types cannot be selected for new policies
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSaving ? 'Saving...' : isEditMode ? 'Update Type' : 'Create Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
