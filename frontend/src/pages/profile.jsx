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
  const [showOldPw, setShowOldPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const cancelLogout = () => {
    setShowLogoutConfirm(false)
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
    <div className="profile-page">
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
          zIndex: 9999,
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
                onClick={cancelLogout}
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
      <style>{`
        .profile-page {
          min-height: 100vh; 
          width: 100%;
          background: #0f0f12;
          font-family: 'Cairo', sans-serif;
          direction: rtl; 
          padding-bottom: 100px;
          box-sizing: border-box;
        }
        .profile-container {
          max-width: 650px;
          margin: 0 auto;
          background: #16161a;
          box-shadow: 0 0 30px rgba(0,0,0,0.5);
          min-height: 100vh;
        }
        .profile-header {
          background: #16161a; 
          padding: 40px 20px 20px;
          border-bottom: 1px solid #24242b;
        }
        .profile-header-top {
          display: flex; 
          align-items: center; 
          justify-content: space-between;
        }
        .profile-header-title { 
          font-size: 20px; 
          font-weight: 800; 
          color: #f0f0f5; 
        }
        .profile-back-btn {
          width: 40px; 
          height: 40px; 
          border-radius: 50%;
          background: #2d2d37; 
          border: none; 
          color: #f0f0f5;
          font-size: 20px; 
          cursor: pointer; 
          display: flex;
          align-items: center; 
          justify-content: center;
          transition: background 0.3s;
        }
        .profile-back-btn:hover {
          background: #3e3e4a;
        }
        .profile-avatar-section {
          display: flex; 
          flex-direction: column; 
          align-items: center;
          padding: 36px 20px 24px; 
          background: #16161a;
          border-bottom: 1px solid #24242b;
        }
        .profile-big-avatar {
          width: 96px; 
          height: 96px; 
          border-radius: 50%;
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-size: 40px; 
          font-weight: bold; 
          color: white;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .profile-display-name {
          font-size: 24px; 
          font-weight: 800; 
          color: #f0f0f5; 
          margin-top: 14px;
        }
        .profile-username { 
          font-size: 14px; 
          color: #9090a8; 
          margin-top: 4px; 
        }
        .profile-role-badge {
          margin-top: 12px; 
          padding: 6px 18px; 
          border-radius: 20px;
          font-size: 13px; 
          font-weight: 700;
        }
        .profile-info-pills {
          display: flex; 
          flex-direction: column; 
          gap: 10px;
          margin-top: 20px; 
          width: 100%; 
          max-width: 100%; 
        }
        .profile-pill {
          display: flex; 
          align-items: center; 
          gap: 12px;
          background: #1c1c22; 
          border-radius: 14px; 
          padding: 14px 18px;
          border: 1px solid #2d2d37;
        }
        .profile-pill-icon { 
          font-size: 18px; 
        }
        .profile-pill-text { 
          font-size: 15px; 
          color: #c0c0d0; 
          flex: 1; 
          text-align: right; 
        }
        .profile-tabs-wrapper { 
          padding: 20px 20px 0; 
        }
        .profile-tabs {
          display: flex; 
          background: #1c1c22;
          border-radius: 16px; 
          padding: 5px; 
          gap: 6px;
        }
        .profile-tab {
          flex: 1; 
          padding: 13px; 
          border: none; 
          border-radius: 12px;
          background: transparent; 
          color: #9090a8; 
          font-size: 14px;
          font-family: 'Cairo', sans-serif; 
          font-weight: 600; 
          cursor: pointer;
          transition: all 0.2s;
        }
        .profile-tab-active { 
          background: #2d2d37; 
          color: #f0f0f5; 
        }
        .profile-content { 
          padding: 20px; 
        }
        .profile-card {
          background: #16161a; 
          border-radius: 24px; 
          padding: 24px;
          border: 1px solid #2d2d37;
        }
        .profile-field-group { 
          margin-bottom: 20px; 
          text-align: right;
        }
        .profile-label {
          display: block; 
          font-size: 13px; 
          color: #9090a8;
          margin-bottom: 8px; 
          font-weight: 600;
        }
        .profile-input {
          width: 100%; 
          background: #1c1c22; 
          border: 1.5px solid #2d2d37;
          border-radius: 14px; 
          padding: 15px 16px; 
          color: #f0f0f5;
          font-size: 15px; 
          font-family: 'Cairo', sans-serif; 
          outline: none;
          box-sizing: border-box; 
          text-align: right;
          transition: border-color 0.2s;
        }
        .profile-input:focus {
          border-color: #7c3aed;
        }
        
        /* Webkit autofill overrides to preserve dark theme background */
        .profile-input:-webkit-autofill,
        .profile-input:-webkit-autofill:hover, 
        .profile-input:-webkit-autofill:focus, 
        .profile-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #1c1c22 inset !important;
          -webkit-text-fill-color: #f0f0f5 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .profile-msg-box {
          padding: 14px 16px; 
          border-radius: 14px;
          font-size: 14px; 
          font-weight: 600; 
          margin-bottom: 16px;
          text-align: center;
        }
        .profile-save-btn {
          width: 100%; 
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: white; 
          border: none; 
          border-radius: 16px; 
          padding: 16px;
          font-size: 16px; 
          font-weight: 800; 
          font-family: 'Cairo', sans-serif;
          cursor: pointer; 
          box-shadow: 0 4px 16px rgba(124,58,237,0.3);
          margin-top: 4px;
          transition: all 0.3s;
        }
        .profile-save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(124,58,237,0.45);
        }
        .profile-save-btn:active {
          transform: translateY(1px);
        }
        .profile-logout-btn {
          width: 100%; 
          margin-top: 12px;
          background: rgba(239,68,68,0.08); 
          color: #ef4444;
          border: 1.5px solid rgba(239,68,68,0.2); 
          border-radius: 16px;
          padding: 16px; 
          font-size: 16px; 
          font-weight: 800;
          font-family: 'Cairo', sans-serif; 
          cursor: pointer;
          transition: all 0.3s;
        }
        .profile-logout-btn:hover {
          background: rgba(239,68,68,0.12);
        }

        /* Responsive styling for phones and tablets up to 767px */
        @media (max-width: 767px) {
          .profile-container {
            min-height: 100vh;
            max-width: 100%;
            box-shadow: none;
          }
          .profile-page {
            padding-bottom: 80px;
          }
          .profile-header {
            padding: 32px 16px 16px;
          }
          .profile-avatar-section {
            padding: 28px 16px 16px;
          }
          .profile-big-avatar {
            width: 92px;
            height: 92px;
            font-size: 38px;
          }
          .profile-display-name {
            font-size: 22px;
            margin-top: 12px;
          }
          .profile-info-pills {
            margin-top: 16px;
          }
          .profile-pill {
            padding: 14px 16px;
            gap: 10px;
          }
          .profile-tabs-wrapper {
            padding: 16px 16px 0;
          }
          .profile-tab {
            padding: 12px;
            font-size: 14px;
            border-radius: 12px;
          }
          .profile-content {
            padding: 16px;
          }
          .profile-card {
            padding: 20px;
            border-radius: 20px;
          }
          .profile-input {
            padding: 14px 15px;
            font-size: 14px;
            border-radius: 12px;
          }
          .profile-save-btn, .profile-logout-btn {
            padding: 15px;
            font-size: 15px;
            border-radius: 14px;
          }
        }
      `}</style>

      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-header-top">
            <button className="profile-back-btn" onClick={handleBack}>→</button>
            <span className="profile-header-title">الملف الشخصي</span>
            <div style={{ width: 36 }} />
          </div>
        </div>

        {/* Avatar Section */}
        <div className="profile-avatar-section">
          <div className="profile-big-avatar" style={{
            background: user.role === 'volunteer'
              ? (user.is_available ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)')
              : (user.role === 'government' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #ef4444, #7c3aed)')
          }}>
            {(user.first_name || user.username)?.[0]?.toUpperCase() || '👤'}
          </div>
          <div className="profile-display-name">{displayName}</div>
          <div className="profile-username">@{user.username}</div>
          <div className="profile-role-badge" style={{
            background: user.role === 'volunteer' ? 'rgba(34,197,94,0.1)' : (user.role === 'government' ? 'rgba(59,130,246,0.1)' : 'rgba(124,58,237,0.1)'),
            color: user.role === 'volunteer' ? '#22c55e' : (user.role === 'government' ? '#3b82f6' : '#a78bfa'),
            border: `1px solid ${user.role === 'volunteer' ? 'rgba(34,197,94,0.3)' : (user.role === 'government' ? 'rgba(59,130,246,0.3)' : 'rgba(124,58,237,0.3)')}`,
          }}>
            {user.role === 'volunteer'
              ? (user.is_available ? '🟢 متطوع مسعف نشط' : '🔴 متطوع مسعف غير نشط')
              : (user.role === 'government' ? '🏛️ جهة حكومية معتمدة' : '👤 مستخدم عادي')}
          </div>

          {/* Info Pills */}
          <div className="profile-info-pills">
            <div className="profile-pill">
              <span className="profile-pill-icon">📧</span>
              <span className="profile-pill-text">{user.email || 'لم يُضف بريد'}</span>
            </div>
            <div className="profile-pill">
              <span className="profile-pill-icon">📞</span>
              <span className="profile-pill-text">{user.phone || 'لم يُضف هاتف'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs-wrapper">
          <div className="profile-tabs">
            <button
              className={`profile-tab ${tab === 'info' ? 'profile-tab-active' : ''}`}
              onClick={() => { setTab('info'); setMsg(null) }}
            >
              ✏️ تعديل المعلومات
            </button>
            <button
              className={`profile-tab ${tab === 'password' ? 'profile-tab-active' : ''}`}
              onClick={() => { setTab('password'); setPwMsg(null) }}
            >
              🔒 كلمة المرور
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {tab === 'info' && (
            <div className="profile-card">
              <div className="profile-field-group">
                <label className="profile-label">الاسم الأول</label>
                <input
                  className="profile-input"
                  value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })}
                  placeholder="أدخل الاسم الأول"
                />
              </div>
              <div className="profile-field-group">
                <label className="profile-label">الاسم الأخير</label>
                <input
                  className="profile-input"
                  value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })}
                  placeholder="أدخل الاسم الأخير"
                />
              </div>
              <div className="profile-field-group">
                <label className="profile-label">رقم الهاتف</label>
                <input
                  className="profile-input"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="09XXXXXXXX"
                  type="tel"
                />
              </div>
              <div className="profile-field-group">
                <label className="profile-label">البريد الإلكتروني</label>
                <input
                  className="profile-input"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="example@email.com"
                  type="email"
                />
              </div>

              {msg && (
                <div className="profile-msg-box" style={{
                  background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: msg.type === 'success' ? '#22c55e' : '#ef4444',
                  border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {msg.text}
                </div>
              )}

              <button
                className="profile-save-btn"
                style={{ opacity: saving ? 0.7 : 1 }}
                onClick={handleSaveInfo}
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ المعلومات'}
              </button>
            </div>
          )}

          {tab === 'password' && (
            <div className="profile-card">
              <div className="profile-field-group">
                <label className="profile-label">كلمة المرور الحالية</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    className="profile-input"
                    type={showOldPw ? "text" : "password"}
                    value={pwForm.old_password}
                    onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })}
                    placeholder="أدخل كلمة المرور الحالية"
                    style={{ paddingLeft: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPw(!showOldPw)}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5,
                      padding: '0'
                    }}
                  >
                    {showOldPw ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: '#9090a8' }}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: '#9090a8' }}>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="profile-field-group">
                <label className="profile-label">كلمة المرور الجديدة</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    className="profile-input"
                    type={showNewPw ? "text" : "password"}
                    value={pwForm.new_password}
                    onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                    placeholder="8 أحرف على الأقل"
                    style={{ paddingLeft: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5,
                      padding: '0'
                    }}
                  >
                    {showNewPw ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: '#9090a8' }}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: '#9090a8' }}>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="profile-field-group">
                <label className="profile-label">تأكيد كلمة المرور الجديدة</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    className="profile-input"
                    type={showConfirmPw ? "text" : "password"}
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    placeholder="أعد كتابة كلمة المرور الجديدة"
                    style={{ paddingLeft: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5,
                      padding: '0'
                    }}
                  >
                    {showConfirmPw ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: '#9090a8' }}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px', color: '#9090a8' }}>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {pwMsg && (
                <div className="profile-msg-box" style={{
                  background: pwMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: pwMsg.type === 'success' ? '#22c55e' : '#ef4444',
                  border: `1px solid ${pwMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {pwMsg.text}
                </div>
              )}

              <button
                className="profile-save-btn"
                style={{ opacity: saving ? 0.7 : 1 }}
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </button>
            </div>
          )}

          {/* Logout */}
          <button className="profile-logout-btn" onClick={handleLogout}>
            🚪 تسجيل الخروج
          </button>
        </div>
      </div>

      {user && user.role !== 'volunteer' && user.role !== 'government' && (
        <BottomNav active="profile" />
      )}
    </div>
  )
}