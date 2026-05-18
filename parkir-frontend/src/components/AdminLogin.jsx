import { useState } from 'react'
import { api } from '../api.js'
import './AdminLogin.css'

export default function AdminLogin({ onLogin }) {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(form.username, form.password)
      localStorage.setItem('admin_token', data.access_token)
      onLogin()
    } catch {
      setError('Username atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">🅿️</div>
        <div className="login-title">Admin Panel</div>
        <div className="login-subtitle">WebGIS Parkir Bandar Lampung</div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="admin"
              autoFocus
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="login-error">⚠️ {error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Masuk...' : '🔑 Masuk sebagai Admin'}
          </button>
        </form>

        <div className="login-hint">Default: admin / admin123</div>
      </div>
    </div>
  )
}
