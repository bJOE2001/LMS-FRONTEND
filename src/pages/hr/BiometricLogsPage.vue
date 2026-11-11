<template>
  <q-page class="q-pa-md biometric-logs-page">
    <!-- Page Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center no-wrap">
        <q-avatar size="42px" color="blue-1" text-color="primary" class="q-mr-md">
          <q-icon name="receipt_long" size="24px" />
        </q-avatar>
        <div>
          <h1 class="text-h5 text-weight-bold text-dark q-my-none">
            Biometric Transfer &amp; Registration Logs
          </h1>
          <div class="text-caption text-grey-7 q-mt-xs">
            Audit trail of biometric registrations, transfers, assignments and removals
          </div>
        </div>
      </div>
      <div class="row items-center q-gutter-x-sm">
        <q-btn
          outline
          no-caps
          color="primary"
          icon="refresh"
          label="Refresh"
          :loading="loading"
          @click="fetchLogs"
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="download"
          label="Export CSV"
          class="text-weight-bold"
          :loading="exporting"
          @click="exportCsv"
        />
      </div>
    </div>

    <!-- Filter Bar -->
    <q-card flat bordered class="rounded-borders bg-white q-mb-md">
      <q-card-section class="q-py-sm">
        <div class="row items-center q-col-gutter-sm">
          <div class="col-12 col-md-4">
            <q-input
              v-model="searchTerm"
              outlined
              dense
              clearable
              placeholder="Search employee, control no, office, device SN, performed by..."
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-6 col-md-2">
            <q-select
              v-model="actionTypeFilter"
              :options="actionTypeOptions"
              outlined
              dense
              options-dense
              label="Action Type"
            />
          </div>
          <div class="col-6 col-md-2">
            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              outlined
              dense
              options-dense
              label="Status"
            />
          </div>
          <div class="col-6 col-md-2">
            <q-input v-model="startDate" outlined dense type="date" label="Start Date" stack-label />
          </div>
          <div class="col-6 col-md-2">
            <div class="row items-center no-wrap">
              <q-input
                v-model="endDate"
                outlined
                dense
                type="date"
                label="End Date"
                stack-label
                class="col"
              />
              <q-btn
                v-if="startDate || endDate"
                flat
                round
                dense
                icon="clear"
                color="grey-7"
                class="q-ml-xs"
                @click="clearDates"
              >
                <q-tooltip>Clear date range</q-tooltip>
              </q-btn>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Logs Table -->
    <q-table
      v-model:pagination="pagination"
      :rows="rows"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="loading"
      :rows-per-page-options="[10, 20, 50, 100]"
      binary-state-sort
      no-data-label="No biometric logs found"
      @request="onRequest"
    >
      <template #body-cell-created_at="props">
        <q-td :props="props">
          <span class="text-no-wrap">{{ formatDateTime(props.row.created_at) }}</span>
        </q-td>
      </template>

      <template #body-cell-employee_control_no="props">
        <q-td :props="props">
          <code class="text-caption">{{ props.row.employee_control_no || '—' }}</code>
        </q-td>
      </template>

      <template #body-cell-action_type="props">
        <q-td :props="props">
          <q-badge
            :color="actionColor(props.row.action_type)"
            :label="props.row.action_type"
            class="text-weight-bold q-px-sm q-py-xs"
          />
        </q-td>
      </template>

      <template #body-cell-source="props">
        <q-td :props="props">
          <div class="text-dark text-weight-medium">
            {{ formatOfficeAbbreviation(props.row.source_office_name) }}
            <q-tooltip
              v-if="props.row.source_office_name && props.row.source_office_name !== formatOfficeAbbreviation(props.row.source_office_name)"
              anchor="top middle"
              self="bottom middle"
            >
              {{ props.row.source_office_name }}
            </q-tooltip>
          </div>
          <div v-if="props.row.source_device_sn" class="text-caption text-grey-7 font-mono">
            {{ props.row.source_device_sn }}
          </div>
        </q-td>
      </template>

      <template #body-cell-target="props">
        <q-td :props="props">
          <div class="text-dark text-weight-medium">
            {{ formatOfficeAbbreviation(props.row.target_office_name) }}
            <q-tooltip
              v-if="props.row.target_office_name && props.row.target_office_name !== formatOfficeAbbreviation(props.row.target_office_name)"
              anchor="top middle"
              self="bottom middle"
            >
              {{ props.row.target_office_name }}
            </q-tooltip>
          </div>
          <div v-if="props.row.target_device_sn" class="text-caption text-grey-7 font-mono">
            {{ props.row.target_device_sn }}
          </div>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip
            dense
            square
            :color="statusColor(props.row.status)"
            text-color="white"
            class="text-weight-bold"
          >
            {{ props.row.status }}
          </q-chip>
        </q-td>
      </template>

      <template #body-cell-remarks="props">
        <q-td :props="props" style="max-width: 280px">
          <div class="ellipsis">
            {{ simplifyRemarks(props.row.remarks) }}
            <q-tooltip v-if="props.row.remarks" max-width="360px">{{ props.row.remarks }}</q-tooltip>
          </div>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useQuasar, date as qDate } from 'quasar'
