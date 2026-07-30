<template>
  <q-dialog v-model="dialogModel" persistent class="hr-edit-dialog">
    <q-card class="hr-edit-card">
      <q-card-section class="hr-edit-header bg-primary text-white">
        <div class="row items-start no-wrap q-gutter-sm">
          <q-avatar size="42px" class="hr-edit-header__icon">
            <q-icon name="edit_note" size="24px" />
          </q-avatar>
          <div class="col">
            <div class="text-h6">{{ editDialogTitle }}</div>
            <div class="text-caption text-white hr-edit-header__caption">
              {{ editDialogCaption }}
            </div>
          </div>
          <q-btn flat dense round icon="close" aria-label="Close edit dialog" @click="dialogModel = false" />
        </div>
      </q-card-section>

      <q-form @submit.prevent="handleSave">
        <q-card-section v-if="formModel && formModel.id" class="hr-edit-content">
          <div class="hr-edit-section">
            <div class="hr-edit-section__title">Application</div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  :model-value="formModel.employeeName"
                  outlined
                  dense
                  label="Employee"
                  readonly
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  :model-value="formModel.leaveTypeLabel"
                  outlined
                  dense
                  label="Leave Type"
                  readonly
                />
              </div>

              <div v-if="!formModel.isMonetization" class="col-12">
                <div class="hr-edit-working-days-layout">
                  <div class="hr-edit-calendar-panel">
                    <div class="hr-edit-calendar-panel__header">
                      <div>
                        <div class="hr-edit-calendar-panel__title">
                          Number of Working Days Applied
                        </div>
                        <div class="hr-edit-calendar-panel__caption">Select Leave Dates</div>
                      </div>
                      <q-badge rounded color="green-1" text-color="green-9">
                        {{ formatDayValue(totalRequestedDays) }} day(s)
                      </q-badge>
                    </div>

                    <div class="hr-edit-calendar-wrapper" @click="handleCalendarClick">
                      <q-date
                        :model-value="formModel.selectedDates"
                        multiple
                        mask="YYYY-MM-DD"
                        color="green-8"
                        minimal
                        flat
                        :default-year-month="calendarDefaultYearMonth"
                        :options="isSelectableWorkingDate"
                        class="hr-edit-working-days-calendar"
                        @navigation="handleCalendarNavigation"
                        @update:model-value="handleSelectedDatesUpdate"
                      />

                      <!-- Floating Mini Dialog Inside Calendar -->
                      <transition name="q-transition--scale">
                        <div
                          v-if="activeBlockedDateWarning"
                          class="hr-edit-calendar-mini-dialog"
                        >
                          <div class="row items-start no-wrap q-gutter-xs">
                            <q-avatar
                              :icon="activeBlockedDateWarning.isEditRequestLocked ? 'lock' : 'warning'"
                              :color="activeBlockedDateWarning.isEditRequestLocked ? 'amber-1' : 'red-1'"
                              :text-color="activeBlockedDateWarning.isEditRequestLocked ? 'amber-9' : 'red-7'"
                              size="30px"
                              class="q-mr-xs"
                            />
                            <div class="col">
                              <div
                                class="text-caption text-weight-bold"
                                :class="activeBlockedDateWarning.isEditRequestLocked ? 'text-amber-9' : 'text-red-9'"
                              >
                                {{ activeBlockedDateWarning.formattedDate }} {{ activeBlockedDateWarning.isEditRequestLocked ? 'Locked' : 'is unavailable:' }}
                              </div>
                              <div class="text-caption text-grey-9 q-mt-xs" style="line-height: 1.35;">
                                <template v-if="activeBlockedDateWarning.isEditRequestLocked">
                                  {{ activeBlockedDateWarning.lockedMessage || 'Date changes are locked for this application.' }}
                                </template>
                                <template v-else>
                                  Employee already has an <strong>{{ activeBlockedDateWarning.status }} {{ activeBlockedDateWarning.leaveType }}</strong> application.
                                </template>
                              </div>
                            </div>
                            <q-btn
                              flat
                              round
                              dense
                              icon="close"
                              size="xs"
                              color="grey-6"
                              @click.stop="activeBlockedDateWarning = null"
                            />
                          </div>
                        </div>
                      </transition>
                    </div>
                  </div>

                  <div class="hr-edit-pay-ledger-panel">
                    <div class="row items-center justify-between q-gutter-sm hr-edit-section__heading">
                      <div>
                        <div class="hr-edit-section__title">Selected Dates</div>
                      </div>
                    </div>

                    <div v-if="crossDeductionInfo" class="hr-edit-cross-deduction-banner q-mb-sm">
                      <q-icon name="swap_horiz" size="20px" color="deep-purple-8" />
                      <div>
                        <span class="text-weight-bold text-deep-purple-9">Cross-Deduction Active:</span>
                        Borrowing
                        <q-badge color="deep-purple-8" text-color="white" class="q-mx-xs text-weight-bold">
                          {{ formatDayValue(crossDeductionInfo.borrowedDays) }} day(s)
                        </q-badge>
                        from <strong>{{ crossDeductionInfo.alternateLeaveTypeLabel }}</strong> to cover
                        <strong>{{ crossDeductionInfo.primaryLeaveTypeLabel }}</strong>.
                      </div>
                    </div>

                    <div v-if="formModel.payStatusRows.length" class="hr-edit-date-grid">
                      <div class="hr-edit-date-grid__head">
                        <div>Date</div>
                        <div>Coverage</div>
                        <div>Pay Status</div>
                        <div>WP</div>
                        <div>W/oP</div>
                      </div>

                      <div
                        v-for="row in formModel.payStatusRows"
                        :key="row.dateKey"
                        class="hr-edit-date-grid__row"
                      >
                        <div class="hr-edit-date-grid__cell hr-edit-date-grid__cell--date" data-label="Date">
                          {{ formatDate(row.dateKey) || row.dateKey }}
                        </div>
                        <div class="hr-edit-date-grid__cell" data-label="Coverage">
                          <q-select
                            :model-value="row.coverageCode"
                            :options="coverageOptions"
                            outlined
                            dense
                            emit-value
                            map-options
                            @update:model-value="updateCoverage(row.dateKey, $event)"
                          />
                        </div>
                        <div class="hr-edit-date-grid__cell" data-label="Pay Status">
                          <q-btn-toggle
                            :model-value="row.payStatus"
                            dense
                            unelevated
                            no-caps
                            :toggle-color="row.payStatus === 'WOP' ? 'negative' : 'positive'"
                            color="grey-2"
                            text-color="grey-8"
                            :options="payStatusOptions"
                            class="hr-edit-pay-toggle"
                            @update:model-value="updatePayStatus(row.dateKey, $event)"
                          />
                        </div>
                        <div
                          class="hr-edit-date-grid__cell hr-edit-date-grid__cell--ledger"
                          :class="{ 'hr-edit-date-grid__cell--inactive': row.payStatus !== 'WP' }"
                          data-label="WP"
                        >
                          <q-input
                            v-if="row.payStatus === 'WP'"
                            :model-value="formatDeductionValue(row.withPayDays)"
                            type="number"
                            step="0.001"
                            min="0"
                            outlined
                            dense
                            class="hr-edit-ledger-input"
                            :class="{ 'hr-edit-ledger-input--wp': row.payStatus === 'WP' }"
                            @update:model-value="updateWithPayDays(row.dateKey, $event)"
                          />
                        </div>
                        <div
                          class="hr-edit-date-grid__cell hr-edit-date-grid__cell--ledger"
                          :class="{ 'hr-edit-date-grid__cell--inactive': row.payStatus !== 'WOP' }"
                          data-label="W/oP"
                        >
                          <q-input
                            v-if="row.payStatus === 'WOP'"
                            :model-value="formatDeductionValue(row.withoutPayDays)"
                            type="number"
                            step="0.001"
                            min="0"
                            outlined
                            dense
                            class="hr-edit-ledger-input"
                            :class="{ 'hr-edit-ledger-input--wop': row.payStatus === 'WOP' }"
                            @update:model-value="updateWithoutPayDays(row.dateKey, $event)"
                          >
                            <q-tooltip>
                              W/oP value appears in the ledger only and does not deduct leave credits
                            </q-tooltip>
                          </q-input>
                        </div>
                      </div>
                    </div>

                    <div v-else class="hr-edit-empty-dates">
                      <q-icon name="event_busy" size="22px" />
                      <span>No leave dates available for this application.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </q-card-section>

        <q-card-actions align="right" class="hr-edit-actions">
          <q-btn flat label="Cancel" :disable="submitLoading" @click="dialogModel = false" />
          <q-btn
            unelevated
            color="primary"
            :label="submitButtonLabel"
            type="submit"
            :loading="submitLoading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth-store'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

