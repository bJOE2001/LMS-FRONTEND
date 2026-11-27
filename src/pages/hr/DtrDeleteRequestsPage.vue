<template>
  <q-page class="q-pa-md hr-dtr-delete-page">
    <div class="row items-center justify-between q-col-gutter-sm q-mb-lg">
      <div class="col-auto">
        <h1 class="text-h4 text-weight-bold q-ma-none text-dark">DTR Delete Requests</h1>
      </div>
    </div>

    <DataFilterBar
      v-model:search="search"
      search-placeholder="Search employee, control no, office, requester, or reason..."
      :debounce="250"
      search-class="col-12 col-md-5"
      :loading="loading && requests.length === 0"
      :skeleton-filter-count="2"
      :skeleton-has-action="false"
    >
      <div class="col-12 col-sm-6 col-md-4">
        <q-select
          v-model="selectedDepartmentId"
          :options="officeFilterOptions"
          emit-value
          map-options
          outlined
          dense
          options-dense
          use-input
          fill-input
          hide-selected
          input-debounce="0"
          label="Office"
          @filter="onDepartmentFilter"
          @update:model-value="onDepartmentChange"
        >
          <template #prepend>
            <q-icon name="business" color="grey-6" />
          </template>
        </q-select>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="statusFilter"
          :options="statusOptions"
          emit-value
          map-options
          outlined
          dense
          options-dense
          label="Status"
          @update:model-value="fetchRequests"
        >
          <template #prepend>
            <q-icon name="filter_list" color="grey-6" />
          </template>
        </q-select>
      </div>
    </DataFilterBar>

    <DataTableCard
      v-model:pagination="pagination"
      :rows="filteredRequests"
      :columns="columns"
      row-key="id"
      :loading="loading"
      :rows-per-page-options="[10, 20, 50]"
      empty-icon="delete_sweep"
      no-data-label="No DTR delete requests found"
      empty-subtext="There are no DTR delete requests matching the selected filters."
    >
      <template #body-cell-employee_control_no="props">
        <q-td :props="props">
          <code class="text-caption text-weight-bold text-dark">
            {{ props.row.employee_control_no || '—' }}
          </code>
        </q-td>
      </template>

      <template #body-cell-employee="props">
        <q-td :props="props">
          <div class="text-weight-medium text-dark ellipsis">
            {{ props.row.employee_name || 'Unknown Employee' }}
          </div>
        </q-td>
      </template>

      <template #body-cell-office="props">
        <q-td :props="props">
          <div class="text-dark text-weight-medium">
            {{ formatOfficeLabel(props.row) }}
            <q-tooltip v-if="props.row.office_name" anchor="top middle" self="bottom middle">
              {{ props.row.office_name }}
            </q-tooltip>
          </div>
        </q-td>
      </template>

      <template #body-cell-record_date="props">
        <q-td :props="props">
          <span class="text-weight-medium text-dark text-no-wrap">
            {{ formatDate(props.row.record_date) }}
          </span>
        </q-td>
      </template>

      <template #body-cell-requested_by="props">
        <q-td :props="props">
          <div class="text-weight-medium text-dark ellipsis">
            {{ props.row.requested_by_name || 'Department Admin' }}
          </div>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props" class="text-center">
          <q-badge
            rounded
            :class="['q-py-xs q-px-sm text-weight-bold', getStatusBadgeClass(props.row.status)]"
          >
            {{ formatStatus(props.row.status) }}
          </q-badge>
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props" class="text-center">
          <div class="row items-center justify-center no-wrap q-gutter-xs">
            <q-btn
              flat
              round
              dense
              size="sm"
              icon="visibility"
              color="primary"
              aria-label="View delete request details"
              @click="openDetails(props.row)"
            >
              <q-tooltip>View Details</q-tooltip>
            </q-btn>
            <q-btn
              v-if="isPending(props.row)"
              flat
              round
              dense
              size="sm"
              icon="check_circle_outline"
              color="positive"
              aria-label="Approve delete request"
              :loading="decisionLoadingId === props.row.id"
              @click="openDecisionDialog('approve', props.row)"
            >
              <q-tooltip>Approve &amp; Delete</q-tooltip>
            </q-btn>
            <q-btn
              v-if="isPending(props.row)"
              flat
              round
              dense
              size="sm"
              icon="cancel"
              color="negative"
              aria-label="Reject delete request"
              :loading="decisionLoadingId === props.row.id"
              @click="openDecisionDialog('reject', props.row)"
            >
              <q-tooltip>Reject</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </DataTableCard>

    <!-- View Details Dialog -->
    <AppDialog
      v-model="detailsDialogOpen"
      :title="selectedRequest ? `DTR Delete Request #${selectedRequest.id}` : 'Request Details'"
      :subtitle="
        selectedRequest
          ? `${selectedRequest.employee_name || 'Unknown Employee'} • Control No. ${selectedRequest.employee_control_no || 'N/A'}`
          : ''
      "
      icon="delete_sweep"
      header-color="primary"
      max-width="620px"
      show-close
      :show-cancel="false"
      :hide-actions="!isPending(selectedRequest)"
      body-class="q-pa-md q-gutter-y-md"
      actions-class="q-px-md q-py-sm dtr-del-dialog-actions"
      @hide="selectedRequest = null"
    >
      <template v-if="selectedRequest">
        <!-- Section 1: Summary Header Card -->
        <div class="dtr-del-summary-card">
          <div class="row items-center justify-between q-col-gutter-sm">
            <div class="col min-width-0">
              <div class="dtr-del-section-label">DTR Date &amp; Scope</div>
              <div class="row items-center q-gutter-xs">
                <span class="text-subtitle2 text-weight-bold text-dark">
                  {{ formatDate(selectedRequest.record_date) }}
                </span>
                <span class="text-grey-6">&bull;</span>
                <span class="text-body2 text-weight-medium text-primary">
                  {{ formatPeriodLabel(selectedRequest.period) }}
                </span>
              </div>
            </div>
            <div class="col-auto">
              <q-badge
                rounded
                :class="['q-py-xs q-px-sm text-weight-bold', getStatusBadgeClass(selectedRequest.status)]"
              >
                {{ formatStatus(selectedRequest.status) }}
              </q-badge>
            </div>
          </div>

          <q-separator class="q-my-sm" />

          <div>
            <div class="dtr-del-section-label">Office</div>
            <div class="text-body2 text-weight-medium text-dark">
              {{ selectedRequest.office_name || 'N/A' }}
            </div>
          </div>
        </div>

        <!-- Section 2: Affected DTR Entries Table -->
        <div>
          <div class="dtr-del-section-label q-mb-xs">
            {{ getEntriesSectionTitle(selectedRequest) }}
          </div>
          <div class="dtr-del-entries-wrap">
            <table class="dtr-del-entries-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Recorded Entry</th>
                  <th>Source</th>
                  <th class="text-right">Result</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in formatSnapshotEntries(selectedRequest)" :key="entry.slot">
                  <td class="text-weight-medium text-dark">{{ entry.slotLabel }}</td>
                  <td>
                    <code
                      class="text-caption text-weight-bold"
                      :class="
                        getStatusKey(selectedRequest.status) === 'approved'
                          ? 'text-strike text-grey-6'
                          : 'text-dark'
                      "
                    >
                      {{ entry.displayValue }}
                    </code>
                  </td>
                  <td>
                    <q-badge
                      :color="entry.source === 'biometric' ? 'amber-2' : 'green-1'"
                      :text-color="entry.source === 'biometric' ? 'amber-10' : 'green-10'"
                      class="text-weight-bold"
                    >
                      {{ entry.source === 'biometric' ? 'Biometric' : 'Manual Override' }}
                    </q-badge>
                  </td>
                  <td
                    class="text-right text-caption text-weight-medium"
                    :class="getEntryEffectMeta(selectedRequest).textClass"
                  >
                    {{ getEntryEffectMeta(selectedRequest).label }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="isPending(selectedRequest) && hasBiometricEntry(selectedRequest)"
            class="dtr-del-bio-note row items-center no-wrap q-gutter-x-sm q-mt-sm"
          >
            <q-icon name="info" size="16px" color="amber-9" />
            <span class="text-caption text-amber-10 text-weight-medium">
              Includes a biometric punch. Approving will clear this punch from the employee's DTR.
            </span>
          </div>
        </div>

        <!-- Section 3: Reason for Deletion -->
        <div class="dtr-del-reason-card">
          <div class="dtr-del-section-label">Reason for Deletion</div>
          <div class="text-body2 text-dark">
            {{ selectedRequest.reason || 'No reason provided.' }}
          </div>
        </div>

        <!-- Section 4: Activity Timeline -->
        <div class="dtr-del-activity-card">
          <div class="dtr-del-section-label q-mb-xs">Request Activity</div>
          <div class="column q-gutter-y-sm">
            <div class="dtr-del-activity-row">
              <div class="row items-center no-wrap q-gutter-x-sm min-width-0">
                <span class="dtr-del-activity-dot bg-primary" />
                <span class="text-caption text-grey-8">
                  Requested by
                  <span class="text-weight-medium text-dark">
                    {{ selectedRequest.requested_by_name || 'Department Admin' }}
                  </span>
                </span>
              </div>
              <span class="text-caption text-grey-7 text-no-wrap">
                {{ formatDateTime(selectedRequest.created_at) }}
              </span>
            </div>

            <div class="dtr-del-activity-row">
              <div class="row items-center no-wrap q-gutter-x-sm min-width-0">
                <span
                  class="dtr-del-activity-dot"
                  :class="
                    isPending(selectedRequest)
                      ? 'bg-amber-8'
                      : getStatusKey(selectedRequest.status) === 'approved'
                        ? 'bg-positive'
                        : getStatusKey(selectedRequest.status) === 'rejected'
                          ? 'bg-negative'
                          : 'bg-grey-6'
                  "
                />
                <span v-if="isPending(selectedRequest)" class="text-caption text-grey-7">
                  Awaiting HR review
                </span>
                <span v-else class="text-caption text-grey-8">
                  {{ formatStatus(selectedRequest.status) }} by
                  <span class="text-weight-medium text-dark">
                    {{ selectedRequest.reviewed_by_name || 'HR' }}
                  </span>
                </span>
              </div>
              <span
                v-if="!isPending(selectedRequest) && selectedRequest.reviewed_at"
                class="text-caption text-grey-7 text-no-wrap"
              >
                {{ formatDateTime(selectedRequest.reviewed_at) }}
              </span>
            </div>

            <div v-if="selectedRequest.hr_remarks" class="dtr-del-hr-remarks text-caption text-dark">
              <span class="text-weight-bold">HR Remarks:</span> {{ selectedRequest.hr_remarks }}
            </div>
          </div>
        </div>
      </template>

      <template #actions>
        <template v-if="isPending(selectedRequest)">
          <q-btn
            outline
            no-caps
            color="negative"
            label="Reject"
            @click="switchDetailsToDecision('reject')"
          />
          <q-btn
            unelevated
            no-caps
            color="positive"
            label="Approve &amp; Delete"
            @click="switchDetailsToDecision('approve')"
          />
        </template>
      </template>
    </AppDialog>

    <!-- Approve / Reject Decision Dialog -->
    <AppDialog
      v-model="decisionDialogOpen"
      :title="decisionMode === 'approve' ? 'Approve DTR Deletion' : 'Reject DTR Delete Request'"
      :subtitle="decisionTarget ? `${decisionTarget.employee_name} • ${formatDate(decisionTarget.record_date)}` : ''"
      :icon="decisionMode === 'approve' ? 'check_circle' : 'cancel'"
      :header-color="decisionMode === 'approve' ? 'positive' : 'negative'"
      max-width="520px"
      body-class="q-pa-md q-gutter-y-md"
    >
      <template v-if="decisionTarget">
        <div class="dtr-del-detail-box">
          <div class="dtr-del-detail-box__label">Target Slot(s) &amp; Current Values</div>
          <div class="column q-gutter-y-xs q-mt-xs">
            <div
              v-for="entry in formatSnapshotEntries(decisionTarget)"
              :key="entry.slot"
              class="row items-center q-gutter-x-sm"
            >
              <span class="text-weight-medium text-dark">{{ entry.slotLabel }}:</span>
              <code class="text-caption text-weight-medium text-dark">{{ entry.displayValue }}</code>
              <q-badge
                :color="entry.source === 'biometric' ? 'amber-2' : 'green-1'"
                :text-color="entry.source === 'biometric' ? 'amber-10' : 'green-10'"
                class="text-weight-bold"
              >
                {{ entry.source === 'biometric' ? 'Biometric' : 'Manual Override' }}
              </q-badge>
            </div>
          </div>
          <div class="text-caption text-grey-7 q-mt-sm">
            Admin Reason: "{{ decisionTarget.reason }}"
          </div>
        </div>

        <q-input
          ref="hrRemarksRef"
          v-model="hrRemarks"
          type="textarea"
          rows="3"
          dense
          outlined
          autogrow
          :label="decisionMode === 'approve' ? 'HR Remarks (Optional)' : 'Rejection Reason *'"
          :placeholder="
            decisionMode === 'approve'
              ? 'Optional note for audit trail...'
              : 'Explain why this deletion request is declined...'
          "
          :rules="
            decisionMode === 'reject'
              ? [(val) => (val && val.trim().length >= 3) || 'Rejection reason is required (min 3 characters)']
              : []
          "
          lazy-rules="ondemand"
          hide-bottom-space
        />
      </template>

      <template #actions="{ cancel }">
        <q-btn flat no-caps color="grey-8" label="Cancel" :disable="decisionSubmitting" @click="cancel" />
        <q-btn
          unelevated
          no-caps
          :color="decisionMode === 'approve' ? 'positive' : 'negative'"
          :label="decisionMode === 'approve' ? 'Confirm Approve & Delete' : 'Confirm Reject'"
          :loading="decisionSubmitting"
          @click="submitDecision"
        />
      </template>
    </AppDialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useAttendanceStore } from 'stores/attendance-store'
