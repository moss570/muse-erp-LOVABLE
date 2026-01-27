import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ClipboardList, FileText, Lightbulb, CheckSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SQFCodeDetailPanelProps {
  mapping: {
    id: string;
    compliance_status?: string | null;
    notes?: string | null;
    gap_description?: string | null;
    evidence_excerpts?: string[] | null;
    sqf_code?: {
      id: string;
      code_number: string;
      title: string;
      requirement_text?: string | null;
      guidance_notes?: string | null;
      evidence_requirements?: string | null;
      is_mandatory?: boolean;
      category?: string | null;
    } | null;
  };
}

const statusConfig = {
  compliant: {
    icon: CheckCircle2,
    label: "Compliant",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    iconClass: "text-green-600 dark:text-green-400",
    description: "This policy fully satisfies the SQF requirement.",
  },
  partial: {
    icon: AlertTriangle,
    label: "Partial",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    iconClass: "text-yellow-600 dark:text-yellow-400",
    description: "This policy partially addresses the SQF requirement.",
  },
  gap: {
    icon: AlertCircle,
    label: "Gap",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    iconClass: "text-red-600 dark:text-red-400",
    description: "This policy does not adequately address the SQF requirement.",
  },
  not_applicable: {
    icon: HelpCircle,
    label: "N/A",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    iconClass: "text-gray-600 dark:text-gray-400",
    description: "This SQF requirement is not applicable to this policy.",
  },
};

export default function SQFCodeDetailPanel({ mapping }: SQFCodeDetailPanelProps) {
  const sqfCode = mapping.sqf_code;
  const status = mapping.compliance_status || "not_applicable";
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.not_applicable;
  const Icon = config.icon;

  if (!sqfCode) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        SQF code details not available
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-mono text-lg font-bold">{sqfCode.code_number}</span>
            <Badge className={cn("text-xs", config.className)}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {sqfCode.is_mandatory && (
              <Badge variant="destructive" className="text-xs">Mandatory</Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg">{sqfCode.title}</h3>
          {sqfCode.category && (
            <Badge variant="outline" className="mt-2 text-xs">
              {sqfCode.category}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Compliance Status Description */}
        <div className={cn(
          "p-3 rounded-lg flex items-start gap-2",
          status === "compliant" && "bg-green-50 dark:bg-green-950/30",
          status === "partial" && "bg-yellow-50 dark:bg-yellow-950/30",
          status === "gap" && "bg-red-50 dark:bg-red-950/30",
          status === "not_applicable" && "bg-gray-50 dark:bg-gray-950/30"
        )}>
          <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconClass)} />
          <p className="text-sm">{config.description}</p>
        </div>

        {/* Requirement Text */}
        {sqfCode.requirement_text && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Requirement
            </h4>
            <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap">
              {sqfCode.requirement_text}
            </div>
          </div>
        )}

        {/* AI Analysis / Notes */}
        {mapping.notes && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4" />
              Analysis
            </h4>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-sm">
              {mapping.notes}
            </div>
          </div>
        )}

        {/* Gap Description */}
        {mapping.gap_description && (status === "partial" || status === "gap") && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Gap Details
            </h4>
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-sm text-amber-800 dark:text-amber-200">
              {mapping.gap_description}
            </div>
          </div>
        )}

        {/* Guidance Notes */}
        {sqfCode.guidance_notes && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4" />
              Guidance Notes
            </h4>
            <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap">
              {sqfCode.guidance_notes}
            </div>
          </div>
        )}

        {/* Evidence Requirements */}
        {sqfCode.evidence_requirements && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <CheckSquare className="h-4 w-4" />
              Evidence Requirements
            </h4>
            <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap">
              {sqfCode.evidence_requirements}
            </div>
          </div>
        )}

        {/* Evidence Excerpts from Policy */}
        {mapping.evidence_excerpts && mapping.evidence_excerpts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Evidence from Policy ({mapping.evidence_excerpts.length})
            </h4>
            <div className="space-y-2">
              {mapping.evidence_excerpts.map((excerpt, index) => (
                <div
                  key={index}
                  className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg text-sm border-l-2 border-green-500"
                >
                  <span className="text-xs text-muted-foreground block mb-1">
                    Excerpt {index + 1}
                  </span>
                  "{excerpt}"
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
