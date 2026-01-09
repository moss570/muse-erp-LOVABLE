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
            <Route
              path="/"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            
            {/* Placeholder routes for navigation */}
            <Route
              path="/inventory/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Inventory Module</h2>
                    <p className="text-muted-foreground">Coming in Phase 2</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/production/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Production Module</h2>
                    <p className="text-muted-foreground">Coming in Phase 2</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/purchasing/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Purchasing Module</h2>
                    <p className="text-muted-foreground">Coming in Phase 2</p>
                  </div>
                </AppLayout>
              }
            />
            <Route
              path="/sales"
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
              path="/settings/*"
              element={
                <AppLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-2">Settings</h2>
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
