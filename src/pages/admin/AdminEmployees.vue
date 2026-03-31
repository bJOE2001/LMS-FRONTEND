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
              <div class="text-h6 text-weight-bold status-card__value q-ml-auto" :style="{ color: card.hex }">
                <q-spinner v-if="loading" size="28px" :color="card.color" />
                <template v-else>{{ card.value }}</template>
              </div>
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
        class="employee-records-table"
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
                  <q-badge
                    v-if="isDepartmentReassigned(props.row)"
                    color="blue-7"
                    text-color="white"
                    label="LMS Assigned"
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
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                size="sm"
                :disable="!isDepartmentReassigned(props.row)"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>{{
                  isDepartmentReassigned(props.row)
                    ? 'Remove from this department'
                    : 'Only LMS-assigned employees can be removed'
                }}</q-tooltip>
              </q-btn>
              <q-btn flat dense round icon="description" color="green-8" size="sm" @click="applyLeaveFor(props.row)">
                <q-tooltip>Apply Leave</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <template v-if="loading">
              <q-spinner color="primary" size="40px" />
              <div class="text-grey-6 q-mt-sm">Loading employees...</div>
            </template>
            <template v-else>
              <q-icon name="search_off" size="48px" color="grey-5" />
              <div class="text-grey-6 q-mt-sm">{{ noDataMessage }}</div>
            </template>
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

    <q-dialog v-model="showViewDialog" persistent class="employee-view-dialog">
      <q-card class="rounded-borders dialog-card employee-view-dialog-card">
        <q-card-section class="row items-center q-pb-none employee-view-dialog-header">
          <div class="row items-center no-wrap q-gutter-sm employee-view-dialog-header-main">
            <div class="text-h6">Employee Details</div>
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedEmployee" class="employee-view-dialog-body">
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
              <div class="text-caption text-grey-6">Office</div>
              <div class="text-caption text-grey-6">Office</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.office || '-' }}</div>
            </div>
            <div
              v-if="selectedEmployee.hris_office && selectedEmployee.hris_office !== selectedEmployee.office"
              class="col-12"
            >
              <div class="text-caption text-grey-6">HRIS Main Office</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.hris_office }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Rate / Month</div>
              <div class="text-body2 text-weight-medium">{{ formatMoney(selectedEmployee.rate_mon) }}</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="q-pa-md employee-view-actions employee-view-dialog-actions" align="right">
          <q-btn
            flat
            dense
            no-caps
            :label="departmentHeadActionLabel"
            color="secondary"
            :icon="departmentHeadActionIcon"
            class="employee-view-actions__btn"
            :disable="!selectedEmployee || loadingDepartmentHead || savingDepartmentHead || isDepartmentHeadRecord(selectedEmployee)"
            @click="reassignDepartmentHeadFromView"
          />
          <q-btn
            unelevated
            dense
            no-caps
            label="Apply Leave"
            color="green-8"
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
          <div class="text-h6">Add Employee</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="submitting" v-close-popup />
        </q-card-section>

        <q-form ref="formRef" @submit.prevent="saveEmployee">
          <q-card-section class="q-pt-sm">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-select
                  v-model="selectedEmployeeOption"
                  :options="employeePickerOptions"
                  outlined
                  dense
                  use-input
                  fill-input
                  hide-selected
                  clearable
                  input-debounce="250"
                  label="Select Employee *"
                  option-label="label"
                  :loading="employeePickerLoading"
                  :rules="[() => !!employeeForm.control_no || 'Employee is required.']"
                  @filter="filterEmployeeOptions"
                  @popup-show="handleEmployeePickerPopupShow"
                  @update:model-value="handleSelectedEmployeeOption"
                  @clear="clearSelectedEmployeeOption"
                >
                  <template #option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label>{{ scope.opt.full_name || scope.opt.label }}</q-item-label>
                        <q-item-label caption>
                          {{ scope.opt.designation || '-' }} • {{ scope.opt.office_acronym || '-' }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.control_no" outlined dense label="Control No" readonly />
              </div>
              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.status" outlined dense label="Status" readonly />
              </div>
              <div class="col-12 col-md-4">
                <q-input :model-value="adminDepartmentName" outlined dense label="Assign To Department" readonly />
              </div>

              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.surname" outlined dense label="Surname" readonly />
              </div>
              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.firstname" outlined dense label="Firstname" readonly />
              </div>
              <div class="col-12 col-md-4">
                <q-input v-model="employeeForm.middlename" outlined dense label="Middlename" readonly />
              </div>

              <div class="col-12 col-md-6">
                <q-input v-model="employeeForm.designation" outlined dense label="Designation" readonly />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  :model-value="formatMoney(employeeForm.rate_mon)"
                  outlined
                  dense
                  label="Rate / Month"
                  readonly
                />
              </div>

              <div class="col-12 col-md-6">
                <q-input v-model="employeeForm.office" outlined dense label="Employee Current Office" readonly />
              </div>
              <div
                v-if="employeeForm.hris_office && employeeForm.hris_office !== employeeForm.office"
                class="col-12 col-md-6"
              >
                <q-input v-model="employeeForm.hris_office" outlined dense label="HRIS Main Office" readonly />
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="submitting" v-close-popup />
            <q-btn
              unelevated
              no-caps
              label="Add Employee"
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
const submitting = ref(false)
const departmentHeadFormRef = ref(null)
const formRef = ref(null)
const selectedEmployeeOption = ref(null)
const employeePickerOptions = ref([])
const employeePickerLoading = ref(false)
let employeePickerRequestId = 0

const DEPARTMENT_STOP_WORDS = new Set([
  'OF',
  'THE',
  'AND',
  'CITY',
  'OFFICE',
  'FOR',
  'ON',
  'AT',
  'TO',
  'IN',
  'MANAGEMENT',
])

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
  sortBy: null,
  descending: false,
})

