<template>
  <q-dialog
    v-model="dialogModel"
    persistent
    position="standard"
    class="hr-application-details-dialog"
  >
    <q-card
      v-if="application"
      class="hr-application-details-card"
      style="width: min(700px, calc(100vw - 28px)); max-width: min(700px, calc(100vw - 28px));"
    >
      <div class="hr-application-details-accent" />
      <q-card-section class="row items-start no-wrap hr-application-details-header">
        <div class="hr-application-details-header-main">
          <q-avatar size="46px" class="hr-application-details-icon">
            <q-icon name="description" size="24px" />
          </q-avatar>
          <div class="hr-application-details-header-copy">
            <div class="hr-application-details-title">Application Details</div>
            <div class="row items-center hr-application-details-meta">
              <q-badge
                rounded
                color="grey-2"
                text-color="grey-8"
                class="hr-application-details-meta-chip"
              >
                {{ application.employee_control_no || 'No Control No.' }}
              </q-badge>
              <q-badge
                rounded
                color="grey-2"
                text-color="grey-8"
                class="hr-application-details-meta-chip"
              >
                Filed: {{ formatDate(application.dateFiled) || 'N/A' }}
              </q-badge>
            </div>
          </div>
        </div>
        <div class="hr-application-details-header-side">
          <div class="row items-center q-gutter-xs no-wrap">
            <q-btn
              flat
              dense
              round
              icon="close"
              class="hr-application-details-close"
              aria-label="Close application details"
              v-close-popup
            />
          </div>
          <div
            v-if="shouldShowCurrentLeaveBalance(application)"
            class="hr-application-details-header-balance-text"
          >
            <div class="hr-application-details-label">Available Leave Balance</div>
            <div
              class="hr-application-details-header-balance-value"
              :class="getCurrentLeaveBalanceClass(application)"
            >
              {{ getCurrentLeaveBalanceDisplay(application) }}
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-section class="q-gutter-y-sm hr-application-details-content">
        <div
          v-if="shouldShowApplicationEditRequestSection(application)"
          class="hr-application-requested-changes-section"
        >
          <div class="row items-center justify-between q-gutter-sm">
            <div class="hr-application-details-label">
              {{ getApplicationEditRequestSectionTitle(application) }}
            </div>
          </div>
          <div
            v-if="shouldShowApplicationEditRequestDateComparison(application)"
            class="hr-application-requested-changes-grid"
          >
            <div class="hr-application-requested-changes-item">
              <div class="hr-application-requested-changes-title">Inclusive Dates</div>
              <div class="hr-application-requested-changes-line">
                <span class="hr-application-requested-changes-key">Current:</span>
                <span class="hr-application-requested-changes-value">{{
                  formatInclusiveDateSummary(getApplicationEditRequestFromDates(application))
                }}</span>
              </div>
              <div class="hr-application-requested-changes-line">
                <span class="hr-application-requested-changes-key">Requested:</span>
                <span
                  class="
                    hr-application-requested-changes-value
                    hr-application-requested-changes-value--requested
                  "
                  >{{ formatInclusiveDateSummary(getApplicationEditRequestToDates(application)) }}</span
                >
              </div>
            </div>
            <div class="hr-application-requested-changes-item">
              <div class="hr-application-requested-changes-title">Duration</div>
              <div class="hr-application-requested-changes-line">
                <span class="hr-application-requested-changes-key">Current:</span>
                <span class="hr-application-requested-changes-value">{{
                  getApplicationEditRequestCurrentDuration(application)
                }}</span>
              </div>
              <div class="hr-application-requested-changes-line">
                <span class="hr-application-requested-changes-key">Requested:</span>
                <span
                  class="
                    hr-application-requested-changes-value
                    hr-application-requested-changes-value--requested
                  "
                  >{{ getApplicationEditRequestRequestedDuration(application) }}</span
                >
              </div>
            </div>
          </div>
          <div v-else class="hr-application-requested-changes-grid">
            <div class="hr-application-requested-changes-item">
              <div class="hr-application-requested-changes-title">Changes</div>
              <div class="hr-application-requested-changes-line">
                <span class="hr-application-requested-changes-key">Requested:</span>
                <span
                  class="
                    hr-application-requested-changes-value
                    hr-application-requested-changes-value--requested
                  "
                  >Cancel Leave</span
                >
              </div>
            </div>
            <div class="hr-application-requested-changes-item">
              <div class="hr-application-requested-changes-title">Request Details</div>
              <div class="hr-application-requested-changes-line">
                <span class="hr-application-requested-changes-key">Requested At:</span>
                <span class="hr-application-requested-changes-value">{{
                  getApplicationEditRequestRequestedAt(application)
                }}</span>
              </div>
              <div class="hr-application-requested-changes-line">
                <span class="hr-application-requested-changes-key">Remarks:</span>
                <span class="hr-application-requested-changes-value">{{
                  getApplicationEditRequestReason(application)
                }}</span>
              </div>
            </div>
          </div>
          <div
            v-if="shouldShowApplicationEditRequestDateComparison(application)"
            class="row items-center q-col-gutter-md q-mt-sm"
          >
            <div class="col-12 col-md-8 hr-application-requested-changes-meta">
              <div>
                <strong>Requested At:</strong>
                {{ getApplicationEditRequestRequestedAt(application) }}
              </div>
              <div>
                <strong>Remarks:</strong>
                {{ getApplicationEditRequestReason(application) }}
              </div>
            </div>
          </div>
        </div>
        <div class="hr-application-details-grid">
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Employee</div>
            <div class="text-weight-medium">{{ application.employeeName }}</div>
          </div>
          <div v-if="hasApplicationAttachment(application)" class="hr-application-details-item">
            <div class="text-caption text-grey-7 q-mb-xs">Attachment</div>
            <q-btn
              flat
              dense
              no-caps
              icon="attach_file"
              color="primary"
              label="View Attachment"
              @click="handleViewAttachment"
            />
          </div>
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Leave Type</div>
            <div class="text-weight-medium">
              <template v-if="hasPendingLeaveTypeUpdate(application)">
                <div class="text-caption text-grey-7">Current</div>
                <div>{{ getCurrentLeaveTypeLabel(application) }}</div>
                <div class="text-caption text-deep-purple-8 hr-application-date-change-label">
                  Requested
                </div>
                <div class="text-deep-purple-8">{{ getRequestedLeaveTypeLabel(application) }}</div>
              </template>
              <template v-else>
                {{ getCurrentLeaveTypeLabel(application) }}
              </template>
            </div>
          </div>
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Application Status</div>
            <StatusBadge class="self-start" :status="getFinalStatusForStatusColumn(application)" />
          </div>
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Office</div>
            <div class="text-weight-medium">
              {{ application.officeShort || application.office }}
            </div>
          </div>
          <div v-if="isCtoLeaveApplication(application)" class="hr-application-details-item">
            <div class="text-caption text-grey-7">Available CTO Hours</div>
            <div class="text-weight-medium">
              {{ getCurrentCtoAvailableHoursDisplay(application) }}
            </div>
          </div>
          <div v-if="isCtoLeaveApplication(application)" class="hr-application-details-item">
            <div class="text-caption text-grey-7">Required CTO Hours</div>
            <div class="text-weight-medium">
              {{ getApplicationCtoRequiredHoursDisplay(application) }}
            </div>
          </div>
          <div v-if="isCtoLeaveApplication(application)" class="hr-application-details-item">
            <div class="text-caption text-grey-7">CTO Deducted Hours</div>
            <div class="text-weight-medium">
              {{ getCtoDeductedHoursDisplay(application) }}
            </div>
          </div>
          <div v-if="isCocApplication(application)" class="hr-application-details-item">
            <div class="text-caption text-grey-7">Issued Date</div>
            <div class="text-weight-medium">
              {{
                formatDate(application.certificateIssuedAt || application.certificate_issued_at) || 'N/A'
              }}
            </div>
          </div>
          <div v-if="!isCocApplication(application)" class="hr-application-details-item">
            <div class="text-caption text-grey-7">Reason</div>
            <div>
              {{ getCurrentReasonDisplay(application) }}
            </div>
          </div>
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">
              {{ application.is_monetization ? 'Days to Monetize' : 'Inclusive Dates' }}
            </div>
            <div v-if="application.is_monetization" class="text-weight-medium">
              {{ application.days }} day(s)
              <div v-if="application.equivalent_amount" class="text-caption text-grey-6 q-mt-xs">
                Est. Amount: &#8369;{{
                  Number(application.equivalent_amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })
                }}
              </div>
            </div>
            <div
              v-else-if="hasPendingDateUpdate(application)"
              :class="[
                'text-weight-medium',
                'hr-application-date-change-preview',
                { 'hr-application-details-scroll-area': shouldScrollInclusiveDates(application) },
              ]"
            >
              <div class="text-caption text-grey-7">Current</div>
              <template v-if="getSelectedDatePayStatusRows(application).length">
                <div class="text-weight-medium hr-application-duration-columns">
                  <div
                    v-for="(column, columnIndex) in getSelectedDatePayStatusColumns(application)"
                    :key="`current-pay-status-column-${columnIndex}`"
                    class="hr-application-duration-column"
                  >
                    <div
                      v-for="entry in column"
                      :key="`current-pay-status-${columnIndex}-${entry.dateKey}`"
                      class="hr-application-duration-date-row"
                    >
                      <span class="text-caption hr-application-duration-date">{{
                        formatInclusiveDateEntry(entry)
                      }}</span>
                      <q-badge
                        v-if="entry.recalled"
                        dense
                        rounded
                        color="warning"
                        text-color="dark"
                        label="Recalled"
                        class="hr-application-pay-status-badge"
                      />
                      <q-badge
                        dense
                        rounded
                        color="grey-6"
                        text-color="white"
                        :label="entry.coverageLabel"
                        class="hr-application-coverage-badge"
                      />
                      <q-badge
                        dense
                        rounded
                        :color="entry.payStatus === 'WOP' ? 'negative' : 'positive'"
                        text-color="white"
                        :label="entry.payStatus"
                        class="hr-application-pay-status-badge"
                      />
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="(line, index) in getApplicationInclusiveDateLines(application)"
                  :key="`current-inclusive-${index}`"
                  class="text-caption hr-application-duration-date"
                >
                  {{ formatInclusiveDateSummary(line) }}
                </div>
              </template>
              <div class="text-caption text-deep-purple-8 hr-application-date-change-label">
                Requested
              </div>
              <template v-if="getPendingUpdateDatePayStatusRows(application).length">
                <div class="text-weight-medium hr-application-duration-columns">
                  <div
                    v-for="(column, columnIndex) in getPendingUpdateDatePayStatusColumns(application)"
                    :key="`requested-pay-status-column-${columnIndex}`"
                    class="hr-application-duration-column"
                  >
                    <div
                      v-for="entry in column"
                      :key="`requested-pay-status-${columnIndex}-${entry.dateKey}`"
                      class="hr-application-duration-date-row"
                    >
                      <span class="text-caption hr-application-duration-date text-deep-purple-8">{{
                        formatInclusiveDateEntry(entry)
                      }}</span>
                      <q-badge
                        dense
                        rounded
                        color="grey-6"
                        text-color="white"
                        :label="entry.coverageLabel"
                        class="hr-application-coverage-badge"
                      />
                      <q-badge
                        dense
                        rounded
                        :color="entry.payStatus === 'WOP' ? 'negative' : 'positive'"
                        text-color="white"
                        :label="entry.payStatus"
                        class="hr-application-pay-status-badge"
                      />
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="(line, index) in getPendingUpdateInclusiveDateLines(application)"
                  :key="`requested-inclusive-${index}`"
                  class="text-caption hr-application-duration-date text-deep-purple-8"
                >
                  {{ formatInclusiveDateSummary(line) }}
                </div>
              </template>
            </div>
            <div
              v-else-if="getSelectedDatePayStatusRows(application).length"
              :class="[
                'text-weight-medium',
                'hr-application-duration-columns',
                { 'hr-application-details-scroll-area': shouldScrollInclusiveDates(application) },
              ]"
            >
              <div
                v-for="(column, columnIndex) in getSelectedDatePayStatusColumns(application)"
                :key="`duration-pay-status-column-${columnIndex}`"
                class="hr-application-duration-column"
              >
                <div
                  v-for="entry in column"
                  :key="`duration-pay-status-${columnIndex}-${entry.dateKey}`"
                  class="hr-application-duration-date-row"
                >
                  <span class="text-caption hr-application-duration-date">{{
                    formatInclusiveDateEntry(entry)
                  }}</span>
                  <q-badge
                    dense
                    rounded
                    color="grey-6"
                    text-color="white"
                    :label="entry.coverageLabel"
                    class="hr-application-coverage-badge"
                  />
                  <q-badge
                    dense
                    rounded
                    :color="entry.payStatus === 'WOP' ? 'negative' : 'positive'"
                    text-color="white"
                    :label="entry.payStatus"
                    class="hr-application-pay-status-badge"
                  />
                </div>
              </div>
            </div>
            <div
              v-else-if="application.selected_dates && application.selected_dates.length"
              :class="[
                'text-weight-medium',
                'hr-application-duration-columns',
                { 'hr-application-details-scroll-area': shouldScrollInclusiveDates(application) },
              ]"
            >
              <div
                v-for="(column, columnIndex) in getSelectedDateColumns(application.selected_dates)"
                :key="`duration-column-${columnIndex}`"
                class="hr-application-duration-column"
              >
                <div
                  v-for="dateText in column"
                  :key="`${columnIndex}-${dateText}`"
                  class="text-caption hr-application-duration-date"
                >
                  {{ formatInclusiveDateSummary(dateText) }}
                </div>
              </div>
            </div>
            <div
              v-else
              :class="[
                'text-weight-medium',
                { 'hr-application-details-scroll-area': shouldScrollInclusiveDates(application) },
              ]"
            >
              {{ application.startDate ? formatInclusiveDateLabel(application.startDate) : 'N/A' }} -
              {{ application.endDate ? formatInclusiveDateLabel(application.endDate) : 'N/A' }}
            </div>
          </div>
          <div
            v-if="!isCocApplication(application) && shouldShowDetailsRemarks(application)"
            class="hr-application-details-item"
          >
            <div class="text-caption text-grey-7">Remarks</div>
            <div v-if="getDetailsRemarksRows(application).length" class="hr-application-remarks-list">
              <div
                v-for="(remarkRow, remarkIndex) in getDetailsRemarksRows(application)"
                :key="`remarks-${remarkIndex}`"
                class="hr-application-remarks-row"
              >
                <div v-if="remarkRow.label" class="text-caption text-grey-7">
                  {{ remarkRow.label }}
                </div>
                <div>{{ remarkRow.text }}</div>
              </div>
            </div>
            <div v-else class="text-grey-6">N/A</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions
        v-if="shouldShowFooterActions"
        align="right"
        class="hr-application-details-actions"
      >
        <q-btn
          v-if="canPrintCocCertificate(application)"
          unelevated
          no-caps
          color="green-7"
          icon="print"
          label="Print Certificate"
          class="hr-application-details-print-certificate"
          @click="handlePrintCertificate"
        />
        <template v-if="isMobile && hasMobileApplicationActions(application)">
          <q-btn
            v-if="showApplicationEditAction && canEditApplication(application)"
            unelevated
            no-caps
            color="primary"
            label="Edit"
            @click="handleOpenEdit"
          />
          <q-btn
            v-if="application.rawStatus === 'PENDING_HR'"
            unelevated
            no-caps
            color="negative"
            label="Disapprove"
            @click="handleOpenActionConfirm('reject')"
          />
          <q-btn
            v-if="application.rawStatus === 'PENDING_HR'"
            unelevated
            no-caps
            color="green-7"
            label="Approve"
            @click="handleOpenActionConfirm('approve')"
          />
          <q-btn
            v-if="canRecallApplication(application)"
            unelevated
            no-caps
            color="warning"
            label="Recall"
            @click="handleOpenRecall"
          />
        </template>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import StatusBadge from 'components/StatusBadge.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  application: {
    type: Object,
    default: null,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  showApplicationEditAction: {
    type: Boolean,
    default: false,
  },
  formatDate: {
    type: Function,
    default: () => '',
  },
  getCurrentLeaveBalanceClass: {
    type: Function,
    default: () => '',
  },
  getCurrentLeaveBalanceDisplay: {
    type: Function,
    default: () => '',
  },
  shouldShowCurrentLeaveBalance: {
    type: Function,
    default: () => true,
  },
  isCtoLeaveApplication: {
    type: Function,
    default: () => false,
  },
  getCurrentCtoAvailableHoursDisplay: {
    type: Function,
    default: () => '',
  },
  getApplicationCtoRequiredHoursDisplay: {
    type: Function,
    default: () => '',
  },
  getCtoDeductedHoursDisplay: {
    type: Function,
    default: () => '',
  },
  hasApplicationAttachment: {
    type: Function,
    default: () => false,
  },
  hasPendingLeaveTypeUpdate: {
    type: Function,
    default: () => false,
  },
  getCurrentLeaveTypeLabel: {
    type: Function,
    default: () => '',
  },
  getRequestedLeaveTypeLabel: {
    type: Function,
    default: () => '',
  },
  getEditRequestStatusLabel: {
    type: Function,
    default: () => '',
  },
  getEditRequestStatusFieldLabel: {
    type: Function,
    default: () => 'Edit Request Status',
  },
  getEditRequestBadgeColor: {
    type: Function,
    default: () => 'grey-6',
  },
  hasApplicationEditRequest: {
    type: Function,
    default: () => false,
  },
  shouldShowApplicationEditRequestSection: {
    type: Function,
    default: () => false,
  },
  getApplicationEditRequestSectionTitle: {
    type: Function,
    default: () => 'Requested Changes',
  },
  shouldShowApplicationEditRequestDateComparison: {
    type: Function,
    default: () => false,
  },
  getApplicationEditRequestFromDates: {
    type: Function,
    default: () => 'N/A',
  },
  getApplicationEditRequestToDates: {
    type: Function,
    default: () => 'N/A',
  },
  getApplicationEditRequestCurrentDuration: {
    type: Function,
    default: () => 'N/A',
  },
  getApplicationEditRequestRequestedDuration: {
    type: Function,
    default: () => 'N/A',
  },
  getApplicationEditRequestRequestedAt: {
    type: Function,
    default: () => 'N/A',
  },
  getApplicationEditRequestReason: {
    type: Function,
    default: () => 'N/A',
  },
  getApplicationDurationDisplay: {
    type: Function,
    default: () => '',
  },
  hasPendingDurationUpdate: {
    type: Function,
    default: () => false,
  },
  getRequestedDurationDisplay: {
    type: Function,
    default: () => '',
  },
  isCocApplication: {
    type: Function,
    default: () => false,
  },
  hasPendingReasonUpdate: {
    type: Function,
    default: () => false,
  },
  getCurrentReasonDisplay: {
    type: Function,
    default: () => '',
  },
  getRequestedReasonDisplay: {
    type: Function,
    default: () => '',
  },
  hasPendingDateUpdate: {
    type: Function,
    default: () => false,
  },
  getSelectedDatePayStatusRows: {
    type: Function,
    default: () => [],
  },
  getSelectedDatePayStatusColumns: {
    type: Function,
    default: () => [],
  },
  getApplicationInclusiveDateLines: {
    type: Function,
    default: () => [],
  },
  getPendingUpdateDatePayStatusRows: {
    type: Function,
    default: () => [],
  },
  getPendingUpdateDatePayStatusColumns: {
    type: Function,
    default: () => [],
  },
  getPendingUpdateInclusiveDateLines: {
    type: Function,
    default: () => [],
  },
  getSelectedDateColumns: {
    type: Function,
    default: () => [],
  },
  getDetailsRemarksRows: {
    type: Function,
    default: () => [],
  },
  shouldShowDetailsRemarks: {
    type: Function,
    default: () => false,
  },
  canPrintCocCertificate: {
    type: Function,
    default: () => false,
  },
  hasMobileApplicationActions: {
    type: Function,
    default: () => false,
  },
  canEditApplication: {
    type: Function,
    default: () => false,
  },
  canRecallApplication: {
    type: Function,
    default: () => false,
  },
  getFinalStatusForStatusColumn: {
    type: Function,
    default: (app) => String(app?.displayStatus || '').trim(),
  },
})

