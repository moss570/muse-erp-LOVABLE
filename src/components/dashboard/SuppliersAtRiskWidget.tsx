import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingDown, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuppliersAtRisk } from '@/hooks/useSupplierNotifications';
import { cn } from '@/lib/utils';

// Grade configuration for display
const GRADE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  A: { label: 'Excellent', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  B: { label: 'Good', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  C: { label: 'Fair', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  D: { label: 'Poor', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  F: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  probation: { label: 'Probation', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100 dark:bg-gray-800/30' },
  pending_qa: { label: 'Pending QA', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

export function SuppliersAtRiskWidget() {
  const { data: suppliers, isLoading, isError } = useSuppliersAtRisk();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Suppliers at Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Suppliers at Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  const atRiskSuppliers = suppliers?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Suppliers at Risk
          {atRiskSuppliers.length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {suppliers?.length || 0}
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/purchasing/suppliers" className="flex items-center gap-1 text-xs">
            View All <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {atRiskSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-sm font-medium">All suppliers performing well</p>
            <p className="text-xs text-muted-foreground">No suppliers require immediate attention</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atRiskSuppliers.map(supplier => {
              const statusKey = supplier.approval_status?.toLowerCase() || 'draft';
              const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
              const grade = supplier.current_grade || 'C';
              const gradeConfig = GRADE_CONFIG[grade] || GRADE_CONFIG.C;
              
              return (
                <Link
                  key={supplier.id}
                  to={`/purchasing/suppliers?id=${supplier.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-sm truncate">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">{supplier.code}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", statusConfig.color, statusConfig.bgColor)}
                    >
                      {statusConfig.label}
                    </Badge>
                    {supplier.open_capas && supplier.open_capas > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {supplier.open_capas} CAPA{supplier.open_capas > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {supplier.current_score && (
                      <div className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        gradeConfig.bgColor,
                        gradeConfig.color
                      )}>
                        {supplier.current_score}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
