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
        :to="{ name: 'notifications' }"
        @click="onViewAll?.()"
      />
    </div>

    <!-- Notification Detail Modal -->
    <q-dialog
      v-model="showDetailDialog"
      position="top"
      transition-show="jump-down"
      transition-hide="jump-up"
      class="notif-detail-dialog"
    >
      <q-card v-if="selectedNotif" class="notif-detail-card">
        <div class="notif-detail-accent" />

        <!-- Compact Header -->
        <div class="notif-detail-header">
          <div class="notif-detail-header-main">
            <q-avatar
              size="46px"
              class="notif-icon-avatar"
              :style="{
                background: getNotifHex(selectedNotif.type) + '18',
                color: getNotifHex(selectedNotif.type),
                border: '1px solid ' + getNotifHex(selectedNotif.type) + '35'
              }"
            >
              <q-icon :name="getNotifIcon(selectedNotif.type)" size="24px" />
            </q-avatar>

            <div class="notif-header-text">
              <div class="notif-detail-title">
                {{ selectedNotif.title }}
              </div>

              <div class="row items-center q-mt-xs" style="gap: 8px">
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
            </div>
          </div>

          <q-btn
            flat
            round
            dense
            size="sm"
            icon="close"
            class="notif-detail-close"
            @click="closeDetail"
          />
        </div>

        <!-- Body -->
        <q-card-section class="notif-detail-body q-px-lg q-pt-sm q-pb-md">
          <div class="notif-detail-message">
            {{ selectedNotif.message }}
          </div>

          <div
            v-if="hasApplicationDetails(selectedNotif)"
            class="notif-application-section q-mt-lg"
          >
            <div class="notif-application-heading">
              <q-icon name="description" size="16px" />
              Application Details
            </div>

            <div class="notif-application-grid q-mt-sm">
              <div
                v-for="detail in buildApplicationDetails(applicationFromNotification(selectedNotif))"
                :key="detail.label"
                class="notif-application-item"
              >
                <div class="notif-application-label">{{ detail.label }}</div>
                <div class="notif-application-value">{{ detail.value }}</div>
              </div>
            </div>
          </div>

          <div v-if="loadingAppDetails" class="row items-center text-caption text-grey-6 q-mt-md">
            <q-spinner size="16px" color="primary" class="q-mr-sm" />
            Loading application details...
          </div>
        </q-card-section>

        <q-card-actions class="notif-detail-footer q-px-lg q-pb-md q-pt-none">
          <div class="notif-detail-date">
            <q-icon name="event" size="14px" class="q-mr-xs" />
            {{ formatFullDate(selectedNotif.created_at) }}
          </div>
          <q-btn flat no-caps color="primary" label="Close" @click="closeDetail" />
        </q-card-actions>

      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from 'boot/axios'
import { useNotificationStore } from 'stores/notification-store'

defineProps({
  /** Optional callback when "View all notifications" is clicked (e.g. close menu). */
  onViewAll: { type: Function, default: null },
})

const notifStore = useNotificationStore()

const selectedNotif = ref(null)
const showDetailDialog = ref(false)
const loadingAppDetails = ref(false)

async function onClickNotif(notif) {
  if (!notif.read_at) {
    notifStore.markAsRead(notif.id)
  }
  selectedNotif.value = { ...notif }
  showDetailDialog.value = true

  const applicationId = relatedApplicationId(selectedNotif.value)
  if (!applicationId || hasApplicationDetails(selectedNotif.value)) return

  loadingAppDetails.value = true
  try {
    const { data } = await api.get(`/notifications/${notif.id}/application`)
    if (data?.application) {
      const applicationType = data.application_type || resolveNotificationApplicationType(selectedNotif.value)
      const enrichedNotif = {
        ...selectedNotif.value,
        application_type: applicationType,
        application: data.application,
        leave_application: applicationType === 'LEAVE' ? data.application : null,
        coc_application: applicationType === 'COC' ? data.application : null,
      }
      selectedNotif.value = enrichedNotif

      const index = notifStore.notifications.findIndex((item) => item.id === notif.id)
      if (index !== -1) {
        notifStore.notifications.splice(index, 1, enrichedNotif)
      }
    }
  } catch {
    // Fallback parser below still renders best-effort details for legacy notification payloads.
  } finally {
    loadingAppDetails.value = false
  }
}

function closeDetail() {
  showDetailDialog.value = false
  selectedNotif.value = null
  loadingAppDetails.value = false
}

