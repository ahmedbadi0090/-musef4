import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Camera from './pages/Camera'
import Map from './pages/Map'
import Guide from './pages/Guide'
import Profile from './pages/Profile'
import API from './api'

// ─── Helper: read role/username from sessionStorage (tab-specific) ─────────
// sessionStorage is NOT shared between tabs — fixes the cross-tab alarm bug
// where volunteer's tab sets localStorage role=volunteer and reporter's tab
// (same browser, different tab) incorrectly plays the alarm.
function _getTabRole() {
  return sessionStorage.getItem('role') || localStorage.getItem('role') || '';
}
function _getTabUsername() {
  return sessionStorage.getItem('username') || localStorage.getItem('username') || '';
}

// ─── Global alarm singleton (outside React) ─────────────────────────────────
let _globalAudio = null;
let _isAlarmPlaying = false;

function _startAlarm(assignedVolunteer) {
  const role = _getTabRole();
  const username = _getTabUsername();

  // ⛔ Only volunteers and government hear the alarm
  if (role !== 'volunteer' && role !== 'government') return false;

  // ⛔ Only the ASSIGNED volunteer hears this specific alarm (Government hears all pending)
  if (role === 'volunteer' && assignedVolunteer && username !== assignedVolunteer) return false;

  // ⛔ Already playing — don't create another audio instance
  if (_globalAudio || _isAlarmPlaying) return true;

  // Set to true IMMEDIATELY to prevent race conditions (multiple instances)
  _isAlarmPlaying = true;
  _globalAudio = new Audio('/alarm.wav');
  _globalAudio.loop = true;
  _globalAudio.play().catch(err => {
    console.warn('Audio playback blocked:', err);
    _globalAudio = null;
    _isAlarmPlaying = false;
  });
  return true;
}

function _haltAlarm() {
  if (_globalAudio) {
    _globalAudio.pause();
    _globalAudio.currentTime = 0;
    _globalAudio = null;
  }
  _isAlarmPlaying = false;
}
// ─────────────────────────────────────────────────────────────────────────────

// Throttle tracking for API polling
let _lastAlertCheckTs = 0;

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

