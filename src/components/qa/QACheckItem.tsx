import { Button } from '@/components/ui/button';
import { ArrowRight, AlertCircle, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';
import type { QACheckResult } from '@/types/qa-checks';

interface QACheckItemProps {
  result: QACheckResult;
  onNavigate?: () => void;
  showNavigate?: boolean;
}

export function QACheckItem({ result, onNavigate, showNavigate = true }: QACheckItemProps) {
  const { definition, passed, message } = result;
  
  const getIcon = () => {
    if (passed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    }
    
    switch (definition.tier) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
      case 'important':
        return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />;
      case 'recommended':
        return <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{definition.check_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
      </div>
      {showNavigate && !passed && definition.target_tab && onNavigate && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="shrink-0 h-7 text-xs gap-1"
          onClick={onNavigate}
        >
          Go to {definition.target_tab}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
