import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Thermometer, Camera, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CCPData {
  id: string;
  ccp_number: string;
  ccp_type: "CCP" | "CP" | "PCP";
  name: string;
  hazard_description: string;
  critical_limit_min?: number;
  critical_limit_max?: number;
  critical_limit_text?: string;
  critical_limit_unit?: string;
  monitoring_procedure?: string;
  corrective_action?: string;
  verification_procedure?: string;
}

interface CCPVerificationCardProps {
  ccp: CCPData;
  productionLotId?: string;
  onVerificationComplete?: (verification: {
    ccpId: string;
    measuredValue: number;
    isWithinLimits: boolean;
    notes?: string;
    photoPath?: string;
  }) => void;
  readOnly?: boolean;
}

export function CCPVerificationCard({
  ccp,
  productionLotId,
  onVerificationComplete,
  readOnly = false,
}: CCPVerificationCardProps) {
  const [measuredValue, setMeasuredValue] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "pass" | "fail">("pending");
  const [showCorrectiveAction, setShowCorrectiveAction] = useState(false);

  const checkLimits = (value: number): boolean => {
    if (ccp.critical_limit_min !== undefined && value < ccp.critical_limit_min) {
      return false;
    }
    if (ccp.critical_limit_max !== undefined && value > ccp.critical_limit_max) {
      return false;
    }
    return true;
  };

  const handleValueChange = (value: string) => {
    setMeasuredValue(value);
    const numValue = parseFloat(value);
    
    if (!isNaN(numValue)) {
      const isWithin = checkLimits(numValue);
      setVerificationStatus(isWithin ? "pass" : "fail");
      setShowCorrectiveAction(!isWithin);
    } else {
      setVerificationStatus("pending");
      setShowCorrectiveAction(false);
    }
  };

  const handleSubmit = async () => {
    const numValue = parseFloat(measuredValue);
    if (isNaN(numValue)) {
      toast.error("Please enter a valid measured value");
      return;
    }

    setIsSubmitting(true);
    try {
      const isWithin = checkLimits(numValue);
      
      onVerificationComplete?.({
        ccpId: ccp.id,
        measuredValue: numValue,
        isWithinLimits: isWithin,
        notes: notes || undefined,
      });

      toast.success(
        isWithin
          ? "CCP verification recorded - Within limits"
          : "CCP deviation recorded - Corrective action required"
      );
    } catch (error) {
      toast.error("Failed to record verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLimit = () => {
    if (ccp.critical_limit_text) {
      return ccp.critical_limit_text;
    }
    
    const parts: string[] = [];
    if (ccp.critical_limit_min !== undefined) {
      parts.push(`Min: ${ccp.critical_limit_min}${ccp.critical_limit_unit || ""}`);
    }
    if (ccp.critical_limit_max !== undefined) {
      parts.push(`Max: ${ccp.critical_limit_max}${ccp.critical_limit_unit || ""}`);
    }
    return parts.join(" | ") || "No limits defined";
  };

  const ccpTypeColors = {
    CCP: "bg-red-100 text-red-800 border-red-200",
    CP: "bg-yellow-100 text-yellow-800 border-yellow-200",
    PCP: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const statusBorders = {
    pending: "border-muted",
    pass: "border-green-500 ring-2 ring-green-500/20",
    fail: "border-red-500 ring-2 ring-red-500/20",
  };

  return (
    <Card className={cn("transition-all", statusBorders[verificationStatus])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={ccpTypeColors[ccp.ccp_type]}>
                {ccp.ccp_type}
              </Badge>
              <span className="font-mono font-bold text-lg">{ccp.ccp_number}</span>
            </div>
            <CardTitle className="text-base">{ccp.name}</CardTitle>
          </div>
          
          {verificationStatus === "pass" && (
            <CheckCircle className="h-8 w-8 text-green-500" />
          )}
          {verificationStatus === "fail" && (
            <AlertTriangle className="h-8 w-8 text-red-500 animate-pulse" />
          )}
        </div>
        
        {ccp.hazard_description && (
          <CardDescription className="mt-2">
            <span className="font-medium">Hazard:</span> {ccp.hazard_description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Critical Limits Display */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Critical Limits</span>
          </div>
          <div className="text-lg font-mono font-bold text-primary">
            {formatLimit()}
          </div>
        </div>

        {/* Measured Value Input */}
        {!readOnly && (
          <div className="space-y-2">
            <Label htmlFor={`measured-${ccp.id}`} className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Measured Value
            </Label>
            <div className="flex gap-2">
              <Input
                id={`measured-${ccp.id}`}
                type="number"
                step="0.1"
                value={measuredValue}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="Enter value"
                className={cn(
                  "text-lg font-mono",
                  verificationStatus === "pass" && "border-green-500 focus-visible:ring-green-500",
                  verificationStatus === "fail" && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {ccp.critical_limit_unit && (
                <div className="flex items-center px-3 bg-muted rounded-md border text-muted-foreground">
                  {ccp.critical_limit_unit}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Feedback */}
        {verificationStatus === "pass" && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Within acceptable limits</span>
            </div>
          </div>
        )}

        {/* Deviation Warning & Corrective Action */}
        {showCorrectiveAction && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-bold">DEVIATION DETECTED</span>
              </div>
              <p className="text-sm">
                Measured value is outside critical limits. Corrective action required.
              </p>
            </div>

            {ccp.corrective_action && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="font-medium text-amber-800 mb-1">
                  Required Corrective Action:
                </div>
                <p className="text-sm text-amber-700 whitespace-pre-wrap">
                  {ccp.corrective_action}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {!readOnly && (
          <div className="space-y-2">
            <Label htmlFor={`notes-${ccp.id}`}>Notes (optional)</Label>
            <Textarea
              id={`notes-${ccp.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any observations or corrective actions taken..."
              rows={2}
            />
          </div>
        )}

        {/* Monitoring Procedure */}
        {ccp.monitoring_procedure && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Monitoring Procedure: </span>
            {ccp.monitoring_procedure}
          </div>
        )}

        {/* Actions */}
        {!readOnly && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !measuredValue}
              className={cn(
                "flex-1",
                verificationStatus === "pass" && "bg-green-600 hover:bg-green-700",
                verificationStatus === "fail" && "bg-red-600 hover:bg-red-700"
              )}
            >
              {verificationStatus === "fail" ? "Record Deviation" : "Confirm Verification"}
            </Button>
            <Button variant="outline" size="icon" title="Attach photo">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CCPVerificationCard;