function formatType(type) {
  if (!type) return ''
  return type
    .replace(/_/g, ' ')
    .replace(/\bcoc\b/gi, 'COC')
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

function getNotifHex(type) {
  const hexMap = {
    leave_approved: '#2e7d32',
    leave_rejected: '#c62828',
    leave_cancelled: '#455a64',
    leave_edit_requested: '#3949ab',
    leave_request: '#1565c0',
    leave_pending: '#ef6c00',
    coc_request: '#1565c0',
    coc_pending: '#ef6c00',
    coc_approved: '#2e7d32',
    coc_rejected: '#c62828',
    reminder: '#e65100',
    system: '#0277bd',
  }
  return hexMap[type] || '#757575'
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

function formatShortDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDayCount(days) {
  if (days === null || days === undefined || days === '') return ''
  const numericValue = Number(days)
  if (Number.isNaN(numericValue)) return String(days)
  const displayValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(/\.?0+$/, '')
  return `${displayValue} day${numericValue === 1 ? '' : 's'}`
}

function formatHourCount(hours) {
  if (hours === null || hours === undefined || hours === '') return ''
  const numericValue = Number(hours)
  if (Number.isNaN(numericValue)) return String(hours)
  const displayValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(/\.?0+$/, '')
  return `${displayValue} h`
}

function formatDateRange(startDate, endDate, isMonetization) {
  if (isMonetization) return 'Monetization request'
  if (!startDate && !endDate) return ''
  if (startDate && endDate) {
    const start = formatShortDate(startDate)
    const end = formatShortDate(endDate)
    return start === end ? start : `${start} - ${end}`
  }
  return formatShortDate(startDate || endDate)
}

function formatCurrency(amount) {
  const numericValue = Number(amount)
  if (Number.isNaN(numericValue)) return ''
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(numericValue)
}

function isLeaveNotificationType(type) {
  return String(type || '').startsWith('leave_')
}

function isCocNotificationType(type) {
  return String(type || '').startsWith('coc_')
}

function isApplicationNotificationType(type) {
  return isLeaveNotificationType(type) || isCocNotificationType(type)
}

function statusFromNotificationType(type) {
  const statusMap = {
    leave_approved: 'Approved',
    leave_rejected: 'Rejected',
    leave_cancelled: 'Cancelled',
    leave_edit_requested: 'Edit Requested',
    leave_request: 'Pending Review',
    leave_pending: 'Pending Review',
    coc_request: 'Pending Admin',
    coc_pending: 'Pending HR',
    coc_approved: 'Approved',
    coc_rejected: 'Rejected',
  }
  return statusMap[type] || ''
}

function parseDaysValue(value) {
  if (!value) return null
  const match = String(value).match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function parseApplicationFromMessage(notif) {
  if (!notif || !isApplicationNotificationType(notif.type)) return null

  const message = String(notif.message || '').trim()
  if (!message) return null

  const parsed = {
    id: relatedApplicationId(notif),
    application_type: resolveNotificationApplicationType(notif),
    status: statusFromNotificationType(notif.type),
    date_filed: notif.created_at || null,
  }

  if (isCocNotificationType(notif.type)) {
    parsed.leave_type_name = 'COC Application'

    const submitCoc = message.match(/^(.+?)\s+submitted a COC application\s+\(([^)]+)\)/i)
    if (submitCoc) {
      parsed.applicant_name = submitCoc[1]?.trim()
      parsed.duration_label = submitCoc[2]?.trim()
      parsed.total_hours = parseDaysValue(submitCoc[2])
    }

    const pendingHr = message.match(/^(.+?)'s COC application\s+\(([^)]+)\)\s+is pending HR review/i)
    if (pendingHr) {
      parsed.applicant_name = pendingHr[1]?.trim()
      parsed.duration_label = pendingHr[2]?.trim()
      parsed.total_hours = parseDaysValue(pendingHr[2])
    }

    const hrDecision = message.match(/^COC application for\s+(.+?)\s+was\s+(approved|rejected)\s+by HR/i)
    if (hrDecision) {
      parsed.applicant_name = parsed.applicant_name || hrDecision[1]?.trim()
      parsed.status = hrDecision[2]?.toLowerCase() === 'approved' ? 'Approved' : 'Rejected'
    }

    const creditedDays = message.match(/CTO credited:\s*([^.]*)/i)
    if (creditedDays) {
      parsed.cto_credited_days = parseDaysValue(creditedDays[1])
    }

    const hasCocDetail =
      parsed.id ||
      parsed.applicant_name ||
      parsed.total_hours !== null ||
      parsed.cto_credited_days !== null

    return hasCocDetail ? parsed : null
  }

  const submitLeave = message.match(/^(.+?)\s+submitted a\s+(.+?)\s+leave request\s+\(([^)]+)\)/i)
  if (submitLeave) {
    parsed.applicant_name = submitLeave[1]?.trim()
    parsed.leave_type_name = submitLeave[2]?.trim()
    parsed.total_days = parseDaysValue(submitLeave[3])
  }

  const submitMonetization = message.match(/^(.+?)\s+submitted a monetization request for\s+(.+?)\s+\(([^)]+)\)/i)
  if (submitMonetization) {
    parsed.applicant_name = submitMonetization[1]?.trim()
    parsed.leave_type_name = submitMonetization[2]?.trim()
    parsed.total_days = parseDaysValue(submitMonetization[3])
    parsed.is_monetization = true
  }

  const yourLeave = message.match(/^Your\s+(.+?)\s+(?:leave application|leave request|monetization request)\s+\(([^)]+)\)/i)
  if (yourLeave) {
    parsed.leave_type_name = parsed.leave_type_name || yourLeave[1]?.trim()
    parsed.total_days = parsed.total_days ?? parseDaysValue(yourLeave[2])
  }

  const reasonMatch = message.match(/Reason:\s*(.+)$/i)
  if (reasonMatch) {
    parsed.remarks = reasonMatch[1]?.trim()
  }

  const hasAnyDetail =
    parsed.id ||
    parsed.leave_type_name ||
    parsed.total_days !== null ||
    parsed.applicant_name ||
    parsed.remarks

  return hasAnyDetail ? parsed : null
}

