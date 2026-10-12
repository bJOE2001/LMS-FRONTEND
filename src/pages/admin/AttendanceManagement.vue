<template>
  <q-page class="q-pa-md attendance-overview-page">
    <!-- Top Executive Header -->
    <div class="q-mb-md executive-header">
      <div class="row items-center q-gutter-x-sm">
        <q-avatar size="36px" color="green-1" text-color="green-9" class="header-icon-avatar">
          <q-icon name="co_present" size="22px" />
        </q-avatar>
        <div>
          <h1 class="text-h5 text-weight-bolder text-dark q-my-none page-title">
            Attendance Management
          </h1>
        </div>
      </div>
    </div>

    <!-- Indeterminate Top Progress Bar for Background Reloads -->
    <q-linear-progress
      v-if="loading && employeeRows.length > 0"
      indeterminate
      color="green-9"
      size="3px"
      class="q-mb-md rounded-borders top-reload-bar"
    />

    <!-- ========================================================= -->
    <!-- SKELETON LOADING STATE (Initial Page Load)               -->
    <!-- ========================================================= -->
    <div v-if="loading && employeeRows.length === 0" class="skeleton-suite">
      <!-- 5 Skeleton KPI Stat Cards -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div v-for="i in 5" :key="'sk-stat-' + i" class="col-12 col-sm-6 col-md">
          <q-card flat bordered class="rounded-borders bg-white stat-kpi-card">
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <q-skeleton type="text" width="80px" height="16px" animation="wave" />
                <q-skeleton type="QAvatar" size="32px" animation="wave" />
              </div>
              <div class="q-mt-xs">
                <q-skeleton type="text" width="45px" height="34px" animation="wave" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Skeleton Main Table Card -->
      <q-card flat bordered class="rounded-borders bg-white table-card">
        <q-card-section class="q-pa-md row items-center justify-end q-gutter-sm border-bottom">
          <q-skeleton type="rect" width="160px" height="34px" class="rounded-borders" animation="wave" />
          <q-skeleton type="rect" width="220px" height="34px" class="rounded-borders" animation="wave" />
          <q-skeleton type="rect" width="160px" height="34px" class="rounded-borders" animation="wave" />
        </q-card-section>

        <!-- Skeleton Table Body -->
        <div class="q-pa-md">
          <!-- Columns Header Placeholder -->
          <div class="row items-center q-pb-sm border-bottom q-col-gutter-sm text-grey-5">
            <div class="col-3"><q-skeleton type="text" width="50%" height="16px" animation="wave" /></div>
            <div class="col-2"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="70%" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="60%" height="16px" animation="wave" /></div>
            <div class="col-1 text-center"><q-skeleton type="text" width="80%" height="16px" animation="wave" /></div>
            <div class="col-1 text-right"><q-skeleton type="text" width="60%" height="16px" class="q-ml-auto" animation="wave" /></div>
          </div>

          <!-- 8 Skeleton Rows -->
          <div
            v-for="r in 8"
            :key="'sk-row-' + r"
            class="row items-center q-py-md border-bottom q-col-gutter-sm"
            :class="{ 'bg-grey-1': r % 2 === 0 }"
          >
            <div class="col-3">
              <div class="row items-center no-wrap q-gutter-x-sm">
                <q-skeleton type="QAvatar" size="36px" animation="wave" />
                <div>
                  <q-skeleton type="text" width="130px" height="18px" animation="wave" />
                  <q-skeleton type="text" width="75px" height="14px" class="q-mt-xs" animation="wave" />
                </div>
              </div>
            </div>
            <div class="col-2"><q-skeleton type="text" width="100px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="text" width="55px" height="16px" animation="wave" /></div>
            <div class="col-1"><q-skeleton type="rect" width="48px" height="20px" class="rounded-borders" animation="wave" /></div>
            <div class="col-1 text-center"><q-skeleton type="rect" width="65px" height="22px" class="rounded-borders" animation="wave" /></div>
            <div class="col-1 text-right">
              <div class="row items-center justify-end">
                <q-skeleton type="QAvatar" size="26px" animation="wave" />
              </div>
            </div>
          </div>
        </div>

        <!-- Skeleton Footer -->
        <div class="q-pa-sm row items-center justify-between bg-grey-1 border-top">
          <q-skeleton type="text" width="120px" height="16px" animation="wave" />
          <q-skeleton type="rect" width="160px" height="30px" class="rounded-borders" animation="wave" />
        </div>
      </q-card>
    </div>

    <!-- ========================================================= -->
    <!-- REAL CONTENT SUITE                                        -->
    <!-- ========================================================= -->
    <div v-else :class="{ 'content-reloading': loading && employeeRows.length > 0 }">
      <!-- 5 Summary KPI Stat Cards -->
      <div class="row q-col-gutter-sm q-mb-md">
        <!-- Total Roster -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Total Personnel</span>
                <div class="stat-icon-wrap bg-blue-1 text-blue-9">
                  <q-icon name="groups" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-dark q-mt-xs">{{ stats.total }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Present Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Present</span>
                <div class="stat-icon-wrap bg-green-1 text-green-9">
                  <q-icon name="check_circle" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-positive q-mt-xs">{{ stats.present }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Late Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Tardy / Late</span>
                <div class="stat-icon-wrap bg-amber-1 text-amber-9">
                  <q-icon name="history_toggle_off" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-amber-9 q-mt-xs">{{ stats.late }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- On Leave Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">On Leave</span>
                <div class="stat-icon-wrap bg-indigo-1 text-indigo-9">
                  <q-icon name="beach_access" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-indigo-9 q-mt-xs">{{ stats.on_leave }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Absent Today -->
        <div class="col-12 col-sm-6 col-md">
          <q-card
            flat
            bordered
            class="rounded-borders bg-white stat-kpi-card"
          >
            <q-card-section class="q-pa-md">
              <div class="row items-center justify-between no-wrap q-mb-xs">
                <span class="stat-kpi-label">Absent</span>
                <div class="stat-icon-wrap bg-red-1 text-red-9">
                  <q-icon name="event_busy" size="20px" />
                </div>
              </div>
              <div class="stat-kpi-value text-negative q-mt-xs">{{ stats.absent }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Main Attendance Management Card -->
      <q-card flat bordered class="rounded-borders bg-white table-card shadow-1">
        <!-- Toolbar Section: Filter Dropdown + Search + Date Navigator -->
        <q-card-section class="q-pa-sm q-px-md border-bottom">
          <div class="row items-center justify-end q-gutter-sm">
            <!-- Filter Dropdown -->
            <q-select
              v-model="activeFilter"
              :options="filterOptions"
              emit-value
              map-options
              outlined
              dense
              options-dense
              class="filter-select"
            >
              <template #prepend>
                <q-icon name="filter_list" size="18px" color="grey-6" />
              </template>
            </q-select>

            <!-- Search Input -->
            <q-input
              v-model="searchTerm"
              outlined
              dense
              placeholder="Search name, position, ID..."
              class="search-employee-input"
              clearable
              @update:model-value="onSearchInput"
            >
              <template #prepend>
                <q-icon name="search" size="18px" color="grey-6" />
              </template>
            </q-input>

            <!-- Date Navigator Pill -->
            <div class="row items-center no-wrap bg-grey-1 rounded-borders q-pa-xs border-light date-nav-box">
              <q-btn
                flat
                dense
                round
                icon="chevron_left"
                size="sm"
                color="grey-7"
                @click="changeDate(-1)"
              >
                <q-tooltip class="bg-dark">Previous Day</q-tooltip>
              </q-btn>

              <div class="row items-center no-wrap cursor-pointer q-px-sm date-display-trigger">
                <span class="text-caption text-weight-bold font-mono text-dark date-nav-text">
                  {{ selectedDate }}
                </span>
                <q-icon name="calendar_month" size="16px" color="grey-7" class="q-ml-xs" />

                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="selectedDate"
                    mask="YYYY-MM-DD"
                    @update:model-value="fetchAttendanceOverview"
                  >
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </div>

              <q-btn
                flat
                dense
                round
                icon="chevron_right"
                size="sm"
                color="grey-7"
                @click="changeDate(1)"
              >
                <q-tooltip class="bg-dark">Next Day</q-tooltip>
              </q-btn>
            </div>
          </div>
        </q-card-section>

        <!-- Attendance Data Table with Detailed Punch Sessions -->
        <q-table
          :rows="filteredEmployeeRows"
          :columns="columns"
          row-key="control_no"
          flat
          :loading="loading"
          :rows-per-page-options="[10, 20, 50, 100]"
          v-model:pagination="pagination"
          class="attendance-pro-table"
        >
          <!-- Employee Column: Avatar initials + Full Name + Control No -->
          <template #body-cell-employee="props">
            <q-td :props="props" class="text-left">
              <div class="row items-center no-wrap">
                <q-avatar size="38px" color="green-1" text-color="green-9" class="q-mr-sm text-weight-bold employee-row-avatar">
                  {{ getInitials(props.row.employee_name) }}
                </q-avatar>
                <div>
                  <div class="text-weight-bold text-dark employee-name-text">
                    {{ props.row.employee_name }}
                  </div>
                  <div class="text-caption text-grey-6 font-mono q-mt-xs">
                    ID: {{ props.row.control_no }}
                  </div>
                </div>
              </div>
            </q-td>
          </template>

          <!-- Designation / Position Column -->
          <template #body-cell-designation="props">
            <q-td :props="props" class="text-left">
              <div class="text-weight-medium text-dark position-text ellipsis cursor-pointer" style="max-width: 180px;">
                {{ props.row.designation || 'Staff Member' }}
                <q-tooltip class="bg-dark text-caption" anchor="top middle" self="bottom middle" :offset="[0, 6]">
                  {{ props.row.designation || 'Staff Member' }}
                </q-tooltip>
              </div>
            </q-td>
          </template>

          <!-- AM In (Morning Arrival) -->
          <template #body-cell-am_in="props">
            <q-td :props="props" class="text-center font-mono">
              <div v-if="props.row.dtr?.am_arrival" class="row items-center justify-center no-wrap q-gutter-x-xs">
                <span :class="isRowLate(props.row) ? 'text-negative text-weight-bold' : 'text-dark text-weight-medium'">
                  {{ formatPunchTime(props.row.dtr.am_arrival) }}
                </span>
                <q-badge
                  v-if="isRowLate(props.row)"
                  color="red-1"
                  text-color="red-9"
                  class="q-px-xs font-mono text-weight-bold"
                  size="xs"
                >
                  +{{ props.row.dtr.late_minutes }}m
                </q-badge>
              </div>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- AM Out (Lunch Out) -->
          <template #body-cell-am_out="props">
            <q-td :props="props" class="text-center font-mono">
              <span v-if="props.row.dtr?.am_departure" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.am_departure) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- PM In (Lunch In) -->
          <template #body-cell-pm_in="props">
            <q-td :props="props" class="text-center font-mono">
              <span v-if="props.row.dtr?.pm_arrival" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.pm_arrival) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- PM Out (Afternoon Departure) -->
          <template #body-cell-pm_out="props">
            <q-td :props="props" class="text-center font-mono">
              <span v-if="props.row.dtr?.pm_departure" class="text-dark text-weight-medium">
                {{ formatPunchTime(props.row.dtr.pm_departure) }}
              </span>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- Rendered Hours -->
          <template #body-cell-hours="props">
            <q-td :props="props" class="text-center font-mono">
              <q-badge
                v-if="Number(props.row.dtr?.rendered_hours || 0) > 0"
                color="teal-1"
                text-color="teal-9"
                class="q-px-sm q-py-xs text-weight-bold"
              >
                {{ Number(props.row.dtr.rendered_hours).toFixed(1) }} hrs
              </q-badge>
              <span v-else class="text-grey-4">—</span>
            </q-td>
          </template>

          <!-- Attendance Status Badge -->
          <template #body-cell-status="props">
            <q-td :props="props" class="text-center">
              <div class="row items-center justify-center no-wrap q-gutter-x-xs">
                <q-chip
                  dense
                  class="text-weight-bold text-caption q-my-none status-badge"
                  :color="getStatusBadgeColor(props.row.attendance_status)"
                  :text-color="getStatusBadgeTextColor(props.row.attendance_status)"
                >
                  <q-icon :name="getStatusIcon(props.row.attendance_status)" size="14px" class="q-mr-xs" />
                  {{ props.row.attendance_status || 'Absent' }}
                </q-chip>

                <!-- Adjusted indicator -->
                <q-badge
                  v-if="props.row.dtr?.is_adjusted"
                  color="purple-1"
                  text-color="purple-9"
                  class="q-ml-xs text-caption font-mono"
                  label="Adj"
                >
                  <q-tooltip class="bg-dark">Adjusted: {{ props.row.dtr.adjustment_reason || 'Manual override' }}</q-tooltip>
                </q-badge>
              </div>
            </q-td>
          </template>

          <!-- Action Column -->
          <template #body-cell-action="props">
            <q-td :props="props" class="text-right">
              <div class="row items-center justify-end no-wrap">
                <!-- View Monthly DTR Details -->
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  color="green-9"
                  icon="visibility"
                  class="action-icon-btn"
                  @click="openEmployeeRecord(props.row)"
                >
                  <q-tooltip class="bg-dark">View Attendance Details</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>

          <!-- Empty State -->
          <template #no-data>
            <div class="full-width text-center q-py-xl text-grey-6">
              <q-icon name="person_off" size="48px" color="grey-4" />
              <div class="text-subtitle1 text-weight-bold q-mt-sm">No Attendance Records Found</div>
              <div class="text-caption">
                No personnel attendance records match your filter criteria for {{ formatFullDate(selectedDate) }}.
              </div>
            </div>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

