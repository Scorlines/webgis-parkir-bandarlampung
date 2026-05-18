import axios from 'axios'

const API_BASE = '/api'

// ── Auth token helper ──────────────────────────────────────
const authHeader = () => {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────
  login: (username, password) =>
    axios.post(`${API_BASE}/auth/login`, { username, password }).then(r => r.data),

  logout: () => localStorage.removeItem('admin_token'),

  isAdmin: () => !!localStorage.getItem('admin_token'),

  // ── Public ────────────────────────────────────────────────
  getGeoJSON: (params = {}) =>
    axios.get(`${API_BASE}/parkir/geojson`, { params }).then(r => r.data),

  listParkir: (params = {}) =>
    axios.get(`${API_BASE}/parkir`, { params }).then(r => r.data),

  getParkir: (id) =>
    axios.get(`${API_BASE}/parkir/${id}`).then(r => r.data),

  // Endpoint terdekat sesuai ketentuan: lat, lon, radius, jenis
  nearbyParkir: (lat, lon, radius, jenis = null) => {
    const params = { lat, lon, radius }
    if (jenis && jenis !== 'all') params.jenis = jenis
    return axios.get(`${API_BASE}/parkir/terdekat`, { params }).then(r => r.data)
  },

  getStats: () =>
    axios.get(`${API_BASE}/stats`).then(r => r.data),

  // ── Admin (JWT required) ───────────────────────────────────
  createParkir: (data) =>
    axios.post(`${API_BASE}/parkir`, data, { headers: authHeader() }).then(r => r.data),

  updateParkir: (id, data) =>
    axios.put(`${API_BASE}/parkir/${id}`, data, { headers: authHeader() }).then(r => r.data),

  deleteParkir: (id) =>
    axios.delete(`${API_BASE}/parkir/${id}`, { headers: authHeader() }).then(r => r.data),
}
