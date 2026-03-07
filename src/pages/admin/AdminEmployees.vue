<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-xs">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Employee Management</h1>
    </div>
    <p class="text-grey-7 q-mb-lg">{{ adminDepartmentName }} — View your staff and file leave on their behalf</p>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
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
      <div class="col-12 col-sm-4">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="check_circle" size="md" color="green-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">REGULAR</div>
                <div class="text-h4 text-green-8">{{ regularCount }}</div>
                <div class="text-caption text-grey-6">on this page</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon name="people_alt" size="md" color="blue-8" class="q-mr-sm" />
              <div>
                <div class="text-caption text-weight-medium">Other status</div>
                <div class="text-h4 text-blue-8">{{ otherStatusCount }}</div>
                <div class="text-caption text-grey-6">on this page</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters & Table -->
    <q-card flat bordered class="rounded-borders">
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
              clearable
              style="min-width: 220px"
              @update:model-value="fetchEmployees"
            >
              <template #prepend>
                <q-icon name="search" size="sm" color="grey-6" />
              </template>
            </q-input>
          </div>
        </div>
      </q-card-section>
      <q-table
        :rows="employees"
        :columns="columns"
        row-key="id"
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
                {{ (props.row.first_name || '').charAt(0) }}{{ (props.row.last_name || '').charAt(0) }}
              </q-avatar>
              <div>
                <div class="text-weight-medium text-primary" style="text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.2s">
                  {{ props.row.last_name }}, {{ props.row.first_name }}
                </div>
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

    <!-- View Employee Dialog -->
    <q-dialog v-model="showViewDialog" persistent>
      <q-card style="width: 90vw; max-width: 500px" class="rounded-borders dialog-card">
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
              <div class="text-h6 q-mt-sm">{{ selectedEmployee.first_name }} {{ selectedEmployee.last_name }}</div>
              <div class="text-caption text-grey-6">{{ selectedEmployee.position || '—' }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Employee ID</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.id }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Department</div>
              <div class="text-body2 text-weight-medium">{{ selectedEmployee.department?.name ?? '—' }}</div>
            </div>
            <div class="col-12">
              <div class="text-caption text-grey-6">Status</div>
              <q-badge
                :color="statusBadgeColor(selectedEmployee.status)"
                :label="selectedEmployee.status"
                rounded
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions class="q-pa-md" :class="$q.screen.lt.sm ? 'column q-gutter-y-sm' : 'row justify-end'">
          <q-btn
            unelevated
            no-caps
            label="Apply Leave"
            color="green-8"
            icon="description"
            :class="{ 'full-width': $q.screen.lt.sm }"
            @click="applyLeaveFor(selectedEmployee); showViewDialog = false"
          />
          <q-btn
            flat
            no-caps
            label="Close"
            color="grey-7"
            :class="{ 'full-width': $q.screen.lt.sm }"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth-store'
import { api } from 'src/boot/axios'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()

const search = ref('')
const showViewDialog = ref(false)
const selectedEmployee = ref(null)
const employees = ref([])
const loading = ref(false)
const totalEmployees = ref(0)

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

const adminDepartmentId = computed(() => authStore.user?.department_id ?? authStore.user?.department?.id)
const adminDepartmentName = computed(() => authStore.user?.department?.name ?? '—')

const noDataMessage = computed(() => {
  if (!adminDepartmentId.value) return 'Select or set your department to view employees.'
  return 'No employees found in this department.'
})

const columns = [
  { name: 'name', label: 'Employee', align: 'left', field: row => `${row.last_name}, ${row.first_name}`, sortable: true },
  { name: 'id', label: 'ID', align: 'left', field: 'id', sortable: true },
  { name: 'position', label: 'Position', align: 'left', field: 'position', sortable: true },
  { name: 'department_name', label: 'Department', align: 'left', field: row => row.department?.name ?? '—', sortable: true },
  { name: 'status', label: 'Status', align: 'center', field: 'status', sortable: true },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const regularCount = computed(() => employees.value.filter(e => e.status === 'REGULAR').length)
const otherStatusCount = computed(() => employees.value.filter(e => e.status !== 'REGULAR').length)

function statusBadgeColor(status) {
  if (!status) return 'grey'
  const c = { REGULAR: 'green', 'CO-TERMINOUS': 'blue', ELECTIVE: 'amber', CASUAL: 'orange' }
  return c[status] ?? 'blue'
}

async function fetchEmployees(page = 1) {
  if (!adminDepartmentId.value) {
    employees.value = []
    totalEmployees.value = 0
    pagination.value.rowsNumber = 0
    return
  }
  loading.value = true
  try {
    const { data } = await api.get('/employees', {
      params: {
        department_id: adminDepartmentId.value,
        search: search.value || undefined,
        per_page: pagination.value.rowsPerPage,
        page,
      },
    })
    employees.value = data.employees?.data ?? []
    totalEmployees.value = data.total_employees ?? 0
    pagination.value.page = data.employees?.current_page ?? 1
    pagination.value.rowsNumber = data.employees?.total ?? 0
  } catch (err) {
    console.error('Failed to load employees:', err)
    $q.notify({ type: 'negative', message: 'Failed to load employee records', position: 'top' })
    employees.value = []
  } finally {
    loading.value = false
  }
}

function onRequest(props) {
  pagination.value.rowsPerPage = props.pagination.rowsPerPage
  fetchEmployees(props.pagination.page)
}

function viewEmployee(emp) {
  selectedEmployee.value = emp
  showViewDialog.value = true
}

function applyLeaveFor(emp) {
  router.push({
    path: '/admin/apply-on-behalf',
    query: {
      department: emp.department?.name,
      lastName: emp.last_name,
      firstName: emp.first_name,
      position: emp.position,
      empId: emp.id,
    },
  })
}

// When user profile is refreshed (e.g. /me returns department_id), load employees
watch(adminDepartmentId, (id) => {
  if (id) fetchEmployees(1)
}, { immediate: true })

onMounted(() => {
  fetchEmployees()
})
</script>

<style scoped>
.cursor-pointer:hover .text-primary {
  text-decoration: underline !important;
  text-decoration-color: currentColor !important;
}
.dialog-card {
  display: flex;
  flex-direction: column;
}
</style>
