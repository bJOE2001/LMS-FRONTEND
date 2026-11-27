<template>
  <div class="dtr-container" :class="{ 'is-readonly': readonly }">
    <!-- Screen View Toolbar & Controls (Hidden on Print) -->
    <q-card v-if="!hideToolbar" flat bordered class="q-mb-md no-print bg-white rounded-borders">
      <q-card-section class="q-pa-sm">
        <div class="row items-center justify-between q-col-gutter-sm">
          <!-- Left: Title & Quick Info -->
          <div class="col-12 col-md-auto">
            <div class="row items-center q-gutter-x-sm">
              <q-icon :name="showPrint ? 'print' : 'description'" color="green-9" size="22px" />
              <div>
                <div
                  class="text-subtitle2 text-weight-bold text-dark row items-center q-gutter-x-xs"
                >
                  <span>{{
                    isContractual
                      ? 'CSC Form 48 & Accomplishment Report'
                      : 'CSC Form 48 (Daily Time Record)'
                  }}</span>
                  <q-badge
                    v-if="employeeEmploymentStatus"
                    :color="isContractual ? 'orange-9' : 'teal-8'"
                    class="text-bold"
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
                <span class="text-caption text-weight-bold text-dark">{{
                  customRangeDisplayLabel
                }}</span>
                <q-icon name="arrow_drop_down" size="18px" color="grey-7" class="q-ml-xs" />

                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="datePickerModel" range mask="YYYY-MM-DD" color="green-9" minimal>
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
                v-if="showPrint"
                unelevated
                no-caps
                color="green-9"
                icon="print"
                label="Print"
                class="text-weight-bold q-px-md"
                @click="triggerPrint"
              >
                <q-tooltip class="bg-dark text-white">Print Civil Service Form No. 48</q-tooltip>
              </q-btn>
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
        <div
          class="dtr-dual-page-sheet"
          :class="{ 'single-left-layout': pair.mode === 'single-centered' }"
        >
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
                  {{
                    pair.mode === 'bimonthly-side-by-side'
                      ? 'DAILY TIME RECORD'
                      : 'ACCOMPLISHMENT REPORT'
                  }}
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
                <span class="csc-period-underline"
                  >{{ pair.leftSheet.periodDisplayLabel }}, {{ pair.leftSheet.year }}</span
                >
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
                    <span class="csc-period-underline"
                      >{{ pair.rightSheet.periodDisplayLabel }}, {{ pair.rightSheet.year }}</span
                    >
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
                    class="csc-prn-line"
                    :class="{ 'cursor-pointer': !readonly }"
                    @click="openPrnDialog"
                  >
                    <span>PRN:</span>
                    <span class="csc-prn-underline">{{ prnNumber || '' }}</span>
                    <q-icon
                      v-if="!readonly"
                      name="edit"
                      size="11px"
                      class="q-ml-xs text-grey-5 no-print"
                    />
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to edit PRN Number</q-tooltip
                    >
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
              <col class="col-single-date" style="width: 10%" />
              <col class="col-single-punch" style="width: 22.5%" />
              <col class="col-single-punch" style="width: 22.5%" />
              <col class="col-single-punch" style="width: 22.5%" />
              <col class="col-single-punch" style="width: 22.5%" />
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
                      class="th-boxed"
                      :class="{ 'clickable-workload-header': !readonly }"
                      @click="openBulkWorkloadDialog"
                    >
                      <span>WORKLOAD UNDERTAKEN</span>
                      <q-icon
                        v-if="!readonly"
                        name="edit"
                        size="11px"
                        class="q-ml-xs no-print text-grey-4"
                      />
                      <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                        >Click to edit workload for all work days</q-tooltip
                      >
                    </th>
                    <th
                      class="th-boxed"
                      :class="{ 'clickable-workload-header': !readonly }"
                      @click="openBulkQuantityDialog"
                    >
                      <span>QUANTITY</span>
                      <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                        >Click to edit quantity for all work days</q-tooltip
                      >
                    </th>
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
                  :class="{
                    'td-date-weekend': (row.isSaturday || row.isSunday) && row.isInCutoff,
                    'td-date-missing': row.missingSlots?.length > 0,
                  }"
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
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    SATURDAY
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Saturday (Day {{ row.dayNumber }})</q-tooltip
                    >
                  </td>
                </template>

                <!-- Sunday: Merged across 4 punch columns (unless punches or custom remark) -->
                <template v-else-if="row.isSunday && !row.hasAnyPunch && !row.isCustomRemark">
                  <td
                    colspan="4"
                    class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    SUNDAY
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Sunday (Day {{ row.dayNumber }})</q-tooltip
                    >
                  </td>
                </template>

                <!-- Custom Remark (e.g. RESTDAY): Merged across 4 punch columns -->
                <template v-else-if="row.isCustomRemark">
                  <td
                    colspan="4"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    {{ row.customRemark }}
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Day {{ row.dayNumber }}</q-tooltip
                    >
                  </td>
                </template>

                <!-- Absent: Merged across 4 punch columns -->
                <template v-else-if="row.isAbsent">
                  <td
                    colspan="4"
                    class="td-merged-status td-absent td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    ABSENT
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Day {{ row.dayNumber }}</q-tooltip
                    >
                  </td>
                </template>

                <!-- Holiday: Merged across 4 punch columns -->
                <template v-else-if="row.isHoliday">
                  <td
                    colspan="4"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    {{ row.holidayName || 'HOLIDAY' }}
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Holiday (Day {{ row.dayNumber }})</q-tooltip
                    >
                  </td>
                </template>

                <!-- On Leave: Merged across 4 punch columns -->
                <template v-else-if="row.isOnLeave">
                  <td
                    colspan="4"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    {{ row.leaveLabel || 'ON LEAVE' }}
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Day {{ row.dayNumber }}</q-tooltip
                    >
                  </td>
                </template>

                <!-- On Leave (AM): Merged across AM slots, actual punches for PM -->
                <template v-else-if="row.isOnLeaveAm">
                  <td
                    colspan="2"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    {{ row.leaveLabel || 'ON LEAVE' }}
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Day {{ row.dayNumber }} (AM Leave)</q-tooltip
                    >
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{
                      'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_arrival'),
                      'td-late-slot': isRowSlotLate(row, 'pm_arrival'),
                      'td-missing-slot': isRowSlotMissing(row, 'pm_arrival'),
                    }"
                    @click="openTimeOverride(row, 'pm_arrival', $event)"
                  >
                    {{ row.pmArrival }}
                    <q-tooltip
                      v-if="getSlotTooltip(row, 'pm_arrival', 'PM In')"
                      class="bg-dark text-white no-print"
                      >{{ getSlotTooltip(row, 'pm_arrival', 'PM In') }}</q-tooltip
                    >
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{
                      'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_departure'),
                      'td-missing-slot': isRowSlotMissing(row, 'pm_departure'),
                    }"
                    @click="openTimeOverride(row, 'pm_departure', $event)"
                  >
                    {{ row.pmDeparture }}
                    <q-tooltip
                      v-if="getSlotTooltip(row, 'pm_departure', 'PM Out')"
                      class="bg-dark text-white no-print"
                      >{{ getSlotTooltip(row, 'pm_departure', 'PM Out') }}</q-tooltip
                    >
                  </td>
                </template>

                <!-- On Leave (PM): Actual punches for AM, merged across PM slots -->
                <template v-else-if="row.isOnLeavePm">
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{
                      'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_arrival'),
                      'td-late-slot': isRowSlotLate(row, 'am_arrival'),
                      'td-missing-slot': isRowSlotMissing(row, 'am_arrival'),
                    }"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    {{ row.amArrival }}
                    <q-tooltip
                      v-if="getSlotTooltip(row, 'am_arrival', 'AM In')"
                      class="bg-dark text-white no-print"
                      >{{ getSlotTooltip(row, 'am_arrival', 'AM In') }}</q-tooltip
                    >
                  </td>
                  <td
                    class="td-time td-time-clickable cursor-pointer"
                    :class="{
                      'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_departure'),
                      'td-missing-slot': isRowSlotMissing(row, 'am_departure'),
                    }"
                    @click="openTimeOverride(row, 'am_departure', $event)"
                  >
                    {{ row.amDeparture }}
                    <q-tooltip
                      v-if="getSlotTooltip(row, 'am_departure', 'AM Out')"
                      class="bg-dark text-white no-print"
                      >{{ getSlotTooltip(row, 'am_departure', 'AM Out') }}</q-tooltip
                    >
                  </td>
                  <td
                    colspan="2"
                    class="td-merged-status td-time-clickable cursor-pointer"
                    @click="openTimeOverride(row, 'pm_arrival', $event)"
                  >
                    {{ row.leaveLabel || 'ON LEAVE' }}
                    <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                      >Click to override time for Day {{ row.dayNumber }} (PM Leave)</q-tooltip
                    >
                  </td>
                </template>

                <!-- Whole-Day Merged Remark Override -->
                <template v-else-if="row.mergedWholeDayRemark">
                  <td
                    colspan="4"
                    class="td-merged-status td-overridden-slot td-time-clickable cursor-pointer"
                    :class="{
                      'td-pending-delete-slot': hasPendingDeleteForSlots(row, [
                        'am_arrival',
                        'am_departure',
                        'pm_arrival',
                        'pm_departure',
                      ]),
                    }"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    {{ row.mergedWholeDayRemark }}
                    <q-tooltip
                      v-if="getSlotTooltip(row, 'am_arrival', 'Whole Day')"
                      class="bg-dark text-white no-print"
                      >{{ getSlotTooltip(row, 'am_arrival', 'Whole Day') }}</q-tooltip
                    >
                  </td>
                </template>

                <!-- Regular Working Day with Punches or Slot Overrides -->
                <template v-else>
                  <td
                    v-if="row.mergedAmRemark"
                    colspan="2"
                    class="td-merged-status td-overridden-slot td-time-clickable cursor-pointer"
                    :class="{
                      'td-pending-delete-slot': hasPendingDeleteForSlots(row, [
                        'am_arrival',
                        'am_departure',
                      ]),
                    }"
                    @click="openTimeOverride(row, 'am_arrival', $event)"
                  >
                    {{ row.mergedAmRemark }}
                    <q-tooltip
                      v-if="getSlotTooltip(row, 'am_arrival', 'AM')"
                      class="bg-dark text-white no-print"
                      >{{ getSlotTooltip(row, 'am_arrival', 'AM') }}</q-tooltip
                    >
                  </td>
                  <template v-else>
                    <td
                      class="td-time td-time-clickable cursor-pointer"
                      :class="{
                        'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_arrival'),
                        'td-late-slot': isRowSlotLate(row, 'am_arrival'),
                        'td-missing-slot': isRowSlotMissing(row, 'am_arrival'),
                        'td-pending-delete-slot': hasPendingDeleteForSlot(row, 'am_arrival'),
                      }"
                      @click="openTimeOverride(row, 'am_arrival', $event)"
                    >
                      {{ row.amArrival }}
                      <q-tooltip
                        v-if="getSlotTooltip(row, 'am_arrival', 'AM In')"
                        class="bg-dark text-white no-print"
                        >{{ getSlotTooltip(row, 'am_arrival', 'AM In') }}</q-tooltip
                      >
                    </td>
                    <td
                      class="td-time td-time-clickable cursor-pointer"
                      :class="{
                        'td-overridden-slot': isRecordSlotAdjusted(row.record, 'am_departure'),
                        'td-missing-slot': isRowSlotMissing(row, 'am_departure'),
                        'td-pending-delete-slot': hasPendingDeleteForSlot(row, 'am_departure'),
                      }"
                      @click="openTimeOverride(row, 'am_departure', $event)"
                    >
                      {{ row.amDeparture }}
                      <q-tooltip
                        v-if="getSlotTooltip(row, 'am_departure', 'AM Out')"
                        class="bg-dark text-white no-print"
                        >{{ getSlotTooltip(row, 'am_departure', 'AM Out') }}</q-tooltip
                      >
                    </td>
                  </template>
                  <td
                    v-if="row.mergedPmRemark"
                    colspan="2"
                    class="td-merged-status td-overridden-slot td-time-clickable cursor-pointer"
                    :class="{
                      'td-pending-delete-slot': hasPendingDeleteForSlots(row, [
                        'pm_arrival',
                        'pm_departure',
                      ]),
                    }"
                    @click="openTimeOverride(row, 'pm_arrival', $event)"
                  >
                    {{ row.mergedPmRemark }}
                    <q-tooltip
                      v-if="getSlotTooltip(row, 'pm_arrival', 'PM')"
                      class="bg-dark text-white no-print"
                      >{{ getSlotTooltip(row, 'pm_arrival', 'PM') }}</q-tooltip
                    >
                  </td>
                  <template v-else>
                    <td
                      class="td-time td-time-clickable cursor-pointer"
                      :class="{
                        'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_arrival'),
                        'td-late-slot': isRowSlotLate(row, 'pm_arrival'),
                        'td-missing-slot': isRowSlotMissing(row, 'pm_arrival'),
                        'td-pending-delete-slot': hasPendingDeleteForSlot(row, 'pm_arrival'),
                      }"
                      @click="openTimeOverride(row, 'pm_arrival', $event)"
                    >
                      {{ row.pmArrival }}
                      <q-tooltip
                        v-if="getSlotTooltip(row, 'pm_arrival', 'PM In')"
                        class="bg-dark text-white no-print"
                        >{{ getSlotTooltip(row, 'pm_arrival', 'PM In') }}</q-tooltip
                      >
                    </td>
                    <td
                      class="td-time td-time-clickable cursor-pointer"
                      :class="{
                        'td-overridden-slot': isRecordSlotAdjusted(row.record, 'pm_departure'),
                        'td-missing-slot': isRowSlotMissing(row, 'pm_departure'),
                        'td-pending-delete-slot': hasPendingDeleteForSlot(row, 'pm_departure'),
                      }"
                      @click="openTimeOverride(row, 'pm_departure', $event)"
                    >
                      {{ row.pmDeparture }}
                      <q-tooltip
                        v-if="getSlotTooltip(row, 'pm_departure', 'PM Out')"
                        class="bg-dark text-white no-print"
                        >{{ getSlotTooltip(row, 'pm_departure', 'PM Out') }}</q-tooltip
                      >
                    </td>
                  </template>
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
                        'td-date-weekend':
                          (pair.rightSheet.rows[rIdx].isSaturday ||
                            pair.rightSheet.rows[rIdx].isSunday) &&
                          pair.rightSheet.rows[rIdx].isInCutoff,
                        'td-date-missing': pair.rightSheet.rows[rIdx].missingSlots?.length > 0,
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
                    <template
                      v-else-if="
                        pair.rightSheet.rows[rIdx].isSaturday &&
                        !pair.rightSheet.rows[rIdx].hasAnyPunch &&
                        !pair.rightSheet.rows[rIdx].isCustomRemark
                      "
                    >
                      <td
                        colspan="4"
                        class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        SATURDAY
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Saturday (Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }})</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- Sunday -->
                    <template
                      v-else-if="
                        pair.rightSheet.rows[rIdx].isSunday &&
                        !pair.rightSheet.rows[rIdx].hasAnyPunch &&
                        !pair.rightSheet.rows[rIdx].isCustomRemark
                      "
                    >
                      <td
                        colspan="4"
                        class="td-merged-status td-spaced-day td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        SUNDAY
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Sunday (Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }})</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- Custom Remark (e.g. RESTDAY) -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isCustomRemark">
                      <td
                        colspan="4"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].customRemark }}
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }}</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- Absent -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isAbsent">
                      <td
                        colspan="4"
                        class="td-merged-status td-absent td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        ABSENT
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }}</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- Holiday -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isHoliday">
                      <td
                        colspan="4"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].holidayName || 'HOLIDAY' }}
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Holiday (Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }})</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- On Leave -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isOnLeave">
                      <td
                        colspan="4"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].leaveLabel || 'ON LEAVE' }}
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }}</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- On Leave (AM) -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isOnLeaveAm">
                      <td
                        colspan="2"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].leaveLabel || 'ON LEAVE' }}
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }} (AM Leave)</q-tooltip
                        >
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{
                          'td-overridden-slot': isRecordSlotAdjusted(
                            pair.rightSheet.rows[rIdx].record,
                            'pm_arrival',
                          ),
                          'td-late-slot': isRowSlotLate(pair.rightSheet.rows[rIdx], 'pm_arrival'),
                          'td-missing-slot': isRowSlotMissing(
                            pair.rightSheet.rows[rIdx],
                            'pm_arrival',
                          ),
                        }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].pmArrival }}
                        <q-tooltip
                          v-if="getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM In')"
                          class="bg-dark text-white no-print"
                          >{{
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM In')
                          }}</q-tooltip
                        >
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{
                          'td-overridden-slot': isRecordSlotAdjusted(
                            pair.rightSheet.rows[rIdx].record,
                            'pm_departure',
                          ),
                          'td-missing-slot': isRowSlotMissing(
                            pair.rightSheet.rows[rIdx],
                            'pm_departure',
                          ),
                        }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_departure', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].pmDeparture }}
                        <q-tooltip
                          v-if="
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_departure', 'PM Out')
                          "
                          class="bg-dark text-white no-print"
                          >{{
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_departure', 'PM Out')
                          }}</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- On Leave (PM) -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].isOnLeavePm">
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{
                          'td-overridden-slot': isRecordSlotAdjusted(
                            pair.rightSheet.rows[rIdx].record,
                            'am_arrival',
                          ),
                          'td-late-slot': isRowSlotLate(pair.rightSheet.rows[rIdx], 'am_arrival'),
                          'td-missing-slot': isRowSlotMissing(
                            pair.rightSheet.rows[rIdx],
                            'am_arrival',
                          ),
                        }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].amArrival }}
                        <q-tooltip
                          v-if="getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM In')"
                          class="bg-dark text-white no-print"
                          >{{
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM In')
                          }}</q-tooltip
                        >
                      </td>
                      <td
                        class="td-time td-time-clickable cursor-pointer"
                        :class="{
                          'td-overridden-slot': isRecordSlotAdjusted(
                            pair.rightSheet.rows[rIdx].record,
                            'am_departure',
                          ),
                          'td-missing-slot': isRowSlotMissing(
                            pair.rightSheet.rows[rIdx],
                            'am_departure',
                          ),
                        }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_departure', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].amDeparture }}
                        <q-tooltip
                          v-if="
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_departure', 'AM Out')
                          "
                          class="bg-dark text-white no-print"
                          >{{
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_departure', 'AM Out')
                          }}</q-tooltip
                        >
                      </td>
                      <td
                        colspan="2"
                        class="td-merged-status td-time-clickable cursor-pointer"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].leaveLabel || 'ON LEAVE' }}
                        <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                          >Click to override time for Day
                          {{ pair.rightSheet.rows[rIdx].dayNumber }} (PM Leave)</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- Whole-Day Merged Remark Override -->
                    <template v-else-if="pair.rightSheet.rows[rIdx].mergedWholeDayRemark">
                      <td
                        colspan="4"
                        class="td-merged-status td-overridden-slot td-time-clickable cursor-pointer"
                        :class="{
                          'td-pending-delete-slot': hasPendingDeleteForSlots(
                            pair.rightSheet.rows[rIdx],
                            ['am_arrival', 'am_departure', 'pm_arrival', 'pm_departure'],
                          ),
                        }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].mergedWholeDayRemark }}
                        <q-tooltip
                          v-if="
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'Whole Day')
                          "
                          class="bg-dark text-white no-print"
                          >{{
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'Whole Day')
                          }}</q-tooltip
                        >
                      </td>
                    </template>

                    <!-- Regular Working Day with Punches or Slot Overrides -->
                    <template v-else>
                      <td
                        v-if="pair.rightSheet.rows[rIdx].mergedAmRemark"
                        colspan="2"
                        class="td-merged-status td-overridden-slot td-time-clickable cursor-pointer"
                        :class="{
                          'td-pending-delete-slot': hasPendingDeleteForSlots(
                            pair.rightSheet.rows[rIdx],
                            ['am_arrival', 'am_departure'],
                          ),
                        }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].mergedAmRemark }}
                        <q-tooltip
                          v-if="getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM')"
                          class="bg-dark text-white no-print"
                          >{{
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM')
                          }}</q-tooltip
                        >
                      </td>
                      <template v-else>
                        <td
                          class="td-time td-time-clickable cursor-pointer"
                          :class="{
                            'td-overridden-slot': isRecordSlotAdjusted(
                              pair.rightSheet.rows[rIdx].record,
                              'am_arrival',
                            ),
                            'td-late-slot': isRowSlotLate(pair.rightSheet.rows[rIdx], 'am_arrival'),
                            'td-missing-slot': isRowSlotMissing(
                              pair.rightSheet.rows[rIdx],
                              'am_arrival',
                            ),
                            'td-pending-delete-slot': hasPendingDeleteForSlot(
                              pair.rightSheet.rows[rIdx],
                              'am_arrival',
                            ),
                          }"
                          @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_arrival', $event)"
                        >
                          {{ pair.rightSheet.rows[rIdx].amArrival }}
                          <q-tooltip
                            v-if="getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM In')"
                            class="bg-dark text-white no-print"
                            >{{
                              getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_arrival', 'AM In')
                            }}</q-tooltip
                          >
                        </td>
                        <td
                          class="td-time td-time-clickable cursor-pointer"
                          :class="{
                            'td-overridden-slot': isRecordSlotAdjusted(
                              pair.rightSheet.rows[rIdx].record,
                              'am_departure',
                            ),
                            'td-missing-slot': isRowSlotMissing(
                              pair.rightSheet.rows[rIdx],
                              'am_departure',
                            ),
                            'td-pending-delete-slot': hasPendingDeleteForSlot(
                              pair.rightSheet.rows[rIdx],
                              'am_departure',
                            ),
                          }"
                          @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'am_departure', $event)"
                        >
                          {{ pair.rightSheet.rows[rIdx].amDeparture }}
                          <q-tooltip
                            v-if="
                              getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_departure', 'AM Out')
                            "
                            class="bg-dark text-white no-print"
                            >{{
                              getSlotTooltip(pair.rightSheet.rows[rIdx], 'am_departure', 'AM Out')
                            }}</q-tooltip
                          >
                        </td>
                      </template>
                      <td
                        v-if="pair.rightSheet.rows[rIdx].mergedPmRemark"
                        colspan="2"
                        class="td-merged-status td-overridden-slot td-time-clickable cursor-pointer"
                        :class="{
                          'td-pending-delete-slot': hasPendingDeleteForSlots(
                            pair.rightSheet.rows[rIdx],
                            ['pm_arrival', 'pm_departure'],
                          ),
                        }"
                        @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_arrival', $event)"
                      >
                        {{ pair.rightSheet.rows[rIdx].mergedPmRemark }}
                        <q-tooltip
                          v-if="getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM')"
                          class="bg-dark text-white no-print"
                          >{{
                            getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM')
                          }}</q-tooltip
                        >
                      </td>
                      <template v-else>
                        <td
                          class="td-time td-time-clickable cursor-pointer"
                          :class="{
                            'td-overridden-slot': isRecordSlotAdjusted(
                              pair.rightSheet.rows[rIdx].record,
                              'pm_arrival',
                            ),
                            'td-late-slot': isRowSlotLate(pair.rightSheet.rows[rIdx], 'pm_arrival'),
                            'td-missing-slot': isRowSlotMissing(
                              pair.rightSheet.rows[rIdx],
                              'pm_arrival',
                            ),
                            'td-pending-delete-slot': hasPendingDeleteForSlot(
                              pair.rightSheet.rows[rIdx],
                              'pm_arrival',
                            ),
                          }"
                          @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_arrival', $event)"
                        >
                          {{ pair.rightSheet.rows[rIdx].pmArrival }}
                          <q-tooltip
                            v-if="getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM In')"
                            class="bg-dark text-white no-print"
                            >{{
                              getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_arrival', 'PM In')
                            }}</q-tooltip
                          >
                        </td>
                        <td
                          class="td-time td-time-clickable cursor-pointer"
                          :class="{
                            'td-overridden-slot': isRecordSlotAdjusted(
                              pair.rightSheet.rows[rIdx].record,
                              'pm_departure',
                            ),
                            'td-missing-slot': isRowSlotMissing(
                              pair.rightSheet.rows[rIdx],
                              'pm_departure',
                            ),
                            'td-pending-delete-slot': hasPendingDeleteForSlot(
                              pair.rightSheet.rows[rIdx],
                              'pm_departure',
                            ),
                          }"
                          @click="openTimeOverride(pair.rightSheet.rows[rIdx], 'pm_departure', $event)"
                        >
                          {{ pair.rightSheet.rows[rIdx].pmDeparture }}
                          <q-tooltip
                            v-if="
                              getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_departure', 'PM Out')
                            "
                            class="bg-dark text-white no-print"
                            >{{
                              getSlotTooltip(pair.rightSheet.rows[rIdx], 'pm_departure', 'PM Out')
                            }}</q-tooltip
                          >
                        </td>
                      </template>
                    </template>
                  </template>

                  <!-- CONTRACTUAL RIGHT SIDE: ACCOMPLISHMENT REPORT -->
                  <template v-else>
                    <td
                      class="td-workload"
                      :class="{
                        'td-workload-clickable cursor-pointer': !readonly && row.hasWork,
                      }"
                      @click="!readonly && row.hasWork ? openDayWorkloadDialog(row) : null"
                    >
                      <template v-if="row.isNonExistentDay || !row.isInCutoff"></template>
                      <span v-else-if="row.isSaturday" class="td-spaced-day">SATURDAY</span>
                      <span v-else-if="row.isSunday" class="td-spaced-day">SUNDAY</span>
                      <span v-else-if="row.isAbsent" class="td-absent">ABSENT</span>
                      <span v-else-if="row.isHoliday">{{
                        (row.holidayName || 'HOLIDAY').toUpperCase()
                      }}</span>
                      <span v-else-if="row.isOnLeave">{{
                        (row.leaveLabel || 'ON LEAVE').toUpperCase()
                      }}</span>
                      <span v-else-if="row.isOnLeaveAm && !row.hasAnyPunch">{{
                        (row.leaveLabel || 'ON LEAVE').toUpperCase()
                      }}</span>
                      <span v-else-if="row.isOnLeavePm && !row.hasAnyPunch">{{
                        (row.leaveLabel || 'ON LEAVE').toUpperCase()
                      }}</span>
                      <span v-else-if="row.hasWork" class="workload-text-span">
                        {{ getRowWorkload(row) }}
                      </span>
                      <q-tooltip v-if="!readonly && row.hasWork" class="bg-dark text-white no-print"
                        >Click to edit workload for this day or all days</q-tooltip
                      >
                    </td>
                    <td
                      class="td-quantity"
                      :class="{
                        'td-quantity-clickable cursor-pointer': !readonly && row.hasWork,
                      }"
                      @click="!readonly && row.hasWork ? openDayQuantityDialog(row) : null"
                    >
                      <span v-if="row.hasWork">{{ getRowQuantity(row) }}</span>
                      <q-tooltip v-if="!readonly && row.hasWork" class="bg-dark text-white no-print"
                        >Click to edit quantity</q-tooltip
                      >
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
                    I certify on my honor that the above is true and correct report of works
                    performed, record of which was made daily at the time of arrival and departure
                    from the office.
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
                  {{
                    pair.mode === 'bimonthly-side-by-side'
                      ? 'Verified as to the prescribed office hours'
                      : 'Prepared by'
                  }}
                </div>
              </div>
            </template>
          </div>

          <!-- Band 3: Signatory Name, Title & IN-CHARGE Line (Clickable to change) -->
          <div class="csc-footer-band csc-incharge-band">
            <div
              class="csc-panel-col text-center csc-incharge-col"
              :class="{ 'cursor-pointer': !readonly }"
              @click="openInChargeDialog"
            >
              <div class="csc-sig-name-wrap">
                <div class="csc-sig-name">{{ inChargeName }}</div>
                <q-icon
                  v-if="!readonly"
                  name="edit"
                  size="13px"
                  class="csc-edit-hint no-print q-ml-xs"
                />
              </div>
              <div class="csc-sig-title">{{ inChargeTitle }}</div>
              <div class="csc-sig-line csc-incharge-line"></div>
              <div class="csc-sig-sub">IN-CHARGE</div>
              <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                >Click to change In-Charge signatory</q-tooltip
              >
            </div>
            <template v-if="pair.mode !== 'single-centered'">
              <div class="csc-panel-gutter"></div>
              <div
                class="csc-panel-col text-center csc-incharge-col"
                :class="{ 'cursor-pointer': !readonly }"
                @click="openInChargeDialog"
              >
                <div class="csc-sig-name-wrap">
                  <div class="csc-sig-name">{{ inChargeName }}</div>
                  <q-icon
                    v-if="!readonly"
                    name="edit"
                    size="13px"
                    class="csc-edit-hint no-print q-ml-xs"
                  />
                </div>
                <div class="csc-sig-title">{{ inChargeTitle }}</div>
                <div class="csc-sig-line csc-incharge-line"></div>
                <div class="csc-sig-sub">IN-CHARGE</div>
                <q-tooltip v-if="!readonly" class="bg-dark text-white no-print"
                  >Click to change In-Charge signatory</q-tooltip
                >
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
    <AppDialog
      v-model="showInChargeDialog"
      title="Change In-Charge Signatory"
      icon="badge"
      max-width="520px"
      :persistent="false"
      body-class="q-pa-md q-gutter-y-md"
      actions-class="q-px-md q-pb-md row items-center justify-between"
    >
      <!-- Signatory Name -->
      <q-input
        v-model="tempInChargeName"
        outlined
        dense
        label="In-Charge Full Name *"
        class="text-uppercase"
      />

      <!-- Designation / Title -->
      <q-input
        v-model="tempInChargeTitle"
        outlined
        dense
        label="Designation *"
        class="text-uppercase"
      />

      <template #actions="{ cancel }">
        <q-btn
          flat
          no-caps
          color="grey-8"
          icon="restart_alt"
          label="Reset to Default"
          @click="resetToDefaultInCharge"
        />
        <div class="row q-gutter-x-sm">
          <q-btn flat no-caps label="Cancel" @click="cancel" />
          <q-btn
            unelevated
            no-caps
            color="green-9"
            label="Apply Signatory"
            class="text-weight-bold q-px-md"
            @click="applyInCharge"
          />
        </div>
      </template>
    </AppDialog>

    <!-- Workload Undertaken Modal Dialog -->
    <AppDialog
      v-model="showWorkloadDialog"
      :title="
        activeWorkloadRow
          ? `Edit Workload (${formatDialogDate(activeWorkloadRow)})`
          : 'Edit Workload for All Work Days'
      "
      icon="edit_note"
      max-width="520px"
      :persistent="false"
      :loading="savingWorkload"
      body-class="q-pa-md q-gutter-y-md"
      actions-class="q-px-md q-pb-md row items-center justify-between"
    >
      <!-- Workload Text -->
      <q-input
        v-model="workloadForm.text"
        outlined
        dense
        type="textarea"
        rows="3"
        label="Workload Undertaken *"
        autofocus
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

      <template #actions="{ cancel }">
        <q-btn
          v-if="activeWorkloadRow && hasCustomDayOverride(activeWorkloadRow)"
          flat
          no-caps
          color="grey-8"
          icon="restart_alt"
          label="Revert Day to Default"
          :disable="savingWorkload"
          @click="revertDayWorkload(activeWorkloadRow)"
        />
        <q-space v-else />
        <div class="row q-gutter-x-sm">
          <q-btn flat no-caps label="Cancel" :disable="savingWorkload" @click="cancel" />
          <q-btn
            unelevated
            no-caps
            color="green-9"
            label="Apply Workload"
            class="text-weight-bold q-px-md"
            :loading="savingWorkload"
            @click="applyWorkload"
          />
        </div>
      </template>
    </AppDialog>

    <!-- Quantity Modal Dialog -->
    <AppDialog
      v-model="showQuantityDialog"
      :title="
        activeQuantityRow
          ? `Edit Quantity (${formatDialogDate(activeQuantityRow)})`
          : 'Edit Quantity for All Work Days'
      "
      icon="format_list_numbered"
      max-width="440px"
      :persistent="false"
      :loading="savingQuantity"
      body-class="q-pa-md q-gutter-y-md"
      actions-class="q-px-md q-pb-md row items-center justify-between"
    >
      <q-input
        v-model="quantityForm.quantity"
        outlined
        dense
        label="Quantity"
        autofocus
        @keyup.enter="applyQuantity"
      />

      <!-- Scope: Apply to all work days toggle (if row is active) -->
      <div v-if="activeQuantityRow" class="q-pt-xs">
        <q-checkbox
          v-model="quantityForm.applyToAll"
          color="green-9"
          label="Apply this quantity to all work days this month"
          class="text-weight-medium"
        />
      </div>

      <template #actions="{ cancel }">
        <q-btn
          v-if="activeQuantityRow && hasCustomQuantityOverride(activeQuantityRow)"
          flat
          no-caps
          color="grey-8"
          icon="restart_alt"
          label="Revert Day to Default"
          :disable="savingQuantity"
          @click="revertDayQuantity(activeQuantityRow)"
        />
        <q-space v-else />
        <div class="row q-gutter-x-sm">
          <q-btn flat no-caps label="Cancel" :disable="savingQuantity" @click="cancel" />
          <q-btn
            unelevated
            no-caps
            color="green-9"
            label="Apply Quantity"
            class="text-weight-bold q-px-md"
            :loading="savingQuantity"
            @click="applyQuantity"
          />
        </div>
      </template>
    </AppDialog>

    <!-- PRN Number Modal Dialog -->
    <AppDialog
      v-model="showPrnDialog"
      title="Edit PRN Number"
      icon="pin"
      max-width="420px"
      :persistent="false"
      body-class="q-pa-md"
      actions-class="q-px-md q-pb-md q-gutter-sm"
      submit-label="Apply"
      submit-color="green-9"
      @submit="applyPrn"
    >
      <q-input
        v-model="tempPrnNumber"
        outlined
        dense
        label="PRN Number (Optional)"
        autofocus
        @keyup.enter="applyPrn"
      />
    </AppDialog>

    <!-- Compact Cell Action Popover (Edit Override vs Request Deletion) -->
    <q-menu
      v-model="showCellMenu"
      :target="cellMenuTarget"
      no-parent-event
      anchor="bottom middle"
      self="top middle"
      :offset="[0, 4]"
      class="dtr-cell-action-menu"
    >
      <div class="dtr-cell-menu-header text-caption text-weight-bold text-grey-8">
        {{ cellMenuTitle }}
      </div>
      <q-separator />
      <q-list dense separator style="min-width: 210px">
        <q-item clickable v-close-popup @click="openOverrideDialogFromMenu">
          <q-item-section avatar style="min-width: 30px; padding-right: 6px">
            <q-icon name="edit_calendar" size="18px" color="green-9" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium text-dark">Edit Override</q-item-label>
            <q-item-label caption>Change time or remark</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="openDeleteRequestDialogFromMenu">
          <q-item-section avatar style="min-width: 30px; padding-right: 6px">
            <q-icon name="delete_outline" size="18px" color="negative" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium text-negative">Request Deletion</q-item-label>
            <q-item-label caption>Submit for HR approval</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>

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

    <!-- DTR Delete Request Dialog -->
    <DtrDeleteRequestDialog
      v-model="showDeleteRequestDialog"
      :control-no="controlNumber"
      :employee-name="employeeDisplayName"
      :date="activeOverrideDate"
      :dtr="activeOverrideDtr"
      :initial-slot="activeOverrideSlot"
      :pending-delete-requests="pendingDeleteRequests"
      @saved="onOverrideSaved"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { generateCscBarcodeSvg, printCscForm48 } from 'src/utils/csc-form-48-print'
