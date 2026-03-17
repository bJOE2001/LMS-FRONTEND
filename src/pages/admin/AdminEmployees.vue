<template>
  <q-page class="q-pa-md admin-employees-page">
    <div class="row items-center q-mb-lg admin-employees-header">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none admin-employees-title">Employee Management</h1>
      <q-space class="admin-employees-spacer" />
      <div class="row q-gutter-sm admin-employees-actions">
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="person_add"
          label="Add Employee"
          class="add-employee-btn"
          :disable="!adminDepartmentId"
          @click="openCreateDialog"
        />
      </div>
    </div>
    <div class="row q-col-gutter-sm q-mb-md status-cards-row">
      <div
        v-for="card in statusCards"
        :key="card.key"
        class="col-6 col-sm-6 col-md status-cards-row__item"
      >
        <q-card
          :class="['stat-card', 'bg-white', 'rounded-borders', { 'stat-card--active': isStatusCardActive(card) }]"
          :style="getStatusCardStyle(card)"
          flat
          bordered
          @click="applyStatusFilter(card.filterValue)"
        >
          <q-card-section class="q-py-md status-card__section">
            <div class="row items-center no-wrap status-card__content">
              <q-avatar
                :style="{ background: card.bg }"
                :text-color="card.color"
                size="44px"
                class="q-mr-md stat-icon status-card__avatar"
              >
                <q-icon :name="card.icon" size="22px" :color="card.color" class="status-card__avatar-icon" />
              </q-avatar>
              <div class="text-caption text-grey-7 text-weight-medium text-uppercase status-card__label" style="letter-spacing: 0.04em">{{ card.label }}</div>
              <div class="text-h6 text-weight-bold status-card__value q-ml-auto" :style="{ color: card.hex }">{{ card.value }}</div>
            </div>
            <q-tooltip>{{ getStatusCardTooltip(card) }}</q-tooltip>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders employee-records-card">
      <q-card-section class="employee-records-card__section">
        <div class="row justify-between items-center employee-records-toolbar">
          <div class="row items-center q-gutter-sm">
            <div class="text-h6">Employee Records</div>
            <q-chip
              v-if="activeStatusFilterLabel"
              dense
              removable
              color="primary"
              text-color="white"
              icon="filter_alt"
              @remove="clearStatusFilter"
            >
              {{ activeStatusFilterLabel }}
            </q-chip>
          </div>
          <q-input
            v-model="search"
            outlined
            dense
            debounce="400"
            placeholder="Search employees..."
            clearable
            class="employee-records-search"
            @update:model-value="fetchEmployees(1)"
          >
            <template #prepend>
              <q-icon name="search" size="sm" color="grey-6" />
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-table
        :rows="tableRows"
        :columns="visibleColumns"
        row-key="control_no"
        flat
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap cursor-pointer" @click="viewEmployee(props.row)">
              <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                {{ (props.row.firstname || '').charAt(0) }}{{ (props.row.surname || '').charAt(0) }}
              </q-avatar>
              <div class="column justify-center items-start">
                <div class="row items-center no-wrap q-gutter-x-sm">
                  <div class="employee-name text-primary text-left">
                  {{ props.row.surname }}, {{ props.row.firstname }}
                  </div>
                  <q-badge
                    v-if="isDepartmentHeadRecord(props.row)"
                    color="secondary"
                    text-color="white"
                    label="Dept. Head"
                    rounded
                  />
                </div>
                <div class="employee-designation text-grey-6 text-left">{{ props.row.designation || '-' }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="statusBadgeColor(props.row.status)"
              :label="formatResponsiveStatusLabel(props.row.status)"
              class="text-weight-medium"
              rounded
            />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <div class="row inline no-wrap justify-center q-gutter-x-xs">
              <q-btn flat dense round icon="visibility" color="primary" size="sm" @click="viewEmployee(props.row)">
                <q-tooltip>View Details</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="badge"
                color="secondary"
                size="sm"
                :disable="loadingDepartmentHead || savingDepartmentHead"
                @click="confirmAssignDepartmentHead(props.row)"
              >
                <q-tooltip>{{
                  isDepartmentHeadRecord(props.row) ? 'Current Department Head' : 'Assign Dept. Head'
                }}</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="edit" color="orange-8" size="sm" @click="openEditDialog(props.row)">
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="delete" color="negative" size="sm" @click="confirmDelete(props.row)">
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="description" color="green-8" size="sm" @click="applyLeaveFor(props.row)">
                <q-tooltip>Apply Leave</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <q-icon name="search_off" size="48px" color="grey-5" />
            <div class="text-grey-6 q-mt-sm">{{ noDataMessage }}</div>
          </div>
        </template>
      </q-table>
    </q-card>

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
          <AdminApplyOnBehalf
            :key="applyLeaveDialogKey"
            in-dialog
            :initial-employee="applyLeaveEmployee"
            @cancel="closeApplyLeaveDialog"
            @submitted="handleApplyLeaveSubmitted"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showViewDialog" persistent>
      <q-card style="width: 90vw; max-width: 520px" class="rounded-borders dialog-card">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Employee Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedEmployee">
          <div class="row q-col-gutter-md">
            <div class="col-12 text-center q-mb-sm">
              <q-avatar size="64px" color="primary" text-color="white" class="text-h5">
                {{ (selectedEmployee.firstname || '').charAt(0) }}{{ (selectedEmployee.surname || '').charAt(0) }}
              </q-avatar>
              <div class="text-h6 q-mt-sm">{{ selectedEmployee.firstname }} {{ selectedEmployee.surname }}</div>
              <div class="text-caption text-grey-6">{{ selectedEmployee.designation || '-' }}</div>
            </div>

            <div class="col-6">
              <div class="text-caption text-grey-6">Control No</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.control_no }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Status</div>
              <q-badge :color="statusBadgeColor(selectedEmployee.status)" :label="selectedEmployee.status" rounded />
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Surname</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.surname || '-' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Firstname</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.firstname || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Middlename</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.middlename || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Designation</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.designation || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Office / Department</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.office || '-' }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Rate / Month</div>
              <div class="text-body2 text-weight-medium">{{ formatMoney(selectedEmployee.rate_mon) }}</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="q-pa-md employee-view-actions" align="right">
          <q-btn
            flat
            dense
            no-caps
            label="Reassign"
            color="secondary"
            icon="badge"
            class="employee-view-actions__btn"
            :disable="!selectedEmployee || loadingDepartmentHead || savingDepartmentHead || isDepartmentHeadRecord(selectedEmployee)"
            @click="reassignDepartmentHeadFromView"
          />
          <q-btn
            flat
            dense
            no-caps
            label="Edit"
            color="orange-8"
            icon="edit"
            class="employee-view-actions__btn"
            @click="openEditDialog(selectedEmployee); showViewDialog = false"
          />
          <q-btn
            unelevated
            dense
            no-caps
            label="Apply Leave"
            color="green-8"
            icon="description"
            class="employee-view-actions__btn"
            @click="applyLeaveFor(selectedEmployee); showViewDialog = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDepartmentHeadDialog" persistent>
        <q-card style="width: 95vw; max-width: 760px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ departmentHeadDialogMode === 'edit' ? 'Edit Department Head' : 'Add Department Head' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="savingDepartmentHead" v-close-popup />
        </q-card-section>

        <q-form ref="departmentHeadFormRef" @submit.prevent="saveDepartmentHead">
          <q-card-section class="q-pt-sm">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="departmentHeadForm.control_no"
                  outlined
                  dense
                  label="Control No *"
                  :disable="savingDepartmentHead"
                  :rules="[requiredRule('Control No'), digitsOnlyRule]"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="departmentHeadForm.status"
                  :options="statusOptions"
                  outlined
                  dense
                  label="Status *"
                  emit-value
                  map-options
                  :disable="savingDepartmentHead"
                  :rules="[requiredRule('Status')]"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input :model-value="adminDepartmentName" outlined dense label="Office / Department" readonly />
              </div>

              <div class="col-12 col-md-4">
                <q-input
                  v-model="departmentHeadForm.surname"
                  outlined
                  dense
                  label="Surname *"
                  :disable="savingDepartmentHead"
                  :rules="[requiredRule('Surname')]"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="departmentHeadForm.firstname"
                  outlined
                  dense
                  label="Firstname *"
                  :disable="savingDepartmentHead"
                  :rules="[requiredRule('Firstname')]"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  v-model="departmentHeadForm.middlename"
                  outlined
                  dense
                  label="Middlename"
                  :disable="savingDepartmentHead"
                />
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  v-model="departmentHeadForm.designation"
                  outlined
                  dense
                  label="Designation"
                  :disable="savingDepartmentHead"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="departmentHeadForm.rate_mon"
                  outlined
                  dense
                  type="number"
                  min="0"
                  step="0.01"
                  label="Rate / Month"
                  :disable="savingDepartmentHead"
                  :rules="[nonNegativeNumberRule]"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="savingDepartmentHead" v-close-popup />
            <q-btn
              unelevated
              no-caps
              :label="departmentHeadDialogMode === 'edit' ? 'Update Dept. Head' : 'Add Dept. Head'"
              color="primary"
              :loading="savingDepartmentHead"
              type="submit"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showFormDialog" persistent>
      <q-card style="width: 95vw; max-width: 760px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ isEditMode ? 'Edit Employee' : 'Add Employee' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="submitting" v-close-popup />
        </q-card-section>

        <q-form ref="formRef" @submit.prevent="saveEmployee">
          <q-card-section class="q-pt-sm">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="employeeForm.control_no"
                  outlined
                  dense
                  label="Control No *"
                  :readonly="isEditMode"
                  :rules="[requiredRule('Control No'), digitsOnlyRule]"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="employeeForm.status"
                  :options="statusOptions"
                  outlined
                  dense
                  label="Status *"
                  emit-value
                  map-options
                  :rules="[requiredRule('Status')]"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-input :model-value="adminDepartmentName" outlined dense label="Office / Department" readonly />
              </div>

              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.surname" outlined dense label="Surname *" :rules="[requiredRule('Surname')]" />
              </div>
              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.firstname" outlined dense label="Firstname *" :rules="[requiredRule('Firstname')]" />
              </div>
              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.middlename" outlined dense label="Middlename" />
              </div>

              <div class="col-12 col-md-6">
                <q-input v-model="employeeForm.designation" outlined dense label="Designation" />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="employeeForm.rate_mon"
                  outlined
                  dense
                  type="number"
                  min="0"
                  step="0.01"
                  label="Rate / Month"
                  :rules="[nonNegativeNumberRule]"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="submitting" v-close-popup />
            <q-btn
              unelevated
              no-caps
              :label="isEditMode ? 'Update Employee' : 'Create Employee'"
              color="primary"
              :loading="submitting"
              type="submit"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import AdminApplyOnBehalf from 'pages/admin/AdminApplyOnBehalf.vue'

