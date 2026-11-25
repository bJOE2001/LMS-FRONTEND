<template>
  <q-page class="q-pa-md hr-edit-requests-page">
    <div class="hr-edit-requests-header q-mb-md">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">HR Edit Requests</h1>
      </div>
    </div>

    <q-banner v-if="!isHrAdminOwner" rounded class="bg-orange-1 text-orange-10 q-mb-md">
      <template #avatar>
        <q-icon name="warning" color="orange-9" />
      </template>
      Only HR Admin accounts can review staff edit requests.
    </q-banner>

    <DataFilterBar
      v-model:search="search"
      search-label="Search employee, control no, leave type, requested by, or date"
      search-placeholder="e.g. Mahusay, 011790, CTO Leave, hr4, Dec 22..."
      :debounce="250"
      search-class="col-12 col-sm-8 col-md-9"
    >
      <div class="col-12 col-sm-4 col-md-3">
        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          outlined
          dense
          options-dense
          label="Status"
          @update:model-value="fetchRequests"
        />
      </div>
    </DataFilterBar>

    <DataTableCard
      v-model:pagination="pagination"
      :rows="filteredRequests"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :rows-per-page-options="[10, 20, 50]"
      card-class="hr-edit-table-card"
      table-header-class="hr-edit-table-header"
      empty-icon="inbox"
      no-data-label="No edit requests found"
    >
      <template #body-cell-employee="props">
        <q-td :props="props" class="hr-edit-employee-cell">
          <div class="min-width-0">
            <div class="text-weight-bold text-grey-10 ellipsis">
              {{ formatEmployeeName(props.row.employee_name) }}
            </div>
            <div class="text-caption text-grey-7 q-mt-xs hr-edit-mono">
              {{ props.row.employee_control_no || 'N/A' }}
            </div>
          </div>
        </q-td>
      </template>

      <template #body-cell-previous="props">
        <q-td :props="props" class="hr-edit-diff-cell">
          <template v-if="getPreviousSummary(props.row)">
            <div class="text-weight-medium text-grey-9 ellipsis">
              {{ formatSelectedDates(getPreviousSummary(props.row).selectedDates) }}
            </div>
            <div class="row items-center q-gutter-xs no-wrap q-mt-xs">
              <span class="hr-edit-credit-pill hr-edit-credit-pill--muted">
                WP {{ formatDays(getPreviousSummary(props.row).deductibleDays) }}
              </span>
              <span class="hr-edit-credit-pill hr-edit-credit-pill--muted">
                W/oP {{ formatDays(getPreviousSummary(props.row).withoutPayDays) }}
              </span>
            </div>
          </template>
          <span v-else class="text-caption text-grey-6">Not recorded</span>
        </q-td>
      </template>

      <template #body-cell-requested="props">
        <q-td :props="props" class="hr-edit-diff-cell">
          <div class="text-weight-bold text-grey-10 ellipsis">
            {{ formatSelectedDates(props.row.payload?.selected_dates) }}
          </div>
          <div class="row items-center q-gutter-xs no-wrap q-mt-xs">
            <span class="hr-edit-credit-pill hr-edit-credit-pill--wp">
              WP {{ formatDays(props.row.payload?.deductible_days) }}
            </span>
            <span
              class="hr-edit-credit-pill"
              :class="Number(props.row.payload?.without_pay_days || 0) > 0 ? 'hr-edit-credit-pill--wop' : 'hr-edit-credit-pill--muted'"
            >
              W/oP {{ formatDays(props.row.payload?.without_pay_days) }}
            </span>
          </div>
        </q-td>
      </template>

      <template #body-cell-requested_by="props">
        <q-td :props="props" class="hr-edit-requester-cell">
          <div class="row items-center q-gutter-xs no-wrap">
            <span class="text-weight-bold text-grey-9 ellipsis">
              {{ formatRequesterPrimary(props.row) }}
            </span>
            <q-icon
              v-if="props.row.requested_reason"
              name="chat_bubble_outline"
              size="14px"
              color="primary"
              class="cursor-pointer"
            >
              <q-tooltip max-width="280px">{{ props.row.requested_reason }}</q-tooltip>
            </q-icon>
          </div>
          <div class="text-caption text-grey-7 q-mt-xs">
            <span v-if="formatRequesterHandle(props.row)">{{ formatRequesterHandle(props.row) }} • </span>
            <span>{{ formatDateTime(props.row.requested_at) }}</span>
          </div>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props" class="text-center">
          <div class="column items-center">
            <span class="hr-edit-status-pill" :class="`hr-edit-status-pill--${getStatusKey(props.row.status)}`">
              <q-icon :name="getStatusIcon(props.row.status)" size="14px" />
              <span>{{ formatStatus(props.row.status) }}</span>
            </span>
            <div v-if="!isPendingRequest(props.row) && props.row.reviewed_by" class="text-caption text-grey-6 q-mt-xs">
              by {{ props.row.reviewed_by }}
            </div>
          </div>
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
              aria-label="View edit request details"
              class="hr-edit-action-btn"
              @click="openDetails(props.row)"
            >
              <q-tooltip>View Comparison</q-tooltip>
            </q-btn>
            <q-btn
              v-if="isPendingRequest(props.row)"
              unelevated
              dense
              round
              size="sm"
              icon="check"
              color="positive"
              aria-label="Approve edit request"
              class="hr-edit-action-btn"
              :loading="approveLoadingId === props.row.id"
              @click="openDecisionDialog('approve', props.row)"
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
              aria-label="Reject edit request"
              class="hr-edit-action-btn"
              :loading="rejectLoadingId === props.row.id"
              @click="openDecisionDialog('reject', props.row)"
            >
              <q-tooltip>Reject</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </DataTableCard>

    <AppDialog
      v-model="detailsDialogOpen"
      :title="selectedRequest ? `Edit Request #${selectedRequest.id}` : 'Edit Request Details'"
      :subtitle="selectedDetailsSubtitle"
      icon="fact_check"
      header-color="primary"
      max-width="1040px"
      show-close
      :show-cancel="false"
      body-class="q-pa-md q-gutter-y-md"
      actions-class="q-px-md q-py-sm bg-grey-1 hr-edit-dialog-actions"
      @hide="selectedRequest = null"
    >
      <template v-if="selectedRequest">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <div class="hr-edit-detail-summary">
              <div class="hr-edit-detail-summary__label">Employee</div>
              <div class="text-weight-bold text-grey-10">
                {{ formatEmployeeName(selectedRequest.employee_name) }}
              </div>
              <div class="text-caption text-grey-7 hr-edit-mono">
                {{ selectedRequest.employee_control_no || 'N/A' }}
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-4">
            <div class="hr-edit-detail-summary">
              <div class="hr-edit-detail-summary__label">Requested By</div>
              <div class="text-weight-bold text-grey-10">
                {{ formatRequesterPrimary(selectedRequest) }}
              </div>
              <div class="text-caption text-grey-7">
                <span v-if="formatRequesterHandle(selectedRequest)">{{ formatRequesterHandle(selectedRequest) }} • </span>
                <span>{{ formatDateTime(selectedRequest.requested_at) }}</span>
              </div>
            </div>
          </div>

          <div class="col-12 col-sm-4">
            <div class="hr-edit-detail-summary">
              <div class="hr-edit-detail-summary__label">Status & Review</div>
              <div class="q-mt-xs">
                <span class="hr-edit-status-pill" :class="`hr-edit-status-pill--${getStatusKey(selectedRequest.status)}`">
                  <q-icon :name="getStatusIcon(selectedRequest.status)" size="14px" />
                  <span>{{ formatStatus(selectedRequest.status) }}</span>
                </span>
              </div>
              <div v-if="selectedRequest.reviewed_at" class="text-caption text-grey-7 q-mt-xs">
                {{ selectedRequest.reviewed_by || 'HR Admin' }} • {{ formatDateTime(selectedRequest.reviewed_at) }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedRequest.requested_reason || selectedRequest.review_remarks" class="row q-col-gutter-sm">
          <div v-if="selectedRequest.requested_reason" class="col-12 col-md-6">
            <div class="hr-edit-note-box">
              <div class="hr-edit-detail-summary__label">Staff Request Reason</div>
              <div class="text-body2 text-grey-9">{{ selectedRequest.requested_reason }}</div>
            </div>
          </div>
          <div v-if="selectedRequest.review_remarks" class="col-12 col-md-6">
            <div class="hr-edit-note-box hr-edit-note-box--review">
              <div class="hr-edit-detail-summary__label">HR Admin Remarks</div>
              <div class="text-body2 text-grey-9">{{ selectedRequest.review_remarks }}</div>
            </div>
          </div>
        </div>

        <div class="hr-edit-side-by-side">
          <div class="hr-edit-compare-pane hr-edit-compare-pane--previous">
            <div class="hr-edit-compare-pane__header">
              <div>
                <div class="hr-edit-compare-pane__eyebrow">Previous</div>
                <div class="text-weight-bold text-grey-9">
                  {{
                    selectedPreviousSummary
                      ? formatSelectedDates(selectedPreviousSummary.selectedDates)
                      : 'Not recorded'
                  }}
                </div>
              </div>
              <div v-if="selectedPreviousSummary" class="row q-gutter-xs no-wrap">
                <span class="hr-edit-credit-pill hr-edit-credit-pill--muted">
                  WP {{ formatDays(selectedPreviousSummary.deductibleDays) }}
                </span>
                <span class="hr-edit-credit-pill hr-edit-credit-pill--muted">
                  W/oP {{ formatDays(selectedPreviousSummary.withoutPayDays) }}
                </span>
              </div>
            </div>

            <q-table
              v-if="selectedPreviousRows.length"
              :rows="selectedPreviousRows"
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
                <q-td :props="props" class="text-weight-bold text-grey-9">
                  {{ formatDate(props.row.dateKey) }}
                </q-td>
              </template>

              <template #body-cell-coverage="props">
                <q-td :props="props">
                  <span class="text-grey-8">{{ props.row.coverage }}</span>
                </q-td>
              </template>

              <template #body-cell-payStatus="props">
                <q-td :props="props">
                  <span
                    class="hr-edit-credit-pill"
                    :class="props.row.payStatus === 'WOP' ? 'hr-edit-credit-pill--wop' : 'hr-edit-credit-pill--muted'"
                  >
                    {{ props.row.payStatus }}
                  </span>
                </q-td>
              </template>

              <template #body-cell-withPayDays="props">
                <q-td :props="props" class="text-weight-bold text-grey-8 hr-edit-mono">
                  {{ formatDays(props.row.withPayDays) }}
                </q-td>
              </template>

              <template #body-cell-withoutPayDays="props">
                <q-td :props="props" class="text-weight-bold text-grey-8 hr-edit-mono">
                  {{ formatDays(props.row.withoutPayDays) }}
                </q-td>
              </template>
            </q-table>

            <div v-else class="hr-edit-empty-pane">
              No previous per-date breakdown was captured for this historical request.
            </div>
          </div>

          <div class="hr-edit-compare-pane hr-edit-compare-pane--requested">
            <div class="hr-edit-compare-pane__header">
              <div>
                <div class="hr-edit-compare-pane__eyebrow text-primary">Requested</div>
                <div class="text-weight-bold text-grey-10">
                  {{ formatSelectedDates(selectedRequest.payload?.selected_dates) }}
                </div>
              </div>
              <div class="row q-gutter-xs no-wrap">
                <span class="hr-edit-credit-pill hr-edit-credit-pill--wp">
                  WP {{ formatDays(selectedRequest.payload?.deductible_days) }}
                </span>
                <span
                  class="hr-edit-credit-pill"
                  :class="Number(selectedRequest.payload?.without_pay_days || 0) > 0 ? 'hr-edit-credit-pill--wop' : 'hr-edit-credit-pill--muted'"
                >
                  W/oP {{ formatDays(selectedRequest.payload?.without_pay_days) }}
                </span>
              </div>
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
                <q-td :props="props" class="text-weight-bold text-grey-9">
                  {{ formatDate(props.row.dateKey) }}
                </q-td>
              </template>

              <template #body-cell-coverage="props">
                <q-td :props="props">
                  <span class="text-grey-8">{{ props.row.coverage }}</span>
                </q-td>
              </template>

              <template #body-cell-payStatus="props">
                <q-td :props="props">
                  <span
                    class="hr-edit-credit-pill"
                    :class="props.row.payStatus === 'WOP' ? 'hr-edit-credit-pill--wop' : 'hr-edit-credit-pill--wp'"
                  >
                    {{ props.row.payStatus }}
                  </span>
                </q-td>
              </template>

              <template #body-cell-withPayDays="props">
                <q-td :props="props" class="text-weight-bold text-green-9 hr-edit-mono">
                  {{ formatDays(props.row.withPayDays) }}
                </q-td>
              </template>

              <template #body-cell-withoutPayDays="props">
                <q-td :props="props" class="text-weight-bold text-blue-9 hr-edit-mono">
                  {{ formatDays(props.row.withoutPayDays) }}
                </q-td>
              </template>
            </q-table>
          </div>
        </div>
      </template>

      <template #actions="{ cancel }">
        <q-btn flat no-caps color="grey-8" label="Close" @click="cancel" />
        <template v-if="isPendingRequest(selectedRequest)">
          <q-btn
            outline
            no-caps
            color="negative"
            icon="close"
            label="Reject"
            :loading="rejectLoadingId === selectedRequest?.id"
            @click="openDecisionDialog('reject', selectedRequest)"
          />
          <q-btn
            unelevated
            no-caps
            color="positive"
            icon="check"
            label="Approve Changes"
            :loading="approveLoadingId === selectedRequest?.id"
            @click="openDecisionDialog('approve', selectedRequest)"
          />
        </template>
      </template>
    </AppDialog>

    <AppDialog
      v-model="decisionDialog.open"
      :title="decisionDialog.action === 'approve' ? 'Approve Edit Request' : 'Reject Edit Request'"
      :subtitle="decisionDialog.row ? `${formatEmployeeName(decisionDialog.row.employee_name)} (${decisionDialog.row.employee_control_no || 'N/A'})` : ''"
      :icon="decisionDialog.action === 'approve' ? 'check_circle' : 'cancel'"
      :header-color="decisionDialog.action === 'approve' ? 'positive' : 'negative'"
      max-width="460px"
      :loading="isSubmittingDecision"
      :submit-label="decisionDialog.action === 'approve' ? 'Approve Request' : 'Reject Request'"
      :submit-icon="decisionDialog.action === 'approve' ? 'check' : 'close'"
      :submit-color="decisionDialog.action === 'approve' ? 'positive' : 'negative'"
      body-class="q-pa-md q-gutter-y-md"
      actions-class="q-px-md q-pb-md q-gutter-sm"
      @submit="submitDecision"
    >
      <div class="text-body2 text-grey-9">
        {{
          decisionDialog.action === 'approve'
            ? 'This will immediately apply the HR staff corrections to the employee’s leave application.'
            : 'The request will be marked rejected and the original leave application will remain unchanged.'
        }}
      </div>
      <q-input
        v-model="decisionDialog.remarks"
        outlined
        dense
        type="textarea"
        autogrow
        rows="2"
        maxlength="1000"
        counter
        label="Remarks (optional)"
        placeholder="Add an optional note for the audit log..."
      />
    </AppDialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { date, useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth-store'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const authStore = useAuthStore()
const loading = ref(false)
const approveLoadingId = ref(null)
const rejectLoadingId = ref(null)
const requests = ref([])
const search = ref('')
const statusFilter = ref('PENDING')
const pagination = ref({ page: 1, rowsPerPage: 10 })
const detailsDialogOpen = ref(false)
const selectedRequest = ref(null)
const decisionDialog = reactive({
  open: false,
  action: 'approve',
  row: null,
  remarks: '',
})

const statusOptions = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'All', value: 'ALL' },
]

