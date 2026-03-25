<template>
  <q-page class="q-pa-md reports-page">
    <div class="q-mb-lg">
      <div class="row items-start justify-between q-col-gutter-md">
        <div class="col-12 col-md">
          <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Reports Monitoring</h1>
          <p class="text-body2 text-grey-7 q-mb-none">
            Select a report type, apply filters, and generate outputs.
          </p>
        </div>
        <div class="col-12 col-md-auto">
          <div class="row no-wrap q-gutter-sm justify-end items-center report-header-actions">
            <q-btn
              outline
              color="primary"
              icon="print"
              label="Print"
              no-caps
              @click="handlePrintReport"
            />
            <q-btn-dropdown
              unelevated
              color="primary"
              icon="file_download"
              label="Export Report"
              no-caps
            >
              <q-list dense>
                <q-item clickable v-close-popup @click="handleExportPdf">
                  <q-item-section avatar>
                    <q-icon name="picture_as_pdf" color="negative" />
                  </q-item-section>
                  <q-item-section>Export as PDF</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="handleExportCsv">
                  <q-item-section avatar>
                    <q-icon name="article" color="primary" />
                  </q-item-section>
                  <q-item-section>Export as CSV</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="handleExportExcel">
                  <q-item-section avatar>
                    <q-icon name="table_view" color="secondary" />
                  </q-item-section>
                  <q-item-section>Export as Excel</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>
        </div>
      </div>
    </div>

    <q-card flat bordered class="report-section-card q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Report Selector and Filters</div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-select
              v-model="selectedReportType"
              :options="reportTypeOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Report Type"
            />
          </div>

          <div class="col-6 col-md-2">
            <q-select
              v-model="filters.month"
              :options="monthOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Month"
            />
          </div>

          <div class="col-6 col-md-2">
            <q-select
              v-model="filters.year"
              :options="yearOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Year"
            />
          </div>

          <div class="col-12 col-md-2">
            <q-select
              v-model="filters.office"
              :options="officeOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Office"
            />
          </div>

          <div class="col-12 col-md-2">
            <q-select
              v-model="filters.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              emit-value
              map-options
              outlined
              dense
              label="Status"
            />
          </div>

          <div v-if="selectedReportType === 'leaveBalances'" class="col-12">
            <div class="text-caption text-grey-8 q-mb-xs">Show Column Group</div>
            <q-option-group
              v-model="leaveBalanceVisibleGroups"
              :options="leaveBalanceColumnGroupOptions"
              type="checkbox"
              color="primary"
              inline
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="report-section-card">
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-md">
          <div class="text-h6">{{ selectedReport.label }}</div>
          <div class="text-caption text-grey-7">
            Showing {{ filteredRows.length }} record(s)
          </div>
        </div>
        <div class="col-12 col-md-4">
          <q-input
            v-model.trim="filters.employeeName"
            outlined
            dense
            clearable
            :debounce="300"
            label="Employee Name (search)"
            placeholder="Type employee name..."
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-pa-sm report-table-card-section">
        <component
          :is="selectedReport.component"
          :rows="filteredRows"
          :columns="columns"
          :loading="loading"
          :min-width="tableMinWidth"
        />
      </q-card-section>
    </q-card>

    <q-dialog v-model="showPrintDialog" persistent>
      <q-card style="width: 95vw; max-width: 760px" class="rounded-borders">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Print Signatories</div>
          <q-space />
          <q-btn icon="close" flat round dense :disable="printingReport" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-sm">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model.trim="printSignatories.preparedByName"
                outlined
                dense
                label="PREPARED BY"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model.trim="printSignatories.preparedByPosition"
                outlined
                dense
                label="POSITION"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model.trim="printSignatories.reviewedByName"
                outlined
                dense
                label="REVIEWED BY"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model.trim="printSignatories.reviewedByPosition"
                outlined
                dense
                label="POSITION"
              />
            </div>

            <div class="col-12 col-md-6">
              <q-input
                v-model.trim="printSignatories.notedByName"
                outlined
                dense
                label="NOTED BY"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model.trim="printSignatories.notedByPosition"
                outlined
                dense
                label="POSITION"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps color="grey-7" label="Cancel" :disable="printingReport" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="print"
            label="Print Report"
            :loading="printingReport"
            @click="confirmPrintReport"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, unref, watch } from 'vue'
