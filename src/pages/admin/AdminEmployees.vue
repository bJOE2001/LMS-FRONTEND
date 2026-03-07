<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-xs">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Employee Management</h1>
      <q-space />
      <div class="row q-gutter-sm">
        <q-btn
          unelevated
          no-caps
          color="secondary"
          icon="badge"
          label="Add Dept. Head"
          :disable="!adminDepartmentId || loadingDepartmentHead"
          @click="openDepartmentHeadDialog"
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="person_add"
          label="Add Employee"
          :disable="!adminDepartmentId"
          @click="openCreateDialog"
        />
      </div>
    </div>
    <p class="text-grey-7 q-mb-lg">{{ adminDepartmentName }} - Manage your staff and file leave on their behalf</p>

    <div class="row q-col-gutter-md q-mb-lg">
      <div
        v-for="card in statusCards"
        :key="card.label"
        class="col-12 col-sm-6 col-md"
      >
        <q-card class="stat-card bg-white rounded-borders" flat bordered>
          <q-card-section class="q-py-md">
            <div class="row items-center no-wrap">
              <q-avatar
                :style="{ background: card.bg }"
                :text-color="card.color"
                size="44px"
                class="q-mr-md stat-icon"
              >
                <q-icon :name="card.icon" size="22px" :color="card.color" />
              </q-avatar>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium text-uppercase" style="letter-spacing: 0.04em">{{ card.label }}</div>
                <div class="text-h5 text-weight-bold" :style="{ color: card.hex }">{{ card.value }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row justify-between items-center">
          <div class="text-h6">Employee Records</div>
          <q-input
            v-model="search"
            outlined
            dense
            debounce="400"
            placeholder="Search employees..."
            clearable
            style="min-width: 240px"
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
        :columns="columns"
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
                <div class="employee-name text-primary text-left">
                  {{ props.row.surname }}, {{ props.row.firstname }}
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
              :label="props.row.status"
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

        <q-card-actions class="q-pa-md" align="right">
          <q-btn flat no-caps label="Edit" color="orange-8" icon="edit" @click="openEditDialog(selectedEmployee); showViewDialog = false" />
          <q-btn
            unelevated
            no-caps
            label="Apply Leave"
            color="green-8"
            icon="description"
            @click="applyLeaveFor(selectedEmployee); showViewDialog = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDepartmentHeadDialog" persistent>
      <q-card style="width: 95vw; max-width: 760px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ departmentHeadId ? 'Edit Department Head' : 'Add Department Head' }}</div>
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
              :label="departmentHeadId ? 'Update Dept. Head' : 'Add Dept. Head'"
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
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const search = ref('')
const showViewDialog = ref(false)
const showDepartmentHeadDialog = ref(false)
const showFormDialog = ref(false)
const isEditMode = ref(false)
const submitting = ref(false)
const departmentHeadFormRef = ref(null)
const formRef = ref(null)

const selectedEmployee = ref(null)
const employees = ref([])
const loading = ref(false)
const totalEmployees = ref(0)
const statusCounts = ref({})
const loadingDepartmentHead = ref(false)
const savingDepartmentHead = ref(false)
const departmentHeadId = ref(null)

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

const noDataMessage = computed(() => {
  if (!adminDepartmentId.value) return 'Select or set your department to view employees.'
  return 'No employees found in this department.'
})
const tableRows = computed(() => {
  const rows = Array.isArray(employees.value) ? [...employees.value] : []
  const headRow = buildSyntheticDepartmentHeadRow()
  if (!headRow) return rows

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

const statusCards = computed(() => [
  { label: 'Total Employees', value: totalEmployees.value, icon: 'groups', hex: '#1565c0', color: 'primary', bg: '#e3f2fd' },
  { label: 'Elective', value: statusCounts.value.ELECTIVE || 0, icon: 'how_to_vote', hex: '#f9a825', color: 'amber-9', bg: '#fff8e1' },
  { label: 'Co-terminous', value: statusCounts.value['CO-TERMINOUS'] || 0, icon: 'event_repeat', hex: '#0277bd', color: 'blue-8', bg: '#e1f5fe' },
  { label: 'Regular', value: statusCounts.value.REGULAR || 0, icon: 'verified_user', hex: '#2e7d32', color: 'green-8', bg: '#e8f5e9' },
  { label: 'Casual', value: statusCounts.value.CASUAL || 0, icon: 'person_outline', hex: '#e65100', color: 'orange-9', bg: '#fff3e0' },
  { label: 'Contractual', value: statusCounts.value.CONTRACTUAL || 0, icon: 'badge', hex: '#6d4c41', color: 'brown-7', bg: '#efebe9' },
])

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
  departmentHeadForm.value = createDefaultDepartmentHeadForm()
}

function openDepartmentHeadDialog() {
  if (!adminDepartmentId.value) {
    $q.notify({ type: 'warning', message: 'Your account has no department assignment yet.' })
    return
  }

  showDepartmentHeadDialog.value = true
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

async function fetchDepartmentHead() {
  if (!adminDepartmentId.value) {
    resetDepartmentHeadForm()
    return
  }

  loadingDepartmentHead.value = true
  try {
    const { data } = await api.get('/admin/department-head')
    const head = data.department_head || {}
    const legacyName = String(head.full_name || '').trim()
    departmentHeadId.value = data.department_head?.id || null
    departmentHeadForm.value = {
      control_no: head.control_no || '',
      surname: head.surname || legacyName,
      firstname: head.firstname || '',
      middlename: head.middlename || '',
      status: head.status || 'REGULAR',
      designation: head.designation || head.position || '',
      rate_mon: head.rate_mon ?? null,
    }
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load department head right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
      caption: err.response ? `HTTP ${err.response.status}` : 'Network error',
    })
  } finally {
    loadingDepartmentHead.value = false
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
    await api.put('/admin/department-head', payload)
    $q.notify({ type: 'positive', message: 'Department head saved successfully.' })
    await fetchDepartmentHead()
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
        await fetchDepartmentHead()
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
      await fetchEmployees(1)
    } catch (err) {
      const msg = resolveApiErrorMessage(err, 'Unable to delete employee right now.')
      $q.notify({ type: 'negative', message: msg, position: 'top' })
    }
  })
}