import {
  isBlockingLeaveApplication,
  getApplicationBlockingDates,
} from 'src/utils/leave-date-locking'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  application: {
    type: Object,
    default: null,
  },
  allApplications: {
    type: Array,
    default: () => [],
  },
  getActualRequestedDayCount: {
    type: Function,
    default: () => null,
  },
  formatDate: {
    type: Function,
    default: () => '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()
const authStore = useAuthStore()
const formModel = ref(getEmptyEditForm())
const submitLoading = ref(false)
const fetchedApplications = ref([])

async function loadEmployeeApplications() {
  if (!props.application) return
  try {
    const response = await api.get('/hr/leave-applications')
    const list = response?.data?.data || response?.data || []
    if (Array.isArray(list)) {
      fetchedApplications.value = list
    }
  } catch {
    fetchedApplications.value = []
  }
}

const existingApplications = computed(() => {
  const source = props.allApplications?.length ? props.allApplications : fetchedApplications.value
  return Array.isArray(source) ? source : []
})

const blockedDatesSet = computed(() => {
  const dates = new Set()
  const currentAppId = String(props.application?.id || '')
  const currentControlNo = String(
    props.application?.employee_control_no ||
      props.application?.control_no ||
      props.application?.employee?.control_no ||
      '',
  ).trim()

  if (!currentControlNo) return dates

  existingApplications.value.forEach((app) => {
    const appControlNo = String(
      app?.employee_control_no || app?.control_no || app?.employee?.control_no || '',
    ).trim()
    const appId = String(app?.id || '')

    if (
      appControlNo === currentControlNo &&
      appId !== currentAppId &&
      isBlockingLeaveApplication(app)
    ) {
      const blocked = getApplicationBlockingDates(app)
      blocked.forEach((d) => dates.add(d))
    }
  })

  return dates
})

const calendarView = ref({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
})

const activeBlockedDateWarning = ref(null)

function handleCalendarNavigation(view) {
  if (view && view.year && view.month) {
    calendarView.value = {
      year: Number(view.year),
      month: Number(view.month),
    }
  }
}

const blockedDateDetailsMap = computed(() => {
  const map = new Map()
  const currentAppId = String(props.application?.id || '')
  const currentControlNo = String(
    props.application?.employee_control_no ||
      props.application?.control_no ||
      props.application?.employee?.control_no ||
      '',
  ).trim()

  if (!currentControlNo) return map

  existingApplications.value.forEach((app) => {
    const appControlNo = String(
      app?.employee_control_no || app?.control_no || app?.employee?.control_no || '',
    ).trim()
    const appId = String(app?.id || '')

    if (
      appControlNo === currentControlNo &&
      appId !== currentAppId &&
      isBlockingLeaveApplication(app)
    ) {
      const blocked = getApplicationBlockingDates(app)
      const rawStatus = String(app?.status || app?.displayStatus || '').toUpperCase()
      const isApproved = rawStatus.includes('APPROVED')
      const statusLabel = isApproved ? 'Approved' : 'Pending'
      const leaveType = app?.leaveType || app?.leave_type_name || 'Leave'

      blocked.forEach((d) => {
        map.set(d, {
          dateIso: d,
          formattedDate: props.formatDate ? props.formatDate(d) : d,
          status: statusLabel,
          leaveType: leaveType,
          appId: app?.id,
        })
      })
    }
  })

  return map
})

const isEditRequestDateLocked = computed(() => {
  const app = props.application
  if (!app) return false
  const updateStatus = String(
    app?.latest_update_request_status ?? app?.latestUpdateRequestStatus ?? '',
  ).toUpperCase()
  if (updateStatus === 'APPROVED' || updateStatus === 'PENDING') return true

  const badgeLabel = String(
    app?.edit_request_badge_label ?? app?.latest_update_request_badge_label ?? app?.displayStatus ?? '',
  ).toUpperCase()
  return (
    badgeLabel.includes('EDIT REQUEST') ||
    badgeLabel.includes('UPDATE REQUEST') ||
    badgeLabel.includes('CANCEL REQUEST') ||
    badgeLabel.includes('RECALL REQUEST')
  )
})

const lockedReasonMessage = computed(() => {
  const app = props.application
  const updateStatus = String(
    app?.latest_update_request_status ?? app?.latestUpdateRequestStatus ?? '',
  ).toUpperCase()
  if (updateStatus === 'PENDING') {
    return 'This application has an Edit Request in progress. Date modifications are locked to prevent conflicts.'
  }
  return 'This application has an Approved Edit Request. Dates can no longer be modified.'
})

function handleCalendarClick(event) {
  if (isEditRequestDateLocked.value) {
    activeBlockedDateWarning.value = {
      formattedDate: 'Date Modification',
      isEditRequestLocked: true,
      lockedMessage: lockedReasonMessage.value,
    }
    return
  }

  const dayCell = event.target?.closest?.('.q-date__calendar-item')
  if (!dayCell || dayCell.classList.contains('q-date__calendar-item--fill')) return

  const day = Number.parseInt(String(dayCell.textContent || '').trim(), 10)
  if (!Number.isInteger(day) || day < 1 || day > 31) return

  const dateIso = `${calendarView.value.year}-${String(calendarView.value.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const conflict = blockedDateDetailsMap.value.get(dateIso)

  if (conflict) {
    activeBlockedDateWarning.value = conflict
  } else {
    activeBlockedDateWarning.value = null
  }
}

const payStatusOptions = [
  { label: 'WP', value: 'WP' },
  { label: 'WOP', value: 'WOP' },
]

const coverageOptions = [
  { label: 'Whole Day', value: 'whole' },
  { label: 'Half Day (AM)', value: 'half_am' },
  { label: 'Half Day (PM)', value: 'half_pm' },
]

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isHrAdmin = computed(() => Boolean(authStore.user?.is_access_control_owner))

const editDialogTitle = computed(() =>
  isHrAdmin.value ? 'Edit Application' : 'Request Application Edit',
)

const editDialogCaption = computed(() =>
  isHrAdmin.value
    ? 'Direct HR Admin correction preview'
    : 'HR Staff correction request preview',
)

const submitButtonLabel = computed(() =>
  isHrAdmin.value ? 'Apply Changes' : 'Submit Request',
)

const calendarDefaultYearMonth = computed(() => {
  const anchorDate =
    formModel.value.selectedDates[0] ||
    formModel.value.startDate ||
    toIsoDate(new Date())
  const isoDate = toIsoDate(anchorDate) || toIsoDate(new Date())
  const [year, month] = isoDate.split('-')

  return `${year}/${month}`
})

const totalRequestedDays = computed(() =>
  sumRowsByStatus(formModel.value.payStatusRows, () => true),
)

const crossDeductionInfo = computed(() => {
  if (!props.application || !formModel.value.payStatusRows.length) return null
  const checkResult = checkLeaveBalanceSufficiency(
    props.application,
    formModel.value.payStatusRows,
  )
  if (checkResult.ok && checkResult.requiresCrossDeduction) {
    return {
      borrowedDays: checkResult.projectedAlternateDeductionDays,
      alternateLeaveTypeLabel: checkResult.alternateLeaveTypeLabel,
      primaryLeaveTypeLabel: String(
        props.application?.leaveType ||
          props.application?.leave_type_name ||
          props.application?.leave_type?.name ||
          'Leave',
      ).trim(),
    }
  }
  return null
})

watch(
  () => [props.modelValue, props.application],
  () => {
    if (!props.modelValue) return
    formModel.value = buildFormFromApplication(props.application)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      activeBlockedDateWarning.value = null
      loadEmployeeApplications()
      return
    }
    activeBlockedDateWarning.value = null
    formModel.value = getEmptyEditForm()
  },
)

function handleSelectedDatesUpdate(value) {
  const selectedDates = normalizeSelectedDates(Array.isArray(value) ? value : value ? [value] : [])

  const payStatusRows = buildPayStatusRows(
    props.application,
    selectedDates,
    formModel.value.payStatusRows,
  )

  formModel.value = {
    ...formModel.value,
    selectedDates,
    startDate: selectedDates[0] || '',
    endDate: selectedDates[selectedDates.length - 1] || '',
    payStatusRows,
    totalDays: sumRowsByStatus(payStatusRows, () => true),
  }
}

async function updatePayStatus(dateKey, value) {
  const targetRow = formModel.value.payStatusRows.find((row) => row.dateKey === dateKey)
  if (!targetRow) return

  const currentPayStatus = normalizePayStatusCode(targetRow.payStatus)
  const nextPayStatus = normalizePayStatusCode(value)

  if (currentPayStatus === nextPayStatus) return

  const formattedDate = props.formatDate(dateKey) || dateKey

  let title = nextPayStatus === 'WOP' ? 'Set date to WOP?' : 'Set date to WP?'
  let message = `${formattedDate} will be marked as ${
    nextPayStatus === 'WOP' ? 'without pay (WOP)' : 'with pay (WP)'
  }. Do you want to continue?`
  let okColor = nextPayStatus === 'WOP' ? 'negative' : 'primary'
  let okLabel = `Yes, set ${nextPayStatus}`

  if (nextPayStatus === 'WP') {
    const projectedRows = formModel.value.payStatusRows.map((row) =>
      row.dateKey === dateKey ? buildPayStatusUpdatedRow(row, nextPayStatus) : row,
    )
    const checkResult = checkLeaveBalanceSufficiency(props.application, projectedRows)

    if (!checkResult.ok) {
      $q.notify({
        type: 'negative',
        message: checkResult.reason || 'Insufficient leave balance for With Pay status.',
        position: 'top',
      })
      return
    }

    if (checkResult.requiresCrossDeduction) {
      title = 'Keep Leave With Pay?'
      message = `${formatDayValue(
        checkResult.projectedAlternateDeductionDays,
      )} day(s) will be deducted from ${
        checkResult.alternateLeaveTypeLabel
      } to keep this date with pay. Continue?`
      okColor = 'primary'
      okLabel = 'Continue'
    }
  }

  const confirmed = await new Promise((resolve) => {
    $q.dialog({
      title,
      message,
      ok: { label: okLabel, color: okColor, unelevated: true },
      cancel: { label: 'Cancel', flat: true },
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
      .onDismiss(() => resolve(false))
  })

  if (!confirmed) return

  formModel.value = {
    ...formModel.value,
    payStatusRows: formModel.value.payStatusRows.map((row) =>
      row.dateKey === dateKey ? buildPayStatusUpdatedRow(row, nextPayStatus) : row,
    ),
  }
}

function updateCoverage(dateKey, value) {
  const nextCoverageCode = normalizeCoverageCode(value)

  formModel.value = {
    ...formModel.value,
    payStatusRows: formModel.value.payStatusRows.map((row) =>
      row.dateKey === dateKey
        ? buildCoverageUpdatedRow(row, nextCoverageCode)
        : row,
    ),
  }
}

function updateWithPayDays(dateKey, value) {
  formModel.value = {
    ...formModel.value,
    payStatusRows: formModel.value.payStatusRows.map((row) =>
      row.dateKey === dateKey
        ? {
            ...row,
            withPayDays: normalizeDeductionValue(value),
            deductionDays: normalizeDeductionValue(value),
          }
        : row,
    ),
  }
}

function updateWithoutPayDays(dateKey, value) {
  formModel.value = {
    ...formModel.value,
    payStatusRows: formModel.value.payStatusRows.map((row) =>
      row.dateKey === dateKey
        ? { ...row, withoutPayDays: normalizeDeductionValue(value) }
        : row,
    ),
  }
}

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
    selectedDates: [],
    payStatusRows: [],
    hasPendingUpdateRequest: false,
  }
}

function getPendingUpdatePayload(app) {
  const candidates = [
    app?.pending_update,
    app?.pendingUpdate,
    app?.raw?.pending_update,
    app?.raw?.pendingUpdate,
    app?.latest_update_request_payload,
    app?.latestUpdateRequestPayload,
    app?.raw?.latest_update_request_payload,
    app?.raw?.latestUpdateRequestPayload,
  ]

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
      // Ignore
    }
  }

  return null
}

function resolveEditSourceApplication(application) {
  if (!application || typeof application !== 'object') return application
  const payload = getPendingUpdatePayload(application)
  if (!payload || typeof payload !== 'object') return application

  return {
    ...application,
    ...payload,
    id: application.id,
    employeeName: application.employeeName || application.employee_name,
    employee_name: application.employee_name || application.employeeName,
    leaveType: application.leaveType || application.leave_type_name,
    leave_type_name: application.leave_type_name || application.leaveType,
    has_pending_update_request: true,
  }
}

function buildFormFromApplication(application) {
  const form = getEmptyEditForm()
  if (!application || typeof application !== 'object') return form

  const source = resolveEditSourceApplication(application)

  const selectedDates = normalizeSelectedDates(
    source?.selected_dates ?? source?.selectedDates,
  )
  const startDate = toIsoDate(source?.startDate ?? source?.start_date) || selectedDates[0] || ''
  const endDate =
    toIsoDate(source?.endDate ?? source?.end_date) || selectedDates[selectedDates.length - 1] || ''
  const preservedDates = selectedDates.length
    ? selectedDates
    : buildDateRange(startDate, endDate)
  const payStatusRows = buildPayStatusRows(source, preservedDates)
  const parsedDays =
    props.getActualRequestedDayCount(source) ??
    Number(source?.days ?? source?.total_days ?? source?.duration_value)

  return {
    id: application?.id ?? '',
    employeeName: application?.employeeName || application?.employee_name || '',
    leaveTypeLabel: `${source?.leaveType || source?.leave_type_name || ''}${
      source?.is_monetization ? ' (Monetization)' : ''
    }`,
    leaveTypeId: source?.leave_type_id ?? application?.leave_type_id ?? null,
    isMonetization: Boolean(source?.is_monetization ?? application?.is_monetization),
    startDate,
    endDate,
    originalStartDate: startDate,
    originalEndDate: endDate,
    totalDays:
      Number.isFinite(parsedDays) && parsedDays > 0
        ? parsedDays
        : sumRowsByStatus(payStatusRows, () => true),
    selectedDates: preservedDates,
    payStatusRows,
    hasPendingUpdateRequest: Boolean(source?.has_pending_update_request),
  }
}

function buildPayStatusRows(application, selectedDates, previousRows = []) {
  const previousRowsByDate = new Map(
    (Array.isArray(previousRows) ? previousRows : []).map((row) => [row.dateKey, row]),
  )
  const payStatusMap = normalizeMapKeysWithIsoAlias(
    toValueMap(application?.selected_date_pay_status ?? application?.selectedDatePayStatus, normalizePayStatusCode),
  )
  const coverageMap = normalizeMapKeysWithIsoAlias(
    toValueMap(application?.selected_date_coverage ?? application?.selectedDateCoverage, normalizeCoverageCode),
  )
  const halfDayPortionMap = normalizeMapKeysWithIsoAlias(
    toValueMap(
      application?.selected_date_half_day_portion ??
        application?.selectedDateHalfDayPortion ??
        application?.selected_date_half_day_period ??
        application?.selectedDateHalfDayPeriod,
      normalizeHalfDayPortion,
    ),
  )
  const fallbackStatus = normalizePayStatusCode(application?.pay_mode)

  return (Array.isArray(selectedDates) ? selectedDates : []).map((dateValue, index) => {
    const dateKey = toIsoDate(dateValue) || String(dateValue || '').trim()
    const previousRow = previousRowsByDate.get(dateKey)
    const sourceCoverageCode =
      previousRow?.coverageCode ||
      coverageMap[dateKey] ||
      coverageMap[String(index)] ||
      coverageMap[String(index + 1)] ||
      'whole'
    const halfDayPortion =
      previousRow?.halfDayPortion ||
      halfDayPortionMap[dateKey] ||
      halfDayPortionMap[String(index)] ||
      halfDayPortionMap[String(index + 1)] ||
      ''
    const coverageCode = resolveCoverageCode(sourceCoverageCode, halfDayPortion)
    const payStatus =
      previousRow?.payStatus ||
      payStatusMap[dateKey] ||
      payStatusMap[String(index)] ||
      payStatusMap[String(index + 1)] ||
      fallbackStatus
    const coverageWeight = getCoverageWeight(coverageCode)
    const defaultWithPayDays = payStatus === 'WP' ? coverageWeight : 0
    const defaultWithoutPayDays = payStatus === 'WOP' ? coverageWeight : 0
    const withPayDays = normalizeDeductionValue(
      previousRow?.withPayDays ??
        previousRow?.deductionDays ??
        application?.deductible_days_by_date?.[dateKey] ??
        application?.selected_date_deduction?.[dateKey],
      defaultWithPayDays,
    )
    const withoutPayDays = normalizeDeductionValue(
      previousRow?.withoutPayDays ??
        application?.without_pay_days_by_date?.[dateKey] ??
        application?.wop_days_by_date?.[dateKey] ??
        application?.selected_date_without_pay?.[dateKey] ??
        application?.selected_date_wop?.[dateKey],
      defaultWithoutPayDays,
    )

    const resolvedPayStatus =
      withoutPayDays > 0 && withPayDays === 0
        ? 'WOP'
        : withPayDays > 0 && withoutPayDays === 0
          ? 'WP'
          : payStatus

    return {
      dateKey,
      coverageCode,
      coverageWeight,
      coverageLabel: getCoverageLabel(coverageCode),
      halfDayPortion: getCoverageHalfDayPortion(coverageCode),
      payStatus: resolvedPayStatus,
      withPayDays,
      withoutPayDays,
      deductionDays: withPayDays,
    }
  })
}

function toIsoDate(value) {
  if (value instanceof Date) {
    return formatIsoDate(value)
  }

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

function normalizeSelectedDates(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((date) => toIsoDate(date)).filter(Boolean))].sort()
}

function isSelectableWorkingDate(value) {
  if (isEditRequestDateLocked.value) {
    return false
  }
  const isoDate = toIsoDate(value)
  if (!isoDate) return false
  return !blockedDatesSet.value.has(isoDate)
}

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDateRange(startDate, endDate) {
  if (!startDate || !endDate) return []
  if (endDate < startDate) return []

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

  const dates = []
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(formatIsoDate(cursor))
  }
  return dates
}

function toValueMap(value, normalizer) {
  const parsed = parseJsonCandidate(value)

  if (Array.isArray(parsed)) {
    return parsed.reduce((acc, entry, index) => {
      const normalized = normalizer(entry)
      if (normalized) acc[String(index)] = normalized
      return acc
    }, {})
  }

  if (parsed && typeof parsed === 'object') {
    return Object.entries(parsed).reduce((acc, [key, entry]) => {
      const normalized = normalizer(entry)
      if (normalized) acc[String(key)] = normalized
      return acc
    }, {})
  }

  return {}
}

function parseJsonCandidate(value) {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  if (!trimmed) return {}

  try {
    return JSON.parse(trimmed)
  } catch {
    return {}
  }
}

function normalizeMapKeysWithIsoAlias(source) {
  return Object.entries(source || {}).reduce((acc, [key, value]) => {
    const normalizedKey = String(key || '').trim()
    if (!normalizedKey) return acc

    acc[normalizedKey] = value
    const isoKey = toIsoDate(normalizedKey)
    if (isoKey) acc[isoKey] = value
    return acc
  }, {})
}

function normalizePayStatusCode(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '')

  if (normalized === 'WOP' || normalized === 'WITHOUTPAY') return 'WOP'
  return 'WP'
}

function normalizeCoverageCode(value) {
  if (value && typeof value === 'object') {
    return normalizeCoverageCode(
      value.coverage ??
        value.value ??
        value.code ??
        value.type ??
        value.day ??
        value.portion,
    )
  }

  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) {
    return numericValue <= 0.5 ? 'half_am' : 'whole'
  }

  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (normalized.includes('pm')) return 'half_pm'
  if (normalized.includes('am')) return 'half_am'
  if (normalized.includes('half') || normalized === '0.5') return 'half_am'
  return 'whole'
}

function normalizeHalfDayPortion(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()

  if (normalized === 'AM' || normalized.includes('MORNING')) return 'AM'
  if (normalized === 'PM' || normalized.includes('AFTERNOON')) return 'PM'
  return ''
}

function resolveCoverageCode(coverageCode, halfDayPortion = '') {
  const normalizedCoverageCode = normalizeCoverageCode(coverageCode)
  if (normalizedCoverageCode === 'whole') return 'whole'

  const normalizedPortion = normalizeHalfDayPortion(halfDayPortion)
  return normalizedPortion === 'PM' ? 'half_pm' : 'half_am'
}

function getCoverageWeight(value) {
  return normalizeCoverageCode(value) === 'whole' ? 1 : 0.5
}

function getCoverageLabel(value) {
  const normalizedCoverageCode = normalizeCoverageCode(value)
  if (normalizedCoverageCode === 'half_am') return 'Half Day (AM)'
  if (normalizedCoverageCode === 'half_pm') return 'Half Day (PM)'
  return 'Whole Day'
}

function getCoverageHalfDayPortion(value) {
  const normalizedCoverageCode = normalizeCoverageCode(value)
  if (normalizedCoverageCode === 'half_am') return 'AM'
  if (normalizedCoverageCode === 'half_pm') return 'PM'
  return ''
}

function getRowDayWeight(row) {
  const numericWeight = Number(row?.coverageWeight)
  if (Number.isFinite(numericWeight) && numericWeight > 0) return numericWeight
  return getCoverageWeight(row?.coverageCode)
}

function getRowWithPayLedgerValue(row) {
  return normalizeDeductionValue(row?.withPayDays ?? row?.deductionDays)
}

function getRowWithoutPayLedgerValue(row) {
  return normalizeDeductionValue(row?.withoutPayDays)
}

function sumRowsByStatus(rows, predicate) {
  const total = (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    if (!predicate(row)) return sum
    return sum + getRowDayWeight(row)
  }, 0)

  return Math.round(total * 1000) / 1000
}

function normalizeDeductionValue(value, fallback = 0) {
  const numericValue = Number(value)
  if (Number.isFinite(numericValue) && numericValue >= 0) {
    return Math.round(numericValue * 1000) / 1000
  }

  const fallbackValue = Number(fallback)
  if (Number.isFinite(fallbackValue) && fallbackValue >= 0) {
    return Math.round(fallbackValue * 1000) / 1000
  }

  return 0
}

function buildCoverageUpdatedRow(row, coverageCode) {
  const previousCoverageWeight = getRowDayWeight(row)
  const previousWithPayDays = getRowWithPayLedgerValue(row)
  const previousWithoutPayDays = getRowWithoutPayLedgerValue(row)
  const nextCoverageCode = normalizeCoverageCode(coverageCode)
  const nextCoverageWeight = getCoverageWeight(nextCoverageCode)
  const shouldSyncWithPayDays =
    Math.abs(previousWithPayDays - previousCoverageWeight) < 0.0001 ||
    previousWithPayDays === 0
  const shouldSyncWithoutPayDays =
    Math.abs(previousWithoutPayDays - previousCoverageWeight) < 0.0001 ||
    previousWithoutPayDays === 0
  const withPayDays =
    row?.payStatus === 'WP' && shouldSyncWithPayDays
      ? nextCoverageWeight
      : previousWithPayDays
  const withoutPayDays =
    row?.payStatus === 'WOP' && shouldSyncWithoutPayDays
      ? nextCoverageWeight
      : previousWithoutPayDays

  return {
    ...row,
    coverageCode: nextCoverageCode,
    coverageWeight: nextCoverageWeight,
    coverageLabel: getCoverageLabel(nextCoverageCode),
    halfDayPortion: getCoverageHalfDayPortion(nextCoverageCode),
    withPayDays,
    withoutPayDays,
    deductionDays: withPayDays,
  }
}

function buildPayStatusUpdatedRow(row, payStatus) {
  const rowWeight = getRowDayWeight(row)
  const currentWithPayDays = getRowWithPayLedgerValue(row)
  const currentWithoutPayDays = getRowWithoutPayLedgerValue(row)
  const nextWithPayDays =
    payStatus === 'WP'
      ? currentWithPayDays || currentWithoutPayDays || rowWeight
      : 0
  const nextWithoutPayDays =
    payStatus === 'WOP'
      ? currentWithoutPayDays || currentWithPayDays || rowWeight
      : 0

  return {
    ...row,
    payStatus,
    withPayDays: nextWithPayDays,
    withoutPayDays: nextWithoutPayDays,
    deductionDays: nextWithPayDays,
  }
}

function formatDayValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0.000'
  return numericValue.toFixed(3)
}

function formatDeductionValue(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '0.000'
  return numericValue.toFixed(3)
}

function normalizeLeaveBalanceKey(name = '') {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function getBalanceFromApp(app, leaveTypeLabel) {
  const targetKey = normalizeLeaveBalanceKey(leaveTypeLabel)
  if (!targetKey || !app) return null

  const isSick = targetKey === normalizeLeaveBalanceKey('Sick Leave')
  const isVacation = targetKey === normalizeLeaveBalanceKey('Vacation Leave')

  if (isSick) {
    const directVal = Number(app?.sl_balance ?? app?.sick_leave_balance ?? app?.sickLeaveBalance)
    if (Number.isFinite(directVal)) return directVal
  }

  if (isVacation) {
    const directVal = Number(app?.vl_balance ?? app?.vacation_leave_balance ?? app?.vacationLeaveBalance)
    if (Number.isFinite(directVal)) return directVal
  }

  let sources = Array.isArray(app?.leave_balances)
    ? app.leave_balances
    : Array.isArray(app?.leaveBalances)
      ? app.leaveBalances
      : Array.isArray(app?.employee_leave_balances)
        ? app.employee_leave_balances
        : []

  if (!sources.length && app?.certificationLeaveCredits && typeof app.certificationLeaveCredits === 'object') {
    sources = Object.values(app.certificationLeaveCredits)
  }

  for (const item of sources) {
    if (!item || typeof item !== 'object') continue
    const itemKey = normalizeLeaveBalanceKey(
      item?.leave_type_name || item?.leaveTypeName || item?.name || item?.leave_type?.name || item?.label,
    )
    if (itemKey === targetKey) {
      const val = Number(
        item?.available_balance ??
          item?.available_balance_days ??
          item?.balance_after_application ??
          item?.balance ??
          item?.remaining_balance,
      )
      if (Number.isFinite(val)) return val
    }
  }

  // Secondary fallback if sick/vacation bucket exists in certificationLeaveCredits
  if (isSick && app?.certificationLeaveCredits?.sick) {
    const val = Number(
      app.certificationLeaveCredits.sick.available_balance ??
        app.certificationLeaveCredits.sick.balance ??
        app.certificationLeaveCredits.sick.balance_after_application,
    )
    if (Number.isFinite(val)) return val
  }

  if (isVacation && app?.certificationLeaveCredits?.vacation) {
    const val = Number(
      app.certificationLeaveCredits.vacation.available_balance ??
        app.certificationLeaveCredits.vacation.balance ??
        app.certificationLeaveCredits.vacation.balance_after_application,
    )
    if (Number.isFinite(val)) return val
  }

  return null
}

function resolveSlVlCrossDeductionContext(app) {
  if (!app || typeof app !== 'object') return null
  const leaveTypeLabel = String(
    app?.leaveType || app?.leave_type_name || app?.leave_type?.name || '',
  ).trim()
  const normKey = normalizeLeaveBalanceKey(leaveTypeLabel)

  const rawPrimaryBalance = getBalanceFromApp(app, leaveTypeLabel)
  if (!Number.isFinite(rawPrimaryBalance)) return null

  const currentAppDeduction = Number(app?.deductible_days ?? app?.days ?? app?.duration_value ?? app?.total_days ?? 0)
  const primaryAvailableBalance = Math.max(
    rawPrimaryBalance + (Number.isFinite(currentAppDeduction) && currentAppDeduction > 0 ? currentAppDeduction : 0),
    0,
  )

  if (normKey === normalizeLeaveBalanceKey('Sick Leave')) {
    const alternateAvailableBalance = getBalanceFromApp(app, 'Vacation Leave')
    if (!Number.isFinite(alternateAvailableBalance)) return null
    return {
      primaryAvailableBalance,
      alternateAvailableBalance,
      alternateLeaveTypeLabel: 'Vacation Leave',
    }
  }

  if (normKey === normalizeLeaveBalanceKey('Vacation Leave')) {
    const alternateAvailableBalance = getBalanceFromApp(app, 'Sick Leave')
    if (!Number.isFinite(alternateAvailableBalance)) return null
    return {
      primaryAvailableBalance,
      alternateAvailableBalance,
      alternateLeaveTypeLabel: 'Sick Leave',
    }
  }

  return null
}

function checkLeaveBalanceSufficiency(app, payStatusRows) {
  if (!app || typeof app !== 'object') return { ok: true }

  const leaveTypeLabel = String(
    app?.leaveType || app?.leave_type_name || app?.leave_type?.name || '',
  ).trim()

  const rawPrimaryAvailableBalance = getBalanceFromApp(app, leaveTypeLabel)
  const currentAppDeduction = Number(app?.deductible_days ?? app?.days ?? app?.duration_value ?? app?.total_days ?? 0)
  const primaryAvailableBalance = Number.isFinite(rawPrimaryAvailableBalance)
    ? Math.max(
        rawPrimaryAvailableBalance +
          (Number.isFinite(currentAppDeduction) && currentAppDeduction > 0 ? currentAppDeduction : 0),
        0,
      )
    : null

  const totalWpDays = (payStatusRows || []).reduce((sum, row) => {
    if (normalizePayStatusCode(row.payStatus) !== 'WP') return sum
    const weight = Number(row.withPayDays ?? row.deductionDays ?? row.coverageWeight)
    return sum + (Number.isFinite(weight) && weight > 0 ? weight : 0)
  }, 0)

  if (totalWpDays <= 1e-9) return { ok: true }
  if (!Number.isFinite(primaryAvailableBalance)) return { ok: true }

  if (primaryAvailableBalance + 1e-9 >= totalWpDays) {
    return { ok: true, requiresCrossDeduction: false }
  }

  const crossContext = resolveSlVlCrossDeductionContext(app)
  if (crossContext) {
    const primaryBal = Math.max(crossContext.primaryAvailableBalance, 0)
    const alternateBal = Math.max(crossContext.alternateAvailableBalance, 0)
    const combinedBalance = Math.round((primaryBal + alternateBal) * 1000) / 1000
    const neededFromAlternate = Math.round((totalWpDays - primaryBal) * 1000) / 1000

    if (totalWpDays > combinedBalance + 1e-9) {
      return {
        ok: false,
        reason: `Insufficient balance in both ${leaveTypeLabel} (${formatDayValue(primaryBal)}) and ${crossContext.alternateLeaveTypeLabel} (${formatDayValue(alternateBal)}). Combined available balance is ${formatDayValue(combinedBalance)} day(s), but ${formatDayValue(totalWpDays)} day(s) are set to With Pay.`,
      }
    }

    return {
      ok: true,
      requiresCrossDeduction: true,
      projectedAlternateDeductionDays: neededFromAlternate,
      alternateLeaveTypeLabel: crossContext.alternateLeaveTypeLabel,
    }
  }

  return {
    ok: false,
    reason: `Insufficient balance for ${leaveTypeLabel}. Available balance is ${formatDayValue(primaryAvailableBalance)} day(s), but ${formatDayValue(totalWpDays)} day(s) are set to With Pay.`,
  }
}

function buildEditPayload(allowCrossDeduction = false) {
  const payStatusRows = (formModel.value.payStatusRows || []).map((row) => ({
    date_key: row.dateKey,
    coverage_code: row.coverageCode,
    half_day_portion: row.halfDayPortion || getCoverageHalfDayPortion(row.coverageCode),
    pay_status: normalizePayStatusCode(row.payStatus),
    with_pay_days: normalizeDeductionValue(row.withPayDays),
    without_pay_days: normalizeDeductionValue(row.withoutPayDays),
  }))

  return {
    selected_dates: [...(formModel.value.selectedDates || [])],
    pay_status_rows: payStatusRows,
    allow_sl_vl_cross_deduction: Boolean(allowCrossDeduction),
  }
}

async function handleSave() {
  if (!formModel.value.id) return

  if (!formModel.value.payStatusRows.length) {
    $q.notify({
      type: 'warning',
      message: 'Please add at least one leave date.',
      position: 'top',
    })
    return
  }

  const checkResult = checkLeaveBalanceSufficiency(
    props.application,
    formModel.value.payStatusRows,
  )

  if (!checkResult.ok) {
    $q.notify({
      type: 'negative',
      message: checkResult.reason || 'Insufficient leave balance for With Pay status.',
      position: 'top',
    })
    return
  }

  const allowCrossDeduction = Boolean(checkResult.requiresCrossDeduction)

  submitLoading.value = true
  try {
    const response = await api.post(
      `/hr/leave-applications/${encodeURIComponent(formModel.value.id)}/edit`,
      buildEditPayload(allowCrossDeduction),
    )
    const message = String(response?.data?.message || '').trim()

    $q.notify({
      type: 'positive',
      message:
        message ||
        (isHrAdmin.value
          ? 'Application edit applied successfully.'
          : 'Application edit request submitted.'),
      position: 'top',
    })

    dialogModel.value = false
    emit('saved', {
      actionType: isHrAdmin.value ? 'edit' : 'edit-request',
      applicationId: formModel.value.id,
      application: response?.data?.application || props.application,
      editRequest: response?.data?.edit_request || null,
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save this application edit right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    submitLoading.value = false
  }
}
</script>

<!-- Unscoped: q-dialog teleports to <body>, so scoped styles will not reliably apply -->
<style>
.hr-edit-pending-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.84rem;
  color: #166534;
}

.hr-edit-dialog .q-dialog__inner--minimized {
  padding: 16px;
}

.hr-edit-dialog .q-dialog__inner--minimized > div {
  width: min(1180px, calc(100vw - 32px));
  max-width: min(1180px, calc(100vw - 32px));
}

.hr-edit-card {
  width: 100%;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hr-edit-header {
  flex: 0 0 auto;
  padding: 16px 20px;
}

.hr-edit-header__icon {
  background: rgba(255, 255, 255, 0.16);
}

.hr-edit-header__caption {
  opacity: 0.86;
}

.hr-edit-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 18px 20px 8px;
}

.hr-edit-section {
  padding: 14px 0;
  border-top: 1px solid #edf0f4;
}

.hr-edit-section:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.hr-edit-section__heading {
  margin-bottom: 10px;
}

.hr-edit-section__title {
  font-size: 0.86rem;
  font-weight: 800;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

.hr-edit-working-days-layout {
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.hr-edit-calendar-panel {
  width: 100%;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background: #ffffff;
  padding: 10px;
}

.hr-edit-calendar-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.hr-edit-calendar-panel__title {
  color: #111827;
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.25;
}

.hr-edit-calendar-panel__caption {
  color: #374151;
  font-size: 0.74rem;
  font-weight: 700;
  margin-top: 14px;
}

.hr-edit-working-days-calendar {
  width: 100%;
  min-width: 0 !important;
  box-shadow: none;
}

.hr-edit-working-days-calendar.q-date,
.hr-edit-working-days-calendar .q-date {
  width: 100%;
  min-width: 0 !important;
  box-shadow: none;
}

.hr-edit-working-days-calendar .q-date__header {
  display: none;
}

.hr-edit-working-days-calendar .q-date__content {
  width: 100%;
}

.hr-edit-working-days-calendar .q-date__navigation {
  min-height: 30px;
  padding: 0 2px;
  margin-bottom: 4px;
}

.hr-edit-working-days-calendar .q-date__navigation .q-btn {
  min-height: 26px;
  padding: 2px 4px;
}

.hr-edit-working-days-calendar .q-date__navigation .q-btn__content {
  font-size: 0.8rem;
  font-weight: 500;
}

.hr-edit-working-days-calendar .q-date__calendar-weekdays {
  color: #9ca3af;
  font-size: 0.68rem;
  font-weight: 500;
}

.hr-edit-working-days-calendar .q-date__calendar-item {
  height: 28px;
  padding: 0;
}

.hr-edit-working-days-calendar .q-date__calendar-item > div,
.hr-edit-working-days-calendar .q-date__calendar-item .q-btn {
  min-width: 24px;
  height: 24px;
  border-radius: 999px !important;
}

.hr-edit-working-days-calendar .q-date__calendar-item--out {
  opacity: 0.35;
}

.hr-edit-pay-ledger-panel {
  flex: 1 1 auto;
  min-width: 0;
  padding-top: 4px;
}

.hr-edit-date-grid {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.hr-edit-date-grid__head,
.hr-edit-date-grid__row {
  display: grid;
  grid-template-columns:
    minmax(104px, 0.9fr) minmax(108px, 0.9fr) minmax(120px, 0.85fr)
    minmax(90px, 0.72fr) minmax(90px, 0.72fr);
  align-items: center;
  min-width: 0;
}

.hr-edit-date-grid__head {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.hr-edit-date-grid__row {
  border-bottom: 1px solid #eef2f7;
}

.hr-edit-date-grid__row:last-child {
  border-bottom: 0;
}

.hr-edit-date-grid__head > div,
.hr-edit-date-grid__cell {
  min-width: 0;
  padding: 8px;
}

.hr-edit-date-grid__cell--date {
  font-weight: 700;
  color: #1f2937;
}

.hr-edit-date-grid__cell--inactive {
  min-height: 32px;
}

.hr-edit-cross-deduction-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(103, 58, 183, 0.09) 0%, rgba(103, 58, 183, 0.04) 100%);
  border: 1px solid rgba(103, 58, 183, 0.25);
  color: #311b92;
  font-size: 0.84rem;
  line-height: 1.4;
}

.hr-edit-pay-toggle {
  border-radius: 6px;
}

.hr-edit-pay-toggle .q-btn {
  min-width: 48px;
}

.hr-edit-pay-toggle .bg-negative {
  background: #c10015 !important;
  color: #ffffff !important;
}

.hr-edit-pay-toggle .bg-positive {
  background: #21ba45 !important;
  color: #ffffff !important;
}

.hr-edit-date-grid .q-field {
  min-width: 0;
}

.hr-edit-ledger-input .q-field__control {
  min-height: 32px;
  background: #f8fafc;
}

.hr-edit-ledger-input .q-field__native {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.hr-edit-ledger-input--wp .q-field__control {
  background: #f0fdf4;
}

.hr-edit-ledger-input--wp .q-field__native {
  color: #15803d;
}

.hr-edit-ledger-input--wop .q-field__control {
  background: #fff5f5;
}

.hr-edit-ledger-input--wop .q-field__native {
  color: #b91c1c;
}

.hr-edit-empty-dates {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 14px;
  color: #64748b;
  background: #f8fafc;
}

.hr-edit-actions {
  flex: 0 0 auto;
  padding: 12px 20px 18px;
  border-top: 1px solid #edf0f4;
}

@media (max-width: 780px) {
  .hr-edit-dialog .q-dialog__inner--minimized {
    padding: 10px;
  }

  .hr-edit-dialog .q-dialog__inner--minimized > div {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
  }

  .hr-edit-header {
    padding: 14px 16px;
  }

  .hr-edit-content {
    padding: 14px 14px 6px;
  }

  .hr-edit-working-days-layout {
    grid-template-columns: 1fr;
  }

  .hr-edit-calendar-panel,
  .hr-edit-pay-ledger-panel {
    width: 100%;
  }

  .hr-edit-date-grid__head,
  .hr-edit-date-grid__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hr-edit-date-grid {
    border: 0;
    overflow: visible;
  }

  .hr-edit-date-grid__head {
    display: none;
  }

  .hr-edit-date-grid__row {
    gap: 8px;
    align-items: start;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 10px;
  }

  .hr-edit-date-grid__row:last-child {
    margin-bottom: 0;
  }

  .hr-edit-date-grid__cell {
    padding: 0;
  }

  .hr-edit-date-grid__cell::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 4px;
    color: #64748b;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .hr-edit-date-grid__cell--date {
    grid-column: 1 / -1;
  }

  .hr-edit-date-grid__cell--inactive {
    display: none;
  }
}

.hr-edit-approved-locked-banner {
  display: flex;
  align-items: center;
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 10px 14px;
}

.hr-edit-calendar-wrapper {
  position: relative;
}

.hr-edit-calendar-mini-dialog {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  z-index: 20;
  background: #ffffff;
  border: 1.5px solid #fca5a5;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  animation: miniDialogPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes miniDialogPop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
