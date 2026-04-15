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

    <AdminApplyLeaveDialog
      v-model="showApplyLeaveDialog"
      :existing-applications="leaveApplicationRows"
      @cancel="closeApplyLeaveDialog"
      @submitted="handleApplyLeaveSubmitted"
    />

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
          <q-td class="leave-balance-cell-column">
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
        <template #body-cell-days="tableProps">
          <q-td>
            <span class="text-weight-medium text-grey-9">
              {{ getApplicationDurationDisplay(tableProps.row) }}
            </span>
          </q-td>
        </template>
        <template #body-cell-status="tableProps">
          <q-td class="application-status-cell">
            <div class="status-cell-wrap">
              <StatusBadge :status="getFinalStatusForStatusColumn(tableProps.row)" />
            </div>
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
                  flat
                  dense
                  round
                  size="sm"
                  icon="remove_circle"
                  color="warning"
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
                  flat
                  dense
                  round
                  size="sm"
                  icon="remove_circle"
                  color="warning"
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

    <AdminApplicationTimelineDialog
      v-model="showTimelineDialog"
      :selected-app="selectedApp"
      :loading-timeline="timelineLoading"
      :timeline-entries="selectedAppTimeline"
      :has-application-attachment="hasApplicationAttachment"
      :view-application-attachment="viewApplicationAttachment"
      :get-timeline-entry-tone="getTimelineEntryTone"
      :get-timeline-entry-icon="getTimelineEntryIcon"
    />

    <q-dialog
      v-model="showDetailsDialog"
      persistent
      position="standard"
      class="admin-application-details-dialog"
    >
      <q-card v-if="selectedApp" class="admin-application-details-card">
        <div class="admin-application-details-accent" />
        <q-card-section class="row items-start no-wrap admin-application-details-header">
          <div class="admin-application-details-header-main">
            <q-avatar size="46px" class="admin-application-details-icon">
              <q-icon name="description" size="24px" />
            </q-avatar>
            <div class="admin-application-details-header-copy">
              <div class="admin-application-details-title">Application Details</div>
              <div class="admin-application-details-subtitle">{{ selectedApp.employeeName }}</div>
              <div class="row items-center admin-application-details-meta">
                <q-badge
                  rounded
                  color="grey-2"
                  text-color="grey-8"
                  class="admin-application-details-meta-chip"
                >
                  {{ selectedApp.employee_control_no || 'No Control No.' }}
                </q-badge>
                <q-badge
                  v-if="
                    ![
                      'Pending HR',
                      'Pending HR Receive',
                      'Pending HR Review',
                      'Pending Update Receive',
                      'Pending Update HR Review',
                      'Pending Update Admin Review',
                      'Pending Update Release',
                      'Pending Admin',
                    ].includes(getApplicationStatusLabel(selectedApp))
                  "
                  rounded
                  :color="getApplicationStatusColor(selectedApp)"
                  text-color="white"
                  class="admin-application-details-meta-chip admin-application-details-meta-chip--status"
                >
                  {{ getApplicationStatusLabel(selectedApp) }}
                </q-badge>
                <q-badge
                  rounded
                  color="grey-2"
                  text-color="grey-8"
                  class="admin-application-details-meta-chip"
                >
                  Filed: {{ formatDate(selectedApp.dateFiled) || 'N/A' }}
                </q-badge>
              </div>
            </div>
          </div>
          <div class="admin-application-details-header-side">
            <q-btn flat dense round icon="close" class="admin-application-details-close" v-close-popup />
            <div
              v-if="shouldShowCurrentLeaveBalance(selectedApp)"
              class="admin-application-details-header-balance-text"
            >
              <div class="admin-application-details-label">Available Leave Balance</div>
              <div class="admin-application-details-header-balance-value">
                {{ getCurrentLeaveBalanceDisplay(selectedApp) }}
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-y-sm admin-application-details-content">
          <div
            v-if="hasApplicationEditRequest(selectedApp)"
            class="row items-center justify-between q-col-gutter-sm"
          >
            <div class="col-auto">
              <q-badge
                v-if="isApplicationEditRequestHrApproved(selectedApp)"
                rounded
                color="positive"
                text-color="white"
                :label="getApplicationEditRequestApprovedBadgeLabel(selectedApp)"
                class="text-weight-medium"
              />
            </div>
            <div class="col-auto">
              <q-btn
                v-if="canPrintRequestChangesApplication(selectedApp)"
                unelevated
                no-caps
                color="teal-7"
                icon="description"
                label="Print Form"
                @click="printRequestChangesApplication(selectedApp)"
              />
            </div>
          </div>

          <div
            v-if="hasApplicationEditRequest(selectedApp) && !isApplicationEditRequestHrApproved(selectedApp)"
            class="admin-application-requested-changes-section"
          >
            <div class="row items-center justify-between q-gutter-sm">
              <div class="admin-application-details-label">{{ getApplicationEditRequestSectionTitle(selectedApp) }}</div>
            </div>
            <div
              v-if="shouldShowApplicationEditRequestDateComparison(selectedApp)"
              class="admin-application-requested-changes-grid"
            >
              <div class="admin-application-requested-changes-item">
                <div class="admin-application-requested-changes-title">Inclusive Dates</div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Current:</span>
                  <span class="admin-application-requested-changes-value">{{
                    getApplicationEditRequestFromDates(selectedApp)
                  }}</span>
                </div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Requested:</span>
                  <span class="admin-application-requested-changes-value admin-application-requested-changes-value--requested">{{
                    getApplicationEditRequestToDates(selectedApp)
                  }}</span>
                </div>
              </div>

              <div class="admin-application-requested-changes-item">
                <div class="admin-application-requested-changes-title">Duration</div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Current:</span>
                  <span class="admin-application-requested-changes-value">{{
                    getApplicationEditRequestCurrentDuration(selectedApp)
                  }}</span>
                </div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Requested:</span>
                  <span class="admin-application-requested-changes-value admin-application-requested-changes-value--requested">{{
                    getApplicationEditRequestRequestedDuration(selectedApp)
                  }}</span>
                </div>
              </div>
            </div>
            <div v-else class="admin-application-requested-changes-grid">
              <div class="admin-application-requested-changes-item">
                <div class="admin-application-requested-changes-title">Changes</div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Requested:</span>
                  <span class="admin-application-requested-changes-value admin-application-requested-changes-value--requested">Cancel Leave</span>
                </div>
              </div>
            </div>

            <div class="row items-center q-col-gutter-md q-mt-sm">
              <div class="col-12 col-md-8 admin-application-requested-changes-meta">
                <div><strong>{{ getApplicationEditRequestStatusFieldLabel(selectedApp) }}:</strong> {{ getApplicationEditRequestStatusLabel(selectedApp) }}</div>
                <div><strong>Requested At:</strong> {{ getApplicationEditRequestRequestedAt(selectedApp) }}</div>
                <div><strong>Requested By:</strong> {{ getApplicationEditRequestRequestedBy(selectedApp) }}</div>
                <div><strong>Reason:</strong> {{ getApplicationEditRequestReason(selectedApp) }}</div>
              </div>
            </div>
          </div>

          <div class="admin-application-details-grid">
            <div class="admin-application-details-item">
              <div class="admin-application-details-label">Employee</div>
              <div class="text-weight-medium">{{ selectedApp.employeeName }}</div>
            </div>

            <div
              v-if="hasApplicationAttachment(selectedApp)"
              class="admin-application-details-item"
            >
              <div class="admin-application-details-label q-mb-xs">Attachment</div>
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
              <div class="admin-application-details-label">Leave Type</div>
              <div class="text-weight-medium">
                {{ getApplicationDetailsLeaveTypeLabel(selectedApp) }}
              </div>
            </div>

            <div class="admin-application-details-item">
              <div class="admin-application-details-label">Application Status</div>
              <StatusBadge :status="selectedApp.displayStatus || getApplicationStatusLabel(selectedApp)" />
            </div>

            <div
              v-if="isCtoLeaveApplication(selectedApp)"
              class="admin-application-details-item"
            >
              <div class="admin-application-details-label">Available CTO Hours</div>
              <div class="text-weight-medium">
                {{ getCurrentCtoAvailableHoursDisplay(selectedApp) }}
              </div>
            </div>

            <div
              v-if="isCtoLeaveApplication(selectedApp)"
              class="admin-application-details-item"
            >
              <div class="admin-application-details-label">Required CTO Hours</div>
              <div class="text-weight-medium">
                {{ getApplicationCtoRequiredHoursDisplay(selectedApp) }}
              </div>
            </div>

            <div
              v-if="isCtoLeaveApplication(selectedApp)"
              class="admin-application-details-item"
            >
              <div class="admin-application-details-label">CTO Deducted Hours</div>
              <div class="text-weight-medium">
                {{ getCtoDeductedHoursDisplay(selectedApp) }}
              </div>
            </div>

            <div
              v-if="isCocApplication(selectedApp)"
              class="admin-application-details-item"
            >
              <div class="admin-application-details-label">Issued Date</div>
              <div class="text-weight-medium">
                {{
                  formatDate(selectedApp.certificateIssuedAt || selectedApp.certificate_issued_at) || 'N/A'
                }}
              </div>
            </div>

            <div class="admin-application-details-item">
              <div class="admin-application-details-label">Duration</div>
              <div class="text-weight-medium">
                {{ getApplicationDurationDisplay(selectedApp) }}
              </div>
            </div>

            <div class="admin-application-details-item admin-application-details-item--inclusive">
              <div class="admin-application-details-label">
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
                v-else-if="shouldShowPendingDateComparisonInDetails(selectedApp)"
                :class="[
                  'text-weight-medium',
                  'admin-application-duration-columns',
                  { 'admin-application-details-scroll-area': shouldScrollInclusiveDates(selectedApp) },
                ]"
              >
                <div class="text-caption text-grey-7">Current</div>
                <div
                  v-for="entry in getSelectedDateIndicatorRows(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-current-indicator-${entry.dateKey}`"
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

                <div class="text-caption text-deep-purple-8 q-mt-sm">Requested</div>
                <div
                  v-for="entry in getPendingUpdateDateIndicatorRows(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-requested-indicator-${entry.dateKey}`"
                  class="admin-application-duration-date-row"
                >
                  <span class="text-caption text-deep-purple-8 admin-application-duration-date">
                    {{ entry.dateText }}
                  </span>
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
              <div
                v-else-if="getSelectedDateIndicatorRows(selectedApp).length"
                :class="[
                  'text-weight-medium',
                  'admin-application-duration-columns',
                  { 'admin-application-details-scroll-area': shouldScrollInclusiveDates(selectedApp) },
                ]"
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
              <div
                v-else
                :class="[
                  'text-weight-medium',
                  'admin-application-details-lines',
                  { 'admin-application-details-scroll-area': shouldScrollInclusiveDates(selectedApp) },
                ]"
              >
                <span
                  v-for="(line, index) in getApplicationInclusiveDateLines(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-inclusive-${index}`"
                  class="text-weight-medium text-grey-9 block"
                >
                  {{ line }}
                </span>
              </div>
            </div>

            <div
              v-if="!isCocApplication(selectedApp)"
              class="admin-application-details-item admin-application-details-item--reason"
            >
              <div class="admin-application-details-label">Reason</div>
              <div>{{ getApplicationDetailsReason(selectedApp) }}</div>
            </div>

            <div
              v-if="hasPendingDateUpdate(selectedApp)"
              class="admin-application-details-item"
            >
              <div class="admin-application-details-label">Remarks</div>
              <div>{{ getApplicationDetailsRemarks(selectedApp) }}</div>
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
          <q-btn
            v-if="canPrintRequestChangesApplication(selectedApp)"
            unelevated
            no-caps
            color="teal-7"
            label="Print Form"
            @click="printRequestChangesApplication(selectedApp)"
          />
          <template v-if="selectedApp.rawStatus === 'PENDING_ADMIN'">
            <q-btn
              unelevated
              no-caps
              color="warning"
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
              color="warning"
              label="Cancel"
              @click="openActionConfirm('cancel', selectedApp)"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>

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

    <AdminApplicationConfirmActionDialog
      v-model="showConfirmActionDialog"
      :confirm-action-type="confirmActionType"
      :get-confirm-action-title="getConfirmActionTitle"
      :get-confirm-action-message="getConfirmActionMessage"
      :on-confirm="confirmPendingAction"
    />

    <AdminApplicationDisapproveDialog
      v-model="showDisapproveDialog"
      :rejection-mode="rejectionMode"
      :rejection-dialog-title="rejectionDialogTitle"
      :rejection-dialog-label="rejectionDialogLabel"
      v-model:remarks="remarks"
      :action-loading="actionLoading"
      :on-confirm="confirmDisapprove"
    />

    <AdminApplicationActionResultDialog
      v-model="showActionResultDialog"
      :action-result-type="actionResultType"
      :action-result-app="actionResultApp"
      :action-result-is-edit-request-approval="actionResultIsEditRequestApproval"
      :can-print-request-changes-action-result="canPrintRequestChangesActionResult"
      :get-action-result-label="getActionResultLabel"
      :get-action-result-verb="getActionResultVerb"
      :on-print-request-changes="printRequestChangesActionResult"
      :on-print="printActionResult"
    />
  </q-page>