const columns = [
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'previous', label: 'Previous', field: 'id', align: 'left' },
  { name: 'requested', label: 'Requested', field: 'leave_type_name', align: 'left', sortable: true },
  { name: 'requested_by', label: 'Requested By', field: 'requested_at', align: 'left', sortable: true },
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

const isSubmittingDecision = computed(() =>
  Boolean(approveLoadingId.value || rejectLoadingId.value),
)

const selectedPreviousSummary = computed(() =>
  selectedRequest.value ? getPreviousSummary(selectedRequest.value) : null,
)

const selectedPreviousRows = computed(() =>
  selectedPreviousSummary.value ? buildSnapshotRows(selectedPreviousSummary.value.source) : [],
)

const selectedDetailRows = computed(() =>
  selectedRequest.value ? buildSnapshotRows(selectedRequest.value.payload) : [],
)

const selectedDetailsSubtitle = computed(() => {
  if (!selectedRequest.value) return ''
  return selectedRequest.value.leave_type_name || 'Leave Application'
})

const filteredRequests = computed(() => {
  const needle = normalizeSearch(search.value)
  if (!needle) return requests.value

  return requests.value.filter((entry) => {
    const prevSummary = getPreviousSummary(entry)
    return [
      entry.employee_name,
      entry.employee_control_no,
      entry.leave_type_name,
      entry.requested_by,
      entry.requested_by_name,
      entry.requested_by_username,
      entry.reviewed_by,
      entry.status,
      formatSelectedDates(prevSummary?.selectedDates),
      formatSelectedDates(entry.payload?.selected_dates),
    ]
      .map(normalizeSearch)
      .some((value) => value.includes(needle))
  })
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

function parseRequesterUsername(value) {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''

  const match = rawValue.match(/^HR:(?:\d+)(?::(.+))?$/i)
  if (match) {
    return String(match[1] || '').trim()
  }

  return ''
}

function formatRequesterPrimary(row) {
  const fullName = String(row?.requested_by_name || '').trim()
  if (fullName) return fullName

  const username = String(row?.requested_by_username || parseRequesterUsername(row?.requested_by) || '').trim()
  if (username) return `HR staff: ${username}`

  return String(row?.requested_by || '').trim() || 'HR staff'
}

function formatRequesterHandle(row) {
  const username = String(row?.requested_by_username || parseRequesterUsername(row?.requested_by) || '').trim()
  const fullName = String(row?.requested_by_name || '').trim()
  if (!username) return ''
  if (fullName && fullName.toLowerCase() === username.toLowerCase()) return ''
  return `@${username}`
}

function getPreviousSummary(row) {
  if (!row || typeof row !== 'object') return null

  const previous = row.previous && typeof row.previous === 'object' ? row.previous : null
  const isApproved = String(row.status || '').trim().toUpperCase() === 'APPROVED'
  const fallbackApp = !previous && !isApproved && row.application && typeof row.application === 'object'
    ? row.application
    : null
  const source = previous || fallbackApp
  if (!source) return null

  const selectedDates = Array.isArray(source.selected_dates) ? source.selected_dates : []
  const deductibleDays = Number(source.deductible_days ?? source.total_days ?? 0)
  const withoutPayDays = Number(source.without_pay_days ?? 0)

  if (!selectedDates.length && !Number.isFinite(deductibleDays) && !Number.isFinite(withoutPayDays)) {
    return null
  }

  return {
    source,
    selectedDates,
    deductibleDays: Number.isFinite(deductibleDays) ? deductibleDays : 0,
    withoutPayDays: Number.isFinite(withoutPayDays) ? withoutPayDays : 0,
  }
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

  return `${formatDate(firstDate)} – ${formatDate(lastDate)} (${value.length} dates)`
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
    return portion ? `Half Day (${portion})` : 'Half Day'
  }

  return 'Whole Day'
}

function buildSnapshotRows(source) {
  const payload = source || {}
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

function getStatusKey(value) {
  const status = String(value || '').trim().toUpperCase()
  if (status === 'APPROVED') return 'approved'
  if (status === 'REJECTED') return 'rejected'
  return 'pending'
}

function getStatusIcon(value) {
  const status = String(value || '').trim().toUpperCase()
  if (status === 'APPROVED') return 'check_circle'
  if (status === 'REJECTED') return 'cancel'
  return 'schedule'
}

function formatStatus(value) {
  const status = String(value || '').trim().toUpperCase()
  if (status === 'ALL') return 'All'
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return 'Pending'
}

function isPendingRequest(row) {
  return String(row?.status || '').trim().toUpperCase() === 'PENDING'
}

function openDecisionDialog(action, row) {
  if (!isPendingRequest(row)) return

  decisionDialog.action = action
  decisionDialog.row = row
  decisionDialog.remarks = ''
  decisionDialog.open = true
}

async function submitDecision() {
  const row = decisionDialog.row
  if (!row?.id) return

  if (decisionDialog.action === 'approve') {
    await approveRequest(row, decisionDialog.remarks)
  } else {
    await rejectRequest(row, decisionDialog.remarks)
  }
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
    decisionDialog.open = false
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
    decisionDialog.open = false
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
  color: #0f172a;
}

.hr-edit-requests-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.hr-edit-refresh-btn {
  min-width: 108px;
  border-radius: 8px;
}

.hr-edit-table-card {
  border-radius: 10px;
  overflow: hidden;
}

.hr-edit-employee-cell {
  min-width: 220px;
}

.hr-edit-diff-cell {
  min-width: 185px;
}

.hr-edit-requester-cell {
  min-width: 190px;
}

.hr-edit-mono {
  font-variant-numeric: tabular-nums;
}

.hr-edit-credit-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 0.74rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.hr-edit-credit-pill--wp {
  background: #ecfdf5;
  color: #15803d;
}

.hr-edit-credit-pill--wop {
  background: #eff6ff;
  color: #1d4ed8;
}

.hr-edit-credit-pill--muted {
  background: #f1f5f9;
  color: #475569;
}

.hr-edit-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.hr-edit-status-pill--pending {
  background: #fef3c7;
  color: #92400e;
}

.hr-edit-status-pill--approved {
  background: #dcfce7;
  color: #166534;
}

.hr-edit-status-pill--rejected {
  background: #fee2e2;
  color: #991b1b;
}

.hr-edit-actions-cell {
  min-width: 112px;
}

.hr-edit-action-btn {
  cursor: pointer;
  transition: transform 150ms ease, background-color 150ms ease;
}

.hr-edit-action-btn:hover {
  transform: translateY(-1px);
}

.min-width-0 {
  min-width: 0;
}

.hr-edit-requests-page :deep(.hr-edit-table-header th) {
  color: #334155;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #f8fafc;
}

.hr-edit-requests-page :deep(.q-table tbody td) {
  height: 68px;
  vertical-align: middle;
}

.hr-edit-detail-summary {
  height: 100%;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.hr-edit-detail-summary__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 4px;
}

.hr-edit-note-box {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.hr-edit-note-box--review {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.hr-edit-side-by-side {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}

.hr-edit-compare-pane {
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  padding: 12px;
}

.hr-edit-compare-pane--requested {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.hr-edit-compare-pane__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.hr-edit-compare-pane__eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 2px;
}

.hr-edit-empty-pane {
  padding: 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  font-size: 0.84rem;
}

.hr-edit-details-table {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.hr-edit-details-table :deep(.q-table tbody td) {
  height: 42px;
}

.hr-edit-dialog-actions {
  border-top: 1px solid #e2e8f0;
}

@media (max-width: 860px) {
  .hr-edit-side-by-side {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hr-edit-refresh-btn {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hr-edit-action-btn {
    transition: none;
  }

  .hr-edit-action-btn:hover {
    transform: none;
  }
}
</style>
