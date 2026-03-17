<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Admin Dashboard</h1>
    </div>

    <q-dialog v-model="showPendingReminderDialog" persistent class="pending-reminder-dialog">
      <q-card class="pending-reminder-card">
        <q-card-section class="row items-center q-pb-none pending-reminder-card__header">
          <q-icon
            name="pending_actions"
            color="warning"
            size="28px"
            class="q-mr-sm pending-reminder-card__icon"
          />
          <div class="text-h6 pending-reminder-card__title">Pending Leave Applications</div>
        </q-card-section>
        <q-card-section class="pending-reminder-card__body">
          <div class="text-body2 text-grey-8 pending-reminder-card__message">
            You have
            <span class="text-weight-bold">{{ dashboardData.pending_count }}</span>
            pending leave application(s) that need review and approval.
          </div>
        </q-card-section>
        <q-card-actions align="right" class="pending-reminder-card__actions">
          <q-btn
            flat
            color="grey-7"
            label="Later"
            class="pending-reminder-card__button"
            v-close-popup
          />
          <q-btn
            unelevated
            color="warning"
            label="Review Now"
            class="pending-reminder-card__button"
            @click="focusPendingApplications"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div class="row q-col-gutter-md q-mb-lg stat-cards-row dashboard-kpi-row">
      <div class="col-12 col-sm-6 col-md-4 dashboard-kpi-col">
        <q-card
          class="stat-card stat-card--interactive bg-white rounded-borders dashboard-kpi-card"
          flat
          elevation="1"
          role="button"
          tabindex="0"
          :style="{ '--stat-card-hover-bg': '#eef4ff' }"
          @click="openApplicationsView()"
          @keyup.enter="openApplicationsView()"
          @keyup.space.prevent="openApplicationsView()"
        >
          <q-card-section class="stat-card-content dashboard-kpi-content">
            <div class="stat-card-main dashboard-kpi-main">
              <div class="stat-card-left dashboard-kpi-left">
                <div class="row items-center no-wrap q-gutter-xs dashboard-kpi-icon-wrap">
                  <q-icon name="description" size="28px" color="grey" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm dashboard-kpi-label">
                  Applications
                </div>
              </div>
              <div class="stat-value text-primary dashboard-kpi-value">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.total_count }}</template>
              </div>
            </div>
            <div class="stat-breakdown dashboard-kpi-breakdown">
              <div
                v-for="card in totalApplicationBreakdownCards"
                :key="card.key"
                class="stat-mini-card"
              >
                <span class="stat-mini-label">{{ card.label }}</span>
                <span class="stat-mini-value">{{ loading ? '-' : card.value }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-4 dashboard-kpi-col">
        <q-card
          class="stat-card stat-card--interactive bg-white rounded-borders dashboard-kpi-card"
          flat
          elevation="1"
          role="button"
          tabindex="0"
          :style="{ '--stat-card-hover-bg': '#fff5e0' }"
          @click="openApplicationsView('pending')"
          @keyup.enter="openApplicationsView('pending')"
          @keyup.space.prevent="openApplicationsView('pending')"
        >
          <q-card-section class="stat-card-content dashboard-kpi-content">
            <div class="stat-card-main dashboard-kpi-main">
              <div class="stat-card-left dashboard-kpi-left">
                <div class="row items-center no-wrap q-gutter-xs dashboard-kpi-icon-wrap">
                  <q-icon name="schedule" size="28px" color="warning" />
                  <q-icon
                    v-if="dashboardData.pending_count > 5"
                    name="warning"
                    size="18px"
                    color="warning"
                  />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm dashboard-kpi-label">
                  Pending Applications
                </div>
              </div>
              <div class="stat-value text-warning dashboard-kpi-value">
                <q-spinner v-if="loading" size="32px" color="warning" />
                <template v-else>{{ dashboardData.pending_count }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-4 dashboard-kpi-col">
        <q-card
          class="stat-card stat-card--interactive bg-white rounded-borders dashboard-kpi-card"
          flat
          elevation="1"
          role="button"
          tabindex="0"
          :style="{ '--stat-card-hover-bg': '#edf8ef' }"
          @click="openApplicationsView('approved')"
          @keyup.enter="openApplicationsView('approved')"
          @keyup.space.prevent="openApplicationsView('approved')"
        >
          <q-card-section class="stat-card-content dashboard-kpi-content">
            <div class="stat-card-main dashboard-kpi-main">
              <div class="stat-card-left dashboard-kpi-left">
                <div class="row items-center no-wrap q-gutter-xs dashboard-kpi-icon-wrap">
                  <q-icon name="check_circle" size="28px" color="primary" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm dashboard-kpi-label">
                  Total Approved
                </div>
              </div>
              <div class="stat-value text-primary dashboard-kpi-value">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.total_approved }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <AdminAnalyticsCharts :applications="applicationRows" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import AdminAnalyticsCharts from 'src/components/admin/AdminAnalyticsCharts.vue'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()

function emptyEmploymentBreakdown() {
  return {
    elective: 0,
    co_terminous: 0,
    regular: 0,
    casual: 0,
  }
}

const EMPLOYMENT_TYPE_BREAKDOWN_CARDS = [
  { key: 'elective', label: 'Elective' },
  { key: 'co_terminous', label: 'Co-term' },
  { key: 'regular', label: 'Regular' },
  { key: 'casual', label: 'Casual' },
]

const loading = ref(true)
const showPendingReminderDialog = ref(false)
const applicationRows = ref([])
const dashboardData = ref({
  pending_count: 0,
  approved_today: 0,
  total_approved: 0,
  total_count: 0,
  kpi_breakdown: {
    pending: emptyEmploymentBreakdown(),
    approved_today: emptyEmploymentBreakdown(),
    total_approved: emptyEmploymentBreakdown(),
    total: emptyEmploymentBreakdown(),
  },
})

const kpiBreakdown = computed(() => {
  const source = dashboardData.value.kpi_breakdown ?? {}
  return {
    pending: { ...emptyEmploymentBreakdown(), ...(source.pending ?? {}) },
    approved_today: { ...emptyEmploymentBreakdown(), ...(source.approved_today ?? {}) },
    total_approved: { ...emptyEmploymentBreakdown(), ...(source.total_approved ?? {}) },
    total: { ...emptyEmploymentBreakdown(), ...(source.total ?? {}) },
  }
})

const totalApplicationBreakdownCards = computed(() =>
  EMPLOYMENT_TYPE_BREAKDOWN_CARDS.map((card) => ({
    ...card,
    value: kpiBreakdown.value.total[card.key] ?? 0,
  })),
)

onMounted(fetchDashboard)

function pendingReminderSeenSessionKey() {
  return `lms_pending_reminder_seen:admin:${authStore.user?.id ?? 'unknown'}`
}

function pendingReminderNotificationId() {
  return `local-pending-reminder-admin:${authStore.user?.id ?? 'unknown'}`
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

async function fetchDashboard() {
  loading.value = true
  try {
    const [dashboardResponse, leaveApplicationsResponse, cocApplicationsResponse] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/leave-applications').catch(() => null),
      api.get('/admin/coc-applications').catch(() => null),
    ])

    const data = dashboardResponse?.data ?? {}
    dashboardData.value = {
      pending_count: Number(data.pending_count || 0),
      approved_today: Number(data.approved_today || 0),
      total_approved: Number(data.total_approved || 0),
      total_count: Number(data.total_count || 0),
      kpi_breakdown: data.kpi_breakdown ?? {
        pending: emptyEmploymentBreakdown(),
        approved_today: emptyEmploymentBreakdown(),
        total_approved: emptyEmploymentBreakdown(),
        total: emptyEmploymentBreakdown(),
      },
    }

    applicationRows.value = mergeApplications(
      extractApplicationsFromPayload(data),
      extractApplicationsFromPayload(leaveApplicationsResponse?.data),
      extractApplicationsFromPayload(cocApplicationsResponse?.data),
    )
    maybeShowPendingReminder()
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to load dashboard data right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
    applicationRows.value = []
  } finally {
    loading.value = false
  }
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

function openApplicationsView(search = '') {
  const normalizedSearch = String(search || '').trim()
  const query = normalizedSearch ? { search: normalizedSearch } : {}
  router.push({ name: 'admin-applications', query })
}

function focusPendingApplications() {
  showPendingReminderDialog.value = false
  openApplicationsView('pending')
}

function extractApplicationsFromPayload(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload

  const candidates = [
    payload?.applications,
    payload?.coc_applications,
    payload?.leave_applications,
    payload?.cocApplications,
    payload?.leaveApplications,
    payload?.rows,
    payload?.items,
    payload?.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    if (candidate && typeof candidate === 'object' && Array.isArray(candidate.data)) {
      return candidate.data
    }
  }

  return []
}

function normalizeApplicationType(value) {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'COC') return 'COC'
  if (normalized === 'LEAVE') return 'LEAVE'
  return ''
}

