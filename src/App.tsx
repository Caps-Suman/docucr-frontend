import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

  const handleIntroComplete = () => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  };

  React.useEffect(() => {
    // Reset intro flag when component mounts if needed
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    if (hasSeenIntro !== 'true') {
      setShowIntro(true);
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <>
            <Login />
            {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
          </>
        } />
        <Route path="/login" element={
          <>
            <Login />
            {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
          </>
        } />
        <Route path="/role-selection" element={<RoleSelection />} />

        {/* Public Sharing Route */}
        <Route path="/public/share/:token" element={<PublicShare />} />

        {/* Direct module routes */}
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Home />} />
        </Route>
        <Route path="/users-permissions" element={<AppLayout />}>
          <Route index element={<UserPermissionManagement />} />
        </Route>
        <Route path="/documents" element={<AppLayout />}>
          <Route index element={<DocumentList />} />
          <Route path="upload" element={<DocumentUpload />} />
          <Route path=":id" element={<DocumentDetail />} />
        </Route>
        <Route path="/templates" element={<AppLayout />}>
          <Route index element={<DocumentTemplate />} />
          <Route path="create" element={<CreateTemplate />} />
          <Route path="edit/:id" element={<CreateTemplate />} />
        </Route>
        <Route path="/sops" element={<AppLayout />}>
          <Route index element={<SOPListing />} />
          <Route path="create" element={<CreateSOP />} />
          <Route path="edit/:id" element={<CreateSOP />} />
        </Route>
        <Route path="/clients" element={<AppLayout />}>
          <Route index element={<ClientManagement />} />
        </Route>
        <Route path="/organisations" element={<AppLayout />}>
          <Route index element={<OrganisationManagement />} />
        </Route>
        <Route path="/settings" element={<AppLayout />}>
          <Route index element={<Settings />} />
        </Route>
        <Route path="/profile" element={<AppLayout />}>
          <Route index element={<Profile />} />
        </Route>
        <Route path="/forms" element={<AppLayout />}>
          <Route index element={<FormManagement />} />
          <Route path="create" element={<FormBuilder />} />
          <Route path=":id" element={<FormBuilder />} />
        </Route>
        <Route path="/activity-logs" element={<AppLayout />}>
          <Route index element={<ActivityLogPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;