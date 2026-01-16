const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

const refreshToken = async (): Promise<string> => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) {
    throw new Error('No refresh token');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${refresh}` }
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data.access_token;
  }
  throw new Error('No access token in response');
};

export const apiClient = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        const newHeaders = { ...headers, 'Authorization': `Bearer ${token}` };
        return fetch(url, { ...options, headers: newHeaders });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshToken();
      processQueue(null, newToken);
      isRefreshing = false;
      
      const newHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
      response = await fetch(url, { ...options, headers: newHeaders });
    } catch (error) {
      processQueue(error, null);
      isRefreshing = false;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw error;
    }
  }

  return response;
};

export default apiClient;
