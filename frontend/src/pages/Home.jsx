import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import API from '../api'
import BottomNav from '../components/BottomNav'
import SOSModal from '../components/SOSModal'

const EMERGENCIES = [
  { id: 'heart', name: 'النوبة القلبية', desc: 'التعرف على النوبة والتصرف السريع', icon: '❤️', severity: 'critical', severityText: 'طوارئ قصوى 🚨', color: 'rgba(239,68,68,0.15)', badgeColor: '#EF4444' },
  { id: 'stroke', name: 'السكتة الدماغية', desc: 'الكشف السريع والتصرف الفوري', icon: '🧠', severity: 'critical', severityText: 'طوارئ قصوى 🚨', color: 'rgba(239,68,68,0.15)', badgeColor: '#EF4444' },
  { id: 'cpr', name: 'الإنعاش القلبي الرئوي', desc: 'إنقاذ شخص توقف قلبه عن النبض', icon: '📈', severity: 'critical', severityText: 'طوارئ قصوى 🚨', color: 'rgba(239,68,68,0.15)', badgeColor: '#EF4444' },
  { id: 'bleeding', name: 'النزيف', desc: 'التحكم في النزيف وإيقافه', icon: '🩸', severity: 'urgent', severityText: 'حالة حرجة ⚠️', color: 'rgba(249,115,22,0.15)', badgeColor: '#F97316' },
  { id: 'choking', name: 'الاختناق', desc: 'إزالة الجسم العالق في مجرى الهواء', icon: '💨', severity: 'urgent', severityText: 'حالة حرجة ⚠️', color: 'rgba(249,115,22,0.15)', badgeColor: '#F97316' },
  { id: 'burns', name: 'الحروق', desc: 'إسعاف الحروق وتخفيف الألم', icon: '🔥', severity: 'moderate', severityText: 'حالة متوسطة 🩹', color: 'rgba(251,191,36,0.15)', badgeColor: '#FBBF24' },
  { id: 'fracture', name: 'الكسور', desc: 'تثبيت الكسر وتقليل الأضرار', icon: '🦴', severity: 'moderate', severityText: 'حالة متوسطة 🩹', color: 'rgba(34,197,94,0.15)', badgeColor: '#22C55E' },
]

const AI_KNOWLEDGE = [
  {
    keywords: ['رعاف', 'انف', 'الرعاف', 'الأنف', 'خروج دم من الانف'],
    title: 'إسعاف الرعاف (نزيف الأنف) 🩸',
    steps: [
      'اجعل المصاب يجلس ويميل برأسه للأمام قليلاً.',
      'اضغط برفق وبإصبعين على الجزء اللين من الأنف لمدة 10 دقائق متواصلة.',
      'اطلب من المصاب التنفس من فمه أثناء الضغط.',
      'ضع كمادات باردة على جسر الأنف.',
      'إذا استمر النزيف لأكثر من 20 دقيقة، توجه للطوارئ فوراً.'
    ]
  },
  {
    keywords: ['تسمم', 'سم', 'شرب سم', 'ابتلاع مادة', 'منظفات'],
    title: 'إسعاف حالات التسمم 🧪',
    steps: [
      'حدد المادة السامة وكميتها والوقت التقريبي لابتلاعها.',
      'اتصل بالإسعاف فوراً (1412).',
      'لا تحاول إجبار المصاب على التقيؤ إطلاقاً.',
      'إذا كانت المادة على الجلد أو العينين، اغسلها بماء جارٍ 15 دقيقة.',
      'احتفظ بعبوة المادة السامة للكادر الطبي.'
    ]
  },
  {
    keywords: ['صعق', 'كهرباء', 'كهربائية', 'تكهرب', 'مكهرب'],
    title: 'إسعاف الصعق الكهربائي ⚡',
    steps: [
      'لا تلمس المصاب وهو متصل بمصدر الكهرباء.',
      'افصل التيار الكهربائي من القاطع الرئيسي.',
      'استخدم أداة خشبية لإبعاد المصاب عن السلك.',
      'تأكد من تنفسه ونبضه.',
      'ابدأ CPR إذا لزم، واتصل بالإسعاف 1412.'
    ]
  }
]

