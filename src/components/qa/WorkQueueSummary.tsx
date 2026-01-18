import { AlertTriangle, AlertCircle, Clock, FileText, ClipboardCheck, FileX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WorkQueueSummary as WorkQueueSummaryType } from '@/hooks/useQAWorkQueue';

interface WorkQueueSummaryProps {
  summary: WorkQueueSummaryType;
  isLoading?: boolean;
}

export function WorkQueueSummary({ summary, isLoading }: WorkQueueSummaryProps) {
  const cards = [
    {
      label: 'Overdue',
      value: summary.overdue,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Critical',
      value: summary.critical,
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Soon',
      value: summary.soon,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Expiring',
      value: summary.docsExpiring,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Missing',
      value: summary.docsMissing,
      icon: FileX,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
    },
    {
      label: 'Reviews',
      value: summary.reviewsDue,
      icon: ClipboardCheck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-6 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-lg',
                  card.bgColor
                )}
              >
                <div className={cn('text-2xl font-bold', card.color)}>
                  {isLoading ? '...' : card.value}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Icon className={cn('h-4 w-4', card.color)} />
                  {card.label}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
