import React from 'react';
import Home from '../pages/Home';
import DocumentList from '../components/Documents/DocumentList/DocumentList';
import UserPermissionManagement from '../components/UserPermissionManagement/UserPermissionManagement';
import ClientManagement from '../components/ClientManagement/ClientManagement';

function DefaultComponent() {
  return React.createElement(
    'div',
    { style: { padding: '24px', textAlign: 'center' } },
    React.createElement('h2', null, 'Module Not Found'),
    React.createElement('p', null, 'This module is not yet implemented.')
  );
}

const componentRegistry: Record<string, React.ComponentType<any>> = {
  '/dashboard': Home,
  '/documents': DocumentList,
  '/templates': DefaultComponent,
  '/sops': DefaultComponent,
  '/clients': ClientManagement,
  '/users-permissions': UserPermissionManagement,
  '/settings': DefaultComponent,
  '/profile': DefaultComponent,
};

export function getComponentForRoute(route: string): React.ComponentType<any> {
  return componentRegistry[route] || DefaultComponent;
}