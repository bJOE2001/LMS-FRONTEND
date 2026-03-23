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
      <q-card-section class="q-pa-sm">
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
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import LwopReportTable from 'components/report/LwopReportTable.vue'
import LeaveBalancesReportTable from 'components/report/LeaveBalancesReportTable.vue'
import MonetizationReportTable from 'components/report/MonetizationReportTable.vue'
import CtoAvailmentReportTable from 'components/report/CtoAvailmentReportTable.vue'
import CocBalancesReportTable from 'components/report/CocBalancesReportTable.vue'
import LeaveAvailmentPerOfficeReportTable from 'components/report/LeaveAvailmentPerOfficeReportTable.vue'
import { generateReportsMonitoringPdf } from 'src/utils/reports-monitoring-pdf'

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

const leaveBalanceDefaultVisibleGroups = ['runningBalance']
const leaveBalanceVisibleGroups = ref([...leaveBalanceDefaultVisibleGroups])

// TODO: Replace mock rows with API responses for each report type.
const lwopRows = [
  {
    id: 1,
    no: 1,
    name: 'Ana Dela Cruz',
    office: "Municipal Treasurer's Office",
    status: 'Regular',
    periodIncurred: 'January 10-12, 2026',
    typeOfLeave: 'Vacation Leave',
    totalDaysLWOP: 3,
    dateReceivedCHRMO: 'January 15, 2026',
    remarks: 'With supporting documents',
    month: 1,
    year: 2026,
  },
  {
    id: 2,
    no: 2,
    name: 'Mark Santos',
    office: "Mayor's Office",
    status: 'Casual',
    periodIncurred: 'February 03-05, 2026',
    typeOfLeave: 'Sick Leave',
    totalDaysLWOP: 3,
    dateReceivedCHRMO: 'February 08, 2026',
    remarks: 'Pending clarification',
    month: 2,
    year: 2026,
  },
  {
    id: 3,
    no: 3,
    name: 'Joan Bautista',
    office: 'Engineering Office',
    status: 'Regular',
    periodIncurred: 'March 14-15, 2026',
    typeOfLeave: 'Forced Leave',
    totalDaysLWOP: 2,
    dateReceivedCHRMO: 'March 16, 2026',
    remarks: 'Complete',
    month: 3,
    year: 2026,
  },
  {
    id: 4,
    no: 4,
    name: 'Leo Ramos',
    office: 'Planning Office',
    status: 'Job Order',
    periodIncurred: 'March 20-22, 2026',
    typeOfLeave: 'Vacation Leave',
    totalDaysLWOP: 3,
    dateReceivedCHRMO: 'March 24, 2026',
    remarks: 'For validation',
    month: 3,
    year: 2026,
  },
]

