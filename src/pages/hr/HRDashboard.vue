<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">HR Dashboard</h1>
        <p class="text-grey-7">Monitor leave applications across all departments</p>
      </div>
    </div>

    <q-dialog v-model="showPendingReminderDialog">
      <q-card style="min-width: 360px; max-width: 480px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="pending_actions" color="warning" size="28px" class="q-mr-sm" />
          <div class="text-h6">Pending Leave Applications</div>
        </q-card-section>
        <q-card-section>
          <div class="text-body2 text-grey-8">
            You have
            <span class="text-weight-bold">{{ dashboardData.pending_count }}</span>
            pending leave application(s) that need review and approval.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="grey-7" label="Later" v-close-popup />
          <q-btn unelevated color="warning" label="Review Now" @click="reviewPendingApplications" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('total')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Total Applications</div>
            <div class="text-h4 text-primary">{{ dashboardData.total_count }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('pending')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Pending</div>
            <div class="text-h4 text-warning">{{ dashboardData.pending_count }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('approved')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Approved</div>
            <div class="text-h4 text-green-8">{{ dashboardData.approved_count }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders summary-card" flat bordered @click="goToApplications('rejected')">
          <q-card-section>
            <div class="text-caption text-weight-medium">Rejected</div>
            <div class="text-h4 text-negative">{{ dashboardData.rejected_count }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <HrCalendarPanel />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import HrCalendarPanel from 'components/hr/HrCalendarPanel.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

const dashboardData = ref({
  total_count: 0,
  pending_count: 0,
  approved_count: 0,
  rejected_count: 0,
})
const showPendingReminderDialog = ref(false)

function pendingReminderSeenSessionKey() {
  return `lms_pending_reminder_seen:hr:${authStore.user?.id ?? 'unknown'}`
}

function pendingReminderNotificationId() {
  return `local-pending-reminder-hr:${authStore.user?.id ?? 'unknown'}`
}

function hasSeenPendingReminderThisLogin() {
  if (typeof sessionStorage === 'undefined') return false
  const token = authStore.getToken?.()
  if (!token) return false
  return sessionStorage.getItem(pendingReminderSeenSessionKey()) === token
}

function markPendingReminderSeenThisLogin() {
  if (typeof sessionStorage === 'undefined') return
  const token = authStore.getToken?.()
  if (!token) return
  sessionStorage.setItem(pendingReminderSeenSessionKey(), token)
}

function syncPendingReminderNotification(pendingCount) {
  const id = pendingReminderNotificationId()
  if (pendingCount <= 0) {
    notifStore.removeLocalNotification(id)
    return
  }

  const noun = pendingCount === 1 ? 'application' : 'applications'
  notifStore.upsertLocalNotification({
    id,
    type: 'reminder',
    title: 'Pending Leave Applications',
    message: `You have ${pendingCount} pending leave ${noun} that need review and approval.`,
  })
}

function mergeStatus(app) {
  const raw = String(app.rawStatus || '').toUpperCase()
  const status = String(app.status || '').toUpperCase()

  if (raw.includes('PENDING') || status.includes('PENDING')) return 'Pending'
  if (raw.includes('APPROVED') || status.includes('APPROVED')) return 'Approved'
  if (
    raw.includes('REJECTED') ||
    raw.includes('DISAPPROVED') ||
    status.includes('REJECTED') ||
    status.includes('DISAPPROVED')
  ) {
    return 'Rejected'
  }

  return app.status || ''
}

async function fetchDashboard() {
  try {
    const { data } = await api.get('/hr/dashboard')
    const applications = Array.isArray(data.applications) ? data.applications : []

    const pendingFromApps = applications.filter((app) => mergeStatus(app) === 'Pending').length
    const approvedFromApps = applications.filter((app) => mergeStatus(app) === 'Approved').length
    const rejectedFromApps = applications.filter((app) => mergeStatus(app) === 'Rejected').length

    dashboardData.value = {
      total_count: applications.length || data.total_count || 0,
      pending_count: applications.length ? pendingFromApps : (data.pending_count ?? 0),
      approved_count: applications.length ? approvedFromApps : (data.approved_count ?? 0),
      rejected_count: applications.length ? rejectedFromApps : (data.rejected_count ?? 0),
    }
    maybeShowPendingReminder()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load HR dashboard data right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  }
}

function goToApplications(status) {
  router.push({ path: '/hr/applications', query: { status } })
}

function maybeShowPendingReminder() {
  const pendingCount = Number(dashboardData.value.pending_count || 0)
  syncPendingReminderNotification(pendingCount)

  if (pendingCount <= 0) {
    showPendingReminderDialog.value = false
    return
  }

  if (hasSeenPendingReminderThisLogin()) return

  showPendingReminderDialog.value = true
  markPendingReminderSeenThisLogin()
}

function reviewPendingApplications() {
  showPendingReminderDialog.value = false
  goToApplications('pending')
}

onMounted(fetchDashboard)
</script>

<style scoped>
.summary-card {
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.summary-card:hover {
  background-color: #f3faf3 !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
}
</style>
