import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PermissionProvider } from './context/PermissionContext';

const root = ReactDOM.createRoot(document.getElementById('root')!);
// root.render(<App />);
root.render(
  <PermissionProvider>
    <App />
  </PermissionProvider>
);