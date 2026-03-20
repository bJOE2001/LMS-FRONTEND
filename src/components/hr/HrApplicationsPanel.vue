<template>
  <q-card flat bordered class="hr-applications-panel rounded-borders q-mb-lg">
    <q-card-section>
      <div class="row items-center justify-between q-mb-md q-col-gutter-sm applications-panel-toolbar">
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
          <div class="text-caption text-grey-7">{{ props.row.employee_id }}</div>
        </q-td>
      </template>
      <template #body-cell-leaveType="props">
        <q-td>
          <div class="application-details-cell">
            <template v-if="hasPendingLeaveTypeUpdate(props.row)">
              <span class="text-caption text-grey-7 block">Current</span>
              <span class="text-weight-medium text-grey-9 block">{{ getCurrentLeaveTypeLabel(props.row) }}</span>
              <span class="text-caption text-deep-purple-8 block application-date-change-label">Requested</span>
              <span class="text-weight-medium text-deep-purple-8 block">{{ getRequestedLeaveTypeLabel(props.row) }}</span>
            </template>
            <template v-else>
              <span class="text-weight-medium text-grey-9 block">{{ getCurrentLeaveTypeLabel(props.row) }}</span>
            </template>
          </div>
        </q-td>
      </template>
      <template #body-cell-inclusiveDates="props">
        <q-td>
          <div class="application-details-cell">
            <template v-if="hasPendingDateUpdate(props.row)">
              <span class="text-caption text-grey-7 block">Current</span>
              <span
                v-for="(line, index) in getApplicationInclusiveDateLines(props.row)"
                :key="`${props.row.application_uid || props.row.id}-inclusive-current-${index}`"
                class="text-weight-medium text-grey-9 block"
              >
                {{ line }}
              </span>
              <span class="text-caption text-deep-purple-8 block application-date-change-label">Requested</span>
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
                v-for="(line, index) in getApplicationInclusiveDateLines(props.row)"
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
          <span class="text-weight-medium text-grey-9">{{ formatDate(props.row.dateFiled) || 'N/A' }}</span>
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
            <q-btn flat dense round size="sm" icon="visibility" @click.stop="openDetails(props.row)">
              <q-tooltip>View</q-tooltip>
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
              <q-tooltip>Reject</q-tooltip>
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
          </div>
        </q-td>
      </template>
    </q-table>
  </q-card>

  <q-dialog v-model="showDetailsDialog" persistent position="standard" class="hr-application-details-dialog">
    <q-card v-if="selectedApp" class="hr-application-details-card">
      <q-card-section class="bg-primary text-white row items-center no-wrap hr-application-details-header">
        <div class="text-h6">Application Details</div>
        <q-btn
          v-if="selectedApp && canPrintCocCertificate(selectedApp)"
          dense
          flat
          no-caps
          icon="print"
          color="white"
          label="Print Certificate"
          class="q-ml-md"
          @click="printCocCertificate(selectedApp)"
        />
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
      <q-card-section class="q-gutter-y-sm hr-application-details-content">
        <div class="hr-application-details-grid">
          <div class="hr-application-details-item hr-application-details-item--full">
            <div class="text-caption text-grey-7">Employee</div>
            <div class="text-weight-medium">{{ selectedApp.employeeName }}</div>
          </div>
          <div v-if="hasApplicationAttachment(selectedApp)" class="hr-application-details-item hr-application-details-item--full">
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
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Leave Type</div>
            <div class="text-weight-medium">
              <template v-if="hasPendingLeaveTypeUpdate(selectedApp)">
                <div class="text-caption text-grey-7">Current</div>
                <div>{{ getCurrentLeaveTypeLabel(selectedApp) }}</div>
                <div class="text-caption text-deep-purple-8 hr-application-date-change-label">Requested</div>
                <div class="text-deep-purple-8">{{ getRequestedLeaveTypeLabel(selectedApp) }}</div>
              </template>
              <template v-else>
                {{ getCurrentLeaveTypeLabel(selectedApp) }}
              </template>
            </div>
          </div>
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Application Status</div>
            <StatusBadge :status="selectedApp.displayStatus" />
            <div v-if="getEditRequestStatusLabel(selectedApp)" class="q-mt-sm">
              <div class="text-caption text-grey-7">Edit Request Status</div>
              <q-badge
                :color="getEditRequestBadgeColor(selectedApp)"
                text-color="white"
                rounded
                class="text-weight-medium q-pa-xs status-edit-request-badge"
                :label="getEditRequestStatusLabel(selectedApp)"
              />
            </div>
          </div>
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Department</div>
            <div class="text-weight-medium">{{ selectedApp.officeShort || selectedApp.office }}</div>
          </div>
          <div class="hr-application-details-item">
            <div class="text-caption text-grey-7">Duration</div>
            <div class="text-weight-medium">
              <template v-if="hasPendingDurationUpdate(selectedApp)">
                <div class="text-caption text-grey-7">Current</div>
                <div>{{ getApplicationDurationDisplay(selectedApp) }}</div>
                <div class="text-caption text-deep-purple-8 hr-application-date-change-label">Requested</div>
                <div class="text-deep-purple-8">{{ getRequestedDurationDisplay(selectedApp) }}</div>
              </template>
              <template v-else>
                {{ getApplicationDurationDisplay(selectedApp) }}
              </template>
            </div>
          </div>
          <div class="hr-application-details-item hr-application-details-item--full">
            <div class="text-caption text-grey-7">
              {{ selectedApp.is_monetization ? 'Days to Monetize' : 'Inclusive Dates' }}
            </div>
            <div v-if="selectedApp.is_monetization" class="text-weight-medium">
              {{ selectedApp.days }} day(s)
              <div v-if="selectedApp.equivalent_amount" class="text-caption text-grey-6 q-mt-xs">
                Est. Amount: &#8369;{{ Number(selectedApp.equivalent_amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
              </div>
            </div>
            <div
              v-else-if="hasPendingDateUpdate(selectedApp)"
              class="text-weight-medium hr-application-date-change-preview"
            >
              <div class="text-caption text-grey-7">Current</div>
              <div
                v-for="(line, index) in getApplicationInclusiveDateLines(selectedApp)"
                :key="`current-inclusive-${index}`"
                class="text-caption hr-application-duration-date"
              >
                {{ line }}
              </div>
              <div class="text-caption text-deep-purple-8 hr-application-date-change-label">Requested</div>
              <div
                v-for="(line, index) in getPendingUpdateInclusiveDateLines(selectedApp)"
                :key="`requested-inclusive-${index}`"
                class="text-caption hr-application-duration-date text-deep-purple-8"
              >
                {{ line }}
              </div>
            </div>
            <div
              v-else-if="selectedApp.selected_dates && selectedApp.selected_dates.length"
              class="text-weight-medium hr-application-duration-columns"
            >
              <div
                v-for="(column, columnIndex) in getSelectedDateColumns(selectedApp.selected_dates)"
                :key="`duration-column-${columnIndex}`"
                class="hr-application-duration-column"
              >
                <div
                  v-for="dateText in column"
                  :key="`${columnIndex}-${dateText}`"
                  class="text-caption hr-application-duration-date"
                >
                  {{ dateText }}
                </div>
              </div>
            </div>
            <div v-else class="text-weight-medium">
              {{ selectedApp.startDate ? formatDate(selectedApp.startDate) : 'N/A' }} - {{ selectedApp.endDate ? formatDate(selectedApp.endDate) : 'N/A' }}
            </div>
          </div>
          <div class="hr-application-details-item hr-application-details-item--full">
            <div class="text-caption text-grey-7">Date Filed</div>
            <div class="text-weight-medium">{{ formatDate(selectedApp.dateFiled) }}</div>
          </div>
          <div class="hr-application-details-item hr-application-details-item--full">
            <div class="text-caption text-grey-7">Reason</div>
            <div>
              <template v-if="hasPendingReasonUpdate(selectedApp)">
                <div class="text-caption text-grey-7">Current</div>
                <div>{{ getCurrentReasonDisplay(selectedApp) }}</div>
                <div class="text-caption text-deep-purple-8 hr-application-date-change-label">Requested</div>
                <div class="text-deep-purple-8">{{ getRequestedReasonDisplay(selectedApp) }}</div>
              </template>
              <template v-else>
                {{ getCurrentReasonDisplay(selectedApp) }}
              </template>
            </div>
          </div>
          <div
            v-if="hasRequestedChangePreview(selectedApp)"
            class="hr-application-details-item hr-application-details-item--full"
          >
            <div class="text-caption text-grey-7">Requested Changes</div>
            <div class="hr-requested-change-list">
              <div
                v-if="hasPendingLeaveTypeUpdate(selectedApp)"
                class="hr-requested-change-item"
              >
                Leave Type: {{ getCurrentLeaveTypeLabel(selectedApp) }} -> {{ getRequestedLeaveTypeLabel(selectedApp) }}
              </div>
              <div
                v-if="hasPendingDateUpdate(selectedApp)"
                class="hr-requested-change-item"
              >
                Inclusive Dates: {{ getApplicationInclusiveDateSummary(selectedApp) }} -> {{ getPendingUpdateInclusiveDateSummary(selectedApp) }}
              </div>
              <div
                v-if="hasPendingDurationUpdate(selectedApp)"
                class="hr-requested-change-item"
              >
                Duration: {{ getApplicationDurationDisplay(selectedApp) }} -> {{ getRequestedDurationDisplay(selectedApp) }}
              </div>
              <div
                v-if="hasPendingReasonUpdate(selectedApp)"
                class="hr-requested-change-item"
              >
                Reason: {{ getCurrentReasonDisplay(selectedApp) }} -> {{ getRequestedReasonDisplay(selectedApp) }}
              </div>
            </div>
          </div>
          <div class="hr-application-details-item hr-application-details-item--full">
            <div class="text-caption text-grey-7">Remarks</div>
            <div v-if="getDetailsRemarksRows(selectedApp).length" class="hr-application-remarks-list">
              <div
                v-for="(remarkRow, remarkIndex) in getDetailsRemarksRows(selectedApp)"
                :key="`remarks-${remarkIndex}`"
                class="hr-application-remarks-row"
              >
                <div v-if="remarkRow.label" class="text-caption text-grey-7">{{ remarkRow.label }}</div>
                <div>{{ remarkRow.text }}</div>
              </div>
            </div>
            <div v-else class="text-grey-6">N/A</div>
          </div>
          <div class="hr-application-details-item hr-application-details-item--full">
            <div class="text-caption text-grey-7">Available Leave Balance</div>
            <template v-if="hasPendingLeaveTypeUpdate(selectedApp)">
              <div class="text-caption text-grey-7">Current ({{ getCurrentLeaveTypeLabel(selectedApp) }})</div>
              <div class="text-weight-medium" :class="getCurrentLeaveBalanceClass(selectedApp)">
                {{ getCurrentLeaveBalanceDisplay(selectedApp) }}
              </div>
              <div class="text-caption text-deep-purple-8 hr-application-date-change-label">
                Requested ({{ getRequestedLeaveTypeLabel(selectedApp) }})
              </div>
              <div class="text-weight-medium" :class="getRequestedLeaveBalanceClass(selectedApp)">
                {{ getRequestedLeaveBalanceDisplay(selectedApp) }}
              </div>
            </template>
            <template v-else>
              <div class="text-weight-medium" :class="getCurrentLeaveBalanceClass(selectedApp)">
                {{ getCurrentLeaveBalanceDisplay(selectedApp) }}
              </div>
            </template>
          </div>
        </div>
      </q-card-section>
      <q-card-actions
        v-if="$q.screen.lt.sm && selectedApp && hasMobileApplicationActions(selectedApp)"
        align="right"
        class="hr-application-details-actions"
      >
        <q-btn
          v-if="showApplicationEditAction && canEditApplication(selectedApp)"
          unelevated
          no-caps
          color="primary"
          label="Edit"
          @click="openEdit(selectedApp)"
        />
        <q-btn
          v-if="selectedApp.rawStatus === 'PENDING_HR'"
          unelevated
          no-caps
          color="negative"
          label="Reject"
          @click="openActionConfirm('reject', selectedApp)"
        />
        <q-btn
          v-if="selectedApp.rawStatus === 'PENDING_HR'"
          unelevated
          no-caps
          color="green-7"
          label="Approve"
          @click="openActionConfirm('approve', selectedApp)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="showConfirmActionDialog">
    <q-card
      class="hr-action-dialog-card"
      :class="
        confirmActionType === 'approve'
          ? 'hr-action-dialog-card--approve'
          : 'hr-action-dialog-card--reject'
      "
    >
      <q-card-section class="row justify-end hr-action-dialog-card__top">
        <q-btn flat round dense icon="close" color="grey-6" aria-label="Close confirmation" v-close-popup />
      </q-card-section>
      <q-card-section class="text-center hr-action-dialog-card__content">
        <div class="hr-action-dialog-card__title">
          {{ getConfirmActionTitle(confirmActionType) }}
        </div>
        <div class="hr-action-dialog-card__message">
          {{ getConfirmActionMessage(confirmActionType) }}
        </div>
        <div v-if="showConfirmActionImpactPreview" class="hr-action-impact-preview">
          <div class="hr-action-impact-preview__title">Impact Preview</div>

          <div
            v-if="hasPendingLeaveTypeUpdate(confirmActionResolvedApp)"
            class="hr-action-impact-preview__item"
          >
            <div class="hr-action-impact-preview__label">Leave Type</div>
            <div>
              <span class="text-grey-8">Current:</span>
              {{ getCurrentLeaveTypeLabel(confirmActionResolvedApp) }}
            </div>
            <div class="text-deep-purple-8">
              <span>Requested:</span>
              {{ getRequestedLeaveTypeLabel(confirmActionResolvedApp) }}
            </div>
          </div>

          <div
            v-if="hasPendingDateUpdate(confirmActionResolvedApp)"
            class="hr-action-impact-preview__item"
          >
            <div class="hr-action-impact-preview__label">Inclusive Dates</div>
            <div>
              <span class="text-grey-8">Current:</span>
              {{ getApplicationInclusiveDateSummary(confirmActionResolvedApp) }}
            </div>
            <div class="text-deep-purple-8">
              <span>Requested:</span>
              {{ getPendingUpdateInclusiveDateSummary(confirmActionResolvedApp) }}
            </div>
          </div>

          <div
            v-if="hasPendingDurationUpdate(confirmActionResolvedApp)"
            class="hr-action-impact-preview__item"
          >
            <div class="hr-action-impact-preview__label">Duration</div>
            <div>
              <span class="text-grey-8">Current:</span>
              {{ getApplicationDurationDisplay(confirmActionResolvedApp) }}
            </div>
            <div class="text-deep-purple-8">
              <span>Requested:</span>
              {{ getRequestedDurationDisplay(confirmActionResolvedApp) }}
            </div>
          </div>

          <div
            v-if="hasPendingReasonUpdate(confirmActionResolvedApp)"
            class="hr-action-impact-preview__item"
          >
            <div class="hr-action-impact-preview__label">Reason</div>
            <div>
              <span class="text-grey-8">Current:</span>
              {{ getCurrentReasonDisplay(confirmActionResolvedApp) }}
            </div>
            <div class="text-deep-purple-8">
              <span>Requested:</span>
              {{ getRequestedReasonDisplay(confirmActionResolvedApp) }}
            </div>
          </div>

          <div
            v-if="hasPendingLeaveTypeUpdate(confirmActionResolvedApp)"
            class="hr-action-impact-preview__item"
          >
            <div class="hr-action-impact-preview__label">Leave Balance</div>
            <div :class="getCurrentLeaveBalanceClass(confirmActionResolvedApp)">
              <span class="text-grey-8">Current ({{ getCurrentLeaveTypeLabel(confirmActionResolvedApp) }}):</span>
              {{ getCurrentLeaveBalanceDisplay(confirmActionResolvedApp) }}
            </div>
            <div :class="getRequestedLeaveBalanceClass(confirmActionResolvedApp)">
              <span class="text-deep-purple-8">Requested ({{ getRequestedLeaveTypeLabel(confirmActionResolvedApp) }}):</span>
              {{ getRequestedLeaveBalanceDisplay(confirmActionResolvedApp) }}
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions class="hr-action-dialog-card__actions">
        <q-btn
          outline
          no-caps
          label="Cancel"
          color="grey-7"
          class="hr-action-dialog-card__button hr-action-dialog-card__button--cancel"
          v-close-popup
        />
        <q-btn
          unelevated
          no-caps
          label="Confirm"
          :color="confirmActionType === 'approve' ? 'green-7' : 'negative'"
          class="hr-action-dialog-card__button"
          @click="confirmPendingAction"
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
    <q-card class="hr-action-dialog-card hr-action-dialog-card--reject" style="min-width: 360px">
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
import { generateCocCertificatePdf } from 'src/utils/coc-certificate-pdf'
import { getApplicationRequestedDayCount } from 'src/utils/leave-date-locking'

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

