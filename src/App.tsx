import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SalaryDataProvider } from "@/contexts/SalaryDataContext";
import { PayrollDataProvider } from "@/contexts/PayrollDataContext";
import { EmployeeDataProvider } from "@/contexts/EmployeeDataContext";
import { AttendanceDataProvider } from "@/contexts/AttendanceDataContext";
import { PortalDataProvider } from "@/contexts/PortalDataContext";
import { LoanDataProvider } from "@/contexts/LoanDataContext";
import { UniformDataProvider } from "@/contexts/UniformDataContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PerformanceDataProvider } from "@/contexts/PerformanceDataContext";
import LoginPage from "./pages/LoginPage";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import EmployeeDetails from "./pages/EmployeeDetails";
import Leaves from "./pages/Leaves";
import Attendance from "./pages/Attendance";
import Performance from "./pages/Performance";
import EmployeePortal from "./pages/EmployeePortal";
import StationManagerPortal from "./pages/StationManagerPortal";
import Training from "./pages/Training";
import Loans from "./pages/Loans";
import Salaries from "./pages/Salaries";
import Reports from "./pages/Reports";
import SalaryReports from "./pages/SalaryReports";
import Departments from "./pages/Departments";
import Recruitment from "./pages/Recruitment";
import Assets from "./pages/Assets";
import Users from "./pages/Users";
import Groups from "./pages/Groups";
import Roles from "./pages/Roles";
import SiteSettingsPage from "./pages/SiteSettings";
import Documents from "./pages/Documents";
import Uniforms from "./pages/Uniforms";
import NotFound from "./pages/NotFound";
import SetupPage from "./pages/SetupPage";
import AttendanceScan from "./pages/AttendanceScan";
import AttendanceKiosk from "./pages/AttendanceKiosk";
import AttendanceAdmin from "./pages/AttendanceAdmin";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user!.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    if (user?.role === 'employee') return <Navigate to="/employee-portal" replace />;
    if (user?.role === 'station_manager') return <Navigate to="/station-manager" replace />;
    if (user?.role === 'kiosk') return <Navigate to="/attendance/kiosk" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
    <Route path="/setup" element={<SetupPage />} />
    
    {/* Admin routes */}
    <Route path="/" element={<ProtectedRoute allowedRoles={['admin']}><Index /></ProtectedRoute>} />
    <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin']}><Employees /></ProtectedRoute>} />
     <Route path="/employees/:id" element={<ProtectedRoute allowedRoles={['admin']}><EmployeeDetails /></ProtectedRoute>} />
     <Route path="/employees/:id/view" element={<ProtectedRoute allowedRoles={['admin']}><EmployeeDetails /></ProtectedRoute>} />
    <Route path="/departments" element={<ProtectedRoute allowedRoles={['admin']}><Departments /></ProtectedRoute>} />
    <Route path="/leaves" element={<ProtectedRoute allowedRoles={['admin']}><Leaves /></ProtectedRoute>} />
    <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin']}><Attendance /></ProtectedRoute>} />
    <Route path="/performance" element={<ProtectedRoute allowedRoles={['admin']}><Performance /></ProtectedRoute>} />
    <Route path="/training" element={<ProtectedRoute allowedRoles={['admin']}><Training /></ProtectedRoute>} />
    <Route path="/loans" element={<ProtectedRoute allowedRoles={['admin']}><Loans /></ProtectedRoute>} />
    <Route path="/salaries" element={<ProtectedRoute allowedRoles={['admin']}><Salaries /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
    <Route path="/salary-reports" element={<ProtectedRoute allowedRoles={['admin']}><SalaryReports /></ProtectedRoute>} />
    <Route path="/recruitment" element={<ProtectedRoute allowedRoles={['admin']}><Recruitment /></ProtectedRoute>} />
    <Route path="/assets" element={<ProtectedRoute allowedRoles={['admin']}><Assets /></ProtectedRoute>} />
    <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
    <Route path="/groups" element={<Navigate to="/users" replace />} />
    <Route path="/roles" element={<Navigate to="/users" replace />} />
    <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SiteSettingsPage /></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute allowedRoles={['admin']}><Documents /></ProtectedRoute>} />
    <Route path="/uniforms" element={<ProtectedRoute allowedRoles={['admin']}><Uniforms /></ProtectedRoute>} />
    
    {/* Employee portal */}
    <Route path="/employee-portal" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
    
    {/* Station manager portal */}
    <Route path="/station-manager" element={<ProtectedRoute allowedRoles={['station_manager']}><StationManagerPortal /></ProtectedRoute>} />
    
    {/* QR Attendance */}
    <Route path="/attendance/scan" element={<ProtectedRoute allowedRoles={['employee', 'station_manager', 'admin']}><AttendanceScan /></ProtectedRoute>} />
    <Route path="/attendance/kiosk" element={<ProtectedRoute allowedRoles={['admin', 'station_manager', 'kiosk']}><AttendanceKiosk /></ProtectedRoute>} />
    <Route path="/attendance/admin" element={<ProtectedRoute allowedRoles={['admin']}><AttendanceAdmin /></ProtectedRoute>} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <NotificationProvider>
      <AuthProvider>
      <EmployeeDataProvider>
      <SalaryDataProvider>
      <PayrollDataProvider>
      <AttendanceDataProvider>
      <LoanDataProvider>
      <UniformDataProvider>
      <PortalDataProvider>
      <PerformanceDataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
      </PerformanceDataProvider>
      </PortalDataProvider>
      </UniformDataProvider>
      </LoanDataProvider>
      </AttendanceDataProvider>
      </PayrollDataProvider>
      </SalaryDataProvider>
      </EmployeeDataProvider>
      </AuthProvider>
      </NotificationProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
