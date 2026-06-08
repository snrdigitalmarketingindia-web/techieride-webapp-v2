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
  requestExceptionVerification: (data: {
    personalEmail: string;
    companyIdCardUrl: string;
    employeeId: string;
    reason: string;
  }) => api.post('/auth/exception-verification', data),
};

// ─── Users ────────────────────────────────────────────
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
  getPublicProfile: (id: string) => api.get(`/users/${id}/public`),
  getEmergencyContacts: () => api.get('/users/me/emergency-contacts'),
  addEmergencyContact: (data: any) => api.post('/users/me/emergency-contacts', data),
  requestEmailChange: (newEmail: string) => api.post('/users/me/request-email-change', { newEmail }),
  confirmEmailChange: (token: string) => api.post('/users/confirm-email-change', { token }),
  requestPersonalEmailChange: (newEmail: string) => api.post('/users/me/request-personal-email-change', { newEmail }),
  confirmPersonalEmailChange: (token: string) => api.post('/users/confirm-personal-email-change', { token }),
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
  abort: (id: string, reason: string) => api.patch(`/rides/${id}/abort`, { reason }),
  edit: (id: string, updates: any) => api.patch(`/rides/${id}/edit`, updates),
  community: (from: string, to: string) => api.get('/rides/community', { params: { from, to } }),
  board: (id: string) => api.patch(`/rides/${id}/board`),
  deboard: (id: string) => api.patch(`/rides/${id}/deboard`),
  markNoShow: (rideId: string, seekerId: string) => api.patch(`/rides/${rideId}/no-show/${seekerId}`),
  getGiven: (status?: string, history = false) => api.get('/rides/given', { params: { status, ...(history ? { history: 'true' } : {}) } }),
  getTaken: () => api.get('/rides/taken'),
};

// ─── Ride Requests ────────────────────────────────────
export const requestsApi = {
  create: (data: any) => api.post('/ride-requests', data),
  getMine: () => api.get('/ride-requests/mine'),
  getIncoming: (rideId: string) => api.get('/ride-requests/incoming', { params: { rideId } }),
  approve: (id: string, pickupTime?: string) => api.patch(`/ride-requests/${id}/approve`, pickupTime ? { pickupTime } : {}),
  reject: (id: string, reason?: string) => api.patch(`/ride-requests/${id}/reject`, { reason }),
  confirm: (id: string) => api.patch(`/ride-requests/${id}/confirm`),
  cancel: (id: string, reason?: string) => api.patch(`/ride-requests/${id}/cancel`, { reason }),
};

// ─── Saved Locations ──────────────────────────────────
export const savedLocationsApi = {
  getMine: () => api.get('/saved-locations/my'),
  create: (data: { alias: string; lat: number; lng: number; address?: string }) =>
    api.post('/saved-locations', data),
  update: (id: string, data: { alias?: string; lat?: number; lng?: number; address?: string }) =>
    api.patch(`/saved-locations/${id}`, data),
  remove: (id: string) => api.delete(`/saved-locations/${id}`),
};

// ─── Vehicles ─────────────────────────────────────────
export const uploadsApi = {
  parseRc: (imageUrl: string) => api.post('/uploads/parse-rc', { imageUrl }),
};

export const vehiclesApi = {
  create: (data: any) => api.post('/vehicles', data),
  getMine: () => api.get('/vehicles/my'),
  updateRc: (id: string, rcUrl: string, parsedData?: Record<string, any> | null) =>
    api.patch(`/vehicles/${id}/rc`, { rcUrl, ...(parsedData ? { parsedData } : {}) }),
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
  submitEmployee: (data: { employeeIdUrl: string; profilePhotoUrl?: string }) =>
    api.post('/verification/employee', data),
  submitDriver: (data: { drivingLicenseUrl: string; rcUrl: string }) =>
    api.post('/verification/driver', data),
  getStatus: () => api.get('/verification/status'),
  // legacy alias kept for profile page compatibility
  submit: (data: any) => api.post('/verification/employee', data),
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

// ─── Calls (audit log) ────────────────────────────────
export const callsApi = {
  log: (receiverId: string, rideId?: string) =>
    api.post('/calls/log', { receiverId, rideId }).catch(() => {}),
};

// ─── Quick Messages ───────────────────────────────────
export const quickMessagesApi = {
  send: (rideId: string, messageKey: string, customText?: string) =>
    api.post(`/rides/${rideId}/quick-message`, { messageKey, ...(customText ? { customText } : {}) }),
  getOptions: (rideId: string) =>
    api.get(`/rides/${rideId}/quick-message/options`),
};

// ─── Ratings ──────────────────────────────────────────
export const ratingsApi = {
  submit: (data: { rideId: string; rateeId: string; score: number; comment?: string }) =>
    api.post('/ratings', data),
  getRideRatings: (rideId: string) => api.get(`/ratings/ride/${rideId}`),
  getUserStats: (userId: string) => api.get(`/ratings/stats/${userId}`),
};

// ─── Complaints ───────────────────────────────────────
export const complaintsApi = {
  file: (data: { reportedId: string; rideId?: string; reason: string; description?: string }) =>
    api.post('/complaints', data),
  getMy: () => api.get('/complaints/my'),
  adminGetAll: (params?: { status?: string; reportedId?: string }) =>
    api.get('/complaints/admin', { params }),
  adminUpdate: (id: string, data: { status: string; adminNotes?: string }) =>
    api.patch(`/complaints/admin/${id}`, data),
};

// ─── Admin ────────────────────────────────────────────
export const adminApi = {
  listUsers: (params?: any) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  suspendUser: (id: string) => api.patch(`/admin/users/${id}/suspend`),
  deactivateUser: (id: string) => api.patch(`/admin/users/${id}/deactivate`),
  rejectUser: (id: string, reason: string) => api.patch(`/admin/users/${id}/reject`, { reason }),
  activateUser: (id: string) => api.patch(`/admin/users/${id}/activate`),
  adjustTrustScore: (id: string, delta: number, reason: string) => api.patch(`/admin/users/${id}/trust-score`, { delta, reason }),
  reinstateUser: (id: string) => api.patch(`/admin/users/${id}/reinstate`),
  assignRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  // 4 separate verification queues
  getEmailPendingQueue: () => api.get('/admin/queues/email-pending'),
  getExceptionQueue: () => api.get('/admin/queues/exception-requests'),
  getDocumentQueue: () => api.get('/admin/queues/document-pending'),
  getDriverQueue: () => api.get('/admin/queues/driver-pending'),
  // review action (approve/reject any verification request)
  reviewVerification: (id: string, data: { decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
    api.patch(`/admin/verification/${id}/review`, data),
  // legacy — all pending in one list
  getPendingVerifications: () => api.get('/admin/verification/pending'),
  listRides: (params?: any) => api.get('/admin/rides', { params }),
  getAnalytics: (from?: string, to?: string) => api.get('/admin/analytics', { params: { from, to } }),
  getActiveSos: () => api.get('/admin/sos/active'),
  resolveSos: (id: string, notes: string) => api.patch(`/admin/sos/${id}/resolve`, { notes }),
  listVehicles: (pending?: boolean) => api.get('/admin/vehicles', { params: pending ? { pending: 'true' } : {} }),
  verifyVehicle: (id: string) => api.patch(`/admin/vehicles/${id}/verify`),
  rejectVehicle: (id: string) => api.patch(`/admin/vehicles/${id}/reject`),
};
