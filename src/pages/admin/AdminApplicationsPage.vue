<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-lg applications-page-header">
      <h1 class="text-h4 text-weight-bold q-mt-none q-mb-none">Applications</h1>
      <q-space />
      <div class="row items-center q-gutter-sm">
        <q-btn
          unelevated
          color="green-8"
          icon="description"
          label="Apply Leave"
          class="applications-page-cta"
          @click="openApplyLeaveDialog"
        />
        <q-btn
          v-if="canAdminApplySelfCoc"
          unelevated
          color="green-8"
          icon="schedule_send"
          label="Apply COC"
          class="applications-page-cta"
          @click="showApplyCocDialog = true"
        />
      </div>
    </div>

    <AdminApplyLeaveDialog
      v-model="showApplyLeaveDialog"
      :existing-applications="leaveApplicationRows"
      @cancel="closeApplyLeaveDialog"
      @submitted="handleApplyLeaveSubmitted"
    />

    <AdminApplyCocDialog
      v-model="showApplyCocDialog"
      draft-key-suffix="self"
      :submit-handler="submitAdminSelfCocApplication"
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
              @click="showPrintDialog = true"
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
        table-style="table-layout: fixed; width: 100%"
        @row-click="handleApplicationRowClick"
      >
        <template #body-cell-employee="tableProps">
          <q-td>
            <div class="text-weight-medium">{{ tableProps.row.employeeName }}</div>
            <div class="text-caption text-grey-7">{{ tableProps.row.employee_control_no }}</div>
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
          <q-td :props="tableProps">
            <div class="application-duration-cell">
              <span class="text-weight-medium text-grey-9 block">
                {{ getApplicationDurationDisplay(tableProps.row) }}
              </span>
              <span
                v-if="getCtoHoursRowCaption(tableProps.row)"
                class="text-caption text-grey-7 block application-duration-subtext"
              >
                {{ getCtoHoursRowCaption(tableProps.row) }}
              </span>
            </div>
          </q-td>
        </template>
        <template #body-cell-status="tableProps">
          <q-td class="application-status-cell">
            <div class="status-cell-wrap row items-center no-wrap q-gutter-x-xs">
              <StatusBadge
                :status="getFinalStatusForStatusColumn(tableProps.row)"
                :tooltip="getStatusTooltipForStatusColumn(tableProps.row)"
              />
              <q-badge
                v-if="hasApprovedEditRequest(tableProps.row)"
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
              <q-btn
                v-if="canPrintRequestChangesApplication(tableProps.row)"
                flat
                dense
                round
                size="sm"
                icon="description"
                color="teal-7"
                @click.stop="printRequestChangesApplication(tableProps.row)"
              >
                <q-tooltip>
                  {{
                    isApplicationEditCancellationRequest(tableProps.row)
                      ? 'Print Cancellation Form'
                      : 'Print Request for Amendment Form'
                  }}
                </q-tooltip>
              </q-btn>
              <q-btn
                v-if="canRequestRecallApplication(tableProps.row)"
                flat
                dense
                round
                size="sm"
                icon="undo"
                color="warning"
                @click.stop="openRecallRequest(tableProps.row)"
              >
                <q-tooltip>Request Recall</q-tooltip>
              </q-btn>
              <q-btn
                v-if="canPrintRecallRequestApplication(tableProps.row)"
                flat
                dense
                round
                size="sm"
                icon="print"
                color="teal-7"
                @click.stop="printRecallRequestApplication(tableProps.row)"
              >
                <q-tooltip>Print Recall Form</q-tooltip>
              </q-btn>
              <template v-if="tableProps.row.rawStatus === 'PENDING_ADMIN'">
                <q-btn
                  v-if="!hasApplicationEditRequest(tableProps.row)"
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
                  v-if="!hasApplicationEditRequest(tableProps.row)"
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

    <AdminPrintApplicationsDialog
      v-model="showPrintDialog"
      @print="(dateRange) => printApplicationsPdf(dateRange, getFinalStatusForStatusColumn)"
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
                      'Pending Receive',
                      'Pending HR Receive',
                      'Pending HR Review',
                      'Admin Recommendation',
                      'Department Recommendation',
                      'CHRMO Certification',
                      'CMO/CVMO Review',
                      'Pending Release',
                      'Release',
                      'Pending Update Receive',
                      'Pending Update HR Review',
                      'Pending Update Admin Review',
                      'Pending Update Release',
                      'Cancel Request Pending',
                      'Cancel Request Pending Admin',
                      'Cancel Request Pending HR',
                      'Cancel Request Pending Receive',
                      'Cancel Request Pending Release',
                      'Pending Admin',
                    ].includes(getDisplayApplicationStatusLabel(selectedApp))
                  "
                  rounded
                  :color="getDisplayApplicationStatusColor(selectedApp)"
                  text-color="white"
                  class="admin-application-details-meta-chip admin-application-details-meta-chip--status"
                >
                  {{ getDisplayApplicationStatusLabel(selectedApp) }}
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
            <q-btn
              flat
              dense
              round
              icon="close"
              class="admin-application-details-close"
              v-close-popup
            />
            <!-- <div
              v-if="shouldShowCurrentLeaveBalance(selectedApp)"
              class="admin-application-details-header-balance-text"
            >
              <div class="admin-application-details-label">Available Leave Balance</div>
              <div class="admin-application-details-header-balance-value">
                {{ getCurrentLeaveBalanceDisplay(selectedApp) }}
              </div>
            </div> -->
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
            v-if="
              hasApplicationEditRequest(selectedApp) &&
              !isApplicationEditRequestHrApproved(selectedApp)
            "
            class="admin-application-requested-changes-section"
          >
            <div class="row items-center justify-between q-gutter-sm">
              <div class="admin-application-details-label">
                {{ getApplicationEditRequestSectionTitle(selectedApp) }}
              </div>
            </div>
            <div
              v-if="shouldShowApplicationEditRequestDateComparison(selectedApp)"
              class="admin-application-requested-changes-grid"
            >
              <div class="admin-application-requested-changes-item">
                <div class="admin-application-requested-changes-title">Inclusive Dates</div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">{{ isApplicationEditRequestHrApproved(selectedApp) ? 'Old Date:' : 'Current:' }}</span>
                  <span class="admin-application-requested-changes-value">{{
                    formatInclusiveDateSummary(getApplicationEditRequestFromDates(selectedApp))
                  }}</span>
                </div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">{{ isApplicationEditRequestHrApproved(selectedApp) ? 'Updated Date:' : 'Requested:' }}</span>
                  <span
                    class="admin-application-requested-changes-value admin-application-requested-changes-value--requested"
                    >{{
                      formatInclusiveDateSummary(getApplicationEditRequestToDates(selectedApp))
                    }}</span
                  >
                </div>
              </div>

              <div class="admin-application-requested-changes-item">
                <div class="admin-application-requested-changes-title">Duration</div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">{{ isApplicationEditRequestHrApproved(selectedApp) ? 'Old Duration:' : 'Current:' }}</span>
                  <span class="admin-application-requested-changes-value">{{
                    getApplicationEditRequestCurrentDuration(selectedApp)
                  }}</span>
                </div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">{{ isApplicationEditRequestHrApproved(selectedApp) ? 'Updated Duration:' : 'Requested:' }}</span>
                  <span
                    class="admin-application-requested-changes-value admin-application-requested-changes-value--requested"
                    >{{ getApplicationEditRequestRequestedDuration(selectedApp) }}</span
                  >
                </div>
              </div>
            </div>
            <div v-else class="admin-application-requested-changes-grid">
              <div class="admin-application-requested-changes-item">
                <div class="admin-application-requested-changes-title">Changes</div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Requested:</span>
                  <span
                    class="admin-application-requested-changes-value admin-application-requested-changes-value--requested"
                    >{{ getApplicationEditRequestChangeSummaryLabel(selectedApp) }}</span
                  >
                </div>
              </div>
              <div class="admin-application-requested-changes-item">
                <div class="admin-application-requested-changes-title">Request Details</div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Requested At:</span>
                  <span class="admin-application-requested-changes-value">{{
                    getApplicationEditRequestRequestedAt(selectedApp)
                  }}</span>
                </div>
                <div class="admin-application-requested-changes-line">
                  <span class="admin-application-requested-changes-key">Remarks:</span>
                  <span class="admin-application-requested-changes-value">{{
                    getApplicationEditRequestReason(selectedApp)
                  }}</span>
                </div>
              </div>
            </div>

            <div
              v-if="shouldShowApplicationEditRequestDateComparison(selectedApp)"
              class="row items-center q-col-gutter-md q-mt-sm"
            >
              <div class="col-12 col-md-8 admin-application-requested-changes-meta">
                <div v-if="getApplicationEditRequestRequestedAt(selectedApp) !== 'N/A'">
                  <strong>Requested At:</strong>
                  {{ getApplicationEditRequestRequestedAt(selectedApp) }}
                </div>
                <div>
                  <strong>Remarks:</strong> {{ getApplicationEditRequestReason(selectedApp) }}
                </div>
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
              <StatusBadge
                :status="getFinalStatusForStatusColumn(selectedApp)"
                :tooltip="getStatusTooltipForStatusColumn(selectedApp)"
              />
            </div>

            <div v-if="isCocApplication(selectedApp)" class="admin-application-details-item">
              <div class="admin-application-details-label">Issued Date</div>
              <div class="text-weight-medium">
                {{
                  formatDate(
                    selectedApp.certificateIssuedAt || selectedApp.certificate_issued_at,
                  ) || 'N/A'
                }}
              </div>
            </div>

            <div class="admin-application-details-item">
              <div class="admin-application-details-label">Duration</div>
              <div class="text-weight-medium">
                {{ getApplicationDurationDisplay(selectedApp) }}
              </div>
            </div>

            <div
              v-if="isTerminalLeaveApplication(selectedApp)"
              class="admin-application-details-item"
            >
              <div class="admin-application-details-label">Estimated Amount</div>
              <div class="text-weight-medium">
                {{ getTerminalLeaveEstimatedAmountDisplay(selectedApp) }}
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
                  {
                    'admin-application-details-scroll-area':
                      shouldScrollInclusiveDates(selectedApp),
                  },
                ]"
              >
                <div class="text-caption text-grey-7">Current</div>
                <div
                  v-for="entry in getSelectedDateIndicatorRows(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-current-indicator-${entry.dateKey}`"
                  class="admin-application-duration-date-row"
                >
                  <span class="text-caption admin-application-duration-date">{{
                    formatInclusiveDateEntry(entry)
                  }}</span>
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
                    {{ formatInclusiveDateEntry(entry) }}
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
                  {
                    'admin-application-details-scroll-area':
                      shouldScrollInclusiveDates(selectedApp),
                  },
                ]"
              >
                <div
                  v-for="entry in getSelectedDateIndicatorRows(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-indicator-${entry.dateKey}`"
                  class="admin-application-duration-date-row"
                >
                  <span class="text-caption admin-application-duration-date">{{
                    formatInclusiveDateEntry(entry)
                  }}</span>
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
                  {
                    'admin-application-details-scroll-area':
                      shouldScrollInclusiveDates(selectedApp),
                  },
                ]"
              >
                <span
                  v-for="(line, index) in getApplicationInclusiveDateLines(selectedApp)"
                  :key="`${selectedApp.application_uid || selectedApp.id}-details-inclusive-${index}`"
                  class="text-weight-medium text-grey-9 block"
                >
                  {{ formatInclusiveDateSummary(line) }}
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
              v-if="shouldShowApplicationDetailsRemarks(selectedApp)"
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
          <q-btn
            v-if="canRequestRecallApplication(selectedApp)"
            unelevated
            no-caps
            color="warning"
            label="Request Recall"
            @click="openRecallRequest(selectedApp)"
          />
          <q-btn
            v-if="canPrintRecallRequestApplication(selectedApp)"
            unelevated
            no-caps
            color="teal-7"
            label="Print Recall Form"
            @click="printRecallRequestApplication(selectedApp)"
          />
          <template v-if="selectedApp.rawStatus === 'PENDING_ADMIN'">
            <q-btn
              v-if="!hasApplicationEditRequest(selectedApp)"
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
              v-if="!hasApplicationEditRequest(selectedApp)"
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

    <AdminApplicationRecallRequestDialog
      v-model="showRecallRequestDialog"
      :application="recallRequestDialogApplication"
      :get-recall-date-options="getRecallDateOptions"
      :format-recall-date-label="formatRecallDateLabel"
      @request-recall="submitRecallRequest"
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
import AdminApplyCocDialog from 'src/components/admin/AdminApplyCocDialog.vue'
import AdminApplicationRecallRequestDialog from 'src/components/admin/AdminApplicationRecallRequestDialog.vue'
import AdminPrintApplicationsDialog from 'src/components/admin/AdminPrintApplicationsDialog.vue'
import { api } from 'src/boot/axios'
import { useAdminApplicationsPage } from 'src/composables/useAdminApplicationsPage'
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from 'stores/auth-store'

