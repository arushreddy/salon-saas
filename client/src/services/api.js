import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // ← 60 seconds to handle Render cold starts (was 15s)
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach JWT and salon slug on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.salonSlug) config.headers['X-Salon-Slug'] = user.salonSlug;
  } catch (_) {
    // corrupt localStorage — ignore
  }

  return config;
});

// ── Retry helper for cold start timeouts ──────────────────────────────────
const isTimeoutError = (error) =>
  error.code === 'ECONNABORTED' ||
  error.message?.includes('timeout') ||
  error.message?.includes('Network Error');

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Auto-retry once on timeout (Render cold start)
    if (isTimeoutError(error) && !originalRequest._retried) {
      originalRequest._retried = true;
      // Wait 3 seconds for server to wake up, then retry
      await new Promise(resolve => setTimeout(resolve, 3000));
      return api(originalRequest);
    }

    // Refresh token on 401, but only once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;