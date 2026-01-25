import { useState, useMemo } from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  Table as TableIcon,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePolicies } from '@/hooks/usePolicies';
import type { PolicyFilters } from '@/types/policies';
import { PolicySearch } from '@/components/policies/PolicySearch';
import { PolicyFilters as PolicyFiltersComponent } from '@/components/policies/PolicyFilters';
import { PolicyCardView } from '@/components/policies/PolicyCardView';
import { PolicyListView } from '@/components/policies/PolicyListView';
import { PolicyTableView } from '@/components/policies/PolicyTableView';
import { useNavigate } from 'react-router-dom';

export default function PoliciesIndex() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'table'>('card');
  const [filters, setFilters] = useState<PolicyFilters>({});

  const { data: policies, isLoading } = usePolicies(filters);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!policies) return { total: 0, draft: 0, underReview: 0, approved: 0, requireReview: 0 };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      total: policies.length,
      draft: policies.filter(p => p.status === 'Draft').length,
      underReview: policies.filter(p => p.status === 'Under_Review' || p.status === 'Pending_Approval').length,
      approved: policies.filter(p => p.status === 'Approved').length,
      requireReview: policies.filter(p =>
        p.review_date &&
        new Date(p.review_date) <= thirtyDaysFromNow &&
        p.status === 'Approved'
      ).length,
    };
  }, [policies]);

  const handleCreatePolicy = () => {
    navigate('/policies/new');
  };

  const handleViewPolicy = (policyId: string) => {
    navigate(`/policies/${policyId}`);
  };

  const handleEditPolicy = (policyId: string) => {
    navigate(`/policies/${policyId}/edit`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policies & SOPs</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizational policies, procedures, and documentation
          </p>
        </div>
        <Button onClick={handleCreatePolicy} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{metrics.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Under Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.underReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Review Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.requireReview}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <PolicySearch
              value={filters.search || ''}
              onChange={(search) => setFilters(prev => ({ ...prev, search }))}
            />

            {/* Filters */}
            <PolicyFiltersComponent
              filters={filters}
              onChange={setFilters}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Selector and Content */}
      <div className="space-y-4">
        {/* View Mode Tabs */}
        <div className="flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList>
              <TabsTrigger value="card" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-sm text-muted-foreground">
            {policies?.length || 0} {policies?.length === 1 ? 'policy' : 'policies'} found
          </div>
        </div>

        {/* Content Views */}
        {viewMode === 'card' && (
          <PolicyCardView
            policies={policies || []}
            isLoading={isLoading}
            onView={handleViewPolicy}
            onEdit={handleEditPolicy}
          />
        )}

        {viewMode === 'list' && (
          <PolicyListView
            policies={policies || []}
            isLoading={isLoading}
            onView={handleViewPolicy}
            onEdit={handleEditPolicy}
          />
        )}

        {viewMode === 'table' && (
          <PolicyTableView
            policies={policies || []}
            isLoading={isLoading}
            onView={handleViewPolicy}
            onEdit={handleEditPolicy}
          />
        )}
      </div>
    </div>
  );
}