import { useEmployeeStore } from 'stores/employee-store'
import DataFilterBar from 'src/components/common/DataFilterBar.vue'
import DataTableCard from 'src/components/common/DataTableCard.vue'
import AppDialog from 'src/components/common/AppDialog.vue'
import { formatOfficeAbbreviation, resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

const $q = useQuasar()
const attendanceStore = useAttendanceStore()
const employeeStore = useEmployeeStore()

const loading = ref(false)
const requests = ref([])
const search = ref('')
const statusFilter = ref('pending')
const selectedDepartmentId = ref('ALL')
const departmentFilterText = ref('')

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  sortBy: 'id',
  descending: true,
})

const detailsDialogOpen = ref(false)
const selectedRequest = ref(null)

const decisionDialogOpen = ref(false)
const decisionMode = ref('approve')
const decisionTarget = ref(null)
const hrRemarks = ref('')
const hrRemarksRef = ref(null)
const decisionSubmitting = ref(false)
const decisionLoadingId = ref(null)

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'All Statuses', value: 'all' },
]

const columns = [
  { name: 'employee_control_no', label: 'Control No', field: 'employee_control_no', align: 'left', sortable: true },
  { name: 'employee', label: 'Employee', field: 'employee_name', align: 'left', sortable: true },
  { name: 'office', label: 'Office', field: 'office_name', align: 'left', sortable: true },
  { name: 'record_date', label: 'DTR Date', field: 'record_date', align: 'left', sortable: true },
  { name: 'requested_by', label: 'Requested By', field: 'requested_by_name', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const officeFilterOptions = computed(() => {
  const allOption = {
    label: 'All Offices',
    value: 'ALL',
    officeName: 'All Offices',
    officeAcronym: '',
  }
  const departments = (employeeStore.allDepartments || []).map((dept) => {
    const acronym = resolveOfficeAcronymLabel(dept)
    const label = acronym || formatOfficeAbbreviation(dept.name)
    return {
      label,
      value: dept.id,
      officeName: dept.name || '',
      officeAcronym: acronym,
    }
  })

  const term = departmentFilterText.value.trim().toLowerCase()
  if (!term) return [allOption, ...departments]

  const filtered = departments.filter(
    (opt) =>
      opt.label.toLowerCase().includes(term) ||
      opt.officeName.toLowerCase().includes(term) ||
      opt.officeAcronym.toLowerCase().includes(term),
  )

  return [allOption, ...filtered]
})

function onDepartmentFilter(val, update) {
  update(() => {
    departmentFilterText.value = val || ''
  })
}

function onDepartmentChange() {
  if (!selectedDepartmentId.value) {
    selectedDepartmentId.value = 'ALL'
  }
  departmentFilterText.value = ''
  fetchRequests()
}

const filteredRequests = computed(() => {
  const needle = search.value.trim().toLowerCase()
  if (!needle) return requests.value
  return requests.value.filter((row) => {
    const haystack = [
      row.employee_name,
      row.employee_control_no,
      row.office_name,
      formatOfficeLabel(row),
      row.requested_by_name,
      row.reason,
      row.record_date,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle)
  })
})

function isPending(row) {
  return String(row?.status || '').toLowerCase() === 'pending'
}

const OFFICE_STOP_WORDS = new Set(['OF', 'THE', 'AND', 'FOR', 'IN', 'ON', 'TO', 'A', 'AN'])

function formatOfficeLabel(row) {
  if (!row) return 'N/A'

  const directAcronym = resolveOfficeAcronymLabel(row)
  if (directAcronym && directAcronym !== '—') {
    return directAcronym
  }

  const deptId = Number(row.department_id || 0)
  const rawName = String(row.office_name || '').trim()
  const normName = rawName.toLowerCase()

  const matchedDept = (employeeStore.allDepartments || []).find((dept) => {
    if (deptId > 0 && Number(dept.id) === deptId) return true
    return normName !== '' && String(dept.name || '').trim().toLowerCase() === normName
  })

  if (matchedDept) {
    const deptAcronym = resolveOfficeAcronymLabel(matchedDept)
    if (deptAcronym && deptAcronym !== '—') return deptAcronym
  }

  if (!rawName) return 'N/A'

  const stripped = rawName.replace(/^office\s+of\s+the\s+/i, '').trim()
  const words = stripped
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !OFFICE_STOP_WORDS.has(w.toUpperCase()))

  if (words.length >= 2) {
    return words.map((w) => w[0].toUpperCase()).join('')
  }

  return formatOfficeAbbreviation(rawName)
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    const clean = String(dateStr).slice(0, 10)
    return new Date(`${clean}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return String(dateStr)
  }
}

function formatDateTime(value) {
  if (!value) return 'N/A'
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

function formatPeriodLabel(period) {
  if (period === 'whole') return 'Whole Day'
  if (period === 'am') return 'Morning (AM)'
  if (period === 'pm') return 'Afternoon (PM)'
  return 'Selected Cell'
}

function formatSlotLabel(slotKey) {
  if (slotKey === 'am_arrival') return 'AM In'
  if (slotKey === 'am_departure') return 'AM Out'
  if (slotKey === 'pm_arrival') return 'PM In'
  if (slotKey === 'pm_departure') return 'PM Out'
  return slotKey
}

function formatTime12Hour(timeStr) {
  if (!timeStr) return ''
  const parts = String(timeStr).split(':')
  if (parts.length < 2) return String(timeStr)
  let h = parseInt(parts[0], 10)
  const m = parts[1]
  if (Number.isNaN(h)) return String(timeStr)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

function formatSnapshotEntries(row) {
  const snapshot = row?.previous_snapshot || {}
  const slots = Array.isArray(row?.slots) ? row.slots : Object.keys(snapshot)
  return slots.map((slotKey) => {
    const item = snapshot[slotKey] || {}
    const displayValue = item.remark || formatTime12Hour(item.time) || '—'
    return {
      slot: slotKey,
      slotLabel: formatSlotLabel(slotKey),
      displayValue,
      source: item.source || 'biometric',
    }
  })
}

function getStatusKey(status) {
  return String(status || 'pending').toLowerCase()
}

function formatStatus(status) {
  const s = getStatusKey(status)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getStatusBadgeClass(status) {
  const s = getStatusKey(status)
  if (s === 'approved') return 'bg-green-1 text-green-10'
  if (s === 'rejected') return 'bg-red-1 text-red-10'
  if (s === 'cancelled') return 'bg-grey-3 text-grey-8'
  return 'bg-amber-1 text-amber-10'
}

function getEntriesSectionTitle(row) {
  const s = getStatusKey(row?.status)
  if (s === 'pending') return 'DTR Entries Requested for Deletion'
  if (s === 'approved') return 'Cleared DTR Entries'
  return 'Requested DTR Entries (Unchanged)'
}

function getEntryEffectMeta(row) {
  const s = getStatusKey(row?.status)
  if (s === 'pending') return { label: 'Will be cleared', textClass: 'text-negative' }
  if (s === 'approved') return { label: 'Cleared', textClass: 'text-positive' }
  return { label: 'Unchanged', textClass: 'text-grey-7' }
}

function hasBiometricEntry(row) {
  return formatSnapshotEntries(row).some((entry) => entry.source === 'biometric')
}

async function fetchRequests() {
  loading.value = true
  try {
    const params = {
      status: statusFilter.value,
    }
    if (selectedDepartmentId.value && selectedDepartmentId.value !== 'ALL') {
      params.department_id = selectedDepartmentId.value
    }
    const data = await attendanceStore.fetchDtrDeleteRequests(params)
    requests.value = data?.requests || []
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to load DTR delete requests.',
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

function openDetails(row) {
  selectedRequest.value = row
  detailsDialogOpen.value = true
}

function switchDetailsToDecision(mode) {
  const target = selectedRequest.value
  detailsDialogOpen.value = false
  if (target) {
    openDecisionDialog(mode, target)
  }
}

function openDecisionDialog(mode, row) {
  decisionMode.value = mode
  decisionTarget.value = row
  hrRemarks.value = ''
  decisionDialogOpen.value = true
}

async function submitDecision() {
  if (!decisionTarget.value) return
  if (decisionMode.value === 'reject' && (!hrRemarks.value || hrRemarks.value.trim().length < 3)) {
    hrRemarksRef.value?.validate?.()
    $q.notify({
      type: 'warning',
      message: 'Please enter a rejection reason (min 3 characters).',
      position: 'top',
    })
    return
  }

  decisionSubmitting.value = true
  decisionLoadingId.value = decisionTarget.value.id
  try {
    if (decisionMode.value === 'approve') {
      await attendanceStore.approveDtrDeleteRequest(decisionTarget.value.id, hrRemarks.value.trim())
      $q.notify({
        type: 'positive',
        message: 'DTR delete request approved and slot(s) cleared.',
        position: 'top',
      })
    } else {
      await attendanceStore.rejectDtrDeleteRequest(decisionTarget.value.id, hrRemarks.value.trim())
      $q.notify({
        type: 'info',
        message: 'DTR delete request rejected.',
        position: 'top',
      })
    }

    decisionDialogOpen.value = false
    decisionTarget.value = null
    await fetchRequests()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to process delete request.',
      position: 'top',
    })
  } finally {
    decisionSubmitting.value = false
    decisionLoadingId.value = null
  }
}

onMounted(async () => {
  employeeStore.fetchDepartments().catch(() => {
    // Ignore optional department list load error
  })
  await fetchRequests()
})
</script>

<style scoped>
.min-width-0 {
  min-width: 0;
}

.dtr-del-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 4px;
}

.dtr-del-summary-card,
.dtr-del-reason-card,
.dtr-del-activity-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
}

.dtr-del-entries-wrap {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.dtr-del-entries-table {
  width: 100%;
  border-collapse: collapse;
}

.dtr-del-entries-table th {
  font-size: 0.74rem;
  font-weight: 600;
  color: #64748b;
  text-align: left;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.dtr-del-entries-table th.text-right {
  text-align: right;
}

.dtr-del-entries-table td {
  padding: 9px 12px;
  font-size: 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.dtr-del-entries-table tbody tr:last-child td {
  border-bottom: none;
}

.dtr-del-bio-note {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 8px 12px;
}

.dtr-del-activity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.dtr-del-activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
}

.dtr-del-hr-remarks {
  padding: 8px 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
}

.dtr-del-dialog-actions {
  border-top: 1px solid #e2e8f0;
}

.dtr-del-detail-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
}

.dtr-del-detail-box--hr {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.dtr-del-detail-box__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 4px;
}

:global(body.body--dark) .dtr-del-summary-card,
:global(body.body--dark) .dtr-del-reason-card,
:global(body.body--dark) .dtr-del-activity-card,
:global(body.body--dark) .dtr-del-detail-box {
  background: var(--dm-surface-2);
  border-color: var(--dm-border);
}

:global(body.body--dark) .dtr-del-entries-wrap {
  background: var(--dm-surface);
  border-color: var(--dm-border);
}

:global(body.body--dark) .dtr-del-entries-table th {
  background: var(--dm-surface-2);
  border-bottom-color: var(--dm-border);
  color: var(--dm-text-muted);
}

:global(body.body--dark) .dtr-del-entries-table td {
  border-bottom-color: var(--dm-border);
  color: var(--dm-text-primary);
}

:global(body.body--dark) .dtr-del-bio-note {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.35);
}

:global(body.body--dark) .dtr-del-hr-remarks,
:global(body.body--dark) .dtr-del-detail-box--hr {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.3);
}

:global(body.body--dark) .dtr-del-section-label,
:global(body.body--dark) .dtr-del-detail-box__label {
  color: var(--dm-text-muted);
}

:global(body.body--dark) .dtr-del-dialog-actions {
  border-top-color: var(--dm-border);
}
</style>
