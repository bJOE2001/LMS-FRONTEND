<template>
  <q-page class="q-pa-md">
    <!-- Page Header -->
    <div class="q-mb-lg">
      <div class="row items-center justify-between">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Employee Management</h1>
          <p class="text-grey-7 q-mb-none">Manage and view all employee records</p>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            unelevated
            no-caps
            color="secondary"
            icon="add_card"
            label="Add Leave Credits"
            class="credit-btn"
            @click="openLeaveCreditsDialog()"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="upload_file"
            label="Import Leave Balances"
            class="import-btn"
            @click="showImportDialog = true"
          />
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-6">
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
      <div class="col-12 col-sm-6 col-md-6">
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

    <!-- Employees -->
    <q-card flat bordered class="rounded-borders">
      <q-card-section class="bg-green-1">
        <div class="row items-center">
          <q-icon name="people" size="sm" color="green-8" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold text-green-8">
            {{ filterDepartment ? `Employees - ${filterDepartmentName}` : 'All Employees' }}
          </div>
          <q-space />
          <q-badge color="green-8" :label="employeePagination.rowsNumber + ' employee(s)'" rounded />
        </div>
      </q-card-section>
      <q-table
        :rows="employees"
        :columns="employeeColumns"
        row-key="control_no"
        flat
        :loading="loading"
        v-model:pagination="employeePagination"
        :rows-per-page-options="[10]"
        @request="onEmployeeRequest"
        @row-click="onEmployeeRowClick"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                {{ (props.row.firstname || '').charAt(0) }}{{ (props.row.surname || '').charAt(0) }}
              </q-avatar>
              <div>
                <div class="text-weight-medium">{{ props.row.surname }}, {{ props.row.firstname }}</div>
                <div v-if="props.row.designation" class="text-caption text-grey-6">{{ props.row.designation }}</div>
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
            <q-btn flat dense round icon="add_card" color="green-8" size="sm" @click.stop="openLeaveCreditsDialog(props.row)">
              <q-tooltip>Add Leave Credits</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="visibility" color="primary" size="sm" @click.stop="viewEmployee(props.row)">
              <q-tooltip>View Details</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <q-icon name="people_outline" size="48px" color="grey-5" />
            <div class="text-grey-6 q-mt-sm">
              {{ filterDepartment ? 'No employees found in this department' : 'No employees found' }}
            </div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- View Employee Dialog -->
    <q-dialog v-model="showViewDialog" persistent>
      <q-card class="rounded-borders employee-details-dialog">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Employee Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="selectedEmployee">
          <div class="row q-col-gutter-md">
            <div class="col-12 text-center q-mb-md">
              <q-avatar size="64px" color="primary" text-color="white" class="text-h5">
                {{ (selectedEmployee.firstname || '').charAt(0) }}{{ (selectedEmployee.surname || '').charAt(0) }}
              </q-avatar>
              <div class="text-h6 q-mt-sm">
                {{ selectedEmployee.firstname }} {{ selectedEmployee.surname }}
              </div>
              <div class="text-caption text-grey-6">{{ selectedEmployee.designation || '-' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Office</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.office ?? '-' }}</div>
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
        <q-separator />
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 text-weight-medium">Leave History</div>
            <q-space />
            <q-spinner v-if="leaveHistoryLoading" color="primary" size="20px" />
          </div>
          <q-table
            class="leave-history-table"
            flat
            dense
            :rows="leaveHistory"
            :columns="historyColumns"
            row-key="id"
            :rows-per-page-options="[5, 10, 20]"
            :loading="leaveHistoryLoading"
            table-style="table-layout: fixed; width: 100%"
          >
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="leaveStatusColor(props.row.raw_status)"
                  :label="props.row.status"
                  rounded
                />
              </q-td>
            </template>
            <template #body-cell-start_date="props">
              <q-td :props="props">{{ formatDate(props.row.start_date) }}</q-td>
            </template>
            <template #body-cell-end_date="props">
              <q-td :props="props">{{ formatDate(props.row.end_date) }}</q-td>
            </template>
            <template #body-cell-date_filed="props">
              <q-td :props="props">{{ formatDate(props.row.date_filed) }}</q-td>
            </template>
            <template #no-data>
              <div class="full-width text-center q-pa-md text-grey-6">
                No leave history found for this employee.
              </div>
            </template>
          </q-table>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Close" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Manual Leave Credits Dialog -->
    <q-dialog v-model="showLeaveCreditsDialog" persistent>
      <q-card style="min-width: 500px; max-width: 600px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="add_card" size="sm" color="secondary" class="q-mr-sm" />
          <div class="text-h6">Add Leave Credits</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :disable="savingLeaveCredits" />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
            <template #avatar>
              <q-icon name="info" color="blue-8" />
            </template>
            This sets the employee's balance for the selected leave type.
          </q-banner>

          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-input
                v-model="leaveCreditForm.employee_id"
                outlined
                dense
                label="Employee Control No *"
                maxlength="50"
                hint="Digits only"
              />
            </div>
            <div class="col-12">
              <q-select
                v-model="leaveCreditForm.leave_type_id"
                :options="creditLeaveTypeOptions"
                outlined
                dense
                emit-value
                map-options
                label="Leave Type *"
                :loading="loadingCreditLeaveTypes"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model.number="leaveCreditForm.balance"
                outlined
                dense
                type="number"
                min="0"
                step="0.01"
                label="Leave Credits (days) *"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup :disable="savingLeaveCredits" />
          <q-btn
            unelevated
            no-caps
            label="Save Leave Credits"
            color="secondary"
            icon="save"
            :loading="savingLeaveCredits"
            @click="saveLeaveCredits"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Import Leave Balances Dialog -->
    <q-dialog v-model="showImportDialog" persistent>
      <q-card style="min-width: 540px; max-width: 640px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="upload_file" size="sm" color="primary" class="q-mr-sm" />
          <div class="text-h6">Import Leave Balances</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :disable="importing" />
        </q-card-section>

        <!-- Instructions -->
        <q-card-section v-if="!importResult" class="q-pt-sm">
          <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
            <template #avatar>
              <q-icon name="info" color="blue-8" />
            </template>
            <div class="text-body2">
              Upload a CSV file with columns: <strong>employee_id</strong>, <strong>leave_type</strong>, <strong>balance</strong>.<br />
              <span class="text-caption">employee_id = Control No, leave_type = exact name (e.g. Vacation Leave), balance >= 0</span>
            </div>
          </q-banner>

          <!-- File input -->
          <q-file
            v-model="importFile"
            outlined
            dense
            label="Select CSV file"
            accept=".csv,.txt"
            max-file-size="2097152"
            class="q-mb-md"
            :error="!!importFileError"
            :error-message="importFileError"
            @rejected="onFileRejected"
            @update:model-value="importFileError = ''"
          >
            <template #prepend>
              <q-icon name="attach_file" color="grey-6" />
            </template>
          </q-file>

          <!-- CSV preview -->
          <q-card v-if="!importFile" flat bordered class="bg-grey-1 rounded-borders q-pa-md">
            <div class="text-caption text-grey-7 text-weight-medium q-mb-xs">Example CSV format:</div>
            <pre class="text-caption text-grey-8 q-mb-none" style="line-height: 1.5">employee_id,leave_type,balance