// ===== Profile/Settings Modal (تم تعديلها لتشمل اسم المستخدم وتسجيل الخروج فقط) =====
function ProfileModal({ user, onClose, onLogout }) {
  return (
    <div style={mStyles.overlay} onClick={onClose}>
      <div style={mStyles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={mStyles.modalHeader}>
          <button style={mStyles.closeBtn} onClick={onClose}>✕</button>
          <span style={mStyles.modalTitle}>الحساب الشخصي</span>
          <div style={{ width: 32 }} />
        </div>

        {/* Avatar & Name Section */}
        <div style={mStyles.avatarSection}>
          <div style={{
            ...mStyles.bigAvatar,
            background: user?.role === 'volunteer'
              ? (user?.is_available ? '#22c55e' : '#ef4444')
              : (user?.role === 'government' ? '#3b82f6' : 'linear-gradient(135deg, #ef4444, #7c3aed)')
          }}>
            {user?.username?.[0]?.toUpperCase() || '👤'}
          </div>
          <div style={mStyles.avatarName}>@{user?.username}</div>
          
          <div style={{
            ...mStyles.roleBadge,
            background: user?.role === 'volunteer' ? 'rgba(34,197,94,0.1)' : (user?.role === 'government' ? 'rgba(59,130,246,0.1)' : 'rgba(124,58,237,0.1)'),
            color: user?.role === 'volunteer' ? '#22c55e' : (user?.role === 'government' ? '#3b82f6' : '#a78bfa'),
            border: `1px solid ${user?.role === 'volunteer' ? 'rgba(34,197,94,0.3)' : (user?.role === 'government' ? 'rgba(59,130,246,0.3)' : 'rgba(124,58,237,0.3)')}`,
            marginBottom: '20px'
          }}>
            {user?.role === 'volunteer' ? '🟢 متطوع مسعف' : (user?.role === 'government' ? '🏛️ جهة حكومية' : '👤 مستخدم عادي')}
          </div>
        </div>

        {/* Logout Button */}
        <button style={mStyles.logoutBtn} onClick={onLogout}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  )
}

// ===== Main Home Component =====
export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, setUser] = useState(null)
  const [location, setLocation] = useState(null)
  const [locStatus, setLocStatus] = useState('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredEmergencies, setFilteredEmergencies] = useState(EMERGENCIES)
  const [aiResponse, setAiResponse] = useState(null)
  const [sosLoading, setSosLoading] = useState(false)
  const [sosResult, setSosResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [isSosModalOpen, setIsSosModalOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    API.get('/api/profile/')
      .then(res => {
        setUser(res.data)
        localStorage.setItem('role', res.data.role)
        localStorage.setItem('username', res.data.username)
        // Tab-specific storage to prevent cross-tab alarm bugs
        sessionStorage.setItem('role', res.data.role)
        sessionStorage.setItem('username', res.data.username)
        if (res.data.role === 'government') {
          navigate('/dashboard')
        }
      })
      .catch(() => {
        localStorage.clear()
        sessionStorage.clear()
        navigate('/login')
      })
  }, [navigate])

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    navigate('/login')
  }

  const requestLocation = () => {
    setLocStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setLocation({ lat, lon })
        setLocStatus('done')
        API.patch('/api/update-location/', { latitude: lat, longitude: lon })
      },
      () => setLocStatus('error')
    )
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredEmergencies(EMERGENCIES)
      setAiResponse(null)
      return
    }
    const filtered = EMERGENCIES.filter(emg =>
      emg.name.includes(query) || emg.desc.includes(query)
    )
    setFilteredEmergencies(filtered)
    const lowerQuery = query.toLowerCase()
    const foundAi = AI_KNOWLEDGE.find(item =>
      item.keywords.some(keyword => lowerQuery.includes(keyword))
    )
    setAiResponse(foundAi || null)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setFilteredEmergencies(EMERGENCIES)
    setAiResponse(null)
  }

  const askMedicalAI = async () => {
    if (!searchQuery.trim()) return
    setAiLoading(true)
    setAiResponse(null)
    try {
      const res = await API.post('/api/chat/', { query: searchQuery })
      setAiResponse({ title: `إرشادات إسعافية لـ "${searchQuery}":`, rawText: res.data.answer })
    } catch {
      setAiResponse({ title: 'عذراً، حدث خطأ ❌', rawText: 'فشل المساعد الطبي الذكي في معالجة طلبك.' })
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('triggerSos') === 'true') {
      setIsSosModalOpen(true)
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('triggerSos')
      setSearchParams(newParams)
    }
  }, [searchParams, setSearchParams])

  const handleSendSOS = async (formData) => {
    setSosLoading(true)
    setSosResult(null)
    try {
      const res = await API.post('/api/sos/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setSosResult(res.data)
      return res.data
    } catch (err) {
      setSosResult({ message: 'فشل في إرسال نداء الاستغاثة ❌' })
      throw err
    } finally {
      setSosLoading(false)
    }
  }

  useEffect(() => {
    const handleSosUpdate = (e) => {
      const data = e.detail;
      if (sosResult && sosResult.incident_id === data.incidentId) {
        setSosResult(prev => ({
          ...prev,
          message: data.body,
          volunteer: data.assignedVolunteer ? {
            username: data.assignedVolunteer,
            phone: data.assignedVolunteerPhone
          } : null
        }));
      }
    };
    window.addEventListener('sos-update', handleSosUpdate);
    return () => window.removeEventListener('sos-update', handleSosUpdate);
  }, [sosResult]);

  useEffect(() => {
    if (!sosResult || !sosResult.incident_id) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await API.get('/api/alerts/');
        const updatedAlert = res.data.find(a => a.id === sosResult.incident_id);
        if (updatedAlert) {
          if (updatedAlert.volunteer_username) {
            if (!sosResult.volunteer || sosResult.volunteer.username !== updatedAlert.volunteer_username) {
              setSosResult(prev => ({
                ...prev,
                message: `تم توجيه بلاغك للمسعف ${updatedAlert.volunteer_username} بدلاً من المسعف السابق.`,
                volunteer: {
                  username: updatedAlert.volunteer_username,
                  phone: updatedAlert.volunteer_phone || 'غير مسجل'
                }
              }));
            }
          } else {
            if (sosResult.volunteer) {
              setSosResult(prev => ({
                ...prev,
                message: "المسعف المستجيب لم يتمكن من الوصول، جاري توجيه ندائك لمسعف آخر بشكل عاجل...",
                volunteer: null
              }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to poll SOS status", err);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [sosResult]);

  const triggerSosFlow = () => {
    setIsSosModalOpen(true)
  }

  return (
    <div style={styles.page}>
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
      {/* Profile Modal */}
      {showProfile && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          {user ? (
            <div style={{
              ...styles.statusCapsule,
              borderColor: user.role === 'volunteer' ? (user.is_available ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)') : (user.role === 'government' ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.15)'),
              color: user.role === 'volunteer' ? (user.is_available ? '#22c55e' : '#ef4444') : (user.role === 'government' ? '#3b82f6' : '#9090a8'),
              background: user.role === 'volunteer' ? (user.is_available ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)') : (user.role === 'government' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.05)')
            }}>
              <span>{user.role === 'volunteer' ? (user.is_available ? 'متصل . طرابلس' : 'غير متصل . طرابلس') : (user.role === 'government' ? 'جهة حكومية . طرابلس' : 'طرابلس')}</span>
              <span style={{ marginRight: '4px' }}>📍</span>
            </div>
          ) : (
            <div style={{ ...styles.statusCapsule, color: '#9090a8' }}><span>تحميل...</span></div>
          )}

          <div style={styles.headerTitle}>مُسعف 🚑</div>

          {/* Avatar — clickable to open profile */}
          {user ? (
            <div
              onClick={() => setShowProfile(true)}
              style={{
                ...styles.userAvatarCircle,
                background: user.role === 'volunteer' ? (user.is_available ? '#22c55e' : '#ef4444') : (user.role === 'government' ? '#3b82f6' : 'linear-gradient(135deg, #ef4444, #7c3aed)'),
                cursor: 'pointer',
              }}
            >
              {(user.first_name || user.username)?.[0]?.toUpperCase() || '👤'}
            </div>
          ) : (
            <div style={styles.userAvatarCircle}>👤</div>
          )}
        </div>

        {user && (
          <div style={{
            ...styles.userBar,
            borderColor: user.role === 'volunteer' ? (user.is_available ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') : (user.role === 'government' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.15)'),
            background: user.role === 'volunteer' ? (user.is_available ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)') : (user.role === 'government' ? 'rgba(59,130,246,0.03)' : 'rgba(255,255,255,0.05)')
          }}>
            <div style={styles.userInfo}>
              <div style={styles.userName}>
                {user.first_name || user.last_name 
                  ? `${user.first_name} ${user.last_name}`.trim() 
                  : user.username}
              </div>
              <div style={{ ...styles.userRole, color: user.role === 'volunteer' ? (user.is_available ? '#22c55e' : '#ef4444') : (user.role === 'government' ? '#3b82f6' : '#9090a8') }}>
                {user.role === 'volunteer' ? (user.is_available ? '🟢 متطوع مسعف نشط ومتاح حالياً' : '🔴 متطوع مسعف غير نشط حالياً') : (user.role === 'government' ? '🏛️ جهة حكومية معتمدة' : '👤 مستخدم عادي')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.sosMockupCard}>
          <div style={styles.sosMockupContent}>
            <button
              onClick={triggerSosFlow}
              disabled={sosLoading}
              style={{
                ...styles.sosCircleButton,
                boxShadow: sosLoading ? '0 0 10px rgba(239,68,68,0.2)' : '0 0 35px rgba(255,94,58,0.6)',
                transform: sosLoading ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              {sosLoading ? (
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>جاري الإرسال...</span>
              ) : (
                <>
                  <span style={styles.sosCircleText}>SOS</span>
                  <span style={styles.sosCircleSubText}>استغاثة فورية</span>
                </>
              )}
            </button>
            <div style={styles.sosDescriptionTitle}>اضغط في حالة الطوارئ</div>
            <div style={styles.sosDescriptionSub}>سيتم تنبيه أقرب المتطوعين فوراً</div>
          </div>
        </div>

        {sosResult && (
          <div style={styles.sosResultCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#F87171', fontSize: '14px' }}>🚨 حالة طلب الاستغاثة</span>
              <button style={styles.closeSosBtn} onClick={() => setSosResult(null)}>إغلاق</button>
            </div>
            <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6', margin: '0 0 12px' }}>
              {sosResult.message || 'تم استلام نداء الاستغاثة بنجاح.'}
            </p>
            {sosResult.volunteer && (
              <div style={styles.volunteerAssignBox}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#34D399' }}>👤 المسعف المستجيب: {sosResult.volunteer.username}</div>
                <div style={{ fontSize: '12px', color: '#9090a8', marginTop: '4px' }}>الهاتف: {sosResult.volunteer.phone || 'غير مسجل'}</div>
                <a href={`tel:${sosResult.volunteer.phone}`} style={{ textDecoration: 'none' }}>
                  <button style={styles.callVolunteerBtn}>📞 اتصل بالمسعف الآن</button>
                </a>
              </div>
            )}
          </div>
        )}

        <div style={styles.aiCard} onClick={() => navigate('/camera')}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>الكشف البصري بالذكاء الاصطناعي</div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '6px' }}>وجه الكاميرا فوراً لتحليل الإصابة وتشخيصها</div>
          </div>
          <div style={{ fontSize: '36px' }}>✨</div>
        </div>

        <div style={styles.searchSection}>
          <div style={styles.searchBar}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <input
              style={styles.searchInput}
              placeholder="ابحث أو اكتب عَرَضاً (مثال: سيلان الأنف، حمى)..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') askMedicalAI() }}
            />
            {searchQuery && <button style={styles.clearBtn} onClick={clearSearch}>✕</button>}
          </div>
          {searchQuery.trim() && (
            <button
              style={{ ...styles.askAiBtn, background: aiLoading ? '#2d1b4e' : 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
              onClick={askMedicalAI}
              disabled={aiLoading}
            >
              {aiLoading ? 'جاري استشارة المساعد الطبي... ⏳' : '🤖 اسأل مساعد الذكاء الاصطناعي الطبي'}
            </button>
          )}
        </div>

        {aiResponse && (
          <div style={styles.aiResponseCard}>
            <div style={styles.aiResponseHeader}>
              <span style={{ fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa' }}>🤖 استجابة إسعافية ذكية فورية</span>
              <button style={styles.closeAiBtn} onClick={() => setAiResponse(null)}>إغلاق</button>
            </div>
            <div style={styles.aiResponseTitle}>{aiResponse.title}</div>
            {aiResponse.steps ? (
              <div style={styles.aiResponseSteps}>
                {aiResponse.steps.map((step, idx) => (
                  <div key={idx} style={styles.aiResponseStep}>
                    <span style={styles.stepNumIcon}>{idx + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', lineHeight: '1.6' }}>{step}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#e2e8f0', whiteSpace: 'pre-wrap', textAlign: 'right' }}>
                {aiResponse.rawText}
              </div>
            )}
          </div>
        )}

        <div style={styles.guideCard} onClick={() => navigate('/guide')}>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f0f0f5' }}>دليل الإسعافات الأولية (بدون اتصال) 📚</div>
            <div style={{ fontSize: '12px', color: '#9090a8', marginTop: '4px', lineHeight: '1.5' }}>
              دليل إسعافات شامل لجميع الإصابات والحالات الطارئة يعمل دون اتصال بالإنترنت
            </div>
          </div>
          <div style={{ fontSize: '32px', marginRight: '16px' }}>📖</div>
        </div>

        <div style={styles.sosSection}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#E8192C' }}>⚠️ هل تحتاج إسعاف رسمي؟</div>
          <div style={{ fontSize: '12px', color: '#9090a8', margin: '6px 0 16px' }}>اضغط للاتصال المباشر بغرفة عمليات الهلال الأحمر والإسعاف</div>
          <a href="tel:1412" style={{ textDecoration: 'none' }}>
            <button style={styles.callBtn}>📞 1412 — الاتصال بالإسعاف</button>
          </a>
        </div>

        <div style={styles.disclaimer}>
          <strong style={{ color: '#F97316' }}>⚠️ إخلاء مسؤولية طبي:</strong> جميع الإرشادات والمعلومات المقدمة هي لأغراض الإسعاف الأولي المؤقت، ويجب التواصل مع الكوادر الطبية المتخصصة فوراً في الحالات الحرجة.
        </div>
      </div>

      <SOSModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        onSend={handleSendSOS}
      />

      <BottomNav active="home" />
    </div>
  )
}

// ===== Modal Styles =====
const mStyles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    zIndex: 1000, display: 'flex', 
    alignItems: 'flex-start',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    overflowY: 'auto',
    paddingTop: '100px',
  },
  modal: {
    width: '90%', maxWidth: '400px', background: '#16161a',
    borderRadius: '28px',
    border: '1.5px solid #2d2d37',
    fontFamily: 'Cairo, sans-serif', direction: 'rtl',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 20px 0',
    paddingBottom: '16px',
    borderBottom: '1px solid #2d2d37',
  },
  modalTitle: { fontSize: '16px', fontWeight: 800, color: '#f0f0f5' },
  closeBtn: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#2d2d37', border: 'none', color: '#9090a8',
    fontSize: '14px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '24px 20px 0px',
  },
  bigAvatar: {
    width: '72px', height: '72px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px', fontWeight: 'bold', color: 'white',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  avatarName: { fontSize: '18px', fontWeight: 800, color: '#f0f0f5', marginTop: '12px' },
  roleBadge: {
    marginTop: '10px', padding: '4px 14px', borderRadius: '20px',
    fontSize: '12px', fontWeight: 700,
  },
  logoutBtn: {
    width: 'calc(100% - 32px)', margin: '0 16px 24px',
    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
    border: '1.5px solid rgba(239,68,68,0.2)', borderRadius: '14px',
    padding: '14px', fontSize: '15px', fontWeight: 800,
    fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
  },
}

// ===== Page Styles =====
const styles = {
  page: { minHeight: '100vh', maxWidth: '550px', margin: '0 auto', background: '#0f0f12', fontFamily: 'Cairo, sans-serif', direction: 'rtl', paddingBottom: '90px', position: 'relative', overflowX: 'hidden' },
  header: { background: '#16161a', padding: '50px 20px 24px', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', borderBottom: '1.5px solid #24242b' },
  headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  headerTitle: { fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' },
  statusCapsule: { padding: '6px 12px', borderRadius: '20px', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', background: '#1c1c22' },
  userAvatarCircle: { width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  userBar: { background: 'rgba(255,255,255,0.1)', borderRadius: '14px', padding: '10px 14px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.15)' },
  userInfo: { flex: 1 },
  userName: { fontWeight: 800, fontSize: '14px', color: 'white' },
  userRole: { opacity: 0.9, fontSize: '11px', color: '#ffb3b3', fontWeight: 600 },
  sosMockupCard: { margin: '20px 16px 0', background: 'radial-gradient(circle at center, #3c1114 0%, #15151a 100%)', borderRadius: '24px', padding: '36px 20px', border: '1.5px solid rgba(239,68,68,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  sosMockupContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  sosCircleButton: { width: '144px', height: '144px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b4a, #e60012)', border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', fontFamily: 'Cairo, sans-serif', outline: 'none' },
  sosCircleText: { fontSize: '36px', fontWeight: 900, letterSpacing: '1px', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.3)' },
  sosCircleSubText: { fontSize: '11px', fontWeight: 700, marginTop: '6px', opacity: 0.9 },
  sosDescriptionTitle: { fontSize: '15px', fontWeight: 800, color: '#f0f0f5', marginTop: '20px', textAlign: 'center' },
  sosDescriptionSub: { fontSize: '13px', color: '#9090a8', marginTop: '6px', textAlign: 'center' },
  content: { padding: '0 0 20px' },
  sosResultCard: { margin: '14px 16px 0', background: '#1a1315', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: '20px', padding: '20px', boxShadow: '0 8px 24px rgba(239,68,68,0.15)' },
  closeSosBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: '#9090a8', padding: '4px 10px', fontSize: '11px', fontFamily: 'Cairo', cursor: 'pointer' },
  volunteerAssignBox: { background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '14px', marginTop: '10px' },
  callVolunteerBtn: { width: '100%', background: '#10B981', color: 'white', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 700, fontFamily: 'Cairo', cursor: 'pointer', marginTop: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' },
  aiCard: { margin: '20px 16px 0', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', borderRadius: '22px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 12px 30px rgba(124,58,237,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s' },
  searchSection: { margin: '14px 16px 0' },
  searchBar: { background: '#1c1c22', border: '1.5px solid #2d2d37', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' },
  searchInput: { background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f5', width: '100%', fontSize: '14px', fontFamily: 'Cairo, sans-serif' },
  clearBtn: { background: 'transparent', border: 'none', color: '#9090a8', fontSize: '16px', cursor: 'pointer' },
  askAiBtn: { width: '100%', color: 'white', border: 'none', borderRadius: '12px', padding: '12px', marginTop: '8px', fontSize: '13px', fontWeight: 700, fontFamily: 'Cairo, sans-serif', cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.25)', transition: 'all 0.2s' },
  aiResponseCard: { margin: '16px 16px 0', background: 'linear-gradient(135deg, #181824, #12121a)', border: '1.5px solid rgba(124,58,237,0.4)', borderRadius: '20px', padding: '20px', color: 'white', boxShadow: '0 8px 32px rgba(124,58,237,0.15)' },
  aiResponseHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(124,58,237,0.2)', paddingBottom: '8px' },
  closeAiBtn: { background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '4px 12px', color: '#a78bfa', fontSize: '12px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 600 },
  aiResponseTitle: { fontSize: '16px', fontWeight: 800, color: '#a78bfa', marginBottom: '16px' },
  aiResponseSteps: { display: 'flex', flexDirection: 'column', gap: '12px' },
  aiResponseStep: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  stepNumIcon: { width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(167,139,250,0.15)', border: '1px solid #a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#a78bfa', flexShrink: 0 },
  guideCard: { margin: '14px 16px 0', background: '#1c1c22', borderRadius: '22px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', color: 'white', border: '1.5px solid #2d2d37', transition: 'transform 0.2s' },
  sosSection: { margin: '24px 16px 0', background: 'rgba(232,25,44,0.05)', border: '1.5px solid rgba(232,25,44,0.15)', borderRadius: '20px', padding: '20px', textAlign: 'center' },
  callBtn: { background: '#E8192C', color: 'white', border: 'none', borderRadius: '14px', padding: '14px 24px', fontFamily: 'Cairo, sans-serif', fontSize: '16px', fontWeight: 800, cursor: 'pointer', width: '100%', boxShadow: '0 6px 18px rgba(232,25,44,0.3)' },
  disclaimer: { margin: '14px 16px 0', background: 'rgba(249,115,22,0.05)', border: '1.5px solid rgba(249,115,22,0.15)', borderRadius: '16px', padding: '14px', fontSize: '12px', color: '#9090a8', lineHeight: 1.7 },
}