import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  HelpCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  BarChart3,
  ListTree
} from "lucide-react";
import { useSQFEditions } from "@/hooks/useSQF";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GapAnalysisItem {
  sqf_code_id: string;
  code_number: string;
  title: string;
  category: string | null;
  module: string | null;
  section: string | null;
  is_mandatory: boolean;
  is_fundamental: boolean;
  requirement_text: string | null;
  overall_status: "compliant" | "partial" | "gap" | "not_addressed";
  mapping_count: number;
  compliant_count: number;
  partial_count: number;
  gap_count: number;
  policies: {
    id: string;
    title: string;
    policy_number: string;
    compliance_status: string;
    notes: string | null;
    gap_description: string | null;
  }[];
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
  not_addressed: {
    icon: HelpCircle,
    label: "Not Addressed",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    iconClass: "text-gray-600 dark:text-gray-400",
  },
};

export default function GapAnalysis() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("code");
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "category">("list");

  const { data: sqfEditions } = useSQFEditions();
  const activeEdition = sqfEditions?.find(e => e.is_active);

  // Fetch comprehensive gap analysis data
  const { data: gapData, isLoading } = useQuery({
    queryKey: ["gap-analysis", activeEdition?.id],
    queryFn: async () => {
      if (!activeEdition?.id) return [];

      // Get all SQF codes for the active edition
      const { data: codes, error: codesError } = await supabase
        .from("sqf_codes")
        .select("*")
        .eq("edition_id", activeEdition.id)
        .order("code_number");

      if (codesError) throw codesError;

      // Get all mappings with policy details
      const { data: mappings, error: mappingsError } = await supabase
        .from("policy_sqf_mappings")
        .select(`
          *,
          policy:policies(id, title, policy_number, status),
          sqf_code:sqf_codes!inner(edition_id)
        `)
        .eq("sqf_code.edition_id", activeEdition.id);

      if (mappingsError) throw mappingsError;

      // Build the gap analysis items
      const gapItems: GapAnalysisItem[] = codes.map(code => {
        const codeMappings = mappings?.filter(m => m.sqf_code_id === code.id) || [];
        
        const compliantCount = codeMappings.filter(m => m.compliance_status === "compliant").length;
        const partialCount = codeMappings.filter(m => m.compliance_status === "partial").length;
        const gapCount = codeMappings.filter(m => m.compliance_status === "gap").length;

        let overallStatus: "compliant" | "partial" | "gap" | "not_addressed" = "not_addressed";
        if (codeMappings.length === 0) {
          overallStatus = "not_addressed";
        } else if (compliantCount > 0 && partialCount === 0 && gapCount === 0) {
          overallStatus = "compliant";
        } else if (gapCount > 0) {
          overallStatus = "gap";
        } else if (partialCount > 0) {
          overallStatus = "partial";
        } else {
          overallStatus = "compliant";
        }

        return {
          sqf_code_id: code.id,
          code_number: code.code_number,
          title: code.title,
          category: code.category,
          module: code.module,
          section: code.section,
          is_mandatory: code.is_mandatory || false,
          is_fundamental: code.is_fundamental || false,
          requirement_text: code.requirement_text,
          overall_status: overallStatus,
          mapping_count: codeMappings.length,
          compliant_count: compliantCount,
          partial_count: partialCount,
          gap_count: gapCount,
          policies: codeMappings.map(m => ({
            id: m.policy?.id || "",
            title: m.policy?.title || "Unknown",
            policy_number: m.policy?.policy_number || "",
            compliance_status: m.compliance_status || "not_addressed",
            notes: m.notes,
            gap_description: m.gap_description,
          })),
        };
      });

      return gapItems;
    },
    enabled: !!activeEdition?.id,
  });

  // Get unique categories
  const categories = useMemo(() => {
    if (!gapData) return [];
    const cats = [...new Set(gapData.map(d => d.category).filter(Boolean))];
    return cats.sort();
  }, [gapData]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!gapData) return [];

    let filtered = gapData.filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.code_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || item.overall_status === statusFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sort
    switch (sortBy) {
      case "code":
        filtered.sort((a, b) => a.code_number.localeCompare(b.code_number, undefined, { numeric: true }));
        break;
      case "status":
        const statusOrder = { gap: 0, not_addressed: 1, partial: 2, compliant: 3 };
        filtered.sort((a, b) => statusOrder[a.overall_status] - statusOrder[b.overall_status]);
        break;
      case "category":
        filtered.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        break;
      case "mandatory":
        filtered.sort((a, b) => (b.is_mandatory ? 1 : 0) - (a.is_mandatory ? 1 : 0));
        break;
    }

    return filtered;
  }, [gapData, searchTerm, statusFilter, categoryFilter, sortBy]);

  // Group by category for category view
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, GapAnalysisItem[]> = {};
    filteredData.forEach(item => {
      const cat = item.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!gapData) return { total: 0, compliant: 0, partial: 0, gap: 0, notAddressed: 0, score: 0 };
    
    const total = gapData.length;
    const compliant = gapData.filter(d => d.overall_status === "compliant").length;
    const partial = gapData.filter(d => d.overall_status === "partial").length;
    const gap = gapData.filter(d => d.overall_status === "gap").length;
    const notAddressed = gapData.filter(d => d.overall_status === "not_addressed").length;
    const score = total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

    return { total, compliant, partial, gap, notAddressed, score };
  }, [gapData]);

  const toggleExpanded = (id: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const downloadReport = () => {
    if (!gapData) return;

    const csvRows = [
      ["Code Number", "Title", "Category", "Mandatory", "Fundamental", "Status", "Policy Count", "Policies Mapped", "Gap Notes"].join(",")
    ];

    gapData.forEach(item => {
      const policiesMapped = item.policies.map(p => `${p.policy_number}: ${p.title}`).join("; ");
      const gapNotes = item.policies.filter(p => p.gap_description).map(p => p.gap_description).join("; ");
      
      csvRows.push([
        `"${item.code_number}"`,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.category || ""}"`,
        item.is_mandatory ? "Yes" : "No",
        item.is_fundamental ? "Yes" : "No",
        item.overall_status,
        item.mapping_count.toString(),
        `"${policiesMapped.replace(/"/g, '""')}"`,
        `"${gapNotes.replace(/"/g, '""')}"`,
      ].join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sqf-gap-analysis-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">SQF Gap Analysis</h1>
          <p className="text-muted-foreground">
            Comprehensive compliance review for {activeEdition?.name || "SQF Edition"}
          </p>
        </div>
        <Button onClick={downloadReport} disabled={!gapData?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.score}%</div>
            <div className="text-sm text-muted-foreground">Compliance Score</div>
            <Progress value={stats.score} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.compliant}</span>
            </div>
            <div className="text-sm text-muted-foreground">Compliant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.partial}</span>
            </div>
            <div className="text-sm text-muted-foreground">Partial</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{stats.gap}</span>
            </div>
            <div className="text-sm text-muted-foreground">Gaps Identified</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-gray-600" />
              <span className="text-2xl font-bold">{stats.notAddressed}</span>
            </div>
            <div className="text-sm text-muted-foreground">Not Addressed</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search codes or titles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="gap">Gap</SelectItem>
                <SelectItem value="not_addressed">Not Addressed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">Code Number</SelectItem>
                <SelectItem value="status">Status (Gaps First)</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="mandatory">Mandatory First</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-lg p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setViewMode("list")}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "category" ? "secondary" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setViewMode("category")}
              >
                <ListTree className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {filteredData.length} SQF Code{filteredData.length !== 1 ? "s" : ""}
            {statusFilter !== "all" && ` (${statusConfig[statusFilter as keyof typeof statusConfig]?.label})`}
          </CardTitle>
          <CardDescription>
            Click on a code to see mapped policies and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {viewMode === "list" ? (
              <div className="space-y-2">
                {filteredData.map(item => (
                  <GapAnalysisRow
                    key={item.sqf_code_id}
                    item={item}
                    isExpanded={expandedCodes.has(item.sqf_code_id)}
                    onToggle={() => toggleExpanded(item.sqf_code_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByCategory).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="font-medium text-lg mb-2 sticky top-0 bg-background py-2 border-b">
                      {category}
                      <Badge variant="outline" className="ml-2">{items.length}</Badge>
                    </h3>
                    <div className="space-y-2 pl-2">
                      {items.map(item => (
                        <GapAnalysisRow
                          key={item.sqf_code_id}
                          item={item}
                          isExpanded={expandedCodes.has(item.sqf_code_id)}
                          onToggle={() => toggleExpanded(item.sqf_code_id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Row component for individual gap analysis items
function GapAnalysisRow({ 
  item, 
  isExpanded, 
  onToggle 
}: { 
  item: GapAnalysisItem; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const config = statusConfig[item.overall_status];
  const Icon = config.icon;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
          isExpanded && "bg-accent/30"
        )}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <Icon className={cn("h-5 w-5 flex-shrink-0", config.iconClass)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-medium text-sm">{item.code_number}</span>
              <Badge className={cn("text-xs", config.className)}>{config.label}</Badge>
              {item.is_mandatory && (
                <Badge variant="destructive" className="text-xs">Mandatory</Badge>
              )}
              {item.is_fundamental && (
                <Badge variant="outline" className="text-xs">Fundamental</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{item.title}</p>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {item.mapping_count}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-8 mt-2 p-4 bg-muted/30 rounded-lg space-y-3">
          {item.requirement_text && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Requirement</h4>
              <p className="text-sm">{item.requirement_text}</p>
            </div>
          )}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Mapped Policies ({item.mapping_count})
            </h4>
            {item.policies.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ No policies mapped to this code. This is a compliance gap.
              </p>
            ) : (
              <div className="space-y-2">
                {item.policies.map((policy, idx) => {
                  const policyConfig = statusConfig[policy.compliance_status as keyof typeof statusConfig] || statusConfig.not_addressed;
                  return (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-background rounded border">
                      <policyConfig.icon className={cn("h-4 w-4 mt-0.5", policyConfig.iconClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{policy.policy_number}</span>
                          <Badge className={cn("text-xs", policyConfig.className)}>{policyConfig.label}</Badge>
                        </div>
                        <p className="text-sm font-medium">{policy.title}</p>
                        {policy.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{policy.notes}</p>
                        )}
                        {policy.gap_description && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            <strong>Gap:</strong> {policy.gap_description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}