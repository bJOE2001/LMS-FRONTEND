<template>
  <q-page class="q-pa-md attendance-logs-page">
    <!-- Page Header -->
    <div class="row justify-between items-center q-col-gutter-sm q-mb-lg">
      <div class="col-auto">
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Punch Logs</h1>
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
      search-placeholder="Search employee, control no, PIN, device, office..."
      search-class="col-12 col-sm-6 col-md-6"
      :loading="loading && rows.length === 0"
      :skeleton-filter-count="2"
      :skeleton-has-action="false"
    >
      <div class="col-6 col-sm-3 col-md-3">
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
        />
      </div>
      <div class="col-6 col-sm-3 col-md-3">
        <q-select
          v-model="filters.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          options-dense
          label="Status"
        />
      </div>
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
          <code
            class="text-caption text-weight-bold"
            :class="props.row.is_voided ? 'text-grey-6' : ''"
          >
            {{ props.row.biometric_pin || props.row.employee_control_no || '—' }}
          </code>
        </q-td>
      </template>

      <template #body-cell-employee_name="props">
        <q-td :props="props">
          <div
            class="text-weight-medium"
            :class="props.row.is_voided ? 'text-grey-6' : 'text-dark'"
          >
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
          <div class="row items-center no-wrap q-gutter-xs">
            <span
              class="text-no-wrap text-weight-medium"
              :class="props.row.is_voided ? 'text-strike text-grey-6' : ''"
            >
              {{ formatDateTime(props.row.punch_time) }}
            </span>
            <q-badge
              v-if="props.row.is_voided"
              color="negative"
              label="VOIDED"
              class="text-weight-bold"
            >
              <q-tooltip anchor="top middle" self="bottom middle">
                <div>Voided by {{ props.row.voided_by_name || 'HR' }}</div>
                <div v-if="props.row.voided_at">{{ formatDateTime(props.row.voided_at) }}</div>
                <div v-if="props.row.void_reason">Reason: {{ props.row.void_reason }}</div>
              </q-tooltip>
            </q-badge>
          </div>
          <div
            v-if="props.row.is_voided && props.row.void_reason"
            class="text-caption text-negative q-mt-xs"
          >
            {{ props.row.void_reason }}
          </div>
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

      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <q-btn
            v-if="!props.row.is_voided"
            flat
            round
            dense
            size="sm"
            color="negative"
            icon="delete_outline"
            aria-label="Void punch log"
            @click="openVoidDialog(props.row)"
          >
            <q-tooltip anchor="top middle" self="bottom middle">Void</q-tooltip>
          </q-btn>
          <q-btn
            v-else
            flat
            round
            dense
            size="sm"
            color="positive"
            icon="restore"
            aria-label="Restore punch log"
            @click="openRestoreDialog(props.row)"
          >
            <q-tooltip anchor="top middle" self="bottom middle">Restore</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </DataTableCard>

    <!-- Void Punch Dialog -->
    <AppDialog
      v-model="voidDialog.open"
      title="Void Punch Log"
      icon="delete_outline"
      header-color="negative"
      max-width="480px"
      :loading="submittingAction"
      submit-label="Void Punch"
      submit-icon="delete_outline"
      submit-color="negative"
      :submit-disable="voidDialog.reason.trim().length < 3"
      @cancel="closeVoidDialog"
      @submit="confirmVoidPunch"
    >
      <div v-if="voidDialog.row" class="bg-grey-2 rounded-borders q-pa-sm text-body2">
        <div class="text-weight-bold text-dark">
          {{ voidDialog.row.employee_name || 'Unlinked Employee' }}
        </div>
        <div class="text-caption text-grey-8 q-mt-xs">
          PIN:
          <code>{{
            voidDialog.row.biometric_pin || voidDialog.row.employee_control_no || '—'
          }}</code>
          &nbsp;&bull;&nbsp;
          {{ formatDateTime(voidDialog.row.punch_time) }}
        </div>
        <div class="text-caption text-grey-7">
          Device:
          {{ voidDialog.row.office_acronym || voidDialog.row.office_name || 'Unassigned Device' }}
          <span v-if="voidDialog.row.device_serial_number"
            >({{ voidDialog.row.device_serial_number }})</span
          >
        </div>
      </div>

      <div>
        <div class="text-caption text-grey-7 q-mb-xs">Quick reasons</div>
        <div class="row q-gutter-xs">
          <q-chip
            v-for="preset in VOID_REASON_PRESETS"
            :key="preset"
            clickable
            dense
            :outline="voidDialog.reason.trim() !== preset"
            :color="voidDialog.reason.trim() === preset ? 'negative' : 'grey-7'"
            :text-color="voidDialog.reason.trim() === preset ? 'white' : 'grey-8'"
            @click="voidDialog.reason = preset"
          >
            {{ preset }}
          </q-chip>
        </div>
      </div>

      <q-input
        v-model="voidDialog.reason"
        type="textarea"
        rows="2"
        outlined
        dense
        autofocus
        maxlength="255"
        counter
        label="Reason for voiding *"
        placeholder="e.g. Accidental biometric punch outside shift"
        :rules="[
          (val) => (val && val.trim().length >= 3) || 'Please enter at least 3 characters',
        ]"
      />
    </AppDialog>

    <!-- Restore Punch Dialog -->
    <AppDialog
      v-model="restoreDialog.open"
      title="Restore Punch Log"
      icon="restore"
      header-color="positive"
      max-width="440px"
      body-class="q-gutter-sm"
      :loading="submittingAction"
      submit-label="Restore Punch"
      submit-icon="restore"
      submit-color="positive"
      @cancel="closeRestoreDialog"
      @submit="confirmRestorePunch"
    >
      <div v-if="restoreDialog.row" class="bg-grey-2 rounded-borders q-pa-sm text-body2">
        <div class="text-weight-bold text-dark">
          {{ restoreDialog.row.employee_name || 'Unlinked Employee' }}
        </div>
        <div class="text-caption text-grey-8 q-mt-xs">
          PIN:
          <code>{{
            restoreDialog.row.biometric_pin || restoreDialog.row.employee_control_no || '—'
          }}</code>
          &nbsp;&bull;&nbsp;
          {{ formatDateTime(restoreDialog.row.punch_time) }}
        </div>
        <div v-if="restoreDialog.row.void_reason" class="text-caption text-negative q-mt-xs">
          Void reason: {{ restoreDialog.row.void_reason }}
        </div>
      </div>
    </AppDialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { date as qDate, useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { formatOfficeAbbreviation, resolveOfficeAcronymLabel } from 'src/utils/office-acronym'
import AppDialog from 'src/components/common/AppDialog.vue'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import HeaderDateRangePicker from 'src/components/common/HeaderDateRangePicker.vue'
import { useDataTable } from 'src/composables/useDataTable'

const $q = useQuasar()

const availableOffices = ref([])

const statusOptions = [
  { label: 'All Punches', value: 'all' },
  { label: 'Active Only', value: 'active' },
  { label: 'Voided Only', value: 'voided' },
]

const VOID_REASON_PRESETS = [
  'Accidental punch',
  'Double punch',
  'Wrong terminal',
  'Outside shift mistake',
]

const submittingAction = ref(false)
const voidDialog = ref({
  open: false,
  row: null,
  reason: '',
})
const restoreDialog = ref({
  open: false,
  row: null,
})

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
    department_id: 'ALL',
    status: 'all',
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
      status: activeFilters.status || 'all',
    }

    if (search) params.search = search
    if (activeFilters.department_id !== 'ALL') params.department_id = activeFilters.department_id
    if (activeFilters.start_date) params.start_date = activeFilters.start_date
    if (activeFilters.end_date) params.end_date = activeFilters.end_date

    try {
      const { data } = await api.get('/hr/attendance-logs', { params })

      if (Array.isArray(data.filters?.offices)) {
        availableOffices.value = data.filters.offices
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
    label: resolveOfficeAcronymLabel(office) || formatOfficeAbbreviation(office.office_name),
    value: office.department_id,
  })),
])

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
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    field: 'actions',
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

