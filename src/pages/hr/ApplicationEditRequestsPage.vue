<template>
  <q-page class="q-pa-md hr-edit-requests-page">
    <div class="hr-edit-requests-header q-mb-md">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">HR Edit Requests</h1>
      </div>
    </div>

    <q-banner v-if="!isHrAdminOwner" rounded class="bg-orange-1 text-orange-10 q-mb-md">
      Only HR Admin accounts can review staff edit requests.
    </q-banner>

    <div class="hr-edit-filter-bar q-mb-md">
      <q-input
        v-model="search"
        outlined
        dense
        clearable
        debounce="250"
        class="hr-edit-search"
        label="Search employee, leave type, date"
      >
        <template #prepend>
          <q-icon name="search" color="grey-6" />
        </template>
      </q-input>
      <q-btn-toggle
        v-model="statusFilter"
        unelevated
        no-caps
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="statusOptions"
        class="hr-edit-status-toggle"
        @update:model-value="fetchRequests"
      />
    </div>

    <q-card flat bordered class="hr-edit-table-card">
      <q-table
        :rows="filteredRequests"
        :columns="columns"
        row-key="id"
        flat
        binary-state-sort
        separator="horizontal"
        :loading="loading"
        :rows-per-page-options="[10, 20, 50]"
        table-header-class="hr-edit-table-header"
      >
        <template #body-cell-employee="props">
          <q-td :props="props" class="hr-edit-employee-cell">
            <div class="row items-center no-wrap">
              <q-avatar size="34px" color="green-1" text-color="green-9" icon="person" class="q-mr-sm" />
              <div class="min-width-0">
                <div class="text-weight-bold text-grey-10 ellipsis">
                  {{ formatEmployeeName(props.row.employee_name) }}
                </div>
                <div class="text-caption text-grey-7">{{ props.row.employee_control_no || 'N/A' }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-requested_at="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ formatDateTime(props.row.requested_at) }}</div>
            <div class="text-caption text-grey-7">{{ formatRequestedBy(props.row.requested_by) }}</div>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props" class="text-center">
            <q-badge
              rounded
              :color="getStatusColor(props.row.status)"
              text-color="white"
              :label="formatStatus(props.row.status)"
            />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-center hr-edit-actions-cell">
            <div class="row items-center justify-center no-wrap q-gutter-xs">
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="primary"
                @click="openDetails(props.row)"
              >
                <q-tooltip>View Details</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isPendingRequest(props.row)"
                unelevated
                dense
                round
                size="sm"
                icon="check"
                color="positive"
                :loading="approveLoadingId === props.row.id"
                @click="confirmApprove(props.row)"
              >
                <q-tooltip>Approve</q-tooltip>
              </q-btn>
              <q-btn
                v-if="isPendingRequest(props.row)"
                outline
                dense
                round
                size="sm"
                icon="close"
                color="negative"
                :loading="rejectLoadingId === props.row.id"
                @click="confirmReject(props.row)"
              >
                <q-tooltip>Reject</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width row flex-center q-pa-lg text-grey-7">
            <q-icon name="inbox" size="md" class="q-mr-sm" />
            <span>No edit requests found</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="detailsDialogOpen" @hide="selectedRequest = null">
      <q-card class="hr-edit-details-dialog">
        <q-card-section class="hr-edit-details-dialog__header">
          <div>
            <div class="text-h6 text-weight-bold">Edit Details</div>
            <div class="text-caption text-grey-7">
              {{ selectedRequest?.leave_type_name || 'Leave Application' }}
            </div>
          </div>
          <q-btn v-close-popup flat round dense icon="close" />
        </q-card-section>

        <q-separator />

        <q-card-section v-if="selectedRequest" class="q-gutter-md">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-4">
              <div class="hr-edit-detail-summary">
                <div class="text-caption text-grey-7">Employee</div>
                <div class="text-weight-bold">{{ formatEmployeeName(selectedRequest.employee_name) }}</div>
                <div class="text-caption text-grey-7">{{ selectedRequest.employee_control_no || 'N/A' }}</div>
              </div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="hr-edit-detail-summary">
                <div class="text-caption text-grey-7">Requested</div>
                <div class="text-weight-bold">{{ formatDateTime(selectedRequest.requested_at) }}</div>
                <div class="text-caption text-grey-7">{{ formatRequestedBy(selectedRequest.requested_by) }}</div>
              </div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="hr-edit-detail-summary">
                <div class="text-caption text-grey-7">Inclusive Dates</div>
                <div class="text-weight-bold">
                  {{ formatSelectedDates(selectedRequest.payload?.selected_dates) }}
                </div>
              </div>
            </div>
          </div>

          <div class="row q-gutter-xs">
            <q-badge rounded color="green-1" text-color="green-9" class="hr-edit-metric-badge">
              WP {{ formatDays(selectedRequest.payload?.deductible_days) }}
            </q-badge>
            <q-badge rounded color="blue-1" text-color="blue-9" class="hr-edit-metric-badge">
              W/oP {{ formatDays(selectedRequest.payload?.without_pay_days) }}
            </q-badge>
            <q-badge rounded :color="getStatusColor(selectedRequest.status)" text-color="white" class="hr-edit-metric-badge">
              {{ formatStatus(selectedRequest.status) }}
            </q-badge>
          </div>

          <q-table
            :rows="selectedDetailRows"
            :columns="detailColumns"
            row-key="dateKey"
            flat
            dense
            hide-bottom
            :pagination="{ rowsPerPage: 0 }"
            table-header-class="hr-edit-table-header"
            class="hr-edit-details-table"
          >
            <template #body-cell-date="props">
              <q-td :props="props" class="text-weight-bold">
                {{ formatDate(props.row.dateKey) }}
              </q-td>
            </template>

            <template #body-cell-payStatus="props">
              <q-td :props="props">
                <q-badge
                  rounded
                  :color="props.row.payStatus === 'WOP' ? 'blue-1' : 'green-1'"
                  :text-color="props.row.payStatus === 'WOP' ? 'blue-9' : 'green-9'"
                >
                  {{ props.row.payStatus }}
                </q-badge>
              </q-td>
            </template>

            <template #body-cell-withPayDays="props">
              <q-td :props="props" class="text-weight-bold text-green-9">
                {{ formatDays(props.row.withPayDays) }}
              </q-td>
            </template>

            <template #body-cell-withoutPayDays="props">
              <q-td :props="props" class="text-weight-bold text-blue-9">
                {{ formatDays(props.row.withoutPayDays) }}
              </q-td>
            </template>
          </q-table>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            v-if="isPendingRequest(selectedRequest)"
            outline
            color="negative"
            icon="close"
            label="Reject"
            :loading="rejectLoadingId === selectedRequest?.id"
            @click="confirmReject(selectedRequest)"
          />
          <q-btn
            v-if="isPendingRequest(selectedRequest)"
            unelevated
            color="positive"
            icon="check"
            label="Approve"
            :loading="approveLoadingId === selectedRequest?.id"
            @click="confirmApprove(selectedRequest)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { date, useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const authStore = useAuthStore()
const loading = ref(false)
const approveLoadingId = ref(null)
const rejectLoadingId = ref(null)
const requests = ref([])
const search = ref('')
const statusFilter = ref('PENDING')
const detailsDialogOpen = ref(false)
const selectedRequest = ref(null)

const statusOptions = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'requested_at', label: 'Requested', field: 'requested_at', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const detailColumns = [
  { name: 'date', label: 'Date', field: 'dateKey', align: 'left' },
  { name: 'coverage', label: 'Coverage', field: 'coverage', align: 'left' },
  { name: 'payStatus', label: 'Pay Status', field: 'payStatus', align: 'left' },
  { name: 'withPayDays', label: 'WP', field: 'withPayDays', align: 'right' },
  { name: 'withoutPayDays', label: 'W/oP', field: 'withoutPayDays', align: 'right' },
]

const isHrAdminOwner = computed(() => Boolean(authStore.user?.is_access_control_owner))

const selectedDetailRows = computed(() =>
  selectedRequest.value ? getPayloadRows(selectedRequest.value) : [],
)

const filteredRequests = computed(() => {
  const needle = normalizeSearch(search.value)
  if (!needle) return requests.value

  return requests.value.filter((entry) =>
    [
      entry.employee_name,
      entry.employee_control_no,
      entry.leave_type_name,
      entry.requested_by,
      entry.status,
      formatSelectedDates(entry.payload?.selected_dates),
    ]
      .map(normalizeSearch)
      .some((value) => value.includes(needle)),
  )
})


onMounted(fetchRequests)

async function fetchRequests() {
  if (!isHrAdminOwner.value) return

  loading.value = true
  try {
    const { data } = await api.get('/hr/leave-application-edit-requests', {
      params: { status: statusFilter.value },
    })
    requests.value = Array.isArray(data?.requests) ? data.requests : []
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load application edit requests.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loading.value = false
  }
}

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase()
}

