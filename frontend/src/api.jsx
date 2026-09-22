import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const LOCAL_IP = '192.168.1.7'; // ⚠️ IP جهازك الحالي — حدّثه كل ما تتغير الشبكة

function getBaseUrl() {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') return `http://${LOCAL_IP}:8000`;
  if (platform === 'ios') return `http://${LOCAL_IP}:8000`;

  // احتياطي: لو Capacitor ما قدر يكتشف المنصة صح (مشكلة شفناها بـ MuMuPlayer)
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return `http://${LOCAL_IP}:8000`;
  if (/iphone|ipad|ipod/i.test(ua)) return `http://${LOCAL_IP}:8000`;

  return 'http://127.0.0.1:8000'; // متصفح عادي فعلي (dev على الويب)
}

const BASE_URL = getBaseUrl();

const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh');
        const res = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh });
        localStorage.setItem('token', res.data.access);
        original.headers.Authorization = `Bearer ${res.data.access}`;
        return API(original);
      } catch (e) {
        localStorage.clear(); sessionStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;