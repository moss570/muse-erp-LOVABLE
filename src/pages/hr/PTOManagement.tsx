import { useState } from 'react';
import { usePTORequests, useReviewPTORequest } from '@/hooks/usePTO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Umbrella, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const PTOManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewDialog, setReviewDialog] = useState<{ request: any; action: 'approve' | 'deny' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  
  const { data: pendingRequests, isLoading: loadingPending } = usePTORequests({ status: 'pending' });
  const { data: allRequests, isLoading: loadingAll } = usePTORequests();
  const reviewRequest = useReviewPTORequest();
  
  const approvedRequests = allRequests?.filter(r => r.status === 'approved');
  const deniedRequests = allRequests?.filter(r => r.status === 'denied');
  
  const handleReview = async () => {
    if (!reviewDialog) return;
    await reviewRequest.mutateAsync({
      requestId: reviewDialog.request.id,
      status: reviewDialog.action === 'approve' ? 'approved' : 'denied',
      notes: reviewNotes,
    });
    setReviewDialog(null);
    setReviewNotes('');
  };

  const getEmployeeName = (employee: any) => {
    if (!employee) return 'Unknown';
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown';
  };

  const getEmployeeInitials = (employee: any) => {
    if (!employee) return '?';
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.last_name?.charAt(0) || '';
    return (first + last) || '?';
  };

  const RequestRow = ({ request, showActions = false }: { request: any; showActions?: boolean }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={request.employee?.avatar_url} />
          <AvatarFallback>{getEmployeeInitials(request.employee)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{getEmployeeName(request.employee)}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{request.pto_type?.name}</span>
            <span>•</span>
            <span>
              {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')} ({request.total_hours}h)
            </span>
          </div>
          {request.notes && (
            <p className="text-sm text-muted-foreground mt-1 italic">"{request.notes}"</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showActions ? (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setReviewDialog({ request, action: 'deny' })}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Deny
            </Button>
            <Button 
              size="sm" 
              onClick={() => setReviewDialog({ request, action: 'approve' })}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </>
        ) : (
          <Badge 
            variant={request.status === 'approved' ? 'default' : request.status === 'denied' ? 'destructive' : 'secondary'}
          >
            {request.status}
          </Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Umbrella className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">PTO Management</h1>
        </div>
        <p className="text-muted-foreground">Review and manage time off requests</p>
      </div>
      
      {pendingRequests && pendingRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                {pendingRequests.length} pending request(s) awaiting review
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-1" />
            Pending ({pendingRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle className="h-4 w-4 mr-1" />
            Approved ({approvedRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="denied">
            <XCircle className="h-4 w-4 mr-1" />
            Denied ({deniedRequests?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-4 space-y-3">
          {loadingPending ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : pendingRequests?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No pending requests
              </CardContent>
            </Card>
          ) : (
            pendingRequests?.map((req) => (
              <RequestRow key={req.id} request={req} showActions />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="mt-4 space-y-3">
          {loadingAll ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : approvedRequests?.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No approved requests</p>
          ) : (
            approvedRequests?.map((req) => (
              <RequestRow key={req.id} request={req} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="denied" className="mt-4 space-y-3">
          {loadingAll ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : deniedRequests?.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No denied requests</p>
          ) : (
            deniedRequests?.map((req) => (
              <RequestRow key={req.id} request={req} />
            ))
          )}
        </TabsContent>
      </Tabs>
      
      <Dialog open={!!reviewDialog} onOpenChange={(open) => !open && setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === 'approve' ? 'Approve' : 'Deny'} Request
            </DialogTitle>
          </DialogHeader>
          {reviewDialog && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{getEmployeeName(reviewDialog.request.employee)}</p>
                <p className="text-sm text-muted-foreground">
                  {reviewDialog.request.pto_type?.name} • {reviewDialog.request.total_hours}h
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(reviewDialog.request.start_date), 'MMM d')} - {format(new Date(reviewDialog.request.end_date), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea 
                  value={reviewNotes} 
                  onChange={(e) => setReviewNotes(e.target.value)} 
                  placeholder={reviewDialog.action === 'deny' ? 'Reason for denial...' : 'Add a note...'} 
                  rows={3} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              Cancel
            </Button>
            <Button 
              variant={reviewDialog?.action === 'approve' ? 'default' : 'destructive'} 
              onClick={handleReview} 
              disabled={reviewRequest.isPending}
            >
              {reviewDialog?.action === 'approve' ? 'Approve' : 'Deny'} Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PTOManagement;