const $q = useQuasar()
const authStore = useAuthStore()

const search = ref('')
const showApplyLeaveDialog = ref(false)
const showViewDialog = ref(false)
const showDepartmentHeadDialog = ref(false)
const showFormDialog = ref(false)
const isEditMode = ref(false)
const submitting = ref(false)
const departmentHeadFormRef = ref(null)
const formRef = ref(null)

const selectedEmployee = ref(null)
const employees = ref([])
const fullEmployeeRows = ref([])
const fullEmployeeRowsCacheKey = ref('')
const loading = ref(false)
const totalEmployees = ref(0)
const statusCounts = ref({})
const activeStatusFilter = ref('')
const loadingDepartmentHead = ref(false)
const savingDepartmentHead = ref(false)
const departmentHeadId = ref(null)
const departmentHeadDialogMode = ref('add')
const applyLeaveEmployee = ref(null)
const applyLeaveDialogKey = ref(0)

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

const createDefaultEmployeeForm = () => ({
  control_no: '',
  surname: '',
  firstname: '',
  middlename: '',
  status: 'REGULAR',
  designation: '',
  rate_mon: null,
})

const employeeForm = ref(createDefaultEmployeeForm())
const createDefaultDepartmentHeadForm = () => ({
  control_no: '',
  surname: '',
  firstname: '',
  middlename: '',
  status: 'REGULAR',
  designation: '',
  rate_mon: null,
})
const departmentHeadForm = ref(createDefaultDepartmentHeadForm())