const createDefaultEmployeeForm = () => ({
  control_no: '',
  surname: '',
  firstname: '',
  middlename: '',
  status: 'REGULAR',
  designation: '',
  rate_mon: null,
  office: '',
  hris_office: '',
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
const hasAssignedDepartmentHead = computed(() =>
  !!departmentHeadId.value && normalizeControlNo(departmentHeadForm.value.control_no) !== '',
)
const departmentHeadActionLabel = computed(() =>
  hasAssignedDepartmentHead.value ? 'Reassign' : 'Assign',
)
const departmentHeadActionIcon = computed(() =>
  hasAssignedDepartmentHead.value ? 'badge' : 'person_add',
)

const noDataMessage = computed(() => {
  if (!adminDepartmentId.value) return 'Select or set your department to view employees.'
  return 'No employees found in this department.'
})

const useClientSideRows = computed(() => !!activeStatusFilter.value || !!pagination.value.sortBy)

const tableRows = computed(() => {
  if (useClientSideRows.value) {
    return paginateClientRows(
      buildClientPreparedRows(fullEmployeeRows.value),
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
  { key: 'ELECTIVE', label: 'Elective', value: statusCounts.value.ELECTIVE || 0, filterValue: 'ELECTIVE', icon: 'how_to_vote', hex: '#8e24aa', color: 'purple-8', bg: '#f3e5f5' },
  { key: 'CO-TERMINOUS', label: 'Co-terminous', value: statusCounts.value['CO-TERMINOUS'] || 0, filterValue: 'CO-TERMINOUS', icon: 'event_repeat', hex: '#6d4c41', color: 'brown-7', bg: '#efebe9' },
  { key: 'REGULAR', label: 'Regular', value: statusCounts.value.REGULAR || 0, filterValue: 'REGULAR', icon: 'verified_user', hex: '#2e7d32', color: 'green-8', bg: '#e8f5e9' },
  { key: 'CASUAL', label: 'Casual', value: statusCounts.value.CASUAL || 0, filterValue: 'CASUAL', icon: 'person_outline', hex: '#e65100', color: 'orange-9', bg: '#fff3e0' },
  { key: 'CONTRACTUAL', label: 'Contractual', value: statusCounts.value.CONTRACTUAL || 0, filterValue: 'CONTRACTUAL', icon: 'badge', hex: '#0d47a1', color: 'blue-9', bg: '#e3f2fd' },
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

function resolveEmployeeSortValue(row, sortBy) {
  if (!row) return ''

  if (sortBy === 'control_no') {
    return normalizeControlNo(row.control_no)
  }

  if (sortBy === 'name') {
    return [
      String(row.surname || '').trim(),
      String(row.firstname || '').trim(),
      String(row.middlename || '').trim(),
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (sortBy === 'status') {
    return normalizeStatus(row.status)
  }

  return ''
}

function compareEmployeeRows(leftRow, rightRow, sortBy) {
  const leftValue = resolveEmployeeSortValue(leftRow, sortBy)
  const rightValue = resolveEmployeeSortValue(rightRow, sortBy)

  const primaryComparison = String(leftValue).localeCompare(String(rightValue), undefined, {
    numeric: true,
    sensitivity: 'base',
  })

  if (primaryComparison !== 0) return primaryComparison

  return normalizeControlNo(leftRow?.control_no).localeCompare(normalizeControlNo(rightRow?.control_no), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function sortEmployeeRows(sourceRows = []) {
  const rows = Array.isArray(sourceRows) ? [...sourceRows] : []
  const sortBy = pagination.value.sortBy

  if (!sortBy) return rows

  const sortedRows = rows.sort((leftRow, rightRow) => compareEmployeeRows(leftRow, rightRow, sortBy))
  return pagination.value.descending ? sortedRows.reverse() : sortedRows
}

function buildClientPreparedRows(sourceRows = []) {
  return sortEmployeeRows(buildClientFilteredRows(sourceRows))
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
  const normalizedStatus = normalizeStatus(status)
  if (!normalizedStatus) return 'grey'
  const colorMap = {
    REGULAR: 'green',
    'CO-TERMINOUS': 'brown-7',
    ELECTIVE: 'purple-8',
    CASUAL: 'orange',
    CONTRACTUAL: 'blue-9',
  }
  return colorMap[normalizedStatus] ?? 'blue-9'
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
  selectedEmployeeOption.value = null
  employeePickerOptions.value = []
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

  resetForm()
  showFormDialog.value = true
  fetchEmployeePickerOptions('', true)
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

function isDepartmentReassigned(employee) {
  return employee?.is_department_reassigned === true
}

function toOfficeAcronym(value) {
  const source = String(value || '').trim()
  if (!source) return ''

  const words = source
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean)

  if (!words.length) return source

  const acronymWords = words.filter(
    (word) => !DEPARTMENT_STOP_WORDS.has(word) && !/^\d+$/.test(word),
  )
  const selectedWords = acronymWords.length ? acronymWords : words
  const acronym = selectedWords.map((word) => word[0]).join('')

  return acronym || source.toUpperCase()
}

function toEmployeePickerOption(employee) {
  if (!employee || typeof employee !== 'object') return null

  const surname = String(employee.surname || '').trim()
  const firstname = String(employee.firstname || '').trim()
  const middlename = String(employee.middlename || '').trim()
  const controlNo = String(employee.control_no || '').trim()
  const currentOffice = String(employee.office || '').trim()
  const hrisOffice = String(employee.hris_office || employee.office || '').trim()
  const designation = String(employee.designation || '').trim()
  const fullName = [surname, firstname, middlename].filter(Boolean).join(', ').replace(', ,', ',')

  return {
    ...employee,
    label: fullName || controlNo,
    full_name: fullName || controlNo,
    control_no: controlNo,
    surname,
    firstname,
    middlename,
    designation,
    office: currentOffice,
    hris_office: hrisOffice,
    office_acronym: toOfficeAcronym(currentOffice || hrisOffice),
  }
}

function applySelectedEmployeeToForm(employee) {
  if (!employee) {
    employeeForm.value = createDefaultEmployeeForm()
    return
  }

  employeeForm.value = {
    control_no: employee.control_no || '',
    surname: employee.surname || '',
    firstname: employee.firstname || '',
    middlename: employee.middlename || '',
    status: employee.status || '',
    designation: employee.designation || '',
    rate_mon: employee.rate_mon ?? null,
    office: employee.office || '',
    hris_office: employee.hris_office || employee.office || '',
  }
}

async function fetchEmployeePickerOptions(searchTerm = '', force = false) {
  if (!adminDepartmentId.value) return
  if (!force && employeePickerLoading.value) return

  const requestId = ++employeePickerRequestId
  employeePickerLoading.value = true

  try {
    const { data } = await api.get('/admin/employee-options', {
      params: {
        search: String(searchTerm || '').trim(),
        limit: 20,
      },
    })

    if (requestId !== employeePickerRequestId) return

    employeePickerOptions.value = Array.isArray(data?.employees)
      ? data.employees.map((employee) => toEmployeePickerOption(employee)).filter(Boolean)
      : []
  } catch (err) {
    if (requestId !== employeePickerRequestId) return
    employeePickerOptions.value = []
    const msg = resolveApiErrorMessage(err, 'Unable to load employees right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
      caption: err.response ? `HTTP ${err.response.status}` : 'Network error',
    })
  } finally {
    if (requestId === employeePickerRequestId) {
      employeePickerLoading.value = false
    }
  }
}

function filterEmployeeOptions(value, update) {
  update(async () => {
    await fetchEmployeePickerOptions(value, true)
  })
}

function handleSelectedEmployeeOption(option) {
  applySelectedEmployeeToForm(option)
}

function clearSelectedEmployeeOption() {
  selectedEmployeeOption.value = null
  applySelectedEmployeeToForm(null)
}

function handleEmployeePickerPopupShow() {
  if (employeePickerOptions.value.length > 0) return
  fetchEmployeePickerOptions('', true)
}

function buildEmployeePayload() {
  return {
    control_no: String(employeeForm.value.control_no || '').trim(),
  }
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
    const { data } = await api.post('/admin/employees', payload)
    $q.notify({
      type: 'positive',
      message: data?.message || 'Employee added successfully.',
      position: 'top',
    })

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

  if (!isDepartmentReassigned(employee)) {
    $q.notify({
      type: 'info',
      message: 'Original HRIS employees cannot be removed here. Only LMS-assigned employees can be removed from this department.',
      position: 'top',
    })
    return
  }

  const name = `${employee.firstname || ''} ${employee.surname || ''}`.trim() || employee.control_no
  $q.dialog({
    title: 'Remove Employee',
    message: `Remove ${name} from this department? The employee's main HRIS office will stay unchanged.`,
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
      await api.delete(`/admin/employees/${encodeURIComponent(employee.control_no)}`)
      $q.notify({ type: 'positive', message: 'Employee removed from this department successfully.', position: 'top' })
      invalidateEmployeeCollectionCache()
      await fetchEmployees(1)
    } catch (err) {
      const msg = resolveApiErrorMessage(err, 'Unable to remove employee from this department right now.')
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

    if (useClientSideRows.value) {
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

      const filteredRows = buildClientPreparedRows(fullEmployeeRows.value)
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
  const nextSortBy = props.pagination.sortBy || null
  const nextDescending = !!props.pagination.descending
  const sortChanged =
    pagination.value.sortBy !== nextSortBy || pagination.value.descending !== nextDescending

  pagination.value.rowsPerPage = props.pagination.rowsPerPage
  pagination.value.sortBy = nextSortBy
  pagination.value.descending = nextDescending

  const page = sortChanged
    ? 1
    : Math.max(1, parseInt(props.pagination.page, 10) || 1)
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
  border-color: #d9dee7;
  transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.stat-card:hover {
  background-color: var(--stat-card-hover-bg, #f7f9fb) !important;
  border-color: var(--stat-card-accent, #d6dde6) !important;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08), inset 0 0 0 1px var(--stat-card-accent, #d6dde6);
  transform: translateY(-2px);
}

.stat-card--active {
  background-color: var(--stat-card-hover-bg, #f7f9fb) !important;
  border-color: var(--stat-card-accent, #2563eb) !important;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.1), inset 0 0 0 2px var(--stat-card-accent, #2563eb);
  transform: translateY(-1px);
}

.stat-card--active .status-card__label {
  color: var(--stat-card-accent, #2563eb) !important;
}

.stat-card--active .status-card__value {
  transform: scale(1.03);
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

.employee-records-table :deep(.q-table__middle) {
  overflow-x: auto;
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

.employee-view-dialog-card {
  width: min(90vw, 520px);
  max-width: 520px;
  max-height: calc(100vh - 24px);
  overflow: hidden;
}

.employee-view-dialog-header {
  flex: 0 0 auto;
  padding: 16px 16px 0;
}

.employee-view-dialog-header-main {
  min-width: 0;
}

.employee-view-dialog-edit-btn {
  flex-shrink: 0;
}

.employee-view-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.employee-view-actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.employee-view-dialog-actions {
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #fff;
  padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px);
}

.employee-view-actions__btn {
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
}

.employee-view-actions__btn :deep(.q-btn__content) {
  justify-content: center;
  flex-wrap: nowrap;
  white-space: nowrap;
  gap: 6px;
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

  .employee-records-table :deep(table) {
    min-width: 520px;
  }

  .employee-records-table :deep(th:first-child),
  .employee-records-table :deep(td:first-child) {
    width: 320px;
    min-width: 320px;
  }

  .employee-records-table :deep(th:last-child),
  .employee-records-table :deep(td:last-child) {
    width: 200px;
    min-width: 200px;
  }

  .employee-view-actions {
    gap: 6px;
    padding-top: 8px !important;
  }

  .employee-view-dialog :deep(.q-dialog__inner--minimized) {
    padding: 4px;
  }

  .employee-view-dialog-card {
    width: calc(100vw - 16px);
    max-width: calc(100vw - 16px);
    max-height: calc(100vh - 8px);
    border-radius: 10px;
  }

  .employee-view-dialog-header {
    padding: 12px 12px 0;
  }

  .employee-view-dialog-header-main {
    gap: 6px;
  }

  .employee-view-dialog-edit-btn {
    padding-left: 6px;
    padding-right: 6px;
    font-size: 0.8rem;
  }

  .employee-view-dialog-body {
    padding: 12px;
  }

  .employee-view-dialog-actions {
    padding: 10px 12px calc(env(safe-area-inset-bottom, 0px) + 10px);
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
