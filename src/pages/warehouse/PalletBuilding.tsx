import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePalletBuilding, Pallet, AvailableCase } from "@/hooks/usePalletBuilding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  Layers,
  Box,
  Printer,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PalletBuilding() {
  const {
    activePallets,
    loadingPallets,
    availableCases,
    loadingCases,
    usePalletCases,
    createPallet,
    isCreatingPallet,
    addCaseToPallet,
    isAddingCase,
    removeCaseFromPallet,
    isRemovingCase,
    completePallet,
    isCompletingPallet,
  } = usePalletBuilding();

  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [isAddCaseDialogOpen, setIsAddCaseDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  // Add case form state
  const [selectedLotId, setSelectedLotId] = useState("");
  const [caseQuantity, setCaseQuantity] = useState("1");
  
  // Complete pallet form state
  const [completePurpose, setCompletePurpose] = useState("storage");
  const [completeLocationId, setCompleteLocationId] = useState("");

  // Get pallet cases for selected pallet
  const { data: palletCases = [], isLoading: loadingPalletCases } = usePalletCases(selectedPallet?.id || null);

  // Fetch locations for completion dialog
  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-pallet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const handleCreatePallet = () => {
    createPallet("storage");
  };

  const handleSelectPallet = (pallet: Pallet) => {
    setSelectedPallet(pallet);
  };

  const handleAddCase = () => {
    if (!selectedPallet || !selectedLotId || !caseQuantity) {
      toast.error("Please select a lot and enter quantity");
      return;
    }

    const qty = parseInt(caseQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const selectedCase = availableCases.find(c => c.id === selectedLotId);
    if (selectedCase && qty > selectedCase.available_for_palletization) {
      toast.error(`Only ${selectedCase.available_for_palletization} cases available`);
      return;
    }

    addCaseToPallet({
      palletId: selectedPallet.id,
      productionLotId: selectedLotId,
      quantity: qty,
    });

    setSelectedLotId("");
    setCaseQuantity("1");
    setIsAddCaseDialogOpen(false);
  };

  const handleRemoveCase = (palletCaseId: string) => {
    if (!selectedPallet) return;
    removeCaseFromPallet({ palletCaseId, palletId: selectedPallet.id });
  };

  const handleCompletePallet = () => {
    if (!selectedPallet) return;
    
    completePallet({
      palletId: selectedPallet.id,
      purpose: completePurpose,
      locationId: completeLocationId || undefined,
    });

    setSelectedPallet(null);
    setIsCompleteDialogOpen(false);
    setCompletePurpose("storage");
    setCompleteLocationId("");
  };

  const totalCasesOnPallet = palletCases.reduce((sum, pc) => sum + pc.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-8 w-8" />
            Pallet Building
          </h1>
          <p className="text-muted-foreground">
            Assemble pallets from finished goods cases
          </p>
        </div>
        <Button onClick={handleCreatePallet} disabled={isCreatingPallet} className="gap-2">
          {isCreatingPallet ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Start New Pallet
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Pallets Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Active Pallets
            </CardTitle>
            <CardDescription>Pallets currently being built</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPallets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : activePallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pallets in progress</p>
                <p className="text-sm">Click "Start New Pallet" to begin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activePallets.map((pallet) => (
                  <button
                    key={pallet.id}
                    onClick={() => handleSelectPallet(pallet)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPallet?.id === pallet.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">{pallet.pallet_number}</span>
                      <Badge variant="outline">Building</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {pallet.total_cases || 0} cases
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Pallet Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedPallet ? selectedPallet.pallet_number : "Select a Pallet"}
                </CardTitle>
                <CardDescription>
                  {selectedPallet ? `${totalCasesOnPallet} cases on pallet` : "Choose a pallet to view and add cases"}
                </CardDescription>
              </div>
              {selectedPallet && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddCaseDialogOpen(true)}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Cases
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Print functionality coming soon")}
                    className="gap-1"
                  >
                    <Printer className="h-4 w-4" />
                    Print Label
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsCompleteDialogOpen(true)}
                    disabled={palletCases.length === 0}
                    className="gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPallet ? (
              <div className="text-center py-12 text-muted-foreground">
                <Box className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a pallet from the left panel</p>
                <p className="text-sm">or start a new one</p>
              </div>
            ) : loadingPalletCases ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : palletCases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No cases on this pallet yet</p>
                <Button
                  variant="link"
                  onClick={() => setIsAddCaseDialogOpen(true)}
                  className="mt-2"
                >
                  Add cases now
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {palletCases.map((pc) => (
                    <TableRow key={pc.id}>
                      <TableCell className="font-mono">
                        {pc.production_lot?.lot_number || "—"}
                      </TableCell>
                      <TableCell>
                        {pc.production_lot?.product?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {pc.production_lot?.product_size?.sku || "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {pc.quantity}
                      </TableCell>
                      <TableCell>
                        {pc.production_lot?.expiration_date
                          ? format(new Date(pc.production_lot.expiration_date), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCase(pc.id)}
                          disabled={isRemovingCase}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Cases Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Available Cases for Palletization</CardTitle>
          <CardDescription>
            Approved case-packed lots ready to be added to pallets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCases ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : availableCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No cases available for palletization</p>
              <p className="text-sm">Complete Case Packing work orders to generate cases</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Total Available</TableHead>
                  <TableHead className="text-right">On Pallets</TableHead>
                  <TableHead className="text-right">Ready to Add</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableCases.map((ac) => (
                  <TableRow key={ac.id}>
                    <TableCell className="font-mono">{ac.lot_number}</TableCell>
                    <TableCell>{ac.product_name}</TableCell>
                    <TableCell>{ac.size_sku || "—"}</TableCell>
                    <TableCell className="text-right">{ac.quantity_available}</TableCell>
                    <TableCell className="text-right">{ac.cases_on_pallets}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {ac.available_for_palletization}
                    </TableCell>
                    <TableCell>
                      {ac.expiration_date
                        ? format(new Date(ac.expiration_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Case Dialog */}
      <Dialog open={isAddCaseDialogOpen} onOpenChange={setIsAddCaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cases to Pallet</DialogTitle>
            <DialogDescription>
              Select a lot and enter the number of cases to add to {selectedPallet?.pallet_number}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lot">Select Lot</Label>
              <Select value={selectedLotId} onValueChange={setSelectedLotId}>
                <SelectTrigger id="lot">
                  <SelectValue placeholder="Choose a lot" />
                </SelectTrigger>
                <SelectContent>
                  {availableCases.map((ac) => (
                    <SelectItem key={ac.id} value={ac.id}>
                      <span className="font-mono">{ac.lot_number}</span>
                      <span className="text-muted-foreground ml-2">
                        {ac.product_name} ({ac.available_for_palletization} avail)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Number of Cases</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={caseQuantity}
                onChange={(e) => setCaseQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
              {selectedLotId && (
                <p className="text-xs text-muted-foreground">
                  Max: {availableCases.find(c => c.id === selectedLotId)?.available_for_palletization || 0} cases
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCase} disabled={isAddingCase}>
              {isAddingCase && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Cases
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Pallet Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Pallet</DialogTitle>
            <DialogDescription>
              Finalize {selectedPallet?.pallet_number} with {totalCasesOnPallet} cases
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="purpose">Pallet Purpose</Label>
              <Select value={completePurpose} onValueChange={setCompletePurpose}>
                <SelectTrigger id="purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Destination Location</Label>
              <Select value={completeLocationId} onValueChange={setCompleteLocationId}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompletePallet} disabled={isCompletingPallet}>
              {isCompletingPallet && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Pallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
