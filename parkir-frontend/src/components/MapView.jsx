import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

const makePopupHtml = (p, geomType) => {
  const isFull      = p.kapasitas_tersedia === 0
  const statusColor = isFull ? '#f78166' : '#00e5a0'
  const statusLabel = isFull ? 'Penuh' : 'Tersedia'
  const formatTarif = (t) => Number(t) === 0
    ? '<span style="color:#00e5a0;font-weight:700">🆓 Gratis</span>'
    : 'Rp ' + Number(t).toLocaleString('id-ID') + '/jam'
  const fasilitasList = (p.fasilitas || []).length
    ? p.fasilitas.map(f => `<span style="background:#21262d;border-radius:4px;padding:2px 6px;font-size:10px;color:#8b949e">${f}</span>`).join(' ')
    : '<span style="color:#484f58;font-size:11px">-</span>'
  return `<div style="min-width:220px;font-family:'Plus Jakarta Sans',sans-serif">
    <div style="font-size:14px;font-weight:700;color:#e6edf3;margin-bottom:10px">${p.name}</div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:#8b949e">Status</span>
      <span style="color:${statusColor};font-weight:600">${statusLabel}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:#8b949e">Kapasitas</span>
      <span style="color:#e6edf3;font-weight:600">${p.kapasitas_tersedia} / ${p.kapasitas_total} slot</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:#8b949e">Jenis</span>
      <span style="color:#e6edf3;font-weight:600;text-transform:capitalize">${p.jenis_kendaraan}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:#8b949e">Jam Buka</span>
      <span style="color:#e6edf3;font-weight:600">${p.jam_buka} – ${p.jam_tutup}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
      <span style="color:#8b949e">Tarif</span>
      <span style="color:#e3b341;font-weight:700;font-family:'Space Mono',monospace">${formatTarif(p.tarif_per_jam)}</span>
    </div>
    <div style="margin-bottom:4px;font-size:12px">
      <span style="color:#8b949e;display:block;margin-bottom:4px">Fasilitas</span>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${fasilitasList}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px;padding-top:6px;border-top:1px solid #30363d">
      <span style="color:#8b949e">Tipe Geometri</span>
      <span style="color:#8b949e">${geomType}</span>
    </div>
    ${p.distance !== undefined ? `<div style="text-align:center;margin-top:8px;font-size:12px;color:#0099ff;font-weight:700">📏 ${Math.round(p.distance)} m dari titik Anda</div>` : ''}
  </div>`
}

export default function MapView({ geojson, selectedId, nearbyMode, nearbyCenter, nearbyRadius, onMapClick, onFeatureClick, mapRef }) {
  const containerRef = useRef(null)
  const leafletMapRef = useRef(null)
  const geoLayerRef = useRef(null)
  const circleRef = useRef(null)
  const layersRef = useRef({})

  // Init map
  useEffect(() => {
    if (leafletMapRef.current) return
    const map = L.map(containerRef.current, {
      center: [-5.4061, 105.2649],
      zoom: 13,
      zoomControl: false
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd', maxZoom: 20
    }).addTo(map)

    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    map.on('click', (e) => {
      if (onMapClick) onMapClick(e.latlng)
    })

    leafletMapRef.current = map
    if (mapRef) mapRef.current = map
  }, [])

  // Render geojson layer
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return
    if (geoLayerRef.current) { map.removeLayer(geoLayerRef.current); geoLayerRef.current = null }
    layersRef.current = {}

    if (!geojson?.features?.length) return

    const layer = L.geoJSON(geojson, {
      style: (feature) => {
        const avail = feature.properties.status === 'Tersedia'
        const isSelected = String(feature.id) === String(selectedId) || feature.id === selectedId
        return {
          color: isSelected ? '#ffffff' : (avail ? '#00e5a0' : '#f78166'),
          weight: isSelected ? 3 : 2,
          opacity: 0.9,
          fillColor: avail ? '#0099ff' : '#7a3030',
          fillOpacity: isSelected ? 0.7 : 0.45
        }
      },
      pointToLayer: (feature, latlng) => {
        const p     = feature.properties
        const isFull = p.kapasitas_tersedia === 0
        return L.circleMarker(latlng, {
          radius     : 9,
          fillColor  : isFull ? '#f78166' : '#00e5a0',
          color      : '#fff',
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
  }, [geojson, selectedId])

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

  return (
    <div className="map-container">
      <div ref={containerRef} className="map" />
      <div className="map-badge map-title-badge">
        Bandar Lampung · <span>{geojson?.features?.length || 0} Lokasi Parkir</span>
      </div>
      {nearbyMode && nearbyCenter && (
        <div className="map-badge nearby-badge">
          📍 {geojson?.features?.length} parkir dalam radius {nearbyRadius}m
        </div>
      )}
      <div className="legend">
        <div className="legend-title">Legenda</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#00e5a0' }} />Tersedia</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#f78166' }} />Penuh</div>
        <div className="legend-item"><div className="legend-rect" style={{ background: '#0099ff' }} />Area Parkir (Polygon)</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#e3b341' }} />Titik Parkir (Node)</div>
      </div>
    </div>
  )
}
