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
                <div class="text-subtitle2 text-weight-bold text-dark row items-center">
                  <span>{{ isContractual ? 'CSC Form 48 & Accomplishment Report' : 'CSC Form 48 (Daily Time Record)' }}</span>
                  <q-badge
                    v-if="employeeEmploymentStatus"
                    :color="isContractual ? 'orange-9' : 'teal-8'"
                    class="q-ml-sm text-bold"
                  >
                    {{ employeeEmploymentStatus }}
                  </q-badge>
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
        v-for="(pair, pairIdx) in pairedSheets"
        :key="pair.key"
        class="csc-sheet-wrapper"
        :class="{
          'single-centered-sheet': pair.mode === 'single-centered',
          'q-mb-lg': pairIdx < pairedSheets.length - 1,
          'has-page-break': pairIdx < pairedSheets.length - 1,
        }"
      >
        <!-- Multi-Sheet Screen Indicator Banner (Hidden on Print) -->
        <div
          v-if="pairedSheets.length > 1"
          class="no-print row items-center justify-between q-px-sm q-py-xs q-mb-sm bg-green-1 text-green-9 rounded-borders text-caption text-weight-bold"
        >
          <span>
            <q-icon name="description" size="15px" class="q-mr-xs" />
            Sheet {{ pairIdx + 1 }} of {{ pairedSheets.length }}:
            <template v-if="pair.mode === 'bimonthly-side-by-side' && pair.rightSheet">
              {{ pair.leftSheet.periodDisplayLabel }} &amp; {{ pair.rightSheet.periodDisplayLabel }} (Side-by-Side)
            </template>
            <template v-else>
              {{ pair.leftSheet.periodDisplayLabel }}, {{ pair.leftSheet.year }}
            </template>
          </span>
          <span>
            <template v-if="pair.mode === 'bimonthly-side-by-side' && pair.rightSheet">
              Days: ~{{ pair.leftSheet.presentDaysCount }} + ~{{ pair.rightSheet.presentDaysCount }}
            </template>
            <template v-else>
              No. of Day(s): ~{{ pair.leftSheet.presentDaysCount }}
            </template>
          </span>
        </div>

        <div class="dtr-dual-page-sheet" :class="{ 'single-left-layout': pair.mode === 'single-centered' }">
          <!-- ========================================================= -->
          <!-- TOP HEADERS: ROW-BY-ROW HORIZONTAL LOCK                   -->
          <!-- ========================================================= -->
          <div v-if="pair.mode === 'bimonthly-side-by-side'" class="csc-header-band">
            <div class="csc-panel-col"><div class="csc-top-tag">Form 48</div></div>
            <div class="csc-panel-gutter"></div>
            <div class="csc-panel-col"><div class="csc-top-tag">Form 48</div></div>
          </div>
          <div v-else class="csc-header-band">
            <div class="csc-panel-col"><div class="csc-top-tag">Form 48</div></div>
          </div>

          <!-- Band 1: Main Titles -->
          <div class="csc-header-band">
            <div class="csc-panel-col text-center">
              <div class="csc-main-title">DAILY TIME RECORD</div>
            </div>
            <template v-if="pair.mode !== 'single-centered'">
              <div class="csc-panel-gutter"></div>
              <div class="csc-panel-col text-center">
                <div class="csc-main-title">
                  {{ pair.mode === 'bimonthly-side-by-side' ? 'DAILY TIME RECORD' : 'ACCOMPLISHMENT REPORT' }}
                </div>
              </div>
            </template>
          </div>

          <!-- Band 2: Employee Name (Left) & Program/Charges or Employee Name (Right) Underlines -->
          <div class="csc-header-band csc-identity-band">
            <div class="csc-panel-col text-center">
              <div class="csc-name-underline">{{ employeeDisplayName }}</div>
              <div class="csc-sub-label">NAME</div>
            </div>
            <template v-if="pair.mode !== 'single-centered'">
              <div class="csc-panel-gutter"></div>
              <div class="csc-panel-col text-center">
                <template v-if="pair.mode === 'bimonthly-side-by-side'">
                  <div class="csc-name-underline">{{ employeeDisplayName }}</div>
                  <div class="csc-sub-label">NAME</div>
                </template>
                <template v-else>
                  <div class="csc-charges-underline">{{ chargesDisplay }}</div>
                  <div class="csc-sub-label">CHARGES</div>
                </template>
              </div>
            </template>
          </div>

          <!-- Band 3: Month / Office Hours (Left) & PRN / Month 2 (Right) -->
          <div class="csc-header-band csc-meta-band">
            <div class="csc-panel-col">
              <div class="csc-meta-line">
                <span>For the month of </span>
                <span class="csc-period-underline">{{ pair.leftSheet.periodDisplayLabel }}, {{ pair.leftSheet.year }}</span>
              </div>
              <div class="csc-hours-statement">
                <div>Office Hours for Arrival (Regular Days) and</div>
                <div class="csc-hours-subline">
                  <span>Departure <span class="csc-inline-rule"></span></span>
                  <span>Saturday <span class="csc-inline-rule"></span></span>
                </div>
              </div>
            </div>
            <template v-if="pair.mode !== 'single-centered'">
              <div class="csc-panel-gutter"></div>
              <div class="csc-panel-col" :class="{ 'csc-prn-col': pair.mode === 'contractual' }">
                <template v-if="pair.mode === 'bimonthly-side-by-side' && pair.rightSheet">
                  <div class="csc-meta-line">
                    <span>For the month of </span>
                    <span class="csc-period-underline">{{ pair.rightSheet.periodDisplayLabel }}, {{ pair.rightSheet.year }}</span>
                  </div>
                  <div class="csc-hours-statement">
                    <div>Office Hours for Arrival (Regular Days) and</div>
                    <div class="csc-hours-subline">
                      <span>Departure <span class="csc-inline-rule"></span></span>
                      <span>Saturday <span class="csc-inline-rule"></span></span>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="csc-prn-line cursor-pointer"
                    @click="openPrnDialog"
                  >
                    <span>PRN:</span>
                    <span class="csc-prn-underline">{{ prnNumber || '' }}</span>
                    <q-icon name="edit" size="11px" class="q-ml-xs text-grey-5 no-print" />
                    <q-tooltip class="bg-dark text-white no-print">Click to edit PRN Number</q-tooltip>
                  </div>
                </template>
              </div>
            </template>
          </div>

          <!-- ========================================================= -->
          <!-- MASTER UNIFIED 31-DAY TABLE                               -->
          <!-- ========================================================= -->
          <table class="csc-master-table">
            <colgroup v-if="pair.mode === 'single-centered'">
              <col class="col-single-date" style="width: 10%;" />
              <col class="col-single-punch" style="width: 22.5%;" />
              <col class="col-single-punch" style="width: 22.5%;" />
              <col class="col-single-punch" style="width: 22.5%;" />
              <col class="col-single-punch" style="width: 22.5%;" />
            </colgroup>
            <colgroup v-else-if="pair.mode === 'bimonthly-side-by-side'">
              <col class="col-date" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-gutter" />
              <col class="col-date" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-punch" />
              <col class="col-punch" />
            </colgroup>
            <colgroup v-else>
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
              <!-- Borderless AM / PM Row -->
              <tr class="tr-am-pm">
                <th class="th-borderless"></th>
                <th colspan="2" class="th-am-pm">AM</th>
                <th colspan="2" class="th-am-pm">PM</th>
                <template v-if="pair.mode !== 'single-centered'">
                  <th class="th-gutter"></th>
                  <template v-if="pair.mode === 'bimonthly-side-by-side'">
                    <th class="th-borderless"></th>
                    <th colspan="2" class="th-am-pm">AM</th>
                    <th colspan="2" class="th-am-pm">PM</th>
                  </template>
                  <template v-else>
                    <th colspan="2" class="th-borderless"></th>
                  </template>
                </template>
              </tr>
              <!-- Single-Row Boxed Column Headers -->
              <tr class="tr-col-headers">
                <th class="th-boxed">DATE</th>
                <th class="th-boxed">ARRIVAL</th>
                <th class="th-boxed">DEPARTURE</th>
                <th class="th-boxed">ARRIVAL</th>
                <th class="th-boxed">DEPARTURE</th>
                <template v-if="pair.mode !== 'single-centered'">
                  <th class="th-gutter"></th>
                  <template v-if="pair.mode === 'bimonthly-side-by-side'">
                    <th class="th-boxed">DATE</th>
                    <th class="th-boxed">ARRIVAL</th>
                    <th class="th-boxed">DEPARTURE</th>
                    <th class="th-boxed">ARRIVAL</th>
                    <th class="th-boxed">DEPARTURE</th>
                  </template>
                  <template v-else>
                    <th
                      class="th-boxed clickable-workload-header"
                      @click="openBulkWorkloadDialog"
                    >
                      <span>WORKLOAD UNDERTAKEN</span>
                      <q-icon name="edit" size="11px" class="q-ml-xs no-print text-grey-4" />
                      <q-tooltip class="bg-dark text-white no-print">Click to edit workload for all work days</q-tooltip>
                    </th>
                    <th class="th-boxed">QUANTITY</th>
                  </template>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rIdx) in pair.leftSheet.rows"
                :key="row.dayNumber"
                :class="{
                  'tr-weekend': row.isWeekend && row.isInCutoff,
                  'tr-outside': !row.isInCutoff,
                  'tr-absent': row.isAbsent,
                }"
              >
                <!-- ================= LEFT SIDE CELLS ================= -->
                <!-- Date Column -->
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

                <!-- Saturday: Merged across 4 punch columns (unless punches or custom remark) -->
                <template v-else-if="row.isSaturday && !row.hasAnyPunch && !row.isCustomRemark">
                  <td
                    colspan="4"
                    class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival')"
                  >
                    SATURDAY
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Saturday (Day {{ row.dayNumber }})</q-tooltip>
                  </td>
                </template>

                <!-- Sunday: Merged across 4 punch columns (unless punches or custom remark) -->
                <template v-else-if="row.isSunday && !row.hasAnyPunch && !row.isCustomRemark">
                  <td
                    colspan="4"
                    class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival')"
                  >
                    SUNDAY
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Sunday (Day {{ row.dayNumber }})</q-tooltip>
                  </td>
                </template>

                <!-- Custom Remark (e.g. RESTDAY): Merged across 4 punch columns -->
                <template v-else-if="row.isCustomRemark">
                  <td
                    colspan="4"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival')"
                  >
                    {{ row.customRemark }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                </template>

                <!-- Absent: Merged across 4 punch columns -->
                <template v-else-if="row.isAbsent">
                  <td
                    colspan="4"
                    class="td-merged-status td-absent td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival')"
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
                    @click="openTimeOverride(row, 'am_arrival')"
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
                    @click="openTimeOverride(row, 'am_arrival')"
                  >
                    {{ row.leaveLabel || 'ON LEAVE' }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }}</q-tooltip>
                  </td>
                </template>

                <!-- On Leave (AM): Merged across AM slots, actual punches for PM -->
                <template v-else-if="row.isOnLeaveAm">
                  <td
                    colspan="2"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival')"
                  >
                    {{ row.leaveLabel || 'ON LEAVE' }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }} (AM Leave)</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_arrival') }"
                    @click="openTimeOverride(row, 'pm_arrival')"
                  >
                    {{ row.pmArrival }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'pm_arrival', 'PM In') }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_departure') }"
                    @click="openTimeOverride(row, 'pm_departure')"
                  >
                    {{ row.pmDeparture }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'pm_departure', 'PM Out') }}</q-tooltip>
                  </td>
                </template>

                <!-- On Leave (PM): Actual punches for AM, merged across PM slots -->
                <template v-else-if="row.isOnLeavePm">
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_arrival') }"
                    @click="openTimeOverride(row, 'am_arrival')"
                  >
                    {{ row.amArrival }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'am_arrival', 'AM In') }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_departure') }"
                    @click="openTimeOverride(row, 'am_departure')"
                  >
                    {{ row.amDeparture }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'am_departure', 'AM Out') }}</q-tooltip>
                  </td>
                  <td
                    colspan="2"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'pm_arrival')"
                  >
                    {{ row.leaveLabel || 'ON LEAVE' }}
                    <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ row.dayNumber }} (PM Leave)</q-tooltip>
                  </td>
                </template>

                <!-- Regular Working Day with Punches or Slot Overrides -->
                <template v-else>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_arrival') }"
                    @click="openTimeOverride(row, 'am_arrival')"
                  >
                    {{ row.amArrival }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'am_arrival', 'AM In') }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_departure') }"
                    @click="openTimeOverride(row, 'am_departure')"
                  >
                    {{ row.amDeparture }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'am_departure', 'AM Out') }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_arrival') }"
                    @click="openTimeOverride(row, 'pm_arrival')"
                  >
                    {{ row.pmArrival }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'pm_arrival', 'PM In') }}</q-tooltip>
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{ 'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_departure') }"
                    @click="openTimeOverride(row, 'pm_departure')"
                  >
                    {{ row.pmDeparture }}
                    <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(row, 'pm_departure', 'PM Out') }}</q-tooltip>
                  </td>
                </template>

                <!-- ================= RIGHT SIDE CELLS (IF NOT SINGLE-CENTERED) ================= -->
                <template v-if="pair.mode !== 'single-centered'">
                  <td class="td-gutter"></td>

                  <!-- BIMONTHLY RIGHT SIDE: MONTH 2 PUNCHES -->
                  <template v-if="pair.mode === 'bimonthly-side-by-side' && pair.rightSheet">
                    <!-- Date Column -->
                    <td
                      class="td-date"
                      :class="{
                        'td-date-weekend': (pair.rightSheet.rows[rIdx].isSaturday || pair.rightSheet.rows[rIdx].isSunday) && pair.rightSheet.rows[rIdx].isInCutoff
                      }"
                    >
                      <span v-if="pair.rightSheet.rows[rIdx].isNonExistentDay">31</span>
                      <span v-else>{{ pair.rightSheet.rows[rIdx].dayNumber }}</span>
                    </td>

                    <!-- Non-existent Day 31 -->
                    <template v-if="pair.rightSheet.rows[rIdx].isNonExistentDay">
                      <td class="td-x">X</td>
                      <td class="td-x">X</td>
                      <td class="td-x">X</td>
                      <td class="td-x">X</td>
                    </template>

                    <!-- Outside Cutoff -->
                    <template v-else-if="!pair.rightSheet.rows[rIdx].isInCutoff">
                      <td class="td-dash">-</td>
                      <td class="td-dash">-</td>
                      <td class="td-dash">-</td>
                      <td class="td-dash">-</td>
                    </template>

                    <!-- Saturday -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isSaturday && !pair.rightSheet.rows[rIdx].hasAnyPunch && !pair.rightSheet.rows[rIdx].isCustomRemark">
                      <td
                        colspan="4"
                        class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        SATURDAY
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Saturday (Day {{ pair.rightSheet.rows[rIdx].dayNumber }})</q-tooltip>
                      </td>
                    </template>

                    <!-- Sunday -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isSunday && !pair.rightSheet.rows[rIdx].hasAnyPunch && !pair.rightSheet.rows[rIdx].isCustomRemark">
                      <td
                        colspan="4"
                        class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        SUNDAY
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Sunday (Day {{ pair.rightSheet.rows[rIdx].dayNumber }})</q-tooltip>
                      </td>
                    </template>

                    <!-- Custom Remark (e.g. RESTDAY) -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isCustomRemark">
                      <td
                        colspan="4"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].customRemark }}
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ pair.rightSheet.rows[rIdx].dayNumber }}</q-tooltip>
                      </td>
                    </template>

                    <!-- Absent -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isAbsent">
                      <td
                        colspan="4"
                        class="td-merged-status td-absent td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        ABSENT
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ pair.rightSheet.rows[rIdx].dayNumber }}</q-tooltip>
                      </td>
                    </template>

                    <!-- Holiday -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isHoliday">
                      <td
                        colspan="4"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].holidayName || 'HOLIDAY' }}
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Holiday (Day {{ pair.rightSheet.rows[rIdx].dayNumber }})</q-tooltip>
                      </td>
                    </template>

                    <!-- On Leave -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isOnLeave">
                      <td
                        colspan="4"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].leaveLabel || 'ON LEAVE' }}
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ pair.rightSheet.rows[rIdx].dayNumber }}</q-tooltip>
                      </td>
                    </template>

                    <!-- On Leave (AM) -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isOnLeaveAm">
                      <td
                        colspan="2"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].leaveLabel || 'ON LEAVE' }}
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ pair.rightSheet.rows[rIdx].dayNumber }} (AM Leave)</q-tooltip>
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'pm_arrival') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].pmArrival }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM In') }}</q-tooltip>
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'pm_departure') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_departure')"
                      >
                        {{ pair.rightSheet.rows[rIdx].pmDeparture }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_departure', 'PM Out') }}</q-tooltip>
                      </td>
                    </template>

                    <!-- On Leave (PM) -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isOnLeavePm">
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'am_arrival') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].amArrival }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM In') }}</q-tooltip>
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'am_departure') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_departure')"
                      >
                        {{ pair.rightSheet.rows[rIdx].amDeparture }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_departure', 'AM Out') }}</q-tooltip>
                      </td>
                      <td
                        colspan="2"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].leaveLabel || 'ON LEAVE' }}
                        <q-tooltip class="bg-dark text-white no-print">Click to override time for Day {{ pair.rightSheet.rows[rIdx].dayNumber }} (PM Leave)</q-tooltip>
                      </td>
                    </template>

                    <!-- Regular Working Day with Punches or Slot Overrides -->
                    <template v-else>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'am_arrival') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].amArrival }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM In') }}</q-tooltip>
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'am_departure') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_departure')"
                      >
                        {{ pair.rightSheet.rows[rIdx].amDeparture }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_departure', 'AM Out') }}</q-tooltip>
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'pm_arrival') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_arrival')"
                      >
                        {{ pair.rightSheet.rows[rIdx].pmArrival }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM In') }}</q-tooltip>
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{ 'td-overridden-slot': isRecordSlotAdjusted(pair.rightSheet.rows[rIdx].record, 'pm_departure') }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_departure')"
                      >
                        {{ pair.rightSheet.rows[rIdx].pmDeparture }}
                        <q-tooltip class="bg-dark text-white no-print">{{ getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_departure', 'PM Out') }}</q-tooltip>
                      </td>
                    </template>
                  </template>

                  <!-- CONTRACTUAL RIGHT SIDE: ACCOMPLISHMENT REPORT -->
                  <template v-else>
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
                      <span v-else-if="row.isOnLeaveAm && !row.hasAnyPunch">{{ row.leaveLabel || 'ON LEAVE' }}</span>
                      <span v-else-if="row.isOnLeavePm && !row.hasAnyPunch">{{ row.leaveLabel || 'ON LEAVE' }}</span>
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
                  </template>
                </template>
              </tr>
            </tbody>
          </table>

          <!-- ========================================================= -->
          <!-- FOOTERS: ROW-BY-ROW HORIZONTAL LOCK                       -->
          <!-- ========================================================= -->
          <!-- Band 1: Barcode & Certification -->
          <div class="csc-footer-band">
            <div class="csc-panel-col">
              <div class="csc-barcode-wrap" v-html="barcodeSvg"></div>
              <div class="csc-cert-statement">
                I certify on my honor that the above is true and correct report of works performed,
                record of which was made daily at the time of arrival and departure from the office.
              </div>
            </div>
            <template v-if="pair.mode !== 'single-centered'">
              <div class="csc-panel-gutter"></div>
              <div class="csc-panel-col">
                <template v-if="pair.mode === 'bimonthly-side-by-side'">
                  <div class="csc-barcode-wrap" v-html="barcodeSvg"></div>
                  <div class="csc-cert-statement">
                    I certify on my honor that the above is true and correct report of works performed,
                    record of which was made daily at the time of arrival and departure from the office.
                  </div>
                </template>
              </div>
            </template>
          </div>

          <!-- Band 2: First Signature Line (Verified as to... | Prepared by / Verified as to...) -->
          <div class="csc-footer-band csc-verify-band">
            <div class="csc-panel-col text-center">
              <div class="csc-sig-line"></div>
              <div class="csc-sig-caption">Verified as to the prescribed office hours</div>
            </div>
            <template v-if="pair.mode !== 'single-centered'">
              <div class="csc-panel-gutter"></div>
              <div class="csc-panel-col text-center">
                <div class="csc-sig-line"></div>
                <div class="csc-sig-caption">
                  {{ pair.mode === 'bimonthly-side-by-side' ? 'Verified as to the prescribed office hours' : 'Prepared by' }}
                </div>
              </div>
            </template>
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
            <template v-if="pair.mode !== 'single-centered'">
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
            </template>
          </div>

          <!-- Band 4: Summary Counters -->
          <div class="csc-footer-band csc-summary-band">
            <div class="csc-panel-col csc-summary-row">
              <span>No. of Day(s): ~{{ pair.leftSheet.presentDaysCount }}</span>
              <span>No. of Min. Late(s): {{ pair.leftSheet.totalLateMinutes }}</span>
            </div>
            <template v-if="pair.mode !== 'single-centered'">
              <div class="csc-panel-gutter"></div>
              <div class="csc-panel-col csc-summary-row">
                <template v-if="pair.mode === 'bimonthly-side-by-side' && pair.rightSheet">
                  <span>No. of Day(s): ~{{ pair.rightSheet.presentDaysCount }}</span>
                  <span>No. of Min. Late(s): {{ pair.rightSheet.totalLateMinutes }}</span>
                </template>
              </div>
            </template>
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
      :initial-slot="activeOverrideSlot"
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
const activeOverrideSlot = ref('am_arrival')

function openTimeOverride(row, slotKey = 'am_arrival') {
  if (!row || row.isNonExistentDay || !row.isInCutoff) return
  activeOverrideDate.value = row.dateString
  activeOverrideDtr.value = row.record || null
  activeOverrideSlot.value = slotKey || 'am_arrival'
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
 * Check if a specific punch slot has been manually overridden.
 */
function isRecordSlotAdjusted(record, slotKey) {
  if (!record || !record.is_adjusted) return false
  if (record.adjusted_slots) {
    if (Array.isArray(record.adjusted_slots)) {
      return record.adjusted_slots.includes(slotKey)
    }
    if (typeof record.adjusted_slots === 'object') {
      return Boolean(record.adjusted_slots[slotKey])
    }
  }
  return Boolean(record[slotKey])
}

/**
 * Get slot-specific acronym or remark (e.g. O.F., O.B.)
 */
function getSlotOverrideText(record, slotKey) {
  if (!record) return ''
  if (record.adjusted_slots && typeof record.adjusted_slots === 'object' && !Array.isArray(record.adjusted_slots)) {
    const val = record.adjusted_slots[slotKey]
    if (typeof val === 'string' && val.trim() !== '' && val !== 'TIME') {
      return val.trim()
    }
    return ''
  }

  const rawStatus = String(record.status || '').toUpperCase().trim()
  const rawRemark = String(record.adjustment_remarks || '').toUpperCase().trim()

  const isAdjustedSlot = Array.isArray(record.adjusted_slots) && record.adjusted_slots.includes(slotKey)

  if (isAdjustedSlot) {
    if (rawRemark === 'O.B.' || rawRemark === 'OFFICIAL BUSINESS' || rawStatus === 'OFFICIAL_BUSINESS' || rawStatus === 'O.B.') {
      return 'O.B.'
    }
    if (rawRemark === 'O.F.' || rawRemark === 'ON FIELD' || rawStatus === 'O.F.') {
      return 'O.F.'
    }
    if (rawRemark && rawRemark.length <= 6 && !rawRemark.includes(' ')) {
      return rawRemark
    }
    return ''
  }

  // If whole-record status is O.B. or O.F. without any slot-level mapping
  if (!record.adjusted_slots) {
    if (rawStatus === 'OFFICIAL_BUSINESS' || rawStatus === 'O.B.' || rawRemark === 'O.B.' || rawRemark === 'OFFICIAL BUSINESS') {
      return 'O.B.'
    }
    if (rawStatus === 'O.F.' || rawRemark === 'O.F.' || rawRemark === 'ON FIELD') {
      return 'O.F.'
    }
  }

  return ''
}

/**
 * Format a slot punch time with the CSC Form 48 double-dot indicator (. 8:00 .) if overridden,
 * or acronym (O.F., O.B.) if overridden with a status.
 */
function formatSlotPunch(timeStr, record, slotKey, hasWork, hasAnyPunch) {
  const slotText = getSlotOverrideText(record, slotKey)
  if (slotText && (!timeStr || timeStr === '-' || timeStr === '—')) {
    return slotText
  }

  const formatted = formatCscTime(timeStr)
  if (!formatted) {
    if (slotText) return slotText
    return hasWork && !hasAnyPunch ? '-' : ''
  }
  if (isRecordSlotAdjusted(record, slotKey)) {
    return `. ${formatted} .`
  }
  return formatted
}

function getSlotTooltip(row, slotKey, slotLabel) {
  const slotText = getSlotOverrideText(row?.record, slotKey)
  if (slotText) {
    return `Day ${row.dayNumber} ${slotLabel}: ${slotText} (Click to override)`
  }
  if (isRecordSlotAdjusted(row?.record, slotKey)) {
    const reason = row.record?.adjustment_remarks || row.record?.adjustment_reason || 'Manually Adjusted'
    return `Day ${row.dayNumber} ${slotLabel}: ${reason} (Click to edit)`
  }
  return `Click to override time for Day ${row.dayNumber} (${slotLabel})`
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
        hasAnyPunch: false,
        isAbsent: false,
        isHoliday: false,
        isOnLeave: false,
        isOnLeaveAm: false,
        isOnLeavePm: false,
        isCustomRemark: false,
        customRemark: '',
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
    let isOnLeaveAm = false
    let isOnLeavePm = false
    let isCustomRemark = false
    let customRemark = ''
    let holidayName = ''
    let leaveLabel = ''

    const rawStatus = String(record?.status || '').toUpperCase().trim()
    const rawRemark = String(record?.adjustment_remarks || '').toUpperCase().trim()

    const isCellLevelOverride = ['O.B.', 'O.F.', 'OFFICIAL BUSINESS', 'ON FIELD'].includes(rawStatus)
      || ['O.B.', 'O.F.', 'OFFICIAL BUSINESS', 'ON FIELD'].includes(rawRemark)
      || (record?.adjusted_slots && typeof record.adjusted_slots === 'object' && !Array.isArray(record.adjusted_slots))

    if (isInCutoff) {
      if (rawStatus === 'HOLIDAY' || record?.is_holiday) {
        isHoliday = true
        holidayName = record?.remarks || record?.adjustment_remarks || 'HOLIDAY'
      } else if (rawStatus === 'ON_LEAVE' || rawStatus === 'ON_LEAVE_AM' || rawStatus === 'ON_LEAVE_PM') {
        const leaveCode = String(record?.leave_type_code || '').trim()
        const codeDisplay = leaveCode ? `ON LEAVE (${leaveCode})` : 'ON LEAVE'
        leaveLabel = (record?.remarks && record.remarks !== 'ON LEAVE') ? record.remarks : codeDisplay

        if (rawStatus === 'ON_LEAVE') {
          isOnLeave = true
        } else if (rawStatus === 'ON_LEAVE_AM') {
          isOnLeaveAm = true
        } else if (rawStatus === 'ON_LEAVE_PM') {
          isOnLeavePm = true
        }
      } else if (!isCellLevelOverride && (rawStatus === 'RESTDAY' || (rawRemark && !hasAnyPunch && rawStatus !== 'ABSENT'))) {
        isCustomRemark = true
        customRemark = record?.adjustment_remarks || record?.status || ''
      } else if (!isWeekend) {
        if (
          rawStatus === 'ABSENT' ||
          (!hasAnyPunch &&
            !record?.is_adjusted &&
            !record?.adjustment_remarks &&
            !isCellLevelOverride)
        ) {
          isAbsent = true
        }
      }
    }

    const hasWork = isInCutoff && !isWeekend && !isAbsent && !isOnLeave && !isHoliday && !isCustomRemark

    rows.push({
      dayNumber: d,
      dateString: dateStr,
      isNonExistentDay: false,
      isInCutoff,
      isWeekend,
      isSaturday,
      isSunday,
      hasAnyPunch,
      isAbsent,
      isHoliday,
      holidayName,
      isOnLeave,
      isOnLeaveAm,
      isOnLeavePm,
      leaveLabel,
      isCustomRemark,
      customRemark,
      hasWork,
      amArrival: formatSlotPunch(record?.am_arrival, record, 'am_arrival', hasWork, hasAnyPunch),
      amDeparture: formatSlotPunch(record?.am_departure, record, 'am_departure', hasWork, hasAnyPunch),
      pmArrival: formatSlotPunch(record?.pm_arrival, record, 'pm_arrival', hasWork, hasAnyPunch),
      pmDeparture: formatSlotPunch(record?.pm_departure, record, 'pm_departure', hasWork, hasAnyPunch),
      record,
    })
  }

  const presentDaysCount = rows.filter(
    (r) => r.isInCutoff && !r.isWeekend && !r.isAbsent && !r.isNonExistentDay && (r.hasWork || r.isOnLeaveAm || r.isOnLeavePm)
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

const isContractual = computed(() => {
  if (props.employee?.is_contractual !== undefined) {
    return Boolean(props.employee.is_contractual)
  }
  const status = String(props.employee?.employment_status || props.employee?.status || '').toUpperCase().trim()
  return status === 'CONTRACTUAL'
})

const employeeEmploymentStatus = computed(() => {
  return String(props.employee?.employment_status || props.employee?.status || '').toUpperCase().trim()
})

const pairedSheets = computed(() => {
  const sheets = cscSheets.value || []
  if (sheets.length === 0) return []

  if (isContractual.value) {
    return sheets.map((sheet, idx) => ({
      key: `contractual-${sheet.key || idx}`,
      mode: 'contractual',
      leftSheet: sheet,
      rightSheet: null,
    }))
  }

  // Non-contractual:
  if (sheets.length === 1) {
    return [{
      key: `single-${sheets[0].key || 0}`,
      mode: 'single-centered',
      leftSheet: sheets[0],
      rightSheet: null,
    }]
  }

  // 2 or more months covered for non-contractual: pair them up 2-by-2 side-by-side
  const pairs = []
  for (let i = 0; i < sheets.length; i += 2) {
    const left = sheets[i]
    const right = sheets[i + 1] || null
    pairs.push({
      key: `bimonthly-${left.key || i}-${right ? (right.key || (i + 1)) : 'single'}`,
      mode: right ? 'bimonthly-side-by-side' : 'single-centered',
      leftSheet: left,
      rightSheet: right,
    })
  }
  return pairs
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

.csc-sheet-wrapper.single-centered-sheet {
  max-width: 920px;
  margin: 0 auto;
}

.single-left-layout .csc-header-band,
.single-left-layout .csc-footer-band {
  display: flex;
  width: 100%;
}

.single-left-layout .csc-panel-col {
  width: 48% !important;
  flex: 0 0 48% !important;
}

.single-left-layout .csc-master-table {
  width: 48% !important;
  margin-left: 0 !important;
  margin-right: auto !important;
}

.col-single-date {
  width: 10%;
}

.col-single-punch {
  width: 22.5%;
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

.td-overridden-slot {
  font-weight: 700;
  color: #1b5e20;
}

@media print {
  .td-overridden-slot {
    color: #000000 !important;
  }
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