import { useQuasar } from 'quasar'
import LwopReportTable from 'components/report/LwopReportTable.vue'
import LeaveBalancesReportTable from 'components/report/LeaveBalancesReportTable.vue'
import MonetizationReportTable from 'components/report/MonetizationReportTable.vue'
import CtoAvailmentReportTable from 'components/report/CtoAvailmentReportTable.vue'
import CocBalancesReportTable from 'components/report/CocBalancesReportTable.vue'
import LeaveAvailmentPerOfficeReportTable from 'components/report/LeaveAvailmentPerOfficeReportTable.vue'
import { generateReportsMonitoringPdf } from 'src/utils/reports-monitoring-pdf'
import {
  exportReportsMonitoringCsv,
  exportReportsMonitoringExcel,
} from 'src/utils/reports-monitoring-export'
import { useReportStore } from 'stores/reportStore'   

const reportStore = useReportStore()
const $q = useQuasar()
const loading = ref(false)
const selectedReportType = ref('lwop')
let loadingTimeoutId = null
const showPrintDialog = ref(false)
const printingReport = ref(false)

const defaultPrintSignatories = {
  preparedByName: 'REYNALDO D. CASAS',
  preparedByPosition: 'HRMO III',
  reviewedByName: 'WARREN JAMES D. NAVARRO, CPA',
  reviewedByPosition: 'Supervising Administrative Officer',
  notedByName: 'JANYLENE A. PALERMO, MM',
  notedByPosition: 'City Human Resource Mgt. Officer',
}

const printSignatories = reactive({ ...defaultPrintSignatories })

const filters = reactive({
  month: null,
  year: null,
  office: null,
  status: null,
  employeeName: '',
})

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const monthOptions = [
  { label: 'All Months', value: null },
  ...monthNames.map((month, index) => ({
    label: month,
    value: index + 1,
  })),
]

