const API_BASE = import.meta.env.VITE_API_BASE || '';

function token() {
  return localStorage.getItem('portal_token');
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const authToken = token();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed');
  }
  return payload;
}

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/api/auth/me'),
  config: () => request('/api/config'),
  stats: () => request('/api/stats'),
  analytics: () => request('/api/analytics'),
  listApplications: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value && query.set(key, value));
    return request(`/api/applications${query.toString() ? `?${query}` : ''}`);
  },
  getApplication: (id) => request(`/api/applications/${id}`),
  createOrder: (payload) => request('/api/payments/order', { method: 'POST', body: JSON.stringify(payload) }),
  verifyPayment: (payload) => request('/api/payments/verify', { method: 'POST', body: JSON.stringify(payload) }),
  createApplication: (payload) => request('/api/applications', { method: 'POST', body: JSON.stringify(payload) }),
  updateApplication: (id, payload) =>
    request(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadDocument: (id, type, blob, fileName) => {
    const form = new FormData();
    form.append('type', type);
    form.append('file', blob, fileName);
    return request(`/api/applications/${id}/documents`, { method: 'POST', body: form });
  }
};

export function documentUrl(fileUrl) {
  if (!fileUrl) return '#';
  if (fileUrl.startsWith('http')) return fileUrl;
  return `${API_BASE}${fileUrl}`;
}
