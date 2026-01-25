import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePolicyCategories } from '@/hooks/usePolicyCategories';
import { usePolicyTypes } from '@/hooks/usePolicyTypes';
import type { PolicyFilters as PolicyFiltersType } from '@/types/policies';
import { cn } from '@/lib/utils';

interface PolicyFiltersProps {
  filters: PolicyFiltersType;
  onChange: (filters: PolicyFiltersType) => void;
  className?: string;
}

export function PolicyFilters({
  filters,
  onChange,
  className,
}: PolicyFiltersProps) {
  const { data: categories } = usePolicyCategories();
  const { data: types } = usePolicyTypes();

  const activeFilterCount = [
    filters.category_id,
    filters.policy_type_id,
    filters.status && filters.status.length > 0,
    filters.is_active !== undefined,
    filters.review_due_soon,
  ].filter(Boolean).length;

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onChange({ ...filters, status: undefined });
    } else {
      onChange({ ...filters, status: [value as any] });
    }
  };

  const handleCategoryChange = (value: string) => {
    onChange({
      ...filters,
      category_id: value === 'all' ? undefined : value,
    });
  };

  const handleTypeChange = (value: string) => {
    onChange({
      ...filters,
      policy_type_id: value === 'all' ? undefined : value,
    });
  };

  const handleActiveChange = (value: string) => {
    onChange({
      ...filters,
      is_active: value === 'all' ? undefined : value === 'active',
    });
  };

  const handleReviewDueChange = (value: string) => {
    onChange({
      ...filters,
      review_due_soon: value === 'yes' ? true : undefined,
    });
  };

  const handleClearAll = () => {
    onChange({});
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters:
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status?.[0] || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Under_Review">Under Review</SelectItem>
            <SelectItem value="Pending_Approval">Pending Approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.category_id || 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select
          value={filters.policy_type_id || 'all'}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types?.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.abbreviation}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active Status Filter */}
        <Select
          value={
            filters.is_active === undefined
              ? 'all'
              : filters.is_active
              ? 'active'
              : 'inactive'
          }
          onValueChange={handleActiveChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Review Due Soon Filter */}
        <Select
          value={filters.review_due_soon ? 'yes' : 'all'}
          onValueChange={handleReviewDueChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Review Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="yes">Review Due Soon</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear All Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="gap-1"
          >
            <X className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Summary */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          <Badge variant="secondary" className="gap-1">
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
          </Badge>
        </div>
      )}
    </div>
  );
}
