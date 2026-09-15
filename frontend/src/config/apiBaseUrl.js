export const resolveApiBaseUrl = (value) => (value || '/api').replace(/\/+$/, '');

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
