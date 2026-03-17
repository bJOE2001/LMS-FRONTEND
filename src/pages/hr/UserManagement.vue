<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <div class="row items-center justify-between q-gutter-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">User Management</h1>
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="business" size="md" color="primary" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Total Departments</div>
                <div class="text-h4 text-primary">{{ totalDepartments }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="verified_user" size="md" color="green-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Assigned Admins</div>
                <div class="text-h4 text-green-8">{{ assignedDepartments }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="person_off" size="md" color="orange-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Unassigned</div>
                <div class="text-h4 text-orange-8">{{ unassignedDepartments }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12">
            <q-input
              v-model="search"
              outlined
              dense
              clearable
              debounce="250"
              label="Search departments or admins"
              placeholder="Department, admin name, username, or employee..."
            >
              <template #prepend>
                <q-icon name="search" color="grey-6" />
              </template>
            </q-input>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="rounded-borders">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="id"
        flat
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.name }}</div>
          </q-td>
        </template>

        <template #body-cell-current_admin="props">
          <q-td :props="props">
            <template v-if="props.row.department_admin">
              <div class="text-weight-medium">{{ props.row.department_admin.full_name }}</div>
              <div class="text-caption text-grey-6">@{{ props.row.department_admin.username }}</div>
            </template>
            <q-badge v-else color="grey-6" label="Unassigned" rounded />
          </q-td>
        </template>

        <template #body-cell-employee="props">
          <q-td :props="props">
            <template v-if="props.row.department_admin?.employee">
              <span>
                {{ props.row.department_admin.employee.designation || '-' }}
              </span>
            </template>
            <span v-else class="text-grey-6">-</span>
          </q-td>
        </template>

        <template #body-cell-employment_status="props">
          <q-td :props="props" class="text-center">
            <template v-if="props.row.department_admin?.employee?.status">
              <q-badge
                :color="statusColor(props.row.department_admin.employee.status)"
                :label="props.row.department_admin.employee.status"
                rounded
              />
            </template>
            <span v-else class="text-grey-6">-</span>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn
              flat
              dense
              round
              :icon="props.row.department_admin ? 'manage_accounts' : 'person_add'"
              color="primary"
              @click="openAssignDialog(props.row)"
            >
              <q-tooltip>
                {{
                  props.row.department_admin
                    ? 'Reassign Department Admin'
                    : 'Assign Department Admin'
                }}
              </q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.department_admin"
              flat
              dense
              round
              icon="delete"
              color="negative"
              :loading="deletingId === props.row.department_admin.id"
              @click="confirmRemove(props.row)"
            >
              <q-tooltip>Remove Department Admin</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <q-icon name="manage_accounts" size="48px" color="grey-5" />
            <div class="text-grey-6 q-mt-sm">No departments found.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showAssignmentDialog" persistent>
      <q-card style="width: 95vw; max-width: 700px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            {{ isEditMode ? 'Reassign Department Admin' : 'Assign Department Admin' }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="saving" v-close-popup />
        </q-card-section>

        <q-form ref="formRef" @submit.prevent="saveAssignment">
          <q-card-section class="q-pt-sm">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  :model-value="selectedDepartment?.name || ''"
                  outlined
                  dense
                  label="Department"
                  readonly
                />
              </div>

              <div class="col-12">
                <q-select
                  v-model="form.employee_control_no"
                  :options="eligibleEmployeeOptions"
                  emit-value
                  map-options
                  outlined
                  dense
                  label="Select Employee *"
                  :loading="loadingEligibleEmployees"
                  :disable="saving || loadingEligibleEmployees"
                  :rules="[requiredRule('Employee')]"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-6">
                        No eligible employees found for this department.
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  v-model="form.username"
                  outlined
                  dense
                  label="Username *"
                  :disable="saving"
                  :rules="[requiredRule('Username')]"
                />
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  v-model="form.password"
                  outlined
                  dense
                  :type="showPassword ? 'text' : 'password'"
                  :label="isEditMode ? 'New Password (optional)' : 'Password *'"
                  :disable="saving"
                  :rules="[passwordRule]"
                >
                  <template #append>
                    <q-icon
                      :name="showPassword ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </q-input>
              </div>

            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="saving" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="primary"
              :label="isEditMode ? 'Save Changes' : 'Assign Admin'"
              :loading="saving"
              type="submit"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()

const loading = ref(false)
const loadingEligibleEmployees = ref(false)
const saving = ref(false)
const deletingId = ref(null)
const showAssignmentDialog = ref(false)
const isEditMode = ref(false)
const showPassword = ref(false)
const formRef = ref(null)

const search = ref('')
const departments = ref([])
const eligibleEmployees = ref([])
const selectedDepartment = ref(null)
const selectedDepartmentAdmin = ref(null)

const form = ref(defaultForm())

const columns = [
  { name: 'name', label: 'Department', align: 'left', field: 'name', sortable: true },
  {
    name: 'current_admin',
    label: 'Current Admin Account',
    align: 'left',
    field: (row) => row.department_admin?.full_name || '',
  },
  {
    name: 'employee',
    label: 'Designation',
    align: 'left',
    field: (row) => row.department_admin?.employee?.designation || '',
  },
  {
    name: 'employment_status',
    label: 'Status',
    align: 'center',
    field: (row) => row.department_admin?.employee?.status || '',
  },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const totalDepartments = computed(() => departments.value.length)
const assignedDepartments = computed(
  () => departments.value.filter((department) => department.department_admin !== null).length,
)
const unassignedDepartments = computed(() => totalDepartments.value - assignedDepartments.value)

const filteredRows = computed(() => {
  const query = String(search.value || '')
    .trim()
    .toLowerCase()

  return departments.value.filter((department) => {
    if (!query) return true

    const admin = department.department_admin
    const haystack = [
      department.name,
      admin?.full_name,
      admin?.username,
      admin?.employee_control_no,
      admin?.employee?.full_name,
      admin?.employee?.control_no,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')

    return haystack.includes(query)
  })
})

const eligibleEmployeeOptions = computed(() =>
  eligibleEmployees.value.map((employee) => ({
    label: `${employee.full_name}${employee.designation ? ` (${employee.designation})` : ''}`,
    value: employee.control_no,
  })),
)

onMounted(fetchDepartments)

function defaultForm() {
  return {
    department_id: null,
    employee_control_no: '',
    username: '',
    password: '',
  }
}

function requiredRule(label) {
  return (value) => !!String(value ?? '').trim() || `${label} is required.`
}

function passwordRule(value) {
  const text = String(value ?? '').trim()

  if (!isEditMode.value) {
    if (!text) return 'Password is required.'
    return text.length >= 3 || 'Password must be at least 3 characters.'
  }

  if (!text) return true
  return text.length >= 3 || 'Password must be at least 3 characters.'
}

function statusColor(status) {
  const normalized = String(status || '')
    .trim()
    .toUpperCase()
  const colors = {
    REGULAR: 'green-8',
    'CO-TERMINOUS': 'blue-8',
    ELECTIVE: 'amber-8',
    CASUAL: 'orange-8',
    CONTRACTUAL: 'brown-7',
  }

  return colors[normalized] || 'grey-6'
}

async function fetchDepartments() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/user-management/department-admins')
    departments.value = Array.isArray(data?.departments) ? data.departments : []
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to load user management data right now.')
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
    })
    departments.value = []
  } finally {
    loading.value = false
  }
}

