const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: { id: string; name: string };

  // 🔥 ADD THESE
  is_client?: boolean;
  client_id?: string | null;
}

export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  requires_role_selection?: boolean;
  temp_token?: string;
  roles?: Array<{ id: string; name: string }>;
  user: AuthUser;
}

export interface RoleSelectionRequest {
  email: string;
  role_id: string;
  remember_me?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ApiError {
  error: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  new_password: string;
}

class AuthService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || error.detail || 'Login failed');
    }

    const result = await response.json();

    // Save user ID if available
    if (result.user?.id) {
      this.saveUserId(result.user.id);
    }

    return result;
  }

  async selectRole(data: RoleSelectionRequest, tempToken?: string): Promise<LoginResponse> {
    const token = tempToken || this.getToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/select-role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.error || 'Role selection failed');
    }

    const result = await response.json();

    // Save user ID if available
    if (result.user?.id) {
      this.saveUserId(result.user.id);
    }

    return result;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || error.detail || 'Failed to send reset email');
    }

    return response.json();
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || error.detail || 'Failed to reset password');
    }

    return response.json();
  }

  saveToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem('refresh_token', token);
  }

  saveUser(user: LoginResponse['user']): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  saveUserId(userId: string): void {
    localStorage.setItem('user_id', userId);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUser(): LoginResponse['user'] | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  getCurrentUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });

    if (!response.ok) {
      this.logout();
      throw new Error('Failed to refresh token');
    }

    const data: LoginResponse = await response.json();
    if (data.access_token) {
      this.saveToken(data.access_token);
      if (data.refresh_token) {
        this.saveRefreshToken(data.refresh_token);
      }
      return data.access_token;
    }
    throw new Error('No access token in response');
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
  }
}

const authService = new AuthService();
export default authService;