</template>

<script setup>
import StatusBadge from 'components/StatusBadge.vue'
import AdminApplyLeaveDialog from 'src/components/admin/AdminApplyLeaveDialog.vue'
import AdminApplicationTimelineDialog from 'src/components/admin/AdminApplicationTimelineDialog.vue'
import AdminApplicationCalendarDialog from 'src/components/admin/AdminApplicationCalendarDialog.vue'
import AdminApplicationConfirmActionDialog from 'src/components/admin/AdminApplicationConfirmActionDialog.vue'
import AdminApplicationDisapproveDialog from 'src/components/admin/AdminApplicationDisapproveDialog.vue'
import AdminApplicationActionResultDialog from 'src/components/admin/AdminApplicationActionResultDialog.vue'
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
  timelineLoading,
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
  rejectionMode,
  remarks,
  actionResultType,
  actionResultApp,
  actionResultIsEditRequestApproval,
  canPrintRequestChangesActionResult,
  openApplyLeaveDialog,
  closeApplyLeaveDialog,
  handleApplyLeaveSubmitted,
  printApplicationsPdf,
  handleApplicationRowClick,
  getLeaveBalanceTextItems,
  getCurrentLeaveBalanceDisplay,
  getCurrentCtoAvailableHoursDisplay,
  getApplicationCtoRequiredHoursDisplay,
  getCtoDeductedHoursDisplay,
  getApplicationDurationDisplay,
  getApplicationInclusiveDateColumnLines,
  getApplicationInclusiveDateLines,
  getSelectedDateIndicatorRows,
  getPendingUpdateDateIndicatorRows,
  hasPendingDateUpdate,
  formatDate,
  getApplicationStatusColor,
  getApplicationStatusLabel,
  getEditRequestBadgeLabel,
  hasApplicationEditRequest,
  getApplicationEditRequestStatusLabel,
  getApplicationEditRequestStatusFieldLabel,
  getApplicationEditRequestApprovedBadgeLabel,
  getApplicationEditRequestSectionTitle,
  shouldShowApplicationEditRequestDateComparison,
  getApplicationEditRequestRequestedAt,
  getApplicationEditRequestRequestedBy,
  getApplicationEditRequestReason,
  getApplicationEditRequestFromDates,
  getApplicationEditRequestToDates,
  getApplicationEditRequestCurrentDuration,
  getApplicationEditRequestRequestedDuration,
  isApplicationEditRequestHrApproved,
  shouldShowPendingDateComparisonInDetails,
  openDetails,
  openCalendarPreview,
  onCalendarPreviewNavigation,
  handleCalendarPreviewModelUpdate,
  handleCalendarPreviewSurfacePointerDown,
  handleCalendarPreviewSurfaceClick,
  syncCalendarPreviewDecorations,
  canPrintApplication,
  printApplication,
  isCocApplication,
  isCtoLeaveApplication,
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
  canPrintRequestChangesApplication,
  printRequestChangesApplication,
  formatApplicationLeaveTypeLabel,
  printRequestChangesActionResult,
  shouldShowCurrentLeaveBalance,
} = useAdminApplicationsPage()

