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
import React, { Suspense } from "react";

const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const Index = React.lazy(() => import("./pages/Index"));
const Employees = React.lazy(() => import("./pages/Employees"));
const EmployeeDetails = React.lazy(() => import("./pages/EmployeeDetails"));
const Leaves = React.lazy(() => import("./pages/Leaves"));
const Attendance = React.lazy(() => import("./pages/Attendance"));
const Performance = React.lazy(() => import("./pages/Performance"));
const EmployeePortal = React.lazy(() => import("./pages/EmployeePortal"));
const StationManagerPortal = React.lazy(() => import("./pages/StationManagerPortal"));
const Training = React.lazy(() => import("./pages/Training"));
const TrainingPortal = React.lazy(() => import("./pages/TrainingPortal"));
const Loans = React.lazy(() => import("./pages/Loans"));
const Salaries = React.lazy(() => import("./pages/Salaries"));
const Reports = React.lazy(() => import("./pages/Reports"));
const SalaryReports = React.lazy(() => import("./pages/SalaryReports"));
const Departments = React.lazy(() => import("./pages/Departments"));
const Recruitment = React.lazy(() => import("./pages/Recruitment"));
const Assets = React.lazy(() => import("./pages/Assets"));
const Users = React.lazy(() => import("./pages/Users"));
const SiteSettingsPage = React.lazy(() => import("./pages/SiteSettings"));
const Documents = React.lazy(() => import("./pages/Documents"));
const Uniforms = React.lazy(() => import("./pages/Uniforms"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const SetupPage = React.lazy(() => import("./pages/SetupPage"));
const AttendanceScan = React.lazy(() => import("./pages/AttendanceScan"));
const AttendanceKiosk = React.lazy(() => import("./pages/AttendanceKiosk"));
const AttendanceAdmin = React.lazy(() => import("./pages/AttendanceAdmin"));
const NotificationsPage = React.lazy(() => import("./pages/Notifications"));
const AuditLogsPage = React.lazy(() => import("./pages/AuditLogs"));

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
  <Suspense fallback={<LoadingScreen />}>
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
  </Suspense>
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
