import axios from 'axios';

function createAPI() {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    withCredentials: true,
  });

  // Dynamically set New-Api-User header on EVERY request from current localStorage
  instance.interceptors.request.use((config) => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const uid = JSON.parse(raw).id;
        if (uid != null) config.headers['New-Api-User'] = String(uid);
      }
    } catch {}
    config.headers['Cache-Control'] = 'no-store';
    return config;
  });

  // GET dedup
  const origGet = instance.get.bind(instance);
  const inflight = new Map();
  instance.get = (url, config = {}) => {
    if (config?.disableDuplicate) return origGet(url, config);
    const key = `${url}?${JSON.stringify(config.params || {})}`;
    if (inflight.has(key)) return inflight.get(key);
    const p = origGet(url, config).finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };

  instance.interceptors.response.use(
    r => r,
    err => {
      if (err.config?.skipErrorHandler) return Promise.reject(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('user');
        if (window.location.pathname.startsWith('/console')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(err);
    }
  );

  return instance;
}

export let API = createAPI();

export function updateAPI() {
  API = createAPI();
}
