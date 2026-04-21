import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

// localStorage keys used to persist auth state after login.
const TOKEN_KEY = 'lms_token'
const USER_KEY = 'lms_user'
// Frontend API prefix; in dev this path is proxied to the backend server.
const API_BASE_URL = '/api'

// Create an Axios instance pointed at the Laravel API
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Add Bearer token to requests when logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const isAuth401 = (err) => {
  const status = Number(err?.response?.status)
  if (status !== 401) return false

  const payload = err?.response?.data || {}
  if (payload?.should_logout === true) return true

  const reason = String(payload?.reason ?? '').toLowerCase()
  if (
    reason === 'session_expired' ||
    reason === 'idle_timeout' ||
    reason === 'concurrent_login'
  ) {
    return true
  }

  const message = String(
    payload?.message ??
    payload?.error ??
    ''
  ).toLowerCase()

  // Only clear local auth for actual auth-token/session failures.
  // Keep session for other 401s (e.g. ERMS API-key protected endpoints).
  return (
    message.includes('unauthenticated') ||
    message.includes('invalid token') ||
    message.includes('token has expired') ||
    message.includes('token expired') ||
    message.includes('session has expired') ||
    message.includes('session expired') ||
    message.includes('another device')
  )
}

const clearLocalAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

const redirectToLogin = () => {
  if (typeof window === 'undefined') return
  if (window.location.hash.startsWith('#/login')) return

  // App uses hash routing; force a hard redirect to remove stale protected view state.
  window.location.hash = '/login'
}

// Log out on auth-related 401 only
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (isAuth401(err)) {
      clearLocalAuth()
      redirectToLogin()
    }
    return Promise.reject(err)
  }
)

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
