<template>
  <div class="dtr-container">
    <!-- Screen View Toolbar -->
    <div class="row items-center justify-between q-mb-md no-print">
      <div class="text-h6 text-weight-bold flex items-center q-gutter-x-sm">
        <q-icon name="table_chart" color="primary" size="24px" />
        <span>Civil Service Form No. 48 (Daily Time Record)</span>
      </div>
      <div class="row q-gutter-sm items-center">
        <q-badge color="blue-1" text-color="blue-9" class="q-px-sm q-py-xs text-caption">
          Standard Schedule: 8:00 AM – 12:00 NN | 1:00 PM – 5:00 PM
        </q-badge>
        <q-btn
          outline
          no-caps
          color="primary"
          icon="print"
          label="Print Form 48"
          class="q-px-md"
          @click="triggerPrint"
        />
      </div>
    </div>

    <!-- Official CSC Form 48 Container (Used for both Screen & Print) -->
    <div id="csc-form-48-print-area" class="csc-form-48-card">
      <!-- Printable Header -->
      <div class="csc-header text-center">
        <div class="csc-form-no text-caption text-weight-bold">Civil Service Form No. 48</div>
        <div class="csc-title text-h6 text-weight-bolder q-my-xs">DAILY TIME RECORD</div>
        <div class="csc-divider text-caption">----- o 0 o -----</div>

        <div class="csc-employee-name-line q-mt-sm">
          <span class="csc-name-text text-subtitle1 text-weight-bold">{{
            employee?.name || '—'
          }}</span>
          <div class="csc-name-label text-caption text-grey-8">(Name of Employee)</div>
        </div>

        <div class="row justify-between csc-meta-row q-mt-xs text-caption">
          <div class="col-6 text-left">
            <span>For the month of: </span>
            <strong class="csc-underline">{{ period?.month_name || '' }} {{ period?.year || '' }}</strong>
          </div>
          <div class="col-6 text-right">
            <span>Control No: </span>
            <strong class="csc-underline">{{ employee?.control_no || '—' }}</strong>
          </div>
        </div>

        <div class="csc-hours-meta text-caption text-left q-mt-xs">
          <div>Official hours for arrival and departure:</div>
          <div class="row justify-between text-grey-8 q-px-sm">
            <span>Regular days: <strong>8:00 AM – 12:00 NN / 1:00 PM – 5:00 PM</strong></span>
            <span>Saturdays: <strong>As scheduled</strong></span>
          </div>
        </div>
      </div>

      <!-- Form 48 Table -->
      <div class="csc-table-wrapper q-mt-sm">
        <table class="csc-table">
          <thead>
            <tr>
              <th rowspan="2" class="csc-th-day">Day</th>
              <th colspan="2" class="csc-th-am">A.M.</th>
              <th colspan="2" class="csc-th-pm">P.M.</th>
              <th colspan="2" class="csc-th-undertime">Undertime / Late</th>
              <th rowspan="2" class="csc-th-remarks">Status / Remarks</th>
              <th rowspan="2" class="csc-th-actions no-print">Action</th>
            </tr>
            <tr>
              <th class="csc-th-sub">Arrival</th>
              <th class="csc-th-sub">Departure</th>
              <th class="csc-th-sub">Arrival</th>
              <th class="csc-th-sub">Departure</th>
              <th class="csc-th-sub-sm">Hours</th>
              <th class="csc-th-sub-sm">Minutes</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in fullMonthDays"
              :key="row.dayNumber"
              :class="{
                'csc-row--weekend': row.isWeekend,
                'csc-row--leave': row.record?.status === 'ON_LEAVE',
                'csc-row--adjusted': row.record?.is_adjusted,
                'csc-row--late': (row.record?.late_minutes > 0 || row.record?.undertime_minutes > 0),
              }"
            >
              <!-- Day Number & Day of Week -->
              <td class="text-center text-weight-medium csc-td-day">
                {{ row.dayNumber }}
                <span class="day-short no-print text-grey-6 text-caption q-ml-xs">({{ row.dayShort }})</span>
              </td>

              <!-- AM Arrival -->
              <td class="text-center csc-td-time">
                {{ formatPunchTime(row.record?.am_arrival) }}
              </td>

              <!-- AM Departure -->
              <td class="text-center csc-td-time">
                {{ formatPunchTime(row.record?.am_departure) }}
              </td>

              <!-- PM Arrival -->
              <td class="text-center csc-td-time">
                {{ formatPunchTime(row.record?.pm_arrival) }}
              </td>

              <!-- PM Departure -->
              <td class="text-center csc-td-time">
                {{ formatPunchTime(row.record?.pm_departure) }}
              </td>

              <!-- Undertime / Late Hours -->
              <td class="text-center csc-td-num">
                {{ row.undertimeHours > 0 ? row.undertimeHours : '' }}
              </td>

              <!-- Undertime / Late Minutes -->
              <td class="text-center csc-td-num">
                {{ row.undertimeMinutes > 0 ? row.undertimeMinutes : '' }}
              </td>

              <!-- Remarks / Status -->
              <td class="csc-td-remarks">
                <div class="row items-center no-wrap">
                  <span v-if="row.displayRemarks" class="text-caption text-weight-medium">
                    {{ row.displayRemarks }}
                  </span>
                  <span v-else-if="row.isWeekend" class="text-caption text-grey-5 font-italic">
                    {{ row.dayName }}
                  </span>
                  <span v-else-if="row.record?.status === 'PRESENT'" class="text-caption text-positive">
                    PRESENT
                  </span>
                  <span v-else-if="row.record?.status === 'ABSENT'" class="text-caption text-negative">
                    ABSENT
                  </span>
                  <span v-else class="text-caption text-grey-4">—</span>

                  <q-badge
                    v-if="row.record?.is_adjusted"
                    color="purple-1"
                    text-color="purple-9"
                    class="q-ml-xs text-caption no-print"
                    label="Adjusted"
                  />
                </div>
              </td>

              <!-- Action Column (Screen Only) -->
              <td class="text-center csc-td-actions no-print">
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="edit_calendar"
                  color="primary"
                  @click="emitAdjust(row)"
                >
                  <q-tooltip>Adjust Attendance (Pass Slip / OB / Travel)</q-tooltip>
                </q-btn>
              </td>
            </tr>

            <!-- Totals Footer Row -->
            <tr class="csc-row-total text-weight-bold">
              <td colspan="5" class="text-right text-uppercase q-pr-md">
                Total Undertime / Tardiness:
              </td>
              <td class="text-center csc-td-num">
                {{ totalLateHours > 0 ? totalLateHours : '' }}
              </td>
              <td class="text-center csc-td-num">
                {{ totalLateMinutesOnly > 0 ? totalLateMinutesOnly : '' }}
              </td>
              <td colspan="2" class="text-left text-caption">
                <span class="text-weight-medium">Total Rendered:</span>
                {{ Number(summary?.total_rendered_hours || 0).toFixed(1) }} hrs
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Printable Certification & Signatory Footer -->
      <div class="csc-footer q-mt-md">
        <p class="csc-cert-statement text-caption text-justify">
          I certify on my honor that the above is a true and correct report of the hours of work performed,
          record of which was made daily at the time of arrival and departure from office.
        </p>

        <div class="csc-employee-signature-block text-center q-mt-lg">
          <div class="csc-sig-line"></div>
          <div class="text-weight-bold text-caption text-uppercase q-mt-xs">
            {{ employee?.name || 'EMPLOYEE SIGNATURE' }}
          </div>
          <div class="text-caption text-grey-7">Employee Signature</div>
        </div>

        <div class="csc-supervisor-signature-block q-mt-lg">
          <div class="text-caption text-weight-medium">Verified as to the prescribed office hours:</div>
          <div class="text-center q-mt-lg">
            <div class="csc-sig-line"></div>
            <div class="text-weight-bold text-caption text-uppercase q-mt-xs">
              {{ employee?.office || 'DEPARTMENT HEAD / SUPERVISOR' }}
            </div>
            <div class="text-caption text-grey-7">In Charge / Immediate Supervisor</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
})