const showApplyCocDialog = ref(false)
const authStore = useAuthStore()
const adminEmploymentStatus = ref(
  String(authStore.user?.status || '')
    .trim()
    .toUpperCase(),
)

const canAdminApplySelfCoc = computed(() => {
  const status = String(adminEmploymentStatus.value || authStore.user?.status || '')
    .trim()
    .toUpperCase()
  if (!status) return true
  return !status.includes('CONTRACTUAL') && !status.includes('HONORARIUM')
})

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
  showRecallRequestDialog,
  showPrintDialog,
  selectedApp,
  selectedAppTimeline,
  recallRequestDialogApplication,
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
  // getLeaveBalanceTextItems,
  // getCurrentLeaveBalanceDisplay,
  getCtoHoursRowCaption,
  getApplicationDurationDisplay,
  getApplicationInclusiveDateColumnLines,
  getApplicationInclusiveDateLines,
  getSelectedDateIndicatorRows,
  getPendingUpdateDateIndicatorRows,
  hasPendingDateUpdate,
  formatDate,
  formatDateTime,
  getApplicationStatusColor,
  getApplicationStatusLabel,
  getEditRequestBadgeLabel,
  hasApprovedEditRequest,
  hasApplicationEditRequest,
  getApplicationEditRequestApprovedBadgeLabel,
  getApplicationEditRequestSectionTitle,
  getApplicationEditRequestChangeSummaryLabel,
  shouldShowApplicationEditRequestDateComparison,
  isApplicationEditCancellationRequest,
  getApplicationEditRequestRequestedAt,
  getApplicationEditRequestReason,
  getApplicationEditRequestFromDates,
  getApplicationEditRequestToDates,
  getApplicationEditRequestCurrentDuration,
  getApplicationEditRequestRequestedDuration,
  isApplicationEditRequestHrApproved,
  shouldShowPendingDateComparisonInDetails,
  openDetails,
  openCalendarPreview,
  openRecallRequest,
  onCalendarPreviewNavigation,
  handleCalendarPreviewModelUpdate,
  handleCalendarPreviewSurfacePointerDown,
  handleCalendarPreviewSurfaceClick,
  syncCalendarPreviewDecorations,
  canPrintApplication,
  canPrintRecallRequestApplication,
  canRequestRecallApplication,
  printApplication,
  printRecallRequestApplication,
  isCocApplication,
  isApplicationReleased,
  resolveFinalApprovalDateValue,
  resolveReleasedDateValue,
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
  getRecallDateOptions,
  formatRecallDateLabel,
  formatApplicationLeaveTypeLabel,
  printRequestChangesActionResult,
  submitRecallRequest,
  // shouldShowCurrentLeaveBalance,
} = useAdminApplicationsPage()