function getFinalStatusForStatusColumn(app) {
  const updateRequestBadgeLabel = getEditRequestBadgeLabel(app)
  if (updateRequestBadgeLabel) {
    return updateRequestBadgeLabel
  }

  if (hasApplicationEditRequest(app)) {
    const editRequestStatusLabel = getApplicationEditRequestStatusLabel(app)
    if (editRequestStatusLabel && editRequestStatusLabel !== 'N/A') return editRequestStatusLabel
  }

  return app?.displayStatus || getApplicationStatusLabel(app)
}

function getApplicationDetailsLeaveTypeLabel(app) {
  if (!app) return 'N/A'
  const leaveType = String(formatApplicationLeaveTypeLabel(app?.leaveType) || '').trim()
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

function shouldScrollInclusiveDates(app) {
  if (!app || app.is_monetization) return false

  if (hasPendingDateUpdate(app)) {
    return (
      getSelectedDateIndicatorRows(app).length + getPendingUpdateDateIndicatorRows(app).length > 3
    )
  }

  const dateIndicatorRows = getSelectedDateIndicatorRows(app)
  if (dateIndicatorRows.length) {
    return dateIndicatorRows.length > 3
  }

  return getApplicationInclusiveDateLines(app).length > 3
}

function setCalendarPreviewRefElement(element) {
  calendarPreviewRef.value = element
}
</script>

<style scoped>
.pending-actions-cell {
  width: 228px;
  padding-right: 8px;
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
.status-cell-wrap {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.applications-table--interactive :deep(tbody tr) {
  cursor: pointer;
}
.leave-balance-cell-column {
  padding-left: 4px !important;
  padding-right: 6px !important;
}
.leave-balance-cell {
  min-width: 116px;
  margin-left: -4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.2;
}
.leave-balance-badge {
  padding: 2px 6px;
  font-size: 0.66rem;
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
.admin-application-details-dialog :deep(.q-dialog__inner--minimized) {
  padding: 12px 14px 16px;
}

.admin-application-details-dialog :deep(.q-dialog__inner--minimized > div) {
  width: min(700px, calc(100vw - 28px));
  max-width: min(700px, calc(100vw - 28px)) !important;
}

.admin-application-details-card {
  width: 100%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.16),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

.admin-application-details-accent {
  height: 5px;
  background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 48%, #43a047 100%);
}

.admin-application-details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 10px;
  background: linear-gradient(180deg, rgba(46, 125, 50, 0.14) 0%, rgba(46, 125, 50, 0.06) 100%);
  flex: 0 0 auto;
}

.admin-application-details-header-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.admin-application-details-icon {
  background: rgba(46, 125, 50, 0.16);
  color: #2e7d32;
  border: 1px solid rgba(46, 125, 50, 0.28);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.09);
}

.admin-application-details-header-copy {
  min-width: 0;
}

.admin-application-details-title {
  font-size: 1rem;
  font-weight: 700;
  color: #102a43;
  line-height: 1.35;
  letter-spacing: -0.005em;
}

.admin-application-details-subtitle {
  margin-top: 1px;
  font-size: 0.78rem;
  color: #486581;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-application-details-meta {
  margin-top: 6px;
  gap: 8px;
  flex-wrap: wrap;
}

.admin-application-details-meta-chip {
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid #d8e4ee;
  font-size: 0.7rem;
  font-weight: 600;
}

.admin-application-details-meta-chip--status {
  border-color: transparent;
}

.admin-application-details-header-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.admin-application-details-header-balance-text {
  text-align: right;
}

.admin-application-details-header-balance-value {
  margin-top: 2px;
  color: #1b5e20;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.35;
}

.admin-application-details-close {
  color: #607d8b;
  margin-top: 0;
}

.admin-application-details-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 14px !important;
  background:
    radial-gradient(circle at top right, rgba(2, 119, 189, 0.06), transparent 45%),
    linear-gradient(to bottom, #ffffff, #fcfdff);
}

.admin-application-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
  align-content: start;
}

.admin-application-details-item {
  min-width: 0;
  border: 1px solid #d9e8f2;
  border-radius: 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.65);
}

