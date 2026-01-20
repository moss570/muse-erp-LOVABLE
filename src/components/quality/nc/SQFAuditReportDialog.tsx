import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSQFAuditReport } from '@/hooks/useNCAnalytics';
import { Download, Loader2, FileText, Calendar, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { 
  NC_TYPE_CONFIG, 
  SEVERITY_CONFIG, 
  IMPACT_LEVEL_CONFIG,
  STATUS_CONFIG,
} from '@/types/non-conformities';

interface SQFAuditReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SQFAuditReportDialog({ open, onOpenChange }: SQFAuditReportDialogProps) {
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: report, isLoading, refetch } = useSQFAuditReport(startDate, endDate);

  const handleGenerateReport = () => {
    refetch();
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>SQF Non-Conformity Audit Report</DialogTitle>
          <DialogDescription>
            Generate comprehensive audit documentation for SQF compliance
          </DialogDescription>
        </DialogHeader>

        {/* Date Range Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGenerateReport} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          {report && (
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>

        {/* Report Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : report ? (
          <ScrollArea className="flex-1">
            <div className="space-y-6 pr-4">
              {/* Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Report Period
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg">
                    {format(new Date(report.report_period.start_date), 'PPP')} -{' '}
                    {format(new Date(report.report_period.end_date), 'PPP')}
                  </p>
                </CardContent>
              </Card>

              {/* Summary Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Non-Conformities</p>
                      <p className="text-2xl font-bold">{report.summary.total_ncs}</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Critical Issues</p>
                      <p className={`text-2xl font-bold ${report.summary.critical_ncs > 0 ? 'text-destructive' : ''}`}>
                        {report.summary.critical_ncs}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Food Safety Related</p>
                      <p className={`text-2xl font-bold ${report.summary.food_safety_ncs > 0 ? 'text-destructive' : ''}`}>
                        {report.summary.food_safety_ncs}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Open Items</p>
                      <p className={`text-2xl font-bold ${report.summary.open_ncs > 0 ? 'text-amber-600' : ''}`}>
                        {report.summary.open_ncs}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Cost Impact</p>
                      <p className="text-xl font-bold">${(report.summary.total_cost || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">CAPAs Created</p>
                      <p className="text-xl font-bold">{report.summary.with_capa}</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">With Photo Evidence</p>
                      <p className="text-xl font-bold">{report.summary.with_photos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Detailed NC List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Detailed Non-Conformity Records</h3>
                {report.non_conformities?.map((nc, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {nc.nc_number}
                            <span className="font-normal text-muted-foreground">-</span>
                            <span className="font-normal">{nc.title}</span>
                          </CardTitle>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={nc.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {nc.severity}
                          </Badge>
                          <Badge variant={nc.impact_level === 'food_safety' ? 'destructive' : 'outline'}>
                            {nc.impact_level?.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {NC_TYPE_CONFIG[nc.nc_type as keyof typeof NC_TYPE_CONFIG]?.label || nc.nc_type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Discovered</p>
                          <p className="font-medium">
                            {format(new Date(nc.discovered_date), 'PPP')} by {nc.discovered_by_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium">{nc.location_name}</p>
                        </div>
                        {nc.material_name !== 'N/A' && (
                          <div>
                            <p className="text-muted-foreground">Material</p>
                            <p className="font-medium">{nc.material_name}</p>
                          </div>
                        )}
                        {nc.supplier_name !== 'N/A' && (
                          <div>
                            <p className="text-muted-foreground">Supplier</p>
                            <p className="font-medium">{nc.supplier_name}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-muted-foreground text-sm">Description</p>
                        <p className="text-sm">{nc.description}</p>
                      </div>

                      {nc.specification_reference && (
                        <div>
                          <p className="text-muted-foreground text-sm">Specification Reference</p>
                          <p className="text-sm">{nc.specification_reference}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Disposition</p>
                          <p className="font-medium capitalize">{nc.disposition?.replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge variant={nc.status === 'closed' ? 'default' : 'secondary'}>
                            {STATUS_CONFIG[nc.status as keyof typeof STATUS_CONFIG]?.label || nc.status}
                          </Badge>
                        </div>
                        {(nc.estimated_cost || 0) > 0 && (
                          <div>
                            <p className="text-muted-foreground">Estimated Cost</p>
                            <p className="font-medium">${(nc.estimated_cost || 0).toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {/* SQF Compliance Flags */}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={nc.root_cause_identified ? 'default' : 'secondary'} className="gap-1">
                          {nc.root_cause_identified ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Root Cause: {nc.root_cause_identified ? 'Identified' : 'Pending'}
                        </Badge>
                        <Badge variant={nc.corrective_action_implemented ? 'default' : 'secondary'} className="gap-1">
                          {nc.corrective_action_implemented ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Corrective Action: {nc.corrective_action_implemented ? 'Implemented' : 'Pending'}
                        </Badge>
                        <Badge variant={nc.preventive_action_implemented ? 'default' : 'secondary'} className="gap-1">
                          {nc.preventive_action_implemented ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Preventive Action: {nc.preventive_action_implemented ? 'Implemented' : 'Pending'}
                        </Badge>
                        {nc.capa_number && (
                          <Badge variant="default">
                            CAPA: {nc.capa_number}
                          </Badge>
                        )}
                        {nc.photo_count > 0 && (
                          <Badge variant="outline" className="gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {nc.photo_count} Photo{nc.photo_count !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {nc.status === 'closed' && nc.closed_at && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            Closed on {format(new Date(nc.closed_at), 'PPP')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