function getApplicationType(application) {
  const explicitType = normalizeApplicationType(
    application?.application_type ?? application?.applicationType ?? application?.type,
  )
  if (explicitType) return explicitType

  const leaveTypeName = normalizeEmployeeName(
    application?.leaveType ??
      application?.leave_type ??
      application?.leaveTypeName ??
      application?.leave_type_name,
  )

  if (leaveTypeName === 'coc application' || leaveTypeName === 'coc') return 'COC'
  return 'LEAVE'
}

function normalizeLookupValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function normalizeEmployeeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getApplicationEmployeeDisplayName(application) {
  return (
    application?.employeeName ||
    application?.employee_name ||
    application?.employee?.name ||
    application?.employee?.full_name ||
    application?.employee?.employee_name ||
    application?.name ||
    application?.full_name ||
    [application?.firstname, application?.middlename, application?.surname]
      .filter(Boolean)
      .join(' ')
  )
}

function getApplicationEmployeeLookupCandidates(application) {
  return [
    application?.employee_id,
    application?.employeeId,
    application?.control_no,
    application?.controlNo,
    application?.employee?.control_no,
    application?.employee?.controlNo,
    application?.employee?.employee_id,
    application?.employee?.employeeId,
  ]
    .map((value) => normalizeLookupValue(value))
    .filter(Boolean)
}

