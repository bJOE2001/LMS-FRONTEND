<template>
  <q-page class="q-pa-md biometric-logs-page">
    <!-- Page Header -->
    <div class="row justify-between items-center q-col-gutter-sm q-mb-lg">
      <div class="col-auto">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">
          Enrollment Logs
        </h1>
      </div>
      <div class="col-12 col-sm-auto">
        <HeaderDateRangePicker
          v-model:start-date="filters.start_date"
          v-model:end-date="filters.end_date"
        />
      </div>
    </div>

    <!-- Filter Bar -->
    <DataFilterBar
      v-model:search="searchTerm"
      search-placeholder="Search employee, control no, office, device SN, performed by..."
      search-class="col-12 col-md"
      :loading="loading && rows.length === 0"
      :skeleton-filter-count="2"
      :skeleton-has-action="false"
    >
      <div class="col-6 col-md-3">
        <q-select
          v-model="filters.action_type"
          :options="actionTypeOptions"
          outlined
          dense
          options-dense
          label="Action Type"
        />
      </div>
      <div class="col-6 col-md-3">
        <q-select
          v-model="filters.status"
          :options="statusOptions"
          outlined
          dense
          options-dense
          label="Status"
        />
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

      <template #body-cell-office_device="props">
        <q-td :props="props">
          <div v-if="getOfficeDeviceEndpoints(props.row).length > 0" class="office-device-route">
            <template
              v-for="(endpoint, idx) in getOfficeDeviceEndpoints(props.row)"
              :key="endpoint.side"
            >
              <q-icon
                v-if="idx > 0"
                name="arrow_forward"
                size="14px"
                class="text-grey-6 office-device-arrow"
              />
              <div class="office-device-side">
                <div v-if="endpoint.label" class="text-dark text-weight-medium">
                  {{ endpoint.label }}
                  <q-tooltip v-if="endpoint.tooltip" anchor="top middle" self="bottom middle">
                    {{ endpoint.tooltip }}
                  </q-tooltip>
                </div>
                <div v-if="endpoint.sn" class="text-caption text-grey-7 font-mono">
                  {{ endpoint.sn }}
                </div>
              </div>
            </template>
          </div>
          <span v-else class="text-grey-6">—</span>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-chip
            dense
            square
            :color="statusColor(props.row.status)"
            text-color="white"
            class="text-weight-bold q-my-none"
          >
            {{ props.row.status }}
            <q-tooltip v-if="props.row.remarks" max-width="360px">
              {{ props.row.remarks }}
            </q-tooltip>
          </q-chip>
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
import HeaderDateRangePicker from 'src/components/common/HeaderDateRangePicker.vue'
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
  fetch: fetchLogs,
  onRequest,
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
  { name: 'office_device', label: 'Office / Device', align: 'left', field: 'target_office_name' },
  { name: 'status', label: 'Status', align: 'center', field: 'status' },
  { name: 'created_at', label: 'Date/Time', align: 'left', field: 'created_at' },
  { name: 'performed_by_name', label: 'Performed By', align: 'left', field: 'performed_by_name' },
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

function buildOfficeDeviceEndpoint(row, side) {
  const acronym = row?.[`${side}_office_acronym`]
  const fullName = String(row?.[`${side}_office_name`] || '').trim()
  const label = acronym || formatOfficeAbbreviation(fullName)
  const sn = String(row?.[`${side}_device_sn`] || '').trim()
  if ((!label || label === '—') && !sn) return null

  return {
    side,
    label: label === '—' ? '' : label,
    tooltip: fullName && fullName !== label ? fullName : '',
    sn,
  }
}

function getOfficeDeviceEndpoints(row) {
  return [
    buildOfficeDeviceEndpoint(row, 'source'),
    buildOfficeDeviceEndpoint(row, 'target'),
  ].filter(Boolean)
}

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return qDate.formatDate(parsed, 'MMM D, YYYY h:mm A')
}

onMounted(fetchLogs)
</script>

<style scoped>
.office-device-route {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.office-device-side {
  min-width: 0;
  line-height: 1.25;
}

.office-device-arrow {
  flex-shrink: 0;
}
</style>