function getActualRequestedDayCount(app) {
  const explicitCandidates = [
    app?.actual_total_days,
    app?.applied_total_days,
    app?.requested_total_days,
    app?.display_total_days,
  ]

  for (const candidate of explicitCandidates) {
    const numericValue = Number(candidate)
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue
    }
  }

  const requestedDayCount = Number(getApplicationRequestedDayCount(app))
  if (Number.isFinite(requestedDayCount) && requestedDayCount > 0) {
    return requestedDayCount
  }

  return null
}
const employmentTypeFilterLabel = computed(() => EMPLOYMENT_TYPE_FILTER_LABELS[employmentTypeFilter.value] || '')

function normalizeApplicationType(value) {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'COC') return 'COC'
  if (normalized === 'LEAVE') return 'LEAVE'
  return ''
}

function getApplicationType(application) {
  const explicitType = normalizeApplicationType(
    application?.application_type ??
    application?.applicationType ??
    application?.type,
  )
  if (explicitType) return explicitType

  const leaveTypeName = String(
    application?.leaveType ??
    application?.leave_type ??
    application?.leaveTypeName ??
    application?.leave_type_name ??
    '',
  )
    .trim()
    .toLowerCase()

  if (leaveTypeName === 'coc application' || leaveTypeName === 'coc') return 'COC'
  return 'LEAVE'
}

