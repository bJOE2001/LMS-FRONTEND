<template>
  <q-page class="q-pa-md">
    <!-- Page Header -->
    <div class="q-mb-lg">
      <div class="row items-center justify-between">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Employee Management</h1>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            unelevated
            no-caps
            color="secondary"
            icon="add_card"
            label="Add Leave Credits"
            class="credit-btn"
            @click="openLeaveCreditsDialog()"
          />
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="row q-col-gutter-md q-mb-lg summary-strip">
      <div class="col-12 col-sm-6 col-md-6 summary-strip__item">
        <q-card class="bg-white rounded-borders summary-strip__card" flat bordered>
          <q-card-section class="summary-strip__card-section">
            <div class="row items-center no-wrap summary-strip__content">
              <q-icon name="groups" size="md" color="primary" class="q-mr-sm summary-strip__icon" />
              <div class="summary-strip__text">
                <div class="text-caption text-weight-medium summary-strip__label">
                  Total Employees
                </div>
                <div class="text-h4 text-primary summary-strip__value">
                  <q-spinner v-if="loadingTotalEmployees" size="32px" color="primary" />
                  <template v-else>{{ totalEmployees }}</template>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-6 summary-strip__item">
        <q-card class="bg-white rounded-borders summary-strip__card" flat bordered>
          <q-card-section class="summary-strip__card-section">
            <div class="row items-center no-wrap summary-strip__content">
              <q-icon
                name="business"
                size="md"
                color="green-8"
                class="q-mr-sm summary-strip__icon"
              />
              <div class="summary-strip__text">
                <div class="text-caption text-weight-medium summary-strip__label">Offices</div>
                <div class="text-h4 text-green-8 summary-strip__value">
                  <q-spinner v-if="loadingDepartments" size="32px" color="green-8" />
                  <template v-else>{{ allDepartments.length }}</template>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="row justify-between items-center">
          <div class="text-h6">Employee Records</div>
          <div class="row items-center search-wrap">
            <q-select
              v-model="activityFilter"
              :options="activityOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              class="activity-filter"
              label="Employment Status"
            />
            <q-select
              v-model="biometricStatusFilter"
              :options="biometricStatusOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              class="activity-filter"
              label="Bio Status"
            />
            <q-input
              v-model="search"
              outlined
              dense
              debounce="400"
              placeholder="Search name, ID, status, office..."
              class="search-input full-width"
              clearable
            >
              <template #prepend>
                <q-icon name="search" size="sm" color="grey-6" />
              </template>
            </q-input>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Employees -->
    <q-card flat bordered class="rounded-borders">
      <q-card-section class="bg-green-1">
        <div class="row items-center">
          <q-icon name="people" size="sm" color="green-8" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold text-green-8">All Employees</div>
          <q-space />
          <q-badge
            color="green-8"
            :label="employeePagination.rowsNumber + ' employee(s)'"
            rounded
          />
        </div>
      </q-card-section>
      <q-table
        :rows="employees"
        :columns="visibleEmployeeColumns"
        row-key="control_no"
        flat
        :loading="loading"
        v-model:pagination="employeePagination"
        :rows-per-page-options="[10]"
        class="employee-records-table"
        @request="onEmployeeRequest"
        @row-click="onEmployeeRowClick"
      >
        <template #body-cell-name="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar
                size="32px"
                :color="statusBadgeColor(props.row.status)"
                text-color="white"
                class="q-mr-sm"
              >
                {{ (props.row.firstname || '').charAt(0) }}{{ (props.row.surname || '').charAt(0) }}
              </q-avatar>
              <div>
                <div class="text-weight-medium">
                  {{ getEmployeeColumnDisplayName(props.row) }}
                </div>
                <div v-if="props.row.designation" class="text-caption text-grey-6">
                  {{ props.row.designation }}
                </div>
                <q-badge
                  v-if="isDepartmentHeadRecord(props.row)"
                  color="blue-8"
                  text-color="white"
                  label="Department Head"
                  class="q-mt-xs"
                  rounded
                />
              </div>
            </div>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge
              :color="statusBadgeColor(props.value)"
              :label="formatResponsiveStatusLabel(props.value)"
              class="text-weight-medium"
              rounded
            />
          </q-td>
        </template>

        <template #body-cell-biometric_status="props">
          <q-td :props="props" class="text-center">
            <q-badge
              rounded
              class="text-weight-bold text-caption q-px-sm"
              :color="getBiometricStatusColor(props.row.biometric_status)"
              :text-color="getBiometricStatusTextColor(props.row.biometric_status)"
              :label="formatBiometricStatus(props.row.biometric_status)"
            >
              <q-tooltip v-if="props.row.biometric_device_name || props.row.biometric_enrolled_at">
                <div v-if="props.row.biometric_device_name">Device: {{ props.row.biometric_device_name }}</div>
                <div v-if="props.row.biometric_enrolled_at">Enrolled: {{ props.row.biometric_enrolled_at }}</div>
              </q-tooltip>
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn
              flat
              dense
              round
              icon="fingerprint"
              :color="props.row.biometric_status === 'REGISTERED' ? 'positive' : props.row.biometric_status === 'PENDING_ENROLLMENT' ? 'amber-9' : 'primary'"
              size="sm"
              @click.stop="openPushToBioDialog(props.row)"
            >
              <q-tooltip>{{ props.row.biometric_status === 'REGISTERED' ? 'Push / Re-push to Biometric Device' : 'Push to Biometric Device' }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowAddLeaveCreditsAction(props.row)"
              flat
              dense
              round
              icon="add_card"
              color="green-8"
              size="sm"
              @click.stop="openLeaveCreditsDialog(props.row)"
            >
              <q-tooltip>Add Leave Credits</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowEditLeaveCreditsAction(props.row)"
              flat
              dense
              round
              icon="edit_note"
              color="orange-9"
              size="sm"
              @click.stop="openLeaveCreditsEditDialog(props.row)"
            >
              <q-tooltip>Edit Leave Credits</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="receipt_long"
              color="secondary"
              size="sm"
              @click.stop="openLeaveCreditsLedgerDialog(props.row)"
            >
              <q-tooltip>Leave Credits Ledger</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="schedule"
              color="deep-orange-7"
              size="sm"
              @click.stop="openCocCtoLedgerDialog(props.row)"
            >
              <q-tooltip>COC / CTO Ledger</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              icon="visibility"
              color="primary"
              size="sm"
              @click.stop="viewEmployee(props.row)"
            >
              <q-tooltip>View Details</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-lg">
            <template v-if="loading">
              <q-spinner color="primary" size="40px" />
              <div class="text-grey-6 q-mt-sm">Loading employees...</div>
            </template>
            <template v-else>
              <q-icon name="people_outline" size="48px" color="grey-5" />
              <div class="text-grey-6 q-mt-sm">No employees found</div>
            </template>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- View Employee Dialog -->
    <HrEmployeeDetailsDialog
      v-model="showViewDialog"
      :employee="selectedEmployee"
      :monthly-rate="employeeMonthlyRateLabel"
      :terminal-leave-estimate="employeeTerminalLeaveEstimatedAmountLabel"
      :leave-badges="employeeDetailsLeaveBadges"
      :loading-badges="employeeDetailsLeaveBadgesLoading"
      :leave-history="leaveHistory"
      :loading-history="leaveHistoryLoading"
      :inclusive-date-builder="buildLeaveHistoryInclusiveDateLabel"
      :can-open-calendar-checker="canOpenLeaveHistoryCalendarPreview"
      @open-calendar-preview="openLeaveHistoryCalendarPreview"
    />

    <HrEmployeeCocCtoLedgerDialog
      v-model="showCocCtoLedgerDialog"
      :employee="cocCtoLedgerEmployee"
      :current-balance="cocCtoLedgerCurrentBalance"
      :ledger-rows="cocCtoLedgerRows"
      :loading="cocCtoLedgerLoading"
      :error="cocCtoLedgerError"
    />

    <HrEmployeeLeaveCreditsLedgerDialog
      v-model="showLeaveCreditsLedgerDialog"
      :error="leaveCreditsLedgerError"
      :loading="leaveCreditsLedgerLoading"
      :printing="printingLeaveCreditsLedger"
      :can-print="Boolean(leaveCreditsLedgerEmployee)"
      :employee="leaveCreditsLedgerEmployee"
      :leave-balance-badges="ledgerBalanceBadges"
      :paper-size="ledgerPaperSize"
      :dialog-style="ledgerDialogStyle"
      :sheet-style="ledgerSheetStyle"
      :identity-name-style="ledgerIdentityNameStyle"
      :identity-status-style="ledgerIdentityStatusStyle"
      :identity-office-style="ledgerIdentityOfficeStyle"
      :identity-service-value-style="ledgerIdentityServiceValueStyle"
      :employee-heading-name="ledgerEmployeeHeadingName"
      :employee-heading-status="ledgerEmployeeHeadingStatus"
      :employee-heading-office="ledgerEmployeeHeadingOffice"
      :employee-first-day-of-service="ledgerEmployeeFirstDayOfService"
      :column-widths="ledgerColumnWidths"
      :rendered-pages="ledgerRenderedPages"
      :value-class-resolver="ledgerValueClass"
      @print="printLeaveCreditsLedger"
      @edit-accrual="openAccrualEditDialog"
      @restored="onLeaveCreditsRestored"
    />

    <!-- Edit Accruals Dialog -->
    <HrEmployeeLeaveAccrualsEditDialog
      v-model="showAccrualsEditDialog"
      :accrual-ids="selectedAccrualIds"
      @saved="onAccrualsSaved"
    />

    <!-- Manual Leave Credits Dialog -->
    <HrEmployeeLeaveCreditsDialog
      v-model="showLeaveCreditsDialog"
      :mode="leaveCreditDialogMode"
      :employee="activeCreditEmployee"
      @saved="onLeaveCreditsSaved"
    />

    <AdminApplicationCalendarDialog
      v-model="showCalendarPreviewDialog"
      v-model:calendar-preview-model="calendarPreviewModel"
      :calendar-preview-key="calendarPreviewKey"
      :set-calendar-preview-ref="setCalendarPreviewRefElement"
      :calendar-preview-year-month="calendarPreviewYearMonth"
      :calendar-preview-employee-name="calendarPreviewEmployeeName"
      :calendar-preview-state-counts="calendarPreviewStateCounts"
      :calendar-preview-date-warning="calendarPreviewDateWarning"
      :calendar-preview-warning-style="calendarPreviewWarningStyle"
      :calendar-preview-warning-state="calendarPreviewWarningState"
      :on-show="syncCalendarPreviewDecorations"
      :on-navigation="onCalendarPreviewNavigation"
      :on-calendar-model-change="handleCalendarPreviewModelUpdate"
      :on-surface-pointer-down="handleCalendarPreviewSurfacePointerDown"
      :on-surface-click="handleCalendarPreviewSurfaceClick"
    />

    <!-- Push to Biometric Device Dialog -->
    <HrEmployeePushToBioDialog
      v-model="showPushToBioDialog"
      :employee="activeBioEmployee"
      @registered="onBiometricRegistered"
    />
  </q-page>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useQuasar } from 'quasar'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { useEmployeeStore } from 'src/stores/employee-store'
import AdminApplicationCalendarDialog from 'src/components/admin/AdminApplicationCalendarDialog.vue'
import HrEmployeeLeaveCreditsLedgerDialog from 'src/components/hr/HrEmployeeLeaveCreditsLedgerDialog.vue'
import HrEmployeeDetailsDialog from 'src/components/hr/HrEmployeeDetailsDialog.vue'
import HrEmployeeLeaveCreditsDialog from 'src/components/hr/HrEmployeeLeaveCreditsDialog.vue'
import HrEmployeePushToBioDialog from 'src/components/hr/HrEmployeePushToBioDialog.vue'
import HrEmployeeCocCtoLedgerDialog from 'src/components/hr/HrEmployeeCocCtoLedgerDialog.vue'
import HrEmployeeLeaveAccrualsEditDialog from 'src/components/hr/HrEmployeeLeaveAccrualsEditDialog.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const $q = useQuasar()
const employeeStore = useEmployeeStore()
const {
  employees,
  totalEmployees,
  allDepartments,
  employeePagination,
  loading,
  loadingDepartments,
  loadingTotalEmployees,
} = storeToRefs(employeeStore)

const search = ref('')
const activityFilter = ref('ACTIVE')
const activityOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'All', value: 'ALL' },
]
const biometricStatusFilter = ref('ALL')
const biometricStatusOptions = [
  { label: 'All Biometrics', value: 'ALL' },
  { label: 'Registered', value: 'REGISTERED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Not Registered', value: 'NOT_REGISTERED' },
]

const showPushToBioDialog = ref(false)
const activeBioEmployee = ref(null)
const activeCreditEmployee = ref(null)

const showViewDialog = ref(false)
const selectedEmployee = ref(null)
const employeeDetailsLeaveBadges = ref([])
const employeeDetailsLeaveBadgesLoading = ref(false)
const leaveHistory = ref([])
const leaveHistoryLoading = ref(false)
const showCalendarPreviewDialog = ref(false)
const calendarPreviewAnchorEntry = ref(null)
const calendarPreviewModel = ref([])
const calendarPreviewKey = ref(0)
const calendarPreviewRef = ref(null)
const calendarPreviewDateWarning = ref('')
const calendarPreviewWarningDate = ref('')
const calendarPreviewWarningStyle = ref({})
const calendarPreviewView = ref({
  year: String(new Date().getFullYear()),
  month: String(new Date().getMonth() + 1).padStart(2, '0'),
})
const showCocCtoLedgerDialog = ref(false)
const cocCtoLedgerEmployee = ref(null)
const cocCtoLedgerRows = ref([])
const cocCtoLedgerCurrentBalance = ref({ hours: 0, days: 0 })
const cocCtoLedgerLoading = ref(false)
const cocCtoLedgerError = ref('')
const showLeaveCreditsLedgerDialog = ref(false)
const leaveCreditsLedgerEmployee = ref(null)
const leaveCreditsLedgerRows = ref([])
const leaveCreditsLedgerBalanceBadges = ref([])
const showAccrualsEditDialog = ref(false)
const selectedAccrualIds = ref([])
const leaveCreditsLedgerLoading = ref(false)
const leaveCreditsLedgerError = ref('')
const printingLeaveCreditsLedger = ref(false)
const ledgerPaperSize = ref('A4')

// Manual leave credit state
const showLeaveCreditsDialog = ref(false)
const leaveCreditDialogMode = ref('ADD')
let employeeDetailsLeaveBadgesLookupSequence = 0
// Server-side pagination state managed by employeeStore

// Column definitions (local LMS_DB)
const employeeColumns = [
  { name: 'control_no', label: 'ID', align: 'left', field: 'control_no', sortable: true },
  { name: 'name', label: 'Employee', align: 'left', field: 'surname', sortable: true },
  { name: 'status', label: 'Status', align: 'center', field: 'status', sortable: true },
  {
    name: 'office',
    label: 'Office',
    align: 'left',
    field: (row) => resolveOfficeAcronymLabel(row),
    sortable: true,
  },
  {
    name: 'assigned_office',
    label: 'Assigned Office',
    align: 'left',
    field: (row) => resolveAssignedOfficeAcronymLabel(row),
    sortable: true,
  },
  {
    name: 'biometric_status',
    label: 'Bio Status',
    align: 'center',
    field: 'biometric_status',
    sortable: true,
  },
  { name: 'actions', label: 'Actions', align: 'center', field: 'actions' },
]
const visibleEmployeeColumns = computed(() =>
  $q.screen.lt.sm
    ? employeeColumns.filter(
        (column) => !['control_no', 'status', 'assigned_office', 'biometric_status'].includes(column.name),
      )
    : employeeColumns,
)
const LEDGER_PAPER_PRESETS = {
  A4: {
    label: 'A4',
    previewWidth: 794,
    previewHeight: 1123,
    minimumRows: 46,
    pdfMinimumRows: 46,
    pageSize: 'A4',
    pageMargins: [8, 18, 8, 8],
    pdfHorizontalInset: 0,
    pdfGridLineWidth: 0.75,
    pdfActionColumnShrink: 10,
    pdfHeaderRowHeight: 14.5,
    pdfSubHeaderRowHeight: 24,
    pdfBodyRowHeight: 14.05,
  },
  LONG: {
    label: 'Long',
    previewWidth: 816,
    previewHeight: 1248,
    minimumRows: 56,
    pdfMinimumRows: 56,
    pageSize: {
      width: 612,
      height: 936,
    },
    pageMargins: [8, 18, 8, 8],
    pdfHorizontalInset: 0,
    pdfGridLineWidth: 0.75,
    pdfActionColumnShrink: 10,
    pdfHeaderRowHeight: 14.5,
    pdfSubHeaderRowHeight: 24,
    pdfBodyRowHeight: 14.2,
  },
}

