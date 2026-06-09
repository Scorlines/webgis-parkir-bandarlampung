import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

// Baca CSS variable sebagai hex — Leaflet canvas tidak bisa parse var(--x) langsung
const getCSSVar = (name) => {
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val || (name === '--accent' ? '#00e5a0' : name === '--warn' ? '#f78166' : '#ffffff')
}

const makePopupHtml = (p, geomType) => {
  const isFull      = p.kapasitas_tersedia === 0
  const statusColor = isFull ? 'var(--warn)' : 'var(--accent)'
  const statusLabel = isFull ? 'Penuh' : 'Tersedia'
  const formatTarif = (t) => Number(t) === 0
    ? '<span style="color:var(--accent);font-weight:700">Gratis</span>'
    : 'Rp ' + Number(t).toLocaleString('id-ID') + '/jam'
  const fasilitasList = (p.fasilitas || []).length
    ? p.fasilitas.map(f => `<span style="background:var(--surface3);border:1px solid var(--border);border-radius:4px;padding:2px 6px;font-size:10px;color:var(--text-muted)">${f}</span>`).join(' ')
    : '<span style="color:var(--text-muted);font-size:11px">-</span>'
  return `<div style="min-width:220px;font-family:'Plus Jakarta Sans',sans-serif">
    <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px">${p.name}</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:var(--text-muted)">Status</span>
      <span style="color:${statusColor};font-weight:600">${statusLabel}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:var(--text-muted)">Kapasitas</span>
      <span style="color:var(--text);font-weight:600">${p.kapasitas_tersedia} / ${p.kapasitas_total} slot</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:var(--text-muted)">Jenis</span>
      <span style="color:var(--text);font-weight:600;text-transform:capitalize">${p.jenis_kendaraan}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:var(--text-muted)">Jam Buka</span>
      <span style="color:var(--text);font-weight:600">${p.jam_buka} – ${p.jam_tutup}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:var(--text-muted)">Tarif</span>
      <span style="color:var(--yellow);font-weight:700;font-family:'Space Mono',monospace">${formatTarif(p.tarif_per_jam)}</span>
    </div>
    <div style="margin-bottom:4px;font-size:12px">
      <span style="color:var(--text-muted);display:block;margin-bottom:4px">Fasilitas</span>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${fasilitasList}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
      <span style="color:var(--text-muted)">Tipe Geometri</span>
      <span style="color:var(--text-muted)">${geomType}</span>
    </div>
    ${p.distance !== undefined ? `<div style="text-align:center;margin-top:8px;font-size:12px;color:var(--accent2);font-weight:700">Jarak: ${Math.round(p.distance)} m dari lokasi Anda</div>` : ''}
  </div>`
}