const statusOptions = [
  { label: 'Regular', value: 'REGULAR' },
  { label: 'Co-terminous', value: 'CO-TERMINOUS' },
  { label: 'Elective', value: 'ELECTIVE' },
  { label: 'Casual', value: 'CASUAL' },
  { label: 'Contractual', value: 'CONTRACTUAL' },
]

const adminDepartmentId = computed(() => authStore.user?.department_id ?? authStore.user?.department?.id)
const adminDepartmentName = computed(() => authStore.user?.department?.name ?? '-')
const activeStatusFilterLabel = computed(() => {
  if (!activeStatusFilter.value) return ''
  const matched = statusOptions.find((option) => option.value === activeStatusFilter.value)
  return matched?.label || activeStatusFilter.value
})

const noDataMessage = computed(() => {
  if (!adminDepartmentId.value) return 'Select or set your department to view employees.'
  return 'No employees found in this department.'
})

const tableRows = computed(() => {
  if (activeStatusFilter.value) {
    return paginateClientRows(
      buildClientFilteredRows(fullEmployeeRows.value),
      pagination.value.page,
      pagination.value.rowsPerPage,
    )
  }

  const rows = Array.isArray(employees.value) ? [...employees.value] : []
  const headRow = buildSyntheticDepartmentHeadRow()
  if (!headRow) return rows
  if (!matchesStatusFilter(headRow.status)) return rows
  if (!matchesEmployeeSearch(headRow)) return rows

  const existsInEmployees = rows.some((row) => normalizeControlNo(row?.control_no) === normalizeControlNo(headRow.control_no))
  if (existsInEmployees) return rows

  return [headRow, ...rows]
})

const columns = [
  { name: 'control_no', label: 'Control No', align: 'left', field: 'control_no', sortable: true },
  { name: 'name', label: 'Employee', align: 'left', field: row => `${row.surname}, ${row.firstname}`, sortable: true },
  { name: 'status', label: 'Status', align: 'center', field: 'status', sortable: true },
  { name: 'actions', label: 'Actions', align: 'center' },
]
const visibleColumns = computed(() =>
  $q.screen.lt.sm
    ? columns.filter((column) => !['control_no', 'status'].includes(column.name))
    : columns,
)

