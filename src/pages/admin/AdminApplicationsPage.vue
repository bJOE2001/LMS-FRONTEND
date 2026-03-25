<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-lg applications-page-header">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Applications</h1>
      <q-space />
      <q-btn
        unelevated
        color="green-8"
        icon="description"
        label="Apply Leave"
        class="applications-page-cta"
        @click="openApplyLeaveDialog"
      />
    </div>

    <q-dialog
      v-model="showApplyLeaveDialog"
      persistent
      class="apply-leave-dialog"
      transition-show="scale"
      transition-hide="scale"
    >
      <q-card class="apply-leave-dialog-card">
        <q-bar class="apply-leave-dialog-header bg-primary text-white">
          <div class="text-h6 text-weight-bold">Leave Application</div>
          <q-space />
          <q-btn
            flat
            round
            icon="close"
            color="white"
            size="md"
            class="apply-leave-dialog-close"
            @click="closeApplyLeaveDialog"
          />
        </q-bar>
        <q-card-section class="q-pa-none apply-leave-dialog-body">
          <AdminApplySelf
            in-dialog
            :existing-applications="leaveApplicationRows"
            @cancel="closeApplyLeaveDialog"
            @submitted="handleApplyLeaveSubmitted"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="row items-center justify-between q-col-gutter-sm application-toolbar">
          <div class="col application-toolbar__search">
            <q-input
              v-model="statusSearch"
              dense
              outlined
              clearable
              placeholder="Search all application columns"
              class="application-status-search application-status-search--left"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-auto row items-center q-gutter-sm application-toolbar__actions">
            <q-btn
              unelevated
              no-caps
              color="blue-grey-7"
              icon="print"
              label="Print Applications"
              size="sm"
              @click="printApplicationsPdf"
            />
          </div>
        </div>
      </q-card-section>
      <q-table
        :rows="applicationsForTable"
        :columns="applicationTableColumns"
        row-key="application_uid"
        flat
        v-model:pagination="applicationsPagination"
        :rows-per-page-options="[5, 10, 15, 20]"
        :loading="loading"
        class="applications-table applications-table--interactive"
        @row-click="handleApplicationRowClick"
      >
        <template #body-cell-employee="tableProps">
          <q-td>
            <div class="text-weight-medium">{{ tableProps.row.employeeName }}</div>
            <div class="text-caption text-grey-7">{{ tableProps.row.employee_control_no }}</div>
          </q-td>
        </template>
        <template #body-cell-leaveBalance="tableProps">
          <q-td>
            <div class="leave-balance-cell">
              <q-badge
                v-for="(item, index) in getLeaveBalanceTextItems(tableProps.row)"
                :key="`${tableProps.row.id}-leave-balance-text-${index}`"
                color="grey-2"
                text-color="grey-7"
                rounded
                class="leave-balance-badge"
                :label="item.label"
              >
                <q-tooltip>{{ item.tooltip }}</q-tooltip>
              </q-badge>
            </div>
          </q-td>
        </template>
        <template #body-cell-inclusiveDates="tableProps">
          <q-td>
            <div class="application-details-cell">
              <span
                v-for="(line, index) in getApplicationInclusiveDateColumnLines(tableProps.row)"
                :key="`${tableProps.row.id}-inclusive-${index}`"
                class="text-weight-medium text-grey-9"
                @click.stop="openCalendarPreview(tableProps.row)"
              >
                {{ line }}
              </span>
            </div>
          </q-td>
        </template>
        <template #body-cell-dateFiled="tableProps">
          <q-td>
            <span class="text-weight-medium text-grey-9">{{
              formatDate(tableProps.row.dateFiled) || 'N/A'
            }}</span>
          </q-td>
        </template>
        <template #body-cell-status="tableProps">
          <q-td class="application-status-cell">
            <q-badge
              :color="getApplicationStatusColor(tableProps.row)"
              :label="getApplicationStatusLabel(tableProps.row)"
              rounded
              class="text-weight-medium q-pa-xs application-status-badge"
              style="padding-left: 10px; padding-right: 10px"
            />
          </q-td>
        </template>
        <template #body-cell-actions="tableProps">
          <q-td class="pending-actions-cell text-center">
            <div class="row no-wrap justify-center items-center q-gutter-x-xs">
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="visibility"
                @click.stop="openDetails(tableProps.row)"
              >
                <q-tooltip>View Application Details</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="calendar_month"
                color="primary"
                @click.stop="openCalendarPreview(tableProps.row)"
              >
                <q-tooltip>View Calendar</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canPrintApplication(tableProps.row)"
                flat
                dense
                round
                size="sm"
                icon="print"
                color="blue-grey-7"
                @click.stop="printApplication(tableProps.row)"
              >
                <q-tooltip>Print PDF</q-tooltip>
              </q-btn>
              <template v-if="tableProps.row.rawStatus === 'PENDING_ADMIN'">
                <q-btn
                  unelevated
                  dense
                  size="sm"
                  icon="close"
                  color="blue-grey-7"
                  text-color="white"
                  class="pending-actions-icon-btn pending-actions-icon-btn--cancel"
                  @click.stop="openActionConfirm('cancel', tableProps.row)"
                >
                  <q-tooltip>Cancel</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="cancel"
                  color="negative"
                  @click.stop="openActionConfirm('disapprove', tableProps.row)"
                >
                  <q-tooltip>Disapprove</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  icon="check_circle"
                  color="green-7"
                  @click.stop="openActionConfirm('approve', tableProps.row)"
                >
                  <q-tooltip>Approve</q-tooltip>
                </q-btn>
              </template>
              <template v-else-if="tableProps.row.rawStatus === 'PENDING_HR'">
                <q-btn
                  unelevated
                  dense
                  size="sm"
                  icon="close"
                  color="blue-grey-7"
                  text-color="white"
                  class="pending-actions-icon-btn pending-actions-icon-btn--cancel"
                  @click.stop="openActionConfirm('cancel', tableProps.row)"
                >
                  <q-tooltip>Cancel</q-tooltip>
                </q-btn>
              </template>
            </div>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width row flex-center q-pa-md text-grey-7">
            <template v-if="loading">
              <q-spinner color="primary" size="24px" class="q-mr-sm" />
              <span>Loading applications...</span>
            </template>
            <template v-else>
              <q-icon name="inbox" size="24px" class="q-mr-sm" />
              <span>No Applications Submitted</span>
            </template>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showTimelineDialog" persistent position="standard">
      <q-card
        v-if="selectedApp"
        class="application-timeline-card"
        style="width: 560px; max-width: 94vw"
      >
        <q-card-section class="row items-start no-wrap application-timeline-header">
          <div class="application-timeline-header-copy">
            <div class="text-h6 application-timeline-header-title">Application Timeline</div>
            <div class="application-timeline-header-caption">
              Track this application through department and HR review
            </div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" color="grey-8" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="application-timeline-content">
          <div v-if="hasApplicationAttachment(selectedApp)" class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-xs">Attachment</div>
            <q-btn
              flat
              dense
              no-caps
              icon="attach_file"
              color="primary"
              label="View Attachment"
              @click="viewApplicationAttachment(selectedApp)"
            />
          </div>

          <div class="application-timeline-panel">
            <div
              v-for="(entry, index) in selectedAppTimeline"
              :key="`${entry.title}-${index}`"
              class="application-timeline-item"
            >
              <div class="application-timeline-marker-column">
                <div
                  class="application-timeline-marker"
                  :class="`application-timeline-marker--${getTimelineEntryTone(entry)}`"
                >
                  <q-icon :name="getTimelineEntryIcon(entry)" size="16px" />
                </div>
                <div
                  v-if="index < selectedAppTimeline.length - 1"
                  class="application-timeline-line"
                  :class="`application-timeline-line--${getTimelineEntryTone(entry)}`"
                />
              </div>

              <div class="application-timeline-body">
                <div v-if="entry.subtitle" class="application-timeline-meta">
                  {{ entry.subtitle }}
                </div>
                <div class="application-timeline-title">
                  {{ entry.title }}
                </div>
                <div v-if="entry.actor" class="application-timeline-actor">
                  Action by: {{ entry.actor }}
                </div>
                <div v-else-if="entry.description" class="application-timeline-actor">
                  {{ entry.description }}
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog
      v-model="showDetailsDialog"
      persistent
      position="standard"
      class="admin-application-details-dialog"
    >
      <q-card v-if="selectedApp" class="admin-application-details-card">
        <q-card-section class="bg-primary text-white row items-center no-wrap admin-application-details-header">
          <div class="text-h6">Application Details</div>
          <q-space />
          <q-btn flat dense round icon="close" color="white" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-y-sm admin-application-details-content">
          <div class="admin-application-details-grid">
            <div class="admin-application-details-item admin-application-details-item--full">
              <div class="text-caption text-grey-7">Employee</div>
              <div class="text-weight-medium">{{ selectedApp.employeeName }}</div>
            </div>

            <div
              v-if="hasApplicationAttachment(selectedApp)"
              class="admin-application-details-item admin-application-details-item--full"
            >
              <div class="text-caption text-grey-7 q-mb-xs">Attachment</div>
              <q-btn
                flat
                dense
                no-caps
                icon="attach_file"
                color="primary"
                label="View Attachment"
                @click="viewApplicationAttachment(selectedApp)"
              />
            </div>

            <div class="admin-application-details-item">
              <div class="text-caption text-grey-7">Leave Type</div>
              <div class="text-weight-medium">
                {{ getApplicationDetailsLeaveTypeLabel(selectedApp) }}
              </div>
            </div>

            <div class="admin-application-details-item">
              <div class="text-caption text-grey-7">Application Status</div>
              <StatusBadge :status="selectedApp.displayStatus || getApplicationStatusLabel(selectedApp)" />
            </div>

            <div class="admin-application-details-item">
              <div class="text-caption text-grey-7">Duration</div>
              <div class="text-weight-medium">
                {{ getApplicationDurationDisplay(selectedApp) }}
              </div>
            </div>

            <div class="admin-application-details-item admin-application-details-item--full">
              <div class="text-caption text-grey-7">
                {{ selectedApp.is_monetization ? 'Days to Monetize' : 'Inclusive Dates' }}
              </div>
              <div v-if="selectedApp.is_monetization" class="text-weight-medium">
                {{ selectedApp.days }} day(s)
                <div v-if="selectedApp.equivalent_amount" class="text-caption text-grey-6 q-mt-xs">
                  Est. Amount: &#8369;{{
                    Number(selectedApp.equivalent_amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })
                  }}
                </div>
              </div>
              <div
                v-else-if="getSelectedDateIndicatorRows(selectedApp).length"
                class="text-weight-medium admin-application-duration-columns"
              >
                <div
                  v-for="entry in getSelectedDateIndicatorRows(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-indicator-${entry.dateKey}`"
                  class="admin-application-duration-date-row"
                >
                  <span class="text-caption admin-application-duration-date">{{ entry.dateText }}</span>
                  <q-badge
                    dense
                    rounded
                    color="grey-6"
                    text-color="white"
                    :label="entry.coverageLabel"
                    class="admin-application-duration-badge"
                  />
                  <q-badge
                    dense
                    rounded
                    :color="entry.payStatus === 'WOP' ? 'negative' : 'positive'"
                    text-color="white"
                    :label="entry.payStatus"
                    class="admin-application-duration-badge"
                  />
                </div>
              </div>
              <div v-else class="text-weight-medium admin-application-details-lines">
                <span
                  v-for="(line, index) in getApplicationInclusiveDateLines(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-inclusive-${index}`"
                  class="text-weight-medium text-grey-9 block"
                >
                  {{ line }}
                </span>
              </div>
            </div>

            <div class="admin-application-details-item admin-application-details-item--full">
              <div class="text-caption text-grey-7">Date Filed</div>
              <div class="text-weight-medium">{{ formatDate(selectedApp.dateFiled) || 'N/A' }}</div>
            </div>

            <div class="admin-application-details-item admin-application-details-item--full">
              <div class="text-caption text-grey-7">Reason</div>
              <div>{{ getApplicationDetailsReason(selectedApp) }}</div>
            </div>

            <div class="admin-application-details-item admin-application-details-item--full">
              <div class="text-caption text-grey-7">Remarks</div>
              <div>{{ getApplicationDetailsRemarks(selectedApp) }}</div>
            </div>

            <div class="admin-application-details-item admin-application-details-item--full">
              <div class="text-caption text-grey-7">Available Leave Balance</div>
              <div class="text-weight-medium text-positive">
                {{ getCurrentLeaveBalanceDisplay(selectedApp) }}
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions
          v-if="$q.screen.lt.sm && selectedApp"
          align="right"
          class="admin-application-details-actions"
        >
          <q-btn
            v-if="canPrintApplication(selectedApp)"
            unelevated
            no-caps
            color="blue-grey-7"
            label="Print"
            @click="printApplication(selectedApp)"
          />
          <template v-if="selectedApp.rawStatus === 'PENDING_ADMIN'">
            <q-btn
              unelevated
              no-caps
              color="blue-grey-7"
              label="Cancel"
              @click="openActionConfirm('cancel', selectedApp)"
            />
            <q-btn
              unelevated
              no-caps
              color="negative"
              label="Disapprove"
              @click="openActionConfirm('disapprove', selectedApp)"
            />
            <q-btn
              unelevated
              no-caps
              color="green-7"
              label="Approve"
              @click="openActionConfirm('approve', selectedApp)"
            />
          </template>
          <template v-else-if="selectedApp.rawStatus === 'PENDING_HR'">
            <q-btn
              unelevated
              no-caps
              color="blue-grey-7"
              label="Cancel"
              @click="openActionConfirm('cancel', selectedApp)"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showCalendarPreviewDialog" @show="syncCalendarPreviewDecorations">
      <q-card class="application-calendar-card">
        <q-card-section class="row items-start no-wrap application-calendar-header">
          <div class="application-calendar-header-copy">
            <div class="text-h6 application-calendar-caption">{{ calendarPreviewEmployeeName }}</div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" color="grey-8" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="application-calendar-body">
          <div class="application-calendar-legend">
            <div class="application-calendar-legend-item">
              <span
                class="application-calendar-legend-swatch application-calendar-legend-swatch--pending"
              />
              <span>Pending ({{ calendarPreviewStateCounts.pending }})</span>
            </div>
            <div class="application-calendar-legend-item">
              <span
                class="application-calendar-legend-swatch application-calendar-legend-swatch--approved"
              />
              <span>Approved ({{ calendarPreviewStateCounts.approved }})</span>
            </div>
          </div>

          <div
            ref="calendarPreviewRef"
            class="leave-date-calendar application-calendar-surface"
            @pointerdown.capture="handleCalendarPreviewSurfacePointerDown"
            @click.capture="handleCalendarPreviewSurfaceClick"
          >
            <q-date
              :key="calendarPreviewKey"
              v-model="calendarPreviewModel"
              multiple
              mask="YYYY-MM-DD"
              color="primary"
              :default-year-month="calendarPreviewYearMonth"
              @navigation="onCalendarPreviewNavigation"
              @update:model-value="handleCalendarPreviewModelUpdate"
            />

            <div
              v-if="calendarPreviewDateWarning && calendarPreviewWarningStyle.left"
              :class="[
                'leave-date-warning-popover',
                `leave-date-warning-popover--${calendarPreviewWarningState}`,
              ]"
              :style="calendarPreviewWarningStyle"
            >
              <span>{{ calendarPreviewDateWarning }}</span>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showConfirmActionDialog">
      <q-card
        class="admin-action-dialog-card"
        :class="
          confirmActionType === 'approve'
            ? 'admin-action-dialog-card--approve'
            : 'admin-action-dialog-card--reject'
        "
      >
        <q-card-section class="row justify-end admin-action-dialog-card__top">
          <q-btn
            flat
            round
            dense
            icon="close"
            color="grey-6"
            aria-label="Close confirmation"
            v-close-popup
          />
        </q-card-section>
        <q-card-section class="text-center admin-action-dialog-card__content">
          <div class="admin-action-dialog-card__title">
            {{ getConfirmActionTitle(confirmActionType) }}
          </div>
          <div class="admin-action-dialog-card__message">
            {{ getConfirmActionMessage(confirmActionType) }}
          </div>
        </q-card-section>
        <q-card-actions class="admin-action-dialog-card__actions">
          <q-btn
            outline
            no-caps
            label="Cancel"
            color="grey-7"
            class="admin-action-dialog-card__button admin-action-dialog-card__button--cancel"
            v-close-popup
          />
          <q-btn
            unelevated
            no-caps
            label="Confirm"
            :color="
              confirmActionType === 'approve'
                ? 'green-7'
                : confirmActionType === 'cancel'
                  ? 'blue-grey-7'
                  : 'negative'
            "
            class="admin-action-dialog-card__button"
            @click="confirmPendingAction"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showDisapproveDialog" persistent>
      <q-card
        class="admin-action-dialog-card admin-action-dialog-card--reject"
        style="min-width: 360px"
      >
        <q-card-section>
          <div class="text-h6">{{ rejectionDialogTitle }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="remarks"
            type="textarea"
            :label="rejectionDialogLabel"
            rows="4"
            outlined
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            unelevated
            :color="rejectionMode === 'cancel' ? 'blue-grey-7' : 'negative'"
            :label="rejectionMode === 'cancel' ? 'Confirm Cancel' : 'Submit'"
            :loading="actionLoading"
            @click="confirmDisapprove"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showActionResultDialog" persistent>
      <q-card style="min-width: 420px; max-width: 520px">
        <q-card-section class="row items-center">
          <q-icon
            :name="actionResultType === 'approved' ? 'check_circle' : 'cancel'"
            :color="
              actionResultType === 'approved'
                ? 'green-7'
                : actionResultType === 'cancelled'
                  ? 'blue-grey-7'
                  : 'negative'
            "
            size="28px"
            class="q-mr-sm"
          />
          <div class="text-h6">Application {{ getActionResultLabel(actionResultType) }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-body2 text-grey-8">
            The application has been {{ getActionResultVerb(actionResultType) }}. You can print the
            finalized form now.
          </div>
          <div v-if="actionResultApp" class="text-caption text-grey-7 q-mt-sm">
            {{ actionResultApp.employeeName }} - {{ actionResultApp.leaveType }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            unelevated
            color="primary"
            icon="print"
            label="Print PDF"
            :disable="!actionResultApp"
            @click="printActionResult"
          />
          <q-btn flat label="Close" color="grey-7" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import AdminApplySelf from 'pages/admin/AdminApplySelf.vue'
import StatusBadge from 'components/StatusBadge.vue'
import { useAdminApplicationsPage } from 'src/composables/useAdminApplicationsPage'

const {
  $q,
  loading,
  actionLoading,
  leaveApplicationRows,
  statusSearch,
  applicationsPagination,
  applicationTableColumns,
  applicationsForTable,
  showApplyLeaveDialog,
  showDetailsDialog,
  showTimelineDialog,
  showCalendarPreviewDialog,
  showDisapproveDialog,
  showConfirmActionDialog,
  showActionResultDialog,
  selectedApp,
  selectedAppTimeline,
  calendarPreviewModel,
  calendarPreviewKey,
  calendarPreviewRef,
  calendarPreviewYearMonth,
  calendarPreviewEmployeeName,
  calendarPreviewStateCounts,
  calendarPreviewDateWarning,
  calendarPreviewWarningStyle,
  calendarPreviewWarningState,
  rejectionDialogTitle,
  rejectionDialogLabel,
  confirmActionType,
  remarks,
  actionResultType,
  actionResultApp,
  openApplyLeaveDialog,
  closeApplyLeaveDialog,
  handleApplyLeaveSubmitted,
  printApplicationsPdf,
  handleApplicationRowClick,
  getLeaveBalanceTextItems,
  getCurrentLeaveBalanceDisplay,
  getApplicationDurationDisplay,
  getApplicationInclusiveDateColumnLines,
  getApplicationInclusiveDateLines,
  getSelectedDateIndicatorRows,
  formatDate,
  getApplicationStatusColor,
  getApplicationStatusLabel,
  openDetails,
  openCalendarPreview,
  onCalendarPreviewNavigation,
  handleCalendarPreviewModelUpdate,
  handleCalendarPreviewSurfacePointerDown,
  handleCalendarPreviewSurfaceClick,
  syncCalendarPreviewDecorations,
  canPrintApplication,
  printApplication,
  hasApplicationAttachment,
  viewApplicationAttachment,
  openActionConfirm,
  getTimelineEntryTone,
  getTimelineEntryIcon,
  getConfirmActionTitle,
  getConfirmActionMessage,
  confirmPendingAction,
  confirmDisapprove,
  getActionResultLabel,
  getActionResultVerb,
  printActionResult,
} = useAdminApplicationsPage()

function getApplicationDetailsLeaveTypeLabel(app) {
  if (!app) return 'N/A'
  const leaveType = String(app.leaveType || '').trim()
  if (!leaveType) return 'N/A'
  return app.is_monetization ? `${leaveType} (Monetization)` : leaveType
}

function getApplicationDetailsReason(app) {
  const reason = String(app?.reason || '').trim()
  return reason || 'N/A'
}

function getApplicationDetailsRemarks(app) {
  const remarks = String(app?.remarks || '').trim()
  return remarks || 'N/A'
}
</script>

<style scoped>
.apply-leave-dialog-card {
  width: min(1280px, 96vw);
  max-width: none;
  max-height: calc(100vh - 24px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.apply-leave-dialog-header {
  min-height: 56px;
  padding: 0 10px 0 14px;
  position: sticky;
  top: 0;
  z-index: 3;
}
.apply-leave-dialog-close {
  width: 38px;
  height: 38px;
}
.apply-leave-dialog :deep(.q-dialog__inner--minimized) {
  padding: 12px;
}
.apply-leave-dialog :deep(.q-dialog__inner--minimized > div) {
  max-width: none !important;
}
.apply-leave-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
}
.pending-actions-cell {
  width: 228px;
  padding-right: 8px;
}
.pending-actions-icon-btn {
  width: 14px;
  min-width: 14px;
  height: 14px;
  min-height: 14px;
  padding: 0 !important;
  border-radius: 0;
}
.pending-actions-icon-btn :deep(.q-btn__content) {
  width: 100%;
  height: 100%;
  min-width: 0;
}
.pending-actions-icon-btn :deep(.q-icon) {
  font-size: 10px;
}
.application-status-search {
  width: min(440px, 84vw);
}
.application-toolbar {
  row-gap: 8px;
}
.application-toolbar__search {
  min-width: 0;
  flex: 1 1 auto;
}
.application-status-search--left {
  width: min(440px, 100%);
}
.application-status-search--left :deep(.q-field) {
  width: 100%;
}
.application-status-cell {
  text-align: left;
  white-space: nowrap;
}
.application-status-badge {
  display: inline-flex;
  justify-content: flex-start;
  margin-left: 0;
  max-width: none;
}
.applications-table--interactive :deep(tbody tr) {
  cursor: pointer;
}
.admin-action-dialog-card {
  width: min(560px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  border-radius: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
}
.admin-action-dialog-card--approve {
  border-color: #b7ddc1;
}
.admin-action-dialog-card--reject {
  border-color: #e6b8b8;
}
.admin-action-dialog-card__top {
  padding: 12px 12px 0;
}
.admin-action-dialog-card__content {
  padding: 8px 28px 12px;
}
.admin-action-dialog-card__title {
  font-size: 2rem;
  line-height: 1.1;
  font-weight: 500;
  color: #111827;
}
.admin-action-dialog-card__message {
  margin-top: 20px;
  font-size: 1.15rem;
  line-height: 1.45;
  color: #6b7280;
}
.admin-action-dialog-card__actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  padding: 0 28px 28px;
}
.admin-action-dialog-card__button {
  flex: 1 1 0;
  min-height: 56px;
  border-radius: 18px;
  font-size: 1rem;
  font-weight: 700;
}
.admin-action-dialog-card__button--cancel {
  background: #ffffff;
  border-color: #d6dbe1;
  color: #111827;
}
.leave-balance-cell {
  min-width: 150px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.2;
}
.leave-balance-badge {
  padding: 2px 7px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  border: 1px solid #d8dee6;
}
.application-details-cell {
  min-width: 260px;
  white-space: normal;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.admin-application-details-dialog .q-dialog__inner--minimized {
  padding: 16px;
}

.admin-application-details-dialog .q-dialog__inner--minimized > div {
  width: min(520px, calc(100vw - 32px));
  max-width: min(520px, calc(100vw - 32px)) !important;
}

.admin-application-details-card {
  width: 100%;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-application-details-header {
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  z-index: 2;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08);
}

.admin-application-details-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.admin-application-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  align-content: start;
}

.admin-application-details-item {
  min-width: 0;
}

.admin-application-details-item--full {
  grid-column: 1 / -1;
}

.admin-application-details-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-application-duration-columns {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.admin-application-duration-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-application-duration-date {
  line-height: 1.45;
}

.admin-application-duration-badge {
  min-width: 42px;
  justify-content: center;
}

.admin-application-details-balance {
  margin-top: 4px;
}

.admin-application-details-actions {
  flex: 0 0 auto;
  padding: 10px 16px 16px;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
  background: #faf8f3;
  position: sticky;
  bottom: 0;
  z-index: 2;
  box-shadow: 0 -10px 20px rgba(15, 23, 42, 0.06);
}

.application-timeline-card {
  border-radius: 12px;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
}
.application-timeline-header {
  padding: 12px 14px 10px;
  background: #fff;
}
.application-timeline-header-copy {
  min-width: 0;
}
.application-timeline-header-title {
  color: #111827;
  font-weight: 700;
}
.application-timeline-header-caption {
  margin-top: 2px;
  font-size: 0.78rem;
  color: #6b7280;
}
.application-timeline-content {
  padding: 14px;
  background: #fff;
  overflow-y: auto;
}
.application-timeline-actions {
  padding: 0 14px 14px;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.application-timeline-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: linear-gradient(180deg, #f7f8fb 0%, #f4f5f8 100%);
  padding: 10px 12px;
}
.application-timeline-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
}
.application-timeline-item + .application-timeline-item {
  margin-top: 2px;
}
.application-timeline-marker-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.application-timeline-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.application-timeline-marker--positive {
  background: #22c55e;
}
.application-timeline-marker--warning {
  background: #f59e0b;
}
.application-timeline-marker--negative {
  background: #ef4444;
}
.application-timeline-marker--neutral {
  background: #cbd5e1;
  color: #475569;
}
.application-timeline-line {
  width: 2px;
  flex: 1 1 auto;
  min-height: 42px;
  margin-top: 4px;
  border-radius: 999px;
}
.application-timeline-line--positive {
  background: #22c55e;
}
.application-timeline-line--warning {
  background: #f59e0b;
}
.application-timeline-line--negative {
  background: #ef4444;
}
.application-timeline-line--neutral {
  background: #cbd5e1;
}
.application-timeline-body {
  padding-bottom: 18px;
}
.application-timeline-meta {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}
.application-timeline-title {
  margin-top: 2px;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.3;
}
.application-timeline-actor {
  margin-top: 4px;
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.45;
}
.application-calendar-card {
  width: min(840px, 96vw);
  max-width: 96vw;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
}
.application-calendar-header {
  padding: 12px 14px 10px;
  background: #fff;
}
.application-calendar-header-copy {
  min-width: 0;
}
.application-calendar-title {
  color: #111827;
  font-weight: 700;
}
.application-calendar-caption {
  color: #374151;
  font-weight: 700;
}
.application-calendar-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
}
.application-calendar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.application-calendar-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #4b5563;
}
.application-calendar-legend-swatch {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
}
.application-calendar-legend-swatch--pending {
  background: #ffe29a;
  border-color: rgba(214, 154, 0, 0.85);
}
.application-calendar-legend-swatch--approved {
  background: #a8dcae;
  border-color: rgba(46, 125, 50, 0.85);
}
.application-calendar-surface {
  position: relative;
  display: flex;
  justify-content: stretch;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  overflow: visible;
}
.application-calendar-actions {
  padding: 0 14px 14px;
  background: #fff;
}
.leave-date-calendar {
  position: relative;
}
.leave-date-warning-popover {
  position: absolute;
  z-index: 20;
  display: inline-flex;
  align-items: flex-start;
  padding: 8px 10px;
  border: 1px solid;
  border-radius: 12px;
  background: var(--leave-date-warning-bg, #fff1c9);
  border-color: var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  color: var(--leave-date-warning-text, #9a6700);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.35;
}
.leave-date-warning-popover::after {
  content: '';
  position: absolute;
  left: var(--leave-date-warning-arrow-left, 24px);
  bottom: -7px;
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
  border-right: 1px solid var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  border-bottom: 1px solid var(--leave-date-warning-border, rgba(225, 192, 106, 0.8));
  background: var(--leave-date-warning-bg, #fff1c9);
}
.leave-date-warning-popover--pending {
  --leave-date-warning-bg: #ffe9b3;
  --leave-date-warning-border: rgba(214, 154, 0, 0.85);
  --leave-date-warning-text: #8a5700;
}
.leave-date-warning-popover--approved {
  --leave-date-warning-bg: #d0ebd4;
  --leave-date-warning-border: rgba(46, 125, 50, 0.85);
  --leave-date-warning-text: #20642b;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked) {
  opacity: 1 !important;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked .q-btn) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #2b2f33 !important;
  opacity: 1 !important;
  border-radius: 999px !important;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked .q-btn__content) {
  color: #2b2f33 !important;
  font-weight: 700;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked-pending > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked-pending .q-btn) {
  background: #ffe29a;
}
.leave-date-calendar :deep(.leave-date-calendar__day--locked-approved > div),
.leave-date-calendar :deep(.leave-date-calendar__day--locked-approved .q-btn) {
  background: #a8dcae;
}
.application-calendar-surface :deep(.q-date) {
  box-shadow: none;
  width: 100%;
  max-width: none;
  font-size: 1rem;
}
.application-calendar-surface :deep(.q-date__header) {
  display: none;
}
.application-calendar-surface :deep(.q-date--portrait-standard .q-date__content) {
  height: 100%;
}
.application-calendar-surface :deep(.q-date__content) {
  width: 100%;
}
.application-calendar-surface :deep(.q-date__navigation) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  column-gap: 8px;
  height: auto;
  min-height: 48px;
  margin-bottom: 10px;
}
.application-calendar-surface :deep(.q-date__navigation > div) {
  width: auto;
  min-width: 0;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(1)) {
  grid-column: 2;
  justify-content: center;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2)) {
  grid-column: 3;
  justify-content: center;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(3)) {
  grid-column: 4;
  justify-content: center;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(4)) {
  grid-column: 6;
  justify-content: center;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(5)) {
  grid-column: 7;
  justify-content: center;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(6)) {
  grid-column: 8;
  justify-content: center;
}
.application-calendar-surface :deep(.q-date__navigation .q-btn) {
  min-height: 0;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(5) .q-btn) {
  padding: 2px 8px;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn) {
  min-width: clamp(240px, 34vw, 340px);
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn__content),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(5) .q-btn__content) {
  font-size: 1.24rem;
  font-weight: 600;
  line-height: 1.2;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-btn),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-btn) {
  width: 34px;
  height: 34px;
}
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-icon),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-icon),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-icon),
.application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-icon) {
  font-size: 1.4rem;
}
.application-calendar-surface :deep(.q-date__view) {
  min-height: 360px;
  padding: 12px 20px 14px;
  overflow: visible;
}
.application-calendar-surface :deep(.q-date__calendar-days-container) {
  min-height: 280px;
  overflow: visible;
}
.application-calendar-surface :deep(.q-date__calendar-item) {
  height: 40px;
  overflow: visible;
}
.application-calendar-surface :deep(.q-date__calendar-item > div),
.application-calendar-surface :deep(.q-date__calendar-item .q-btn) {
  min-width: 32px;
  height: 32px;
  border-radius: 999px !important;
}