const DISAPPROVED_STATUS_COLOR = 'red'
const TERMINAL_LEAVE_ESTIMATE_FACTOR = 0.0478087
const terminalLeaveAmountFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const inclusiveDatePatterns = [
  /\b[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\b/g,
  /\b[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\b/g,
]

function truncateCurrencyValue(value, fractionDigits = 2) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return null

  const factor = 10 ** fractionDigits
  if (!Number.isFinite(factor) || factor <= 0) return null

  return numericValue < 0
    ? Math.ceil(numericValue * factor) / factor
    : Math.floor(numericValue * factor) / factor
}

function isTerminalLeaveApplication(app) {
  const leaveTypeLabel = String(
    app?.leave_type_name ?? app?.leaveType ?? '',
  )
    .trim()
    .toLowerCase()

  return leaveTypeLabel === 'terminal leave'
}

function getTerminalLeaveEstimatedAmountValue(app) {
  const explicitAmount = Number(app?.terminal_leave_estimated_amount)
  if (Number.isFinite(explicitAmount) && explicitAmount >= 0) {
    return explicitAmount
  }

  const totalCredits = Number(app?.total_days ?? app?.duration_value ?? app?.days)
  const monthlyRate = Number(app?.rate_mon ?? app?.salary)
  if (!Number.isFinite(totalCredits) || totalCredits <= 0) return null
  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) return null

  return totalCredits * monthlyRate * TERMINAL_LEAVE_ESTIMATE_FACTOR
}

