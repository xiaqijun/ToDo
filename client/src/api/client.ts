import axios from 'axios';

function getApiBase(): string {
  const stored = localStorage.getItem('serverUrl');
  if (stored) return stored;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:3001';
}

const client = axios.create({
  baseURL: `${getApiBase()}/api`,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export function setServerUrl(url: string) {
  localStorage.setItem('serverUrl', url);
  client.defaults.baseURL = `${url}/api`;
}

export function getServerUrl(): string {
  return client.defaults.baseURL?.replace('/api', '') || 'http://localhost:3001';
}

export default client;
