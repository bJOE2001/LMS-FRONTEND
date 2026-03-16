<template>
  <q-page class="q-pa-md">
    <!-- Page Header -->
    <div class="q-mb-lg">
      <div class="row items-center justify-between">
        <div>
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Employee Management</h1>
          <p class="text-grey-7 q-mb-none">Manage and view all employee records</p>
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
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="upload_file"
            label="Import Leave Balances"
            class="import-btn"
            @click="showImportDialog = true"
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
                <div class="text-caption text-weight-medium summary-strip__label">Total Employees</div>
                <div class="text-h4 text-primary summary-strip__value">{{ totalEmployees }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-6 summary-strip__item">
        <q-card class="bg-white rounded-borders summary-strip__card" flat bordered>
          <q-card-section class="summary-strip__card-section">
            <div class="row items-center no-wrap summary-strip__content">
              <q-icon name="business" size="md" color="green-8" class="q-mr-sm summary-strip__icon" />
              <div class="summary-strip__text">
                <div class="text-caption text-weight-medium summary-strip__label">Departments</div>
                <div class="text-h4 text-green-8 summary-strip__value">{{ allDepartments.length }}</div>
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
          <div class="row q-gutter-sm search-wrap">
            <q-input
              v-model="search"
              outlined
              dense
              debounce="400"
              placeholder="Search name, ID, status, department..."
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
        :columns="employeeColumns"
        row-key="control_no"
        flat
        :loading="loading"
        v-model:pagination="employeePagination"
        :rows-per-page-options="[10]"
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
              :label="props.value"
              class="text-weight-medium"
              rounded
            />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn
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
            <q-icon name="people_outline" size="48px" color="grey-5" />
            <div class="text-grey-6 q-mt-sm">No employees found</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- View Employee Dialog -->
    <q-dialog v-model="showViewDialog" persistent>
      <q-card class="rounded-borders employee-details-dialog">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Employee Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="selectedEmployee">
          <div class="row q-col-gutter-md">
            <div class="col-12 text-center q-mb-md">
              <q-avatar size="64px" color="primary" text-color="white" class="text-h5">
                {{ (selectedEmployee.firstname || '').charAt(0)
                }}{{ (selectedEmployee.surname || '').charAt(0) }}
              </q-avatar>
              <div class="text-h6 q-mt-sm">
                {{ selectedEmployee.firstname }} {{ selectedEmployee.surname }}
              </div>
              <div class="text-caption text-grey-6">{{ selectedEmployee.designation || '-' }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Department</div>
              <div class="text-body2 text-weight-medium">
                {{ toDepartmentCode(selectedEmployee.office) }}
              </div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Status</div>
              <q-badge
                :color="statusBadgeColor(selectedEmployee.status)"
                :label="selectedEmployee.status"
                rounded
              />
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
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="leaveStatusColor(props.row.raw_status)"
                  :label="props.row.status"
                  rounded
                />
              </q-td>
            </template>
            <template #body-cell-start_date="props">
              <q-td :props="props">{{ formatDate(props.row.start_date) }}</q-td>
            </template>
            <template #body-cell-end_date="props">
              <q-td :props="props">{{ formatDate(props.row.end_date) }}</q-td>
            </template>
            <template #body-cell-date_filed="props">
              <q-td :props="props">{{ formatDate(props.row.date_filed) }}</q-td>
            </template>
            <template #no-data>
              <div class="full-width text-center q-pa-md text-grey-6">
                No leave history found for this employee.
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
                  <span class="ledger-sheet__identity-service-label">1st Day of Service</span>
                  <span class="ledger-sheet__identity-service-value" :style="ledgerIdentityServiceValueStyle">
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
                      <th rowspan="2" class="ledger-table__primary-head">
                        <span class="ledger-table__stacked-head">Particulars</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Vacation Leave</span>
                      </th>
                      <th colspan="4" class="ledger-table__section-head">
                        <span class="ledger-table__stacked-head">Sick Leave</span>
                      </th>
                      <th rowspan="2" class="ledger-table__primary-head">
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
                        <span :class="ledgerValueClass(entry.vacationEarned)">
                          {{ entry.vacationEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.vacationAbsUndWp)">
                          {{ entry.vacationAbsUndWp }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.vacationBalance)">
                          {{ entry.vacationBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.vacationAbsUndWop)">
                          {{ entry.vacationAbsUndWop }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickEarned)">
                          {{ entry.sickEarned }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickAbsUnd)">
                          {{ entry.sickAbsUnd }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickBalance)">
                          {{ entry.sickBalance }}
                        </span>
                      </td>
                      <td>
                        <span :class="ledgerValueClass(entry.sickAbsUndWop)">
                          {{ entry.sickAbsUndWop }}
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
          <q-select
            v-model="ledgerPaperSize"
            dense
            outlined
            emit-value
            map-options
            options-dense
            :options="ledgerPaperSizeOptions"
            label="Paper Size"
            class="ledger-paper-select"
          />
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
            This sets the employee's balance for the selected leave type.
          </q-banner>

          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-select
                ref="creditEmployeeSelect"
                v-model="leaveCreditForm.employee_id"
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
                input-debounce="0"
                clearable
                label="Employee Name *"
                hint="Type office acronym + name, e.g. CICTMO Juan"
                :loading="loadingCreditEmployees"
                @filter="filterCreditEmployeeOptions"
                @focus="ensureCreditEmployeeOptionsLoaded"
                @popup-show="ensureCreditEmployeeOptionsLoaded"
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
              </q-select>
            </div>
            <div class="col-12">
              <div class="text-subtitle2 text-weight-medium">Leave Type Balances</div>
              <div class="text-caption text-grey-6">
                Fill only the leave types you want to update.
              </div>
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
                  step="0.01"
                  :label="leaveType.name"
                  :hint="formatLeaveTypeInputHint(leaveType)"
                />
              </div>
            </template>
            <div v-else class="col-12">
              <q-banner dense rounded class="bg-orange-1 text-orange-9">
                No credit-based leave types available.
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

    <!-- Import Leave Balances Dialog -->
    <q-dialog v-model="showImportDialog" persistent>
      <q-card style="min-width: 540px; max-width: 640px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="upload_file" size="sm" color="primary" class="q-mr-sm" />
          <div class="text-h6">Import Leave Balances</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :disable="importing" />
        </q-card-section>

        <!-- Instructions -->
        <q-card-section v-if="!importResult" class="q-pt-sm">
          <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
            <template #avatar>
              <q-icon name="info" color="blue-8" />
            </template>
            <div class="text-body2">
              Upload a CSV file with columns: <strong>employee_id</strong>,
              <strong>leave_type</strong>, <strong>balance</strong>.<br />
              <span class="text-caption"
                >employee_id = Control No, leave_type = exact name (e.g. Vacation Leave), balance >=
                0</span
              >
            </div>
          </q-banner>

          <!-- File input -->
          <q-file
            v-model="importFile"
            outlined
            dense
            label="Select CSV file"
            accept=".csv,.txt"
            max-file-size="2097152"
            class="q-mb-md"
            :error="!!importFileError"
            :error-message="importFileError"
            @rejected="onFileRejected"
            @update:model-value="importFileError = ''"
          >
            <template #prepend>
              <q-icon name="attach_file" color="grey-6" />
            </template>
          </q-file>

          <!-- CSV preview -->
          <q-card v-if="!importFile" flat bordered class="bg-grey-1 rounded-borders q-pa-md">
            <div class="text-caption text-grey-7 text-weight-medium q-mb-xs">
              Example CSV format:
            </div>
            <pre class="text-caption text-grey-8 q-mb-none" style="line-height: 1.5">
employee_id,leave_type,balance
000001,Vacation Leave,12.50
000001,Sick Leave,8.00
000002,MCO6 Leave,5</pre
            >
          </q-card>
        </q-card-section>

        <!-- Import result -->
        <q-card-section v-if="importResult" class="q-pt-sm">
          <div class="text-center q-mb-md">
            <q-icon
              :name="importResult.failed_records === 0 ? 'check_circle' : 'warning'"
              :color="importResult.failed_records === 0 ? 'positive' : 'orange-8'"
              size="56px"
            />
            <div class="text-h6 q-mt-sm">Import Completed</div>
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-4 text-center">
              <div class="text-h5 text-primary">{{ importResult.total_records }}</div>
              <div class="text-caption text-grey-6">Total Rows</div>
            </div>
            <div class="col-4 text-center">
              <div class="text-h5 text-positive">{{ importResult.successful_records }}</div>
              <div class="text-caption text-grey-6">Successful</div>
            </div>
            <div class="col-4 text-center">
              <div
                class="text-h5"
                :class="importResult.failed_records > 0 ? 'text-negative' : 'text-grey-5'"
              >
                {{ importResult.failed_records }}
              </div>
              <div class="text-caption text-grey-6">Failed</div>
            </div>
          </div>

          <!-- Error details -->
          <q-expansion-item
            v-if="importResult.errors && importResult.errors.length > 0"
            icon="error_outline"
            label="Row Errors"
            :caption="importResult.errors.length + ' issue(s)'"
            header-class="text-negative"
            dense
          >
            <q-list dense separator class="q-mt-xs">
              <q-item v-for="(err, idx) in importResult.errors" :key="idx">
                <q-item-section avatar>
                  <q-badge color="red-3" text-color="red-9" :label="'Row ' + err.row" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-body2">{{ err.message }}</q-item-label>
                  <q-item-label caption>Value: {{ err.value }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <template v-if="!importResult">
            <q-btn flat no-caps label="Cancel" color="grey-7" v-close-popup :disable="importing" />
            <q-btn
              unelevated
              no-caps
              label="Upload & Import"
              color="primary"
              icon="cloud_upload"
              :loading="importing"
              :disable="!importFile"
              @click="doImport"
            />
          </template>
          <template v-else>
            <q-btn flat no-caps label="Import Another" color="primary" @click="resetImport" />
            <q-btn
              unelevated
              no-caps
              label="Done"
              color="primary"
              v-close-popup
              @click="resetImport"
            />
          </template>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { api } from 'src/boot/axios'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const $q = useQuasar()

const search = ref('')
const loading = ref(false)

const employees = ref([])
const allDepartments = ref([])
const totalEmployees = ref(0)

const showViewDialog = ref(false)
const selectedEmployee = ref(null)
const leaveHistory = ref([])
const leaveHistoryLoading = ref(false)
const showLeaveCreditsLedgerDialog = ref(false)
const leaveCreditsLedgerEmployee = ref(null)
const leaveCreditsLedgerRows = ref([])
const leaveCreditsLedgerLoading = ref(false)
const leaveCreditsLedgerError = ref('')
const printingLeaveCreditsLedger = ref(false)
const ledgerPaperSize = ref('A4')

// CSV import state
const showImportDialog = ref(false)
const importFile = ref(null)
const importFileError = ref('')
const importing = ref(false)
const importResult = ref(null)

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
const creditEmployeesLoaded = ref(false)
const creditEmployeeFilter = ref('')
let creditEmployeesPromise = null

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
    label: 'Department',
    align: 'left',
    field: (row) => toDepartmentCode(row.office),
    sortable: true,
  },
  { name: 'actions', label: 'Actions', align: 'center', field: 'actions' },
]

const historyColumns = [
  {
    name: 'date_filed',
    label: 'Date Filed',
    align: 'left',
    field: 'date_filed',
    sortable: true,
    style: 'width: 16%',
  },
  {
    name: 'leave_type',
    label: 'Leave Type',
    align: 'left',
    field: 'leave_type',
    sortable: true,
    style: 'width: 22%',
  },
  {
    name: 'start_date',
    label: 'Start Date',
    align: 'left',
    field: 'start_date',
    sortable: true,
    style: 'width: 16%',
  },
  {
    name: 'end_date',
    label: 'End Date',
    align: 'left',
    field: 'end_date',
    sortable: true,
    style: 'width: 16%',
  },
  {
    name: 'total_days',
    label: 'Days',
    align: 'center',
    field: 'total_days',
    sortable: true,
    style: 'width: 10%',
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: 'status',
    sortable: true,
    style: 'width: 20%',
  },
]

const LEDGER_ENDPOINT_FACTORIES = [
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-balance-ledger`,
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-credits-ledger`,
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-balance-history`,
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-credits-history`,
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/ledger`,
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-balances/ledger`,
  (controlNo) => `/hr/employees/${encodeURIComponent(controlNo)}/leave-balances/history`,
  (controlNo) => `/hr/leave-balances/${encodeURIComponent(controlNo)}/ledger`,
  (controlNo) => `/hr/leave-balances/ledger/${encodeURIComponent(controlNo)}`,
]
let preferredLedgerEndpointFactoryIndex = null

const LEDGER_PAPER_PRESETS = {
  A4: {
    label: 'A4',
    previewWidth: 794,
    previewHeight: 1123,
    minimumRows: 43,
    pageSize: 'A4',
    pageMargins: [10, 12, 10, 12],
    pdfHeaderRowHeight: 18,
    pdfSubHeaderRowHeight: 21,
    pdfBodyRowHeight: 17,
  },
  LONG: {
    label: 'Long',
    previewWidth: 816,
    previewHeight: 1248,
    minimumRows: 48,
    pageSize: {
      width: 612,
      height: 936,
    },
    pageMargins: [10, 12, 10, 12],
    pdfHeaderRowHeight: 18,
    pdfSubHeaderRowHeight: 21,
    pdfBodyRowHeight: 17,
  },
}

const LEDGER_COLUMN_WIDTH_UNITS = [12, 16, 8, 8, 8, 8, 8, 8, 8, 8, 14]
const LEDGER_COLUMN_WIDTH_TOTAL = LEDGER_COLUMN_WIDTH_UNITS.reduce(
  (total, width) => total + width,
  0,
)
const LEDGER_BLANK_ROW_TEMPLATE = Object.freeze({
  period: '',
  particulars: '',
  vacationEarned: '',
  vacationAbsUndWp: '',
  vacationBalance: '',
  vacationAbsUndWop: '',
  sickEarned: '',
  sickAbsUnd: '',
  sickBalance: '',
  sickAbsUndWop: '',
  actionTaken: '',
})

const ledgerPaperSizeOptions = Object.entries(LEDGER_PAPER_PRESETS).map(([value, preset]) => ({
  label: preset.label,
  value,
}))
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
const ledgerEmployeeFirstDayOfService = computed(() =>
  formatLedgerServiceDate(
    pickFirstDefined(leaveCreditsLedgerEmployee.value, [
      'first_day_of_service',
      'firstDayOfService',
      'date_hired',
      'dateHired',
      'hire_date',
      'hireDate',
      'appointment_date',
      'appointmentDate',
      'employment_start_date',
      'employmentStartDate',
      'service_start_date',
      'serviceStartDate',
    ]),
  ),
)
const ledgerIdentityServiceValueStyle = computed(() =>
  buildLedgerIdentityPreviewStyle(ledgerEmployeeFirstDayOfService.value),
)

function statusBadgeColor(status) {
  if (!status) return 'grey'
  const c = { REGULAR: 'green', 'CO-TERMINOUS': 'blue', ELECTIVE: 'amber', CASUAL: 'orange' }
  return c[status] ?? 'blue'
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

function getLedgerEmployeeDesignation(employee) {
  const designation = pickFirstDefined(employee, [
    'designation',
    'position',
    'job_title',
    'jobTitle',
  ])

  return String(designation || '').trim()
}

function formatLedgerHeadingName(value) {
  return String(value || 'N/A')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function formatLedgerHeadingOffice(employee) {
  const office = getLedgerEmployeeOffice(employee)
  const officeCode = toDepartmentCode(office)
  const designation = getLedgerEmployeeDesignation(employee)
  const primaryOffice = officeCode && officeCode !== '-' ? officeCode : office

  return [primaryOffice, designation].filter(Boolean).join(' - ') || 'N/A'
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

  if (length > 72) return 5.2
  if (length > 60) return 5.5
  if (length > 54) return 5.8
  if (length > 42) return 6.2
  if (length > 30) return 6.6
  return 7.1
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
  try {
    const { data } = await api.get('/departments')
    allDepartments.value = data.departments ?? []
  } catch (err) {
    console.error('Failed to load departments:', err)
    const msg = resolveApiErrorMessage(err, 'Unable to load departments right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
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

async function fetchCreditLeaveTypes() {
  loadingCreditLeaveTypes.value = true
  try {
    const { data } = await api.get('/hr/leave-types')
    const leaveTypes = Array.isArray(data.leave_types) ? data.leave_types : []
    creditLeaveTypes.value = leaveTypes.filter((type) => type.is_credit_based)
    leaveCreditForm.value.balances = buildLeaveCreditBalanceState(leaveCreditForm.value.balances)
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load leave types right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loadingCreditLeaveTypes.value = false
  }
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

function getFilteredCreditEmployeeOptions(filterValue) {
  const normalizedFilter = normalizeCreditEmployeeSearchValue(filterValue)
  if (!normalizedFilter) {
    return allCreditEmployeeOptions.value
  }

  const filterTerms = normalizedFilter.split(' ').filter(Boolean)

  return allCreditEmployeeOptions.value.filter((option) =>
    filterTerms.every((term) => option.searchTerms.some((candidate) => candidate.includes(term))),
  )
}

function refreshFilteredCreditEmployeeOptions() {
  filteredCreditEmployeeOptions.value = getFilteredCreditEmployeeOptions(creditEmployeeFilter.value)
}

function setCreditEmployeeOptions(options) {
  const normalizedOptions = normalizeCreditEmployeeOptions(options)
  allCreditEmployeeOptions.value = normalizedOptions
  refreshFilteredCreditEmployeeOptions()
}

function buildCreditEmployeeOption(employee) {
  const controlNo = String(employee?.control_no ?? '').trim()
  if (!controlNo) return null

  const firstname = String(employee?.firstname ?? '').trim()
  const surname = String(employee?.surname ?? '').trim()
  const designation = String(employee?.designation ?? '').trim()
  const department = String(employee?.office ?? '').trim()
  const officeCode = toDepartmentCode(department)
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

async function fetchCreditEmployees() {
  loadingCreditEmployees.value = true

  try {
    let page = 1
    let lastPage = 1
    const collectedOptions = []

    do {
      const { data } = await api.get('/employees', {
        params: {
          per_page: 100,
          page,
        },
      })

      const pageEmployees = Array.isArray(data?.employees?.data) ? data.employees.data : []
      collectedOptions.push(...pageEmployees.map(buildCreditEmployeeOption).filter(Boolean))

      lastPage = Number(data?.employees?.last_page ?? 1)
      page += 1
    } while (page <= lastPage)

    setCreditEmployeeOptions(collectedOptions)
    creditEmployeesLoaded.value = true
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load employee options right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    loadingCreditEmployees.value = false
  }
}

async function ensureCreditEmployeeOptionsLoaded() {
  if (creditEmployeesLoaded.value) return
  if (creditEmployeesPromise) return creditEmployeesPromise

  creditEmployeesPromise = fetchCreditEmployees().finally(() => {
    creditEmployeesPromise = null
  })

  return creditEmployeesPromise
}

function filterCreditEmployeeOptions(value, update) {
  creditEmployeeFilter.value = String(value ?? '')

  if (!creditEmployeesLoaded.value && !loadingCreditEmployees.value) {
    void ensureCreditEmployeeOptionsLoaded()
  }

  update(() => {
    refreshFilteredCreditEmployeeOptions()
  })
}

function onCreditEmployeeInputValue(value) {
  creditEmployeeFilter.value = String(value ?? '')
  refreshFilteredCreditEmployeeOptions()

  if (!creditEmployeesLoaded.value && !loadingCreditEmployees.value) {
    void ensureCreditEmployeeOptionsLoaded()
  }

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

onMounted(() => {
  fetchDepartments()
  fetchCreditLeaveTypes()
  fetchData()
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

function formatLedgerServiceDate(value) {
  if (!value) return 'N/A'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

function formatLedgerActionDate(value) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value).trim()

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

function buildLedgerRowsForPaper(rows, preset) {
  const normalizedRows = Array.isArray(rows)
    ? rows.map((entry, index) => ({
        ...LEDGER_BLANK_ROW_TEMPLATE,
        ...entry,
        key: entry?.key || entry?.id || `ledger-row-${index}`,
        isBlank: false,
      }))
    : []
  const minimumRows = Number(preset?.minimumRows ?? 0)
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
  const availableWidth = Math.max(480, pageWidth - leftMargin - rightMargin)

  return LEDGER_COLUMN_WIDTH_UNITS.map((unit) =>
    Number(((availableWidth * unit) / LEDGER_COLUMN_WIDTH_TOTAL).toFixed(2)),
  )
}

function getLedgerValueTone(value) {
  const normalizedValue = String(value ?? '').trim()

  if (/^\+\s*\d/.test(normalizedValue)) return 'positive'
  if (/^-\s*\d/.test(normalizedValue)) return 'negative'
  return ''
}

function ledgerValueClass(value) {
  const tone = getLedgerValueTone(value)

  return {
    'ledger-table__value': true,
    'ledger-table__value--positive': tone === 'positive',
    'ledger-table__value--negative': tone === 'negative',
  }
}

function sanitizeLedgerPdfFilenamePart(value) {
  return String(value ?? '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getLedgerPdfFilename(employee) {
  const safeName = sanitizeLedgerPdfFilenamePart(getEmployeeFullName(employee).replace(/,\s*/g, ' '))
  return `${safeName || 'employee'} leave credits ledger.pdf`
}

function buildLedgerPdfIdentityCell(text, options = {}) {
  return {
    text: String(text || ' ').trim() || ' ',
    fontSize: options.fontSize ?? 7.1,
    bold: options.bold ?? true,
    color: '#000000',
    alignment: options.alignment || 'center',
    margin: options.margin || [2, 1, 2, 1],
    noWrap: options.noWrap ?? true,
  }
}

function buildLedgerPdfIdentityServiceCell(value, options = {}) {
  const fontSize = options.fontSize ?? 7.1
  const labelFontSize = options.labelFontSize ?? fontSize

  return {
    text: [
      {
        text: '1ST DAY OF SERVICE',
        fontSize: labelFontSize,
        bold: true,
        color: '#000000',
      },
      {
        text: '  ',
      },
      {
        text: String(value || 'N/A').trim() || 'N/A',
        fontSize,
        bold: true,
        color: '#000000',
      },
    ],
    alignment: options.alignment || 'center',
    noWrap: options.noWrap ?? true,
    margin: options.margin || [2, 1, 2, 1],
  }
}

function buildLedgerPdfTopLabelCell(text) {
  return {
    text: String(text || '').toUpperCase(),
    fontSize: 7.1,
    bold: true,
    color: '#000000',
    alignment: 'center',
    margin: [0, 2, 0, 2],
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
    fontSize: options.fontSize ?? 5.55,
    lineHeight: options.lineHeight ?? 0.96,
    margin: options.margin || [0.5, 1.25, 0.5, 0.2],
  }
}

function buildLedgerPdfValueCell(value, fillColor, options = {}) {
  const tone = getLedgerValueTone(value)

  return buildLedgerPdfBodyCell(value, {
    color: tone === 'positive' ? '#1b8f3a' : tone === 'negative' ? '#c62828' : '#000000',
    bold: tone === 'positive' || tone === 'negative',
    fillColor,
    ...options,
  })
}

function buildLeaveCreditsLedgerDocDefinition(employee, rows, paperSize = 'A4') {
  const preset = LEDGER_PAPER_PRESETS[paperSize] || LEDGER_PAPER_PRESETS.A4
  const displayName = getEmployeeFullName(employee)
  const headingName = formatLedgerHeadingName(displayName)
  const headingOffice = formatLedgerHeadingOffice(employee)
  const firstDayOfService = formatLedgerServiceDate(
    pickFirstDefined(employee, [
      'first_day_of_service',
      'firstDayOfService',
      'date_hired',
      'dateHired',
      'hire_date',
      'hireDate',
      'appointment_date',
      'appointmentDate',
      'employment_start_date',
      'employmentStartDate',
      'service_start_date',
      'serviceStartDate',
    ]),
  )
  const identityNameFontSize = resolveLedgerPdfIdentityFontSize(headingName)
  const identityOfficeFontSize = resolveLedgerPdfIdentityFontSize(headingOffice)
  const identityServiceFontSize = resolveLedgerPdfIdentityFontSize(firstDayOfService)
  const renderedRows = buildLedgerRowsForPaper(rows, preset)
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
      {},
    ],
  ]

  renderedRows.forEach((entry) => {
    tableBody.push([
      buildLedgerPdfBodyCell(entry.period, {
        bold: Boolean(String(entry.period || '').trim()),
        fontSize: 5.45,
      }),
      buildLedgerPdfBodyCell(entry.particulars, {
        fontSize: 5.1,
        lineHeight: 0.94,
        margin: [0.4, 1.15, 0.4, 0.15],
      }),
      buildLedgerPdfValueCell(entry.vacationEarned, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfValueCell(entry.vacationAbsUndWp, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfValueCell(entry.vacationBalance, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfValueCell(entry.vacationAbsUndWop, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfValueCell(entry.sickEarned, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfValueCell(entry.sickAbsUnd, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfValueCell(entry.sickBalance, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfValueCell(entry.sickAbsUndWop, undefined, {
        fontSize: 5.55,
      }),
      buildLedgerPdfBodyCell(entry.actionTaken, {
        fontSize: 4.75,
        lineHeight: 0.9,
        margin: [0.3, 0.75, 0.3, 0.1],
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
        margin: [0, 0, 0, 2],
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
          hLineWidth: () => 0.55,
          vLineWidth: () => 0,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 0],
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
        layout: {
          hLineWidth: () => 0.55,
          vLineWidth: () => 0.55,
          hLineColor: () => '#000000',
          vLineColor: () => '#000000',
          paddingLeft: () => 0.2,
          paddingRight: () => 0.2,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 0],
      },
    ],
    styles: {
      ledgerPdfRowSpanHead: {
        color: '#000000',
        fontSize: 5.9,
        bold: true,
        alignment: 'center',
        margin: [1, 12.2, 1, 0],
        lineHeight: 1.01,
      },
      ledgerPdfActionHead: {
        color: '#000000',
        fontSize: 5.45,
        bold: true,
        alignment: 'center',
        margin: [0.5, 4.7, 0.5, 0],
        lineHeight: 0.98,
      },
      ledgerPdfGroupHead: {
        color: '#000000',
        fontSize: 5.7,
        bold: true,
        alignment: 'center',
        margin: [1, 4.15, 1, 0],
        lineHeight: 1,
      },
      ledgerPdfSubHead: {
        color: '#000000',
        fontSize: 5.4,
        bold: true,
        alignment: 'center',
        margin: [0.8, 2.8, 0.8, 0],
        lineHeight: 0.98,
      },
    },
    defaultStyle: {
      fontSize: 5.9,
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
  if (directValue) return directValue

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
  const actionLabel = normalizeLedgerTextValue(
    pickFirstDefined(entry, [
      'action_taken',
      'actionTaken',
      'action',
      'reference',
      'reference_no',
      'referenceNo',
      'notes',
      'remarks',
    ]),
  )

  return [actionDate, actionLabel].filter(Boolean).join(actionDate && actionLabel ? ' - ' : '')
}

function normalizeLedgerRow(entry, index) {
  return {
    id: pickFirstDefined(
      entry,
      ['id', 'ledger_id', 'ledgerId', 'entry_id', 'entryId'],
      `ledger-${index}`,
    ),
    period: normalizeLedgerTextValue(
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
    particulars: normalizeLedgerTextValue(
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
    ),
    vacationEarned: normalizeLedgerQuantityValue(
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
    vacationAbsUndWp: normalizeLedgerQuantityValue(
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
    sickEarned: normalizeLedgerQuantityValue(
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
    sickAbsUnd: normalizeLedgerQuantityValue(
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
    actionTaken: buildLedgerActionText(entry),
  }
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

    leaveCreditsLedgerRows.value = extractLedgerRows(payload).map((entry, index) =>
      normalizeLedgerRow(entry, index),
    )
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
    employee_id: '',
    balances: buildLeaveCreditBalanceState(),
  }
}

function resetLeaveCreditForm() {
  leaveCreditForm.value = defaultLeaveCreditForm()
  creditEmployeeFilter.value = ''
  filteredCreditEmployeeOptions.value = allCreditEmployeeOptions.value
}

function openLeaveCreditsDialog(employee = null) {
  resetLeaveCreditForm()
  if (employee?.control_no) {
    leaveCreditForm.value.employee_id = String(employee.control_no)
    upsertCreditEmployeeOption(employee)
  }
  showLeaveCreditsDialog.value = true
  void ensureCreditEmployeeOptionsLoaded()
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

function formatLeaveTypeInputHint(leaveType) {
  const category = String(leaveType?.category ?? '').trim()
  return category ? `${category} leave type` : 'Leave credits (days)'
}

function leaveCreditValidationError() {
  const employeeId = String(leaveCreditForm.value.employee_id ?? '').trim()
  if (!employeeId) return 'Employee is required.'
  if (!/^\d+$/.test(employeeId)) return 'Select a valid employee.'

  if (loadingCreditLeaveTypes.value) return 'Leave types are still loading.'
  if (!creditLeaveTypes.value.length) return 'No credit-based leave types are available.'

  const entries = getEnteredLeaveCreditEntries()
  if (!entries.length) return 'Enter leave credits for at least one leave type.'

  for (const entry of entries) {
    if (!Number.isFinite(entry.balance)) return `${entry.leaveType.name} must be a number.`
    if (entry.balance < 0) return `${entry.leaveType.name} cannot be negative.`
  }

  return ''
}

async function saveLeaveCredits() {
  const validationError = leaveCreditValidationError()
  if (validationError) {
    $q.notify({ type: 'warning', message: validationError, position: 'top' })
    return
  }

  savingLeaveCredits.value = true
  try {
    const employeeId = String(leaveCreditForm.value.employee_id).trim()
    const entries = getEnteredLeaveCreditEntries()
    const results = await Promise.allSettled(
      entries.map((entry) =>
        api.post('/hr/leave-balances', {
          employee_id: employeeId,
          leave_type_id: Number(entry.leaveType.id),
          balance: entry.balance,
        }),
      ),
    )

    const successfulEntries = []
    const failedEntries = []

    results.forEach((result, index) => {
      const entry = entries[index]
      if (result.status === 'fulfilled') {
        successfulEntries.push(entry)
        return
      }

      failedEntries.push({
        ...entry,
        message: resolveApiErrorMessage(
          result.reason,
          `Unable to save ${entry.leaveType.name} leave credits right now.`,
        ),
      })
    })

    if (!failedEntries.length) {
      $q.notify({
        type: 'positive',
        message: `${successfulEntries.length} leave balance(s) saved successfully.`,
        position: 'top',
      })
      showLeaveCreditsDialog.value = false
      resetLeaveCreditForm()
      return
    }

    for (const entry of successfulEntries) {
      leaveCreditForm.value.balances[entry.balanceKey] = ''
    }

    const firstFailure = failedEntries[0]
    const savedCount = successfulEntries.length
    const failedCount = failedEntries.length

    $q.notify({
      type: savedCount > 0 ? 'warning' : 'negative',
      message:
        savedCount > 0
          ? `${savedCount} leave balance(s) saved. ${failedCount} failed. First error: ${firstFailure.message}`
          : firstFailure.message,
      position: 'top',
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to save leave credits right now.')
    $q.notify({ type: 'negative', message: msg, position: 'top' })
  } finally {
    savingLeaveCredits.value = false
  }
}

function onFileRejected() {
  importFileError.value = 'File must be CSV/TXT and under 2 MB.'
}

function resetImport() {
  importFile.value = null
  importFileError.value = ''
  importResult.value = null
}

async function doImport() {
  if (!importFile.value) return
  importing.value = true
  importFileError.value = ''
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    const { data } = await api.post('/hr/leave-balances/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    importResult.value = data
    $q.notify({
      type: data.failed_records === 0 ? 'positive' : 'warning',
      message: `Import done: ${data.successful_records} of ${data.total_records} rows imported.`,
      position: 'top',
    })
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to import employee records right now.')
    if (err.response?.status === 422 && err.response?.data?.errors?.file) {
      importFileError.value = err.response.data.errors.file[0]
    } else {
      $q.notify({ type: 'negative', message: msg, position: 'top' })
    }
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.search-wrap {
  width: min(620px, 100%);
}

.search-input {
  width: 100%;
}
.import-btn {
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.02em;
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

.ledger-sheet__identity-service-label {
  font-size: inherit;
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
  font-size: 0.68rem;
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

.ledger-table__value--positive {
  color: #1b8f3a;
  font-weight: 700;
}

.ledger-table__value--negative {
  color: #c62828;
  font-weight: 700;
}

.ledger-table__cell--period,
.ledger-table__cell--particulars,
.ledger-table__cell--action {
  text-align: center !important;
}

.ledger-table__cell--period {
  font-weight: 600;
}

.ledger-table__cell--action {
  white-space: pre-line;
}

.ledger-dialog-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ledger-paper-select {
  width: 140px;
  min-width: 140px;
}

.leave-history-table :deep(.q-table__middle) {
  overflow-x: hidden;
}

.leave-history-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.leave-history-table :deep(th),
.leave-history-table :deep(td) {
  white-space: nowrap;
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

  .ledger-paper-select {
    width: 100%;
    min-width: 0;
  }

  .ledger-dialog-actions {
    align-items: stretch;
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
}
</style>
