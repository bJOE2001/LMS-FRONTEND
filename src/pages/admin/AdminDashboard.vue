<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-xs">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Admin Dashboard</h1>
        <q-space />
        <q-btn
          unelevated
          color="green-8"
          icon="description"
          label="Apply Leave"
          @click="openApplyLeaveDialog"
        />
      </div>
      <p class="text-grey-7 q-mb-lg">Review and approve leave applications</p>

    <q-dialog
      v-model="showApplyLeaveDialog"
      persistent
      class="apply-leave-dialog"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card
        class="apply-leave-dialog-card"
      >
        <q-bar class="apply-leave-dialog-header bg-primary text-white">
          <div class="text-h6 text-weight-bold">Leave Application</div>
          <q-space />
          <q-btn flat round icon="close" color="white" size="md" class="apply-leave-dialog-close" @click="closeApplyLeaveDialog" />
        </q-bar>
        <q-card-section class="q-pa-none apply-leave-dialog-body">
          <AdminApplySelf
            in-dialog
            @cancel="closeApplyLeaveDialog"
            @submitted="handleApplyLeaveSubmitted"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showPendingReminderDialog" persistent>
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
          <q-btn unelevated color="warning" label="Review Now" @click="focusPendingApplications" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <div class="row q-col-gutter-md q-mb-lg stat-cards-row">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="description" size="28px" color="grey" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Total Applications</div>
              </div>
              <div class="stat-value text-primary">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.total_count }}</template>
              </div>
            </div>
            <div class="stat-breakdown">
              <div class="stat-mini-card"><span class="stat-mini-label">Elective</span><span class="stat-mini-value">{{ loading ? '-' : kpiBreakdown.total.elective }}</span></div>
              <div class="stat-mini-card"><span class="stat-mini-label">Co-term</span><span class="stat-mini-value">{{ loading ? '-' : kpiBreakdown.total.co_terminous }}</span></div>
              <div class="stat-mini-card"><span class="stat-mini-label">Regular</span><span class="stat-mini-value">{{ loading ? '-' : kpiBreakdown.total.regular }}</span></div>
              <div class="stat-mini-card"><span class="stat-mini-label">Casual</span><span class="stat-mini-value">{{ loading ? '-' : kpiBreakdown.total.casual }}</span></div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="schedule" size="28px" color="warning" />
                  <q-icon v-if="dashboardData.pending_count > 5" name="warning" size="18px" color="warning" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Pending Applications</div>
              </div>
              <div class="stat-value text-warning">
                <q-spinner v-if="loading" size="32px" color="warning" />
                <template v-else>{{ dashboardData.pending_count }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1">
          <q-card-section class="stat-card-content">
            <div class="stat-card-main">
              <div class="stat-card-left">
                <div class="row items-center no-wrap q-gutter-xs">
                  <q-icon name="check_circle" size="28px" color="primary" />
                </div>
                <div class="text-caption text-weight-medium q-mt-sm">Total Approved</div>
              </div>
              <div class="stat-value text-primary">
                <q-spinner v-if="loading" size="32px" color="primary" />
                <template v-else>{{ dashboardData.total_approved }}</template>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card ref="applicationsSectionRef" flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row justify-between items-center q-col-gutter-sm">
          <div class="text-h6">All Application</div>
          <div class="row items-center q-gutter-sm">
            <q-input
              v-model="statusSearch"
              dense
              outlined
              clearable
              debounce="250"
              placeholder="Search employee, status, date filed"
              class="application-status-search"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
            <q-btn
              unelevated
              no-caps
              color="blue-grey-7"
              icon="print"
              label="Print Applications"
              size="sm"
              @click="printApplicationsPdf"
            />
          </div>
        </div>
      </q-card-section>
      <q-table
        :rows="applicationsForTable"
        :columns="columns"
        row-key="id"
        flat
        :pagination="applicationsPagination"
        :rows-per-page-options="[5, 10, 15, 20]"
        :loading="loading"
      >
        <template #body-cell-employee="props">
          <q-td>
            <div class="text-weight-medium">{{ props.row.employeeName }}</div>
            <div class="text-caption text-grey-7">{{ props.row.employee_id }}</div>
          </q-td>
        </template>
        <template #body-cell-leaveBalance="props">
          <q-td>
            <div class="leave-balance-cell">
              <q-badge
                v-for="(item, index) in getLeaveBalanceTextItems(props.row)"
                :key="`${props.row.id}-leave-balance-text-${index}`"
                color="grey-2"
                text-color="grey-7"
                rounded
                class="leave-balance-badge"
                :label="item.label"
              />
            </div>
          </q-td>
        </template>
        <template #body-cell-inclusiveDates="props">
          <q-td>
            <div class="application-details-cell">
              <span
                v-for="(line, index) in getApplicationInclusiveDateLines(props.row)"
                :key="`${props.row.id}-inclusive-${index}`"
                class="text-weight-medium text-grey-9"
              >
                {{ line }}
              </span>
            </div>
          </q-td>
        </template>
        <template #body-cell-dateFiled="props">
          <q-td>
            <span class="text-weight-medium text-grey-9">{{ formatDate(props.row.dateFiled) || 'N/A' }}</span>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td class="text-center">
            <q-badge
              :color="getApplicationStatusColor(props.row)"
              :label="getApplicationStatusLabel(props.row)"
              rounded
              class="text-weight-medium q-pa-xs"
              style="padding-left:10px;padding-right:10px"
            />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td class="pending-actions-cell text-center">
            <div class="row no-wrap justify-center items-center q-gutter-x-xs">
              <q-btn flat dense round size="sm" icon="visibility" @click="openDetails(props.row)">
                <q-tooltip>View</q-tooltip>
              </q-btn>
              <template v-if="props.row.rawStatus === 'PENDING_ADMIN'">
                <q-btn flat dense round size="sm" icon="check_circle" color="green-7" @click="openActionConfirm('approve', props.row)">
                  <q-tooltip>Approve</q-tooltip>
                </q-btn>
                <q-btn flat dense round size="sm" icon="cancel" color="negative" @click="openActionConfirm('disapprove', props.row)">
                  <q-tooltip>Disapprove</q-tooltip>
                </q-btn>
                <q-btn flat dense round size="sm" icon="event_busy" color="blue-grey-7" @click="openActionConfirm('cancel', props.row)">
                  <q-tooltip>Cancel</q-tooltip>
                </q-btn>
              </template>
              <template v-else-if="props.row.rawStatus === 'PENDING_HR'">
                <q-btn flat dense round size="sm" icon="event_busy" color="blue-grey-7" @click="openActionConfirm('cancel', props.row)">
                  <q-tooltip>Cancel</q-tooltip>
                </q-btn>
              </template>
            </div>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-md text-grey-7">
            <q-icon name="warning" size="24px" class="q-mr-sm" />
            <span>No Applications Submitted</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- View dialog -->
    <q-dialog v-model="showDetailsDialog" position="standard">
      <q-card v-if="selectedApp" class="application-timeline-card" style="width: 680px; max-width: 96vw">
        <q-card-section class="bg-primary text-white row items-center no-wrap application-timeline-header">
          <div class="text-h6">Application Timeline</div>
          <q-space />
          <q-btn flat dense round icon="close" color="white" v-close-popup />
        </q-card-section>
        <q-card-section class="application-timeline-content">
          <div class="application-timeline-summary q-mb-md">
            <div class="application-timeline-summary-row">
              <div class="application-timeline-summary-main">
                <div class="text-weight-medium">{{ selectedApp.employeeName }}</div>
                <div class="text-caption text-grey-7">
                  {{ selectedApp.leaveType }}{{ selectedApp.is_monetization ? ' (Monetization)' : '' }}
                </div>
                <q-badge
                  class="q-mt-sm"
                  rounded
                  :color="getApplicationStatusColor(selectedApp)"
                  :label="getApplicationStatusLabel(selectedApp)"
                />
              </div>
              <q-btn
                v-if="canPrintApplication(selectedApp)"
                unelevated
                no-caps
                color="blue-grey-7"
                icon="print"
                label="Print Form"
                size="sm"
                class="timeline-print-btn"
                @click="printApplication(selectedApp)"
              />
            </div>
          </div>
          <q-timeline color="primary" layout="dense" class="application-timeline">
            <q-timeline-entry
              v-for="(entry, index) in selectedAppTimeline"
              :key="`${entry.title}-${index}`"
              :title="entry.title"
              :subtitle="entry.subtitle"
              :icon="entry.icon"
              :color="entry.color"
            >
              <div class="text-body2 text-grey-8">
                {{ entry.description }}
              </div>
              <div v-if="entry.actor" class="text-caption text-grey-7 q-mt-xs">
                Action by: {{ entry.actor }}
              </div>
            </q-timeline-entry>
          </q-timeline>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Action confirmation dialog -->
    <q-dialog v-model="showConfirmActionDialog">
      <q-card style="min-width: 360px; max-width: 440px">
        <q-card-section class="text-center q-py-md">
          <div class="text-h6">
            {{ getConfirmActionTitle(confirmActionType) }}
          </div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            {{ getConfirmActionMessage(confirmActionType) }}
          </div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn
            unelevated
            label="Yes"
            color="green-7"
            @click="confirmPendingAction"
          />
          <q-btn
            unelevated
            label="No"
            color="negative"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Disapprove dialog -->
    <q-dialog v-model="showDisapproveDialog" persistent>
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">{{ rejectionDialogTitle }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="remarks" type="textarea" :label="rejectionDialogLabel" rows="4" outlined />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated
            :color="rejectionMode === 'cancel' ? 'blue-grey-7' : 'negative'"
            :label="rejectionMode === 'cancel' ? 'Confirm Cancel' : 'Submit'"
            :loading="actionLoading"
            @click="confirmDisapprove"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Action Result dialog -->
    <q-dialog v-model="showActionResultDialog" persistent>
      <q-card style="min-width: 420px; max-width: 520px">
        <q-card-section class="row items-center">
          <q-icon
            :name="actionResultType === 'approved' ? 'check_circle' : 'cancel'"
            :color="actionResultType === 'approved' ? 'green-7' : (actionResultType === 'cancelled' ? 'blue-grey-7' : 'negative')"
            size="28px"
            class="q-mr-sm"
          />
          <div class="text-h6">
            Application {{ getActionResultLabel(actionResultType) }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-body2 text-grey-8">
            The application has been {{ getActionResultVerb(actionResultType) }}.
            You can print the finalized form now.
          </div>
          <div v-if="actionResultApp" class="text-caption text-grey-7 q-mt-sm">
            {{ actionResultApp.employeeName }} - {{ actionResultApp.leaveType }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            unelevated
            color="primary"
            icon="print"
            label="Print PDF"
            :disable="!actionResultApp"
            @click="printActionResult"
          />
          <q-btn flat label="Close" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { generateLeaveFormPdf } from 'src/utils/leave-form-pdf'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { useAuthStore } from 'stores/auth-store'
import { useNotificationStore } from 'stores/notification-store'
import AdminApplySelf from 'pages/admin/AdminApplySelf.vue'

const $q = useQuasar()
const authStore = useAuthStore()
const notifStore = useNotificationStore()
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

function emptyEmploymentBreakdown() {
  return {
    elective: 0,
    co_terminous: 0,
    regular: 0,
    casual: 0,
  }
}

const loading = ref(true)
const actionLoading = ref(false)
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
  applications: [],
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

const statusSearch = ref('')
const applicationsPagination = ref({
  rowsPerPage: 10,
})
const applicationsForTable = computed(() => {
  const queryTokens = getSearchTokens(statusSearch.value)
  const applications = dashboardData.value.applications ?? []
  const filteredApplications = queryTokens.length
    ? applications.filter((app) => {
      const searchTokens = getApplicationSearchTokenSet(app)
      return queryTokens.every((token) => searchTokens.has(token))
    })
    : applications

  return [...filteredApplications].sort(compareApplicationsForTable)
})

const latestLeaveBalanceEntriesByEmployee = computed(() => {
  const entriesByEmployee = new Map()
  const applications = [...(dashboardData.value.applications ?? [])]
    .sort(compareApplicationsByRecencyDesc)

  for (const app of applications) {
    const employeeKey = getEmployeeBalanceLookupKey(app)
    if (!employeeKey) continue

    const latestEntries = getLeaveBalanceEntriesFromSnapshot(app)
    if (!latestEntries.length) continue

    let employeeEntries = entriesByEmployee.get(employeeKey)
    if (!employeeEntries) {
      employeeEntries = new Map()
      entriesByEmployee.set(employeeKey, employeeEntries)
    }

    for (const entry of latestEntries) {
      const leaveTypeKey = getLeaveBalanceTypeKey(entry.label)
      if (!leaveTypeKey || employeeEntries.has(leaveTypeKey)) continue
      employeeEntries.set(leaveTypeKey, entry)
    }
  }

  return entriesByEmployee
})

const columns = [
  { name: 'employee', label: 'Employee', align: 'left' },
  { name: 'leaveType', label: 'Leave Type', field: (row) => row.is_monetization ? `${row.leaveType} (Monetization)` : row.leaveType, align: 'left' },
  { name: 'dateFiled', label: 'Date Filed', field: (row) => row.dateFiled ? formatDate(row.dateFiled) : 'N/A', align: 'left' },
  { name: 'inclusiveDates', label: 'Inclusive Dates', field: (row) => getApplicationDurationLabel(row), align: 'left' },
  { name: 'leaveBalance', label: 'Leave Balance', field: (row) => getLeaveBalanceDisplay(row), align: 'left' },
  { name: 'days', label: 'Days', field: (row) => getApplicationDayCount(row), align: 'center' },
  { name: 'status', label: 'Status', field: (row) => getApplicationStatusLabel(row), align: 'center' },
  { name: 'actions', label: 'Actions', align: 'center', style: 'width: 150px', headerStyle: 'width: 150px' },
]
const showApplyLeaveDialog = ref(false)
const showPendingReminderDialog = ref(false)
const applicationsSectionRef = ref(null)
const showDetailsDialog = ref(false)
const showDisapproveDialog = ref(false)
const selectedApp = ref(null)
const disapproveId = ref('')
const remarks = ref('')
const rejectionMode = ref('disapprove')
const disapproveTargetApp = ref(null)
const showConfirmActionDialog = ref(false)
const confirmActionType = ref('approve')
const confirmActionTarget = ref(null)
const showActionResultDialog = ref(false)
const actionResultType = ref('approved')
const actionResultApp = ref(null)
const selectedAppTimeline = computed(() => buildApplicationTimeline(selectedApp.value))
const rejectionDialogTitle = computed(() =>
  rejectionMode.value === 'cancel' ? 'Cancel Application' : 'Disapprove Application'
)
const rejectionDialogLabel = computed(() =>
  rejectionMode.value === 'cancel' ? 'Reason for cancellation' : 'Reason for disapproval'
)

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

function openApplyLeaveDialog() {
  showApplyLeaveDialog.value = true
}

function closeApplyLeaveDialog() {
  showApplyLeaveDialog.value = false
}

async function handleApplyLeaveSubmitted() {
  closeApplyLeaveDialog()
  await fetchDashboard()
}

async function fetchDashboard() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/dashboard')
    dashboardData.value = data
    maybeShowPendingReminder()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load dashboard data right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)

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

function focusPendingApplications() {
  showPendingReminderDialog.value = false
  statusSearch.value = 'pending'

  nextTick(() => {
    const target = applicationsSectionRef.value?.$el ?? applicationsSectionRef.value
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDayValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0'
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
}

function formatLeaveBalanceValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return ''
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2)
}

const REQUIRED_LEAVE_BALANCE_TYPES = [
  'Mandatory / Forced Leave',
  'MCO6 Leave',
  'Sick Leave',
  'Vacation Leave',
  'Wellness Leave',
]

const EVENT_BASED_LEAVE_BALANCE_TYPES = [
  'Maternity Leave',
  'Paternity Leave',
  'Special Privilege Leave',
  'Solo Parent Leave',
  'Study Leave',
  '10-Day VAWC Leave',
  'Rehabilitation Privilege',
  'Special Leave Benefits for Women',
  'Special Emergency (Calamity) Leave',
  'Adoption Leave',
]

function prettifyLeaveBalanceLabel(value) {
  const label = String(value || '').trim()
  if (!label) return ''

  const normalized = label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const lower = normalized.toLowerCase()
  if (lower === 'mandatory' || lower === 'forced' || lower === 'mandatory forced leave') return 'Mandatory / Forced Leave'
  if (lower === 'mandatory / forced leave') return 'Mandatory / Forced Leave'
  if (lower === 'mco6' || lower === 'mco6 leave') return 'MCO6 Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function toLeaveBalanceAcronym(value) {
  const label = prettifyLeaveBalanceLabel(value)
  if (!label) return ''

  const lower = label.toLowerCase()
  if (lower === 'mandatory / forced leave') return 'FL'
  if (lower === 'mco6 leave') return 'MCO6'
  if (lower === 'sick leave') return 'SL'
  if (lower === 'vacation leave') return 'VL'
  if (lower === 'wellness leave') return 'WL'

  const normalized = label
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim().toUpperCase())
    .filter((part) => part && !['AND', 'FOR', 'OF', 'THE'].includes(part))

  if (!normalized.length) return ''
  return normalized.map((part) => part[0]).join('')
}

function addLeaveBalanceEntry(entries, seen, label, value) {
  const formattedValue = formatLeaveBalanceValue(value)
  const formattedLabel = prettifyLeaveBalanceLabel(label)
  if (!formattedLabel || formattedValue === '') return

  const key = formattedLabel.toLowerCase()
  if (seen.has(key)) return

  seen.add(key)
  entries.push({ label: formattedLabel, value: formattedValue })
}

function getEmployeeBalanceLookupKey(app) {
  const explicitKey = app?.employee_id ?? app?.employeeId ?? app?.control_no ?? app?.controlNo
  if (explicitKey !== undefined && explicitKey !== null && String(explicitKey).trim() !== '') {
    return String(explicitKey).trim().toLowerCase()
  }

  const nameKey = [
    app?.surname,
    app?.firstname,
    app?.middlename,
    app?.employeeName,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .join('|')

  return nameKey || ''
}

function getLeaveBalanceTypeKey(value) {
  return prettifyLeaveBalanceLabel(value).trim().toLowerCase()
}

function isEventBasedLeaveBalanceType(value) {
  const typeKey = getLeaveBalanceTypeKey(value)
  return EVENT_BASED_LEAVE_BALANCE_TYPES
    .some((label) => getLeaveBalanceTypeKey(label) === typeKey)
}

function collectLeaveBalanceEntriesFromValue(entries, seen, source, fallbackLabel = '') {
  if (!source) return

  if (Array.isArray(source)) {
    for (const item of source) {
      if (item == null) continue
      if (typeof item !== 'object') continue

      addLeaveBalanceEntry(
        entries,
        seen,
        item.leave_type_name || item.leave_type || item.type_name || item.type || item.name || item.label || fallbackLabel,
        item.balance ?? item.remaining_balance ?? item.available_balance ?? item.credits ?? item.value
      )
    }
    return
  }

  if (typeof source !== 'object') {
    addLeaveBalanceEntry(entries, seen, fallbackLabel, source)
    return
  }

  for (const [key, value] of Object.entries(source)) {
    if (value == null || key === 'as_of_date') continue

    if (typeof value === 'object' && !Array.isArray(value)) {
      addLeaveBalanceEntry(
        entries,
        seen,
        value.leave_type_name || value.leave_type || value.type_name || value.type || value.name || value.label || key,
        value.balance ?? value.remaining_balance ?? value.available_balance ?? value.credits ?? value.value
      )
      continue
    }

    addLeaveBalanceEntry(entries, seen, key, value)
  }
}

function getLeaveBalanceEntriesFromSnapshot(app) {
  const entries = []
  const seen = new Set()

  collectLeaveBalanceEntriesFromValue(entries, seen, app?.certificationLeaveCredits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.certification_leave_credits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveBalances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveCredits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_credits)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balance)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leave_balance_summary)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.employee_leave_balances)
  collectLeaveBalanceEntriesFromValue(entries, seen, app?.leaveBalance)

  if (!entries.length) {
    addLeaveBalanceEntry(
      entries,
      seen,
      app?.leaveType || 'Leave Balance',
      app?.balance ?? app?.leave_balance ?? app?.remaining_balance ?? app?.available_balance
    )
  }

  return entries
}

