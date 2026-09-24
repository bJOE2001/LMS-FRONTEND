<template>
  <q-page class="q-pa-md cancelled-applications-page">
    <!-- Header Section -->
    <div class="row items-center justify-between q-mb-md">
      <h1 class="text-h4 text-weight-bold q-ma-none text-grey-9">Cancelled Applications</h1>
    </div>

    <!-- Main Container Card -->
    <q-card flat bordered class="rounded-borders bg-white">
      <!-- Filters Toolbar -->
      <q-card-section class="q-pb-sm">
        <div class="row items-center q-col-gutter-sm">
          <!-- Search -->
          <div class="col-12 col-sm-4 col-md-4">
            <q-input
              v-model="search"
              dense
              outlined
              clearable
              debounce="350"
              placeholder="Search employee, ID, remarks..."
              @update:model-value="onFilterChange"
            >
              <template #prepend>
                <q-icon name="search" color="grey-6" />
              </template>
            </q-input>
          </div>

          <!-- Cancellation Type Dropdown Filter -->
          <div class="col-12 col-sm-4 col-md-3">
            <q-select
              v-model="activeTab"
              dense
              outlined
              emit-value
              map-options
              options-dense
              :options="cancellationTypeOptions"
              label="Cancellation Type"
              @update:model-value="onFilterChange"
            >
              <template #prepend>
                <q-icon name="filter_list" color="grey-6" />
              </template>
            </q-select>
          </div>

          <!-- Office / Department Filter -->
          <div class="col-12 col-sm-4 col-md-3">
            <q-select
              v-model="selectedDepartment"
              dense
              outlined
              clearable
              options-dense
              emit-value
              map-options
              :options="departmentOptions"
              label="Department / Office"
              @update:model-value="onFilterChange"
            >
              <template #prepend>
                <q-icon name="business" color="grey-6" />
              </template>
            </q-select>
          </div>

          <!-- Reset Filter Button -->
          <div v-if="hasActiveFilters" class="col-12 col-sm-auto col-md-2">
            <q-btn
              flat
              dense
              no-caps
              color="grey-7"
              icon="clear"
              label="Reset Filters"
              @click="resetFilters"
            />
          </div>
        </div>
      </q-card-section>

      <!-- Data Table -->
      <q-table
        :rows="applications"
        :columns="columns"
        row-key="id"
        flat
        binary-state-sort
        separator="horizontal"
        :loading="loading"
        v-model:pagination="pagination"
        :rows-per-page-options="[10, 25, 50]"
        @request="onRequest"
        @row-click="(_, row) => openTimeline(row)"
      >
        <!-- Custom Employee column -->
        <template #body-cell-employee="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="34px" color="primary" text-color="white" icon="person" class="q-mr-sm" />
              <div class="ellipsis">
                <div class="text-weight-bold text-grey-9 text-body2 ellipsis">
                  {{ formatEmployeeName(props.row) }}
                </div>
                <div class="text-caption text-grey-7">
                  Control #: <span class="text-weight-medium">{{ props.row.employee_control_no || 'N/A' }}</span>
                  <span v-if="props.row.office || props.row.applicantAdmin?.department?.name">
                    • {{ props.row.office_acronym || props.row.office || props.row.applicantAdmin?.department?.name }}
                  </span>
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Custom Leave Details column -->
        <template #body-cell-leave_details="props">
          <q-td :props="props">
            <div class="text-weight-medium text-grey-9">
              {{ props.row.leave_type_name || props.row.leaveType?.name || 'Leave' }}
            </div>
            <div class="text-caption text-grey-7">
              {{ formatDatesSummary(props.row) }}
              <q-badge
                v-if="props.row.total_days"
                color="blue-grey-1"
                text-color="blue-grey-9"
                class="q-ml-xs text-caption"
              >
                {{ props.row.total_days }} {{ Number(props.row.total_days) === 1 ? 'day' : 'days' }}
              </q-badge>
            </div>
          </q-td>
        </template>

        <!-- Custom Cancellation Type column -->
        <template #body-cell-cancellation_type="props">
          <q-td :props="props" class="text-center">
            <q-badge
              v-if="props.row.cancellation_type === 'APPROVED_CANCELLATION'"
              rounded
              class="q-py-xs q-px-sm bg-deep-purple-1 text-deep-purple-9 text-weight-bold border-deep-purple"
            >
              <q-icon name="verified" size="14px" class="q-mr-xs" />
              Approved Cancellation
            </q-badge>
            <q-badge
              v-else
              rounded
              class="q-py-xs q-px-sm bg-amber-1 text-amber-10 text-weight-bold border-amber"
            >
              <q-icon name="person_off" size="14px" class="q-mr-xs" />
              Cancelled While Pending
            </q-badge>
          </q-td>
        </template>

        <!-- Custom Cancellation Date & Actor column -->
        <template #body-cell-cancellation_date="props">
          <q-td :props="props">
            <div class="text-weight-medium text-grey-9">
              {{ formatDate(props.row.cancellation_date || props.row.updated_at) }}
            </div>
            <div class="text-caption text-grey-7">
              By: <span class="text-weight-medium">{{ props.row.cancellation_actor || 'Employee' }}</span>
            </div>
          </q-td>
        </template>

        <!-- Custom Reason column -->
        <template #body-cell-reason="props">
          <q-td :props="props" class="reason-cell">
            <div class="ellipsis-2-lines text-caption text-grey-8">
              {{ props.row.cancellation_reason || props.row.remarks || 'No reason specified' }}
            </div>
            <q-tooltip max-width="320px">
              {{ props.row.cancellation_reason || props.row.remarks || 'No reason specified' }}
            </q-tooltip>
          </q-td>
        </template>

        <!-- Custom Actions column -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center" @click.stop>
            <div class="row items-center justify-center no-wrap q-gutter-xs">
              <q-btn
                flat
                dense
                round
                color="primary"
                icon="history"
                @click="openTimeline(props.row)"
              >
                <q-tooltip>View Timeline</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="full-width column items-center justify-center q-pa-xl text-grey-6">
            <q-icon name="event_busy" size="48px" class="q-mb-sm text-grey-4" />
            <div class="text-subtitle1 text-weight-bold text-grey-8">No Cancelled Applications Found</div>
            <div class="text-caption text-grey-6">
              There are no cancelled applications matching the selected criteria.
            </div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Timeline Dialog -->
    <HrApplicationTimelineDialog
      v-model="showTimelineDialog"
      :application="selectedApp"
      :loading-timeline="timelineLoading"
      :build-timeline="buildCancelledTimeline"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import HrApplicationTimelineDialog from 'components/hr/HrApplicationTimelineDialog.vue'