const OFFICE_ACRONYM_STOP_WORDS = new Set([
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

function toOfficeCode(value) {
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
    (word) => !OFFICE_ACRONYM_STOP_WORDS.has(word) && !/^\d+$/.test(word),
  )
  const selectedWords = acronymWords.length ? acronymWords : words
  const acronym = selectedWords.map((word) => word[0]).join('')

  return acronym || source
}

function getOfficeColumnValue(row) {
  return toOfficeCode(row?.office)
}

const leaveBalanceColumnGroupOptions = [
  { label: 'Running Balance of Earned Leave Credits', value: 'runningBalance' },
  { label: 'Annual Balance', value: 'annualBalance' },
  { label: 'Total No. of Days per Type of Leave Availment', value: 'daysAvailment' },
  { label: 'Total No. of Balances per Type of Leave', value: 'totalBalances' },
]

const leaveBalanceColumnGroups = {
  runningBalance: ['runningBalanceVl', 'runningBalanceSl'],
  annualBalance: ['annualBalanceMcCo', 'annualBalanceWlp', 'annualBalanceOthers'],
  daysAvailment: ['daysVlFl', 'daysSl', 'daysMcCo', 'daysWlp', 'daysOthers'],
  totalBalances: ['balanceVl', 'balanceSl', 'balanceFl', 'balanceMcCo', 'balanceWlp', 'balanceOthers'],
}

const leaveBalanceAllGroupValues = leaveBalanceColumnGroupOptions.map((option) => option.value)
const leaveBalanceDefaultVisibleGroups = ['runningBalance']
const leaveBalanceVisibleGroups = ref([...leaveBalanceDefaultVisibleGroups])

const orderedLeaveBalanceVisibleGroups = computed(() => {
  const selectedGroups = new Set(leaveBalanceVisibleGroups.value)
  return leaveBalanceAllGroupValues.filter((groupValue) => selectedGroups.has(groupValue))
})

watch(leaveBalanceVisibleGroups, (groups) => {
  const normalizedInputGroups = Array.isArray(groups) ? groups : []
  const selectedGroups = new Set(normalizedInputGroups)
  const normalizedGroups = leaveBalanceAllGroupValues.filter((groupValue) =>
    selectedGroups.has(groupValue),
  )

  const hasSameOrder =
    normalizedGroups.length === normalizedInputGroups.length &&
    normalizedGroups.every((groupValue, index) => groupValue === normalizedInputGroups[index])

  if (!hasSameOrder) {
    leaveBalanceVisibleGroups.value = normalizedGroups
  }
})


const lwopRows = computed(() => reportStore.lwopReports)
const leaveBalancesRows = computed(() => reportStore.leaveBalanceReports)
const monetizationRows = computed(() => reportStore.monetizationReports)
const ctoAvailmentRows = computed(() => reportStore.ctoAvailmentReports)
const cocBalancesRows = computed(() => reportStore.cocBalanceReports)
const leaveAvailmentRows = computed(() => reportStore.leaveAvailmentReports)
// Mapping of report types to their configurations
const reportConfigs = {
  lwop: {
    label: 'Leave Without Pay (LWOP) Report',
    component: LwopReportTable,
    rows: lwopRows,
    minTableWidth: '1200px',
    metricField: 'totalDaysLWOP',
    metricUnit: 'days',
    balanceField: null,
    columns: [
      { name: 'no', label: 'No.', field: 'no', align: 'left' },
      { name: 'name', label: 'Name', field: 'name', align: 'left' },
      { name: 'office', label: 'Office', field: getOfficeColumnValue, align: 'left' },
      { name: 'status', label: 'Status', field: 'status', align: 'left' },
      {
        name: 'periodIncurred',
        label: 'Period Incurred',
        field: 'periodIncurred',
        align: 'left',
      },
      {
        name: 'typeOfLeave',
        label: 'Type of Leave',
        field: 'typeOfLeave',
        align: 'left',
      },
      {
        name: 'totalDaysLWOP',
        label: 'Total No. of Days LWOP',
        field: 'totalDaysLWOP',
        align: 'right',
      },
      {
        name: 'dateReceivedCHRMO',
        label: 'Date Received at CHRMO',
        field: 'dateReceivedCHRMO',
        align: 'left',
      },
      { name: 'remarks', label: 'Remarks', field: 'remarks', align: 'left' },
    ],
  },
  leaveBalances: {
    label: 'Report of Leave Balances of Employees per Office',
    component: LeaveBalancesReportTable,
    rows: leaveBalancesRows,
    minTableWidth: '2350px',
    metricField: 'totalNoLeave',
    metricUnit: 'days',
    balanceField: 'totalNoLeave',
    balanceUnit: 'days',
    columns: [
      { name: 'no', label: 'No.', field: 'no', align: 'left' },
      { name: 'name', label: 'Name', field: 'name', align: 'left' },
      {
        name: 'designation',
        label: 'Designation',
        field: 'designation',
        align: 'left',
      },
      { name: 'status', label: 'Status', field: 'status', align: 'left' },
      {
        name: 'runningBalanceVl',
        label: 'Running Balance VL',
        field: 'runningBalanceVl',
        align: 'right',
      },
      {
        name: 'runningBalanceSl',
        label: 'Running Balance SL',
        field: 'runningBalanceSl',
        align: 'right',
      },
      {
        name: 'annualBalanceMcCo',
        label: 'Annual Balance MCO6',
        field: 'annualBalanceMcCo',
        align: 'right',
      },
      {
        name: 'annualBalanceWlp',
        label: 'Annual Balance WLP',
        field: 'annualBalanceWlp',
        align: 'right',
      },
      {
        name: 'annualBalanceOthers',
        label: 'Annual Balance Others',
        field: 'annualBalanceOthers',
        align: 'right',
      },
      {
        name: 'daysVlFl',
        label: 'Days VL/FL',
        field: 'daysVlFl',
        align: 'right',
      },
      {
        name: 'daysSl',
        label: 'Days SL',
        field: 'daysSl',
        align: 'right',
      },
      {
        name: 'daysMcCo',
        label: 'Days MCO6',
        field: 'daysMcCo',
        align: 'right',
      },
      {
        name: 'daysWlp',
        label: 'Days WLP',
        field: 'daysWlp',
        align: 'right',
      },
      {
        name: 'daysOthers',
        label: 'Days Others',
        field: 'daysOthers',
        align: 'right',
      },
      {
        name: 'balanceVl',
        label: 'Balance VL',
        field: 'balanceVl',
        align: 'right',
      },
      {
        name: 'balanceSl',
        label: 'Balance SL',
        field: 'balanceSl',
        align: 'right',
      },
      {
        name: 'balanceFl',
        label: 'Balance FL',
        field: 'balanceFl',
        align: 'right',
      },
      {
        name: 'balanceMcCo',
        label: 'Balance MCO6',
        field: 'balanceMcCo',
        align: 'right',
      },
      {
        name: 'balanceWlp',
        label: 'Balance WLP',
        field: 'balanceWlp',
        align: 'right',
      },
      {
        name: 'balanceOthers',
        label: 'Balance Others',
        field: 'balanceOthers',
        align: 'right',
      },
      {
        name: 'totalNoLeave',
        label: 'Total No. Leave',
        field: 'totalNoLeave',
        align: 'right',
      },
      { name: 'remarks', label: 'Remarks', field: 'remarks', align: 'left' },
    ],
  },
  monetization: {
    label: 'Report of Availment for Monetization',
    component: MonetizationReportTable,
    rows: monetizationRows,
    minTableWidth: '1200px',
    metricField: 'totalDays',
    metricUnit: 'days',
    balanceField: null,
    columns: [
      { name: 'no', label: 'No.', field: 'no', align: 'left' },
      {
        name: 'dateReceivedHRMO',
        label: 'Date Received at HRMO',
        field: 'dateReceivedHRMO',
        align: 'left',
      },
      {
        name: 'dateOfFiling',
        label: 'Date of Filing',
        field: 'dateOfFiling',
        align: 'left',
      },
      { name: 'name', label: 'Name', field: 'name', align: 'left' },
      {
        name: 'designation',
        label: 'Designation',
        field: 'designation',
        align: 'left',
      },
      { name: 'status', label: 'Status', field: 'status', align: 'left' },
      { name: 'office', label: 'Office', field: getOfficeColumnValue, align: 'left' },
      { name: 'totalDays', label: 'Total Days', field: 'totalDays', align: 'right' },
      { name: 'remarks', label: 'Remarks', field: 'remarks', align: 'left' },
    ],
  },
  ctoAvailment: {
    label: 'Report for Compensatory Time Off (CTO) Availment',
    component: CtoAvailmentReportTable,
    rows: ctoAvailmentRows,
    minTableWidth: '1700px',
    metricField: 'totalHoursFiled',
    metricUnit: 'hours',
    balanceField: 'cocBalanceApproved',
    balanceUnit: 'hours',
    columns: [
      { name: 'no', label: 'No.', field: 'no', align: 'left' },
      { name: 'dateFiled', label: 'Date Filed', field: 'dateFiled', align: 'left' },
      { name: 'name', label: 'Name', field: 'name', align: 'left' },
      {
        name: 'designation',
        label: 'Designation',
        field: 'designation',
        align: 'left',
      },
      { name: 'office', label: 'Office', field: getOfficeColumnValue, align: 'left' },
      {
        name: 'status',
        label: 'Employment Status',
        field: 'status',
        align: 'left',
      },
      {
        name: 'totalDaysApplied',
        label: 'Total Number of Days Applied for CTO',
        field: 'totalDaysApplied',
        align: 'right',
      },
      {
        name: 'inclusiveDates',
        label: 'Inclusive Dates of CTO Application',
        field: 'inclusiveDates',
        align: 'left',
      },
      {
        name: 'earnedCocHoursAsOf',
        label: 'Certificate of\nEarned coc hours\nas of',
        field: 'earnedCocHoursAsOf',
        align: 'right',
      },
      {
        name: 'runningCocBalance',
        label: 'Running COC Balance as to Date Filed',
        field: 'runningCocBalance',
        align: 'right',
      },
      {
        name: 'totalHoursFiled',
        label: 'Total Number of Hours Filed for CTO',
        field: 'totalHoursFiled',
        align: 'right',
      },
      {
        name: 'cocBalanceApproved',
        label: 'COC Balance as to Application Approved',
        field: 'cocBalanceApproved',
        align: 'right',
      },
      { name: 'remarks', label: 'Remarks', field: 'remarks', align: 'left' },
    ],
  },
  cocBalances: {
    label: 'Report of Compensatory Overtime Credit (COC) Balances',
    component: CocBalancesReportTable,
    rows: cocBalancesRows,
    minTableWidth: '1200px',
    metricField: 'totalBalanceHours',
    metricUnit: 'hours',
    balanceField: 'totalBalanceHours',
    balanceUnit: 'hours',
    columns: [
      { name: 'no', label: 'No.', field: 'no', align: 'left' },
      { name: 'name', label: 'Name', field: 'name', align: 'left' },
      {
        name: 'designation',
        label: 'Designation',
        field: 'designation',
        align: 'left',
      },
      { name: 'status', label: 'Status', field: 'status', align: 'left' },
      { name: 'office', label: 'Office', field: getOfficeColumnValue, align: 'left' },
      {
        name: 'totalBalanceHours',
        label: 'Total Balance (Hours)',
        field: 'totalBalanceHours',
        align: 'right',
      },
      {
        name: 'monthYearEarned',
        label: 'Month and Year Earned',
        field: 'monthYearEarned',
        align: 'left',
      },
      {
        name: 'monthYearExpired',
        label: 'Month and Year Expired',
        field: 'monthYearExpired',
        align: 'left',
      },
      { name: 'remarks', label: 'Remarks', field: 'remarks', align: 'left' },
    ],
  },
  leaveAvailmentPerOffice: {
    label: 'Report of Availment for Leave Application per Office',
    component: LeaveAvailmentPerOfficeReportTable,
    rows: leaveAvailmentRows,
    minTableWidth: '1320px',
    metricField: 'totalNoLeave',
    metricUnit: 'days',
    balanceField: null,
    columns: [
      { name: 'no', label: 'No.', field: 'no', align: 'left' },
      { name: 'name', label: 'Name', field: 'name', align: 'left' },
      {
        name: 'designation',
        label: 'Designation',
        field: 'designation',
        align: 'left',
      },
      { name: 'status', label: 'Status', field: 'status', align: 'left' },
      { name: 'office', label: 'Office', field: getOfficeColumnValue, align: 'left' },
      { name: 'vlFl', label: 'VL/FL', field: 'vlFl', align: 'right' },
      { name: 'sl', label: 'SL', field: 'sl', align: 'right' },
      { name: 'mcCo', label: 'MCO6', field: 'mcCo', align: 'right' },
      { name: 'wlp', label: 'WLP', field: 'wlp', align: 'right' },
      { name: 'others', label: 'Others', field: 'others', align: 'right' },
      {
        name: 'totalNoLeave',
        label: 'Total No. Leave',
        field: 'totalNoLeave',
        align: 'right',
      },
      { name: 'remarks', label: 'Remarks', field: 'remarks', align: 'left' },
    ],
  },
}

async function ensureSelectedReportLoaded() {
  loading.value = true

  try {
    await reportStore.ensureReportLoaded(selectedReportType.value)
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Unable to load the selected report right now.',
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void ensureSelectedReportLoaded()
})

const reportTypeOptions = Object.entries(reportConfigs).map(([value, config]) => ({
  label: config.label,
  value,
}))

const selectedReport = computed(() => reportConfigs[selectedReportType.value] || reportConfigs.lwop)
const selectedReportRows = computed(() => {
  const rowsSource = selectedReport.value.rows
  const normalizedRows = Array.isArray(rowsSource) ? rowsSource : unref(rowsSource)
  return Array.isArray(normalizedRows) ? normalizedRows : []
})
const isLeaveBalancesReport = computed(() => selectedReportType.value === 'leaveBalances')

const leaveBalanceVisibleColumnNames = computed(() => {
  if (!isLeaveBalancesReport.value) return []

  const selectedGroupColumns = orderedLeaveBalanceVisibleGroups.value.flatMap(
    (groupName) => leaveBalanceColumnGroups[groupName] || [],
  )

  return [
    'no',
    'name',
    'designation',
    'status',
    ...selectedGroupColumns,
    'totalNoLeave',
    'remarks',
  ]
})

const activeColumnsSource = computed(() => {
  if (!isLeaveBalancesReport.value) return selectedReport.value.columns

  const columnLookup = new Map(
    selectedReport.value.columns.map((column) => [column.name, column]),
  )

  return leaveBalanceVisibleColumnNames.value
    .map((columnName) => columnLookup.get(columnName))
    .filter(Boolean)
})

const tableMinWidth = computed(() => {
  if (!isLeaveBalancesReport.value) return selectedReport.value.minTableWidth

  const selectedGroupCount = orderedLeaveBalanceVisibleGroups.value.length
  if (selectedGroupCount <= 1) return '1250px'
  if (selectedGroupCount === 2) return '1600px'
  if (selectedGroupCount === 3) return '2000px'
  return '2350px'
})

const columns = computed(() => {
  const rowsForWidth = filteredRows.value.length ? filteredRows.value : selectedReportRows.value

  return activeColumnsSource.value.map((column) => {
    const width = getColumnWidth(column, rowsForWidth)
    const widthStyle = `width: ${width}px; min-width: ${width}px; max-width: ${width}px;`

    return {
      ...column,
      align: 'left',
      style: `${widthStyle} text-align: left;`,
      headerStyle: `white-space: pre-line; ${widthStyle} line-height: 1.3; text-align: left;`,
    }
  })
})

function resolveRowMonths(row) {
  if (Array.isArray(row?.months) && row.months.length) {
    return row.months
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12)
  }

  const month = Number(row?.month)
  return Number.isInteger(month) && month >= 1 && month <= 12 ? [month] : []
}

