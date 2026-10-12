<template>
  <div class="dtr-container">
    <!-- Screen View Toolbar & Controls (Hidden on Print) -->
    <q-card flat bordered class="q-mb-md no-print bg-white rounded-borders">
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
                <div class="text-caption text-grey-7">
                  Dual-panel document layout matching City Government of Tagum standard
                </div>
              </div>
            </div>
          </div>

          <!-- Middle: Cutoff Period Selector -->
          <div class="col-12 col-md-auto">
            <div class="row items-center q-gutter-xs">
              <span class="text-caption text-weight-medium text-grey-8 q-mr-xs">Cutoff:</span>
              <q-btn-toggle
                v-model="cutoffMode"
                dense
                no-caps
                rounded
                unelevated
                toggle-color="green-9"
                color="grey-2"
                text-color="grey-9"
                :options="[
                  { label: 'Full Month (1–31)', value: 'full' },
                  { label: '1st (1–15)', value: 'first' },
                  { label: '2nd (16–End)', value: 'second' },
                  { label: 'Custom', value: 'custom' },
                ]"
                class="cutoff-toggle"
              />

              <!-- Custom Range Controls (when 'custom' is active) -->
              <template v-if="cutoffMode === 'custom'">
                <q-input
                  v-model.number="customStartDay"
                  type="number"
                  dense
                  outlined
                  label="From"
                  min="1"
                  :max="daysInMonth"
                  style="width: 75px"
                  class="q-ml-xs"
                />
                <span class="text-grey-6">–</span>
                <q-input
                  v-model.number="customEndDay"
                  type="number"
                  dense
                  outlined
                  label="To"
                  min="1"
                  :max="daysInMonth"
                  style="width: 75px"
                />
              </template>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="col-12 col-md-auto">
            <div class="row items-center justify-end q-gutter-xs">
              <q-btn
                flat
                dense
                no-caps
                color="grey-8"
                icon="settings"
                :label="showConfig ? 'Hide Settings' : 'Customize Document'"
                @click="showConfig = !showConfig"
              />
              <q-btn
                unelevated
                no-caps
                color="green-9"
                icon="print"
                label="Print Document"
                class="text-weight-bold q-px-md"
                @click="triggerPrint"
              />
            </div>
          </div>
        </div>

        <!-- Collapsible Configuration Panel -->
        <q-slide-transition>
          <div v-show="showConfig" class="q-pt-sm q-mt-sm border-top">
            <div class="row q-col-gutter-sm text-caption">
              <div class="col-12 col-sm-6 col-md-3">
                <q-input
                  v-model="workloadText"
                  dense
                  outlined
                  label="Accomplishment Workload"
                  hint="Appears on rendered workdays"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-input
                  v-model="programCharges"
                  dense
                  outlined
                  label="Program / Charges"
                  hint="Right panel account title"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-input
                  v-model="prnNumber"
                  dense
                  outlined
                  label="PRN Number"
                  hint="Optional PRN code"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-input
                  v-model="inChargeName"
                  dense
                  outlined
                  label="In-Charge / Supervisor"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-2">
                <q-input
                  v-model="inChargeTitle"
                  dense
                  outlined
                  label="Office / Designation"
                />
              </div>
            </div>
          </div>
        </q-slide-transition>
      </q-card-section>
    </q-card>

    <!-- Official Dual-Panel Document (Used for both Screen & Print) -->
    <div id="csc-form-48-print-area" class="csc-sheet-wrapper">
      <div class="dtr-dual-page-sheet">
        <!-- ========================================================= -->
        <!-- TOP HEADERS ROW: BALANCED & BOTTOM-ALIGNED               -->
        <!-- ========================================================= -->
        <div class="csc-headers-row">
          <!-- Left Header (Daily Time Record) -->
          <div class="csc-header-left">
            <div class="csc-top-tag">Form 48</div>
            <div class="text-center csc-main-title">
              DAILY TIME RECORD
            </div>

            <!-- Employee Name -->
            <div class="text-center csc-name-block">
              <div class="csc-name-underline text-weight-bold">
                {{ employeeDisplayName }}
              </div>
              <div class="csc-sub-label">NAME</div>
            </div>

            <!-- Month & Period Line -->
            <div class="csc-meta-line text-center">
              <span>For the month of </span>
              <span class="csc-period-underline text-weight-bold">{{ periodDisplayLabel }}</span>
              <span class="text-weight-bold">, {{ displayYear }}</span>
            </div>

            <!-- Official Hours Statement -->
            <div class="csc-hours-statement">
              <div>Office Hours for Arrival (Regular Days) and</div>
              <div class="row items-center justify-between">
                <span>Departure <span class="csc-dotted-line">__________</span></span>
                <span>Saturday <span class="csc-dotted-line">__________</span></span>
              </div>
            </div>
          </div>

          <!-- Middle Gutter Spacer -->
          <div class="csc-header-gutter"></div>

          <!-- Right Header (Accomplishment Report) -->
          <div class="csc-header-right">
            <div class="text-center csc-main-title">
              ACCOMPLISHMENT REPORT
            </div>

            <!-- Program / Charges Block -->
            <div class="text-center csc-program-block">
              <div class="text-weight-bold text-uppercase csc-program-title">
                {{ programCharges }}
              </div>
              <div class="csc-sub-label">CHARGES</div>
            </div>

            <!-- PRN Line (Aligned right above table top) -->
            <div class="csc-prn-line">
              <span>PRN: </span>
              <span class="csc-prn-underline">{{ prnNumber || '' }}</span>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- MASTER UNIFIED 31-DAY TABLE (100% BULLETPROOF ALIGNMENT)  -->
        <!-- ========================================================= -->
        <table class="csc-master-table">
          <thead>
            <tr>
              <!-- LEFT HEADERS -->
              <th rowspan="2" class="th-date">DATE</th>
              <th colspan="2" class="th-session">AM</th>
              <th colspan="2" class="th-session">PM</th>

              <!-- MIDDLE GUTTER -->
              <th rowspan="2" class="th-gutter"></th>

              <!-- RIGHT HEADERS -->
              <th rowspan="2" class="th-workload">WORKLOAD UNDERTAKEN</th>
              <th rowspan="2" class="th-quantity">QUANTITY</th>
            </tr>
            <tr>
              <!-- LEFT SUB-HEADERS -->
              <th class="th-sub">ARRIVAL</th>
              <th class="th-sub">DEPARTURE</th>
              <th class="th-sub">ARRIVAL</th>
              <th class="th-sub">DEPARTURE</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in monthDayRows"
              :key="row.dayNumber"
              :class="{
                'tr-weekend': row.isWeekend && row.isInCutoff,
                'tr-outside': !row.isInCutoff,
                'tr-absent': row.isAbsent,
              }"
            >
              <!-- ================= LEFT SIDE CELLS ================= -->
              <!-- Date Column -->
              <td class="td-date">
                <span v-if="row.isNonExistentDay">31</span>
                <span v-else>{{ row.dayNumber }}</span>
              </td>

              <!-- Non-existent Day 31 on 30-day months: X X X X -->
              <template v-if="row.isNonExistentDay">
                <td class="td-merged-center text-weight-bold">X</td>
                <td class="td-merged-center text-weight-bold">X</td>
                <td class="td-merged-center text-weight-bold">X</td>
                <td class="td-merged-center text-weight-bold">X</td>
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
                <td colspan="4" class="td-merged-center td-saturday">
                  SATURDAY
                </td>
              </template>

              <!-- Sunday: Merged across 4 punch columns -->
              <template v-else-if="row.isSunday">
                <td colspan="4" class="td-merged-center td-sunday">
                  SUNDAY
                </td>
              </template>

              <!-- Absent: Merged across 4 punch columns -->
              <template v-else-if="row.isAbsent">
                <td colspan="4" class="td-merged-center td-absent">
                  ABSENT
                </td>
              </template>

              <!-- Holiday: Merged across 4 punch columns -->
              <template v-else-if="row.isHoliday">
                <td colspan="4" class="td-merged-center td-holiday">
                  {{ row.holidayName || 'HOLIDAY' }}
                </td>
              </template>

              <!-- On Leave: Merged across 4 punch columns -->
              <template v-else-if="row.isOnLeave">
                <td colspan="4" class="td-merged-center td-leave">
                  {{ row.leaveLabel || 'ON LEAVE' }}
                </td>
              </template>

              <!-- Regular Working Day with Punches -->
              <template v-else>
                <td class="td-time">{{ row.amArrival }}</td>
                <td class="td-time">{{ row.amDeparture }}</td>
                <td class="td-time">{{ row.pmArrival }}</td>
                <td class="td-time">{{ row.pmDeparture }}</td>
              </template>

              <!-- ================= MIDDLE GUTTER ================= -->
              <td class="td-gutter"></td>

              <!-- ================= RIGHT SIDE CELLS ================= -->
              <!-- Non-existent Day 31 -->
              <template v-if="row.isNonExistentDay">
                <td class="td-workload td-blank"></td>
                <td class="td-quantity td-blank"></td>
              </template>

              <!-- Outside Active Cutoff: Empty with gridlines -->
              <template v-else-if="!row.isInCutoff">
                <td class="td-workload td-blank"></td>
                <td class="td-quantity td-blank"></td>
              </template>

              <!-- Saturday: Merged row matching left -->
              <template v-else-if="row.isSaturday">
                <td colspan="2" class="td-merged-center td-saturday">
                  SATURDAY
                </td>
              </template>

              <!-- Sunday: Merged row matching left -->
              <template v-else-if="row.isSunday">
                <td colspan="2" class="td-merged-center td-sunday">
                  SUNDAY
                </td>
              </template>

              <!-- Absent: Merged row matching left -->
              <template v-else-if="row.isAbsent">
                <td colspan="2" class="td-merged-center td-absent">
                  ABSENT
                </td>
              </template>

              <!-- Holiday: Merged row matching left -->
              <template v-else-if="row.isHoliday">
                <td colspan="2" class="td-merged-center td-holiday">
                  {{ row.holidayName || 'HOLIDAY' }}
                </td>
              </template>

              <!-- On Leave: Merged row matching left -->
              <template v-else-if="row.isOnLeave">
                <td colspan="2" class="td-merged-center td-leave">
                  {{ row.leaveLabel || 'ON LEAVE' }}
                </td>
              </template>

              <!-- Regular Working Day with Accomplishment Description -->
              <template v-else>
                <td class="td-workload">
                  <span v-if="row.hasWork" class="workload-text-span">{{ workloadText }}</span>
                </td>
                <td class="td-quantity"></td>
              </template>
            </tr>
          </tbody>
        </table>

        <!-- ========================================================= -->
        <!-- FOOTERS ROW: ALIGNED SIGNATORIES & VERIFICATION          -->
        <!-- ========================================================= -->
        <div class="csc-footers-row">
          <!-- Left Footer (Barcode + Certification + Supervisor) -->
          <div class="csc-footer-left">
            <div class="csc-barcode-wrap" v-html="barcodeSvg"></div>
            <div class="csc-cert-statement">
              I certify on my honor that the above is true and correct report of works performed,
              record of which was made daily at the time of arrival and departure from the office.
            </div>

            <div class="csc-signature-block text-center q-mt-xs">
              <div class="csc-sig-above text-caption">Verified as to the prescribed office hours</div>
              <div class="csc-sig-line"></div>
              <div class="csc-sig-name text-weight-bold">{{ inChargeName }}</div>
              <div class="csc-sig-title">{{ inChargeTitle }}</div>
              <div class="csc-sig-sub">IN-CHARGE</div>
            </div>

            <!-- Summary Counters -->
            <div class="row items-center justify-between csc-summary-line q-mt-xs text-caption">
              <div>
                <span>No. of Day(s): </span>
                <strong class="font-mono">~{{ presentDaysCount }}</strong>
              </div>
              <div>
                <span>No. of Min. Late(s): </span>
                <strong class="font-mono">{{ totalLateMinutes }}</strong>
              </div>
            </div>
          </div>

          <!-- Middle Gutter Spacer -->
          <div class="csc-footer-gutter"></div>

          <!-- Right Footer (Prepared by Signatory) -->
          <div class="csc-footer-right">
            <!-- Spacer to align with Left Certification text -->
            <div class="csc-right-spacer"></div>

            <div class="csc-signature-block text-center q-mt-xs">
              <div class="csc-sig-above text-caption">Prepared by</div>
              <div class="csc-sig-line"></div>
              <div class="csc-sig-name text-weight-bold">{{ inChargeName }}</div>
              <div class="csc-sig-title">{{ inChargeTitle }}</div>
              <div class="csc-sig-sub">IN-CHARGE</div>
            </div>

            <!-- Bottom Spacer to match Left Summary Counters -->
            <div class="csc-bottom-spacer"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

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

