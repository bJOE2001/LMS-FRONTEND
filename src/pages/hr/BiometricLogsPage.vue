<template>
  <q-page class="q-pa-md biometric-logs-page">
    <!-- Page Header -->
    <div class="q-mb-lg">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">
        Biometric Logs
      </h1>
    </div>

    <!-- Filter Bar -->
    <DataFilterBar
      v-model:search="searchTerm"
      search-placeholder="Search employee, control no, office, device SN, performed by..."
      :show-reset="hasActiveFilters"
      @reset="resetFilters"
    >
      <div class="col-6 col-md-2">
        <q-select
          v-model="filters.action_type"
          :options="actionTypeOptions"
          outlined
          dense
          options-dense
          label="Action Type"
        />
      </div>
      <div class="col-6 col-md-2">
        <q-select
          v-model="filters.status"
          :options="statusOptions"
          outlined
          dense
          options-dense
          label="Status"
        />
      </div>
      <div class="col-6 col-md-2">
        <q-input v-model="filters.start_date" outlined dense type="date" label="Start Date" stack-label />
      </div>
      <div class="col-6 col-md-2">
        <div class="row items-center no-wrap">
          <q-input
            v-model="filters.end_date"
            outlined
            dense
            type="date"
            label="End Date"
            stack-label
            class="col"
          />
          <q-btn
            v-if="filters.start_date || filters.end_date"
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
    </DataFilterBar>

    <!-- Logs Table -->
    <DataTableCard
      v-model:pagination="pagination"
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      empty-icon="history"
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
            {{ props.row.source_office_acronym || formatOfficeAbbreviation(props.row.source_office_name) }}
            <q-tooltip
              v-if="
                props.row.source_office_name &&
                props.row.source_office_name !==
                  (props.row.source_office_acronym || formatOfficeAbbreviation(props.row.source_office_name))
              "
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
            {{ props.row.target_office_acronym || formatOfficeAbbreviation(props.row.target_office_name) }}
            <q-tooltip
              v-if="
                props.row.target_office_name &&
                props.row.target_office_name !==
                  (props.row.target_office_acronym || formatOfficeAbbreviation(props.row.target_office_name))
              "
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
    </DataTableCard>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useQuasar, date as qDate } from 'quasar'
import { api } from 'src/boot/axios'
import { formatOfficeAbbreviation } from 'src/utils/office-acronym'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import { useDataTable } from 'src/composables/useDataTable'

const $q = useQuasar()

const actionTypeOptions = ['ALL', 'TRANSFER', 'REGISTRATION', 'ASSIGN', 'REMOVE']
const statusOptions = ['ALL', 'SUCCESS', 'FAILED', 'PENDING']

const {
  search: searchTerm,
  filters,
  rows,
  loading,
  pagination,
  hasActiveFilters,
  fetch: fetchLogs,
  onRequest,
  resetFilters,
} = useDataTable({
  server: true,
  debounceMs: 400,
  initialFilters: {
    action_type: 'ALL',
    status: 'ALL',
    start_date: '',
    end_date: '',
  },
  initialPagination: {
    page: 1,
    rowsPerPage: 20,
    rowsNumber: 0,
  },
  onFetch: async ({ page, rowsPerPage, search, filters: activeFilters }) => {
    const params = { page, per_page: rowsPerPage }
    if (search) params.search = search
    if (activeFilters.action_type !== 'ALL') params.action_type = activeFilters.action_type
    if (activeFilters.status !== 'ALL') params.status = activeFilters.status
    if (activeFilters.start_date) params.start_date = activeFilters.start_date
    if (activeFilters.end_date) params.end_date = activeFilters.end_date

    try {
      const { data } = await api.get('/biometric/transfer-logs', { params })
      return {
        rows: data.logs || [],
        total: data.total ?? 0,
        currentPage: data.current_page ?? page,
      }
    } catch (err) {
      console.error('Failed to load biometric logs:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Failed to load biometric logs.',
        position: 'top',
      })
      return { rows: [], total: 0, currentPage: page }
    }
  },
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

function clearDates() {
  filters.start_date = ''
  filters.end_date = ''
}

onMounted(fetchLogs)
</script>
