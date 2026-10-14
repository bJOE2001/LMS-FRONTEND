<template>
  <div class="dtr-container">
    <!-- Screen View Toolbar & Controls (Hidden on Print) -->
    <q-card v-if="!hideToolbar" flat bordered class="q-mb-md no-print bg-white rounded-borders">
      <q-card-section class="q-pa-sm">
        <div class="row items-center justify-between q-col-gutter-sm">
          <!-- Left: Title & Quick Info -->
          <div class="col-12 col-md-auto">
            <div class="row items-center q-gutter-x-sm">
              <q-icon name="print" color="green-9" size="22px" />
              <div>
                <div class="text-subtitle2 text-weight-bold text-dark">
                  CSC Form 48 & Accomplishment Report
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Date Range Picker & Actions (Single Horizontal Row) -->
          <div class="col-12 col-md-auto">
            <div class="row items-center justify-end q-gutter-sm no-wrap">
              <!-- Compact Calendar Date Range Picker -->
              <div
                class="custom-range-trigger row items-center no-wrap q-px-sm cursor-pointer rounded-borders"
              >
                <q-icon name="date_range" size="16px" color="green-9" class="q-mr-xs" />
                <span class="text-caption text-weight-bold text-dark">{{ customRangeDisplayLabel }}</span>
                <q-icon name="arrow_drop_down" size="18px" color="grey-7" class="q-ml-xs" />

                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date
                    v-model="datePickerModel"
                    range
                    mask="YYYY-MM-DD"
                    color="green-9"
                    minimal
                  >
                    <div class="row items-center justify-between q-gutter-x-sm">
                      <span class="text-caption text-grey-7">{{ customRangeDisplayLabel }}</span>
                      <q-btn
                        v-close-popup
                        label="Apply"
                        color="green-9"
                        flat
                        dense
                        no-caps
                        class="text-weight-bold"
                      />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </div>

              <q-btn
                unelevated
                no-caps
                color="green-9"
                icon="print"
                label="Print"
                class="text-weight-bold q-px-md"
                @click="triggerPrint"
              />
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Official Dual-Panel Document (Supports Single or Multi-Sheet Cross-Month Cutoffs) -->
    <div id="csc-form-48-print-area" ref="printAreaRef" class="csc-sheets-list">
      <div
        v-for="(sheet, sheetIdx) in cscSheets"
        :key="sheet.key"
        class="csc-sheet-wrapper"
        :class="{
          'q-mb-lg': sheetIdx < cscSheets.length - 1,
          'has-page-break': sheetIdx < cscSheets.length - 1,
        }"
      >
        <!-- Multi-Sheet Screen Indicator Banner (Hidden on Print) -->
        <div
          v-if="cscSheets.length > 1"
          class="no-print row items-center justify-between q-px-sm q-py-xs q-mb-sm bg-green-1 text-green-9 rounded-borders text-caption text-weight-bold"
        >
          <span>
            <q-icon name="description" size="15px" class="q-mr-xs" />
            Sheet {{ sheetIdx + 1 }} of {{ cscSheets.length }}: {{ sheet.periodDisplayLabel }}, {{ sheet.year }}
          </span>
          <span>No. of Day(s): ~{{ sheet.presentDaysCount }}</span>
        </div>

        <div class="dtr-dual-page-sheet">
          <!-- ========================================================= -->
          <!-- TOP HEADERS: ROW-BY-ROW HORIZONTAL LOCK                   -->
          <!-- ========================================================= -->
          <div class="csc-top-tag">Form 48</div>

          <!-- Band 1: Main Titles -->
          <div class="csc-header-band">
            <div class="csc-panel-col text-center">
              <div class="csc-main-title">DAILY TIME RECORD</div>
            </div>
            <div class="csc-panel-gutter"></div>
            <div class="csc-panel-col text-center">
              <div class="csc-main-title">ACCOMPLISHMENT REPORT</div>
            </div>
          </div>

          <!-- Band 2: Employee Name (Left) & Program/Charges (Right) Underlines -->
          <div class="csc-header-band csc-identity-band">
            <div class="csc-panel-col text-center">
              <div class="csc-name-underline">{{ employeeDisplayName }}</div>
              <div class="csc-sub-label">NAME</div>
            </div>
            <div class="csc-panel-gutter"></div>
            <div class="csc-panel-col text-center">
              <div class="csc-charges-underline">{{ chargesDisplay }}</div>
              <div class="csc-sub-label">CHARGES</div>
            </div>
          </div>

          <!-- Band 3: Month / Office Hours (Left) & PRN (Right) -->
          <div class="csc-header-band csc-meta-band">
            <div class="csc-panel-col">
              <div class="csc-meta-line">
                <span>For the month of </span>
                <span class="csc-period-underline">{{ sheet.periodDisplayLabel }}, {{ sheet.year }}</span>
              </div>
              <div class="csc-hours-statement">
                <div>Office Hours for Arrival (Regular Days) and</div>
                <div class="csc-hours-subline">
                  <span>Departure <span class="csc-inline-rule"></span></span>
                  <span>Saturday <span class="csc-inline-rule"></span></span>
                </div>
              </div>
            </div>
            <div class="csc-panel-gutter"></div>
            <div class="csc-panel-col csc-prn-col">
              <div
                class="csc-prn-line cursor-pointer"
                @click="openPrnDialog"
              >
                <span>PRN:</span>
                <span class="csc-prn-underline">{{ prnNumber || '' }}</span>
                <q-icon name="edit" size="11px" class="q-ml-xs text-grey-5 no-print" />
                <q-tooltip class="bg-dark text-white no-print">Click to edit PRN Number</q-tooltip>
              </div>
            </div>
          </div>

          <!-- ========================================================= -->
          <!-- MASTER UNIFIED 31-DAY TABLE                               -->
          <!-- ========================================================= -->
          <table class="csc-master-table">
            <colgroup>
              <col class="col-date" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-gutter" />
              <col class="col-workload" />
              <col class="col-quantity" />
            </colgroup>
            <thead>
              <!-- Borderless AM / PM Row above Left Table -->
              <tr class="tr-am-pm">
                <th class="th-borderless"></th>
                <th colspan="2" class="th-am-pm">AM</th>
                <th colspan="2" class="th-am-pm">PM</th>
                <th class="th-gutter"></th>
                <th colspan="2" class="th-borderless"></th>
              </tr>
              <!-- Single-Row Boxed Column Headers -->
              <tr class="tr-col-headers">
                <th class="th-boxed">DATE</th>
                <th class="th-boxed">ARRIVAL</th>
                <th class="th-boxed">DEPARTURE</th>
                <th class="th-boxed">ARRIVAL</th>
                <th class="th-boxed">DEPARTURE</th>
                <th class="th-gutter"></th>
                <th
                  class="th-boxed clickable-workload-header"
                  @click="openBulkWorkloadDialog"
                >
                  <span>WORKLOAD UNDERTAKEN</span>
                  <q-icon name="edit" size="11px" class="q-ml-xs no-print text-grey-4" />
                  <q-tooltip class="bg-dark text-white no-print">Click to edit workload for all work days</q-tooltip>
                </th>
                <th class="th-boxed">QUANTITY</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in sheet.rows"
                :key="row.dayNumber"
                :class="{
                  'tr-weekend': row.isWeekend && row.isInCutoff,
                  'tr-outside': !row.isInCutoff,
                  'tr-absent': row.isAbsent,
                }"
              >
                <!-- ================= LEFT SIDE CELLS ================= -->
                <!-- Date Column (Bold on active weekend days, regular on weekdays) -->
                <td
                  class="td-date"
                  :class="{ 'td-date-weekend': (row.isSaturday || row.isSunday) && row.isInCutoff }"
                >
                  <span v-if="row.isNonExistentDay">31</span>
                  <span v-else>{{ row.dayNumber }}</span>
                </td>

                <!-- Non-existent Day 31 on 30-day months: X X X X -->
                <template v-if="row.isNonExistentDay">
                  <td class="td-x">X</td>
                  <td class="td-x">X</td>
                  <td class="td-x">X</td>
                  <td class="td-x">X</td>
                </template>

                <!-- Outside Active Cutoff: Render dashes -->
                <template v-else-if="!row.isInCutoff">
                  <td class="td-dash">-</td>
                  <td class="td-dash">-</td>
                  <td class="td-dash">-</td>
                  <td class="td-dash">-</td>
                </template>

                <!-- Saturday: Merged across 4 punch columns -->
                <template v-else-if="row.isSaturday">
                  <td
                    colspan="4"
                    class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    SATURDAY
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Saturday (Day {{ row.dayNumber }})</q-tooltip>
                  </td>
                </template>

                <!-- Sunday: Merged across 4 punch columns -->
                <template v-else-if="row.isSunday">
                  <td
                    colspan="4"
                    class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    SUNDAY
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Sunday (Day {{ row.dayNumber }})</q-tooltip>
                  </td>
                </template>

                <!-- Absent: Merged across 4 punch columns -->
                <template v-else-if="row.isAbsent">
                  <td
                    colspan="4"
                    class="td-merged-status td-absent td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    ABSENT
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                </template>

                <!-- Holiday: Merged across 4 punch columns -->
                <template v-else-if="row.isHoliday">
                  <td
                    colspan="4"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    {{ row.holidayName || 'HOLIDAY' }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Holiday (Day {{ row.dayNumber }})</q-tooltip>
                  </td>
                </template>

                <!-- On Leave: Merged across 4 punch columns -->
                <template v-else-if="row.isOnLeave">
                  <td
                    colspan="4"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    {{ row.leaveLabel || 'ON LEAVE' }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                </template>

                <!-- Regular Working Day with Punches -->
                <template v-else>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    {{ row.amArrival }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    {{ row.amDeparture }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    {{ row.pmArrival }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row)"
                  >
                    {{ row.pmDeparture }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                </template>

                <!-- ================= MIDDLE GUTTER ================= -->
                <td class="td-gutter"></td>

                <!-- ================= RIGHT SIDE CELLS ================= -->
                <!-- WORKLOAD UNDERTAKEN & QUANTITY always keep their separate columns -->
                <td
                  class="td-workload"
                  :class="{
                    'td-workload-clickable cursor-pointer': row.hasWork,
                  }"
                  @click="row.hasWork ? openDayWorkloadDialog(row) : null"
                >
                  <template v-if="row.isNonExistentDay || !row.isInCutoff"></template>
                  <span v-else-if="row.isSaturday" class="td-spaced-day">SATURDAY</span>
                  <span v-else-if="row.isSunday" class="td-spaced-day">SUNDAY</span>
                  <span v-else-if="row.isAbsent" class="td-absent">ABSENT</span>
                  <span v-else-if="row.isHoliday">{{ row.holidayName || 'HOLIDAY' }}</span>
                  <span v-else-if="row.isOnLeave">{{ row.leaveLabel || 'ON LEAVE' }}</span>
                  <span v-else-if="row.hasWork" class="workload-text-span">
                    {{ getRowWorkload(row) }}
                    <q-tooltip class="bg-dark text-white no-print">Click to edit workload for this day or all days</q-tooltip>
                  </span>
                </td>
                <td
                  class="td-quantity"
                  :class="{
                    'td-quantity-clickable cursor-pointer': row.hasWork,
                  }"
                  @click="row.hasWork ? openDayWorkloadDialog(row) : null"
                >
                  <span v-if="row.hasWork">{{ getRowQuantity(row) }}</span>
                  <q-tooltip v-if="row.hasWork" class="bg-dark text-white no-print">Click to edit quantity</q-tooltip>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- ========================================================= -->
          <!-- FOOTERS: ROW-BY-ROW HORIZONTAL LOCK                       -->
          <!-- ========================================================= -->
          <!-- Band 1: Barcode & Certification (Left Only) -->
          <div class="csc-footer-band">
            <div class="csc-panel-col">
              <div class="csc-barcode-wrap" v-html="barcodeSvg"></div>
              <div class="csc-cert-statement">
                I certify on my honor that the above is true and correct report of works performed,
                record of which was made daily at the time of arrival and departure from the office.
              </div>
            </div>
            <div class="csc-panel-gutter"></div>
            <div class="csc-panel-col"></div>
          </div>

          <!-- Band 2: First Signature Line (Verified as to... | Prepared by) -->
          <div class="csc-footer-band csc-verify-band">
            <div class="csc-panel-col text-center">
              <div class="csc-sig-line"></div>
              <div class="csc-sig-caption">Verified as to the prescribed office hours</div>
            </div>
            <div class="csc-panel-gutter"></div>
            <div class="csc-panel-col text-center">
              <div class="csc-sig-line"></div>
              <div class="csc-sig-caption">Prepared by</div>
            </div>
          </div>

          <!-- Band 3: Signatory Name, Title & IN-CHARGE Line (Clickable to change) -->
          <div class="csc-footer-band csc-incharge-band">
            <div
              class="csc-panel-col text-center csc-incharge-col cursor-pointer"
              @click="openInChargeDialog"
            >
              <div class="csc-sig-name-wrap">
                <div class="csc-sig-name">{{ inChargeName }}</div>
                <q-icon name="edit" size="13px" class="csc-edit-hint no-print q-ml-xs" />
              </div>
              <div class="csc-sig-title">{{ inChargeTitle }}</div>
              <div class="csc-sig-line csc-incharge-line"></div>
              <div class="csc-sig-sub">IN-CHARGE</div>
              <q-tooltip class="bg-dark text-white no-print">Click to change In-Charge signatory</q-tooltip>
            </div>
            <div class="csc-panel-gutter"></div>
            <div
              class="csc-panel-col text-center csc-incharge-col cursor-pointer"
              @click="openInChargeDialog"
            >
              <div class="csc-sig-name-wrap">
                <div class="csc-sig-name">{{ inChargeName }}</div>
                <q-icon name="edit" size="13px" class="csc-edit-hint no-print q-ml-xs" />
              </div>
              <div class="csc-sig-title">{{ inChargeTitle }}</div>
              <div class="csc-sig-line csc-incharge-line"></div>
              <div class="csc-sig-sub">IN-CHARGE</div>
              <q-tooltip class="bg-dark text-white no-print">Click to change In-Charge signatory</q-tooltip>
            </div>
          </div>

          <!-- Band 4: Summary Counters (Left Only) -->
          <div class="csc-footer-band csc-summary-band">
            <div class="csc-panel-col csc-summary-row">
              <span>No. of Day(s): ~{{ sheet.presentDaysCount }}</span>
              <span>No. of Min. Late(s): {{ sheet.totalLateMinutes }}</span>
            </div>
            <div class="csc-panel-gutter"></div>
            <div class="csc-panel-col"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- In-Charge Signatory Modal Dialog -->
    <q-dialog v-model="showInChargeDialog">
      <q-card style="width: 520px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center justify-between bg-green-9 text-white q-py-sm">
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="badge" size="20px" />
            <span class="text-subtitle1 text-weight-bold">Change In-Charge Signatory</span>
          </div>
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-md">
          <div class="text-caption text-grey-8">
            Select a Department Head from the list or manually type a custom signatory (e.g. Officer-in-Charge / OIC).
          </div>

          <!-- Quick Select Department Head -->
          <q-select
            v-if="departmentHeadsList.length > 0"
            v-model="selectedHeadModel"
            :options="departmentHeadsList"
            option-label="label"
            outlined
            dense
            label="Quick Select Department Head"
            clearable
            @update:model-value="onSelectDepartmentHead"
          >
            <template #prepend>
              <q-icon name="account_circle" size="18px" color="green-9" />
            </template>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption class="text-grey-7">{{ scope.opt.title }} • {{ scope.opt.department }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Signatory Name -->
          <q-input
            v-model="tempInChargeName"
            outlined
            dense
            label="In-Charge Full Name *"
            hint="Format: FIRSTNAME M.I. SURNAME"
            class="text-uppercase"
          />

          <!-- Designation / Title -->
          <q-input
            v-model="tempInChargeTitle"
            outlined
            dense
            label="Office / Designation / Title *"
            hint="e.g. CICTMO HEAD, OIC - CITY ENGINEER, etc."
            class="text-uppercase"
          />
        </q-card-section>

        <q-card-actions align="between" class="q-px-md q-pb-md">
          <q-btn
            flat
            no-caps
            color="grey-8"
            icon="restart_alt"
            label="Reset to Default"
            @click="resetToDefaultInCharge"
          />
          <div class="row q-gutter-x-sm">
            <q-btn flat no-caps label="Cancel" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="green-9"
              label="Apply Signatory"
              class="text-weight-bold q-px-md"
              @click="applyInCharge"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Workload Undertaken Modal Dialog -->
    <q-dialog v-model="showWorkloadDialog">
      <q-card style="width: 520px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center justify-between bg-green-9 text-white q-py-sm">
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="edit_note" size="20px" />
            <span class="text-subtitle1 text-weight-bold">
              {{ activeWorkloadRow ? `Edit Workload (${formatDialogDate(activeWorkloadRow)})` : 'Edit Workload for All Work Days' }}
            </span>
          </div>
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-md q-gutter-y-md">
          <div class="text-caption text-grey-8">
            {{ activeWorkloadRow
              ? 'Update the accomplishment description and optional quantity for this specific workday, or apply it across all workdays.'
              : 'Update the default accomplishment workload undertaken for all working days in this period.' }}
          </div>

          <!-- Workload Text -->
          <q-input
            v-model="workloadForm.text"
            outlined
            dense
            type="textarea"
            rows="3"
            label="Workload Undertaken *"
            hint="e.g. rendering security services @ CICTMO"
            autofocus
          />

          <!-- Quantity (Optional) -->
          <q-input
            v-model="workloadForm.quantity"
            outlined
            dense
            label="Quantity (Optional)"
            hint="e.g. 1 report, 8 hrs, or leave blank"
          />

          <!-- Scope: Apply to all work days toggle (if row is active) -->
          <div v-if="activeWorkloadRow" class="q-pt-xs">
            <q-checkbox
              v-model="workloadForm.applyToAll"
              color="green-9"
              label="Apply this workload to all work days this month"
              class="text-weight-medium"
            />
          </div>
        </q-card-section>

        <q-card-actions align="between" class="q-px-md q-pb-md">
          <q-btn
            v-if="activeWorkloadRow && hasCustomDayOverride(activeWorkloadRow)"
            flat
            no-caps
            color="grey-8"
            icon="restart_alt"
            label="Revert Day to Default"
            @click="revertDayWorkload(activeWorkloadRow)"
          />
          <q-space v-else />
          <div class="row q-gutter-x-sm">
            <q-btn flat no-caps label="Cancel" v-close-popup />
            <q-btn
              unelevated
              no-caps
              color="green-9"
              label="Apply Workload"
              class="text-weight-bold q-px-md"
              @click="applyWorkload"
            />
          </div>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- PRN Number Modal Dialog -->
    <q-dialog v-model="showPrnDialog">
      <q-card style="width: 420px; max-width: 95vw;" class="rounded-borders">
        <q-card-section class="row items-center justify-between bg-green-9 text-white q-py-sm">
          <div class="row items-center q-gutter-x-sm">
            <q-icon name="pin" size="20px" />
            <span class="text-subtitle1 text-weight-bold">Edit PRN Number</span>
          </div>
          <q-btn dense flat round icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-md">
          <q-input
            v-model="tempPrnNumber"
            outlined
            dense
            label="PRN Number (Optional)"
            hint="Optional PRN code"
            autofocus
            @keyup.enter="applyPrn"
          />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="green-9"
            label="Apply"
            class="text-weight-bold q-px-md"
            @click="applyPrn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- DTR Time Override Dialog -->
    <DtrOverrideDialog
      v-model="showOverrideDialog"
      :control-no="controlNumber"
      :employee-name="employeeDisplayName"
      :date="activeOverrideDate"
      :dtr="activeOverrideDtr"
      @saved="onOverrideSaved"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { generateCscBarcodeSvg, printCscForm48 } from 'src/utils/csc-form-48-print'
import DtrOverrideDialog from 'src/components/admin/DtrOverrideDialog.vue'

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
]

const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  },
  employee: {
    type: Object,
    default: () => ({}),
  },
  period: {
    type: Object,
    default: () => ({}),
  },
  summary: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  customDateRange: {
    type: [Object, String],
    default: null,
  },
  departmentHeads: {
    type: Array,
    default: () => [],
  },
  hideToolbar: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:customDateRange', 'adjust', 'adjust-saved'])

// Time Override Dialog State
const showOverrideDialog = ref(false)
const activeOverrideDate = ref('')
const activeOverrideDtr = ref(null)

function openTimeOverride(row) {
  if (!row || row.isNonExistentDay || !row.isInCutoff) return
  activeOverrideDate.value = row.dateString
  activeOverrideDtr.value = row.record || null
  showOverrideDialog.value = true
}

function onOverrideSaved(updatedDtr) {
  emit('adjust-saved', updatedDtr)
  emit('adjust', updatedDtr)
}

// Interactive UI State
const localCustomRange = ref(null)
const printAreaRef = ref(null)

// Workload Management State
const defaultWorkload = ref('rendering security services @ CICTMO')
const customWorkloads = ref({})
const customQuantities = ref({})

function getRowWorkload(row) {
  if (!row) return defaultWorkload.value
  const dateKey = row.dateString || String(row.dayNumber)
  if (customWorkloads.value[dateKey] !== undefined) {
    return customWorkloads.value[dateKey]
  }
  return defaultWorkload.value
}

function getRowQuantity(row) {
  if (!row) return ''
  const dateKey = row.dateString || String(row.dayNumber)
  return customQuantities.value[dateKey] || ''
}

function hasCustomDayOverride(row) {
  if (!row) return false
  const dateKey = row.dateString || String(row.dayNumber)
  return customWorkloads.value[dateKey] !== undefined || Boolean(customQuantities.value[dateKey])
}

// Workload Dialog State & Handlers
const showWorkloadDialog = ref(false)
const activeWorkloadRow = ref(null)
const workloadForm = ref({
  text: '',
  quantity: '',
  applyToAll: false,
})

function formatDialogDate(row) {
  if (!row?.dateString) return `Day ${row?.dayNumber || ''}`
  try {
    const d = new Date(row.dateString + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
  } catch {
    return row.dateString
  }
}

function openDayWorkloadDialog(row) {
  activeWorkloadRow.value = row
  workloadForm.value = {
    text: getRowWorkload(row),
    quantity: getRowQuantity(row),
    applyToAll: false,
  }
  showWorkloadDialog.value = true
}

function openBulkWorkloadDialog() {
  activeWorkloadRow.value = null
  workloadForm.value = {
    text: defaultWorkload.value,
    quantity: '',
    applyToAll: true,
  }
  showWorkloadDialog.value = true
}

function applyWorkload() {
  const text = workloadForm.value.text.trim()
  const qty = workloadForm.value.quantity.trim()

  if (workloadForm.value.applyToAll || !activeWorkloadRow.value) {
    defaultWorkload.value = text
    customWorkloads.value = {}
  } else {
    const dateKey = activeWorkloadRow.value.dateString || String(activeWorkloadRow.value.dayNumber)
    customWorkloads.value = {
      ...customWorkloads.value,
      [dateKey]: text,
    }
    customQuantities.value = {
      ...customQuantities.value,
      [dateKey]: qty,
    }
  }

  showWorkloadDialog.value = false
}

function revertDayWorkload(row) {
  if (!row) return
  const dateKey = row.dateString || String(row.dayNumber)
  const nextWorkloads = { ...customWorkloads.value }
  const nextQuantities = { ...customQuantities.value }
  delete nextWorkloads[dateKey]
  delete nextQuantities[dateKey]
  customWorkloads.value = nextWorkloads
  customQuantities.value = nextQuantities
  showWorkloadDialog.value = false
}
const chargesDisplay = computed(() => {
  return String(props.employee?.charges || '').trim()
})
const prnNumber = ref('')
const showPrnDialog = ref(false)
const tempPrnNumber = ref('')

function openPrnDialog() {
  tempPrnNumber.value = prnNumber.value
  showPrnDialog.value = true
}

function applyPrn() {
  prnNumber.value = tempPrnNumber.value.trim()
  showPrnDialog.value = false
}

// In-Charge Signatory State (Defaults from Department Head in database)
const inChargeName = ref('JOSEPH NELSON N. BRIONES')
const inChargeTitle = ref('CICTMO HEAD')

function syncDefaultInCharge() {
  const defaultHead = props.employee?.in_charge
  if (defaultHead?.name) {
    inChargeName.value = defaultHead.name
    inChargeTitle.value = defaultHead.title || 'DEPARTMENT HEAD'
  }
}

watch(
  () => props.employee?.in_charge,
  () => {
    syncDefaultInCharge()
  },
  { immediate: true }
)

// In-Charge Dialog State & Handlers
const showInChargeDialog = ref(false)
const selectedHeadModel = ref(null)
const tempInChargeName = ref('')
const tempInChargeTitle = ref('')

const departmentHeadsList = computed(() => {
  const heads = Array.isArray(props.departmentHeads) ? props.departmentHeads : []
  return heads.map((h) => ({
    ...h,
    label: `${h.name} (${h.title})`,
  }))
})

function openInChargeDialog() {
  tempInChargeName.value = inChargeName.value
  tempInChargeTitle.value = inChargeTitle.value
  selectedHeadModel.value = null
  showInChargeDialog.value = true
}

function onSelectDepartmentHead(head) {
  if (!head) return
  tempInChargeName.value = head.name
  tempInChargeTitle.value = head.title
}

function resetToDefaultInCharge() {
  const defaultHead = props.employee?.in_charge
  tempInChargeName.value = defaultHead?.name || 'JOSEPH NELSON N. BRIONES'
  tempInChargeTitle.value = defaultHead?.title || 'CICTMO HEAD'
  selectedHeadModel.value = null
}

function applyInCharge() {
  if (tempInChargeName.value.trim()) {
    inChargeName.value = tempInChargeName.value.trim()
  }
  if (tempInChargeTitle.value.trim()) {
    inChargeTitle.value = tempInChargeTitle.value.trim()
  }
  showInChargeDialog.value = false
}

const daysInMonth = computed(() => {
  return Number(props.period?.days_in_month) || 30
})

const displayYear = computed(() => {
  return Number(props.period?.year) || new Date().getFullYear()
})

const displayMonth = computed(() => {
  return Number(props.period?.month) || new Date().getMonth() + 1
})

function buildDefaultRange() {
  const y = displayYear.value
  const m = String(displayMonth.value).padStart(2, '0')
  const lastDay = String(daysInMonth.value).padStart(2, '0')
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${lastDay}`,
  }
}

const rawCustomRange = computed(() => {
  return props.customDateRange !== null ? props.customDateRange : localCustomRange.value
})

const datePickerModel = computed({
  get() {
    return rawCustomRange.value || buildDefaultRange()
  },
  set(val) {
    if (!val) return
    const normalized = typeof val === 'string' ? { from: val, to: val } : val
    localCustomRange.value = normalized
    emit('update:customDateRange', normalized)
  },
})

const normalizedCustomRange = computed(() => {
  const val = rawCustomRange.value || buildDefaultRange()
  if (typeof val === 'string') {
    return { from: val, to: val }
  }
  const from = val?.from || buildDefaultRange().from
  const to = val?.to || from
  return from <= to ? { from, to } : { from: to, to: from }
})

watch(
  () => [props.period?.year, props.period?.month],
  ([newY, newM], [oldY, oldM]) => {
    if (newY && newM && (newY !== oldY || newM !== oldM) && props.customDateRange === null) {
      localCustomRange.value = buildDefaultRange()
    }
  }
)

const customRangeDisplayLabel = computed(() => {
  const { from, to } = normalizedCustomRange.value
  try {
    const d1 = new Date(`${from}T00:00:00`)
    const d2 = new Date(`${to}T00:00:00`)
    const sameYear = d1.getFullYear() === d2.getFullYear()
    const f1 = d1.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
    const f2 = d2.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return from === to ? f2 : `${f1} – ${f2}`
  } catch {
    return `${from} – ${to}`
  }
})

const employeeDisplayName = computed(() => {
  if (props.employee?.name && String(props.employee.name).trim() !== '') {
    return String(props.employee.name).toUpperCase()
  }
  return 'BELLY JOE B. BASADRE'
})

const controlNumber = computed(() => {
  return String(props.employee?.control_no || '132354249')
})

/**
 * Format raw punch string "HH:mm:ss" or "HH:mm" into Civil Service "h:mm" format.
 */
function formatCscTime(timeStr) {
  if (!timeStr || String(timeStr).trim() === '') return ''
  const parts = String(timeStr).split(':')
  if (parts.length < 2) return timeStr

  let h = parseInt(parts[0], 10)
  const m = parts[1].padStart(2, '0')
  if (isNaN(h)) return timeStr

  h = h % 12
  h = h ? h : 12
  return `${h}:${m}`
}

/**
 * Build a single 1..31 CSC Form 48 sheet for a given (year, month, startDay, endDay)
 */
function buildSheetForMonth(year, month, startDay, endDay, recordsMap) {
  const maxDays = new Date(year, month, 0).getDate()
  const monthName = MONTH_NAMES[month - 1] || 'MONTH'
  const clampedStart = Math.max(1, Math.min(maxDays, startDay))
  const clampedEnd = Math.max(clampedStart, Math.min(maxDays, endDay))
  const periodDisplayLabel = `${monthName} ${clampedStart} - ${clampedEnd}`

  const rows = []
  for (let d = 1; d <= 31; d++) {
    if (d > maxDays) {
      rows.push({
        dayNumber: d,
        isNonExistentDay: true,
        isInCutoff: false,
        isWeekend: false,
        isSaturday: false,
        isSunday: false,
        isAbsent: false,
        isHoliday: false,
        isOnLeave: false,
        hasWork: false,
        amArrival: '',
        amDeparture: '',
        pmArrival: '',
        pmDeparture: '',
        record: null,
      })
      continue
    }

    const padDay = String(d).padStart(2, '0')
    const padMonth = String(month).padStart(2, '0')
    const dateStr = `${year}-${padMonth}-${padDay}`
    const dateObj = new Date(year, month - 1, d)

    const dayOfWeek = dateObj.getDay()
    const isSaturday = dayOfWeek === 6
    const isSunday = dayOfWeek === 0
    const isWeekend = isSaturday || isSunday

    const isInCutoff = d >= clampedStart && d <= clampedEnd
    const record = recordsMap.get(dateStr) || null

    const hasAnyPunch = Boolean(
      record?.am_arrival || record?.am_departure || record?.pm_arrival || record?.pm_departure
    )

    let isAbsent = false
    let isHoliday = false
    let isOnLeave = false
    let holidayName = ''
    let leaveLabel = ''

    if (isInCutoff && !isWeekend) {
      if (
        record?.status === 'ABSENT' ||
        (!hasAnyPunch &&
          record?.status !== 'ON_LEAVE' &&
          record?.status !== 'HOLIDAY' &&
          !record?.is_adjusted)
      ) {
        isAbsent = true
      } else if (record?.status === 'ON_LEAVE') {
        isOnLeave = true
        leaveLabel = record.remarks || 'ON LEAVE'
      } else if (record?.status === 'HOLIDAY') {
        isHoliday = true
        holidayName = record.remarks || 'HOLIDAY'
      }
    }

    const hasWork = isInCutoff && !isWeekend && !isAbsent && !isOnLeave && !isHoliday

    rows.push({
      dayNumber: d,
      dateString: dateStr,
      isNonExistentDay: false,
      isInCutoff,
      isWeekend,
      isSaturday,
      isSunday,
      isAbsent,
      isHoliday,
      holidayName,
      isOnLeave,
      leaveLabel,
      hasWork,
      amArrival: formatCscTime(record?.am_arrival) || (hasWork && !hasAnyPunch ? '-' : ''),
      amDeparture: formatCscTime(record?.am_departure) || (hasWork && !hasAnyPunch ? '-' : ''),
      pmArrival: formatCscTime(record?.pm_arrival) || (hasWork && !hasAnyPunch ? '-' : ''),
      pmDeparture: formatCscTime(record?.pm_departure) || (hasWork && !hasAnyPunch ? '-' : ''),
      record,
    })
  }

  const presentDaysCount = rows.filter(
    (r) => r.isInCutoff && !r.isWeekend && !r.isAbsent && !r.isNonExistentDay && r.hasWork
  ).length

  const totalLateMinutes = rows
    .filter((r) => r.isInCutoff)
    .reduce((sum, r) => sum + Number(r.record?.late_minutes || 0), 0)

  return {
    key: `${year}-${month}-${clampedStart}-${clampedEnd}`,
    year,
    month,
    monthName,
    periodDisplayLabel,
    rows,
    presentDaysCount,
    totalLateMinutes,
  }
}

/**
 * Generate 1 or more CSC Form 48 sheets from the selected Date Range
 */
const cscSheets = computed(() => {
  const recordsMap = new Map()
  if (Array.isArray(props.records)) {
    props.records.forEach((rec) => {
      if (rec.record_date) {
        recordsMap.set(rec.record_date, rec)
      }
    })
  }

  const year = displayYear.value
  const month = displayMonth.value
  const maxDays = daysInMonth.value

  const { from, to } = normalizedCustomRange.value
  const [fromY, fromM, fromD] = from.split('-').map(Number)
  const [toY, toM, toD] = to.split('-').map(Number)

  if (!fromY || !fromM || !toY || !toM) {
    return [buildSheetForMonth(year, month, 1, maxDays, recordsMap)]
  }

  const sheets = []
  let curY = fromY
  let curM = fromM
  let safety = 0

  while ((curY < toY || (curY === toY && curM <= toM)) && safety < 12) {
    const mMax = new Date(curY, curM, 0).getDate()
    const sDay = curY === fromY && curM === fromM ? fromD : 1
    const eDay = curY === toY && curM === toM ? toD : mMax
    sheets.push(buildSheetForMonth(curY, curM, sDay, eDay, recordsMap))

    curM++
    if (curM > 12) {
      curM = 1
      curY++
    }
    safety++
  }

  return sheets.length > 0 ? sheets : [buildSheetForMonth(year, month, 1, maxDays, recordsMap)]
})

const barcodeSvg = computed(() => {
  return generateCscBarcodeSvg(controlNumber.value)
})

function triggerPrint() {
  printCscForm48({
    element: printAreaRef.value,
    employeeName: employeeDisplayName.value,
    periodLabel: customRangeDisplayLabel.value,
  })
}

defineExpose({
  triggerPrint,
  printAreaRef,
})
</script>

<style scoped>
.dtr-container {
  width: 100%;
}

.custom-range-trigger {
  height: 28px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  transition: all 0.15s ease;
  user-select: none;
}

.custom-range-trigger:hover {
  background: #f1f5f9;
  border-color: #2e7d32;
}

.border-top {
  border-top: 1px dashed #e5e7eb;
}

/* ========================================================= */
/* DUAL PANEL PRINT SHEET CONTAINER                         */
/* ========================================================= */
.csc-sheet-wrapper {
  background: #ffffff;
  padding: 20px 24px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  max-width: 920px;
  margin: 0 auto;
}

.dtr-dual-page-sheet {
  width: 100%;
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  color: #000000;
  background: #ffffff;
}

/* ========================================================= */
/* SHARED TWO-COLUMN BAND GRID (48% LEFT / 4% GAP / 48% RIGHT)*/
/* ========================================================= */
.csc-header-band,
.csc-footer-band {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-end;
}

.csc-panel-col {
  width: 48%;
  flex: 0 0 48%;
}

.csc-panel-gutter {
  width: 4%;
  flex: 0 0 4%;
}

/* ========================================================= */
/* TOP HEADERS                                               */
/* ========================================================= */
.csc-top-tag {
  font-size: 8.5pt;
  color: #000000;
  line-height: 1.1;
  margin-bottom: 4px;
}

.csc-main-title {
  font-size: 10pt;
  font-weight: 700;
  letter-spacing: 0.4px;
  line-height: 1.2;
}

.csc-identity-band {
  margin-top: 12px;
}

.csc-name-underline {
  width: 94%;
  margin: 0 auto;
  border-bottom: 1px solid #000000;
  padding-bottom: 2px;
  font-size: 10.5pt;
  font-weight: 700;
  line-height: 1.2;
  min-height: 18px;
}

.csc-charges-underline {
  width: 94%;
  margin: 0 auto;
  border-bottom: 1px solid #000000;
  padding-bottom: 2px;
  font-size: 8pt;
  font-weight: 400;
  text-transform: uppercase;
  line-height: 1.2;
  min-height: 18px;
}

.csc-sub-label {
  font-size: 7.5pt;
  letter-spacing: 0.5px;
  color: #000000;
  margin-top: 2px;
}

.csc-meta-band {
  margin-top: 6px;
  margin-bottom: 2px;
  align-items: flex-start;
}

.csc-meta-line {
  font-size: 8pt;
  line-height: 1.3;
}

.csc-period-underline {
  display: inline-block;
  border-bottom: 1px solid #000000;
  font-weight: 700;
  line-height: 1.05;
  padding: 0 12px 1px;
  margin-left: 2px;
}

.csc-hours-statement {
  font-size: 8pt;
  line-height: 1.35;
  margin-top: 1px;
}

.csc-hours-subline {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.csc-inline-rule {
  display: inline-block;
  width: 72px;
  border-bottom: 1px solid #000000;
  margin-left: 3px;
  transform: translateY(1px);
}

.csc-prn-col {
  padding-top: 14px;
}

.csc-prn-line {
  font-size: 8pt;
  line-height: 1.35;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.csc-prn-line:hover {
  background-color: #f1f8e9;
  box-shadow: 0 0 0 1.5px #4caf50;
  color: #1b5e20;
}

.csc-prn-line:hover .csc-prn-underline {
  border-bottom-color: #2e7d32;
}

.csc-prn-underline {
  display: inline-block;
  width: 240px;
  border-bottom: 1px solid #000000;
  margin-left: 4px;
  line-height: 1.05;
  transform: translateY(1px);
}

/* ========================================================= */
/* UNIFIED MASTER TABLE (48% LEFT / 4% GAP / 48% RIGHT)      */
/* ========================================================= */
.csc-master-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 8pt;
  table-layout: fixed;
}

.col-date {
  width: 4.8%;
}

.col-punch {
  width: 10.8%;
}

.col-gutter {
  width: 4%;
}

.col-workload {
  width: 38.4%;
}

.col-quantity {
  width: 9.6%;
}

.csc-master-table th,
.csc-master-table td {
  padding: 0 2px;
  height: 18px;
  text-align: center;
  vertical-align: middle;
  box-sizing: border-box;
}

/* Row 1 of thead: Borderless AM / PM labels above Left Table */
.tr-am-pm th {
  height: 15px;
  border: none !important;
  background: transparent !important;
  font-size: 7.5pt;
  font-weight: 700;
  padding-bottom: 1px;
}

/* Row 2 of thead: Single-row boxed column headers */
.tr-col-headers .th-boxed {
  height: 20px;
  background: #ffffff;
  color: #000000;
  font-weight: 700;
  font-size: 7pt;
  letter-spacing: -0.1px;
  border: 1px solid #000000;
}

.csc-master-table tbody td {
  border: 1px solid #000000;
}

/* Middle Gutter Column (Borderless & Seamless Separation) */
.th-gutter,
.td-gutter {
  border: none !important;
  background: #ffffff !important;
  padding: 0 !important;
}

/* Table Cells */
.td-date {
  font-weight: 400;
  font-size: 8pt;
}

.td-date-weekend {
  font-weight: 700;
}

.td-time {
  font-size: 8pt;
  font-weight: 400;
  font-family: Arial, sans-serif;
}

.td-dash {
  color: #333333;
  font-size: 8pt;
  font-weight: 400;
}

.td-x {
  color: #555555;
  font-size: 7.5pt;
  font-weight: 400;
}

.td-merged-status {
  font-weight: 400;
  font-size: 8pt;
  text-transform: uppercase;
}

.td-spaced-day {
  letter-spacing: 3px;
  font-weight: 400;
  font-size: 8pt;
}

.td-absent {
  letter-spacing: 0.5px;
  font-weight: 400;
  font-size: 8pt;
}

.td-workload {
  text-align: center;
  font-size: 7.5pt;
  font-weight: 400;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clickable-workload-header {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease;
}

.clickable-workload-header:hover {
  background-color: #f1f8e9;
  color: #1b5e20;
}

.td-workload-clickable,
.td-quantity-clickable {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.td-workload-clickable:hover,
.td-quantity-clickable:hover {
  background-color: #f1f8e9;
  box-shadow: inset 0 0 0 1.5px #4caf50;
}

.workload-text-span {
  display: inline-block;
  white-space: nowrap;
}

.td-quantity {
  font-size: 8pt;
}

/* ========================================================= */
/* FOOTERS & SIGNATORIES (ROW-LOCKED BANDS)                  */
/* ========================================================= */
.csc-barcode-wrap {
  width: 88%;
  margin: 2px auto 2px;
  text-align: center;
}

.csc-cert-statement {
  font-size: 7pt;
  line-height: 1.2;
  text-align: left;
  text-indent: 18px;
}

.csc-verify-band {
  margin-top: 18px;
  align-items: flex-start;
}

.csc-sig-line {
  border-bottom: 1px solid #000000;
  width: 92%;
  margin: 0 auto 2px;
}

.csc-sig-caption {
  font-size: 7.5pt;
  line-height: 1.2;
}

.csc-incharge-band {
  margin-top: 18px;
  align-items: flex-end;
}

.csc-sig-name {
  font-size: 8.5pt;
  font-weight: 700;
  line-height: 1.2;
}

.csc-sig-title {
  font-size: 8pt;
  font-weight: 400;
  line-height: 1.2;
  margin-bottom: 2px;
}

.csc-incharge-line {
  margin-top: 2px;
}

.csc-incharge-col {
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.csc-incharge-col:hover {
  background-color: #f1f8e9;
  box-shadow: 0 0 0 1.5px #4caf50;
}

.csc-sig-name-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.csc-edit-hint {
  opacity: 0;
  color: #2e7d32;
  transition: opacity 0.2s ease;
}

.csc-incharge-col:hover .csc-edit-hint {
  opacity: 1;
}

.csc-sig-sub {
  font-size: 7.5pt;
  line-height: 1.2;
}

.csc-summary-band {
  margin-top: 2px;
}

.csc-summary-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 7.5pt;
  gap: 64px;
}

.td-time-clickable {
  position: relative;
  user-select: none;
  transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
}

.td-time-clickable:hover {
  background-color: #f1f8e9 !important;
  color: #1b5e20 !important;
  outline: 1.5px solid #4caf50;
  outline-offset: -1.5px;
  cursor: pointer;
}
</style>
