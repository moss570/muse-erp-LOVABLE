import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ExternalLink, Plus, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PolicyStatusBadge } from './PolicyStatusBadge';
import { PolicyTypeBadge } from './PolicyTypeIcon';
import type { Policy } from '@/types/policies';

interface PolicyRelatedPoliciesProps {
  policyId: string;
  className?: string;
}

export function PolicyRelatedPolicies({ policyId, className }: PolicyRelatedPoliciesProps) {
  const navigate = useNavigate();

  // Fetch related policies
  const { data: relatedPolicies, isLoading } = useQuery({
    queryKey: ['related-policies', policyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_related_policies')
        .select(`
          relationship_type,
          related_policy:policies!policy_related_policies_related_policy_id_fkey(
            id,
            policy_number,
            title,
            status,
            summary,
            policy_type:policy_types(id, abbreviation, type_name),
            category:policy_categories(id, name, color_hex)
          )
        `)
        .eq('policy_id', policyId)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: !!policyId,
  });

  const handleAddRelated = () => {
    // TODO: Implement add related policy dialog
    alert('Add related policy feature coming soon');
  };

  const handleViewPolicy = (relatedPolicyId: string) => {
    navigate(`/policies/${relatedPolicyId}`);
  };

  const getRelationshipBadge = (type: string) => {
    const configs: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      supersedes: { label: 'Supersedes', variant: 'default' },
      superseded_by: { label: 'Superseded By', variant: 'secondary' },
      related_to: { label: 'Related To', variant: 'outline' },
      references: { label: 'References', variant: 'outline' },
      referenced_by: { label: 'Referenced By', variant: 'secondary' },
    };
    const config = configs[type] || { label: type, variant: 'outline' as const };
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!relatedPolicies || relatedPolicies.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Related Policies</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Link related policies to help users discover connected documentation and procedures.
            </p>
            <Button onClick={handleAddRelated}>
              <Plus className="h-4 w-4 mr-2" />
              Add Related Policy
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Related Policies ({relatedPolicies.length})
          </h3>
          <Button onClick={handleAddRelated} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <div className="space-y-3">
          {relatedPolicies.map((item) => {
            const policy = item.related_policy as any;
            if (!policy) return null;

            return (
              <Card
                key={policy.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => handleViewPolicy(policy.id)}
              >
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
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {getRelationshipBadge(item.relationship_type)}
                        <PolicyStatusBadge status={policy.status} size="sm" showIcon={false} />
                        {policy.policy_type && (
                          <PolicyTypeBadge
                            policyType={policy.policy_type}
                            size="sm"
                            showLabel={false}
                          />
                        )}
                      </div>

                      {/* Summary */}
                      {policy.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {policy.summary}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPolicy(policy.id);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