function getApplicationMergeKey(application, index) {
  const typeKey = getApplicationType(application)
  const explicitId =
    application?.id ??
    application?.application_id ??
    application?.leave_application_id ??
    application?.coc_application_id
  if (explicitId !== undefined && explicitId !== null && String(explicitId).trim() !== '') {
    return `id:${typeKey}:${String(explicitId).trim()}`
  }

  const employeeKey =
    getApplicationEmployeeLookupCandidates(application)[0] ||
    normalizeEmployeeName(getApplicationEmployeeDisplayName(application))
  const leaveTypeKey = normalizeEmployeeName(
    application?.leaveType ?? application?.leave_type ?? application?.leaveTypeName,
  )
  const filedDateKey = normalizeLookupValue(
    application?.dateFiled ??
      application?.date_filed ??
      application?.filed_at ??
      application?.filedAt ??
      application?.created_at ??
      application?.createdAt,
  )

  const fallbackKey = [employeeKey, leaveTypeKey, filedDateKey].filter(Boolean).join('|')
  return fallbackKey ? `fallback:${fallbackKey}` : `index:${index}`
}

function getApplicationCompletenessScore(application) {
  const candidates = [
    getApplicationEmployeeDisplayName(application),
    application?.employee_id,
    application?.leaveType,
    application?.dateFiled,
    application?.status,
    application?.rawStatus,
    application?.remarks,
    application?.selected_dates,
    application?.startDate,
    application?.endDate,
  ]

  return candidates.filter((value) => {
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null && String(value).trim() !== ''
  }).length
}

function getApplicationTimestampValue(application) {
  const candidates = [
    application?.updated_at,
    application?.updatedAt,
    application?.dateFiled,
    application?.date_filed,
    application?.filed_at,
    application?.filedAt,
    application?.created_at,
    application?.createdAt,
  ]

  for (const candidate of candidates) {
    const timestamp = Date.parse(candidate)
    if (!Number.isNaN(timestamp)) return timestamp
  }

  return 0
}

function choosePreferredApplication(existingApplication, incomingApplication) {
  if (!existingApplication) return incomingApplication

  const incomingCompleteness = getApplicationCompletenessScore(incomingApplication)
  const existingCompleteness = getApplicationCompletenessScore(existingApplication)
  if (incomingCompleteness !== existingCompleteness) {
    return incomingCompleteness > existingCompleteness ? incomingApplication : existingApplication
  }

  const incomingTimestamp = getApplicationTimestampValue(incomingApplication)
  const existingTimestamp = getApplicationTimestampValue(existingApplication)
  if (incomingTimestamp !== existingTimestamp) {
    return incomingTimestamp > existingTimestamp ? incomingApplication : existingApplication
  }

  return incomingApplication
}

