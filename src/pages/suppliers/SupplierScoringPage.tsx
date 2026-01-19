import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Award,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Loader2,
  BarChart3,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { GRADE_CONFIG, type SupplierGrade } from '@/types/supplier-scoring';

// Mock data for now - in real implementation, use useSupplierScoring hook
const mockSuppliers = [
  { id: '1', name: 'Premium Foods Inc', supplier_code: 'SUP-001', current_score: 92, current_grade: 'A' as SupplierGrade, score_updated_at: new Date().toISOString(), requires_improvement_plan: false },
  { id: '2', name: 'Quality Ingredients Co', supplier_code: 'SUP-002', current_score: 78, current_grade: 'B' as SupplierGrade, score_updated_at: new Date().toISOString(), requires_improvement_plan: false },
  { id: '3', name: 'Basic Supplies Ltd', supplier_code: 'SUP-003', current_score: 55, current_grade: 'D' as SupplierGrade, score_updated_at: new Date().toISOString(), requires_improvement_plan: true },
];

export default function SupplierScoringPage() {
  const [suppliers] = useState(mockSuppliers);
  const [isLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [calculatingId, setCalculatingId] = useState<string | null>(null);

  // Filter suppliers
  let filteredSuppliers = suppliers || [];

  if (gradeFilter !== 'all') {
    if (gradeFilter === 'unscored') {
      filteredSuppliers = filteredSuppliers.filter((s) => !s.current_grade);
    } else {
      filteredSuppliers = filteredSuppliers.filter((s) => s.current_grade === gradeFilter);
    }
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredSuppliers = filteredSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.supplier_code?.toLowerCase().includes(query)
    );
  }

  // Calculate summary stats
  const gradeDistribution = {
    A: suppliers?.filter((s) => s.current_grade === 'A').length || 0,
    B: suppliers?.filter((s) => s.current_grade === 'B').length || 0,
    C: suppliers?.filter((s) => s.current_grade === 'C').length || 0,
    D: suppliers?.filter((s) => s.current_grade === 'D').length || 0,
    F: suppliers?.filter((s) => s.current_grade === 'F').length || 0,
    unscored: suppliers?.filter((s) => !s.current_grade).length || 0,
  };

  const needsImprovement = suppliers?.filter((s) => s.requires_improvement_plan).length || 0;

  const handleCalculate = async (supplierId: string) => {
    setCalculatingId(supplierId);
    // Mock calculation - in real implementation, call mutate
    setTimeout(() => setCalculatingId(null), 1000);
  };

  const handleCalculateAll = async () => {
    // Mock calculation for all
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Supplier Scoring</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Track and compare supplier performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/settings/supplier-scoring">
              <Settings className="h-4 w-4 mr-2" />
              Configure Scoring
            </Link>
          </Button>
          <Button onClick={handleCalculateAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recalculate All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4">
        {(['A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
          const config = GRADE_CONFIG[grade];
          return (
            <Card
              key={grade}
              className={cn(
                'cursor-pointer transition-colors',
                gradeFilter === grade && 'ring-2 ring-primary'
              )}
              onClick={() => setGradeFilter(gradeFilter === grade ? 'all' : grade)}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <div
                  className={cn(
                    'text-3xl font-bold mb-1',
                    config.color
                  )}
                >
                  {gradeDistribution[grade]}
                </div>
                <p className="text-xs text-muted-foreground">Grade {grade}</p>
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-muted-foreground mb-1">
              {gradeDistribution.unscored}
            </div>
            <p className="text-xs text-muted-foreground">Unscored</p>
          </CardContent>
        </Card>
      </div>

      {/* Needs Improvement Alert */}
      {needsImprovement > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  {needsImprovement} supplier{needsImprovement > 1 ? 's' : ''} require improvement plans
                </p>
                <p className="text-sm text-amber-700">
                  These suppliers have scores below acceptable levels
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {(['A', 'B', 'C', 'D', 'F'] as const).map((grade) => (
              <SelectItem key={grade} value={grade}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', GRADE_CONFIG[grade].bgColor)} />
                  Grade {grade}
                </div>
              </SelectItem>
            ))}
            <SelectItem value="unscored">Unscored</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Suppliers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-center">Grade</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => {
              const gradeConfig = supplier.current_grade
                ? GRADE_CONFIG[supplier.current_grade as SupplierGrade]
                : null;

              return (
                <TableRow key={supplier.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      {supplier.supplier_code && (
                        <p className="text-xs text-muted-foreground">
                          {supplier.supplier_code}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {gradeConfig ? (
                      <div
                        className={cn(
                          'inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold',
                          gradeConfig.bgColor,
                          gradeConfig.color
                        )}
                      >
                        {supplier.current_grade}
                      </div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground">
                        -
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-lg font-semibold">
                      {supplier.current_score?.toFixed(1) || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {supplier.current_score !== null ? (
                      <Progress
                        value={supplier.current_score}
                        className={cn(
                          'h-2 w-24',
                          supplier.current_score >= 80 && '[&>div]:bg-green-500',
                          supplier.current_score >= 60 && supplier.current_score < 80 && '[&>div]:bg-amber-500',
                          supplier.current_score < 60 && '[&>div]:bg-red-500'
                        )}
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">No data</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.score_updated_at ? (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(supplier.score_updated_at), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.requires_improvement_plan && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Needs Plan
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCalculate(supplier.id)}
                        disabled={calculatingId === supplier.id}
                      >
                        {calculatingId === supplier.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/purchasing/suppliers?id=${supplier.id}`}>
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Scorecard
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredSuppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No suppliers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
