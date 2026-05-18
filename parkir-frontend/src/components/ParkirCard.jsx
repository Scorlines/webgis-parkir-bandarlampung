import { useState } from 'react'
import './ParkirCard.css'

const formatTarif = (t) => 'Rp ' + Number(t).toLocaleString('id-ID')
const JENIS_OPTIONS = ['Mobil', 'Motor', 'Mobil & Motor']
const STATUS_OPTIONS = ['Tersedia', 'Penuh']
const JAM_OPTIONS = ['06:00 - 22:00', '07:00 - 21:00', '08:00 - 20:00', '24 Jam']
const TARIF_OPTIONS = [0, 2000, 3000, 5000]

export default function ParkirCard({ feature, selected, onClick, onEdit, onSave, onCancel, isEditing }) {
  const p = feature.properties
  const isAvail = p.status === 'Tersedia'
  const [form, setForm] = useState({
    name: p.name || '',
    jenis: p.jenis || 'Mobil & Motor',
    status: p.status || 'Tersedia',
    tarif: p.tarif || 3000,
    kapasitas: p.kapasitas || 50,
    jam_operasional: p.jam_operasional || '07:00 - 21:00'
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return alert('Nama parkir wajib diisi')
    const payload = {
      name: form.name,
      jenis: form.jenis,
      tarif: Number(form.tarif),
      kapasitas: Number(form.kapasitas),
      jam_operasional: form.jam_operasional,
      status: form.status,
      surface_label: p.surface_label || 'asphalt',
      geometry: p.geometry || { type: 'Point', coordinates: [-5.4061, 105.2649] }
    }
    onSave(payload)
  }

  // EDIT MODE VIEW
  if (isEditing) {
    return (
      <div className="parking-card editing" onClick={e => e.stopPropagation()}>
        <div className="edit-form">
          {/* Row 1: Name & Status */}
          <div className="edit-row">
            <div className="edit-group">
              <label className="edit-label">Nama Parkir *</label>
              <input
                className="edit-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nama parkir..."
              />
            </div>
            <div className="edit-group">
              <label className="edit-label">Status</label>
              <select className="edit-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Jenis & Tarif */}
          <div className="edit-row">
            <div className="edit-group">
              <label className="edit-label">Jenis Kendaraan</label>
              <select className="edit-select" value={form.jenis} onChange={e => set('jenis', e.target.value)}>
                {JENIS_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="edit-group">
              <label className="edit-label">Tarif (Rp)</label>
              <select className="edit-select" value={form.tarif} onChange={e => set('tarif', e.target.value)}>
                {TARIF_OPTIONS.map(t => (
                  <option key={t} value={t}>{t === 0 ? '🆓 Gratis' : `Rp ${Number(t).toLocaleString('id-ID')}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Kapasitas & Jam Operasional */}
          <div className="edit-row">
            <div className="edit-group">
              <label className="edit-label">Kapasitas (slot)</label>
              <input
                className="edit-input"
                type="number"
                value={form.kapasitas}
                onChange={e => set('kapasitas', e.target.value)}
                min={1}
              />
            </div>
            <div className="edit-group">
              <label className="edit-label">Jam Operasional</label>
              <select className="edit-select" value={form.jam_operasional} onChange={e => set('jam_operasional', e.target.value)}>
                {JAM_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="edit-buttons">
            <button className="btn-save" onClick={handleSave}>💾 Simpan</button>
            <button className="btn-cancel" onClick={onCancel}>✕ Batal</button>
          </div>
        </div>
      </div>
    )
  }

  // DISPLAY MODE VIEW
  return (
    <div className={`parking-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-top">
        <div className="card-name">{p.name}</div>
        <span className={`badge ${isAvail ? 'badge-available' : 'badge-full'}`}>{p.status}</span>
      </div>
      <div className="card-meta">
        <div className="meta-item">
          <span>{p.jenis === 'Mobil' ? '🚗' : p.jenis === 'Motor' ? '🏍️' : '🚗🏍️'}</span>
          {p.jenis}
        </div>
        <div className="meta-item"><span>🕐</span>{p.jam_operasional}</div>
        {p.kapasitas && (
          <div className="meta-item"><span>🅿️</span>{p.kapasitas} slot</div>
        )}
        {p.distance !== undefined && (
          <div className="meta-item" style={{ color: 'var(--accent2)' }}>
            <span>📏</span>{Math.round(p.distance)} m
          </div>
        )}
      </div>
      <div className="card-footer">
        <div>
          <div className="tarif-label">Tarif/jam</div>
          <div className="tarif-val">{formatTarif(p.tarif)}</div>
        </div>
        <button
          className="edit-btn"
          onClick={e => { e.stopPropagation(); onEdit() }}
        >✏️ Edit</button>
      </div>
    </div>
  )
}
