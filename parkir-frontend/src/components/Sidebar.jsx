import { useState } from 'react'
import ParkirCard from './ParkirCard.jsx'
import './Sidebar.css'

const JENIS_OPTS = ['all', 'mobil', 'motor', 'keduanya']
const JENIS_LABELS = { all: 'Semua', mobil: 'Mobil', motor: 'Motor', keduanya: 'Keduanya' }

export default function Sidebar({
  features, stats, filters, setFilters,
  nearbyMode, setNearbyMode, nearbyRadius, setNearbyRadius,
  nearbyCenter, setNearbyCenter, setNearbyData,
  selectedId, onSelect, onAdd, onInlineEdit, onInlineCancel, loading,
  isAdmin, onAdminClick
}) {
  const [editingId, setEditingId] = useState(null)

  const toggleNearby = () => {
    if (nearbyMode) {
      setNearbyMode(false)
      setNearbyCenter(null)
      setNearbyData(null)
    } else {
      setNearbyMode(true)
    }
  }

  const handleInlineEdit = (feature) => {
    setEditingId(feature.id)
  }

  const handleInlineCancel = () => {
    setEditingId(null)
  }

  const handleInlineSave = async (payload) => {
    try {
      await onInlineEdit(editingId, payload)
      setEditingId(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <aside className="sidebar">
      {/* HEADER */}
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo-icon">🅿️</div>
          <div>
            <div className="app-title">ParkMap Bandar Lampung</div>
            <div className="app-subtitle">WebGIS · Sistem Informasi Parkir Publik</div>
          </div>
          <button
            onClick={onAdminClick}
            style={{
              marginLeft: 'auto', fontSize: 11, padding: '4px 10px',
              borderRadius: 6, border: '1px solid',
              borderColor: isAdmin ? 'var(--warn)' : 'var(--accent)',
              color: isAdmin ? 'var(--warn)' : 'var(--accent)',
              background: 'transparent', cursor: 'pointer', fontWeight: 700
            }}
          >
            {isAdmin ? '🔓 Logout' : '🔑 Admin'}
          </button>
        </div>
        <div className="stats-row">
          <div className="stat-chip">
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">Lokasi</div>
          </div>
          <div className="stat-chip">
            <div className="stat-num" style={{ color: 'var(--accent)' }}>{stats.tersedia}</div>
            <div className="stat-label">Tersedia</div>
          </div>
          <div className="stat-chip">
            <div className="stat-num" style={{ color: 'var(--warn)' }}>{stats.penuh}</div>
            <div className="stat-label">Penuh</div>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Cari nama parkir..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div className="filter-row">
          {JENIS_OPTS.map(j => (
            <button
              key={j}
              className={`filter-btn ${filters.jenis === j ? 'active' : ''}`}
              onClick={() => setFilters(f => ({ ...f, jenis: j }))}
            >
              {JENIS_LABELS[j]}
            </button>
          ))}
        </div>
      </div>

      {/* ADVANCED FILTER */}
      <div className="section">
        <div className="filter-label">Filter Lanjutan</div>
        <div className="select-row">
          <select
            className="form-select"
            value={filters.tarif}
            onChange={e => setFilters(f => ({ ...f, tarif: e.target.value }))}
          >
            <option value="">Semua Tarif</option>
            <option value="0">🆓 Gratis</option>
            <option value="2000">Rp 2.000</option>
            <option value="3000">Rp 3.000</option>
            <option value="5000">Rp 5.000</option>
          </select>
        </div>
      </div>

      {/* PROXIMITY */}
      <div className="section">
        <div className="filter-label">📍 Pencarian Terdekat</div>
        <div className="prox-row">
          <input
            type="range" min="100" max="3000" step="100"
            value={nearbyRadius}
            onChange={e => setNearbyRadius(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <span className="prox-val">{nearbyRadius} m</span>
        </div>
        <button
          className={`btn-prox ${nearbyMode ? 'active' : ''}`}
          onClick={toggleNearby}
        >
          {nearbyMode ? '✕ Nonaktifkan Mode Terdekat' : '📡 Aktifkan Mode Terdekat'}
        </button>
        {nearbyMode && !nearbyCenter && (
          <div className="prox-hint">Klik titik di peta untuk mencari parkir terdekat</div>
        )}
        {nearbyMode && nearbyCenter && (
          <div className="prox-hint" style={{ color: 'var(--accent)' }}>
            ✅ {features.length} parkir dalam {nearbyRadius}m
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="section" style={{ paddingBottom: 8 }}>
        <button className="btn-add" onClick={onAdd}>
          {isAdmin ? <><span>＋</span> Tambah Parkir Baru</> : '🔒 Login Admin untuk Tambah'}
        </button>
      </div>

      {/* LIST */}
      <div className="list-header">
        <span className="list-title">Daftar Parkir</span>
        <span className="list-count">{features.length} lokasi</span>
      </div>

      <div className="parking-list">
        {loading ? (
          <div className="loading-state">Memuat data...</div>
        ) : features.length === 0 ? (
          <div className="loading-state">Tidak ada data ditemukan</div>
        ) : (
          features.map(f => (
            <ParkirCard
              key={f.id}
              feature={f}
              selected={selectedId === f.id || selectedId === String(f.id)}
              isEditing={editingId === f.id}
              onClick={() => {
                const g = f.geometry
                let latlng = null
                if (g.type === 'Point') {
                  latlng = { lat: g.coordinates[1], lng: g.coordinates[0] }
                } else if (g.type === 'Polygon') {
                  const coords = g.coordinates[0]
                  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
                  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
                  latlng = { lat, lng }
                }
                onSelect(f.id, latlng)
              }}
              onEdit={() => handleInlineEdit(f)}
              onSave={handleInlineSave}
              onCancel={handleInlineCancel}
            />
          ))
        )}
      </div>
    </aside>
  )
}
