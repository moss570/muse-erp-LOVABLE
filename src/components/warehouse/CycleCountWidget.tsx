import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CycleCountWidget = () => {
  const navigate = useNavigate();

  // Placeholder data - cycle counts feature to be implemented
  const cycleCounts = {
    overdue: 0,
    dueToday: 0,
    inProgress: 0,
    pendingReview: 0
  };

  const totalPending = cycleCounts.overdue + cycleCounts.dueToday + cycleCounts.inProgress + cycleCounts.pendingReview;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Cycle Counts
          </div>
          <Badge variant={cycleCounts.overdue > 0 ? "destructive" : "secondary"}>
            {totalPending}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Due Today</span>
            </div>
            <p className="text-2xl font-bold mt-1">{cycleCounts.dueToday}</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-bold mt-1">{cycleCounts.inProgress}</p>
          </div>
        </div>

        {totalPending === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            No pending counts
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/warehouse/cycle-counts')}
        >
          View All Counts
        </Button>
      </CardContent>
    </Card>
  );
};

export default CycleCountWidget;