const router = useRouter()
const $q = useQuasar()

function getLocalTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const loading = ref(false)
const todayStr = getLocalTodayStr()
const selectedDate = ref(todayStr)
const searchTerm = ref('')
const activeFilter = ref('ALL') // 'ALL', 'PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE'

const stats = reactive({
  total: 0,
  present: 0,
  late: 0,
  on_leave: 0,
  absent: 0,
})

const employeeRows = ref([])

const pagination = ref({
  page: 1,
  rowsPerPage: 15,
  sortBy: 'employee_name',
  descending: false,
})

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'designation', label: 'Position', field: 'designation', align: 'left', sortable: true },
  { name: 'am_in', label: 'AM In', align: 'center' },
  { name: 'am_out', label: 'AM Out', align: 'center' },
  { name: 'pm_in', label: 'PM In', align: 'center' },
  { name: 'pm_out', label: 'PM Out', align: 'center' },
  { name: 'hours', label: 'Hours', align: 'center' },
  { name: 'status', label: 'Status', field: 'attendance_status', align: 'center', sortable: true },
  { name: 'action', label: 'Actions', align: 'right' },
]

const filterOptions = computed(() => [
  { label: `All (${stats.total})`, value: 'ALL' },
  { label: `Present (${stats.present})`, value: 'PRESENT' },
  { label: `Late (${stats.late})`, value: 'LATE' },
  { label: `Absent (${stats.absent})`, value: 'ABSENT' },
  { label: `On Leave (${stats.on_leave})`, value: 'ON_LEAVE' },
])