import { api } from 'src/boot/axios'
import { formatOfficeAbbreviation } from 'src/utils/office-acronym'

const $q = useQuasar()

const rows = ref([])
const loading = ref(false)
const exporting = ref(false)

const searchTerm = ref('')
const actionTypeOptions = ['ALL', 'TRANSFER', 'REGISTRATION', 'ASSIGN', 'REMOVE']
const statusOptions = ['ALL', 'SUCCESS', 'FAILED', 'PENDING']
const actionTypeFilter = ref('ALL')
const statusFilter = ref('ALL')
const startDate = ref('')
const endDate = ref('')

const pagination = ref({
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0,
})

const columns = [
  { name: 'employee_control_no', label: 'Control No', align: 'left', field: 'employee_control_no' },
  { name: 'employee_name', label: 'Employee Name', align: 'left', field: 'employee_name' },
  { name: 'action_type', label: 'Action Type', align: 'left', field: 'action_type' },
  { name: 'source', label: 'Source Office / Device', align: 'left', field: 'source_office_name' },
  { name: 'target', label: 'Target Office / Device', align: 'left', field: 'target_office_name' },
  { name: 'status', label: 'Status', align: 'center', field: 'status' },
  { name: 'created_at', label: 'Date/Time', align: 'left', field: 'created_at' },
  { name: 'performed_by_name', label: 'Performed By', align: 'left', field: 'performed_by_name' },
  { name: 'remarks', label: 'Remarks', align: 'left', field: 'remarks' },
]

const ACTION_COLORS = {
  TRANSFER: 'blue-8',
  REGISTRATION: 'purple-8',
  ASSIGN: 'teal-8',
  REMOVE: 'blue-grey-7',
}

const STATUS_COLORS = {
  SUCCESS: 'positive',
  FAILED: 'negative',
  PENDING: 'orange-8',
}

function actionColor(action) {
  return ACTION_COLORS[action] || 'grey-7'
}

function statusColor(status) {
  return STATUS_COLORS[status] || 'grey-6'
}

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return qDate.formatDate(parsed, 'MMM D, YYYY h:mm A')
}

