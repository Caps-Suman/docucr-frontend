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

  const isFormData = options.body instanceof FormData;

  const baseHeaders: Record<string, string> = isFormData
  ? {}
  : { 'Content-Type': 'application/json' };

const extraHeaders: Record<string, string> =
  options.headers instanceof Headers
    ? Object.fromEntries(options.headers.entries())
    : Array.isArray(options.headers)
    ? Object.fromEntries(options.headers)
    : options.headers || {};

const headers: Record<string, string> = {
  ...baseHeaders,
  ...extraHeaders,
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

  let body = options.body;

  if (!isFormData && body && typeof body !== "string") {
    body = JSON.stringify(body);
  }

  let response = await fetch(url, { ...options, headers, body });

  if (response.status === 401) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        const newHeaders = {
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
        return fetch(url, { ...options, headers: newHeaders, body });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await authService.refreshAccessToken();
      processQueue(null, newToken);
      isRefreshing = false;

      const newHeaders = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(newToken && { 'Authorization': `Bearer ${newToken}` })
      };

      response = await fetch(url, { ...options, headers: newHeaders, body });
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
 
// export const apiClient = async (url: string, options: RequestInit = {}): Promise<Response> => {
//   const token = authService.getToken();
//   const headers = {
//     'Content-Type': 'application/json',
//     ...options.headers,
//     ...(token && { 'Authorization': `Bearer ${token}` })
//   };

//   let response = await fetch(url, { ...options, headers });

//   if (response.status === 401) {
//     if (isRefreshing) {
//       return new Promise((resolve, reject) => {
//         failedQueue.push({ resolve, reject });
//       }).then(token => {
//         const newHeaders = { ...headers, 'Authorization': `Bearer ${token}` };
//         return fetch(url, { ...options, headers: newHeaders });
//       });
//     }

//     isRefreshing = true;

//     try {
//       const newToken = await authService.refreshAccessToken();
//       processQueue(null, newToken);
//       isRefreshing = false;

//       const newHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
//       response = await fetch(url, { ...options, headers: newHeaders });
//     } catch (error) {
//       processQueue(error, null);
//       isRefreshing = false;
//       authService.logout();
//       window.location.href = '/login';
//       throw error;
//     }
//   }

//   return response;
// };

export default apiClient;
