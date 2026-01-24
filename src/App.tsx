// App component with route definitions
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireRole } from "@/components/auth/RequireRole";
import Auth from "./pages/Auth";
import UpdatePassword from "./pages/UpdatePassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import Materials from "./pages/inventory/Materials";
import Products from "./pages/inventory/Products";
import MaterialInventory from "./pages/inventory/MaterialInventory";
import OpenContainers from "./pages/inventory/OpenContainers";
import InventoryAlerts from "./pages/inventory/InventoryAlerts";
import HoldLog from "./pages/inventory/HoldLog";
import DisposalLog from "./pages/inventory/DisposalLog";
import Suppliers from "./pages/purchasing/Suppliers";
import PurchaseOrders from "./pages/purchasing/PurchaseOrders";
import PurchaseOrderDetail from "./pages/purchasing/PurchaseOrderDetail";
import Receiving from "./pages/purchasing/Receiving";
import Customers from "./pages/sales/Customers";
import Orders from "./pages/sales/Orders";
import OrderDetail from "./pages/sales/OrderDetail";
import Invoices from "./pages/sales/Invoices";
import Payments from "./pages/sales/Payments";
import Returns from "./pages/sales/Returns";
import CustomerPricing from "./pages/sales/CustomerPricing";
import OrderFulfillmentReports from "./pages/sales/OrderFulfillmentReports";
import DeliveryDriver from "./pages/sales/DeliveryDriver";
import Machines from "./pages/settings/Machines";
import Locations from "./pages/settings/Locations";
import SubCategories from "./pages/settings/SubCategories";
import DocumentRequirements from "./pages/settings/DocumentRequirements";
import SettingsHub from "./pages/settings/SettingsHub";
import UnitsOfMeasure from "./pages/settings/UnitsOfMeasure";
import Departments from "./pages/settings/Departments";
import ListedMaterialNames from "./pages/settings/ListedMaterialNames";
import MaterialNameCategories from "./pages/settings/MaterialNameCategories";
import UserManagement from "./pages/settings/UserManagement";
import ImportExport from "./pages/settings/ImportExport";
import RolePermissions from "./pages/settings/RolePermissions";
import DocumentTemplatesPage from "./pages/settings/DocumentTemplates";
import CompanySettings from "./pages/settings/CompanySettings";
import LabelTemplates from "./pages/settings/LabelTemplates";
import EmailSettings from "./pages/settings/EmailSettings";
import PriceSheets from "./pages/settings/PriceSheets";
import PriceSheetDetail from "./pages/settings/PriceSheetDetail";
import TeamRoster from "./pages/hr/TeamRoster";
import EmployeeDetail from "./pages/hr/EmployeeDetail";
import Schedule from "./pages/hr/Schedule";
import FixedCosts from "./pages/settings/FixedCosts";
import GLAccounts from "./pages/settings/GLAccounts";
import PeriodClose from "./pages/settings/PeriodClose";
import ProfitLoss from "./pages/reports/ProfitLoss";
import XeroConfiguration from "./pages/settings/XeroConfiguration";
import CategoryGLDefaults from "./pages/settings/CategoryGLDefaults";
import ProductionDashboard from "./pages/manufacturing/ProductionDashboard";
import ProductionExecution from "./pages/manufacturing/ProductionExecution";
import ManufacturingLots from "./pages/manufacturing/ManufacturingLots";
import CreateManufacturingLot from "./pages/manufacturing/CreateManufacturingLot";
import LotDetail from "./pages/manufacturing/LotDetail";
import Recipes from "./pages/manufacturing/Recipes";
import RecipeDetail from "./pages/manufacturing/RecipeDetail";
import ShopFloor from "./pages/manufacturing/ShopFloor";
import ProductionScheduler from "./pages/manufacturing/ProductionScheduler";
// EmployeeSchedulerPage removed - consolidated into Schedule.tsx
import ShopFloorWorkOrder from "./pages/manufacturing/ShopFloorWorkOrder";
import ProductionLinesSettings from "./pages/settings/ProductionLinesSettings";
import DailyProductionTargets from "./pages/settings/DailyProductionTargets";
import ProductionStagesSettings from "./pages/settings/ProductionStagesSettings";
import QADashboard from "./pages/quality/QADashboard";
import CloseDay from "./pages/operations/CloseDay";
import ThreePLDashboard from "./pages/inventory/ThreePLDashboard";
import TimeClockKiosk from "./pages/hr/TimeClockKiosk";
import PayrollExport from "./pages/hr/PayrollExport";