const statusCards = computed(() => [
  { key: 'TOTAL', label: 'Total Employees', value: totalEmployees.value, filterValue: '', icon: 'groups', hex: '#1565c0', color: 'primary', bg: '#e3f2fd' },
  { key: 'ELECTIVE', label: 'Elective', value: statusCounts.value.ELECTIVE || 0, filterValue: 'ELECTIVE', icon: 'how_to_vote', hex: '#f9a825', color: 'amber-9', bg: '#fff8e1' },
  { key: 'CO-TERMINOUS', label: 'Co-terminous', value: statusCounts.value['CO-TERMINOUS'] || 0, filterValue: 'CO-TERMINOUS', icon: 'event_repeat', hex: '#0277bd', color: 'blue-8', bg: '#e1f5fe' },
  { key: 'REGULAR', label: 'Regular', value: statusCounts.value.REGULAR || 0, filterValue: 'REGULAR', icon: 'verified_user', hex: '#2e7d32', color: 'green-8', bg: '#e8f5e9' },
  { key: 'CASUAL', label: 'Casual', value: statusCounts.value.CASUAL || 0, filterValue: 'CASUAL', icon: 'person_outline', hex: '#e65100', color: 'orange-9', bg: '#fff3e0' },
  { key: 'CONTRACTUAL', label: 'Contractual', value: statusCounts.value.CONTRACTUAL || 0, filterValue: 'CONTRACTUAL', icon: 'badge', hex: '#6d4c41', color: 'brown-7', bg: '#efebe9' },
])

function normalizeStatus(value) {
  return String(value || '').trim().toUpperCase()
}

