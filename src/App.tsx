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
import TrainingPortal from "./pages/TrainingPortal";
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
import NotificationsPage from "./pages/Notifications";
import AuditLogsPage from "./pages/AuditLogs";

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
    if (user?.role === 'station_manager' || user?.role === 'area_manager') return <Navigate to="/station-manager" replace />;
    if (user?.role === 'kiosk') return <Navigate to="/attendance/kiosk" replace />;
    if (user?.role === 'training_manager') return <Navigate to="/training-portal" replace />;
    // admin and hr both go to dashboard
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
    <Route path="/setup" element={<SetupPage />} />
    
    {/* Admin + HR routes */}
    <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Index /></ProtectedRoute>} />
    <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Employees /></ProtectedRoute>} />
     <Route path="/employees/:id" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><EmployeeDetails /></ProtectedRoute>} />
     <Route path="/employees/:id/view" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><EmployeeDetails /></ProtectedRoute>} />
    <Route path="/departments" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Departments /></ProtectedRoute>} />
    <Route path="/leaves" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Leaves /></ProtectedRoute>} />
    <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Attendance /></ProtectedRoute>} />
    <Route path="/performance" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Performance /></ProtectedRoute>} />
    <Route path="/training" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Training /></ProtectedRoute>} />
    <Route path="/loans" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Loans /></ProtectedRoute>} />
    {/* Salary routes: admin only - HR cannot access */}
    <Route path="/salaries" element={<ProtectedRoute allowedRoles={['admin']}><Salaries /></ProtectedRoute>} />
    <Route path="/salary-reports" element={<ProtectedRoute allowedRoles={['admin']}><SalaryReports /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Reports /></ProtectedRoute>} />
    <Route path="/recruitment" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Recruitment /></ProtectedRoute>} />
    <Route path="/assets" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Assets /></ProtectedRoute>} />
    <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
    <Route path="/groups" element={<Navigate to="/users" replace />} />
    <Route path="/roles" element={<Navigate to="/users" replace />} />
    <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SiteSettingsPage /></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Documents /></ProtectedRoute>} />
    <Route path="/uniforms" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Uniforms /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><NotificationsPage /></ProtectedRoute>} />
    <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogsPage /></ProtectedRoute>} />
    
    {/* Employee portal */}
    <Route path="/employee-portal" element={<ProtectedRoute allowedRoles={['employee']}><EmployeePortal /></ProtectedRoute>} />
    
    {/* Station manager portal */}
    <Route path="/station-manager" element={<ProtectedRoute allowedRoles={['station_manager', 'area_manager']}><StationManagerPortal /></ProtectedRoute>} />
    
    {/* Training portal */}
    <Route path="/training-portal" element={<ProtectedRoute allowedRoles={['training_manager']}><TrainingPortal /></ProtectedRoute>} />
    
    {/* QR Attendance */}
    <Route path="/attendance/scan" element={<ProtectedRoute allowedRoles={['employee', 'station_manager', 'area_manager', 'admin', 'hr']}><AttendanceScan /></ProtectedRoute>} />
    <Route path="/attendance/kiosk" element={<ProtectedRoute allowedRoles={['admin', 'station_manager', 'area_manager', 'kiosk']}><AttendanceKiosk /></ProtectedRoute>} />
    <Route path="/attendance/admin" element={<ProtectedRoute allowedRoles={['admin', 'hr']}><AttendanceAdmin /></ProtectedRoute>} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
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
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
