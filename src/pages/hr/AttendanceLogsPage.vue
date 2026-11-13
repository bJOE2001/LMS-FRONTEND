<template>
  <q-page class="q-pa-md attendance-logs-page">
    <!-- Page Header -->
    <div class="row items-center justify-between q-col-gutter-sm q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">
          Attendance Logs
        </h1>
      </div>
      <div class="row items-center q-gutter-sm">
        <q-btn
          v-if="hasActiveFilters"
          outline
          no-caps
          color="grey-8"
          icon="filter_alt_off"
          label="Reset Filters"
          @click="resetFilters"
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="refresh"
          label="Refresh"
          :loading="loading"
          @click="fetchLogs"
        />
      </div>
    </div>

    <!-- Filter Bar -->
    <DataFilterBar
      v-model:search="searchTerm"
      search-placeholder="Search employee, control no, PIN, device, office..."
    >
      <div class="col-6 col-md-2">
        <q-select
          v-model="filters.department_id"
          :options="officeOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          options-dense
          label="Office"
          @update:model-value="onOfficeChange"
        />
      </div>
      <div class="col-6 col-md-2">
        <q-select
          v-model="filters.device_serial_number"
          :options="deviceOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          options-dense
          label="Device"
        />
      </div>
      <div class="col-6 col-md-2">
        <q-input
          v-model="filters.start_date"
          outlined
          dense
          type="date"
          label="Start Date"
          stack-label
        />
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

      <template #secondary>
        <div class="col-6 col-sm-6">
          <q-select
            v-model="filters.sync_source"
            :options="syncSourceOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            options-dense
            label="Sync Source"
          />
        </div>
        <div class="col-6 col-sm-6">
          <q-select
            v-model="filters.verify_type"
            :options="verifyTypeOptions"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            outlined
            dense
            options-dense
            label="Verify Mode"
          />
        </div>
      </template>
    </DataFilterBar>

    <!-- Attendance Logs Table -->
    <DataTableCard
      v-model:pagination="pagination"
      :rows="rows"
      :columns="columns"
      row-key="id"
      :loading="loading"
      empty-icon="fingerprint"
      no-data-label="No attendance logs found"
      @request="onRequest"
    >
      <template #body-cell-biometric_pin="props">
        <q-td :props="props">
          <code class="text-caption text-weight-bold">
            {{ props.row.biometric_pin || props.row.employee_control_no || '—' }}
          </code>
        </q-td>
      </template>

      <template #body-cell-employee_name="props">
        <q-td :props="props">
          <div class="text-weight-medium text-dark">
            {{ props.row.employee_name || '—' }}
          </div>
          <div v-if="props.row.designation" class="text-caption text-grey-7">
            {{ props.row.designation }}
          </div>
        </q-td>
      </template>

      <template #body-cell-device_serial_number="props">
        <q-td :props="props">
          <div class="text-dark text-weight-medium">
            {{ props.row.office_acronym || props.row.office_name || 'Unassigned Device' }}
            <q-tooltip
              v-if="
                props.row.office_name &&
                props.row.office_name !== (props.row.office_acronym || props.row.office_name)
              "
              anchor="top middle"
              self="bottom middle"
            >
              {{ props.row.office_name }}
            </q-tooltip>
          </div>
          <div v-if="props.row.device_serial_number" class="text-caption text-grey-7">
            <code>{{ props.row.device_serial_number }}</code>
          </div>
        </q-td>
      </template>

      <template #body-cell-punch_time="props">
        <q-td :props="props">
          <span class="text-no-wrap text-weight-medium">{{ formatDateTime(props.row.punch_time) }}</span>
        </q-td>
      </template>

      <template #body-cell-verify_type="props">
        <q-td :props="props" class="text-center">
          <q-chip
            dense
            outline
            color="grey-8"
            :icon="verifyTypeIcon(props.row.verify_type)"
            class="text-weight-medium"
          >
            {{ props.row.verify_type_label || '—' }}
          </q-chip>
        </q-td>
      </template>

      <template #body-cell-sync_source="props">
        <q-td :props="props" class="text-center">
          <q-badge
            :color="syncSourceColor(props.row.sync_source)"
            :label="syncSourceLabel(props.row.sync_source)"
            class="text-weight-bold q-px-sm q-py-xs"
          />
        </q-td>
      </template>
    </DataTableCard>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { date as qDate, useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import { useDataTable } from 'src/composables/useDataTable'

const $q = useQuasar()

const availableOffices = ref([])
const availableDevices = ref([])

const syncSourceOptions = [
  { label: 'All Sources', value: 'ALL' },
  { label: 'ADMS (Real-Time)', value: 'ADMS' },
  { label: 'LAN', value: 'LAN_POLL' },
  { label: 'USB Import', value: 'USB_IMPORT' },
]

const verifyTypeOptions = [
  { label: 'All Modes', value: 'ALL' },
  { label: 'Fingerprint', value: 1 },
  { label: 'Face', value: 15 },
  { label: 'Card', value: 4 },
  { label: 'Password', value: 0 },
]

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
    department_id: 'ALL',
    device_serial_number: 'ALL',
    sync_source: 'ALL',
    verify_type: 'ALL',
    start_date: '',
    end_date: '',
  },
  initialPagination: {
    sortBy: 'punch_time',
    descending: true,
    page: 1,
    rowsPerPage: 20,
    rowsNumber: 0,
  },
  onFetch: async ({ page, rowsPerPage, sortBy, descending, search, filters: activeFilters }) => {
    const params = {
      page,
      per_page: rowsPerPage,
      sort_by: sortBy || 'punch_time',
      sort_dir: descending ? 'desc' : 'asc',
    }

    if (search) params.search = search
    if (activeFilters.department_id !== 'ALL') params.department_id = activeFilters.department_id
    if (activeFilters.device_serial_number !== 'ALL') {
      params.device_serial_number = activeFilters.device_serial_number
    }
    if (activeFilters.sync_source !== 'ALL') params.sync_source = activeFilters.sync_source
    if (activeFilters.verify_type !== 'ALL') params.verify_type = activeFilters.verify_type
    if (activeFilters.start_date) params.start_date = activeFilters.start_date
    if (activeFilters.end_date) params.end_date = activeFilters.end_date

    try {
      const { data } = await api.get('/hr/attendance-logs', { params })

      if (Array.isArray(data.filters?.offices)) {
        availableOffices.value = data.filters.offices
      }
      if (Array.isArray(data.filters?.devices)) {
        availableDevices.value = data.filters.devices
      }

      return {
        rows: data.logs || [],
        total: data.total ?? 0,
        currentPage: data.current_page ?? page,
      }
    } catch (err) {
      console.error('Failed to load attendance logs:', err)
      $q.notify({
        type: 'negative',
        message: err.response?.data?.message || 'Failed to load attendance logs.',
        position: 'top',
      })
      return { rows: [], total: 0, currentPage: page }
    }
  },
})

