import axios from 'axios';

/** Placeholder localStorage key under which the auth token is stored. */
export const AUTH_TOKEN_KEY = 'auth_token';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/** Shared axios instance for talking to the XRM migration backend. */
export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the bearer token (if present) to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