function isCocApplication(application) {
  return getApplicationType(application) === 'COC'
}

function getApplicationExplicitId(application) {
  return (
    application?.id ??
    application?.application_id ??
    application?.leave_application_id
  )
}

function getApplicationRowKey(application, index = 0) {
  const typeKey = getApplicationType(application)
  const explicitId = getApplicationExplicitId(application)
  if (explicitId !== undefined && explicitId !== null && String(explicitId).trim() !== '') {
    return `${typeKey}:${String(explicitId).trim()}`
  }
  return `${typeKey}:index:${index}`
}

function getApplicationMergeKey(application, index) {
  const rowKey = getApplicationRowKey(application, index)
  if (!rowKey.includes(':index:')) return `id:${rowKey}`

  const employeeKey = String(
    application?.employee_id ??
    application?.employeeId ??
    application?.control_no ??
    application?.controlNo ??
    '',
  ).trim()
  const leaveTypeKey = String(
    application?.leaveType ??
    application?.leave_type ??
    application?.leaveTypeName ??
    application?.leave_type_name ??
    '',
  ).trim().toLowerCase()
  const dateKey = String(
    application?.dateFiled ??
    application?.date_filed ??
    application?.created_at ??
    application?.createdAt ??
    '',
  ).trim()

  const fallback = [getApplicationType(application), employeeKey, leaveTypeKey, dateKey]
    .filter(Boolean)
    .join('|')

  return fallback ? `fallback:${fallback}` : `index:${index}`
}

