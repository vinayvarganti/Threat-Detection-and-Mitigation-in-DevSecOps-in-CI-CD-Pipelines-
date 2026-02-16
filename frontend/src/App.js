import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Public Pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import FeaturesPage from './pages/public/FeaturesPage';
import ArchitecturePage from './pages/public/ArchitecturePage';
import ContactPage from './pages/public/ContactPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Dashboard Pages
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import ProjectList from './pages/dashboard/ProjectList';
import ProjectUpload from './pages/dashboard/ProjectUpload';
import PipelineConfig from './pages/dashboard/PipelineConfig';
import SecurityScan from './pages/dashboard/SecurityScan';
import VulnerabilityReports from './pages/dashboard/VulnerabilityReports';
import ThreatPrediction from './pages/dashboard/ThreatPrediction';
import MitigationActions from './pages/dashboard/MitigationActions';
import LogsMonitoring from './pages/dashboard/LogsMonitoring';
import ProfileSettings from './pages/dashboard/ProfileSettings';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ProjectManagement from './pages/admin/ProjectManagement';
import SecurityPolicyManagement from './pages/admin/SecurityPolicyManagement';
import AuditTrails from './pages/admin/AuditTrails';

// Components
import PublicLayout from './components/layout/PublicLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="architecture" element={<ArchitecturePage />} />
        <Route path="contact" element={<ContactPage />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={!user ? <ForgotPasswordPage /> : <Navigate to="/dashboard" />} />

      {/* Protected Dashboard Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="upload" element={<ProjectUpload />} />
        <Route path="pipeline" element={<PipelineConfig />} />
        <Route path="scan" element={<SecurityScan />} />
        <Route path="vulnerabilities" element={<VulnerabilityReports />} />
        <Route path="threats" element={<ThreatPrediction />} />
        <Route path="mitigations" element={<MitigationActions />} />
        <Route path="logs" element={<LogsMonitoring />} />
        <Route path="profile" element={<ProfileSettings />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="projects" element={<ProjectManagement />} />
        <Route path="policies" element={<SecurityPolicyManagement />} />
        <Route path="audit" element={<AuditTrails />} />
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;