function mergeApplications(...sources) {
  const mergedApplications = new Map()

  sources.flat().forEach((application, index) => {
    const normalizedApplication = {
      ...application,
      application_type: getApplicationType(application),
    }
    const key = getApplicationMergeKey(normalizedApplication, index)
    const existingApplication = mergedApplications.get(key)
    mergedApplications.set(
      key,
      choosePreferredApplication(existingApplication, normalizedApplication),
    )
  })

  return Array.from(mergedApplications.values())
}
</script>

<style scoped>
.stat-cards-row .col {
  display: flex;
}
.stat-card {
  width: 100%;
  height: 100%;
  min-height: 116px;
}
.stat-card--interactive {
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}
.stat-card--interactive:hover,
.stat-card--interactive:focus-visible {
  background: var(--stat-card-hover-bg, #f5f7fa) !important;
  box-shadow: 0 10px 24px rgba(38, 50, 56, 0.1);
  transform: translateY(-2px);
}
.stat-card-content {
  height: 100%;
  padding: 12px 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.stat-card-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.stat-card-left {
  flex: 1 1 auto;
}
.stat-value {
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 2px;
  min-width: 64px;
  text-align: right;
  font-size: clamp(2.2rem, 3.2vw, 2.8rem);
  font-weight: 500;
  line-height: 1;
}
.stat-breakdown {
  margin-top: 4px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.stat-mini-card {
  width: 100%;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 7px;
  border: 1px solid #ebeff3;
  background: #f7f9fb;
  appearance: none;
  font: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  cursor: default;
}
.stat-mini-label {
  min-width: 0;
  font-size: 0.62rem;
  color: #9aa3ad;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stat-mini-value {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: #7f8b97;
  font-weight: 600;
}
.dashboard-kpi-main {
  align-items: center;
}
.dashboard-kpi-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.dashboard-kpi-label {
  margin-top: 0 !important;
}
.pending-reminder-card {
  min-width: 360px;
  max-width: 480px;
  width: min(480px, calc(100vw - 32px));
  border-radius: 18px;
}
.pending-reminder-card__header {
  padding: 20px 24px 0;
}
.pending-reminder-card__title {
  font-weight: 700;
}
.pending-reminder-card__body {
  padding: 14px 24px 10px;
}
.pending-reminder-card__message {
  line-height: 1.5;
}
.pending-reminder-card__actions {
  gap: 10px;
  padding: 6px 24px 22px;
}
.pending-reminder-card__button {
  min-height: 44px;
  padding-inline: 18px;
}

@media (max-width: 599px) {
  .pending-reminder-card {
    min-width: 0;
    width: calc(100vw - 18px);
    max-width: calc(100vw - 18px);
    border-radius: 16px;
  }

  .pending-reminder-card__header {
    padding: 16px 18px 0;
  }

  .pending-reminder-card__icon {
    font-size: 22px !important;
  }

  .pending-reminder-card__title {
    font-size: 1rem;
    line-height: 1.2;
  }

  .pending-reminder-card__body {
    padding: 12px 18px 8px;
  }

  .pending-reminder-card__message {
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .pending-reminder-card__actions {
    gap: 8px;
    padding: 2px 18px 16px;
  }

  .pending-reminder-card__button {
    min-height: 40px;
    padding-inline: 14px;
    font-size: 0.88rem;
  }

  .dashboard-kpi-row {
    margin-bottom: 10px !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .dashboard-kpi-col {
    width: 100%;
    flex: 0 0 100%;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .dashboard-kpi-card {
    min-height: 68px;
  }

  .dashboard-kpi-content {
    padding: 8px 10px 7px;
    gap: 0;
  }

  .dashboard-kpi-main {
    align-items: center;
    gap: 8px;
  }

  .dashboard-kpi-left {
    gap: 6px;
  }

  .dashboard-kpi-icon-wrap :deep(.q-icon) {
    font-size: 18px !important;
  }

  .dashboard-kpi-label {
    font-size: 0.64rem;
    line-height: 1;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-kpi-value {
    min-width: 0;
    margin-top: 0;
    font-size: 1.75rem;
    line-height: 1;
  }

  .dashboard-kpi-breakdown {
    margin-top: 4px;
    gap: 4px;
  }

  .dashboard-kpi-breakdown .stat-mini-card {
    padding: 2px 4px;
    border-radius: 6px;
  }

  .dashboard-kpi-breakdown .stat-mini-label {
    font-size: 0.5rem;
  }

  .dashboard-kpi-breakdown .stat-mini-value {
    font-size: 0.6rem;
  }
}
</style>
