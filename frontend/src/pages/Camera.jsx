import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'

export default function Camera() {
  const navigate = useNavigate()
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const fileRef = useRef()
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef()

  // تشغيل الكاميرا
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // كاميرا خلفية
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      setCameraActive(true)
      setPreview(null)
      setResult(null)
      setError('')
    } catch (e) {
      setError('تعذر فتح الكاميرا — تحقق من الإذن')
    }
  }

  // إيقاف الكاميرا
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // التقاط صورة من الكاميرا
  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
      setImage(file)
      setPreview(canvas.toDataURL('image/jpeg'))
      stopCamera()
      setResult(null)
    }, 'image/jpeg', 0.9)
  }

  // اختيار من المعرض
  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    stopCamera()
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setError('')
  }

  // تحليل الإصابة
  const handleAnalyze = async () => {
    if (!image) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('image', image)
      const res = await API.post('/api/analyze/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.error || 'حدث خطأ في الاتصال بالخادم')
    }
    setLoading(false)
  }

  // إيقاف الكاميرا عند الخروج
  useEffect(() => {
    return () => stopCamera()
  }, [])

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => { stopCamera(); navigate('/') }} style={styles.backBtn}>←</button>
        <h2 style={styles.headerTitle}>المحلل البصري</h2>
        <span style={styles.badge}>YOLO + Llama</span>
      </div>

      <div style={styles.content}>

        {/* Camera / Preview Box */}
        <div style={styles.cameraBox}>
          {/* فيديو مباشر */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              display: cameraActive ? 'block' : 'none',
              width: '100%', height: '100%',
              objectFit: 'cover', borderRadius: '14px'
            }}
          />

          {/* معاينة الصورة الملتقطة */}
          {preview && !cameraActive && (
            <img src={preview} alt="preview" style={{
              width: '100%', height: '100%',
              objectFit: 'cover', borderRadius: '14px'
            }} />
          )}

          {/* الحالة الافتراضية */}
          {!cameraActive && !preview && (
            <>
              <div style={styles.cornerTL} />
              <div style={styles.cornerBR} />
              <span style={{ fontSize: '48px', marginBottom: '12px' }}>📷</span>
              <p style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '600' }}>
                افتح الكاميرا أو اختر صورة
              </p>
            </>
          )}
        </div>

        {/* canvas مخفي للالتقاط */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* أزرار */}
        <div style={styles.buttonsRow}>
          {/* زر المعرض */}
          <button onClick={() => { stopCamera(); fileRef.current.click() }} style={styles.btnOutline}>
            🖼️ معرض
          </button>

          {/* زر الكاميرا أو الالتقاط */}
          {cameraActive ? (
            <button onClick={capturePhoto} style={styles.btnCapture}>
              📸 التقاط
            </button>
          ) : (
            <button onClick={startCamera} style={styles.btnCamera}>
              🎥 الكاميرا
            </button>
          )}

          {/* زر التحليل */}
          <button
            onClick={handleAnalyze}
            disabled={!image || loading}
            style={image && !loading ? styles.btnPrimary : styles.btnDisabled}
          >
            {loading ? '⏳' : '⚡ تحليل'}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          style={{ display: 'none' }}
        />

        {/* Loading */}
        {loading && (
          <div style={styles.loadingBox}>
            <p style={{ color: '#f3f4f6', fontSize: '14px', fontWeight: '700' }}>
              🔄 نظام YOLO يحلل الصورة...
            </p>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
              Llama يجهز التقرير الطبي
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>❌ {error}</div>
        )}

        {/* Result */}
        {result && (
          <div style={styles.resultBox}>
            {result.yolo_detections && result.yolo_detections.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={styles.sectionLabel}>🎯 نظام الكشف — نوع الإصابة</p>
                {result.yolo_detections.map((d, i) => (
                  <div key={i} style={styles.detectionItem}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#818cf8' }}>{d.class}</span>
                    <span style={{ color: '#818cf8', fontSize: '14px', fontWeight: '800' }}>
                      {Math.round(d.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p style={{ ...styles.sectionLabel, color: '#f87171' }}>
                🤖 التقرير الطبي (Llama Scout)
              </p>
              <div style={styles.reportBox}>
                <p style={{ color: '#e5e7eb', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-line', margin: 0 }}>
                  {result.gemini_analysis}
                </p>
              </div>
            </div>

            <button onClick={() => navigate('/')} style={{ ...styles.btnPrimary, width: '100%', marginTop: '20px' }}>
              🚑 العودة لطلب مساعدة فورية
            </button>
          </div>
        )}
      </div>
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
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: '#161618',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: 'rgba(230,0,18,0.15)', border: 'none', color: '#ef4444',
    fontSize: '22px', width: '36px', height: '36px', borderRadius: '10px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { margin: 0, fontSize: '18px', fontWeight: '800', color: '#f3f4f6' },
  badge: {
    marginRight: 'auto', background: 'rgba(79,70,229,0.2)', color: '#818cf8',
    borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '800',
  },
  content: { padding: '20px' },
  cameraBox: {
    background: '#1c1c1f', borderRadius: '16px', height: '280px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', border: '2px dashed rgba(230,0,18,0.4)',
    cursor: 'pointer', position: 'relative', marginBottom: '16px',
    overflow: 'hidden',
  },
  cornerTL: { position: 'absolute', top: '16px', right: '16px', width: '24px', height: '24px', borderTop: '3px solid #e60012', borderRight: '3px solid #e60012', borderRadius: '0 6px 0 0' },
  cornerBR: { position: 'absolute', bottom: '16px', left: '16px', width: '24px', height: '24px', borderBottom: '3px solid #e60012', borderLeft: '3px solid #e60012', borderRadius: '0 0 6px 0' },
  buttonsRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
  btnOutline: {
    flex: 1, padding: '13px 8px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px',
    color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
    fontFamily: 'Cairo, sans-serif',
  },
  btnCamera: {
    flex: 2, padding: '13px', background: '#7C3AED', border: 'none',
    borderRadius: '12px', color: 'white', cursor: 'pointer',
    fontSize: '14px', fontWeight: '800', fontFamily: 'Cairo, sans-serif',
    boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
  },
  btnCapture: {
    flex: 2, padding: '13px', background: '#22C55E', border: 'none',
    borderRadius: '12px', color: 'white', cursor: 'pointer',
    fontSize: '14px', fontWeight: '800', fontFamily: 'Cairo, sans-serif',
    boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
    animation: 'pulse 1s infinite',
  },
  btnPrimary: {
    flex: 2, padding: '13px', background: '#e60012', border: 'none',
    borderRadius: '12px', color: 'white', cursor: 'pointer',
    fontSize: '14px', fontWeight: '800', fontFamily: 'Cairo, sans-serif',
    boxShadow: '0 4px 16px rgba(230,0,18,0.4)',
  },
  btnDisabled: {
    flex: 2, padding: '13px', background: '#27272a', border: 'none',
    borderRadius: '12px', color: '#52525b', cursor: 'not-allowed',
    fontSize: '14px', fontWeight: '800', fontFamily: 'Cairo, sans-serif',
  },
  loadingBox: {
    background: '#1c1c1f', borderRadius: '16px', padding: '24px',
    textAlign: 'center', marginBottom: '20px',
  },
  errorBox: {
    background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: '12px', padding: '16px', marginBottom: '20px',
    color: '#f87171', fontSize: '13px', fontWeight: '600',
  },
  resultBox: {
    background: '#1c1c1f', borderRadius: '20px', padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  sectionLabel: { color: '#818cf8', fontSize: '14px', fontWeight: '800', marginBottom: '10px' },
  detectionItem: {
    display: 'flex', justifyContent: 'space-between',
    background: 'rgba(79,70,229,0.15)', borderRadius: '10px',
    padding: '12px 16px', marginBottom: '8px',
  },
  reportBox: {
    background: 'rgba(230,0,18,0.05)', borderRadius: '14px',
    padding: '16px', border: '1px solid rgba(230,0,18,0.1)',
  },
}