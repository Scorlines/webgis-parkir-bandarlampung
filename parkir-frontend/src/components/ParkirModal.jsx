import { useState, useEffect } from 'react'

const JENIS_OPTIONS = ['mobil', 'motor', 'keduanya']
const JENIS_LABELS  = { mobil: 'Mobil', motor: 'Motor', keduanya: 'Keduanya' }
const JAM_OPTIONS   = ['06:00', '07:00', '08:00', '09:00', '00:00']
const JAM_TUTUP_OPTIONS = ['20:00', '21:00', '22:00', '23:00', '00:00']
const TARIF_OPTIONS = [0, 2000, 3000, 5000]
const formatTarifLabel = (t) => t === 0 ? 'Gratis' : `Rp ${Number(t).toLocaleString('id-ID')}/jam`

const defaultForm = {
  name: '', jenis_kendaraan: 'keduanya',
  tarif_per_jam: 0,
  kapasitas_total: 50, kapasitas_tersedia: 50,
  jam_buka: '07:00', jam_tutup: '22:00',
  fasilitas: '',
  surface_label: 'asphalt',
  lat: -5.4061, lng: 105.2649
}

export default function ParkirModal({ mode, data, onSave, onDelete, onClose, pickedLocation, isPickingMode, onStartPicking, onCancelPicking }) {
  const [form, setForm]         = useState(defaultForm)
  const [delConfirm, setDelConfirm] = useState(false)
  const [isEditMode, setIsEditMode] = useState(mode === 'create')

  useEffect(() => {
    if (mode === 'edit' && data) {
      const p = data.properties
      const g = data.geometry
      let lat = defaultForm.lat, lng = defaultForm.lng
      if (g.type === 'Point') {
        lng = g.coordinates[0]; lat = g.coordinates[1]
      } else if (g.type === 'Polygon') {
        const coords = g.coordinates[0]
        lat = coords.reduce((s, c) => s + c[1], 0) / coords.length
        lng = coords.reduce((s, c) => s + c[0], 0) / coords.length
      }
      setForm({
        name              : p.name || '',
        jenis_kendaraan   : p.jenis_kendaraan || 'keduanya',
        tarif_per_jam     : p.tarif_per_jam ?? 0,
        kapasitas_total   : p.kapasitas_total || 50,
        kapasitas_tersedia: p.kapasitas_tersedia ?? p.kapasitas_total ?? 50,
        jam_buka          : p.jam_buka || '07:00',
        jam_tutup         : p.jam_tutup || '22:00',
        fasilitas         : (p.fasilitas || []).join(', '),
        surface_label     : p.surface_label || 'asphalt',
        lat, lng
      })
      setIsEditMode(false)
    } else if (mode === 'create') {
      setForm(defaultForm)
      setIsEditMode(true)
    }
  }, [mode, data])

  // Sync koordinat dari klik peta (hanya mode create)
  useEffect(() => {
    if (mode === 'create' && pickedLocation) {
      setForm(f => ({
        ...f,
        lat: Number(pickedLocation.lat.toFixed(6)),
        lng: Number(pickedLocation.lng.toFixed(6))
      }))
    }
  }, [pickedLocation, mode])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return alert('Nama parkir wajib diisi')
    const fasilitasArr = form.fasilitas
      ? form.fasilitas.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const payload = {
      name              : form.name,
      jenis_kendaraan   : form.jenis_kendaraan,
      tarif_per_jam     : Number(form.tarif_per_jam),
      kapasitas_total   : Number(form.kapasitas_total),
      kapasitas_tersedia: Number(form.kapasitas_tersedia),
      jam_buka          : form.jam_buka,
      jam_tutup         : form.jam_tutup,
      fasilitas         : fasilitasArr,
      surface_label     : form.surface_label,
      geometry          : { type: 'Point', coordinates: [Number(form.lng), Number(form.lat)] }
    }
    onSave(payload)
  }

  // ── VIEW MODE ─────────────────────────────────────────────
  if (!isEditMode && mode === 'edit' && data) {
    const p      = data.properties
    const isFull = p.kapasitas_tersedia === 0
    const fasList = (p.fasilitas || [])

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-title">{p.name}</div>

          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`badge ${isFull ? 'badge-full' : 'badge-available'}`}>
                {isFull ? 'Penuh' : 'Tersedia'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Kapasitas</span>
              <span className="detail-value">{p.kapasitas_tersedia} / {p.kapasitas_total} slot</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Jenis</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {JENIS_LABELS[p.jenis_kendaraan] || p.jenis_kendaraan}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Jam Buka</span>
              <span className="detail-value">{p.jam_buka} – {p.jam_tutup}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Tarif</span>
              <span className="detail-value tarif-highlight">
                {p.tarif_per_jam === 0 ? 'Gratis' : `Rp ${Number(p.tarif_per_jam).toLocaleString('id-ID')}/jam`}
              </span>
            </div>
            {fasList.length > 0 && (
              <div className="detail-row" style={{ alignItems: 'flex-start' }}>
                <span className="detail-label">Fasilitas</span>
                <span className="detail-value" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {fasList.map(f => (
                    <span key={f} style={{ background: '#21262d', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>{f}</span>
                  ))}
                </span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Tipe Geometri</span>
              <span className="detail-value">{data.geometry.type}</span>
            </div>
          </div>

          <div className="modal-actions">
            {!delConfirm && (
              <>
                <button className="btn-secondary" onClick={onClose}>Tutup</button>
                <button className="btn-primary" onClick={() => setIsEditMode(true)}>Edit</button>
                <button className="btn-danger" onClick={() => setDelConfirm(true)}>Hapus</button>
              </>
            )}
            {delConfirm && (
              <>
                <span style={{ fontSize: 12, color: 'var(--warn)', flex: 1 }}>Yakin hapus?</span>
                <button className="btn-danger" onClick={() => onDelete(data.properties.id)}>Ya, Hapus</button>
                <button className="btn-secondary" onClick={() => setDelConfirm(false)}>Batal</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── MINIMIZED STATE: saat user sedang pilih lokasi di peta ──
  if (isPickingMode) {
    return (
      <div className="modal-picking-bar">
        <span className="pick-active-pulse" />
        <span style={{ flex: 1 }}>Klik titik di peta untuk menentukan lokasi parkir...</span>
        <button className="btn-pick-cancel" onClick={onCancelPicking}>Batal</button>
      </div>
    )
  }

  // ── EDIT / CREATE MODE ────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          {mode === 'create' ? 'Tambah Lokasi Parkir' : 'Edit Lokasi Parkir'}
        </div>

        <div className="form-group">
          <label className="form-label">Nama Lokasi *</label>
          <input className="form-input" value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Contoh: Parkir Gedung XYZ" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Jenis Kendaraan</label>
            <select className="form-select" value={form.jenis_kendaraan}
              onChange={e => set('jenis_kendaraan', e.target.value)}>
              {JENIS_OPTIONS.map(j => <option key={j} value={j}>{JENIS_LABELS[j]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tarif/Jam</label>
            <select className="form-select" value={form.tarif_per_jam}
              onChange={e => set('tarif_per_jam', e.target.value)}>
              {TARIF_OPTIONS.map(t => <option key={t} value={t}>{formatTarifLabel(t)}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Kapasitas Total</label>
            <input className="form-input" type="number" min={1}
              value={form.kapasitas_total}
              onChange={e => set('kapasitas_total', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Kapasitas Tersedia</label>
            <input className="form-input" type="number" min={0}
              value={form.kapasitas_tersedia}
              onChange={e => set('kapasitas_tersedia', e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Jam Buka</label>
            <select className="form-select" value={form.jam_buka}
              onChange={e => set('jam_buka', e.target.value)}>
              {JAM_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Jam Tutup</label>
            <select className="form-select" value={form.jam_tutup}
              onChange={e => set('jam_tutup', e.target.value)}>
              {JAM_TUTUP_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Fasilitas (pisah koma)</label>
          <input className="form-input" value={form.fasilitas}
            onChange={e => set('fasilitas', e.target.value)}
            placeholder="CCTV, Atap, Toilet, Penjaga" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input className="form-input" type="number" step="0.000001"
              value={form.lat} onChange={e => set('lat', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input className="form-input" type="number" step="0.000001"
              value={form.lng} onChange={e => set('lng', e.target.value)} />
          </div>
        </div>
        {mode === 'create' && (
          <div className="pick-location-row">
            {!isPickingMode ? (
              <button className="btn-pick-location" onClick={onStartPicking}>
                <span className="pick-btn-icon">📍</span>
                Pilih Lokasi di Peta
              </button>
            ) : (
              <div className="pick-location-active">
                <span className="pick-active-pulse" />
                <span>Klik titik di peta...</span>
                <button className="btn-pick-cancel" onClick={onCancelPicking}>Batal</button>
              </div>
            )}
            {pickedLocation && !isPickingMode && (
              <span className="pick-location-set">
                Lokasi dipilih
              </span>
            )}
          </div>
        )}

        <div className="modal-actions">
          {mode === 'edit' && !delConfirm && (
            <button className="btn-danger" onClick={() => setDelConfirm(true)}>Hapus</button>
          )}
          {delConfirm && (
            <>
              <span style={{ fontSize: 12, color: 'var(--warn)', flex: 1 }}>Yakin hapus?</span>
              <button className="btn-danger" onClick={() => onDelete(data.properties.id)}>Ya, Hapus</button>
              <button className="btn-secondary" onClick={() => setDelConfirm(false)}>Batal</button>
            </>
          )}
          {!delConfirm && (
            <>
              <button className="btn-secondary"
                onClick={mode === 'create' ? onClose : () => setIsEditMode(false)}>
                {mode === 'create' ? 'Batal' : 'Kembali'}
              </button>
              <button className="btn-primary" onClick={handleSave}>
                {mode === 'create' ? 'Simpan' : 'Update'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
