<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <div class="row items-center justify-between q-gutter-sm">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">User Management</h1>
        </div>
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="person_add"
          label="Create Account"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="manage_accounts" size="md" color="primary" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Total Accounts</div>
                <div class="text-h4 text-primary">{{ totalAccounts }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="badge" size="md" color="green-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">HR Admin</div>
                <div class="text-h4 text-green-8">{{ hrAccounts }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="rounded-borders">
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="supervisor_account" size="md" color="orange-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Office Admin</div>
                <div class="text-h4 text-orange-8">{{ departmentAdminAccounts }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-md">
      <q-card-section>
        <q-input
          v-model="search"
          outlined
          dense
          clearable
          debounce="250"
          label="Search accounts"
          placeholder="Name, username, role, office, position..."
        >
          <template #prepend>
            <q-icon name="search" color="grey-6" />
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="rounded-borders">
      <q-table
        :rows="filteredRows"
        :columns="columns"
        row-key="row_key"
        flat
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
      >
        <template #body-cell-role_label="props">
          <q-td :props="props" class="text-center">
            <q-badge :color="roleColor(props.row.role)" :label="props.row.role_label" rounded />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <q-btn
              v-if="(isDepartmentAdmin(props.row) && canDeleteDepartmentAdmin(props.row)) || (isHrAdmin(props.row) && canDeleteHrAdmin(props.row))"
              flat
              dense
              round
              icon="delete"
              color="negative"
              :loading="deletingRowKey === props.row.row_key"
              @click="confirmRemoveAccount(props.row)"
            >
              <q-tooltip>{{ isHrAdmin(props.row) ? 'Remove HR Admin Account' : 'Remove Office Admin Account' }}</q-tooltip>
            </q-btn>
            <span v-else-if="isDepartmentAdmin(props.row) || isHrAdmin(props.row)" class="text-grey-6">Protected</span>
            <span v-else class="text-grey-6">-</span>
          </q-td>
        </template>

        <template #body-cell-department="props">
          <q-td :props="props">
            {{ toDepartmentCode(props.row.department) }}
          </q-td>
        </template>

        <template #body-cell-position="props">
          <q-td :props="props">
            {{ props.row.position || '-' }}
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <template v-if="loading">
              <q-spinner color="primary" size="40px" />
              <div class="text-grey-6 q-mt-sm">Loading accounts...</div>
            </template>
            <template v-else>
              <q-icon name="manage_accounts" size="48px" color="grey-5" />
              <div class="text-grey-6 q-mt-sm">No accounts found.</div>
            </template>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="width: 95vw; max-width: 720px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Create Account</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="creatingAccount" v-close-popup />
        </q-card-section>

        <q-form ref="createFormRef" @submit.prevent="createAdminAccount">
          <q-card-section class="q-pt-sm">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <div class="row items-center q-gutter-x-lg q-gutter-y-sm">
                  <q-checkbox
                    v-model="createForm.is_office_admin"
                    color="primary"
                    label="Office Admin"
                    :disable="creatingAccount"
                    @update:model-value="handleOfficeAdminToggle"
                  />
                  <q-checkbox
                    v-model="createForm.is_hr_admin"
                    color="primary"
                    label="HR Admin"
                    :disable="creatingAccount"
                    @update:model-value="handleHrAdminToggle"
                  />
                </div>
              </div>

              <div v-if="!createForm.is_hr_admin" class="col-12">
                <q-select
                  v-model="createForm.department_id"
                  :options="departmentOptions"
                  emit-value
                  map-options
                  use-input
                input-debounce="200"
                outlined
                dense
                label="Office *"
                :loading="loadingDepartments"
                :disable="creatingAccount || loadingDepartments"
                :rules="[officeRequiredRule]"
                @filter="filterDepartments"
                @update:model-value="handleDepartmentChange"
              >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-6">
                        No offices found.
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="col-12">
                <q-toggle
                  v-model="createForm.is_guest"
                  color="primary"
                  label="Guest Account"
                  :disable="creatingAccount"
                  @update:model-value="handleGuestToggle"
                />
              </div>

              <div class="col-12">
                <q-select
                  v-if="!createForm.is_guest"
                  v-model="createForm.employee_control_no"
                  :options="eligibleEmployeeOptions"
                  :display-value="selectedCreateEmployeeDisplay"
                  emit-value
                  map-options
                  use-input
                  input-debounce="300"
                  outlined
                  dense
                  label="Employee *"
                  hint="Type at least 2 characters to search employees."
                  :loading="loadingEligibleEmployees"
                  :disable="creatingAccount"
                  :rules="[employeeRequiredRule]"
                  @filter="filterEligibleEmployees"
                  @popup-show="handleEligibleEmployeePopupShow"
                >
                  <template #no-option>
                    <q-item>
                      <q-item-section class="text-grey-6">
                        {{ eligibleEmployeeNoOptionMessage }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="col-12">
                <q-input
                  v-model="createForm.username"
                  outlined
                  dense
                  label="Username *"
                  :disable="creatingAccount"
                  :rules="[requiredRule('Username')]"
                />
              </div>

              <div class="col-12">
                <q-input
                  v-if="createForm.is_guest"
                  v-model="createForm.password"
                  outlined
                  dense
                  :type="showGuestPassword ? 'text' : 'password'"
                  label="Password *"
                  :disable="creatingAccount"
                  :rules="[guestPasswordRequiredRule, guestPasswordMinLengthRule]"
                >
                  <template #append>
                    <q-icon
                      class="cursor-pointer"
                      :name="showGuestPassword ? 'visibility_off' : 'visibility'"
                      @click="showGuestPassword = !showGuestPassword"
                    />
                  </template>
                </q-input>
              </div>

              <div class="col-12">
                <q-banner class="bg-amber-1 text-amber-10 rounded-borders">
                  <template v-if="createForm.is_guest">
                    Guest account password will use your manually entered value and must be changed on first login.
                  </template>
                  <template v-else>
                    Default password will be the selected employee birthdate in <strong>MMDDYY</strong> format.
                  </template>
                </q-banner>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat no-caps label="Cancel" color="grey-7" :disable="creatingAccount" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Create Account"
              :loading="creatingAccount"
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
const deletingRowKey = ref('')
const creatingAccount = ref(false)
const loadingDepartments = ref(false)
const loadingEligibleEmployees = ref(false)
const showCreateDialog = ref(false)
const createFormRef = ref(null)
const showGuestPassword = ref(false)
const MIN_ELIGIBLE_EMPLOYEE_SEARCH_LENGTH = 2

const search = ref('')
const accounts = ref([])
const departments = ref([])
const departmentOptions = ref([])
const eligibleEmployees = ref([])
const eligibleEmployeeOptions = ref([])
const eligibleEmployeeDirectory = ref({})
const eligibleEmployeeSearch = ref('')
let eligibleEmployeesRequestId = 0

const summary = ref({
  total_accounts: 0,
  hr_accounts: 0,
  department_admin_accounts: 0,
})

const createForm = ref(defaultCreateForm())

const columns = [
  { name: 'full_name', label: 'Name', field: 'full_name', align: 'left', sortable: true },
  { name: 'username', label: 'Username', field: 'username', align: 'left', sortable: true },
  { name: 'role_label', label: 'Role', field: 'role_label', align: 'center', sortable: true },
  {
    name: 'department',
    label: 'Office',
    field: (row) => toDepartmentCode(row?.department),
    align: 'left',
    sortable: true,
  },
  { name: 'position', label: 'Position', field: 'position', align: 'left', sortable: true },
  { name: 'actions', label: 'Action', field: 'actions', align: 'center' },
]

const totalAccounts = computed(() => summary.value.total_accounts ?? accounts.value.length)
const hrAccounts = computed(
  () => summary.value.hr_accounts ?? accounts.value.filter((account) => account.role === 'HR').length,
)
const departmentAdminAccounts = computed(
  () =>
    summary.value.department_admin_accounts ??
    accounts.value.filter((account) => account.role === 'DEPARTMENT_ADMIN').length,
)

const filteredRows = computed(() => {
  const term = normalizeSearch(search.value)
  if (!term) return accounts.value

  return accounts.value.filter((account) => {
    const haystack = normalizeSearch(
      [
        account.full_name,
        account.username,
        account.role_label,
        account.department,
        toDepartmentCode(account.department),
        account.position,
        account.employee_control_no,
      ]
        .map((value) => String(value || '').trim())
        .join(' '),
    )

    return haystack.includes(term)
  })
})

const selectedCreateEmployeeDisplay = computed(() => {
  const selectedControlNo = String(createForm.value.employee_control_no || '').trim()
  if (!selectedControlNo) return ''

  const selected =
    eligibleEmployeeDirectory.value[selectedControlNo] ||
    eligibleEmployees.value.find((employee) => String(employee.control_no || '').trim() === selectedControlNo)

  return selected ? formatEmployeeOptionLabel(selected) : ''
})

const eligibleEmployeeNoOptionMessage = computed(() => {
  if (loadingEligibleEmployees.value) {
    return 'Searching employees...'
  }

  if (normalizeEligibleEmployeeSearchValue(eligibleEmployeeSearch.value).length < MIN_ELIGIBLE_EMPLOYEE_SEARCH_LENGTH) {
    return 'Type at least 2 characters to search employees.'
  }

  return 'No active employees found.'
})

onMounted(fetchAccounts)

function defaultCreateForm() {
  return {
    is_office_admin: true,
    is_hr_admin: false,
    department_id: null,
    is_guest: false,
    employee_control_no: '',
    username: '',
    password: '',
  }
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeEligibleEmployeeSearchValue(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function replaceDepartmentWithOffice(text) {
  return String(text || '')
    .replace(/\bdepartment admin\b/gi, 'Office Admin')
    .replace(/\bdepartments\b/gi, (match) => (match[0] === 'D' ? 'Offices' : 'offices'))
    .replace(/\bdepartment\b/gi, (match) => (match[0] === 'D' ? 'Office' : 'office'))
}

const DEPARTMENT_STOP_WORDS = new Set([
  'A',
  'AN',
  'AND',
  'FOR',
  'IN',
  'OF',
  'OFFICE',
  'ON',
  'THE',
  'TO',
])

function toDepartmentCode(value) {
  const source = String(value || '').trim()
  if (!source) return '-'

  if (!/\s/.test(source) && source === source.toUpperCase()) {
    return source
  }

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

  return acronym || source
}

function roleColor(role) {
  const normalized = String(role || '').trim().toUpperCase()
  if (normalized === 'HR') return 'green-8'
  if (normalized === 'DEPARTMENT_ADMIN') return 'orange-8'
  return 'grey-6'
}

function isDepartmentAdmin(row) {
  return String(row?.role || '').trim().toUpperCase() === 'DEPARTMENT_ADMIN'
}

function isHrAdmin(row) {
  return String(row?.role || '').trim().toUpperCase() === 'HR'
}

function canDeleteDepartmentAdmin(row) {
  return Boolean(row?.can_delete ?? true)
}

function canDeleteHrAdmin(row) {
  return Boolean(row?.can_delete ?? true)
}

function requiredRule(label) {
  return (value) => String(value ?? '').trim() !== '' || `${label} is required.`
}

function officeRequiredRule(value) {
  if (createForm.value.is_hr_admin) return true
  return String(value ?? '').trim() !== '' || 'Office is required.'
}

function employeeRequiredRule(value) {
  if (createForm.value.is_guest) return true
  return String(value ?? '').trim() !== '' || 'Employee is required.'
}

function guestPasswordRequiredRule(value) {
  if (!createForm.value.is_guest) return true
  return String(value ?? '').trim() !== '' || 'Password is required.'
}

function guestPasswordMinLengthRule(value) {
  if (!createForm.value.is_guest) return true
  return String(value ?? '').length >= 8 || 'Password must be at least 8 characters.'
}

function formatEmployeeOptionLabel(employee) {
  const fullName = String(employee?.full_name || '').trim()
  const designation = String(employee?.designation || '').trim()
  return designation ? `${fullName} (${designation})` : fullName
}

function buildDepartmentOptions(items) {
  return items.map((department) => ({
    label: String(department?.name || '').trim(),
    value: Number(department?.id),
  }))
}

function buildEligibleEmployeeOptions(items) {
  return items.map((employee) => ({
    label: formatEmployeeOptionLabel(employee),
    value: String(employee?.control_no || '').trim(),
  }))
}

function rememberEligibleEmployees(items) {
  const nextDirectory = { ...eligibleEmployeeDirectory.value }

  for (const employee of items) {
    const controlNo = String(employee?.control_no || '').trim()
    if (!controlNo) continue
    nextDirectory[controlNo] = employee
  }

  eligibleEmployeeDirectory.value = nextDirectory
}

function filterDepartments(value, update) {
  update(() => {
    const term = normalizeSearch(value)
    const filtered = !term
      ? departments.value
      : departments.value.filter((department) => {
          const name = normalizeSearch(department?.name)
          const idText = normalizeSearch(String(department?.id || ''))
          return name.includes(term) || idText.includes(term)
        })

    departmentOptions.value = buildDepartmentOptions(filtered)
  })
}

function filterEligibleEmployees(value, update) {
  eligibleEmployeeSearch.value = String(value || '')
  const normalizedSearch = normalizeEligibleEmployeeSearchValue(eligibleEmployeeSearch.value)

  if (normalizedSearch.length < MIN_ELIGIBLE_EMPLOYEE_SEARCH_LENGTH) {
    eligibleEmployeesRequestId += 1
    loadingEligibleEmployees.value = false
    update(() => {
      eligibleEmployeeOptions.value = []
    })
    return
  }

  fetchEligibleEmployees(eligibleEmployeeSearch.value, { silent: true })
    .then(() => {
      update(() => {
        eligibleEmployeeOptions.value = buildEligibleEmployeeOptions(eligibleEmployees.value)
      })
    })
    .catch(() => {
      update(() => {
        eligibleEmployeeOptions.value = []
      })
    })
}

async function handleEligibleEmployeePopupShow() {
  if (createForm.value.is_guest) return
  if (normalizeEligibleEmployeeSearchValue(eligibleEmployeeSearch.value).length < MIN_ELIGIBLE_EMPLOYEE_SEARCH_LENGTH) {
    return
  }
  if (loadingEligibleEmployees.value) return
  if (eligibleEmployeeOptions.value.length) return

  try {
    await fetchEligibleEmployees('', { silent: true })
  } catch {
    // The field already shows the error state through the empty options message.
  }
}

async function openCreateDialog() {
  showCreateDialog.value = true
  showGuestPassword.value = false
  createForm.value = defaultCreateForm()
  eligibleEmployeeDirectory.value = {}
  eligibleEmployeeSearch.value = ''
  eligibleEmployees.value = []
  eligibleEmployeeOptions.value = []
  await fetchDepartmentOptions()
}

async function fetchDepartmentOptions() {
  loadingDepartments.value = true
  try {
    const { data } = await api.get('/departments')
    departments.value = Array.isArray(data?.departments) ? data.departments : []
    departmentOptions.value = buildDepartmentOptions(departments.value)
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to load offices right now.')
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
    })
    departments.value = []
    departmentOptions.value = []
  } finally {
    loadingDepartments.value = false
  }
}

async function fetchEligibleEmployees(searchTerm = '', { silent = false } = {}) {
  const normalizedSearch = normalizeEligibleEmployeeSearchValue(searchTerm)
  if (normalizedSearch.length < MIN_ELIGIBLE_EMPLOYEE_SEARCH_LENGTH) {
    eligibleEmployees.value = []
    eligibleEmployeeOptions.value = []
    loadingEligibleEmployees.value = false
    return
  }

  const requestId = ++eligibleEmployeesRequestId
  loadingEligibleEmployees.value = true
  try {
    const { data } = await api.get('/hr/user-management/eligible-employees', {
      params: {
        search: normalizedSearch || undefined,
        limit: 20,
      },
    })

    if (requestId !== eligibleEmployeesRequestId) return

    eligibleEmployees.value = Array.isArray(data?.employees) ? data.employees : []
    rememberEligibleEmployees(eligibleEmployees.value)
    eligibleEmployeeOptions.value = buildEligibleEmployeeOptions(eligibleEmployees.value)
  } catch (err) {
    if (!silent) {
      const message = resolveApiErrorMessage(err, 'Unable to load eligible employees right now.')
      $q.notify({
        type: 'negative',
        message,
        position: 'top',
      })
    }
    eligibleEmployees.value = []
    eligibleEmployeeOptions.value = []
    throw err
  } finally {
    if (requestId === eligibleEmployeesRequestId) {
      loadingEligibleEmployees.value = false
    }
  }
}

async function handleDepartmentChange() {
  createForm.value.employee_control_no = ''
}

function handleHrAdminToggle(enabled) {
  if (enabled) {
    createForm.value.is_office_admin = false
    createForm.value.department_id = null
    return
  }

  if (!createForm.value.is_office_admin) {
    createForm.value.is_office_admin = true
  }
}

function handleOfficeAdminToggle(enabled) {
  if (enabled) {
    createForm.value.is_hr_admin = false
    return
  }

  if (!createForm.value.is_hr_admin) {
    createForm.value.is_office_admin = true
  }
}

function handleGuestToggle(enabled) {
  if (enabled) {
    createForm.value.employee_control_no = ''
    return
  }

  createForm.value.password = ''
  if (!eligibleEmployees.value.length) {
    void fetchEligibleEmployees(eligibleEmployeeSearch.value, { silent: true })
  }
}

async function createAdminAccount() {
  const valid = await createFormRef.value?.validate?.()
  if (!valid) return

  creatingAccount.value = true
  try {
    const creatingHrAdmin = Boolean(createForm.value.is_hr_admin)
    const isGuest = Boolean(createForm.value.is_guest)
    const payload = {
      is_hr_admin: creatingHrAdmin,
      department_id:
        !creatingHrAdmin && createForm.value.department_id !== null
          ? Number(createForm.value.department_id)
          : null,
      is_guest: isGuest,
      employee_control_no: isGuest
        ? null
        : (String(createForm.value.employee_control_no || '').trim() || null),
      username: String(createForm.value.username || '').trim(),
      password: isGuest ? String(createForm.value.password || '') : null,
    }

    const { data } = await api.post('/hr/user-management/department-admins', payload)
    const successFallback = creatingHrAdmin
      ? (isGuest ? 'Guest HR account created successfully.' : 'HR account created successfully.')
      : 'Office admin account created successfully.'
    $q.notify({
      type: 'positive',
      message: creatingHrAdmin
        ? (data?.message || successFallback)
        : replaceDepartmentWithOffice(data?.message || successFallback),
      position: 'top',
    })

    showCreateDialog.value = false
    createForm.value = defaultCreateForm()
    eligibleEmployees.value = []
    eligibleEmployeeOptions.value = []
    await fetchAccounts()
  } catch (err) {
    const creatingHrAdmin = Boolean(createForm.value.is_hr_admin)
    const message = resolveApiErrorMessage(
      err,
      creatingHrAdmin
        ? 'Unable to create HR account right now.'
        : 'Unable to create office admin account right now.',
    )
    $q.notify({
      type: 'negative',
      message: creatingHrAdmin ? message : replaceDepartmentWithOffice(message),
      position: 'top',
    })
  } finally {
    creatingAccount.value = false
  }
}

function confirmRemoveAccount(row) {
  const rowIsHrAdmin = isHrAdmin(row)
  const rowIsDepartmentAdmin = isDepartmentAdmin(row)
  if (!rowIsDepartmentAdmin && !rowIsHrAdmin) return
  if (rowIsDepartmentAdmin && !canDeleteDepartmentAdmin(row)) return
  if (rowIsHrAdmin && !canDeleteHrAdmin(row)) return

  const accountId = Number(row?.account_id || 0)
  if (!accountId) return
  const accountLabel = rowIsHrAdmin ? 'HR Admin' : 'Office Admin'

  $q.dialog({
    title: `Remove ${accountLabel}`,
    message: `Remove ${row.full_name} as ${accountLabel} account?`,
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
    deletingRowKey.value = String(row?.row_key || '')
    try {
      const endpoint = rowIsHrAdmin
        ? `/hr/user-management/hr-accounts/${accountId}`
        : `/hr/user-management/department-admins/${accountId}`
      const { data } = await api.delete(endpoint)
      const successMessage = data?.message || (rowIsHrAdmin
        ? 'HR admin removed successfully.'
        : 'Office admin removed successfully.')
      $q.notify({
        type: 'positive',
        message: rowIsHrAdmin ? successMessage : replaceDepartmentWithOffice(successMessage),
        position: 'top',
      })
      await fetchAccounts()
    } catch (err) {
      const message = resolveApiErrorMessage(
        err,
        rowIsHrAdmin
          ? 'Unable to remove HR admin right now.'
          : 'Unable to remove office admin right now.',
      )
      $q.notify({
        type: 'negative',
        message: rowIsHrAdmin ? message : replaceDepartmentWithOffice(message),
        position: 'top',
      })
    } finally {
      deletingRowKey.value = ''
    }
  })
}

async function fetchAccounts() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/user-management/department-admins')
    accounts.value = Array.isArray(data?.accounts)
      ? data.accounts.map((account) => ({
          ...account,
          role_label: replaceDepartmentWithOffice(account?.role_label),
        }))
      : []
    summary.value = {
      total_accounts: Number(data?.summary?.total_accounts ?? accounts.value.length),
      hr_accounts: Number(
        data?.summary?.hr_accounts ?? accounts.value.filter((account) => account.role === 'HR').length,
      ),
      department_admin_accounts: Number(
        data?.summary?.department_admin_accounts ??
          accounts.value.filter((account) => account.role === 'DEPARTMENT_ADMIN').length,
      ),
    }
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to load user accounts right now.')
    $q.notify({
      type: 'negative',
      message,
      position: 'top',
    })
    accounts.value = []
    summary.value = {
      total_accounts: 0,
      hr_accounts: 0,
      department_admin_accounts: 0,
    }
  } finally {
    loading.value = false
  }
}
</script>