const LEDGER_COLUMN_WIDTH_UNITS = [10, 13, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 11]
const LEDGER_COLUMN_WIDTH_TOTAL = LEDGER_COLUMN_WIDTH_UNITS.reduce(
  (total, width) => total + width,
  0,
)
const LEDGER_BLANK_ROW_TEMPLATE = Object.freeze({
  period: '',
  particulars: '',
  leaveTypeCode: '',
  vacationEarned: '',
  vacationAbsUndWp: '',
  vacationBalance: '',
  vacationAbsUndWop: '',
  sickEarned: '',
  sickAbsUnd: '',
  sickBalance: '',
  sickAbsUndWop: '',
  otherEarned: '',
  otherAbsUndWp: '',
  otherBalance: '',
  otherAbsUndWop: '',
  actionTaken: '',
})
const LEDGER_LEAVE_TYPE_COLORS = Object.freeze({
  VL: '#000000',
  SL: '#000000',
  WL: '#1e5fbf',
  MCO6: '#1b8f3a',
})
const LEDGER_BALANCE_BADGE_ORDER = Object.freeze(['VL', 'SL', 'WL', 'MCO6'])
const LEDGER_BALANCE_BADGE_UNIFORM_PALETTE = Object.freeze({
  accent: '#475569',
  background: '#f1f5f9',
})
const LEDGER_BALANCE_BADGE_META = Object.freeze({
  VL: {
    label: 'VL',
  },
  SL: {
    label: 'SL',
  },
  WL: {
    label: 'WL',
  },
  MCO6: {
    label: 'MCO6',
  },
  DEFAULT: {
    accent: LEDGER_BALANCE_BADGE_UNIFORM_PALETTE.accent,
    background: LEDGER_BALANCE_BADGE_UNIFORM_PALETTE.background,
  },
})
const TERMINAL_LEAVE_CONSTANT_FACTOR = 0.0478087
const terminalLeaveEstimateFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ledgerColumnWidths = LEDGER_COLUMN_WIDTH_UNITS.map(
  (width) => `${(width / LEDGER_COLUMN_WIDTH_TOTAL) * 100}%`,
)
const ledgerPaperPreset = computed(
  () => LEDGER_PAPER_PRESETS[ledgerPaperSize.value] || LEDGER_PAPER_PRESETS.A4,
)
const ledgerSheetStyle = computed(() => ({
  width: `${ledgerPaperPreset.value.previewWidth}px`,
  minHeight: `${ledgerPaperPreset.value.previewHeight}px`,
  height: 'auto',
}))
const ledgerDialogStyle = computed(() => ({
  width: `min(${ledgerPaperPreset.value.previewWidth + 96}px, 96vw)`,
  maxWidth: '96vw',
}))
const ledgerRenderedPages = computed(() =>
  buildLedgerPagesForPaper(leaveCreditsLedgerRows.value, ledgerPaperPreset.value),
)
const ledgerBalanceBadges = computed(() => leaveCreditsLedgerBalanceBadges.value)

const ledgerEmployeeDisplayName = computed(() =>
  getEmployeeColumnDisplayName(leaveCreditsLedgerEmployee.value),
)
const ledgerEmployeeHeadingName = computed(() =>
  formatLedgerHeadingName(ledgerEmployeeDisplayName.value),
)
const ledgerEmployeeHeadingStatus = computed(() =>
  formatLedgerHeadingStatus(leaveCreditsLedgerEmployee.value),
)
const ledgerEmployeeHeadingOffice = computed(() =>
  formatLedgerHeadingOffice(leaveCreditsLedgerEmployee.value),
)
const ledgerIdentityNameStyle = computed(() =>
  buildLedgerIdentityPreviewStyle(ledgerEmployeeHeadingName.value),
)
const ledgerIdentityStatusStyle = computed(() =>
  buildLedgerIdentityPreviewStyle(ledgerEmployeeHeadingStatus.value),
)
const ledgerIdentityOfficeStyle = computed(() =>
  buildLedgerIdentityPreviewStyle(ledgerEmployeeHeadingOffice.value),
)
const ledgerEmployeeFirstDayOfService = computed(() =>
  formatLedgerFirstDayOfService(leaveCreditsLedgerEmployee.value),
)
const ledgerIdentityServiceValueStyle = computed(() =>
  buildLedgerIdentityPreviewStyle(ledgerEmployeeFirstDayOfService.value),
)
const calendarPreviewYearMonth = computed(
  () => `${calendarPreviewView.value.year}/${calendarPreviewView.value.month}`,
)
const calendarPreviewEmployeeName = computed(() => {
  const employee = selectedEmployee.value
  const fullName = [employee?.firstname, employee?.surname].filter(Boolean).join(' ').trim()
  if (fullName) return fullName.toUpperCase()

  const fallbackName = pickFirstDefined(calendarPreviewAnchorEntry.value, [
    'employee_name',
    'employeeName',
    'name',
  ])

  return String(fallbackName || 'Employee')
    .trim()
    .toUpperCase()
})
const employeeTerminalLeaveEstimatedAmountLabel = computed(() =>
  formatEmployeeTerminalLeaveAmount(selectedEmployee.value),
)
const employeeMonthlyRateLabel = computed(() => formatEmployeeMonthlyRate(selectedEmployee.value))
const calendarPreviewDateStates = computed(() => {
  const dateStates = new Map()

  for (const entry of leaveHistory.value) {
    const applicationState = getLeaveHistoryCalendarState(entry)
    const requestUpdateDates = getLeaveHistoryRequestUpdateCalendarDates(entry)
    const showRequestUpdateOnly = requestUpdateDates.length > 0

    if (applicationState && !showRequestUpdateOnly) {
      for (const date of getLeaveHistoryCalendarDates(entry)) {
        if (!date) continue

        const existingState = dateStates.get(date)
        if (!existingState || applicationState === 'pending') {
          dateStates.set(date, applicationState)
        }
      }
    }

    for (const date of requestUpdateDates) {
      if (!date) continue
      dateStates.set(date, 'request-update')
    }
  }

  return dateStates
})
const calendarPreviewStateCounts = computed(() => {
  const counts = {
    pending: 0,
    approved: 0,
    requestUpdate: 0,
  }

  for (const state of calendarPreviewDateStates.value.values()) {
    if (state === 'pending') counts.pending += 1
    if (state === 'approved') counts.approved += 1
    if (state === 'request-update') counts.requestUpdate += 1
  }

  return counts
})
const calendarPreviewWarningState = computed(
  () => calendarPreviewDateStates.value.get(calendarPreviewWarningDate.value) || 'pending',
)

function statusBadgeColor(status) {
  const normalizedStatus = normalizeStatus(status)
  if (!normalizedStatus) return 'grey'
  const c = {
    REGULAR: 'green',
    'CO-TERMINOUS': 'brown-7',
    ELECTIVE: 'purple-8',
    CASUAL: 'orange',
    CONTRACTUAL: 'blue-9',
  }
  return c[normalizedStatus] ?? 'blue-9'
}

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toUpperCase()
}

function displayStatusLabel(status) {
  const normalizedStatus = normalizeStatus(status)
  if (!normalizedStatus) return '-'
  if (normalizedStatus === 'REGULAR') return 'PERMANENT'
  if (normalizedStatus === 'CONTRACTUAL') return 'COS(Job Order)'
  if (normalizedStatus === 'HONORARIUM') return 'COS(Honorarium)'
  return normalizedStatus
}

function formatResponsiveStatusLabel(status) {
  const displayStatus = displayStatusLabel(status)
  if (displayStatus === '-') return '-'
  return $q.screen.lt.sm ? displayStatus.charAt(0) : displayStatus
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function getNestedValue(source, path) {
  if (!source || typeof source !== 'object') return undefined

  return String(path)
    .split('.')
    .reduce(
      (current, segment) => (current && typeof current === 'object' ? current[segment] : undefined),
      source,
    )
}

function pickFirstDefined(source, candidates, fallback = '') {
  for (const candidate of candidates) {
    const value = String(candidate).includes('.')
      ? getNestedValue(source, candidate)
      : source?.[candidate]

    if (hasMeaningfulValue(value)) return value
  }

  return fallback
}

const DEPARTMENT_STOP_WORDS = new Set([
  'A',
  'AN',
  'AND',
  'FOR',
  'IN',
  'OF',
  'OFFICE',
  'ON',
  'THE',
  'TO',
])

function toDepartmentCode(value) {
  const source = String(value || '').trim()
  if (!source) return '-'

  if (!/\s/.test(source) && source === source.toUpperCase()) {
    return source
  }

  const words = source
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean)

  if (!words.length) return source

  const acronymWords = words.filter(
    (word) => !DEPARTMENT_STOP_WORDS.has(word) && !/^\d+$/.test(word),
  )
  const selectedWords = acronymWords.length ? acronymWords : words
  const acronym = selectedWords.map((word) => word[0]).join('')

  return acronym || source
}

function normalizeDepartmentKey(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function findDepartmentByTerm(term) {
  const queryKey = normalizeDepartmentKey(term)
  if (!queryKey) return null

  for (const department of allDepartments.value) {
    const name = String(department?.name || '')
    if (!name) continue

    const nameKey = normalizeDepartmentKey(name)
    const codeKey = normalizeDepartmentKey(toDepartmentCode(name))

    if (queryKey === nameKey || queryKey === codeKey) {
      return department
    }
  }

  return null
}

function resolveEmployeeSearch(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return {
      searchText: '',
      departmentId: null,
    }
  }

  const terms = raw.split(/\s+/).filter(Boolean)
  let departmentId = null
  const remainingTerms = []

  for (const term of terms) {
    if (!departmentId) {
      const matchedDepartment = findDepartmentByTerm(term)
      if (matchedDepartment?.id) {
        departmentId = matchedDepartment.id
        continue
      }
    }

    remainingTerms.push(term)
  }

  if (!departmentId) {
    const fullQueryDepartment = findDepartmentByTerm(raw)
    if (fullQueryDepartment?.id) {
      return {
        searchText: '',
        departmentId: fullQueryDepartment.id,
      }
    }
  }

  return {
    searchText: remainingTerms.join(' ').trim(),
    departmentId,
  }
}

function isDepartmentHeadRecord(row) {
  return row?.is_department_head_record === true
}

function hasManualLeaveCreditsUsage(row) {
  if (!row || typeof row !== 'object') return false

  return row.has_manual_leave_credits === true || row.hasManualLeaveCredits === true
}

function canShowAddLeaveCreditsAction(row) {
  return !hasManualLeaveCreditsUsage(row)
}

function canShowEditLeaveCreditsAction(row) {
  return hasManualLeaveCreditsUsage(row)
}

function getEmployeeFullName(employee) {
  if (!employee) return 'N/A'

  const directName = String(employee.full_name ?? employee.fullName ?? employee.name ?? '').trim()
  if (directName) return directName

  const surname = String(employee.surname ?? employee.last_name ?? employee.lastName ?? '').trim()
  const firstname = String(
    employee.firstname ?? employee.first_name ?? employee.firstName ?? '',
  ).trim()
  const middlename = String(
    employee.middlename ?? employee.middle_name ?? employee.middleName ?? '',
  ).trim()

  const fullName = [firstname, middlename, surname].filter(Boolean).join(' ').trim()
  if (!fullName) return 'N/A'
  if (!surname || !firstname) return fullName

  return `${surname}, ${[firstname, middlename].filter(Boolean).join(' ')}`
}

function getMiddleInitial(value) {
  const normalized = String(value || '').trim()
  if (!normalized) return ''

  const firstToken = normalized
    .split(/[\s.-]+/)
    .map((part) => part.trim())
    .find(Boolean)

  const firstCharacter = String(firstToken || normalized)
    .replace(/[^A-Za-z0-9]/g, '')
    .charAt(0)

  return firstCharacter ? `${firstCharacter.toUpperCase()}.` : ''
}

function getEmployeeColumnDisplayName(employee) {
  if (!employee) return 'N/A'

  const surname = String(employee.surname ?? employee.last_name ?? employee.lastName ?? '').trim()
  const firstname = String(
    employee.firstname ?? employee.first_name ?? employee.firstName ?? '',
  ).trim()
  const middlename = String(
    employee.middlename ?? employee.middle_name ?? employee.middleName ?? '',
  ).trim()
  const middleInitial = getMiddleInitial(middlename)

  if (surname && firstname) {
    return [`${surname}, ${firstname}`, middleInitial].filter(Boolean).join(' ')
  }

  return getEmployeeFullName(employee)
}

function getLedgerEmployeeOffice(employee) {
  const office = pickFirstDefined(employee, [
    'office',
    'department_name',
    'department.name',
    'division_office',
    'divisionOffice',
  ])

  return String(office || 'N/A').trim() || 'N/A'
}

