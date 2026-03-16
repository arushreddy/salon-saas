import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Try to refresh token on 401, but only once
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
```

Only **line 3** changed. Now:

1. Replace your file with this
2. Create `client/.env`:
```
VITE_API_URL=https://tarsalontech.onrender.com/api
```
3. Add in Vercel → Settings → Environment Variables:
```
VITE_API_URL = https://tarsalontech.onrender.com/api