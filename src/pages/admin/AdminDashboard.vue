<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-xs">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Admin Dashboard</h1>
        <q-space />
        <q-btn
          unelevated
          color="primary"
          icon="account_balance_wallet"
          label="Leave Credits"
          class="q-mr-sm"
          @click="openLeaveCredits"
        />
        <q-btn
          unelevated
          color="green-8"
          icon="description"
          label="Apply Leave"
          to="/admin/apply-leave"
        />
      </div>
      <p class="text-grey-7 q-mb-lg">Review and approve leave applications</p>

    <div class="row q-col-gutter-md q-mb-lg stat-cards-row">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1">
          <q-card-section>
            <div class="row justify-between items-center q-mb-xs">
              <q-icon name="schedule" size="28px" color="warning" />
              <q-icon v-if="dashboardData.pending_count > 5" name="warning" size="18px" color="warning" />
            </div>
            <div class="text-caption text-weight-medium">Pending Applications</div>
            <div class="text-h4 text-warning">{{ dashboardData.pending_count }}</div>
            <div class="text-caption text-grey-7">Requires your action</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1">
          <q-card-section>
            <div class="row justify-between items-center q-mb-xs">
              <q-icon name="check_circle" size="28px" color="green" />
              <span />
            </div>
            <div class="text-caption text-weight-medium">Approved Today</div>
            <div class="text-h4 text-green-8">{{ dashboardData.approved_today }}</div>
            <div class="text-caption text-grey-7">Since 8:00 AM</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1">
          <q-card-section>
            <div class="row justify-between items-center q-mb-xs">
              <q-icon name="check_circle" size="28px" color="primary" />
              <span />
            </div>
            <div class="text-caption text-weight-medium">Total Approved</div>
            <div class="text-h4 text-primary">{{ dashboardData.total_approved }}</div>
            <div class="text-caption text-grey-7">All time</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card class="stat-card bg-white rounded-borders" flat elevation="1">
          <q-card-section>
            <div class="row justify-between items-center q-mb-xs">
              <q-icon name="description" size="28px" color="grey" />
              <span />
            </div>
            <div class="text-caption text-weight-medium text-grey-7">Total Applications</div>
            <div class="text-h4 text-primary">{{ dashboardData.total_count }}</div>
            <div class="text-caption text-grey-7">All statuses</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="text-h6">Pending Applications</div>
      </q-card-section>
      <q-table
        :rows="pendingApplications"
        :columns="columns"
        row-key="id"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
        :loading="loading"
      >
        <template #body-cell-employee="props">
          <q-td>
            <div class="text-weight-medium">{{ props.row.employeeName }}</div>
            <div class="text-caption text-grey-7">{{ props.row.employeeId }}</div>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td class="text-center">
            <div class="row inline no-wrap justify-center q-gutter-x-xs">
              <q-btn flat dense round size="sm" icon="visibility" @click="openDetails(props.row)">
                <q-tooltip>View</q-tooltip>
              </q-btn>
              <q-btn flat dense round size="sm" icon="check_circle" color="green-7" @click="handleApprove(props.row.id)">
                <q-tooltip>Approve</q-tooltip>
              </q-btn>
              <q-btn flat dense round size="sm" icon="cancel" color="negative" @click="openDisapprove(props.row.id)">
                <q-tooltip>Disapprove</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- View dialog -->
    <q-dialog v-model="showDetailsDialog" position="standard">
      <q-card v-if="selectedApp" style="min-width: 480px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Application Details</div>
        </q-card-section>
        <q-card-section class="q-gutter-y-sm">
          <div class="row q-col-gutter-md">
            <div class="col-6"><div class="text-caption text-grey-7">ID</div><div class="text-weight-medium">{{ selectedApp.id }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Employee</div><div class="text-weight-medium">{{ selectedApp.employeeName }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Department</div><div class="text-weight-medium">{{ selectedApp.office }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Leave Type</div><div class="text-weight-medium">{{ selectedApp.leaveType }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Start</div><div class="text-weight-medium">{{ formatDate(selectedApp.startDate) }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">End</div><div class="text-weight-medium">{{ formatDate(selectedApp.endDate) }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Days</div><div class="text-weight-medium">{{ selectedApp.days }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Date Filed</div><div class="text-weight-medium">{{ formatDate(selectedApp.dateFiled) }}</div></div>
            <div class="col-12"><div class="text-caption text-grey-7">Reason</div><div>{{ selectedApp.reason }}</div></div>
            <div class="col-12">
              <div class="text-caption text-grey-7">Available Leave Balance</div>
              <div class="text-weight-medium" :class="selectedApp.leaveBalance !== null && selectedApp.leaveBalance < selectedApp.days ? 'text-negative' : 'text-green-8'">
                {{ selectedApp.leaveBalance !== null ? selectedApp.leaveBalance + ' day(s)' : 'N/A (non-credit)' }}
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
          <q-btn unelevated color="green-7" label="Approve" @click="handleApprove(selectedApp.id); showDetailsDialog = false" />
          <q-btn unelevated color="negative" label="Disapprove" @click="openDisapprove(selectedApp.id); showDetailsDialog = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Disapprove dialog -->
    <q-dialog v-model="showDisapproveDialog" persistent>
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">Disapprove Application</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input v-model="remarks" type="textarea" label="Reason for disapproval" rows="4" outlined />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="negative" label="Submit" :loading="actionLoading" @click="confirmDisapprove" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Leave Credits dialog -->
    <q-dialog v-model="showLeaveCreditsDialog" position="standard">
      <q-card style="min-width: 640px; max-width: 800px">
        <q-card-section class="bg-primary text-white row items-center">
          <div class="text-h6">My Leave Credits</div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </q-card-section>

        <q-card-section v-if="leaveCreditsLoading" class="text-center q-pa-xl">
          <q-spinner size="40px" color="primary" />
          <div class="q-mt-sm text-grey-7">Loading leave credits...</div>
        </q-card-section>

        <q-card-section v-else-if="!leaveInitialized" class="text-center q-pa-xl">
          <q-icon name="info" size="48px" color="warning" />
          <div class="text-h6 q-mt-md">Leave Balance Not Initialized</div>
          <p class="text-grey-7 q-mt-sm">You haven't initialized your leave balances yet.</p>
          <q-btn unelevated color="primary" label="Initialize Leave Balance" icon="add_circle" @click="openInitDialog" />
        </q-card-section>

        <q-card-section v-else class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <!-- Vacation Leave -->
            <div class="col-6" v-for="item in accruedLeaves" :key="item.id">
              <q-card flat bordered class="rounded-borders">
                <q-card-section>
                  <div class="row items-center q-mb-sm">
                    <q-icon :name="item.name.includes('Vacation') ? 'beach_access' : 'local_hospital'" size="24px" :color="item.name.includes('Vacation') ? 'blue-7' : 'red-7'" class="q-mr-sm" />
                    <div class="text-subtitle2 text-weight-bold">{{ item.name }}</div>
                  </div>
                  <div class="text-h4 text-weight-bold" :class="item.balance > 0 ? 'text-green-8' : 'text-negative'">{{ item.balance }}</div>
                  <div class="text-caption text-grey-7">day(s) remaining</div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Resettable Leaves -->
            <div class="col-6">
              <q-card flat bordered class="rounded-borders">
                <q-card-section>
                  <div class="row items-center q-mb-sm">
                    <q-icon name="autorenew" size="24px" color="orange-7" class="q-mr-sm" />
                    <div class="text-subtitle2 text-weight-bold">Resettable Leaves</div>
                  </div>
                  <div v-if="resettableLeaves.length" class="q-gutter-y-xs">
                    <div v-for="r in resettableLeaves" :key="r.id" class="row justify-between items-center">
                      <span class="text-body2">{{ r.name }}</span>
                      <q-badge :color="r.balance > 0 ? 'green' : 'grey'" :label="r.balance + ' / ' + (r.max_days || '∞')" />
                    </div>
                  </div>
                  <div v-else class="text-grey-5 text-body2">No resettable leave types</div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Event-Based Leaves -->
            <div class="col-6">
              <q-card flat bordered class="rounded-borders">
                <q-card-section>
                  <div class="row items-center q-mb-sm">
                    <q-icon name="event" size="24px" color="purple-7" class="q-mr-sm" />
                    <div class="text-subtitle2 text-weight-bold">Event-Based Leaves</div>
                  </div>
                  <div v-if="eventBasedLeaves.length" class="q-gutter-y-xs">
                    <div v-for="e in eventBasedLeaves" :key="e.id" class="row justify-between items-center">
                      <span class="text-body2">{{ e.name }}</span>
                      <q-badge color="purple" :label="(e.max_days || '∞') + ' day(s)'" />
                    </div>
                  </div>
                  <div v-else class="text-grey-5 text-body2">No event-based leave types</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Initialize Leave Balance dialog -->
    <q-dialog v-model="showInitDialog" persistent>
      <q-card style="min-width: 480px">
        <q-card-section class="bg-green-8 text-white">
          <div class="text-h6">Initialize Leave Balance</div>
        </q-card-section>
        <q-card-section v-if="initTypesLoading" class="text-center q-pa-lg">
          <q-spinner size="32px" color="primary" />
        </q-card-section>
        <q-card-section v-else class="q-gutter-y-sm">
          <q-form ref="initFormRef">
            <p class="text-caption text-grey-7">Enter your current leave balances for each type below.</p>
            <div v-for="lt in initLeaveTypes" :key="lt.id">
              <q-input
                v-model.number="initBalances[lt.id]"
                :label="lt.name + (lt.max_days ? ' (max ' + lt.max_days + ')' : '')"
                type="number"
                step="0.5"
                min="0"
                :max="lt.max_days || undefined"
                outlined
                dense
                class="q-mb-sm"
                :rules="[
                  val => val !== null && val !== '' || 'Balance is required',
                  val => val >= 0 || 'Balance cannot be negative',
                  val => !lt.max_days || val <= lt.max_days || `Max allowed is ${lt.max_days}`
                ]"
              />
            </div>
          </q-form>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="green-8" label="Save" :loading="initSaving" @click="submitInit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

const $q = useQuasar()

const loading = ref(false)
const actionLoading = ref(false)
const dashboardData = ref({
  pending_count: 0,
  approved_today: 0,
  total_approved: 0,
  total_count: 0,
  applications: [],
})

const pendingApplications = computed(() =>
  dashboardData.value.applications.filter((a) => a.rawStatus === 'PENDING_ADMIN')
)

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'employee', label: 'Employee', align: 'left' },
  { name: 'office', label: 'Department', field: 'office', align: 'left' },
  { name: 'leaveType', label: 'Leave Type', field: 'leaveType', align: 'left' },
  { name: 'startDate', label: 'Start Date', field: (row) => formatDate(row.startDate), align: 'left' },
  { name: 'days', label: 'Days', field: 'days', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'center' },
]
const showDetailsDialog = ref(false)
const showDisapproveDialog = ref(false)
const selectedApp = ref(null)
const disapproveId = ref('')
const remarks = ref('')

// Leave Credits modal
const showLeaveCreditsDialog = ref(false)
const leaveCreditsLoading = ref(false)
const leaveInitialized = ref(false)
const accruedLeaves = ref([])
const resettableLeaves = ref([])
const eventBasedLeaves = ref([])

// Initialize Leave Balance dialog
const showInitDialog = ref(false)
const initTypesLoading = ref(false)
const initSaving = ref(false)
const initLeaveTypes = ref([])
const initBalances = ref({})
const initFormRef = ref(null)

async function fetchDashboard() {
  loading.value = true
  try {
    const { data } = await api.get('/admin/dashboard')
    dashboardData.value = data
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load dashboard data', position: 'top' })
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
    await api.post(`/admin/leave-applications/${id}/approve`)
    $q.notify({ type: 'positive', message: 'Leave application approved and forwarded to HR!', position: 'top' })
    showDetailsDialog.value = false
    await fetchDashboard()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to approve application'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

function openDisapprove(id) {
  disapproveId.value = id
  remarks.value = ''
  showDisapproveDialog.value = true
  showDetailsDialog.value = false
}

async function confirmDisapprove() {
  if (!remarks.value.trim()) {
    $q.notify({ type: 'warning', message: 'Please provide a reason for disapproval', position: 'top' })
    return
  }
  actionLoading.value = true
  try {
    await api.post(`/admin/leave-applications/${disapproveId.value}/reject`, {
      remarks: remarks.value,
    })
    $q.notify({ type: 'info', message: 'Leave application rejected with remarks', position: 'top' })
    showDisapproveDialog.value = false
    await fetchDashboard()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to reject application'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

async function openLeaveCredits() {
  showLeaveCreditsDialog.value = true
  leaveCreditsLoading.value = true
  try {
    const { data } = await api.get('/admin/leave-credits')
    leaveInitialized.value = data.leave_initialized
    accruedLeaves.value = data.accrued || []
    resettableLeaves.value = data.resettable || []
    eventBasedLeaves.value = data.event_based || []
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to load leave credits'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    leaveCreditsLoading.value = false
  }
}

async function openInitDialog() {
  showInitDialog.value = true
  initTypesLoading.value = true
  try {
    const { data } = await api.get('/admin/leave-balances/init-types')
    initLeaveTypes.value = data.leave_types || []
    const balances = {}
    data.leave_types.forEach((lt) => { balances[lt.id] = 0 })
    initBalances.value = balances
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to load leave types', position: 'top' })
  } finally {
    initTypesLoading.value = false
  }
}

async function submitInit() {
  const success = await initFormRef.value.validate()
  if (!success) {
    $q.notify({ type: 'warning', message: 'Please correct the validation errors before saving.', position: 'top' })
    return
  }

  initSaving.value = true
  try {
    await api.post('/admin/leave-balances/initialize', { balances: initBalances.value })
    $q.notify({ type: 'positive', message: 'Leave balances initialized successfully!', position: 'top' })
    showInitDialog.value = false
    // Refresh the leave credits modal
    await openLeaveCredits()
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to initialize balances'
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    initSaving.value = false
  }
}
</script>

<style scoped>
.stat-cards-row .col {
  display: flex;
}
.stat-card {
  width: 100%;
  height: 100%;
  min-height: 140px;
}
</style>