async function fetchEmployees(page = 1) {
  if (!adminDepartmentId.value) {
    employees.value = []
    totalEmployees.value = 0
    statusCounts.value = {}
    pagination.value.rowsNumber = 0
    return
  }

  loading.value = true
  const pageNum = Math.max(1, parseInt(page, 10) || 1)
  try {
    const { data } = await api.get('/employees', {
      params: {
        department_id: adminDepartmentId.value,
        search: search.value || undefined,
        per_page: pagination.value.rowsPerPage,
        page: pageNum,
      },
    })

    employees.value = data.employees?.data ?? []
    totalEmployees.value = data.total_employees ?? 0
    statusCounts.value = data.status_counts ?? {}
    pagination.value.page = data.employees?.current_page ?? 1
    pagination.value.rowsNumber = data.employees?.total ?? 0
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load employee records right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
      caption: err.response ? `HTTP ${err.response.status}` : 'Network error',
    })
    employees.value = []
    totalEmployees.value = 0
    statusCounts.value = {}
    pagination.value.rowsNumber = 0
  } finally {
    loading.value = false
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

function applyLeaveFor(employee) {
  if (!employee) return
  router.push({
    path: '/admin/apply-on-behalf',
    query: {
      department: employee.office,
      lastName: employee.surname,
      firstName: employee.firstname,
      position: employee.designation,
      empId: employee.control_no,
    },
  })
}

watch(adminDepartmentId, (id) => {
  if (id) {
    fetchEmployees(1)
    fetchDepartmentHead()
  } else {
    employees.value = []
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
  transition: box-shadow 0.2s, transform 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.stat-icon {
  flex-shrink: 0;
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
</style>
