import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Submodule {
  id: string;
  name: string;
  label: string;
  route_key: string;
  display_order: number;
  privileges: string[];
}

export interface Module {
  id: string;
  name: string;
  label: string;
  description: string;
  route: string;
  icon: string;
  category: string;
  display_order: number;
  color_from: string;
  color_to: string;
  privileges: string[];
  submodules: Submodule[];
}

export interface ModulesResponse {
  modules: Module[];
}

class ModulesService {
  private modulesPromise: Promise<Module[]> | null = null;
  private currentEmail: string | null = null;

  async getUserModules(email: string): Promise<Module[]> {
    // Return cached promise if request is pending or completed for same email
    if (this.modulesPromise && this.currentEmail === email) {
      return this.modulesPromise;
    }

    this.currentEmail = email;
    
    // Create and cache the promise
    this.modulesPromise = (async () => {
      try {
        const response = await apiClient(`${API_BASE_URL}/api/modules/user-modules?email=${encodeURIComponent(email)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch user modules');
        }

        const data: ModulesResponse = await response.json();
        return data.modules;
      } catch (error) {
        // Clear cache on error so retry is possible
        this.modulesPromise = null;
        this.currentEmail = null;
        throw error;
      }
    })();

    return this.modulesPromise;
  }

  async getAllModules(): Promise<Module[]> {
    const response = await apiClient(`${API_BASE_URL}/api/modules`);

    if (!response.ok) {
      throw new Error('Failed to fetch modules');
    }

    const data: ModulesResponse = await response.json();
    return data.modules;
  }

  hasPrivilege(module: Module, privilege: string): boolean {
    return module.privileges.includes(privilege);
  }

  getModulesByCategory(modules: Module[]): Record<string, Module[]> {
    return modules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {} as Record<string, Module[]>);
  }
}

const modulesService = new ModulesService();
export default modulesService;