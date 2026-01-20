import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Eye, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface COADocument {
  id: string;
  file_path: string;
  file_name: string;
  validation_status: string;
  ai_confidence_score: number | null;
  lot_number_match: boolean | null;
  specs_match: boolean | null;
  ai_extracted_data: any;
  uploaded_at: string;
  receiving_lot: {
    internal_lot_number: string;
    supplier_lot_number: string | null;
    received_date: string;
  } | null;
}

interface COAViewerProps {
  receivingLotId?: string;
  materialId?: string;
  showHistory?: boolean;
}

export function COAViewer({ receivingLotId, materialId, showHistory = false }: COAViewerProps) {
  const { data: coaDocuments, isLoading } = useQuery({
    queryKey: ['coa-documents', receivingLotId, materialId],
    queryFn: async () => {
      let query = supabase
        .from('receiving_coa_documents')
        .select(`
          *,
          receiving_lot:receiving_lots(
            internal_lot_number,
            supplier_lot_number,
            received_date,
            material_id
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (receivingLotId) {
        query = query.eq('receiving_lot_id', receivingLotId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // If filtering by material, do it client-side
      if (materialId && data) {
        return data.filter(doc => doc.receiving_lot?.material_id === materialId);
      }
      
      return data as COADocument[];
    },
    enabled: !!receivingLotId || !!materialId
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; icon: any; label: string; className?: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      processing: { variant: "outline", icon: Clock, label: "Processing", className: "animate-pulse" },
      passed: { variant: "default", icon: CheckCircle, label: "Passed", className: "bg-green-500" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
      manual_review: { variant: "outline", icon: AlertCircle, label: "Review", className: "border-warning text-warning" }
    };
    const { variant, icon: Icon, label, className } = config[status] || config.pending;
    return (
      <Badge variant={variant} className={cn("gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from('coa-documents').download(filePath);
    if (error) {
      console.error('Download error:', error);
      return;
    }
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleView = async (filePath: string) => {
    const { data } = await supabase.storage.from('coa-documents').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading COA documents...
        </CardContent>
      </Card>
    );
  }

  const coa = coaDocuments?.[0];
  
  if (!coa && receivingLotId) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No COA uploaded for this lot.</p>
        </CardContent>
      </Card>
    );
  }

  // History view for material master
  if (showHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            COA History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!coaDocuments?.length ? (
            <p className="text-center text-muted-foreground py-4">
              No COA documents found for this material.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot #</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coaDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-sm">
                        {doc.receiving_lot?.internal_lot_number}
                      </TableCell>
                      <TableCell>
                        {doc.receiving_lot?.received_date 
                          ? format(new Date(doc.receiving_lot.received_date), 'MMM d, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.validation_status)}</TableCell>
                      <TableCell>
                        {doc.ai_confidence_score ? `${doc.ai_confidence_score}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(doc.file_path)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc.file_path, doc.file_name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                COA history maintained for SQF audit compliance.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Single COA view
  if (!coa) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Certificate of Analysis
          </CardTitle>
          {getStatusBadge(coa.validation_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <p>
              <span className="text-muted-foreground">File:</span>{' '}
              <span className="font-medium">{coa.file_name}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Uploaded:</span>{' '}
              {format(new Date(coa.uploaded_at), 'MMM d, yyyy h:mm a')}
            </p>
            {coa.ai_confidence_score && (
              <p>
                <span className="text-muted-foreground">AI Confidence:</span>{' '}
                <span className="font-medium">{coa.ai_confidence_score}%</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleView(coa.file_path)}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload(coa.file_path, coa.file_name)}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Show extracted parameters if available */}
        {coa.ai_extracted_data?.parameters && (
          <div className="border rounded-lg p-3">
            <p className="text-sm font-medium mb-2">Validated Parameters</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {coa.ai_extracted_data.parameters.map((param: any, index: number) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    param.pass ? "bg-green-50" : "bg-destructive/10"
                  )}
                >
                  <span>{param.name}</span>
                  <span className="font-mono">{param.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