export default function MapView({ geojson, selectedId, nearbyMode, nearbyCenter, nearbyRadius, onMapClick, onFeatureClick, mapRef, theme, pickingLocation, pickedLocation }) {
  const containerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const geoLayerRef = useRef(null)
  const circleRef = useRef(null)
  const pickMarkerRef = useRef(null)
  const layersRef = useRef({})
  const tileLayerRef = useRef(null)
  // Simpan onMapClick di ref agar event listener selalu pakai versi terbaru
  const onMapClickRef = useRef(onMapClick)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])

  // Init map
  useEffect(() => {
    if (leafletMapRef.current) return
    const map = L.map(containerRef.current, {
      center: [-5.4061, 105.2649],
      zoom: 13,
      zoomControl: false
    })

    const tileUrl = theme === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd', maxZoom: 20
    }).addTo(map)

    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    // Gunakan ref agar selalu pakai versi callback terbaru (fix stale closure)
    map.on('click', (e) => {
      if (onMapClickRef.current) onMapClickRef.current(e.latlng)
    })

    leafletMapRef.current = map
    if (mapRef) mapRef.current = map
  }, [])

  // Update tiles when theme changes
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map || !tileLayerRef.current) return

    map.removeLayer(tileLayerRef.current)

    const tileUrl = theme === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd', maxZoom: 20
    }).addTo(map)
  }, [theme])

  // Render geojson layer
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return
    if (geoLayerRef.current) { map.removeLayer(geoLayerRef.current); geoLayerRef.current = null }
    layersRef.current = {}

    if (!geojson?.features?.length) return

    const ACCENT = getCSSVar('--accent')
    const WARN   = getCSSVar('--warn')
    const TEXT   = getCSSVar('--text')

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const avail = feature.properties.kapasitas_tersedia > 0
        const isSelected = String(feature.id) === String(selectedId) || feature.id === selectedId
        const isPoint = feature.geometry.type === 'Point'

        if (isPoint) {
          return {
            fillColor: avail ? ACCENT : WARN,
            color: isSelected ? TEXT : '#ffffff',
            weight: isSelected ? 3 : 2,
            opacity: 1,
            fillOpacity: 0.9
          }
        }

        // Polygon style
        return {
          color: isSelected ? TEXT : (avail ? ACCENT : WARN),
          weight: isSelected ? 3 : 2,
          opacity: 0.9,
          fillColor: avail ? ACCENT : WARN,
          fillOpacity: isSelected ? 0.6 : 0.35
        }
      },
      pointToLayer: (feature, latlng) => {
        const p     = feature.properties
        const isFull = p.kapasitas_tersedia === 0
        return L.circleMarker(latlng, {
          radius     : 9,
          fillColor  : isFull ? WARN : ACCENT,
          color      : '#ffffff',
          weight     : 2,
          opacity    : 1,
          fillOpacity: 0.9
        })
      },
      onEachFeature: (feature, lyr) => {
        const geomType = feature.geometry.type === 'Point' ? 'Node / Titik' : 'Polygon / Area'
        lyr.bindPopup(makePopupHtml(feature.properties, geomType), { maxWidth: 280 })
        layersRef.current[feature.id] = lyr
        lyr.on('click', () => {
          if (onFeatureClick) {
            const g = feature.geometry
            let latlng = null
            if (g.type === 'Point') latlng = { lat: g.coordinates[1], lng: g.coordinates[0] }
            else if (g.type === 'Polygon') {
              const coords = g.coordinates[0]
              latlng = {
                lat: coords.reduce((s, c) => s + c[1], 0) / coords.length,
                lng: coords.reduce((s, c) => s + c[0], 0) / coords.length
              }
            }
            onFeatureClick(feature.id, latlng)
          }
        })
      }
    }).addTo(map)

    geoLayerRef.current = layer
  }, [geojson, selectedId, theme])

  // Open popup when selected
  useEffect(() => {
    if (selectedId && layersRef.current[selectedId]) {
      layersRef.current[selectedId].openPopup()
    }
  }, [selectedId])

  // Nearby circle
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return
    if (circleRef.current) { map.removeLayer(circleRef.current); circleRef.current = null }
    if (nearbyMode && nearbyCenter) {
      circleRef.current = L.circle([nearbyCenter.lat, nearbyCenter.lng], {
        radius: nearbyRadius,
        color: '#0099ff', fillColor: '#0099ff',
        fillOpacity: 0.07, weight: 2, dashArray: '6 4'
      }).addTo(map)
    }
  }, [nearbyMode, nearbyCenter, nearbyRadius])

  // Pick-location marker: tampilkan titik sementara saat user pilih koordinat
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return
    // Hapus marker lama
    if (pickMarkerRef.current) { map.removeLayer(pickMarkerRef.current); pickMarkerRef.current = null }
    if (pickedLocation) {
      const icon = L.divIcon({
        className: '',
        html: `<div class="pick-dot-outer"><div class="pick-dot-inner"></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })
      pickMarkerRef.current = L.marker([pickedLocation.lat, pickedLocation.lng], { icon, zIndexOffset: 1000 }).addTo(map)
    }
  }, [pickedLocation])

  return (
    <div className={`map-container${pickingLocation ? ' picking-mode' : ''}`}>
      <div ref={containerRef} className="map" />
      <div className="map-badge map-title-badge">
        Bandar Lampung · <span>{geojson?.features?.length || 0} Lokasi Parkir</span>
      </div>
      {pickingLocation && (
        <div className="pick-location-banner">
          <span className="pick-location-icon">📍</span>
          Klik di peta untuk menentukan lokasi parkir
        </div>
      )}
      {nearbyMode && nearbyCenter && (
        <div className="map-badge nearby-badge">
          Pencarian terdekat: {geojson?.features?.length} parkir dalam radius {nearbyRadius}m
        </div>
      )}
      <div className="legend">
        <div className="legend-title">Legenda</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--accent)' }} />Tersedia</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'var(--warn)' }} />Penuh</div>
      </div>
    </div>
  )
}
