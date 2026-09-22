<template>
  <q-page class="q-pa-md biometric-registration-page">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h4 text-weight-bold q-my-none">Biometric Registration</h1>
        <div class="text-subtitle2 text-grey-7 q-mt-xs">
          Register new employee profiles onto the HR Biometric Terminal for face and fingerprint enrollment.
        </div>
      </div>

      <div class="row q-gutter-sm items-center q-mt-sm q-mt-md-none">
        <q-btn
          unelevated
          no-caps
          color="positive"
          icon="sync"
          label="Sync from Device Logs"
          :loading="syncingLogs"
          @click="syncFromLogs"
        >
          <q-tooltip>Scan device punch logs and automatically mark all existing enrolled personnel as Registered</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Summary Stat Cards -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="blue-1" text-color="blue-9" class="q-mr-md">
                <q-icon name="people" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">HRIS Employees</div>
                <div class="text-h5 text-weight-bold text-dark">{{ stats.total_employees }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Active personnel directory</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-md-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="green-1" text-color="green-9" class="q-mr-md">
                <q-icon name="verified_user" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">Biometric Registered</div>
                <div class="text-h5 text-weight-bold text-positive">{{ stats.registered }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Ready for office pulling</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-md-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="amber-1" text-color="amber-9" class="q-mr-md">
                <q-icon name="hourglass_top" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">Pending Scan</div>
                <div class="text-h5 text-weight-bold text-amber-9">{{ stats.pending }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Queued to terminal</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-md-3">
        <q-card flat bordered class="rounded-borders bg-white stat-card">
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar size="42px" color="grey-2" text-color="grey-8" class="q-mr-md">
                <q-icon name="person_add" size="24px" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium">Not Registered</div>
                <div class="text-h5 text-weight-bold text-grey-8">{{ stats.not_registered }}</div>
              </div>
            </div>
            <div class="text-caption text-grey-6 q-mt-xs">Awaiting HR biometric push</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters & Table Card -->
    <q-card flat bordered class="rounded-borders">
      <q-card-section class="q-py-sm">
        <div class="row items-center justify-between q-col-gutter-sm">
          <div class="col-12 col-sm-auto">
            <q-select
              v-model="statusFilter"
              :options="statusFilterOptions"
              emit-value
              map-options
              outlined
              dense
              label="Biometric Status"
              style="min-width: 200px"
              @update:model-value="fetchEmployees"
            />
          </div>

          <div class="col-12 col-sm">
            <q-input
              v-model="searchTerm"
              outlined
              dense
              clearable
              placeholder="Search by Employee Name, Control No, or Office..."
              @update:model-value="onSearchInput"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
        </div>
      </q-card-section>

      <q-table
        :rows="employeeRows"
        :columns="columns"
        row-key="control_no"
        flat
        :loading="loading"
        :rows-per-page-options="[15, 30, 50, 100]"
        v-model:pagination="pagination"
        class="biometric-table"
      >
        <!-- Control No Column -->
        <template #body-cell-control_no="props">
          <q-td :props="props" class="text-center">
            <q-badge color="grey-3" text-color="grey-9" class="text-caption font-mono">
              {{ props.row.control_no }}
            </q-badge>
          </q-td>
        </template>

        <!-- Employee Name Column -->
        <template #body-cell-employee="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                {{ getInitials(props.row.full_name) }}
              </q-avatar>
              <div class="column justify-center items-start">
                <div class="text-weight-bold text-dark">{{ props.row.full_name }}</div>
                <div class="text-caption text-grey-6">{{ props.row.designation || 'Staff' }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <!-- Office Column -->
        <template #body-cell-office="props">
          <q-td :props="props">
            <div>{{ props.value }}</div>
            <q-tooltip v-if="props.row.hris_office || props.row.office">
              {{ props.row.hris_office || props.row.office }}
            </q-tooltip>
          </q-td>
        </template>

        <!-- Assigned Office Column -->
        <template #body-cell-assigned_office="props">
          <q-td :props="props">
            <div :class="props.value === '-' ? 'text-grey-5' : 'text-weight-medium'">{{ props.value }}</div>
            <q-tooltip v-if="props.row.assigned_department_name && props.row.assigned_department_name !== props.value">
              {{ props.row.assigned_department_name }}
            </q-tooltip>
          </q-td>
        </template>

        <!-- Status Column -->
        <template #body-cell-biometric_status="props">
          <q-td :props="props" class="text-center">
            <q-badge
              rounded
              class="text-weight-bold text-caption q-px-sm"
              :color="getStatusColor(props.row.biometric_status)"
              :text-color="getStatusTextColor(props.row.biometric_status)"
              :label="formatStatus(props.row.biometric_status)"
            />
          </q-td>
        </template>

        <!-- Enrolled At Column -->
        <template #body-cell-enrolled_at="props">
          <q-td :props="props" class="text-center text-caption text-grey-7">
            {{ formatTimestamp(props.row.enrolled_at) }}
          </q-td>
        </template>

        <!-- Actions Column -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <div class="row inline no-wrap items-center justify-center q-gutter-x-xs">
              <!-- When Already Registered -->
              <template v-if="props.row.biometric_status === 'REGISTERED'">
                <q-chip
                  dense
                  color="green-1"
                  text-color="positive"
                  icon="check_circle"
                  class="text-weight-bold text-caption q-my-none"
                >
                  Enrolled
                  <q-tooltip>Employee biometrics are fully enrolled and active</q-tooltip>
                </q-chip>
              </template>

              <!-- When Awaiting Scan / Pending -->
              <template v-else-if="props.row.biometric_status === 'PENDING_ENROLLMENT'">
                <q-btn
                  outline
                  no-caps
                  size="sm"
                  color="amber-9"
                  icon="hourglass_top"
                  label="Awaiting Scan"
                  class="text-weight-bold"
                  @click="openRegisterDialog(props.row)"
                >
                  <q-tooltip>Profile queued on HR device. Click to re-send or change device.</q-tooltip>
                </q-btn>
              </template>

              <!-- When Not Registered -->
              <template v-else>
                <q-btn
                  unelevated
                  no-caps
                  size="sm"
                  color="primary"
                  icon="fingerprint"
                  label="Push to Bio"
                  @click="openRegisterDialog(props.row)"
                >
                  <q-tooltip>Push employee profile to HR enrollment MB360 device</q-tooltip>
                </q-btn>
              </template>
            </div>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="search_off" size="48px" color="grey-4" />
            <div class="text-subtitle1 q-mt-sm">No employees match the filter criteria.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Register to HR Bio Terminal Dialog -->
    <q-dialog v-model="showRegisterDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none bg-primary text-white">
          <div class="text-h6 text-weight-bold flex items-center q-gutter-x-sm">
            <q-icon name="fingerprint" size="22px" />
            <span>Push to HR Biometric Device</span>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense text-color="white" @click="showRegisterDialog = false" />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-subtitle1 text-weight-bold text-dark">
            {{ activeEmployee?.full_name }}
          </div>
          <div class="text-caption text-grey-7 q-mb-md">
            Control No: <strong class="text-dark">{{ activeEmployee?.control_no }}</strong> ·
            Office: {{ activeEmployee?.office }}
            <span v-if="activeEmployee?.assigned_department_name && activeEmployee?.assigned_department_name !== activeEmployee?.office">
              · Assigned: <strong>{{ activeEmployee?.assigned_department_name }}</strong>
            </span>
          </div>

          <div class="q-gutter-y-md">
            <q-select
              v-model="selectedDeviceSn"
              :options="deviceOptions"
              emit-value
              map-options
              outlined
              dense
              label="Select HR Enrollment Terminal *"
              :rules="[val => !!val || 'Select an enrollment terminal']"
            />

            <q-banner rounded class="bg-blue-1 text-blue-9 text-caption">
              <div class="row items-center q-gutter-x-xs text-weight-bold">
                <q-icon name="info" size="18px" />
                <span>Automated ADMS Device Command:</span>
              </div>
              <div class="q-mt-xs">
                The terminal will receive <code>DATA USER PIN={{ activeEmployee?.control_no }}</code>.
                Once pushed, have the employee step up to the terminal to scan their face or fingerprint.
              </div>
            </q-banner>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showRegisterDialog = false" />
          <q-btn
            unelevated
            no-caps
            label="Push to Terminal"
            color="primary"
            :loading="submitting"
            @click="submitRegister"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, reactive } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

const $q = useQuasar()

const loading = ref(false)
const submitting = ref(false)
const searchTerm = ref('')
const statusFilter = ref('all')

const stats = reactive({
  total_employees: 0,
  registered: 0,
  pending: 0,
  not_registered: 0,
})

const employeeRows = ref([])
const devicesList = ref([])

const pagination = ref({
  page: 1,
  rowsPerPage: 30,
  sortBy: 'full_name',
  descending: false,
})

const statusFilterOptions = [
  { label: 'All Employees', value: 'all' },
  { label: 'Biometric Registered', value: 'REGISTERED' },
  { label: 'Pending Enrollment', value: 'PENDING_ENROLLMENT' },
  { label: 'Not Registered', value: 'NOT_REGISTERED' },
]

function resolveAssignedOfficeAcronymLabel(row) {
  if (!row || !row.assigned_department_id) return '-'
  const candidates = [
    row.assignedDepartmentAcronym,
    row.assigned_department_acronym,
    row.officeAcronym,
    row.office_acronym,
    row.assigned_department_name,
    row.office,
    row.employee?.assignedDepartmentAcronym,
    row.employee?.assigned_department_acronym,
    row.employee?.officeAcronym,
    row.employee?.office_acronym,
    row.employee?.assigned_department_name,
    row.employee?.office,
  ]
  for (const c of candidates) {
    const text = String(c || '').trim()
    if (text) return text
  }
  return '-'
}

const columns = [
  { name: 'control_no', label: 'Control No', field: 'control_no', align: 'center', sortable: true },
  { name: 'employee', label: 'Employee', field: 'full_name', align: 'left', sortable: true },
  {
    name: 'office',
    label: 'Office',
    align: 'left',
    field: (row) => resolveOfficeAcronymLabel(row) || row.hris_office || row.office || '-',
    sortable: true,
  },
  {
    name: 'assigned_office',
    label: 'Assigned Office',
    align: 'left',
    field: (row) => resolveAssignedOfficeAcronymLabel(row),
    sortable: true,
  },
  { name: 'biometric_status', label: 'Biometric Status', field: 'biometric_status', align: 'center', sortable: true },
  { name: 'enrolled_at', label: 'Enrolled At', field: 'enrolled_at', align: 'center' },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const deviceOptions = computed(() => {
  return devicesList.value.map(d => ({
    label: `${d.device_name} (${d.serial_number})`,
    value: d.serial_number,
  }))
})

// Dialog states
const showRegisterDialog = ref(false)
const activeEmployee = ref(null)
const selectedDeviceSn = ref(null)

function getInitials(name) {
  if (!name) return 'EM'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getStatusColor(status) {
  if (status === 'REGISTERED') return 'green-1'
  if (status === 'PENDING_ENROLLMENT') return 'amber-1'
  return 'grey-2'
}

function getStatusTextColor(status) {
  if (status === 'REGISTERED') return 'green-9'
  if (status === 'PENDING_ENROLLMENT') return 'amber-9'
  return 'grey-8'
}

function formatStatus(status) {
  if (status === 'REGISTERED') return 'REGISTERED'
  if (status === 'PENDING_ENROLLMENT') return 'PENDING SCAN'
  return 'NOT ENROLLED'
}

function formatTimestamp(dtStr) {
  if (!dtStr) return '—'
  try {
    const d = new Date(dtStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dtStr
  }
}

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchEmployees()
  }, 350)
}

async function fetchEmployees() {
  loading.value = true
  try {
    const response = await api.get('/hr/biometric-registration', {
      params: {
        search: searchTerm.value,
        status: statusFilter.value,
      },
    })

    employeeRows.value = response.data.employees || []
    stats.total_employees = response.data.stats?.total_employees || 0
    stats.registered = response.data.stats?.registered || 0
    stats.pending = response.data.stats?.pending || 0
    stats.not_registered = response.data.stats?.not_registered || 0
  } catch (err) {
    console.error('Failed to load biometric employees:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load employees for biometric registration.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

async function fetchDevices() {
  try {
    const response = await api.get('/attendance/devices')
    devicesList.value = response.data.devices || []
    if (devicesList.value.length > 0 && !selectedDeviceSn.value) {
      selectedDeviceSn.value = devicesList.value[0].serial_number
    }
  } catch (err) {
    console.error('Failed to load devices:', err)
  }
}

function openRegisterDialog(employee) {
  activeEmployee.value = employee
  if (devicesList.value.length === 0) {
    fetchDevices()
  }
  showRegisterDialog.value = true
}

async function submitRegister() {
  if (!selectedDeviceSn.value) {
    $q.notify({
      type: 'warning',
      message: 'Please select an HR enrollment terminal.',
      position: 'top',
    })
    return
  }

  submitting.value = true
  try {
    const response = await api.post('/hr/biometric-registration/register', {
      employee_control_no: activeEmployee.value.control_no,
      device_serial_number: selectedDeviceSn.value,
    })

    $q.notify({
      type: 'positive',
      message: response.data.message,
      position: 'top',
    })

    showRegisterDialog.value = false
    await fetchEmployees()
  } catch (err) {
    console.error('Failed to register employee to bio device:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to register employee to device.',
      position: 'top',
    })
  } finally {
    submitting.value = false
  }
}

const syncingLogs = ref(false)

async function syncFromLogs() {
  syncingLogs.value = true
  try {
    const response = await api.post('/hr/biometric-registration/sync-from-logs')
    $q.notify({
      type: 'positive',
      message: response.data.message || 'Biometric registry synchronized successfully.',
      position: 'top',
    })
    await fetchEmployees()
  } catch (err) {
    console.error('Failed to sync from logs:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to sync personnel from logs.',
      position: 'top',
    })
  } finally {
    syncingLogs.value = false
  }
}

onMounted(() => {
  fetchEmployees()
  fetchDevices()
})
</script>

<style scoped>
.biometric-registration-page {
  max-width: 1300px;
  margin: 0 auto;
}

.stat-card {
  border-color: #e5e7eb;
}

.font-mono {
  font-family: monospace;
}
</style>