const $q = useQuasar()

// State
const loading = ref(false)
const timelineLoading = ref(false)
const applications = ref([])
const activeTab = ref('ALL')
const search = ref('')
const selectedDepartment = ref(null)
const departmentOptions = ref([])

const counts = ref({
  all: 0,
  approved_cancellations: 0,
  employee_cancelled: 0,
})

const cancellationTypeOptions = computed(() => [
  { label: `All Cancelled (${counts.value.all})`, value: 'ALL' },
  { label: `Approved Cancellations (${counts.value.approved_cancellations})`, value: 'APPROVED_CANCELLATION' },
  { label: `Cancelled While Pending (${counts.value.employee_cancelled})`, value: 'EMPLOYEE_CANCELLED' },
])

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
  sortBy: 'id',
  descending: true,
})

// Modals
const showTimelineDialog = ref(false)
const selectedApp = ref(null)

const hasActiveFilters = computed(() => {
  return Boolean(search.value || selectedDepartment.value || activeTab.value !== 'ALL')
})

// Table Columns without App ID column
const columns = [
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: false },
  { name: 'leave_details', label: 'Leave Type & Dates', field: 'leave_type_name', align: 'left', sortable: false },
  { name: 'cancellation_type', label: 'Cancellation Type', field: 'cancellation_type', align: 'center', sortable: false },
  { name: 'cancellation_date', label: 'Date Cancelled', field: 'cancellation_date', align: 'left', sortable: false },
  { name: 'reason', label: 'Reason / Remarks', field: 'cancellation_reason', align: 'left', sortable: false },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center', sortable: false },
]

