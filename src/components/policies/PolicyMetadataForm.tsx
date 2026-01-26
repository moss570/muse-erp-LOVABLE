import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePolicyCategories } from '@/hooks/usePolicyCategories';
import { usePolicyTypes } from '@/hooks/usePolicyTypes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PolicyFormData } from '@/types/policies';

interface PolicyMetadataFormProps {
  formData: PolicyFormData;
  onChange: (updates: Partial<PolicyFormData>) => void;
  isEditMode: boolean;
}

export function PolicyMetadataForm({ formData, onChange, isEditMode }: PolicyMetadataFormProps) {
  const { data: categories } = usePolicyCategories();
  const { data: types } = usePolicyTypes();

  // Fetch users for owner selection
  const { data: users } = useQuery({
    queryKey: ['users-for-policy-owner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  const handleFieldChange = (field: keyof PolicyFormData, value: any) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Policy Number */}
          <div className="space-y-2">
            <Label htmlFor="policy_number">
              Policy Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="policy_number"
              value={formData.policy_number}
              onChange={(e) => handleFieldChange('policy_number', e.target.value)}
              placeholder="Auto-generated"
              disabled={isEditMode}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {isEditMode ? 'Policy number cannot be changed' : 'Will be generated based on type'}
            </p>
          </div>

          {/* Policy Type */}
          <div className="space-y-2">
            <Label htmlFor="policy_type">
              Policy Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.policy_type_id || ''}
              onValueChange={(value) => handleFieldChange('policy_type_id', value)}
            >
              <SelectTrigger id="policy_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {types?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.abbreviation} - {type.type_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter policy title"
          />
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={formData.summary}
            onChange={(e) => handleFieldChange('summary', e.target.value)}
            placeholder="Brief summary of the policy (optional)"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            A concise overview that will be displayed in search results
          </p>
        </div>

        {/* Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id || ''}
              onValueChange={(value) => handleFieldChange('category_id', value)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleFieldChange('status', value)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Under_Review">Under Review</SelectItem>
                <SelectItem value="Pending_Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Dates & Review</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Effective Date */}
          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.effective_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.effective_date ? (
                    format(new Date(formData.effective_date), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.effective_date ? new Date(formData.effective_date) : undefined}
                  onSelect={(date) => handleFieldChange('effective_date', date?.toISOString() || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Review Date */}
          <div className="space-y-2">
            <Label>Review Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.review_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.review_date ? (
                    format(new Date(formData.review_date), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.review_date ? new Date(formData.review_date) : undefined}
                  onSelect={(date) => handleFieldChange('review_date', date?.toISOString() || null)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Review Frequency */}
          <div className="space-y-2">
            <Label htmlFor="review_frequency">Review Frequency (months)</Label>
            <Input
              id="review_frequency"
              type="number"
              min="1"
              max="60"
              value={formData.review_frequency_months}
              onChange={(e) => handleFieldChange('review_frequency_months', parseInt(e.target.value) || 12)}
            />
          </div>
        </div>
      </div>

      {/* Ownership */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Ownership</h3>

        <div className="space-y-2">
          <Label htmlFor="owner">
            Policy Owner <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.owned_by}
            onValueChange={(value) => handleFieldChange('owned_by', value)}
          >
            <SelectTrigger id="owner">
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The person responsible for maintaining this policy
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Options</h3>

        <div className="space-y-4">
          {/* Require Acknowledgement */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_ack">Require Employee Acknowledgement</Label>
              <p className="text-xs text-muted-foreground">
                Employees must acknowledge they have read and understood this policy
              </p>
            </div>
            <Switch
              id="require_ack"
              checked={formData.require_acknowledgement}
              onCheckedChange={(checked) => handleFieldChange('require_acknowledgement', checked)}
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive policies are hidden from regular users
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleFieldChange('is_active', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
