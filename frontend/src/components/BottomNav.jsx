import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'

export default function BottomNav({ active }) {
  const navigate = useNavigate()
  const [showDrawer, setShowDrawer] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (showDrawer && !user) {
      API.get('/api/profile/')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.clear()
          sessionStorage.clear()
          navigate('/login')
        })
    }
  }, [showDrawer, user])

  const handleLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    navigate('/login')
    window.location.reload()
  }

  const items = [
    { id: 'home', icon: '🏠', label: 'الرئيسية', path: '/' },
    { id: 'map', icon: '🗺️', label: 'الخريطة', path: '/map' },
    { id: 'sos', icon: '', label: 'SOS', path: '/' },
    { id: 'camera', icon: '📷', label: 'الكاميرا', path: '/camera' },
    { id: 'profile', icon: '👤', label: 'حسابي', path: '/dashboard' },
  ]

  return (
    <>
      <div style={styles.nav}>
        {items.map(item => {
          if (item.id === 'sos') {
            return (
              <div
                key={item.id}
                style={styles.sosItemContainer}
                onClick={() => {
                  setShowDrawer(false)
                  navigate('/?triggerSos=true')
                }}
              >
                <div style={{
                  ...styles.sosCircleBtn,
                  boxShadow: active === 'home' ? '0 0 25px rgba(239, 68, 68, 0.8)' : '0 0 15px rgba(239, 68, 68, 0.4)'
                }}>
                  SOS
                </div>
              </div>
            )
          }

          const isActive = (item.id === 'profile' && showDrawer) || (active === item.id && !showDrawer)

          return (
            <div
              key={item.id}
              style={{ ...styles.item, color: isActive ? '#E8192C' : '#9090a8' }}
              onClick={() => {
                if (item.id === 'profile') {
                  setShowDrawer(true)
                } else {
                  setShowDrawer(false)
                  navigate(item.path)
                }
              }}
            >
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Overlay */}
      {showDrawer && (
        <div style={styles.overlay} onClick={() => setShowDrawer(false)} />
      )}

      {/* Drawer */}
      <div style={{
        ...styles.drawer,
        transform: showDrawer ? 'translateX(0)' : 'translateX(100%)',
        visibility: showDrawer ? 'visible' : 'hidden',
      }}>
        <div style={styles.drawerHeader}>
          <button style={styles.closeBtn} onClick={() => setShowDrawer(false)}>✕</button>
          <span style={styles.drawerTitle}>ملفي الشخصي</span>
        </div>

        {user ? (
          <div style={styles.drawerBody}>
            {/* Avatar */}
            <div style={styles.avatarCircle}>
              {user.username ? user.username[0].toUpperCase() : '👤'}
            </div>
            <div style={styles.drawerUsername}>{user.username}</div>
            <div style={styles.drawerEmail}>{user.email || 'لا يوجد بريد إلكتروني'}</div>
            <div style={styles.drawerPhone}>{user.phone || 'لا يوجد هاتف'}</div>

            {/* Role Badge */}
            <div style={{
              ...styles.roleBadge,
              background: user.role === 'volunteer' ? 'rgba(34,197,94,0.15)' : (user.role === 'government' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)'),
              color: user.role === 'volunteer' ? '#22c55e' : (user.role === 'government' ? '#3b82f6' : '#aaa'),
              border: user.role === 'volunteer' ? '1px solid rgba(34,197,94,0.3)' : (user.role === 'government' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.1)'),
            }}>
              {user.role === 'volunteer' ? '🟢 متطوع مسعف' : (user.role === 'government' ? '🏛️ جهة حكومية' : '👤 مستخدم عادي')}
            </div>

            {/* زر الإعدادات */}
            <button
              style={styles.settingsBtn}
              onClick={() => {
                setShowDrawer(false)
                navigate('/profile')
              }}
            >
              ⚙️ الإعدادات
            </button>

            {/* زر لوحة التحكم */}
            {(user.role === 'volunteer' || user.role === 'government') && (
              <button
                style={styles.dashboardBtn}
                onClick={() => {
                  setShowDrawer(false)
                  navigate('/dashboard')
                }}
              >
                📊 لوحة تحكم الطوارئ
              </button>
            )}

            <div style={{ flex: 1 }} />

            <button style={styles.drawerLogoutBtn} onClick={handleLogout}>
              🚪 تسجيل الخروج
            </button>
          </div>
        ) : (
          <div style={styles.drawerLoading}>جاري تحميل البيانات...</div>
        )}
      </div>
    </>
  )
}

const styles = {
  nav: {
    position: 'fixed', bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '650px', // 💥 تم تكبيرها من 550px إلى 650px لشاشة أوسع
    height: '72px', background: '#242429',
    borderTop: '1px solid #3a3a45',
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    padding: '0 10px 10px', zIndex: 100,
    fontFamily: 'Cairo, sans-serif', direction: 'rtl',
  },
  item: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '2px', cursor: 'pointer', flex: 1,
    fontSize: '11px', fontWeight: 600,
  },
  sosItemContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1, position: 'relative', height: '100%',
  },
  sosCircleBtn: {
    width: '56px', height: '56px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #ff6b6b, #e60012)',
    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, fontSize: '18px', letterSpacing: '0.5px',
    border: '3px solid #242429', marginTop: '-25px',
    transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', zIndex: 1000,
  },
  drawer: {
    position: 'fixed', top: 0, right: 0,
    width: '85%', maxWidth: '380px', height: '100%',
    background: '#16161a', borderLeft: '1px solid #2e2e38',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
    zIndex: 1001, display: 'flex', flexDirection: 'column',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s',
    fontFamily: 'Cairo, sans-serif', direction: 'rtl',
  },
  drawerHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '24px 20px 16px', borderBottom: '1px solid #24242b',
  },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#9090a8',
    fontSize: '24px', cursor: 'pointer',
  },
  drawerTitle: { fontSize: '18px', fontWeight: 800, color: 'white' },
  drawerBody: {
    padding: '30px 20px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', flex: 1,
  },
  avatarCircle: {
    width: '90px', height: '90px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #ef4444, #7c3aed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '36px', fontWeight: 900, color: 'white',
    marginBottom: '16px', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)',
  },
  drawerUsername: { fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '4px' },
  drawerEmail: { fontSize: '13px', color: '#9090a8', marginBottom: '2px' },
  drawerPhone: { fontSize: '13px', color: '#9090a8', marginBottom: '16px' },
  roleBadge: {
    padding: '6px 14px', borderRadius: '20px',
    fontSize: '12px', fontWeight: 700, marginBottom: '20px',
  },
  settingsBtn: {
    width: '100%', background: '#1e1e28', color: '#c0c0d8',
    border: '1px solid #2e2e3a', borderRadius: '12px', padding: '13px',
    fontSize: '14px', fontWeight: 700, fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer', marginBottom: '10px', transition: 'background 0.2s',
  },
  dashboardBtn: {
    width: '100%', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: 'white', border: 'none', borderRadius: '12px',
    padding: '14px', fontSize: '14px', fontWeight: 700,
    fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', marginBottom: '12px',
  },
  drawerLogoutBtn: {
    width: '100%', background: '#e60012', color: 'white',
    border: 'none', borderRadius: '12px', padding: '14px',
    fontSize: '15px', fontWeight: 700, fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(230, 0, 18, 0.3)', marginTop: 'auto',
  },
  drawerLoading: {
    padding: '40px', color: '#9090a8', textAlign: 'center', fontFamily: 'Cairo, sans-serif',
  },
}