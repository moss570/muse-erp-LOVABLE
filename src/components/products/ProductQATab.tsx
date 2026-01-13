import { useState } from "react";
import { useProductQARequirements } from "@/hooks/useProductQARequirements";
import { useProductCategories, type QAParameter } from "@/hooks/useProductCategories";
import { useProductAttributes, COMMON_ALLERGENS, COMMON_CLAIMS } from "@/hooks/useProductAttributes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Download, Loader2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

interface ProductQATabProps {
  productId: string;
  productCategoryId?: string;
}

const PRODUCTION_STAGES = [
  { value: "base", label: "Base Production" },
  { value: "flavoring", label: "Flavoring" },
  { value: "freezing", label: "Freezing" },
  { value: "case_pack", label: "Case Pack" },
];

export function ProductQATab({ productId, productCategoryId }: ProductQATabProps) {
  const { requirements, createRequirement, deleteRequirement, bulkCreateRequirements, isLoading } = 
    useProductQARequirements(productId);
  const { categories } = useProductCategories();
  const { allergens, claims, createAttribute, deleteAttribute } = useProductAttributes(productId);
  
  const [isAddingReq, setIsAddingReq] = useState(false);
  const [newReq, setNewReq] = useState({
    parameter_name: "",
    target_value: "",
    min_value: "",
    max_value: "",
    uom: "",
    required_at_stage: "",
    is_critical: false,
    test_method: "",
  });

  const [selectedAllergen, setSelectedAllergen] = useState("");
  const [selectedClaim, setSelectedClaim] = useState("");

  const category = categories.find((c) => c.id === productCategoryId);

  const handleImportFromCategory = async () => {
    if (!category?.qa_parameters?.length) {
      toast.error("No QA parameters defined for this category");
      return;
    }

    const newRequirements = category.qa_parameters.map((param: QAParameter, index: number) => ({
      product_id: productId,
      parameter_name: param.name,
      uom: param.uom,
      required_at_stage: param.required_at,
      sort_order: index,
    }));

    await bulkCreateRequirements.mutateAsync(newRequirements);
  };

  const handleAddRequirement = async () => {
    if (!newReq.parameter_name) {
      toast.error("Parameter name is required");
      return;
    }

    await createRequirement.mutateAsync({
      product_id: productId,
      parameter_name: newReq.parameter_name,
      target_value: newReq.target_value || null,
      min_value: newReq.min_value ? parseFloat(newReq.min_value) : null,
      max_value: newReq.max_value ? parseFloat(newReq.max_value) : null,
      uom: newReq.uom || null,
      required_at_stage: newReq.required_at_stage || null,
      is_critical: newReq.is_critical,
      test_method: newReq.test_method || null,
    });

    setNewReq({
      parameter_name: "",
      target_value: "",
      min_value: "",
      max_value: "",
      uom: "",
      required_at_stage: "",
      is_critical: false,
      test_method: "",
    });
    setIsAddingReq(false);
  };

  const handleAddAllergen = async () => {
    if (!selectedAllergen) return;
    await createAttribute.mutateAsync({
      product_id: productId,
      attribute_type: "allergen",
      attribute_value: selectedAllergen,
    });
    setSelectedAllergen("");
  };

  const handleAddClaim = async () => {
    if (!selectedClaim) return;
    await createAttribute.mutateAsync({
      product_id: productId,
      attribute_type: "claim",
      attribute_value: selectedClaim,
    });
    setSelectedClaim("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QA Requirements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>QA Requirements</CardTitle>
              <CardDescription>
                Quality parameters that must be recorded during production
              </CardDescription>
            </div>
            {category && category.qa_parameters?.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleImportFromCategory}>
                <Download className="h-4 w-4 mr-2" />
                Import from {category.name}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Max</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    {req.is_critical && (
                      <AlertTriangle className="h-4 w-4 text-destructive inline mr-1" />
                    )}
                    {req.parameter_name}
                  </TableCell>
                  <TableCell>{req.target_value || "-"}</TableCell>
                  <TableCell>{req.min_value ?? "-"}</TableCell>
                  <TableCell>{req.max_value ?? "-"}</TableCell>
                  <TableCell>{req.uom || "-"}</TableCell>
                  <TableCell>
                    {PRODUCTION_STAGES.find((s) => s.value === req.required_at_stage)?.label || "-"}
                  </TableCell>
                  <TableCell>
                    {req.is_critical && <Badge variant="destructive">Yes</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRequirement.mutate(req.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {requirements.length === 0 && !isAddingReq && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No QA requirements configured.
                  </TableCell>
                </TableRow>
              )}

              {isAddingReq && (
                <TableRow>
                  <TableCell>
                    <Input
                      placeholder="Parameter name"
                      value={newReq.parameter_name}
                      onChange={(e) => setNewReq({ ...newReq, parameter_name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Target"
                      value={newReq.target_value}
                      onChange={(e) => setNewReq({ ...newReq, target_value: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={newReq.min_value}
                      onChange={(e) => setNewReq({ ...newReq, min_value: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={newReq.max_value}
                      onChange={(e) => setNewReq({ ...newReq, max_value: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="UOM"
                      className="w-16"
                      value={newReq.uom}
                      onChange={(e) => setNewReq({ ...newReq, uom: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newReq.required_at_stage || "__none__"}
                      onValueChange={(val) => setNewReq({ ...newReq, required_at_stage: val === "__none__" ? "" : val })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Any</SelectItem>
                        {PRODUCTION_STAGES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={newReq.is_critical}
                      onCheckedChange={(checked) => setNewReq({ ...newReq, is_critical: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleAddRequirement}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsAddingReq(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!isAddingReq && (
            <Button variant="outline" className="mt-4" onClick={() => setIsAddingReq(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Allergens & Claims */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Allergens</CardTitle>
            <CardDescription>Allergen declarations for this product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {allergens.map((a) => (
                <Badge key={a.id} variant="secondary" className="gap-1">
                  {a.attribute_value}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => deleteAttribute.mutate(a.id)}
                  />
                </Badge>
              ))}
              {allergens.length === 0 && (
                <span className="text-sm text-muted-foreground">No allergens declared</span>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={selectedAllergen} onValueChange={setSelectedAllergen}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select allergen" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ALLERGENS.filter(
                    (a) => !allergens.some((al) => al.attribute_value === a)
                  ).map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddAllergen} disabled={!selectedAllergen}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Claims</CardTitle>
            <CardDescription>Certifications and claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {claims.map((c) => (
                <Badge key={c.id} variant="outline" className="gap-1">
                  {c.attribute_value}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => deleteAttribute.mutate(c.id)}
                  />
                </Badge>
              ))}
              {claims.length === 0 && (
                <span className="text-sm text-muted-foreground">No claims added</span>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={selectedClaim} onValueChange={setSelectedClaim}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select claim" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CLAIMS.filter(
                    (c) => !claims.some((cl) => cl.attribute_value === c)
                  ).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddClaim} disabled={!selectedClaim}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
