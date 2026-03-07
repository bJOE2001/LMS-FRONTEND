<template>
  <q-page class="q-pa-md">
    <!-- Page Header -->
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Employee Management</h1>
      <p class="text-grey-7">Manage and view all employee records</p>
    </div>

    <!-- Summary Cards -->

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="groups" size="md" color="primary" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Total Employees</div>
                <div class="text-h4 text-primary">{{ totalEmployees }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="admin_panel_settings" size="md" color="amber-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Department Heads</div>
                <div class="text-h4 text-amber-8">{{ departmentHeads.length }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="business" size="md" color="green-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Departments</div>
                <div class="text-h4 text-green-8">{{ allDepartments.length }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="row justify-between items-center">
          <div class="text-h6">Employee Records</div>
          <div class="row q-gutter-sm">
            <q-input
              v-model="search"
              outlined
              dense
              debounce="400"
              placeholder="Search employees..."
              class="search-input"
              clearable
            >
              <template #prepend>
                <q-icon name="search" size="sm" color="grey-6" />
              </template>
            </q-input>
            <q-select
              v-model="filterDepartment"
              :options="filteredDeptOptions"
              outlined
              dense
              emit-value
              map-options
              clearable
              label="Select Department"
              style="width: 220px"
              :loading="loadingDepartments"
              use-input
              hide-selected
              fill-input
              input-debounce="200"
              @filter="onDepartmentFilter"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- ==================== DEFAULT VIEW: No department selected — heads only ==================== -->
    <template v-if="!filterDepartment">
      <!-- All Department Heads -->
      <q-card flat bordered class="rounded-borders q-mb-lg">
        <q-card-section class="bg-blue-1">
          <div class="row items-center">
            <q-icon name="admin_panel_settings" size="sm" color="primary" class="q-mr-sm" />
            <div class="text-subtitle1 text-weight-bold text-primary">All Department Heads</div>
            <q-space />
            <q-badge color="primary" :label="departmentHeads.length + ' department(s)'" rounded />
          </div>
        </q-card-section>
        <q-table
          :rows="departmentHeads"
          :columns="headColumns"
          row-key="id"
          flat
          :loading="loading"
          :rows-per-page-options="[10, 20, 50]"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-full_name="props">
            <q-td :props="props">
              <div v-if="props.value" class="row items-center no-wrap">
                <q-avatar size="32px" color="amber-8" text-color="white" class="q-mr-sm">
                  {{ getInitials(props.value) }}
                </q-avatar>
                <div>
                  <div class="text-weight-medium">
                    {{ props.value }}
                    <q-badge color="amber-8" label="Head" class="q-ml-xs" rounded />
                  </div>
                </div>
              </div>
              <span v-else class="text-grey-5 text-italic">Not assigned</span>
            </q-td>
          </template>

          <template #no-data>
            <div class="full-width text-center q-pa-lg">
              <q-icon name="search_off" size="48px" color="grey-5" />
              <div class="text-grey-6 q-mt-sm">No department heads found</div>
            </div>
          </template>
        </q-table>
      </q-card>

      <!-- Prompt to select a department -->
      <q-card flat bordered class="rounded-borders">
        <q-card-section class="text-center q-pa-xl">
          <q-icon name="filter_alt" size="56px" color="grey-4" />
          <div class="text-h6 text-grey-6 q-mt-md">Select a Department</div>
          <div class="text-body2 text-grey-5 q-mt-sm">
            Choose a department from the filter above to view its employees.
          </div>
        </q-card-section>
      </q-card>
    </template>

    <!-- ==================== DEPARTMENT VIEW: Department selected ==================== -->
    <template v-else>
      <!-- Department Head(s) -->
      <q-card flat bordered class="rounded-borders q-mb-lg">
        <q-card-section class="bg-blue-1">
          <div class="row items-center">
            <q-icon name="admin_panel_settings" size="sm" color="primary" class="q-mr-sm" />
            <div class="text-subtitle1 text-weight-bold text-primary">Department Head &mdash; {{ filterDepartmentName }}</div>
          </div>
        </q-card-section>
        <q-table
          :rows="departmentHeads"
          :columns="headColumns"
          row-key="id"
          flat
          :loading="loading"
          hide-pagination
          :rows-per-page-options="[0]"
        >
          <template #body-cell-full_name="props">
            <q-td :props="props">
              <div v-if="props.value" class="row items-center no-wrap">
                <q-avatar size="32px" color="amber-8" text-color="white" class="q-mr-sm">
                  {{ getInitials(props.value) }}
                </q-avatar>
                <div>
                  <div class="text-weight-medium">
                    {{ props.value }}
                    <q-badge color="amber-8" label="Head" class="q-ml-xs" rounded />
                  </div>
                </div>
              </div>
              <span v-else class="text-grey-5 text-italic">Not assigned</span>
            </q-td>
          </template>

          <template #no-data>
            <div class="full-width text-center q-pa-md">
              <div class="text-grey-6">No department head assigned</div>
            </div>
          </template>
        </q-table>
      </q-card>

      <!-- Employees Under Department -->
      <q-card flat bordered class="rounded-borders">
        <q-card-section class="bg-green-1">
          <div class="row items-center">
            <q-icon name="people" size="sm" color="green-8" class="q-mr-sm" />
            <div class="text-subtitle1 text-weight-bold text-green-8">Employees &mdash; {{ filterDepartmentName }}</div>
            <q-space />
            <q-badge color="green-8" :label="employeePagination.rowsNumber + ' employee(s)'" rounded />
          </div>
        </q-card-section>
        <q-table
          :rows="employees"
          :columns="employeeColumns"
          row-key="id"
          flat
          :loading="loading"
          v-model:pagination="employeePagination"
          @request="onEmployeeRequest"
        >
          <template #body-cell-name="props">
            <q-td :props="props">
              <div class="row items-center no-wrap">
                <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                  {{ (props.row.first_name || '').charAt(0) }}{{ (props.row.last_name || '').charAt(0) }}
                </q-avatar>
                <div>
                  <div class="text-weight-medium">{{ props.row.last_name }}, {{ props.row.first_name }}</div>
                  <div v-if="props.row.position" class="text-caption text-grey-6">{{ props.row.position }}</div>
                </div>
              </div>
            </q-td>
          </template>

          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="statusBadgeColor(props.value)"
                :label="props.value"
                class="text-weight-medium"
                rounded
              />
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="q-gutter-xs">
              <q-btn flat dense round icon="visibility" color="primary" size="sm" @click="viewEmployee(props.row)">
                <q-tooltip>View Details</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="key" color="orange-8" size="sm" @click="openCredentialsDialog(props.row)">
                <q-tooltip>Generate Credentials</q-tooltip>
              </q-btn>
            </q-td>
          </template>

          <template #no-data>
            <div class="full-width text-center q-pa-lg">
              <q-icon name="people_outline" size="48px" color="grey-5" />
              <div class="text-grey-6 q-mt-sm">No employees found in this department</div>
            </div>
          </template>
        </q-table>
      </q-card>
    </template>

    <!-- View Employee Dialog -->
    <q-dialog v-model="showViewDialog" persistent>
      <q-card style="min-width: 500px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Employee Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="selectedEmployee">
          <div class="row q-col-gutter-md">
            <div class="col-12 text-center q-mb-md">
              <q-avatar size="64px" color="primary" text-color="white" class="text-h5">
                {{ (selectedEmployee.first_name || '').charAt(0) }}{{ (selectedEmployee.last_name || '').charAt(0) }}
              </q-avatar>
              <div class="text-h6 q-mt-sm">
                {{ selectedEmployee.first_name }} {{ selectedEmployee.last_name }}
              </div>
              <div class="text-caption text-grey-6">{{ selectedEmployee.position || '—' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">ID</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.id }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Department</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.department?.name ?? '—' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Position</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.position || '—' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Status</div>
              <q-badge
                :color="statusBadgeColor(selectedEmployee.status)"
                :label="selectedEmployee.status"
                rounded
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Close" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Generate Credentials Dialog -->
    <q-dialog v-model="showCredentialsDialog" persistent>
      <q-card style="min-width: 440px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Generate Credentials</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="credentialsEmployee">
          <div class="text-center q-mb-md">
            <q-avatar size="56px" color="primary" text-color="white" class="text-h6">
              {{ (credentialsEmployee.first_name || '').charAt(0) }}{{ (credentialsEmployee.last_name || '').charAt(0) }}
            </q-avatar>
            <div class="text-subtitle1 text-weight-bold q-mt-sm">
              {{ credentialsEmployee.first_name }} {{ credentialsEmployee.last_name }}
            </div>
            <div class="text-caption text-grey-6">{{ credentialsEmployee.department?.name ?? '—' }}</div>
          </div>

          <!-- Generated credentials preview -->
          <q-card flat bordered class="bg-grey-1 rounded-borders q-pa-md q-mb-md">
            <div class="text-caption text-grey-7 q-mb-xs">Username</div>
            <div class="text-body1 text-weight-bold text-primary q-mb-md" style="letter-spacing: 0.03em">
              {{ generatedUsername }}
            </div>
            <div class="text-caption text-grey-7 q-mb-xs">Default Password</div>
            <div class="text-body1 text-weight-bold text-grey-8" style="letter-spacing: 0.03em">
              {{ generatedPassword }}
            </div>
          </q-card>

          <q-banner v-if="!canGenerateCredentials" dense rounded class="bg-red-1 text-red-9 q-mb-sm">
            <template #avatar>
              <q-icon name="warning" color="red-8" />
            </template>
            This employee has no birthdate. Add a birthdate first, then generate credentials.
          </q-banner>
          <q-banner v-else dense rounded class="bg-orange-1 text-orange-9 q-mb-sm">
            <template #avatar>
              <q-icon name="info" color="orange-8" />
            </template>
            They must change the default password on first login.
          </q-banner>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            unelevated
            no-caps
            label="Generate & Save"
            color="primary"
            icon="key"
            :loading="generatingCredentials"
            :disable="!canGenerateCredentials"
            @click="confirmGenerate"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

const $q = useQuasar()

// ─── Reactive state ──────────────────────────────────────────────────────────
const search = ref('')
const filterDepartment = ref(null)
const loading = ref(false)
const loadingDepartments = ref(false)

const departmentHeads = ref([])
const employees = ref([])
const allDepartments = ref([])
const filteredDeptOptions = ref([])
const totalEmployees = ref(0)

const showViewDialog = ref(false)
const showCredentialsDialog = ref(false)
const selectedEmployee = ref(null)
const credentialsEmployee = ref(null)
const generatingCredentials = ref(false)

// Server-side pagination state
const employeePagination = ref({
  page: 1,
  rowsPerPage: 15,
  rowsNumber: 0,
})

// ─── Column definitions (local LMS_DB) ───────────────────────────────────────
const headColumns = [
  { name: 'department_name', label: 'Department', align: 'left', field: (row) => row.department?.name ?? '—', sortable: true },
  { name: 'full_name', label: 'Department Head', align: 'left', field: 'full_name', sortable: true },
  { name: 'position', label: 'Position', align: 'left', field: 'position', sortable: true },
]

const employeeColumns = [
  { name: 'name', label: 'Employee', align: 'left', field: 'last_name', sortable: true },
  { name: 'id', label: 'ID', align: 'left', field: 'id', sortable: true },
  { name: 'position', label: 'Position', align: 'left', field: 'position', sortable: true },
  { name: 'status', label: 'Status', align: 'center', field: 'status', sortable: true },
  { name: 'department_name', label: 'Department', align: 'left', field: (row) => row.department?.name ?? '—', sortable: true },
  { name: 'actions', label: 'Actions', align: 'center', field: 'actions' },
]

// ─── Department dropdown & filter label ──────────────────────────────────────
const departmentOptions = computed(() =>
  allDepartments.value.map((d) => ({ label: d.name, value: d.id }))
)

const filterDepartmentName = computed(() => {
  if (!filterDepartment.value) return ''
  const d = allDepartments.value.find((x) => x.id === filterDepartment.value)
  return d ? d.name : ''
})

/**
 * Handles the department select filter for typeahead search.
 */
function onDepartmentFilter(val, update) {
  update(() => {
    if (!val) {
      filteredDeptOptions.value = departmentOptions.value
    } else {
      const needle = val.toLowerCase()
      filteredDeptOptions.value = departmentOptions.value.filter(
        o => o.label.toLowerCase().includes(needle)
      )
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/[\s,]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
  return parts[0].charAt(0).toUpperCase()
}

function statusBadgeColor(status) {
  if (!status) return 'grey'
  const c = { 'REGULAR': 'green', 'CO-TERMINOUS': 'blue', 'ELECTIVE': 'amber', 'CASUAL': 'orange' }
  return c[status] ?? 'blue'
}

// ─── API calls (READ-ONLY — SELECT queries only) ────────────────────────────

/**
 * Fetch all departments from local LMS_DB for the filter dropdown.
 */
async function fetchDepartments() {
  loadingDepartments.value = true
  try {
    const { data } = await api.get('/departments')
    allDepartments.value = data.departments ?? []
    filteredDeptOptions.value = departmentOptions.value
  } catch (err) {
    console.error('Failed to load departments:', err)
    $q.notify({ type: 'negative', message: 'Failed to load departments', position: 'top' })
  } finally {
    loadingDepartments.value = false
  }
}

/**
 * Fetch department heads (always) and employees (only when a department is selected).
 * Uses local LMS_DB. Employees are only returned when department_id is provided.
 */
async function fetchData(page = 1) {
  loading.value = true
  try {
    const { data } = await api.get('/employees', {
      params: {
        department_id: filterDepartment.value || undefined,
        search: search.value || undefined,
        per_page: employeePagination.value.rowsPerPage,
        page,
      },
    })

    departmentHeads.value = data.department_heads ?? []
    totalEmployees.value = data.total_employees ?? 0

    if (data.employees) {
      employees.value = data.employees.data ?? []
      employeePagination.value.page = data.employees.current_page ?? 1
      employeePagination.value.rowsNumber = data.employees.total ?? 0
    } else {
      employees.value = []
      employeePagination.value.page = 1
      employeePagination.value.rowsNumber = 0
    }
  } catch (err) {
    console.error('Failed to load data:', err)
    $q.notify({ type: 'negative', message: 'Failed to load employee records', position: 'top' })
  } finally {
    loading.value = false
  }
}

// ─── Server-side pagination handler ──────────────────────────────────────────
function onEmployeeRequest(props) {
  employeePagination.value.rowsPerPage = props.pagination.rowsPerPage
  fetchData(props.pagination.page)
}

// ─── Watchers ────────────────────────────────────────────────────────────────
watch(filterDepartment, () => {
  fetchData(1)
})

watch(search, () => {
  fetchData(1)
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────
onMounted(() => {
  fetchDepartments()
  fetchData()
})

// ─── Dialog handlers ─────────────────────────────────────────────────────────
function viewEmployee(emp) {
  selectedEmployee.value = emp
  showViewDialog.value = true
}

function openCredentialsDialog(emp) {
  credentialsEmployee.value = emp
  showCredentialsDialog.value = true
}

// Username: MMDDYY (e.g. 042585). Password: lastname + MMDDYY (e.g. Bernhard042585)
function birthdateToMdy(birthdate) {
  if (!birthdate) return null
  const s = typeof birthdate === 'string' ? birthdate : String(birthdate)
  if (s.length < 10) return null
  const month = s.slice(5, 7)
  const day = s.slice(8, 10)
  const year = s.slice(2, 4)
  return month + day + year
}

const generatedUsername = computed(() => {
  const mdy = birthdateToMdy(credentialsEmployee.value?.birthdate)
  return mdy || '—'
})

const generatedPassword = computed(() => {
  if (!credentialsEmployee.value) return '—'
  const mdy = birthdateToMdy(credentialsEmployee.value.birthdate)
  if (!mdy) return '—'
  const last = (credentialsEmployee.value.last_name || '').trim()
  return last + mdy
})

const canGenerateCredentials = computed(() => {
  return credentialsEmployee.value?.birthdate
})

async function confirmGenerate() {
  if (!credentialsEmployee.value?.birthdate) {
    $q.notify({
      type: 'warning',
      message: 'Employee must have a birthdate set before generating credentials.',
    })
    return
  }
  generatingCredentials.value = true
  try {
    const { data } = await api.post(`/employees/${credentialsEmployee.value.id}/generate-credentials`)
    showCredentialsDialog.value = false
    $q.notify({
      type: 'positive',
      message: data.message || `Credentials generated for ${credentialsEmployee.value.first_name} ${credentialsEmployee.value.last_name}`,
      caption: `Username: ${data.username ?? generatedUsername.value}. They must change password on first login.`,
      position: 'top',
    })
    credentialsEmployee.value = null
    fetchData(employeePagination.value.page)
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to generate credentials'
    $q.notify({ type: 'negative', message: msg })
  } finally {
    generatingCredentials.value = false
  }
}
</script>

<style scoped>
.search-input {
  min-width: 220px;
}
</style>
