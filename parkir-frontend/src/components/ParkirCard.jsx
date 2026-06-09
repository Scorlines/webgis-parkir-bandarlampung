import { useState } from 'react'
import './ParkirCard.css'

const formatTarif = (t) => Number(t) === 0 ? 'Gratis' : 'Rp ' + Number(t).toLocaleString('id-ID')
// Mapping label UI -> value backend
const JENIS_OPTIONS = [
  { label: 'Mobil & Motor', value: 'keduanya' },
  { label: 'Mobil',         value: 'mobil'    },
  { label: 'Motor',         value: 'motor'    },
]
const TARIF_OPTIONS = [0, 2000, 3000, 5000]

export default function ParkirCard({ feature, selected, onClick, onEdit, onSave, onCancel, isEditing }) {
  const p = feature.properties
  const isAvail = p.kapasitas_tersedia > 0

  // Inisialisasi form dengan nama field yang sesuai backend
  const [form, setForm] = useState({
    name              : p.name               || '',
    jenis_kendaraan   : p.jenis_kendaraan    || 'keduanya',
    tarif_per_jam     : p.tarif_per_jam      ?? 3000,
    kapasitas_total   : p.kapasitas_total    || 50,
    kapasitas_tersedia: p.kapasitas_tersedia || 50,
    jam_buka          : p.jam_buka           || '07:00',
    jam_tutup         : p.jam_tutup          || '21:00',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return alert('Nama parkir wajib diisi')
    // Payload menggunakan nama field yang sesuai skema ParkirUpdate di backend
    const payload = {
      name              : form.name,
      jenis_kendaraan   : form.jenis_kendaraan,
      tarif_per_jam     : Number(form.tarif_per_jam),
      kapasitas_total   : Number(form.kapasitas_total),
      kapasitas_tersedia: Number(form.kapasitas_tersedia),
      jam_buka          : form.jam_buka,
      jam_tutup         : form.jam_tutup,
    }
    onSave(payload)
  }

  // EDIT MODE VIEW
  if (isEditing) {
    return (
      <div className="parking-card editing" onClick={e => e.stopPropagation()}>
        <div className="edit-form">
          {/* Row 1: Nama Parkir */}
          <div className="edit-row">
            <div className="edit-group" style={{ flex: 1 }}>
              <label className="edit-label">Nama Parkir *</label>
              <input
                className="edit-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Nama parkir..."
              />
            </div>
          </div>

          {/* Row 2: Jenis & Tarif */}
          <div className="edit-row">
            <div className="edit-group">
              <label className="edit-label">Jenis Kendaraan</label>
              <select className="edit-select" value={form.jenis_kendaraan} onChange={e => set('jenis_kendaraan', e.target.value)}>
                {JENIS_OPTIONS.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </div>
            <div className="edit-group">
              <label className="edit-label">Tarif (Rp)</label>
              <select className="edit-select" value={form.tarif_per_jam} onChange={e => set('tarif_per_jam', e.target.value)}>
                {TARIF_OPTIONS.map(t => (
                  <option key={t} value={t}>{t === 0 ? 'Gratis' : `Rp ${Number(t).toLocaleString('id-ID')}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Kapasitas Total & Tersedia */}
          <div className="edit-row">
            <div className="edit-group">
              <label className="edit-label">Kapasitas Total</label>
              <input
                className="edit-input"
                type="number"
                value={form.kapasitas_total}
                onChange={e => set('kapasitas_total', e.target.value)}
                min={1}
              />
            </div>
            <div className="edit-group">
              <label className="edit-label">Slot Tersedia</label>
              <input
                className="edit-input"
                type="number"
                value={form.kapasitas_tersedia}
                onChange={e => set('kapasitas_tersedia', e.target.value)}
                min={0}
              />
            </div>
          </div>

          {/* Row 4: Jam Buka & Tutup */}
          <div className="edit-row">
            <div className="edit-group">
              <label className="edit-label">Jam Buka</label>
              <input
                className="edit-input"
                type="time"
                value={form.jam_buka}
                onChange={e => set('jam_buka', e.target.value)}
              />
            </div>
            <div className="edit-group">
              <label className="edit-label">Jam Tutup</label>
              <input
                className="edit-input"
                type="time"
                value={form.jam_tutup}
                onChange={e => set('jam_tutup', e.target.value)}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="edit-buttons">
            <button className="btn-save" onClick={handleSave}>Simpan</button>
            <button className="btn-cancel" onClick={onCancel}>Batal</button>
          </div>
        </div>
      </div>
    )
  }

  // DISPLAY MODE VIEW
  const jenisLabel = p.jenis_kendaraan === 'mobil' ? 'Mobil'
    : p.jenis_kendaraan === 'motor' ? 'Motor' : 'Mobil & Motor'

  return (
    <div className={`parking-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="card-top">
        <div className="card-name">{p.name}</div>
        <span className={`badge ${isAvail ? 'badge-available' : 'badge-full'}`}>
          {isAvail ? 'Tersedia' : 'Penuh'}
        </span>
      </div>
      <div className="card-meta">
        <div className="meta-item">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Jenis: </span>
          {jenisLabel}
        </div>
        <div className="meta-item">
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Jam: </span>
          {p.jam_buka} - {p.jam_tutup}
        </div>
        {p.kapasitas_total && (
          <div className="meta-item">
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Slot: </span>
            {p.kapasitas_tersedia}/{p.kapasitas_total} slot
          </div>
        )}
        {p.distance !== undefined && (
          <div className="meta-item" style={{ color: 'var(--accent2)' }}>
            <span style={{ fontWeight: 600 }}>Jarak: </span>
            {Math.round(p.distance)} m
          </div>
        )}
      </div>
      <div className="card-footer">
        <div>
          <div className="tarif-label">Tarif/jam</div>
          <div className="tarif-val">{formatTarif(p.tarif_per_jam)}</div>
        </div>
        <button
          className="edit-btn"
          onClick={e => { e.stopPropagation(); onEdit() }}
        >Edit</button>
      </div>
    </div>
  )
}
