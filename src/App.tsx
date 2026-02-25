import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import Profile from './components/Profile/Profile';
import IntroAnimation from './components/IntroAnimation/IntroAnimation';
import AppLayout from './components/Layout/AppLayout/AppLayout';
import Home from './pages/Home';
import DocumentList from './components/Documents/DocumentList/DocumentList';
import DocumentDetail from './components/Documents/DocumentDetail/DocumentDetail';
import DocumentUpload from './components/Documents/DocumentUpload/DocumentUpload';
import UserPermissionManagement from './components/UserPermissionManagement/UserPermissionManagement';
import FormManagement from './components/FormManagement/FormManagement';
import FormBuilder from './components/FormBuilder/FormBuilder';
import ClientManagement from './components/ClientManagement/ClientManagement';
import ClientDetail from './components/ClientManagement/ClientDetail';
import OrganisationManagement from './components/OrganisationManagement/OrganisationManagement';
import DocumentTemplate from './components/DocumentTemplate/DocumentTemplate';
import CreateTemplate from './components/DocumentTemplate/TemplateManagement/CreateTemplate';
import Settings from './components/Settings/Settings';
import SOPListing from './components/SOP/SOPListing/SOPListing';
import CreateSOP from './components/SOP/SOPManagement/CreateSOP';
import PublicShare from './components/PublicShare/PublicShare';
import ComingSoon from './components/Common/ComingSoon';
import { FileSearch } from 'lucide-react';
import ActivityLogPage from './components/ActivityLog/ActivityLog';
import ProtectedRoute from './components/Common/ProtectedRoute';
import authService from './services/auth.service';
import { jwtDecode } from "jwt-decode";

const DefaultComponent: React.FC = () => (
  <div style={{ padding: '24px', textAlign: 'center' }}>
    <h2>Module Not Found</h2>
    <p>This module is not yet implemented.</p>
  </div>
);

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    return hasSeenIntro !== 'true';
  });

  const handleIntroComplete = useCallback(() => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  }, []);
const token = authService.getToken();
const payload: any = token ? jwtDecode(token) : null;
  const isTempSuperadmin = payload?.superadmin && payload?.temp;

  return (
    <BrowserRouter>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      <Routes>
                {/* 🔴 SUPERADMIN TEMP ROUTE */}
        {isTempSuperadmin && (
          <>
            <Route path="/organisations" element={<AppLayout />}>
              <Route index element={<OrganisationManagement />} />
            </Route>

            {/* block everything else */}
            <Route path="*" element={<Navigate to="/organisations" replace />} />
          </>
        )}
          {!isTempSuperadmin && (
          <>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/role-selection" element={<RoleSelection />} />

        {/* Public Sharing Route */}
        <Route path="/public/share/:token" element={<PublicShare />} />

        {/* Direct module routes */}
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Home />} />
        </Route>
        <Route path="/users-permissions" element={<ProtectedRoute moduleRoute="/users-permissions" />}>
          <Route element={<AppLayout />}>
            <Route index element={<UserPermissionManagement />} />
          </Route>
        </Route>
        <Route path="/documents" element={<ProtectedRoute moduleRoute="/documents" />}>
          <Route element={<AppLayout />}>
            <Route index element={<DocumentList />} />
            <Route path="upload" element={<DocumentUpload />} />
            <Route path=":id" element={<DocumentDetail />} />
          </Route>
        </Route>
        <Route path="/templates" element={<ProtectedRoute moduleRoute="/templates" />}>
          <Route element={<AppLayout />}>
            <Route index element={<DocumentTemplate />} />
            <Route path="create" element={<CreateTemplate />} />
            <Route path="edit/:id" element={<CreateTemplate />} />
          </Route>
        </Route>
        <Route path="/sops" element={<ProtectedRoute moduleRoute="/sops" />}>
          <Route element={<AppLayout />}>
            <Route index element={<SOPListing />} />
            <Route path="create" element={<CreateSOP />} />
            <Route path="edit/:id" element={<CreateSOP />} />
          </Route>
        </Route>
        <Route path="/clients" element={<ProtectedRoute moduleRoute="/clients" />}>
          <Route element={<AppLayout />}>
            <Route index element={<ClientManagement />} />
            <Route path=":id" element={<ClientDetail />} />
          </Route>
        </Route>
        <Route path="/organisations" element={<ProtectedRoute moduleRoute="/organisations" />}>
          <Route element={<AppLayout />}>
            <Route index element={<OrganisationManagement />} />
          </Route>
        </Route>
        <Route path="/settings" element={<ProtectedRoute moduleRoute="/settings" />}>
          <Route element={<AppLayout />}>
            <Route index element={<Settings />} />
          </Route>
        </Route>
        <Route path="/profile" element={<AppLayout />}>
          <Route index element={<Profile />} />
        </Route>
        <Route path="/forms" element={<ProtectedRoute moduleRoute="/forms" />}>
          <Route element={<AppLayout />}>
            <Route index element={<FormManagement />} />
            <Route path="create" element={<FormBuilder />} />
            <Route path=":id" element={<FormBuilder />} />
          </Route>
        </Route>
        <Route path="/activity-logs" element={<ProtectedRoute moduleRoute="/activity-logs" />}>
          <Route element={<AppLayout />}>
            <Route index element={<ActivityLogPage />} />
          </Route>
        </Route>
        </>
        )}

      </Routes>
    </BrowserRouter>
  );
};

export default App;