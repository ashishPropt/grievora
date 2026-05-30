import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('grievora_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('grievora_token');
      localStorage.removeItem('grievora_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: { username: string; email?: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { login: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Grievances
export const grievanceApi = {
  start: () => api.post('/grievances/start'),
  sendMessage: (sessionId: string, message: string) =>
    api.post(`/grievances/session/${sessionId}/message`, { message }),
  complete: (sessionId: string) => api.post(`/grievances/session/${sessionId}/complete`),
  getById: (id: string) => api.get(`/grievances/${id}`),
  myList: () => api.get('/grievances/me/list'),
};

// Providers
export const providerApi = {
  list: (params?: Record<string, string>) => api.get('/providers', { params }),
  getById: (id: string) => api.get(`/providers/${id}`),
  getGrievances: (id: string, params?: Record<string, string>) =>
    api.get(`/providers/${id}/grievances`, { params }),
};

// Moderation
export const moderationApi = {
  listPending: (page?: number) => api.get('/moderation/grievances', { params: { page } }),
  approve: (id: string, reason?: string) =>
    api.post(`/moderation/grievances/${id}/approve`, { reason }),
  reject: (id: string, reason: string) =>
    api.post(`/moderation/grievances/${id}/reject`, { reason }),
  edit: (id: string, data: { summary?: string; raw_text?: string; reason: string }) =>
    api.post(`/moderation/grievances/${id}/edit`, data),
  mergeProviders: (sourceId: string, targetId: string, reason?: string) =>
    api.post('/moderation/providers/merge', { source_provider_id: sourceId, target_provider_id: targetId, reason }),
  verifyProvider: (id: string) => api.post(`/moderation/providers/${id}/verify`),
};
