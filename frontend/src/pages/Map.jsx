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
    <div className="map-page">
      <style>{`
        .map-page {
          min-height: 100vh;
          max-width: 550px;
          margin: 0 auto;
          background: #0f0f12; 
          font-family: 'Cairo', sans-serif; 
          direction: rtl; 
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 0 32px rgba(0,0,0,0.5);
          border-left: 1px solid #1f1f25;
          border-right: 1px solid #1f1f25;
          padding-bottom: 90px;
        }
        .map-header { 
          background: #16161a; 
          padding: 16px 20px;
          display: flex; 
          align-items: center; 
          gap: 14px; 
          border-bottom: 1.5px solid #2d2d37;
          z-index: 10;
          height: 78px;
          box-sizing: border-box;
        }
        .map-back-btn { 
          width: 42px; 
          height: 42px; 
          background: #2d2d37; 
          border: none; 
          border-radius: 14px; 
          font-size: 20px; 
          cursor: pointer; 
          color: #f0f0f5; 
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .map-back-btn:hover {
          background: #3e3e4a;
        }
        .map-title { 
          color: #f0f0f5; 
          font-size: 20px; 
          font-weight: 800; 
          margin: 0; 
          text-align: right;
        }
        .map-sub { 
          color: #9090a8; 
          font-size: 13px; 
          margin: 4px 0 0; 
          text-align: right;
        }
        
        .map-content-layout {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: auto;
          overflow: visible;
        }
        
        .map-view-container {
          height: 480px;
          width: 100%;
          position: relative;
          z-index: 1;
        }
        
        .map-list-container {
          background: #16161a;
          border-top: 1.5px solid #2d2d37;
          display: flex;
          flex-direction: column;
          padding: 20px;
          box-sizing: border-box;
          height: auto;
          overflow: visible;
        }
        
        .map-list-scroll {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: auto;
          overflow: visible;
        }
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .map-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .map-list-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .map-list-scroll::-webkit-scrollbar-thumb {
          background: #2d2d37;
          border-radius: 3px;
        }
        
        .map-list-title { 
          font-size: 16px; 
          font-weight: 800; 
          color: #f0f0f5; 
          text-align: right;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .vol-card { 
          display: flex; 
          align-items: center; 
          gap: 14px; 
          padding: 14px 16px; 
          background: #1c1c22; 
          border-radius: 18px; 
          border: 1px solid #2d2d37;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .vol-card:hover {
          transform: translateY(-2px);
          border-color: #10b981;
          box-shadow: 0 6px 15px rgba(16,185,129,0.15);
        }
        
        .vol-avatar { 
          width: 44px; 
          height: 44px; 
          background: rgba(16,185,129,0.1); 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 20px; 
          flex-shrink: 0; 
          border: 1px solid rgba(16,185,129,0.2);
        }
        
        .vol-info { 
          flex: 1; 
          text-align: right;
        }
        
        .vol-name { 
          font-size: 16px; 
          font-weight: 700; 
          color: #f0f0f5; 
        }
        
        .vol-dist { 
          font-size: 13px; 
          color: #9090a8; 
          margin-top: 2px; 
        }
        
        .call-btn { 
          background: #10b981; 
          border: none; 
          width: 40px; 
          height: 40px; 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          font-size: 18px; 
          box-shadow: 0 4px 12px rgba(16,185,129,0.3);
          transition: background 0.2s, transform 0.1s;
        }
        .call-btn:hover {
          background: #059669;
          transform: scale(1.05);
        }
        .call-btn:active {
          transform: scale(0.95);
        }
      `}</style>
      
      <div className="map-header">
        <button className="map-back-btn" onClick={() => navigate('/')}>→</button>
        <div>
          <h2 className="map-title">خريطة المتطوعين</h2>
          <p className="map-sub">{loading ? 'جاري التحميل...' : `${volunteers.length} متطوع قريب`}</p>
        </div>
      </div>

      <div className="map-content-layout">
        {/* Map View */}
        <div className="map-view-container">
          <MapContainer center={myPos} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors"
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
        <div className="map-list-container">
          <div className="map-list-title">المتطوعون القريبون 🟢</div>
          <div className="map-list-scroll">
            {volunteers.length === 0 && !loading && (
              <div style={{ color: '#9090a8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                لا يوجد متطوعون متاحون قريبون منك حالياً
              </div>
            )}
            {volunteers.map(v => (
              <div key={v.id} className="vol-card">
                <div className="vol-avatar">👨‍⚕️</div>
                <div className="vol-info">
                  <div className="vol-name">{v.username}</div>
                  <div className="vol-dist">📍 {v.distance_km} كم — متطوع مسعف</div>
                </div>
                <a href={`tel:${v.phone}`} style={{ textDecoration: 'none' }}>
                  <button className="call-btn">📞</button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}