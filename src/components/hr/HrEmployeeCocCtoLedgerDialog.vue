<template>
  <q-dialog
    v-model="dialogModel"
    :maximized="isMaximized"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card
      class="leave-ledger-dialog"
      :class="{ 'leave-ledger-dialog--maximized': isMaximized }"
      :style="dialogStyle"
    >
      <!-- Tagum Green Header Toolbar -->
      <q-card-section
        class="leave-ledger-dialog__header row items-center justify-between text-white q-py-sm q-px-md"
      >
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="receipt_long" size="sm" class="text-green-2" />
          <span class="text-h6 text-weight-bold tracking-wide">COC / CTO Credits Ledger</span>
        </div>

        <div class="row items-center q-gutter-x-xs">
          <!-- Zoom Controls -->
          <div class="zoom-controls row items-center rounded-borders q-px-xs q-mr-sm gt-xs">
            <q-btn
              flat
              round
              dense
              icon="zoom_out"
              color="white"
              size="sm"
              :disable="zoomLevel <= 70"
              title="Zoom out"
              @click="zoomOut"
            />
            <span class="text-caption text-weight-bold text-white q-px-xs select-none"
              >{{ zoomLevel }}%</span
            >
            <q-btn
              flat
              round
              dense
              icon="zoom_in"
              color="white"
              size="sm"
              :disable="zoomLevel >= 160"
              title="Zoom in"
              @click="zoomIn"
            />
            <q-btn
              flat
              round
              dense
              icon="restart_alt"
              color="white"
              size="xs"
              title="Reset Zoom (100%)"
              @click="resetZoom"
            />
          </div>

          <!-- Maximize Toggle -->
          <q-btn
            flat
            round
            dense
            :icon="isMaximized ? 'fullscreen_exit' : 'fullscreen'"
            color="white"
            :title="isMaximized ? 'Restore window size' : 'Maximize window'"
            @click="isMaximized = !isMaximized"
          />
          <q-btn icon="close" flat round dense color="white" v-close-popup />
        </div>
      </q-card-section>

      <!-- Clean Mint Balance Summary Badges Bar -->
      <div
        v-if="!loading"
        class="ledger-balance-sticky-bar row no-wrap items-center justify-between q-px-md q-py-xs bg-green-1"
      >
        <div class="ledger-balance-chips-scroll col row items-center q-gutter-xs no-wrap">
          <span class="ledger-summary-chip text-weight-bold badge-cto">
            <span class="chip-code">CTO Balance:</span>
            <span class="chip-value q-ml-xs">{{ formattedBalanceHoursAndMinutes }}</span>
          </span>
        </div>

        <!-- Page Navigator Indicator -->
        <div
          v-if="renderedPages.length > 1"
          class="ledger-page-nav-pill row items-center q-gutter-x-xs text-caption flex-shrink-0 q-ml-sm"
        >
          <q-btn
            flat
            dense
            round
            icon="chevron_left"
            size="xs"
            color="green-9"
            :disable="activePageIndex <= 0"
            title="Previous page"
            @click="scrollToPage(activePageIndex - 1)"
          />
          <span class="text-weight-bold text-green-10 no-wrap"
            >Page {{ activePageIndex + 1 }} of {{ renderedPages.length }}</span
          >
          <q-btn
            flat
            dense
            round
            icon="chevron_right"
            size="xs"
            color="green-9"
            :disable="activePageIndex >= renderedPages.length - 1"
            title="Next page"
            @click="scrollToPage(activePageIndex + 1)"
          />
        </div>
      </div>

      <!-- Main Stage Body -->
      <q-card-section class="leave-ledger-dialog__body q-pa-none">
        <q-banner v-if="error" dense rounded class="bg-orange-1 text-orange-9 q-ma-md">
          <template #avatar>
            <q-icon name="warning" color="orange-8" />
          </template>
          {{ error }}
        </q-banner>

        <div
          v-if="loading"
          class="leave-ledger-dialog__loading row items-center justify-center q-pa-xl text-grey-8"
        >
          <q-spinner color="primary" size="36px" class="q-mr-sm" />
          <span class="text-subtitle2 text-weight-medium">Loading COC / CTO ledger...</span>
        </div>

        <div v-else class="ledger-preview-stage" ref="stageContainer" @scroll="onStageScroll">
          <div
            class="ledger-preview-pages"
            :style="{ transform: 'scale(' + (zoomLevel / 100) + ')', transformOrigin: 'top center' }"
          >
            <div
              v-for="(pageRows, pageIndex) in renderedPages"
              :id="'coc-ledger-page-' + pageIndex"
              :key="'coc-ledger-page-' + pageIndex"
              class="ledger-sheet ledger-sheet--a4"
              :style="sheetStyle"
            >
              <!-- Official Sheet Identity Header -->
              <div class="ledger-sheet__identity">
                <div class="ledger-sheet__identity-name" :style="identityNameStyle">
                  {{ employeeHeadingName }}
                </div>
                <div class="ledger-sheet__identity-status" :style="identityStatusStyle">
                  {{ employeeHeadingStatus }}
                </div>
                <div class="ledger-sheet__identity-office" :style="identityOfficeStyle">
                  {{ employeeHeadingOffice }}
                </div>
                <div class="ledger-sheet__identity-service">
                  <span
                    class="ledger-sheet__identity-service-value"
                    :style="identityServiceValueStyle"
                  >
                    {{ employeeFirstDayOfService }}
                  </span>
                </div>
              </div>

              <div class="ledger-sheet__header">
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Name</div>
                </div>
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Status</div>
                </div>
                <div class="ledger-sheet__field">
                  <div class="ledger-sheet__label">Division Office</div>
                </div>
                <div class="ledger-sheet__field ledger-sheet__field--service">
                  <div class="ledger-sheet__label">1st Day of Service</div>
                </div>
              </div>

              <!-- Main Official COC / CTO Ledger Table -->
              <div class="ledger-table-wrap">
                <table class="ledger-table">
                  <colgroup>
                    <col style="width: 18%;" />
                    <col style="width: 26%;" />
                    <col style="width: 10%;" />
                    <col style="width: 10%;" />
                    <col style="width: 10%;" />
                    <col style="width: 9%;" />
                    <col style="width: 17%;" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowspan="2" class="ledger-table__primary-head">
                        <span class="ledger-table__stacked-head">
                          Inclusive<br />
                          Dates
                        </span>
                      </th>
                      <th
                        rowspan="2"
                        class="ledger-table__primary-head ledger-table__primary-head--particulars"
                      >
                        <span class="ledger-table__stacked-head">Particulars</span>
                      </th>
                      <th
                        colspan="4"
                        class="ledger-table__section-head ledger-table__section-head--cto"
                      >
                        <span class="ledger-table__stacked-head">COC / CTO</span>
                      </th>
                      <th
                        rowspan="2"
                        class="ledger-table__primary-head ledger-table__primary-head--action"
                      >
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
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in pageRows"
                      :key="entry.key"
                      class="ledger-row"
                      :class="{
                        'ledger-table__row--blank': entry.isBlank,
                        'ledger-table__row--balance-forwarded': entry.isBalanceForwarded,
                      }"
                    >
                      <td class="ledger-table__cell--period">{{ entry.period }}</td>
                      <td class="ledger-table__cell--particulars" :title="entry.particulars">
                        {{ entry.particulars }}
                      </td>
                      <td>
                        <span class="ledger-table__value">
                          {{ entry.earnedTime }}
                        </span>
                      </td>
                      <td>
                        <span class="ledger-table__value">
                          {{ entry.usedTimeWp }}
                        </span>
                      </td>
                      <td>
                        <span class="ledger-table__value ledger-table__value--emphasis">
                          {{ entry.balanceTime }}
                        </span>
                      </td>
                      <td>
                        <span class="ledger-table__value">
                          {{ entry.usedTimeWop }}
                        </span>
                      </td>
                      <td class="ledger-table__cell--action">
                        <span style="white-space: pre-line">{{ entry.actionTaken }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Clean Light Footer -->
      <q-card-actions align="right" class="ledger-dialog-actions q-pa-sm q-px-md bg-white border-top">
        <div class="row items-center q-gutter-x-xs">
          <q-btn
            unelevated
            no-caps
            label="Print Ledger"
            color="secondary"
            icon="print"
            :loading="printing"
            :disable="loading"
            class="text-weight-bold"
            @click="printLedger"
          />
          <q-btn
            flat
            no-caps
            label="Close"
            color="grey-7"
            v-close-popup
          />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'
import { resolveOfficeAcronymLabel } from 'src/utils/office-acronym'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const $q = useQuasar()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  employee: {
    type: Object,
    default: null,
  },
  currentBalance: {
    type: Object,
    default: () => ({ hours: 0, days: 0 }),
  },
  ledgerRows: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isMaximized = ref(false)
const zoomLevel = ref(100)
const activePageIndex = ref(0)
const stageContainer = ref(null)
const printing = ref(false)

const dialogStyle = computed(() => {
  if (isMaximized.value) return {}
  return {
    width: 'min(890px, 96vw)',
    maxWidth: '96vw',
    height: '96vh',
    maxHeight: '96vh',
  }
})

const sheetStyle = computed(() => ({
  width: '794px',
  minHeight: '1123px',
  boxSizing: 'border-box',
  padding: '8px 18px 8px 8px',
}))

const employeeDisplayName = computed(() => {
  const emp = props.employee || {}
  const first = String(emp.firstname || '').trim()
  const middle = String(emp.middlename || '').trim()
  const last = String(emp.surname || '').trim()
  if (first || last) {
    return [last + ',', first, middle].filter(Boolean).join(' ')
  }
  return emp.name || emp.employee_name || 'N/A'
})

const employeeHeadingName = computed(() => employeeDisplayName.value.toUpperCase())

const employeeHeadingStatus = computed(() => {
  const emp = props.employee || {}
  return String(emp.status || emp.employment_status || 'REGULAR').toUpperCase()
})

const employeeHeadingOffice = computed(() => {
  const emp = props.employee || {}
  const acronym = resolveOfficeAcronymLabel(emp)
  if (acronym && acronym !== '-') return acronym.toUpperCase()
  return String(emp.office_acronym || emp.officeAcronym || emp.hrisOfficeAcronym || emp.office || emp.department_name || emp.division_office || 'N/A').toUpperCase()
})

const employeeFirstDayOfService = computed(() => {
  const emp = props.employee || {}
  const rawDate = emp.first_day_of_service || emp.firstDayOfService || emp.date_hired || emp.hire_date || emp.from_date
  if (!rawDate) return 'N/A'
  const d = new Date(rawDate)
  if (Number.isNaN(d.getTime())) return String(rawDate)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
})

const identityNameStyle = computed(() => ({
  fontSize: employeeHeadingName.value.length > 28 ? '0.72rem' : '0.82rem',
}))
const identityStatusStyle = computed(() => ({
  fontSize: employeeHeadingStatus.value.length > 12 ? '0.70rem' : '0.80rem',
}))
const identityOfficeStyle = computed(() => ({
  fontSize: employeeHeadingOffice.value.length > 20 ? '0.70rem' : '0.80rem',
}))
const identityServiceValueStyle = computed(() => ({
  fontSize: employeeFirstDayOfService.value.length > 18 ? '0.70rem' : '0.80rem',
}))

function formatHoursAndMinutes(hoursVal, minsVal) {
  let totalMinutes = 0
  if (minsVal != null && Number.isFinite(Number(minsVal))) {
    totalMinutes = Math.round(Number(minsVal))
  } else if (hoursVal != null && Number.isFinite(Number(hoursVal))) {
    totalMinutes = Math.round(Number(hoursVal) * 60)
  } else {
    return ''
  }

  if (totalMinutes === 0) return '0 hrs'

  const absMinutes = Math.abs(totalMinutes)
  const h = Math.floor(absMinutes / 60)
  const m = absMinutes % 60

  let formatted = ''
  if (h > 0 && m > 0) {
    formatted = h + ' hrs ' + m + ' mins'
  } else if (h > 0) {
    formatted = h + ' hrs'
  } else {
    formatted = m + ' mins'
  }

  return totalMinutes < 0 ? ('-' + formatted) : formatted
}

const formattedBalanceHoursAndMinutes = computed(() => {
  const hours = Number(props.currentBalance?.hours ?? 0)
  return formatHoursAndMinutes(hours)
})

// const formattedBalanceDays = computed(() => {
//   const days = Number(props.currentBalance?.days ?? 0)
//   return Number.isFinite(days) ? days.toFixed(3) : '0.000'
// })

const BLANK_ROW_TEMPLATE = Object.freeze({
  period: '',
  particulars: '',
  earnedTime: '',
  usedTimeWp: '',
  balanceTime: '',
  usedTimeWop: '',
  actionTaken: '',
  isBlank: true,
  isBalanceForwarded: false,
})

const normalizedRows = computed(() => {
  const sourceRows = Array.isArray(props.ledgerRows) ? props.ledgerRows : []
  return sourceRows.map((entry, index) => {
    const period = formatInclusiveDates(entry) || entry.period || entry.action_date || ''
    const particulars = entry.particulars || ''

    const earnedTime = entry.earned_hours != null && entry.earned_hours > 0
      ? formatHoursAndMinutes(entry.earned_hours, entry.earned_minutes)
      : ''
    const usedTimeWp = entry.used_hours != null && entry.used_hours > 0
      ? ('-' + formatHoursAndMinutes(entry.used_hours, entry.used_minutes))
      : ''
    const balanceTime = entry.balance_hours != null
      ? formatHoursAndMinutes(entry.balance_hours, entry.balance_minutes)
      : ''
    const usedTimeWop = entry.used_hours_wop != null && entry.used_hours_wop > 0
      ? formatHoursAndMinutes(entry.used_hours_wop, entry.used_minutes_wop)
      : ''
    const actionTaken = entry.action_taken || ''

    return {
      key: entry.id || ('coc-row-' + index),
      period,
      particulars,
      earnedTime,
      usedTimeWp,
      balanceTime,
      usedTimeWop,
      actionTaken,
      isBlank: false,
      isBalanceForwarded: Boolean(entry.is_balance_forwarded),
      raw: entry,
    }
  })
})

const renderedPages = computed(() => {
  const rowsPerPage = 46
  const rows = normalizedRows.value
  const pages = []

  if (rows.length === 0) {
    const blankRows = []
    for (let i = 0; i < rowsPerPage; i++) {
      blankRows.push({ ...BLANK_ROW_TEMPLATE, key: 'blank-0-' + i })
    }
    return [blankRows]
  }

  for (let i = 0; i < rows.length; i += rowsPerPage) {
    const slice = rows.slice(i, i + rowsPerPage)
    const needed = rowsPerPage - slice.length
    for (let j = 0; j < needed; j++) {
      slice.push({ ...BLANK_ROW_TEMPLATE, key: 'blank-' + i + '-' + j })
    }
    pages.push(slice)
  }

  return pages
})

function zoomIn() {
  if (zoomLevel.value < 160) zoomLevel.value += 15
}

function zoomOut() {
  if (zoomLevel.value > 70) zoomLevel.value -= 15
}

function resetZoom() {
  zoomLevel.value = 100
}

function scrollToPage(index) {
  if (index < 0 || index >= renderedPages.value.length) return
  activePageIndex.value = index
  const el = document.getElementById('coc-ledger-page-' + index)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function onStageScroll(e) {
  const container = e.target
  if (!container) return

  const pages = container.querySelectorAll('.ledger-sheet')
  if (!pages || pages.length === 0) return

  let closestIndex = 0
  let minDistance = Infinity
  const containerRect = container.getBoundingClientRect()
  const containerCenter = containerRect.top + containerRect.height / 2

  pages.forEach((page, index) => {
    const rect = page.getBoundingClientRect()
    const pageCenter = rect.top + rect.height / 2
    const distance = Math.abs(containerCenter - pageCenter)
    if (distance < minDistance) {
      minDistance = distance
      closestIndex = index
    }
  })

  if (activePageIndex.value !== closestIndex) {
    activePageIndex.value = closestIndex
  }
}

function formatInclusiveDates(row) {
  if (!row) return ''
  const rawDates = row.inclusive_dates || row.selected_dates || []
  if (Array.isArray(rawDates) && rawDates.length > 0) {
    const parsedList = rawDates
      .map((d) => {
        if (!d) return null
        const dateObj = new Date(d)
        if (Number.isNaN(dateObj.getTime())) return null
        return {
          date: dateObj,
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
          monthLabel: dateObj.toLocaleDateString('en-US', { month: 'long' }),
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (parsedList.length > 0) {
      if (parsedList.length === 1) {
        return parsedList[0].monthLabel + ' ' + parsedList[0].day + ', ' + parsedList[0].year
      }
      const allSameMonthYear = parsedList.every(
        (p) => p.year === parsedList[0].year && p.month === parsedList[0].month
      )
      if (allSameMonthYear) {
        const startDay = parsedList[0].day
        const endDay = parsedList[parsedList.length - 1].day
        if (startDay === endDay) {
          return parsedList[0].monthLabel + ' ' + startDay + ', ' + parsedList[0].year
        }
        return parsedList[0].monthLabel + ' ' + startDay + '-' + endDay + ', ' + parsedList[0].year
      }
      const first = parsedList[0]
      const last = parsedList[parsedList.length - 1]
      return first.monthLabel + ' ' + first.day + ', ' + first.year + ' - ' + last.monthLabel + ' ' + last.day + ', ' + last.year
    }
  }

  if (row.inclusive_start_date && row.inclusive_end_date) {
    const s = new Date(row.inclusive_start_date)
    const e = new Date(row.inclusive_end_date)
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      const sMonth = s.toLocaleDateString('en-US', { month: 'long' })
      const eMonth = e.toLocaleDateString('en-US', { month: 'long' })
      if (s.getFullYear() === e.getFullYear()) {
        if (s.getMonth() === e.getMonth()) {
          if (s.getDate() === e.getDate()) {
            return sMonth + ' ' + s.getDate() + ', ' + s.getFullYear()
          }
          return sMonth + ' ' + s.getDate() + '-' + e.getDate() + ', ' + s.getFullYear()
        }
        return sMonth + ' ' + s.getDate() + ' - ' + eMonth + ' ' + e.getDate() + ', ' + s.getFullYear()
      }
      return sMonth + ' ' + s.getDate() + ', ' + s.getFullYear() + ' - ' + eMonth + ' ' + e.getDate() + ', ' + s.getFullYear()
    }
  }

  if (row.period) return row.period
  if (row.action_date) {
    const d = new Date(row.action_date)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
  }
  return ''
}

function printLedger() {
  if (!props.employee) {
    $q.notify({
      type: 'warning',
      message: 'Select an employee ledger to print first.',
      position: 'top',
    })
    return
  }

  printing.value = true

  try {
    const docDefinition = buildCocCtoLedgerPdfDocDefinition()
    pdfMake.createPdf(docDefinition).print()
    $q.notify({
      type: 'positive',
      message: 'Preparing COC / CTO Ledger for print.',
      position: 'top',
    })
  } catch (err) {
    const message = resolveApiErrorMessage(err, 'Unable to print COC / CTO ledger right now.')
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    printing.value = false
  }
}

function buildCocCtoLedgerPdfDocDefinition() {
  const pages = renderedPages.value
  const tableWidths = ['18%', '26%', '10%', '10%', '10%', '9%', '17%']

  const content = pages.map((pageRows, pageIndex) => {
    const isLastPage = pageIndex === pages.length - 1
    return {
      stack: [
        // Top Identity Header
        {
          table: {
            widths: ['34%', '13%', '29%', '24%'],
            body: [
              [
                { text: employeeHeadingName.value, fontSize: 8, bold: true, alignment: 'center' },
                { text: employeeHeadingStatus.value, fontSize: 8, bold: true, alignment: 'center' },
                { text: employeeHeadingOffice.value, fontSize: 8, bold: true, alignment: 'center' },
                { text: employeeFirstDayOfService.value, fontSize: 8, bold: true, alignment: 'center' },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 0, 0, 2],
        },
        {
          table: {
            widths: ['34%', '13%', '29%', '24%'],
            body: [
              [
                { text: 'Name', fontSize: 7, bold: true, alignment: 'center' },
                { text: 'Status', fontSize: 7, bold: true, alignment: 'center' },
                { text: 'Division Office', fontSize: 7, bold: true, alignment: 'center' },
                { text: '1st Day of Service', fontSize: 7, bold: true, alignment: 'center' },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.75,
            vLineWidth: () => 0,
            hLineColor: () => '#000000',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 0, 0, 0],
        },
        // Main Table
        {
          table: {
            headerRows: 2,
            widths: tableWidths,
            body: buildPdfTableBody(pageRows),
          },
          layout: {
            hLineWidth: (i) => (i === 0 ? 0 : 0.75),
            vLineWidth: () => 0.75,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 3,
            paddingRight: () => 3,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
        },
      ],
      pageBreak: isLastPage ? undefined : 'after',
    }
  })

  return {
    pageSize: 'A4',
    pageMargins: [8, 18, 8, 8],
    info: {
      title: 'COC / CTO Ledger - ' + employeeDisplayName.value,
      author: 'LMS Frontend',
      subject: 'Compensatory Overtime Credits & CTO Ledger',
    },
    content,
    defaultStyle: {
      fontSize: 7.2,
      color: '#000000',
    },
  }
}

function buildPdfTableBody(pageRows) {
  const body = [
    [
      { text: 'Inclusive\nDates', rowSpan: 2, fontSize: 6.8, bold: true, alignment: 'center' },
      { text: 'Particulars', rowSpan: 2, fontSize: 6.8, bold: true, alignment: 'center' },
      { text: 'COC / CTO', colSpan: 4, fontSize: 6.8, bold: true, alignment: 'center' },
      {},
      {},
      {},
      { text: 'Date & Action\nTaken on Application\nfor Leave', rowSpan: 2, fontSize: 6.0, bold: true, alignment: 'center' },
    ],
    [
      {},
      {},
      { text: 'Earned', fontSize: 6.2, bold: true, alignment: 'center' },
      { text: 'Abs.\nUnd.\nW/P', fontSize: 5.8, bold: true, alignment: 'center' },
      { text: 'Bal.', fontSize: 6.2, bold: true, alignment: 'center' },
      { text: 'Abs.\nUnd.\nW/oP', fontSize: 5.8, bold: true, alignment: 'center' },
      {},
    ],
  ]

  pageRows.forEach((entry) => {
    body.push([
      { text: entry.period || '', fontSize: 6.8, alignment: 'center' },
      { text: entry.particulars || '', fontSize: 6.8, alignment: 'center' },
      { text: entry.earnedTime || '', fontSize: 6.8, alignment: 'center' },
      { text: entry.usedTimeWp || '', fontSize: 6.8, alignment: 'center' },
      { text: entry.balanceTime || '', fontSize: 6.8, bold: true, alignment: 'center' },
      { text: entry.usedTimeWop || '', fontSize: 6.8, alignment: 'center' },
      { text: entry.actionTaken || '', fontSize: 6.2, alignment: 'center' },
    ])
  })

  return body
}
</script>

<style scoped>
.leave-ledger-dialog {
  width: min(890px, 96vw);
  max-width: 96vw;
  max-height: 96vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25);
}

.leave-ledger-dialog--maximized {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh !important;
  max-height: 100vh !important;
  border-radius: 0 !important;
}

.leave-ledger-dialog__header {
  background: linear-gradient(135deg, #1b5e20 0%, #14532d 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.zoom-controls {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.ledger-balance-sticky-bar {
  border-bottom: 1px solid #dcfce7;
  min-height: 40px;
  background: #f0fdf4;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
}

.ledger-balance-chips-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1 1 auto;
  min-width: 0;
  scrollbar-width: thin;
  padding-bottom: 2px;
}

.ledger-balance-chips-scroll::-webkit-scrollbar {
  height: 4px;
}

.ledger-balance-chips-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.ledger-page-nav-pill {
  flex-shrink: 0;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 2px 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .ledger-balance-sticky-bar {
    padding-left: 8px;
    padding-right: 8px;
    gap: 6px;
  }

  .ledger-page-nav-pill {
    padding: 1px 6px;
    font-size: 0.72rem;
  }
}

.ledger-summary-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.73rem;
  padding: 3px 10px;
  border-radius: 999px;
  line-height: 1.1;
  white-space: nowrap;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.badge-cto {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}

.badge-other {
  background: #ffffff;
  color: #000000;
  border: 1px solid #cbd5e1;
}

.ledger-summary-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.leave-ledger-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
}

.leave-ledger-dialog__loading {
  flex: 1 1 auto;
  min-height: 0;
  background: #f1f5f9;
  color: #475569;
}

.ledger-preview-stage {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  background: #e2e8f0;
}

.ledger-preview-pages {
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: center;
  padding: 8px 0 32px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ledger-sheet {
  margin: 0 auto;
  border: 1px solid #000000;
  overflow: hidden;
  background: #ffffff;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.15),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  font-family: 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  border-radius: 2px;
}

.ledger-sheet__identity {
  display: grid;
  grid-template-columns: 34% 13% 29% 24%;
  align-items: center;
  column-gap: 0;
  min-height: 40px;
  padding: 8px 12px 4px;
  border-bottom: 1.5px solid #000000;
}

.ledger-sheet__identity-name,
.ledger-sheet__identity-status,
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

.ledger-sheet__identity-status {
  text-align: center;
  letter-spacing: 0.005em;
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
  grid-template-columns: 34% 13% 29% 24%;
  border-bottom: 1.5px solid #000000;
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
  flex: 1 1 auto;
  display: flex;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  height: 100%;
}

.ledger-table th,
.ledger-table td {
  border: 1px solid #000000;
  padding: 2px 3px;
  font-size: 0.68rem;
  line-height: 1.05;
  vertical-align: middle;
  color: #000000;
  text-align: center;
}

.ledger-table th {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: #f8fafc;
  color: #000000;
  padding: 0;
  border: 1px solid #000000;
}

.ledger-table thead tr:first-child th {
  height: 22px;
}

.ledger-table thead tr:nth-child(2) th {
  height: 36px;
}

.ledger-table thead tr:nth-child(2) .ledger-table__stacked-head {
  font-size: 0.60rem;
  line-height: 0.98;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table td {
  padding: 2px 4px;
}

.ledger-table tbody tr {
  height: 22px;
  transition: background-color 0.12s ease;
}

.ledger-table tbody tr:hover td {
  background-color: #e6f4ea !important;
}

.ledger-table__row--blank td {
  background: #ffffff;
}

.ledger-table__row--balance-forwarded td {
  background: #f8fafc;
  font-weight: 700;
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
  color: #000000;
}

.ledger-table__value--emphasis {
  color: #000000;
  font-weight: 700;
}

.ledger-table__cell--period,
.ledger-table__cell--particulars,
.ledger-table__cell--action {
  text-align: center !important;
}

.ledger-table__cell--particulars {
  font-size: 0.62rem;
  line-height: 1;
  font-weight: 600;
  word-wrap: break-word;
  word-break: break-word;
}

.ledger-table__primary-head--particulars .ledger-table__stacked-head {
  font-size: 0.62rem;
  letter-spacing: 0.01em;
}

.ledger-table__primary-head--action .ledger-table__stacked-head {
  font-size: 0.56rem;
  line-height: 0.94;
  letter-spacing: 0.01em;
  padding: 1px 1px;
}

.ledger-table__cell--period {
  font-weight: 600;
  white-space: pre-line;
}

.ledger-table__cell--action {
  white-space: pre-line;
  font-weight: 600;
}

.border-top {
  border-top: 1px solid #cbd5e1;
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
  .ledger-sheet__identity-status,
  .ledger-sheet__identity-office,
  .ledger-sheet__identity-service {
    text-align: center;
    justify-content: center;
  }

  .ledger-dialog-actions {
    align-items: stretch;
  }
}
</style>
