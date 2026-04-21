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
                  <q-spinner v-if="loading" size="32px" color="primary" />
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
              <q-avatar size="32px" color="primary" text-color="white" class="q-mr-sm">
                {{ (props.row.firstname || '').charAt(0) }}{{ (props.row.surname || '').charAt(0) }}
              </q-avatar>
              <div>
                <div class="text-weight-medium">
                  {{ props.row.surname }}, {{ props.row.firstname }}
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

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
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
    <q-dialog v-model="showViewDialog" persistent>
      <q-card class="rounded-borders employee-details-dialog">
        <q-card-section class="row items-center q-pb-none employee-details-dialog__toolbar">
          <div class="text-h6">Employee Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="selectedEmployee" class="employee-details-dialog__content">
          <div class="employee-details-header">
            <div class="employee-details-header__profile">
              <div class="employee-details-header__identity">
                <div class="text-h6 employee-details-header__name">
                  {{ selectedEmployee.firstname }} {{ selectedEmployee.surname }}
                </div>
                <div class="text-caption text-grey-6 employee-details-header__designation">
                  {{ selectedEmployee.designation || '-' }}
                </div>
              </div>
            </div>

            <div class="employee-details-header__meta">
              <div class="employee-details-header__meta-item">
                <div class="text-caption text-grey-6">Office</div>
                <div class="text-body2 text-weight-medium employee-details-header__meta-value">
                  {{ resolveOfficeAcronymLabel(selectedEmployee) || selectedEmployee.office || '-' }}
                </div>
              </div>
              <div class="employee-details-header__meta-item">
                <div class="text-caption text-grey-6">Status</div>
                <q-badge
                  :color="statusBadgeColor(selectedEmployee.status)"
                  :label="selectedEmployee.status"
                  rounded
                />
              </div>
            </div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 text-weight-medium">Leave History</div>
            <q-space />
            <q-spinner v-if="leaveHistoryLoading" color="primary" size="20px" />
          </div>
          <q-table
            class="leave-history-table"
            flat
            dense
            :rows="leaveHistory"
            :columns="historyColumns"
            row-key="id"
            :rows-per-page-options="[5, 10, 20]"
            :loading="leaveHistoryLoading"
            table-style="table-layout: fixed; width: 100%"
          >
            <template #header-cell="props">
              <q-th :props="props" class="leave-history-table__header-cell">
                <span class="leave-history-table__header-label">
                  {{ props.col.label }}
                </span>
              </q-th>
            </template>
            <template #body-cell-status="props">
              <q-td :props="props" class="leave-history-table__status-cell">
                <q-badge
                  :color="leaveStatusColor(props.row.raw_status)"
                  :label="props.row.status"
                  rounded
                />
              </q-td>
            </template>
            <template #body-cell-leave_type="props">
              <q-td :props="props" class="leave-history-table__leave-type-cell">
                <span class="leave-history-table__leave-type-text">
                  {{ props.row.leave_type || '-' }}
                </span>
              </q-td>
            </template>
            <template #body-cell-inclusive_date="props">
              <q-td :props="props" class="leave-history-table__inclusive-date-cell">
                <div class="row items-center justify-center no-wrap q-gutter-xs">
                  <q-btn
                    flat
                    dense
                    no-caps
                    color="primary"
                    class="leave-history-table__inclusive-date-trigger"
                    :disable="!canOpenLeaveHistoryCalendarPreview(props.row)"
                    @click.stop="openLeaveHistoryCalendarPreview(props.row)"
                  >
                    <span class="leave-history-table__inclusive-date-text">
                      {{ buildLeaveHistoryInclusiveDateLabel(props.row) }}
                    </span>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    round
                    icon="calendar_today"
                    color="primary"
                    :disable="!canOpenLeaveHistoryCalendarPreview(props.row)"
                    @click.stop="openLeaveHistoryCalendarPreview(props.row)"
                  >
                    <q-tooltip>View calendar</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>
            <template #body-cell-date_filed="props">
              <q-td :props="props">{{ formatDate(props.row.date_filed) }}</q-td>
            </template>
            <template #no-data>
              <div class="full-width text-center q-pa-md text-grey-6">
                <template v-if="leaveHistoryLoading">
                  <q-spinner color="primary" size="24px" class="q-mr-sm" />
                  <span>Loading leave history...</span>
                </template>
                <template v-else> No leave history found for this employee. </template>
              </div>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showLeaveCreditsLedgerDialog">
      <q-card class="rounded-borders leave-ledger-dialog" :style="ledgerDialogStyle">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="receipt_long" size="sm" color="secondary" class="q-mr-sm" />
          <div class="text-h6">Leave Credits Ledger</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="leave-ledger-dialog__body q-pt-sm">
          <q-banner
            v-if="leaveCreditsLedgerError"
            dense
            rounded
            class="bg-orange-1 text-orange-9 q-mb-md"
          >
            <template #avatar>
              <q-icon name="warning" color="orange-8" />
            </template>
            {{ leaveCreditsLedgerError }}
          </q-banner>

          <div
            v-if="leaveCreditsLedgerLoading"
            class="leave-ledger-dialog__loading row items-center justify-center q-pa-xl text-grey-7"
          >
            <q-spinner color="secondary" size="28px" class="q-mr-sm" />
            <span>Loading leave credits ledger...</span>
          </div>

          <div v-else class="ledger-preview-stage">
            <div
              class="ledger-sheet"
              :class="`ledger-sheet--${ledgerPaperSize.toLowerCase()}`"
              :style="ledgerSheetStyle"
            >
              <div class="ledger-sheet__identity">
                <div class="ledger-sheet__identity-name" :style="ledgerIdentityNameStyle">
                  {{ ledgerEmployeeHeadingName }}
                </div>
                <div class="ledger-sheet__identity-office" :style="ledgerIdentityOfficeStyle">
                  {{ ledgerEmployeeHeadingOffice }}
                </div>
                <div class="ledger-sheet__identity-service">
                  <span
                    class="ledger-sheet__identity-service-value"
                    :style="ledgerIdentityServiceValueStyle"
                  >
                    {{ ledgerEmployeeFirstDayOfService }}
                  </span>
                </div>
              </div>

              <div class="ledger-sheet__header">
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Name</div>
                </div>
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Division Office</div>
                </div>
                <div class="ledger-sheet__field ledger-sheet__field--service">
                  <div class="ledger-sheet__label">1st Day of Service</div>
                </div>
              </div>

              <div class="ledger-table-wrap">
                <table class="ledger-table">
                  <colgroup>
                    <col
                      v-for="(width, index) in ledgerColumnWidths"
                      :key="`ledger-col-${index}`"
                      :style="{ width }"
                    />
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowspan="2" class="ledger-table__primary-head">
                        <span class="ledger-table__stacked-head">Period</span>
                      </th>
                      <th
                        rowspan="2"
                        class="ledger-table__primary-head ledger-table__primary-head--particulars"
                      >
                        <span class="ledger-table__stacked-head">Particulars</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Vacation Leave</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Sick Leave</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Other Type of Leave</span>
                      </th>
                      <th rowspan="2" class="ledger-table__primary-head ledger-table__primary-head--action">
                        <span class="ledger-table__stacked-head">
                          Date &amp;<br />
                          Action<br />
                          Taken on<br />
                          Application<br />
                          for Leave
                        </span>
                      </th>
                    </tr>
                    <tr>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/P
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Earned</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.
                        </span>
                      </th>
                      <th><span class="ledger-table__stacked-head">Bal.</span></th>
                      <th>
                        <span class="ledger-table__stacked-head">
                          Abs.<br />
                          Und.<br />
                          W/oP
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in ledgerRenderedRows"
                      :key="entry.key"
                      :class="{ 'ledger-table__row--blank': entry.isBlank }"
                    >
                      <td class="ledger-table__cell--period">{{ entry.period }}</td>
                      <td class="ledger-table__cell--particulars">{{ entry.particulars }}</td>
                      <td>
                        <span :class="ledgerValueClass(entry.vacationEarned, entry, 'VL')">
                          {{ entry.vacationEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.vacationAbsUndWp, entry, 'VL')">
                          {{ entry.vacationAbsUndWp }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.vacationBalance, entry, 'VL')">
                          {{ entry.vacationBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.vacationAbsUndWop, entry, 'VL')">
                          {{ entry.vacationAbsUndWop }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickEarned, entry, 'SL')">
                          {{ entry.sickEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickAbsUnd, entry, 'SL')">
                          {{ entry.sickAbsUnd }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickBalance, entry, 'SL')">
                          {{ entry.sickBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickAbsUndWop, entry, 'SL')">
                          {{ entry.sickAbsUndWop }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.otherEarned, entry, 'OTHER')">
                          {{ entry.otherEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.otherAbsUndWp, entry, 'OTHER')">
                          {{ entry.otherAbsUndWp }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.otherBalance, entry, 'OTHER')">
                          {{ entry.otherBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.otherAbsUndWop, entry, 'OTHER')">
                          {{ entry.otherAbsUndWop }}
                        </span>
                      </td>
                      <td class="ledger-table__cell--action">{{ entry.actionTaken }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions class="ledger-dialog-actions q-pa-md">
          <q-space />
          <q-btn
            unelevated
            no-caps
            label="Print Ledger"
            color="secondary"
            icon="print"
            :loading="printingLeaveCreditsLedger"
            :disable="leaveCreditsLedgerLoading || !leaveCreditsLedgerEmployee"
            @click="printLeaveCreditsLedger"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Manual Leave Credits Dialog -->
    <q-dialog v-model="showLeaveCreditsDialog" persistent>
      <q-card class="rounded-borders leave-credit-dialog">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="add_card" size="sm" color="secondary" class="q-mr-sm" />
          <div class="text-h6">Add Leave Credits</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :disable="savingLeaveCredits" />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
            <template #avatar>
              <q-icon name="info" color="blue-8" />
            </template>
            This sets the employee's balances for allowed credit-based leave types.
          </q-banner>

          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-select
                ref="creditEmployeeSelect"
                v-model="leaveCreditForm.employee_control_no"
                v-model:input-value="creditEmployeeFilter"
                :options="filteredCreditEmployeeOptions"
                outlined
                dense
                emit-value
                map-options
                option-label="label"
                option-value="value"
                use-input
                fill-input
                hide-selected
                input-debounce="300"
                clearable
                label="Employee Name *"
                hint="Type at least 2 characters, e.g. CICTMO Juan"
                :loading="loadingCreditEmployees"
                @filter="filterCreditEmployeeOptions"
                @update:input-value="onCreditEmployeeInputValue"
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label v-if="scope.opt.caption" caption>
                        {{ scope.opt.caption }}
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template #no-option>
                  <q-item>
                    <q-item-section class="text-grey-7">
                      {{ creditEmployeeNoOptionMessage }}
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div class="col-12">
              <div class="text-subtitle2 text-weight-medium">Leave Type Balances</div>
              <div class="text-caption text-grey-6">Fill all allowed leave type balances.</div>
            </div>
            <template v-if="loadingCreditLeaveTypes">
              <div class="col-12">
                <div class="row items-center q-gutter-sm text-grey-7">
                  <q-spinner color="secondary" size="20px" />
                  <span>Loading leave types...</span>
                </div>
              </div>
            </template>
            <template v-else-if="creditLeaveTypes.length">
              <div
                v-for="leaveType in creditLeaveTypes"
                :key="leaveType.id"
                class="col-12 col-sm-6"
              >
                <q-input
                  v-model="leaveCreditForm.balances[leaveType.id]"
                  outlined
                  dense
                  type="number"
                  min="0"
                  :max="resolveLeaveTypeMaxDays(leaveType) ?? undefined"
                  step="0.001"
                  :label="`${getLeaveTypeDisplayName(leaveType)} *`"
                  :hint="formatLeaveTypeInputHint(leaveType)"
                  :rules="leaveCreditBalanceRules(leaveType)"
                  lazy-rules
                />
              </div>
            </template>
            <div v-else class="col-12">
              <q-banner dense rounded class="bg-orange-1 text-orange-9">
                {{ creditLeaveTypesEmptyMessage }}
              </q-banner>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            flat
            no-caps
            label="Cancel"
            color="grey-7"
            v-close-popup
            :disable="savingLeaveCredits"
          />
          <q-btn
            unelevated
            no-caps
            label="Save Leave Credits"
            color="secondary"
            icon="save"
            :loading="savingLeaveCredits"
            @click="saveLeaveCredits"
          />
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
  </q-page>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { api } from 'src/boot/axios'
import AdminApplicationCalendarDialog from 'src/components/admin/AdminApplicationCalendarDialog.vue'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const $q = useQuasar()

const search = ref('')
const activityFilter = ref('ACTIVE')
const loading = ref(false)
const loadingDepartments = ref(false)

const employees = ref([])
const allDepartments = ref([])
const totalEmployees = ref(0)
const activityOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'All', value: 'ALL' },
]

const showViewDialog = ref(false)
const selectedEmployee = ref(null)
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
const showLeaveCreditsLedgerDialog = ref(false)
const leaveCreditsLedgerEmployee = ref(null)
const leaveCreditsLedgerRows = ref([])
const leaveCreditsLedgerLoading = ref(false)
const leaveCreditsLedgerError = ref('')
const printingLeaveCreditsLedger = ref(false)
const ledgerPaperSize = ref('A4')

// Manual leave credit state
const showLeaveCreditsDialog = ref(false)
const savingLeaveCredits = ref(false)
const loadingCreditEmployees = ref(false)
const loadingCreditLeaveTypes = ref(false)
const creditLeaveTypes = ref([])
const allCreditEmployeeOptions = ref([])
const filteredCreditEmployeeOptions = ref([])
const leaveCreditForm = ref(defaultLeaveCreditForm())
const creditEmployeeSelect = ref(null)
const creditEmployeeFilter = ref('')
const CREDIT_EMPLOYEE_LOOKUP_LIMIT = 20
const CREDIT_EMPLOYEE_SEARCH_MIN_LENGTH = 2
const creditEmployeeLookupCache = new Map()
let creditEmployeeLookupSequence = 0
let creditEmployeeAbortController = null
let creditLeaveTypesLookupSequence = 0

// Server-side pagination state
const employeePagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

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
  { name: 'actions', label: 'Actions', align: 'center', field: 'actions' },
]
const visibleEmployeeColumns = computed(() =>
  $q.screen.lt.sm
    ? employeeColumns.filter((column) => !['control_no', 'status'].includes(column.name))
    : employeeColumns,
)
const creditEmployeeNoOptionMessage = computed(() => {
  if (loadingCreditEmployees.value) {
    return 'Searching employees...'
  }

  if (normalizeCreditEmployeeSearchValue(creditEmployeeFilter.value).length < CREDIT_EMPLOYEE_SEARCH_MIN_LENGTH) {
    return 'Type at least 2 characters to search employees.'
  }

  return 'No matching employees found.'
})
const creditLeaveTypesEmptyMessage = computed(() => {
  const selectedControlNo = String(leaveCreditForm.value.employee_control_no ?? '').trim()
  if (!selectedControlNo) {
    return 'Select an employee to load allowed leave types.'
  }

  return 'No credit-based leave types available for this employee.'
})

const historyColumns = [
  {
    name: 'date_filed',
    label: 'Date Filed',
    align: 'center',
    field: 'date_filed',
    sortable: true,
    style: 'width: 15%; white-space: nowrap;',
    headerStyle: 'width: 15%; white-space: nowrap;',
  },
  {
    name: 'leave_type',
    label: 'Leave Type',
    align: 'center',
    field: 'leave_type',
    sortable: true,
    classes: 'leave-history-table__leave-type-cell',
    headerClasses: 'leave-history-table__leave-type-cell',
    style: 'white-space: normal;',
    headerStyle: 'white-space: normal;',
  },
  {
    name: 'inclusive_date',
    label: 'Inclusive Date',
    align: 'center',
    field: (row) => buildLeaveHistoryInclusiveDateSortValue(row),
    sortable: true,
    classes: 'leave-history-table__inclusive-date-cell',
    headerClasses: 'leave-history-table__inclusive-date-cell',
    style: 'width: 29%; white-space: normal;',
    headerStyle: 'width: 29%; white-space: normal;',
  },
  {
    name: 'total_days',
    label: 'Days',
    align: 'center',
    field: 'total_days',
    sortable: true,
    classes: 'leave-history-table__days-cell',
    headerClasses: 'leave-history-table__days-cell',
    style: 'width: 10%; white-space: nowrap;',
    headerStyle: 'width: 10%; white-space: nowrap;',
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: 'status',
    sortable: true,
    classes: 'leave-history-table__status-cell',
    headerClasses: 'leave-history-table__status-cell',
    style: 'width: 21%; white-space: nowrap;',
    headerStyle: 'width: 21%; white-space: nowrap;',
  },
]

const LEDGER_ENDPOINT_FACTORIES = [
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-balance-ledger`,
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-credits-ledger`,
]
let preferredLedgerEndpointFactoryIndex = null

const LEDGER_PAPER_PRESETS = {
  A4: {
    label: 'A4',
    previewWidth: 794,
    previewHeight: 1123,
    minimumRows: 43,
    pdfMinimumRows: 43,
    pageSize: 'A4',
    pageMargins: [8, 8, 8, 8],
    pdfHorizontalInset: 0,
    pdfGridLineWidth: 0.75,
    pdfActionColumnShrink: 10,
    pdfHeaderRowHeight: 15,
    pdfSubHeaderRowHeight: 25.5,
    pdfBodyRowHeight: 15,
  },
  LONG: {
    label: 'Long',
    previewWidth: 816,
    previewHeight: 1248,
    minimumRows: 48,
    pdfMinimumRows: 48,
    pageSize: {
      width: 612,
      height: 936,
    },
    pageMargins: [8, 8, 8, 8],
    pdfHorizontalInset: 0,
    pdfGridLineWidth: 0.75,
    pdfActionColumnShrink: 10,
    pdfHeaderRowHeight: 15,
    pdfSubHeaderRowHeight: 25.5,
    pdfBodyRowHeight: 15,
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

const ledgerColumnWidths = LEDGER_COLUMN_WIDTH_UNITS.map(
  (width) => `${(width / LEDGER_COLUMN_WIDTH_TOTAL) * 100}%`,
)
const ledgerPaperPreset = computed(
  () => LEDGER_PAPER_PRESETS[ledgerPaperSize.value] || LEDGER_PAPER_PRESETS.A4,
)
const ledgerSheetStyle = computed(() => ({
  width: `${ledgerPaperPreset.value.previewWidth}px`,
  minHeight: `${ledgerPaperPreset.value.previewHeight}px`,
}))
const ledgerDialogStyle = computed(() => ({
  width: `min(${ledgerPaperPreset.value.previewWidth + 96}px, 96vw)`,
  maxWidth: '96vw',
}))
const ledgerRenderedRows = computed(() =>
  buildLedgerRowsForPaper(leaveCreditsLedgerRows.value, ledgerPaperPreset.value),
)

const ledgerEmployeeDisplayName = computed(() =>
  getEmployeeFullName(leaveCreditsLedgerEmployee.value),
)
const ledgerEmployeeHeadingName = computed(() =>
  formatLedgerHeadingName(ledgerEmployeeDisplayName.value),
)
const ledgerEmployeeHeadingOffice = computed(() =>
  formatLedgerHeadingOffice(leaveCreditsLedgerEmployee.value),
)
const ledgerIdentityNameStyle = computed(() =>
  buildLedgerIdentityPreviewStyle(ledgerEmployeeHeadingName.value),
)
const ledgerIdentityOfficeStyle = computed(() =>
  buildLedgerIdentityPreviewStyle(ledgerEmployeeHeadingOffice.value),
)
const ledgerEmployeeFirstDayOfService = computed(() => 'N/A')
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

  return String(fallbackName || 'Employee').trim().toUpperCase()
})
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
  const normalizedStatus = String(status || '')
    .trim()
    .toUpperCase()
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

function formatResponsiveStatusLabel(status) {
  const normalizedStatus = String(status || '')
    .trim()
    .toUpperCase()
  if (!normalizedStatus) return '-'
  return $q.screen.lt.sm ? normalizedStatus.charAt(0) : normalizedStatus
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

function formatLedgerHeadingOffice(employee) {
  const office = getLedgerEmployeeOffice(employee)
  const officeCode = resolveOfficeAcronymLabel(employee)
  return (officeCode && officeCode !== '-' ? officeCode : office) || 'N/A'
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

async function fetchDepartments() {
  loadingDepartments.value = true
  try {
    const { data } = await api.get('/departments')
    allDepartments.value = data.departments ?? []
  } catch (err) {
    console.error('Failed to load departments:', err)
    const msg = resolveApiErrorMessage(err, 'Unable to load departments right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loadingDepartments.value = false
  }
}

async function fetchData(page = 1) {
  loading.value = true
  try {
    const { searchText, departmentId } = resolveEmployeeSearch(search.value)

    const { data } = await api.get('/employees', {
      params: {
        department_id: departmentId || undefined,
        search: searchText || undefined,
        activity: activityFilter.value || 'ALL',
        per_page: employeePagination.value.rowsPerPage,
        page,
      },
    })

    totalEmployees.value = data.total_employees ?? 0

    if (data.employees) {
      employees.value = data.employees.data ?? []
      employeePagination.value.page = data.employees.current_page ?? 1
      employeePagination.value.rowsNumber = data.employees.total ?? 0
    } else {
      employees.value = []
      employeePagination.value.page = 1
      employeePagination.value.rowsNumber = 0
    }
  } catch (err) {
    console.error('Failed to load data:', err)
    const msg = resolveApiErrorMessage(err, 'Unable to load employee records right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loading.value = false
  }
}

async function fetchCreditLeaveTypes(employeeControlNo = '') {
  const lookupSequence = ++creditLeaveTypesLookupSequence
  const selectedControlNo = String(employeeControlNo ?? '').trim()

  loadingCreditLeaveTypes.value = true
  try {
    if (!selectedControlNo) {
      creditLeaveTypes.value = []
      leaveCreditForm.value.balances = buildLeaveCreditBalanceState(leaveCreditForm.value.balances)
      return
    }

    const { data } = await api.get('/hr/leave-balances/available-types', {
      params: {
        employee_control_no: selectedControlNo,
      },
    })
    if (lookupSequence !== creditLeaveTypesLookupSequence) {
      return
    }

    const leaveTypes = Array.isArray(data?.leave_types) ? data.leave_types : []
    creditLeaveTypes.value = sortCreditLeaveTypesForDisplay(
      leaveTypes
        .map((leaveType) => ({
          ...leaveType,
          // available-types endpoint already returns credit-based types; keep compatibility with existing checks.
          is_credit_based: leaveType?.is_credit_based ?? true,
        }))
        .filter((type) => isManualAddLeaveCreditType(type)),
    )
    leaveCreditForm.value.balances = buildLeaveCreditBalanceState(leaveCreditForm.value.balances)
  } catch (err) {
    if (lookupSequence !== creditLeaveTypesLookupSequence) {
      return
    }

    creditLeaveTypes.value = []
    leaveCreditForm.value.balances = buildLeaveCreditBalanceState(leaveCreditForm.value.balances)
    const msg = resolveApiErrorMessage(err, 'Unable to load leave types right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    if (lookupSequence === creditLeaveTypesLookupSequence) {
      loadingCreditLeaveTypes.value = false
    }
  }
}

function normalizeLeaveTypeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function getLeaveTypeDisplayName(leaveType) {
  return String(leaveType?.display_name || leaveType?.name || '').trim()
}

function isManualAddLeaveCreditType(leaveType) {
  if (!leaveType?.is_credit_based) return false

  return normalizeLeaveTypeName(leaveType?.name) !== 'cto leave'
}

function getCreditLeaveTypeDisplayPriority(leaveType) {
  const normalizedName = normalizeLeaveTypeName(leaveType?.name)
  const preferredOrder = {
    'vacation leave': 0,
    'sick leave': 1,
    'mandatory / forced leave': 2,
    'special privilege leave': 3,
    'wellness leave': 4,
    'solo parent leave': 5,
    'special emergency (calamity) leave': 6,
  }

  return Object.prototype.hasOwnProperty.call(preferredOrder, normalizedName)
    ? preferredOrder[normalizedName]
    : 99
}

function sortCreditLeaveTypesForDisplay(leaveTypes) {
  return [...leaveTypes].sort((left, right) => {
    const priorityDifference =
      getCreditLeaveTypeDisplayPriority(left) - getCreditLeaveTypeDisplayPriority(right)
    if (priorityDifference !== 0) return priorityDifference

    return String(left?.name ?? '').localeCompare(String(right?.name ?? ''))
  })
}

function normalizeCreditEmployeeOptions(options) {
  const optionMap = new Map()

  for (const option of options) {
    const value = String(option?.value ?? '').trim()
    if (!value) continue

    optionMap.set(value, {
      ...option,
      value,
    })
  }

  return Array.from(optionMap.values()).sort((left, right) => left.label.localeCompare(right.label))
}

function getFilteredCreditEmployeeOptions(filterValue, options = allCreditEmployeeOptions.value) {
  const normalizedFilter = normalizeCreditEmployeeSearchValue(filterValue)
  if (!normalizedFilter) {
    return options
  }

  const filterTerms = normalizedFilter.split(' ').filter(Boolean)

  return options.filter((option) =>
    filterTerms.every((term) => option.searchTerms.some((candidate) => candidate.includes(term))),
  )
}

function setCreditEmployeeOptions(options) {
  const normalizedOptions = normalizeCreditEmployeeOptions(options)
  allCreditEmployeeOptions.value = normalizedOptions
  filteredCreditEmployeeOptions.value = getFilteredCreditEmployeeOptions(
    creditEmployeeFilter.value,
    normalizedOptions,
  )
}

function buildCreditEmployeeOption(employee) {
  const controlNo = String(employee?.control_no ?? '').trim()
  if (!controlNo) return null

  const firstname = String(employee?.firstname ?? '').trim()
  const surname = String(employee?.surname ?? '').trim()
  const designation = String(employee?.designation ?? '').trim()
  const department = String(employee?.office ?? '').trim()
  const officeCode = resolveOfficeAcronymLabel(employee)
  const displayName = [surname, firstname].filter(Boolean).join(', ')
  const fullName = [firstname, surname].filter(Boolean).join(' ')
  const captionParts = []

  if (designation) {
    captionParts.push(designation)
  }

  if (department) {
    captionParts.push(officeCode)
  }

  const searchTerms = Array.from(
    new Set(
      [
        firstname,
        surname,
        displayName,
        fullName,
        designation,
        department,
        officeCode,
        `${officeCode} ${firstname}`,
        `${officeCode} ${surname}`,
        `${officeCode} ${displayName}`,
        `${officeCode} ${fullName}`,
        `${department} ${displayName}`,
        `${department} ${fullName}`,
      ]
        .map((value) => normalizeCreditEmployeeSearchValue(value))
        .filter(Boolean),
    ),
  )

  return {
    label: displayName || 'Unnamed Employee',
    value: controlNo,
    caption: captionParts.join(' | '),
    searchTerms,
  }
}

function normalizeCreditEmployeeSearchValue(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function upsertCreditEmployeeOption(employee) {
  const option = buildCreditEmployeeOption(employee)
  if (!option) return

  setCreditEmployeeOptions([...allCreditEmployeeOptions.value, option])
}

function getSelectedCreditEmployeeOption() {
  const selectedControlNo = String(leaveCreditForm.value.employee_control_no ?? '').trim()
  if (!selectedControlNo) return null

  return allCreditEmployeeOptions.value.find((option) => option.value === selectedControlNo) ?? null
}

function buildCreditEmployeeLookupCacheKey(departmentId, searchText) {
  const normalizedDepartmentId = departmentId ? String(departmentId).trim() : ''
  const normalizedSearchText = normalizeCreditEmployeeSearchValue(searchText)
  return `${normalizedDepartmentId}|${normalizedSearchText}|${CREDIT_EMPLOYEE_LOOKUP_LIMIT}`
}

function isCreditEmployeeLookupAbortError(error) {
  const errorCode = String(error?.code ?? '').trim().toUpperCase()
  const errorName = String(error?.name ?? '').trim()
  return errorCode === 'ERR_CANCELED' || errorName === 'AbortError' || errorName === 'CanceledError'
}

function buildCreditEmployeeLookupParams(rawSearchValue) {
  const normalizedRawSearchValue = normalizeCreditEmployeeSearchValue(rawSearchValue)
  const { searchText, departmentId } = resolveEmployeeSearch(rawSearchValue)
  const trimmedSearchText = String(searchText ?? '').trim()
  const lookupSearchText =
    trimmedSearchText
      .split(/\s+/)
      .filter(Boolean)
      .sort((left, right) => right.length - left.length)[0] || trimmedSearchText
  const fallbackSearchText = String(rawSearchValue ?? '').trim()
  const resolvedSearchText =
    departmentId !== null && trimmedSearchText === '' ? '' : lookupSearchText || fallbackSearchText

  return {
    departmentId,
    searchText: resolvedSearchText,
    shouldLookup: departmentId !== null || normalizedRawSearchValue.length >= CREDIT_EMPLOYEE_SEARCH_MIN_LENGTH,
  }
}

async function fetchCreditEmployees(rawSearchValue = '') {
  const lookupSequence = ++creditEmployeeLookupSequence
  const { departmentId, searchText, shouldLookup } = buildCreditEmployeeLookupParams(rawSearchValue)

  if (!shouldLookup) {
    if (creditEmployeeAbortController) {
      creditEmployeeAbortController.abort()
      creditEmployeeAbortController = null
    }
    const selectedOption = getSelectedCreditEmployeeOption()
    setCreditEmployeeOptions(selectedOption ? [selectedOption] : [])
    return
  }

  const cacheKey = buildCreditEmployeeLookupCacheKey(departmentId, searchText)
  const cachedOptions = creditEmployeeLookupCache.get(cacheKey)
  if (Array.isArray(cachedOptions)) {
    const selectedOption = getSelectedCreditEmployeeOption()
    setCreditEmployeeOptions(selectedOption ? [selectedOption, ...cachedOptions] : cachedOptions)
    return
  }

  if (creditEmployeeAbortController) {
    creditEmployeeAbortController.abort()
  }
  creditEmployeeAbortController = new AbortController()
  loadingCreditEmployees.value = true

  try {
    const { data } = await api.get('/hr/employee-options', {
      params: {
        department_id: departmentId || undefined,
        search: searchText || undefined,
        limit: CREDIT_EMPLOYEE_LOOKUP_LIMIT,
      },
      signal: creditEmployeeAbortController.signal,
    })

    if (lookupSequence !== creditEmployeeLookupSequence) {
      return
    }

    const selectedOption = getSelectedCreditEmployeeOption()
    const lookupOptions = (Array.isArray(data?.employees) ? data.employees : [])
      .map(buildCreditEmployeeOption)
      .filter(Boolean)

    creditEmployeeLookupCache.set(cacheKey, lookupOptions)
    setCreditEmployeeOptions(selectedOption ? [selectedOption, ...lookupOptions] : lookupOptions)
  } catch (err) {
    if (lookupSequence !== creditEmployeeLookupSequence) {
      return
    }
    if (isCreditEmployeeLookupAbortError(err)) {
      return
    }

    const msg = resolveApiErrorMessage(err, 'Unable to load employee options right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    if (lookupSequence === creditEmployeeLookupSequence) {
      loadingCreditEmployees.value = false
      creditEmployeeAbortController = null
    }
  }
}

function filterCreditEmployeeOptions(value, update) {
  creditEmployeeFilter.value = String(value ?? '')
  const currentSearchValue = creditEmployeeFilter.value
  const lookupSequence = creditEmployeeLookupSequence + 1
  const { shouldLookup } = buildCreditEmployeeLookupParams(currentSearchValue)

  if (!shouldLookup) {
    creditEmployeeLookupSequence = lookupSequence
    loadingCreditEmployees.value = false
    update(() => {
      const selectedOption = getSelectedCreditEmployeeOption()
      setCreditEmployeeOptions(selectedOption ? [selectedOption] : [])
    })
    return
  }

  loadingCreditEmployees.value = true
  void fetchCreditEmployees(currentSearchValue)
    .then(() => {
      update(() => {
        filteredCreditEmployeeOptions.value = getFilteredCreditEmployeeOptions(
          creditEmployeeFilter.value,
          allCreditEmployeeOptions.value,
        )
      })
    })
    .catch(() => {
      update(() => {
        filteredCreditEmployeeOptions.value = []
      })
    })
}

function onCreditEmployeeInputValue(value) {
  creditEmployeeFilter.value = String(value ?? '')

  if (creditEmployeeFilter.value.trim() !== '') {
    creditEmployeeSelect.value?.showPopup?.()
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

watch(showViewDialog, (isOpen) => {
  if (isOpen) return
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
  fetchDepartments()
  fetchData()
})

watch(
  () => String(leaveCreditForm.value.employee_control_no ?? '').trim(),
  (selectedControlNo, previousControlNo) => {
    if (!showLeaveCreditsDialog.value) return
    if (selectedControlNo === previousControlNo) return

    void fetchCreditLeaveTypes(selectedControlNo)
  },
)

onBeforeUnmount(() => {
  clearCalendarPreviewWarning()
})

function viewEmployee(emp) {
  selectedEmployee.value = emp
  showViewDialog.value = true
  fetchEmployeeLeaveHistory(emp?.control_no)
}

function onEmployeeRowClick(_evt, row) {
  viewEmployee(row)
}

function leaveStatusColor(status) {
  const map = {
    PENDING_ADMIN: 'orange-8',
    PENDING_HR: 'amber-8',
    APPROVED: 'positive',
    REJECTED: 'negative',
  }
  return map[status] ?? 'grey-7'
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatLedgerActionDate(value) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return parsed.toLocaleDateString('en-US', {
    year: '2-digit',
    month: 'numeric',
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

  if (
    compact === 'mco6' ||
    compact === 'mc06' ||
    compact === 'mo6' ||
    compact === 'spl' ||
    compact === 'specialprivilege' ||
    compact === 'specialprivilegeleave' ||
    compact.startsWith('mco6') ||
    compact.startsWith('mc06')
  ) {
    return 'MCO6'
  }

  return ''
}

function resolveLedgerCellLeaveCode(entry, section) {
  const normalizedSection = String(section ?? '').trim().toUpperCase()

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
    return rowLeaveCode === 'WL' || rowLeaveCode === 'MCO6' ? rowLeaveCode : ''
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

function buildLedgerPdfBodyCell(value, options = {}) {
  const text = String(value ?? '').trim()

  return {
    text: text || ' ',
    alignment: options.alignment || 'center',
    bold: options.bold ?? false,
    color: options.color || '#000000',
    fillColor: options.fillColor,
    fontSize: options.fontSize ?? 7.68,
    lineHeight: options.lineHeight ?? 1,
    margin: options.margin || [0.3, 0.9, 0.3, 0.3],
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
    ...options,
  })
}

function buildLeaveCreditsLedgerDocDefinition(employee, rows, paperSize = 'A4') {
  const preset = LEDGER_PAPER_PRESETS[paperSize] || LEDGER_PAPER_PRESETS.A4
  const displayName = getEmployeeFullName(employee)
  const headingName = formatLedgerHeadingName(displayName)
  const headingOffice = formatLedgerHeadingOffice(employee)
  const firstDayOfService = 'N/A'
  const identityNameFontSize = resolveLedgerPdfIdentityFontSize(headingName)
  const identityOfficeFontSize = resolveLedgerPdfIdentityFontSize(headingOffice)
  const identityServiceFontSize = resolveLedgerPdfIdentityFontSize(firstDayOfService)
  const horizontalInset = Number(preset?.pdfHorizontalInset ?? 0)
  const gridLineWidth = Number(preset?.pdfGridLineWidth ?? 0.75)
  const headerUnderlineRightTrim = Number(preset?.pdfActionColumnShrink ?? 0) * 0.45
  const renderedRows = buildLedgerRowsForPaper(rows, preset, {
    padToMinimumRows: true,
    minimumRowsOverride: preset.pdfMinimumRows ?? preset.minimumRows,
  })
  const tableBody = [
    [
      {
        text: 'PERIOD',
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

  renderedRows.forEach((entry) => {
    tableBody.push([
      buildLedgerPdfBodyCell(entry.period, {
        bold: Boolean(String(entry.period || '').trim()),
        fontSize: 7.68,
      }),
      buildLedgerPdfBodyCell(entry.particulars, {
        bold: Boolean(String(entry.particulars || '').trim()),
        fontSize: 6.6,
        lineHeight: 1,
        margin: [0.4, 0.95, 0.4, 0.2],
      }),
      buildLedgerPdfValueCell(entry.vacationEarned, undefined, {
        fontSize: 7.68,
      }, entry, 'VL'),
      buildLedgerPdfValueCell(entry.vacationAbsUndWp, undefined, {
        fontSize: 7.68,
      }, entry, 'VL'),
      buildLedgerPdfValueCell(entry.vacationBalance, undefined, {
        fontSize: 7.68,
      }, entry, 'VL'),
      buildLedgerPdfValueCell(entry.vacationAbsUndWop, undefined, {
        fontSize: 7.68,
      }, entry, 'VL'),
      buildLedgerPdfValueCell(entry.sickEarned, undefined, {
        fontSize: 7.68,
      }, entry, 'SL'),
      buildLedgerPdfValueCell(entry.sickAbsUnd, undefined, {
        fontSize: 7.68,
      }, entry, 'SL'),
      buildLedgerPdfValueCell(entry.sickBalance, undefined, {
        fontSize: 7.68,
      }, entry, 'SL'),
      buildLedgerPdfValueCell(entry.sickAbsUndWop, undefined, {
        fontSize: 7.68,
      }, entry, 'SL'),
      buildLedgerPdfValueCell(entry.otherEarned, undefined, {
        fontSize: 7.68,
      }, entry, 'OTHER'),
      buildLedgerPdfValueCell(entry.otherAbsUndWp, undefined, {
        fontSize: 7.68,
      }, entry, 'OTHER'),
      buildLedgerPdfValueCell(entry.otherBalance, undefined, {
        fontSize: 7.68,
      }, entry, 'OTHER'),
      buildLedgerPdfValueCell(entry.otherAbsUndWop, undefined, {
        fontSize: 7.68,
      }, entry, 'OTHER'),
      buildLedgerPdfBodyCell(entry.actionTaken, {
        bold: Boolean(String(entry.actionTaken || '').trim()),
        fontSize: 7.68,
        lineHeight: 1,
        margin: [0.35, 0.85, 0.35, 0.2],
      }),
    ])
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
    content: [
      {
        table: {
          widths: ['34%', '42%', '24%'],
          body: [
            [
              buildLedgerPdfIdentityCell(headingName, {
                fontSize: identityNameFontSize,
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
        margin: [horizontalInset, 0, horizontalInset, 2],
      },
      {
        table: {
          widths: ['34%', '42%', '24%'],
          body: [
            [
              buildLedgerPdfTopLabelCell('Name'),
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
      {
        table: {
          headerRows: 2,
          widths: buildLedgerPdfTableWidths(preset),
          heights: (rowIndex) => {
            if (rowIndex === 0) return preset.pdfHeaderRowHeight
            if (rowIndex === 1) return preset.pdfSubHeaderRowHeight
            return preset.pdfBodyRowHeight
          },
          body: tableBody,
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
  return `${monthLabel} ${parts.day} ${parts.year}`
}

function sortAndNormalizeLedgerDatePartsList(partsList) {
  if (!Array.isArray(partsList) || partsList.length === 0) return []

  const byIsoDate = new Map()
  for (const parts of partsList) {
    if (!parts) continue
    const iso = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
    if (!byIsoDate.has(iso)) {
      byIsoDate.set(iso, parts)
    }
  }

  return [...byIsoDate.entries()]
    .sort(([leftIso], [rightIso]) => (leftIso < rightIso ? -1 : leftIso > rightIso ? 1 : 0))
    .map(([, parts]) => parts)
}

function buildLedgerInclusiveDatesListLabel(partsList) {
  const normalizedList = sortAndNormalizeLedgerDatePartsList(partsList)
  if (normalizedList.length === 0) return ''

  const sameYear = normalizedList.every((parts) => parts.year === normalizedList[0].year)
  const sameMonth =
    sameYear && normalizedList.every((parts) => parts.month === normalizedList[0].month)

  if (sameMonth) {
    const monthLabel = normalizedList[0].date.toLocaleDateString('en-US', { month: 'short' })
    const days = normalizedList.map((parts) => parts.day).join(',')
    return `${monthLabel} ${days} ${normalizedList[0].year}`
  }

  if (sameYear) {
    const values = normalizedList.map((parts) => {
      const monthLabel = parts.date.toLocaleDateString('en-US', { month: 'short' })
      return `${monthLabel} ${parts.day}`
    })
    return `${values.join(', ')} ${normalizedList[0].year}`
  }

  return normalizedList
    .map((parts) => {
      const monthLabel = parts.date.toLocaleDateString('en-US', { month: 'short' })
      return `${monthLabel} ${parts.day} ${parts.year}`
    })
    .join(', ')
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

function buildLedgerInclusiveRangeText(entry) {
  const explicitDatesValue = pickFirstDefined(entry, [
    'inclusive_dates',
    'inclusiveDates',
    'selected_dates',
    'selectedDates',
  ])
  if (Array.isArray(explicitDatesValue) && explicitDatesValue.length > 0) {
    const explicitParts = explicitDatesValue
      .map((value) => parseLedgerDateParts(value))
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
    const fullRangeLabel = buildLedgerInclusiveDatesListLabel(fullRangeParts)
    if (fullRangeLabel) return fullRangeLabel
  }

  return buildLedgerInclusiveDateLabel(inclusiveStart || inclusiveEnd)
}

function resolveLeaveHistoryInclusiveDateParts(entry) {
  const explicitDatesValue = parseInclusiveDatesValue(pickFirstDefined(entry, [
    'inclusive_dates',
    'inclusiveDates',
    'selected_dates',
    'selectedDates',
  ]))
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

function buildLeaveHistoryInclusiveDateSortValue(entry) {
  const normalizedList = resolveLeaveHistoryInclusiveDateParts(entry)
  if (!normalizedList.length) return ''

  const first = normalizedList[0]
  return `${String(first.year).padStart(4, '0')}-${String(first.month).padStart(2, '0')}-${String(first.day).padStart(2, '0')}`
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
  const candidates = [
    entry?.pending_update,
    entry?.latest_update_request_payload,
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

  return {
    id: pickFirstDefined(
      entry,
      ['id', 'ledger_id', 'ledgerId', 'entry_id', 'entryId'],
      `ledger-${index}`,
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
    otherEarned: normalizeLedgerAccrualQuantityValue(
      pickFirstDefined(entry, [
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
      ]),
    ),
    otherAbsUndWp: normalizeLedgerWithPayDeductionValue(
      pickFirstDefined(entry, [
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
      ]),
    ),
    otherBalance: normalizeLedgerQuantityValue(
      pickFirstDefined(entry, [
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
      ]),
    ),
    otherAbsUndWop: normalizeLedgerQuantityValue(
      pickFirstDefined(entry, [
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
      ]),
    ),
    actionTaken: buildLedgerActionText(entry),
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
  const endpointEntries = LEDGER_ENDPOINT_FACTORIES.map((buildEndpoint, index) => ({
    buildEndpoint,
    index,
  }))

  const isMissingLedgerEndpointResponse = (err) => {
    const statusCode = Number(err?.response?.status)
    return statusCode === 404 || statusCode === 405
  }

  const probeLedgerEndpoints = async (entries) =>
    new Promise((resolve, reject) => {
      if (!entries.length) {
        const error = new Error('Leave credits ledger endpoint was not found.')
        error.isMissingLedgerEndpoint = true
        reject(error)
        return
      }

      let pendingRequests = entries.length
      let settled = false
      let lastNotFoundError = null

      entries.forEach(({ buildEndpoint, index }) => {
        api
          .get(buildEndpoint(controlNo))
          .then(({ data }) => {
            if (settled) return
            settled = true
            preferredLedgerEndpointFactoryIndex = index
            resolve(data)
          })
          .catch((err) => {
            if (settled) return
            if (isMissingLedgerEndpointResponse(err)) {
              lastNotFoundError = err
              pendingRequests -= 1

              if (pendingRequests === 0) {
                settled = true
                const error =
                  lastNotFoundError || new Error('Leave credits ledger endpoint was not found.')
                error.isMissingLedgerEndpoint = true
                reject(error)
              }
              return
            }

            settled = true
            reject(err)
          })
      })
    })

  if (preferredLedgerEndpointFactoryIndex !== null) {
    const preferredEntry = endpointEntries.find(
      ({ index }) => index === preferredLedgerEndpointFactoryIndex,
    )

    if (preferredEntry) {
      try {
        const { data } = await api.get(preferredEntry.buildEndpoint(controlNo))
        return data
      } catch (err) {
        if (!isMissingLedgerEndpointResponse(err)) {
          throw err
        }

        preferredLedgerEndpointFactoryIndex = null
      }
    }
  }

  return probeLedgerEndpoints(endpointEntries)
}

async function fetchEmployeeLeaveHistory(controlNo) {
  if (!controlNo) {
    leaveHistory.value = []
    return
  }

  leaveHistoryLoading.value = true
  try {
    const { data } = await api.get(`/hr/employees/${encodeURIComponent(controlNo)}/leave-history`)
    leaveHistory.value = data.applications ?? []
    if (data.employee) {
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

async function openLeaveCreditsLedgerDialog(employee) {
  const controlNo = String(employee?.control_no ?? '').trim()
  if (!controlNo) return

  ledgerPaperSize.value = 'A4'
  leaveCreditsLedgerEmployee.value = { ...employee }
  leaveCreditsLedgerRows.value = []
  leaveCreditsLedgerError.value = ''
  showLeaveCreditsLedgerDialog.value = true
  leaveCreditsLedgerLoading.value = true

  try {
    const payload = await fetchLeaveCreditsLedgerPayload(controlNo)
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
    leaveCreditsLedgerRows.value = orderLedgerRowsOldestFirst(normalizedRows)
  } catch (err) {
    const message = err?.isMissingLedgerEndpoint
      ? 'Leave credits ledger is not available right now.'
      : resolveApiErrorMessage(err, 'Unable to load leave credits ledger right now.')

    leaveCreditsLedgerError.value = message
    leaveCreditsLedgerRows.value = []
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    leaveCreditsLedgerLoading.value = false
  }
}

function defaultLeaveCreditForm() {
  return {
    employee_control_no: '',
    balances: buildLeaveCreditBalanceState(),
  }
}

function resetLeaveCreditForm() {
  creditLeaveTypesLookupSequence += 1
  loadingCreditLeaveTypes.value = false
  creditLeaveTypes.value = []
  creditEmployeeLookupSequence += 1
  if (creditEmployeeAbortController) {
    creditEmployeeAbortController.abort()
    creditEmployeeAbortController = null
  }
  loadingCreditEmployees.value = false
  leaveCreditForm.value = defaultLeaveCreditForm()
  creditEmployeeFilter.value = ''
  setCreditEmployeeOptions([])
}

function openLeaveCreditsDialog(employee = null) {
  resetLeaveCreditForm()
  if (employee?.control_no) {
    leaveCreditForm.value.employee_control_no = String(employee.control_no)
    upsertCreditEmployeeOption(employee)
  }
  showLeaveCreditsDialog.value = true
  void fetchCreditLeaveTypes(leaveCreditForm.value.employee_control_no)
}

function buildLeaveCreditBalanceState(existingBalances = {}) {
  const balances = {}

  for (const leaveType of creditLeaveTypes.value) {
    const balanceKey = String(leaveType.id)
    balances[balanceKey] = Object.prototype.hasOwnProperty.call(existingBalances, balanceKey)
      ? existingBalances[balanceKey]
      : ''
  }

  return balances
}

function normalizeBalanceInputValue(value) {
  if (value === null || value === undefined) return ''
  return typeof value === 'string' ? value.trim() : value
}

function getEnteredLeaveCreditEntries() {
  return creditLeaveTypes.value.reduce((entries, leaveType) => {
    const balanceKey = String(leaveType.id)
    const rawBalance = normalizeBalanceInputValue(leaveCreditForm.value.balances?.[balanceKey])

    if (rawBalance === '') {
      return entries
    }

    entries.push({
      leaveType,
      balanceKey,
      rawBalance,
      balance: Number(rawBalance),
    })

    return entries
  }, [])
}

function resolveLeaveTypeMaxDays(leaveType) {
  const rawMaxDays = leaveType?.max_days ?? leaveType?.maxDays
  const maxDays = Number(rawMaxDays)
  return Number.isFinite(maxDays) && maxDays >= 0 ? maxDays : null
}

function formatDayLimitLabel(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return ''

  const displayValue = Number.isInteger(numericValue) ? String(numericValue) : String(numericValue)
  return `${displayValue} day${numericValue === 1 ? '' : 's'}`
}

function leaveCreditBalanceRules(leaveType) {
  const leaveTypeLabel = getLeaveTypeDisplayName(leaveType)

  return [
    (value) => {
      const rawValue = normalizeBalanceInputValue(value)
      if (rawValue === '') return `${leaveTypeLabel} is required.`

      const numericValue = Number(rawValue)
      if (!Number.isFinite(numericValue)) return `${leaveTypeLabel} must be a number.`
      if (numericValue < 0) return `${leaveTypeLabel} cannot be negative.`

      const maxDays = resolveLeaveTypeMaxDays(leaveType)
      if (maxDays !== null && numericValue > maxDays) {
        return `${leaveTypeLabel} cannot exceed ${formatDayLimitLabel(maxDays)}.`
      }

      return true
    },
  ]
}

function formatLeaveTypeInputHint(leaveType) {
  const maxDays = resolveLeaveTypeMaxDays(leaveType)
  if (maxDays === null) return ''
  return `Max ${formatDayLimitLabel(maxDays)}`
}

function leaveCreditValidationError() {
  const employeeControlNo = String(leaveCreditForm.value.employee_control_no ?? '').trim()
  if (!employeeControlNo) return 'Employee is required.'
  if (!/^\d+$/.test(employeeControlNo)) return 'Select a valid employee.'

  if (loadingCreditLeaveTypes.value) return 'Leave types are still loading.'
  if (!creditLeaveTypes.value.length) return 'No credit-based leave types are available.'

  let hasPositiveBalance = false

  for (const leaveType of creditLeaveTypes.value) {
    const leaveTypeLabel = getLeaveTypeDisplayName(leaveType)
    const balanceKey = String(leaveType.id)
    const rawBalance = normalizeBalanceInputValue(leaveCreditForm.value.balances?.[balanceKey])
    if (rawBalance === '') return `${leaveTypeLabel} is required.`

    const numericValue = Number(rawBalance)
    if (!Number.isFinite(numericValue)) return `${leaveTypeLabel} must be a number.`
    if (numericValue < 0) return `${leaveTypeLabel} cannot be negative.`

    if (numericValue > 0) {
      hasPositiveBalance = true
    }

    const maxDays = resolveLeaveTypeMaxDays(leaveType)
    if (maxDays !== null && numericValue > maxDays) {
      return `${leaveTypeLabel} cannot exceed ${formatDayLimitLabel(maxDays)}.`
    }
  }

  if (!hasPositiveBalance) {
    return 'At least one leave type must be greater than 0.'
  }

  return ''
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

async function saveLeaveCredits() {
  const validationError = leaveCreditValidationError()
  if (validationError) {
    $q.notify({ type: 'warning', message: validationError, position: 'top' })
    return
  }

  savingLeaveCredits.value = true
  try {
    const employeeControlNo = String(leaveCreditForm.value.employee_control_no).trim()
    const entries = getEnteredLeaveCreditEntries()
    const payload = {
      employee_control_no: employeeControlNo,
      balances: entries.map((entry) => ({
        leave_type_id: Number(entry.leaveType.id),
        balance: Number(entry.balance),
      })),
    }

    const { data } = await api.post('/hr/leave-balances', payload)
    const savedCount = Number(data?.saved_count)
    const normalizedSavedCount =
      Number.isFinite(savedCount) && savedCount > 0 ? savedCount : entries.length

    $q.notify({
      type: 'positive',
      message: `${normalizedSavedCount} leave balance(s) saved successfully.`,
      position: 'top',
    })

    markEmployeeManualLeaveCreditsUsed(employeeControlNo)
    showLeaveCreditsDialog.value = false
    resetLeaveCreditForm()
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save leave credits right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    savingLeaveCredits.value = false
  }
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

.leave-ledger-dialog {
  width: 96vw;
  max-width: 96vw;
  max-height: 96vh;
  background: #f4f4f1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.leave-ledger-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.leave-ledger-dialog__loading {
  flex: 1 1 auto;
  min-height: 0;
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
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.employee-details-header__meta-item {
  min-width: 110px;
}

.employee-details-header__meta-value {
  line-height: 1.25;
}

.ledger-preview-stage {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 4px;
  border-radius: 12px;
  background: #e5e7eb;
}

.ledger-sheet {
  margin: 0 auto;
  border: 1px solid #000000;
  overflow: hidden;
  background: #fffdf8;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
  font-family: 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
}

.ledger-sheet__identity {
  display: grid;
  grid-template-columns: 34% 42% 24%;
  align-items: center;
  column-gap: 8px;
  min-height: 40px;
  padding: 8px 12px 4px;
  border-bottom: 1px solid #000000;
}

.ledger-sheet__identity-name,
.ledger-sheet__identity-office,
.ledger-sheet__identity-service {
  min-width: 0;
  color: #000000;
  font-weight: 700;
  line-height: 1.04;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.ledger-sheet__identity-name {
  letter-spacing: 0.005em;
  text-align: center;
}

.ledger-sheet__identity-office {
  text-align: center;
  letter-spacing: 0.005em;
}

.ledger-sheet__identity-service {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.ledger-sheet__identity-service-value {
  font-size: inherit;
}

.ledger-sheet__header {
  display: grid;
  grid-template-columns: 34% 42% 24%;
  border-bottom: 1px solid #000000;
}

.ledger-sheet__field {
  min-height: 20px;
  padding: 2px 8px 3px;
  border-right: 1px solid #000000;
}

.ledger-sheet__field:last-child {
  border-right: none;
}

.ledger-sheet__label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #000000;
  text-align: center;
}

.ledger-sheet__field--service {
  text-align: center;
}

.ledger-table-wrap {
  overflow: visible;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.ledger-table th,
.ledger-table td {
  border: 1px solid #000000;
  padding: 1px 2px;
  font-size: 0.64rem;
  line-height: 1.02;
  vertical-align: middle;
  color: #000000;
  text-align: center;
}

.ledger-table th {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: #fffdf8;
  color: #000000;
  padding: 0;
}

.ledger-table thead tr:first-child th {
  height: 20px;
}

.ledger-table thead tr:nth-child(2) th {
  height: 34px;
}

.ledger-table thead tr:nth-child(2) .ledger-table__stacked-head {
  font-size: 0.56rem;
  line-height: 0.96;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table td {
  padding: 1px 3px;
}

.ledger-table tbody tr {
  height: 20px;
}

.ledger-table__stacked-head {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  line-height: 1.01;
  text-align: center;
  padding: 1px 2px;
}

.ledger-table__value {
  display: inline-block;
  min-width: 2.5ch;
}

.ledger-table__value--emphasis {
  color: #000000;
  font-weight: 700;
}

.ledger-table__value--wl {
  color: #1e5fbf;
}

.ledger-table__value--mco6 {
  color: #1b8f3a;
}

.ledger-table__cell--period,
.ledger-table__cell--particulars,
.ledger-table__cell--action {
  text-align: center !important;
}

.ledger-table__cell--particulars {
  font-size: 0.55rem;
  line-height: 1;
  font-weight: 600;
}

.ledger-table__primary-head--particulars .ledger-table__stacked-head {
  font-size: 0.56rem;
  letter-spacing: 0.01em;
}

.ledger-table__primary-head--action .ledger-table__stacked-head {
  font-size: 0.52rem;
  line-height: 0.94;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table__cell--period {
  font-weight: 600;
}

.ledger-table__cell--action {
  white-space: pre-line;
  font-weight: 600;
}

.ledger-dialog-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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
  .leave-ledger-dialog {
    width: min(100vw, 100vw);
  }

  .ledger-preview-stage {
    padding: 4px;
  }

  .ledger-sheet__identity {
    grid-template-columns: 1fr;
    row-gap: 6px;
  }

  .ledger-sheet__identity-name,
  .ledger-sheet__identity-office,
  .ledger-sheet__identity-service {
    text-align: center;
    justify-content: center;
  }

  .ledger-dialog-actions {
    align-items: stretch;
  }

  .employee-details-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .employee-details-header__meta {
    justify-content: flex-start;
    gap: 16px;
    width: 100%;
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