/**
 * Filtered rows based on active segmented filter
 */
const filteredEmployeeRows = computed(() => {
  if (activeFilter.value === 'ALL') return employeeRows.value

  return employeeRows.value.filter((row) => {
    const status = String(row.attendance_status || '').toLowerCase().trim()
    if (activeFilter.value === 'PRESENT') {
      return status === 'on time' || status === 'present' || status === 'late'
    }
    if (activeFilter.value === 'LATE') {
      return status === 'late'
    }
    if (activeFilter.value === 'ABSENT') {
      return status === 'absent'
    }
    if (activeFilter.value === 'ON_LEAVE') {
      return status === 'on leave' || status === 'half day'
    }
    return true
  })
})

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatFullDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPunchTime(timeStr) {
  if (!timeStr || String(timeStr).trim() === '') return '—'
  const parts = String(timeStr).split(':')
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10)
    const m = parts[1]
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    h = h ? h : 12
    return `${h}:${m} ${ampm}`
  }
  return timeStr
}

function isRowLate(row) {
  return Number(row.dtr?.late_minutes || 0) > 0
}

function getStatusBadgeColor(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'green-1'
  if (norm === 'late') return 'amber-1'
  if (norm === 'absent') return 'red-1'
  if (norm === 'on leave') return 'blue-1'
  if (norm === 'half day') return 'orange-1'
  if (norm === 'rest day') return 'grey-2'
  return 'red-1'
}

