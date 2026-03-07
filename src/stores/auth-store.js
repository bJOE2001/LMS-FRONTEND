import { defineStore } from 'pinia'

const TOKEN_KEY = 'lms_token'
const USER_KEY = 'lms_user'
const PENDING_REMINDER_SESSION_PREFIX = 'lms_pending_reminder_seen:'

function clearPendingReminderSessionFlags() {
  if (typeof sessionStorage === 'undefined') return

  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index)
    if (!key) continue
    if (!key.startsWith(PENDING_REMINDER_SESSION_PREFIX)) continue
    sessionStorage.removeItem(key)
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY),
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role ?? null,
  },

  actions: {
    setAuth({ token, user }) {
      this.token = token
      this.user = user
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
      else localStorage.removeItem(USER_KEY)
    },

    clearAuth() {
      this.token = null
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      clearPendingReminderSessionFlags()
    },

    getToken() {
      return this.token
    },
  },
})
