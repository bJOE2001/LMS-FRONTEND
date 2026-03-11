<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Reports</h1>
        <p class="text-grey-7">View and export leave application reports</p>
      </div>
      <q-btn-dropdown
        v-model="showExportDropdown"
        color="green-7"
        icon="download"
        label="Export Data"
        dropdown-icon="arrow_drop_down"
      >
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

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Generate Report</div>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-select
              v-model="reportType"
              :options="reportTypeOptions"
              outlined
              dense
              label="Report Type"
            />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateFrom" type="date" outlined dense label="From" />
          </div>
          <div class="col-12 col-md-2">
            <q-input v-model="dateTo" type="date" outlined dense label="To" />
          </div>
          <div class="col-12 col-md-2">
            <q-btn
              unelevated
              color="primary"
              icon="description"
              label="Generate"
              @click="showReportModal = true"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-model="showReportModal" position="standard">
      <q-card style="min-width: 560px; max-width: 90vw">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">{{ reportType }} - Preview</div>
        </q-card-section>
        <q-card-section>
          <div class="text-center q-mb-lg">
            <div class="text-h5">City Government</div>
            <div class="text-subtitle1">Leave Management System</div>
            <div class="text-caption text-grey-7">Generated: {{ new Date().toLocaleDateString() }}</div>
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption">Total</div>
                  <div class="text-h5 text-primary">{{ adminApplications.length }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption">Approved</div>
                  <div class="text-h5 text-green-8">{{ approvedCount }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption">Pending</div>
                  <div class="text-h5 text-warning">{{ pendingCount }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            icon="download"
            label="Download PDF"
            @click="downloadReport"
            v-close-popup
          />
        </q-card-actions>
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

const reportType = ref('Monthly Summary')
const dateFrom = ref('')
const dateTo = ref('')
const showReportModal = ref(false)
const showExportDropdown = ref(false)
const adminApplications = ref([])

const reportTypeOptions = ['Monthly Summary', 'Department Report', 'Approval Report', 'Leave Type Analysis']

function getApplicationStatusLabel(application) {
  if (application?.status) return application.status
  if (application?.rawStatus === 'PENDING_ADMIN') return 'Pending Admin'
  if (application?.rawStatus === 'PENDING_HR') return 'Pending HR'
  if (application?.rawStatus === 'APPROVED') return 'Approved'
  if (application?.rawStatus === 'REJECTED') return 'Rejected'
  return 'Unknown'
}

const approvedCount = computed(() => (
  adminApplications.value.filter((application) => getApplicationStatusLabel(application) === 'Approved').length
))

const pendingCount = computed(() => (
  adminApplications.value.filter((application) => {
    const status = getApplicationStatusLabel(application)
    return status === 'Pending Admin' || status === 'Pending HR'
  }).length
))

async function fetchAdminApplications() {
  try {
    const { data } = await api.get('/admin/dashboard')
    adminApplications.value = Array.isArray(data?.applications) ? data.applications : []
  } catch (err) {
    adminApplications.value = []
    const msg = resolveApiErrorMessage(err, 'Unable to load report data right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  }
}

onMounted(() => {
  fetchAdminApplications()
})

function downloadReport() {
  $q.notify({ type: 'info', message: 'Downloading report...', position: 'top' })
}

function exportData(format) {
  $q.notify({ type: 'info', message: `Exporting as ${format}...`, position: 'top' })
  showExportDropdown.value = false
}
</script>