// Interactive UI State
const showConfig = ref(false)
const cutoffMode = ref('full') // 'full', 'first', 'second', 'custom'
const customStartDay = ref(1)
const customEndDay = ref(15)

// Editable Document Metadata (Defaulted to match official Tagum CICTMO records)
const workloadText = ref('rendering security services @ CICTMO')
const programCharges = ref('PROG - CMO-SECURITY PROGRAM')
const prnNumber = ref('')
const inChargeName = ref('JOSEPH NELSON N. BRIONES')
const inChargeTitle = ref('CICTMO HEAD')

const daysInMonth = computed(() => {
  return Number(props.period?.days_in_month) || 30
})

const displayYear = computed(() => {
  return props.period?.year || new Date().getFullYear()
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

// Active Day Range based on Cutoff
const activeStartDay = computed(() => {
  if (cutoffMode.value === 'first') return 1
  if (cutoffMode.value === 'second') return 16
  if (cutoffMode.value === 'custom') return Math.max(1, Number(customStartDay.value) || 1)
  return 1
})

const activeEndDay = computed(() => {
  if (cutoffMode.value === 'first') return 15
  if (cutoffMode.value === 'second') return daysInMonth.value
  if (cutoffMode.value === 'custom') return Math.min(daysInMonth.value, Number(customEndDay.value) || daysInMonth.value)
  return daysInMonth.value
})

const periodDisplayLabel = computed(() => {
  const monthName = (props.period?.month_name || 'SEPTEMBER').toUpperCase()
  if (cutoffMode.value === 'full') {
    return `${monthName} 1 - ${daysInMonth.value}`
  }
  return `${monthName} ${activeStartDay.value} - ${activeEndDay.value}`
})

/**
 * Format raw punch string "HH:mm:ss" or "HH:mm" into Civil Service "h:mm" format.
 * (e.g. "07:46:00" -> "7:46", "17:02:00" -> "5:02", "12:24:00" -> "12:24")
 */
function formatCscTime(timeStr) {
  if (!timeStr || String(timeStr).trim() === '') return ''
  const parts = String(timeStr).split(':')
  if (parts.length < 2) return timeStr

  let h = parseInt(parts[0], 10)
  const m = parts[1].padStart(2, '0')
  if (isNaN(h)) return timeStr

  h = h % 12
  h = h ? h : 12 // 0 becomes 12
  return `${h}:${m}`
}

/**
 * Build 1..31 days array matching the exact paper document layout
 */
const monthDayRows = computed(() => {
  const maxDays = daysInMonth.value
  const year = displayYear.value
  const month = props.period?.month || 10

  const recordsMap = new Map()
  if (Array.isArray(props.records)) {
    props.records.forEach((rec) => {
      if (rec.record_date) {
        recordsMap.set(rec.record_date, rec)
      }
    })
  }

  const rows = []

  for (let d = 1; d <= 31; d++) {
    // Non-existent day in current month (e.g. Day 31 on 30-day months)
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

    const isInCutoff = d >= activeStartDay.value && d <= activeEndDay.value
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
      if (record?.status === 'ABSENT' || (!hasAnyPunch && record?.status !== 'ON_LEAVE' && record?.status !== 'HOLIDAY' && !record?.is_adjusted)) {
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

  return rows
})

/**
 * Filtered Present Days in active Cutoff
 */
const presentDaysCount = computed(() => {
  return monthDayRows.value.filter(
    (r) => r.isInCutoff && !r.isWeekend && !r.isAbsent && !r.isNonExistentDay && r.hasWork
  ).length
})

/**
 * Filtered Tardiness Minutes in active Cutoff
 */
const totalLateMinutes = computed(() => {
  return monthDayRows.value
    .filter((r) => r.isInCutoff)
    .reduce((sum, r) => sum + Number(r.record?.late_minutes || 0), 0)
})

/**
 * Generate a clean Code 39 SVG Barcode representation
 */
const barcodeSvg = computed(() => {
  const rawText = controlNumber.value || '132354249'
  const text = `*${rawText.toUpperCase()}*`

  const CODE39 = {
    '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
    '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
    '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
    'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
    'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
    'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
    'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
    'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
    'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
    '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
    '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100',
  }

  const narrowWidth = 1.2
  const wideWidth = 2.8
  const barHeight = 22
  const rects = []
  let x = 0

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const pattern = CODE39[char] || CODE39['*']
    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0
      const isWide = pattern[p] === '1'
      const w = isWide ? wideWidth : narrowWidth
      if (isBar) {
        rects.push(`<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${barHeight}" fill="#000" />`)
      }
      x += w
    }
    x += narrowWidth // Inter-char gap
  }

  return `<svg viewBox="0 0 ${Math.ceil(x)} ${barHeight}" preserveAspectRatio="none" style="width: 100%; height: ${barHeight}px; max-width: 220px; display: block; margin: 0 auto;">${rects.join('')}</svg>`
})

function triggerPrint() {
  window.print()
}
</script>

<style scoped>
.dtr-container {
  width: 100%;
}

.cutoff-toggle {
  border: 1px solid #d1d5db;
}

.border-top {
  border-top: 1px dashed #e5e7eb;
}

/* ========================================================= */
/* DUAL PANEL PRINT SHEET CONTAINER                         */
/* ========================================================= */
.csc-sheet-wrapper {
  background: #ffffff;
  padding: 16px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  max-width: 950px;
  margin: 0 auto;
}

.dtr-dual-page-sheet {
  width: 100%;
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  color: #000000;
  background: #ffffff;
}

/* ========================================================= */
/* HEADERS ROW (BALANCED & ALIGNED AT TABLE TOP)             */
/* ========================================================= */
.csc-headers-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  margin-bottom: 4px;
}

.csc-header-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 135px;
}

