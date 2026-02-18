import authService from '../services/auth.service';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

export const apiClient = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = authService.getToken();
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
      const newToken = await authService.refreshAccessToken();
      processQueue(null, newToken);
      isRefreshing = false;

      const newHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
      response = await fetch(url, { ...options, headers: newHeaders });
    } catch (error) {
      processQueue(error, null);
      isRefreshing = false;
      authService.logout();
      window.location.href = '/login';
      throw error;
    }
  }

  return response;
};

export default apiClient;
