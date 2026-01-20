import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LocationSettings = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations</CardTitle>
        <CardDescription>Configure warehouse, production, and receiving locations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Locations are configured in the dedicated Locations settings page. 
            This includes warehouse zones, production areas, receiving docks, and quarantine areas.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/settings/locations')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Go to Locations Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default LocationSettings;
