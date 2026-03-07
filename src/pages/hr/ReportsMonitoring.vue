<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Reports & Monitoring</h1>
        <p class="text-grey-7">Generate and view comprehensive leave reports</p>
      </div>
      <q-btn-dropdown
        unelevated
        color="green-7"
        icon="download"
        label="Export Data"
        dropdown-icon="arrow_drop_down"
      >
        <q-list>
          <q-item clickable v-close-popup @click="exportData('Excel')">
            <q-item-section avatar><q-icon name="table_chart" color="green" /></q-item-section>
            <q-item-section>Excel (.xlsx)</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportData('CSV')">
            <q-item-section avatar><q-icon name="table_rows" color="primary" /></q-item-section>
            <q-item-section>CSV File</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportData('PDF')">
            <q-item-section avatar><q-icon name="picture_as_pdf" color="red" /></q-item-section>
            <q-item-section>PDF Report</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Generate Report</div>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-select v-model="reportType" :options="reportTypeOptions" outlined dense />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateFrom" type="date" outlined dense />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateTo" type="date" outlined dense />
          </div>
          <div class="col-12 col-md-2">
            <q-btn unelevated color="primary" icon="description" label="Generate" @click="showReportModal = true" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="stat in summaryStats" :key="stat.label" class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders">
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

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section><div class="text-h6">Department Statistics</div></q-card-section>
      <q-table :rows="deptStats" :columns="deptColumns" row-key="dept" flat hide-pagination :rows-per-page-options="[0]" />
    </q-card>

    <q-dialog v-model="showReportModal" position="standard">
      <q-card style="min-width: 560px; max-width: 90vw">
        <q-card-section class="bg-primary text-white"><div class="text-h6">{{ reportType }} - Preview</div></q-card-section>
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
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLeaveStore } from 'stores/leave-store'

const $q = useQuasar()
const leaveStore = useLeaveStore()

const reportType = ref('Monthly Summary')
const dateFrom = ref('')
const dateTo = ref('')
const showReportModal = ref(false)

const reportTypeOptions = ['Monthly Summary', 'Department Report', 'Leave Type Analysis']

const approvedCount = computed(() => leaveStore.applications.filter((a) => a.status === 'Approved').length)
const pendingCount = computed(() => leaveStore.applications.filter((a) => a.status === 'Pending').length)
const approvalRate = computed(() =>
  leaveStore.applications.length ? Math.round((approvedCount.value / leaveStore.applications.length) * 100) : 0
)

const summaryStats = computed(() => [
  { label: 'Total Applications', value: leaveStore.applications.length, icon: 'description', color: 'primary' },
  { label: 'Approval Rate', value: `${approvalRate.value}%`, icon: 'trending_up', color: 'green' },
  { label: 'Avg Processing', value: '2.3d', icon: 'schedule', color: 'warning' },
  { label: 'Active Employees', value: '156', icon: 'people', color: 'purple' },
])

const deptStats = [
  { dept: 'City Planning & Development', total: 32, onLeave: 2, pending: 1, approved: 8, rate: 65 },
  { dept: 'Human Resources', total: 18, onLeave: 1, pending: 0, approved: 5, rate: 58 },
  { dept: 'Finance Department', total: 24, onLeave: 1, pending: 1, approved: 6, rate: 72 },
]
const deptColumns = [
  { name: 'dept', label: 'Department', field: 'dept', align: 'left' },
  { name: 'total', label: 'Total', field: 'total', align: 'left' },
  { name: 'onLeave', label: 'On Leave', field: 'onLeave', align: 'left' },
  { name: 'pending', label: 'Pending', field: 'pending', align: 'left' },
  { name: 'approved', label: 'Approved', field: 'approved', align: 'left' },
  { name: 'rate', label: 'Utilization %', field: 'rate', align: 'left' },
]

function downloadReport() {
  $q.notify({ type: 'info', message: 'Downloading report...', position: 'top' })
}
function exportData(format) {
  $q.notify({ type: 'info', message: `Exporting as ${format}...`, position: 'top' })
}
</script>