.admin-application-details-item--full {
  grid-column: 1 / -1;
}

.admin-application-details-item--reason {
  height: 100%;
}

.admin-application-details-label {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #829ab1;
}

.admin-application-requested-changes-section {
  border: 1px solid #d9e8f2;
  border-radius: 10px;
  padding: 10px 12px;
  background: rgba(236, 247, 255, 0.55);
}

.admin-application-requested-changes-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.admin-application-requested-changes-item {
  border: 1px dashed #b5cee2;
  border-radius: 8px;
  padding: 8px 10px;
  background: #ffffff;
}

.admin-application-requested-changes-title {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #4b6b85;
  margin-bottom: 6px;
}

.admin-application-requested-changes-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1.35;
  margin-bottom: 2px;
}

.admin-application-requested-changes-key {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.admin-application-requested-changes-value {
  color: #1f2937;
  font-size: 0.78rem;
}

.admin-application-requested-changes-value--requested {
  color: #4c1d95;
}

.admin-application-requested-changes-value--final {
  color: #166534;
  font-weight: 600;
}

.admin-application-requested-changes-meta {
  font-size: 0.78rem;
  line-height: 1.45;
  color: #374151;
}

.admin-application-details-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-application-details-scroll-area {
  max-height: 78px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
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

.admin-application-details-actions {
  flex: 0 0 auto;
  padding: 0 14px 14px;
  gap: 8px;
  border-top: 1px solid #d6e4ee;
  background: #fff;
}

@media (max-width: 599px) {
  .admin-application-details-dialog :deep(.q-dialog__inner--minimized) {
    padding: 10px 10px 14px;
  }

  .admin-application-details-dialog :deep(.q-dialog__inner--minimized > div) {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px) !important;
  }

  .admin-application-details-card {
    max-height: calc(100vh - 24px);
  }

  .admin-application-details-header {
    padding: 12px 12px 8px;
  }

  .admin-application-details-header-main {
    align-items: flex-start;
  }

  .admin-application-details-header-side {
    gap: 6px;
  }

  .admin-application-details-header-balance-value {
    font-size: 0.8rem;
  }

  .admin-application-details-icon {
    width: 40px !important;
    height: 40px !important;
  }

  .admin-application-details-meta {
    gap: 6px;
  }

  .admin-application-details-meta-chip {
    font-size: 0.64rem;
    padding: 2px 8px;
  }

  .admin-application-details-content {
    padding: 12px !important;
  }

  .admin-application-details-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .admin-application-requested-changes-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .admin-application-details-lines {
    gap: 4px;
  }

  .admin-application-details-scroll-area {
    max-height: 72px;
  }

  .admin-application-duration-columns {
    gap: 5px;
  }

  .admin-application-duration-date {
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .admin-application-details-actions {
    padding: 0 12px 12px;
    justify-content: stretch;
  }

  .admin-application-details-actions .q-btn {
    flex: 1 1 auto;
    min-width: 0;
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

}
</style>
