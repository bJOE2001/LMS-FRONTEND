<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Notifications</h1>
        <p class="text-grey-7 q-mb-none">View and manage your notifications</p>
      </div>
      <q-btn
        v-if="notifStore.hasUnread"
        flat
        no-caps
        color="primary"
        icon="done_all"
        label="Mark all read"
        @click="notifStore.markAllAsRead()"
      />
    </div>

    <q-card v-if="notifStore.loading" flat bordered class="rounded-borders">
      <q-card-section class="text-center q-pa-xl">
        <q-spinner color="primary" size="40px" />
        <p class="text-grey-6 q-mt-md q-mb-none">Loading notifications...</p>
      </q-card-section>
    </q-card>

    <q-card v-else-if="notifStore.notifications.length === 0" flat bordered class="rounded-borders">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="notifications_none" size="64px" color="grey-4" />
        <p class="text-grey-6 text-body1 q-mt-md q-mb-none">No notifications yet</p>
        <p class="text-grey-5 text-caption q-mt-xs">You're all caught up!</p>
      </q-card-section>
    </q-card>

    <q-card v-else flat bordered class="rounded-borders">
      <q-list separator>
        <q-item
          v-for="notif in notifStore.notifications"
          :key="notif.id"
          clickable
          :class="{ 'bg-green-1': !notif.read_at }"
          @click="onClickNotif(notif)"
        >
          <q-item-section avatar>
            <q-avatar
              :color="getNotifColor(notif.type) + '-1'"
              :text-color="getNotifColor(notif.type)"
              size="44px"
            >
              <q-icon :name="getNotifIcon(notif.type)" size="22px" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ notif.title }}</q-item-label>
            <q-item-label caption lines="2" class="q-mt-xs">{{ notif.message }}</q-item-label>
            <q-item-label caption class="q-mt-xs text-grey-5">
              <q-icon name="schedule" size="12px" class="q-mr-xs" />
              {{ formatTime(notif.created_at) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center no-wrap">
              <q-badge v-if="!notif.read_at" color="green" rounded class="q-mr-sm" />
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="close"
                color="grey-5"
                @click.stop="notifStore.removeNotification(notif.id)"
              >
                <q-tooltip>Dismiss</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <NotificationDetailDialog
      v-model="showDetailDialog"
      :notification="selectedNotif"
      @notification-enriched="onNotificationEnriched"
    />
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NotificationDetailDialog from 'components/NotificationDetailDialog.vue'
import { useNotificationStore } from 'stores/notification-store'

const router = useRouter()
const notifStore = useNotificationStore()
const selectedNotif = ref(null)
const showDetailDialog = ref(false)

onMounted(() => {
  notifStore.fetchNotifications()
})

async function onClickNotif(notif) {
  const actionRoute = resolveNotificationActionRoute(notif)

  if (!notif.read_at) {
    await notifStore.markAsRead(notif.id)
  }

  if (actionRoute) {
    router.push(actionRoute)
    return
  }

  selectedNotif.value = { ...notif }
  showDetailDialog.value = true
}

function onNotificationEnriched(enrichedNotif) {
  selectedNotif.value = enrichedNotif

  const index = notifStore.notifications.findIndex((item) => item.id === enrichedNotif.id)
  if (index !== -1) {
    notifStore.notifications.splice(index, 1, enrichedNotif)
  }
}

function isPendingApplicationsReminder(notif) {
  const type = String(notif?.type || '').trim().toLowerCase()
  const title = String(notif?.title || '').trim().toLowerCase()
  return type === 'reminder' && title === 'pending applications'
}

function resolveNotificationActionRoute(notif) {
  const configuredRoute = notif?.action_route
  if (
    configuredRoute &&
    typeof configuredRoute === 'object' &&
    (configuredRoute.name || configuredRoute.path)
  ) {
    return configuredRoute
  }

  if (!isPendingApplicationsReminder(notif)) return null

  const notificationId = String(notif?.id || '').toLowerCase()
  if (notificationId.includes('local-pending-reminder-admin')) {
    return { name: 'admin-applications', query: { search: 'pending' } }
  }

  if (notificationId.includes('local-pending-reminder-hr')) {
    return { name: 'hr-applications', query: { status: 'pending' } }
  }

  return null
}

function getNotifIcon(type) {
  const icons = {
    leave_approved: 'check_circle',
    leave_rejected: 'cancel',
    leave_cancelled: 'cancel',
    leave_edit_requested: 'edit_note',
    leave_request: 'description',
    leave_pending: 'hourglass_empty',
    coc_request: 'pending_actions',
    coc_pending: 'hourglass_top',
    coc_approved: 'task_alt',
    coc_rejected: 'cancel',
    reminder: 'alarm',
    system: 'info',
  }
  return icons[type] || 'notifications'
}

function getNotifColor(type) {
  const colors = {
    leave_approved: 'positive',
    leave_rejected: 'negative',
    leave_cancelled: 'blue-grey',
    leave_edit_requested: 'indigo',
    leave_request: 'primary',
    leave_pending: 'warning',
    coc_request: 'primary',
    coc_pending: 'warning',
    coc_approved: 'positive',
    coc_rejected: 'negative',
    reminder: 'orange',
    system: 'info',
  }
  return colors[type] || 'grey'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
</script>