function countStatusRows(sourceRows = []) {
  return prependSyntheticDepartmentHeadRow(sourceRows).reduce((counts, row) => {
    const status = normalizeStatus(row?.status)
    if (!status) return counts
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
}

function matchesStatusFilter(status) {
  if (!activeStatusFilter.value) return true
  return normalizeStatus(status) === activeStatusFilter.value
}

function matchesEmployeeSearch(employee) {
  const query = String(search.value || '').trim().toLowerCase()
  if (!query) return true

  const haystack = [
    employee?.control_no,
    employee?.surname,
    employee?.firstname,
    employee?.middlename,
    employee?.designation,
    employee?.office,
    employee?.status,
  ]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ')

  return haystack.includes(query)
}

function isStatusCardActive(card) {
  return normalizeStatus(card.filterValue) === normalizeStatus(activeStatusFilter.value)
}

function getStatusCardStyle(card) {
  return {
    '--stat-card-accent': card.hex,
    '--stat-card-hover-bg': card.bg,
  }
}

function getStatusCardTooltip(card) {
  if (isStatusCardActive(card)) {
    return card.filterValue ? 'Click to clear this status filter' : 'Showing all employees'
  }
  return card.filterValue ? `Filter by ${card.label}` : 'Show all employees'
}

function clearStatusFilter() {
  if (!activeStatusFilter.value) return
  activeStatusFilter.value = ''
  fetchEmployees(1)
}

function applyStatusFilter(status) {
  const normalizedStatus = normalizeStatus(status)
  activeStatusFilter.value = normalizedStatus === activeStatusFilter.value ? '' : normalizedStatus
  fetchEmployees(1)
}

function requiredRule(label) {
  return (value) => !!String(value ?? '').trim() || `${label} is required.`
}

function digitsOnlyRule(value) {
  if (!String(value ?? '').trim()) return true
  return /^\d+$/.test(String(value)) || 'Control No must contain digits only.'
}

function nonNegativeNumberRule(value) {
  if (value === null || value === '' || value === undefined) return true
  return Number(value) >= 0 || 'Value must be 0 or greater.'
}

function normalizeControlNo(value) {
  return String(value ?? '').trim()
}

function invalidateEmployeeCollectionCache() {
  fullEmployeeRows.value = []
  fullEmployeeRowsCacheKey.value = ''
}

function buildEmployeeCollectionCacheKey() {
  return JSON.stringify({
    departmentId: adminDepartmentId.value ?? null,
    search: String(search.value || '').trim().toLowerCase(),
  })
}

function prependSyntheticDepartmentHeadRow(sourceRows = []) {
  const rows = Array.isArray(sourceRows) ? [...sourceRows] : []
  const headRow = buildSyntheticDepartmentHeadRow()

  if (!headRow) return rows

  const exists = rows.some((row) => normalizeControlNo(row?.control_no) === normalizeControlNo(headRow.control_no))
  if (exists) return rows

  return [headRow, ...rows]
}

function buildClientFilteredRows(sourceRows = []) {
  return prependSyntheticDepartmentHeadRow(sourceRows)
    .filter((row) => matchesEmployeeSearch(row))
    .filter((row) => matchesStatusFilter(row?.status))
}

function paginateClientRows(sourceRows = [], page = 1, rowsPerPage = 10) {
  const rows = Array.isArray(sourceRows) ? sourceRows : []
  const perPage = Number(rowsPerPage)

  if (!Number.isFinite(perPage) || perPage <= 0) {
    return rows
  }

  const currentPage = Math.max(1, parseInt(page, 10) || 1)
  const start = (currentPage - 1) * perPage
  return rows.slice(start, start + perPage)
}

function buildSyntheticDepartmentHeadRow() {
  const controlNo = normalizeControlNo(departmentHeadForm.value.control_no)
  if (!controlNo) return null

  return {
    control_no: controlNo,
    surname: String(departmentHeadForm.value.surname || '').trim(),
    firstname: String(departmentHeadForm.value.firstname || '').trim(),
    middlename: String(departmentHeadForm.value.middlename || '').trim() || null,
    status: String(departmentHeadForm.value.status || 'REGULAR').trim().toUpperCase(),
    designation: String(departmentHeadForm.value.designation || '').trim() || null,
    office: adminDepartmentName.value,
    rate_mon: departmentHeadForm.value.rate_mon ?? null,
    is_department_head_record: true,
  }
}

function isDepartmentHeadRecord(row) {
  return row?.is_department_head_record === true
}

function statusBadgeColor(status) {
  if (!status) return 'grey'
  const colorMap = {
    REGULAR: 'green',
    'CO-TERMINOUS': 'blue',
    ELECTIVE: 'amber',
    CASUAL: 'orange',
    CONTRACTUAL: 'brown-7',
  }
  return colorMap[status] ?? 'blue'
}

function formatResponsiveStatusLabel(status) {
  const normalizedStatus = normalizeStatus(status)
  if (!normalizedStatus) return '-'
  return $q.screen.lt.sm ? normalizedStatus.charAt(0) : normalizedStatus
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function resetForm() {
  employeeForm.value = createDefaultEmployeeForm()
}

function resetDepartmentHeadForm() {
  departmentHeadId.value = null
  departmentHeadDialogMode.value = 'add'
  departmentHeadForm.value = createDefaultDepartmentHeadForm()
}

function applyDepartmentHeadState(head) {
  const normalizedHead = head && typeof head === 'object' ? head : null
  const legacyName = String(normalizedHead?.full_name || '').trim()

  departmentHeadId.value = normalizedHead?.id || null
  departmentHeadForm.value = normalizedHead
    ? {
      control_no: normalizedHead.control_no || '',
      surname: normalizedHead.surname || legacyName,
      firstname: normalizedHead.firstname || '',
      middlename: normalizedHead.middlename || '',
      status: normalizedHead.status || 'REGULAR',
      designation: normalizedHead.designation || normalizedHead.position || '',
      rate_mon: normalizedHead.rate_mon ?? null,
    }
    : createDefaultDepartmentHeadForm()
}

function buildDepartmentHeadPayloadFromEmployee(employee) {
  return {
    control_no: String(employee?.control_no || '').trim(),
    surname: String(employee?.surname || '').trim(),
    firstname: String(employee?.firstname || '').trim(),
    middlename: toNullableString(employee?.middlename),
    status: String(employee?.status || 'REGULAR').trim().toUpperCase(),
    designation: toNullableString(employee?.designation),
    rate_mon: toNullableNumber(employee?.rate_mon),
  }
}

function confirmAssignDepartmentHead(employee) {
  if (!employee) return

  if (!adminDepartmentId.value) {
    $q.notify({ type: 'warning', message: 'Your account has no department assignment yet.' })
    return
  }

  if (isDepartmentHeadRecord(employee)) {
    $q.notify({
      type: 'info',
      message: 'This employee is already assigned as department head.',
      position: 'top',
    })
    return
  }

  const nextPayload = buildDepartmentHeadPayloadFromEmployee(employee)
  const currentHeadControlNo = normalizeControlNo(departmentHeadForm.value.control_no)
  const nextControlNo = normalizeControlNo(nextPayload.control_no)
  const isReassigning = !!departmentHeadId.value && currentHeadControlNo !== '' && currentHeadControlNo !== nextControlNo
  const employeeName = `${nextPayload.firstname} ${nextPayload.surname}`.trim() || nextPayload.control_no
  const currentHeadName = `${departmentHeadForm.value.firstname || ''} ${departmentHeadForm.value.surname || ''}`.trim()
    || currentHeadControlNo

  $q.dialog({
    title: isReassigning ? 'Reassign Department Head' : 'Assign Department Head',
    message: isReassigning
      ? `Assign ${employeeName} as department head and replace ${currentHeadName}?`
      : `Assign ${employeeName} as department head?`,
    cancel: true,
    persistent: true,
    ok: {
      color: 'secondary',
      label: isReassigning ? 'Reassign' : 'Assign',
      noCaps: true,
    },
    cancelProps: {
      flat: true,
      noCaps: true,
      color: 'grey-7',
      label: 'Cancel',
    },
  }).onOk(async () => {
    savingDepartmentHead.value = true
    try {
      if (departmentHeadId.value) {
        await api.put('/admin/department-head', nextPayload)
      } else {
        await api.post('/admin/department-head', nextPayload)
      }

      $q.notify({
        type: 'positive',
        message: isReassigning
          ? 'Department head reassigned successfully.'
          : 'Department head assigned successfully.',
        position: 'top',
      })
      invalidateEmployeeCollectionCache()
      await fetchEmployees(1)
    } catch (err) {
      const msg = resolveApiErrorMessage(err, 'Unable to assign department head right now.')
      $q.notify({
        type: 'negative',
        message: msg,
        position: 'top',
        caption: err.response ? `HTTP ${err.response.status}` : 'Network error',
      })
    } finally {
      savingDepartmentHead.value = false
    }
  })
}

function openCreateDialog() {
  if (!adminDepartmentId.value) {
    $q.notify({ type: 'warning', message: 'Your account has no department assignment yet.' })
    return
  }

  isEditMode.value = false
  resetForm()
  showFormDialog.value = true
}

function openEditDialog(employee) {
  if (!employee) return

  if (isDepartmentHeadRecord(employee)) {
    departmentHeadDialogMode.value = 'edit'
    showDepartmentHeadDialog.value = true
    return
  }

  isEditMode.value = true
  employeeForm.value = {
    control_no: employee.control_no || '',
    surname: employee.surname || '',
    firstname: employee.firstname || '',
    middlename: employee.middlename || '',
    status: employee.status || 'REGULAR',
    designation: employee.designation || '',
    rate_mon: employee.rate_mon ?? null,
  }
  showFormDialog.value = true
}

function toNullableString(value) {
  const text = String(value ?? '').trim()
  return text || null
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function buildEmployeePayload() {
  const payload = {
    surname: String(employeeForm.value.surname || '').trim(),
    firstname: String(employeeForm.value.firstname || '').trim(),
    middlename: toNullableString(employeeForm.value.middlename),
    status: String(employeeForm.value.status || '').trim().toUpperCase(),
    designation: toNullableString(employeeForm.value.designation),
    rate_mon: toNullableNumber(employeeForm.value.rate_mon),
  }

  if (!isEditMode.value) {
    payload.control_no = String(employeeForm.value.control_no || '').trim()
  }

  return payload
}

function buildDepartmentHeadPayload() {
  return {
    control_no: String(departmentHeadForm.value.control_no || '').trim(),
    surname: String(departmentHeadForm.value.surname || '').trim(),
    firstname: String(departmentHeadForm.value.firstname || '').trim(),
    middlename: toNullableString(departmentHeadForm.value.middlename),
    status: String(departmentHeadForm.value.status || '').trim().toUpperCase(),
    designation: toNullableString(departmentHeadForm.value.designation),
    rate_mon: toNullableNumber(departmentHeadForm.value.rate_mon),
  }
}

async function saveDepartmentHead() {
  const valid = await departmentHeadFormRef.value?.validate?.()
  if (!valid) return

  if (!adminDepartmentId.value) {
    $q.notify({ type: 'warning', message: 'Your account has no department assignment yet.' })
    return
  }

  const payload = buildDepartmentHeadPayload()

  savingDepartmentHead.value = true
  try {
    if (departmentHeadDialogMode.value === 'edit') {
      await api.put('/admin/department-head', payload)
      $q.notify({ type: 'positive', message: 'Department head updated successfully.' })
    } else {
      await api.post('/admin/department-head', payload)
      $q.notify({ type: 'positive', message: 'Department head added successfully.' })
    }
    invalidateEmployeeCollectionCache()
    await fetchEmployees(1)
    showDepartmentHeadDialog.value = false
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save department head right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
      caption: err.response ? `HTTP ${err.response.status}` : 'Network error',
    })
  } finally {
    savingDepartmentHead.value = false
  }
}

async function saveEmployee() {
  const valid = await formRef.value?.validate?.()
  if (!valid) return

  submitting.value = true
  try {
    const payload = buildEmployeePayload()

    if (isEditMode.value) {
      await api.put(`/admin/employees/${encodeURIComponent(employeeForm.value.control_no)}`, payload)
      $q.notify({ type: 'positive', message: 'Employee updated successfully.' })
    } else {
      await api.post('/admin/employees', payload)
      $q.notify({ type: 'positive', message: 'Employee added successfully.' })
    }

    showFormDialog.value = false
    invalidateEmployeeCollectionCache()
    await fetchEmployees(1)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save employee right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
      caption: err.response ? `HTTP ${err.response.status}` : 'Network error',
    })
  } finally {
    submitting.value = false
  }
}