const emit = defineEmits(['adjust'])

/**
 * Format 24-hour punch string "07:55:00" to "7:55 AM"
 */
function formatPunchTime(timeStr) {
  if (!timeStr || String(timeStr).trim() === '') return ''
  const parts = String(timeStr).split(':')
  if (parts.length < 2) return timeStr

  let hours = parseInt(parts[0], 10)
  const minutes = parts[1]
  if (isNaN(hours)) return timeStr

  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // 0 becomes 12
  return `${hours}:${minutes} ${ampm}`
}

/**
 * Build 1..N days array for the selected month matching CSC Form 48
 */
const fullMonthDays = computed(() => {
  const daysInMonth = props.period?.days_in_month || 30
  const year = props.period?.year || new Date().getFullYear()
  const month = props.period?.month || (new Date().getMonth() + 1)

  const recordsMap = new Map()
  if (Array.isArray(props.records)) {
    props.records.forEach((rec) => {
      if (rec.record_date) {
        recordsMap.set(rec.record_date, rec)
      }
    })
  }

  const daysList = []
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayShorts = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  for (let d = 1; d <= daysInMonth; d++) {
    const padDay = String(d).padStart(2, '0')
    const padMonth = String(month).padStart(2, '0')
    const dateStr = `${year}-${padMonth}-${padDay}`
    const dateObj = new Date(year, month - 1, d)

    const dayOfWeek = dateObj.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const record = recordsMap.get(dateStr) || null

    // Compute undertime & late in hours & minutes
    const totalDeductionMins = (record?.late_minutes || 0) + (record?.undertime_minutes || 0)
    const undertimeHours = Math.floor(totalDeductionMins / 60)
    const undertimeMinutes = totalDeductionMins % 60

    // Construct human-readable remarks
    let displayRemarks = ''
    if (record?.is_adjusted) {
      const reasonLabel = (record.adjustment_reason || 'ADJUSTED').replace(/_/g, ' ')
      displayRemarks = record.adjustment_remarks
        ? `${reasonLabel}: ${record.adjustment_remarks}`
        : reasonLabel
    } else if (record?.status === 'ON_LEAVE') {
      displayRemarks = record.remarks || 'ON LEAVE'
    } else if (record?.status === 'HALF_DAY') {
      displayRemarks = 'HALF DAY'
    } else if (record?.remarks) {
      displayRemarks = record.remarks
    }

    daysList.push({
      dayNumber: d,
      dateString: dateStr,
      dayName: dayNames[dayOfWeek],
      dayShort: dayShorts[dayOfWeek],
      isWeekend,
      record,
      undertimeHours,
      undertimeMinutes,
      displayRemarks,
    })
  }

  return daysList
})

