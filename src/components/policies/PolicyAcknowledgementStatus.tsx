import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, Users, Download } from 'lucide-react';
import { format } from 'date-fns';

interface PolicyAcknowledgementStatusProps {
  policyId: string;
  className?: string;
}

export function PolicyAcknowledgementStatus({ policyId, className }: PolicyAcknowledgementStatusProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch acknowledgement status
  const { data: acknowledgements, isLoading } = useQuery({
    queryKey: ['policy-acknowledgements', policyId, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('policy_acknowledgements')
        .select(`
          *,
          employee:profiles!policy_acknowledgements_employee_id_fkey(
            id,
            first_name,
            last_name,
            avatar_url,
            email
          )
        `)
        .eq('policy_id', policyId)
        .order('acknowledged_at', { ascending: false, nullsFirst: false });

      if (filterStatus === 'acknowledged') {
        query = query.not('acknowledged_at', 'is', null);
      } else if (filterStatus === 'pending') {
        query = query.is('acknowledged_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!policyId,
  });

  // Calculate statistics
  const stats = {
    total: acknowledgements?.length || 0,
    acknowledged: acknowledgements?.filter(a => a.acknowledged_at).length || 0,
    pending: acknowledgements?.filter(a => !a.acknowledged_at).length || 0,
    completionRate: acknowledgements?.length
      ? Math.round((acknowledgements.filter(a => a.acknowledged_at).length / acknowledgements.length) * 100)
      : 0,
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handleExport = () => {
    // TODO: Implement export to CSV
    alert('Export acknowledgements feature coming soon');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!acknowledgements || acknowledgements.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Acknowledgement Tracking</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              This policy doesn't require employee acknowledgements, or no employees have been assigned yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {/* Header with Stats */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Acknowledgement Status</h3>
              <p className="text-sm text-muted-foreground">
                Track employee acknowledgements and compliance
              </p>
            </div>
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-semibold">{stats.completionRate}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>

            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-600">Acknowledged</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600">{stats.acknowledged}</div>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-xs text-amber-600">Pending</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-medium">Filter:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Acknowledgements Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Quiz Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acknowledgements.map((ack) => {
                const employee = ack.employee as any;
                const isAcknowledged = !!ack.acknowledged_at;
                const passedQuiz = ack.quiz_score !== null && ack.quiz_score >= (ack.quiz_passing_score || 80);

                return (
                  <TableRow key={ack.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(employee?.first_name, employee?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {employee?.first_name} {employee?.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {employee?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAcknowledged ? (
                        <Badge variant="default" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                          <CheckCircle className="h-3 w-3" />
                          Acknowledged
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ack.acknowledged_at ? (
                        format(new Date(ack.acknowledged_at), 'MMM dd, yyyy')
                      ) : (
                        <span className="text-muted-foreground">Not yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ack.quiz_score !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={passedQuiz ? 'text-emerald-600 font-medium' : 'text-destructive font-medium'}>
                            {ack.quiz_score}%
                          </span>
                          {passedQuiz ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
