import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401 — but NOT for auth endpoints (login, register, etc.)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');

    // Auth endpoints: always pass the error through so the page can show the message
    if (isAuthEndpoint) return Promise.reject(error);

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refreshToken');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
};

// ─── Users ────────────────────────────────────────────
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
  getPublicProfile: (id: string) => api.get(`/users/${id}/public`),
  getEmergencyContacts: () => api.get('/users/me/emergency-contacts'),
  addEmergencyContact: (data: any) => api.post('/users/me/emergency-contacts', data),
};

// ─── Rides ────────────────────────────────────────────
export const ridesApi = {
  search: (params: any) => api.get('/rides/search', { params }),
  getById: (id: string) => api.get(`/rides/${id}`),
  create: (data: any) => api.post('/rides', data),
  publish: (id: string) => api.patch(`/rides/${id}/publish`),
  start: (id: string) => api.patch(`/rides/${id}/start`),
  complete: (id: string) => api.patch(`/rides/${id}/complete`),
  cancel: (id: string, reason: string) => api.patch(`/rides/${id}/cancel`, { reason }),
  getGiven: (status?: string) => api.get('/rides/given', { params: { status } }),
  getTaken: () => api.get('/rides/taken'),
};

// ─── Ride Requests ────────────────────────────────────
export const requestsApi = {
  create: (data: any) => api.post('/ride-requests', data),
  getMine: () => api.get('/ride-requests/mine'),
  getIncoming: (rideId: string) => api.get('/ride-requests/incoming', { params: { rideId } }),
  approve: (id: string) => api.patch(`/ride-requests/${id}/approve`),
  reject: (id: string, reason?: string) => api.patch(`/ride-requests/${id}/reject`, { reason }),
  confirm: (id: string) => api.patch(`/ride-requests/${id}/confirm`),
  cancel: (id: string, reason?: string) => api.patch(`/ride-requests/${id}/cancel`, { reason }),
};

// ─── Vehicles ─────────────────────────────────────────
export const vehiclesApi = {
  create: (data: any) => api.post('/vehicles', data),
  getMine: () => api.get('/vehicles/my'),
  remove: (id: string) => api.delete(`/vehicles/${id}`),
};

// ─── Templates ────────────────────────────────────────
export const templatesApi = {
  create: (data: any) => api.post('/templates', data),
  getMine: () => api.get('/templates/my'),
  toggle: (id: string) => api.patch(`/templates/${id}/toggle`),
  remove: (id: string) => api.delete(`/templates/${id}`),
};

// ─── Verification ─────────────────────────────────────
export const verificationApi = {
  submit: (data: any) => api.post('/verification/submit', data),
  getStatus: () => api.get('/verification/status'),
};

// ─── Notifications ────────────────────────────────────
export const notificationsApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── Gamification ─────────────────────────────────────
export const gamificationApi = {
  getSummary: () => api.get('/gamification/summary'),
  getLeaderboard: (period = 'monthly') => api.get('/gamification/leaderboard', { params: { period } }),
};

// ─── Tracking ─────────────────────────────────────────
export const trackingApi = {
  getPosition: (rideId: string) => api.get(`/tracking/${rideId}/position`),
};

// ─── Admin ────────────────────────────────────────────
export const adminApi = {
  listUsers: (params?: any) => api.get('/admin/users', { params }),
  suspendUser: (id: string) => api.patch(`/admin/users/${id}/suspend`),
  activateUser: (id: string) => api.patch(`/admin/users/${id}/activate`),
  getPendingVerifications: () => api.get('/admin/verification/pending'),
  reviewVerification: (id: string, data: any) => api.patch(`/admin/verification/${id}/review`, data),
  listRides: (params?: any) => api.get('/admin/rides', { params }),
  getAnalytics: (from?: string, to?: string) => api.get('/admin/analytics', { params: { from, to } }),
  getActiveSos: () => api.get('/admin/sos/active'),
  resolveSos: (id: string, notes: string) => api.patch(`/admin/sos/${id}/resolve`, { notes }),
  listVehicles: (pending?: boolean) => api.get('/admin/vehicles', { params: pending ? { pending: 'true' } : {} }),
  verifyVehicle: (id: string) => api.patch(`/admin/vehicles/${id}/verify`),
  rejectVehicle: (id: string) => api.patch(`/admin/vehicles/${id}/reject`),
};
