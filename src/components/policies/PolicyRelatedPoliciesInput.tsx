import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, FileText, Link as LinkIcon, Search } from 'lucide-react';
import { usePolicies } from '@/hooks/usePolicies';
import { PolicyStatusBadge } from './PolicyStatusBadge';
import { cn } from '@/lib/utils';

interface RelatedPolicy {
  policy_id: string;
  relationship_type: string;
}

interface PolicyRelatedPoliciesInputProps {
  policyId?: string;
  relatedPolicies: RelatedPolicy[];
  onChange: (policies: RelatedPolicy[]) => void;
  className?: string;
}

const relationshipTypes = [
  { value: 'supersedes', label: 'Supersedes' },
  { value: 'superseded_by', label: 'Superseded By' },
  { value: 'related_to', label: 'Related To' },
  { value: 'references', label: 'References' },
  { value: 'referenced_by', label: 'Referenced By' },
];

export function PolicyRelatedPoliciesInput({
  policyId,
  relatedPolicies,
  onChange,
  className,
}: PolicyRelatedPoliciesInputProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState('related_to');

  const { data: allPolicies, isLoading } = usePolicies({
    search: searchQuery || undefined,
    is_active: true,
  });

  // Filter out current policy and already related policies
  const availablePolicies = allPolicies?.filter(
    policy =>
      policy.id !== policyId &&
      !relatedPolicies.some(rp => rp.policy_id === policy.id)
  ) || [];

  const relatedPolicyDetails = allPolicies?.filter(policy =>
    relatedPolicies.some(rp => rp.policy_id === policy.id)
  ) || [];

  const handleAddRelated = () => {
    if (!selectedPolicyId) return;

    onChange([
      ...relatedPolicies,
      {
        policy_id: selectedPolicyId,
        relationship_type: selectedRelationType,
      },
    ]);

    setSelectedPolicyId('');
    setSelectedRelationType('related_to');
    setShowDialog(false);
    setSearchQuery('');
  };

  const handleRemoveRelated = (policyId: string) => {
    onChange(relatedPolicies.filter(rp => rp.policy_id !== policyId));
  };

  const getRelationshipBadge = (type: string) => {
    const config = relationshipTypes.find(rt => rt.value === type);
    return (
      <Badge variant="outline" className="text-xs">
        {config?.label || type}
      </Badge>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Related Policies List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Related Policies ({relatedPolicies.length})</Label>
          <Button onClick={() => setShowDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Related Policy
          </Button>
        </div>

        {relatedPolicyDetails.length > 0 ? (
          <div className="space-y-2">
            {relatedPolicyDetails.map(policy => {
              const relation = relatedPolicies.find(rp => rp.policy_id === policy.id);
              if (!relation) return null;

              return (
                <Card key={policy.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Policy Number */}
                        <div className="text-xs text-muted-foreground font-mono mb-1">
                          {policy.policy_number}
                        </div>

                        {/* Title */}
                        <h4 className="font-semibold text-sm line-clamp-1 mb-2">
                          {policy.title}
                        </h4>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {getRelationshipBadge(relation.relationship_type)}
                          <PolicyStatusBadge status={policy.status} size="sm" showIcon={false} />
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRelated(policy.id)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h4 className="font-semibold mb-2">No Related Policies</h4>
                <p className="text-sm text-muted-foreground max-w-md">
                  Link related policies to help users discover connected documentation.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold text-sm mb-2">About Related Policies</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li><strong>Supersedes:</strong> This policy replaces an older policy</li>
            <li><strong>Superseded By:</strong> This policy has been replaced by a newer one</li>
            <li><strong>Related To:</strong> General relationship between policies</li>
            <li><strong>References:</strong> This policy references another policy</li>
            <li><strong>Referenced By:</strong> This policy is referenced by another policy</li>
          </ul>
        </CardContent>
      </Card>

      {/* Add Related Policy Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Related Policy</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Policies</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, number, or keywords..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Relationship Type */}
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship Type</Label>
              <Select value={selectedRelationType} onValueChange={setSelectedRelationType}>
                <SelectTrigger id="relationship">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Policy Selection */}
            <div className="space-y-2">
              <Label>Select Policy</Label>
              <ScrollArea className="h-[300px] border rounded-lg">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading policies...
                  </div>
                ) : availablePolicies.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No policies found
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {availablePolicies.map(policy => (
                      <button
                        key={policy.id}
                        onClick={() => setSelectedPolicyId(policy.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg hover:bg-muted transition-colors',
                          selectedPolicyId === policy.id && 'bg-primary/10 border border-primary'
                        )}
                      >
                        <div className="text-xs text-muted-foreground font-mono mb-1">
                          {policy.policy_number}
                        </div>
                        <div className="font-medium text-sm line-clamp-1 mb-1">
                          {policy.title}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <PolicyStatusBadge status={policy.status} size="sm" showIcon={false} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRelated} disabled={!selectedPolicyId}>
              Add Relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