function getTerminalLeaveEstimatedAmountDisplay(app) {
  const estimatedAmount = getTerminalLeaveEstimatedAmountValue(app)
  if (!Number.isFinite(estimatedAmount)) return 'N/A'

  const truncatedEstimatedAmount = truncateCurrencyValue(estimatedAmount)
  return truncatedEstimatedAmount === null
    ? 'N/A'
    : terminalLeaveAmountFormatter.format(truncatedEstimatedAmount)
}

function normalizeDisapprovedStatusLabel(statusValue) {
  const normalizedStatus = String(statusValue || '').trim()
  if (!normalizedStatus) return ''

  const upperStatus = normalizedStatus.toUpperCase()
  if (upperStatus === 'DISAPPROVED' || upperStatus === 'REJECTED') {
    return 'Not Certified'
  }

  return normalizedStatus
    .replace(/^HR Certification(?: Completed)?$/i, (match) =>
      match.replace(/^HR Certification/i, 'CHRMO Certification'),
    )
    .replace(/rejected/gi, 'Disapproved')
}

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

function getDisplayApplicationStatusLabel(app) {
  const statusLabel = String(app?.displayStatus || getApplicationStatusLabel(app) || '').trim()
  return normalizeDisapprovedStatusLabel(statusLabel)
}