function getStatusBadgeTextColor(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'green-9'
  if (norm === 'late') return 'amber-9'
  if (norm === 'absent') return 'red-9'
  if (norm === 'on leave') return 'blue-9'
  if (norm === 'half day') return 'orange-9'
  if (norm === 'rest day') return 'grey-8'
  return 'red-9'
}

function getStatusIcon(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time' || norm === 'present') return 'check_circle'
  if (norm === 'late') return 'schedule'
  if (norm === 'absent') return 'cancel'
  if (norm === 'on leave') return 'beach_access'
  if (norm === 'half day') return 'timelapse'
  return 'help_outline'
}

function changeDate(deltaDays) {
  if (!selectedDate.value) {
    selectedDate.value = getLocalTodayStr()
  }
  const parts = selectedDate.value.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2] + deltaDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  selectedDate.value = `${y}-${m}-${day}`
  fetchAttendanceOverview()
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchAttendanceOverview()
  }, 300)
}

/**
 * Fetch Department Attendance Overview
 */
async function fetchAttendanceOverview() {
  loading.value = true
  try {
    const params = {
      date: selectedDate.value,
    }
    if (searchTerm.value) {
      params.search = searchTerm.value
    }

    const response = await api.get('/attendance/dtr', { params })
    const data = response.data

    employeeRows.value = data.employees || []
    stats.total = data.stats?.total || 0
    stats.present = data.stats?.present || 0
    stats.late = data.stats?.late || 0
    stats.on_leave = data.stats?.on_leave || 0
    stats.absent = data.stats?.absent || 0
  } catch (err) {
    console.error('Failed to fetch attendance overview:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load attendance records.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

/**
 * Open Employee Details View
 */
function openEmployeeRecord(employee) {
  router.push({
    name: 'admin-attendance-record',
    params: { employeeId: employee.control_no },
  })
}

onMounted(() => {
  fetchAttendanceOverview()
})
</script>

<style scoped>
.attendance-overview-page {
  max-width: 1400px;
  margin: 0 auto;
}

.executive-header {
  padding-bottom: 4px;
}

.header-icon-avatar {
  border-radius: 8px;
}

.page-title {
  letter-spacing: -0.02em;
}

.top-reload-bar {
  box-shadow: 0 1px 4px rgba(46, 125, 50, 0.25);
}

.content-reloading {
  opacity: 0.55;
  pointer-events: none;
  transition: opacity 0.25s ease-in-out;
}

.skeleton-suite {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* KPI Cards */
.stat-kpi-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.stat-kpi-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.stat-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-kpi-value {
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.2;
  font-family: inherit;
}

/* Main Table Card */
.table-card {
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.border-top {
  border-top: 1px solid #f1f5f9;
}

.filter-select {
  min-width: 170px;
}

.filter-select :deep(.q-field__control) {
  height: 34px;
  border-radius: 6px;
}

.search-employee-input {
  min-width: 220px;
}

.search-employee-input :deep(.q-field__control) {
  height: 34px;
  border-radius: 6px;
}

.date-nav-box {
  border: 1px solid #e2e8f0;
  height: 34px;
}

.date-display-trigger {
  height: 26px;
  line-height: 26px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  user-select: none;
}

.date-display-trigger:hover {
  background-color: #e2e8f0;
}

.date-nav-text {
  font-size: 0.85rem;
  letter-spacing: -0.01em;
}

/* Table Styling */
.attendance-pro-table :deep(thead tr th) {
  background-color: #f8fafc;
  color: #334155;
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 14px;
  border-bottom: 1.5px solid #e2e8f0;
}

.attendance-pro-table :deep(tbody tr td) {
  font-size: 0.88rem;
  color: #1e293b;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.attendance-pro-table :deep(tbody tr:hover td) {
  background-color: #f8fafc;
}

.employee-row-avatar {
  border-radius: 8px;
}

.employee-name-text {
  font-size: 0.92rem;
  line-height: 1.25;
}

.position-text {
  font-size: 0.85rem;
}

.status-badge {
  padding: 2px 8px;
}

.action-icon-btn {
  background-color: #f8fafc;
  transition: all 0.2s ease;
}

.action-icon-btn:hover {
  background-color: #e2e8f0;
  transform: scale(1.08);
}
</style>