async function fetchEligibleEmployees(departmentId) {
  loadingEligibleEmployees.value = true
  try {
    const { data } = await api.get(
      `/hr/user-management/departments/${departmentId}/eligible-employees`,
    )
    eligibleEmployees.value = Array.isArray(data?.employees) ? data.employees : []
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to load eligible employees right now.')
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
    })
    eligibleEmployees.value = []
  } finally {
    loadingEligibleEmployees.value = false
  }
}

async function openAssignDialog(department) {
  selectedDepartment.value = department
  selectedDepartmentAdmin.value = department.department_admin || null
  isEditMode.value = selectedDepartmentAdmin.value !== null
  showPassword.value = false

  form.value = {
    department_id: department.id,
    employee_control_no: selectedDepartmentAdmin.value?.employee_control_no || '',
    username: selectedDepartmentAdmin.value?.username || '',
    password: '',
  }

  showAssignmentDialog.value = true
  await fetchEligibleEmployees(department.id)

  const currentEmployee = selectedDepartmentAdmin.value?.employee
  const currentControlNo = String(selectedDepartmentAdmin.value?.employee_control_no || '').trim()

  if (
    currentEmployee &&
    currentControlNo !== '' &&
    !eligibleEmployees.value.some((employee) => String(employee.control_no) === currentControlNo)
  ) {
    eligibleEmployees.value = [currentEmployee, ...eligibleEmployees.value]
  }
}

function buildAssignmentPayload() {
  const payload = {
    department_id: Number(form.value.department_id),
    employee_control_no: String(form.value.employee_control_no || '').trim(),
    username: String(form.value.username || '').trim(),
  }

  const password = String(form.value.password || '').trim()
  if (!isEditMode.value || password !== '') {
    payload.password = password
  }

  return payload
}

async function saveAssignment() {
  const valid = await formRef.value?.validate?.()
  if (!valid) return

  saving.value = true
  try {
    const payload = buildAssignmentPayload()

    if (isEditMode.value && selectedDepartmentAdmin.value?.id) {
      await api.put(
        `/hr/user-management/department-admins/${selectedDepartmentAdmin.value.id}`,
        payload,
      )
      $q.notify({
        type: 'positive',
        message: 'Department admin assignment updated successfully.',
        position: 'top',
      })
    } else {
      await api.post('/hr/user-management/department-admins', payload)
      $q.notify({
        type: 'positive',
        message: 'Department admin assigned successfully.',
        position: 'top',
      })
    }

    showAssignmentDialog.value = false
    form.value = defaultForm()
    eligibleEmployees.value = []
    await fetchDepartments()
  } catch (err) {
    const message = resolveApiErrorMessage(
      err,
      'Unable to save department admin assignment right now.',
    )
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
    })
  } finally {
    saving.value = false
  }
}

function confirmRemove(department) {
  const admin = department.department_admin
  if (!admin) return

  $q.dialog({
    title: 'Remove Department Admin',
    message: `Remove ${admin.full_name} as admin of ${department.name}?`,
    cancel: {
      label: 'Cancel',
      color: 'grey-7',
      flat: true,
      noCaps: true,
    },
    ok: {
      label: 'Remove',
      color: 'negative',
      noCaps: true,
      unelevated: true,
    },
    persistent: true,
  }).onOk(async () => {
    deletingId.value = admin.id
    try {
      await api.delete(`/hr/user-management/department-admins/${admin.id}`)
      $q.notify({
        type: 'positive',
        message: 'Department admin removed successfully.',
        position: 'top',
      })
      await fetchDepartments()
    } catch (err) {
      const message = resolveApiErrorMessage(err, 'Unable to remove department admin right now.')
      $q.notify({
        type: 'negative',
        message,
        position: 'top',
      })
    } finally {
      deletingId.value = null
    }
  })
}
</script>