function simplifyRemarks(text) {
  if (!text) return '—'
  const trimmed = String(text).trim()
  if (!trimmed || trimmed === '—') return '—'

  if (/Biometrics.*?(\d+).*?transferred/i.test(trimmed)) {
    const match = trimmed.match(/Biometrics.*?(\d+).*?transferred/i)
    return `Transferred (${match[1]} template synced)`
  }
  if (/User profile provisioned.*scan/i.test(trimmed) || /provisioned.*local.*scan/i.test(trimmed)) {
    return 'Profile provisioned; scan needed'
  }
  if (/Employee removed from office/i.test(trimmed)) {
    return 'Removed from office terminal'
  }
  if (/Registration initiated.*scan/i.test(trimmed)) {
    return 'Registration initiated; awaiting scan'
  }
  if (/Provisioned profile and synced\s*(\d+)/i.test(trimmed)) {
    const match = trimmed.match(/Provisioned profile and synced\s*(\d+)/i)
    return `Registered (${match[1]} template synced)`
  }
  if (/Biometric enrollment reconciled/i.test(trimmed)) {
    return 'Enrollment confirmed via punch log'
  }

  return trimmed
}

function buildParams(page, perPage) {
  const params = { page, per_page: perPage }
  const search = (searchTerm.value || '').trim()
  if (search) params.search = search
  if (actionTypeFilter.value !== 'ALL') params.action_type = actionTypeFilter.value
  if (statusFilter.value !== 'ALL') params.status = statusFilter.value
  if (startDate.value) params.start_date = startDate.value
  if (endDate.value) params.end_date = endDate.value
  return params
}

async function fetchLogs() {
  loading.value = true
  try {
    const { page, rowsPerPage } = pagination.value
    const { data } = await api.get('/biometric/transfer-logs', {
      params: buildParams(page, rowsPerPage),
    })
    rows.value = data.logs || []
    pagination.value.rowsNumber = data.total ?? rows.value.length
    pagination.value.page = data.current_page ?? page
  } catch (err) {
    console.error('Failed to load biometric logs:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load biometric logs.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page
  pagination.value.rowsPerPage = props.pagination.rowsPerPage
  fetchLogs()
}

function clearDates() {
  startDate.value = ''
  endDate.value = ''
}

let searchTimer = null
watch(searchTerm, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.page = 1
    fetchLogs()
  }, 400)
})

watch([actionTypeFilter, statusFilter, startDate, endDate], () => {
  pagination.value.page = 1
  fetchLogs()
})

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

async function exportCsv() {
  exporting.value = true
  try {
    const perPage = 100
    const maxPages = 100
    let page = 1
    let lastPage = 1
    const all = []
    do {
      const { data } = await api.get('/biometric/transfer-logs', {
        params: buildParams(page, perPage),
      })
      all.push(...(data.logs || []))
      lastPage = data.last_page || 1
      page += 1
    } while (page <= lastPage && page <= maxPages)

    if (all.length === 0) {
      $q.notify({ type: 'warning', message: 'No logs to export.', position: 'top' })
      return
    }

    const headers = [
      'Control No',
      'Employee Name',
      'Action Type',
      'Source Office',
      'Source Device SN',
      'Target Office',
      'Target Device SN',
      'Status',
      'Date/Time',
      'Performed By',
      'Remarks',
    ]
    const lines = all.map((r) =>
      [
        r.employee_control_no,
        r.employee_name,
        r.action_type,
        formatOfficeAbbreviation(r.source_office_name),
        r.source_device_sn,
        formatOfficeAbbreviation(r.target_office_name),
        r.target_device_sn,
        r.status,
        formatDateTime(r.created_at),
        r.performed_by_name,
        simplifyRemarks(r.remarks),
      ]
        .map(csvCell)
        .join(','),
    )
    const csv = '\uFEFF' + [headers.map(csvCell).join(','), ...lines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `biometric-logs-${qDate.formatDate(new Date(), 'YYYYMMDD-HHmmss')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    $q.notify({
      type: 'positive',
      message: `Exported ${all.length} log${all.length === 1 ? '' : 's'}.`,
      position: 'top',
    })
  } catch (err) {
    console.error('Failed to export biometric logs:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to export biometric logs.',
      position: 'top',
    })
  } finally {
    exporting.value = false
  }
}

onMounted(fetchLogs)
</script>
