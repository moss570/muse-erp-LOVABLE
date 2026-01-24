import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  User, 
  Package, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  type PendingPurchaseOrder, 
  useUpdatePendingOrder,
  useRejectPendingOrder,
  getSignedPdfUrl 
} from '@/hooks/usePendingOrders';
import { CustomerMatchStep } from './CustomerMatchStep';
import { ItemMappingStep } from './ItemMappingStep';
import { OrderConfirmStep } from './OrderConfirmStep';

interface POReviewWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingOrder: PendingPurchaseOrder;
}

type WizardStep = 'pdf' | 'customer' | 'items' | 'confirm';

interface MappedItem {
  original_item_number: string;
  description: string | null;
  quantity: number;
  unit_price: number | null;
  unit_of_measure: string | null;
  mapped_product_size_id: string | null;
  mapped_sku: string | null;
  remember_mapping: boolean;
}

export function POReviewWizard({ open, onOpenChange, pendingOrder }: POReviewWizardProps) {
  const [activeStep, setActiveStep] = useState<WizardStep>('pdf');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  // State for wizard data
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    pendingOrder.matched_customer_id
  );
  const [mappedItems, setMappedItems] = useState<MappedItem[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const updatePendingOrder = useUpdatePendingOrder();
  const rejectPendingOrder = useRejectPendingOrder();

  // Load PDF URL and fetch as blob for embedding
  useEffect(() => {
    let blobUrl: string | null = null;
    
    const loadPdf = async () => {
      if (pendingOrder.pdf_storage_path) {
        setLoadingPdf(true);
        try {
          const signedUrl = await getSignedPdfUrl(pendingOrder.pdf_storage_path);
          setPdfUrl(signedUrl);
          
          // Fetch as blob to avoid Chrome cross-origin blocking
          const response = await fetch(signedUrl);
          if (response.ok) {
            const blob = await response.blob();
            blobUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(blobUrl);
          }
        } catch (error) {
          console.error('Failed to load PDF:', error);
          toast.error('Failed to load PDF');
        } finally {
          setLoadingPdf(false);
        }
      }
    };
    
    if (open) {
      loadPdf();
    }
    
    // Cleanup blob URL on unmount or when dialog closes
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      setPdfBlobUrl(null);
    };
  }, [open, pendingOrder.pdf_storage_path]);

  // Initialize mapped items from extracted data
  useEffect(() => {
    if (pendingOrder.raw_extracted_data?.line_items) {
      setMappedItems(
        pendingOrder.raw_extracted_data.line_items.map((item) => ({
          original_item_number: item.item_number,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_of_measure: item.unit_of_measure,
          mapped_product_size_id: null,
          mapped_sku: null,
          remember_mapping: false,
        }))
      );
    }
  }, [pendingOrder.raw_extracted_data]);

  // Mark as reviewing when opened
  useEffect(() => {
    if (open && pendingOrder.status === 'pending') {
      updatePendingOrder.mutate({
        id: pendingOrder.id,
        updates: { status: 'reviewing' },
      });
    }
  }, [open, pendingOrder.id, pendingOrder.status]);

  const handleReject = async () => {
    await rejectPendingOrder.mutateAsync({ id: pendingOrder.id });
    onOpenChange(false);
  };

  const extractedData = pendingOrder.raw_extracted_data;
  const hasExtractionError = pendingOrder.extraction_status === 'failed';

  const getStepComplete = (step: WizardStep): boolean => {
    switch (step) {
      case 'pdf':
        return true; // Always complete - just viewing
      case 'customer':
        return !!selectedCustomerId;
      case 'items':
        return mappedItems.every((item) => item.mapped_product_size_id);
      case 'confirm':
        return false;
      default:
        return false;
    }
  };

  const canProceed = (): boolean => {
    switch (activeStep) {
      case 'pdf':
        return !hasExtractionError;
      case 'customer':
        return !!selectedCustomerId;
      case 'items':
        return mappedItems.every((item) => item.mapped_product_size_id);
      default:
        return true;
    }
  };

  const handleNext = () => {
    const steps: WizardStep[] = ['pdf', 'customer', 'items', 'confirm'];
    const currentIndex = steps.indexOf(activeStep);
    if (currentIndex < steps.length - 1) {
      setActiveStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ['pdf', 'customer', 'items', 'confirm'];
    const currentIndex = steps.indexOf(activeStep);
    if (currentIndex > 0) {
      setActiveStep(steps[currentIndex - 1]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Purchase Order
            {extractedData?.po_number && (
              <Badge variant="outline" className="font-mono ml-2">
                {extractedData.po_number}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeStep}
          onValueChange={(v) => setActiveStep(v as WizardStep)}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pdf" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">View PDF</span>
              {getStepComplete('pdf') && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="customer" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Customer</span>
              {getStepComplete('customer') && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Items</span>
              {getStepComplete('items') && (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="confirm" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Confirm</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            {/* PDF View Tab */}
            <TabsContent value="pdf" className="h-full mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* PDF Viewer */}
                <div className="border rounded-lg overflow-hidden bg-muted/30 min-h-[400px]">
                  {loadingPdf ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : pdfBlobUrl ? (
                    <object
                      data={pdfBlobUrl}
                      type="application/pdf"
                      className="w-full h-full min-h-[400px]"
                      title="Purchase Order PDF"
                    >
                      <p className="p-4 text-center text-muted-foreground">
                        Unable to display PDF.{' '}
                        <a href={pdfUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          Open in new tab
                        </a>
                      </p>
                    </object>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                      <FileText className="h-12 w-12" />
                      <p>No PDF available</p>
                    </div>
                  )}
                </div>

                {/* Extracted Data Summary */}
                <div className="space-y-4">
                  {hasExtractionError ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Extraction Failed</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pendingOrder.extraction_error ||
                          'Failed to extract data from this PDF. You may need to process it manually.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Customer Information</h4>
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                          <dt className="text-muted-foreground">Name:</dt>
                          <dd>{extractedData?.customer_name || '—'}</dd>
                          <dt className="text-muted-foreground">Address:</dt>
                          <dd>
                            {[
                              extractedData?.customer_address,
                              extractedData?.customer_city,
                              extractedData?.customer_state,
                              extractedData?.customer_zip,
                            ]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </dd>
                        </dl>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Order Details</h4>
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                          <dt className="text-muted-foreground">PO Number:</dt>
                          <dd className="font-mono">{extractedData?.po_number || '—'}</dd>
                          <dt className="text-muted-foreground">PO Date:</dt>
                          <dd>
                            {extractedData?.po_date
                              ? format(new Date(extractedData.po_date), 'MMM d, yyyy')
                              : '—'}
                          </dd>
                          <dt className="text-muted-foreground">Requested Delivery:</dt>
                          <dd>
                            {extractedData?.requested_delivery_date
                              ? format(new Date(extractedData.requested_delivery_date), 'MMM d, yyyy')
                              : '—'}
                          </dd>
                          <dt className="text-muted-foreground">Line Items:</dt>
                          <dd>{extractedData?.line_items?.length || 0}</dd>
                          <dt className="text-muted-foreground">Total:</dt>
                          <dd className="font-medium">
                            {extractedData?.total
                              ? `$${extractedData.total.toFixed(2)}`
                              : '—'}
                          </dd>
                        </dl>
                      </div>

                      {extractedData?.confidence !== undefined && (
                        <div className="text-sm text-muted-foreground">
                          AI Confidence: {Math.round(extractedData.confidence * 100)}%
                        </div>
                      )}
                    </>
                  )}

                  {pdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open PDF in New Tab
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Customer Match Tab */}
            <TabsContent value="customer" className="mt-0">
              <CustomerMatchStep
                extractedCustomerName={extractedData?.customer_name || null}
                extractedCustomerAddress={[
                  extractedData?.customer_address,
                  extractedData?.customer_city,
                  extractedData?.customer_state,
                  extractedData?.customer_zip,
                ]
                  .filter(Boolean)
                  .join(', ') || null}
                matchedCustomerId={pendingOrder.matched_customer_id}
                matchedCustomer={pendingOrder.matched_customer}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setSelectedCustomerId}
              />
            </TabsContent>

            {/* Item Mapping Tab */}
            <TabsContent value="items" className="mt-0">
              <ItemMappingStep
                items={mappedItems}
                customerId={selectedCustomerId}
                onItemsChange={setMappedItems}
              />
            </TabsContent>

            {/* Confirm Tab */}
            <TabsContent value="confirm" className="mt-0">
              <OrderConfirmStep
                pendingOrder={pendingOrder}
                selectedCustomerId={selectedCustomerId}
                mappedItems={mappedItems}
                isCreating={isCreatingOrder}
                onCreatingChange={setIsCreatingOrder}
                onComplete={() => onOpenChange(false)}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-between border-t pt-4 mt-4">
          <Button variant="destructive" onClick={handleReject}>
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>

          <div className="flex gap-2">
            {activeStep !== 'pdf' && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            {activeStep !== 'confirm' && (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