function resolveLatestLeaveBalanceEntries(app) {
  const employeeKey = getEmployeeBalanceLookupKey(app)
  if (!employeeKey) return getLeaveBalanceEntriesFromSnapshot(app)

  const employeeEntries = latestLeaveBalanceEntriesByEmployee.value.get(employeeKey)
  if (!employeeEntries || employeeEntries.size === 0) {
    return getLeaveBalanceEntriesFromSnapshot(app)
  }

  return Array.from(employeeEntries.values())
}

function getLeaveBalanceEntries(app) {
  const resolvedEntries = resolveLatestLeaveBalanceEntries(app)
    .filter((entry) => !isEventBasedLeaveBalanceType(entry.label))
  const requiredTypeKeys = new Set(
    REQUIRED_LEAVE_BALANCE_TYPES.map((label) => getLeaveBalanceTypeKey(label))
  )
  const entriesByType = new Map(
    resolvedEntries.map((entry) => [getLeaveBalanceTypeKey(entry.label), entry])
  )

  const orderedEntries = REQUIRED_LEAVE_BALANCE_TYPES.map((label) => {
    const existingEntry = entriesByType.get(getLeaveBalanceTypeKey(label))
    return existingEntry || { label, value: '0' }
  })

  for (const entry of resolvedEntries) {
    const leaveTypeKey = getLeaveBalanceTypeKey(entry.label)
    if (requiredTypeKeys.has(leaveTypeKey)) continue
    orderedEntries.push(entry)
  }

  return orderedEntries
}

