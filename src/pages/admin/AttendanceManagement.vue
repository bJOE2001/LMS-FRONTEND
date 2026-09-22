<template>
  <q-page class="q-pa-md attendance-overview-page">
    <!-- 4 Summary Stat Cards matching Screenshot 1 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Total Employee -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="stat-box">
          <div class="row items-center justify-between no-wrap">
            <span class="stat-box-title">Total Employee</span>
            <q-icon name="groups" size="22px" class="stat-icon-green" />
          </div>
          <div class="stat-box-number">
            {{ stats.total }}
          </div>
        </div>
      </div>

      <!-- Present Today -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="stat-box">
          <div class="row items-center justify-between no-wrap">
            <span class="stat-box-title">Present Today</span>
            <q-icon name="check_circle" size="20px" class="stat-icon-green" />
          </div>
          <div class="stat-box-number">
            {{ stats.present }}
          </div>
        </div>
      </div>

      <!-- Late Today -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="stat-box">
          <div class="row items-center justify-between no-wrap">
            <span class="stat-box-title">Late Today</span>
            <q-icon name="schedule" size="20px" class="stat-icon-yellow" />
          </div>
          <div class="stat-box-number">
            {{ stats.late }}
          </div>
        </div>
      </div>

      <!-- On Leave -->
      <div class="col-12 col-sm-6 col-md-3">
        <div class="stat-box">
          <div class="row items-center justify-between no-wrap">
            <span class="stat-box-title">On Leave</span>
            <q-icon name="event" size="20px" class="stat-icon-blue" />
          </div>
          <div class="stat-box-number">
            {{ stats.on_leave }}
          </div>
        </div>
      </div>
    </div>

    <!-- Attendance Records Main Container matching Screenshot 1 -->
    <div class="records-container bg-white q-pa-md rounded-borders">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h6 text-weight-bold text-dark">
          Attendance Records
        </div>

        <!-- Subtle Date Selector (default today, allow picking another day) -->
        <div class="row items-center q-gutter-x-xs">
          <q-btn
            flat
            dense
            round
            icon="chevron_left"
            size="sm"
            color="grey-7"
            @click="changeDate(-1)"
          >
            <q-tooltip>Previous Day</q-tooltip>
          </q-btn>
          <q-input
            v-model="selectedDate"
            dense
            outlined
            mask="####-##-##"
            style="width: 140px;"
            class="compact-date-input"
            @update:model-value="fetchAttendanceOverview"
          >
            <template #append>
              <q-icon name="event" size="18px" class="cursor-pointer text-grey-7">
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
              </q-icon>
            </template>
          </q-input>
          <q-btn
            flat
            dense
            round
            icon="chevron_right"
            size="sm"
            color="grey-7"
            @click="changeDate(1)"
          >
            <q-tooltip>Next Day</q-tooltip>
          </q-btn>
          <q-btn
            v-if="selectedDate !== todayStr"
            flat
            no-caps
            dense
            color="primary"
            label="Today"
            size="sm"
            @click="setToday"
          />
        </div>
      </div>

      <!-- Search Input -->
      <div class="q-mb-md">
        <q-input
          v-model="searchTerm"
          outlined
          dense
          placeholder="Search Employee"
          class="search-employee-input"
          @update:model-value="onSearchInput"
        />
      </div>

      <!-- 4-Column Table -->
      <q-table
        :rows="employeeRows"
        :columns="columns"
        row-key="control_no"
        flat
        :loading="loading"
        :rows-per-page-options="[5, 10, 20, 50]"
        v-model:pagination="pagination"
        class="attendance-table"
      >
        <!-- Employee Column: Bold name on top, control number in grey below -->
        <template #body-cell-employee="props">
          <q-td :props="props" class="text-left">
            <div class="text-weight-bold text-dark employee-name-text">
              {{ props.row.employee_name }}
            </div>
            <div class="text-caption text-grey-6 font-mono">
              {{ props.row.control_no }}
            </div>
          </q-td>
        </template>

        <!-- Position Column: Designation -->
        <template #body-cell-position="props">
          <q-td :props="props" class="text-left">
            <div class="text-dark position-text">
              {{ props.row.designation || 'Staff' }}
            </div>
          </q-td>
        </template>

        <!-- Attendance Status Column: Solid pill badge -->
        <template #body-cell-attendance_status="props">
          <q-td :props="props" class="text-left">
            <span class="status-pill" :class="getStatusClass(props.row.attendance_status)">
              {{ props.row.attendance_status || 'Absent' }}
            </span>
          </q-td>
        </template>

        <!-- Action Column: Green Eye icon and Green Clock-with-pen icon -->
        <template #body-cell-action="props">
          <q-td :props="props" class="text-left">
            <div class="row items-center no-wrap q-gutter-x-sm">
              <!-- View Employee Details (Eye) -->
              <q-btn
                flat
                round
                dense
                size="sm"
                class="action-btn-green"
                icon="visibility"
                @click="openEmployeeRecord(props.row)"
              >
                <q-tooltip>Attendance Details</q-tooltip>
              </q-btn>

              <!-- Override Time (Clock with pen) -->
              <q-btn
                flat
                round
                dense
                size="sm"
                class="action-btn-green"
                icon="edit_calendar"
                @click="openOverrideDialog(props.row)"
              >
                <q-tooltip>Override Time</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <!-- Empty State -->
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="person_off" size="40px" color="grey-4" />
            <div class="text-subtitle2 q-mt-sm">No employee attendance records found.</div>
          </div>
        </template>
      </q-table>
    </div>

    <!-- Override Time Dialog (Screenshot 3) -->
    <DtrOverrideDialog
      v-model="showOverrideDialog"
      :control-no="activeOverrideEmployee?.control_no"
      :employee-name="activeOverrideEmployee?.employee_name"
      :date="selectedDate"
      :dtr="activeOverrideEmployee?.dtr"
      @saved="onOverrideSaved"
    />
  </q-page>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import DtrOverrideDialog from 'src/components/admin/DtrOverrideDialog.vue'

