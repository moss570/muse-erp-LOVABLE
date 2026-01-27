import { useState } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, Loader2, BookOpen, Columns, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePolicySQFMappings } from "@/hooks/useSQF";
import { cn } from "@/lib/utils";

interface PolicySQFMappingsTabProps {
  policyId: string;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  onCompareToggle?: (enabled: boolean) => void;
  isCompareEnabled?: boolean;
  selectedMappingId?: string | null;
  onMappingSelect?: (mappingId: string | null) => void;
}

const statusConfig = {
  compliant: {
    icon: CheckCircle2,
    label: "Compliant",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    iconClass: "text-green-600 dark:text-green-400",
  },
  partial: {
    icon: AlertTriangle,
    label: "Partial",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    iconClass: "text-yellow-600 dark:text-yellow-400",
  },
  gap: {
    icon: AlertCircle,
    label: "Gap",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    iconClass: "text-red-600 dark:text-red-400",
  },
  not_applicable: {
    icon: HelpCircle,
    label: "N/A",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    iconClass: "text-gray-600 dark:text-gray-400",
  },
};

export default function PolicySQFMappingsTab({
  policyId,
  onAnalyze,
  isAnalyzing,
  onCompareToggle,
  isCompareEnabled,
  selectedMappingId,
  onMappingSelect,
}: PolicySQFMappingsTabProps) {
  const { data: mappings, isLoading } = usePolicySQFMappings(policyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mappings?.length) {
    return (
      <Card>
        <CardContent className="text-center py-12 space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-medium text-lg">No SQF Mappings Found</h3>
            <p className="text-muted-foreground mt-1">
              This policy hasn't been analyzed for SQF compliance yet.
            </p>
          </div>
          {onAnalyze && (
            <Button onClick={onAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Analyze for SQF Mappings
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Group by status for summary
  const statusCounts = mappings.reduce((acc, m) => {
    const status = m.compliance_status || "not_applicable";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header with Compare Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {mappings.length} SQF Code{mappings.length !== 1 ? "s" : ""} Mapped
          </Badge>
          {Object.entries(statusCounts).map(([status, count]) => {
            const config = statusConfig[status as keyof typeof statusConfig];
            if (!config) return null;
            return (
              <Badge key={status} className={config.className}>
                {count} {config.label}
              </Badge>
            );
          })}
        </div>
        {onCompareToggle && (
          <div className="flex items-center space-x-2">
            <Switch
              id="compare-mode"
              checked={isCompareEnabled}
              onCheckedChange={onCompareToggle}
            />
            <Label htmlFor="compare-mode" className="flex items-center gap-2 cursor-pointer">
              <Columns className="h-4 w-4" />
              Compare View
            </Label>
          </div>
        )}
      </div>

      {/* Mappings List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3">
          {mappings.map((mapping) => {
            const status = mapping.compliance_status || "not_applicable";
            const config = statusConfig[status as keyof typeof statusConfig];
            const Icon = config?.icon || HelpCircle;
            const isSelected = selectedMappingId === mapping.id;

            return (
              <Card
                key={mapping.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  isSelected && "border-primary ring-1 ring-primary"
                )}
                onClick={() => onMappingSelect?.(isSelected ? null : mapping.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config?.iconClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-medium text-sm">
                          {(mapping as any).sqf_code?.code_number || "Unknown Code"}
                        </span>
                        <Badge className={cn("text-xs", config?.className)}>
                          {config?.label}
                        </Badge>
                        {(mapping as any).sqf_code?.is_mandatory && (
                          <Badge variant="destructive" className="text-xs">
                            Mandatory
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {(mapping as any).sqf_code?.title || "No title"}
                      </p>
                      {mapping.notes && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {mapping.notes}
                        </p>
                      )}
                      {mapping.gap_description && (
                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm text-amber-800 dark:text-amber-200">
                          <strong>Gap:</strong> {mapping.gap_description}
                        </div>
                      )}
                      {(mapping as any).evidence_excerpts?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {(mapping as any).evidence_excerpts.length} evidence excerpt(s) available
                        </p>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform",
                      isSelected && "rotate-90"
                    )} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
