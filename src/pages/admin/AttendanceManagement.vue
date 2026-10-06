<template>
  <q-page class="q-pa-md attendance-overview-page">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h4 text-weight-bold q-my-none">Attendance Management</h1>
      </div>
    </div>

    <!-- Summary Stat Cards (Clean 4-Card Grid) -->
    <div class="row q-col-gutter-sm q-mb-md">
      <!-- Total Employees -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="40px" color="blue-1" text-color="blue-9" class="q-mr-md">
                <q-icon name="groups" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7">Total Employees</div>
                <div class="text-h5 text-weight-bold text-dark">{{ stats.total }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Present Today -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="40px" color="green-1" text-color="positive" class="q-mr-md">
                <q-icon name="check_circle" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7">Present Today</div>
                <div class="text-h5 text-weight-bold text-positive">{{ stats.present }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Late Today -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="40px" color="amber-1" text-color="amber-9" class="q-mr-md">
                <q-icon name="schedule" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7">Late Today</div>
                <div class="text-h5 text-weight-bold text-amber-9">{{ stats.late }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- On Leave -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="40px" color="indigo-1" text-color="indigo-9" class="q-mr-md">
                <q-icon name="event" size="22px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7">On Leave</div>
                <div class="text-h5 text-weight-bold text-indigo-9">{{ stats.on_leave }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Attendance Records Main Card -->
    <q-card flat bordered class="rounded-borders bg-white">
      <q-card-section class="q-pb-sm">
        <div class="row items-center justify-between q-col-gutter-sm">
          <div>
            <div class="text-h6 text-weight-bold text-dark">Attendance Records</div>
            <div class="text-caption text-grey-6">Daily logs and attendance status overview</div>
          </div>

          <div class="row items-center q-gutter-sm">
            <!-- Search Input -->
            <q-input
              v-model="searchTerm"
              outlined
              dense
              placeholder="Search employee or ID..."
              class="search-employee-input"
              clearable
              @update:model-value="onSearchInput"
            >
              <template #prepend>
                <q-icon name="search" size="18px" color="grey-6" />
              </template>
            </q-input>

            <!-- Date Selector -->
            <div class="row items-center bg-grey-1 rounded-borders q-px-xs border-light">
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
                borderless
                mask="####-##-##"
                style="width: 100px;"
                class="compact-date-input text-caption text-center"
                @update:model-value="fetchAttendanceOverview"
              >
                <template #append>
                  <q-icon name="event" size="16px" class="cursor-pointer text-grey-7">
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
            </div>

            <q-btn
              v-if="selectedDate !== todayStr"
              outline
              no-caps
              dense
              color="primary"
              label="Today"
              size="sm"
              class="q-px-sm"
              @click="setToday"
            />

            <q-btn
              flat
              round
              dense
              icon="refresh"
              color="grey-7"
              :loading="loading"
              @click="fetchAttendanceOverview"
            >
              <q-tooltip>Refresh</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <!-- 4-Column Table -->
      <q-table
        :rows="employeeRows"
        :columns="columns"
        row-key="control_no"
        flat
        :loading="loading"
        :rows-per-page-options="[10, 20, 50, 100]"
        v-model:pagination="pagination"
        class="attendance-table"
      >
        <!-- Employee Column: Initials avatar + name + control number -->
        <template #body-cell-employee="props">
          <q-td :props="props" class="text-left">
            <div class="row items-center no-wrap">
              <q-avatar size="34px" color="blue-1" text-color="primary" class="q-mr-sm text-weight-bold text-caption">
                {{ getInitials(props.row.employee_name) }}
              </q-avatar>
              <div>
                <div class="text-weight-bold text-dark employee-name-text">
                  {{ props.row.employee_name }}
                </div>
                <div class="text-caption text-grey-6 font-mono">
                  ID: {{ props.row.control_no }}
                </div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Position Column: Designation -->
        <template #body-cell-position="props">
          <q-td :props="props" class="text-left">
            <div class="text-grey-8 position-text">
              {{ props.row.designation || 'Staff' }}
            </div>
          </q-td>
        </template>

        <!-- Attendance Status Column: Soft rounded badge -->
        <template #body-cell-attendance_status="props">
          <q-td :props="props" class="text-center">
            <q-badge
              rounded
              class="text-weight-bold text-caption q-px-sm"
              :color="getStatusBadgeColor(props.row.attendance_status)"
              :text-color="getStatusBadgeTextColor(props.row.attendance_status)"
              :label="props.row.attendance_status || 'Absent'"
            />
          </q-td>
        </template>

        <!-- Action Column: Details & Override Time -->
        <template #body-cell-action="props">
          <q-td :props="props" class="text-center">
            <div class="row items-center justify-center no-wrap q-gutter-x-xs">
              <!-- View Employee Details (Eye) -->
              <q-btn
                flat
                round
                dense
                size="sm"
                color="primary"
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
                color="grey-7"
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
    </q-card>

    <!-- Override Time Dialog -->
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
  rowsPerPage: 10,
  sortBy: 'employee_name',
  descending: false,
})

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'position', label: 'Position', field: 'designation', align: 'left', sortable: true },
  { name: 'attendance_status', label: 'Attendance Status', field: 'attendance_status', align: 'center', sortable: true },
  { name: 'action', label: 'Action', align: 'center' },
]

// Override Dialog State
const showOverrideDialog = ref(false)
const activeOverrideEmployee = ref(null)

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
 * Open Employee Details View
 */
function openEmployeeRecord(employee) {
  router.push({
    name: 'admin-attendance-record',
    params: { employeeId: employee.control_no },
  })
}

/**
 * Open Override Dialog
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

.stat-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.border-light {
  border: 1px solid #e2e8f0;
}

.search-employee-input {
  min-width: 240px;
}

.search-employee-input :deep(.q-field__control) {
  height: 36px;
  border-radius: 6px;
}

.compact-date-input :deep(.q-field__control) {
  height: 32px;
  font-size: 0.85rem;
}

.attendance-table :deep(th) {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.88rem;
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
  font-size: 0.9rem;
  line-height: 1.25;
}

.position-text {
  font-size: 0.88rem;
}

.font-mono {
  font-family: monospace;
  font-size: 0.78rem;
}
</style>