function resolveRowYears(row) {
  if (Array.isArray(row?.years) && row.years.length) {
    return row.years
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  }

  const year = Number(row?.year)
  return Number.isInteger(year) && year > 0 ? [year] : []
}

function resolveRowPeriodKeys(row) {
  if (Array.isArray(row?.periodKeys) && row.periodKeys.length) {
    return row.periodKeys
      .map((value) => String(value || '').trim())
      .filter((value) => value !== '')
  }

  const months = resolveRowMonths(row)
  const years = resolveRowYears(row)
  if (months.length === 1 && years.length === 1) {
    return [`${years[0]}-${String(months[0]).padStart(2, '0')}`]
  }

  return []
}

const yearOptions = computed(() => {
  const years = Array.from(new Set(selectedReportRows.value.flatMap((row) => resolveRowYears(row)))).sort(
    (a, b) => b - a,
  )

  return [
    { label: 'All Years', value: null },
    ...years.map((year) => ({ label: String(year), value: year })),
  ]
})

const officeOptions = computed(() => {
  const offices = Array.from(new Set(selectedReportRows.value.map((row) => row.office))).sort()
  return [
    { label: 'All Offices', value: null },
    ...offices.map((office) => ({ label: toOfficeCode(office), value: office })),
  ]
})

const statusOptions = computed(() => {
  const statuses = Array.from(new Set(selectedReportRows.value.map((row) => row.status))).sort()
  return [{ label: 'All Statuses', value: null }, ...statuses.map((status) => ({ label: status, value: status }))]
})