.csc-header-gutter {
  width: 14px;
  flex: 0 0 14px;
}

.csc-header-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 135px;
}

.csc-top-tag {
  font-size: 8.5pt;
  color: #000000;
  line-height: 1;
  margin-bottom: 2px;
}

.csc-main-title {
  font-size: 11.5pt;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.csc-name-block {
  margin-top: 4px;
}

.csc-name-underline {
  display: inline-block;
  min-width: 220px;
  border-bottom: 1.5px solid #000000;
  padding-bottom: 1px;
  font-size: 10.5pt;
  line-height: 1.2;
}

.csc-sub-label {
  font-size: 7.5pt;
  letter-spacing: 0.5px;
  color: #222222;
  margin-top: 1px;
}

.csc-meta-line {
  font-size: 8.5pt;
  line-height: 1.3;
  margin-top: 3px;
}

.csc-period-underline {
  border-bottom: 1.5px solid #000000;
  padding: 0 8px 1px;
}

.csc-hours-statement {
  font-size: 7.5pt;
  line-height: 1.2;
  margin-top: 3px;
}

.csc-dotted-line {
  letter-spacing: -1px;
}

.csc-program-block {
  margin-top: 8px;
  margin-bottom: 14px;
}

.csc-program-title {
  font-size: 9pt;
  line-height: 1.2;
}

.csc-prn-line {
  font-size: 8.5pt;
  line-height: 1.3;
  margin-top: auto;
}

.csc-prn-underline {
  display: inline-block;
  border-bottom: 1px solid #000000;
  min-width: 180px;
  width: calc(100% - 40px);
}

/* ========================================================= */
/* UNIFIED MASTER TABLE (100% HORIZONTAL ROW SYNCHRONIZATION)*/
/* ========================================================= */
.csc-master-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
  table-layout: fixed;
}

