import authService from '../services/auth.service';

const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:8000';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export const fetchWithAuth = async (url: string, options: FetchOptions = {}): Promise<Response> => {
  const { skipAuth, ...fetchOptions } = options;
  
  let token = authService.getToken();
  
  if (!skipAuth && !token) {
    throw new Error('No authentication token found');
  }
  
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };
  
  if (!skipAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...fetchOptions,
    headers,
  });
  
  // If 401 and not skipping auth, try to refresh token
  if (response.status === 401 && !skipAuth) {
    try {
      token = await authService.refreshAccessToken();
      headers['Authorization'] = `Bearer ${token}`;
      
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...fetchOptions,
        headers,
      });
    } catch (error) {
      // Refresh failed, redirect to login
      authService.logout();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }
  
  return response;
};