const emit = defineEmits([
  'update:modelValue',
  'view-attachment',
  'open-edit',
  'open-action-confirm',
  'open-recall',
  'print-certificate',
])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const inclusiveDatePatterns = [
  /\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\b/g,
  /\b[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\b/g,
]

function formatInclusiveDateLabel(value) {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return ''

  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
    ? new Date(`${normalizedValue}T00:00:00`)
    : new Date(normalizedValue)

  if (Number.isNaN(parsedDate.getTime())) return normalizedValue

  return parsedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatInclusiveDateSummary(value) {
  const text = String(value || '').trim()
  if (!text) return ''

  return inclusiveDatePatterns.reduce(
    (formattedText, pattern) =>
      formattedText.replace(pattern, (dateText) => formatInclusiveDateLabel(dateText)),
    text,
  )
}

function formatInclusiveDateEntry(entry) {
  const dateValue = String(entry?.dateKey || entry?.dateText || '').trim()
  if (!dateValue) return ''

  return formatInclusiveDateLabel(dateValue)
}

const shouldShowFooterActions = computed(() => {
  const app = props.application
  if (!app) return false

  return (
    props.canPrintCocCertificate(app) || (props.isMobile && props.hasMobileApplicationActions(app))
  )
})

function getCurrentInclusiveDateEntryCount(app) {
  const currentPayStatusRows = props.getSelectedDatePayStatusRows(app)
  if (currentPayStatusRows.length) return currentPayStatusRows.length

  const selectedDates = Array.isArray(app?.selected_dates) ? app.selected_dates : []
  if (selectedDates.length) return selectedDates.length

  return props.getApplicationInclusiveDateLines(app).length
}

function getRequestedInclusiveDateEntryCount(app) {
  const pendingPayStatusRows = props.getPendingUpdateDatePayStatusRows(app)
  if (pendingPayStatusRows.length) return pendingPayStatusRows.length

  return props.getPendingUpdateInclusiveDateLines(app).length
}

function shouldScrollInclusiveDates(app) {
  if (!app || app.is_monetization) return false

  if (props.hasPendingDateUpdate(app)) {
    return getCurrentInclusiveDateEntryCount(app) + getRequestedInclusiveDateEntryCount(app) > 3
  }

  return getCurrentInclusiveDateEntryCount(app) > 3
}

function handleViewAttachment() {
  if (!props.application) return
  emit('view-attachment', props.application)
}

function handleOpenEdit() {
  if (!props.application) return
  emit('open-edit', props.application)
}

function handleOpenActionConfirm(type) {
  if (!props.application) return
  emit('open-action-confirm', type, props.application)
}

function handleOpenRecall() {
  if (!props.application) return
  emit('open-recall', props.application)
}

function handlePrintCertificate() {
  if (!props.application) return
  emit('print-certificate', props.application)
}
</script>

<!-- Unscoped: q-dialog teleports to <body>, so scoped styles won't reliably apply -->
<style>
.hr-application-date-change-preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hr-application-date-change-label {
  margin-top: 6px;
}

.hr-application-remarks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hr-application-details-dialog .q-dialog__inner--minimized {
  padding: 12px 14px 16px;
}

.hr-application-details-dialog .q-dialog__inner--minimized > div {
  width: min(700px, calc(100vw - 28px)) !important;
  max-width: min(700px, calc(100vw - 28px)) !important;
}

.hr-application-details-card {
  width: min(700px, calc(100vw - 28px)) !important;
  max-width: min(700px, calc(100vw - 28px)) !important;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.16),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

.hr-application-details-accent {
  height: 5px;
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 48%, #43a047 100%);
}

.hr-application-details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
  background: linear-gradient(180deg, rgba(46, 125, 50, 0.14) 0%, rgba(46, 125, 50, 0.06) 100%);
  flex: 0 0 auto;
}

.hr-application-details-header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.hr-application-details-icon {
  background: rgba(46, 125, 50, 0.16);
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.28);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
}

