<template>
  <q-card
    flat
    bordered
    :class="[
      'hr-applications-panel rounded-borders q-mb-lg',
      { 'hr-applications-panel--coc-only': isCocOnlyView },
    ]"
  >
    <q-card-section>
      <div
        class="row items-center justify-between q-mb-md q-col-gutter-sm applications-panel-toolbar"
      >
        <div class="col applications-panel-toolbar__search">
          <q-input
            v-model="statusSearch"
            :debounce="350"
            dense
            outlined
            clearable
            placeholder="Search all applications columns"
            class="application-status-search application-status-search--left"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-auto row items-center q-gutter-sm applications-panel-toolbar__actions">
          <q-btn
            v-if="!isCocOnlyView && eligibleActionableRowsOnPage.length > 0 && selectedApplications.length === 0"
            outline
            dense
            no-caps
            size="sm"
            color="primary"
            icon="checklist"
            :label="`Select All on Page (${eligibleActionableRowsOnPage.length})`"
            @click="selectAllEligibleOnPage"
          />
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
      </div>

      <!-- Bulk Selection Action Bar -->
      <transition name="q-transition--slide-down">
        <div
          v-if="!isCocOnlyView && selectedApplications.length > 0"
          class="bulk-action-bar row items-center justify-between q-pa-sm q-mt-xs bg-indigo-1 rounded-borders border-indigo-3"
        >
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="checklist" color="primary" size="sm" />
            <span class="text-subtitle2 text-grey-9 text-weight-bold">
              {{ selectedApplications.length }} application{{ selectedApplications.length === 1 ? '' : 's' }} selected
            </span>
          </div>

          <div class="row items-center q-gutter-x-xs">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              color="grey-8"
              icon="clear_all"
              label="Deselect All"
              @click="selectedApplications = []"
            />
            <q-btn
              v-if="eligibleActionableRowsOnPage.length > 0 && selectedApplications.length < eligibleActionableRowsOnPage.length"
              flat
              dense
              no-caps
              size="sm"
              color="primary"
              icon="select_all"
              label="Select All on Page"
              @click="selectAllEligibleOnPage"
            />
            <!-- Bulk CMO/CVMO Review Action -->
            <q-btn
              v-if="selectedCmoCbmoApplications.length > 0"
              unelevated
              dense
              no-caps
              color="deep-purple-7"
              text-color="white"
              icon="check_circle"
              class="q-px-sm"
              :loading="bulkCmoCbmoReviewLoading"
              :label="`Approve CMO/CVMO Review (${selectedCmoCbmoApplications.length})`"
              @click="openBulkCmoCbmoConfirmDialog"
            />
            <!-- Bulk Release Action -->
            <q-btn
              v-if="selectedReleaseApplications.length > 0"
              unelevated
              dense
              no-caps
              color="secondary"
              text-color="white"
              icon="assignment_turned_in"
              class="q-px-sm"
              :loading="bulkReleaseLoading"
              :label="`Release Applications (${selectedReleaseApplications.length})`"
              @click="openBulkReleaseConfirmDialog"
            />
          </div>
        </div>
      </transition>
    </q-card-section>
    <q-table
      :rows="applicationsForTable"
      :columns="applicationTableColumns"
      row-key="application_uid"
      flat
      :selection="isCocOnlyView ? 'none' : 'multiple'"
      v-model:selected="selectedApplications"
      v-model:pagination="tablePagination"
      :rows-per-page-options="isServerPaginatedLeaveView ? [10, 25, 50] : [10]"
      :loading="loading"
      :class="[
        'applications-table applications-table--interactive',
        { 'applications-table--coc-only': isCocOnlyView },
      ]"
      @request="handleTableRequest"
      @row-click="handleApplicationRowClick"
    >
      <template #header-selection>
        <q-checkbox
          v-if="!isCocOnlyView && eligibleActionableRowsOnPage.length > 0"
          :model-value="isAllEligibleOnPageSelected"
          :indeterminate="isSomeEligibleOnPageSelected"
          dense
          size="sm"
          color="primary"
          @update:model-value="toggleAllEligibleOnPage"
        >
          <q-tooltip>Select / Deselect all eligible applications on this page</q-tooltip>
        </q-checkbox>
      </template>
      <template #body-selection="props">
        <q-checkbox
          v-if="!isCocOnlyView && canShowSelectCheckbox(props.row)"
          v-model="props.selected"
          dense
          size="sm"
          :color="canShowCmoCbmoReviewAction(props.row) ? 'deep-purple-7' : 'secondary'"
        />
      </template>
      <template #no-data>
        <div class="full-width row flex-center q-pa-lg text-grey-7">
          <template v-if="loading">
            <q-spinner color="primary" size="24px" class="q-mr-sm" />
            <span>Loading applications...</span>
          </template>
          <template v-else>
            <q-icon name="inbox" size="md" class="q-mr-sm" />
            <span>No applications available</span>
          </template>
        </div>
      </template>
      <template #body-cell-employee="props">
        <q-td>
          <div class="text-weight-medium application-employee-name" :title="props.row.employeeName">
            {{ props.row.employeeName }}
          </div>
          <div class="text-caption text-grey-7">{{ props.row.employee_control_no }}</div>
        </q-td>
      </template>
      <template #body-cell-leaveType="props">
        <q-td>
          <div class="application-details-cell">
            <template v-if="hasPendingLeaveTypeUpdate(props.row)">
              <span class="text-caption text-grey-7 block">Current</span>
              <span class="text-weight-medium text-grey-9 block">{{
                formatMonetizationLeaveTypeLabel(getCurrentLeaveTypeLabel(props.row))
              }}</span>
              <span class="text-caption text-deep-purple-8 block application-date-change-label"
                >Requested</span
              >
              <span class="text-weight-medium text-deep-purple-8 block">{{
                formatMonetizationLeaveTypeLabel(getRequestedLeaveTypeLabel(props.row))
              }}</span>
            </template>
            <template v-else>
              <span class="text-weight-medium text-grey-9 block">{{
                formatMonetizationLeaveTypeLabel(getCurrentLeaveTypeLabel(props.row))
              }}</span>
            </template>
          </div>
        </q-td>
      </template>
      <template #body-cell-inclusiveDates="props">
        <q-td>
          <div class="application-details-cell">
            <template v-if="props.row?.is_monetization">
              <span class="text-weight-medium text-grey-9 block">N/A</span>
            </template>
            <template v-else-if="hasPendingDateUpdate(props.row) && getLatestUpdateRequestStatus(props.row) !== 'APPROVED'">
              <span class="text-caption text-grey-7 block">Current</span>
              <span
                v-for="(line, index) in getApplicationInclusiveDateColumnLines(props.row)"
                :key="`${props.row.application_uid || props.row.id}-inclusive-current-${index}`"
                class="text-weight-medium text-grey-9 block"
                @click.stop="openCalendarPreview(props.row)"
              >
                {{ line }}
              </span>
              <span class="text-caption text-deep-purple-8 block application-date-change-label"
                >Requested</span
              >
              <span
                v-for="(line, index) in getPendingUpdateInclusiveDateLines(props.row)"
                :key="`${props.row.application_uid || props.row.id}-inclusive-requested-${index}`"
                class="text-weight-medium text-deep-purple-8 block"
                @click.stop="openCalendarPreview(props.row)"
              >
                {{ line }}
              </span>
            </template>
            <template v-else>
              <span
                v-for="(line, index) in getApplicationInclusiveDateColumnLines(props.row)"
                :key="`${props.row.application_uid || props.row.id}-inclusive-${index}`"
                class="text-weight-medium text-grey-9 block"
                @click.stop="openCalendarPreview(props.row)"
              >
                {{ line }}
              </span>
            </template>
          </div>
        </q-td>
      </template>
      <template #body-cell-dateFiled="props">
        <q-td>
          <span class="text-weight-medium text-grey-9">{{
            formatDate(props.row.dateFiled) || 'N/A'
          }}</span>
        </q-td>
      </template>
      <template #body-cell-lateDeadline="props">
        <q-td>
          <span class="text-weight-medium text-grey-9">{{
            formatDate(props.row.late_filing_deadline) || 'N/A'
          }}</span>
        </q-td>
      </template>
      <template #body-cell-days="props">
        <q-td>
          <div class="application-duration-cell">
            <span class="text-weight-medium text-grey-9 block">
              {{ getApplicationDurationDisplay(props.row) }}
            </span>
            <span
              v-if="getCtoHoursRowCaption(props.row)"
              class="text-caption text-grey-7 block application-duration-subtext"
            >
              {{ getCtoHoursRowCaption(props.row) }}
            </span>
          </div>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td>
          <div class="status-cell-wrap row items-center no-wrap q-gutter-x-xs">
            <StatusBadge
              :status="getFinalStatusForStatusColumn(props.row)"
              :tooltip="getStatusTooltipForStatusColumn(props.row)"
            />
            <q-badge
              v-if="hasApprovedEditRequest(props.row)"
              color="teal-8"
              text-color="white"
              rounded
              class="text-weight-bold q-px-xs"
              style="font-size: 10px; cursor: help; letter-spacing: 0.3px;"
            >
              Edited
              <q-tooltip anchor="top middle" self="bottom middle">Edit Request Approved</q-tooltip>
            </q-badge>
          </div>
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td class="text-center">
          <div class="row inline no-wrap justify-center q-gutter-x-xs">
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="visibility"
              @click.stop="openDetails(props.row)"
            >
              <q-tooltip>View Application Details</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canOpenCalendarPreview(props.row)"
              flat
              dense
              round
              size="sm"
              icon="calendar_month"
              color="primary"
              @click.stop="openCalendarPreview(props.row)"
            >
              <q-tooltip>View Calendar</q-tooltip>
            </q-btn>
            <q-btn
              v-if="showApplicationEditAction && canEditApplication(props.row)"
              flat
              dense
              round
              size="sm"
              icon="edit"
              color="primary"
              @click.stop="openEdit(props.row)"
            >
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowPendingReceiveAction(props.row)"
              flat
              dense
              round
              size="sm"
              icon="inventory_2"
              color="teal-6"
              :disable="receiveLoading"
              @click.stop="confirmApplicationReceive(props.row)"
            >
              <q-tooltip>Receive</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowHrReviewDecisionActions(props.row)"
              flat
              dense
              round
              size="sm"
              icon="cancel"
              color="negative"
              @click.stop="openActionConfirm('reject', props.row)"
            >
              <q-tooltip>{{ getRejectActionLabel(props.row) }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowHrReviewDecisionActions(props.row)"
              flat
              dense
              round
              size="sm"
              icon="check_circle"
              :color="getApproveActionColor(props.row)"
              @click.stop="openActionConfirm('approve', props.row)"
            >
              <q-tooltip>{{ getApproveActionLabel(props.row) }}</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowCmoCbmoReviewAction(props.row)"
              flat
              dense
              round
              size="sm"
              icon="check_circle"
              color="deep-purple-6"
              :disable="releaseLoading"
              @click.stop="confirmApplicationCmoCbmoReview(props.row)"
            >
              <q-tooltip>Approve CMO/CVMO Review</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowPendingReleaseAction(props.row)"
              flat
              dense
              round
              size="sm"
              icon="outbox"
              color="indigo-6"
              :disable="releaseLoading"
              @click.stop="confirmApplicationRelease(props.row)"
            >
              <q-tooltip>Release</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canShowCocCertificatePrintAction(props.row)"
              flat
              dense
              round
              size="sm"
              icon="print"
              color="blue-grey-7"
              @click.stop="printCocCertificate(props.row)"
            >
              <q-tooltip>Print COC Certificate</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canRecallApplication(props.row)"
              flat
              dense
              round
              size="sm"
              icon="undo"
              color="warning"
              @click.stop="openRecall(props.row)"
            >
              <q-tooltip>Recall</q-tooltip>
            </q-btn>
          </div>
        </q-td>
      </template>
    </q-table>
  </q-card>

  <HrApplicationTimelineDialog
    v-model="showTimelineDialog"
    :application="selectedApp"
    :loading-timeline="timelineLoading"
    :build-timeline="buildApplicationTimeline"
    :can-receive-application="canReceiveApplication"
    :is-application-received-by-hr="isApplicationReceivedByHr"
    :get-received-by-hr-summary="getReceivedByHrSummary"
    :can-release-application="canReleaseApplication"
    :is-application-released="isApplicationReleased"
    :get-released-by-hr-summary="getReleasedByHrSummary"
    :has-application-attachment="hasApplicationAttachment"
    :receive-loading="receiveLoading"
    :release-loading="releaseLoading"
    :undo-receive-loading="undoReceiveLoading"
    :undo-release-loading="undoReleaseLoading"
    @receive="confirmApplicationReceive"
    @release="confirmApplicationRelease"
    @undo-receive="confirmApplicationReceiveUndo"
    @undo-release="confirmApplicationReleaseUndo"
    @view-attachment="viewApplicationAttachment"
  />

  <HrApplicationDetailsDialog
    v-model="showDetailsDialog"
    :application="selectedApp"
    :is-mobile="$q.screen.lt.sm"
    :show-application-edit-action="showApplicationEditAction"
    :format-date="formatDate"
    :has-application-attachment="hasApplicationAttachment"
    :has-pending-leave-type-update="hasPendingLeaveTypeUpdate"
    :get-current-leave-type-label="getCurrentLeaveTypeLabel"
    :get-requested-leave-type-label="getRequestedLeaveTypeLabel"
    :get-edit-request-status-label="getEditRequestStatusLabel"
    :get-edit-request-status-field-label="getEditRequestStatusFieldLabel"
    :get-edit-request-badge-color="getEditRequestBadgeColor"
    :has-application-edit-request="hasApplicationEditRequest"
    :should-show-application-edit-request-section="shouldShowApplicationEditRequestSection"
    :get-application-edit-request-section-title="getApplicationEditRequestSectionTitle"
    :should-show-application-edit-request-date-comparison="
      shouldShowApplicationEditRequestDateComparison
    "
    :get-application-edit-request-from-dates="getApplicationEditRequestFromDates"
    :get-application-edit-request-to-dates="getApplicationEditRequestToDates"
    :get-application-edit-request-current-duration="getApplicationEditRequestCurrentDuration"
    :get-application-edit-request-requested-duration="getApplicationEditRequestRequestedDuration"
    :get-application-edit-request-requested-at="getApplicationEditRequestRequestedAt"
    :get-application-edit-request-reason="getApplicationEditRequestReason"
    :get-application-duration-display="getApplicationDurationDisplay"
    :has-pending-duration-update="hasPendingDurationUpdate"
    :get-requested-duration-display="getRequestedDurationDisplay"
    :is-coc-application="isCocApplication"
    :has-pending-reason-update="hasPendingReasonUpdate"
    :get-coc-nature-of-overtime-lines="getCocNatureOfOvertimeLines"
    :get-current-reason-display="getCurrentReasonDisplay"
    :get-requested-reason-display="getRequestedReasonDisplay"
    :has-pending-date-update="hasPendingDateUpdate"
    :get-selected-date-pay-status-rows="getSelectedDatePayStatusRows"
    :get-selected-date-pay-status-columns="getSelectedDatePayStatusColumns"
    :get-application-inclusive-date-lines="getApplicationInclusiveDateLines"
    :get-pending-update-date-pay-status-rows="getPendingUpdateDatePayStatusRows"
    :get-pending-update-date-pay-status-columns="getPendingUpdateDatePayStatusColumns"
    :get-pending-update-inclusive-date-lines="getPendingUpdateInclusiveDateLines"
    :get-selected-date-columns="getSelectedDateColumns"
    :get-details-remarks-rows="getDetailsRemarksRows"
    :should-show-details-remarks="shouldShowDetailsRemarks"
    :can-print-coc-certificate="canPrintCocCertificate"
    :has-mobile-application-actions="hasMobileApplicationActions"
    :can-edit-application="canEditApplication"
    :can-recall-application="canRecallApplication"
    :can-override-application-pay-status="canOverrideApplicationPayStatus"
    :pay-status-override-loading="payStatusOverrideLoading"
    :get-final-status-for-status-column="getFinalStatusForStatusColumn"
    :get-status-tooltip-for-status-column="getStatusTooltipForStatusColumn"
    :get-approve-action-label="getApproveActionLabel"
    :get-approve-action-color="getApproveActionColor"
    :get-reject-action-label="getRejectActionLabel"
    @view-attachment="viewApplicationAttachment"
    @open-edit="openEdit"
    @open-action-confirm="openActionConfirm"
    @open-recall="openRecall"
    @print-certificate="printCocCertificate"
    @override-pay-status="overrideApplicationPayStatus"
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

  <HrApplicationConfirmActionDialog
    v-model="showConfirmActionDialog"
    :confirm-action-type="confirmActionType"
    :application="confirmActionTarget"
    :get-approve-action-label="getApproveActionLabel"
    :get-reject-action-label="getRejectActionLabel"
    :is-edit-request="isPendingEditRequest(resolveApplication(confirmActionTarget))"
    :is-coc-application="isCocApplication"
    :is-pending-edit-request="isPendingEditRequest"
    :get-leave-request-action-type="getLeaveRequestActionType"
    :get-application-id="getApplicationId"
    @request-reject="handleConfirmRequestReject"
    @approved="handleDialogMutationSuccess"
  />

  <HrApplicationEditDialog
    v-model="showEditDialog"
    :application="editTargetApp"
    :all-applications="applications"
    :format-date="formatDate"
    :get-actual-requested-day-count="getActualRequestedDayCount"
    @saved="handleDialogMutationSuccess"
  />

  <HrApplicationRejectDialog
    v-model="showRejectDialog"
    :application="rejectTargetApp"
    :get-reject-action-label="getRejectActionLabel"
    :is-coc-application="isCocApplication"
    :is-pending-edit-request="isPendingEditRequest"
    :get-leave-request-action-type="getLeaveRequestActionType"
    :get-application-id="getApplicationId"
    @rejected="handleDialogMutationSuccess"
  />

  <HrApplicationRecallDialog
    v-model="showRecallDialog"
    :application="recallDialogApplication"
    :get-recall-date-options="getRecallDateOptions"
    :get-selected-date-pay-status-rows="getSelectedDatePayStatusRows"
    :get-selected-date-coverage-weights="getSelectedDateCoverageWeights"
    :format-recall-date-label="formatRecallDateLabel"
    :to-iso-date="toIsoDate"
    :get-application-id="getApplicationId"
    @recalled="handleDialogMutationSuccess"
  />

  <!-- Bulk CMO/CVMO Review Confirmation Dialog -->
  <q-dialog v-model="showBulkCmoCbmoConfirmDialog" persistent>
    <q-card class="rounded-borders" style="width: min(560px, 94vw)">
      <q-card-section class="row items-center q-pb-none">
        <q-avatar icon="playlist_add_check" color="deep-purple-1" text-color="deep-purple-8" size="md" />
        <div class="text-h6 text-weight-bold q-ml-sm">Approve CMO / CVMO Review</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="bulkCmoCbmoReviewLoading" />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="text-body2 text-grey-9 q-mb-md">
          You are about to batch-approve <strong>{{ selectedCmoCbmoApplications.length }}</strong> leave application(s) for CMO/CVMO Review. Once approved, they will advance to <strong>Pending Release</strong>.
        </div>

        <!-- Selected Applications List Summary -->
        <div class="text-caption text-weight-bold text-grey-7 q-mb-xs">Selected Applications:</div>
        <q-scroll-area style="height: 180px;" class="bg-grey-1 rounded-borders q-pa-sm border-grey-3">
          <q-list dense separator>
            <q-item v-for="app in selectedCmoCbmoApplications" :key="`bulk-app-${app.id || app.application_uid}`">
              <q-item-section>
                <q-item-label class="text-weight-medium text-grey-9">{{ app.employeeName || 'Unknown Employee' }}</q-item-label>
                <q-item-label caption class="text-grey-7">
                  {{ app.leaveType || app.leave_type_name || 'Leave' }} ({{ getApplicationDurationDisplay(app) }})
                  <span class="text-grey-6 q-ml-xs">• Filed {{ formatDate(app.dateFiled || app.filed_at || app.created_at) || 'N/A' }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="deep-purple-7" label="CMO/CVMO Review" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn
          flat
          no-caps
          label="Cancel"
          color="grey-7"
          v-close-popup
          :disable="bulkCmoCbmoReviewLoading"
        />
        <q-btn
          unelevated
          no-caps
          color="deep-purple-7"
          text-color="white"
          icon="check_circle"
          :loading="bulkCmoCbmoReviewLoading"
          :label="`Approve ${selectedCmoCbmoApplications.length} Application${selectedCmoCbmoApplications.length === 1 ? '' : 's'}`"
          @click="handleConfirmBulkCmoCbmoReview"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Bulk Release Confirmation Dialog -->
  <q-dialog v-model="showBulkReleaseConfirmDialog" persistent>
    <q-card class="rounded-borders" style="width: min(560px, 94vw)">
      <q-card-section class="row items-center q-pb-none">
        <q-avatar icon="assignment_turned_in" color="blue-1" text-color="secondary" size="md" />
        <div class="text-h6 text-weight-bold q-ml-sm">Confirm Batch Release</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="bulkReleaseLoading" />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="text-body2 text-grey-9 q-mb-md">
          You are about to batch-release <strong>{{ selectedReleaseApplications.length }}</strong> application(s). Once released, their status will become <strong>Released / Approved (Completed)</strong>.
        </div>

        <!-- Selected Applications List Summary -->
        <div class="text-caption text-weight-bold text-grey-7 q-mb-xs">Selected Applications:</div>
        <q-scroll-area style="height: 180px;" class="bg-grey-1 rounded-borders q-pa-sm border-grey-3">
          <q-list dense separator>
            <q-item v-for="app in selectedReleaseApplications" :key="`bulk-rel-app-${app.id || app.application_uid}`">
              <q-item-section>
                <q-item-label class="text-weight-medium text-grey-9">{{ app.employeeName || 'Unknown Employee' }}</q-item-label>
                <q-item-label caption class="text-grey-7">
                  {{ app.leaveType || app.leave_type_name || 'Leave' }} ({{ getApplicationDurationDisplay(app) }})
                  <span class="text-grey-6 q-ml-xs">• Filed {{ formatDate(app.dateFiled || app.filed_at || app.created_at) || 'N/A' }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="secondary" label="Pending Release" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn
          flat
          no-caps
          label="Cancel"
          color="grey-7"
          v-close-popup
          :disable="bulkReleaseLoading"
        />
        <q-btn
          unelevated
          no-caps
          color="secondary"
          text-color="white"
          icon="assignment_turned_in"
          :loading="bulkReleaseLoading"
          :label="`Release ${selectedReleaseApplications.length} Application${selectedReleaseApplications.length === 1 ? '' : 's'}`"
          @click="handleConfirmBulkRelease"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { computed, defineComponent, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import StatusBadge from 'components/StatusBadge.vue'
import AdminApplicationCalendarDialog from 'components/admin/AdminApplicationCalendarDialog.vue'
import HrApplicationTimelineDialog from 'components/hr/HrApplicationTimelineDialog.vue'
import HrApplicationDetailsDialog from 'components/hr/HrApplicationDetailsDialog.vue'
import HrApplicationConfirmActionDialog from 'components/hr/HrApplicationConfirmActionDialog.vue'
import HrApplicationEditDialog from 'components/hr/HrApplicationEditDialog.vue'
import HrApplicationRejectDialog from 'components/hr/HrApplicationRejectDialog.vue'
import HrApplicationRecallDialog from 'components/hr/HrApplicationRecallDialog.vue'
import { useHrApplicationsPanel } from 'src/composables/useHrApplicationsPanel'

export default defineComponent({
  name: 'HrApplicationsPanel',
  props: {
    applicationType: {
      type: String,
      default: '',
    },
    applicationSource: {
      type: String,
      default: '',
    },
    pendingReceive: {
      type: Boolean,
      default: false,
    },
    pendingRelease: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    AdminApplicationCalendarDialog,
    StatusBadge,
    HrApplicationTimelineDialog,
    HrApplicationDetailsDialog,
    HrApplicationConfirmActionDialog,
    HrApplicationEditDialog,
    HrApplicationRejectDialog,
    HrApplicationRecallDialog,
  },
  setup(props) {
    const normalizeDisapprovedStatusLabel = (statusValue) => {
      const normalizedStatus = String(statusValue || '')
        .trim()
        .replace(/^HR Certification(?: Completed)?$/i, (match) =>
          match.replace(/^HR Certification/i, 'CHRMO Certification'),
        )
      const upperStatus = normalizedStatus.toUpperCase()

      if (upperStatus === 'DISAPPROVED' || upperStatus === 'REJECTED') {
        return 'Not Certified'
      }

      return normalizedStatus.replace(/rejected/gi, 'Disapproved')
    }

    const panel = useHrApplicationsPanel({
      applicationType: props.applicationType,
      applicationSource: props.applicationSource,
      pendingReceive: props.pendingReceive,
      pendingRelease: props.pendingRelease,
    })

    function getDisplayApplicationStatusLabel(app) {
      const statusLabel = String(
        panel.getApplicationStatusLabel(app) || app?.displayStatus || '',
      ).trim()
      return normalizeDisapprovedStatusLabel(statusLabel)
    }

    const showCalendarPreviewDialog = ref(false)
    const calendarPreviewApp = ref(null)
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
    const isCocOnlyView = computed(
      () => String(props.applicationType || '').trim().toUpperCase() === 'COC',
    )
    const $q = useQuasar()
    const showBulkCmoCbmoConfirmDialog = ref(false)
    const showBulkReleaseConfirmDialog = ref(false)

    function canShowCmoCbmoReviewAction(app) {
      return (
        !panel.isCocApplication(app) &&
        panel.getApplicationStatusLabel(app) === 'CMO/CVMO Review' &&
        panel.canCmoCbmoReviewApplication(app)
      )
    }

    function canShowPendingReleaseAction(app) {
      if (panel.getLatestUpdateRequestStatus(app) === 'REJECTED') return false

      const stageStatus = panel.getApplicationStatusLabel(app)
      return (
        (stageStatus === 'Pending Release' ||
          stageStatus === 'Release' ||
          stageStatus === 'Pending Update Release') &&
        panel.canReleaseApplication(app)
      )
    }

    function canShowSelectCheckbox(app) {
      return canShowCmoCbmoReviewAction(app) || canShowPendingReleaseAction(app)
    }

    const selectedCmoCbmoApplications = computed(() =>
      (panel.selectedApplications.value || []).filter((app) => canShowCmoCbmoReviewAction(app)),
    )

    const selectedReleaseApplications = computed(() =>
      (panel.selectedApplications.value || []).filter((app) => canShowPendingReleaseAction(app)),
    )

    const eligibleActionableRowsOnPage = computed(() =>
      (panel.applicationsForTable.value || []).filter((app) => canShowSelectCheckbox(app)),
    )

    const isAllEligibleOnPageSelected = computed(() => {
      if (!eligibleActionableRowsOnPage.value.length) return false
      const selectedKeys = new Set(
        (panel.selectedApplications.value || []).map((app) => panel.getApplicationRowKey(app)),
      )
      return eligibleActionableRowsOnPage.value.every((app) =>
        selectedKeys.has(panel.getApplicationRowKey(app)),
      )
    })

    const isSomeEligibleOnPageSelected = computed(() => {
      if (isAllEligibleOnPageSelected.value) return false
      const selectedKeys = new Set(
        (panel.selectedApplications.value || []).map((app) => panel.getApplicationRowKey(app)),
      )
      return eligibleActionableRowsOnPage.value.some((app) =>
        selectedKeys.has(panel.getApplicationRowKey(app)),
      )
    })

    function selectAllEligibleOnPage() {
      const existingMap = new Map(
        (panel.selectedApplications.value || []).map((app) => [
          panel.getApplicationRowKey(app) || app.id || app.application_uid,
          app,
        ]),
      )
      for (const app of eligibleActionableRowsOnPage.value) {
        const key = panel.getApplicationRowKey(app) || app.id || app.application_uid
        existingMap.set(key, app)
      }
      panel.selectedApplications.value = Array.from(existingMap.values())
    }

    function toggleAllEligibleOnPage(selected) {
      if (selected) {
        selectAllEligibleOnPage()
      } else {
        const pageKeys = new Set(
          eligibleActionableRowsOnPage.value.map((app) => panel.getApplicationRowKey(app)),
        )
        panel.selectedApplications.value = (panel.selectedApplications.value || []).filter(
          (app) => !pageKeys.has(panel.getApplicationRowKey(app)),
        )
      }
    }

    function openBulkCmoCbmoConfirmDialog() {
      if (!selectedCmoCbmoApplications.value.length) {
        $q.notify({
          type: 'warning',
          message: 'Select at least one Leave application in CMO/CVMO Review stage.',
          position: 'top',
        })
        return
      }
      showBulkCmoCbmoConfirmDialog.value = true
    }

    async function handleConfirmBulkCmoCbmoReview() {
      const success = await panel.bulkApproveCmoCbmoReview(
        selectedCmoCbmoApplications.value,
      )
      if (success) {
        showBulkCmoCbmoConfirmDialog.value = false
      }
    }

    function openBulkReleaseConfirmDialog() {
      if (!selectedReleaseApplications.value.length) {
        $q.notify({
          type: 'warning',
          message: 'Select at least one application in Pending Release stage.',
          position: 'top',
        })
        return
      }
      showBulkReleaseConfirmDialog.value = true
    }

    async function handleConfirmBulkRelease() {
      const success = await panel.bulkReleaseApplications(
        selectedReleaseApplications.value,
      )
      if (success) {
        showBulkReleaseConfirmDialog.value = false
      }
    }

    const calendarPreviewYearMonth = computed(
      () => `${calendarPreviewView.value.year}/${calendarPreviewView.value.month}`,
    )
    const calendarPreviewEmployeeName = computed(
      () => calendarPreviewApp.value?.employeeName || 'Employee',
    )
    const calendarPreviewDateStates = computed(() => {
      const dateStates = new Map()
      const application = calendarPreviewApp.value
      if (!application) return dateStates

      const applicationState = getApplicationCalendarState(application)
      const requestUpdateDates = getApplicationRequestUpdateCalendarDates(application)
      const showRequestUpdateOnly = requestUpdateDates.length > 0

      if (applicationState && !showRequestUpdateOnly) {
        for (const date of getApplicationCalendarDates(application)) {
          if (!date) continue

          const existingState = dateStates.get(date)
          if (!existingState || applicationState === 'pending') {
            dateStates.set(date, applicationState)
          }
        }
      }

      for (const requestedDate of requestUpdateDates) {
        if (!requestedDate) continue
        dateStates.set(requestedDate, 'request-update')
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

    onBeforeUnmount(() => {
      clearCalendarPreviewWarning()
    })

    function getApplicationCalendarState(application) {
      const rawStatus = panel.getApplicationRawStatusKey(application)
      if (rawStatus === 'APPROVED') return 'approved'
      if (rawStatus.includes('PENDING')) return 'pending'
      return ''
    }

    function getApplicationCalendarDates(application) {
      return panel.resolveDateSetFromSource(application).filter(Boolean)
    }

    function getApplicationRequestUpdateCalendarDates(application) {
      const payload = panel.getPendingUpdatePayload(application)
      if (!payload) return []
      if (panel.getLatestUpdateRequestStatus(application) !== 'PENDING') return []
      if (panel.getLeaveRequestActionType(application) === 'REQUEST_CANCEL') return []
      return panel.resolveDateSetFromSource(payload).filter(Boolean)
    }

    function canOpenCalendarPreview(application) {
      if (!application || panel.isCocApplication(application) || application?.is_monetization) {
        return false
      }

      return (
        getApplicationCalendarDates(application).length > 0 ||
        getApplicationRequestUpdateCalendarDates(application).length > 0
      )
    }

    function setCalendarPreviewRefElement(element) {
      calendarPreviewRef.value = element
    }

    function setCalendarPreviewMonth(dateValue) {
      const normalizedDate = panel.toIsoDateString(dateValue) || panel.toIsoDateString(new Date())
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
      const normalizedDate = panel.toIsoDateString(dateValue)
      if (!normalizedDate) return ''

      return new Date(`${normalizedDate}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }

    function buildCalendarPreviewWarningMessage(dateValue) {
      const normalizedDate = panel.toIsoDateString(dateValue)
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
      const normalizedDate = panel.toIsoDateString(dateValue)
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

      const day = Number.parseInt(String(dayCell.textContent || '').trim(), 10)
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

            const day = Number.parseInt(String(cell.textContent || '').trim(), 10)
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
              const cellCenter = (cellRect.left - calendarRect.left) + (cellRect.width / 2)
              const popupLeft = Math.max(
                8,
                Math.min(cellCenter - (popupWidth * 0.58), calendarWidth - popupWidth - 8),
              )
              const popupTop = Math.max(6, (cellRect.top - calendarRect.top) - 56)
              const arrowLeft = Math.max(
                16,
                Math.min(cellCenter - popupLeft - 6, popupWidth - 18),
              )

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

    function openCalendarPreview(application) {
      const targetApplication = panel.resolveApplication(application) || application
      if (!canOpenCalendarPreview(targetApplication)) return

      const previewDates = [
        ...getApplicationRequestUpdateCalendarDates(targetApplication),
        ...getApplicationCalendarDates(targetApplication),
      ].filter(Boolean)
      const anchorDate =
        previewDates[0] ||
        panel.toIsoDateString(targetApplication?.dateFiled || targetApplication?.date_filed) ||
        panel.toIsoDateString(new Date())

      calendarPreviewApp.value = targetApplication
      calendarPreviewModel.value = []
      clearCalendarPreviewWarning()
      setCalendarPreviewMonth(anchorDate)
      calendarPreviewKey.value += 1
      showCalendarPreviewDialog.value = true
    }

    function getFinalStatusForStatusColumn(app) {
      const resolvedStatus = getDisplayApplicationStatusLabel(app)
      const normalizedResolvedStatus = resolvedStatus.toUpperCase()

      if (
        normalizedResolvedStatus.includes('RECALL') ||
        normalizedResolvedStatus.includes('REJECT') ||
        normalizedResolvedStatus.includes('DISAPPROV') ||
        normalizedResolvedStatus.includes('CANCEL')
      ) {
        return resolvedStatus
      }

      if (panel.isApplicationReleased(app)) return 'Released'

      const updateRequestBadgeLabel = panel.getEditRequestBadgeLabel(app)
      if (updateRequestBadgeLabel) return normalizeDisapprovedStatusLabel(updateRequestBadgeLabel)

      return getDisplayApplicationStatusLabel(app)
    }

    function getStatusTooltipForStatusColumn(app) {
      if (!panel.isApplicationReleased(app)) return ''

      const approvedAt = panel.formatDateTime(panel.resolveFinalApprovalDateValue(app))
      const releasedAt = panel.formatDateTime(panel.resolveReleasedDateValue(app))

      if (approvedAt && releasedAt) {
        return `Certified by HR on ${approvedAt}; released on ${releasedAt}.`
      }
      if (releasedAt) return `Certified by HR, then released on ${releasedAt}.`
      if (approvedAt) return `Certified by HR on ${approvedAt}; released.`
      return 'Certified by HR, then released.'
    }

    function canShowPendingReceiveAction(app) {
      const stageStatus = panel.getApplicationStatusLabel(app)
      return (
        (stageStatus === 'Pending Receive' ||
          stageStatus === 'CHRMO Certification' ||
          stageStatus === 'Pending Update Receive') &&
        panel.canReceiveApplication(app)
      )
    }

    function canShowHrReviewDecisionActions(app) {
      const rawStatus = panel.getApplicationRawStatusKey(app)
      return (
        (rawStatus === 'PENDING_HR' || rawStatus === 'PENDING_LATE_HR') &&
        !canShowPendingReceiveAction(app)
      )
    }

    function isChrmoCertificationStage(app) {
      return String(panel.getApplicationStatusLabel(app) || '').trim().toUpperCase() === 'CHRMO CERTIFICATION'
    }

    function isRecallRequestStage(app) {
      return panel.isRecallRequestAction(app)
    }

    function getApproveActionLabel(app) {
      if (isRecallRequestStage(app)) return 'Approve Recall'
      return isChrmoCertificationStage(app) ? 'Certify' : 'Approve'
    }

    function getApproveActionColor(app) {
      if (isRecallRequestStage(app)) return 'orange-8'
      return isChrmoCertificationStage(app) ? 'blue-6' : 'green-7'
    }

    function getRejectActionLabel(app) {
      if (isRecallRequestStage(app)) return 'Disapprove Recall'
      return isChrmoCertificationStage(app) ? 'Not Certify' : 'Disapprove'
    }

    function canShowCocCertificatePrintAction(app) {
      return panel.canPrintCocCertificate(app) && panel.isApplicationReceivedByHr(app)
    }

    function formatMonetizationLeaveTypeLabel(value) {
      const rawLabel = String(value || '').trim()
      if (!rawLabel) return 'N/A'

      const prefixMatch = rawLabel.match(/^monetization\s*\((.*)\)\s*$/i)
      const suffixMatch = /\(monetization\)\s*$/i.test(rawLabel)
      const normalizedLeaveType = (prefixMatch ? prefixMatch[1] : rawLabel)
        .replace(/\s*\(monetization\)\s*$/i, '')
        .trim()

      if (!normalizedLeaveType) return 'N/A'
      if (prefixMatch || suffixMatch) return `Monetization(${normalizedLeaveType})`

      return normalizedLeaveType
    }

    return {
      ...panel,
      showBulkCmoCbmoConfirmDialog,
      showBulkReleaseConfirmDialog,
      selectedCmoCbmoApplications,
      selectedReleaseApplications,
      eligibleActionableRowsOnPage,
      isAllEligibleOnPageSelected,
      isSomeEligibleOnPageSelected,
      selectAllEligibleOnPage,
      toggleAllEligibleOnPage,
      openBulkCmoCbmoConfirmDialog,
      handleConfirmBulkCmoCbmoReview,
      openBulkReleaseConfirmDialog,
      handleConfirmBulkRelease,
      canShowCocCertificatePrintAction,
      canOpenCalendarPreview,
      canShowCmoCbmoReviewAction,
      canShowPendingReleaseAction,
      canShowSelectCheckbox,
      canShowPendingReceiveAction,
      canShowHrReviewDecisionActions,
      formatMonetizationLeaveTypeLabel,
      calendarPreviewDateWarning,
      calendarPreviewEmployeeName,
      calendarPreviewKey,
      calendarPreviewModel,
      calendarPreviewStateCounts,
      calendarPreviewWarningState,
      calendarPreviewWarningStyle,
      calendarPreviewYearMonth,
      getApplicationCalendarDates,
      getApplicationRequestUpdateCalendarDates,
      getFinalStatusForStatusColumn,
      getStatusTooltipForStatusColumn,
      getApproveActionLabel,
      getApproveActionColor,
      getRejectActionLabel,
      handleCalendarPreviewModelUpdate,
      handleCalendarPreviewSurfaceClick,
      handleCalendarPreviewSurfacePointerDown,
      isCocOnlyView,
      onCalendarPreviewNavigation,
      openCalendarPreview,
      setCalendarPreviewRefElement,
      showCalendarPreviewDialog,
      syncCalendarPreviewDecorations,
    }
  },
})
</script>

<!-- Unscoped: q-dialog teleports to <body>, so scoped styles won't reliably apply -->
<style>
.hr-applications-panel .application-status-search {
  width: min(440px, 84vw);
}
.hr-applications-panel .applications-panel-toolbar {
  row-gap: 8px;
}

.hr-applications-panel .applications-panel-toolbar__search {
  min-width: 0;
  flex: 1 1 auto;
}

.hr-applications-panel .application-status-search--left {
  width: min(440px, 100%);
}

.hr-applications-panel .application-status-search--left .q-field {
  width: 100%;
}

.applications-table--interactive tbody tr {
  cursor: pointer;
}

.hr-applications-panel .applications-table thead th {
  white-space: normal;
  line-height: 1.3;
  height: auto;
}
.hr-applications-panel .applications-table .q-table__middle {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.hr-applications-panel .applications-table table {
  min-width: 100%;
}
.hr-applications-panel--coc-only .applications-table table {
  min-width: 960px;
}
.hr-applications-panel--coc-only .applications-table tbody td {
  white-space: normal;
}
.hr-applications-panel--coc-only .applications-table thead th,
.hr-applications-panel--coc-only .applications-table tbody td {
  padding-left: 10px;
  padding-right: 10px;
}
.hr-applications-panel--coc-only .application-employee-name {
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hr-applications-panel--coc-only .status-cell-wrap {
  min-width: 120px;
}
.hr-applications-panel--coc-only .status-cell-wrap .q-badge {
  white-space: nowrap;
}

.status-cell-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.application-date-change-label {
  margin-top: 4px;
}

.hr-requested-change-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hr-requested-change-item {
  font-size: 0.86rem;
  color: #4b5563;
  line-height: 1.35;
}

.hr-action-impact-preview {
  margin-top: 18px;
  text-align: left;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hr-action-impact-preview--recall {
  margin-top: 12px;
  padding: 10px 12px;
  gap: 8px;
}

.hr-action-impact-preview__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.hr-action-impact-preview__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.86rem;
  color: #1f2937;
}

.hr-action-impact-preview__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.hr-action-dialog-card {
  width: min(560px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  border-radius: 2px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
}

.hr-action-dialog-card--approve {
  border-color: #b7ddc1;
}

.hr-action-dialog-card--cancel {
  border-color: #efd6a7;
}

.hr-action-dialog-card--reject {
  border-color: #e6b8b8;
}

.hr-action-dialog-card--compact {
  width: min(420px, calc(100vw - 24px));
  min-width: 340px;
  max-width: 420px;
  border-radius: 2px;
}

.hr-action-dialog-card__content--compact {
  padding: 22px 26px 12px;
}

.hr-action-dialog-card--compact .hr-action-dialog-card__title {
  margin-top: 14px;
  font-size: 2rem;
  line-height: 1.1;
}

.hr-action-dialog-card--compact .hr-action-dialog-card__message {
  margin-top: 14px;
  font-size: 1.02rem;
}

.hr-action-dialog-card__avatar {
  color: #ffffff;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
}

.hr-action-dialog-card__avatar--approve {
  background: #2e7d32;
}

.hr-action-dialog-card__avatar--cancel {
  background: #f59e0b;
}

.hr-action-dialog-card__avatar--reject {
  background: #c62828;
}

.hr-action-dialog-card__actions--compact {
  justify-content: space-between;
  gap: 12px;
  padding: 12px 22px 20px;
}

.hr-action-dialog-card--compact .hr-action-dialog-card__button {
  flex: 0 0 auto;
  min-height: 44px;
  min-width: 140px;
  border-radius: 2px;
  font-weight: 700;
}

.hr-action-dialog-card--recall {
  width: 100%;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hr-action-dialog-card__content--recall {
  padding-top: 0;
  overflow: visible;
}

.hr-recall-layout {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.recall-date-grid {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 260px;
}

.recall-date-grid__head,
.recall-date-grid__row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1.2fr);
  align-items: center;
}

.recall-date-grid__head {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #475569;
  text-transform: uppercase;
}

.recall-date-grid__body {
  flex: 0 1 auto;
  max-height: 220px;
  overflow-y: auto;
}

.recall-date-grid__row {
  border-bottom: 1px solid #eef2f7;
}

.recall-date-grid__row:last-child {
  border-bottom: 0;
}

.recall-date-grid__cell {
  padding: 8px 10px;
  font-size: 0.85rem;
  color: #1f2937;
  min-width: 0;
}

.recall-date-grid__cell--select {
  display: flex;
  justify-content: center;
}

.recall-date-grid__cell--date {
  font-weight: 600;
}

.recall-date-grid__cell--meta {
  font-size: 0.8rem;
  color: #475569;
}

.recall-date-grid__empty {
  padding: 12px;
  font-size: 0.82rem;
  color: #6b7280;
  text-align: center;
}

.hr-recall-reason {
  flex: 0 0 auto;
}

.hr-recall-reason .q-field__native {
  min-height: 56px;
  max-height: 56px;
  overflow-y: auto;
  resize: none;
}

.hr-recall-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.9rem;
  color: #475569;
}

.hr-recall-total__label {
  font-weight: 600;
}

.hr-recall-total__value {
  font-weight: 700;
  color: #1f2937;
}

.hr-recall-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 12px;
  padding: 8px 24px 16px;
}

.hr-recall-actions__buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.hr-recall-actions__buttons .q-btn {
  border-radius: 2px;
}

.hr-receive-required-dialog .q-card {
  border-radius: 2px !important;
}

.hr-receive-required-dialog .q-btn {
  border-radius: 2px !important;
}

.hr-action-dialog-card__top {
  padding: 12px 12px 0;
}

.hr-action-dialog-card__content {
  padding: 8px 28px 12px;
}

.hr-action-dialog-card__title {
  font-size: 2rem;
  line-height: 1.1;
  font-weight: 500;
  color: #111827;
}

.hr-action-dialog-card__message {
  margin-top: 20px;
  font-size: 1.15rem;
  line-height: 1.45;
  color: #6b7280;
}

.hr-action-dialog-card__actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  padding: 0 28px 28px;
}

.hr-action-dialog-card__button {
  flex: 1 1 0;
  min-height: 56px;
  border-radius: 2px;
  font-size: 1rem;
  font-weight: 700;
}

.hr-action-dialog-card__button--cancel {
  background: transparent;
  border-color: transparent;
  color: #6b7280;
}

/* Keep HR confirmation dialog sizing/padding identical to Admin confirmation dialog */
.hr-action-dialog-card.hr-action-dialog-card--compact {
  width: min(420px, calc(100vw - 24px));
  min-width: 340px;
  max-width: 420px;
  border-radius: 2px;
}

.hr-action-dialog-card__content.hr-action-dialog-card__content--compact {
  padding: 22px 26px 12px;
}

.hr-action-dialog-card--compact .hr-action-dialog-card__title {
  margin-top: 14px;
  font-size: 2rem;
  line-height: 1.1;
}

.hr-action-dialog-card--compact .hr-action-dialog-card__message {
  margin-top: 14px;
  font-size: 1.02rem;
}

.hr-action-dialog-card__actions.hr-action-dialog-card__actions--compact {
  justify-content: space-between;
  gap: 12px;
  padding: 12px 22px 20px;
}

.hr-action-dialog-card--compact .hr-action-dialog-card__button {
  flex: 0 0 auto;
  min-height: 44px;
  min-width: 140px;
  border-radius: 2px;
  font-weight: 700;
}

.hr-recall-dialog .q-dialog__inner--minimized {
  padding: 16px;
  overflow: hidden;
}

.hr-recall-dialog .q-dialog__inner--minimized > div {
  width: min(550px, calc(100vw - 32px));
  max-width: min(550px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
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
}

@media (max-width: 599px) {
  .hr-applications-panel .applications-panel-toolbar__search,
  .hr-applications-panel .applications-panel-toolbar__actions {
    width: 100%;
    flex: 0 0 100%;
  }

  .hr-applications-panel .applications-panel-toolbar__actions {
    justify-content: flex-start;
  }

  .hr-applications-panel .applications-panel-toolbar {
    display: block;
  }

  .hr-applications-panel .application-status-search--left {
    width: 100%;
  }

  .hr-applications-panel .application-status-search--left .q-field {
    width: 100%;
  }

  .hr-action-dialog-card {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    border-radius: 2px;
  }

  .hr-action-dialog-card--compact {
    min-width: 0;
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }

  .hr-action-dialog-card__content {
    padding: 4px 20px 10px;
  }

  .hr-action-dialog-card__title {
    font-size: 1.55rem;
  }

  .hr-action-dialog-card__message {
    margin-top: 14px;
    font-size: 1rem;
  }

  .hr-action-impact-preview {
    margin-top: 14px;
    padding: 10px 12px;
  }

  .hr-recall-dialog .q-dialog__inner--minimized {
    padding: 12px;
  }

  .hr-recall-dialog .q-dialog__inner--minimized > div {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
  }

  .recall-date-grid__head,
  .recall-date-grid__row {
    grid-template-columns: 48px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr);
  }

  .recall-date-grid__cell {
    padding: 7px 8px;
    font-size: 0.78rem;
  }

  .recall-date-grid__cell--meta {
    font-size: 0.74rem;
  }

  .hr-recall-reason .q-field__native {
    min-height: 52px;
    max-height: 52px;
    overflow-y: auto;
    resize: none;
  }

  .hr-recall-total {
    font-size: 0.85rem;
  }

  .hr-recall-actions {
    padding: 8px 20px 14px;
    gap: 8px;
  }

  .hr-recall-actions__buttons {
    gap: 8px;
  }

  .hr-action-dialog-card__actions {
    gap: 12px;
    padding: 0 20px 20px;
  }

  .hr-action-dialog-card__button {
    min-height: 50px;
    border-radius: 2px;
  }

  .hr-action-dialog-card--compact .hr-action-dialog-card__button {
    min-width: 0;
    flex: 1 1 0;
  }

  .hr-edit-dialog .q-dialog__inner--minimized {
    padding: 12px;
  }

  .hr-edit-dialog .q-dialog__inner--minimized > div {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }
}

.application-duration-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.application-duration-subtext {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 1px;
}
</style>
