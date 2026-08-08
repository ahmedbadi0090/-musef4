import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import API from '../api'
import BottomNav from '../components/BottomNav'

const BASE_URL = 'http://127.0.0.1:8000';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Dashboard() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [user, setUser] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [isAvailable, setIsAvailable] = useState(true)
  const [activeAlerts, setActiveAlerts] = useState([])
  const [locationSent, setLocationSent] = useState(false)
  const [selectedTab, setSelectedTab] = useState('pending')
  const [toast, setToast] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const queryIncidentId = searchParams.get('incidentId')
  const focusedAlert = activeAlerts.find(a => String(a.id) === String(queryIncidentId))
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const subscribeToPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission was denied.');
        return;
      }

      // Fetch the server's public VAPID key
      const keyRes = await API.get('/api/push/vapid-key/');
      const vapidPublicKey = keyRes.data.publicKey;

      // Register the service worker subscription
      const registration = await navigator.serviceWorker.ready;
      
      // Unsubscribe existing stale subscriptions to ensure fresh FCM credentials
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Post the subscription payload to Django
      await API.post('/api/push/subscribe/', subscription.toJSON());
      console.log('Registered Web Push subscription successfully ✅');
    } catch (err) {
      console.error('Failed to register Web Push subscription:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await API.get('/api/alerts/')
      setActiveAlerts(res.data)
    } catch (err) {
      console.error('Failed to load active alerts:', err)
    }
  }

  // Profile validation and push subscription initialization
  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    API.get('/api/profile/')
      .then(res => {
        setUser(res.data)
        setIsAvailable(res.data.is_available)
        localStorage.setItem('role', res.data.role)
        localStorage.setItem('username', res.data.username)
        // Tab-specific storage to prevent cross-tab alarm bugs
        sessionStorage.setItem('role', res.data.role)
        sessionStorage.setItem('username', res.data.username)
        if (res.data.role !== 'volunteer' && res.data.role !== 'government') {
          navigate('/')
        } else {
          // Volunteer or Government active, register for push
          subscribeToPushNotifications();
        }
      })
      .catch(() => {
        localStorage.clear()
        sessionStorage.clear()
        navigate('/login')
      })
  }, [token, navigate])

  // Geo-location reporting
  useEffect(() => {
    if (!token) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await API.patch('/api/update-location/', {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        setLocationSent(true)
      } catch {}
    })
  }, [token])



  // Real-time alerts fetcher and service worker listener
  useEffect(() => {
    if (!token) return
    
    fetchAlerts()
    
    // Backup polling every 10s
    const interval = setInterval(() => {
      fetchAlerts()
    }, 10000)

    const handleRefetch = () => {
      fetchAlerts()
    }

    window.addEventListener('refetch-alerts', handleRefetch)

    return () => {
      clearInterval(interval)
      window.removeEventListener('refetch-alerts', handleRefetch)
    }
  }, [token])

  const toggleAvailability = async () => {
    try {
      const nextStatus = !isAvailable
      await API.patch('/api/update-location/', { is_available: nextStatus })
      setIsAvailable(nextStatus)
    } catch {
      showToast('حدث خطأ أثناء تحديث حالة الجاهزية ❌', 'error')
    }
  }

  const acceptAlert = async (id) => {
    try {
      await API.post(`/api/alerts/${id}/accept/`)
      window.dispatchEvent(new CustomEvent('stop-emergency-alarm'))
      await fetchAlerts()
      window.dispatchEvent(new CustomEvent('refetch-alerts'))
      showToast('تم قبول الاستغاثة بنجاح! تم تحديد موقع المصاب وإشعاره بتوجهك إليه 🚑', 'success')
    } catch (err) {
      showToast('فشل في قبول الاستغاثة. ربما تم قبولها من قبل مسعف آخر أو انتهت الحالة ❌', 'error')
    }
  }

  const declineAlert = async (id) => {
    try {
      await API.post(`/api/alerts/${id}/decline/`)
      window.dispatchEvent(new CustomEvent('stop-emergency-alarm'))
      await fetchAlerts()
      window.dispatchEvent(new CustomEvent('refetch-alerts'))
      showToast('تم رفض الاستغاثة بنجاح وسيتم توجيه البلاغ لمسعف آخر قادم 🚑', 'success')
    } catch (err) {
      showToast('فشل في رفض الاستغاثة. ربما تغيرت حالة البلاغ ❌', 'error')
    }
  }

  const deleteIncident = async (id) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا البلاغ وملفاته بالكامل من النظام؟ 🗑️')) return;
    try {
      await API.delete(`/api/alerts/${id}/delete/`)
      await fetchAlerts()
      showToast('تم حذف البلاغ وكل ملفاته المرفقة بنجاح ✓', 'success')
    } catch (err) {
      showToast('فشل في حذف البلاغ ❌', 'error')
    }
  }

  const deleteVoiceNote = async (id) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف التسجيل الصوتي المرفق فقط؟ 🔇')) return;
    try {
      await API.post(`/api/alerts/${id}/delete-voice/`)
      await fetchAlerts()
      showToast('تم حذف التسجيل الصوتي بنجاح ✓', 'success')
    } catch (err) {
      showToast('فشل في حذف التسجيل الصوتي ❌', 'error')
    }
  }

  const deleteImage = async (id) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف الصورة المرفقة فقط؟ 🖼️')) return;
    try {
      await API.post(`/api/alerts/${id}/delete-image/`)
      await fetchAlerts()
      showToast('تم حذف الصورة بنجاح ✓', 'success')
    } catch (err) {
      showToast('فشل في حذف الصورة ❌', 'error')
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    navigate('/login')
  }

  const resolveMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${BASE_URL}${path}`;
  };

  const pendingCount = activeAlerts.filter(alert => {
    if (user && user.role === 'volunteer') {
      return alert.status === 'pending' && (alert.volunteer_username === user.username || !alert.volunteer_username) && !alert.is_declined_by_me;
    }
    return alert.status !== 'resolved';
  }).length;

  const acceptedCount = activeAlerts.filter(alert => {
    if (user && user.role === 'volunteer') {
      return (alert.status === 'active' || alert.status === 'resolved') && alert.volunteer_username === user.username;
    }
    return alert.status === 'resolved';
  }).length;

  const rejectedCount = activeAlerts.filter(alert => {
    if (user && user.role === 'volunteer') {
      return alert.is_declined_by_me;
    }
    return alert.has_been_declined;
  }).length;

  const filteredAlerts = activeAlerts.filter(alert => {
    if (user && user.role === 'government') return true;
    if (selectedTab === 'pending') {
      if (user && user.role === 'volunteer') {
        return alert.status === 'pending' && (alert.volunteer_username === user.username || !alert.volunteer_username) && !alert.is_declined_by_me;
      }
      return false;
    } else if (selectedTab === 'accepted') {
      if (user && user.role === 'volunteer') {
        return (alert.status === 'active' || alert.status === 'resolved') && alert.volunteer_username === user.username;
      }
      return false;
    } else if (selectedTab === 'rejected') {
      if (user && user.role === 'volunteer') {
        return alert.is_declined_by_me;
      }
      return alert.has_been_declined;
    }
    return false;
  });

  if (!token || !user) return <div style={styles.loading}>جاري التحميل...</div>

  return (
    <div style={{ ...styles.page, maxWidth: user.role === 'government' ? '100%' : '550px' }}>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 10, 12, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#16161a',
            border: '1.5px solid #2d2d37',
            borderRadius: '24px',
            padding: '32px 24px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            textAlign: 'center',
            fontFamily: 'Cairo, sans-serif',
            direction: 'rtl'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚪</div>
            <h3 style={{ color: '#f0f0f5', fontSize: '22px', margin: '0 0 12px 0', fontWeight: 800 }}>تسجيل الخروج</h3>
            <p style={{ color: '#9090a8', fontSize: '16px', margin: '0 0 28px 0', lineHeight: '1.6' }}>
              هل أنت متأكد من رغبتك في تسجيل الخروج من التطبيق؟
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={confirmLogout}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(239, 68, 68, 0.3)'
                }}
              >
                نعم، متأكد
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  background: '#2d2d37',
                  color: '#f0f0f5',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Details Modal */}
      {user && focusedAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 10, 12, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }} onClick={() => navigate('/dashboard')}>
          <div style={{
            background: '#16161a',
            border: '1.5px solid #2d2d37',
            borderRadius: '24px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            fontFamily: 'Cairo, sans-serif',
            direction: 'rtl'
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2d2d37', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: '#f0f0f5', fontSize: '20px', margin: 0, fontWeight: 800 }}>
                📋 تفاصيل حالة الاستغاثة
              </h3>
              <button 
                onClick={() => navigate('/dashboard')}
                style={{
                  background: '#2d2d37',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#9090a8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#9090a8' }}>نوع الإصابة:</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
                  {focusedAlert.injury_type || 'طلب استغاثة طارئ 🚨'}
                </div>
              </div>

              <div style={{ background: '#1c1c22', borderRadius: '16px', padding: '16px', border: '1px solid #2d2d37', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <strong style={{ color: '#f0f0f5' }}>👤 اسم المستغيث:</strong> <span style={{ color: '#e5e7eb' }}>{focusedAlert.reporter_username}</span>
                </div>
                {focusedAlert.reporter_phone && (
                  <div>
                    <strong style={{ color: '#f0f0f5' }}>📞 رقم الهاتف:</strong> <a href={`tel:${focusedAlert.reporter_phone}`} onClick={e => e.stopPropagation()} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>{focusedAlert.reporter_phone}</a>
                  </div>
                )}
                {focusedAlert.reporter_blood_type && (
                  <div>
                    <strong style={{ color: '#f0f0f5' }}>🩸 فصيلة الدم:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{focusedAlert.reporter_blood_type}</span>
                  </div>
                )}
                {focusedAlert.reporter_chronic_diseases && (
                  <div>
                    <strong style={{ color: '#f0f0f5' }}>🩺 أمراض مزمنة:</strong> <span style={{ color: '#e5e7eb' }}>{focusedAlert.reporter_chronic_diseases}</span>
                  </div>
                )}
              </div>

              <div>
                <span style={{ fontSize: '13px', color: '#9090a8' }}>📍 الموقع الجغرافي:</span>
                <div style={{ marginTop: '6px' }}>
                  <a 
                    href={`https://www.google.com/maps?q=${focusedAlert.latitude},${focusedAlert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      color: '#3b82f6',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      width: '100%',
                      boxSizing: 'border-box',
                      justifyContent: 'center'
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    🗺️ فتح الموقع الجغرافي على خرائط Google
                  </a>
                </div>
              </div>

              {/* Multimedia */}
              {focusedAlert.image && (
                <div>
                  <span style={{ fontSize: '13px', color: '#9090a8' }}>🖼️ الصورة المرفقة:</span>
                  <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', borderRadius: '14px', marginTop: '6px', border: '1px solid #2d2d37' }}>
                    <img 
                      src={resolveMediaUrl(focusedAlert.image)} 
                      alt="injury" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); window.open(resolveMediaUrl(focusedAlert.image), '_blank'); }}
                    />
                  </div>
                </div>
              )}

              {focusedAlert.voice_note && (
                <div>
                  <span style={{ fontSize: '13px', color: '#9090a8' }}>🔊 التسجيل الصوتي المرفق:</span>
                  <div style={{ marginTop: '6px' }} onClick={e => e.stopPropagation()}>
                    <audio 
                      src={resolveMediaUrl(focusedAlert.voice_note)} 
                      controls 
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Actions & Status */}
              <div style={{ borderTop: '1px solid #2d2d37', paddingTop: '16px', marginTop: '8px' }}>
                {focusedAlert.status === 'pending' && user.role === 'volunteer' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); acceptAlert(focusedAlert.id); navigate('/dashboard'); }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                    }}
                  >
                    🚑 قبول الاستجابة للحالة
                  </button>
                )}

                {focusedAlert.status === 'active' && focusedAlert.volunteer_username === user.username && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: '14px' }}>
                      🟢 أنت مستجيب لهذه الحالة حالياً (جاري التوجه)
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); declineAlert(focusedAlert.id); navigate('/dashboard'); }}
                      style={{
                        width: '100%',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ❌ إلغاء الاستجابة والرفض
                    </button>
                  </div>
                )}

                {focusedAlert.status === 'active' && focusedAlert.volunteer_username !== user.username && (
                  <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: '14px' }}>
                    👥 تم الاستجابة للحالة من قبل المسعف: {focusedAlert.volunteer_username}
                  </div>
                )}

                {focusedAlert.status === 'resolved' && (
                  <div style={{ textAlign: 'center', color: '#9090a8', fontWeight: 700, fontSize: '14px' }}>
                    ✓ تم حل هذه الحالة وإغلاقها بنجاح
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.headerTitle}>
              {user.role === 'government' ? 'لوحة المتابعة الحكومية 🏛️' : 'لوحة المسعف المتطوع 🩺'}
            </div>
            <div style={styles.headerSub}>
              {user.role === 'government' ? 'متابعة نداءات الاستغاثة النشطة والتقارير' : 'متابعة نداءات الاستغاثة وتأكيد الاستجابة'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {user.role === 'volunteer' && (
              <button style={styles.homeBtn} onClick={() => navigate('/')}>الرئيسية 🏠</button>
            )}
            <button style={styles.profileBtn} onClick={() => navigate('/profile')}>الملف الشخصي ⚙️</button>
            <button style={styles.logoutBtnHeader} onClick={handleLogout}>خروج 🚪</button>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Readiness Toggle Card (Volunteers only) */}
        {user.role === 'volunteer' && (
          <div style={{
            ...styles.availabilityCard,
            border: isAvailable ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1.5px solid rgba(239, 68, 68, 0.4)',
            background: isAvailable ? 'rgba(16, 185, 129, 0.03)' : 'rgba(239, 68, 68, 0.03)'
          }}>
            <div style={styles.availInfo}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#f0f0f5' }}>
                حالة الجاهزية والاستعداد الميداني:
              </div>
              <div style={{ fontSize: '12px', color: '#9090a8', marginTop: '4px' }}>
                {isAvailable 
                  ? '🟢 موقعك نشط حالياً للمصابين القريبين وجاهز لتلقي نداءات الاستغاثة.'
                  : '🔴 حسابك غير مرئي حالياً في نظام الطوارئ ولم تستقبل استغاثات.'}
              </div>
            </div>
            <button 
              style={{
                ...styles.toggleBtn,
                background: isAvailable ? '#10B981' : '#EF4444',
                boxShadow: isAvailable ? '0 4px 12px rgba(16,185,129,0.3)' : '0 4px 12px rgba(239,68,68,0.3)'
              }} 
              onClick={toggleAvailability}
            >
              {isAvailable ? 'متاح للخدمة 🟢' : 'غير نشط حالياً 🔴'}
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{
          ...styles.statsGrid,
          gridTemplateColumns: user.role === 'government' ? '1fr' : '1fr 1fr 1fr'
        }}>
          {user.role === 'government' ? (
            <div style={styles.statCard}>
              <span style={styles.statIcon}>📋</span>
              <span style={styles.statVal}>{activeAlerts.length}</span>
              <span style={styles.statLabel}>إجمالي البلاغات</span>
            </div>
          ) : (
            <>
              <div style={styles.statCard}>
                <span style={styles.statIcon}>🚨</span>
                <span style={styles.statVal}>{pendingCount}</span>
                <span style={styles.statLabel}>بلاغات معلقة</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statIcon}>✅</span>
                <span style={styles.statVal}>{acceptedCount}</span>
                <span style={styles.statLabel}>بلاغات مقبولة</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statIcon}>❌</span>
                <span style={styles.statVal}>{rejectedCount}</span>
                <span style={styles.statLabel}>بلاغات مرفوضة</span>
              </div>
            </>
          )}
        </div>

        {/* التبويبات الثلاثة */}
        {user.role !== 'government' && (
          <div style={styles.tabsContainer}>
            <button 
              style={{
                ...styles.tabBtn,
                ...(selectedTab === 'pending' ? styles.tabBtnActivePending : {})
              }}
              onClick={() => setSelectedTab('pending')}
            >
              <span>🚨 معلقة</span>
              <span style={{
                ...styles.tabBadge,
                ...(selectedTab === 'pending' ? styles.tabBadgeActivePending : {})
              }}>{pendingCount}</span>
            </button>
            
            <button 
              style={{
                ...styles.tabBtn,
                ...(selectedTab === 'accepted' ? styles.tabBtnActiveAccepted : {})
              }}
              onClick={() => setSelectedTab('accepted')}
            >
              <span>🚑 مقبولة</span>
              <span style={{
                ...styles.tabBadge,
                ...(selectedTab === 'accepted' ? styles.tabBadgeActiveAccepted : {})
              }}>{acceptedCount}</span>
            </button>
            
            <button 
              style={{
                ...styles.tabBtn,
                ...(selectedTab === 'rejected' ? styles.tabBtnActiveRejected : {})
              }}
              onClick={() => setSelectedTab('rejected')}
            >
              <span>❌ مرفوضة</span>
              <span style={{
                ...styles.tabBadge,
                ...(selectedTab === 'rejected' ? styles.tabBadgeActiveRejected : {})
              }}>{rejectedCount}</span>
            </button>
          </div>
        )}

        <p style={styles.sectionTitle}>
          {user.role === 'government' ? '📋 جميع البلاغات الواردة في النظام:' : selectedTab === 'pending' ? '⚠️ البلاغات المعلقة الواردة:' : selectedTab === 'accepted' ? '🚑 البلاغات المقبولة وجاري الاستجابة لها:' : (user.role === 'volunteer' ? '❌ البلاغات المرفوضة من قبلك:' : '❌ البلاغات المرفوضة من المتطوعين:')}
        </p>
        <div style={styles.alertsList}>
          {filteredAlerts.length === 0 ? (
            <div style={styles.noAlertsText}>لا توجد بلاغات في هذا القسم حالياً.</div>
          ) : (
            filteredAlerts.map(alert => (
              <div 
                key={alert.id} 
                onClick={() => setSearchParams({ incidentId: alert.id })}
                style={{
                  ...styles.alertCard,
                  cursor: 'pointer',
                  border: (user.role === 'government' ? alert.status !== 'resolved' : alert.volunteer_username === user.username)
                    ? (user.role === 'government' ? '1.5px solid rgba(59, 130, 246, 0.5)' : '1.5px solid rgba(16, 185, 129, 0.5)')
                    : '1.5px solid #2d2d37'
                }}
              >
                <div style={styles.alertHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={styles.alertType}>{alert.injury_type || 'طلب استغاثة طارئ'}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                      background: user.role === 'government'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : selectedTab === 'rejected'
                          ? 'rgba(249, 115, 22, 0.15)'
                          : (alert.status === 'pending' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                      color: user.role === 'government'
                        ? '#3b82f6'
                        : selectedTab === 'rejected'
                          ? '#f97316'
                          : (alert.status === 'pending' ? '#EF4444' : '#10B981'),
                      border: `1px solid ${
                        user.role === 'government'
                          ? 'rgba(59, 130, 246, 0.3)'
                          : selectedTab === 'rejected'
                            ? 'rgba(249, 115, 22, 0.3)'
                            : (alert.status === 'pending' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)')
                      }`
                    }}>
                      {user.role === 'government'
                        ? 'بلاغ طارئ 🚨'
                        : selectedTab === 'rejected'
                          ? 'رفضتها ❌'
                          : (alert.status === 'pending' ? 'معلقة 🚨' : (alert.status === 'resolved' ? 'محلولة ✓' : 'مقبولة ✓'))
                      }
                    </span>
                  </div>
                  <span style={styles.alertTime}>
                    {new Date(alert.created_at).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div style={styles.alertLocation}>📍 المنطقة: {alert.reporter_region || 'غير محددة'}</div>

                {alert.latitude && alert.longitude && (
                  <div style={{ margin: '8px 0' }}>
                    <a 
                      href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.mapLink}
                      onClick={e => e.stopPropagation()}
                    >
                      🗺️ فتح الموقع الجغرافي على خرائط Google
                    </a>
                  </div>
                )}

                {/* Reporter Profile Details */}
                <div style={styles.reporterDetails}>
                  <div style={styles.detailRow}>
                    <strong>المستغيث:</strong> {alert.reporter_username}
                  </div>
                  {alert.reporter_phone && (
                    <div style={styles.detailRow}>
                      <strong>رقم الهاتف:</strong> <a href={`tel:${alert.reporter_phone}`} onClick={e => e.stopPropagation()} style={{ color: '#3b82f6', textDecoration: 'none' }}>{alert.reporter_phone}</a>
                    </div>
                  )}
                  {alert.reporter_blood_type && (
                    <div style={styles.detailRow}>
                      <strong>فصيلة الدم:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{alert.reporter_blood_type}</span>
                    </div>
                  )}
                  {alert.reporter_chronic_diseases && (
                    <div style={styles.detailRow}>
                      <strong>أمراض مزمنة:</strong> {alert.reporter_chronic_diseases}
                    </div>
                  )}
                  {alert.reporter_other_notes && (
                    <div style={styles.detailRow}>
                      <strong>ملاحظات هامة:</strong> {alert.reporter_other_notes}
                    </div>
                  )}
                </div>

                {/* Voice Note */}
                {alert.voice_note && (
                  <div style={styles.mediaContainer} onClick={e => e.stopPropagation()}>
                    <div style={styles.mediaLabel}>🎙️ تسجيل صوتي من موقع الحادث:</div>
                    <audio src={resolveMediaUrl(alert.voice_note)} controls style={{ width: '100%', marginTop: '6px' }} />
                  </div>
                )}

                {/* Photo Attachments */}
                {alert.image && (
                  <div style={styles.mediaContainer}>
                    <div style={styles.mediaLabel}>📸 صورة مرفقة:</div>
                    <img 
                      src={resolveMediaUrl(alert.image)} 
                      alt="الحادث" 
                      style={styles.incidentImage} 
                      onClick={(e) => { e.stopPropagation(); window.open(resolveMediaUrl(alert.image), '_blank'); }}
                    />
                  </div>
                )}

                {/* Actions Section */}
                <div style={styles.alertActions}>
                  {/* Pending alert with no volunteer assigned yet, OR assigned to me → show Accept+Decline */}
                  {alert.status === 'pending' && user.role === 'volunteer' && !alert.is_declined_by_me &&
                    (alert.volunteer_username === user.username || !alert.volunteer_username) && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <button 
                        style={styles.acceptBtn}
                        onClick={(e) => { e.stopPropagation(); acceptAlert(alert.id); }}
                      >
                        🚀 قبول الاستغاثة والاستجابة
                      </button>
                      <button 
                        style={styles.declineBtn}
                        onClick={(e) => { e.stopPropagation(); declineAlert(alert.id); }}
                      >
                        ❌ رفض وتوجيه لغيري
                      </button>
                    </div>
                  )}

                  {alert.status === 'active' && alert.volunteer_username === user.username && user.role === 'volunteer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={styles.acceptedBadge}>
                        🟢 أنت مستجيب لهذه الحالة حالياً (توجّه للموقع)
                      </div>
                      <button 
                        style={styles.declineBtn}
                        onClick={(e) => { e.stopPropagation(); declineAlert(alert.id); }}
                      >
                        ❌ إلغاء الاستجابة والرفض (توجيه لغيري)
                      </button>
                    </div>
                  )}

                  {user.role === 'government' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                      {alert.status !== 'resolved' && (
                        <div style={styles.acceptedBadgeGov}>
                          🟢 البلاغ مسجل في النظام وجاري المتابعة من طرفكم 🏛️
                        </div>
                      )}

                      {/* Show details about volunteer status */}
                      {alert.volunteer_username ? (
                        <div style={styles.assignedBadge}>
                          👥 المسعف المتطوع المستجيب للحالة: {alert.volunteer_username}
                        </div>
                      ) : (
                        <div style={styles.govBadge}>
                          {alert.status === 'pending'
                            ? '🚨 حالة البلاغ: بانتظار استجابة المسعفين المتطوعين'
                            : '🚨 لم يستجب أي مسعف متطوع لهذه الحالة بعد.'}
                        </div>
                      )}

                      {/* Show resolved status */}
                      {alert.status === 'resolved' && (
                        <div style={styles.resolvedBadge}>
                          ✓ تم حل هذه الحالة وإغلاقها
                        </div>
                      )}
                    </div>
                  )}

                  {alert.status === 'active' && alert.volunteer_username !== user.username && user.role !== 'government' && (
                    <div style={styles.assignedBadge}>
                      👥 تم تولي الحالة من مسعف آخر ({alert.volunteer_username})
                    </div>
                  )}
                  {alert.status === 'resolved' && user.role !== 'government' && (
                    <div style={styles.resolvedBadge}>
                      ✓ تم حل هذه الحالة وإغلاقها
                    </div>
                  )}
                </div>

                {/* Deletion Section (Images, Audios and Requests Deletion) */}
                {user.role === 'government' && (
                  <div style={styles.deleteSection}>
                    {alert.image && (
                      <button 
                        style={styles.deleteImageBtn}
                        onClick={(e) => { e.stopPropagation(); deleteImage(alert.id); }}
                      >
                        🖼️ حذف الصورة فقط
                      </button>
                    )}
                    {alert.voice_note && (
                      <button 
                        style={styles.deleteVoiceBtn}
                        onClick={(e) => { e.stopPropagation(); deleteVoiceNote(alert.id); }}
                      >
                        🔇 حذف الصوتية فقط
                      </button>
                    )}
                    <button 
                      style={styles.deleteIncidentBtn}
                      onClick={(e) => { e.stopPropagation(); deleteIncident(alert.id); }}
                    >
                      🗑️ حذف البلاغ بالكامل
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Map Preview */}
        <p style={styles.sectionTitle}>🗺️ خريطة انتشار المسعفين الميدانيين:</p>
        <div style={styles.mapSection}>
          <div style={styles.mapPlaceholder}>
            <div style={styles.mapGrid} />
            <div style={{...styles.volunteerDot, top:'25%', right:'35%'}} />
            <div style={{...styles.volunteerDot, top:'65%', right:'70%'}} />
            <div style={{...styles.volunteerDot, top:'40%', right:'60%'}} />
            <div style={styles.myDot} />
            <span style={styles.mapLabelText}>نطاق طرابلس وضواحيها المباشرة</span>
          </div>
        </div>
      </div>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          zIndex: 10000,
          fontWeight: 800,
          fontFamily: 'Cairo, sans-serif',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          direction: 'rtl'
        }}>
          {toast.message}
        </div>
      )}
      {user && user.role === 'volunteer' && (
        <BottomNav active="profile" />
      )}
    </div>
  )
}