.csc-master-table th,
.csc-master-table td {
  padding: 0 2px;
  height: 16px;
  text-align: center;
  vertical-align: middle;
  box-sizing: border-box;
}

.csc-master-table thead th {
  background: #ffffff;
  color: #000000;
  font-weight: 700;
  line-height: 1.1;
  border: 1px solid #000000;
}

.csc-master-table tbody td {
  border: 1px solid #000000;
}

/* Column Widths */
.th-date {
  width: 28px;
  font-size: 7.5pt;
}

.th-session {
  font-size: 7.5pt;
}

.th-sub {
  font-size: 6.8pt;
  letter-spacing: -0.2px;
  width: 11.75%;
}

/* Middle Gutter Column (Borderless & Seamless Separation) */
.th-gutter,
.td-gutter {
  width: 14px !important;
  min-width: 14px !important;
  max-width: 14px !important;
  border: none !important;
  background: #ffffff !important;
  padding: 0 !important;
}

/* Right Accomplishment Columns */
.th-workload {
  width: 40%;
  font-size: 7.5pt;
}

.th-quantity {
  width: 9%;
  font-size: 7.5pt;
}

/* Table Cells */
.td-date {
  font-weight: 600;
  font-size: 7.5pt;
}

.td-time {
  font-size: 7.5pt;
  font-weight: 500;
  font-family: Arial, sans-serif;
  letter-spacing: -0.2px;
}

