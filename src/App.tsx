import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy-loaded page components
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const VehiclesList = lazy(() => import("@/pages/VehiclesList"));
const VehicleDetail = lazy(() => import("@/pages/VehicleDetail"));
const CustomersList = lazy(() => import("@/pages/CustomersList"));
const CustomerDetail = lazy(() => import("@/pages/CustomerDetail"));
const RentalsList = lazy(() => import("@/pages/RentalsList"));
const RentalDetail = lazy(() => import("@/pages/RentalDetail"));
const PaymentsList = lazy(() => import("@/pages/PaymentsList"));
const PaymentDetail = lazy(() => import("@/pages/PaymentDetail"));
const ChargesList = lazy(() => import("@/pages/ChargesList"));
const PlatesListEnhanced = lazy(() => import("@/pages/PlatesListEnhanced"));
const PlateDetail = lazy(() => import("@/pages/PlateDetail"));
const PLDashboard = lazy(() => import("@/pages/PLDashboard"));
const MonthlyPLDrilldown = lazy(() => import("@/pages/MonthlyPLDrilldown"));
const CreateRental = lazy(() => import("@/pages/CreateRental"));
const RemindersPageEnhanced = lazy(() => import("@/pages/RemindersPageEnhanced"));
const ReminderSettings = lazy(() => import("@/pages/ReminderSettings"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));
const FinesList = lazy(() => import("@/pages/FinesList"));
const CreateFine = lazy(() => import("@/pages/CreateFine"));
const FineDetail = lazy(() => import("@/pages/FineDetail"));
const RemindersPageNew = lazy(() => import("@/pages/RemindersPageNew"));
const InsuranceListEnhanced = lazy(() => import("@/pages/InsuranceListEnhanced"));
const InvoicesList = lazy(() => import("@/pages/InvoicesList"));
const DocumentsList = lazy(() => import("@/pages/DocumentsList"));
const Login = lazy(() => import("@/pages/Login"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const UsersManagement = lazy(() => import("@/pages/UsersManagement"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function App() {
  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-global-search"));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/" element={<AuthGuard><Layout><Dashboard /></Layout></AuthGuard>} />
                      <Route path="/vehicles" element={<AuthGuard><Layout><VehiclesList /></Layout></AuthGuard>} />
                      <Route path="/vehicles/:id" element={<AuthGuard><Layout><VehicleDetail /></Layout></AuthGuard>} />
                      <Route path="/customers" element={<AuthGuard><Layout><CustomersList /></Layout></AuthGuard>} />
                      <Route path="/customers/:id" element={<AuthGuard><Layout><CustomerDetail /></Layout></AuthGuard>} />
                      <Route path="/rentals" element={<AuthGuard><Layout><RentalsList /></Layout></AuthGuard>} />
                      <Route path="/rentals/new" element={<AuthGuard><Layout><CreateRental /></Layout></AuthGuard>} />
                      <Route path="/rentals/:id" element={<AuthGuard><Layout><RentalDetail /></Layout></AuthGuard>} />
                      <Route path="/payments" element={<AuthGuard><Layout><PaymentsList /></Layout></AuthGuard>} />
                      <Route path="/payments/:id" element={<AuthGuard><Layout><PaymentDetail /></Layout></AuthGuard>} />
                      <Route path="/invoices" element={<AuthGuard><Layout><InvoicesList /></Layout></AuthGuard>} />
                      <Route path="/documents" element={<AuthGuard><Layout><DocumentsList /></Layout></AuthGuard>} />
                      <Route path="/charges" element={<AuthGuard><Layout><ChargesList /></Layout></AuthGuard>} />
                      <Route path="/plates" element={<AuthGuard><Layout><PlatesListEnhanced /></Layout></AuthGuard>} />
                      <Route path="/plates/:id" element={<AuthGuard><Layout><PlateDetail /></Layout></AuthGuard>} />
                      <Route path="/pl-dashboard" element={<AuthGuard><Layout><PLDashboard /></Layout></AuthGuard>} />
                      <Route path="/pl-dashboard/monthly/:month" element={<AuthGuard><Layout><MonthlyPLDrilldown /></Layout></AuthGuard>} />
                      <Route path="/reminders-new" element={<AuthGuard><Layout><RemindersPageNew /></Layout></AuthGuard>} />
                      <Route path="/reminders" element={<AuthGuard><Layout><RemindersPageEnhanced /></Layout></AuthGuard>} />
                      <Route path="/settings/reminders" element={<AuthGuard><Layout><ReminderSettings /></Layout></AuthGuard>} />
                      <Route path="/reports" element={<AuthGuard><Layout><Reports /></Layout></AuthGuard>} />
                      <Route path="/settings" element={<AuthGuard><Layout><Settings /></Layout></AuthGuard>} />
                      <Route path="/settings/users" element={<AuthGuard requiredRoles={['head_admin']}><Layout><UsersManagement /></Layout></AuthGuard>} />
                      <Route path="/fines" element={<AuthGuard><Layout><FinesList /></Layout></AuthGuard>} />
                      <Route path="/fines/new" element={<AuthGuard><Layout><CreateFine /></Layout></AuthGuard>} />
                      <Route path="/fines/:id" element={<AuthGuard><Layout><FineDetail /></Layout></AuthGuard>} />
                      <Route path="/insurance" element={<AuthGuard><Layout><InsuranceListEnhanced /></Layout></AuthGuard>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </ThemeProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