import DtrOverrideDialog from 'src/components/admin/DtrOverrideDialog.vue'
import DtrDeleteRequestDialog from 'src/components/admin/DtrDeleteRequestDialog.vue'

const $q = useQuasar()

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
  readonly: {
    type: Boolean,
    default: false,
  },
  showPrint: {
    type: Boolean,
    default: true,
  },
  pendingDeleteRequests: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:customDateRange', 'adjust', 'adjust-saved'])

// Time Override & Delete Request Dialog State
const showOverrideDialog = ref(false)
const showDeleteRequestDialog = ref(false)
const showCellMenu = ref(false)
const cellMenuTarget = ref(false)
const cellMenuTitle = ref('')
const activeOverrideDate = ref('')
const activeOverrideDtr = ref(null)
const activeOverrideSlot = ref('am_arrival')

function hasRealPunchValue(val) {
  const s = String(val ?? '').trim()
  return s !== '' && s !== '-' && s !== '—'
}

function isRecordSlotBiometric(record, slotKey) {
  return hasRealPunchValue(record?.[slotKey]) && !isRecordSlotAdjusted(record, slotKey)
}

function hasManualEntryInSlot(record, slotKey) {
  return isRecordSlotAdjusted(record, slotKey) || Boolean(getSlotOverrideText(record, slotKey))
}