function applicationFromNotification(notif) {
  if (!notif) return null
  return notif.application || notif.leave_application || notif.coc_application || parseApplicationFromMessage(notif)
}

function relatedApplicationId(notif) {
  if (!notif) return null
  return notif.leave_application_id || notif.coc_application_id || notif.application?.id || null
}

function resolveNotificationApplicationType(notif) {
  const type = String(notif?.application_type || '').trim().toUpperCase()
  if (type) return type
  if (notif?.coc_application_id || notif?.coc_application) return 'COC'
  if (notif?.leave_application_id || notif?.leave_application) return 'LEAVE'
  if (isCocNotificationType(notif?.type)) return 'COC'
  if (isLeaveNotificationType(notif?.type)) return 'LEAVE'
  return ''
}

function hasApplicationDetails(notif) {
  const application = applicationFromNotification(notif)
  if (!application) return false
  return buildApplicationDetails(application).length > 0
}

function buildApplicationDetails(application) {
  if (!application) return []

  if (String(application.application_type || '').trim().toUpperCase() === 'COC') {
    const details = [
      { label: 'Application ID', value: application.id ? `#${application.id}` : null },
      { label: 'Status', value: application.status || application.raw_status },
      { label: 'Application Type', value: application.leave_type_name || 'COC Application' },
      { label: 'Overtime Dates', value: formatSelectedDates(application.selected_dates) },
      { label: 'Total Hours', value: application.duration_label || formatHourCount(application.total_hours) },
      { label: 'Date Filed', value: formatShortDate(application.date_filed) },
      { label: 'Applicant', value: application.applicant_name },
      { label: 'Office', value: application.office },
      { label: 'CTO Leave Type', value: application.cto_leave_type_name },
      { label: 'CTO Credited Days', value: application.cto_credited_days !== null ? formatDayCount(application.cto_credited_days) : null },
      { label: 'Remarks', value: application.remarks },
    ]

    return details.filter((item) => {
      if (item.value === null || item.value === undefined) return false
      return String(item.value).trim() !== ''
    })
  }

  const details = [
    { label: 'Application ID', value: application.id ? `#${application.id}` : null },
    { label: 'Status', value: application.status || application.raw_status },
    { label: 'Leave Type', value: application.leave_type_name },
    { label: 'Date Range', value: formatDateRange(application.start_date, application.end_date, application.is_monetization) },
    { label: 'Total Days', value: formatDayCount(application.total_days) },
    { label: 'Date Filed', value: formatShortDate(application.date_filed) },
    { label: 'Applicant', value: application.applicant_name },
    { label: 'Office', value: application.office },
    { label: 'Commutation', value: application.commutation },
    {
      label: 'Equivalent Amount',
      value: application.equivalent_amount !== null ? formatCurrency(application.equivalent_amount) : null,
    },
    { label: 'Reason', value: application.reason },
    { label: 'Remarks', value: application.remarks },
  ]

  return details.filter((item) => {
    if (item.value === null || item.value === undefined) return false
    return String(item.value).trim() !== ''
  })
}

