import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import authService from "../services/auth.service";
import modulesService from "../services/modules.service";

type PermissionMap = Record<string, string[]>;

interface PermissionContextType {
  permissions: PermissionMap;
  can: (module: string, privilege: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionMap>({});

  // useEffect(() => {
  //   const syncPermissions = () => {
  //     const user = authService.getUser();

  //     const rawPerms = user?.permissions ?? {};

  //     const normalized: PermissionMap = Object.fromEntries(
  //       Object.entries(rawPerms).map(([module, perms]) => [
  //         module.toUpperCase(),
  //         perms.map(p => p.toUpperCase()),
  //       ])
  //     );

  //     setPermissions(normalized);
  //   };

  //   syncPermissions();
  //   authService.subscribe(syncPermissions);
  //   return () => authService.unsubscribe(syncPermissions);
  // }, []);

  // amit
  useEffect(() => {
    const syncPermissions = () => {
      const user = authService.getUser();
      const rawPerms = user?.permissions ?? {};

      const normalized: PermissionMap = Object.fromEntries(
        Object.entries(rawPerms).map(([module, perms]) => [
          module.toUpperCase(),
          perms.map(p => p.toUpperCase()),
        ])
      );

      setPermissions(normalized);
    };

    const initialLoad = async () => {
      try {
        const user = authService.getUser();
        if (user?.email) {
          await modulesService.getUserModules(user.email);
        }
      } catch (error) {
        console.error('Failed to load modules:', error);
      } finally {
        syncPermissions();
      }
    };

    initialLoad();

    authService.subscribe(syncPermissions);
    return () => authService.unsubscribe(syncPermissions);
  }, []);

  const can = (module: string, privilege: string): boolean => {
    const moduleKey = module.toUpperCase();
    const priv = privilege.toUpperCase();

    const modulePerms = permissions[moduleKey];
    if (!modulePerms) return false;

    return (
      modulePerms.includes(priv) ||
      modulePerms.includes("ADMIN") ||
      modulePerms.includes("MANAGE")
    );
  };

  const value = useMemo(() => ({ permissions, can }), [permissions]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermission must be used inside PermissionProvider");
  }
  return ctx;
};