const filteredRows = computed(() => {
  const search = String(filters.employeeName || '').toLowerCase()

  return selectedReportRows.value.filter((row) => {
    const rowMonths = resolveRowMonths(row)
    const rowYears = resolveRowYears(row)
    const rowPeriodKeys = resolveRowPeriodKeys(row)

    if (filters.month && filters.year) {
      const targetPeriodKey = `${filters.year}-${String(filters.month).padStart(2, '0')}`
      if (!rowPeriodKeys.includes(targetPeriodKey)) return false
    } else {
      if (filters.month && !rowMonths.includes(filters.month)) return false
      if (filters.year && !rowYears.includes(filters.year)) return false
    }

    if (filters.office && row.office !== filters.office) return false
    if (filters.status && row.status !== filters.status) return false
    if (search && !String(row.name || '').toLowerCase().includes(search)) return false
    return true
  })
})

watch(selectedReportType, () => {
  filters.month = null
  filters.year = null
  filters.office = null
  filters.status = null
  filters.employeeName = ''

  if (selectedReportType.value === 'leaveBalances') {
    leaveBalanceVisibleGroups.value = [...leaveBalanceDefaultVisibleGroups]
  }

  void ensureSelectedReportLoaded()
})

watch(
  () => [
    selectedReportType.value,
    filters.month,
    filters.year,
    filters.office,
    filters.status,
    filters.employeeName,
    selectedReportType.value === 'leaveBalances' ? leaveBalanceVisibleGroups.value.join('|') : '',
  ],
  () => {
    // Client-side filtering only: trigger short table loading feedback on filter changes.
    triggerTableLoading()
  },
  { immediate: true },
)

