import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  useEvaluateNCCAPATrigger,
  useCreateCAPAFromNC,
  useSimilarNCs,
} from '@/hooks/useNCCAPAIntegration';
import {
  AlertTriangle,
  TrendingUp,
  FileText,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface CAPAEscalationPanelProps {
  ncId: string;
  ncNumber: string;
  ncType: string;
  materialId: string | null;
  discoveredDate: string;
  severity: string;
  impactLevel: string;
  estimatedCost: number | null;
  capaId: string | null;
  capaNumber: string | null;
  requiresCAPA: boolean;
}

export function CAPAEscalationPanel({
  ncId,
  ncNumber,
  ncType,
  materialId,
  discoveredDate,
  severity,
  impactLevel,
  estimatedCost,
  capaId,
  capaNumber,
  requiresCAPA,
}: CAPAEscalationPanelProps) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  const { data: evaluation } = useEvaluateNCCAPATrigger(ncId);
  const { data: similarNCs = [] } = useSimilarNCs(ncType, materialId, discoveredDate, ncId);
  const createCAPA = useCreateCAPAFromNC();

  const handleCreateCAPA = async () => {
    const newCapaId = await createCAPA.mutateAsync(ncId);
    navigate(`/quality/capa/${newCapaId}`);
  };

  // Already has CAPA
  if (capaId && capaNumber) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-primary">
            <CheckCircle className="h-4 w-4" />
            CAPA Linked
          </CardTitle>
          <CardDescription>
            This non-conformity has been escalated to formal CAPA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{capaNumber}</p>
              <p className="text-sm text-muted-foreground">CAPA Number</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/quality/capa/${capaId}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View CAPA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Should suggest CAPA
  if (evaluation?.should_create_capa) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            CAPA Recommended
          </CardTitle>
          <CardDescription>
            This non-conformity meets criteria for formal CAPA investigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Why CAPA is Recommended</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {evaluation.reasons.map((reason, index) => (
                  <li key={index} className="text-sm">
                    {reason}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          {similarNCs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Similar Non-Conformities</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? 'Hide' : 'Show'} ({similarNCs.length})
                  </Button>
                </div>

                {showDetails && (
                  <div className="space-y-2">
                    {similarNCs.slice(0, 5).map((nc: any) => (
                      <div
                        key={nc.id}
                        className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                      >
                        <div>
                          <p className="font-medium">{nc.nc_number}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {nc.title}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(nc.discovered_date), 'MMM d')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <Button
            className="w-full"
            onClick={handleCreateCAPA}
            disabled={createCAPA.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            Create CAPA from this NC
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This will create a formal CAPA with pre-populated details from this NC
          </p>
        </CardContent>
      </Card>
    );
  }

  // Manual CAPA option
  if (requiresCAPA) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            CAPA Required
          </CardTitle>
          <CardDescription>Manually flagged for CAPA investigation</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={handleCreateCAPA}
            disabled={createCAPA.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            Create CAPA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