const leaveBalancesRows = [
  {
    id: 11,
    no: 1,
    name: 'Ana Dela Cruz',
    designation: 'Administrative Officer II',
    status: 'Regular',
    office: "Municipal Treasurer's Office",
    runningBalanceVl: 15,
    runningBalanceSl: 15,
    annualBalanceMcCo: 2,
    annualBalanceWlp: 0,
    annualBalanceOthers: 1,
    daysVlFl: 2,
    daysSl: 1,
    daysMcCo: 0,
    daysWlp: 0,
    daysOthers: 0,
    balanceVl: 13,
    balanceSl: 14,
    balanceFl: 0,
    balanceMcCo: 2,
    balanceWlp: 0,
    balanceOthers: 1,
    totalNoLeave: 3,
    remarks: 'Within allowable leave credits',
    month: 1,
    year: 2026,
  },
  {
    id: 12,
    no: 2,
    name: 'Mark Santos',
    designation: 'Administrative Aide IV',
    status: 'Casual',
    office: "Mayor's Office",
    runningBalanceVl: 15,
    runningBalanceSl: 15,
    annualBalanceMcCo: 1,
    annualBalanceWlp: 2,
    annualBalanceOthers: 0,
    daysVlFl: 1,
    daysSl: 0,
    daysMcCo: 1,
    daysWlp: 1,
    daysOthers: 0,
    balanceVl: 14,
    balanceSl: 15,
    balanceFl: 0,
    balanceMcCo: 0,
    balanceWlp: 1,
    balanceOthers: 0,
    totalNoLeave: 3,
    remarks: 'Includes MC/CO and WLP usage',
    month: 2,
    year: 2026,
  },
  {
    id: 13,
    no: 3,
    name: 'Joy Gamboa',
    designation: 'HRMO I',
    status: 'Regular',
    office: 'CHRMO',
    runningBalanceVl: 15,
    runningBalanceSl: 15,
    annualBalanceMcCo: 0,
    annualBalanceWlp: 0,
    annualBalanceOthers: 0,
    daysVlFl: 0,
    daysSl: 2,
    daysMcCo: 0,
    daysWlp: 0,
    daysOthers: 0,
    balanceVl: 15,
    balanceSl: 13,
    balanceFl: 0,
    balanceMcCo: 0,
    balanceWlp: 0,
    balanceOthers: 0,
    totalNoLeave: 2,
    remarks: 'Sick leave monitoring',
    month: 3,
    year: 2026,
  },
  {
    id: 14,
    no: 4,
    name: 'Renato Flores',
    designation: 'Engineer II',
    status: 'Co-Terminus',
    office: 'Engineering Office',
    runningBalanceVl: 15,
    runningBalanceSl: 15,
    annualBalanceMcCo: 1,
    annualBalanceWlp: 1,
    annualBalanceOthers: 0,
    daysVlFl: 2,
    daysSl: 1,
    daysMcCo: 0,
    daysWlp: 1,
    daysOthers: 0,
    balanceVl: 13,
    balanceSl: 14,
    balanceFl: 1,
    balanceMcCo: 1,
    balanceWlp: 0,
    balanceOthers: 0,
    totalNoLeave: 4,
    remarks: 'High leave activity this period',
    month: 3,
    year: 2026,
  },
]

const monetizationRows = [
  {
    id: 21,
    no: 1,
    dateReceivedHRMO: 'January 06, 2026',
    dateOfFiling: 'January 05, 2026',
    name: 'Maria Lim',
    designation: 'Nurse II',
    status: 'Regular',
    office: 'Rural Health Unit',
    totalDays: 10,
    remarks: 'Approved',
    month: 1,
    year: 2026,
  },
  {
    id: 22,
    no: 2,
    dateReceivedHRMO: 'February 11, 2026',
    dateOfFiling: 'February 10, 2026',
    name: 'Joel Navarro',
    designation: 'Administrative Assistant III',
    status: 'Regular',
    office: 'Accounting Office',
    totalDays: 8,
    remarks: 'For budget review',
    month: 2,
    year: 2026,
  },
  {
    id: 23,
    no: 3,
    dateReceivedHRMO: 'March 04, 2026',
    dateOfFiling: 'March 03, 2026',
    name: 'Liza Padilla',
    designation: 'Teacher I',
    status: 'Contractual',
    office: 'Public Schools District',
    totalDays: 5,
    remarks: 'Pending documents',
    month: 3,
    year: 2026,
  },
  {
    id: 24,
    no: 4,
    dateReceivedHRMO: 'March 19, 2026',
    dateOfFiling: 'March 18, 2026',
    name: 'Dennis Yap',
    designation: 'Clerk II',
    status: 'Casual',
    office: "Mayor's Office",
    totalDays: 6,
    remarks: 'Approved',
    month: 3,
    year: 2026,
  },
]