function confirmDelete(employee) {
  if (!employee) return

  if (isDepartmentHeadRecord(employee)) {
    const headName = `${employee.firstname || ''} ${employee.surname || ''}`.trim() || employee.control_no
    $q.dialog({
      title: 'Remove Department Head',
      message: `Remove ${headName} as department head?`,
      cancel: true,
      persistent: true,
      ok: {
        color: 'negative',
        label: 'Remove',
        noCaps: true,
      },
      cancelProps: {
        flat: true,
        noCaps: true,
        color: 'grey-7',
        label: 'Cancel',
      },
    }).onOk(async () => {
      try {
        await api.delete('/admin/department-head')
        $q.notify({ type: 'positive', message: 'Department head removed successfully.' })
        invalidateEmployeeCollectionCache()
        await fetchEmployees(1)
      } catch (err) {
        const msg = resolveApiErrorMessage(err, 'Unable to remove department head right now.')
        $q.notify({ type: 'negative', message: msg, position: 'top' })
      }
    })
    return
  }

  const name = `${employee.firstname || ''} ${employee.surname || ''}`.trim() || employee.control_no
  $q.dialog({
    title: 'Delete Employee',
    message: `Delete ${name}? This action cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: {
      color: 'negative',
      label: 'Delete',
      noCaps: true,
    },
    cancelProps: {
      flat: true,
      noCaps: true,
      color: 'grey-7',
      label: 'Cancel',
    },
  }).onOk(async () => {
    try {
      await api.delete(`/admin/employees/${encodeURIComponent(employee.control_no)}`)
      $q.notify({ type: 'positive', message: 'Employee deleted successfully.' })
      invalidateEmployeeCollectionCache()
      await fetchEmployees(1)
    } catch (err) {
      const msg = resolveApiErrorMessage(err, 'Unable to delete employee right now.')
      $q.notify({ type: 'negative', message: msg, position: 'top' })
    }
  })
}

async function fetchEmployeeCollection(baseParams = {}) {
  const collectedRows = []
  let page = 1
  let lastPage = 1

  do {
    const { data } = await api.get('/employees', {
      params: {
        ...baseParams,
        per_page: 100,
        page,
      },
    })

    const pageData = data?.employees ?? {}
    const pageRows = Array.isArray(pageData?.data) ? pageData.data : []
    collectedRows.push(...pageRows)

    const currentPage = Number(pageData?.current_page ?? page)
    const resolvedLastPage = Number(pageData?.last_page ?? currentPage)
    lastPage = Number.isFinite(resolvedLastPage) && resolvedLastPage > 0 ? resolvedLastPage : currentPage
    page = currentPage + 1
  } while (page <= lastPage)

  return collectedRows
}

async function fetchEmployees(page = 1) {
  if (!adminDepartmentId.value) {
    employees.value = []
    invalidateEmployeeCollectionCache()
    totalEmployees.value = 0
    statusCounts.value = {}
    pagination.value.rowsNumber = 0
    resetDepartmentHeadForm()
    return
  }

  loading.value = true
  loadingDepartmentHead.value = true
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  try {
    const baseParams = {
      department_id: adminDepartmentId.value,
      search: search.value || undefined,
    }

    if (activeStatusFilter.value) {
      const collectionCacheKey = buildEmployeeCollectionCacheKey()
      const needsCollectionRefresh = fullEmployeeRowsCacheKey.value !== collectionCacheKey

      const summaryRequest = api.get('/employees', {
        params: {
          ...baseParams,
          per_page: 1,
          page: 1,
        },
      }).catch(() => null)

      const collectionRequest = needsCollectionRefresh
        ? fetchEmployeeCollection(baseParams)
        : Promise.resolve(fullEmployeeRows.value)

      const [summaryResponse, collectionRows] = await Promise.all([summaryRequest, collectionRequest])

      if (needsCollectionRefresh) {
        fullEmployeeRows.value = Array.isArray(collectionRows) ? collectionRows : []
        fullEmployeeRowsCacheKey.value = collectionCacheKey
      }

      const filteredRows = buildClientFilteredRows(fullEmployeeRows.value)
      const summaryData = summaryResponse?.data ?? {}
      const perPage = Number(pagination.value.rowsPerPage)
      const maxPage = Number.isFinite(perPage) && perPage > 0
        ? Math.max(1, Math.ceil(filteredRows.length / perPage))
        : 1

      employees.value = []
      pagination.value.page = Math.min(pageNum, maxPage)
      pagination.value.rowsNumber = filteredRows.length
      totalEmployees.value = summaryData.total_employees ?? prependSyntheticDepartmentHeadRow(fullEmployeeRows.value).length
      statusCounts.value = summaryData.status_counts ?? countStatusRows(fullEmployeeRows.value)
      applyDepartmentHeadState(summaryData.department_head ?? null)
      return
    }

    const tableRequest = api.get('/employees', {
      params: {
        ...baseParams,
        status: activeStatusFilter.value || undefined,
        per_page: pagination.value.rowsPerPage,
        page: pageNum,
      },
    })
    const summaryRequest = activeStatusFilter.value
      ? api.get('/employees', {
        params: {
          ...baseParams,
          per_page: 1,
          page: 1,
        },
      }).catch(() => null)
      : Promise.resolve(null)

    const [tableResponse, summaryResponse] = await Promise.all([tableRequest, summaryRequest])
    const data = tableResponse?.data ?? {}
    const summaryData = summaryResponse?.data ?? data

    invalidateEmployeeCollectionCache()
    employees.value = data.employees?.data ?? []
    totalEmployees.value = summaryData.total_employees ?? 0
    statusCounts.value = summaryData.status_counts ?? {}
    pagination.value.page = data.employees?.current_page ?? 1
    pagination.value.rowsNumber = data.employees?.total ?? 0
    applyDepartmentHeadState(data.department_head ?? summaryData.department_head ?? null)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load employee records right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
      caption: err.response ? `HTTP ${err.response.status}` : 'Network error',
    })
    employees.value = []
    invalidateEmployeeCollectionCache()
    totalEmployees.value = 0
    statusCounts.value = {}
    pagination.value.rowsNumber = 0
    resetDepartmentHeadForm()
  } finally {
    loading.value = false
    loadingDepartmentHead.value = false
  }
}

function onRequest(props) {
  pagination.value.rowsPerPage = props.pagination.rowsPerPage
  const page = Math.max(1, parseInt(props.pagination.page, 10) || 1)
  fetchEmployees(page)
}

function viewEmployee(employee) {
  selectedEmployee.value = employee
  showViewDialog.value = true
}

function reassignDepartmentHeadFromView() {
  if (!selectedEmployee.value || isDepartmentHeadRecord(selectedEmployee.value)) return
  showViewDialog.value = false
  confirmAssignDepartmentHead(selectedEmployee.value)
}

function applyLeaveFor(employee) {
  if (!employee) return
  applyLeaveEmployee.value = employee
  applyLeaveDialogKey.value += 1
  showApplyLeaveDialog.value = true
}

function closeApplyLeaveDialog() {
  showApplyLeaveDialog.value = false
}

function handleApplyLeaveSubmitted() {
  showApplyLeaveDialog.value = false
}

watch(adminDepartmentId, (id) => {
  if (id) {
    invalidateEmployeeCollectionCache()
    fetchEmployees(1)
  } else {
    employees.value = []
    invalidateEmployeeCollectionCache()
    totalEmployees.value = 0
    statusCounts.value = {}
    pagination.value.rowsNumber = 0
    resetDepartmentHeadForm()
  }
}, { immediate: true })
</script>

<style scoped>
.dialog-card {
  display: flex;
  flex-direction: column;
}

.stat-card {
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.stat-card:hover {
  background-color: var(--stat-card-hover-bg, #f7f9fb) !important;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08), inset 0 0 0 1px var(--stat-card-accent, #d6dde6);
  transform: translateY(-2px);
}

.stat-card--active {
  background-color: var(--stat-card-hover-bg, #f7f9fb) !important;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08), inset 0 0 0 2px var(--stat-card-accent, #2563eb);
  transform: translateY(-1px);
}

.stat-icon {
  flex-shrink: 0;
}

.status-card__section {
  padding: 10px 12px;
}

.status-card__content {
  min-height: 30px;
}

.status-card__label {
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 72%;
}

.status-card__value {
  margin-left: auto;
  line-height: 1;
}

.employee-records-search {
  min-width: 240px;
}

.employee-name {
  font-size: 1rem;
  line-height: 1.2;
  font-weight: 600;
}

.employee-designation {
  font-size: 0.75rem;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

.employee-view-actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.employee-view-actions__btn {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
}

.employee-view-actions__btn :deep(.q-btn__content) {
  justify-content: center;
}

.apply-leave-dialog-card {
  width: min(1280px, 96vw);
  max-width: none;
  max-height: calc(100vh - 24px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.apply-leave-dialog-header {
  min-height: 56px;
  padding: 0 10px 0 14px;
  position: sticky;
  top: 0;
  z-index: 3;
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
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

@media (max-width: 600px) {
  .admin-employees-page {
    padding-top: calc(env(safe-area-inset-top, 0px) + 8px) !important;
    padding-right: calc(env(safe-area-inset-right, 0px) + 10px) !important;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px) !important;
    padding-left: calc(env(safe-area-inset-left, 0px) + 10px) !important;
  }

  .admin-employees-title {
    font-size: 2rem;
    line-height: 1.05;
  }

  .admin-employees-header {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .admin-employees-title {
    width: 100%;
  }

  .admin-employees-spacer {
    display: none;
  }

  .admin-employees-actions {
    width: 100%;
    justify-content: flex-start;
    margin-top: 8px;
  }

  .add-employee-btn {
    min-height: 34px;
    padding: 0 10px;
    font-size: 0.86rem;
  }

  .status-cards-row {
    margin-bottom: 8px !important;
    margin-top: 2px;
  }

  .status-cards-row__item {
    padding-left: 3px !important;
    padding-right: 3px !important;
  }

  .status-card__section {
    padding: 6px 8px;
  }

  .status-card__avatar {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    margin-right: 6px !important;
  }

  .status-card__avatar-icon {
    font-size: 14px !important;
  }

  .status-card__label {
    font-size: 0.58rem;
    line-height: 1;
    letter-spacing: 0.03em;
    max-width: 66%;
  }

  .status-card__value {
    font-size: 1.1rem !important;
    line-height: 1;
  }

  .employee-records-card__section {
    padding: 10px 10px 8px;
  }

  .employee-records-toolbar {
    gap: 6px;
    align-items: flex-start;
  }

  .employee-records-toolbar > .row {
    min-width: 0;
  }

  .employee-records-search {
    min-width: 0 !important;
    width: 100%;
  }

  .employee-view-actions {
    gap: 6px;
    padding-top: 8px !important;
  }

  .employee-view-actions__btn {
    padding-left: 6px;
    padding-right: 6px;
    font-size: 0.8rem;
  }

  .apply-leave-dialog-card {
    width: min(100vw, 100vw);
    max-height: calc(100vh - 8px);
    border-radius: 10px;
  }

  .apply-leave-dialog :deep(.q-dialog__inner--minimized) {
    padding: 4px;
  }

  .apply-leave-dialog-header {
    min-height: 52px;
    padding: 0 8px 0 10px;
  }
}
</style>
