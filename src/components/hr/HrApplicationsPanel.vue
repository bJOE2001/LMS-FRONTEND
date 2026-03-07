<template>
  <q-card flat bordered class="rounded-borders q-mb-lg">
    <q-card-section>
      <div class="row justify-between items-center q-mb-md">
        <div class="text-h6">All Applications</div>
        <div class="row items-center q-gutter-sm">
          <q-input
            v-model="statusSearch"
            dense
            outlined
            clearable
            debounce="250"
            placeholder="Search employee, status, date filed"
            class="application-status-search"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-select
            v-model="filterStatus"
            :options="statusOptions"
            dense
            outlined
            emit-value
            map-options
            label="Filter Status"
            style="min-width: 220px"
          />
        </div>
      </div>
    </q-card-section>
    <q-table
      :rows="filteredApps"
      :columns="columns"
      row-key="id"
      flat
      v-model:pagination="tablePagination"
      :rows-per-page-options="[10]"
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
          <div class="text-caption text-grey-7">{{ props.row.employee_id }}</div>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td><StatusBadge :status="props.row.displayStatus" /></q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td class="text-center">
          <div class="row inline no-wrap justify-center q-gutter-x-xs">
            <q-btn flat dense round size="sm" icon="visibility" @click="openDetails(props.row)">
              <q-tooltip>View</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.rawStatus === 'PENDING_HR'"
              flat
              dense
              round
              size="sm"
              icon="check_circle"
              color="green-7"
              @click="handleApprove(props.row.id)"
            >
              <q-tooltip>Approve</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.rawStatus === 'PENDING_HR'"
              flat
              dense
              round
              size="sm"
              icon="cancel"
              color="negative"
              @click="openReject(props.row.id)"
            >
              <q-tooltip>Reject</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </q-table>
  </q-card>

  <q-dialog v-model="showDetailsDialog" position="standard">
    <q-card v-if="selectedApp" style="min-width: 480px">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Application Details</div>
      </q-card-section>
      <q-card-section class="q-gutter-y-sm">
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <div class="text-caption text-grey-7">Employee</div>
            <div class="text-weight-medium">{{ selectedApp.employeeName }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Leave Type</div>
            <div class="text-weight-medium">
              {{ selectedApp.leaveType }}{{ selectedApp.is_monetization ? ' (Monetization)' : '' }}
            </div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Department</div>
            <div class="text-weight-medium">{{ selectedApp.office }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Days</div>
            <div class="text-weight-medium">{{ selectedApp.days }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">
              {{ selectedApp.is_monetization ? 'Days to Monetize' : 'Duration' }}
            </div>
            <div v-if="selectedApp.is_monetization" class="text-weight-medium">
              {{ selectedApp.days }} day(s)
              <div v-if="selectedApp.equivalent_amount" class="text-caption text-grey-6 q-mt-xs">
                Est. Amount: &#8369;{{ Number(selectedApp.equivalent_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </div>
            </div>
            <div v-else-if="selectedApp.selected_dates && selectedApp.selected_dates.length" class="text-weight-medium">
              <div v-for="d in selectedApp.selected_dates.sort()" :key="d" class="text-caption">
                {{ formatDate(d) }}
              </div>
            </div>
            <div v-else class="text-weight-medium">
              {{ selectedApp.startDate ? formatDate(selectedApp.startDate) : 'N/A' }} - {{ selectedApp.endDate ? formatDate(selectedApp.endDate) : 'N/A' }}
            </div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Date Filed</div>
            <div class="text-weight-medium">{{ formatDate(selectedApp.dateFiled) }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Status</div>
            <StatusBadge :status="selectedApp.displayStatus" />
          </div>
          <div class="col-12">
            <div class="text-caption text-grey-7">Reason</div>
            <div>{{ selectedApp.reason }}</div>
          </div>
          <div v-if="selectedApp.remarks" class="col-12">
            <div class="text-caption text-grey-7">Remarks</div>
            <div>{{ selectedApp.remarks }}</div>
          </div>
          <div class="col-12">
            <div class="text-caption text-grey-7">Available Leave Balance</div>
            <div
              class="text-weight-medium"
              :class="selectedApp.leaveBalance !== null && selectedApp.leaveBalance < selectedApp.days ? 'text-negative' : 'text-green-8'"
            >
              {{ selectedApp.leaveBalance !== null ? selectedApp.leaveBalance + ' day(s)' : 'N/A (non-credit)' }}
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Close" color="primary" v-close-popup />
        <template v-if="selectedApp.rawStatus === 'PENDING_HR'">
          <q-btn
            unelevated
            color="green-7"
            label="Approve"
            @click="handleApprove(selectedApp.id); showDetailsDialog = false"
          />
          <q-btn
            unelevated
            color="negative"
            label="Reject"
            @click="openReject(selectedApp.id); showDetailsDialog = false"
          />
        </template>
      </q-card-actions>
    </q-card>
  </q-dialog>

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
        <q-btn
          unelevated
          color="negative"
          label="Submit"
          :loading="actionLoading"
          @click="confirmReject"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from 'src/boot/axios'
import StatusBadge from 'components/StatusBadge.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const route = useRoute()

const loading = ref(false)
const actionLoading = ref(false)
const applications = ref([])
const tablePagination = ref({
  page: 1,
  rowsPerPage: 10,
})
const statusSearch = ref('')

const validFilterValues = ['total', 'pending', 'approved', 'rejected']
const filterStatus = ref('total')
const statusOptions = [
  { label: 'All', value: 'total' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

function mergeStatus(app) {
  const raw = String(app.rawStatus || '').toUpperCase()
  const status = String(app.status || '').toUpperCase()

  if (raw.includes('PENDING') || status.includes('PENDING')) return 'Pending'
  if (raw.includes('APPROVED') || status.includes('APPROVED')) return 'Approved'
  if (
    raw.includes('REJECTED') ||
    raw.includes('DISAPPROVED') ||
    status.includes('REJECTED') ||
    status.includes('DISAPPROVED')
  ) {
    return 'Rejected'
  }

  return app.status || ''
}

function toFilterValue(value) {
  const normalized = String(value || '').toLowerCase()
  return validFilterValues.includes(normalized) ? normalized : 'total'
}

const statusFilteredApps = computed(() => {
  if (filterStatus.value === 'pending') {
    return applications.value.filter((a) => a.displayStatus === 'Pending')
  }
  if (filterStatus.value === 'approved') {
    return applications.value.filter((a) => a.displayStatus === 'Approved')
  }
  if (filterStatus.value === 'rejected') {
    return applications.value.filter((a) => a.displayStatus === 'Rejected')
  }
  return applications.value
})

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSearchToken(token) {
  if (!token) return ''
  if (/^\d+$/.test(token)) return String(Number(token))
  return token
}

function tokenizeSearchValue(value) {
  const normalized = normalizeSearchText(value)
  if (!normalized) return []

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeSearchToken(token))
}

function getSearchTokens(value) {
  return tokenizeSearchValue(value)
}

function getDateSearchValues(dateValue) {
  if (!dateValue) return []
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return [String(dateValue)]

  const monthLong = date.toLocaleDateString('en-US', { month: 'long' })
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()

  return [
    monthLong,
    monthShort,
    `${monthLong} ${day}`,
    `${monthLong} ${day} ${year}`,
    `${monthShort} ${day}`,
    `${monthShort} ${day} ${year}`,
    `day ${day}`,
    String(day),
    String(year),
  ]
}

function getApplicationSearchTokenSet(app) {
  const dateTerms = getDateSearchValues(app?.dateFiled)

  const searchTokens = [
    'application',
    app?.id,
    app?.rawStatus,
    app?.status,
    app?.displayStatus,
    app?.leaveType,
    app?.employeeName,
    app?.firstname,
    app?.middlename,
    app?.surname,
    app?.employee_id,
    app?.office,
    ...dateTerms,
  ].flatMap((value) => tokenizeSearchValue(value))

  return new Set(searchTokens)
}

const filteredApps = computed(() => {
  const queryTokens = getSearchTokens(statusSearch.value)
  const rows = statusFilteredApps.value
  if (!queryTokens.length) return rows

  return rows.filter((app) => {
    const searchTokens = getApplicationSearchTokenSet(app)
    return queryTokens.every((token) => searchTokens.has(token))
  })
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'employee', label: 'Employee', align: 'left' },
  { name: 'office', label: 'Department', field: 'office', align: 'left' },
  {
    name: 'leaveType',
    label: 'Leave Type',
    field: (row) => row.is_monetization ? `${row.leaveType} (Monetization)` : row.leaveType,
    align: 'left',
  },
  {
    name: 'startDate',
    label: 'Start',
    field: (row) => row.startDate ? formatDate(row.startDate) : (row.is_monetization ? 'N/A' : ''),
    align: 'left',
  },
  { name: 'days', label: 'Days', field: 'days', align: 'left' },
  { name: 'status', label: 'Status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const showDetailsDialog = ref(false)
const showRejectDialog = ref(false)
const selectedApp = ref(null)
const rejectId = ref('')
const remarks = ref('')

async function fetchApplications() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/dashboard')
    const rawApps = Array.isArray(data.applications) ? data.applications : []
    applications.value = rawApps.map((app) => ({
      ...app,
      displayStatus: mergeStatus(app),
    }))
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load applications right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchApplications)

watch(
  () => route.query.status,
  (value) => {
    filterStatus.value = toFilterValue(value)
  },
  { immediate: true },
)

watch([filterStatus, statusSearch], () => {
  tablePagination.value.page = 1
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function openDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}

async function handleApprove(id) {
  actionLoading.value = true
  try {
    await api.post(`/hr/leave-applications/${id}/approve`)
    $q.notify({
      type: 'positive',
      message: 'Leave application approved! Balance deducted if credit-based.',
      position: 'top',
    })
    showDetailsDialog.value = false
    await fetchApplications()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to approve this application right now.')
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
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason for rejection',
      position: 'top',
    })
    return
  }

  actionLoading.value = true
  try {
    await api.post(`/hr/leave-applications/${rejectId.value}/reject`, {
      remarks: remarks.value,
    })
    $q.notify({
      type: 'info',
      message: 'Leave application rejected with remarks',
      position: 'top',
    })
    showRejectDialog.value = false
    await fetchApplications()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to reject this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}
</script>
