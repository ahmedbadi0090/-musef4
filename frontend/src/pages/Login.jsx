import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    if (!form.username || !form.password) {
      setError('يرجى كتابة اسم المستخدم وكلمة المرور')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await API.post('/api/login/', form)

      console.log("استجابة السيرفر عند الدخول:", res.data)

      const accessToken = res.data.access || res.data.token
      const refreshToken = res.data.refresh

      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('token', accessToken)
      if (refreshToken) localStorage.setItem('refresh', refreshToken)

      const role = res.data.role || res.data.user?.role || 'user'
      const username = res.data.username || res.data.user?.username || form.username

      localStorage.setItem('role', role)
      localStorage.setItem('username', username)
      sessionStorage.setItem('role', role)
      sessionStorage.setItem('username', username)

      // Dispatch event to register FCM token
      window.dispatchEvent(new CustomEvent('fcm-register'));

      if (role === 'volunteer' || role === 'government') {
        navigate('/dashboard')
      } else {
        navigate('/')
      }

    } catch (err) {
      console.error('LOGIN ERROR:', err)

      if (err.response) {
        const serverMsg = err.response.data?.error || err.response.data?.detail
        setError(serverMsg || `خطأ من الخادم: ${err.response.status}`)
      } else if (err.request) {
        setError('فشل الاتصال بالخادم - تأكد أن Django والخادم شغالان')
      } else {
        setError('خطأ: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" style={styles.page}>
      <style>{`
        /* Hide scrollbar for the page wrapper while keeping scroll functionality */
        .login-page {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .login-page::-webkit-scrollbar {
          display: none;             /* Chrome, Safari, Opera */
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        html, body {
          overscroll-behavior-y: contain;
        }
        .login-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          touch-action: manipulation;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(232, 25, 44, 0.4);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(1px) scale(0.98);
          box-shadow: 0 4px 12px rgba(232, 25, 44, 0.3);
        }
        .outline-btn {
          transition: all 0.3s ease;
          touch-action: manipulation;
        }
        .outline-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: #555566;
        }
        .outline-btn:active {
          transform: translateY(1px) scale(0.98);
        }
        .input-field {
          transition: all 0.3s ease;
          touch-action: manipulation;
        }
        .input-field:focus {
          border-color: #E8192C !important;
          box-shadow: 0 0 0 3px rgba(232, 25, 44, 0.15) !important;
        }
        .logo-anim {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-anim { animation: none; }
        }
        /* شاشات قصيرة جداً (هاتف بوضع أفقي أو شاشة صغيرة) */
        @media (max-height: 640px) {
          .login-card {
            padding-top: 20px !important;
            padding-bottom: 20px !important;
            justify-content: flex-start !important;
            gap: 20px !important;
          }
          .login-logo {
            width: 56px !important;
            height: 56px !important;
            font-size: 28px !important;
            border-radius: 18px !important;
          }
          .login-title {
            font-size: 24px !important;
          }
        }
      `}</style>

      <div className="login-card" style={styles.card}>
        <div style={styles.header}>
          <div className="logo-anim login-logo" style={styles.logo}>🚑</div>
          <h1 className="login-title" style={styles.title}>مُسعف</h1>
          <p style={styles.sub}>إسعافات أولية ذكية بلمسة واحدة</p>
        </div>

        {error && <div style={styles.error} role="alert">{error}</div>}

        <form onSubmit={handleSubmit} style={styles.formContainer} noValidate>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">اسم المستخدم</label>
            <input
              id="username"
              className="input-field"
              style={styles.input}
              placeholder="أدخل اسم المستخدم"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
              enterKeyHint="next"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">كلمة المرور</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="password"
                className="input-field"
                style={{ ...styles.input, paddingLeft: '56px' }}
                type={showPassword ? "text" : "password"}
                placeholder="أدخل كلمة المرور"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                enterKeyHint="go"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  left: '16px',
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
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px', color: '#9ba1a6' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px', color: '#9ba1a6' }}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            style={{ ...styles.btnRed, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            disabled={loading}
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={styles.divider}><span>ليس لديك حساب؟</span></div>

        <Link to="/register" style={{ textDecoration: 'none', width: '100%' }}>
          <button className="outline-btn" style={styles.btnOutline}>إنشاء حساب جديد</button>
        </Link>
      </div>
    </div>
  )
}

const styles = {
  page: {
    height: '100vh',
    width: '100%',
    background: '#0a0a0c',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    fontFamily: 'Cairo, sans-serif',
    direction: 'rtl',
    padding: '40px 20px',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  card: {
    background: 'linear-gradient(180deg, #1c1c24 0%, #111116 100%)',
    width: '100%',
    maxWidth: '550px',
    borderRadius: '40px',
    border: '1.5px solid #2d2d37',
    padding: '56px 48px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
    margin: 'auto',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px'
  },
  logo: {
    width: 'clamp(64px, 18vw, 80px)',
    height: 'clamp(64px, 18vw, 80px)',
    background: 'linear-gradient(135deg, #FF3B30 0%, #E8192C 100%)',
    borderRadius: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(30px, 8vw, 40px)',
    boxShadow: '0 12px 32px rgba(232, 25, 44, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
    flexShrink: 0,
  },
  title: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 'clamp(26px, 7vw, 32px)',
    fontWeight: 900,
    margin: 0,
    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
  },
  sub: {
    color: '#9ba1a6',
    textAlign: 'center',
    fontSize: 'clamp(13px, 3.5vw, 15px)',
    margin: 0,
    fontWeight: 500,
    padding: '0 10px',
  },
  error: {
    background: 'rgba(232, 25, 44, 0.1)',
    border: '1px solid rgba(232, 25, 44, 0.3)',
    borderRadius: '16px',
    padding: '14px 16px',
    color: '#ff6b7a',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    wordBreak: 'break-word',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: '#9ba1a6',
    fontSize: '16px',
    fontWeight: 600,
    paddingRight: '6px'
  },
  input: {
    background: '#23232c',
    border: '1.5px solid #32323d',
    borderRadius: '18px',
    padding: '18px 20px',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '18px',
    color: '#ffffff',
    outline: 'none',
    textAlign: 'right',
    width: '100%',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    appearance: 'none',
  },
  btnRed: {
    background: 'linear-gradient(135deg, #FF3B30 0%, #E8192C 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '18px',
    padding: '18px',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '19px',
    fontWeight: 800,
    width: '100%',
    minHeight: '56px',
    boxShadow: '0 8px 24px rgba(232, 25, 44, 0.35)',
    marginTop: '8px',
  },
  btnOutline: {
    background: 'transparent',
    color: '#ffffff',
    border: '1.5px solid #32323d',
    borderRadius: '18px',
    padding: '18px',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    minHeight: '56px',
  },
  divider: {
    textAlign: 'center',
    color: '#666677',
    fontSize: '14px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '4px 0'
  },
}