.hr-application-details-header-copy {
  min-width: 0;
}

.hr-application-details-title {
  font-size: 1rem;
  font-weight: 700;
  color: #102a43;
  line-height: 1.35;
  letter-spacing: -0.005em;
}

.hr-application-details-subtitle {
  margin-top: 1px;
  font-size: 0.78rem;
  color: #486581;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hr-application-details-meta {
  margin-top: 6px;
  gap: 8px;
  flex-wrap: wrap;
}

.hr-application-details-meta-chip {
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid #d8e4ee;
  font-size: 0.7rem;
  font-weight: 600;
}

.hr-application-details-meta-chip--status {
  border-color: transparent;
}

.hr-application-details-header-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.hr-application-details-header-balance-text {
  text-align: right;
}

.hr-application-details-header-balance-value {
  margin-top: 2px;
  color: #1b5e20;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.35;
}

.hr-application-details-close {
  color: #607d8b;
  margin-top: 0;
}

.hr-application-details-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 10px !important;
  background:
    radial-gradient(circle at top right, rgba(2, 119, 189, 0.06), transparent 45%),
    linear-gradient(to bottom, #ffffff, #fcfdff);
}

.hr-application-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;
  align-content: start;
}

.hr-application-details-item {
  min-width: 0;
  border: 1px solid #d9e8f2;
  border-radius: 10px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.65);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hr-application-status-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}

