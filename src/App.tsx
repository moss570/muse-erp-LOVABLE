import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Materials from "./pages/inventory/Materials";
import Products from "./pages/inventory/Products";
import Suppliers from "./pages/purchasing/Suppliers";
import PurchaseOrders from "./pages/purchasing/PurchaseOrders";
import PurchaseOrderDetail from "./pages/purchasing/PurchaseOrderDetail";
import Receiving from "./pages/purchasing/Receiving";
import Customers from "./pages/sales/Customers";
import Machines from "./pages/settings/Machines";
import Locations from "./pages/settings/Locations";
import SubCategories from "./pages/settings/SubCategories";
import DocumentRequirements from "./pages/settings/DocumentRequirements";
import SettingsHub from "./pages/settings/SettingsHub";
import UnitsOfMeasure from "./pages/settings/UnitsOfMeasure";
import Departments from "./pages/settings/Departments";
import ListedMaterialNames from "./pages/settings/ListedMaterialNames";
import UserManagement from "./pages/settings/UserManagement";
import ImportExport from "./pages/settings/ImportExport";
import RolePermissions from "./pages/settings/RolePermissions";
import DocumentTemplatesPage from "./pages/settings/DocumentTemplates";
import CompanySettings from "./pages/settings/CompanySettings";
import LabelTemplates from "./pages/settings/LabelTemplates";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes - wrapped in AppLayout */}
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            
            {/* Inventory routes */}
            <Route path="/inventory/materials" element={<AppLayout><Materials /></AppLayout>} />
            <Route path="/inventory/products" element={<AppLayout><Products /></AppLayout>} />
            <Route path="/inventory/*" element={<AppLayout><div className="text-center py-12"><h2 className="text-2xl font-bold mb-2">Inventory Module</h2><p className="text-muted-foreground">Coming soon</p></div></AppLayout>} />
            
            {/* Purchasing routes */}
            <Route path="/purchasing/suppliers" element={<AppLayout><Suppliers /></AppLayout>} />
            <Route path="/purchasing/orders" element={<AppLayout><PurchaseOrders /></AppLayout>} />
            <Route path="/purchasing/orders/:id" element={<AppLayout><PurchaseOrderDetail /></AppLayout>} />
            <Route path="/purchasing/receiving" element={<AppLayout><Receiving /></AppLayout>} />
            <Route path="/purchasing/*" element={<AppLayout><div className="text-center py-12"><h2 className="text-2xl font-bold mb-2">Purchasing Module</h2><p className="text-muted-foreground">Coming soon</p></div></AppLayout>} />
            
            {/* Settings routes */}
            <Route path="/settings" element={<AppLayout><SettingsHub /></AppLayout>} />
            <Route path="/settings/machines" element={<AppLayout><Machines /></AppLayout>} />
            <Route path="/settings/locations" element={<AppLayout><Locations /></AppLayout>} />
            <Route path="/settings/sub-categories" element={<AppLayout><SubCategories /></AppLayout>} />
            <Route path="/settings/document-requirements" element={<AppLayout><DocumentRequirements /></AppLayout>} />
            <Route path="/settings/units" element={<AppLayout><UnitsOfMeasure /></AppLayout>} />
            <Route path="/settings/departments" element={<AppLayout><Departments /></AppLayout>} />
            <Route path="/settings/material-names" element={<AppLayout><ListedMaterialNames /></AppLayout>} />
            <Route path="/settings/users" element={<AppLayout><UserManagement /></AppLayout>} />
            <Route path="/settings/permissions" element={<AppLayout><RolePermissions /></AppLayout>} />
            <Route path="/settings/import-export" element={<AppLayout><ImportExport /></AppLayout>} />
            <Route path="/settings/templates" element={<AppLayout><DocumentTemplatesPage /></AppLayout>} />
            <Route path="/settings/labels" element={<AppLayout><LabelTemplates /></AppLayout>} />
            <Route path="/settings/company" element={<AppLayout><CompanySettings /></AppLayout>} />
            <Route path="/settings/*" element={<AppLayout><SettingsHub /></AppLayout>} />
            
            {/* Other placeholder routes */}
            {/* Sales routes */}
            <Route path="/sales/customers" element={<AppLayout><Customers /></AppLayout>} />
            <Route
              path="/sales/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Sales Module</h2>
                    <p className="text-muted-foreground">Coming soon</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/quality/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Quality & Food Safety Module</h2>
                    <p className="text-muted-foreground">Coming in Phase 2</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/scheduling/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Scheduling Module</h2>
                    <p className="text-muted-foreground">Coming in Phase 2</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/employees/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Employees Module</h2>
                    <p className="text-muted-foreground">Coming in Phase 2</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/reports/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Reports & KPIs Module</h2>
                    <p className="text-muted-foreground">Coming in Phase 3</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/documents"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Documents Module</h2>
                    <p className="text-muted-foreground">Coming soon</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/kiosk/timeclock"
              element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold mb-2">Time Clock Kiosk</h2>
                  <p className="text-muted-foreground">Coming in Phase 2</p>
                </div>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
