import React, { createContext, useContext, useMemo, useEffect, useState } from "react";
import authService from "../services/auth.service";

type PermissionMap = Record<string, string[]>;

interface PermissionContextType {
  permissions: PermissionMap;
  can: (module: string, privilege: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionMap>({});

  useEffect(() => {
    const syncPermissions = () => {
      const user = authService.getUser();

      const rawPerms = user?.permissions ?? {};

      // 🔥 NORMALIZE ONCE
      const normalized: PermissionMap = Object.fromEntries(
        Object.entries(rawPerms).map(([module, perms]) => [
          module.toUpperCase(),
          perms.map(p => p.toUpperCase()),
        ])
      );

      setPermissions(normalized);
    };

    syncPermissions();
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