function formatEmployeeName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim()
  return name || 'N/A'
}

function formatRequestedBy(value) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return 'HR staff'

  const match = rawValue.match(/^HR:(?:\d+)(?::(.+))?$/i)
  if (match) {
    const username = String(match[1] || '').trim()
    return username ? `HR staff: ${username}` : 'HR staff'
  }

  return rawValue
}

function formatDateTime(value) {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)

  return date.formatDate(parsed, 'MMM D, YYYY h:mm A')
}

function formatDays(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0.000'

  return numericValue.toFixed(3)
}

function formatSelectedDates(value) {
  if (!Array.isArray(value) || !value.length) return 'No selected dates'
  const firstDate = value[0]
  const lastDate = value[value.length - 1]
  if (value.length === 1) return formatDate(firstDate)

  return `${formatDate(firstDate)} - ${formatDate(lastDate)} (${value.length} dates)`
}

function formatDate(value) {
  if (!value) return 'N/A'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return String(value)

  return date.formatDate(parsed, 'MMM D, YYYY')
}

function normalizePayStatus(value) {
  const rawValue = String(value || '').trim().toUpperCase()
  if (['WOP', 'WITHOUT_PAY', 'WITHOUT PAY'].includes(rawValue)) return 'WOP'
  return 'WP'
}

function normalizeDayValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0

  return Math.round(Math.max(numericValue, 0) * 1000) / 1000
}

function formatCoverage(value, halfDayPortion = '') {
  const rawValue = String(value || '').trim().toLowerCase()
  const portion = String(halfDayPortion || '').trim().toUpperCase()

  if (rawValue.includes('half') || ['AM', 'PM'].includes(portion)) {
    return portion ? `Half Day ${portion}` : 'Half Day'
  }

  return 'Whole Day'
}

function getPayloadRows(row) {
  const payload = row?.payload || {}
  const rows = Array.isArray(payload.pay_status_rows) ? payload.pay_status_rows : []
  if (rows.length) {
    return rows
      .map((entry) => ({
        dateKey: String(entry?.date_key || entry?.dateKey || entry?.date || '').trim(),
        coverage: formatCoverage(
          entry?.coverage_code || entry?.coverageCode || entry?.coverage,
          entry?.half_day_portion || entry?.halfDayPortion,
        ),
        payStatus: normalizePayStatus(entry?.pay_status || entry?.payStatus),
        withPayDays: normalizeDayValue(entry?.with_pay_days ?? entry?.withPayDays ?? entry?.wp),
        withoutPayDays: normalizeDayValue(
          entry?.without_pay_days ?? entry?.withoutPayDays ?? entry?.wop,
        ),
      }))
      .filter((entry) => entry.dateKey)
  }

  const selectedDates = Array.isArray(payload.selected_dates) ? payload.selected_dates : []
  const payStatusMap = payload.selected_date_pay_status || payload.selectedDatePayStatus || {}
  const coverageMap = payload.selected_date_coverage || payload.selectedDateCoverage || {}
  const halfDayPortionMap =
    payload.selected_date_half_day_portion || payload.selectedDateHalfDayPortion || {}
  const withPayMap =
    payload.selected_date_deduction ||
    payload.selectedDateDeduction ||
    payload.deductible_days_by_date ||
    {}
  const withoutPayMap =
    payload.selected_date_without_pay ||
    payload.selectedDateWithoutPay ||
    payload.without_pay_days_by_date ||
    {}

  return selectedDates
    .map((dateKey) => {
      const normalizedDate = String(dateKey || '').trim()
      return {
        dateKey: normalizedDate,
        coverage: formatCoverage(coverageMap?.[normalizedDate], halfDayPortionMap?.[normalizedDate]),
        payStatus: normalizePayStatus(payStatusMap?.[normalizedDate]),
        withPayDays: normalizeDayValue(withPayMap?.[normalizedDate]),
        withoutPayDays: normalizeDayValue(withoutPayMap?.[normalizedDate]),
      }
    })
    .filter((entry) => entry.dateKey)
}

function openDetails(row) {
  selectedRequest.value = row || null
  detailsDialogOpen.value = Boolean(row)
}

