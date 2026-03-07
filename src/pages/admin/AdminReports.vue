<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Reports</h1>
        <p class="text-grey-7">View and export leave application reports</p>
      </div>
      <!-- Export dropdown button -->
    <q-btn-dropdown v-model="showExportDropdown" color="green-7" icon="download" label="Export Data" dropdown-icon="arrow_drop_down">
      <q-list>
        <q-item clickable v-close-popup @click="exportData('PDF')">
          <q-item-section>
            <q-item-label>PDF</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="exportData('CSV')">
          <q-item-section>
            <q-item-label>CSV</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-close-popup @click="exportData('Excel')">
          <q-item-section>
            <q-item-label>Excel</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    </div>

    <!-- Report generator -->
    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Generate Report</div>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-select v-model="reportType" :options="reportTypeOptions" outlined dense label="Report Type" />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateFrom" type="date" outlined dense label="From" />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateTo" type="date" outlined dense label="To" />
          </div>
          <div class="col-12 col-md-2">
            <q-btn unelevated color="primary" icon="description" label="Generate" @click="showReportModal = true" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Summary cards -->
    <div class="row q-col-gutter-md q-mb-lg stat-cards-row">
      <div v-for="stat in summaryStats" :key="stat.label" class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card rounded-borders" flat bordered>
          <q-card-section class="row items-center">
            <q-icon :name="stat.icon" :color="stat.color" size="32px" class="q-mr-md" />
            <div>
              <div class="text-caption text-grey-7">{{ stat.label }}</div>
              <div class="text-h6">{{ stat.value }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Your department stats (scoped to current admin/head's department) -->
    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Your Department Statistics</div>
        <p class="text-caption text-grey-7 q-mb-md">
          Statistics for your department's employees only.
          <span v-if="departmentDisplayName" class="text-weight-medium">{{ departmentDisplayName }}</span>
          <span v-else class="text-weight-medium">Your Department</span>
        </p>
        <q-inner-loading :showing="departmentStatsLoading">
          <q-spinner-dots size="40px" color="primary" />
        </q-inner-loading>
        <div v-if="!departmentStatsLoading" class="row q-col-gutter-md">
          <div class="col-6 col-sm-4 col-md-2">
            <div class="text-caption text-grey-7">Total applications</div>
            <div class="text-h6">{{ departmentStats.total }}</div>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <div class="text-caption text-grey-7">On leave</div>
            <div class="text-h6">{{ departmentStats.onLeave }}</div>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <div class="text-caption text-grey-7">Pending</div>
            <div class="text-h6">{{ departmentStats.pending }}</div>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <div class="text-caption text-grey-7">Approved</div>
            <div class="text-h6">{{ departmentStats.approved }}</div>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <div class="text-caption text-grey-7">Utilization %</div>
            <div class="text-h6">{{ departmentStats.rate }}%</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Your department leave type breakdown (scoped to current admin/head's department) -->
    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="text-h6 q-mb-md">Your Department Leave Type Breakdown</div>
        <p class="text-caption text-grey-7 q-mb-md">Leave applications by type for your department's employees only.</p>
        <q-inner-loading :showing="departmentLeaveBreakdownLoading">
          <q-spinner-dots size="40px" color="primary" />
        </q-inner-loading>
        <div v-if="!departmentLeaveBreakdownLoading" class="q-gutter-y-md">
          <div v-for="item in departmentLeaveTypeBreakdown" :key="item.name" class="row items-center">
            <div class="col">
              <div class="text-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey-7">{{ item.count }} applications</div>
            </div>
            <q-linear-progress :value="(item.pct || 0) / 100" :color="item.color" size="12px" class="col-4 rounded-borders" />
            <span class="q-ml-md text-weight-medium">{{ item.pct || 0 }}%</span>
          </div>
          <p v-if="departmentLeaveTypeBreakdown.length === 0" class="text-grey-6 text-body2 q-mt-md">No leave data for your department yet.</p>
        </div>
      </q-card-section>
    </q-card>

    <!-- Report preview modal -->
    <q-dialog v-model="showReportModal" position="standard">
      <q-card style="min-width: 560px; max-width: 90vw">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">{{ reportType }} - Preview</div>
        </q-card-section>
        <q-card-section>
          <div class="text-center q-mb-lg">
            <div class="text-h5">City Government</div>
            <div class="text-subtitle1">Leave Monitoring System</div>
            <div class="text-caption text-grey-7">Generated: {{ new Date().toLocaleDateString() }}</div>
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Total</div><div class="text-h5 text-primary">{{ leaveStore.applications.length }}</div></q-card-section></q-card></div>
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Approved</div><div class="text-h5 text-green-8">{{ approvedCount }}</div></q-card-section></q-card></div>
            <div class="col-4"><q-card flat bordered><q-card-section class="text-center"><div class="text-caption">Pending</div><div class="text-h5 text-warning">{{ pendingCount }}</div></q-card-section></q-card></div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
          <q-btn unelevated color="primary" icon="download" label="Download PDF" @click="downloadReport" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useLeaveStore } from 'stores/leave-store'
import { useAuthStore } from 'stores/auth-store'

const $q = useQuasar()
const leaveStore = useLeaveStore()
const authStore = useAuthStore()

const reportType = ref('Monthly Summary')
const dateFrom = ref('')
const dateTo = ref('')
const showReportModal = ref(false)
const showExportDropdown = ref(false)

const reportTypeOptions = ['Monthly Summary', 'Department Report', 'Approval Report', 'Leave Type Analysis']

const approvedCount = computed(() => leaveStore.applications.filter((a) => a.status === 'Approved').length)
const pendingCount = computed(() => leaveStore.applications.filter((a) => a.status === 'Pending').length)
const approvalRate = computed(() =>
  leaveStore.applications.length ? Math.round((approvedCount.value / leaveStore.applications.length) * 100) : 0
)

const summaryStats = computed(() => [
  { label: 'Total Applications', value: leaveStore.applications.length, icon: 'description', color: 'primary' },
  { label: 'Approval Rate', value: `${approvalRate.value}%`, icon: 'trending_up', color: 'green' },
  { label: 'Pending Review', value: pendingCount.value, icon: 'schedule', color: 'warning' },
  { label: 'Approved', value: approvedCount.value, icon: 'check_circle', color: 'green' },
])

// --- Your department only (ready for backend) ---
// Backend may return department as object { id, name } or string. Normalize for display.
function departmentNameDisplay(val) {
  if (val == null) return null
  if (typeof val === 'string') return val
  if (typeof val === 'object' && val !== null && 'name' in val) return val.name
  return String(val)
}

const departmentDisplayName = computed(() =>
  departmentNameDisplay(departmentStats.value.departmentName)
)

// Backend: GET /api/admin/reports/department-stats (or similar) returns current user's department stats.
// Expected response: { departmentName? (string or { id, name }), total, onLeave, pending, approved, rate }
const departmentStatsLoading = ref(false)
const departmentStats = ref({
  departmentName: authStore.user?.department_name ?? authStore.user?.department ?? null,
  total: 0,
  onLeave: 0,
  pending: 0,
  approved: 0,
  rate: 0,
})

// Backend: GET /api/admin/reports/department-leave-breakdown (or similar) returns leave types for current user's department.
// Expected response: [{ name, count, pct, color? }]
const departmentLeaveBreakdownLoading = ref(false)
const departmentLeaveTypeBreakdown = ref([])

async function fetchDepartmentStats() {
  departmentStatsLoading.value = true
  try {
    // TODO: Replace with API when backend is ready, e.g.:
    // const { data } = await api.get('/admin/reports/department-stats')
    // departmentStats.value = { ...data, departmentName: data.department_name ?? authStore.user?.department_name }
    const raw = authStore.user?.department_name ?? authStore.user?.department
    departmentStats.value.departmentName = raw ?? null
    departmentStats.value.total = 0
    departmentStats.value.onLeave = 0
    departmentStats.value.pending = 0
    departmentStats.value.approved = 0
    departmentStats.value.rate = 0
  } finally {
    departmentStatsLoading.value = false
  }
}

async function fetchDepartmentLeaveBreakdown() {
  departmentLeaveBreakdownLoading.value = true
  try {
    // TODO: Replace with API when backend is ready, e.g.:
    // const { data } = await api.get('/admin/reports/department-leave-breakdown')
    // departmentLeaveTypeBreakdown.value = data.map(item => ({ ...item, color: item.color ?? 'primary' }))
    departmentLeaveTypeBreakdown.value = []
  } finally {
    departmentLeaveBreakdownLoading.value = false
  }
}

onMounted(() => {
  fetchDepartmentStats()
  fetchDepartmentLeaveBreakdown()
})

function downloadReport() {
  $q.notify({ type: 'info', message: 'Downloading report...', position: 'top' })
}
function exportData(format) {
  $q.notify({ type: 'info', message: `Exporting as ${format}...`, position: 'top' })
  showExportDropdown.value = false
}
</script>

<style scoped>
.stat-cards-row .col { display: flex; }
.stat-card { width: 100%; height: 100%; min-height: 100px; }
</style>