function openVoidDialog(row) {
  voidDialog.value = {
    open: true,
    row,
    reason: '',
  }
}

function closeVoidDialog() {
  if (submittingAction.value) return
  voidDialog.value = {
    open: false,
    row: null,
    reason: '',
  }
}

async function confirmVoidPunch() {
  const row = voidDialog.value.row
  const reason = voidDialog.value.reason.trim()
  if (!row || reason.length < 3 || submittingAction.value) return

  submittingAction.value = true
  try {
    const { data } = await api.post(`/hr/attendance-logs/${row.id}/void`, {
      void_reason: reason,
    })

    $q.notify({
      type: data?.dtr_is_adjusted ? 'warning' : 'positive',
      message: data?.message || 'Punch log voided and DTR recalculated.',
      position: 'top',
      timeout: data?.dtr_is_adjusted ? 5000 : 3500,
    })

    voidDialog.value = { open: false, row: null, reason: '' }
    await fetchLogs()
  } catch (err) {
    console.error('Failed to void punch log:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to void punch log.',
      position: 'top',
    })
  } finally {
    submittingAction.value = false
  }
}

function openRestoreDialog(row) {
  restoreDialog.value = {
    open: true,
    row,
  }
}

function closeRestoreDialog() {
  if (submittingAction.value) return
  restoreDialog.value = {
    open: false,
    row: null,
  }
}

async function confirmRestorePunch() {
  const row = restoreDialog.value.row
  if (!row || submittingAction.value) return

  submittingAction.value = true
  try {
    const { data } = await api.post(`/hr/attendance-logs/${row.id}/restore`)

    $q.notify({
      type: data?.dtr_is_adjusted ? 'warning' : 'positive',
      message: data?.message || 'Punch log restored and DTR recalculated.',
      position: 'top',
      timeout: data?.dtr_is_adjusted ? 5000 : 3500,
    })

    restoreDialog.value = { open: false, row: null }
    await fetchLogs()
  } catch (err) {
    console.error('Failed to restore punch log:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to restore punch log.',
      position: 'top',
    })
  } finally {
    submittingAction.value = false
  }
}

onMounted(fetchLogs)
</script>