export default function App() {
  const [alarmActive, setAlarmActive] = useState(false)

  // Wrapper so we can also update React state
  const playAlarm = (assignedVolunteer) => {
    const started = _startAlarm(assignedVolunteer);
    if (started) setAlarmActive(true);
  };

  const stopAlarm = () => {
    _haltAlarm();
    setAlarmActive(false);

    if (_getTabRole() === 'government') {
      API.get('/api/alerts/').then(res => {
         const currentAlerts = res.data.map(a => a.id);
         const muted = JSON.parse(localStorage.getItem('mutedGovAlerts') || '[]');
         localStorage.setItem('mutedGovAlerts', JSON.stringify([...new Set([...muted, ...currentAlerts])]));
      }).catch(err => console.error(err));
    }
  };

  const checkGlobalAlerts = async () => {
    const token = localStorage.getItem('token');
    const role = _getTabRole();
    const username = _getTabUsername();

    // ⛔ Only volunteers and government need this check
    if (!token || (role !== 'volunteer' && role !== 'government') || !username) return;

    // Throttle: skip if last check was <9 seconds ago
    const now = Date.now();
    if (now - _lastAlertCheckTs < 9000) return;
    _lastAlertCheckTs = now;

    try {
      const res = await API.get('/api/alerts/');
      const alerts = res.data;
      let hasPending = false;
      if (role === 'volunteer') {
        hasPending = alerts.some(
          alert =>
            alert.status === 'pending' &&
            alert.volunteer_username === username &&
            !alert.is_declined_by_me
        );
      } else if (role === 'government') {
        const muted = JSON.parse(localStorage.getItem('mutedGovAlerts') || '[]');
        hasPending = alerts.some(
          alert => alert.status !== 'resolved' && !muted.includes(alert.id)
        );
      }

      if (hasPending) {
        // Start alarm only if not already playing
        if (!_isAlarmPlaying) {
          const started = _startAlarm(username);
          if (started) setAlarmActive(true);
        }
      } else {
        // No pending alert → stop
        if (_isAlarmPlaying) {
          _haltAlarm();
          setAlarmActive(false);
        }
      }
    } catch (err) {
      console.error('Failed to check global alerts:', err);
    }
  };

  useEffect(() => {
    // ── Service Worker registration (Web) ────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.error('SW registration failed:', err));
    }

    // ── Native Push Notifications (Capacitor FCM) ────────────────────────────
    const setupNativePush = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') return;
      
      try {
        await PushNotifications.createChannel({
          id: 'emergency_alerts',
          name: 'Emergency Alerts',
          description: 'تنبيهات الحالات الطارئة',
          importance: 5,
          visibility: 1,
          sound: 'alarm.wav',
          vibration: true
        });
      } catch (err) {
        console.warn('Error creating push channel:', err);
      }
      
      await PushNotifications.register();
      
      PushNotifications.addListener('registration', (token) => {
        window.latestFCMToken = token.value;
        const jwt = localStorage.getItem('token');
        if (jwt) {
          API.post('/api/push/fcm-token/', { token: token.value })
            .then(() => console.log('Successfully registered FCM token'))
            .catch(console.error);
        }
      });
      
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        if (notification.data && notification.data.type === 'EMERGENCY_PUSH') {
          playAlarm(notification.data.assignedVolunteer);
          window.dispatchEvent(new CustomEvent('refetch-alerts'));
        } else if (notification.data && notification.data.type === 'SOS_UPDATE') {
          window.dispatchEvent(new CustomEvent('sos-update', { detail: notification.data }));
        }
      });
      
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const url = notification.notification.data.url;
        if (url) window.location.href = url;
      });
    };
    setupNativePush();

    // ── Handle push messages from Service Worker ─────────────────────────────
    const handleSWMessage = (event) => {
      if (event.data?.type === 'EMERGENCY_PUSH') {
        playAlarm(event.data.assignedVolunteer);
        window.dispatchEvent(new CustomEvent('refetch-alerts'));
      } else if (event.data?.type === 'SOS_UPDATE') {
        window.dispatchEvent(new CustomEvent('sos-update', { detail: event.data }));
      } else if (event.data?.type === 'PLAY_ALARM') {
        playAlarm(null);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // ── URL query param: ?playAlarm=true ─────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    if (params.get('playAlarm') === 'true') {
      playAlarm(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ── Custom window events ─────────────────────────────────────────────────
    const onPlayAlarm = () => playAlarm(null);
    const onStopAlarm = () => stopAlarm();
    const handleFCMRegister = () => {
      const jwt = localStorage.getItem('token');
      if (jwt && window.latestFCMToken) {
        API.post('/api/push/fcm-token/', { token: window.latestFCMToken })
          .then(() => console.log('Successfully registered FCM token after login'))
          .catch(console.error);
      } else if (Capacitor.isNativePlatform()) {
        setupNativePush();
      }
    };

    window.addEventListener('play-emergency-alarm', onPlayAlarm);
    window.addEventListener('stop-emergency-alarm', onStopAlarm);
    window.addEventListener('fcm-register', handleFCMRegister);

    // ── Polling every 10 seconds (throttled inside) ──────────────────────────
    checkGlobalAlerts();
    const intervalId = setInterval(checkGlobalAlerts, 10000);

    // Trigger re-check when other parts of the app signal new data
    const onRefetch = () => {
      // Reset throttle so next check runs immediately
      _lastAlertCheckTs = 0;
      checkGlobalAlerts();
    };
    window.addEventListener('refetch-alerts', onRefetch);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
      window.removeEventListener('play-emergency-alarm', onPlayAlarm);
      window.removeEventListener('stop-emergency-alarm', onStopAlarm);
      window.removeEventListener('refetch-alerts', onRefetch);
      window.removeEventListener('fcm-register', handleFCMRegister);
      clearInterval(intervalId);
      _haltAlarm();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrowserRouter>
      {alarmActive && (_getTabRole() === 'volunteer' || _getTabRole() === 'government') && (
        <div style={globalStyles.alarmBanner}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>🚨 نداء استغاثة نشط وارد الآن!</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={globalStyles.dashboardBtn} onClick={() => { stopAlarm(); window.location.href = '/dashboard'; }}>
              📊 لوحة التحكم
            </button>
            <button style={globalStyles.stopAlarmBtn} onClick={stopAlarm}>
              🔕 إيقاف التنبيه
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/camera" element={<PrivateRoute><Camera /></PrivateRoute>} />
        <Route path="/map" element={<PrivateRoute><Map /></PrivateRoute>} />
        <Route path="/guide" element={<PrivateRoute><Guide /></PrivateRoute>} />
        <Route path="/guide/:type" element={<PrivateRoute><Guide /></PrivateRoute>} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}

const globalStyles = {
  alarmBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '500px',
    background: 'rgba(239, 68, 68, 0.95)',
    backdropFilter: 'blur(10px)',
    border: '1.5px solid #ef4444',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999,
    boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
    color: 'white',
    direction: 'rtl',
    fontFamily: 'Cairo, sans-serif'
  },
  stopAlarmBtn: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1.5px solid rgba(255,255,255,0.4)',
    borderRadius: '10px',
    padding: '8px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Cairo',
  },
  dashboardBtn: {
    background: '#ffffff',
    color: '#ef4444',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Cairo',
  }
}