import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ClipboardCheck, 
  Plus, 
  Play, 
  CheckCircle, 
  AlertTriangle,
  FileText
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

const MockRecallDrills = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeDrill, setActiveDrill] = useState<any>(null);

  const [newDrill, setNewDrill] = useState({
    drillDate: format(new Date(), 'yyyy-MM-dd'),
    drillType: 'full',
    scenario: '',
    affectedLotNumber: '',
    simulatedClass: 'II'
  });

  // Fetch drills
  const { data: drills } = useQuery({
    queryKey: ['mock-recall-drills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mock_recall_drills')
        .select(`
          *,
          lead_by_user:profiles!lead_by(full_name),
          signed_off_by_user:profiles!signed_off_by(full_name),
          material:materials(name),
          product:products(name)
        `)
        .order('drill_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Create drill mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Generate drill number manually since we're using a sequence
      const drillNumber = `MRD-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      
      const { data, error } = await supabase
        .from('mock_recall_drills')
        .insert({
          drill_number: drillNumber,
          drill_date: newDrill.drillDate,
          drill_type: newDrill.drillType,
          scenario_description: newDrill.scenario,
          affected_lot_number: newDrill.affectedLotNumber || null,
          simulated_recall_class: newDrill.simulatedClass,
          lead_by: userId,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (drill) => {
      toast({ title: "Drill Scheduled", description: `${drill.drill_number} has been created.` });
      setShowCreateDialog(false);
      setNewDrill({ drillDate: format(new Date(), 'yyyy-MM-dd'), drillType: 'full', scenario: '', affectedLotNumber: '', simulatedClass: 'II' });
      queryClient.invalidateQueries({ queryKey: ['mock-recall-drills'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Start drill
  const startDrill = useMutation({
    mutationFn: async (drillId: string) => {
      await supabase
        .from('mock_recall_drills')
        .update({
          status: 'in_progress',
          drill_start_time: new Date().toISOString()
        })
        .eq('id', drillId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mock-recall-drills'] });
    }
  });

  // Complete drill
  const completeDrill = useMutation({
    mutationFn: async (drillData: any) => {
      const endTime = new Date();
      const startTime = new Date(drillData.drill_start_time);
      const totalMinutes = differenceInMinutes(endTime, startTime);

      await supabase
        .from('mock_recall_drills')
        .update({
          status: 'completed',
          drill_end_time: endTime.toISOString(),
          total_drill_time_minutes: totalMinutes,
          pass_fail: totalMinutes <= 240 ? 'pass' : 'needs_improvement'
        })
        .eq('id', drillData.id);
    },
    onSuccess: () => {
      setActiveDrill(null);
      queryClient.invalidateQueries({ queryKey: ['mock-recall-drills'] });
      toast({ title: "Drill Completed", description: "Results have been recorded." });
    }
  });

  const getStatusBadge = (drill: any) => {
    if (drill.status === 'completed') {
      if (drill.pass_fail === 'pass') {
        return <Badge className="bg-green-100 text-green-800">Pass</Badge>;
      } else if (drill.pass_fail === 'fail') {
        return <Badge variant="destructive">Fail</Badge>;
      } else {
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Needs Improvement</Badge>;
      }
    }
    if (drill.status === 'in_progress') {
      return <Badge variant="secondary">In Progress</Badge>;
    }
    return <Badge variant="outline">Scheduled</Badge>;
  };

  // Check if annual drill is due
  const lastDrill = drills?.find(d => d.status === 'completed');
  const daysSinceLastDrill = lastDrill 
    ? Math.floor((Date.now() - new Date(lastDrill.drill_date).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const drillDue = daysSinceLastDrill > 365;

  const avgDrillTime = drills?.filter(d => d.status === 'completed').length 
    ? Math.round(drills.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.total_drill_time_minutes || 0), 0) / drills.filter(d => d.status === 'completed').length)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Mock Recall Drills</h1>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Drill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Mock Recall Drill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Drill Date</Label>
                  <Input
                    type="date"
                    value={newDrill.drillDate}
                    onChange={(e) => setNewDrill({ ...newDrill, drillDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Drill Type</Label>
                  <Select value={newDrill.drillType} onValueChange={(v) => setNewDrill({ ...newDrill, drillType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Drill</SelectItem>
                      <SelectItem value="tabletop">Tabletop Exercise</SelectItem>
                      <SelectItem value="partial">Partial Drill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Simulated Recall Class</Label>
                <Select value={newDrill.simulatedClass} onValueChange={(v) => setNewDrill({ ...newDrill, simulatedClass: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">Class I - Serious Health Risk</SelectItem>
                    <SelectItem value="II">Class II - Temporary Health Problems</SelectItem>
                    <SelectItem value="III">Class III - Not Likely Harmful</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scenario Description</Label>
                <Textarea
                  value={newDrill.scenario}
                  onChange={(e) => setNewDrill({ ...newDrill, scenario: e.target.value })}
                  placeholder="Describe the recall scenario..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Affected Lot Number (Optional)</Label>
                <Input
                  value={newDrill.affectedLotNumber}
                  onChange={(e) => setNewDrill({ ...newDrill, affectedLotNumber: e.target.value })}
                  placeholder="Enter a specific lot or leave blank"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!newDrill.scenario || createMutation.isPending}>
                  Schedule Drill
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Annual Drill Warning */}
      {drillDue && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <div className="font-medium">Annual Mock Recall Drill Overdue</div>
                <div className="text-sm text-muted-foreground">
                  SQF requires annual mock recall drills. Last drill was {daysSinceLastDrill} days ago.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {drills?.filter(d => d.status === 'completed').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Completed Drills</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {drills?.filter(d => d.pass_fail === 'pass').length || 0}
            </div>
            <div className="text-sm text-green-600">Passed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {lastDrill ? daysSinceLastDrill : '-'}
            </div>
            <div className="text-sm text-muted-foreground">Days Since Last Drill</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{avgDrillTime}</div>
            <div className="text-sm text-muted-foreground">Avg. Time (min)</div>
          </CardContent>
        </Card>
      </div>

      {/* Drills Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Total Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drills?.map((drill) => (
                <TableRow key={drill.id}>
                  <TableCell className="font-mono">{drill.drill_number}</TableCell>
                  <TableCell>{format(new Date(drill.drill_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="capitalize">{drill.drill_type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Class {drill.simulated_recall_class}</Badge>
                  </TableCell>
                  <TableCell>
                    {drill.total_drill_time_minutes 
                      ? `${drill.total_drill_time_minutes} min`
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(drill)}</TableCell>
                  <TableCell>
                    {drill.status === 'scheduled' && (
                      <Button size="sm" onClick={() => startDrill.mutate(drill.id)}>
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    {drill.status === 'in_progress' && (
                      <Button size="sm" onClick={() => completeDrill.mutate(drill)}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    )}
                    {drill.status === 'completed' && (
                      <Button size="sm" variant="outline">
                        <FileText className="h-3 w-3 mr-1" />
                        View Report
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!drills || drills.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No drills scheduled
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SQF Requirements Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SQF Requirements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Frequency:</strong> Minimum annually</p>
          <p><strong>Time Target:</strong> Complete within 4 hours (240 minutes)</p>
          <p><strong>Documentation Retention:</strong> 7 years</p>
          <p><strong>Metrics Tracked:</strong> Time to identify lots, time to identify customers, total drill time, recovery percentage</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MockRecallDrills;