function formatEmployeeName(app) {
  if (app.applicant_name) return app.applicant_name
  if (app.employee_name) return app.employee_name
  if (app.employee?.surname && app.employee?.firstname) {
    const mi = app.employee.middlename ? ` ${app.employee.middlename.charAt(0)}.` : ''
    return `${app.employee.firstname}${mi} ${app.employee.surname}`
  }
  return 'Employee ' + (app.employee_control_no || '')
}

function formatDatesSummary(app) {
  if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
    if (app.selected_dates.length === 1) {
      return formatDate(app.selected_dates[0])
    }
    const sorted = [...app.selected_dates].sort()
    return `${formatDate(sorted[0])} - ${formatDate(sorted[sorted.length - 1])}`
  }
  if (app.start_date && app.end_date) {
    return `${formatDate(app.start_date)} - ${formatDate(app.end_date)}`
  }
  return 'N/A'
}

function formatDate(dateValue) {
  if (!dateValue) return ''
  const parsed = new Date(dateValue)
  if (isNaN(parsed.getTime())) return String(dateValue)
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildCancelledTimeline(app) {
  if (!app || typeof app !== 'object') return []

  const employeeName = formatEmployeeName(app) || 'Employee'
  const entries = []

  const rawLogs = (Array.isArray(app.logs) && app.logs.length > 0)
    ? app.logs
    : (Array.isArray(app.status_history) ? app.status_history : [])

  const sortedLogs = [...rawLogs].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    if (timeA === timeB) {
      return (Number(a.id) || 0) - (Number(b.id) || 0)
    }
    return timeA - timeB
  })

  let isFirstSubmission = true
  let isPostApprovalPhase = false

  if (sortedLogs.length > 0) {
    for (const log of sortedLogs) {
      const action = String(log.action || '').toUpperCase()
      const remarks = String(log.remarks || '').trim()
      const timeStr = formatDateTime(log.created_at)
      const actorName = log.actor_name || log.action_by_name || log.action_by

      if (action === 'SUBMITTED') {
        if (isFirstSubmission) {
          isFirstSubmission = false
          entries.push({
            title: 'Application Filed',
            subtitle: timeStr || 'Filed',
            description: remarks || `${employeeName} submitted this leave application.`,
            icon: 'check_circle',
            color: 'positive',
            actor: actorName || employeeName,
          })
        } else {
          isPostApprovalPhase = true
          entries.push({
            title: 'Leave Cancellation Requested',
            subtitle: timeStr || 'Submitted',
            description: remarks || 'Cancellation request submitted by employee.',
            icon: 'event_busy',
            color: 'warning',
            actor: actorName || employeeName,
          })
        }
      } else if (action === 'ADMIN_APPROVED') {
        if (isPostApprovalPhase || remarks.toLowerCase().includes('cancel')) {
          entries.push({
            title: 'Department Recommendation (Cancellation)',
            subtitle: timeStr || 'Approved',
            description: remarks || 'Approved leave cancellation request and forwarded to HR.',
            icon: 'thumb_up',
            color: 'positive',
            actor: actorName || app.applicantAdmin?.full_name || 'Department Admin',
          })
        } else {
          entries.push({
            title: 'Department Recommendation',
            subtitle: timeStr || 'Approved',
            description: remarks || 'Application was reviewed and forwarded to HR.',
            icon: 'check_circle',
            color: 'positive',
            actor: actorName || app.applicantAdmin?.full_name || 'Department Admin',
          })
        }
      } else if (action === 'HR_RECEIVED') {
        if (isPostApprovalPhase || remarks.toLowerCase().includes('cancellation')) {
          entries.push({
            title: 'Cancellation Form Received by HR',
            subtitle: timeStr || 'Received',
            description: remarks || 'Received leave cancellation request form.',
            icon: 'inventory_2',
            color: 'teal-6',
            actor: actorName || 'HR Admin',
          })
        } else {
          entries.push({
            title: 'Application Received by HR',
            subtitle: timeStr || 'Received',
            description: remarks || 'Received hard copy leave application form.',
            icon: 'inventory_2',
            color: 'teal-6',
            actor: actorName || 'HR Admin',
          })
        }
      } else if (action === 'HR_APPROVED') {
        if (isPostApprovalPhase || remarks.toLowerCase().includes('cancel')) {
          entries.push({
            title: 'Leave Cancellation Approved by HR',
            subtitle: timeStr || 'Approved',
            description: remarks || 'Cancelled via approved leave cancellation request.',
            icon: 'verified',
            color: 'deep-purple',
            actor: actorName || 'HR Admin',
          })
        } else {
          isPostApprovalPhase = true
          entries.push({
            title: 'CHRMO Certification / HR Approval',
            subtitle: timeStr || 'Approved',
            description: remarks || 'HR certified and approved the leave application.',
            icon: 'verified',
            color: 'positive',
            actor: actorName || 'HR Admin',
          })
        }
      } else if (action === 'EMPLOYEE_CANCELLED') {
        entries.push({
          title: 'Cancelled by Employee',
          subtitle: timeStr || 'Cancelled',
          description: remarks || 'Application was cancelled by the employee while pending review.',
          icon: 'cancel',
          color: 'negative',
          actor: actorName || employeeName,
        })
      } else if (action === 'ADMIN_CANCELLED') {
        entries.push({
          title: 'Cancelled by Department Admin',
          subtitle: timeStr || 'Cancelled',
          description: remarks || 'Application was cancelled by Department Admin.',
          icon: 'cancel',
          color: 'negative',
          actor: actorName || app.applicantAdmin?.full_name || 'Department Admin',
        })
      } else if (action === 'ADMIN_REJECTED') {
        entries.push({
          title: 'Department Recommendation Rejected',
          subtitle: timeStr || 'Rejected',
          description: remarks || 'Application rejected by Department Admin.',
          icon: 'cancel',
          color: 'negative',
          actor: actorName || app.applicantAdmin?.full_name || 'Department Admin',
        })
      } else if (action === 'HR_REJECTED') {
        entries.push({
          title: 'Rejected by HR',
          subtitle: timeStr || 'Rejected',
          description: remarks || 'Application rejected by HR.',
          icon: 'cancel',
          color: 'negative',
          actor: actorName || 'HR Admin',
        })
      } else if (action === 'CMO_CBMO_REVIEWED') {
        entries.push({
          title: 'Reviewed by CMO / CBMO',
          subtitle: timeStr || 'Reviewed',
          description: remarks || 'Reviewed by CMO / CBMO.',
          icon: 'rate_review',
          color: 'blue-7',
          actor: actorName || 'HR Admin',
        })
      } else if (action === 'HR_RELEASED') {
        entries.push({
          title: 'Released by HR',
          subtitle: timeStr || 'Released',
          description: remarks || 'Application documents released by HR.',
          icon: 'outbox',
          color: 'indigo-6',
          actor: actorName || 'HR Admin',
        })
      } else {
        const formattedTitle = action
          .toLowerCase()
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        entries.push({
          title: formattedTitle,
          subtitle: timeStr || '',
          description: remarks || '',
          icon: 'history',
          color: 'grey-7',
          actor: actorName || (log.performed_by_type === 'HR' ? 'HR Admin' : log.performed_by_type === 'ADMIN' ? 'Department Admin' : employeeName),
        })
      }
    }
  } else {
    entries.push({
      title: 'Application Filed',
      subtitle: formatDateTime(app.created_at || app.filed_at) || 'Filed',
      description: `${employeeName} submitted this leave application.`,
      icon: 'check_circle',
      color: 'positive',
      actor: employeeName,
    })

    if (app.cancellation_type === 'APPROVED_CANCELLATION') {
      entries.push({
        title: 'Department Recommendation',
        subtitle: 'Completed',
        description: 'Application was approved by department admin.',
        icon: 'check_circle',
        color: 'positive',
        actor: 'Department Admin',
      })
      entries.push({
        title: 'CHRMO Certification / HR Approval',
        subtitle: 'Completed',
        description: 'Leave application was certified and approved by HR.',
        icon: 'verified',
        color: 'positive',
        actor: 'HR Admin',
      })
      entries.push({
        title: 'Leave Cancellation Requested',
        subtitle: 'Submitted',
        description: app.cancellation_reason || 'Cancellation request submitted by employee.',
        icon: 'event_busy',
        color: 'warning',
        actor: employeeName,
      })
      entries.push({
        title: 'Leave Cancellation Approved',
        subtitle: formatDateTime(app.cancellation_date || app.updated_at) || 'Approved',
        description: app.cancellation_reason || app.remarks || 'Cancelled via approved leave cancellation request.',
        icon: 'verified',
        color: 'deep-purple',
        actor: app.cancellation_actor || 'HR Admin',
      })
    } else {
      entries.push({
        title: 'Cancelled by Employee',
        subtitle: formatDateTime(app.cancellation_date || app.updated_at) || 'Cancelled',
        description: app.cancellation_reason || app.remarks || 'Application was cancelled by the employee while pending review.',
        icon: 'cancel',
        color: 'negative',
        actor: employeeName,
      })
    }
  }

  const lastLog = sortedLogs[sortedLogs.length - 1]
  const closedTime = formatDateTime(app.cancellation_date || lastLog?.created_at || app.updated_at)
  entries.push({
    title: 'Application Closed',
    subtitle: closedTime || 'Closed',
    description: 'Status: CANCELLED. Application workflow is complete.',
    icon: 'task_alt',
    color: 'positive',
    actor: 'System',
  })

  return entries
}