function extractApplicationsFromPayload(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload

  const candidates = [
    payload?.applications,
    payload?.leave_applications,
    payload?.leaveApplications,
    payload?.rows,
    payload?.items,
    payload?.data,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
    if (candidate && typeof candidate === 'object' && Array.isArray(candidate.data)) {
      return candidate.data
    }
  }

  return []
}

function extractSingleApplicationFromPayload(payload) {
  if (!payload) return null
  if (Array.isArray(payload)) return payload.length ? payload[0] : null

  const candidates = [
    payload?.application,
    payload?.coc_application,
    payload?.leave_application,
    payload?.cocApplication,
    payload?.leaveApplication,
    payload?.item,
    payload?.row,
    payload?.data,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    if (Array.isArray(candidate)) return candidate.length ? candidate[0] : null
    if (candidate && typeof candidate === 'object') return candidate
  }

  return payload && typeof payload === 'object' ? payload : null
}

function mergeApplications(...sources) {
  const merged = new Map()

  sources.flat().forEach((application, index) => {
    if (!application || typeof application !== 'object') return

    const normalized = {
      ...application,
      application_type: getApplicationType(application),
      application_uid: getApplicationRowKey(application, index),
    }

    const key = getApplicationMergeKey(normalized, index)
    const existing = merged.get(key)
    merged.set(key, existing ? { ...existing, ...normalized } : normalized)
  })

  return Array.from(merged.values())
}

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

function isEditUpdateRequest(app) {
  if (!app || typeof app !== 'object') return false

  const candidates = [
    app?.has_pending_update_request,
    app?.hasPendingUpdateRequest,
    app?.raw?.has_pending_update_request,
    app?.raw?.hasPendingUpdateRequest,
  ]

  if (candidates.some((value) => value === true || value === 'true' || value === 1 || value === '1')) {
    return true
  }

  return Boolean(app?.pending_update || app?.raw?.pending_update)
}

function normalizeUpdateRequestStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'PENDING') return 'PENDING'
  if (normalized === 'APPROVED') return 'APPROVED'
  if (normalized === 'REJECTED') return 'REJECTED'
  return ''
}

function getLatestUpdateRequestStatus(app) {
  const explicitStatus = normalizeUpdateRequestStatus(
    app?.latest_update_request_status ??
    app?.latestUpdateRequestStatus ??
    app?.raw?.latest_update_request_status ??
    app?.raw?.latestUpdateRequestStatus ??
    '',
  )
  if (explicitStatus) return explicitStatus
  return isEditUpdateRequest(app) ? 'PENDING' : ''
}

function hasEditRequestLifecycle(app) {
  return Boolean(getLatestUpdateRequestStatus(app))
}

function getEditRequestBadgeLabel(app) {
  const status = getLatestUpdateRequestStatus(app)
  if (status === 'PENDING') return 'Edit Request Pending'
  if (status === 'APPROVED') return 'Edit Request Approved'
  if (status === 'REJECTED') return 'Edit Request Rejected'
  return ''
}

function getEditRequestBadgeColor(app) {
  const status = getLatestUpdateRequestStatus(app)
  if (status === 'PENDING') return 'deep-purple-7'
  if (status === 'APPROVED') return 'positive'
  if (status === 'REJECTED') return 'negative'
  return 'grey-7'
}

function getEditRequestStatusLabel(app) {
  const status = getLatestUpdateRequestStatus(app)
  if (status === 'PENDING') {
    const rawStatus = String(app?.rawStatus || app?.raw_status || '').toUpperCase()
    if (rawStatus === 'PENDING_HR') return 'Pending HR Review'
    if (rawStatus === 'PENDING_ADMIN') return 'Pending Admin Review'
    return 'Pending Review'
  }
  if (status === 'APPROVED') return 'Approved'
  if (status === 'REJECTED') return 'Rejected'
  return ''
}

function isPendingEditRequest(app) {
  return getLatestUpdateRequestStatus(app) === 'PENDING'
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

function normalizeDurationUnit(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized.startsWith('hour')) return 'hour'
  if (normalized.startsWith('day')) return 'day'
  return ''
}

function formatDurationDisplay(value, unit) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return unit === 'hour' ? '0 h' : '0 days'

  const displayValue = formatDayValue(numericValue)
  if (unit === 'hour') return `${displayValue} h`
  return `${displayValue} ${numericValue === 1 ? 'day' : 'days'}`
}

function getApplicationDurationDisplay(app) {
  if (!app) return '0 days'

  const explicitLabel = String(app?.duration_label || '').trim()
  if (explicitLabel) return explicitLabel

  const explicitUnit = normalizeDurationUnit(app?.duration_unit)
  const explicitValue = Number(app?.duration_value)
  if (explicitUnit && Number.isFinite(explicitValue)) {
    return formatDurationDisplay(explicitValue, explicitUnit)
  }

  if (isCocApplication(app)) {
    const hourValue = Number(app?.days ?? app?.total_days)
    if (Number.isFinite(hourValue)) return formatDurationDisplay(hourValue, 'hour')

    const minutes = Number(app?.total_no_of_coc_applied_minutes)
    if (Number.isFinite(minutes)) return formatDurationDisplay(minutes / 60, 'hour')

    return '0 h'
  }

  const actualDayValue = getActualRequestedDayCount(app)
  if (Number.isFinite(actualDayValue) && actualDayValue > 0) {
    return formatDurationDisplay(actualDayValue, 'day')
  }

  const dayValue = Number(app?.days ?? app?.total_days)
  if (Number.isFinite(dayValue)) return formatDurationDisplay(dayValue, 'day')

  return '0 days'
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

function parseSelectedDatesValue(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Ignore malformed selected_dates JSON and fall back to token parsing.
    }
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return [trimmed]
}

function normalizeIsoDateList(dateValues) {
  if (!Array.isArray(dateValues)) return []
  return [...new Set(
    dateValues
      .map((value) => toIsoDateString(value))
      .filter(Boolean),
  )].sort((left, right) => Date.parse(left) - Date.parse(right))
}

function resolveDateSetFromSource(source) {
  if (!source || typeof source !== 'object') return []

  const selectedDates = normalizeIsoDateList(parseSelectedDatesValue(source?.selected_dates))
  if (selectedDates.length > 0) return selectedDates

  const startDate = source?.startDate || source?.start_date || null
  const endDate = source?.endDate || source?.end_date || null
  if (!startDate && !endDate) return []

  const firstDate = startDate || endDate
  const lastDate = endDate || startDate
  return enumerateInclusiveDateRange(firstDate, lastDate)
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
      // Ignore malformed payload and continue scanning candidates.
    }
  }

  return null
}

function getCurrentLeaveTypeId(app) {
  const rawValue = app?.leave_type_id ?? app?.leaveTypeId ?? app?.raw?.leave_type_id ?? app?.raw?.leaveTypeId
  const leaveTypeId = Number(rawValue)
  return Number.isFinite(leaveTypeId) && leaveTypeId > 0 ? leaveTypeId : null
}

