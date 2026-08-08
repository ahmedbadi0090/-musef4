import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '', role: 'user', region: 'tripoli' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async () => {
    setError('')
    setSuccessMsg('')

    // التحقق من الحقول الإلزامية في الواجهة الأمامية
    if (!form.username || form.username.trim() === '') {
      setError('اسم المستخدم حقل إلزامي.')
      return
    }
    if (!form.phone || form.phone.trim() === '') {
      setError('رقم الهاتف حقل إلزامي.')
      return
    }
    if (!form.password || form.password.trim() === '') {
      setError('كلمة المرور حقل إلزامي.')
      return
    }

    setLoading(true)
    try {
      await API.post('/api/register/', form)
      
      // إظهار رسالة النجاح
      setSuccessMsg('تم إنشاء الحساب بنجاح! 🎉 جاري تسجيل الدخول تلقائياً...')
      
      // انتظار ثانيتين ثم تسجيل الدخول تلقائياً
      setTimeout(async () => {
        try {
          const res = await API.post('/api/login/', {
            username: form.username,
            password: form.password,
          })
          localStorage.setItem('token', res.data.access)
          localStorage.setItem('refresh', res.data.refresh)
          navigate('/')
        } catch (err) {
          navigate('/login')
        }
      }, 2000)

    } catch (err) {
      if (err.response && err.response.data) {
        const errors = err.response.data
        if (errors.email) {
          setError(Array.isArray(errors.email) ? errors.email[0] : errors.email)
        } else if (errors.username) {
          setError(Array.isArray(errors.username) ? errors.username[0] : errors.username)
        } else if (errors.phone) {
          setError(Array.isArray(errors.phone) ? errors.phone[0] : errors.phone)
        } else if (errors.password) {
          setError(Array.isArray(errors.password) ? errors.password[0] : errors.password)
        } else {
          setError('حدث خطأ في التسجيل، يرجى التحقق من البيانات.')
        }
      } else {
        setError('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <style>{`
        .register-page {
          min-height: 100vh;
          width: 100%;
          background: #1a1a1f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cairo', sans-serif;
          direction: rtl;
          padding: 24px;
          box-sizing: border-box;
          overflow-y: auto;
        }
        .register-card {
          background: linear-gradient(180deg, #1c1c24 0%, #111116 100%);
          border-radius: 36px;
          padding: 48px 40px;
          width: 100%;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.6);
          box-sizing: border-box;
          border: 1.5px solid #2d2d37;
          margin: auto;
        }
        .register-logo {
          width: 90px; 
          height: 90px; 
          border-radius: 24px;
          display: flex; 
          align-items: center; 
          justify-content: center;
          margin: 0 auto;
          background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
          box-shadow: 0 8px 24px rgba(124,58,237,0.3), inset 0 2px 4px rgba(255,255,255,0.3);
        }
        .register-title { 
          text-align: center; 
          font-size: 39px; 
          font-weight: 900; 
          margin: 0;
          color: #a78bfa;
        }
        .register-sub { 
          color: #9090a8; 
          text-align: center; 
          font-size: 19px; 
          margin: 0;
          font-weight: 500;
        }
        .register-error { 
          background: rgba(232,25,44,0.1); 
          border: 1px solid rgba(232,25,44,0.3); 
          border-radius: 20px; 
          padding: 16px 20px; 
          color: #ff6b7a; 
          font-size: 18px;
          text-align: center;
        }
        .register-success { 
          background: rgba(34,197,94,0.15); 
          border: 1px solid rgba(34,197,94,0.4); 
          border-radius: 20px; 
          padding: 16px 20px; 
          color: #22C55E; 
          font-size: 18px;
          text-align: center;
          font-weight: bold;
        }
        .register-field { 
          display: flex; 
          flex-direction: column; 
          gap: 11px; 
          width: 100%;
        }
        .register-label { 
          color: #e1e3e6; 
          font-size: 18px; 
          font-weight: 600;
          text-align: right;
          padding-right: 6px;
        }
        .register-input {
          background: #2e2e35; 
          border: 1.5px solid #3a3a45; 
          border-radius: 22px;
          padding: 21px 24px; 
          font-family: 'Cairo', sans-serif; 
          font-size: 20px;
          color: #f0f0f5; 
          outline: none; 
          text-align: right;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }
        .register-input:focus {
          border-color: #7C3AED;
          box-shadow: 0 0 0 4px rgba(124,58,237,0.2);
        }
        
        /* Webkit autofill overrides to preserve dark theme background */
        .register-input:-webkit-autofill,
        .register-input:-webkit-autofill:hover, 
        .register-input:-webkit-autofill:focus, 
        .register-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #2e2e35 inset !important;
          -webkit-text-fill-color: #f0f0f5 !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .btn-purple {
          background: #7C3AED; 
          color: white; 
          border: none; 
          border-radius: 22px;
          padding: 21px; 
          font-family: 'Cairo', sans-serif; 
          font-size: 22px;
          font-weight: 800; 
          cursor: pointer;
          width: 100%;
          box-shadow: 0 6px 20px rgba(124,58,237,0.35);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-purple:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(124,58,237,0.45);
        }
        .btn-purple:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn-register-outline {
          background: transparent; 
          color: #9090a8; 
          border: none;
          border-radius: 22px; 
          padding: 18px; 
          font-family: 'Cairo', sans-serif;
          font-size: 19px; 
          cursor: pointer; 
          width: 100%;
          transition: all 0.3s ease;
        }
        .btn-register-outline:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        /* Responsive Breakpoints - Standard Mobile Breakpoint at 767px */
        @media (max-width: 767px) {
          .register-page {
            padding: 0;
          }
          .register-card {
            border-radius: 0;
            min-height: 100vh;
            padding: 52px 32px;
            gap: 26px;
            max-width: 100%;
            border: none;
            box-shadow: none;
          }
          .register-logo {
            width: 100px;
            height: 100px;
            font-size: 48px;
            border-radius: 28px;
          }
          .register-title {
            font-size: 36px;
          }
          .register-sub {
            font-size: 20px;
          }
          .register-input, .btn-purple, .btn-register-outline {
            padding: 20px 22px;
            font-size: 19px;
            border-radius: 16px;
          }
          .register-label {
            font-size: 17px;
          }
          .register-success {
            padding: 20px 22px;
            font-size: 18px;
            border-radius: 16px;
          }
        }
      `}</style>

      <div className="register-card">
        <div className="register-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <h1 className="register-title">حساب جديد</h1>
        <p className="register-sub">انضم كمستخدم أو متطوع مسعف</p>

        {error && <div className="register-error">⚠️ {error}</div>}
        {successMsg && <div className="register-success">✅ {successMsg}</div>}

        {[
          { key: 'username', label: 'اسم المستخدم', type: 'text', placeholder: 'اختر اسم مستخدم' },
          { key: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'example@email.com' },
          { key: 'phone', label: 'رقم الهاتف', type: 'tel', placeholder: '09XXXXXXXX' },
          { key: 'password', label: 'كلمة المرور', type: 'password', placeholder: 'كلمة مرور قوية' },
        ].map(f => (
          <div key={f.key} className="register-field">
            <label className="register-label">{f.label}</label>
            {f.key === 'password' ? (
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  className="register-input"
                  type={showPassword ? "text" : "password"}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ paddingLeft: '56px' }}
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px', color: '#9090a8' }}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px', color: '#9090a8' }}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <input
                className="register-input"
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}

        <div className="register-field">
          <label className="register-label">نوع الحساب</label>
          <select
            className="register-input"
            style={{ cursor: 'pointer' }}
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
          >
            <option value="user">مستخدم عادي</option>
            <option value="volunteer">متطوع مسعف</option>
            <option value="government">جهة حكومية 🏛️</option>
          </select>
        </div>

        <div className="register-field">
          <label className="register-label">المدينة / المنطقة في ليبيا</label>
          <select
            className="register-input"
            style={{ cursor: 'pointer' }}
            value={form.region}
            onChange={e => setForm({ ...form, region: e.target.value })}
          >
            <option value="tripoli">طرابلس</option>
            <option value="benghazi">بنغازي</option>
            <option value="misrata">مصراتة</option>
            <option value="zawiya">الزاوية</option>
            <option value="sabha">سبها</option>
            <option value="khums">الخمس</option>
            <option value="zliten">زليتن</option>
            <option value="gharyan">غريان</option>
            <option value="bayda">البيضاء</option>
            <option value="tobruk">طبرق</option>
            <option value="sirte">سرت</option>
            <option value="tarhuna">ترهونة</option>
            <option value="kufra">الكفرة</option>
            <option value="derna">درنة</option>
          </select>
        </div>

        <button
          className="btn-purple"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>

        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button className="btn-register-outline">← العودة لتسجيل الدخول</button>
        </Link>
      </div>
    </div>
  )
}