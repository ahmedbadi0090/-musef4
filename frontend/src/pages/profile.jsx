import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import BottomNav from '../components/BottomNav'

export default function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('info') 
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '' })
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [pwMsg, setPwMsg] = useState(null)

  useEffect(() => {
    API.get('/api/profile/')
      .then(res => {
        setUser(res.data)
        localStorage.setItem('role', res.data.role)
        localStorage.setItem('username', res.data.username)
        setForm({
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
        })
      })
      .catch(() => {
        localStorage.clear()
        navigate('/login')
      })
  }, [navigate])

  const displayName = user
    ? (user.first_name || user.last_name
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
        : user.username)
    : ''

  const handleSaveInfo = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await API.patch('/api/profile/update/', form)
      setUser(res.data)
      setForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
      })
      setMsg({ type: 'success', text: 'تم حفظ المعلومات بنجاح ✅' })
    } catch (e) {
      const errors = e.response?.data
      if (errors) {
        const first = Object.values(errors)[0]
        setMsg({ type: 'error', text: Array.isArray(first) ? first[0] : first })
      } else {
        setMsg({ type: 'error', text: 'حدث خطأ، حاول مجدداً' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwMsg(null)
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'كلمتا المرور غير متطابقتين' })
      return
    }
    if (pwForm.new_password.length < 8) {
      setPwMsg({ type: 'error', text: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
      return
    }
    setSaving(true)
    try {
      await API.post('/api/profile/change-password/', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      })
      setPwMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح ✅' })
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (e) {
      const err = e.response?.data
      setPwMsg({ type: 'error', text: err?.old_password?.[0] || err?.detail || 'كلمة المرور الحالية غير صحيحة' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const handleBack = () => {
    if (user && user.role === 'government') {
      navigate('/dashboard')
    } else {
      navigate('/')
    }
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0f0f12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#9090a8', fontFamily: 'Cairo', fontSize: '16px' }}>جاري التحميل...</div>
    </div>
  )

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <button style={styles.backBtn} onClick={handleBack}>→</button>
          <span style={styles.headerTitle}>الملف الشخصي</span>
          <div style={{ width: 36 }} />
        </div>
      </div>

      {/* Avatar Section */}
      <div style={styles.avatarSection}>
        <div style={{
          ...styles.bigAvatar,
          background: user.role === 'volunteer'
            ? (user.is_available ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)')
            : (user.role === 'government' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #ef4444, #7c3aed)')
        }}>
          {(user.first_name || user.username)?.[0]?.toUpperCase() || '👤'}
        </div>
        <div style={styles.displayName}>{displayName}</div>
        <div style={styles.username}>@{user.username}</div>
        <div style={{
          ...styles.roleBadge,
          background: user.role === 'volunteer' ? 'rgba(34,197,94,0.1)' : (user.role === 'government' ? 'rgba(59,130,246,0.1)' : 'rgba(124,58,237,0.1)'),
          color: user.role === 'volunteer' ? '#22c55e' : (user.role === 'government' ? '#3b82f6' : '#a78bfa'),
          border: `1px solid ${user.role === 'volunteer' ? 'rgba(34,197,94,0.3)' : (user.role === 'government' ? 'rgba(59,130,246,0.3)' : 'rgba(124,58,237,0.3)')}`,
        }}>
          {user.role === 'volunteer'
            ? (user.is_available ? '🟢 متطوع مسعف نشط' : '🔴 متطوع مسعف غير نشط')
            : (user.role === 'government' ? '🏛️ جهة حكومية معتمدة' : '👤 مستخدم عادي')}
        </div>

        {/* Info Pills */}
        <div style={styles.infoPills}>
          <div style={styles.pill}>
            <span style={styles.pillIcon}>📧</span>
            <span style={styles.pillText}>{user.email || 'لم يُضف بريد'}</span>
          </div>
          <div style={styles.pill}>
            <span style={styles.pillIcon}>📞</span>
            <span style={styles.pillText}>{user.phone || 'لم يُضف هاتف'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsWrapper}>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'info' ? styles.tabActive : {}) }}
            onClick={() => { setTab('info'); setMsg(null) }}
          >
            ✏️ تعديل المعلومات
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'password' ? styles.tabActive : {}) }}
            onClick={() => { setTab('password'); setPwMsg(null) }}
          >
            🔒 كلمة المرور
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {tab === 'info' && (
          <div style={styles.card}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>الاسم الأول</label>
              <input
                style={styles.input}
                value={form.first_name}
                onChange={e => setForm({ ...form, first_name: e.target.value })}
                placeholder="أدخل الاسم الأول"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>الاسم الأخير</label>
              <input
                style={styles.input}
                value={form.last_name}
                onChange={e => setForm({ ...form, last_name: e.target.value })}
                placeholder="أدخل الاسم الأخير"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>رقم الهاتف</label>
              <input
                style={styles.input}
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="09XXXXXXXX"
                type="tel"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>البريد الإلكتروني</label>
              <input
                style={styles.input}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="example@email.com"
                type="email"
              />
            </div>

            {msg && (
              <div style={{
                ...styles.msgBox,
                background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: msg.type === 'success' ? '#22c55e' : '#ef4444',
                border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {msg.text}
              </div>
            )}

            <button
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
              onClick={handleSaveInfo}
              disabled={saving}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ المعلومات'}
            </button>
          </div>
        )}

        {tab === 'password' && (
          <div style={styles.card}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>كلمة المرور الحالية</label>
              <input
                style={styles.input}
                type="password"
                value={pwForm.old_password}
                onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })}
                placeholder="أدخل كلمة المرور الحالية"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>كلمة المرور الجديدة</label>
              <input
                style={styles.input}
                type="password"
                value={pwForm.new_password}
                onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                placeholder="8 أحرف على الأقل"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>تأكيد كلمة المرور الجديدة</label>
              <input
                style={styles.input}
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="أعد كتابة كلمة المرور الجديدة"
              />
            </div>

            {pwMsg && (
              <div style={{
                ...styles.msgBox,
                background: pwMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: pwMsg.type === 'success' ? '#22c55e' : '#ef4444',
                border: `1px solid ${pwMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {pwMsg.text}
              </div>
            )}

            <button
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
              onClick={handleChangePassword}
              disabled={saving}
            >
              {saving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </div>
        )}

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          🚪 تسجيل الخروج
        </button>
      </div>

      {user && user.role !== 'volunteer' && user.role !== 'government' && (
        <BottomNav active="profile" />
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', 
    maxWidth: '650px', // 💥 تم تكبيرها من 550px إلى 650px لشاشة أعرض وأريح للعين
    margin: '0 auto',
    background: '#0f0f12', fontFamily: 'Cairo, sans-serif',
    direction: 'rtl', paddingBottom: '100px',
  },
  header: {
    background: '#16161a', padding: '50px 20px 20px',
    borderBottom: '1px solid #24242b',
  },
  headerTop: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: '18px', fontWeight: 800, color: '#f0f0f5' },
  backBtn: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: '#2d2d37', border: 'none', color: '#f0f0f5',
    fontSize: '18px', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarSection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '32px 20px 24px', background: '#16161a',
    borderBottom: '1px solid #24242b',
  },
  bigAvatar: {
    width: '88px', height: '88px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '36px', fontWeight: 'bold', color: 'white',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  displayName: {
    fontSize: '22px', fontWeight: 800, color: '#f0f0f5', marginTop: '14px',
  },
  username: { fontSize: '13px', color: '#9090a8', marginTop: '4px' },
  roleBadge: {
    marginTop: '10px', padding: '5px 16px', borderRadius: '20px',
    fontSize: '12px', fontWeight: 700,
  },
  infoPills: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    marginTop: '16px', width: '100%', maxWidth: '100%', // 💥 جعل البطاقات تأخذ العرض الكامل المتناسق مع الحجم الجديد
  },
  pill: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#1c1c22', borderRadius: '12px', padding: '12px 16px',
    border: '1px solid #2d2d37',
  },
  pillIcon: { fontSize: '16px' },
  pillText: { fontSize: '14px', color: '#c0c0d0', flex: 1, textAlign: 'right' },
  tabsWrapper: { padding: '16px 16px 0' },
  tabs: {
    display: 'flex', background: '#1c1c22',
    borderRadius: '14px', padding: '4px', gap: '4px',
  },
  tab: {
    flex: 1, padding: '11px', border: 'none', borderRadius: '10px',
    background: 'transparent', color: '#9090a8', fontSize: '13px',
    fontFamily: 'Cairo, sans-serif', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: { background: '#2d2d37', color: '#f0f0f5' },
  content: { padding: '16px' },
  card: {
    background: '#16161a', borderRadius: '20px', padding: '20px',
    border: '1px solid #2d2d37',
  },
  fieldGroup: { marginBottom: '16px' },
  label: {
    display: 'block', fontSize: '12px', color: '#9090a8',
    marginBottom: '8px', fontWeight: 600,
  },
  input: {
    width: '100%', background: '#1c1c22', border: '1.5px solid #2d2d37',
    borderRadius: '12px', padding: '13px 14px', color: '#f0f0f5',
    fontSize: '14px', fontFamily: 'Cairo, sans-serif', outline: 'none',
    boxSizing: 'border-box', textAlign: 'right',
    transition: 'border-color 0.2s',
  },
  msgBox: {
    padding: '12px 14px', borderRadius: '12px',
    fontSize: '13px', fontWeight: 600, marginBottom: '14px',
    textAlign: 'center',
  },
  saveBtn: {
    width: '100%', background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: 'white', border: 'none', borderRadius: '14px', padding: '14px',
    fontSize: '15px', fontWeight: 800, fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
    marginTop: '4px',
  },
  logoutBtn: {
    width: '100%', marginTop: '12px',
    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
    border: '1.5px solid rgba(239,68,68,0.2)', borderRadius: '14px',
    padding: '14px', fontSize: '15px', fontWeight: 800,
    fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
  },
}