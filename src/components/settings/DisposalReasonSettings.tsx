import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const DisposalReasonSettings = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disposal Reason Codes</CardTitle>
        <CardDescription>Configure reasons for disposing inventory.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Disposal reasons are configured in the Disposal Log. Common reasons include:
            expired, damaged, contaminated, quality failure, and recall.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default DisposalReasonSettings;
