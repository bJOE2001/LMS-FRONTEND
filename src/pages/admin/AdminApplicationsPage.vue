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
            :existing-applications="applicationRows"
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
        row-key="id"
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
            <div class="text-caption text-grey-7">{{ tableProps.row.employee_id }}</div>
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
                v-for="(line, index) in getApplicationInclusiveDateLines(tableProps.row)"
                :key="`${tableProps.row.id}-inclusive-${index}`"
                class="text-weight-medium text-grey-9"
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
                <q-tooltip>View</q-tooltip>
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
          <div class="full-width text-center q-pa-md text-grey-7">
            <q-icon name="warning" size="24px" class="q-mr-sm" />
            <span>No Applications Submitted</span>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showDetailsDialog" persistent position="standard">
      <q-card
        v-if="selectedApp"
        class="application-timeline-card"
        style="width: 560px; max-width: 94vw"
      >
        <q-card-section class="row items-start no-wrap application-timeline-header">
          <div class="application-timeline-header-copy">
            <div class="text-h6 application-timeline-header-title">Application Timeline</div>
            <div class="application-timeline-header-caption">
              Track your leave request through department and HR review
            </div>
          </div>
          <q-space />
          <q-btn flat dense round icon="close" color="grey-8" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="application-timeline-content">
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
        <q-card-actions
          v-if="
            $q.screen.lt.sm &&
            selectedApp &&
            (hasMobileApplicationActions(selectedApp) || canPrintApplication(selectedApp))
          "
          align="right"
          class="application-timeline-actions"
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
import { useAdminApplicationsPage } from 'src/composables/useAdminApplicationsPage'

const {
  $q,
  loading,
  actionLoading,
  applicationRows,
  statusSearch,
  applicationsPagination,
  applicationTableColumns,
  applicationsForTable,
  showApplyLeaveDialog,
  showDetailsDialog,
  showDisapproveDialog,
  showConfirmActionDialog,
  showActionResultDialog,
  selectedApp,
  selectedAppTimeline,
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
  getApplicationInclusiveDateLines,
  formatDate,
  getApplicationStatusColor,
  getApplicationStatusLabel,
  openDetails,
  canPrintApplication,
  printApplication,
  hasMobileApplicationActions,
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
  width: 190px;
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

@media (max-width: 599px) {
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
}
</style>