function getLeaveBalanceLines(app) {
  return getLeaveBalanceEntries(app).map((entry) => {
    const acronym = toLeaveBalanceAcronym(entry.label)
    return `${acronym || entry.label}: ${entry.value}`
  })
}

function getLeaveBalanceTextItems(app) {
  return getLeaveBalanceEntries(app).map((entry) => {
    const acronym = toLeaveBalanceAcronym(entry.label)
    return {
      label: `${acronym || entry.label}: ${entry.value}`,
    }
  })
}

function getLeaveBalanceDisplay(app) {
  return getLeaveBalanceLines(app).join(', ')
}

function toIsoDateString(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function enumerateInclusiveDateRange(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue)
  const endDate = new Date(endDateValue)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []

  const firstDate = new Date(startDate)
  const lastDate = new Date(endDate)
  if (firstDate > lastDate) {
    const tempDate = new Date(firstDate)
    firstDate.setTime(lastDate.getTime())
    lastDate.setTime(tempDate.getTime())
  }

  const dates = []
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())
  const last = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())

  while (cursor <= last) {
    dates.push(toIsoDateString(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates.filter(Boolean)
}

function formatGroupedInclusiveDateLines(dateValues) {
  if (!Array.isArray(dateValues) || dateValues.length === 0) return []

  const groupedByMonthYear = new Map()
  const sortedDates = [...new Set(dateValues.filter(Boolean))]
    .sort((left, right) => Date.parse(left) - Date.parse(right))

  for (const rawDate of sortedDates) {
    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue

    const monthName = parsedDate.toLocaleDateString('en-US', { month: 'short' })
    const year = parsedDate.getFullYear()
    const day = parsedDate.getDate()
    const groupKey = `${year}-${parsedDate.getMonth()}`

    if (!groupedByMonthYear.has(groupKey)) {
      groupedByMonthYear.set(groupKey, { monthName, year, days: [] })
    }

    groupedByMonthYear.get(groupKey).days.push(day)
  }

  return Array.from(groupedByMonthYear.values()).map((group) => {
    const uniqueDays = [...new Set(group.days)].sort((a, b) => a - b)
    return `${group.monthName} ${uniqueDays.join(',')} ${group.year}`
  })
}

function getApplicationInclusiveDateLines(app) {
  if (!app) return ['N/A']

  if (app.is_monetization) {
    return [`${formatDayValue(app.days)} day(s)`]
  }

  if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
    const groupedSelectedDates = formatGroupedInclusiveDateLines(app.selected_dates)
    if (groupedSelectedDates.length > 0) return groupedSelectedDates
  }

  if (app.startDate || app.endDate) {
    const startDate = app.startDate || app.endDate
    const endDate = app.endDate || app.startDate
    const rangedDates = enumerateInclusiveDateRange(startDate, endDate)
    const groupedRangeDates = formatGroupedInclusiveDateLines(rangedDates)
    if (groupedRangeDates.length > 0) return groupedRangeDates
  }

  const start = app.startDate ? formatDate(app.startDate) : 'N/A'
  const end = app.endDate ? formatDate(app.endDate) : 'N/A'
  return [`${start} - ${end}`]
}

function getApplicationDayCount(app) {
  if (!app) return '0'

  if (app.is_monetization) {
    return formatDayValue(app.days)
  }

  if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
    const uniqueSelectedDates = [...new Set(app.selected_dates.filter(Boolean))]
    if (uniqueSelectedDates.length > 0) return String(uniqueSelectedDates.length)
  }

  if (app.startDate || app.endDate) {
    const startDate = app.startDate || app.endDate
    const endDate = app.endDate || app.startDate
    const rangedDates = enumerateInclusiveDateRange(startDate, endDate)
    if (rangedDates.length > 0) return String(rangedDates.length)
  }

  return formatDayValue(app.days)
}