function getRequestedLeaveTypeId(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return null
  const leaveTypeId = Number(payload.leave_type_id)
  return Number.isFinite(leaveTypeId) && leaveTypeId > 0 ? leaveTypeId : null
}

function getCurrentLeaveTypeLabel(app) {
  const leaveTypeName = String(
    app?.leaveType ??
    app?.leave_type_name ??
    app?.leave_type ??
    app?.leaveTypeName ??
    app?.raw?.leave_type_name ??
    app?.raw?.leaveType ??
    app?.raw?.leave_type ??
    '',
  ).trim()

  const resolvedName = leaveTypeName || 'Unknown Leave Type'
  return app?.is_monetization ? `${resolvedName} (Monetization)` : resolvedName
}

function getRequestedLeaveTypeLabel(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return ''

  const requestedName = String(
    payload.leave_type_name ??
    payload.leaveTypeName ??
    payload.leave_type ??
    payload.leaveType ??
    '',
  ).trim()

  const fallbackId = getRequestedLeaveTypeId(app)
  const resolvedName = requestedName || (fallbackId ? `Leave Type #${fallbackId}` : '')
  if (!resolvedName) return ''

  const isMonetization = payload?.is_monetization === true || app?.is_monetization === true
  return isMonetization ? `${resolvedName} (Monetization)` : resolvedName
}

function hasPendingLeaveTypeUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return false

  const requestedLeaveTypeId = getRequestedLeaveTypeId(app)
  const currentLeaveTypeId = getCurrentLeaveTypeId(app)
  if (requestedLeaveTypeId && currentLeaveTypeId) {
    return requestedLeaveTypeId !== currentLeaveTypeId
  }

  const currentName = String(getCurrentLeaveTypeLabel(app) || '').trim().toLowerCase()
  const requestedName = String(getRequestedLeaveTypeLabel(app) || '').trim().toLowerCase()
  if (!requestedName) return false
  if (!currentName) return true
  return requestedName !== currentName
}

function getPendingUpdateReason(app) {
  return String(
    app?.pending_update_reason ??
    app?.pendingUpdateReason ??
    app?.raw?.pending_update_reason ??
    app?.raw?.pendingUpdateReason ??
    app?.latest_update_request_reason ??
    app?.latestUpdateRequestReason ??
    app?.raw?.latest_update_request_reason ??
    app?.raw?.latestUpdateRequestReason ??
    '',
  ).trim()
}

function getDetailsRemarksRows(app) {
  if (!app || typeof app !== 'object') return []

  const rows = []
  const pendingUpdateReason = getPendingUpdateReason(app)
  if (pendingUpdateReason) {
    rows.push({ label: 'Update Request', text: pendingUpdateReason })
  }

  const workflowRemarks = formatWorkflowRemarksDisplay(String(app?.remarks ?? app?.raw?.remarks ?? '').trim())
  if (!pendingUpdateReason && workflowRemarks) {
    rows.push({ label: '', text: workflowRemarks })
  }

  return rows
}

function formatWorkflowRemarksDisplay(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const editRequestMatch = raw.match(/^edit requested via erms\s*:?\s*(.*)$/i)
  if (editRequestMatch) {
    const trailingReason = String(editRequestMatch[1] || '').trim()
    return trailingReason
      ? `Edit request submitted by employee. Reason: ${trailingReason}`
      : 'Edit request submitted by employee.'
  }

  return raw
}

function normalizeLeaveBalanceEntries(source) {
  if (!source) return []

  if (Array.isArray(source)) {
    return source
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        leaveTypeId: Number(item.leave_type_id ?? item.leaveTypeId ?? item.type_id ?? 0) || null,
        leaveTypeName: String(
          item.leave_type_name ??
          item.leaveTypeName ??
          item.leave_type ??
          item.leaveType ??
          item.label ??
          item.name ??
          '',
        ).trim(),
        balance: Number(item.balance ?? item.remaining_balance ?? item.available_balance ?? item.value),
      }))
      .filter((item) => Number.isFinite(item.balance))
  }

  if (typeof source !== 'object') return []

  return Object.entries(source)
    .map(([key, value]) => {
      if (value == null) return null

      if (typeof value === 'object' && !Array.isArray(value)) {
        const leaveTypeId = Number(value.leave_type_id ?? value.leaveTypeId ?? 0) || null
        const leaveTypeName = String(
          value.leave_type_name ??
          value.leaveTypeName ??
          value.leave_type ??
          value.leaveType ??
          value.label ??
          value.name ??
          key,
        ).trim()
        const numericBalance = Number(
          value.balance ?? value.remaining_balance ?? value.available_balance ?? value.value,
        )

        return Number.isFinite(numericBalance)
          ? { leaveTypeId, leaveTypeName, balance: numericBalance }
          : null
      }

      const numericBalance = Number(value)
      return Number.isFinite(numericBalance)
        ? { leaveTypeId: null, leaveTypeName: String(key || '').trim(), balance: numericBalance }
        : null
    })
    .filter(Boolean)
}

function getLeaveBalanceEntriesForApplication(app) {
  const sources = [
    app?.leaveBalances,
    app?.leave_balances,
    app?.employee_leave_balances,
    app?.balances,
    app?.raw?.leaveBalances,
    app?.raw?.leave_balances,
    app?.raw?.employee_leave_balances,
    app?.raw?.balances,
  ]

  for (const source of sources) {
    const entries = normalizeLeaveBalanceEntries(source)
    if (entries.length > 0) return entries
  }

  return []
}

function findLeaveBalanceEntry(app, leaveTypeId, leaveTypeLabel = '') {
  const entries = getLeaveBalanceEntriesForApplication(app)
  if (entries.length === 0) return null

  if (Number.isFinite(leaveTypeId) && leaveTypeId > 0) {
    const matchById = entries.find((entry) => Number(entry.leaveTypeId) === Number(leaveTypeId))
    if (matchById) return matchById
  }

  const normalizedLabel = String(leaveTypeLabel || '').trim().toLowerCase()
  if (normalizedLabel) {
    const matchByName = entries.find((entry) => String(entry.leaveTypeName || '').trim().toLowerCase() === normalizedLabel)
    if (matchByName) return matchByName
  }

  return null
}

function getCurrentLeaveBalanceValue(app) {
  const currentLeaveTypeId = getCurrentLeaveTypeId(app)
  const currentLeaveTypeLabel = getCurrentLeaveTypeLabel(app)
  const entry = findLeaveBalanceEntry(app, currentLeaveTypeId, currentLeaveTypeLabel)
  if (entry && Number.isFinite(entry.balance)) return Number(entry.balance)

  const directBalance = Number(app?.leaveBalance ?? app?.leave_balance ?? app?.raw?.leaveBalance ?? app?.raw?.leave_balance)
  return Number.isFinite(directBalance) ? directBalance : null
}

