<template>
  <q-card flat bordered class="hr-applications-panel rounded-borders q-mb-lg">
    <q-card-section>
      <div class="row justify-between items-center q-mb-md">
        <div class="row items-center q-gutter-sm">
          <div class="text-h6">All Applications</div>
          <q-chip
            v-if="employmentTypeFilterLabel"
            dense
            removable
            color="primary"
            text-color="white"
            icon="filter_alt"
            @remove="clearEmploymentTypeFilter"
          >
            {{ employmentTypeFilterLabel }}
          </q-chip>
        </div>
        <div class="row items-center q-gutter-sm">
          <q-input
            v-model="statusSearch"
            dense
            outlined
            clearable
            placeholder="Search all application columns"
            class="application-status-search"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </div>
    </q-card-section>
    <q-table
      :rows="applicationsForTable"
      :columns="columns"
      row-key="id"
      flat
      v-model:pagination="tablePagination"
      :rows-per-page-options="[10]"
      :loading="loading"
    >
      <template #no-data>
        <div class="full-width row flex-center q-pa-lg text-grey-7">
          <q-icon name="inbox" size="md" class="q-mr-sm" />
          <span>No data available</span>
        </div>
      </template>
      <template #body-cell-employee="props">
        <q-td>
          <div class="text-weight-medium">{{ props.row.employeeName }}</div>
          <div class="text-caption text-grey-7">{{ props.row.employee_id }}</div>
        </q-td>
      </template>
      <template #body-cell-inclusiveDates="props">
        <q-td>
          <div class="application-details-cell">
            <span
              v-for="(line, index) in getApplicationInclusiveDateLines(props.row)"
              :key="`${props.row.id}-inclusive-${index}`"
              class="text-weight-medium text-grey-9 block"
            >
              {{ line }}
            </span>
          </div>
        </q-td>
      </template>
      <template #body-cell-dateFiled="props">
        <q-td>
          <span class="text-weight-medium text-grey-9">{{ formatDate(props.row.dateFiled) || 'N/A' }}</span>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td><StatusBadge :status="props.row.displayStatus" /></q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td class="text-center">
          <div class="row inline no-wrap justify-center q-gutter-x-xs">
            <q-btn flat dense round size="sm" icon="visibility" @click="openDetails(props.row)">
              <q-tooltip>View</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canEditApplication(props.row)"
              flat
              dense
              round
              size="sm"
              icon="edit"
              color="primary"
              @click="openEdit(props.row)"
            >
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.rawStatus === 'PENDING_HR'"
              flat
              dense
              round
              size="sm"
              icon="check_circle"
              color="green-7"
              @click="openActionConfirm('approve', props.row)"
            >
              <q-tooltip>Approve</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.rawStatus === 'PENDING_HR'"
              flat
              dense
              round
              size="sm"
              icon="cancel"
              color="negative"
              @click="openActionConfirm('reject', props.row)"
            >
              <q-tooltip>Reject</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </q-table>
  </q-card>

  <q-dialog v-model="showDetailsDialog" position="standard">
    <q-card v-if="selectedApp" style="min-width: 480px">
      <q-card-section class="bg-primary text-white row items-center no-wrap">
        <div class="text-h6">Application Details</div>
        <q-space />
        <q-btn
          dense
          flat
          round
          icon="close"
          color="white"
          aria-label="Close application details"
          v-close-popup
        />
      </q-card-section>
      <q-card-section class="q-gutter-y-sm">
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <div class="text-caption text-grey-7">Employee</div>
            <div class="text-weight-medium">{{ selectedApp.employeeName }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Leave Type</div>
            <div class="text-weight-medium">
              {{ selectedApp.leaveType }}{{ selectedApp.is_monetization ? ' (Monetization)' : '' }}
            </div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Department</div>
            <div class="text-weight-medium">{{ selectedApp.officeShort || selectedApp.office }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Days</div>
            <div class="text-weight-medium">{{ selectedApp.days }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">
              {{ selectedApp.is_monetization ? 'Days to Monetize' : 'Duration' }}
            </div>
            <div v-if="selectedApp.is_monetization" class="text-weight-medium">
              {{ selectedApp.days }} day(s)
              <div v-if="selectedApp.equivalent_amount" class="text-caption text-grey-6 q-mt-xs">
                Est. Amount: &#8369;{{ Number(selectedApp.equivalent_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </div>
            </div>
            <div v-else-if="selectedApp.selected_dates && selectedApp.selected_dates.length" class="text-weight-medium">
              <div v-for="d in selectedApp.selected_dates.sort()" :key="d" class="text-caption">
                {{ formatDate(d) }}
              </div>
            </div>
            <div v-else class="text-weight-medium">
              {{ selectedApp.startDate ? formatDate(selectedApp.startDate) : 'N/A' }} - {{ selectedApp.endDate ? formatDate(selectedApp.endDate) : 'N/A' }}
            </div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Date Filed</div>
            <div class="text-weight-medium">{{ formatDate(selectedApp.dateFiled) }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey-7">Status</div>
            <StatusBadge :status="selectedApp.displayStatus" />
          </div>
          <div class="col-12">
            <div class="text-caption text-grey-7">Reason</div>
            <div>{{ selectedApp.reason }}</div>
          </div>
          <div v-if="selectedApp.remarks" class="col-12">
            <div class="text-caption text-grey-7">Remarks</div>
            <div>{{ selectedApp.remarks }}</div>
          </div>
          <div class="col-12">
            <div class="text-caption text-grey-7">Available Leave Balance</div>
            <div
              class="text-weight-medium"
              :class="selectedApp.leaveBalance !== null && selectedApp.leaveBalance < selectedApp.days ? 'text-negative' : 'text-green-8'"
            >
              {{ selectedApp.leaveBalance !== null ? selectedApp.leaveBalance + ' day(s)' : 'N/A (non-credit)' }}
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>

  <q-dialog v-model="showConfirmActionDialog">
    <q-card style="min-width: 360px; max-width: 440px">
      <q-card-section class="text-center q-py-md">
        <div class="text-h6">
          {{ getConfirmActionTitle(confirmActionType) }}
        </div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          {{ getConfirmActionMessage(confirmActionType) }}
        </div>
      </q-card-section>
      <q-card-actions align="center" class="q-pb-md">
        <q-btn
          unelevated
          label="Yes"
          color="green-7"
          @click="confirmPendingAction"
        />
        <q-btn
          unelevated
          label="No"
          color="negative"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="showEditDialog" persistent class="hr-edit-dialog">
    <q-card class="hr-edit-card">
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">Edit Application</div>
      </q-card-section>
      <q-form @submit.prevent="saveEdit">
        <q-card-section v-if="editForm.id">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                :model-value="editForm.employeeName"
                outlined
                dense
                label="Employee"
                readonly
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                :model-value="editForm.leaveTypeLabel"
                outlined
                dense
                label="Leave Type"
                readonly
              />
            </div>
            <template v-if="!editForm.isMonetization">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="editForm.startDate"
                  type="date"
                  outlined
                  dense
                  label="Start Date"
                  @update:model-value="onEditDateChange"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="editForm.endDate"
                  type="date"
                  outlined
                  dense
                  label="End Date"
                  @update:model-value="onEditDateChange"
                />
              </div>
            </template>
            <div class="col-12 col-md-6">
              <q-input
                v-model.number="editForm.totalDays"
                type="number"
                min="1"
                outlined
                dense
                :readonly="!editForm.isMonetization"
                :hint="editForm.isMonetization ? 'Days to monetize' : 'Auto-computed from selected date range'"
                label="Days"
              />
            </div>
            <div class="col-12" v-if="!editForm.isMonetization && editForm.selectedDates.length">
              <div class="text-caption text-grey-7 q-mb-xs">Selected Dates</div>
              <div class="text-caption">
                {{ editForm.selectedDates.map((d) => formatDate(d)).join(', ') }}
              </div>
            </div>
            <div class="col-12">
              <q-input
                v-model="editForm.reason"
                type="textarea"
                rows="4"
                outlined
                label="Reason"
              />
            </div>
            <div class="col-12">
              <q-input
                v-model="editForm.remarks"
                type="textarea"
                rows="3"
                outlined
                label="Remarks (optional)"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showEditDialog = false" />
          <q-btn
            unelevated
            color="primary"
            label="Save Changes"
            type="submit"
            :loading="actionLoading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>

  <q-dialog v-model="showRejectDialog" persistent>
    <q-card style="min-width: 360px">
      <q-card-section>
        <div class="text-h6">Reject Application</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="remarks" type="textarea" label="Reason for rejection" rows="4" outlined />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" v-close-popup />
        <q-btn
          unelevated
          color="negative"
          label="Submit"
          :loading="actionLoading"
          @click="confirmReject"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import StatusBadge from 'components/StatusBadge.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const actionLoading = ref(false)
const applications = ref([])
const tablePagination = ref({
  page: 1,
  rowsPerPage: 10,
})
const statusSearch = ref('')
const employmentTypeFilter = ref('')
const searchableStatusValues = new Set(['pending', 'approved', 'rejected'])
const DEPARTMENT_STOP_WORDS = new Set(['A', 'AN', 'AND', 'FOR', 'IN', 'OF', 'OFFICE', 'ON', 'THE', 'TO'])
const EMPLOYMENT_TYPE_FILTER_LABELS = {
  elective: 'Elective',
  co_terminous: 'Co-term',
  regular: 'Regular',
  casual: 'Casual',
}
const employmentTypeFilterLabel = computed(() => EMPLOYMENT_TYPE_FILTER_LABELS[employmentTypeFilter.value] || '')

function mergeStatus(app) {
  const raw = String(app.rawStatus || '').toUpperCase()
  const status = String(app.status || '').toUpperCase()
  const normalizedStatus = status.replace(/[_-]+/g, ' ')

  if (raw === 'PENDING_ADMIN' || normalizedStatus.includes('PENDING ADMIN')) return 'Pending Admin'
  if (raw === 'PENDING_HR' || normalizedStatus.includes('PENDING HR')) return 'Pending HR'

  if (raw.includes('PENDING') || normalizedStatus.includes('PENDING')) return 'Pending'
  if (raw.includes('APPROVED') || status.includes('APPROVED')) return 'Approved'
  if (
    raw.includes('REJECTED') ||
    raw.includes('DISAPPROVED') ||
    status.includes('REJECTED') ||
    status.includes('DISAPPROVED')
  ) {
    return 'Rejected'
  }

  return app.status || ''
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSearchToken(token) {
  if (!token) return ''
  if (/^\d+$/.test(token)) return String(Number(token))
  return token
}

function toDepartmentCode(value) {
  const source = String(value || '').trim()
  if (!source) return ''

  // Keep existing compact uppercase codes (e.g., CICTMO) unchanged.
  if (!/\s/.test(source) && source === source.toUpperCase()) {
    return source
  }

  const words = source
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean)

  if (!words.length) return source

  const acronymWords = words.filter((word) => !DEPARTMENT_STOP_WORDS.has(word) && !/^\d+$/.test(word))
  const selectedWords = acronymWords.length ? acronymWords : words
  const acronym = selectedWords.map((word) => word[0]).join('')

  return acronym || source
}

function tokenizeSearchValue(value) {
  const normalized = normalizeSearchText(value)
  if (!normalized) return []

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeSearchToken(token))
}

function getSearchTokens(value) {
  return tokenizeSearchValue(value)
}

function normalizeEmploymentTypeKey(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, '-')

  if (!normalized) return ''
  if (normalized.includes('ELECTIVE')) return 'elective'
  if (normalized.includes('CO-TER') || normalized.includes('CO-TERM') || normalized.includes('COTER')) return 'co_terminous'
  if (normalized.includes('REGULAR')) return 'regular'
  if (normalized.includes('CASUAL')) return 'casual'
  return ''
}

function getApplicationEmploymentTypeKey(application) {
  const candidates = [
    application?.employment_status,
    application?.employmentStatus,
    application?.appointment_status,
    application?.appointmentStatus,
    application?.employee_status,
    application?.employeeStatus,
    application?.status_type,
    application?.statusType,
    application?.employee?.status,
    application?.employee?.employment_status,
    application?.employee?.employmentStatus,
    application?.user?.status,
    application?.user?.employment_status,
    application?.user?.employmentStatus,
  ]

  for (const candidate of candidates) {
    const normalizedKey = normalizeEmploymentTypeKey(candidate)
    if (normalizedKey) return normalizedKey
  }

  return ''
}

function matchesEmploymentTypeFilter(application) {
  if (!employmentTypeFilter.value) return true
  return getApplicationEmploymentTypeKey(application) === employmentTypeFilter.value
}

function formatDayValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0'
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
}

function toIsoDateString(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function enumerateInclusiveDateRange(startDateValue, endDateValue) {
  const startDate = new Date(startDateValue)
  const endDate = new Date(endDateValue)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []

  const firstDate = new Date(startDate)
  const lastDate = new Date(endDate)
  if (firstDate > lastDate) {
    const tempDate = new Date(firstDate)
    firstDate.setTime(lastDate.getTime())
    lastDate.setTime(tempDate.getTime())
  }

  const dates = []
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate())
  const last = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate())

  while (cursor <= last) {
    dates.push(toIsoDateString(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates.filter(Boolean)
}

function formatGroupedInclusiveDateLines(dateValues) {
  if (!Array.isArray(dateValues) || dateValues.length === 0) return []

  const groupedByMonthYear = new Map()
  const sortedDates = [...new Set(dateValues.filter(Boolean))]
    .sort((left, right) => Date.parse(left) - Date.parse(right))

  for (const rawDate of sortedDates) {
    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue

    const monthName = parsedDate.toLocaleDateString('en-US', { month: 'short' })
    const year = parsedDate.getFullYear()
    const day = parsedDate.getDate()
    const groupKey = `${year}-${parsedDate.getMonth()}`

    if (!groupedByMonthYear.has(groupKey)) {
      groupedByMonthYear.set(groupKey, { monthName, year, days: [] })
    }

    groupedByMonthYear.get(groupKey).days.push(day)
  }

  return Array.from(groupedByMonthYear.values()).map((group) => {
    const uniqueDays = [...new Set(group.days)].sort((a, b) => a - b)
    return `${group.monthName} ${uniqueDays.join(',')} ${group.year}`
  })
}

function getApplicationInclusiveDateLines(app) {
  if (!app) return ['N/A']

  if (app.is_monetization) {
    return [`${formatDayValue(app.days)} day(s)`]
  }

  if (Array.isArray(app.selected_dates) && app.selected_dates.length > 0) {
    const groupedSelectedDates = formatGroupedInclusiveDateLines(app.selected_dates)
    if (groupedSelectedDates.length > 0) return groupedSelectedDates
  }

  if (app.startDate || app.endDate) {
    const startDate = app.startDate || app.endDate
    const endDate = app.endDate || app.startDate
    const rangedDates = enumerateInclusiveDateRange(startDate, endDate)
    const groupedRangeDates = formatGroupedInclusiveDateLines(rangedDates)
    if (groupedRangeDates.length > 0) return groupedRangeDates
  }

  const start = app.startDate ? formatDate(app.startDate) : 'N/A'
  const end = app.endDate ? formatDate(app.endDate) : 'N/A'
  return [`${start} - ${end}`]
}

function getApplicationDurationLabel(app) {
  return getApplicationInclusiveDateLines(app).join(' ')
}

function getApplicationStatusLabel(app) {
  if (app?.displayStatus) return app.displayStatus
  if (app?.status) return app.status
  return mergeStatus(app)
}

function getApplicationStatusPriority(app) {
  const status = String(getApplicationStatusLabel(app) || '').toLowerCase()
  if (status.includes('pending')) return 0
  if (status.includes('approved')) return 1
  if (status.includes('rejected') || status.includes('disapproved')) return 2
  return 3
}

function compareApplicationsForTable(a, b) {
  const statusPriorityDiff = getApplicationStatusPriority(a) - getApplicationStatusPriority(b)
  if (statusPriorityDiff !== 0) return statusPriorityDiff

  const dateA = Date.parse(a?.dateFiled || '') || 0
  const dateB = Date.parse(b?.dateFiled || '') || 0
  if (dateA !== dateB) return dateB - dateA

  const idA = Number(a?.id) || 0
  const idB = Number(b?.id) || 0
  return idB - idA
}

function getDateSearchValues(dateValue) {
  if (!dateValue) return []
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return [String(dateValue)]

  const monthLong = date.toLocaleDateString('en-US', { month: 'long' })
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()

  return [
    monthLong,
    monthShort,
    `${monthLong} ${day}`,
    `${monthLong} ${day} ${year}`,
    `${monthShort} ${day}`,
    `${monthShort} ${day} ${year}`,
    `day ${day}`,
    String(day),
    String(year),
  ]
}

function getApplicationSearchTokenSet(app) {
  const dateTerms = getDateSearchValues(app?.dateFiled)
  const inclusiveDateTerms = getApplicationInclusiveDateLines(app)

  const searchValues = [
    'application',
    app?.id,
    app?.rawStatus,
    app?.status,
    getApplicationStatusLabel(app),
    app?.leaveType,
    app?.employeeName,
    app?.firstname,
    app?.middlename,
    app?.surname,
    app?.employee_id,
    app?.office,
    app?.officeShort,
    app?.days,
    formatDayValue(app?.days),
    ...inclusiveDateTerms,
    ...dateTerms,
  ]

  return searchValues
    .map((value) => normalizeSearchText(value))
    .filter(Boolean)
    .join(' ')
}

const applicationsForTable = computed(() => {
  const queryTokens = getSearchTokens(statusSearch.value)
  const rows = applications.value.filter((app) => matchesEmploymentTypeFilter(app))
  if (!queryTokens.length) return [...rows].sort(compareApplicationsForTable)

  const filteredRows = rows.filter((app) => {
    const searchText = getApplicationSearchTokenSet(app)
    return queryTokens.every((token) => searchText.includes(token))
  })

  return filteredRows.sort(compareApplicationsForTable)
})

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' },
  { name: 'employee', label: 'Employee', align: 'left' },
  { name: 'office', label: 'Department', field: (row) => row.officeShort || row.office, align: 'left' },
  {
    name: 'leaveType',
    label: 'Leave Type',
    field: (row) => row.is_monetization ? `${row.leaveType} (Monetization)` : row.leaveType,
    align: 'left',
  },
  { name: 'dateFiled', label: 'Date Filed', field: (row) => row.dateFiled ? formatDate(row.dateFiled) : 'N/A', align: 'left' },
  { name: 'inclusiveDates', label: 'Inclusive Dates', field: (row) => getApplicationDurationLabel(row), align: 'left' },
  { name: 'days', label: 'Days', field: 'days', align: 'left' },
  { name: 'status', label: 'Status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'center' },
]

const showDetailsDialog = ref(false)
const showEditDialog = ref(false)
const showRejectDialog = ref(false)
const showConfirmActionDialog = ref(false)
const selectedApp = ref(null)
const rejectId = ref('')
const remarks = ref('')
const confirmActionType = ref('approve')
const confirmActionTarget = ref(null)
const editForm = ref(getEmptyEditForm())

function getEmptyEditForm() {
  return {
    id: '',
    employeeName: '',
    leaveTypeLabel: '',
    leaveTypeId: null,
    isMonetization: false,
    startDate: '',
    endDate: '',
    originalStartDate: '',
    originalEndDate: '',
    totalDays: 0,
    reason: '',
    remarks: '',
    selectedDates: [],
  }
}

function canEditApplication(app) {
  return String(app?.rawStatus || '').toUpperCase() === 'PENDING_HR'
}

function toIsoDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const normalized = raw.replace(/\//g, '-')
  const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeSelectedDates(dates) {
  if (!Array.isArray(dates)) return []
  return [...new Set(dates.map((date) => toIsoDate(date)).filter(Boolean))].sort()
}

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildWeekdayDateRange(startDate, endDate) {
  if (!startDate || !endDate) return []
  if (endDate < startDate) return []

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

  const dates = []
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(formatIsoDate(cursor))
    }
  }
  return dates
}

async function fetchApplications() {
  loading.value = true
  try {
    const { data } = await api.get('/hr/dashboard')
    const rawApps = Array.isArray(data.applications) ? data.applications : []
    applications.value = rawApps.map((app) => ({
      ...app,
      officeShort: toDepartmentCode(app?.office),
      displayStatus: mergeStatus(app),
    }))
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load applications right now.')
    $q.notify({
      type: 'negative',
      message: msg,
      position: 'top',
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchApplications)

watch(
  () => route.query.status,
  (value) => {
    const normalized = String(value || '').toLowerCase()
    statusSearch.value = searchableStatusValues.has(normalized) ? normalized : ''
  },
  { immediate: true },
)

watch(
  () => route.query.employment_type,
  (value) => {
    employmentTypeFilter.value = normalizeEmploymentTypeKey(value)
  },
  { immediate: true },
)

watch([statusSearch, employmentTypeFilter], () => {
  tablePagination.value.page = 1
})

function clearEmploymentTypeFilter() {
  const nextQuery = { ...route.query }
  delete nextQuery.employment_type
  router.replace({ query: nextQuery })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function openDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}

function getConfirmActionTitle(type) {
  if (type === 'approve') return 'Approve this application?'
  return 'Reject this application?'
}

function getConfirmActionMessage(type) {
  if (type === 'approve') {
    return 'This will finalize the approval of the leave request.'
  }
  return 'You will continue to the rejection form.'
}

function getApplicationId(target) {
  return target?.id ?? target
}

function openActionConfirm(type, target) {
  confirmActionType.value = type
  confirmActionTarget.value = target
  showConfirmActionDialog.value = true
  showDetailsDialog.value = false
}

function confirmPendingAction() {
  const target = confirmActionTarget.value
  const type = confirmActionType.value
  showConfirmActionDialog.value = false

  if (type === 'approve') {
    handleApprove(getApplicationId(target))
    return
  }

  openReject(getApplicationId(target))
}

function openEdit(app) {
  const selectedDates = normalizeSelectedDates(app?.selected_dates)
  const startDate = toIsoDate(app?.startDate) || selectedDates[0] || ''
  const endDate = toIsoDate(app?.endDate) || selectedDates[selectedDates.length - 1] || ''
  const preservedDates = selectedDates.length
    ? selectedDates
    : buildWeekdayDateRange(startDate, endDate)
  const parsedDays = Number(app?.days)

  editForm.value = {
    id: app?.id ?? '',
    employeeName: app?.employeeName || '',
    leaveTypeLabel: `${app?.leaveType || ''}${app?.is_monetization ? ' (Monetization)' : ''}`,
    leaveTypeId: app?.leave_type_id ?? app?.leaveTypeId ?? null,
    isMonetization: Boolean(app?.is_monetization),
    startDate,
    endDate,
    originalStartDate: startDate,
    originalEndDate: endDate,
    totalDays: Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : preservedDates.length,
    reason: app?.reason || '',
    remarks: app?.remarks || '',
    selectedDates: preservedDates,
  }

  showDetailsDialog.value = false
  showEditDialog.value = true
}

function onEditDateChange() {
  if (editForm.value.isMonetization) return
  const generatedDates = buildWeekdayDateRange(editForm.value.startDate, editForm.value.endDate)
  editForm.value.selectedDates = generatedDates
  editForm.value.totalDays = generatedDates.length
}

async function updateApplicationDetails(id, payload) {
  try {
    await api.put(`/hr/leave-applications/${id}`, payload)
    return
  } catch (err) {
    const statusCode = err?.response?.status
    if (statusCode !== 404 && statusCode !== 405) {
      throw err
    }
  }

  await api.patch(`/hr/leave-applications/${id}`, payload)
}

async function saveEdit() {
  if (!editForm.value.id) return

  if (!String(editForm.value.reason || '').trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason.',
      position: 'top',
    })
    return
  }

  if (!editForm.value.isMonetization) {
    if (!editForm.value.startDate || !editForm.value.endDate) {
      $q.notify({
        type: 'warning',
        message: 'Please provide a valid start and end date.',
        position: 'top',
      })
      return
    }

    if (editForm.value.endDate < editForm.value.startDate) {
      $q.notify({
        type: 'warning',
        message: 'End date must be on or after start date.',
        position: 'top',
      })
      return
    }
  }

  let selectedDates = [...editForm.value.selectedDates]
  if (!editForm.value.isMonetization) {
    const dateRangeChanged = (
      editForm.value.startDate !== editForm.value.originalStartDate ||
      editForm.value.endDate !== editForm.value.originalEndDate
    )
    if (dateRangeChanged || selectedDates.length === 0) {
      selectedDates = buildWeekdayDateRange(editForm.value.startDate, editForm.value.endDate)
    }

    if (!selectedDates.length) {
      $q.notify({
        type: 'warning',
        message: 'Selected date range must include at least one weekday.',
        position: 'top',
      })
      return
    }
  }

  const totalDays = editForm.value.isMonetization
    ? Number(editForm.value.totalDays)
    : selectedDates.length

  if (!Number.isFinite(totalDays) || totalDays < 1) {
    $q.notify({
      type: 'warning',
      message: 'Days must be at least 1.',
      position: 'top',
    })
    return
  }

  const payload = {
    total_days: totalDays,
    reason: String(editForm.value.reason).trim(),
    remarks: String(editForm.value.remarks || '').trim() || null,
  }

  if (editForm.value.leaveTypeId) {
    payload.leave_type_id = editForm.value.leaveTypeId
  }

  if (editForm.value.isMonetization) {
    payload.is_monetization = true
  } else {
    payload.start_date = editForm.value.startDate
    payload.end_date = editForm.value.endDate
    payload.selected_dates = selectedDates
  }

  actionLoading.value = true
  try {
    await updateApplicationDetails(editForm.value.id, payload)
    $q.notify({
      type: 'positive',
      message: 'Application details updated.',
      position: 'top',
    })
    showEditDialog.value = false
    await fetchApplications()

    if (selectedApp.value?.id === editForm.value.id) {
      selectedApp.value = applications.value.find((app) => app.id === editForm.value.id) || null
    }
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to update this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

async function handleApprove(id) {
  actionLoading.value = true
  try {
    await api.post(`/hr/leave-applications/${id}/approve`)
    $q.notify({
      type: 'positive',
      message: 'Leave application approved! Balance deducted if credit-based.',
      position: 'top',
    })
    showDetailsDialog.value = false
    await fetchApplications()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to approve this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}

function openReject(id) {
  rejectId.value = id
  remarks.value = ''
  showRejectDialog.value = true
  showDetailsDialog.value = false
}

async function confirmReject() {
  if (!remarks.value.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Please provide a reason for rejection',
      position: 'top',
    })
    return
  }

  actionLoading.value = true
  try {
    await api.post(`/hr/leave-applications/${rejectId.value}/reject`, {
      remarks: remarks.value,
    })
    $q.notify({
      type: 'info',
      message: 'Leave application rejected with remarks',
      position: 'top',
    })
    showRejectDialog.value = false
    await fetchApplications()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to reject this application right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    actionLoading.value = false
  }
}
</script>

<!-- Unscoped: q-dialog teleports to <body>, so scoped styles won't reliably apply -->
<style>
.hr-applications-panel .application-status-search {
  width: min(440px, 84vw);
}

.hr-edit-dialog .q-dialog__inner--minimized {
  padding: 16px;
}

.hr-edit-dialog .q-dialog__inner--minimized > div {
  width: min(700px, calc(100vw - 32px));
  max-width: min(700px, calc(100vw - 32px));
}

.hr-edit-card {
  width: 100%;
}

@media (max-width: 599px) {
  .hr-edit-dialog .q-dialog__inner--minimized {
    padding: 12px;
  }

  .hr-edit-dialog .q-dialog__inner--minimized > div {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }
}
</style>
