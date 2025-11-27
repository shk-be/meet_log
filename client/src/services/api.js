import axios from 'axios';

// Use environment variable for API URL, fallback to relative path for local development
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Meeting API
export const meetingAPI = {
  getAll: (params) => api.get('/meetings', { params }),
  getById: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
  update: (id, data) => api.put(`/meetings/${id}`, data),
  delete: (id) => api.delete(`/meetings/${id}`),
  getVersions: (id) => api.get(`/meetings/${id}/versions`),
  restoreVersion: (id, version) => api.post(`/meetings/${id}/restore/${version}`),
};

// Action Item API
export const actionItemAPI = {
  getAll: (params) => api.get('/action-items', { params }),
  getById: (id) => api.get(`/action-items/${id}`),
  create: (data) => api.post('/action-items', data),
  update: (id, data) => api.put(`/action-items/${id}`, data),
  updateStatus: (id, status) => api.patch(`/action-items/${id}/status`, { status }),
  delete: (id) => api.delete(`/action-items/${id}`),
  getSummary: () => api.get('/action-items/summary'),
};

// Tag API
export const tagAPI = {
  getAll: () => api.get('/tags'),
  getById: (id) => api.get(`/tags/${id}`),
  create: (data) => api.post('/tags', data),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`),
  suggest: (content) => api.post('/tags/suggest', { content }),
};

// Search API
export const searchAPI = {
  search: (question) => api.post('/search', { question }),
  advancedSearch: (query, filters) => api.post('/search/advanced', { query, filters }),
  getSaved: () => api.get('/search/saved'),
  save: (data) => api.post('/search/save', data),
  deleteSaved: (id) => api.delete(`/search/saved/${id}`),
};

export default api;