function getRequestedLeaveBalanceValue(app) {
  const requestedLeaveTypeId = getRequestedLeaveTypeId(app)
  const requestedLeaveTypeLabel = getRequestedLeaveTypeLabel(app)
  const entry = findLeaveBalanceEntry(app, requestedLeaveTypeId, requestedLeaveTypeLabel)
  return entry && Number.isFinite(entry.balance) ? Number(entry.balance) : null
}

function getCurrentLeaveBalanceDisplay(app) {
  const value = getCurrentLeaveBalanceValue(app)
  return value !== null ? `${formatDayValue(value)} day(s)` : 'N/A (non-credit)'
}

function getRequestedLeaveBalanceDisplay(app) {
  const value = getRequestedLeaveBalanceValue(app)
  return value !== null ? `${formatDayValue(value)} day(s)` : 'N/A (non-credit)'
}

function getCurrentLeaveBalanceClass(app) {
  const balance = getCurrentLeaveBalanceValue(app)
  const requiredDays = Number(app?.days)
  if (balance === null || !Number.isFinite(requiredDays) || requiredDays <= 0) return 'text-green-8'
  return balance < requiredDays ? 'text-negative' : 'text-green-8'
}

function getRequestedLeaveBalanceClass(app) {
  const balance = getRequestedLeaveBalanceValue(app)
  const requiredDays = Number(app?.days)
  if (balance === null || !Number.isFinite(requiredDays) || requiredDays <= 0) return 'text-green-8'
  return balance < requiredDays ? 'text-negative' : 'text-green-8'
}

function getPendingUpdateInclusiveDateLines(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || payload.is_monetization) return []

  const requestedDateSet = resolveDateSetFromSource(payload)
  if (!requestedDateSet.length) return []

  const groupedRequestedDates = formatGroupedInclusiveDateLines(requestedDateSet)
  return groupedRequestedDates.length ? groupedRequestedDates : requestedDateSet
}

function hasPendingDateUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object' || payload.is_monetization) return false

  const currentDateSet = resolveDateSetFromSource(app)
  const requestedDateSet = resolveDateSetFromSource(payload)
  if (!requestedDateSet.length) return false
  if (!currentDateSet.length) return true
  if (currentDateSet.length !== requestedDateSet.length) return true

  return requestedDateSet.some((date, index) => date !== currentDateSet[index])
}

function getApplicationInclusiveDateSummary(app) {
  const lines = getApplicationInclusiveDateLines(app).filter(Boolean)
  return lines.length ? lines.join(' | ') : 'N/A'
}

function getPendingUpdateInclusiveDateSummary(app) {
  const lines = getPendingUpdateInclusiveDateLines(app).filter(Boolean)
  return lines.length ? lines.join(' | ') : 'N/A'
}

function resolveCurrentDurationSnapshot(app) {
  if (!app || typeof app !== 'object') return null

  const explicitUnit = normalizeDurationUnit(app?.duration_unit)
  const explicitValue = Number(app?.duration_value)
  if (explicitUnit && Number.isFinite(explicitValue)) {
    return { value: explicitValue, unit: explicitUnit }
  }

  if (isCocApplication(app)) {
    const hourValue = Number(app?.days ?? app?.total_days)
    if (Number.isFinite(hourValue)) return { value: hourValue, unit: 'hour' }

    const minutes = Number(app?.total_no_of_coc_applied_minutes)
    if (Number.isFinite(minutes)) return { value: minutes / 60, unit: 'hour' }
  }

  const actualDayValue = getActualRequestedDayCount(app)
  if (Number.isFinite(actualDayValue) && actualDayValue > 0) {
    return { value: actualDayValue, unit: 'day' }
  }

  const dayValue = Number(app?.days ?? app?.total_days)
  if (Number.isFinite(dayValue)) return { value: dayValue, unit: 'day' }

  const dateSet = resolveDateSetFromSource(app)
  if (dateSet.length > 0) return { value: dateSet.length, unit: 'day' }

  return null
}

function resolveRequestedDurationSnapshot(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return null

  const explicitUnit = normalizeDurationUnit(payload?.duration_unit)
  const explicitValue = Number(payload?.duration_value)
  if (explicitUnit && Number.isFinite(explicitValue)) {
    return { value: explicitValue, unit: explicitUnit }
  }

  const currentSnapshot = resolveCurrentDurationSnapshot(app)
  const fallbackUnit = currentSnapshot?.unit || (isCocApplication(app) ? 'hour' : 'day')
  const rawValue = Number(payload?.total_days ?? payload?.days)
  if (Number.isFinite(rawValue)) return { value: rawValue, unit: fallbackUnit }

  if (!payload?.is_monetization) {
    const dateSet = resolveDateSetFromSource(payload)
    if (dateSet.length > 0) return { value: dateSet.length, unit: 'day' }
  }

  return null
}

function getRequestedDurationDisplay(app) {
  const snapshot = resolveRequestedDurationSnapshot(app)
  if (!snapshot) return getApplicationDurationDisplay(app)
  return formatDurationDisplay(snapshot.value, snapshot.unit)
}

function hasPendingDurationUpdate(app) {
  const requested = resolveRequestedDurationSnapshot(app)
  if (!requested) return false

  const current = resolveCurrentDurationSnapshot(app)
  if (!current) return true

  if (requested.unit !== current.unit) return true

  const roundedRequested = Math.round(requested.value * 100) / 100
  const roundedCurrent = Math.round(current.value * 100) / 100
  return roundedRequested !== roundedCurrent
}

function getRequestedReasonValue(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return ''
  return String(payload?.reason ?? payload?.reason_purpose ?? '').trim()
}

function normalizeReasonForCompare(value) {
  return String(value || '').trim()
}

function getCurrentReasonDisplay(app) {
  const currentReason = normalizeReasonForCompare(app?.reason)
  return currentReason || 'N/A'
}

function getRequestedReasonDisplay(app) {
  const requestedReason = normalizeReasonForCompare(getRequestedReasonValue(app))
  return requestedReason || 'N/A'
}

function hasPendingReasonUpdate(app) {
  const payload = getPendingUpdatePayload(app)
  if (!payload || typeof payload !== 'object') return false

  const hasReasonField = Object.prototype.hasOwnProperty.call(payload, 'reason')
    || Object.prototype.hasOwnProperty.call(payload, 'reason_purpose')
  if (!hasReasonField) return false

  const currentReason = normalizeReasonForCompare(app?.reason)
  const requestedReason = normalizeReasonForCompare(getRequestedReasonValue(app))
  return currentReason !== requestedReason
}

