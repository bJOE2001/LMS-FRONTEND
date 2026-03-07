<template>
  <q-page class="q-pa-md">
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Leave History</h1>
      <p class="text-grey-7">View all your leave applications and their status</p>
    </div>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-4">
            <q-select v-model="filterStatus" :options="statusOptions" label="Status" outlined dense emit-value map-options clearable />
          </div>
          <div class="col-12 col-md-4">
            <q-input v-model="searchText" placeholder="Search..." outlined dense clearable />
          </div>
        </div>
      </q-card-section>
      <q-table
        :rows="filteredApps"
        :columns="columns"
        row-key="id"
        flat
        hide-pagination
        :rows-per-page-options="[0]"
      >
        <template #no-data>
          <div class="full-width row justify-center items-center text-grey-7 q-gutter-sm q-pa-lg">
            <q-icon name="inbox" size="2em" />
            <span>No data available</span>
          </div>
        </template>
        <template #body-cell-status="props">
          <q-td><StatusBadge :status="props.row.status" /></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td>
            <q-btn flat dense round size="sm" icon="visibility" @click="openDetails(props.row)">
              <q-tooltip>View</q-tooltip>
            </q-btn>
            <q-btn flat dense round size="sm" icon="print" @click="printForm(props.row.id)">
              <q-tooltip>Print</q-tooltip>
            </q-btn>
            <q-btn v-if="props.row.status === 'Pending'" flat dense round size="sm" icon="cancel" color="negative" @click="confirmCancel(props.row.id)">
              <q-tooltip>Cancel</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showDetailsDialog" position="standard">
      <q-card v-if="selectedApp" style="min-width: 480px; max-width: 560px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Application Details</div>
        </q-card-section>
        <q-card-section class="q-gutter-y-md">
          <div class="row q-col-gutter-md">
            <div class="col-6"><div class="text-caption text-grey-7">Application ID</div><div class="text-weight-medium">{{ selectedApp.id }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Date Filed</div><div class="text-weight-medium">{{ formatDate(selectedApp.dateFiled) }}</div></div>
            <div class="col-12"><div class="text-caption text-grey-7">Leave Type</div><div class="text-weight-medium">{{ selectedApp.leaveType }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">Start Date</div><div class="text-weight-medium">{{ formatDate(selectedApp.startDate) }}</div></div>
            <div class="col-6"><div class="text-caption text-grey-7">End Date</div><div class="text-weight-medium">{{ formatDate(selectedApp.endDate) }}</div></div>
            <div class="col-12"><div class="text-caption text-grey-7">Number of Days</div><div class="text-weight-medium">{{ selectedApp.days }} day(s)</div></div>
            <div class="col-12"><div class="text-caption text-grey-7">Reason</div><div>{{ selectedApp.reason }}</div></div>
            <div class="col-12"><div class="text-caption text-grey-7">Status</div><StatusBadge :status="selectedApp.status" /></div>
            <div v-if="selectedApp.remarks" class="col-12"><div class="text-caption text-grey-7">Remarks</div><div class="bg-grey-3 q-pa-sm rounded-borders">{{ selectedApp.remarks }}</div></div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Print Form" color="primary" @click="printForm(selectedApp.id)" />
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showCancelDialog" persistent>
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">Cancel Application</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          Are you sure you want to cancel application <strong>#{{ cancelId }}</strong>? This action cannot be undone.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Keep Application" v-close-popup />
          <q-btn flat label="Cancel Application" color="negative" @click="doCancel" v-close-popup />
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
import StatusBadge from 'components/StatusBadge.vue'

const leaveStore = useLeaveStore()
const authStore = useAuthStore()
const myApplications = computed(() => leaveStore.myApplications)

onMounted(() => {
  if (authStore.user?.role === 'employee') {
    leaveStore.fetchMyApplications()
  }
})

const filterStatus = ref('')
const searchText = ref('')
const statusOptions = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Disapproved', value: 'Disapproved' },
]

const filteredApps = computed(() => {
  return myApplications.value.filter((app) => {
    const matchStatus = !filterStatus.value || app.status === filterStatus.value
    const matchSearch = !searchText.value ||
      app.leaveType.toLowerCase().includes(searchText.value.toLowerCase()) ||
      app.id.toLowerCase().includes(searchText.value.toLowerCase())
    return matchStatus && matchSearch
  })
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'leaveType', label: 'Leave Type', field: 'leaveType', align: 'left' },
  { name: 'startDate', label: 'Start Date', field: (row) => formatDate(row.startDate), align: 'left' },
  { name: 'endDate', label: 'End Date', field: (row) => formatDate(row.endDate), align: 'left' },
  { name: 'days', label: 'Days', field: 'days', align: 'left' },
  { name: 'status', label: 'Status', field: 'status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'right' },
]

const showDetailsDialog = ref(false)
const showCancelDialog = ref(false)
const selectedApp = ref(null)
const cancelId = ref('')

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
function openDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}
function printForm(id) {
  window.open(`#/print/${id}`, '_blank')
}
function confirmCancel(id) {
  cancelId.value = id
  showCancelDialog.value = true
}
const $q = useQuasar()
function doCancel() {
  $q.notify({ type: 'info', message: `Application #${cancelId.value} has been cancelled`, position: 'top' })
}
</script>
