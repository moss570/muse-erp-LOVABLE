import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  AlertTriangle, 
  Trash2, 
  ClipboardList, 
  Bell, 
  MapPin,
  Package,
  Scale
} from "lucide-react";

import HoldReasonCodesSettings from "@/components/settings/HoldReasonCodesSettings";
import DisposalReasonSettings from "@/components/settings/DisposalReasonSettings";
import CycleCountSettings from "@/components/settings/CycleCountSettings";
import AlertThresholdSettings from "@/components/settings/AlertThresholdSettings";
import LocationSettings from "@/components/settings/LocationSettings";
import UnitConversionSettings from "@/components/settings/UnitConversionSettings";
import InventoryPreferences from "@/components/settings/InventoryPreferences";

const InventorySettings = () => {
  const [activeTab, setActiveTab] = useState("hold-reasons");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Inventory Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="hold-reasons" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden md:inline">Hold Reasons</span>
          </TabsTrigger>
          <TabsTrigger value="disposal" className="flex items-center gap-1">
            <Trash2 className="h-4 w-4" />
            <span className="hidden md:inline">Disposal</span>
          </TabsTrigger>
          <TabsTrigger value="cycle-counts" className="flex items-center gap-1">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden md:inline">Cycle Counts</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <Bell className="h-4 w-4" />
            <span className="hidden md:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="hidden md:inline">Locations</span>
          </TabsTrigger>
          <TabsTrigger value="conversions" className="flex items-center gap-1">
            <Scale className="h-4 w-4" />
            <span className="hidden md:inline">Conversions</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span className="hidden md:inline">Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hold-reasons"><HoldReasonCodesSettings /></TabsContent>
        <TabsContent value="disposal"><DisposalReasonSettings /></TabsContent>
        <TabsContent value="cycle-counts"><CycleCountSettings /></TabsContent>
        <TabsContent value="alerts"><AlertThresholdSettings /></TabsContent>
        <TabsContent value="locations"><LocationSettings /></TabsContent>
        <TabsContent value="conversions"><UnitConversionSettings /></TabsContent>
        <TabsContent value="preferences"><InventoryPreferences /></TabsContent>
      </Tabs>
    </div>
  );
};

export default InventorySettings;