function hasRequestedChangePreview(app) {
  if (!app || typeof app !== 'object') return false
  if (!hasEditRequestLifecycle(app)) return false

  return hasPendingLeaveTypeUpdate(app)
    || hasPendingDateUpdate(app)
    || hasPendingDurationUpdate(app)
    || hasPendingReasonUpdate(app)
}

function getApplicationInclusiveDateLines(app) {
  if (!app) return ['N/A']

  if (app.is_monetization) {
    return [`${formatDayValue(app.days)} day(s)`]
  }

  const dateSet = resolveDateSetFromSource(app)
  if (dateSet.length > 0) {
    const groupedDates = formatGroupedInclusiveDateLines(dateSet)
    if (groupedDates.length > 0) return groupedDates
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
  if (idB !== idA) return idB - idA

  const keyA = String(a?.application_uid || '')
  const keyB = String(b?.application_uid || '')
  return keyB.localeCompare(keyA)
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
    getApplicationDurationDisplay(app),
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
  const rows = applications.value.filter(
    (app) =>
      String(app?.rawStatus || '').toUpperCase() !== 'PENDING_ADMIN' &&
      matchesEmploymentTypeFilter(app),
  )
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
  { name: 'days', label: 'Duration', field: (row) => getApplicationDurationDisplay(row), align: 'left' },
  { name: 'status', label: 'Status', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'center' },
]
const mobileApplicationColumnWidths = {
  employee: {
    style: 'min-width: 230px',
    headerStyle: 'min-width: 230px',
  },
  status: {
    style: 'min-width: 120px',
    headerStyle: 'min-width: 120px',
  },
  office: {
    style: 'min-width: 120px',
    headerStyle: 'min-width: 120px',
  },
  leaveType: {
    style: 'min-width: 145px',
    headerStyle: 'min-width: 145px',
  },
}
const applicationTableColumns = computed(() => {
  if (!$q.screen.lt.sm) return columns

  return ['employee', 'status', 'office', 'leaveType']
    .map((name) => {
      const column = columns.find((candidate) => candidate.name === name)
      if (!column) return null

      const mobileWidth = mobileApplicationColumnWidths[name]
      return mobileWidth ? { ...column, ...mobileWidth } : column
    })
    .filter(Boolean)
})

const showDetailsDialog = ref(false)
const showEditDialog = ref(false)
const showRejectDialog = ref(false)
const showConfirmActionDialog = ref(false)
const selectedApp = ref(null)
const rejectId = ref('')
const rejectTargetApp = ref(null)
const remarks = ref('')
const confirmActionType = ref('approve')
const confirmActionTarget = ref(null)
const confirmActionResolvedApp = computed(() => resolveApplication(confirmActionTarget.value))
const showConfirmActionImpactPreview = computed(() => {
  const application = confirmActionResolvedApp.value
  if (!application) return false
  if (!isPendingEditRequest(application)) return false
  return hasRequestedChangePreview(application)
})
const editForm = ref(getEmptyEditForm())
const showApplicationEditAction = false

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
  return (
    String(app?.rawStatus || '').toUpperCase() === 'PENDING_HR' &&
    !isCocApplication(app)
  )
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
    const [dashboardResponse, leaveApplicationsResponse, cocApplicationsResponse] = await Promise.all([
      api.get('/hr/dashboard'),
      api.get('/hr/leave-applications').catch(() => null),
      api.get('/hr/coc-applications').catch(() => null),
    ])

    const dashboardData = dashboardResponse?.data ?? {}
    const mergedApplications = mergeApplications(
      extractApplicationsFromPayload(dashboardData),
      extractApplicationsFromPayload(leaveApplicationsResponse?.data),
      extractApplicationsFromPayload(cocApplicationsResponse?.data),
    )

    applications.value = mergedApplications.map((app, index) => ({
      ...app,
      application_type: getApplicationType(app),
      application_uid: app?.application_uid || getApplicationRowKey(app, index),
      employeeName: app?.employeeName || app?.applicantName || app?.employee?.full_name || 'Unknown',
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

function getSelectedDateColumns(dates, columnCount = 3) {
  const formattedDates = Array.isArray(dates)
    ? [...dates].sort().map((date) => formatDate(date)).filter(Boolean)
    : []

  if (!formattedDates.length) return []

  const itemsPerColumn = Math.ceil(formattedDates.length / columnCount)
  const columns = []
  for (let index = 0; index < columnCount; index += 1) {
    const start = index * itemsPerColumn
    const end = start + itemsPerColumn
    columns.push(formattedDates.slice(start, end))
  }

  return columns
}

function openDetails(app) {
  selectedApp.value = app
  showDetailsDialog.value = true
}

function resolveApplicationAttachmentReference(app) {
  const directReference = String(
    app?.attachment_reference ??
    app?.attachmentReference ??
    '',
  ).trim()

  if (directReference) return directReference

  const rawReference = String(
    app?.raw?.attachment_reference ??
    app?.raw?.attachmentReference ??
    '',
  ).trim()

  return rawReference || ''
}

function hasApplicationAttachment(app) {
  if (!app || typeof app !== 'object') return false
  if (resolveApplicationAttachmentReference(app)) return true

  const submittedFlag =
    app?.attachment_submitted ??
    app?.attachmentSubmitted
  return submittedFlag === true || submittedFlag === 1 || submittedFlag === '1' || submittedFlag === 'true'
}

async function viewApplicationAttachment(app = selectedApp.value) {
  const target = resolveApplication(app)
  const id = getApplicationId(target)

  if (!id) {
    $q.notify({ type: 'negative', message: 'Unable to identify this leave application attachment.', position: 'top' })
    return
  }

  try {
    const response = await api.get(`/hr/leave-applications/${id}/attachment`, {
      responseType: 'blob',
    })

    const contentType = String(response?.headers?.['content-type'] || '').toLowerCase()
    if (contentType.includes('application/json')) {
      const fallbackMessage = 'Unable to open the attachment right now.'
      const textPayload = await response.data.text()
      let parsedMessage = ''
      try {
        parsedMessage = JSON.parse(textPayload || '{}')?.message || ''
      } catch {
        parsedMessage = ''
      }

      $q.notify({
        type: 'negative',
        message: parsedMessage || fallbackMessage,
        position: 'top',
      })
      return
    }

    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: response?.headers?.['content-type'] || 'application/octet-stream',
        })
    const objectUrl = URL.createObjectURL(blob)

    const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    if (!opened) {
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.click()
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to open the attachment right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
  }
}

function hasMobileApplicationActions(app) {
  return String(app?.rawStatus || '').toUpperCase() === 'PENDING_HR'
}

function canPrintCocCertificate(app) {
  if (!app || !isCocApplication(app)) return false

  const rawStatus = String(app?.rawStatus || '').toUpperCase()
  if (rawStatus.includes('APPROVED')) return true

  const mergedStatus = String(getApplicationStatusLabel(app) || '').toLowerCase()
  return mergedStatus.includes('approved')
}

async function printCocCertificate(app = selectedApp.value) {
  const targetApp = resolveApplication(app) || app
  if (!canPrintCocCertificate(targetApp)) return

  let printableApp = targetApp
  const id = getApplicationId(targetApp)

  if (id !== undefined && id !== null && String(id).trim() !== '') {
    try {
      const response = await api.get(`/hr/coc-applications/${id}`)
      const detailedApplication = extractSingleApplicationFromPayload(response?.data)
      if (detailedApplication && typeof detailedApplication === 'object') {
        printableApp = {
          ...printableApp,
          ...detailedApplication,
        }
      }
    } catch {
      // Keep the selected application payload when detail endpoint is unavailable.
    }
  }

  await generateCocCertificatePdf(printableApp)
}

function handleApplicationRowClick(_evt, row) {
  if (!row) return
  openDetails(row)
}

function getConfirmActionTitle(type) {
  if (type === 'approve') return 'Approve'
  return 'Reject'
}

function getConfirmActionMessage(type) {
  const application = confirmActionResolvedApp.value
  const isEditRequest = isPendingEditRequest(application)

  if (type === 'approve') {
    return isEditRequest
      ? 'This will approve the edit request and apply the requested changes.'
      : 'This will finalize the approval of this application.'
  }
  return isEditRequest
    ? 'You will continue to the rejection form for this edit request.'
    : 'You will continue to the rejection form.'
}

function getApplicationId(target) {
  return target?.id ?? target?.application_id ?? target?.leave_application_id ?? target
}

function resolveApplication(target) {
  if (target && typeof target === 'object') return target
  const id = String(target ?? '').trim()
  if (!id) return null
  return applications.value.find((application) => String(getApplicationId(application)) === id) || null
}

function openActionConfirm(type, target) {
  confirmActionType.value = type
  confirmActionTarget.value = target
  showConfirmActionDialog.value = true
}

function confirmPendingAction() {
  const target = confirmActionTarget.value
  const type = confirmActionType.value
  showConfirmActionDialog.value = false

  if (type === 'approve') {
    handleApprove(target)
    return
  }

  openReject(target)
}

function openEdit(app) {
  const selectedDates = normalizeSelectedDates(app?.selected_dates)
  const startDate = toIsoDate(app?.startDate) || selectedDates[0] || ''
  const endDate = toIsoDate(app?.endDate) || selectedDates[selectedDates.length - 1] || ''
  const preservedDates = selectedDates.length
    ? selectedDates
    : buildWeekdayDateRange(startDate, endDate)
  const parsedDays = getActualRequestedDayCount(app) ?? Number(app?.days)

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

async function handleApprove(target) {
  const application = resolveApplication(target)
  const id = getApplicationId(application || target)
  const isCoc = isCocApplication(application)
  const isEditRequest = isPendingEditRequest(application)
  const endpoint = isCoc
    ? `/hr/coc-applications/${id}/approve`
    : `/hr/leave-applications/${id}/approve`

  actionLoading.value = true
  try {
    await api.post(endpoint)
    $q.notify({
      type: 'positive',
      message: isCoc
        ? 'COC application approved and converted to CTO credits.'
        : isEditRequest
          ? 'Edit request approved. Requested changes and leave balances are now applied.'
          : 'Leave application approved! Balance deducted if credit-based.',
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

function openReject(target) {
  const application = resolveApplication(target)
  rejectId.value = getApplicationId(application || target)
  rejectTargetApp.value = application
  remarks.value = ''
  showRejectDialog.value = true
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
    const targetApplication = rejectTargetApp.value || resolveApplication(rejectId.value)
    const isCoc = isCocApplication(targetApplication)
    const isEditRequest = isPendingEditRequest(targetApplication)
    const endpoint = isCoc
      ? `/hr/coc-applications/${rejectId.value}/reject`
      : `/hr/leave-applications/${rejectId.value}/reject`

    await api.post(endpoint, {
      remarks: remarks.value,
    })
    $q.notify({
      type: 'info',
      message: isCoc
        ? 'COC application rejected with remarks'
        : isEditRequest
          ? 'Edit request rejected. Original approved application remains unchanged.'
          : 'Leave application rejected with remarks',
      position: 'top',
    })
    showRejectDialog.value = false
    showDetailsDialog.value = false
    await fetchApplications()
    rejectTargetApp.value = null
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

.hr-action-dialog-card--reject {
  border-color: #e6b8b8;
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
  border-radius: 18px;
  font-size: 1rem;
  font-weight: 700;
}

.hr-action-dialog-card__button--cancel {
  background: #ffffff;
  border-color: #d6dbe1;
  color: #111827;
}

.hr-application-details-dialog .q-dialog__inner--minimized {
  padding: 16px;
}

.hr-application-details-dialog .q-dialog__inner--minimized > div {
  width: min(520px, calc(100vw - 32px));
  max-width: min(520px, calc(100vw - 32px));
}

.hr-application-details-card {
  width: 100%;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.hr-application-details-header {
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  z-index: 2;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08);
}

.hr-application-details-content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.hr-application-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  align-content: start;
}

.hr-application-details-item {
  min-width: 0;
}

.hr-application-details-item--full {
  grid-column: 1 / -1;
}

.hr-application-details-actions {
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

.hr-application-duration-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px 12px;
  width: 100%;
}

.hr-application-duration-column {
  min-width: 0;
}

.hr-application-duration-date {
  line-height: 1.45;
  white-space: nowrap;
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

  .hr-action-dialog-card__actions {
    gap: 12px;
    padding: 0 20px 20px;
  }

  .hr-action-dialog-card__button {
    min-height: 50px;
    border-radius: 16px;
  }

  .hr-application-details-dialog .q-dialog__inner--minimized {
    padding: 12px;
  }

  .hr-application-details-dialog .q-dialog__inner--minimized > div {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }

  .hr-application-details-card {
    max-height: calc(100vh - 24px);
  }

  .hr-application-details-content {
    padding: 12px !important;
  }

  .hr-application-details-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 12px;
  }

  .hr-application-duration-columns {
    gap: 4px 10px;
  }

  .hr-application-duration-date {
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .hr-application-details-actions {
    padding: 10px 12px 12px;
    justify-content: stretch;
  }

  .hr-application-details-actions .q-btn {
    flex: 1 1 auto;
    min-width: 0;
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