function formatLedgerHeadingName(value) {
  return String(value || 'N/A')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function formatLedgerHeadingStatus(employee) {
  const status = pickFirstDefined(employee, [
    'status',
    'employment_status',
    'employmentStatus',
    'employee_status',
    'employeeStatus',
  ])
  const label = displayStatusLabel(status)
  return label && label !== '-' ? label.toUpperCase() : 'N/A'
}

function formatLedgerHeadingOffice(employee) {
  const office = getLedgerEmployeeOffice(employee)
  const officeCode = resolveOfficeAcronymLabel(employee)
  return (officeCode && officeCode !== '-' ? officeCode : office) || 'N/A'
}

function resolveAssignedOfficeAcronymLabel(row) {
  if (!row || !row.assigned_department_id) return '-'
  const candidates = [
    row.assignedDepartmentAcronym,
    row.assigned_department_acronym,
    row.officeAcronym,
    row.office_acronym,
    row.assigned_department_name,
    row.office,
    row.employee?.assignedDepartmentAcronym,
    row.employee?.assigned_department_acronym,
    row.employee?.officeAcronym,
    row.employee?.office_acronym,
    row.employee?.assigned_department_name,
    row.employee?.office,
  ]
  for (const c of candidates) {
    const text = String(c || '').trim()
    if (text) return text
  }
  return '-'
}

function resolveLedgerPreviewIdentityFontSize(value) {
  const length = String(value || '').trim().length

  if (length > 72) return '0.52rem'
  if (length > 60) return '0.55rem'
  if (length > 54) return '0.58rem'
  if (length > 42) return '0.62rem'
  if (length > 30) return '0.66rem'
  return '0.72rem'
}

function resolveLedgerPdfIdentityFontSize(value) {
  const length = String(value || '').trim().length

  if (length > 72) return 6.3
  if (length > 60) return 6.7
  if (length > 54) return 7
  if (length > 42) return 7.5
  if (length > 30) return 8
  return 8.6
}

function buildLedgerIdentityPreviewStyle(value) {
  return {
    fontSize: resolveLedgerPreviewIdentityFontSize(value),
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'clip',
  }
}

async function fetchDepartments(force = false) {
  try {
    await employeeStore.fetchDepartments(force)
  } catch (err) {
    console.error('Failed to load departments:', err)
    const msg = resolveApiErrorMessage(err, 'Unable to load departments right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  }
}

async function fetchData(page = 1, force = false) {
  try {
    const { searchText, departmentId } = resolveEmployeeSearch(search.value)

    await employeeStore.fetchEmployees(
      {
        department_id: departmentId || undefined,
        search: searchText || undefined,
        activity: activityFilter.value || 'ALL',
        biometric_status:
          biometricStatusFilter.value !== 'ALL' ? biometricStatusFilter.value : undefined,
        per_page: employeePagination.value.rowsPerPage,
        page,
      },
      force,
    )
  } catch (err) {
    console.error('Failed to load data:', err)
    const msg = resolveApiErrorMessage(err, 'Unable to load employee records right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  }
}





function onEmployeeRequest(props) {
  employeePagination.value.rowsPerPage = props.pagination.rowsPerPage
  fetchData(props.pagination.page)
}

watch(search, () => {
  fetchData(1)
})

watch(activityFilter, () => {
  fetchData(1)
})

watch(biometricStatusFilter, () => {
  fetchData(1)
})

function getBiometricStatusColor(status) {
  if (status === 'REGISTERED' || status === 'FINGERPRINT_ENROLLED') return 'green-1'
  if (status === 'PENDING_ENROLLMENT' || status === 'PENDING') return 'amber-1'
  return 'grey-2'
}

function getBiometricStatusTextColor(status) {
  if (status === 'REGISTERED' || status === 'FINGERPRINT_ENROLLED') return 'green-9'
  if (status === 'PENDING_ENROLLMENT' || status === 'PENDING') return 'amber-9'
  return 'grey-8'
}

function formatBiometricStatus(status) {
  if (!status || status === 'NOT_REGISTERED') return 'NOT REGISTERED'
  if (status === 'PENDING_ENROLLMENT' || status === 'PENDING') return 'PENDING'
  if (status === 'FINGERPRINT_ENROLLED') return 'REGISTERED'
  return status
}


watch(showViewDialog, (isOpen) => {
  if (isOpen) return
  employeeDetailsLeaveBadgesLookupSequence += 1
  employeeDetailsLeaveBadgesLoading.value = false
  employeeDetailsLeaveBadges.value = []
  showCalendarPreviewDialog.value = false
  calendarPreviewAnchorEntry.value = null
  clearCalendarPreviewWarning()
})

watch(showCalendarPreviewDialog, (isOpen) => {
  if (!isOpen) {
    clearCalendarPreviewWarning()
    return
  }

  syncCalendarPreviewDecorations()
})

watch(calendarPreviewDateStates, () => {
  if (!showCalendarPreviewDialog.value) return
  syncCalendarPreviewDecorations()
})

onMounted(() => {
  void fetchDepartments()
  void fetchData()
})

onBeforeUnmount(() => {
  clearCalendarPreviewWarning()
})

function viewEmployee(emp) {
  const controlNo = String(emp?.control_no ?? '').trim()
  selectedEmployee.value = emp
  employeeDetailsLeaveBadges.value = buildLedgerBalanceBadgesFromLeaveTypes([])
  employeeDetailsLeaveBadgesLoading.value = controlNo !== ''
  showViewDialog.value = true
  fetchEmployeeLeaveHistory(controlNo)
  void fetchEmployeeDetailsLeaveBadges(controlNo)
}

function onEmployeeRowClick(_evt, row) {
  viewEmployee(row)
}



function roundCurrencyValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return null
  return Math.round((numericValue + Number.EPSILON) * 100) / 100
}

function truncateCurrencyValue(value, fractionDigits = 2) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return null

  const factor = 10 ** fractionDigits
  if (!Number.isFinite(factor) || factor <= 0) return null

  return numericValue < 0
    ? Math.ceil(numericValue * factor) / factor
    : Math.floor(numericValue * factor) / factor
}

function resolveEmployeeTerminalLeaveAmount(employee) {
  const apiEstimatedAmount = parseLedgerSignedQuantityValue(
    employee?.terminal_leave_estimated_amount,
  )
  if (apiEstimatedAmount !== null) {
    return apiEstimatedAmount
  }

  const vacationLeaveBalance = parseLedgerSignedQuantityValue(employee?.vl_balance)
  const sickLeaveBalance = parseLedgerSignedQuantityValue(employee?.sl_balance)
  const monthlyRate = parseLedgerSignedQuantityValue(employee?.rate_mon)
  if (vacationLeaveBalance === null || sickLeaveBalance === null || monthlyRate === null) {
    return null
  }

  return (sickLeaveBalance + vacationLeaveBalance) * monthlyRate * TERMINAL_LEAVE_CONSTANT_FACTOR
}

function formatEmployeeTerminalLeaveAmount(employee) {
  const terminalLeaveAmount = resolveEmployeeTerminalLeaveAmount(employee)
  if (terminalLeaveAmount === null) {
    return '-'
  }

  const truncatedTerminalLeaveAmount = truncateCurrencyValue(terminalLeaveAmount)

  return truncatedTerminalLeaveAmount === null
    ? '-'
    : terminalLeaveEstimateFormatter.format(truncatedTerminalLeaveAmount)
}

function resolveEmployeeMonthlyRate(employee) {
  const monthlyRate = parseLedgerSignedQuantityValue(employee?.rate_mon)

  return monthlyRate === null ? null : roundCurrencyValue(monthlyRate)
}

function formatEmployeeMonthlyRate(employee) {
  const monthlyRate = resolveEmployeeMonthlyRate(employee)
  if (monthlyRate === null) {
    return '-'
  }

  return currencyFormatter.format(monthlyRate)
}

function formatLedgerActionDate(value) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatLedgerFirstDayOfService(employee) {
  const serviceDate = pickFirstDefined(employee, [
    'first_day_of_service',
    'firstDayOfService',
    'date_hired',
    'dateHired',
    'hire_date',
    'hireDate',
    'from_date',
    'fromDate',
  ])

  const dateParts = parseLedgerDateParts(serviceDate)
  if (!dateParts) return 'N/A'

  return dateParts.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatLedgerNumber(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value ?? '').trim()
  return numericValue.toFixed(3)
}

function normalizeLedgerTextValue(value) {
  if (!hasMeaningfulValue(value)) return ''
  if (typeof value === 'object') {
    return normalizeLedgerTextValue(
      pickFirstDefined(value, ['label', 'name', 'text', 'value', 'description']),
    )
  }
  return String(value).trim()
}

function normalizeLedgerQuantityValue(value) {
  if (!hasMeaningfulValue(value)) return ''

  if (typeof value === 'number') {
    return formatLedgerNumber(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return ''
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      return formatLedgerNumber(trimmed)
    }
    return trimmed
  }

  if (typeof value === 'object') {
    return normalizeLedgerQuantityValue(
      pickFirstDefined(value, ['value', 'amount', 'balance', 'total', 'days']),
    )
  }

  return String(value).trim()
}

function buildLedgerBalanceBadgesFromLeaveTypes(leaveTypes) {
  const coreBalancesByCode = {
    VL: 0,
    SL: 0,
    WL: 0,
    MCO6: 0,
  }
  const customBadges = []
  const customBadgeCodes = new Set()

  if (Array.isArray(leaveTypes)) {
    leaveTypes.forEach((leaveType, index) => {
      if (!leaveType || leaveType.is_credit_based === false) return

      const leaveTypeName = normalizeLedgerTextValue(
        pickFirstDefined(leaveType, [
          'name',
          'display_name',
          'displayName',
          'leave_type_name',
          'leaveTypeName',
          'label',
        ]),
      )
      if (!leaveTypeName) return

      const rawBalance = pickFirstDefined(leaveType, [
        'balance',
        'current_balance',
        'currentBalance',
        'leave_balance',
        'leaveBalance',
        'remaining_balance',
        'remainingBalance',
        'editable_balance',
        'editableBalance',
        'total',
        'amount',
      ])
      const parsedBalance = parseLedgerSignedQuantityValue(rawBalance)
      const roundedBalance = roundLedgerNumericValue(parsedBalance ?? 0)
      const normalizedCode = normalizeLedgerLeaveCode(leaveTypeName)
      const lowerName = String(leaveTypeName || '').toLowerCase()

      if (
        normalizedCode === 'CTO' ||
        normalizedCode === 'COC' ||
        lowerName.includes('compensatory') ||
        lowerName.includes('cto') ||
        lowerName.includes('coc')
      ) {
        return
      }

      if (
        normalizedCode === 'VL' ||
        normalizedCode === 'SL' ||
        normalizedCode === 'WL' ||
        normalizedCode === 'MCO6'
      ) {
        coreBalancesByCode[normalizedCode] = roundedBalance
        return
      }

      const leaveTypeId = Number(leaveType?.id ?? leaveType?.leave_type_id)
      const customCode =
        Number.isInteger(leaveTypeId) && leaveTypeId > 0
          ? `LT-${leaveTypeId}`
          : `LT-NAME-${normalizeLeaveTypeName(leaveTypeName) || index}`
      const customLabel = resolveLedgerCustomLeaveBadgeLabel(leaveTypeName)
      if (customBadgeCodes.has(customCode)) return

      customBadgeCodes.add(customCode)
      customBadges.push(
        buildLedgerBalanceBadgeItem(
          customCode,
          customLabel,
          roundedBalance,
          LEDGER_BALANCE_BADGE_UNIFORM_PALETTE,
        ),
      )
    })
  }

  const coreBadges = LEDGER_BALANCE_BADGE_ORDER.map((code) => {
    const meta = LEDGER_BALANCE_BADGE_META[code]
    return buildLedgerBalanceBadgeItem(
      code,
      meta.label,
      coreBalancesByCode[code],
      LEDGER_BALANCE_BADGE_UNIFORM_PALETTE,
    )
  })

  return [...coreBadges, ...customBadges]
}

function normalizeLeaveTypeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function resolveLedgerCustomLeaveBadgeLabel(leaveTypeName) {
  const normalizedLabel = normalizeLeaveTypeName(leaveTypeName)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (normalizedLabel === 'mandatory forced leave') return 'FL'
  if (normalizedLabel === 'solo parent leave') return 'SPL'
  if (normalizedLabel === 'special emergency calamity leave') return 'CL'

  return leaveTypeName
}

function buildLedgerBalanceBadgeItem(code, label, balanceValue, palette = {}) {
  const numericBalance = Number(balanceValue)
  const safeBalance = Number.isFinite(numericBalance) ? numericBalance : 0
  const accent = String(palette?.accent || LEDGER_BALANCE_BADGE_META.DEFAULT.accent)
  const background = String(palette?.background || LEDGER_BALANCE_BADGE_META.DEFAULT.background)

  return {
    code,
    label,
    value: formatLedgerNumber(safeBalance),
    style: {
      '--badge-accent': accent,
      '--badge-bg': background,
    },
  }
}

function normalizeLedgerAccrualQuantityValue(value) {
  const normalized = normalizeLedgerQuantityValue(value)
  if (!normalized) return normalized

  const text = String(normalized).trim()
  if (/^[+-]\s*\d/.test(text)) {
    return text
  }

  const numericValue = Number(text)
  if (!Number.isFinite(numericValue)) {
    return text
  }

  if (numericValue > 0) {
    return `+${formatLedgerNumber(numericValue)}`
  }

  return formatLedgerNumber(numericValue)
}

function normalizeLedgerWithPayDeductionValue(value) {
  const normalized = normalizeLedgerQuantityValue(value)
  if (!normalized) return normalized

  const numericValue = Number(normalized)
  if (!Number.isFinite(numericValue)) return normalized

  if (Math.abs(numericValue) < 1e-9) {
    return formatLedgerNumber(0)
  }

  return `-${formatLedgerNumber(Math.abs(numericValue))}`
}

function parseLedgerSignedQuantityValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const text = String(value ?? '').trim()
  if (!text) return null

  const normalized = text.replace(/,/g, '')
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) return null

  const numericValue = Number(normalized)
  return Number.isFinite(numericValue) ? numericValue : null
}

function roundLedgerNumericValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.round((numericValue + Number.EPSILON) * 1000) / 1000
}

function buildLedgerRowsForPaper(rows, preset, options = {}) {
  const normalizedRows = Array.isArray(rows)
    ? rows.map((entry, index) => ({
        ...LEDGER_BLANK_ROW_TEMPLATE,
        ...entry,
        key: entry?.key || entry?.id || `ledger-row-${index}`,
        isBlank: false,
      }))
    : []
  const shouldPadToMinimumRows = options.padToMinimumRows !== false
  const minimumRowsSource =
    options.minimumRowsOverride ?? options.minimumRows ?? preset?.minimumRows ?? 0
  const minimumRows = shouldPadToMinimumRows ? Number(minimumRowsSource) : 0
  const blankRowsNeeded = Math.max(0, minimumRows - normalizedRows.length)

  for (let index = 0; index < blankRowsNeeded; index += 1) {
    normalizedRows.push({
      ...LEDGER_BLANK_ROW_TEMPLATE,
      key: `ledger-blank-${index}`,
      isBlank: true,
    })
  }

  return normalizedRows
}

function createLedgerForwardedBalanceState() {
  return {
    vacation: null,
    sick: null,
    otherDefault: null,
    otherByCode: {},
  }
}

function updateLedgerForwardedBalanceState(state, rows) {
  if (!state || !Array.isArray(rows)) return state

  const allowedOtherCodes = ['MCO6', 'WL', 'SPL', 'CL']

  rows.forEach((row) => {
    if (!row || row.isBlank || row.isBalanceForwarded) return

    const vacationBalance = parseLedgerSignedQuantityValue(row.vacationBalance)
    if (vacationBalance !== null) {
      state.vacation = vacationBalance
    }

    const sickBalance = parseLedgerSignedQuantityValue(row.sickBalance)
    if (sickBalance !== null) {
      state.sick = sickBalance
    }

    const otherBalance = parseLedgerSignedQuantityValue(row.otherBalance)
    if (otherBalance !== null) {
      const codeCandidate =
        normalizeLedgerLeaveCode(row.leaveTypeCode) ||
        normalizeLedgerLeaveCode(row.balanceKey) ||
        normalizeLedgerLeaveCode(row.particulars)
      if (allowedOtherCodes.includes(codeCandidate)) {
        state.otherByCode[codeCandidate] = {
          value: otherBalance,
          code: codeCandidate,
        }
      }
    }
  })

  return state
}

