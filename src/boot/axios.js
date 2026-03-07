import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

const TOKEN_KEY = 'lms_token'
// Keep API base env-driven so dev/prod switching does not require code edits.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

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

  const message = String(
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    ''
  ).toLowerCase()

  // Only clear local auth for actual auth-token/session failures.
  // Keep session for other 401s (e.g. ERMS API-key protected endpoints).
  return (
    message.includes('unauthenticated') ||
    message.includes('invalid token') ||
    message.includes('token has expired') ||
    message.includes('token expired')
  )
}

// Log out on auth-related 401 only
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (isAuth401(err)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('lms_user')
    }
    return Promise.reject(err)
  }
)

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
