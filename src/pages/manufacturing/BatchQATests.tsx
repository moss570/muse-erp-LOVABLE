import { useState } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  ClipboardCheck,
  FlaskConical,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { usePendingQALots, ProductionLotWithQA } from '@/hooks/useBatchQATesting';
import { APPLICABLE_STAGES } from '@/hooks/useQualityTests';
import { QATestRecordingDialog } from '@/components/quality/QATestRecordingDialog';

export default function BatchQATests() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [stageFilter, setStageFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedLot, setSelectedLot] = useState<ProductionLotWithQA | null>(null);
  const [isRecordingOpen, setIsRecordingOpen] = useState(false);

  const { data: lots, isLoading } = usePendingQALots({
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
    stage: stageFilter || undefined,
    status: statusFilter || undefined,
  });

  const filteredLots = lots?.filter((lot) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      lot.lot_number.toLowerCase().includes(searchLower) ||
      lot.product?.name.toLowerCase().includes(searchLower) ||
      lot.product?.sku?.toLowerCase().includes(searchLower)
    );
  });

  const handleRecordTests = (lot: ProductionLotWithQA) => {
    setSelectedLot(lot);
    setIsRecordingOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'Pending_QA':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending QA
          </Badge>
        );
      case 'On_Hold':
        return (
          <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600">
            <AlertTriangle className="h-3 w-3" />
            On Hold
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {status || 'Draft'}
          </Badge>
        );
    }
  };

  const getStageBadge = (stage: string) => {
    const stageColors: Record<string, string> = {
      base: 'bg-blue-100 text-blue-800',
      flavoring: 'bg-purple-100 text-purple-800',
      finished: 'bg-green-100 text-green-800',
    };
    return (
      <Badge variant="secondary" className={cn('capitalize', stageColors[stage] || '')}>
        {stage}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Batch QA Testing</h1>
            <p className="text-muted-foreground">
              Record and verify quality test results for production batches
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Production Lots
            </CardTitle>
            <CardDescription>
              Select a production lot to record or review QA tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-6">
              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[200px] justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Stage Filter */}
              <Select value={stageFilter || "all"} onValueChange={(val) => setStageFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {APPLICABLE_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending_QA">Pending QA</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="On_Hold">On Hold</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by lot number or product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Lots Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>QA Status</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading production lots...
                      </TableCell>
                    </TableRow>
                  ) : filteredLots?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No production lots found for the selected date
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLots?.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono font-medium">
                          {lot.lot_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lot.product?.name || 'Unknown'}</div>
                            {lot.product?.sku && (
                              <div className="text-xs text-muted-foreground">
                                {lot.product.sku}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStageBadge(lot.production_stage)}</TableCell>
                        <TableCell>
                          {lot.quantity_produced?.toLocaleString() || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(lot.approval_status)}</TableCell>
                        <TableCell>{lot.machine?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleRecordTests(lot)}
                            className="gap-1"
                          >
                            <ClipboardCheck className="h-4 w-4" />
                            Record Tests
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QA Test Recording Dialog */}
      {selectedLot && (
        <QATestRecordingDialog
          open={isRecordingOpen}
          onOpenChange={setIsRecordingOpen}
          lot={selectedLot}
        />
      )}
    </AppLayout>
  );
}