function isLedgerFiniteNumberValue(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

function buildLedgerBalanceForwardedRows(state, pageIndex) {
  const rows = []
  let rowIndex = 0
  
  const today = new Date()
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthNamesLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  
  const period = `${monthNamesShort[today.getMonth()]} ${today.getFullYear()}`
  const actionTaken = `${monthNamesLong[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`

  if (isLedgerFiniteNumberValue(state?.vacation)) {
    rows.push({
      ...LEDGER_BLANK_ROW_TEMPLATE,
      key: `ledger-balance-forwarded-${pageIndex}-${rowIndex++}`,
      id: `ledger-balance-forwarded-${pageIndex}-${rowIndex}`,
      isBlank: false,
      isBalanceForwarded: true,
      period,
      particulars: 'Balance Forwarded: VL',
      actionTaken,
      vacationBalance: normalizeLedgerQuantityValue(state.vacation),
    })
  }

  if (isLedgerFiniteNumberValue(state?.sick)) {
    rows.push({
      ...LEDGER_BLANK_ROW_TEMPLATE,
      key: `ledger-balance-forwarded-${pageIndex}-${rowIndex++}`,
      id: `ledger-balance-forwarded-${pageIndex}-${rowIndex}`,
      isBlank: false,
      isBalanceForwarded: true,
      period,
      particulars: 'Balance Forwarded: SL',
      actionTaken,
      sickBalance: normalizeLedgerQuantityValue(state.sick),
    })
  }

  const allowedOtherCodes = ['MCO6', 'WL', 'SPL', 'CL']
  const otherBalances = Object.entries(state?.otherByCode || {})
    .filter(([, data]) => isLedgerFiniteNumberValue(data?.value !== undefined ? data.value : data))
    .map(([, data]) => {
      if (typeof data === 'object' && data !== null) {
        return { code: data.code, value: data.value }
      }
      return { code: '', value: data }
    })
    .filter((item) => allowedOtherCodes.includes(normalizeLedgerLeaveCode(item.code)))

  if (state?.otherDefault) {
    const def = state.otherDefault
    const defVal = typeof def === 'object' && def !== null ? def.value : def
    const defCode = typeof def === 'object' ? def.code : ''
    if (isLedgerFiniteNumberValue(defVal) && allowedOtherCodes.includes(normalizeLedgerLeaveCode(defCode))) {
      otherBalances.push({ code: defCode, value: defVal })
    }
  }

  otherBalances.forEach((other) => {
    let codeLabel = other.code ? `: ${other.code}` : ''
    rows.push({
      ...LEDGER_BLANK_ROW_TEMPLATE,
      key: `ledger-balance-forwarded-${pageIndex}-${rowIndex++}`,
      id: `ledger-balance-forwarded-${pageIndex}-${rowIndex}`,
      isBlank: false,
      isBalanceForwarded: true,
      period,
      particulars: `Balance Forwarded${codeLabel}`,
      actionTaken,
      otherBalance: normalizeLedgerQuantityValue(other.value),
      leaveTypeCode: other.code,
    })
  })

  if (rows.length === 0) {
    rows.push({
      ...LEDGER_BLANK_ROW_TEMPLATE,
      key: `ledger-balance-forwarded-${pageIndex}-0`,
      id: `ledger-balance-forwarded-${pageIndex}-0`,
      isBlank: false,
      isBalanceForwarded: true,
      period,
      particulars: 'Balance Forwarded',
      actionTaken,
    })
  }

  return rows
}

function buildLedgerPagesForPaper(rows, preset, options = {}) {
  const rowsPerPageSource =
    options.minimumRowsOverride ?? options.minimumRows ?? preset?.minimumRows ?? 0
  const rowsPerPage = Math.max(1, Number(rowsPerPageSource) || 1)
  const sourceRows = Array.isArray(rows) ? rows : []

  if (!sourceRows.length) {
    return [buildLedgerRowsForPaper([], preset, { ...options, minimumRowsOverride: rowsPerPage })]
  }

  const pages = []
  const forwardedBalanceState = createLedgerForwardedBalanceState()
  let sourceIndex = 0
  let pageIndex = 0

  while (sourceIndex < sourceRows.length) {
    const shouldAddForwardedRow = pageIndex > 0 && rowsPerPage > 1
    const forwardedRows = shouldAddForwardedRow ? buildLedgerBalanceForwardedRows(forwardedBalanceState, pageIndex) : []
    const sourceRowsPerPage = Math.max(1, rowsPerPage - forwardedRows.length)
    const pageSourceRows = sourceRows.slice(sourceIndex, sourceIndex + sourceRowsPerPage)
    const pageRows = [...forwardedRows, ...pageSourceRows]

    pages.push(
      buildLedgerRowsForPaper(pageRows, preset, {
        ...options,
        minimumRowsOverride: rowsPerPage,
      }),
    )

    updateLedgerForwardedBalanceState(forwardedBalanceState, pageSourceRows)
    sourceIndex += sourceRowsPerPage
    pageIndex += 1
  }

  return pages
}

function getLedgerPdfPageWidth(preset) {
  if (preset?.pageSize === 'A4') return 595.28

  const customWidth = Number(preset?.pageSize?.width)
  return Number.isFinite(customWidth) && customWidth > 0 ? customWidth : 595.28
}

function buildLedgerPdfTableWidths(preset) {
  const pageWidth = getLedgerPdfPageWidth(preset)
  const leftMargin = Number(preset?.pageMargins?.[0] ?? 10)
  const rightMargin = Number(preset?.pageMargins?.[2] ?? 10)
  const horizontalInset = Number(preset?.pdfHorizontalInset ?? 0)
  const gridLineWidth = Number(preset?.pdfGridLineWidth ?? 0.75)
  const columnCount = LEDGER_COLUMN_WIDTH_UNITS.length
  const totalGridWidth = Math.max(0, (columnCount + 1) * gridLineWidth)
  const availableWidth = Math.max(
    460,
    pageWidth - leftMargin - rightMargin - horizontalInset * 2 - totalGridWidth,
  )

  const widths = LEDGER_COLUMN_WIDTH_UNITS.map((unit) =>
    Number(((availableWidth * unit) / LEDGER_COLUMN_WIDTH_TOTAL).toFixed(2)),
  )

  const actionColumnShrink = Number(preset?.pdfActionColumnShrink ?? 0)
  if (actionColumnShrink > 0) {
    const actionColumnIndex = widths.length - 1
    widths[actionColumnIndex] = Number(
      Math.max(30, widths[actionColumnIndex] - actionColumnShrink).toFixed(2),
    )
  }

  return widths
}

function normalizeLedgerLeaveCode(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (raw.toLowerCase().includes('balance forwarded')) return ''

  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (
    compact === 'vl' ||
    compact === 'vacationleave' ||
    compact === 'vacation' ||
    compact.startsWith('vl')
  ) {
    return 'VL'
  }

  if (
    compact === 'sl' ||
    compact === 'sickleave' ||
    compact === 'sick' ||
    compact.startsWith('sl')
  ) {
    return 'SL'
  }

  if (
    compact === 'wl' ||
    compact === 'wellnessleave' ||
    compact === 'wellness' ||
    compact.startsWith('wl')
  ) {
    return 'WL'
  }

  if (compact === 'spl' || compact === 'soloparentleave' || compact === 'soloparent') {
    return 'SPL'
  }

  if (
    compact === 'mco6' ||
    compact === 'mc06' ||
    compact === 'mo6' ||
    compact === 'specialprivilege' ||
    compact === 'specialprivilegeleave' ||
    compact.startsWith('mco6') ||
    compact.startsWith('mc06')
  ) {
    return 'MCO6'
  }

  const codeToken = String(raw).split(/\s+/)[0] ?? ''
  const sanitizedCodeToken = codeToken.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (
    sanitizedCodeToken &&
    sanitizedCodeToken !== 'BALANCE' &&
    sanitizedCodeToken !== 'FORWARDED' &&
    sanitizedCodeToken.length <= 10
  ) {
    return sanitizedCodeToken
  }

  return ''
}

function isLedgerOtherLeaveCode(leaveCode) {
  return leaveCode !== '' && leaveCode !== 'VL' && leaveCode !== 'SL'
}

function resolveLedgerCellLeaveCode(entry, section) {
  const normalizedSection = String(section ?? '')
    .trim()
    .toUpperCase()

  if (normalizedSection === 'VL') return 'VL'
  if (normalizedSection === 'SL') return 'SL'

  const rowLeaveCode = normalizeLedgerLeaveCode(
    pickFirstDefined(entry, [
      'leaveTypeCode',
      'leave_type_code',
      'leaveType',
      'leave_type',
      'leaveTypeName',
      'leave_type_name',
      'particulars',
      'particular',
      'description',
      'entry_type',
      'entryType',
      'transaction_type',
      'transactionType',
    ]),
  )

  if (normalizedSection === 'OTHER') {
    return isLedgerOtherLeaveCode(rowLeaveCode) ? rowLeaveCode : ''
  }

  return rowLeaveCode
}

function resolveLedgerValueColorByLeaveCode(leaveCode) {
  const normalizedCode = String(leaveCode || '').toUpperCase()
  return LEDGER_LEAVE_TYPE_COLORS[normalizedCode] || '#000000'
}

function hasLedgerDisplayValue(value) {
  return String(value ?? '').trim() !== ''
}

function ledgerValueClass(value, entry, section) {
  const hasValue = hasLedgerDisplayValue(value)
  const leaveCode = resolveLedgerCellLeaveCode(entry, section)

  return {
    'ledger-table__value': true,
    'ledger-table__value--emphasis': hasValue,
    'ledger-table__value--wl': hasValue && leaveCode === 'WL',
    'ledger-table__value--mco6': hasValue && leaveCode === 'MCO6',
  }
}

function sanitizeLedgerPdfFilenamePart(value) {
  return String(value ?? '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getLedgerPdfFilename(employee) {
  const safeName = sanitizeLedgerPdfFilenamePart(
    getEmployeeFullName(employee).replace(/,\s*/g, ' '),
  )
  return `${safeName || 'employee'} leave credits ledger.pdf`
}

function buildLedgerPdfIdentityCell(text, options = {}) {
  return {
    text: String(text || ' ').trim() || ' ',
    fontSize: options.fontSize ?? 8.6,
    bold: options.bold ?? true,
    color: '#000000',
    alignment: options.alignment || 'center',
    margin: options.margin || [2, 1, 2, 1],
    noWrap: options.noWrap ?? true,
  }
}

function buildLedgerPdfIdentityServiceCell(value, options = {}) {
  return {
    text: String(value || 'N/A').trim() || 'N/A',
    fontSize: options.fontSize ?? 8.6,
    bold: true,
    color: '#000000',
    alignment: options.alignment || 'center',
    noWrap: options.noWrap ?? true,
    margin: options.margin || [2, 1, 2, 1],
  }
}

function buildLedgerPdfTopLabelCell(text) {
  return {
    text: String(text || '').toUpperCase(),
    fontSize: 8.6,
    bold: true,
    color: '#000000',
    alignment: 'center',
    margin: [0, 1.8, 0, 1.8],
  }
}

function buildLedgerPdfBodyCellMargin(text, options = {}) {
  if (Array.isArray(options.margin)) return options.margin

  const fontSize = Number(options.fontSize ?? 6.85)
  const lineHeight = Number(options.lineHeight ?? 0.95)
  const rowHeight = Number(options.rowHeight ?? 14.05)
  const lineCount = Math.max(1, String(text || ' ').split('\n').length)
  // pdfMake uses the font's internal ascender/descender which adds about ~1.2x height
  const estimatedTextHeight = fontSize * lineHeight * 1.2 * lineCount
  const verticalMargin = Math.max(0, (rowHeight - estimatedTextHeight) / 2)

  return [0.2, verticalMargin, 0.2, verticalMargin]
}

function buildLedgerPdfBodyCell(value, options = {}) {
  const text = String(value ?? '').trim()
  const fontSize = options.fontSize ?? 6.85
  const lineHeight = options.lineHeight ?? 0.95

  return {
    text: text || ' ',
    alignment: options.alignment || 'center',
    bold: options.bold ?? false,
    color: options.color || '#000000',
    fillColor: options.fillColor,
    fontSize,
    lineHeight,
    margin: buildLedgerPdfBodyCellMargin(text, {
      ...options,
      fontSize,
      lineHeight,
    }),
    noWrap: options.noWrap ?? false,
  }
}

function buildLedgerPdfValueCell(value, fillColor, options = {}, entry = null, section = '') {
  const hasValue = hasLedgerDisplayValue(value)
  const leaveCode = resolveLedgerCellLeaveCode(entry, section)
  const color = hasValue ? resolveLedgerValueColorByLeaveCode(leaveCode) : '#000000'

  return buildLedgerPdfBodyCell(value, {
    color,
    bold: hasValue,
    fillColor,
    noWrap: hasValue,
    ...options,
  })
}

function buildLedgerPdfTableBody(rows, preset = {}) {
  const bodyRowHeight = Number(preset?.pdfBodyRowHeight ?? 14.05)
  const tableBody = [
    [
      {
        text: 'INCLUSIVE\nDATES',
        rowSpan: 2,
        style: 'ledgerPdfRowSpanHead',
      },
      {
        text: 'PARTICULARS',
        rowSpan: 2,
        style: 'ledgerPdfRowSpanHead',
      },
      {
        text: 'VACATION LEAVE',
        colSpan: 4,
        style: 'ledgerPdfGroupHead',
      },
      {},
      {},
      {},
      {
        text: 'SICK LEAVE',
        colSpan: 4,
        style: 'ledgerPdfGroupHead',
      },
      {},
      {},
      {},
      {
        text: 'OTHER TYPE OF LEAVE',
        colSpan: 4,
        style: 'ledgerPdfGroupHead',
      },
      {},
      {},
      {},
      {
        text: 'DATE &\nACTION\nTAKEN ON\nAPPLICATION\nFOR LEAVE',
        rowSpan: 2,
        style: 'ledgerPdfActionHead',
      },
    ],
    [
      {},
      {},
      { text: 'EARNED', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/P', style: 'ledgerPdfSubHead' },
      { text: 'BAL.', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/oP', style: 'ledgerPdfSubHead' },
      { text: 'EARNED', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.', style: 'ledgerPdfSubHead' },
      { text: 'BAL.', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/oP', style: 'ledgerPdfSubHead' },
      { text: 'EARNED', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.', style: 'ledgerPdfSubHead' },
      { text: 'BAL.', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/oP', style: 'ledgerPdfSubHead' },
      {},
    ],
  ]

  rows.forEach((entry) => {
    tableBody.push([
      buildLedgerPdfBodyCell(entry.period, {
        bold: Boolean(String(entry.period || '').trim()),
        fontSize: 5.8,
        lineHeight: 0.92,
        noWrap: true,
        rowHeight: bodyRowHeight,
      }),
      buildLedgerPdfBodyCell(entry.particulars, {
        bold: Boolean(String(entry.particulars || '').trim()),
        fontSize: 5.6,
        lineHeight: 1,
        noWrap: true,
        rowHeight: bodyRowHeight,
      }),
      buildLedgerPdfValueCell(
        entry.vacationEarned,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
      ),
      buildLedgerPdfValueCell(
        entry.vacationAbsUndWp,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
      ),
      buildLedgerPdfValueCell(
        entry.vacationBalance,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
      ),
      buildLedgerPdfValueCell(
        entry.vacationAbsUndWop,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
      ),
      buildLedgerPdfValueCell(
        entry.sickEarned,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
      ),
      buildLedgerPdfValueCell(
        entry.sickAbsUnd,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
      ),
      buildLedgerPdfValueCell(
        entry.sickBalance,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
      ),
      buildLedgerPdfValueCell(
        entry.sickAbsUndWop,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
      ),
      buildLedgerPdfValueCell(
        entry.otherEarned,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
      ),
      buildLedgerPdfValueCell(
        entry.otherAbsUndWp,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
      ),
      buildLedgerPdfValueCell(
        entry.otherBalance,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
      ),
      buildLedgerPdfValueCell(
        entry.otherAbsUndWop,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
      ),
      buildLedgerPdfBodyCell(entry.actionTaken, {
        bold: Boolean(String(entry.actionTaken || '').trim()),
        fontSize: 6.25,
        lineHeight: 0.92,
        noWrap: true,
        rowHeight: bodyRowHeight,
      }),
    ])
  })

  return tableBody
}

function buildLedgerPdfPageHeader(
  headingName,
  headingStatus,
  headingOffice,
  firstDayOfService,
  identityNameFontSize,
  identityStatusFontSize,
  identityOfficeFontSize,
  identityServiceFontSize,
  horizontalInset,
  gridLineWidth,
  headerUnderlineRightTrim,
) {
  return [
    {
      table: {
        widths: ['34%', '13%', '29%', '24%'],
        body: [
          [
            buildLedgerPdfIdentityCell(headingName, {
              fontSize: identityNameFontSize,
              alignment: 'center',
            }),
            buildLedgerPdfIdentityCell(headingStatus, {
              fontSize: identityStatusFontSize,
              alignment: 'center',
            }),
            buildLedgerPdfIdentityCell(headingOffice, {
              fontSize: identityOfficeFontSize,
              alignment: 'center',
            }),
            buildLedgerPdfIdentityServiceCell(firstDayOfService, {
              fontSize: identityServiceFontSize,
              alignment: 'center',
            }),
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [horizontalInset, 0, horizontalInset + headerUnderlineRightTrim, 2],
    },
    {
      table: {
        widths: ['34%', '13%', '29%', '24%'],
        body: [
          [
            buildLedgerPdfTopLabelCell('Name'),
            buildLedgerPdfTopLabelCell('Status'),
            buildLedgerPdfTopLabelCell('Division Office'),
            buildLedgerPdfTopLabelCell('1st Day of Service'),
          ],
        ],
      },
      layout: {
        hLineWidth: () => gridLineWidth,
        vLineWidth: () => 0,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [horizontalInset, 0, horizontalInset + headerUnderlineRightTrim, 0],
    },
  ]
}

function buildLeaveCreditsLedgerDocDefinition(employee, rows, paperSize = 'A4') {
  const preset = LEDGER_PAPER_PRESETS[paperSize] || LEDGER_PAPER_PRESETS.A4
  const displayName = getEmployeeColumnDisplayName(employee)
  const headingName = formatLedgerHeadingName(displayName)
  const headingStatus = formatLedgerHeadingStatus(employee)
  const headingOffice = formatLedgerHeadingOffice(employee)
  const firstDayOfService = formatLedgerFirstDayOfService(employee)
  const identityNameFontSize = resolveLedgerPdfIdentityFontSize(headingName)
  const identityStatusFontSize = resolveLedgerPdfIdentityFontSize(headingStatus)
  const identityOfficeFontSize = resolveLedgerPdfIdentityFontSize(headingOffice)
  const identityServiceFontSize = resolveLedgerPdfIdentityFontSize(firstDayOfService)
  const horizontalInset = Number(preset?.pdfHorizontalInset ?? 0)
  const gridLineWidth = Number(preset?.pdfGridLineWidth ?? 0.75)
  const headerUnderlineRightTrim = Number(preset?.pdfActionColumnShrink ?? 0) * 0.45
  const renderedPages = buildLedgerPagesForPaper(rows, preset, {
    padToMinimumRows: true,
    minimumRowsOverride: preset.pdfMinimumRows ?? preset.minimumRows,
  })
  const tableWidths = buildLedgerPdfTableWidths(preset)
  const content = renderedPages.map((pageRows, pageIndex) => {
    const pageHeader = buildLedgerPdfPageHeader(
      headingName,
      headingStatus,
      headingOffice,
      firstDayOfService,
      identityNameFontSize,
      identityStatusFontSize,
      identityOfficeFontSize,
      identityServiceFontSize,
      horizontalInset,
      gridLineWidth,
      headerUnderlineRightTrim,
    )

    return {
      stack: [
        ...pageHeader,
        {
          table: {
            headerRows: 2,
            widths: tableWidths,
            heights: (rowIndex) => {
              if (rowIndex === 0) return preset.pdfHeaderRowHeight
              if (rowIndex === 1) return preset.pdfSubHeaderRowHeight
              return preset.pdfBodyRowHeight
            },
            body: buildLedgerPdfTableBody(pageRows, preset),
          },
          dontBreakRows: true,
          keepWithHeaderRows: 2,
          layout: {
            hLineWidth: (lineIndex) => (lineIndex === 0 ? 0 : gridLineWidth),
            vLineWidth: () => gridLineWidth,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 0.2,
            paddingRight: () => 0.2,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [horizontalInset, 0, horizontalInset, 0],
        },
      ],
      pageBreak: pageIndex > 0 ? 'before' : undefined,
    }
  })

  return {
    pageSize: preset.pageSize,
    pageOrientation: 'portrait',
    pageMargins: preset.pageMargins,
    info: {
      title: `Leave Credits Ledger - ${displayName}`,
      author: 'LMS Frontend',
      subject: 'Employee leave credits ledger',
    },
    content,
    styles: {
      ledgerPdfRowSpanHead: {
        color: '#000000',
        fontSize: 6.8,
        bold: true,
        alignment: 'center',
        margin: [0.8, 10.8, 0.8, 0],
        lineHeight: 1.01,
      },
      ledgerPdfActionHead: {
        color: '#000000',
        fontSize: 5.8,
        bold: true,
        alignment: 'center',
        margin: [0.35, 2.5, 0.35, 0],
        lineHeight: 0.93,
      },
      ledgerPdfGroupHead: {
        color: '#000000',
        fontSize: 6.8,
        bold: true,
        alignment: 'center',
        margin: [0.8, 3.2, 0.8, 0],
        lineHeight: 1,
      },
      ledgerPdfSubHead: {
        color: '#000000',
        fontSize: 6.72,
        bold: true,
        alignment: 'center',
        margin: [0.6, 2.4, 0.6, 0],
        lineHeight: 0.96,
      },
    },
    defaultStyle: {
      fontSize: 7.2,
      color: '#000000',
    },
  }
}

function openAccrualEditDialog(entry) {
  if (entry && entry.accrualIds && entry.accrualIds.length > 0) {
    selectedAccrualIds.value = entry.accrualIds
    showAccrualsEditDialog.value = true
  }
}

async function onAccrualsSaved() {
  if (leaveCreditsLedgerEmployee.value) {
    // Delay refresh to allow the edit dialog's close transition to finish.
    // This prevents a Quasar focus trap warning caused by the edit button
    // being destroyed before focus can be returned to it.
    setTimeout(async () => {
      await openLeaveCreditsLedgerDialog(leaveCreditsLedgerEmployee.value)
    }, 350)
  }
}

async function onLeaveCreditsRestored() {
  if (leaveCreditsLedgerEmployee.value) {
    await openLeaveCreditsLedgerDialog(leaveCreditsLedgerEmployee.value)
  }
}

function printLeaveCreditsLedger() {
  if (!leaveCreditsLedgerEmployee.value) {
    $q.notify({
      type: 'warning',
      message: 'Select an employee ledger to print first.',
      position: 'top',
    })
    return
  }

  printingLeaveCreditsLedger.value = true

  try {
    const docDefinition = buildLeaveCreditsLedgerDocDefinition(
      leaveCreditsLedgerEmployee.value,
      leaveCreditsLedgerRows.value,
      ledgerPaperSize.value,
    )

    pdfMake.createPdf(docDefinition).print()

    $q.notify({
      type: 'positive',
      message: `Preparing ${ledgerPaperPreset.value.label} ${getLedgerPdfFilename(leaveCreditsLedgerEmployee.value)} for print.`,
      position: 'top',
    })
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to print leave credits ledger right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    printingLeaveCreditsLedger.value = false
  }
}

function buildLedgerActionText(entry) {
  const actionDate = formatLedgerActionDate(
    pickFirstDefined(entry, [
      'action_date',
      'actionDate',
      'processed_at',
      'processedAt',
      'validated_at',
      'validatedAt',
      'created_at',
      'createdAt',
      'date',
      'transaction_date',
      'transactionDate',
    ]),
  )
  if (actionDate) return actionDate

  const directValue = normalizeLedgerTextValue(
    pickFirstDefined(entry, [
      'date_and_action',
      'dateAndAction',
      'date_action',
      'dateAction',
      'application_action',
      'applicationAction',
    ]),
  )
  if (!directValue) return ''

  const directDate = formatLedgerActionDate(directValue)
  if (directDate) return directDate

  const leadingSegment = directValue.split(' - ')[0]?.trim() || ''
  return formatLedgerActionDate(leadingSegment)
}

function parseLedgerDateParts(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1])
    const month = Number(isoDateMatch[2])
    const day = Number(isoDateMatch[3])
    const localDate = new Date(year, month - 1, day)
    if (
      !Number.isNaN(localDate.getTime()) &&
      localDate.getFullYear() === year &&
      localDate.getMonth() === month - 1 &&
      localDate.getDate() === day
    ) {
      return { date: localDate, year, month, day }
    }
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null

  return {
    date: parsed,
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  }
}

function buildLedgerInclusiveDateLabel(parts) {
  if (!parts) return ''
  const monthLabel = parts.date.toLocaleDateString('en-US', { month: 'short' })
  const portionSuffix = parts.portion ? ` (${parts.portion})` : ''
  return `${monthLabel} ${parts.day}, ${parts.year}${portionSuffix}`
}

function sortAndNormalizeLedgerDatePartsList(partsList) {
  if (!Array.isArray(partsList) || partsList.length === 0) return []

  const byIsoDate = new Map()
  for (const parts of partsList) {
    if (!parts) continue
    const iso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
    if (!byIsoDate.has(iso)) {
      byIsoDate.set(iso, parts)
    } else {
      const existing = byIsoDate.get(iso)
      if (!existing.portion && parts.portion) {
        existing.portion = parts.portion
      }
    }
  }

  return [...byIsoDate.entries()]
    .sort(([leftIso], [rightIso]) => (leftIso < rightIso ? -1 : leftIso > rightIso ? 1 : 0))
    .map(([, parts]) => parts)
}

function buildLedgerInclusiveDatesListLabel(partsList) {
  const normalizedList = sortAndNormalizeLedgerDatePartsList(partsList)
  if (normalizedList.length === 0) return ''

  const groups = new Map()
  for (const parts of normalizedList) {
    const groupKey = `${parts.year}-${String(parts.month).padStart(2, '0')}`
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        monthLabel: parts.date.toLocaleDateString('en-US', { month: 'short' }),
        year: parts.year,
        items: [],
      })
    }

    groups.get(groupKey).items.push({
      day: parts.day,
      portion: parts.portion || null,
    })
  }

  return [...groups.values()]
    .map((group) => {
      const dayMap = new Map()
      for (const item of group.items) {
        if (!dayMap.has(item.day)) {
          dayMap.set(item.day, item.portion)
        } else if (!dayMap.get(item.day) && item.portion) {
          dayMap.set(item.day, item.portion)
        }
      }

      const sortedDays = [...dayMap.keys()].sort((left, right) => left - right)
      if (sortedDays.length === 0) return ''

      const ranges = []
      let rangeStart = sortedDays[0]
      let rangeEnd = sortedDays[0]
      let currentPortion = dayMap.get(sortedDays[0]) || null

      for (let index = 1; index < sortedDays.length; index += 1) {
        const currentDay = sortedDays[index]
        const portion = dayMap.get(currentDay) || null

        if (currentDay === rangeEnd + 1 && portion === null && currentPortion === null) {
          rangeEnd = currentDay
          continue
        }

        ranges.push({ startDay: rangeStart, endDay: rangeEnd, portion: currentPortion })
        rangeStart = currentDay
        rangeEnd = currentDay
        currentPortion = portion
      }

      ranges.push({ startDay: rangeStart, endDay: rangeEnd, portion: currentPortion })

      const rangeLabels = ranges.map(({ startDay, endDay, portion }) => {
        let dayLabel = String(startDay)
        if (endDay > startDay) {
          dayLabel = endDay === startDay + 1 ? `${startDay}, ${endDay}` : `${startDay}-${endDay}`
        }

        const portionSuffix = portion ? ` (${portion})` : ''
        return `${group.monthLabel} ${dayLabel}${portionSuffix}`
      })

      const hasSingleDayOnly = ranges.length === 1 && ranges[0].startDay === ranges[0].endDay
      if (hasSingleDayOnly) {
        const portionSuffix = ranges[0].portion ? ` (${ranges[0].portion})` : ''
        return `${group.monthLabel} ${ranges[0].startDay}, ${group.year}${portionSuffix}`
      }

      return `${rangeLabels.join(', ')} ${group.year}`
    })
    .filter(Boolean)
    .join('\n')
}

function buildLedgerDatePartsRange(startParts, endParts) {
  if (!startParts || !endParts) return []

  const startDate = new Date(startParts.year, startParts.month - 1, startParts.day)
  const endDate = new Date(endParts.year, endParts.month - 1, endParts.day)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return []
  }

  const result = []
  const cursor = new Date(startDate.getTime())
  let safetyLimit = 370
  while (cursor <= endDate && safetyLimit > 0) {
    result.push({
      date: new Date(cursor.getTime()),
      year: cursor.getFullYear(),
      month: cursor.getMonth() + 1,
      day: cursor.getDate(),
    })
    cursor.setDate(cursor.getDate() + 1)
    safetyLimit -= 1
  }

  return result
}

function isLateDeductionEntry(entry) {
  if (!entry || typeof entry !== 'object') return false
  const rowId = String(entry.row_id || entry.merge_key || entry.id || '').toLowerCase()
  if (rowId.includes('late-deduction') || rowId.includes('latededuction')) return true
  const category = String(entry.category || '').toLowerCase()
  if (category === 'deduction_without_pay') return true
  const particulars = String(entry.particulars || entry.action_taken || entry.description || '').toLowerCase()
  if (particulars.includes('late deduction')) return true
  return false
}

function buildLedgerInclusiveRangeText(entry) {
  if (isLateDeductionEntry(entry)) {
    const rawDates = pickFirstDefined(entry, [
      'selected_dates',
      'selectedDates',
      'inclusive_dates',
      'inclusiveDates',
    ])
    let datesList = []
    if (Array.isArray(rawDates)) {
      datesList = rawDates
    } else if (typeof rawDates === 'string' && rawDates.trim() !== '') {
      try {
        const parsed = JSON.parse(rawDates)
        if (Array.isArray(parsed)) datesList = parsed
        else datesList = [rawDates]
      } catch {
        datesList = [rawDates]
      }
    }

    if (datesList.length > 0) {
      const parsedList = datesList
        .map((d) => parseLedgerDateParts(d))
        .filter(Boolean)
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      if (parsedList.length === 1) {
        const monthName = parsedList[0].date.toLocaleDateString('en-US', { month: 'long' })
        return `${monthName} ${parsedList[0].year}`
      }

      if (parsedList.length > 1) {
        const allSameYear = parsedList.every((p) => p.year === parsedList[0].year)
        if (allSameYear) {
          const monthFormat = parsedList.length <= 2 ? 'long' : 'short'
          const monthNames = parsedList.map((p) => p.date.toLocaleDateString('en-US', { month: monthFormat }))
          return `${monthNames.join(', ')} ${parsedList[0].year}`
        } else {
          const labels = parsedList.map((p) => {
            const m = p.date.toLocaleDateString('en-US', { month: 'short' })
            return `${m} ${p.year}`
          })
          return labels.join(', ')
        }
      }
    }

    const startVal = pickFirstDefined(entry, ['inclusive_start_date', 'inclusiveStartDate', 'start_date', 'startDate'])
    const endVal = pickFirstDefined(entry, ['inclusive_end_date', 'inclusiveEndDate', 'end_date', 'endDate'])
    const startParts = parseLedgerDateParts(startVal)
    const endParts = parseLedgerDateParts(endVal)

    if (startParts && endParts) {
      const startMonth = startParts.date.toLocaleDateString('en-US', { month: 'long' })
      const endMonth = endParts.date.toLocaleDateString('en-US', { month: 'long' })
      if (startParts.year === endParts.year) {
        if (startParts.month === endParts.month) {
          return `${startMonth} ${startParts.year}`
        }
        return `${startMonth} - ${endMonth} ${startParts.year}`
      }
      return `${startMonth} ${startParts.year} - ${endMonth} ${endParts.year}`
    }

    if (startParts) {
      const monthName = startParts.date.toLocaleDateString('en-US', { month: 'long' })
      return `${monthName} ${startParts.year}`
    }
    if (endParts) {
      const monthName = endParts.date.toLocaleDateString('en-US', { month: 'long' })
      return `${monthName} ${endParts.year}`
    }
  }

  const rawHalfDayPortions = pickFirstDefined(entry, [
    'selected_date_half_day_portion',
    'selectedDateHalfDayPortion',
    'half_day_portion_by_date',
    'halfDayPortionByDate',
  ])
  let halfDayPortionMap = {}
  if (rawHalfDayPortions && typeof rawHalfDayPortions === 'object' && !Array.isArray(rawHalfDayPortions)) {
    halfDayPortionMap = rawHalfDayPortions
  } else if (typeof rawHalfDayPortions === 'string' && rawHalfDayPortions.trim() !== '') {
    try {
      const parsed = JSON.parse(rawHalfDayPortions)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        halfDayPortionMap = parsed
      }
    } catch {
      // ignore json parse error
    }
  }

  const resolvePortionForIso = (iso) => {
    if (!iso || !halfDayPortionMap) return null
    const val = String(halfDayPortionMap[iso] || '').toUpperCase().trim()
    return val === 'AM' || val === 'PM' ? val : null
  }

  const explicitDatesValue = pickFirstDefined(entry, [
    'inclusive_dates',
    'inclusiveDates',
    'selected_dates',
    'selectedDates',
  ])
  if (Array.isArray(explicitDatesValue) && explicitDatesValue.length > 0) {
    const explicitParts = explicitDatesValue
      .map((value) => {
        const parts = parseLedgerDateParts(value)
        if (!parts) return null
        const iso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
        parts.portion = resolvePortionForIso(iso)
        return parts
      })
      .filter(Boolean)
    const explicitLabel = buildLedgerInclusiveDatesListLabel(explicitParts)
    if (explicitLabel) return explicitLabel
  }

  const inclusiveStart = parseLedgerDateParts(
    pickFirstDefined(entry, [
      'inclusive_start_date',
      'inclusiveStartDate',
      'leave_start_date',
      'leaveStartDate',
      'start_date',
      'startDate',
    ]),
  )
  const inclusiveEnd = parseLedgerDateParts(
    pickFirstDefined(entry, [
      'inclusive_end_date',
      'inclusiveEndDate',
      'leave_end_date',
      'leaveEndDate',
      'end_date',
      'endDate',
    ]),
  )

  if (inclusiveStart && inclusiveEnd) {
    const fullRangeParts = buildLedgerDatePartsRange(inclusiveStart, inclusiveEnd)
    fullRangeParts.forEach((parts) => {
      const iso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
      parts.portion = resolvePortionForIso(iso)
    })
    const fullRangeLabel = buildLedgerInclusiveDatesListLabel(fullRangeParts)
    if (fullRangeLabel) return fullRangeLabel
  }

  const singleFallback = inclusiveStart || inclusiveEnd
  if (singleFallback) {
    const iso = `${String(singleFallback.year).padStart(4, '0')}-${String(singleFallback.month).padStart(2, '0')}-${String(singleFallback.day).padStart(2, '0')}`
    singleFallback.portion = resolvePortionForIso(iso)
    return buildLedgerInclusiveDateLabel(singleFallback)
  }

  return ''
}

function resolveLeaveHistoryInclusiveDateParts(entry) {
  const explicitDatesValue = parseInclusiveDatesValue(
    pickFirstDefined(entry, [
      'inclusive_dates',
      'inclusiveDates',
      'selected_dates',
      'selectedDates',
    ]),
  )
  if (explicitDatesValue.length > 0) {
    const explicitParts = sortAndNormalizeLedgerDatePartsList(
      explicitDatesValue.map((value) => parseLedgerDateParts(value)).filter(Boolean),
    )
    if (explicitParts.length) return explicitParts
  }

  const inclusiveStart = parseLedgerDateParts(
    pickFirstDefined(entry, [
      'inclusive_start_date',
      'inclusiveStartDate',
      'leave_start_date',
      'leaveStartDate',
      'start_date',
      'startDate',
    ]),
  )
  const inclusiveEnd = parseLedgerDateParts(
    pickFirstDefined(entry, [
      'inclusive_end_date',
      'inclusiveEndDate',
      'leave_end_date',
      'leaveEndDate',
      'end_date',
      'endDate',
    ]),
  )

  if (inclusiveStart && inclusiveEnd) {
    const rangeParts = buildLedgerDatePartsRange(inclusiveStart, inclusiveEnd)
    if (rangeParts.length) return rangeParts
  }

  return sortAndNormalizeLedgerDatePartsList([inclusiveStart || inclusiveEnd].filter(Boolean))
}

function buildLeaveHistoryInclusiveDateLabel(entry) {
  const normalizedList = resolveLeaveHistoryInclusiveDateParts(entry)
  if (!normalizedList.length) return '-'

  const groups = []
  for (const parts of normalizedList) {
    const group = groups[groups.length - 1]
    if (group && group.year === parts.year && group.month === parts.month) {
      group.days.push(parts.day)
      continue
    }

    groups.push({
      year: parts.year,
      month: parts.month,
      monthLabel: parts.date.toLocaleDateString('en-US', { month: 'short' }),
      days: [parts.day],
    })
  }

  return groups
    .map((group) => `${group.monthLabel} ${group.days.join('/')} ${group.year}`)
    .join('\n')
}



function parseInclusiveDatesValue(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return []
    }
  }

  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function buildCalendarPreviewIsoDate(parts) {
  if (!parts) return ''
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function normalizeCalendarPreviewIsoDate(value) {
  return buildCalendarPreviewIsoDate(parseLedgerDateParts(value))
}

function normalizeCalendarPreviewToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function getLeaveHistoryCalendarState(entry) {
  const rawStatus = normalizeCalendarPreviewToken(
    pickFirstDefined(entry, ['raw_status', 'rawStatus', 'status']),
  )

  if (rawStatus === 'APPROVED') return 'approved'
  if (rawStatus.includes('PENDING')) return 'pending'
  return ''
}

function getLeaveHistoryPendingUpdatePayload(entry) {
  const candidates = [entry?.pending_update, entry?.latest_update_request_payload]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (candidate && typeof candidate === 'object') return candidate
    if (typeof candidate !== 'string') continue

    const trimmed = candidate.trim()
    if (!trimmed) continue

    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // Ignore malformed payloads and continue scanning candidates.
    }
  }

  return null
}

function getLeaveHistoryRequestUpdateStatus(entry) {
  const payload = getLeaveHistoryPendingUpdatePayload(entry)
  const candidates = [
    entry?.latest_update_request_status,
    entry?.pending_update_status,
    payload?.status,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeCalendarPreviewToken(candidate)
    if (normalized) return normalized
  }

  return payload ? 'PENDING' : ''
}

function getLeaveHistoryRequestActionType(entry) {
  const payload = getLeaveHistoryPendingUpdatePayload(entry)
  const candidates = [
    entry?.pending_update_action_type,
    entry?.latest_update_request_action_type,
    payload?.action_type,
    payload?.request_action_type,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeCalendarPreviewToken(candidate)
    if (normalized) return normalized
  }

  if (payload) return 'REQUEST_UPDATE'
  return ''
}

function getLeaveHistoryCalendarDates(entry) {
  return resolveLeaveHistoryInclusiveDateParts(entry)
    .map((parts) => buildCalendarPreviewIsoDate(parts))
    .filter(Boolean)
}

function getLeaveHistoryRequestUpdateCalendarDates(entry) {
  const payload = getLeaveHistoryPendingUpdatePayload(entry)
  if (!payload) return []

  const requestStatus = getLeaveHistoryRequestUpdateStatus(entry)
  if (requestStatus && requestStatus !== 'PENDING') return []

  const actionType = getLeaveHistoryRequestActionType(entry)
  if (actionType.includes('CANCEL')) return []

  return getLeaveHistoryCalendarDates(payload)
}

function canOpenLeaveHistoryCalendarPreview(entry) {
  return (
    getLeaveHistoryCalendarDates(entry).length > 0 ||
    getLeaveHistoryRequestUpdateCalendarDates(entry).length > 0
  )
}

function setCalendarPreviewRefElement(element) {
  calendarPreviewRef.value = element
}

function setCalendarPreviewMonth(dateValue) {
  const normalizedDate =
    normalizeCalendarPreviewIsoDate(dateValue) || normalizeCalendarPreviewIsoDate(new Date())
  const [year, month] = normalizedDate.split('-')

  calendarPreviewView.value = {
    year,
    month,
  }
}

const CALENDAR_PREVIEW_WARNING_WIDTH = 220
const CALENDAR_PREVIEW_WARNING_TIMEOUT_MS = 7000
let calendarPreviewWarningTimeoutId = null
let calendarPreviewWarningPressedDate = ''
let calendarPreviewWarningPressedAt = 0
let calendarPreviewWarningPressedMessage = ''

function clearCalendarPreviewWarningTimeout() {
  if (calendarPreviewWarningTimeoutId) {
    window.clearTimeout(calendarPreviewWarningTimeoutId)
    calendarPreviewWarningTimeoutId = null
  }
}

function releaseCalendarPreviewWarningDismiss() {
  window.removeEventListener('pointerdown', handleCalendarPreviewDismissPointerDown, true)
}

function releaseCalendarPreviewPointer() {
  window.removeEventListener('pointerup', handleCalendarPreviewGlobalPointerUp, true)
  window.removeEventListener('pointercancel', handleCalendarPreviewGlobalPointerUp, true)
}

function clearCalendarPreviewWarning() {
  clearCalendarPreviewWarningTimeout()
  releaseCalendarPreviewWarningDismiss()
  releaseCalendarPreviewPointer()

  if (
    !calendarPreviewDateWarning.value &&
    !calendarPreviewWarningDate.value &&
    Object.keys(calendarPreviewWarningStyle.value).length === 0
  ) {
    return
  }

  calendarPreviewDateWarning.value = ''
  calendarPreviewWarningDate.value = ''
  calendarPreviewWarningStyle.value = {}
  syncCalendarPreviewDecorations()
}

function formatCalendarPreviewWarningDate(dateValue) {
  const normalizedDate = normalizeCalendarPreviewIsoDate(dateValue)
  if (!normalizedDate) return ''

  return new Date(`${normalizedDate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildCalendarPreviewWarningMessage(dateValue) {
  const normalizedDate = normalizeCalendarPreviewIsoDate(dateValue)
  if (!normalizedDate) return ''

  const state = calendarPreviewDateStates.value.get(normalizedDate)
  if (!state) return ''

  const formattedDate = formatCalendarPreviewWarningDate(normalizedDate)
  if (!formattedDate) return ''

  if (state === 'request-update') {
    return `${formattedDate} is part of the requested update.`
  }

  if (state === 'approved') {
    return `${formattedDate} leave application is already approved.`
  }

  return `${formattedDate} leave application is still pending.`
}

function showCalendarPreviewWarning(dateValue, options = {}) {
  const { sticky = false, message = '' } = options
  const normalizedDate = normalizeCalendarPreviewIsoDate(dateValue)
  if (!normalizedDate) {
    clearCalendarPreviewWarning()
    return
  }

  const resolvedMessage = message || buildCalendarPreviewWarningMessage(normalizedDate)
  if (!resolvedMessage) {
    clearCalendarPreviewWarning()
    return
  }

  clearCalendarPreviewWarningTimeout()
  releaseCalendarPreviewWarningDismiss()

  calendarPreviewDateWarning.value = resolvedMessage
  calendarPreviewWarningDate.value = normalizedDate
  syncCalendarPreviewDecorations()
  window.addEventListener('pointerdown', handleCalendarPreviewDismissPointerDown, true)

  if (!sticky) {
    calendarPreviewWarningTimeoutId = window.setTimeout(() => {
      clearCalendarPreviewWarning()
    }, CALENDAR_PREVIEW_WARNING_TIMEOUT_MS)
  }
}

function resolveCalendarPreviewDateFromEvent(event) {
  const dayCell = event.target?.closest?.('.q-date__calendar-item')
  if (!dayCell || dayCell.classList.contains('q-date__calendar-item--fill')) return ''

  const dayMatch = String(dayCell.textContent || '').match(/\b([1-9]|[12]\d|3[01])\b/)
  const day = dayMatch ? Number.parseInt(dayMatch[1], 10) : NaN
  if (!Number.isInteger(day) || day < 1 || day > 31) return ''

  return `${calendarPreviewView.value.year}-${calendarPreviewView.value.month}-${String(day).padStart(2, '0')}`
}

function handleCalendarPreviewModelUpdate() {
  if (
    (Array.isArray(calendarPreviewModel.value) && calendarPreviewModel.value.length > 0) ||
    (!Array.isArray(calendarPreviewModel.value) && calendarPreviewModel.value)
  ) {
    calendarPreviewModel.value = []
  }
}

function handleCalendarPreviewGlobalPointerUp() {
  if (!calendarPreviewWarningPressedDate) return

  const pressedDate = calendarPreviewWarningPressedDate
  const pressedDuration = Date.now() - calendarPreviewWarningPressedAt
  const pressedMessage = calendarPreviewWarningPressedMessage

  calendarPreviewWarningPressedDate = ''
  calendarPreviewWarningPressedAt = 0
  calendarPreviewWarningPressedMessage = ''
  releaseCalendarPreviewPointer()

  if (pressedDuration >= 250) {
    clearCalendarPreviewWarning()
    return
  }

  showCalendarPreviewWarning(pressedDate, { message: pressedMessage })
}

function handleCalendarPreviewDismissPointerDown() {
  clearCalendarPreviewWarning()
}

function handleCalendarPreviewSurfacePointerDown(event) {
  const clickedDate = resolveCalendarPreviewDateFromEvent(event)
  const warningMessage = clickedDate ? buildCalendarPreviewWarningMessage(clickedDate) : ''

  if (!clickedDate) {
    calendarPreviewWarningPressedDate = ''
    calendarPreviewWarningPressedAt = 0
    calendarPreviewWarningPressedMessage = ''
    releaseCalendarPreviewPointer()
    clearCalendarPreviewWarning()
    return
  }

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()

  if (!warningMessage) {
    calendarPreviewWarningPressedDate = ''
    calendarPreviewWarningPressedAt = 0
    calendarPreviewWarningPressedMessage = ''
    releaseCalendarPreviewPointer()
    clearCalendarPreviewWarning()
    return
  }

  calendarPreviewWarningPressedDate = clickedDate
  calendarPreviewWarningPressedAt = Date.now()
  calendarPreviewWarningPressedMessage = warningMessage
  showCalendarPreviewWarning(clickedDate, { sticky: true, message: warningMessage })
  releaseCalendarPreviewPointer()
  window.addEventListener('pointerup', handleCalendarPreviewGlobalPointerUp, true)
  window.addEventListener('pointercancel', handleCalendarPreviewGlobalPointerUp, true)
}

function handleCalendarPreviewSurfaceClick(event) {
  const clickedDate = resolveCalendarPreviewDateFromEvent(event)
  if (!clickedDate) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()
}

function syncCalendarPreviewDecorations() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const calendarRoot = calendarPreviewRef.value
      if (!calendarRoot) return

      const calendarRect = calendarRoot.getBoundingClientRect()
      const calendarWidth = calendarRoot.clientWidth || calendarRect.width || 0
      let nextWarningStyle = {}

      const dayCells = calendarRoot.querySelectorAll('.q-date__calendar-item')
      dayCells.forEach((cell) => {
        cell.classList.remove('leave-date-calendar__day--locked')
        cell.classList.remove('leave-date-calendar__day--locked-pending')
        cell.classList.remove('leave-date-calendar__day--locked-approved')
        cell.classList.remove('leave-date-calendar__day--locked-request-update')
        cell.classList.remove('leave-date-calendar__day--warning')

        if (cell.classList.contains('q-date__calendar-item--fill')) return

        const dayMatch = String(cell.textContent || '').match(/\b([1-9]|[12]\d|3[01])\b/)
        const day = dayMatch ? Number.parseInt(dayMatch[1], 10) : NaN
        if (!Number.isInteger(day) || day < 1 || day > 31) return

        const date = `${calendarPreviewView.value.year}-${calendarPreviewView.value.month}-${String(day).padStart(2, '0')}`
        const lockedState = calendarPreviewDateStates.value.get(date)
        if (!lockedState) return

        cell.classList.add('leave-date-calendar__day--locked')
        cell.classList.add(`leave-date-calendar__day--locked-${lockedState}`)

        if (calendarPreviewWarningDate.value === date && calendarPreviewDateWarning.value) {
          cell.classList.add('leave-date-calendar__day--warning')

          const cellRect = cell.getBoundingClientRect()
          const popupWidth = Math.max(
            160,
            Math.min(CALENDAR_PREVIEW_WARNING_WIDTH, Math.max(calendarWidth - 16, 160)),
          )
          const cellCenter = cellRect.left - calendarRect.left + cellRect.width / 2
          const popupLeft = Math.max(
            8,
            Math.min(cellCenter - popupWidth * 0.58, calendarWidth - popupWidth - 8),
          )
          const popupTop = Math.max(6, cellRect.top - calendarRect.top - 56)
          const arrowLeft = Math.max(16, Math.min(cellCenter - popupLeft - 6, popupWidth - 18))

          nextWarningStyle = {
            width: `${popupWidth}px`,
            left: `${popupLeft}px`,
            top: `${popupTop}px`,
            '--leave-date-warning-arrow-left': `${arrowLeft}px`,
          }
        }
      })

      calendarPreviewWarningStyle.value = nextWarningStyle
    })
  })
}

function onCalendarPreviewNavigation({ year, month }) {
  calendarPreviewView.value = {
    year: String(year),
    month: String(month).padStart(2, '0'),
  }
  clearCalendarPreviewWarning()
  syncCalendarPreviewDecorations()
}

function openLeaveHistoryCalendarPreview(entry) {
  if (!canOpenLeaveHistoryCalendarPreview(entry)) return

  const previewDates = [
    ...getLeaveHistoryRequestUpdateCalendarDates(entry),
    ...getLeaveHistoryCalendarDates(entry),
  ].filter(Boolean)
  const anchorDate =
    previewDates[0] ||
    normalizeCalendarPreviewIsoDate(entry?.date_filed) ||
    normalizeCalendarPreviewIsoDate(new Date())

  calendarPreviewAnchorEntry.value = entry
  calendarPreviewModel.value = []
  clearCalendarPreviewWarning()
  setCalendarPreviewMonth(anchorDate)
  calendarPreviewKey.value += 1
  showCalendarPreviewDialog.value = true
}


function isCtoLedgerEntry(entry, particulars, leaveTypeCode) {
  if (!entry && !particulars && !leaveTypeCode) return false

  const code = String(leaveTypeCode || entry?.leaveTypeCode || entry?.leave_type_code || '').trim().toUpperCase()
  if (code === 'CTO' || code === 'COC') return true

  const part = String(particulars || entry?.particulars || entry?.description || entry?.leave_type_name || '').trim().toLowerCase()
  if (
    part.startsWith('cto') ||
    part.startsWith('coc') ||
    part.includes('cto') ||
    part.includes('coc') ||
    part.includes('compensatory')
  ) {
    if (!part.startsWith('cl ') && !part.startsWith('cl-') && part !== 'cl') {
      return true
    }
  }

  const key = String(entry?.balanceKey || entry?.other_balance_key || entry?.otherBalanceKey || '').trim().toLowerCase()
  if (key.includes('cto') || key.includes('coc') || key.includes('compensatory')) return true

  return false
}

function formatCtoLedgerQuantityValue(value, options = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return ''
  }

  const rawStr = String(value).trim()
  if (/[a-zA-Z]/.test(rawStr)) {
    return rawStr
  }

  const isDeduction = options.isDeduction || rawStr.startsWith('-')
  const isAccrual = options.isAccrual || rawStr.startsWith('+')
  const num = Number(rawStr.replace(/[+,-]/g, ''))

  if (!Number.isFinite(num)) {
    return rawStr
  }

  if (Math.abs(num) < 1e-9) {
    return '0 hr'
  }

  const totalHours = num * 8.0
  const totalMinutes = Math.round(totalHours * 60)
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  let text = ''
  if (hrs > 0 && mins > 0) {
    text = `${hrs}h ${mins}m`
  } else if (hrs > 0) {
    text = `${hrs} hrs`
  } else if (mins > 0) {
    text = `${mins} mins`
  } else {
    text = '0 hr'
  }

  if (isDeduction) {
    return `-${text}`
  }
  if (isAccrual && options.includePlusSign) {
    return `+${text}`
  }

  return text
}

function normalizeLedgerRow(entry, index) {
  const inclusivePeriod = buildLedgerInclusiveRangeText(entry)
  const particulars = normalizeLedgerTextValue(
    pickFirstDefined(entry, [
      'particulars',
      'particular',
      'description',
      'remarks',
      'entry_type',
      'entryType',
      'transaction_type',
      'transactionType',
      'leave_type_name',
      'leaveTypeName',
      'leave_type',
      'leaveType',
      'type',
      'notes',
    ]),
  )
  const leaveTypeCode = normalizeLedgerLeaveCode(
    pickFirstDefined(entry, [
      'leave_type_code',
      'leaveTypeCode',
      'leave_type_name',
      'leaveTypeName',
      'leave_type',
      'leaveType',
      'entry_type',
      'entryType',
      'transaction_type',
      'transactionType',
      'particulars',
      'particular',
      'description',
      'remarks',
      'type',
    ]) || particulars,
  )

  const accrualIds = Array.isArray(entry?.accrual_ids) ? entry.accrual_ids : []
  const actionTakenStr = String(entry?.action_taken || entry?.actionTaken || '').trim()
  const isMonthlyAccrual = actionTakenStr === 'Monthly accrual'
  const isVlSl = leaveTypeCode === 'VL' || leaveTypeCode === 'SL' || (typeof particulars === 'string' && (particulars.includes('VL') || particulars.includes('SL')))
  const isEditableAccrual = accrualIds.length > 0 && isMonthlyAccrual && isVlSl
  const isUsageOnly = Boolean(
    entry?.is_usage_only ||
    entry?.isUsageOnly ||
    leaveTypeCode === 'PATE' ||
    (entry?.leave_category === 'EVENT' && entry?.is_credit_based === false)
  )

  const isCto = isCtoLedgerEntry(entry, particulars, leaveTypeCode)

  const rawOtherEarned = pickFirstDefined(entry, [
    'other_earned',
    'otherEarned',
    'other_leave_earned',
    'otherLeaveEarned',
    'other_type_earned',
    'otherTypeEarned',
    'others_earned',
    'othersEarned',
    'otl_earned',
    'other.earned',
    'other_leave.earned',
    'other_type.earned',
    'others.earned',
    'special_privilege_earned',
    'specialPrivilegeEarned',
    'spl_earned',
    'vawc_earned',
    'vawcEarned',
  ])

  const otherEarned = isCto
    ? formatCtoLedgerQuantityValue(rawOtherEarned, { isAccrual: true, includePlusSign: true })
    : normalizeLedgerAccrualQuantityValue(rawOtherEarned)

  const rawOtherAbsUndWp = pickFirstDefined(entry, [
    'other_abs_und',
    'otherAbsUnd',
    'other_abs_und_wp',
    'otherAbsUndWp',
    'other_leave_abs_und',
    'otherLeaveAbsUnd',
    'other_leave_abs_und_wp',
    'otherLeaveAbsUndWp',
    'other_type_abs_und',
    'otherTypeAbsUnd',
    'other_type_abs_und_wp',
    'otherTypeAbsUndWp',
    'others_abs_und',
    'othersAbsUnd',
    'others_abs_und_wp',
    'othersAbsUndWp',
    'other.with_pay',
    'other_leave.with_pay',
    'other_type.with_pay',
    'others.with_pay',
    'special_privilege_abs_und_wp',
    'specialPrivilegeAbsUndWp',
    'spl_abs_und_wp',
    'vawc_abs_und_wp',
    'vawcAbsUndWp',
  ])

  const otherAbsUndWp = isCto
    ? formatCtoLedgerQuantityValue(rawOtherAbsUndWp, { isDeduction: true })
    : normalizeLedgerWithPayDeductionValue(rawOtherAbsUndWp)

  const rawOtherBalance = isUsageOnly
    ? ''
    : pickFirstDefined(entry, [
        'other_balance',
        'otherBalance',
        'other_leave_balance',
        'otherLeaveBalance',
        'other_type_balance',
        'otherTypeBalance',
        'others_balance',
        'othersBalance',
        'otl_balance',
        'other.balance',
        'other_leave.balance',
        'other_type.balance',
        'others.balance',
        'special_privilege_balance',
        'specialPrivilegeBalance',
        'spl_balance',
        'vawc_balance',
        'vawcBalance',
      ])

  const otherBalance = isUsageOnly
    ? ''
    : isCto
      ? formatCtoLedgerQuantityValue(rawOtherBalance)
      : normalizeLedgerQuantityValue(rawOtherBalance)

  const rawOtherAbsUndWop = pickFirstDefined(entry, [
    'other_abs_und_wop',
    'otherAbsUndWop',
    'other_leave_abs_und_wop',
    'otherLeaveAbsUndWop',
    'other_type_abs_und_wop',
    'otherTypeAbsUndWop',
    'others_abs_und_wop',
    'othersAbsUndWop',
    'otl_abs_und_wop',
    'other.without_pay',
    'other_leave.without_pay',
    'other_type.without_pay',
    'others.without_pay',
    'special_privilege_abs_und_wop',
    'specialPrivilegeAbsUndWop',
    'spl_abs_und_wop',
    'vawc_abs_und_wop',
    'vawcAbsUndWop',
  ])

  const otherAbsUndWop = isCto
    ? formatCtoLedgerQuantityValue(rawOtherAbsUndWop)
    : normalizeLedgerQuantityValue(rawOtherAbsUndWop)

  return {
    id: pickFirstDefined(
      entry,
      ['id', 'ledger_id', 'ledgerId', 'entry_id', 'entryId'],
      `ledger-${index}`,
    ),
    balanceKey: normalizeLedgerTextValue(
      pickFirstDefined(entry, [
        'balance_key',
        'balanceKey',
        'other_balance_key',
        'otherBalanceKey',
      ]),
    ),
    period:
      inclusivePeriod ||
      normalizeLedgerTextValue(
        pickFirstDefined(entry, [
          'period',
          'period_label',
          'periodLabel',
          'covered_period',
          'coveredPeriod',
          'month_period',
          'monthPeriod',
          'month',
          'month_label',
          'monthLabel',
          'year_month',
          'yearMonth',
        ]),
      ),
    particulars,
    leaveTypeCode,
    vacationEarned: normalizeLedgerAccrualQuantityValue(
      pickFirstDefined(entry, [
        'vacation_earned',
        'vacationEarned',
        'vacation_leave_earned',
        'vacationLeaveEarned',
        'vl_earned',
        'vacation.earned',
        'vacation_leave.earned',
      ]),
    ),
    vacationAbsUndWp: normalizeLedgerWithPayDeductionValue(
      pickFirstDefined(entry, [
        'vacation_abs_und_wp',
        'vacationAbsUndWp',
        'vacation_leave_abs_und_wp',
        'vacationLeaveAbsUndWp',
        'vl_abs_und_wp',
        'vacation.with_pay',
        'vacation_leave.with_pay',
        'vacation_leave.used_with_pay',
        'vacation.used_with_pay',
      ]),
    ),
    vacationBalance: normalizeLedgerQuantityValue(
      pickFirstDefined(entry, [
        'vacation_balance',
        'vacationBalance',
        'vacation_leave_balance',
        'vacationLeaveBalance',
        'vl_balance',
        'vacation.balance',
        'vacation_leave.balance',
      ]),
    ),
    vacationAbsUndWop: normalizeLedgerQuantityValue(
      pickFirstDefined(entry, [
        'vacation_abs_und_wop',
        'vacationAbsUndWop',
        'vacation_leave_abs_und_wop',
        'vacationLeaveAbsUndWop',
        'vl_abs_und_wop',
        'vacation.without_pay',
        'vacation_leave.without_pay',
        'vacation_leave.used_without_pay',
        'vacation.used_without_pay',
      ]),
    ),
    sickEarned: normalizeLedgerAccrualQuantityValue(
      pickFirstDefined(entry, [
        'sick_earned',
        'sickEarned',
        'sick_leave_earned',
        'sickLeaveEarned',
        'sl_earned',
        'sick.earned',
        'sick_leave.earned',
      ]),
    ),
    sickAbsUnd: normalizeLedgerWithPayDeductionValue(
      pickFirstDefined(entry, [
        'sick_abs_und',
        'sickAbsUnd',
        'sick_abs_und_wp',
        'sickAbsUndWp',
        'sick_leave_abs_und',
        'sickLeaveAbsUnd',
        'sick_leave_abs_und_wp',
        'sickLeaveAbsUndWp',
        'sl_abs_und',
        'sl_abs_und_wp',
        'sick.with_pay',
        'sick_leave.with_pay',
        'sick_leave.used_with_pay',
        'sick.used_with_pay',
      ]),
    ),
    sickBalance: normalizeLedgerQuantityValue(
      pickFirstDefined(entry, [
        'sick_balance',
        'sickBalance',
        'sick_leave_balance',
        'sickLeaveBalance',
        'sl_balance',
        'sick.balance',
        'sick_leave.balance',
      ]),
    ),
    sickAbsUndWop: normalizeLedgerQuantityValue(
      pickFirstDefined(entry, [
        'sick_abs_und_wop',
        'sickAbsUndWop',
        'sick_leave_abs_und_wop',
        'sickLeaveAbsUndWop',
        'sl_abs_und_wop',
        'sick.without_pay',
        'sick_leave.without_pay',
        'sick_leave.used_without_pay',
        'sick.used_without_pay',
      ]),
    ),
    otherEarned,
    otherAbsUndWp,
    otherBalance,
    otherAbsUndWop,
    actionTaken: buildLedgerActionText(entry),
    accrualIds,
    isEditableAccrual,
    late_deduction_id: entry?.late_deduction_id || entry?.lateDeductionId || null,
    restoration_id:
      entry?.restoration_id ||
      entry?.restorationId ||
      (typeof entry?.id === 'string' && entry.id.startsWith('restoration-')
        ? parseInt(entry.id.replace('restoration-', ''), 10)
        : null),
    isRestoration:
      Boolean(entry?.restoration_id || entry?.restorationId) ||
      (typeof entry?.id === 'string' && entry.id.startsWith('restoration-')),
    restored_days:
      entry?.restored_days ||
      entry?.amount ||
      entry?.vacation_earned ||
      entry?.sick_earned ||
      entry?.other_earned ||
      null,
    target_leave: entry?.target_leave || entry?.targetLeave || null,
    target_leave_type_id: entry?.target_leave_type_id || entry?.targetLeaveTypeId || null,
    days_late: entry?.days_late !== undefined ? entry.days_late : (entry?.daysLate ?? null),
    hours_late: entry?.hours_late !== undefined ? entry.hours_late : (entry?.hoursLate ?? null),
    minutes_late: entry?.minutes_late !== undefined ? entry.minutes_late : (entry?.minutesLate ?? null),
    deducted_days: entry?.deducted_days !== undefined ? entry.deducted_days : (entry?.deductedDays ?? entry?.amount ?? null),
    selected_dates: entry?.selected_dates || entry?.selectedDates || entry?.inclusive_dates || entry?.inclusiveDates || null,
    selected_date_half_day_portion: entry?.selected_date_half_day_portion || entry?.selectedDateHalfDayPortion || null,
    inclusive_start_date: entry?.inclusive_start_date || entry?.inclusiveStartDate || entry?.start_date || entry?.startDate || null,
    inclusive_end_date: entry?.inclusive_end_date || entry?.inclusiveEndDate || entry?.end_date || entry?.endDate || null,
    isLateDeduction: isLateDeductionEntry(entry),
    is_superseded: Boolean(entry?.is_superseded || entry?.isSuperseded),
    rawEntry: entry,
  }
}

function orderLedgerRowsOldestFirst(rows) {
  if (!Array.isArray(rows) || rows.length <= 1) return Array.isArray(rows) ? rows : []
  return [...rows].reverse()
}

function extractLedgerRows(payload) {
  if (Array.isArray(payload)) return payload

  const nestedData = payload?.data && typeof payload.data === 'object' ? payload.data : null
  const collections = [
    payload?.ledger,
    payload?.ledger_entries,
    payload?.ledgerEntries,
    payload?.entries,
    payload?.records,
    payload?.rows,
    payload?.history,
    payload?.leave_balance_ledger,
    payload?.leaveBalanceLedger,
    payload?.leave_credits_ledger,
    payload?.leaveCreditsLedger,
    nestedData?.ledger,
    nestedData?.ledger_entries,
    nestedData?.ledgerEntries,
    nestedData?.entries,
    nestedData?.records,
    nestedData?.rows,
    nestedData?.history,
    nestedData?.leave_balance_ledger,
    nestedData?.leaveBalanceLedger,
    nestedData?.leave_credits_ledger,
    nestedData?.leaveCreditsLedger,
    Array.isArray(payload?.data) ? payload.data : null,
  ]

  return collections.find((collection) => Array.isArray(collection)) || []
}

function extractLedgerEmployee(payload) {
  if (!payload || typeof payload !== 'object') return null

  const nestedData = payload?.data && typeof payload.data === 'object' ? payload.data : null
  const employee =
    payload.employee ??
    payload.employee_info ??
    payload.employeeInfo ??
    nestedData?.employee ??
    nestedData?.employee_info ??
    nestedData?.employeeInfo ??
    payload.profile ??
    null

  const serviceDate = pickFirstDefined(payload, [
    'first_day_of_service',
    'firstDayOfService',
    'date_hired',
    'dateHired',
    'hire_date',
    'hireDate',
  ])

  const office = pickFirstDefined(payload, [
    'office',
    'department_name',
    'division_office',
    'divisionOffice',
  ])

  const designation = pickFirstDefined(payload, ['designation', 'position'])
  const firstDayOfService =
    (employee?.first_day_of_service ??
      employee?.firstDayOfService ??
      serviceDate ??
      pickFirstDefined(nestedData, [
        'first_day_of_service',
        'firstDayOfService',
        'date_hired',
        'dateHired',
        'hire_date',
        'hireDate',
      ])) ||
    ''
  const resolvedOffice =
    (employee?.office ??
      office ??
      pickFirstDefined(nestedData, [
        'office',
        'department_name',
        'division_office',
        'divisionOffice',
      ])) ||
    ''
  const resolvedDesignation =
    (employee?.designation ??
      employee?.position ??
      designation ??
      pickFirstDefined(nestedData, ['designation', 'position'])) ||
    ''

  return {
    ...(employee || {}),
    first_day_of_service: firstDayOfService,
    office: resolvedOffice,
    designation: resolvedDesignation,
  }
}

async function fetchLeaveCreditsLedgerPayload(controlNo) {
  const data = await employeeStore.fetchLeaveCreditsLedger(controlNo)
  if (!data) {
    const error = new Error('Leave credits ledger endpoint was not found.')
    error.isMissingLedgerEndpoint = true
    throw error
  }
  return data
}

async function fetchLedgerLeaveBalanceTypes(controlNo) {
  const normalizedControlNo = String(controlNo ?? '').trim()
  if (!normalizedControlNo) return []

  const data = await employeeStore.fetchAvailableLeaveTypes(normalizedControlNo)
  return Array.isArray(data?.leave_types) ? data.leave_types : []
}

async function fetchEmployeeLeaveHistory(controlNo) {
  if (!controlNo) {
    leaveHistory.value = []
    return
  }

  leaveHistoryLoading.value = true
  try {
    const data = await employeeStore.fetchEmployeeLeaveHistory(controlNo)
    leaveHistory.value = data?.applications ?? []
    if (data?.employee) {
      selectedEmployee.value = {
        ...selectedEmployee.value,
        ...data.employee,
      }
    }
  } catch (err) {
    leaveHistory.value = []
    const msg = resolveApiErrorMessage(err, 'Unable to load employee leave history right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    leaveHistoryLoading.value = false
  }
}

async function openCocCtoLedgerDialog(employee) {
  const controlNo = String(employee?.control_no ?? '').trim()
  if (!controlNo) return

  cocCtoLedgerEmployee.value = { ...employee }
  cocCtoLedgerRows.value = []
  cocCtoLedgerCurrentBalance.value = { hours: 0, days: 0 }
  cocCtoLedgerError.value = ''
  showCocCtoLedgerDialog.value = true
  cocCtoLedgerLoading.value = true

  try {
    const data = await employeeStore.fetchCocCtoLedger(controlNo)
    if (data?.employee) {
      cocCtoLedgerEmployee.value = {
        ...cocCtoLedgerEmployee.value,
        ...data.employee,
      }
    }
    cocCtoLedgerCurrentBalance.value = data?.current_balance || { hours: 0, days: 0 }
    cocCtoLedgerRows.value = orderLedgerRowsOldestFirst(data?.ledger || [])
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to load COC / CTO ledger right now.')
    cocCtoLedgerError.value = message
    cocCtoLedgerRows.value = []
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    cocCtoLedgerLoading.value = false
  }
}

async function openLeaveCreditsLedgerDialog(employee) {
  const controlNo = String(employee?.control_no ?? '').trim()
  if (!controlNo) return

  ledgerPaperSize.value = 'A4'
  leaveCreditsLedgerEmployee.value = { ...employee }
  leaveCreditsLedgerRows.value = []
  leaveCreditsLedgerBalanceBadges.value = buildLedgerBalanceBadgesFromLeaveTypes([])
  leaveCreditsLedgerError.value = ''
  showLeaveCreditsLedgerDialog.value = true
  leaveCreditsLedgerLoading.value = true

  try {
    const [ledgerResult, leaveBalanceTypesResult] = await Promise.allSettled([
      fetchLeaveCreditsLedgerPayload(controlNo),
      fetchLedgerLeaveBalanceTypes(controlNo),
    ])
    if (ledgerResult.status !== 'fulfilled') {
      throw ledgerResult.reason
    }

    const payload = ledgerResult.value
    const payloadEmployee = extractLedgerEmployee(payload)

    if (payloadEmployee) {
      leaveCreditsLedgerEmployee.value = {
        ...leaveCreditsLedgerEmployee.value,
        ...payloadEmployee,
      }
    }

    const normalizedRows = extractLedgerRows(payload).map((entry, index) =>
      normalizeLedgerRow(entry, index),
    )
    const orderedRows = orderLedgerRowsOldestFirst(normalizedRows)
    const ledgerRows = orderedRows
    leaveCreditsLedgerRows.value = ledgerRows

    if (leaveBalanceTypesResult.status === 'fulfilled') {
      leaveCreditsLedgerBalanceBadges.value = buildLedgerBalanceBadgesFromLeaveTypes(
        leaveBalanceTypesResult.value,
      )
    } else {
      leaveCreditsLedgerBalanceBadges.value = buildLedgerBalanceBadgesFromLeaveTypes([])
    }
  } catch (err) {
    const message = err?.isMissingLedgerEndpoint
      ? 'Leave credits ledger is not available right now.'
      : resolveApiErrorMessage(err, 'Unable to load leave credits ledger right now.')

    leaveCreditsLedgerError.value = message
    leaveCreditsLedgerRows.value = []
    leaveCreditsLedgerBalanceBadges.value = buildLedgerBalanceBadgesFromLeaveTypes([])
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    leaveCreditsLedgerLoading.value = false
  }
}

async function fetchEmployeeDetailsLeaveBadges(controlNo) {
  const lookupSequence = ++employeeDetailsLeaveBadgesLookupSequence
  const normalizedControlNo = String(controlNo ?? '').trim()

  if (!normalizedControlNo) {
    employeeDetailsLeaveBadges.value = []
    employeeDetailsLeaveBadgesLoading.value = false
    return
  }

  employeeDetailsLeaveBadgesLoading.value = true
  try {
    const leaveTypes = await fetchLedgerLeaveBalanceTypes(normalizedControlNo)
    if (lookupSequence !== employeeDetailsLeaveBadgesLookupSequence) return

    employeeDetailsLeaveBadges.value = buildLedgerBalanceBadgesFromLeaveTypes(leaveTypes)
  } catch {
    if (lookupSequence !== employeeDetailsLeaveBadgesLookupSequence) return
    employeeDetailsLeaveBadges.value = buildLedgerBalanceBadgesFromLeaveTypes([])
  } finally {
    if (lookupSequence === employeeDetailsLeaveBadgesLookupSequence) {
      employeeDetailsLeaveBadgesLoading.value = false
    }
  }
}




function openPushToBioDialog(employee) {
  activeBioEmployee.value = employee
  showPushToBioDialog.value = true
}

function onBiometricRegistered({ employee, deviceSn }) {
  if (employee) {
    employee.biometric_status = 'PENDING_ENROLLMENT'
    employee.biometric_device_sn = deviceSn
  }
}

function openLeaveCreditsDialog(employee = null) {
  activeCreditEmployee.value = employee
  leaveCreditDialogMode.value = 'ADD'
  showLeaveCreditsDialog.value = true
}

function openLeaveCreditsEditDialog(employee = null) {
  activeCreditEmployee.value = employee
  leaveCreditDialogMode.value = 'EDIT'
  showLeaveCreditsDialog.value = true
}

function onLeaveCreditsSaved({ employeeControlNo }) {
  markEmployeeManualLeaveCreditsUsed(employeeControlNo)
}

function markEmployeeManualLeaveCreditsUsed(controlNo) {
  const normalizeControlNo = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    if (!/^\d+$/.test(raw)) return raw

    const normalized = raw.replace(/^0+/, '')
    return normalized || '0'
  }

  const targetControlNo = normalizeControlNo(controlNo)
  if (!targetControlNo) return

  employees.value = employees.value.map((employee) => {
    const employeeControlNo = normalizeControlNo(employee?.control_no)
    if (employeeControlNo !== targetControlNo) {
      return employee
    }

    return {
      ...employee,
      has_manual_leave_credits: true,
    }
  })
}

</script>

<style scoped>
.search-wrap {
  width: min(760px, 100%);
  column-gap: 12px;
  row-gap: 8px;
}

.activity-filter {
  width: 170px;
  min-width: 170px;
}

.search-input {
  flex: 1 1 300px;
  min-width: 220px;
  width: auto;
}
.summary-strip__card-section {
  padding: 14px 16px;
}

.summary-strip__icon {
  margin-right: 12px;
}

.summary-strip__label {
  letter-spacing: 0.04em;
}

.summary-strip__value {
  line-height: 1.1;
}

.credit-btn {
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.leave-credit-dialog {
  width: min(760px, 96vw);
  max-width: 96vw;
}

.coc-import-dialog {
  width: min(820px, 96vw);
  max-width: 96vw;
}

.coc-import-entry {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.employee-details-dialog {
  width: min(860px, 90vw);
  max-width: 90vw;
}

.employee-details-dialog__toolbar {
  padding-bottom: 0;
}

.employee-details-dialog__content {
  padding-top: 12px;
  padding-bottom: 12px;
}

.employee-details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.employee-details-header__profile {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
}

.employee-details-header__identity {
  min-width: 0;
}

.employee-details-header__name {
  margin: 0;
  line-height: 1.15;
}

.employee-details-header__designation {
  margin-top: 2px;
  line-height: 1.3;
}

.employee-details-header__meta {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.employee-details-header__meta-item {
  min-width: 110px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.employee-details-header__meta-value {
  line-height: 1.25;
}

.employee-details-header__status-badge {
  align-self: flex-start;
}

.employee-details-leave-credits {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.employee-details-leave-credits__label {
  font-size: 0.76rem;
  font-weight: 700;
  color: #4b5563;
}

.employee-details-leave-credits__badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-height: 20px;
}

.employee-details-leave-credits__loading-text {
  font-size: 0.76rem;
  color: #6b7280;
}

.employee-details-leave-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--badge-accent, #475569);
  background: var(--badge-bg, #f1f5f9);
  color: var(--badge-accent, #475569);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
}

.employee-details-leave-badge__code {
  opacity: 0.88;
}

.employee-details-leave-badge__value {
  color: #111827;
  font-weight: 800;
}

.leave-history-table :deep(.q-table__middle) {
  overflow-x: auto;
}

.employee-records-table :deep(.q-table__middle) {
  overflow-x: auto;
}

.leave-history-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.leave-history-table :deep(th),
.leave-history-table :deep(td) {
  white-space: nowrap;
  text-align: center;
}

.leave-history-table :deep(th.leave-history-table__header-cell) {
  position: relative;
  vertical-align: middle;
}

.leave-history-table :deep(.leave-history-table__header-label) {
  display: block;
  width: 100%;
  text-align: center;
}

.leave-history-table :deep(th.leave-history-table__header-cell .q-table__sort-icon) {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.leave-history-table :deep(th.leave-history-table__header-cell.sort-desc .q-table__sort-icon) {
  transform: translateY(-50%) rotate(180deg);
}

.leave-history-table :deep(td.leave-history-table__leave-type-cell),
.leave-history-table :deep(th.leave-history-table__leave-type-cell),
.leave-history-table :deep(td.leave-history-table__inclusive-date-cell),
.leave-history-table :deep(th.leave-history-table__inclusive-date-cell) {
  white-space: normal;
}

.leave-history-table :deep(.leave-history-table__leave-type-text) {
  display: block;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-align: center;
}

.leave-history-table :deep(.leave-history-table__inclusive-date-text) {
  display: block;
  line-height: 1.35;
  white-space: pre-line;
  text-align: center;
}

.leave-history-table :deep(.leave-history-table__inclusive-date-trigger) {
  min-height: auto;
  padding: 4px 8px;
}

.leave-history-table :deep(.leave-history-table__inclusive-date-trigger .q-btn__content) {
  white-space: normal;
}

@media (max-width: 900px) {
  .employee-details-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .employee-details-header__meta {
    justify-content: flex-start;
    gap: 16px;
    width: 100%;
  }

  .employee-details-leave-credits {
    align-items: flex-start;
  }
}

@media (max-width: 600px) {
  .summary-strip {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin-left: 0;
    margin-right: 0;
    gap: 8px;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }

  .summary-strip__item {
    width: auto;
    min-width: 168px;
    flex: 0 0 168px;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .summary-strip__card {
    border-radius: 10px;
  }

  .summary-strip__card-section {
    padding: 10px 12px;
  }

  .summary-strip__icon {
    margin-right: 8px !important;
    font-size: 20px !important;
  }

  .summary-strip__label {
    font-size: 0.68rem;
    letter-spacing: 0.03em;
  }

  .summary-strip__value {
    margin-top: 2px;
    font-size: 1.4rem !important;
    line-height: 1;
  }

  .employee-records-table :deep(table) {
    min-width: 640px;
  }

  .employee-records-table :deep(th:nth-child(1)),
  .employee-records-table :deep(td:nth-child(1)) {
    width: 300px;
    min-width: 300px;
  }

  .employee-records-table :deep(th:nth-child(2)),
  .employee-records-table :deep(td:nth-child(2)) {
    width: 160px;
    min-width: 160px;
  }

  .employee-records-table :deep(th:nth-child(3)),
  .employee-records-table :deep(td:nth-child(3)) {
    width: 180px;
    min-width: 180px;
  }

  .employee-details-dialog {
    width: min(96vw, 96vw);
    max-width: 96vw;
  }

  .employee-details-header__profile {
    align-items: flex-start;
  }

  .employee-details-header__meta {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .employee-details-header__meta-item {
    min-width: 0;
  }
}
</style>
