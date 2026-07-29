import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import BottomNav from '../components/BottomNav'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const volunteerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

export default function Map() {
  const navigate = useNavigate()
  const [myPos, setMyPos] = useState([32.9, 13.18]) // طرابلس افتراضي
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setMyPos([lat, lon])
        API.get(`/api/volunteers/nearby/?lat=${lat}&lon=${lon}`)
          .then(res => setVolunteers(res.data))
          .finally(() => setLoading(false))
      },
      () => {
        // استخدم طرابلس كموقع افتراضي
        API.get('/api/volunteers/nearby/?lat=32.9&lon=13.18')
          .then(res => setVolunteers(res.data))
          .finally(() => setLoading(false))
      }
    )
  }, [])

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>←</button>
        <div>
          <h2 style={styles.title}>خريطة المتطوعين</h2>
          <p style={styles.sub}>{loading ? 'جاري التحميل...' : `${volunteers.length} متطوع قريب`}</p>
        </div>
      </div>

      {/* Map */}
<div style={{ height: 'calc(100vh - 200px)' }}>
            <MapContainer center={myPos} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
          {/* موقعي */}
          <Marker position={myPos}>
            <Popup>📍 موقعك الحالي</Popup>
          </Marker>
          <Circle center={myPos} radius={10000} color="#3B82F6" fillOpacity={0.05} />
          {/* المتطوعون */}
          {volunteers.map(v => (
            <Marker key={v.id} position={[v.latitude, v.longitude]} icon={volunteerIcon}>
              <Popup>
                <div style={{ textAlign: 'right', fontFamily: 'Cairo, sans-serif' }}>
                  <strong>{v.username}</strong><br />
                  📱 {v.phone}<br />
                  📍 {v.distance_km} كم
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Volunteers List */}
      <div style={styles.list}>
        <div style={styles.listTitle}>المتطوعون القريبون 🟢</div>
        {volunteers.length === 0 && !loading && (
          <div style={{ color: '#9090a8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            لا يوجد متطوعون متاحون قريبون منك حالياً
          </div>
        )}
        {volunteers.map(v => (
          <div key={v.id} style={styles.volCard}>
            <div style={styles.volAvatar}>👨‍⚕️</div>
            <div style={styles.volInfo}>
              <div style={styles.volName}>{v.username}</div>
              <div style={styles.volDist}>📍 {v.distance_km} كم — متطوع مسعف</div>
            </div>
            <a href={`tel:${v.phone}`}>
              <button style={styles.callBtn}>📞</button>
            </a>
          </div>
        ))}
      </div>

      <BottomNav active="map" />
    </div>
  )
}

const styles = {
page: { 
  minHeight: '100vh',
  maxWidth: '550px',
  margin: '0 auto',
  background: '#1a1a1f', 
  fontFamily: 'Cairo, sans-serif', 
  direction: 'rtl', 
  paddingBottom: '80px',
  position: 'relative',
  overflowX: 'hidden',
},
header: { 
  background: '#242429', 
  padding: '20px 16px 16px',   // ← أزل الـ 50px من الأعلى
  display: 'flex', 
  alignItems: 'center', 
  gap: '14px', 
  borderBottom: '1px solid #3a3a45',
  position: 'sticky',   // ← غيّر لـ sticky
  top: 0,
  zIndex: 10,
},  backBtn: { width: '42px', height: '42px', background: '#2e2e35', border: 'none', borderRadius: '14px', fontSize: '20px', cursor: 'pointer', color: '#f0f0f5', flexShrink: 0 },
  title: { color: '#f0f0f5', fontSize: '20px', fontWeight: 800, margin: 0 },
  sub: { color: '#9090a8', fontSize: '13px', margin: '4px 0 0' },
  list: { padding: '16px', overflowY: 'auto' },
  listTitle: { fontSize: '14px', fontWeight: 700, color: '#f0f0f5', marginBottom: '12px' },
  volCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#242429', borderRadius: '12px', marginBottom: '8px' },
  volAvatar: { width: '38px', height: '38px', background: 'rgba(34,197,94,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 },
  volInfo: { flex: 1 },
  volName: { fontSize: '14px', fontWeight: 700, color: '#f0f0f5' },
  volDist: { fontSize: '11px', color: '#9090a8', marginTop: '2px' },
  callBtn: { background: '#22C55E', border: 'none', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px' },
}