function getApplicationDurationLabel(app) {
  return getApplicationInclusiveDateLines(app).join(' ')
}

function isCancelledByUser(app) {
  const remarksText = String(app?.remarks || '').trim()
  return /^cancelled\b/i.test(remarksText)
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSearchToken(token) {
  if (!token) return ''
  if (/^\d+$/.test(token)) {
    return String(Number(token))
  }
  return token
}

function tokenizeSearchValue(value) {
  const normalized = normalizeSearchText(value)
  if (!normalized) return []

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeSearchToken(token))
}

function getSearchTokens(value) {
  return tokenizeSearchValue(value)
}

function getApplicationStatusLabel(app) {
  if (isCancelledByUser(app)) return 'Cancelled'
  if (app?.status) return app.status

  if (app?.rawStatus === 'PENDING_ADMIN') return 'Pending Admin'
  if (app?.rawStatus === 'PENDING_HR') return 'Pending HR'
  if (app?.rawStatus === 'APPROVED') return 'Approved'
  if (app?.rawStatus === 'REJECTED') return 'Rejected'
  return 'Unknown'
}

function getApplicationStatusColor(app) {
  if (isCancelledByUser(app)) return 'grey-7'
  if (app?.rawStatus === 'PENDING_ADMIN') return 'warning'
  if (app?.rawStatus === 'PENDING_HR') return 'blue-6'
  if (app?.rawStatus === 'APPROVED') return 'green'
  if (app?.rawStatus === 'REJECTED') return 'negative'
  return 'grey-6'
}

