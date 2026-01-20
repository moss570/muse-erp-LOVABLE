import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const HoldReasonCodesSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hold Reason Codes</CardTitle>
        <CardDescription>Configure reasons for placing inventory on hold.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Hold reason codes are configured through the Hold Log system. Common codes include:
            Pending COA, Quality Concern, Temperature Excursion, Damaged Packaging, and Allergen Concern.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default HoldReasonCodesSettings;
