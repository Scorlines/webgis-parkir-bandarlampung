import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar.jsx'
import MapView from './components/MapView.jsx'
import ParkirModal from './components/ParkirModal.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import Toast from './components/Toast.jsx'
import { api } from './api.js'

export default function App() {
  const [geojson, setGeojson]       = useState({ type: 'FeatureCollection', features: [] })
  const [stats, setStats]           = useState({ total: 0, tersedia: 0, penuh: 0 })
  const [loading, setLoading]       = useState(true)
  const [filters, setFilters]       = useState({ jenis: 'all', tarif: '', search: '' })
  const [nearbyMode, setNearbyMode] = useState(false)
  const [nearbyCenter, setNearbyCenter] = useState(null)
  const [nearbyRadius, setNearbyRadius] = useState(500)
  const [nearbyData, setNearbyData] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal]           = useState({ open: false, mode: 'create', data: null })
  const [toast, setToast]           = useState({ show: false, msg: '' })
  const [isAdmin, setIsAdmin]       = useState(api.isAdmin())
  const [showLogin, setShowLogin]   = useState(false)
  const mapRef = useRef(null)

  const showToast = (msg) => {
    setToast({ show: true, msg })
    setTimeout(() => setToast({ show: false, msg: '' }), 2500)
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [gj, st] = await Promise.all([api.getGeoJSON(), api.getStats()])
      setGeojson(gj)
      setStats(st)
    } catch {
      showToast('⚠️ Backend offline – periksa koneksi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Client-side filter (pakai kolom baru jenis_kendaraan) ──
  const filtered = {
    ...geojson,
    features: geojson.features.filter(f => {
      const p = f.properties
      if (filters.jenis !== 'all' && p.jenis_kendaraan !== filters.jenis) return false
      if (filters.tarif !== '' && String(p.tarif_per_jam) !== filters.tarif)  return false
      if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false
      return true
    })
  }

  const displayData = nearbyMode && nearbyData ? nearbyData : filtered

  // ── Nearby: pakai /api/parkir/terdekat dengan param lon & jenis ──
  const handleMapClick = useCallback(async (latlng) => {
    if (!nearbyMode) return
    setNearbyCenter(latlng)
    try {
      const result = await api.nearbyParkir(latlng.lat, latlng.lng, nearbyRadius, filters.jenis)
      setNearbyData(result)
      showToast(`📍 ${result.total} parkir dalam radius ${nearbyRadius}m`)
    } catch {
      showToast('⚠️ Gagal mengambil data terdekat')
    }
  }, [nearbyMode, nearbyRadius, filters.jenis])

  // Re-fetch saat radius berubah
  useEffect(() => {
    if (!nearbyMode || !nearbyCenter) return
    const fetch = async () => {
      try {
        const result = await api.nearbyParkir(nearbyCenter.lat, nearbyCenter.lng, nearbyRadius, filters.jenis)
        setNearbyData(result)
      } catch { /* silent */ }
    }
    fetch()
  }, [nearbyRadius, nearbyCenter, nearbyMode, filters.jenis])

  const handleSelect = useCallback((id, latlng) => {
    setSelectedId(id)
    if (mapRef.current && latlng) {
      mapRef.current.setView(latlng, 17, { animate: true })
    }
  }, [])

  // ── Admin actions (butuh JWT) ──────────────────────────────
  const handleSave = async (data) => {
    if (!isAdmin) { setShowLogin(true); return }
    try {
      if (modal.mode === 'create') {
        await api.createParkir(data)
        showToast('✅ Parkir berhasil ditambahkan')
      } else {
        await api.updateParkir(modal.data.properties.id, data)
        showToast('✅ Parkir berhasil diupdate')
      }
      setModal({ open: false, mode: 'create', data: null })
      loadData()
    } catch (err) {
      if (err?.response?.status === 401) {
        showToast('🔒 Sesi habis – silakan login ulang')
        setIsAdmin(false)
        api.logout()
        setShowLogin(true)
      } else {
        showToast('❌ Gagal menyimpan data')
      }
    }
  }

  const handleDelete = async (id) => {
    if (!isAdmin) { setShowLogin(true); return }
    try {
      await api.deleteParkir(id)
      showToast('🗑️ Parkir berhasil dihapus')
      setModal({ open: false, mode: 'create', data: null })
      loadData()
    } catch {
      showToast('❌ Gagal menghapus data')
    }
  }

  // ── Inline edit dari ParkirCard di Sidebar ─────────────────
  const handleInlineEdit = async (id, payload) => {
    if (!isAdmin) { setShowLogin(true); throw new Error('Not admin') }
    try {
      await api.updateParkir(id, payload)
      showToast('✅ Data parkir berhasil diperbarui')
      loadData()
    } catch (err) {
      if (err?.response?.status === 401) {
        showToast('🔒 Sesi habis – silakan login ulang')
        setIsAdmin(false)
        api.logout()
        setShowLogin(true)
      } else {
        showToast('❌ Gagal memperbarui data')
      }
      throw err
    }
  }

  const handleAdminClick = () => {
    if (isAdmin) {
      api.logout()
      setIsAdmin(false)
      showToast('👋 Berhasil logout')
    } else {
      setShowLogin(true)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        features={displayData.features}
        stats={stats}
        filters={filters}
        setFilters={setFilters}
        nearbyMode={nearbyMode}
        setNearbyMode={setNearbyMode}
        nearbyRadius={nearbyRadius}
        setNearbyRadius={setNearbyRadius}
        nearbyCenter={nearbyCenter}
        setNearbyCenter={setNearbyCenter}
        setNearbyData={setNearbyData}
        selectedId={selectedId}
        onSelect={handleSelect}
        isAdmin={isAdmin}
        onAdminClick={handleAdminClick}
        onInlineEdit={handleInlineEdit}
        onAdd={() => {
          if (!isAdmin) { setShowLogin(true); return }
          setModal({ open: true, mode: 'create', data: null })
        }}
        onEdit={(feat) => {
          if (!isAdmin) { setShowLogin(true); return }
          setModal({ open: true, mode: 'edit', data: feat })
        }}
        loading={loading}
      />
      <MapView
        geojson={displayData}
        selectedId={selectedId}
        nearbyMode={nearbyMode}
        nearbyCenter={nearbyCenter}
        nearbyRadius={nearbyRadius}
        onMapClick={handleMapClick}
        onFeatureClick={handleSelect}
        mapRef={mapRef}
      />
      {modal.open && (
        <ParkirModal
          mode={modal.mode}
          data={modal.data}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal({ open: false, mode: 'create', data: null })}
        />
      )}
      {showLogin && (
        <AdminLogin
          onLogin={() => {
            setIsAdmin(true)
            setShowLogin(false)
            showToast('✅ Login berhasil! Mode Admin aktif')
          }}
        />
      )}
      {toast.show && <Toast msg={toast.msg} />}
    </div>
  )
}
