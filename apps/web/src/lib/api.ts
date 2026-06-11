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
  checkDomain: (email: string) => api.get('/auth/check-domain', { params: { email } }),
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email: string) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  changePassword: (oldPassword: string, newPassword: string) => api.post('/auth/change-password', { oldPassword, newPassword }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  requestExceptionVerification: (data: {
    personalEmail: string;
    employeeId?: string;
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
  updatePickupTime: (id: string, pickupTime: string) => api.patch(`/ride-requests/${id}/pickup-time`, { pickupTime }),
};

// ─── Saved Locations ──────────────────────────────────
export const savedLocationsApi = {
  getMine: () => api.get('/saved-locations/my'),
  create: (data: { alias: string; lat: number; lng: number; address?: string; isFavorite?: boolean; sourceType?: string }) =>
    api.post('/saved-locations', data),
  update: (id: string, data: { alias?: string; lat?: number; lng?: number; address?: string; isFavorite?: boolean; sourceType?: string }) =>
    api.patch(`/saved-locations/${id}`, data),
  toggleFavorite: (id: string) => api.patch(`/saved-locations/${id}/favorite`),
  recordUsage: (id: string) => api.post(`/saved-locations/${id}/use`),
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
  // Single identity approval: company ID + govt ID + self-declaration
  submitIdentity: (data: {
    employeeIdUrl: string;
    govtIdUrl: string;
    selfDeclarationAccepted: boolean;
    profilePhotoUrl?: string;
  }) => api.post('/verification/identity', data),
  submitDriver: (data: { drivingLicenseUrl: string; rcUrl: string }) =>
    api.post('/verification/driver', data),
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
  // Verification queues
  getEmailPendingQueue: () => api.get('/admin/queues/email-pending'),
  getIdentityQueue: () => api.get('/admin/queues/identity-pending'),
  getDriverQueue: () => api.get('/admin/queues/driver-pending'),
  // review action (approve/reject any verification request)
  reviewVerification: (id: string, data: { decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
    api.patch(`/admin/verification/${id}/review`, data),
  // legacy — all pending in one list
  getPendingVerifications: () => api.get('/admin/verification/pending'),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  listRides: (params?: any) => api.get('/admin/rides', { params }),
  getRideDetail: (id: string) => api.get(`/admin/rides/${id}/detail`),
  getSeekerStats: (userId: string) => api.get(`/admin/seekers/${userId}/stats`),
  getGiverSeekerRelationships: (userId: string) => api.get(`/admin/givers/${userId}/seeker-relationships`),
  getRideMessages: (rideId: string) => api.get(`/admin/rides/${rideId}/messages`),
  getGiverTrustTimeline: (userId: string) => api.get(`/admin/givers/${userId}/trust-timeline`),
  forceCompleteRide: (id: string) => api.post(`/admin/rides/${id}/force-complete`),
  getAnalytics: (from?: string, to?: string) => api.get('/admin/analytics', { params: { from, to } }),
  getActiveSos: () => api.get('/admin/sos/active'),
  resolveSos: (id: string, notes: string) => api.patch(`/admin/sos/${id}/resolve`, { notes }),
  listVehicles: (pending?: boolean) => api.get('/admin/vehicles', { params: pending ? { pending: 'true' } : {} }),
  verifyVehicle: (id: string) => api.patch(`/admin/vehicles/${id}/verify`),
  rejectVehicle: (id: string) => api.patch(`/admin/vehicles/${id}/reject`),
  getUserAudit: (id: string) => api.get(`/admin/users/${id}/audit`),
  getUserSavedLocations: (id: string) => api.get(`/admin/users/${id}/saved-locations`),
  getAuditLog: (params?: any) => api.get('/admin/audit-log', { params }),
  exportUsersCsvUrl: () => `${api.defaults.baseURL}/admin/users/export/csv`,
  getTimeSeriesMetrics: (days?: number) => api.get('/admin/metrics/timeseries', { params: { days } }),
  getUserLoginHistory: (id: string) => api.get(`/admin/users/${id}/login-history`),
  getOccupancyStats: () => api.get('/admin/occupancy'),
  getWomenOnlyOccupancyStats: () => api.get('/admin/analytics/women-occupancy'),
  getTravelAnalytics: () => api.get('/admin/travel-analytics'),
  getSuspiciousUsers: () => api.get('/admin/suspicious'),
  getSuspiciousRulesConfig: () => api.get('/admin/config/suspicious-rules'),
  setSuspiciousRulesConfig: (cfg: Record<string, number>) => api.post('/admin/config/suspicious-rules', cfg),
  bulkForceCompleteRides: (olderThanHours = 24, statuses?: string[]) =>
    api.post('/admin/rides/bulk-force-complete', { olderThanHours, statuses }),
  bulkSuspendUsers: (userIds: string[]) => api.post('/admin/users/bulk-suspend', { userIds }),
  bulkActivateUsers: (userIds: string[]) => api.post('/admin/users/bulk-activate', { userIds }),
  bulkEmailUsers: (userIds: string[], subject: string, body: string) =>
    api.post('/admin/users/bulk-email', { userIds, subject, body }),
};
