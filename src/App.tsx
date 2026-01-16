import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Login from './pages/Login';
import IntroAnimation from './components/IntroAnimation';
import AppLayout from './components/Layout/AppLayout';
import Home from './pages/Home';
import DocumentList from './components/Documents/DocumentList';
import DocumentDetail from './components/Documents/DocumentDetail';
import UserPermissionManagement from './components/UserManagement/UserPermissionManagement';

const DefaultComponent: React.FC = () => (
  <div style={{ padding: '24px', textAlign: 'center' }}>
    <h2>Module Not Found</h2>
    <p>This module is not yet implemented.</p>
  </div>
);

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(true);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <>
            {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
            {!showIntro && <Login />}
          </>
        } />

        {/* Direct module routes */}
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Home />} />
        </Route>
        <Route path="/users-permissions" element={<AppLayout />}>
          <Route index element={<UserPermissionManagement />} />
        </Route>
        <Route path="/documents" element={<AppLayout />}>
          <Route index element={<DocumentList />} />
          <Route path=":id" element={<DocumentDetail />} />
        </Route>
        <Route path="/templates" element={<AppLayout />}>
          <Route index element={<DefaultComponent />} />
        </Route>
        <Route path="/sops" element={<AppLayout />}>
          <Route index element={<DefaultComponent />} />
        </Route>
        <Route path="/clients" element={<AppLayout />}>
          <Route index element={<DefaultComponent />} />
        </Route>
        <Route path="/settings" element={<AppLayout />}>
          <Route index element={<DefaultComponent />} />
        </Route>
        <Route path="/profile" element={<AppLayout />}>
          <Route index element={<DefaultComponent />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;