const ctoAvailmentRows = [
  {
    id: 31,
    no: 1,
    dateFiled: 'January 08, 2026',
    name: 'Carlo Reyes',
    designation: 'Administrative Officer III',
    office: 'CHRMO',
    status: 'Regular',
    totalDaysApplied: 1,
    inclusiveDates: 'January 12, 2026',
    earnedCocHoursAsOf: 24,
    runningCocBalance: 24,
    totalHoursFiled: 8,
    cocBalanceApproved: 16,
    remarks: 'Approved',
    month: 1,
    year: 2026,
  },
  {
    id: 32,
    no: 2,
    dateFiled: 'February 17, 2026',
    name: 'Mia Alvarez',
    designation: 'Engineer I',
    office: 'Engineering Office',
    status: 'Regular',
    totalDaysApplied: 0.5,
    inclusiveDates: 'February 20, 2026 (AM)',
    earnedCocHoursAsOf: 18,
    runningCocBalance: 18,
    totalHoursFiled: 4,
    cocBalanceApproved: 14,
    remarks: 'Approved',
    month: 2,
    year: 2026,
  },
  {
    id: 33,
    no: 3,
    dateFiled: 'March 05, 2026',
    name: 'Neil Soriano',
    designation: 'Planning Officer I',
    office: 'Planning Office',
    status: 'Co-Terminus',
    totalDaysApplied: 2,
    inclusiveDates: 'March 10-11, 2026',
    earnedCocHoursAsOf: 32,
    runningCocBalance: 32,
    totalHoursFiled: 16,
    cocBalanceApproved: 16,
    remarks: 'Partially approved',
    month: 3,
    year: 2026,
  },
  {
    id: 34,
    no: 4,
    dateFiled: 'March 21, 2026',
    name: 'Shane Gonzales',
    designation: 'Administrative Aide VI',
    office: "Mayor's Office",
    status: 'Casual',
    totalDaysApplied: 1,
    inclusiveDates: 'March 25, 2026',
    earnedCocHoursAsOf: 12,
    runningCocBalance: 12,
    totalHoursFiled: 8,
    cocBalanceApproved: 4,
    remarks: 'For final approval',
    month: 3,
    year: 2026,
  },
]

const cocBalancesRows = [
  {
    id: 41,
    no: 1,
    name: 'Carlo Reyes',
    designation: 'Administrative Officer III',
    status: 'Regular',
    office: 'CHRMO',
    totalBalanceHours: 16,
    monthYearEarned: 'December 2025',
    monthYearExpired: 'December 2026',
    remarks: 'Active balance',
    month: 1,
    year: 2026,
  },
  {
    id: 42,
    no: 2,
    name: 'Mia Alvarez',
    designation: 'Engineer I',
    status: 'Regular',
    office: 'Engineering Office',
    totalBalanceHours: 14,
    monthYearEarned: 'January 2026',
    monthYearExpired: 'January 2027',
    remarks: 'Active balance',
    month: 2,
    year: 2026,
  },
  {
    id: 43,
    no: 3,
    name: 'Neil Soriano',
    designation: 'Planning Officer I',
    status: 'Co-Terminus',
    office: 'Planning Office',
    totalBalanceHours: 16,
    monthYearEarned: 'February 2026',
    monthYearExpired: 'February 2027',
    remarks: 'Updated after latest filing',
    month: 3,
    year: 2026,
  },
  {
    id: 44,
    no: 4,
    name: 'Shane Gonzales',
    designation: 'Administrative Aide VI',
    status: 'Casual',
    office: "Mayor's Office",
    totalBalanceHours: 4,
    monthYearEarned: 'March 2026',
    monthYearExpired: 'March 2027',
    remarks: 'Low balance',
    month: 3,
    year: 2026,
  },
]

