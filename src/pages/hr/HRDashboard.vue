<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">HR Dashboard</h1>
        <p class="text-grey-7">Monitor leave applications across all departments</p>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="text-caption text-weight-medium">Total Applications</div>
            <div class="text-h4 text-primary">{{ dashboardData.total_count }}</div>
            <div class="text-caption text-grey-7">All statuses</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="text-caption text-weight-medium">Pending Review</div>
            <div class="text-h4 text-warning">{{ dashboardData.pending_count }}</div>
            <div class="text-caption text-grey-7">Requires your action</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="text-caption text-weight-medium">Approved</div>
            <div class="text-h4 text-green-8">{{ dashboardData.approved_count }}</div>
            <div class="text-caption text-grey-7">All time</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="bg-white rounded-borders" flat bordered>
          <q-card-section>
            <div class="text-caption text-weight-medium">On Leave Today</div>
            <div class="text-h4 text-purple-8">{{ dashboardData.on_leave_today }}</div>
            <div class="text-caption text-grey-7">Across all departments</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="row justify-between items-center q-mb-md">
          <div class="text-h6">All Applications</div>
          <q-select v-model="filterStatus" :options="statusOptions" dense outlined emit-value map-options clearable label="Filter Status" style="min-width: 180px" />
        </div>
      </q-card-section>
      <q-table
        :rows="filteredApps"
        :columns="columns"
        row-key="id"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
        :loading="loading"
      >
        <template #no-data>
          <div class="full-width row flex-center q-pa-lg text-grey-7">
            <q-icon name="inbox" size="md" class="q-mr-sm" />
            <span>No data available</span>
          </div>
        </template>
        <template #body-cell-employee="props">
          <q-td>
            <div class="text-weight-medium">{{ props.row.employeeName }}</div>
            <div class="text-caption text-grey-7">{{ props.row.employeeId }}</div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td><StatusBadge :status="props.row.status" /></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td class="text-center">
            <div class="row inline no-wrap justify-center q-gutter-x-xs">
              <q-btn flat dense round size="sm" icon="visibility" @click="openDetails(props.row)">
                <q-tooltip>View</q-tooltip>
              </q-btn>
              <q-btn
                v-if="props.row.rawStatus === 'PENDING_HR'"
                flat dense round size="sm" icon="check_circle" color="green-7"
                @click="handleApprove(props.row.id)"
              >
                <q-tooltip>Approve</q-tooltip>
              </q-btn>
              <q-btn
                v-if="props.row.rawStatus === 'PENDING_HR'"
                flat dense round size="sm" icon="cancel" color="negative"
                @click="openReject(props.row.id)"
              >
                <q-tooltip>Reject</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- View Details Dialog -->
    <q-dialog v-model="showDetailsDialog" position="standard">
      <q-card v-if="selectedApp" style="min-width: 480px">
        <q-card-section class="bg-primary text-white"><div class="text-h6">Application Details</div></q-card-section>
        <q-card-section class="q-gutter-y-sm">
          <div class="row q-col-gutter-md">
            <div class="col-6"><div class="text-caption text-grey-7">ID</div><div class="text-weight-medium">{{ selectedApp.id }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Employee</div><div class="text-weight-medium">{{ selectedApp.employeeName }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Department</div><div class="text-weight-medium">{{ selectedApp.office }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Leave Type</div><div class="text-weight-medium">{{ selectedApp.leaveType }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Duration</div><div class="text-weight-medium">{{ formatDate(selectedApp.startDate) }} - {{ formatDate(selectedApp.endDate) }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Days</div><div class="text-weight-medium">{{ selectedApp.days }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Date Filed</div><div class="text-weight-medium">{{ formatDate(selectedApp.dateFiled) }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Status</div><StatusBadge :status="selectedApp.status" /></div>
            <div class="col-12"><div class="text-caption text-grey-7">Reason</div><div>{{ selectedApp.reason }}</div></div>
            <div v-if="selectedApp.remarks" class="col-12"><div class="text-caption text-grey-7">Remarks</div><div>{{ selectedApp.remarks }}</div></div>
            <div class="col-12">
              <div class="text-caption text-grey-7">Available Leave Balance</div>
              <div class="text-weight-medium" :class="selectedApp.leaveBalance !== null && selectedApp.leaveBalance < selectedApp.days ? 'text-negative' : 'text-green-8'">
                {{ selectedApp.leaveBalance !== null ? selectedApp.leaveBalance + ' day(s)' : 'N/A (non-credit)' }}
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
          <template v-if="selectedApp.rawStatus === 'PENDING_HR'">
            <q-btn unelevated color="green-7" label="Approve" @click="handleApprove(selectedApp.id); showDetailsDialog = false" />
            <q-btn unelevated color="negative" label="Reject" @click="openReject(selectedApp.id); showDetailsDialog = false" />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Reject Dialog -->
    <q-dialog v-model="showRejectDialog" persistent>
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">Reject Application</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="remarks" type="textarea" label="Reason for rejection" rows="4" outlined />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="negative" label="Submit" :loading="actionLoading" @click="confirmReject" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import StatusBadge from 'components/StatusBadge.vue'

const $q = useQuasar()

const loading = ref(false)
const actionLoading = ref(false)
const dashboardData = ref({
  total_count: 0,
  pending_count: 0,
  approved_count: 0,
  rejected_count: 0,
  on_leave_today: 0,
  applications: [],
})

const filterStatus = ref('')
const statusOptions = [
  { label: 'Pending Admin', value: 'Pending Admin' },
  { label: 'Pending HR', value: 'Pending HR' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
]

const filteredApps = computed(() =>
  filterStatus.value
    ? dashboardData.value.applications.filter((a) => a.status === filterStatus.value)
    : dashboardData.value.applications
)

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'employee', label: 'Employee', align: 'left' },
  { name: 'office', label: 'Department', field: 'office', align: 'left' },
  { name: 'leaveType', label: 'Leave Type', field: 'leaveType', align: 'left' },
  { name: 'startDate', label: 'Start', field: (row) => formatDate(row.startDate), align: 'left' },
  { name: 'days', label: 'Days', field: 'days', align: 'left' },
  { name: 'status', label: 'Status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const showDetailsDialog = ref(false)
const showRejectDialog = ref(false)
const selectedApp = ref(null)
const rejectId = ref('')
const remarks = ref('')

async function fetchDashboard() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/dashboard')
    dashboardData.value = data
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load HR dashboard data', position: 'top' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function openDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}

async function handleApprove(id) {
  actionLoading.value = true
  try {
    await api.post(`/hr/leave-applications/${id}/approve`)
    $q.notify({ type: 'positive', message: 'Leave application approved! Balance deducted if credit-based.', position: 'top' })
    showDetailsDialog.value = false
    await fetchDashboard()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to approve application'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

function openReject(id) {
  rejectId.value = id
  remarks.value = ''
  showRejectDialog.value = true
  showDetailsDialog.value = false
}

async function confirmReject() {
  if (!remarks.value.trim()) {
    $q.notify({ type: 'warning', message: 'Please provide a reason for rejection', position: 'top' })
    return
  }
  actionLoading.value = true
  try {
    await api.post(`/hr/leave-applications/${rejectId.value}/reject`, {
      remarks: remarks.value,
    })
    $q.notify({ type: 'info', message: 'Leave application rejected with remarks', position: 'top' })
    showRejectDialog.value = false
    await fetchDashboard()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to reject application'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}
</script>