function formatSelectedDates(dates) {
  if (!Array.isArray(dates) || !dates.length) return ''

  const formatted = dates
    .map((value) => formatShortDate(value))
    .filter((value) => String(value || '').trim() !== '')

  return formatted.join(', ')
}
</script>

<style lang="scss" scoped>
.notification-panel {
  width: min(380px, calc(100vw - 20px));
  max-width: calc(100vw - 20px);
  min-height: 300px;
  max-height: min(560px, calc(100vh - 104px));
  display: flex;
  flex-direction: column;
}

.notif-header {
  min-height: 48px;
}

.notif-list {
  flex: 1 1 auto;
  min-height: 0;
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

@media (max-width: 600px) {
  .notification-panel {
    width: calc(100vw - 12px);
    max-width: calc(100vw - 12px);
  }

  .notif-header {
    flex-wrap: wrap;
    gap: 8px;
    align-items: flex-start;
  }

  .notif-list {
    max-height: none;
  }
}
</style>

<!-- Unscoped: q-dialog teleports to <body>, so scoped styles won't reach it -->
<style lang="scss">
.notif-detail-dialog .q-dialog__inner--minimized {
  padding: 12px 14px 16px;
}

.notif-detail-card {
  width: 510px;
  max-width: calc(100vw - 28px);
  min-height: 460px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.16),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

.notif-detail-accent {
  height: 5px;
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 48%, #43a047 100%);
}

.notif-detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 8px;
  background: linear-gradient(180deg, rgba(46, 125, 50, 0.14) 0%, rgba(46, 125, 50, 0.06) 100%);
}

.notif-detail-header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.notif-header-text {
  min-width: 0;
}

.notif-icon-avatar {
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
}

.notif-detail-close {
  color: #607d8b;
  margin-top: -2px;
}

.notif-type-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: capitalize;
  letter-spacing: 0.01em;
}

.notif-time-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 0.7rem;
  color: #607d8b;
  background: #f7fafc;
  border: 1px solid #e5edf3;
}

.notif-detail-title {
  font-size: 1rem;
  font-weight: 700;
  color: #102a43;
  line-height: 1.35;
  letter-spacing: -0.005em;
  word-break: break-word;
}

.notif-detail-body {
  flex: 1;
  overflow-y: auto;
  background:
    radial-gradient(circle at top right, rgba(2, 119, 189, 0.06), transparent 45%),
    linear-gradient(to bottom, #ffffff, #fcfdff);
}

.notif-detail-message {
  font-size: 0.88rem;
  line-height: 1.65;
  color: #334e68;
  white-space: pre-line;
}

.notif-application-section {
  border-top: 1px solid #d6e4ee;
  padding-top: 12px;
}

.notif-application-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #1f3a56;
}

.notif-application-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.notif-application-item {
  border: 1px solid #d9e8f2;
  border-radius: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.65);
  min-width: 0;
}

.notif-application-label {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #829ab1;
}

.notif-application-value {
  margin-top: 2px;
  font-size: 0.8rem;
  line-height: 1.4;
  color: #243b53;
  word-break: break-word;
  white-space: pre-line;
}

.notif-detail-date {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #829ab1;
}

.notif-detail-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

body.body--dark {
  .notif-detail-header {
    background: linear-gradient(180deg, rgba(56, 142, 60, 0.34) 0%, rgba(46, 125, 50, 0.14) 100%);
  }

  .notif-detail-title {
    color: #f0f4f8;
  }

  .notif-detail-close {
    color: #c3d2df;
  }

  .notif-time-chip {
    color: #b3c3d2;
    background: #253544;
    border-color: #304a5e;
  }

  .notif-detail-body {
    background:
      radial-gradient(circle at top right, rgba(3, 169, 244, 0.12), transparent 45%),
      linear-gradient(to bottom, #1e2a36, #18232d);
  }

  .notif-detail-message {
    color: #d9e2ec;
  }

  .notif-application-section {
    border-top-color: #2f4558;
  }

  .notif-application-heading {
    color: #d9e2ec;
  }

  .notif-application-item {
    background: rgba(20, 32, 42, 0.55);
    border-color: #304a5e;
  }

  .notif-application-label {
    color: #9fb3c8;
  }

  .notif-application-value {
    color: #d9e2ec;
  }

  .notif-detail-date {
    color: #9fb3c8;
  }
}

@media (max-width: 520px) {
  .notif-detail-dialog .q-dialog__inner--minimized {
    padding: 10px 10px 14px;
  }

  .notif-detail-card {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 24px);
  }

  .notif-application-grid {
    grid-template-columns: 1fr;
  }
}

</style>