const leaveAvailmentRows = [
  {
    id: 51,
    no: 1,
    name: 'Joy Gamboa',
    designation: 'HRMO I',
    status: 'Regular',
    office: 'CHRMO',
    vlFl: 2,
    sl: 1,
    mcCo: 0,
    wlp: 0,
    others: 0,
    totalNoLeave: 3,
    remarks: 'Within limit',
    month: 1,
    year: 2026,
  },
  {
    id: 52,
    no: 2,
    name: 'Renato Flores',
    designation: 'Engineer II',
    status: 'Co-Terminus',
    office: 'Engineering Office',
    vlFl: 1,
    sl: 2,
    mcCo: 1,
    wlp: 1,
    others: 0,
    totalNoLeave: 5,
    remarks: 'Multiple leave types',
    month: 2,
    year: 2026,
  },
  {
    id: 53,
    no: 3,
    name: 'Dennis Yap',
    designation: 'Clerk II',
    status: 'Casual',
    office: "Mayor's Office",
    vlFl: 1,
    sl: 0,
    mcCo: 0,
    wlp: 2,
    others: 0,
    totalNoLeave: 3,
    remarks: 'WLP monitoring',
    month: 3,
    year: 2026,
  },
  {
    id: 54,
    no: 4,
    name: 'Liza Padilla',
    designation: 'Teacher I',
    status: 'Contractual',
    office: 'Public Schools District',
    vlFl: 1,
    sl: 1,
    mcCo: 0,
    wlp: 0,
    others: 1,
    totalNoLeave: 3,
    remarks: 'Has special leave',
    month: 3,
    year: 2026,
  },
]

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
      { name: 'office', label: 'Office', field: 'office', align: 'left' },
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
        label: 'Annual Balance MC/CO',
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
        label: 'Days MC/CO',
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
        label: 'Balance MC/CO',
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
      { name: 'office', label: 'Office', field: 'office', align: 'left' },
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
      { name: 'office', label: 'Office', field: 'office', align: 'left' },
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
        label: 'Running COC Balance as of Date Filed',
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
      { name: 'office', label: 'Office', field: 'office', align: 'left' },
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
      { name: 'office', label: 'Office', field: 'office', align: 'left' },
      { name: 'vlFl', label: 'VL/FL', field: 'vlFl', align: 'right' },
      { name: 'sl', label: 'SL', field: 'sl', align: 'right' },
      { name: 'mcCo', label: 'MC/CO', field: 'mcCo', align: 'right' },
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

const reportTypeOptions = Object.entries(reportConfigs).map(([value, config]) => ({
  label: config.label,
  value,
}))

const selectedReport = computed(() => reportConfigs[selectedReportType.value] || reportConfigs.lwop)
const isLeaveBalancesReport = computed(() => selectedReportType.value === 'leaveBalances')

const leaveBalanceVisibleColumnNames = computed(() => {
  if (!isLeaveBalancesReport.value) return []

  const selectedGroups = new Set(leaveBalanceVisibleGroups.value)
  const selectedGroupColumns = Object.entries(leaveBalanceColumnGroups)
    .filter(([groupName]) => selectedGroups.has(groupName))
    .flatMap(([, groupColumns]) => groupColumns)

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

  const allowedColumns = new Set(leaveBalanceVisibleColumnNames.value)
  return selectedReport.value.columns.filter((column) => allowedColumns.has(column.name))
})

const tableMinWidth = computed(() => {
  if (!isLeaveBalancesReport.value) return selectedReport.value.minTableWidth

  const selectedGroupCount = leaveBalanceVisibleGroups.value.length
  if (selectedGroupCount <= 1) return '1250px'
  if (selectedGroupCount === 2) return '1600px'
  if (selectedGroupCount === 3) return '2000px'
  return '2350px'
})

