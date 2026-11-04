export const resolveApiBaseUrl = (value) => {
  const normalized = (value || '/api').replace(/\/+$/, '');
  if (import.meta.env?.PROD && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/api)?$/i.test(normalized)) {
    return '/api';
  }
  return normalized;
};

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
