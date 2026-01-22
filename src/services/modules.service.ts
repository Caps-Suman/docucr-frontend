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
  async getUserModules(email: string): Promise<Module[]> {
    const response = await apiClient(`${API_BASE_URL}/api/modules/user-modules?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      throw new Error('Failed to fetch user modules');
    }

    const data: ModulesResponse = await response.json();
    return data.modules;
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