const router = useRouter()
const $q = useQuasar()

const loading = ref(false)
const todayStr = new Date().toISOString().split('T')[0]
const selectedDate = ref(todayStr)
const searchTerm = ref('')

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
  rowsPerPage: 5, // Records per page: 5 matching Screenshot 1
  sortBy: 'employee_name',
  descending: false,
})

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'designation', align: 'left', sortable: true },
  { name: 'attendance_status', label: 'Attendance Status', field: 'attendance_status', align: 'left', sortable: true },
  { name: 'action', label: 'Action', align: 'left' },
]

// Override Dialog State
const showOverrideDialog = ref(false)
const activeOverrideEmployee = ref(null)

function getStatusClass(status) {
  const norm = String(status || '').toLowerCase().trim()
  if (norm === 'on time') return 'status-on-time'
  if (norm === 'late') return 'status-late'
  if (norm === 'on leave') return 'status-on-leave'
  if (norm === 'half day') return 'status-half-day'
  if (norm === 'rest day') return 'status-rest-day'
  if (norm === 'absent') return 'status-absent'
  return 'status-absent'
}

function changeDate(deltaDays) {
  const d = new Date(selectedDate.value + 'T00:00:00')
  d.setDate(d.getDate() + deltaDays)
  selectedDate.value = d.toISOString().split('T')[0]
  fetchAttendanceOverview()
}

function setToday() {
  selectedDate.value = todayStr
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
 * Open Employee Details View (Screenshot 2)
 */
function openEmployeeRecord(employee) {
  router.push({
    name: 'admin-attendance-record',
    params: { employeeId: employee.control_no },
  })
}

/**
 * Open Override Dialog (Screenshot 3)
 */
function openOverrideDialog(employee) {
  activeOverrideEmployee.value = employee
  showOverrideDialog.value = true
}

function onOverrideSaved() {
  fetchAttendanceOverview()
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

/* 4 Summary Stat Boxes matching Screenshot 1 */
.stat-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 14px 18px;
  min-height: 86px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.stat-box-title {
  font-size: 0.82rem;
  font-weight: 500;
  color: #475569;
}

.stat-box-number {
  font-size: 1.85rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  margin-top: 4px;
}

.stat-icon-green {
  color: #2e7d32 !important;
}

.stat-icon-yellow {
  color: #fbc02d !important;
}

.stat-icon-blue {
  color: #1976d2 !important;
}

/* Records Container */
.records-container {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.compact-date-input :deep(.q-field__control) {
  height: 32px;
  font-size: 0.82rem;
}

.search-employee-input {
  max-width: 360px;
}

.search-employee-input :deep(.q-field__control) {
  height: 38px;
  border-radius: 4px;
}

/* 4-Column Table */
.attendance-table {
  background: #ffffff;
}

.attendance-table :deep(th) {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.9rem;
  border-bottom: 1.5px solid #e2e8f0;
  padding-top: 12px;
  padding-bottom: 12px;
}

.attendance-table :deep(td) {
  font-size: 0.88rem;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  padding-top: 10px;
  padding-bottom: 10px;
}

.employee-name-text {
  font-size: 0.92rem;
}

.position-text {
  font-size: 0.88rem;
}

.font-mono {
  font-family: monospace;
  font-size: 0.78rem;
}

/* Pill Badges */
.status-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  text-align: center;
  text-transform: capitalize;
  letter-spacing: 0.2px;
}

.status-on-time {
  background-color: #388e3c;
  color: #ffffff;
}

.status-late {
  background-color: #f57c00;
  color: #ffffff;
}

.status-absent {
  background-color: #d32f2f;
  color: #ffffff;
}

.status-on-leave {
  background-color: #1976d2;
  color: #ffffff;
}

.status-half-day {
  background-color: #ff9800;
  color: #ffffff;
}

.status-rest-day {
  background-color: #757575;
  color: #ffffff;
}

/* Action Buttons */
.action-btn-green {
  color: #2e7d32 !important;
}
</style>