const columns = computed(() => {
  const rowsForWidth = filteredRows.value.length ? filteredRows.value : selectedReport.value.rows

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

const yearOptions = computed(() => {
  const years = Array.from(new Set(selectedReport.value.rows.map((row) => row.year))).sort(
    (a, b) => b - a,
  )

  return [
    { label: 'All Years', value: null },
    ...years.map((year) => ({ label: String(year), value: year })),
  ]
})

const officeOptions = computed(() => {
  const offices = Array.from(new Set(selectedReport.value.rows.map((row) => row.office))).sort()
  return [{ label: 'All Offices', value: null }, ...offices.map((office) => ({ label: office, value: office }))]
})

const statusOptions = computed(() => {
  const statuses = Array.from(new Set(selectedReport.value.rows.map((row) => row.status))).sort()
  return [{ label: 'All Statuses', value: null }, ...statuses.map((status) => ({ label: status, value: status }))]
})

const filteredRows = computed(() => {
  const search = String(filters.employeeName || '').toLowerCase()

  return selectedReport.value.rows.filter((row) => {
    if (filters.month && row.month !== filters.month) return false
    if (filters.year && row.year !== filters.year) return false
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
    // TODO: Connect report API request here and keep `loading` bound to request lifecycle.
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

function resolveExportCellValue(row, column, rowIndex) {
  if (column?.name === 'no') {
    return row?.no ?? rowIndex + 1
  }

  const field = column?.field
  if (typeof field === 'function') return field(row)
  if (typeof field === 'string') return row?.[field]
  return row?.[column?.name]
}

function normalizeExportLabel(label) {
  return String(label ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeFilenameSegment(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildExportFilename(extension) {
  const reportSegment = sanitizeFilenameSegment(selectedReport.value.label) || 'report'
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${reportSegment}-${timestamp}.${extension}`
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '')
  const escaped = normalized.replace(/"/g, '""')
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped
}

function escapeXmlValue(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeWorksheetName(label) {
  const sanitized = String(label ?? '')
    .replace(/[\\/*?:[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) return 'Report'
  return sanitized.slice(0, 31)
}

function downloadFile(content, filename, mimeType, includeUtf8Bom = false) {
  const parts = includeUtf8Bom ? ['\uFEFF', content] : [content]
  const blob = new Blob(parts, { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

function ensureExportableRows() {
  if (filteredRows.value.length) return true

  $q.notify({
    type: 'warning',
    message: 'No records to export for the selected filters.',
  })
  return false
}

function buildExportDataset() {
  const exportColumns = activeColumnsSource.value
  const exportRows = filteredRows.value

  const headers = exportColumns.map((column) => normalizeExportLabel(column.label || column.name || ''))
  const rows = exportRows.map((row, rowIndex) =>
    exportColumns.map((column) => resolveExportCellValue(row, column, rowIndex)),
  )

  return { headers, rows }
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
      columns: selectedReport.value.columns,
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
    const { headers, rows } = buildExportDataset()
    const csvRows = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(',')),
    ]
    const csvContent = `${csvRows.join('\n')}\n`
    const fileName = buildExportFilename('csv')

    downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;', true)

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
    const { headers, rows } = buildExportDataset()
    const worksheetName = escapeXmlValue(normalizeWorksheetName(selectedReport.value.label))
    const headerCells = headers
      .map((header) => `<Cell><Data ss:Type="String">${escapeXmlValue(header)}</Data></Cell>`)
      .join('')

    const dataRowsXml = rows
      .map((row) => {
        const cells = row
          .map((value) => {
            const normalized = value ?? ''
            const numeric = Number(normalized)
            const isNumberCell =
              typeof normalized === 'number' || (String(normalized).trim() !== '' && Number.isFinite(numeric))
            const cellType = isNumberCell ? 'Number' : 'String'
            const cellValue = isNumberCell ? String(numeric) : escapeXmlValue(normalized)

            return `<Cell><Data ss:Type="${cellType}">${cellValue}</Data></Cell>`
          })
          .join('')

        return `<Row>${cells}</Row>`
      })
      .join('')

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="${worksheetName}">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRowsXml}
  </Table>
 </Worksheet>
</Workbook>`

    const fileName = buildExportFilename('xls')
    downloadFile(workbookXml, fileName, 'application/vnd.ms-excel;charset=utf-8;', true)

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

</style>