function canPrintApplication(app) {
  return getApplicationStatusLabel(app) !== 'Pending Admin'
}

function getDateSearchValues(dateValue) {
  if (!dateValue) return []
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return [String(dateValue)]

  const monthLong = date.toLocaleDateString('en-US', { month: 'long' })
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()

  return [
    monthLong,
    monthShort,
    `${monthLong} ${day}`,
    `${monthLong} ${day} ${year}`,
    `${monthShort} ${day}`,
    `${monthShort} ${day} ${year}`,
    `day ${day}`,
    String(day),
    String(year),
  ]
}

function getApplicationSearchTokenSet(app) {
  const dateTerms = getDateSearchValues(app?.dateFiled)

  const searchTokens = [
    'application',
    app?.rawStatus,
    app?.status,
    getApplicationStatusLabel(app),
    isCancelledByUser(app) ? 'cancelled' : '',
    app?.leaveType,
    app?.employeeName,
    app?.firstname,
    app?.middlename,
    app?.surname,
    app?.employee_id,
    getLeaveBalanceDisplay(app),
    ...dateTerms,
  ].flatMap((value) => tokenizeSearchValue(value))

  return new Set(searchTokens)
}

function buildApplicationTimeline(app) {
  if (!app) return []

  const entries = [
    {
      title: 'Application Filed',
      subtitle: formatDate(app.dateFiled) || 'Date unavailable',
      description: `${app.employeeName || 'Employee'} submitted this leave request.`,
      icon: 'check_circle',
      color: 'positive',
      actor: resolveFiledByActor(app),
    },
  ]

  if (isCancelledByUser(app)) {
    entries.push({
      title: 'Application Cancelled',
      subtitle: 'Application closed',
      description: formatRecentRemarks(app) || 'Application was cancelled by the requester.',
      icon: 'cancel',
      color: 'grey-7',
      actor: resolveCancelledActor(app),
    })
    return entries
  }

  if (app.rawStatus === 'PENDING_ADMIN') {
    entries.push({
      title: 'Pending Department Admin Review',
      subtitle: 'Current stage',
      description: 'Waiting for department admin approval or disapproval.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push({
      title: 'Pending HR Review',
      subtitle: 'Upcoming',
      description: 'This stage starts after department admin approval.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    entries.push({
      title: 'Final Approval',
      subtitle: 'Upcoming',
      description: 'HR final decision will complete the application.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    return entries
  }

  if (app.rawStatus === 'REJECTED') {
    entries.push({
      title: 'Application Disapproved',
      subtitle: 'Application closed',
      description: formatRecentRemarks(app) || 'Application was disapproved.',
      icon: 'cancel',
      color: 'negative',
      actor: resolveDisapprovalActor(app),
    })
    return entries
  }

    entries.push({
      title: 'Department Admin Approved',
      subtitle: 'Completed',
      description: 'Application was reviewed and forwarded to HR.',
      icon: 'check_circle',
      color: 'positive',
      actor: resolveDepartmentAdminActor(app),
  })

  if (app.rawStatus === 'PENDING_HR') {
    entries.push({
      title: 'Pending HR Review',
      subtitle: 'Current stage',
      description: 'Waiting for HR final evaluation and approval.',
      icon: 'pending_actions',
      color: 'warning',
    })
    entries.push({
      title: 'Final Approval',
      subtitle: 'Upcoming',
      description: 'HR final decision will complete the application.',
      icon: 'radio_button_unchecked',
      color: 'grey-5',
    })
    return entries
  }

  if (app.rawStatus === 'APPROVED') {
    entries.push({
      title: 'Final Approval',
      subtitle: 'Completed',
      description: 'Application is fully approved.',
      icon: 'task_alt',
      color: 'positive',
      actor: resolveHrActor(app),
    })
    return entries
  }

  entries.push({
    title: 'Current Status',
    subtitle: getApplicationStatusLabel(app),
    description: 'Latest application status.',
    icon: 'info',
    color: getApplicationStatusColor(app),
  })

  return entries
}

function resolveFiledByActor(app) {
  return app?.filedBy || app?.employeeName || 'Unknown'
}

function resolveDepartmentAdminActor(app) {
  return app?.adminActionBy || 'Unknown'
}

function resolveHrActor(app) {
  return app?.hrActionBy || 'Unknown'
}

function resolveCancelledActor(app) {
  return app?.cancelledBy || app?.employeeName || 'Unknown'
}

function resolveDisapprovalActor(app) {
  if (isCancelledByUser(app)) return resolveCancelledActor(app)
  return app?.disapprovedBy || app?.hrActionBy || app?.adminActionBy || 'Unknown'
}

function resolveProcessedBy(app) {
  if (app?.processedBy) return app.processedBy
  if (isCancelledByUser(app)) return resolveCancelledActor(app)
  if (app?.rawStatus === 'PENDING_HR') return resolveDepartmentAdminActor(app)
  if (app?.rawStatus === 'APPROVED') return resolveHrActor(app)
  if (app?.rawStatus === 'REJECTED') return resolveDisapprovalActor(app)
  return 'N/A'
}

function resolveReviewedDateValue(app) {
  if (app?.reviewedAt) return app.reviewedAt
  if (isCancelledByUser(app)) return app?.cancelledAt || app?.disapprovedAt || null
  if (app?.rawStatus === 'PENDING_HR') return app?.adminActionAt || null
  if (app?.rawStatus === 'APPROVED') return app?.hrActionAt || app?.adminActionAt || null
  if (app?.rawStatus === 'REJECTED') return app?.disapprovedAt || app?.hrActionAt || app?.adminActionAt || null
  return null
}

function formatReviewedDate(app) {
  const reviewedDate = resolveReviewedDateValue(app)
  return reviewedDate ? formatDate(reviewedDate) : 'N/A'
}

function getApplicationStatusPriority(app) {
  if (app?.rawStatus === 'PENDING_ADMIN') return 0
  if (app?.rawStatus === 'PENDING_HR') return 1
  if (app?.rawStatus === 'APPROVED') return 2
  if (app?.rawStatus === 'REJECTED' && !isCancelledByUser(app)) return 3
  if (isCancelledByUser(app)) return 4
  return 5
}

function compareApplicationsForTable(a, b) {
  const statusPriorityDiff = getApplicationStatusPriority(a) - getApplicationStatusPriority(b)
  if (statusPriorityDiff !== 0) return statusPriorityDiff

  const dateA = getApplicationRecencyTimestamp(a)
  const dateB = getApplicationRecencyTimestamp(b)
  if (dateA !== dateB) return dateB - dateA

  const idA = Number(a?.id) || 0
  const idB = Number(b?.id) || 0
  return idB - idA
}

function getApplicationRecencyTimestamp(app) {
  const candidateDates = [
    app?.created_at,
    app?.createdAt,
    app?.submitted_at,
    app?.submittedAt,
    app?.filed_at,
    app?.filedAt,
    app?.dateFiled,
  ]

  for (const candidate of candidateDates) {
    const timestamp = Date.parse(candidate || '')
    if (Number.isFinite(timestamp)) return timestamp
  }

  return 0
}

function compareApplicationsByRecencyDesc(a, b) {
  const timestampDiff = getApplicationRecencyTimestamp(b) - getApplicationRecencyTimestamp(a)
  if (timestampDiff !== 0) return timestampDiff

  const idDiff = (Number(b?.id) || 0) - (Number(a?.id) || 0)
  if (idDiff !== 0) return idDiff

  return 0
}

function formatRecentRemarks(app) {
  const remarksText = String(app?.remarks || '').trim()
  if (!remarksText) return ''
  return remarksText.replace(/^cancelled(?:\s+via\s+erms)?\b:?\s*/i, '').trim()
}

function getConfirmActionTitle(type) {
  if (type === 'approve') return 'Approve this application?'
  if (type === 'cancel') return 'Cancel this application?'
  return 'Disapprove this application?'
}

function getConfirmActionMessage(type) {
  if (type === 'approve') {
    return 'This will forward the leave request to HR for final review.'
  }
  if (type === 'cancel') {
    return 'You will continue to the cancellation form.'
  }
  return 'You will continue to the disapproval form.'
}

function getActionResultLabel(type) {
  if (type === 'approved') return 'Approved'
  if (type === 'cancelled') return 'Cancelled'
  return 'Disapproved'
}

function getActionResultVerb(type) {
  if (type === 'approved') return 'approved'
  if (type === 'cancelled') return 'cancelled'
  return 'disapproved'
}

function openDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}

function openActionConfirm(type, target) {
  confirmActionType.value = type
  confirmActionTarget.value = target
  showConfirmActionDialog.value = true
  showDetailsDialog.value = false
}

function confirmPendingAction() {
  const target = confirmActionTarget.value
  const type = confirmActionType.value
  showConfirmActionDialog.value = false

  if (type === 'approve') {
    handleApprove(target)
    return
  }

  openDisapprove(target, type === 'cancel' ? 'cancel' : 'disapprove')
}

async function printApplication(app) {
  if (!canPrintApplication(app)) return

  try {
    const { data } = await api.get('/admin/dashboard')
    dashboardData.value = data
    const updated = data.applications?.find((a) => a.id === app.id)
    await generateLeaveFormPdf(updated || app)
  } catch {
    await generateLeaveFormPdf(app)
  }
}

function printApplicationsPdf() {
  const rowsToPrint = applicationsForTable.value

  if (!rowsToPrint.length) {
    $q.notify({ type: 'warning', message: 'No applications available to print.', position: 'top' })
    return
  }

  const searchText = statusSearch.value.trim()
  const title = searchText
    ? `Applications Report (Filtered: ${searchText})`
    : 'Applications Report (All)'

  const printedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const tableBody = [
    [
      { text: 'Employee', style: 'tableHeader' },
      { text: 'Leave Type', style: 'tableHeader' },
      { text: 'Date Filed', style: 'tableHeader' },
      { text: 'Inclusive Dates', style: 'tableHeader' },
      { text: 'Days', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
      { text: 'Processed By', style: 'tableHeader' },
      { text: 'Reviewed Date', style: 'tableHeader' },
    ],
    ...rowsToPrint.map((app) => ([
      `${app.employeeName || ''}${app.employee_id ? `\n${app.employee_id}` : ''}`,
      app.is_monetization ? `${app.leaveType || 'N/A'} (Monetization)` : (app.leaveType || 'N/A'),
      formatDate(app.dateFiled) || 'N/A',
      getApplicationInclusiveDateLines(app).join('\n'),
      formatDayValue(app.days),
      getApplicationStatusLabel(app),
      resolveProcessedBy(app),
      formatReviewedDate(app),
    ])),
  ]

  const docDefinition = {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    pageMargins: [24, 24, 24, 24],
    content: [
      { text: title, style: 'title' },
      { text: `Printed: ${printedAt}`, style: 'meta' },
      { text: `Total Applications: ${rowsToPrint.length}`, style: 'meta', margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 72, 125, 38, 68, 100, 82],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex) => rowIndex === 0 ? '#ECEFF1' : null,
          hLineColor: () => '#CFD8DC',
          vLineColor: () => '#CFD8DC',
        },
      },
    ],
    styles: {
      title: { fontSize: 15, bold: true, color: '#263238', margin: [0, 0, 0, 4] },
      meta: { fontSize: 10, color: '#455A64', margin: [0, 0, 0, 2] },
      tableHeader: { bold: true, color: '#263238', fontSize: 10 },
    },
    defaultStyle: {
      fontSize: 9,
    },
  }

  pdfMake.createPdf(docDefinition).open()
}

