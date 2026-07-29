import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import API from '../api'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '', role: 'user', region: 'tripoli' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      await API.post('/api/register/', form)
      // بعد التسجيل، سجل الدخول مباشرة
      const res = await API.post('/api/login/', {
        username: form.username,
        password: form.password,
      })
      localStorage.setItem('token', res.data.access)
      localStorage.setItem('refresh', res.data.refresh)
      navigate('/')
    } catch (err) {
      setError('حدث خطأ في التسجيل، تحقق من البيانات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ ...styles.logo, background: '#7C3AED' }}>➕</div>
        <h1 style={{ ...styles.title, color: '#7C3AED' }}>حساب جديد</h1>
        <p style={styles.sub}>انضم كمستخدم أو متطوع مسعف</p>

        {error && <div style={styles.error}>{error}</div>}

        {[
          { key: 'username', label: 'اسم المستخدم', type: 'text', placeholder: 'اختر اسم مستخدم' },
          { key: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'example@email.com' },
          { key: 'phone', label: 'رقم الهاتف', type: 'tel', placeholder: '09XXXXXXXX' },
          { key: 'password', label: 'كلمة المرور', type: 'password', placeholder: 'كلمة مرور قوية' },
        ].map(f => (
          <div key={f.key} style={styles.field}>
            <label style={styles.label}>{f.label}</label>
            <input
              style={styles.input}
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}

        <div style={styles.field}>
          <label style={styles.label}>نوع الحساب</label>
          <select
            style={{ ...styles.input, cursor: 'pointer' }}
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
          >
            <option value="user">مستخدم عادي</option>
            <option value="volunteer">متطوع مسعف</option>
            <option value="government">جهة حكومية 🏛️</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>المدينة / المنطقة في ليبيا</label>
          <select
            style={{ ...styles.input, cursor: 'pointer' }}
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
          style={{ ...styles.btnRed, background: '#7C3AED', boxShadow: '0 6px 20px rgba(124,58,237,0.35)' }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>

        <Link to="/login" style={{ textDecoration: 'none' }}>
          <button style={styles.btnOutline}>← العودة لتسجيل الدخول</button>
        </Link>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', background: '#1a1a1f',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Cairo, sans-serif', direction: 'rtl', padding: '20px',
    maxWidth: '550px', margin: '0 auto',
  },
  card: {
    background: '#242429', borderRadius: '24px',
    padding: '40px 28px', width: '100%',
    display: 'flex', flexDirection: 'column', gap: '14px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  logo: {
    width: '72px', height: '72px', borderRadius: '20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '36px', margin: '0 auto',
  },
  title: { textAlign: 'center', fontSize: '28px', fontWeight: 900, margin: 0 },
  sub: { color: '#9090a8', textAlign: 'center', fontSize: '14px', margin: 0 },
  error: { background: 'rgba(232,25,44,0.1)', border: '1px solid rgba(232,25,44,0.3)', borderRadius: '12px', padding: '10px 14px', color: '#ff6b7a', fontSize: '13px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#9090a8', fontSize: '13px', fontWeight: 600 },
  input: {
    background: '#2e2e35', border: '1.5px solid #3a3a45', borderRadius: '14px',
    padding: '13px 16px', fontFamily: 'Cairo, sans-serif', fontSize: '15px',
    color: '#f0f0f5', outline: 'none', textAlign: 'right',
  },
  btnRed: {
    background: '#E8192C', color: 'white', border: 'none', borderRadius: '14px',
    padding: '14px', fontFamily: 'Cairo, sans-serif', fontSize: '16px',
    fontWeight: 700, cursor: 'pointer',
  },
  btnOutline: {
    background: 'transparent', color: '#9090a8', border: 'none',
    borderRadius: '14px', padding: '12px', fontFamily: 'Cairo, sans-serif',
    fontSize: '14px', cursor: 'pointer', width: '100%',
  },
}