.td-dash {
  color: #555555;
  font-size: 7.5pt;
}

.td-merged-center {
  font-weight: 700;
  font-size: 7pt;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.td-saturday,
.td-sunday {
  letter-spacing: 2px;
}

.td-absent {
  letter-spacing: 2px;
}

.td-workload {
  text-align: center;
  font-size: 7pt;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.workload-text-span {
  display: inline-block;
  white-space: nowrap;
}

.td-quantity {
  font-size: 7.5pt;
}

.td-blank {
  background: transparent;
}

/* ========================================================= */
/* FOOTERS ROW & SIGNATORIES                                 */
/* ========================================================= */
.csc-footers-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-top: 4px;
}

.csc-footer-left {
  flex: 1;
}

.csc-footer-gutter {
  width: 14px;
  flex: 0 0 14px;
}

.csc-footer-right {
  flex: 1;
}

.csc-barcode-wrap {
  text-align: center;
  margin: 2px 0 3px;
}

.csc-cert-statement {
  font-size: 6.5pt;
  line-height: 1.15;
  text-align: justify;
  letter-spacing: -0.15px;
}

.csc-signature-block {
  margin-top: 6px;
}

.csc-sig-above {
  font-size: 7.2pt;
  line-height: 1.2;
}

.csc-sig-line {
  border-bottom: 1px solid #000000;
  width: 82%;
  margin: 18px auto 2px;
}

.csc-sig-name {
  font-size: 8.5pt;
  line-height: 1.2;
}

.csc-sig-title {
  font-size: 7.5pt;
  line-height: 1.15;
}

.csc-sig-sub {
  font-size: 7pt;
  line-height: 1.1;
  letter-spacing: 0.5px;
}

.csc-summary-line {
  border-top: 1px dotted #000000;
  padding-top: 3px;
  font-size: 7.5pt;
}

.csc-right-spacer {
  height: 48px; /* Matches left Barcode + Certification height */
}

.csc-bottom-spacer {
  height: 16px; /* Matches left summary counters height */
}

/* ========================================================= */
/* PRINT MEDIA QUERIES                                       */
/* ========================================================= */
@media print {
  /* Hide all non-printable UI elements */
  .no-print,
  :deep(.q-header),
  :deep(.q-drawer),
  :deep(.q-footer),
  :deep(.q-bar),
  :deep(.q-dialog__backdrop) {
    display: none !important;
  }

  @page {
    size: portrait;
    margin: 5mm 6mm !important;
  }

  body, html {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
    color: #000000 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .csc-sheet-wrapper {
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }

  .dtr-dual-page-sheet {
    width: 100% !important;
    page-break-inside: avoid !important;
  }

  .csc-master-table {
    border: none !important;
  }

  .csc-master-table th,
  .csc-master-table td {
    border: 1px solid #000000 !important;
  }

  .th-gutter,
  .td-gutter {
    border: none !important;
    background: #ffffff !important;
  }
}
</style>
