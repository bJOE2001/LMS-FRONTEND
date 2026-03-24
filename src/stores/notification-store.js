import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from 'boot/axios'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const serverNotifications = ref([])
  const localNotifications = ref([])
  const serverUnreadCount = ref(0)
  const serverNotificationsLoaded = ref(false)
  const loading = ref(false)

  function toTimestamp(value) {
    const parsed = Date.parse(value || '')
    return Number.isFinite(parsed) ? parsed : 0
  }

  function byNewest(first, second) {
    return toTimestamp(second?.created_at) - toTimestamp(first?.created_at)
  }

  function syncMergedNotifications() {
    const mapById = new Map()

    for (const item of serverNotifications.value) {
      mapById.set(String(item.id), item)
    }
    for (const item of localNotifications.value) {
      mapById.set(String(item.id), item)
    }

    notifications.value = Array.from(mapById.values()).sort(byNewest)
  }

  function updateNotificationInList(listRef, id, updater) {
    const index = listRef.value.findIndex((item) => String(item.id) === String(id))
    if (index === -1) return false
    listRef.value[index] = updater(listRef.value[index])
    return true
  }

  function removeNotificationFromList(listRef, id) {
    listRef.value = listRef.value.filter((item) => String(item.id) !== String(id))
  }

  // Computed
  const unreadCount = computed(() => {
    const localUnread = localNotifications.value.filter((item) => !item.read_at).length

    if (serverNotificationsLoaded.value) {
      const serverUnread = serverNotifications.value.filter((item) => !item.read_at).length
      return serverUnread + localUnread
    }

    return serverUnreadCount.value + localUnread
  })
  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchUnreadCount() {
    try {
      const { data } = await api.get('/notifications/unread-count')
      serverUnreadCount.value = Number(data?.unread_count ?? 0)
    } catch {
      // silently fail
    }
  }

  async function fetchNotifications() {
    loading.value = true
    try {
      const { data } = await api.get('/notifications')
      serverNotifications.value = Array.isArray(data) ? data : []
      serverUnreadCount.value = serverNotifications.value.filter((item) => !item.read_at).length
      serverNotificationsLoaded.value = true
      syncMergedNotifications()
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
    const readAt = new Date().toISOString()
    const markRead = (item) => ({ ...item, read_at: readAt })
    const existingServerItem = serverNotifications.value.find((item) => String(item.id) === String(id))
    const wasServerUnread = !!existingServerItem && !existingServerItem.read_at
    const isLocal = updateNotificationInList(localNotifications, id, markRead)
    updateNotificationInList(serverNotifications, id, markRead)
    updateNotificationInList(notifications, id, markRead)

    if (isLocal) {
      syncMergedNotifications()
      return
    }

    try {
      await api.put(`/notifications/${id}/read`)
    } catch {
      // silently fail
    }

    if (!isLocal && wasServerUnread) {
      serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1)
    }
  }

  /**
   * BACKEND API: PUT /api/notifications/read-all
   * Expected response: { message: string }
   */
  async function markAllAsRead() {
    const readAt = new Date().toISOString()
    const markAllRead = (listRef) => {
      listRef.value = listRef.value.map((item) =>
        item.read_at ? item : { ...item, read_at: readAt }
      )
    }

    markAllRead(serverNotifications)
    markAllRead(localNotifications)
    serverUnreadCount.value = 0
    syncMergedNotifications()

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
    const localIndex = localNotifications.value.findIndex((item) => String(item.id) === String(id))
    if (localIndex !== -1) {
      removeNotificationFromList(localNotifications, id)
      syncMergedNotifications()
      return
    }

    const removed = serverNotifications.value.find((item) => String(item.id) === String(id))
    removeNotificationFromList(serverNotifications, id)
    if (removed && !removed.read_at) {
      serverUnreadCount.value = Math.max(0, serverUnreadCount.value - 1)
    }
    syncMergedNotifications()
    try {
      await api.delete(`/notifications/${id}`)
    } catch {
      // silently fail
    }
  }

  function upsertLocalNotification(payload) {
    if (!payload || payload.id === undefined || payload.id === null) return

    const normalized = {
      id: payload.id,
      type: payload.type || 'reminder',
      title: payload.title || 'Reminder',
      message: payload.message || '',
      leave_application_id: payload.leave_application_id ?? null,
      leave_application: payload.leave_application ?? null,
      read_at: payload.read_at ?? null,
      created_at: payload.created_at || new Date().toISOString(),
      local_only: true,
    }

    const existingIndex = localNotifications.value.findIndex(
      (item) => String(item.id) === String(normalized.id)
    )

    if (existingIndex === -1) {
      localNotifications.value.unshift(normalized)
    } else {
      const existing = localNotifications.value[existingIndex]
      localNotifications.value[existingIndex] = {
        ...existing,
        ...normalized,
        created_at: payload.created_at || existing.created_at || normalized.created_at,
        // Keep read state if user already marked this local reminder as read.
        read_at: existing.read_at ?? normalized.read_at,
      }
    }

    syncMergedNotifications()
  }

  function removeLocalNotification(id) {
    removeNotificationFromList(localNotifications, id)
    syncMergedNotifications()
  }

  function clearAll() {
    notifications.value = []
    serverNotifications.value = []
    localNotifications.value = []
    serverUnreadCount.value = 0
    serverNotificationsLoaded.value = false
  }

  return {
    notifications,
    loading,
    unreadCount,
    hasUnread,
    fetchUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    upsertLocalNotification,
    removeLocalNotification,
    clearAll,
  }
})
