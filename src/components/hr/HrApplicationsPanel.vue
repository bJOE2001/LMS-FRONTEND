<template>
  <q-card flat bordered class="hr-applications-panel rounded-borders q-mb-lg">
    <q-card-section>
      <div
        class="row items-center justify-between q-mb-md q-col-gutter-sm applications-panel-toolbar"
      >
        <div class="col applications-panel-toolbar__search">
          <q-input
            v-model="statusSearch"
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
    </q-card-section>
    <q-table
      :rows="applicationsForTable"
      :columns="applicationTableColumns"
      row-key="application_uid"
      flat
      v-model:pagination="tablePagination"
      :rows-per-page-options="[10]"
      :loading="loading"
      class="applications-table applications-table--interactive"
      @row-click="handleApplicationRowClick"
    >
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
          <div class="text-weight-medium">{{ props.row.employeeName }}</div>
          <div class="text-caption text-grey-7">{{ props.row.employee_control_no }}</div>
        </q-td>
      </template>
      <template #body-cell-leaveType="props">
        <q-td>
          <div class="application-details-cell">
            <template v-if="hasPendingLeaveTypeUpdate(props.row)">
              <span class="text-caption text-grey-7 block">Current</span>
              <span class="text-weight-medium text-grey-9 block">{{
                getCurrentLeaveTypeLabel(props.row)
              }}</span>
              <span class="text-caption text-deep-purple-8 block application-date-change-label"
                >Requested</span
              >
              <span class="text-weight-medium text-deep-purple-8 block">{{
                getRequestedLeaveTypeLabel(props.row)
              }}</span>
            </template>
            <template v-else>
              <span class="text-weight-medium text-grey-9 block">{{
                getCurrentLeaveTypeLabel(props.row)
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
            <template v-else-if="hasPendingDateUpdate(props.row)">
              <span class="text-caption text-grey-7 block">Current</span>
              <span
                v-for="(line, index) in getApplicationInclusiveDateColumnLines(props.row)"
                :key="`${props.row.application_uid || props.row.id}-inclusive-current-${index}`"
                class="text-weight-medium text-grey-9 block"
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
              >
                {{ line }}
              </span>
            </template>
            <template v-else>
              <span
                v-for="(line, index) in getApplicationInclusiveDateColumnLines(props.row)"
                :key="`${props.row.application_uid || props.row.id}-inclusive-${index}`"
                class="text-weight-medium text-grey-9 block"
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
      <template #body-cell-days="props">
        <q-td>
          <span class="text-weight-medium text-grey-9">
            {{ getApplicationDurationDisplay(props.row) }}
          </span>
        </q-td>
      </template>
      <template #body-cell-status="props">
        <q-td>
          <div class="status-cell-wrap">
            <StatusBadge :status="props.row.displayStatus" />
            <q-badge
              v-if="getEditRequestBadgeLabel(props.row)"
              :color="getEditRequestBadgeColor(props.row)"
              text-color="white"
              rounded
              class="text-weight-medium q-pa-xs status-edit-request-badge"
              :label="getEditRequestBadgeLabel(props.row)"
            />
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
              v-if="props.row.rawStatus === 'PENDING_HR'"
              flat
              dense
              round
              size="sm"
              icon="cancel"
              color="negative"
              @click.stop="openActionConfirm('reject', props.row)"
            >
              <q-tooltip>Disapprove</q-tooltip>
            </q-btn>
            <q-btn
              v-if="props.row.rawStatus === 'PENDING_HR'"
              flat
              dense
              round
              size="sm"
              icon="check_circle"
              color="green-7"
              @click.stop="openActionConfirm('approve', props.row)"
            >
              <q-tooltip>Approve</q-tooltip>
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
    @receive="markApplicationReceived"
    @release="markApplicationReleased"
    @view-attachment="viewApplicationAttachment"
  />

  <HrApplicationDetailsDialog
    v-model="showDetailsDialog"
    :application="selectedApp"
    :is-mobile="$q.screen.lt.sm"
    :show-application-edit-action="showApplicationEditAction"
    :format-date="formatDate"
    :get-current-leave-balance-class="getCurrentLeaveBalanceClass"
    :get-current-leave-balance-display="getCurrentLeaveBalanceDisplay"
    :is-cto-leave-application="isCtoLeaveApplication"
    :get-current-cto-available-hours-display="getCurrentCtoAvailableHoursDisplay"
    :get-application-cto-required-hours-display="getApplicationCtoRequiredHoursDisplay"
    :get-cto-deducted-hours-display="getCtoDeductedHoursDisplay"
    :has-application-attachment="hasApplicationAttachment"
    :has-pending-leave-type-update="hasPendingLeaveTypeUpdate"
    :get-current-leave-type-label="getCurrentLeaveTypeLabel"
    :get-requested-leave-type-label="getRequestedLeaveTypeLabel"
    :get-edit-request-status-label="getEditRequestStatusLabel"
    :get-edit-request-status-field-label="getEditRequestStatusFieldLabel"
    :get-edit-request-badge-color="getEditRequestBadgeColor"
    :get-application-duration-display="getApplicationDurationDisplay"
    :has-pending-duration-update="hasPendingDurationUpdate"
    :get-requested-duration-display="getRequestedDurationDisplay"
    :is-coc-application="isCocApplication"
    :has-pending-reason-update="hasPendingReasonUpdate"
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
    :can-print-coc-certificate="canPrintCocCertificate"
    :has-mobile-application-actions="hasMobileApplicationActions"
    :can-edit-application="canEditApplication"
    :can-recall-application="canRecallApplication"
    @view-attachment="viewApplicationAttachment"
    @open-edit="openEdit"
    @open-action-confirm="openActionConfirm"
    @open-recall="openRecall"
    @print-certificate="printCocCertificate"
  />

  <HrApplicationConfirmActionDialog
    v-model="showConfirmActionDialog"
    :confirm-action-type="confirmActionType"
    :application="confirmActionTarget"
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
    :format-date="formatDate"
    :get-actual-requested-day-count="getActualRequestedDayCount"
    @saved="handleDialogMutationSuccess"
  />

  <HrApplicationRejectDialog
    v-model="showRejectDialog"
    :application="rejectTargetApp"
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
</template>

<script>
import { defineComponent } from 'vue'
import StatusBadge from 'components/StatusBadge.vue'
import HrApplicationTimelineDialog from 'components/hr/HrApplicationTimelineDialog.vue'
import HrApplicationDetailsDialog from 'components/hr/HrApplicationDetailsDialog.vue'
import HrApplicationConfirmActionDialog from 'components/hr/HrApplicationConfirmActionDialog.vue'
import HrApplicationEditDialog from 'components/hr/HrApplicationEditDialog.vue'
import HrApplicationRejectDialog from 'components/hr/HrApplicationRejectDialog.vue'
import HrApplicationRecallDialog from 'components/hr/HrApplicationRecallDialog.vue'
import { useHrApplicationsPanel } from 'src/composables/useHrApplicationsPanel'

export default defineComponent({
  name: 'HrApplicationsPanel',
  components: {
    StatusBadge,
    HrApplicationTimelineDialog,
    HrApplicationDetailsDialog,
    HrApplicationConfirmActionDialog,
    HrApplicationEditDialog,
    HrApplicationRejectDialog,
    HrApplicationRecallDialog,
  },
  setup() {
    return useHrApplicationsPanel()
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

.status-cell-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.status-edit-request-badge {
  font-size: 11px;
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
  border-radius: 24px;
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
  border-radius: 20px;
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
  border-radius: 16px;
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
  border-radius: 16px;
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
  border-radius: 20px;
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
  border-radius: 16px;
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
  width: min(700px, calc(100vw - 32px));
  max-width: min(700px, calc(100vw - 32px));
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
    border-radius: 20px;
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
    border-radius: 16px;
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
</style>
