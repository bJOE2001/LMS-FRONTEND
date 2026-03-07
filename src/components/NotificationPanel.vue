<template>
  <div class="notification-panel">
    <!-- Header -->
    <div class="notif-header row items-center justify-between q-px-md q-py-sm">
      <div class="row items-center">
        <span class="text-subtitle1 text-weight-bold text-dark">Notifications</span>
        <q-badge
          v-if="notifStore.hasUnread"
          color="negative"
          rounded
          class="q-ml-sm"
        >
          {{ notifStore.unreadCount }}
        </q-badge>
      </div>
      <q-btn
        v-if="notifStore.hasUnread"
        flat
        dense
        no-caps
        size="sm"
        color="primary"
        label="Mark all read"
        @click="notifStore.markAllAsRead()"
      />
    </div>

    <q-separator />

    <!-- Loading State -->
    <div v-if="notifStore.loading" class="notif-empty q-pa-lg text-center">
      <q-spinner color="primary" size="32px" />
      <p class="text-grey-6 text-caption q-mt-sm q-mb-none">Loading notifications...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="notifStore.notifications.length === 0" class="notif-empty q-pa-xl text-center">
      <q-icon name="notifications_none" size="48px" color="grey-4" />
      <p class="text-grey-5 text-body2 q-mt-md q-mb-none">No notifications yet</p>
      <p class="text-grey-4 text-caption q-mt-xs q-mb-none">You're all caught up!</p>
    </div>

    <!-- Notification List -->
    <q-list v-else separator class="notif-list">
      <q-item
        v-for="notif in notifStore.notifications"
        :key="notif.id"
        clickable
        :class="{ 'notif-unread': !notif.read_at }"
        @click="onClickNotif(notif)"
      >
        <!-- Icon based on type -->
        <q-item-section avatar>
          <q-avatar
            :color="getNotifColor(notif.type) + '-1'"
            :text-color="getNotifColor(notif.type)"
            size="40px"
          >
            <q-icon :name="getNotifIcon(notif.type)" size="20px" />
          </q-avatar>
        </q-item-section>

        <!-- Content -->
        <q-item-section>
          <q-item-label class="text-weight-medium text-dark notif-title">
            {{ notif.title }}
          </q-item-label>
          <q-item-label caption lines="2" class="q-mt-xs notif-message">
            {{ notif.message }}
          </q-item-label>
          <q-item-label caption class="q-mt-xs text-grey-5">
            <q-icon name="schedule" size="12px" class="q-mr-xs" />
            {{ formatTime(notif.created_at) }}
          </q-item-label>
        </q-item-section>

        <!-- Actions -->
        <q-item-section side top>
          <div class="row items-center">
            <div
              v-if="!notif.read_at"
              class="unread-dot"
            />
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

    <!-- Footer -->
    <q-separator v-if="notifStore.notifications.length > 0" />
    <div v-if="notifStore.notifications.length > 0" class="q-pa-sm text-center">
      <q-btn
        flat
        dense
        no-caps
        color="primary"
        label="View all notifications"
        size="sm"
        class="full-width"
      />
    </div>

    <!-- Notification Detail Modal -->
    <q-dialog v-model="showDetailDialog" transition-show="scale" transition-hide="scale">
      <q-card v-if="selectedNotif" class="notif-detail-card">
        <!-- Gradient Header -->
        <div class="notif-detail-header" :style="headerGradient(selectedNotif.type)">
          <div class="notif-header-pattern" />
          <div class="notif-icon-wrapper">
            <div class="notif-icon-glow" :style="{ background: getNotifHex(selectedNotif.type) + '60' }" />
            <q-avatar size="68px" color="white" class="notif-icon-avatar">
              <q-icon
                :name="getNotifIcon(selectedNotif.type)"
                :style="{ color: getNotifHex(selectedNotif.type) }"
                size="34px"
              />
            </q-avatar>
          </div>
          <q-btn
            flat
            round
            size="sm"
            icon="close"
            class="notif-detail-close"
            style="color: rgba(255,255,255,0.85)"
            @click="closeDetail"
          />
        </div>

        <!-- Body -->
        <q-card-section class="q-px-lg q-pt-lg q-pb-sm">
          <!-- Meta row: type + time -->
          <div class="row items-center q-mb-md" style="gap: 10px">
            <div
              class="notif-type-pill"
              :style="{
                background: getNotifHex(selectedNotif.type) + '14',
                color: getNotifHex(selectedNotif.type),
                border: '1px solid ' + getNotifHex(selectedNotif.type) + '30'
              }"
            >
              <q-icon :name="getNotifIcon(selectedNotif.type)" size="13px" class="q-mr-xs" />
              {{ formatType(selectedNotif.type) }}
            </div>
            <div class="notif-time-chip">
              <q-icon name="schedule" size="13px" class="q-mr-xs" />
              {{ formatTime(selectedNotif.created_at) }}
            </div>
          </div>

          <!-- Title -->
          <div class="notif-detail-title">
            {{ selectedNotif.title }}
          </div>

          <!-- Divider -->
          <div class="notif-detail-divider" />

          <!-- Message -->
          <div class="notif-detail-message">
            {{ selectedNotif.message }}
          </div>

          <!-- Full date -->
          <div class="notif-detail-date q-mt-md">
            <q-icon name="event" size="14px" class="q-mr-xs" />
            {{ formatFullDate(selectedNotif.created_at) }}
          </div>
        </q-card-section>

        <!-- Footer -->
        <div class="notif-detail-footer">
          <q-btn
            unelevated
            no-caps
            :color="getNotifColor(selectedNotif.type)"
            label="Dismiss"
            class="notif-dismiss-btn"
            @click="closeDetail"
          />
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNotificationStore } from 'stores/notification-store'