function resolveApp(target) {
  if (target && typeof target === 'object') return target
  const id = Number(target)
  if (!id) return null
  return dashboardData.value.applications.find((a) => Number(a.id) === id) || null
}

function mapStatusAfterAction(app, type) {
  if (!app) return null
  if (type === 'approved') {
    return {
      ...app,
      rawStatus: 'PENDING_HR',
      status: 'Pending HR',
    }
  }
  if (type === 'cancelled') {
    return {
      ...app,
      rawStatus: 'REJECTED',
      status: 'Cancelled',
      remarks: app.remarks || remarks.value,
    }
  }
  return {
    ...app,
    rawStatus: 'REJECTED',
    status: 'Rejected',
    remarks: app.remarks || remarks.value,
  }
}

function showPostActionDialog(type, id, fallbackApp = null) {
  const updated = dashboardData.value.applications.find((a) => Number(a.id) === Number(id))
  actionResultApp.value = updated || mapStatusAfterAction(fallbackApp, type)
  actionResultType.value = type
  showActionResultDialog.value = true
}

function printActionResult() {
  if (!actionResultApp.value) return
  printApplication(actionResultApp.value)
}

async function handleApprove(target) {
  const app = resolveApp(target)
  const id = app?.id ?? target
  actionLoading.value = true
  try {
    await api.post(`/admin/leave-applications/${id}/approve`)
    $q.notify({ type: 'positive', message: 'Leave application approved and forwarded to HR!', position: 'top' })
    showDetailsDialog.value = false
    await fetchDashboard()
    showPostActionDialog('approved', id, app)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to approve this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

function openDisapprove(target, mode = 'disapprove') {
  const app = resolveApp(target)
  disapproveId.value = app?.id ?? target
  disapproveTargetApp.value = app || null
  rejectionMode.value = mode
  remarks.value = ''
  showDisapproveDialog.value = true
  showDetailsDialog.value = false
}

async function confirmDisapprove() {
  if (!remarks.value.trim()) {
    const message = rejectionMode.value === 'cancel'
      ? 'Please provide a reason for cancellation'
      : 'Please provide a reason for disapproval'
    $q.notify({ type: 'warning', message, position: 'top' })
    return
  }
  actionLoading.value = true
  try {
    const actionType = rejectionMode.value === 'cancel' ? 'cancelled' : 'disapproved'
    const payloadRemarks = rejectionMode.value === 'cancel'
      ? `Cancelled by Department Admin: ${remarks.value.trim()}`
      : remarks.value

    await api.post(`/admin/leave-applications/${disapproveId.value}/reject`, {
      remarks: payloadRemarks,
    })
    const successMessage = rejectionMode.value === 'cancel'
      ? 'Leave application cancelled with remarks'
      : 'Leave application rejected with remarks'
    $q.notify({ type: 'info', message: successMessage, position: 'top' })
    showDisapproveDialog.value = false
    await fetchDashboard()
    const fallback = disapproveTargetApp.value
      ? { ...disapproveTargetApp.value, remarks: payloadRemarks }
      : null
    showPostActionDialog(actionType, disapproveId.value, fallback)
  } catch (err) {
    const fallbackError = rejectionMode.value === 'cancel'
      ? 'Unable to cancel this application right now.'
      : 'Unable to reject this application right now.'
    const msg = resolveApiErrorMessage(err, fallbackError)
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

</script>

<style scoped>
.stat-cards-row .col {
  display: flex;
}
.stat-card {
  width: 100%;
  height: 100%;
  min-height: 132px;
}
.stat-card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.stat-mini-card {
  min-width: 0;
  padding: 4px 6px;
  border-radius: 7px;
  border: 1px solid #ebeff3;
  background: #f7f9fb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
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
.apply-leave-dialog-card {
  width: min(1280px, 88vw);
  max-width: none;
  max-height: calc(100vh - 24px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}
.apply-leave-dialog-header {
  min-height: 56px;
  padding: 0 10px 0 14px;
}
.apply-leave-dialog-close {
  width: 38px;
  height: 38px;
}
.apply-leave-dialog :deep(.q-dialog__inner--minimized) {
  padding: 12px;
}
.apply-leave-dialog :deep(.q-dialog__inner--minimized > div) {
  max-width: none !important;
}
.apply-leave-dialog-body {
  flex: 0 0 auto;
  overflow: hidden;
}
.pending-actions-cell {
  width: 150px;
  padding-right: 8px;
}
.application-status-search {
  width: min(440px, 84vw);
}
.leave-balance-cell {
  min-width: 150px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.2;
}
.leave-balance-badge {
  padding: 2px 7px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  border: 1px solid #d8dee6;
}
.application-details-cell {
  min-width: 260px;
  white-space: normal;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.application-timeline-card {
  border-radius: 10px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.application-timeline-header {
  padding-right: 8px;
}
.application-timeline-summary {
  border: 1px solid #e4e8ed;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px 12px;
}
.application-timeline-summary-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.application-timeline-summary-main {
  min-width: 0;
}
.timeline-print-btn {
  flex-shrink: 0;
  white-space: nowrap;
}
.application-timeline-content {
  overflow-y: auto;
}
.application-timeline {
  padding-left: 12px;
  padding-right: 8px;
}
@media (max-width: 599px) {
  .application-timeline-summary-row {
    flex-direction: column;
  }
}
</style>
