import React, { useState, useRef, useEffect } from 'react';

export default function SOSModal({ isOpen, onClose, onSend }) {
  const [note, setNote] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Inject styles for keyframes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'sos-modal-pulse-styles';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `
          @keyframes redPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
              transform: scale(1);
            }
            70% {
              box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
              transform: scale(1.05);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
              transform: scale(1);
            }
          }
          .recording-pulse {
            animation: redPulse 1.5s infinite;
          }
          .glass-input:focus {
            outline: none;
            border-color: #ef4444 !important;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.25) !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert("تعذر الوصول إلى الميكروفون. يرجى إعطاء إذن الوصول لتسجيل ملاحظة صوتية.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Cleanup on unmount or when modal is closed
  useEffect(() => {
    if (!isOpen) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error("Error stopping media recorder on close:", e);
        }
      }
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error("Error stopping stream tracks on close:", e);
        }
        streamRef.current = null;
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Reset forms and voice note state on close
      setNote('');
      setImage(null);
      setImagePreview(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordTime(0);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      // Component unmount cleanup
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => track.stop());
        } catch (e) {}
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const removeAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleSubmit = () => {
    setIsLoading(true);
    
    const sendData = (lat, lon) => {
      const formData = new FormData();
      formData.append('latitude', lat !== null && lat !== undefined ? lat : '');
      formData.append('longitude', lon !== null && lon !== undefined ? lon : '');
      formData.append('note', note || 'طلب استغاثة طارئ');
      if (image) {
        formData.append('image', image);
      }
      if (audioBlob) {
        formData.append('voice_note', audioBlob, 'voice_record.wav');
      }
      
      onSend(formData)
        .then(() => {
          setIsLoading(false);
          setNote('');
          setImage(null);
          setImagePreview(null);
          setAudioBlob(null);
          setAudioUrl(null);
          onClose();
        })
        .catch(err => {
          setIsLoading(false);
          console.error(err);
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendData(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("GPS retrieval error:", error);
          sendData(null, null);
        },
        { timeout: 1500, enableHighAccuracy: false, maximumAge: 60000 }
      );
    } else {
      sendData(null, null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <span style={styles.alertIcon}>🚨</span>
            <h2 style={styles.title}>تأكيد طلب الاستغاثة (SOS)</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose} disabled={isLoading}>×</button>
        </div>

        {/* Form Body */}
        <div style={styles.body}>
          <p style={styles.subtitle}>أضف تفاصيل الحادث لمساعدة المسعفين في الوصول إليك وتحديد الاحتياجات اللازمة بسرعة:</p>

          {/* Text Note */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>وصف الحادث / ملاحظات</label>
            <textarea
              className="glass-input"
              style={styles.textarea}
              placeholder="مثال: حادث سير، إغماء، نزيف، حريق..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Voice Note Section */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>رسالة صوتية (اختياري)</label>
            <div style={styles.voiceSection}>
              {!audioUrl && !isRecording ? (
                <button style={styles.recordStartBtn} onClick={startRecording} disabled={isLoading} type="button">
                  <span style={styles.micIcon}>🎙️</span>
                  <span>ابدأ التسجيل الصوتي</span>
                </button>
              ) : isRecording ? (
                <div style={styles.recordingContainer}>
                  <button 
                    className="recording-pulse" 
                    style={styles.recordStopBtn} 
                    onClick={stopRecording} 
                    type="button"
                  >
                    ⏹️ إيقاف
                  </button>
                  <span style={styles.timer}>{formatTime(recordTime)}</span>
                  <span style={styles.pulseText}>جاري تسجيل الصوت...</span>
                </div>
              ) : (
                <div style={styles.audioPlayerContainer}>
                  <audio src={audioUrl} controls style={styles.audioPlayer} />
                  <button style={styles.deleteBtn} onClick={removeAudio} disabled={isLoading} type="button">حذف</button>
                </div>
              )}
            </div>
          </div>

          {/* Image Picker */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>صورة الحادث (اختياري)</label>
            <div style={styles.imageSection}>
              {!imagePreview ? (
                <label style={styles.imageUploadLabel}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    disabled={isLoading}
                  />
                  <span style={styles.cameraIcon}>📸</span>
                  <span>التقط صورة أو اختر من المعرض</span>
                </label>
              ) : (
                <div style={styles.previewContainer}>
                  <img src={imagePreview} alt="Preview" style={styles.previewImage} />
                  <button style={styles.removeImageBtn} onClick={removeImage} disabled={isLoading} type="button">إزالة الصورة</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={isLoading}>
            إلغاء
          </button>
          <button style={styles.submitBtn} onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'جاري إرسال الاستغاثة...' : 'إرسال نداء الاستغاثة 🚨'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out',
  },
  modal: {
    backgroundColor: 'rgba(28, 28, 36, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)',
    color: '#ffffff',
    direction: 'rtl',
    fontFamily: 'Cairo, sans-serif',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertIcon: {
    fontSize: '22px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    color: '#ef4444',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#a1a1aa',
    fontSize: '28px',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#d1d1d6',
    margin: '0 0 10px 0',
    lineHeight: '1.6',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#a1a1aa',
  },
  textarea: {
    backgroundColor: 'rgba(15, 15, 20, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#ffffff',
    padding: '12px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'Cairo, sans-serif',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  voiceSection: {
    backgroundColor: 'rgba(15, 15, 20, 0.4)',
    border: '1px dotted rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordStartBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '30px',
    color: '#ef4444',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  micIcon: {
    fontSize: '16px',
  },
  recordingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  recordStopBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '30px',
    color: '#ffffff',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  timer: {
    fontFamily: 'monospace',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ef4444',
  },
  pulseText: {
    fontSize: '13px',
    color: '#a1a1aa',
  },
  audioPlayerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  audioPlayer: {
    flex: 1,
    height: '40px',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: 'none',
    borderRadius: '8px',
    color: '#ef4444',
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  imageSection: {
    backgroundColor: 'rgba(15, 15, 20, 0.4)',
    border: '1px dotted rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#3b82f6',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    padding: '10px',
  },
  cameraIcon: {
    fontSize: '18px',
  },
  previewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
  },
  previewImage: {
    width: '100%',
    maxHeight: '180px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  removeImageBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: 'none',
    borderRadius: '8px',
    color: '#ef4444',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '16px',
    marginTop: '20px',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    borderRadius: '12px',
    color: '#ffffff',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
