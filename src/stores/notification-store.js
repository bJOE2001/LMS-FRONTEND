import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'boot/axios'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const loading = ref(false)

  // Computed
  const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)
  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchNotifications() {
    loading.value = true
    try {
      const { data } = await api.get('/notifications')
      notifications.value = data || []
    } catch {
      // silently fail
    } finally {
      loading.value = false
    }
  }

  /**
   * BACKEND API: PUT /api/notifications/:id/read
   * Expected response: { message: string }
   */
  async function markAsRead(id) {
    const notif = notifications.value.find(n => n.id === id)
    if (notif) notif.read_at = new Date().toISOString()
    try {
      await api.put(`/notifications/${id}/read`)
    } catch {
      // silently fail
    }
  }

  /**
   * BACKEND API: PUT /api/notifications/read-all
   * Expected response: { message: string }
   */
  async function markAllAsRead() {
    notifications.value.forEach(n => {
      if (!n.read_at) n.read_at = new Date().toISOString()
    })
    try {
      await api.put('/notifications/read-all')
    } catch {
      // silently fail
    }
  }


  /**
   * BACKEND API: DELETE /api/notifications/:id
   * Expected response: { message: string }
   */
  async function removeNotification(id) {
    notifications.value = notifications.value.filter(n => n.id !== id)
    try {
      await api.delete(`/notifications/${id}`)
    } catch {
      // silently fail
    }
  }

  function clearAll() {
    notifications.value = []
  }

  return {
    notifications,
    loading,
    unreadCount,
    hasUnread,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  }
})