import ProductCategories from "./pages/settings/ProductCategories";
import PackagingIndicators from "./pages/settings/PackagingIndicators";
import ContainerSizes from "./pages/settings/ContainerSizes";
import QualityTests from "./pages/settings/QualityTests";
import QAApprovalRules from "./pages/settings/QAApprovalRules";
import BatchQATests from "./pages/manufacturing/BatchQATests";
import QAWorkQueue from "./pages/qa/QAWorkQueue";
import OverrideRequests from "./pages/qa/OverrideRequests";
import CapaManagement from "./pages/quality/CapaManagement";
import CapaAnalytics from "./pages/quality/CapaAnalytics";
import Complaints from "./pages/quality/Complaints";
import Audits from "./pages/quality/Audits";
import SupplierScoringPage from "./pages/suppliers/SupplierScoringPage";
import SupplierScoringSettings from "./pages/settings/SupplierScoringSettings";
import ComplaintSettings from "./pages/settings/ComplaintSettings";
import AuditSettings from "./pages/settings/AuditSettings";
import ReceivingInspections from "./pages/qa/ReceivingInspections";
import ReceivingInspection from "./pages/qa/ReceivingInspection";
import Putaway from "./pages/warehouse/Putaway";
import PutawayTask from "./pages/warehouse/PutawayTask";
import IssueRequests from "./pages/production/IssueRequests";
import CreateIssueRequest from "./pages/production/CreateIssueRequest";
import IssueToProduction from "./pages/warehouse/IssueToProduction";
import FulfillIssueRequest from "./pages/warehouse/FulfillIssueRequest";
import WarehouseDashboard from "./pages/warehouse/WarehouseDashboard";
import CycleCounts from "./pages/warehouse/CycleCounts";
import CycleCountEntry from "./pages/warehouse/CycleCountEntry";
import CycleCountReview from "./pages/warehouse/CycleCountReview";
import LotTraceability from "./pages/quality/LotTraceability";
import Transfers from "./pages/warehouse/Transfers";
import PalletBuilding from "./pages/warehouse/PalletBuilding";
import MockRecallDrills from "./pages/quality/MockRecallDrills";
import RecallContacts from "./pages/settings/RecallContacts";
import Tasks from "./pages/tasks/Tasks";
import TaskTemplates from "./pages/settings/TaskTemplates";
import WorkQueue from "./pages/employee/WorkQueue";
import Chat from "./pages/chat/Chat";
import EmployeePortal from "./pages/employee/EmployeePortal";
import MySchedule from "./pages/employee/MySchedule";
import TrainingLog from "./pages/employee/TrainingLog";
import MyTimeOff from "./pages/employee/MyTimeOff";
import PTOManagement from "./pages/hr/PTOManagement";
import MyDocuments from "./pages/employee/MyDocuments";
import HRDocuments from "./pages/hr/HRDocuments";
import TaskAnalytics from "./pages/analytics/TaskAnalytics";
import NCAnalytics from "./pages/quality/NCAnalytics";
import Notifications from "./pages/Notifications";
import NonConformities from "./pages/quality/NonConformities";

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
            <Route path="/update-password" element={<UpdatePassword />} />
            
            {/* Protected routes - wrapped in AppLayout */}
            <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
            
            {/* Inventory routes */}
            <Route path="/inventory/on-hand" element={<AppLayout><MaterialInventory /></AppLayout>} />
            <Route path="/inventory/materials" element={<AppLayout><Materials /></AppLayout>} />
            <Route path="/inventory/products" element={<AppLayout><Products /></AppLayout>} />
            <Route path="/inventory/open-containers" element={<AppLayout><OpenContainers /></AppLayout>} />
            <Route path="/inventory/hold-log" element={<AppLayout><HoldLog /></AppLayout>} />
            <Route path="/inventory/disposal-log" element={<AppLayout><DisposalLog /></AppLayout>} />
            <Route path="/inventory/alerts" element={<AppLayout><InventoryAlerts /></AppLayout>} />
            <Route path="/inventory/3pl" element={<AppLayout><ThreePLDashboard /></AppLayout>} />
            <Route path="/inventory/*" element={<AppLayout><div className="text-center py-12"><h2 className="text-2xl font-bold mb-2">Inventory Module</h2><p className="text-muted-foreground">Coming soon</p></div></AppLayout>} />
            
            {/* Purchasing routes */}
            <Route path="/purchasing/suppliers" element={<AppLayout><Suppliers /></AppLayout>} />
            <Route path="/purchasing/suppliers/scoring" element={<AppLayout><SupplierScoringPage /></AppLayout>} />
            <Route path="/purchasing/orders" element={<AppLayout><PurchaseOrders /></AppLayout>} />
            <Route path="/purchasing/orders/:id" element={<AppLayout><PurchaseOrderDetail /></AppLayout>} />
            <Route path="/purchasing/receiving" element={<AppLayout><Receiving /></AppLayout>} />
            <Route path="/purchasing/receiving/new" element={<AppLayout><Receiving /></AppLayout>} />
            <Route path="/purchasing/*" element={<AppLayout><div className="text-center py-12"><h2 className="text-2xl font-bold mb-2">Purchasing Module</h2><p className="text-muted-foreground">Coming soon</p></div></AppLayout>} />
            
            {/* Settings routes - restricted to admin, manager, supervisor, hr */}
            <Route path="/settings" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><SettingsHub /></RequireRole></AppLayout>} />
            <Route path="/settings/machines" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><Machines /></RequireRole></AppLayout>} />
            <Route path="/settings/locations" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><Locations /></RequireRole></AppLayout>} />
            <Route path="/settings/sub-categories" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><SubCategories /></RequireRole></AppLayout>} />
            <Route path="/settings/document-requirements" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><DocumentRequirements /></RequireRole></AppLayout>} />
            <Route path="/settings/units" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><UnitsOfMeasure /></RequireRole></AppLayout>} />
            <Route path="/settings/departments" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><Departments /></RequireRole></AppLayout>} />
            <Route path="/settings/material-names" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><ListedMaterialNames /></RequireRole></AppLayout>} />
            <Route path="/settings/material-name-categories" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><MaterialNameCategories /></RequireRole></AppLayout>} />
            <Route path="/settings/users" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><UserManagement /></RequireRole></AppLayout>} />
            <Route path="/settings/permissions" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><RolePermissions /></RequireRole></AppLayout>} />
            <Route path="/settings/import-export" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><ImportExport /></RequireRole></AppLayout>} />
            <Route path="/settings/templates" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><DocumentTemplatesPage /></RequireRole></AppLayout>} />
            <Route path="/settings/labels" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><LabelTemplates /></RequireRole></AppLayout>} />
            <Route path="/settings/company" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><CompanySettings /></RequireRole></AppLayout>} />
            <Route path="/settings/email" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><EmailSettings /></RequireRole></AppLayout>} />
            <Route path="/settings/fixed-costs" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><FixedCosts /></RequireRole></AppLayout>} />
            <Route path="/settings/gl-accounts" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><GLAccounts /></RequireRole></AppLayout>} />
            <Route path="/settings/period-close" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><PeriodClose /></RequireRole></AppLayout>} />
            <Route path="/settings/xero" element={<XeroConfiguration />} />
            <Route path="/settings/category-gl-defaults" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><CategoryGLDefaults /></RequireRole></AppLayout>} />
            <Route path="/settings/product-categories" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><ProductCategories /></RequireRole></AppLayout>} />
            <Route path="/settings/packaging-indicators" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><PackagingIndicators /></RequireRole></AppLayout>} />
            <Route path="/settings/container-sizes" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><ContainerSizes /></RequireRole></AppLayout>} />
            <Route path="/settings/quality-tests" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><QualityTests /></RequireRole></AppLayout>} />
            <Route path="/settings/qa-approval-rules" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><QAApprovalRules /></RequireRole></AppLayout>} />
            <Route path="/settings/supplier-scoring" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><SupplierScoringSettings /></RequireRole></AppLayout>} />
            <Route path="/settings/complaints" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><ComplaintSettings /></RequireRole></AppLayout>} />
            <Route path="/settings/audits" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><AuditSettings /></RequireRole></AppLayout>} />
            <Route path="/settings/recall-contacts" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><RecallContacts /></RequireRole></AppLayout>} />
            <Route path="/settings/task-templates" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><TaskTemplates /></RequireRole></AppLayout>} />
            <Route path="/settings/production-lines" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><ProductionLinesSettings /></RequireRole></AppLayout>} />
            <Route path="/settings/production-stages" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><ProductionStagesSettings /></RequireRole></AppLayout>} />
            <Route path="/settings/daily-production-targets" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><DailyProductionTargets /></RequireRole></AppLayout>} />
            <Route path="/settings/price-sheets" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><PriceSheets /></RequireRole></AppLayout>} />
            <Route path="/settings/price-sheets/:id" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><PriceSheetDetail /></RequireRole></AppLayout>} />
            <Route path="/settings/*" element={<AppLayout><RequireRole allowedRoles={['admin', 'manager', 'supervisor', 'hr']}><SettingsHub /></RequireRole></AppLayout>} />
            
            {/* Other placeholder routes */}
            {/* Sales routes */}
            <Route path="/sales/customers" element={<AppLayout><Customers /></AppLayout>} />
            <Route path="/sales/orders" element={<AppLayout><Orders /></AppLayout>} />
            <Route path="/sales/orders/:id" element={<AppLayout><OrderDetail /></AppLayout>} />
            <Route path="/sales/invoices" element={<AppLayout><Invoices /></AppLayout>} />
            <Route path="/sales/payments" element={<AppLayout><Payments /></AppLayout>} />
            <Route path="/sales/returns" element={<AppLayout><Returns /></AppLayout>} />
            <Route path="/sales/customer-pricing" element={<AppLayout><CustomerPricing /></AppLayout>} />
            <Route path="/sales/fulfillment-reports" element={<AppLayout><OrderFulfillmentReports /></AppLayout>} />
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
            {/* Manufacturing routes */}
            <Route path="/manufacturing/dashboard" element={<AppLayout><ProductionDashboard /></AppLayout>} />
            <Route path="/manufacturing/production" element={<AppLayout><ProductionExecution /></AppLayout>} />
            <Route path="/manufacturing/lots" element={<AppLayout><ManufacturingLots /></AppLayout>} />
            <Route path="/manufacturing/lots/new" element={<AppLayout><CreateManufacturingLot /></AppLayout>} />
            <Route path="/manufacturing/lots/:id" element={<AppLayout><LotDetail /></AppLayout>} />
            <Route path="/manufacturing/recipes" element={<AppLayout><Recipes /></AppLayout>} />
            <Route path="/manufacturing/recipes/:id" element={<AppLayout><RecipeDetail /></AppLayout>} />
            <Route path="/manufacturing/shop-floor" element={<AppLayout><ShopFloor /></AppLayout>} />
            <Route path="/manufacturing/shop-floor/:workOrderId" element={<AppLayout><ShopFloorWorkOrder /></AppLayout>} />
            <Route path="/manufacturing/scheduler" element={<AppLayout><ProductionScheduler /></AppLayout>} />
            {/* Employee Scheduler consolidated to /scheduling/employees */}
            <Route path="/manufacturing/qa-tests" element={<BatchQATests />} />
            
            {/* Production Issue Requests */}
            <Route path="/production/issue-requests" element={<AppLayout><IssueRequests /></AppLayout>} />
            <Route path="/production/issue-requests/new" element={<AppLayout><CreateIssueRequest /></AppLayout>} />
            
            <Route
              path="/manufacturing/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Manufacturing Module</h2>
                    <p className="text-muted-foreground">Coming soon</p>
                  </div>
                </AppLayout>
              }
            />
            {/* Quality routes */}
            <Route path="/quality/dashboard" element={<AppLayout><QADashboard /></AppLayout>} />
            <Route path="/quality/work-queue" element={<AppLayout><QAWorkQueue /></AppLayout>} />
            <Route path="/quality/capa" element={<AppLayout><CapaManagement /></AppLayout>} />
            <Route path="/quality/capa-analytics" element={<AppLayout><CapaAnalytics /></AppLayout>} />
            <Route path="/quality/complaints" element={<AppLayout><Complaints /></AppLayout>} />
            <Route path="/quality/audits" element={<AppLayout><Audits /></AppLayout>} />
            <Route path="/quality/override-requests" element={<AppLayout><OverrideRequests /></AppLayout>} />
            <Route path="/quality/lot-traceability" element={<AppLayout><LotTraceability /></AppLayout>} />
            <Route path="/quality/mock-recall-drills" element={<AppLayout><MockRecallDrills /></AppLayout>} />
            <Route path="/quality/non-conformities" element={<AppLayout><NonConformities /></AppLayout>} />
            <Route path="/quality/nc-analytics" element={<AppLayout><NCAnalytics /></AppLayout>} />
            <Route path="/qa/receiving-inspections" element={<AppLayout><ReceivingInspections /></AppLayout>} />
            <Route path="/qa/receiving-inspection/:sessionId" element={<AppLayout><ReceivingInspection /></AppLayout>} />
            <Route
              path="/quality/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Quality & Food Safety Module</h2>
                    <p className="text-muted-foreground">Coming soon</p>
                  </div>
                </AppLayout>
              }
            />
            
            {/* Warehouse routes */}
            <Route path="/warehouse" element={<AppLayout><WarehouseDashboard /></AppLayout>} />
            <Route path="/warehouse/putaway" element={<AppLayout><Putaway /></AppLayout>} />
            <Route path="/warehouse/putaway/:taskId" element={<AppLayout><PutawayTask /></AppLayout>} />
            <Route path="/warehouse/issue-to-production" element={<AppLayout><IssueToProduction /></AppLayout>} />
            <Route path="/warehouse/issue-to-production/:requestId" element={<AppLayout><FulfillIssueRequest /></AppLayout>} />
            <Route path="/warehouse/cycle-counts" element={<AppLayout><CycleCounts /></AppLayout>} />
            <Route path="/warehouse/cycle-counts/:countId" element={<AppLayout><CycleCountEntry /></AppLayout>} />
            <Route path="/warehouse/cycle-counts/:countId/review" element={<AppLayout><CycleCountReview /></AppLayout>} />
            <Route path="/warehouse/pallet-building" element={<AppLayout><PalletBuilding /></AppLayout>} />
            <Route path="/warehouse/transfers" element={<AppLayout><Transfers /></AppLayout>} />
            
            {/* Operations routes */}
            <Route path="/operations/close-day" element={<CloseDay />} />
            {/* Scheduling routes */}
            <Route path="/scheduling/employees" element={<AppLayout><Schedule /></AppLayout>} />
            <Route
              path="/scheduling/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Scheduling Module</h2>
                    <p className="text-muted-foreground">Coming soon</p>
                  </div>
                </AppLayout>
              }
            />
            {/* HR / Team routes */}
            <Route path="/hr/team" element={<AppLayout><TeamRoster /></AppLayout>} />
            <Route path="/hr/team/:id" element={<AppLayout><EmployeeDetail /></AppLayout>} />
            <Route path="/employees/directory" element={<AppLayout><TeamRoster /></AppLayout>} />
            <Route path="/employees/*" element={<AppLayout><TeamRoster /></AppLayout>} />
            <Route path="/reports/profit-loss" element={<AppLayout><ProfitLoss /></AppLayout>} />
            <Route
              path="/reports/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Reports & KPIs Module</h2>
                    <p className="text-muted-foreground">Coming soon</p>
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
            <Route path="/kiosk/timeclock" element={<TimeClockKiosk />} />
            <Route path="/kiosk/delivery" element={<DeliveryDriver />} />
            <Route path="/hr/payroll" element={<AppLayout><PayrollExport /></AppLayout>} />
            
            {/* Chat route */}
            <Route path="/chat" element={<AppLayout><Chat /></AppLayout>} />
            {/* Tasks */}
            <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
            
            {/* Employee Portal routes */}
            <Route path="/my" element={<AppLayout><EmployeePortal /></AppLayout>} />
            <Route path="/my/work-queue" element={<AppLayout><WorkQueue /></AppLayout>} />
            <Route path="/my/schedule" element={<AppLayout><MySchedule /></AppLayout>} />
            <Route path="/my/time-off" element={<AppLayout><MyTimeOff /></AppLayout>} />
            <Route path="/hr/pto" element={<AppLayout><PTOManagement /></AppLayout>} />
            <Route path="/hr/documents" element={<AppLayout><HRDocuments /></AppLayout>} />
            <Route path="/my/training" element={<AppLayout><TrainingLog /></AppLayout>} />
            <Route path="/my/documents" element={<AppLayout><MyDocuments /></AppLayout>} />
            
            {/* Analytics */}
            <Route path="/analytics/tasks" element={<AppLayout><TaskAnalytics /></AppLayout>} />
            
            {/* Notifications */}
            <Route path="/notifications" element={<AppLayout><Notifications /></AppLayout>} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