const styles = {
  page: { 
    minHeight: '100vh',
    maxWidth: '550px',
    margin: '0 auto',
    background: '#0f0f12', 
    fontFamily: 'Cairo, sans-serif', 
    direction: 'rtl', 
    paddingBottom: '90px',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f12',
    color: '#9090a8',
    fontFamily: 'Cairo',
  },
  header: { 
    background: 'linear-gradient(180deg, #1f2937, #111827)', 
    padding: '50px 20px 24px', 
    borderBottomLeftRadius: '24px', 
    borderBottomRightRadius: '24px',
    borderBottom: '1px solid #2d2d37',
  },
  headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: '20px', fontWeight: 900, color: 'white' },
  headerSub: { fontSize: '12px', color: '#9090a8', marginTop: '4px' },
  profileBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    borderRadius: '10px',
    padding: '6px 12px',
    color: '#3b82f6',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Cairo',
  },
  homeBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    borderRadius: '10px',
    padding: '6px 14px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Cairo',
  },
  logoutBtnHeader: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '6px 12px',
    color: '#ef4444',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Cairo',
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    background: '#1c1c22',
    padding: '6px',
    borderRadius: '14px',
    border: '1.5px solid #2d2d37'
  },
  tabBtn: {
    flex: 1,
    padding: '10px 4px',
    border: 'none',
    borderRadius: '10px',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'transparent',
    color: '#9090a8',
  },
  tabBtnActivePending: {
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  tabBtnActiveAccepted: {
    background: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  tabBtnActiveRejected: {
    background: 'rgba(249, 115, 22, 0.12)',
    color: '#f97316',
    border: '1px solid rgba(249, 115, 22, 0.3)',
  },
  tabBadge: {
    padding: '2px 6px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 800,
    background: '#2d2d37',
    color: '#9090a8'
  },
  tabBadgeActivePending: {
    background: '#ef4444',
    color: 'white',
  },
  tabBadgeActiveAccepted: {
    background: '#10b981',
    color: 'white',
  },
  tabBadgeActiveRejected: {
    background: '#f97316',
    color: 'white',
  },
  content: { padding: '16px' },
  alarmBanner: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1.5px solid #ef4444',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  stopAlarmBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Cairo',
    boxShadow: '0 4px 12px rgba(239,68,68,0.25)',
  },
  availabilityCard: {
    borderRadius: '18px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '20px',
  },
  availInfo: { flex: 1 },
  toggleBtn: {
    border: 'none',
    borderRadius: '12px',
    padding: '12px',
    color: 'white',
    fontWeight: 700,
    fontFamily: 'Cairo',
    cursor: 'pointer',
    width: '100%',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '10px',
    marginBottom: '20px',
  },
  statCard: {
    background: '#1c1c22',
    borderRadius: '14px',
    padding: '14px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1.5px solid #2d2d37',
  },
  statIcon: { fontSize: '20px', marginBottom: '4px' },
  statVal: { fontSize: '18px', fontWeight: 900, color: 'white' },
  statLabel: { fontSize: '10px', color: '#9090a8', marginTop: '2px', textAlign: 'center' },
  sectionTitle: { fontSize: '15px', fontWeight: 800, color: '#f0f0f5', margin: '14px 0 10px' },
  noAlertsText: {
    padding: '24px 10px',
    textAlign: 'center',
    color: '#9090a8',
    fontSize: '13px',
    background: '#16161a',
    borderRadius: '16px',
    border: '1px solid #242429',
  },
  alertsList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  alertCard: {
    background: '#1c1c22',
    borderRadius: '16px',
    padding: '16px',
  },
  alertHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  alertType: { fontSize: '14px', fontWeight: 800, color: 'white' },
  alertTime: { fontSize: '11px', color: '#EF4444', fontWeight: 600 },
  alertLocation: { fontSize: '13px', color: '#e2e8f0', margin: '6px 0' },
  mapLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  reporterDetails: {
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px',
    padding: '12px',
    marginTop: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  detailRow: {
    fontSize: '12.5px',
    color: '#d1d1d6',
    marginBottom: '4px',
    textAlign: 'right',
  },
  mediaContainer: {
    marginTop: '12px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    padding: '12px',
    border: '1px dotted rgba(255, 255, 255, 0.1)',
  },
  mediaLabel: {
    fontSize: '12px',
    color: '#a1a1aa',
    fontWeight: 600,
    textAlign: 'right',
  },
  incidentImage: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginTop: '6px',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  alertActions: { marginTop: '12px' },
  acceptBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #10B981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '10px',
    fontWeight: 700,
    fontFamily: 'Cairo',
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
  },
  declineBtn: {
    flex: 1,
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1.5px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '10px',
    fontWeight: 700,
    fontFamily: 'Cairo',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  govBadge: {
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#a1a1aa',
    borderRadius: '10px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  acceptedBadge: {
    background: 'rgba(16, 185, 129, 0.12)',
    color: '#10B981',
    borderRadius: '10px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textAlign: 'center',
    width: '100%',
  },
  acceptedBadgeGov: {
    background: 'rgba(59, 130, 246, 0.12)',
    color: '#3b82f6',
    borderRadius: '10px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textAlign: 'center',
    width: '100%',
    border: '1px solid rgba(59, 130, 246, 0.3)',
  },
  assignedBadge: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#9090a8',
    borderRadius: '10px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textAlign: 'center',
  },
  resolvedBadge: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#10b981',
    borderRadius: '10px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: 700,
    textAlign: 'center',
  },
  deleteSection: {
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  deleteVoiceBtn: {
    background: 'none',
    border: 'none',
    color: '#ff9800',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Cairo',
    padding: 0,
  },
  deleteImageBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Cairo',
    padding: 0,
  },
  deleteIncidentBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Cairo',
    padding: 0,
    marginRight: 'auto',
  },
  mapSection: { background: '#1c1c22', border: '1.5px solid #2d2d37', borderRadius: '18px', padding: '6px', overflow: 'hidden' },
  mapPlaceholder: { height: '140px', background: '#131317', borderRadius: '14px', position: 'relative', overflow: 'hidden' },
  mapGrid: { position: 'absolute', inset: 0, opacity: 0.07, backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(to right, #9090a8 1px, transparent 1px), linear-gradient(to bottom, #9090a8 1px, transparent 1px)' },
  volunteerDot: { position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' },
  myDot: { position: 'absolute', top: '50%', right: '50%', width: '12px', height: '12px', borderRadius: '50%', background: '#3B82F6', border: '2px solid white', boxShadow: '0 0 12px #3B82F6' },
  mapLabelText: { position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', color: '#9090a8' },
}