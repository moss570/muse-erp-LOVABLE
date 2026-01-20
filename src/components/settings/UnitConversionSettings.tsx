import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Scale, ExternalLink, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UnitConversionSettings = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Conversions</CardTitle>
        <CardDescription>
          Configure unit of measure conversions for materials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="mb-2">
              Unit conversions are configured at the material level. Each material can have:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Base Unit:</strong> The primary unit for inventory tracking (e.g., kg, lb)</li>
              <li><strong>Purchase Unit:</strong> The unit used for purchasing (e.g., pail, drum, bag)</li>
              <li><strong>Usage Unit:</strong> The unit used in production (e.g., g, oz)</li>
              <li><strong>Conversion Factor:</strong> How many usage units per purchase unit</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Dual UOM System
          </h3>
          <p className="text-sm text-muted-foreground">
            The dual unit of measure system allows you to track inventory in the unit you purchase 
            (e.g., "pails") while issuing to production in the unit operators use (e.g., "kg"). 
            When a pail is opened, it's converted from 1 purchase unit to the equivalent usage units.
          </p>
          <div className="text-sm space-y-1">
            <p><strong>Example:</strong></p>
            <p>• Purchase Unit: Pail (35 lb)</p>
            <p>• Usage Unit: lb</p>
            <p>• Conversion Factor: 35</p>
            <p>→ 1 pail = 35 lb when opened</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory/materials')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Go to Materials
          </Button>
          <Button variant="outline" onClick={() => navigate('/settings/units-of-measure')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Units of Measure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitConversionSettings;