const notifStore = useNotificationStore()

const selectedNotif = ref(null)
const showDetailDialog = ref(false)

function onClickNotif(notif) {
  if (!notif.read_at) {
    notifStore.markAsRead(notif.id)
  }
  selectedNotif.value = notif
  showDetailDialog.value = true
}

function closeDetail() {
  showDetailDialog.value = false
  selectedNotif.value = null
}

function formatType(type) {
  if (!type) return ''
  return type.replace(/_/g, ' ')
}

function getNotifIcon(type) {
  const icons = {
    leave_approved: 'check_circle',
    leave_rejected: 'cancel',
    leave_request: 'description',
    leave_pending: 'hourglass_empty',
    reminder: 'alarm',
    system: 'info',
  }
  return icons[type] || 'notifications'
}

function getNotifColor(type) {
  const colors = {
    leave_approved: 'positive',
    leave_rejected: 'negative',
    leave_request: 'primary',
    leave_pending: 'warning',
    reminder: 'orange',
    system: 'info',
  }
  return colors[type] || 'grey'
}

function getNotifHex(type) {
  const hexMap = {
    leave_approved: '#2e7d32',
    leave_rejected: '#c62828',
    leave_request: '#1565c0',
    leave_pending: '#ef6c00',
    reminder: '#e65100',
    system: '#0277bd',
  }
  return hexMap[type] || '#757575'
}

function headerGradient(type) {
  const hex = getNotifHex(type)
  return {
    background: `linear-gradient(135deg, ${hex} 0%, ${hex}dd 50%, ${hex}bb 100%)`,
  }
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

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style lang="scss" scoped>
.notification-panel {
  width: 380px;
  min-height: 300px;
}

.notif-header {
  min-height: 48px;
}

.notif-list {
  max-height: 340px;
  overflow-y: auto;
}

.notif-unread {
  background: rgba(46, 125, 50, 0.04);
}

.notif-title {
  font-size: 0.85rem;
  line-height: 1.3;
}

.notif-message {
  font-size: 0.78rem;
  line-height: 1.4;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2e7d32;
  margin-right: 4px;
}

.notif-empty {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>

<!-- Unscoped: q-dialog teleports to <body>, so scoped styles won't reach it -->
<style lang="scss">
.notif-detail-card {
  width: 440px;
  max-width: 95vw;
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 25px 60px rgba(0, 0, 0, 0.18),
    0 0 0 1px rgba(0, 0, 0, 0.04);
}

.notif-detail-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px 24px;
  position: relative;
  overflow: hidden;
}

.notif-header-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.07;
  background-image:
    radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
    radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
    radial-gradient(circle at 60% 80%, white 1px, transparent 1px);
  background-size: 40px 40px, 60px 60px, 50px 50px;
}

.notif-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-icon-glow {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  filter: blur(20px);
}

.notif-icon-avatar {
  position: relative;
  z-index: 1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.notif-detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0.85;
  transition: opacity 0.15s;
  &:hover {
    opacity: 1;
  }
}

.notif-type-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.02em;
}

.notif-time-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  color: #78909c;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

.notif-detail-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.notif-detail-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #e0e0e0 20%, #e0e0e0 80%, transparent);
  margin: 14px 0;
}

.notif-detail-message {
  font-size: 0.9rem;
  line-height: 1.7;
  color: #455a64;
  white-space: pre-line;
}

.notif-detail-date {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #90a4ae;
}

.notif-detail-footer {
  padding: 12px 24px 20px;
  display: flex;
  justify-content: flex-end;
}

.notif-dismiss-btn {
  border-radius: 10px;
  padding: 6px 28px;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>

