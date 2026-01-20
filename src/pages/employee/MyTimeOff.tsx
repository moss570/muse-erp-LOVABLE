import { useState } from 'react';
import { useMyPTOBalances, useMyPTORequests, useCancelPTORequest } from '@/hooks/usePTO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Umbrella, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import PTORequestDialog from '@/components/pto/PTORequestDialog';
import { cn } from '@/lib/utils';

const MyTimeOff = () => {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const { data: balances, isLoading: loadingBalances } = useMyPTOBalances();
  const { data: requests, isLoading: loadingRequests } = useMyPTORequests();
  const cancelRequest = useCancelPTORequest();
  
  const upcomingRequests = requests?.filter(r => r.status === 'approved' && isFuture(new Date(r.start_date)));
  const pendingRequests = requests?.filter(r => r.status === 'pending');
  const pastRequests = requests?.filter(r => r.status !== 'pending' && isPast(new Date(r.end_date)));
  
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'secondary' | 'default' | 'destructive' | 'outline'; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      denied: { variant: 'destructive', icon: XCircle },
      cancelled: { variant: 'outline', icon: XCircle },
    };
    const { variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Umbrella className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">My Time Off</h1>
          </div>
          <p className="text-muted-foreground">View balances and request time off</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Time Off
        </Button>
      </div>
      
      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingBalances ? (
          <Card><CardContent className="p-6">Loading...</CardContent></Card>
        ) : balances?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">
              No PTO balances configured. Contact HR to set up your time off.
            </CardContent>
          </Card>
        ) : (
          balances?.map((balance) => (
            <Card key={balance.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{balance.pto_type?.name}</CardTitle>
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: balance.pto_type?.color || '#6b7280' }} 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{balance.current_balance}h</p>
                <p className="text-sm text-muted-foreground">Available</p>
                {balance.max_balance && (
                  <Progress 
                    value={(balance.current_balance / balance.max_balance) * 100} 
                    className="mt-2 h-2"
                  />
                )}
                <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span><span className="font-medium">Accrued YTD</span> {balance.year_accrued}h</span>
                  <span><span className="font-medium">Used YTD</span> {balance.year_used}h</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Requests */}
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingRequests?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingRequests?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="mt-4 space-y-3">
              {loadingRequests ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : upcomingRequests?.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No upcoming time off</p>
              ) : (
                upcomingRequests?.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div 
                        className="h-10 w-1 rounded-full" 
                        style={{ backgroundColor: req.pto_type?.color || '#6b7280' }} 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{req.pto_type?.name}</span>
                          <span className="text-muted-foreground">({req.total_hours}h)</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="pending" className="mt-4 space-y-3">
              {pendingRequests?.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No pending requests</p>
              ) : (
                pendingRequests?.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div 
                        className="h-10 w-1 rounded-full" 
                        style={{ backgroundColor: req.pto_type?.color || '#6b7280' }} 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{req.pto_type?.name}</span>
                          <span className="text-muted-foreground">({req.total_hours}h)</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(req.status)}
                      <Button variant="ghost" size="sm" onClick={() => setCancelRequestId(req.id)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-4 space-y-3">
              {pastRequests?.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No past requests</p>
              ) : (
                pastRequests?.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div 
                        className="h-10 w-1 rounded-full" 
                        style={{ backgroundColor: req.pto_type?.color || '#6b7280' }} 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{req.pto_type?.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(req.start_date), 'MMM d')} - {format(new Date(req.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <PTORequestDialog open={showRequestDialog} onOpenChange={setShowRequestDialog} />
      
      <AlertDialog open={!!cancelRequestId} onOpenChange={(open) => !open && setCancelRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this time off request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { 
                if (cancelRequestId) {
                  cancelRequest.mutate(cancelRequestId); 
                  setCancelRequestId(null); 
                }
              }}
            >
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyTimeOff;