function getClickedCellSlots(row, slotKey) {
  if (row?.mergedWholeDayRemark) {
    return ['am_arrival', 'am_departure', 'pm_arrival', 'pm_departure']
  }
  if ((slotKey === 'am_arrival' || slotKey === 'am_departure') && row?.mergedAmRemark) {
    return ['am_arrival', 'am_departure']
  }
  if ((slotKey === 'pm_arrival' || slotKey === 'pm_departure') && row?.mergedPmRemark) {
    return ['pm_arrival', 'pm_departure']
  }
  return [slotKey]
}

function formatCellMenuTitle(row, slotKey, cellSlots) {
  let dateLabel = row?.dateString || ''
  try {
    dateLabel = new Date(`${row.dateString}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    // Keep dateString fallback
  }
  if (cellSlots.length === 4) return `${dateLabel} • Whole Day`
  if (cellSlots.length === 2) {
    return slotKey.startsWith('am') ? `${dateLabel} • Morning (AM)` : `${dateLabel} • Afternoon (PM)`
  }
  const slotLabels = {
    am_arrival: 'AM In',
    am_departure: 'AM Out',
    pm_arrival: 'PM In',
    pm_departure: 'PM Out',
  }
  return `${dateLabel} • ${slotLabels[slotKey] || slotKey}`
}

function openOverrideDialogFromMenu() {
  showCellMenu.value = false
  showOverrideDialog.value = true
}

function openDeleteRequestDialogFromMenu() {
  showCellMenu.value = false
  showDeleteRequestDialog.value = true
}

function openTimeOverride(row, slotKey = 'am_arrival', event = null) {
  if (props.readonly) return
  if (!row || row.isNonExistentDay || !row.isInCutoff) return

  const resolvedSlot = slotKey || 'am_arrival'
  activeOverrideDate.value = row.dateString
  activeOverrideDtr.value = row.record || null
  activeOverrideSlot.value = resolvedSlot

  const cellSlots = getClickedCellSlots(row, resolvedSlot)

  // 1. Existing pending delete request -> open dedicated Delete Request dialog (status + Cancel Request)
  if (hasPendingDeleteForSlots(row, cellSlots)) {
    showCellMenu.value = false
    showDeleteRequestDialog.value = true
    return
  }

  // 2. Protected biometric punch -> open dedicated Delete Request dialog directly
  if (cellSlots.some((s) => isRecordSlotBiometric(row.record, s))) {
    showCellMenu.value = false
    showDeleteRequestDialog.value = true
    return
  }

  // 3. Manual override / remark -> show compact 2-choice popover anchored to cell
  if (cellSlots.some((s) => hasManualEntryInSlot(row.record, s))) {
    const targetEl = event?.currentTarget || event?.target
    if (targetEl) {
      cellMenuTitle.value = formatCellMenuTitle(row, resolvedSlot, cellSlots)
      showCellMenu.value = false
      cellMenuTarget.value = targetEl
      nextTick(() => {
        showCellMenu.value = true
      })
      return
    }
    showOverrideDialog.value = true
    return
  }

  // 4. Empty cell -> open pure Override dialog directly
  showCellMenu.value = false
  showOverrideDialog.value = true
}

function onOverrideSaved(updatedDtr) {
  emit('adjust-saved', updatedDtr)
  emit('adjust', updatedDtr)
}

// Interactive UI State
const localCustomRange = ref(null)
const printAreaRef = ref(null)

// Workload & Quantity Management State
const defaultWorkload = ref('')
const customWorkloads = ref({})
const defaultQuantity = ref('')
const customQuantities = ref({})
const savingWorkload = ref(false)
const savingQuantity = ref(false)

function pickMostFrequentValue(countsMap) {
  let topValue = ''
  let topCount = 0
  countsMap.forEach((count, val) => {
    if (count > topCount) {
      topCount = count
      topValue = val
    }
  })
  return topValue
}

watch(
  [() => props.records, () => props.employee?.control_no],
  ([records]) => {
    const nextWorkloads = {}
    const nextQuantities = {}
    const workloadCounts = new Map()
    const quantityCounts = new Map()

    if (Array.isArray(records)) {
      records.forEach((rec) => {
        if (!rec?.record_date) return
        const wl = String(rec.workload_undertaken ?? '').trim()
        const qty = String(rec.workload_quantity ?? '').trim()
        if (wl) {
          nextWorkloads[rec.record_date] = wl
          workloadCounts.set(wl, (workloadCounts.get(wl) || 0) + 1)
        }
        if (qty) {
          nextQuantities[rec.record_date] = qty
          quantityCounts.set(qty, (quantityCounts.get(qty) || 0) + 1)
        }
      })
    }

    customWorkloads.value = nextWorkloads
    customQuantities.value = nextQuantities
    defaultWorkload.value = pickMostFrequentValue(workloadCounts)
    defaultQuantity.value = pickMostFrequentValue(quantityCounts)
  },
  { immediate: true, deep: true },
)

function getWorkdayDates() {
  const dates = []
  ;(cscSheets.value || []).forEach((sheet) => {
    ;(sheet.rows || []).forEach((r) => {
      if (r.hasWork && r.dateString) {
        dates.push(r.dateString)
      }
    })
  })
  return Array.from(new Set(dates))
}

function getRowWorkload(row) {
  if (!row) return ''
  const dateKey = row.dateString || String(row.dayNumber)
  return customWorkloads.value[dateKey] ?? ''
}

function getRowQuantity(row) {
  if (!row) return ''
  const dateKey = row.dateString || String(row.dayNumber)
  return customQuantities.value[dateKey] ?? ''
}

function hasCustomDayOverride(row) {
  if (!row) return false
  return getRowWorkload(row) !== defaultWorkload.value
}

function hasCustomQuantityOverride(row) {
  if (!row) return false
  return getRowQuantity(row) !== defaultQuantity.value
}

// Workload Dialog State & Handlers
const showWorkloadDialog = ref(false)
const activeWorkloadRow = ref(null)
const workloadForm = ref({
  text: '',
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
  if (props.readonly || savingWorkload.value) return
  activeWorkloadRow.value = row
  workloadForm.value = {
    text: getRowWorkload(row),
    applyToAll: false,
  }
  showWorkloadDialog.value = true
}

function openBulkWorkloadDialog() {
  if (props.readonly || savingWorkload.value) return
  activeWorkloadRow.value = null
  workloadForm.value = {
    text: defaultWorkload.value,
    applyToAll: true,
  }
  showWorkloadDialog.value = true
}

async function applyWorkload() {
  if (savingWorkload.value) return
  const text = workloadForm.value.text.trim()
  const isBulk = workloadForm.value.applyToAll || !activeWorkloadRow.value
  const dates = isBulk ? getWorkdayDates() : [activeWorkloadRow.value?.dateString].filter(Boolean)

  if (dates.length === 0 || !controlNumber.value) {
    showWorkloadDialog.value = false
    return
  }

  savingWorkload.value = true
  try {
    const res = await api.post('/attendance/dtr/accomplishment', {
      employee_control_no: controlNumber.value,
      field: 'workload',
      value: text || null,
      dates,
    })

    const nextWorkloads = { ...customWorkloads.value }
    dates.forEach((d) => {
      if (text) nextWorkloads[d] = text
      else delete nextWorkloads[d]
    })
    customWorkloads.value = nextWorkloads
    if (isBulk) {
      defaultWorkload.value = text
    }

    emit('adjust-saved', res.data)
    $q.notify({
      type: 'positive',
      message: isBulk ? 'Workload saved for all work days.' : 'Workload saved.',
      position: 'top',
      timeout: 1500,
    })
    showWorkloadDialog.value = false
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to save workload.',
      position: 'top',
    })
  } finally {
    savingWorkload.value = false
  }
}

async function revertDayWorkload(row) {
  if (!row?.dateString || savingWorkload.value || !controlNumber.value) return
  const targetVal = defaultWorkload.value.trim()

  savingWorkload.value = true
  try {
    const res = await api.post('/attendance/dtr/accomplishment', {
      employee_control_no: controlNumber.value,
      field: 'workload',
      value: targetVal || null,
      dates: [row.dateString],
    })

    const nextWorkloads = { ...customWorkloads.value }
    if (targetVal) nextWorkloads[row.dateString] = targetVal
    else delete nextWorkloads[row.dateString]
    customWorkloads.value = nextWorkloads

    emit('adjust-saved', res.data)
    $q.notify({
      type: 'positive',
      message: 'Workload reverted to default.',
      position: 'top',
      timeout: 1500,
    })
    showWorkloadDialog.value = false
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to revert workload.',
      position: 'top',
    })
  } finally {
    savingWorkload.value = false
  }
}

// Quantity Dialog State & Handlers
const showQuantityDialog = ref(false)
const activeQuantityRow = ref(null)
const quantityForm = ref({
  quantity: '',
  applyToAll: false,
})

function openDayQuantityDialog(row) {
  if (props.readonly || savingQuantity.value) return
  activeQuantityRow.value = row
  quantityForm.value = {
    quantity: getRowQuantity(row),
    applyToAll: false,
  }
  showQuantityDialog.value = true
}

function openBulkQuantityDialog() {
  if (props.readonly || savingQuantity.value) return
  activeQuantityRow.value = null
  quantityForm.value = {
    quantity: defaultQuantity.value,
    applyToAll: true,
  }
  showQuantityDialog.value = true
}

async function applyQuantity() {
  if (savingQuantity.value) return
  const qty = quantityForm.value.quantity.trim()
  const isBulk = quantityForm.value.applyToAll || !activeQuantityRow.value
  const dates = isBulk ? getWorkdayDates() : [activeQuantityRow.value?.dateString].filter(Boolean)

  if (dates.length === 0 || !controlNumber.value) {
    showQuantityDialog.value = false
    return
  }

  savingQuantity.value = true
  try {
    const res = await api.post('/attendance/dtr/accomplishment', {
      employee_control_no: controlNumber.value,
      field: 'quantity',
      value: qty || null,
      dates,
    })

    const nextQuantities = { ...customQuantities.value }
    dates.forEach((d) => {
      if (qty) nextQuantities[d] = qty
      else delete nextQuantities[d]
    })
    customQuantities.value = nextQuantities
    if (isBulk) {
      defaultQuantity.value = qty
    }

    emit('adjust-saved', res.data)
    $q.notify({
      type: 'positive',
      message: isBulk ? 'Quantity saved for all work days.' : 'Quantity saved.',
      position: 'top',
      timeout: 1500,
    })
    showQuantityDialog.value = false
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to save quantity.',
      position: 'top',
    })
  } finally {
    savingQuantity.value = false
  }
}

async function revertDayQuantity(row) {
  if (!row?.dateString || savingQuantity.value || !controlNumber.value) return
  const targetVal = defaultQuantity.value.trim()

  savingQuantity.value = true
  try {
    const res = await api.post('/attendance/dtr/accomplishment', {
      employee_control_no: controlNumber.value,
      field: 'quantity',
      value: targetVal || null,
      dates: [row.dateString],
    })

    const nextQuantities = { ...customQuantities.value }
    if (targetVal) nextQuantities[row.dateString] = targetVal
    else delete nextQuantities[row.dateString]
    customQuantities.value = nextQuantities

    emit('adjust-saved', res.data)
    $q.notify({
      type: 'positive',
      message: 'Quantity reverted to default.',
      position: 'top',
      timeout: 1500,
    })
    showQuantityDialog.value = false
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.message || 'Failed to revert quantity.',
      position: 'top',
    })
  } finally {
    savingQuantity.value = false
  }
}
const chargesDisplay = computed(() => {
  return String(props.employee?.charges || '').trim()
})
const prnNumber = ref('')
const showPrnDialog = ref(false)
const tempPrnNumber = ref('')

function openPrnDialog() {
  if (props.readonly) return
  tempPrnNumber.value = prnNumber.value
  showPrnDialog.value = true
}

function applyPrn() {
  prnNumber.value = tempPrnNumber.value.trim()
  showPrnDialog.value = false
}

// In-Charge Signatory State (Defaults from Department Head in database)
const inChargeName = ref('JOSEPH NELSON N. BRIONES')
const inChargeTitle = ref('DEPARTMENT HEAD')

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
  { immediate: true },
)

// In-Charge Dialog State & Handlers
const showInChargeDialog = ref(false)
const tempInChargeName = ref('')
const tempInChargeTitle = ref('')

function openInChargeDialog() {
  if (props.readonly) return
  tempInChargeName.value = inChargeName.value
  tempInChargeTitle.value = inChargeTitle.value
  showInChargeDialog.value = true
}

function resetToDefaultInCharge() {
  const defaultHead = props.employee?.in_charge
  tempInChargeName.value = defaultHead?.name || 'JOSEPH NELSON N. BRIONES'
  tempInChargeTitle.value = defaultHead?.title || 'DEPARTMENT HEAD'
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
  },
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
  if (
    record.adjusted_slots &&
    typeof record.adjusted_slots === 'object' &&
    !Array.isArray(record.adjusted_slots)
  ) {
    const val = record.adjusted_slots[slotKey]
    if (typeof val === 'string' && val.trim() !== '' && val !== 'TIME') {
      return val.trim()
    }
    return ''
  }

  const rawStatus = String(record.status || '')
    .toUpperCase()
    .trim()
  const rawRemark = String(record.adjustment_remarks || '')
    .toUpperCase()
    .trim()

  const isAdjustedSlot =
    Array.isArray(record.adjusted_slots) && record.adjusted_slots.includes(slotKey)

  if (isAdjustedSlot) {
    if (
      rawRemark === 'O.B.' ||
      rawRemark === 'OFFICIAL BUSINESS' ||
      rawStatus === 'OFFICIAL_BUSINESS' ||
      rawStatus === 'O.B.'
    ) {
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
    if (
      rawStatus === 'OFFICIAL_BUSINESS' ||
      rawStatus === 'O.B.' ||
      rawRemark === 'O.B.' ||
      rawRemark === 'OFFICIAL BUSINESS'
    ) {
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

function isSlotValueMissing(val) {
  const s = String(val ?? '').trim()
  return s === '' || s === '-' || s === '—'
}

function computeRowMissingSlots(row) {
  if (!row || row.isNonExistentDay || !row.isInCutoff) return []
  if (row.isSaturday && !row.hasAnyPunch && !row.isCustomRemark) return []
  if (row.isSunday && !row.hasAnyPunch && !row.isCustomRemark) return []
  if (
    row.isCustomRemark ||
    row.isAbsent ||
    row.isHoliday ||
    row.isOnLeave ||
    row.mergedWholeDayRemark
  ) {
    return []
  }

  const missing = []
  if (row.isOnLeaveAm) {
    if (isSlotValueMissing(row.pmArrival)) missing.push({ key: 'pm_arrival', label: 'PM In' })
    if (isSlotValueMissing(row.pmDeparture)) missing.push({ key: 'pm_departure', label: 'PM Out' })
    return missing
  }
  if (row.isOnLeavePm) {
    if (isSlotValueMissing(row.amArrival)) missing.push({ key: 'am_arrival', label: 'AM In' })
    if (isSlotValueMissing(row.amDeparture)) missing.push({ key: 'am_departure', label: 'AM Out' })
    return missing
  }

  if (isSlotValueMissing(row.amArrival)) missing.push({ key: 'am_arrival', label: 'AM In' })
  if (isSlotValueMissing(row.amDeparture)) missing.push({ key: 'am_departure', label: 'AM Out' })
  if (isSlotValueMissing(row.pmArrival)) missing.push({ key: 'pm_arrival', label: 'PM In' })
  if (isSlotValueMissing(row.pmDeparture)) missing.push({ key: 'pm_departure', label: 'PM Out' })
  return missing
}

function isRowSlotMissing(row, slotKey) {
  if (!row?.missingSlots?.length) return false
  return row.missingSlots.some((s) => s.key === slotKey)
}

const WAIVED_LATE_REASONS = new Set([
  'OFFICIAL_BUSINESS',
  'PASS_SLIP',
  'TRAVEL_ORDER',
  'CERTIFICATE_OF_APPEARANCE',
  'O.B.',
  'O.F.',
])

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const trimmed = timeStr.trim()
  if (!trimmed || trimmed === '-' || trimmed === '—') return null
  const parts = trimmed.split(':')
  if (parts.length < 2) return null
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function getSlotLateMinutes(row, slotKey) {
  if (slotKey !== 'am_arrival' && slotKey !== 'pm_arrival') return 0
  if (!row || !row.isInCutoff || row.isNonExistentDay) return 0
  if (row.isWeekend || row.isAbsent || row.isHoliday || row.isOnLeave || row.isCustomRemark)
    return 0

  const record = row.record
  if (!record) return 0
  if (
    record.late_minutes !== undefined &&
    record.late_minutes !== null &&
    Number(record.late_minutes) <= 0
  ) {
    return 0
  }

  if (record.is_adjusted) {
    const adjReason = String(record.adjustment_reason || '')
      .toUpperCase()
      .trim()
    if (WAIVED_LATE_REASONS.has(adjReason)) return 0
  }

  const actualMinutes = parseTimeToMinutes(record[slotKey])
  if (actualMinutes === null) return 0

  if (slotKey === 'am_arrival') {
    if (row.isOnLeaveAm) return 0
    const scheduleStart = parseTimeToMinutes(props.employee?.schedule?.work_start_time) ?? 480
    return actualMinutes > scheduleStart ? actualMinutes - scheduleStart : 0
  }

  if (slotKey === 'pm_arrival') {
    if (row.isOnLeavePm) return 0
    const scheduleBreakEnd = parseTimeToMinutes(props.employee?.schedule?.break_end_time) ?? 780
    return actualMinutes > scheduleBreakEnd ? actualMinutes - scheduleBreakEnd : 0
  }

  return 0
}

function isRowSlotLate(row, slotKey) {
  return getSlotLateMinutes(row, slotKey) > 0
}

function hasPendingDeleteForSlots(row, slotKeys) {
  if (!row?.dateString || !Array.isArray(props.pendingDeleteRequests) || props.pendingDeleteRequests.length === 0) {
    return false
  }
  const keySet = new Set(slotKeys)
  return props.pendingDeleteRequests.some((req) => {
    if (String(req.record_date || '').slice(0, 10) !== row.dateString) return false
    if (String(req.status || 'pending').toLowerCase() !== 'pending') return false
    const reqSlots = Array.isArray(req.slots) ? req.slots : []
    return reqSlots.some((s) => keySet.has(s))
  })
}

function hasPendingDeleteForSlot(row, slotKey) {
  return hasPendingDeleteForSlots(row, [slotKey])
}

function getSlotTooltip(row, slotKey, slotLabel) {
  const isReadonly = props.readonly
  const pendingSuffix = hasPendingDeleteForSlot(row, slotKey)
    ? ' (Delete request pending HR approval)'
    : ''
  if (isRowSlotMissing(row, slotKey)) {
    return (
      (isReadonly
        ? `Missing punch — Day ${row.dayNumber} (${slotLabel})`
        : `Missing punch — Day ${row.dayNumber} (${slotLabel}). Click to edit.`) + pendingSuffix
    )
  }
  const lateMins = getSlotLateMinutes(row, slotKey)
  if (lateMins > 0) {
    return (
      (isReadonly
        ? `LATE (+${lateMins}m) — Day ${row.dayNumber} (${slotLabel}).`
        : `LATE (+${lateMins}m) — Day ${row.dayNumber} (${slotLabel}). Click to override.`) +
      pendingSuffix
    )
  }
  const slotText = getSlotOverrideText(row?.record, slotKey)
  if (slotText) {
    return (
      (isReadonly
        ? `Day ${row.dayNumber} ${slotLabel}: ${slotText}`
        : `Day ${row.dayNumber} ${slotLabel}: ${slotText} (Click to override)`) + pendingSuffix
    )
  }
  if (isRecordSlotAdjusted(row?.record, slotKey)) {
    const reason =
      row.record?.adjustment_remarks || row.record?.adjustment_reason || 'Manually Adjusted'
    return (
      (isReadonly
        ? `Day ${row.dayNumber} ${slotLabel}: ${reason}`
        : `Day ${row.dayNumber} ${slotLabel}: ${reason} (Click to edit)`) + pendingSuffix
    )
  }
  if (pendingSuffix) {
    return `Day ${row.dayNumber} ${slotLabel}${pendingSuffix}`
  }
  return isReadonly ? '' : `Click to override time for Day ${row.dayNumber} (${slotLabel})`
}

/**
 * Return shared remark label when both slots in a half-day have no time punches
 * and carry the exact same non-TIME override remark.
 */
function resolveHalfDaySlotRemark(record, slotA, slotB) {
  if (!record) return ''
  const punchA = record[slotA] && record[slotA] !== '-' && record[slotA] !== '—'
  const punchB = record[slotB] && record[slotB] !== '-' && record[slotB] !== '—'
  if (punchA || punchB) return ''
  const textA = getSlotOverrideText(record, slotA)
  const textB = getSlotOverrideText(record, slotB)
  if (!textA || !textB) return ''
  if (textA.toUpperCase() !== textB.toUpperCase()) return ''
  return textA
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
        mergedAmRemark: '',
        mergedPmRemark: '',
        mergedWholeDayRemark: '',
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
      record?.am_arrival || record?.am_departure || record?.pm_arrival || record?.pm_departure,
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

    const rawStatus = String(record?.status || '')
      .toUpperCase()
      .trim()
    const rawRemark = String(record?.adjustment_remarks || '')
      .toUpperCase()
      .trim()

    const isCellLevelOverride =
      ['O.B.', 'O.F.', 'OFFICIAL BUSINESS', 'ON FIELD'].includes(rawStatus) ||
      ['O.B.', 'O.F.', 'OFFICIAL BUSINESS', 'ON FIELD'].includes(rawRemark) ||
      (record?.adjusted_slots &&
        typeof record.adjusted_slots === 'object' &&
        !Array.isArray(record.adjusted_slots))

    if (isInCutoff) {
      if (rawStatus === 'HOLIDAY' || record?.is_holiday) {
        isHoliday = true
        holidayName = record?.remarks || record?.adjustment_remarks || 'HOLIDAY'
      } else if (
        rawStatus === 'ON_LEAVE' ||
        rawStatus === 'ON_LEAVE_AM' ||
        rawStatus === 'ON_LEAVE_PM'
      ) {
        const leaveCode = String(record?.leave_type_code || '').trim()
        const codeDisplay = leaveCode ? `ON LEAVE (${leaveCode})` : 'ON LEAVE'
        leaveLabel = record?.remarks && record.remarks !== 'ON LEAVE' ? record.remarks : codeDisplay

        if (rawStatus === 'ON_LEAVE') {
          isOnLeave = true
        } else if (rawStatus === 'ON_LEAVE_AM') {
          isOnLeaveAm = true
        } else if (rawStatus === 'ON_LEAVE_PM') {
          isOnLeavePm = true
        }
      } else if (
        !isCellLevelOverride &&
        (rawStatus === 'RESTDAY' || (rawRemark && !hasAnyPunch && rawStatus !== 'ABSENT'))
      ) {
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

    const hasWork =
      isInCutoff && !isWeekend && !isAbsent && !isOnLeave && !isHoliday && !isCustomRemark

    const amArrival = formatSlotPunch(
      record?.am_arrival,
      record,
      'am_arrival',
      hasWork,
      hasAnyPunch,
    )
    const amDeparture = formatSlotPunch(
      record?.am_departure,
      record,
      'am_departure',
      hasWork,
      hasAnyPunch,
    )
    const pmArrival = formatSlotPunch(
      record?.pm_arrival,
      record,
      'pm_arrival',
      hasWork,
      hasAnyPunch,
    )
    const pmDeparture = formatSlotPunch(
      record?.pm_departure,
      record,
      'pm_departure',
      hasWork,
      hasAnyPunch,
    )

    const canMergeRemarks =
      isInCutoff &&
      !isWeekend &&
      !isAbsent &&
      !isHoliday &&
      !isOnLeave &&
      !isOnLeaveAm &&
      !isOnLeavePm &&
      !isCustomRemark

    const mergedAmRemark = canMergeRemarks
      ? resolveHalfDaySlotRemark(record, 'am_arrival', 'am_departure')
      : ''
    const mergedPmRemark = canMergeRemarks
      ? resolveHalfDaySlotRemark(record, 'pm_arrival', 'pm_departure')
      : ''
    const mergedWholeDayRemark =
      mergedAmRemark &&
      mergedPmRemark &&
      mergedAmRemark.toUpperCase() === mergedPmRemark.toUpperCase()
        ? mergedAmRemark
        : ''

    const rowObj = {
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
      mergedAmRemark,
      mergedPmRemark,
      mergedWholeDayRemark,
      hasWork,
      amArrival,
      amDeparture,
      pmArrival,
      pmDeparture,
      record,
      missingSlots: [],
    }
    rowObj.missingSlots = computeRowMissingSlots(rowObj)
    rows.push(rowObj)
  }

  const presentDaysCount = rows.filter(
    (r) =>
      r.isInCutoff &&
      !r.isWeekend &&
      !r.isAbsent &&
      !r.isNonExistentDay &&
      (r.hasWork || r.isOnLeaveAm || r.isOnLeavePm),
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
  const status = String(props.employee?.employment_status || props.employee?.status || '')
    .toUpperCase()
    .trim()
  return status === 'CONTRACTUAL' || status === 'HONORARIUM'
})

const employeeEmploymentStatus = computed(() => {
  return String(props.employee?.employment_status || props.employee?.status || '')
    .toUpperCase()
    .trim()
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
    return [
      {
        key: `single-${sheets[0].key || 0}`,
        mode: 'single-centered',
        leftSheet: sheets[0],
        rightSheet: null,
      },
    ]
  }

  // 2 or more months covered for non-contractual: pair them up 2-by-2 side-by-side
  const pairs = []
  for (let i = 0; i < sheets.length; i += 2) {
    const left = sheets[i]
    const right = sheets[i + 1] || null
    pairs.push({
      key: `bimonthly-${left.key || i}-${right ? right.key || i + 1 : 'single'}`,
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
  if (!props.showPrint) return
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

.csc-sheet-wrapper + .csc-sheet-wrapper {
  margin-top: 16px;
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
  font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
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

.td-late-slot {
  color: #c62828 !important;
  font-weight: 700;
}

.td-pending-delete-slot {
  background-color: #fffbeb !important;
  box-shadow: inset 0 0 0 1.5px #d97706 !important;
}

@media print {
  .csc-sheet-wrapper + .csc-sheet-wrapper {
    margin-top: 0;
  }

  .td-overridden-slot {
    color: #000000 !important;
  }

  .td-late-slot {
    color: #c62828 !important;
  }

  .td-pending-delete-slot {
    background-color: transparent !important;
    box-shadow: none !important;
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

.td-merged-status.td-overridden-slot {
  font-weight: 700;
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
  transition:
    background-color 0.15s ease-in-out,
    color 0.15s ease-in-out;
}

.td-time-clickable:hover {
  background-color: #f1f8e9 !important;
  color: #1b5e20 !important;
  outline: 1.5px solid #4caf50;
  outline-offset: -1.5px;
  cursor: pointer;
}

.td-late-slot:hover {
  background-color: #fff1f2 !important;
  color: #b91c1c !important;
  outline: 1.5px solid #e11d48;
}

/* ================= SCREEN-ONLY MISSING PUNCH SLOT HIGHLIGHTS ================= */
.td-date-missing {
  background-color: #ffe4e6 !important;
  color: #9f1239 !important;
  font-weight: 900 !important;
}

.td-missing-slot {
  background-color: #fff1f2 !important;
  box-shadow: inset 0 0 0 1.5px #f43f5e;
}

.td-missing-slot:hover {
  background-color: #ffe4e6 !important;
  outline: 1.5px solid #e11d48 !important;
}

.dtr-container.is-readonly .td-time-clickable,
.dtr-container.is-readonly .td-time-clickable:hover,
.dtr-container.is-readonly .csc-incharge-col,
.dtr-container.is-readonly .csc-prn-line {
  cursor: default !important;
}

.dtr-container.is-readonly .td-time-clickable:hover {
  background-color: transparent !important;
  color: inherit !important;
  outline: none !important;
}

.dtr-container.is-readonly .td-missing-slot:hover {
  background-color: #fff1f2 !important;
  outline: none !important;
}

.dtr-cell-menu-header {
  padding: 6px 12px;
  background-color: #f8fafc;
}
</style>