function getDisplayApplicationStatusColor(app) {
  const rawStatus = String(app?.rawStatus || app?.raw_status || '')
    .trim()
    .toUpperCase()
  const statusLabel = getDisplayApplicationStatusLabel(app).toUpperCase()
  if (rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED') return DISAPPROVED_STATUS_COLOR
  if (statusLabel.includes('DISAPPROV') || statusLabel.includes('REJECT')) {
    return DISAPPROVED_STATUS_COLOR
  }

  return getApplicationStatusColor(app)
}

function getFinalStatusForStatusColumn(app) {
  const updateRequestBadgeLabel = getEditRequestBadgeLabel(app)
  if (updateRequestBadgeLabel) {
    return normalizeDisapprovedStatusLabel(updateRequestBadgeLabel)
  }

  const resolvedStatus = String(app?.displayStatus || getApplicationStatusLabel(app) || '').trim()
  const normalizedResolvedStatus = resolvedStatus.toUpperCase()

  if (
    normalizedResolvedStatus.includes('RECALL') ||
    normalizedResolvedStatus.includes('CANCEL')
  ) {
    return resolvedStatus
  }

  if (
    normalizedResolvedStatus.includes('REJECT') ||
    normalizedResolvedStatus.includes('DISAPPROV')
  ) {
    return normalizeDisapprovedStatusLabel(resolvedStatus)
  }

  if (isApplicationReleased(app)) return 'Released'

  return getDisplayApplicationStatusLabel(app)
}

function getStatusTooltipForStatusColumn(app) {
  if (!isApplicationReleased(app)) return ''

  const approvedAt = formatDateTime(resolveFinalApprovalDateValue(app))
  const releasedAt = formatDateTime(resolveReleasedDateValue(app))

  if (approvedAt && releasedAt) {
    return `Approved by HR on ${approvedAt}; released on ${releasedAt}.`
  }
  if (releasedAt) return `Approved by HR, then released on ${releasedAt}.`
  if (approvedAt) return `Approved by HR on ${approvedAt}; released.`
  return 'Approved by HR, then released.'
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

function shouldShowApplicationDetailsRemarks(app) {
  if (!app || typeof app !== 'object') return false

  const rawStatus = String(app?.rawStatus || app?.raw_status || '')
    .trim()
    .toUpperCase()
  const statusLabel = String(app?.displayStatus || getApplicationStatusLabel(app) || '')
    .trim()
    .toUpperCase()
  const remarksText = String(app?.remarks || '').trim()

  if (/^cancelled\b/i.test(remarksText)) return true
  if (rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED' || rawStatus === 'RECALLED') {
    return true
  }

  return (
    statusLabel.includes('REJECT') ||
    statusLabel.includes('DISAPPROV') ||
    statusLabel.includes('CANCEL') ||
    statusLabel.includes('RECALL')
  )
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

async function submitAdminSelfCocApplication(payload) {
  const { data } = await api.post('/admin/coc-applications/self', payload)
  return data
}

onMounted(async () => {
  try {
    const { data } = await api.get('/admin/leave-credits')
    const resolvedStatus = String(data?.employment_status || '')
      .trim()
      .toUpperCase()
    if (resolvedStatus) {
      adminEmploymentStatus.value = resolvedStatus
      if (authStore.user) {
        authStore.setAuth({
          token: authStore.token,
          user: {
            ...authStore.user,
            status: resolvedStatus,
          },
        })
      }
    }
  } catch {
    // Keep fallback status from auth store.
  }
})
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
.application-details-cell {
  min-width: 0;
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

