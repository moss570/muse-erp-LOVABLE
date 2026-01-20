import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  ClipboardList, 
  ChevronLeft, 
  ChevronRight, 
  Package,
  MapPin,
  AlertTriangle,
  CheckCircle,
  SkipForward
} from "lucide-react";

const CycleCountEntry = () => {
  const { countId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [physicalQty, setPhysicalQty] = useState("");
  const [notes, setNotes] = useState("");
  const [itemNotFound, setItemNotFound] = useState(false);
  const [varianceExplanation, setVarianceExplanation] = useState("");

  const { data: count, isLoading } = useQuery({
    queryKey: ['cycle-count', countId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycle_counts')
        .select(`
          *,
          items:cycle_count_items(
            *,
            material:materials(id, name, code),
            location:locations!location_id(id, name),
            receiving_lot:receiving_lots(internal_lot_number, expiry_date),
            unit:units_of_measure!system_unit_id(id, code)
          )
        `)
        .eq('id', countId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const currentItem = count?.items?.[currentIndex];
  const totalItems = count?.items?.length || 0;
  const countedItems = count?.items?.filter((i: any) => i.status !== 'pending').length || 0;

  useEffect(() => {
    if (currentItem) {
      setPhysicalQty(currentItem.physical_quantity?.toString() || "");
      setNotes(currentItem.count_notes || "");
      setItemNotFound(currentItem.item_not_found || false);
      setVarianceExplanation("");
    }
  }, [currentItem]);

  const variance = physicalQty !== "" 
    ? Number(physicalQty) - (currentItem?.system_quantity || 0)
    : null;
  const variancePercent = variance !== null && currentItem?.system_quantity > 0
    ? (variance / currentItem.system_quantity) * 100
    : 0;
  const hasSignificantVariance = Math.abs(variancePercent) > 5;

  const saveMutation = useMutation({
    mutationFn: async (moveNext: boolean) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const varianceValue = variance !== null && currentItem?.system_value
        ? variance * (currentItem.system_value / currentItem.system_quantity)
        : 0;

      const requiresReview = Math.abs(variancePercent) > 2 || Math.abs(varianceValue) > 300;

      const { error } = await supabase
        .from('cycle_count_items')
        .update({
          physical_quantity: itemNotFound ? 0 : Number(physicalQty),
          physical_unit_id: currentItem?.system_unit_id,
          counted_at: new Date().toISOString(),
          counted_by: userId,
          variance_percentage: variancePercent,
          variance_value: varianceValue,
          status: requiresReview ? 'counted' : 'approved',
          requires_review: requiresReview,
          item_not_found: itemNotFound,
          count_notes: notes + (varianceExplanation ? `\nVariance reason: ${varianceExplanation}` : '')
        })
        .eq('id', currentItem?.id);

      if (error) throw error;

      const newCountedItems = countedItems + 1;
      const newItemsWithVariance = (count?.items || []).filter((i: any) => 
        i.id === currentItem?.id 
          ? variance !== 0
          : i.variance_quantity !== 0
      ).length;

      await supabase
        .from('cycle_counts')
        .update({
          status: 'in_progress',
          started_at: count?.started_at || new Date().toISOString(),
          items_counted: newCountedItems,
          items_with_variance: newItemsWithVariance
        })
        .eq('id', countId);

      return moveNext;
    },
    onSuccess: (moveNext) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-count', countId] });
      
      if (moveNext && currentIndex < totalItems - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (currentIndex >= totalItems - 1) {
        submitForReview();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const submitForReview = async () => {
    await supabase
      .from('cycle_counts')
      .update({
        status: 'pending_review',
        completed_at: new Date().toISOString()
      })
      .eq('id', countId);

    toast({
      title: "Count Complete",
      description: "Submitted for supervisor review."
    });
    navigate('/warehouse/cycle-counts');
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!count) return <div className="p-6">Count not found</div>;

  const progressPercent = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{count.count_number}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/warehouse/cycle-counts')}>
          Save & Exit
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm font-medium">
              {countedItems} / {totalItems} items
            </span>
          </div>
          <Progress value={progressPercent} />
        </CardContent>
      </Card>

      {currentItem && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Item {currentIndex + 1} of {totalItems}
              </span>
              {currentItem.status !== 'pending' && (
                <Badge variant="default">Counted</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Material:</span>
                <p className="font-medium">{currentItem.material?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Lot #:</span>
                <p className="font-medium">{currentItem.receiving_lot?.internal_lot_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Location:</span>
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="h-4 w-4" />
                  {currentItem.location?.name}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">System Qty:</span>
                <div className="font-medium text-lg">
                  {currentItem.system_quantity} {currentItem.unit?.code}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="not-found"
                checked={itemNotFound}
                onCheckedChange={(checked) => {
                  setItemNotFound(checked as boolean);
                  if (checked) setPhysicalQty("0");
                }}
              />
              <Label htmlFor="not-found" className="text-sm">
                Item not found at location
              </Label>
            </div>

            {!itemNotFound && (
              <div>
                <Label>Physical Count *</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={physicalQty}
                    onChange={(e) => setPhysicalQty(e.target.value)}
                    className="text-2xl h-14 text-center"
                    placeholder="0"
                  />
                  <span className="text-lg text-muted-foreground">
                    {currentItem.unit?.code}
                  </span>
                </div>
              </div>
            )}

            {variance !== null && variance !== 0 && (
              <Alert variant={hasSignificantVariance ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Variance: {variance > 0 ? '+' : ''}{variance} {currentItem.unit?.code}
                  {' '}({variancePercent.toFixed(1)}%)
                </AlertDescription>
              </Alert>
            )}

            {hasSignificantVariance && (
              <div>
                <Label>Variance Explanation (required for &gt;5%)</Label>
                <Textarea
                  value={varianceExplanation}
                  onChange={(e) => setVarianceExplanation(e.target.value)}
                  placeholder="Explain the variance..."
                  rows={2}
                />
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.min(totalItems - 1, currentIndex + 1))}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip
        </Button>

        <Button
          onClick={() => saveMutation.mutate(true)}
          disabled={
            (!itemNotFound && physicalQty === "") ||
            (hasSignificantVariance && !varianceExplanation) ||
            saveMutation.isPending
          }
        >
          {currentIndex < totalItems - 1 ? (
            <>Save & Next <ChevronRight className="h-4 w-4 ml-2" /></>
          ) : (
            <>Complete Count <CheckCircle className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CycleCountEntry;