@media (max-width: 599px) {
  .admin-application-details-dialog .q-dialog__inner--minimized {
    padding: 12px;
  }

  .admin-application-details-card {
    max-height: calc(100vh - 24px);
  }

  .admin-application-details-content {
    padding: 12px !important;
  }

  .admin-application-details-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 12px;
  }

  .admin-application-details-lines {
    gap: 4px;
  }

  .admin-application-duration-columns {
    gap: 5px;
  }

  .admin-application-duration-date {
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .admin-application-details-actions {
    padding: 10px 12px 12px;
    justify-content: stretch;
  }

  .admin-application-details-actions .q-btn {
    flex: 1 1 auto;
    min-width: 0;
  }

  .admin-action-dialog-card {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    border-radius: 20px;
  }

  .admin-action-dialog-card__content {
    padding: 4px 20px 10px;
  }

  .admin-action-dialog-card__title {
    font-size: 1.55rem;
  }

  .admin-action-dialog-card__message {
    margin-top: 14px;
    font-size: 1rem;
  }

  .admin-action-dialog-card__actions {
    gap: 12px;
    padding: 0 20px 20px;
  }

  .admin-action-dialog-card__button {
    min-height: 50px;
    border-radius: 16px;
  }

  .apply-leave-dialog-card {
    width: min(100vw, 100vw);
    max-height: calc(100vh - 8px);
    border-radius: 10px;
  }

  .apply-leave-dialog :deep(.q-dialog__inner--minimized) {
    padding: 4px;
  }

  .apply-leave-dialog-header {
    min-height: 52px;
    padding: 0 8px 0 10px;
  }

  .applications-page-header {
    align-items: flex-start;
    row-gap: 14px;
  }

  .applications-page-cta {
    margin-top: 10px;
  }

  .applications-table :deep(th),
  .applications-table :deep(td) {
    padding-left: 8px;
    padding-right: 8px;
  }

  .application-status-cell {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  .application-toolbar__search,
  .application-toolbar__actions {
    width: 100%;
    flex: 0 0 100%;
  }

  .application-toolbar__actions {
    justify-content: flex-start;
  }

  .application-toolbar {
    display: block;
  }

  .application-status-search--left {
    width: 100%;
  }

  .application-status-search--left :deep(.q-field) {
    width: 100%;
  }

  .application-timeline-content {
    padding: 12px;
  }

  .application-timeline-actions {
    padding: 0 12px 12px;
    justify-content: stretch;
  }

  .application-timeline-actions .q-btn {
    flex: 1 1 auto;
    min-width: 0;
  }

  .application-timeline-panel {
    padding: 10px;
  }

  .application-timeline-item {
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 10px;
  }

  .application-timeline-marker {
    width: 24px;
    height: 24px;
  }

  .application-calendar-body {
    padding: 12px;
  }

  .application-calendar-surface {
    padding: 10px;
  }

  .application-calendar-surface :deep(.q-date) {
    width: 100%;
    max-width: 100%;
  }

  .application-calendar-surface :deep(.q-date__navigation) {
    column-gap: 4px;
    min-height: 42px;
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn__content),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(5) .q-btn__content) {
    font-size: 1.08rem;
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(2) .q-btn) {
    min-width: min(180px, 46vw);
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-btn),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-btn),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-btn),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-btn) {
    width: 30px;
    height: 30px;
  }

  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(1) .q-icon),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(3) .q-icon),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(4) .q-icon),
  .application-calendar-surface :deep(.q-date__navigation > div:nth-child(6) .q-icon) {
    font-size: 1.2rem;
  }

  .application-calendar-surface :deep(.q-date__view) {
    min-height: 250px;
    padding: 8px 10px 10px;
  }

  .application-calendar-surface :deep(.q-date__calendar-item) {
    height: 30px;
  }

  .application-calendar-surface :deep(.q-date__calendar-item > div),
  .application-calendar-surface :deep(.q-date__calendar-item .q-btn) {
    min-width: 28px;
    min-height: 28px;
  }

  .leave-date-warning-popover {
    font-size: 0.82rem;
  }
}
</style>