function formatStatus(value) {
  const status = String(value || '').trim().toUpperCase()
  if (status === 'ALL') return 'All'
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return 'Pending'
}

function getStatusColor(value) {
  const status = String(value || '').trim().toUpperCase()
  if (status === 'APPROVED') return 'positive'
  if (status === 'REJECTED') return 'negative'
  return 'amber-8'
}

function isPendingRequest(row) {
  return String(row?.status || '').trim().toUpperCase() === 'PENDING'
}

function confirmApprove(row) {
  if (!isPendingRequest(row)) return

  $q.dialog({
    title: 'Approve edit request?',
    message: 'This will apply the HR staff corrections to the leave application.',
    cancel: { label: 'No', flat: true, color: 'grey-7' },
    ok: { label: 'Yes', color: 'positive', unelevated: true },
    persistent: true,
  }).onOk(() => approveRequest(row))
}

function confirmReject(row) {
  if (!isPendingRequest(row)) return

  $q.dialog({
    title: 'Reject edit request?',
    message: 'The original application will remain unchanged.',
    cancel: { label: 'No', flat: true, color: 'grey-7' },
    ok: { label: 'Yes', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(() => rejectRequest(row))
}

async function approveRequest(row, remarks = '') {
  if (!row?.id) return

  approveLoadingId.value = row.id
  try {
    const { data } = await api.post(`/hr/leave-application-edit-requests/${row.id}/approve`, {
      remarks: String(remarks || '').trim(),
    })
    $q.notify({
      type: 'positive',
      message: data?.message || 'Application edit request approved.',
      position: 'top',
    })
    if (selectedRequest.value?.id === row.id) {
      detailsDialogOpen.value = false
      selectedRequest.value = null
    }
    await fetchRequests()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to approve this edit request.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    approveLoadingId.value = null
  }
}

async function rejectRequest(row, remarks = '') {
  if (!row?.id) return

  rejectLoadingId.value = row.id
  try {
    const { data } = await api.post(`/hr/leave-application-edit-requests/${row.id}/reject`, {
      remarks: String(remarks || '').trim(),
    })
    $q.notify({
      type: 'info',
      message: data?.message || 'Application edit request rejected.',
      position: 'top',
    })
    if (selectedRequest.value?.id === row.id) {
      detailsDialogOpen.value = false
      selectedRequest.value = null
    }
    await fetchRequests()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to reject this edit request.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    rejectLoadingId.value = null
  }
}
</script>

<style scoped>
.hr-edit-requests-page {
  color: #1f2933;
}

.hr-edit-requests-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.hr-edit-refresh-btn {
  min-width: 104px;
  border-radius: 6px;
}

.hr-edit-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  background: #fff;
  border: 1px solid #dce3ea;
  border-radius: 8px;
}

.hr-edit-search {
  flex: 1 1 360px;
  max-width: 560px;
}

.hr-edit-status-toggle {
  border: 1px solid #dce3ea;
  border-radius: 6px;
  overflow: hidden;
}

.hr-edit-table-card {
  border-radius: 8px;
  overflow: hidden;
}

.hr-edit-employee-cell {
  min-width: 210px;
}

.hr-edit-metric-badge {
  padding: 4px 8px;
  font-weight: 700;
}

.hr-edit-actions-cell {
  min-width: 96px;
}

.min-width-0 {
  min-width: 0;
}

.hr-edit-requests-page :deep(.hr-edit-table-header th) {
  color: #243b53;
  font-weight: 700;
  background: #f7fafc;
}

.hr-edit-requests-page :deep(.q-table tbody td) {
  height: 66px;
  vertical-align: middle;
}

.hr-edit-details-dialog {
  width: min(820px, calc(100vw - 32px));
  max-width: 820px;
  border-radius: 8px;
}

.hr-edit-details-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hr-edit-detail-summary {
  min-height: 76px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #dce3ea;
  border-radius: 7px;
}

.hr-edit-details-table {
  border: 1px solid #dce3ea;
  border-radius: 8px;
  overflow: hidden;
}

.hr-edit-details-table :deep(.q-table tbody td) {
  height: 42px;
}

@media (max-width: 720px) {
  .hr-edit-refresh-btn,
  .hr-edit-search,
  .hr-edit-status-toggle {
    width: 100%;
    max-width: none;
  }

  .hr-edit-status-toggle :deep(.q-btn) {
    flex: 1 1 0;
  }
}
</style>