/**
 * Total tardiness and undertime in hours & minutes
 */
const totalLateCombinedMinutes = computed(() => {
  const late = Number(props.summary?.total_late_minutes || 0)
  const undertime = Number(props.summary?.total_undertime_minutes || 0)
  return late + undertime
})

const totalLateHours = computed(() => Math.floor(totalLateCombinedMinutes.value / 60))
const totalLateMinutesOnly = computed(() => totalLateCombinedMinutes.value % 60)

function emitAdjust(row) {
  emit('adjust', {
    date: row.dateString,
    dayNumber: row.dayNumber,
    record: row.record,
  })
}

function triggerPrint() {
  window.print()
}
</script>

<style scoped>
.dtr-container {
  width: 100%;
}

.csc-form-48-card {
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.csc-header {
  border-bottom: 2px solid #1f2937;
  padding-bottom: 12px;
}

.csc-name-text {
  border-bottom: 1px solid #111827;
  padding: 0 24px 2px;
  display: inline-block;
  min-width: 250px;
}

.csc-underline {
  border-bottom: 1px solid #6b7280;
  padding: 0 8px;
}

.csc-table-wrapper {
  overflow-x: auto;
}

.csc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  border: 1px solid #374151;
}

.csc-table th,
.csc-table td {
  border: 1px solid #4b5563;
  padding: 4px 6px;
}

.csc-table thead th {
  background: #f3f4f6;
  font-weight: 700;
  color: #111827;
  text-align: center;
  vertical-align: middle;
}

.csc-th-day {
  width: 75px;
}

.csc-th-sub-sm {
  width: 55px;
  font-size: 0.75rem;
}

.csc-th-actions {
  width: 60px;
}

.csc-row--weekend {
  background: #f9fafb;
}

.csc-row--leave {
  background: #f0fdf4;
}

.csc-row--late {
  background: #fffbeb;
}

.csc-row--adjusted {
  background: #faf5ff;
}

.csc-row-total {
  background: #f3f4f6;
  border-top: 2px solid #374151;
}

.csc-td-time {
  font-family: monospace;
  font-size: 0.8rem;
  white-space: nowrap;
}

.csc-td-num {
  font-weight: 600;
  color: #b91c1c;
}

.csc-sig-line {
  border-bottom: 1px solid #111827;
  width: 280px;
  margin: 0 auto;
}

/* Print Specific Rules */
@media print {
  /* Hide standard page UI */
  .no-print,
  :deep(.q-header),
  :deep(.q-drawer),
  :deep(.q-footer),
  :deep(.attendance-record-header),
  :deep(.attendance-profile-card__section) {
    display: none !important;
  }

  body, html {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .dtr-container {
    padding: 0 !important;
    margin: 0 !important;
  }

  .csc-form-48-card {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
  }

  .csc-table {
    border: 1.5px solid #000000 !important;
    font-size: 9pt !important;
  }

  .csc-table th,
  .csc-table td {
    border: 1px solid #000000 !important;
    padding: 2px 4px !important;
  }

  .csc-table thead th {
    background: #e5e7eb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .csc-row--weekend {
    background: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