function getColumnWidth(column, rows) {
  if (column.name === 'no') return 56

  const headerLength = String(column.label || '')
    .replace(/\s+/g, ' ')
    .trim()
    .length

  let maxLength = headerLength

  for (const row of rows) {
    const valueLength = getColumnValueLength(row, column)
    if (valueLength > maxLength) {
      maxLength = valueLength
    }
  }

  const longTextColumns = new Set([
    'office',
    'designation',
    'inclusiveDates',
    'periodIncurred',
    'monthYearEarned',
    'monthYearExpired',
    'remarks',
  ])
  const isLongTextColumn = longTextColumns.has(column.name)
  const minWidth = column.name === 'remarks' ? 140 : isLongTextColumn ? 120 : 88
  const maxWidth = column.name === 'remarks' ? 280 : isLongTextColumn ? 240 : 190
  const calculatedWidth = maxLength * 8 + 24

  return Math.max(minWidth, Math.min(calculatedWidth, maxWidth))
}

function getColumnValueLength(row, column) {
  const field = column.field
  const rawValue =
    typeof field === 'function'
      ? field(row)
      : typeof field === 'string'
        ? row[field]
        : row[column.name]

  return String(rawValue ?? '').trim().length
}

function triggerTableLoading(duration = 280) {
  loading.value = true

  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId)
  }

  loadingTimeoutId = setTimeout(() => {
    loading.value = false
    loadingTimeoutId = null
  }, duration)
}