000001,Vacation Leave,12.50
000001,Sick Leave,8.00
000002,MCO6 Leave,5</pre>
          </q-card>
        </q-card-section>

        <!-- Import result -->
        <q-card-section v-if="importResult" class="q-pt-sm">
          <div class="text-center q-mb-md">
            <q-icon
              :name="importResult.failed_records === 0 ? 'check_circle' : 'warning'"
              :color="importResult.failed_records === 0 ? 'positive' : 'orange-8'"
              size="56px"
            />
            <div class="text-h6 q-mt-sm">Import Completed</div>
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-4 text-center">
              <div class="text-h5 text-primary">{{ importResult.total_records }}</div>
              <div class="text-caption text-grey-6">Total Rows</div>
            </div>
            <div class="col-4 text-center">
              <div class="text-h5 text-positive">{{ importResult.successful_records }}</div>
              <div class="text-caption text-grey-6">Successful</div>
            </div>
            <div class="col-4 text-center">
              <div class="text-h5" :class="importResult.failed_records > 0 ? 'text-negative' : 'text-grey-5'">{{ importResult.failed_records }}</div>
              <div class="text-caption text-grey-6">Failed</div>
            </div>
          </div>

          <!-- Error details -->
          <q-expansion-item
            v-if="importResult.errors && importResult.errors.length > 0"
            icon="error_outline"
            label="Row Errors"
            :caption="importResult.errors.length + ' issue(s)'"
            header-class="text-negative"
            dense
          >
            <q-list dense separator class="q-mt-xs">
              <q-item v-for="(err, idx) in importResult.errors" :key="idx">
                <q-item-section avatar>
                  <q-badge color="red-3" text-color="red-9" :label="'Row ' + err.row" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-body2">{{ err.message }}</q-item-label>
                  <q-item-label caption>Value: {{ err.value }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <template v-if="!importResult">
            <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup :disable="importing" />
            <q-btn
              unelevated
              no-caps
              label="Upload & Import"
              color="primary"
              icon="cloud_upload"
              :loading="importing"
              :disable="!importFile"
              @click="doImport"
            />
          </template>
          <template v-else>
            <q-btn flat no-caps label="Import Another" color="primary" @click="resetImport" />
            <q-btn unelevated no-caps label="Done" color="primary" v-close-popup @click="resetImport" />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()

const search = ref('')
const filterDepartment = ref(null)
const loading = ref(false)
const loadingDepartments = ref(false)

const employees = ref([])
const allDepartments = ref([])
const filteredDeptOptions = ref([])
const totalEmployees = ref(0)

const showViewDialog = ref(false)
const selectedEmployee = ref(null)
const leaveHistory = ref([])
const leaveHistoryLoading = ref(false)

// CSV import state
const showImportDialog = ref(false)
const importFile = ref(null)
const importFileError = ref('')
const importing = ref(false)
const importResult = ref(null)

// Manual leave credit state
const showLeaveCreditsDialog = ref(false)
const savingLeaveCredits = ref(false)
const loadingCreditLeaveTypes = ref(false)
const creditLeaveTypeOptions = ref([])
const leaveCreditForm = ref(defaultLeaveCreditForm())

// Server-side pagination state
const employeePagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

// Column definitions (local LMS_DB)
const employeeColumns = [
  { name: 'control_no', label: 'ID', align: 'left', field: 'control_no', sortable: true },
  { name: 'name', label: 'Employee', align: 'left', field: 'surname', sortable: true },
  { name: 'status', label: 'Status', align: 'center', field: 'status', sortable: true },
  { name: 'office', label: 'Office', align: 'left', field: 'office', sortable: true },
  { name: 'actions', label: 'Actions', align: 'center', field: 'actions' },
]

const historyColumns = [
  { name: 'date_filed', label: 'Date Filed', align: 'left', field: 'date_filed', sortable: true, style: 'width: 16%' },
  { name: 'leave_type', label: 'Leave Type', align: 'left', field: 'leave_type', sortable: true, style: 'width: 22%' },
  { name: 'start_date', label: 'Start Date', align: 'left', field: 'start_date', sortable: true, style: 'width: 16%' },
  { name: 'end_date', label: 'End Date', align: 'left', field: 'end_date', sortable: true, style: 'width: 16%' },
  { name: 'total_days', label: 'Days', align: 'center', field: 'total_days', sortable: true, style: 'width: 10%' },
  { name: 'status', label: 'Status', align: 'center', field: 'status', sortable: true, style: 'width: 20%' },
]

// Department dropdown and filter label
const departmentOptions = computed(() =>
  allDepartments.value.map((d) => ({ label: d.name, value: d.id }))
)

const filterDepartmentName = computed(() => {
  if (!filterDepartment.value) return ''
  const d = allDepartments.value.find((x) => x.id === filterDepartment.value)
  return d ? d.name : ''
})

function onDepartmentFilter(val, update) {
  update(() => {
    if (!val) {
      filteredDeptOptions.value = departmentOptions.value
    } else {
      const needle = val.toLowerCase()
      filteredDeptOptions.value = departmentOptions.value.filter(
        (o) => o.label.toLowerCase().includes(needle)
      )
    }
  })
}

function statusBadgeColor(status) {
  if (!status) return 'grey'
  const c = { REGULAR: 'green', 'CO-TERMINOUS': 'blue', ELECTIVE: 'amber', CASUAL: 'orange' }
  return c[status] ?? 'blue'
}

async function fetchDepartments() {
  loadingDepartments.value = true
  try {
    const { data } = await api.get('/departments')
    allDepartments.value = data.departments ?? []
    filteredDeptOptions.value = departmentOptions.value
  } catch (err) {
    console.error('Failed to load departments:', err)
    const msg = resolveApiErrorMessage(err, 'Unable to load departments right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loadingDepartments.value = false
  }
}

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
    const msg = resolveApiErrorMessage(err, 'Unable to load employee records right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loading.value = false
  }
}

async function fetchCreditLeaveTypes() {
  loadingCreditLeaveTypes.value = true
  try {
    const { data } = await api.get('/hr/leave-types')
    const leaveTypes = Array.isArray(data.leave_types) ? data.leave_types : []
    creditLeaveTypeOptions.value = leaveTypes
      .filter((type) => type.is_credit_based)
      .map((type) => ({
        label: `${type.name} (${type.category})`,
        value: type.id,
      }))
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load leave types right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loadingCreditLeaveTypes.value = false
  }
}

function onEmployeeRequest(props) {
  employeePagination.value.rowsPerPage = props.pagination.rowsPerPage
  fetchData(props.pagination.page)
}

watch(filterDepartment, () => {
  fetchData(1)
})

watch(search, () => {
  fetchData(1)
})

onMounted(() => {
  fetchDepartments()
  fetchCreditLeaveTypes()
  fetchData()
})

function viewEmployee(emp) {
  selectedEmployee.value = emp
  showViewDialog.value = true
  fetchEmployeeLeaveHistory(emp?.control_no)
}

function onEmployeeRowClick(_evt, row) {
  viewEmployee(row)
}

function leaveStatusColor(status) {
  const map = {
    PENDING_ADMIN: 'orange-8',
    PENDING_HR: 'amber-8',
    APPROVED: 'positive',
    REJECTED: 'negative',
  }
  return map[status] ?? 'grey-7'
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function fetchEmployeeLeaveHistory(controlNo) {
  if (!controlNo) {
    leaveHistory.value = []
    return
  }

  leaveHistoryLoading.value = true
  try {
    const { data } = await api.get(`/hr/employees/${encodeURIComponent(controlNo)}/leave-history`)
    leaveHistory.value = data.applications ?? []
    if (data.employee) {
      selectedEmployee.value = {
        ...selectedEmployee.value,
        ...data.employee,
      }
    }
  } catch (err) {
    leaveHistory.value = []
    const msg = resolveApiErrorMessage(err, 'Unable to load employee leave history right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    leaveHistoryLoading.value = false
  }
}

function defaultLeaveCreditForm() {
  return {
    employee_id: '',
    leave_type_id: null,
    balance: null,
  }
}

function resetLeaveCreditForm() {
  leaveCreditForm.value = defaultLeaveCreditForm()
}

function openLeaveCreditsDialog(employee = null) {
  resetLeaveCreditForm()
  if (employee?.control_no) {
    leaveCreditForm.value.employee_id = String(employee.control_no)
  }
  showLeaveCreditsDialog.value = true
}

function leaveCreditValidationError() {
  const employeeId = String(leaveCreditForm.value.employee_id ?? '').trim()
  if (!employeeId) return 'Employee control no is required.'
  if (!/^\d+$/.test(employeeId)) return 'Employee control no must contain digits only.'
  if (!leaveCreditForm.value.leave_type_id) return 'Leave type is required.'

  const balance = Number(leaveCreditForm.value.balance)
  if (!Number.isFinite(balance)) return 'Leave credits must be a number.'
  if (balance < 0) return 'Leave credits cannot be negative.'

  return ''
}

async function saveLeaveCredits() {
  const validationError = leaveCreditValidationError()
  if (validationError) {
    $q.notify({ type: 'warning', message: validationError, position: 'top' })
    return
  }

  savingLeaveCredits.value = true
  try {
    const payload = {
      employee_id: String(leaveCreditForm.value.employee_id).trim(),
      leave_type_id: Number(leaveCreditForm.value.leave_type_id),
      balance: Number(leaveCreditForm.value.balance),
    }

    const { data } = await api.post('/hr/leave-balances', payload)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Leave credits saved successfully.',
      position: 'top',
    })
    showLeaveCreditsDialog.value = false
    resetLeaveCreditForm()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save leave credits right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    savingLeaveCredits.value = false
  }
}

function onFileRejected() {
  importFileError.value = 'File must be CSV/TXT and under 2 MB.'
}

function resetImport() {
  importFile.value = null
  importFileError.value = ''
  importResult.value = null
}

async function doImport() {
  if (!importFile.value) return
  importing.value = true
  importFileError.value = ''
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    const { data } = await api.post('/hr/leave-balances/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = data
    $q.notify({
      type: data.failed_records === 0 ? 'positive' : 'warning',
      message: `Import done: ${data.successful_records} of ${data.total_records} rows imported.`,
      position: 'top',
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to import employee records right now.')
    if (err.response?.status === 422 && err.response?.data?.errors?.file) {
      importFileError.value = err.response.data.errors.file[0]
    } else {
      $q.notify({ type: 'negative', message: msg, position: 'top' })
    }
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.search-input {
  min-width: 220px;
}
.import-btn {
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.credit-btn {
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.employee-details-dialog {
  width: min(860px, 90vw);
  max-width: 90vw;
}

.leave-history-table :deep(.q-table__middle) {
  overflow-x: hidden;
}

.leave-history-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.leave-history-table :deep(th),
.leave-history-table :deep(td) {
  white-space: nowrap;
}
</style>