const officeOptions = computed(() => [
  { label: 'All Offices', value: 'ALL' },
  ...availableOffices.value.map((office) => ({
    label: office.office_acronym
      ? `${office.office_acronym} — ${office.office_name}`
      : office.office_name,
    value: office.department_id,
  })),
])

const deviceOptions = computed(() => {
  const filtered =
    filters.department_id === 'ALL'
      ? availableDevices.value
      : availableDevices.value.filter((device) => device.department_id === filters.department_id)

  return [
    { label: 'All Devices', value: 'ALL' },
    ...filtered.map((device) => ({
      label: `${device.device_name} (${device.serial_number})`,
      value: device.serial_number,
    })),
  ]
})

const columns = [
  {
    name: 'biometric_pin',
    label: 'PIN',
    align: 'left',
    field: 'biometric_pin',
    sortable: true,
  },
  { name: 'employee_name', label: 'Employee Name', align: 'left', field: 'employee_name' },
  {
    name: 'device_serial_number',
    label: 'Office / Device',
    align: 'left',
    field: 'device_serial_number',
    sortable: true,
  },
  { name: 'punch_time', label: 'Punch Time', align: 'left', field: 'punch_time', sortable: true },
  {
    name: 'verify_type',
    label: 'Verify Mode',
    align: 'center',
    field: 'verify_type',
    sortable: true,
  },
  {
    name: 'sync_source',
    label: 'Sync Source',
    align: 'center',
    field: 'sync_source',
    sortable: true,
  },
]

const VERIFY_TYPE_ICONS = {
  0: 'pin',
  1: 'fingerprint',
  4: 'credit_card',
  15: 'face',
}

const SYNC_SOURCE_COLORS = {
  ADMS: 'blue-8',
  LAN_POLL: 'teal-8',
  USB_IMPORT: 'purple-8',
}

const SYNC_SOURCE_LABELS = {
  ADMS: 'ADMS',
  LAN_POLL: 'LAN',
  USB_IMPORT: 'USB_IMPORT',
}

function verifyTypeIcon(mode) {
  return VERIFY_TYPE_ICONS[mode] || 'verified_user'
}

function syncSourceColor(source) {
  return SYNC_SOURCE_COLORS[source] || 'grey-7'
}

function syncSourceLabel(source) {
  if (!source) return '—'
  return SYNC_SOURCE_LABELS[source] || source
}

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return qDate.formatDate(parsed, 'MMM D, YYYY h:mm:ss A')
}

function onOfficeChange(newOfficeId) {
  if (newOfficeId === 'ALL' || filters.device_serial_number === 'ALL') return
  const selectedDevice = availableDevices.value.find(
    (device) => device.serial_number === filters.device_serial_number
  )
  if (selectedDevice && selectedDevice.department_id !== newOfficeId) {
    filters.device_serial_number = 'ALL'
  }
}

function clearDates() {
  filters.start_date = ''
  filters.end_date = ''
}

onMounted(fetchLogs)
</script>
