import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQualityTestTemplates, TEST_CATEGORIES, APPLICABLE_STAGES } from "@/hooks/useQualityTests";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FlaskConical, AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectTestTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (templates: Array<{
    test_template_id: string;
    parameter_name: string;
    target_value: string | null;
    min_value: number | null;
    max_value: number | null;
    uom: string | null;
    required_at_stage: string | null;
    is_critical: boolean;
    test_method: string | null;
    frequency: string | null;
  }>) => void;
  existingTemplateIds?: string[];
}

export function SelectTestTemplatesDialog({
  open,
  onOpenChange,
  onSelect,
  existingTemplateIds = [],
}: SelectTestTemplatesDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data: templates = [], isLoading } = useQualityTestTemplates({ isActive: true });

  // Filter out already added templates
  const availableTemplates = templates.filter(
    (t) => !existingTemplateIds.includes(t.id)
  );

  const filteredTemplates = availableTemplates.filter((t) =>
    t.test_name.toLowerCase().includes(search.toLowerCase()) ||
    t.test_code.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTemplate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selectedTemplates = templates
      .filter((t) => selectedIds.includes(t.id))
      .map((t) => ({
        test_template_id: t.id,
        parameter_name: t.test_name,
        target_value: t.target_value,
        min_value: t.min_value,
        max_value: t.max_value,
        uom: t.uom,
        required_at_stage: t.applicable_stages?.[0] || null,
        is_critical: t.is_critical || false,
        test_method: t.test_method,
        frequency: "per_batch",
      }));

    onSelect(selectedTemplates);
    setSelectedIds([]);
    setSearch("");
    onOpenChange(false);
  };

  const getCategoryLabel = (value: string | null) => {
    return TEST_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const getStageLabels = (stages: string[] | null) => {
    if (!stages?.length) return null;
    return stages.map((s) => APPLICABLE_STAGES.find((a) => a.value === s)?.label || s);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[9998] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className={cn(
            "fixed left-[50%] top-[50%] z-[9999] grid w-full max-w-2xl max-h-[80vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden"
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Select from Test Library
            </DialogTitle>
            <DialogDescription>
              Choose quality test templates to add as requirements for this product.
            </DialogDescription>
          </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {availableTemplates.length === 0
              ? "All available test templates have been added to this product."
              : "No templates match your search."}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIds.includes(template.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => toggleTemplate(template.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(template.id)}
                    onCheckedChange={() => toggleTemplate(template.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.test_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({template.test_code})
                      </span>
                      {template.is_critical && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          CCP
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {template.category && (
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(template.category)}
                        </Badge>
                      )}
                      {template.parameter_type && (
                        <Badge variant="outline" className="text-xs">
                          {template.parameter_type}
                        </Badge>
                      )}
                      {getStageLabels(template.applicable_stages)?.map((stage) => (
                        <Badge key={stage} variant="outline" className="text-xs">
                          {stage}
                        </Badge>
                      ))}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {template.description}
                      </p>
                    )}
                    {(template.target_value || template.min_value !== null || template.max_value !== null) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {template.target_value && <span>Target: {template.target_value}</span>}
                        {template.min_value !== null && template.max_value !== null && (
                          <span className="ml-2">
                            Range: {template.min_value} - {template.max_value} {template.uom}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={selectedIds.length === 0}>
            Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ""} Selected
          </Button>
        </DialogFooter>
        <DialogPrimitive.Close asChild>
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