function ensureExportableRows() {
  if (filteredRows.value.length) return true

  $q.notify({
    type: 'warning',
    message: 'No records to export for the selected filters.',
  })
  return false
}

async function generatePdf(action = 'open', options = {}) {
  if (!filteredRows.value.length) {
    $q.notify({
      type: 'warning',
      message: 'No records to include in the report.',
    })
    return
  }

  triggerTableLoading(420)

  try {
    await generateReportsMonitoringPdf({
      action,
      reportType: selectedReportType.value,
      reportLabel: selectedReport.value.label,
      columns: activeColumnsSource.value,
      rows: filteredRows.value,
      filters: { ...filters },
      monthNames,
      signatories: options.signatories || {},
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Unable to generate report PDF right now.',
    })
  }
}

async function handleExportPdf() {
  await generatePdf('download')
}

async function handlePrintReport() {
  if (!filteredRows.value.length) {
    $q.notify({
      type: 'warning',
      message: 'No records to include in the report.',
    })
    return
  }

  showPrintDialog.value = true
}

async function confirmPrintReport() {
  printingReport.value = true

  try {
    await generatePdf('print', {
      signatories: { ...printSignatories },
    })
    showPrintDialog.value = false
  } finally {
    printingReport.value = false
  }
}

function handleExportCsv() {
  if (!ensureExportableRows()) return

  try {
    const fileName = exportReportsMonitoringCsv({
      columns: activeColumnsSource.value,
      rows: filteredRows.value,
      reportLabel: selectedReport.value.label,
    })

    $q.notify({
      type: 'positive',
      message: `CSV exported: ${fileName}`,
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Unable to export CSV right now.',
    })
  }
}

function handleExportExcel() {
  if (!ensureExportableRows()) return

  try {
    const fileName = exportReportsMonitoringExcel({
      columns: activeColumnsSource.value,
      rows: filteredRows.value,
      reportLabel: selectedReport.value.label,
    })

    $q.notify({
      type: 'positive',
      message: `Excel exported: ${fileName}`,
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Unable to export Excel right now.',
    })
  }
}

onBeforeUnmount(() => {
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId)
    loadingTimeoutId = null
  }
})
</script>

<style scoped>
.reports-page {
  background: #f5f7fa;
}

.report-section-card {
  border-radius: 12px;
  background: #ffffff;
}

.report-header-actions {
  width: fit-content;
  margin-left: auto;
}

.report-table-card-section {
  overflow-x: hidden;
}

.report-table-card-section :deep(.report-table-container),
.report-table-card-section :deep(.q-table__container) {
  max-width: 100%;
}

.report-table-card-section :deep(.q-table__middle) {
  max-width: 100%;
  overflow-x: auto;
}

</style>