.hr-application-status-pair--single {
  grid-template-columns: minmax(0, 1fr);
}

.hr-application-status-pair__item {
  min-width: 0;
}

.hr-application-duration-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}

.hr-application-duration-pair__item {
  min-width: 0;
}

.hr-application-reason-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-items: start;
}

.hr-application-reason-pair__item {
  min-width: 0;
}

.hr-application-reason-pair__item > div:last-child {
  white-space: normal;
  word-break: break-word;
}

.hr-application-details-item--full {
  grid-column: 1 / -1;
}

.hr-application-details-label {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #829ab1;
}

.hr-application-requested-changes-section {
  border: 1px solid #d9e8f2;
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(236, 247, 255, 0.55);
}

.hr-application-requested-changes-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.hr-application-requested-changes-item {
  border: 1px dashed #b5cee2;
  border-radius: 8px;
  padding: 8px 10px;
  background: #ffffff;
}

.hr-application-requested-changes-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #4b6b85;
  margin-bottom: 6px;
}

.hr-application-requested-changes-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1.35;
  margin-bottom: 2px;
}

.hr-application-requested-changes-key {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.hr-application-requested-changes-value {
  color: #1f2937;
  font-size: 0.78rem;
}

.hr-application-requested-changes-value--requested {
  color: #4c1d95;
}

.hr-application-requested-changes-meta {
  font-size: 0.78rem;
  line-height: 1.45;
  color: #374151;
}

.hr-application-details-actions {
  flex: 0 0 auto;
  padding: 0 14px 14px;
  gap: 8px;
  border-top: 1px solid #d6e4ee;
  background: #fff;
}

.hr-application-details-print-certificate {
  font-weight: 700;
  box-shadow: 0 8px 16px rgba(46, 125, 50, 0.3);
}

.hr-application-duration-columns {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.hr-application-details-scroll-area {
  max-height: 78px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.hr-application-duration-column {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.hr-application-duration-date {
  line-height: 1.45;
  white-space: nowrap;
  flex: 0 0 auto;
}

.hr-application-duration-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.hr-application-pay-status-badge {
  flex: 0 0 auto;
  min-width: 42px;
  justify-content: center;
}

.hr-application-coverage-badge {
  flex: 0 0 auto;
  min-width: 78px;
  justify-content: center;
}

@media (max-width: 599px) {
  .hr-application-details-dialog .q-dialog__inner--minimized {
    padding: 10px 10px 14px;
  }

  .hr-application-details-dialog .q-dialog__inner--minimized > div {
    width: calc(100vw - 20px) !important;
    max-width: calc(100vw - 20px) !important;
  }

  .hr-application-details-card {
    width: calc(100vw - 20px) !important;
    max-width: calc(100vw - 20px) !important;
    max-height: calc(100vh - 24px);
  }

  .hr-application-details-header {
    padding: 12px 12px 8px;
  }

  .hr-application-details-header-main {
    align-items: flex-start;
  }

  .hr-application-details-header-side {
    gap: 6px;
  }

  .hr-application-details-header-balance-value {
    font-size: 0.8rem;
  }

  .hr-application-details-icon {
    width: 40px !important;
    height: 40px !important;
  }

  .hr-application-details-meta {
    gap: 6px;
  }

  .hr-application-details-meta-chip {
    font-size: 0.64rem;
    padding: 2px 8px;
  }

  .hr-application-details-content {
    padding: 12px !important;
  }

  .hr-application-details-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .hr-application-requested-changes-grid {
    grid-template-columns: 1fr;
  }

  .hr-application-duration-columns {
    gap: 5px;
  }

  .hr-application-details-scroll-area {
    max-height: 72px;
  }

  .hr-application-duration-date {
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .hr-application-coverage-badge {
    min-width: 72px;
  }

  .hr-application-details-actions {
    padding: 0 12px 12px;
    justify-content: stretch;
  }

  .hr-application-details-actions .q-btn {
    flex: 1 1 auto;
    min-width: 0;
  }
}
</style>