async function fetchDepartments() {
  try {
    const res = await api.get('/departments')
    const list = Array.isArray(res.data) ? res.data : res.data.departments || []
    departmentOptions.value = list.map((dept) => ({
      label: dept.name,
      value: dept.name,
    }))
  } catch {
    // Graceful fallback
  }
}

async function fetchApplications() {
  loading.value = true
  try {
    const params = {
      tab: activeTab.value,
      search: search.value || undefined,
      department: selectedDepartment.value || undefined,
      page: pagination.value.page,
      per_page: pagination.value.rowsPerPage,
    }

    const { data } = await api.get('/hr/cancelled-applications', { params })

    applications.value = data.applications || []
    if (data.counts) {
      counts.value = data.counts
    }
    if (data.pagination) {
      pagination.value.rowsNumber = data.pagination.total
      pagination.value.page = data.pagination.current_page
      pagination.value.rowsPerPage = data.pagination.per_page
    }
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to load cancelled applications. Please try again.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  pagination.value.page = 1
  fetchApplications()
}

function resetFilters() {
  search.value = ''
  selectedDepartment.value = null
  activeTab.value = 'ALL'
  pagination.value.page = 1
  fetchApplications()
}

function onRequest(props) {
  pagination.value.page = props.pagination.page
  pagination.value.rowsPerPage = props.pagination.rowsPerPage
  fetchApplications()
}

async function openTimeline(app) {
  selectedApp.value = app
  timelineLoading.value = true
  showTimelineDialog.value = true

  try {
    const { data } = await api.get(`/hr/leave-applications/${app.id}`)
    if (data?.application) {
      selectedApp.value = {
        ...app,
        ...data.application,
        logs: (Array.isArray(data.application.logs) && data.application.logs.length > 0)
          ? data.application.logs
          : (Array.isArray(app.logs) ? app.logs : []),
      }
    }
  } catch {
    // Retain row payload
  } finally {
    timelineLoading.value = false
  }
}

onMounted(() => {
  fetchDepartments()
  fetchApplications()
})
</script>

<style scoped>
.cancelled-applications-page {
  background-color: #f8fafc;
  min-height: calc(100vh - 60px);
}

.cancelled-applications-page :deep(.q-table tbody tr) {
  cursor: pointer;
}

.border-deep-purple {
  border: 1px solid #d8b4fe;
}

.border-amber {
  border: 1px solid #fde68a;
}

.reason-cell {
  max-width: 260px;
}
</style>
