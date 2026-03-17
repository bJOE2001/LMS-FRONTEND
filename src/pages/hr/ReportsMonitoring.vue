<template>
  <q-page class="q-pa-md">
    <div class="row justify-between items-center q-mb-lg">
      <div>
        <h1 class="text-h4 text-weight-bold q-mt-none q-mb-xs">Reports & Monitoring</h1>
      </div>
    </div>

    <q-card flat bordered class="rounded-borders q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-md">Generate Report</div>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-3">
            <q-input
              v-model="dateFrom"
              outlined
              dense
              readonly
              label="Date From"
              class="report-date-input"
              @click="showDateFromMenu = true"
            >
              <template #append>
                <q-icon
                  v-if="dateFrom"
                  name="close"
                  class="cursor-pointer text-grey-6"
                  @click.stop="dateFrom = ''"
                />
                <q-icon
                  name="event"
                  color="primary"
                  class="cursor-pointer"
                  @click.stop.prevent="openDateFromMenuFromIcon"
                />
              </template>
              <q-menu
                v-model="showDateFromMenu"
                anchor="bottom left"
                self="top left"
                transition-show="scale"
                transition-hide="scale"
              >
                <q-date
                  v-model="dateFrom"
                  mask="YYYY-MM-DD"
                  color="primary"
                  class="report-date-popup"
                  @update:model-value="showDateFromMenu = false"
                >
                  <div class="row items-center justify-end q-pa-sm">
                    <q-btn v-close-popup flat label="Close" color="primary" />
                  </div>
                </q-date>
              </q-menu>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-input
              v-model="dateTo"
              outlined
              dense
              readonly
              label="Date To"
              class="report-date-input"
              @click="showDateToMenu = true"
            >
              <template #append>
                <q-icon
                  v-if="dateTo"
                  name="close"
                  class="cursor-pointer text-grey-6"
                  @click.stop="dateTo = ''"
                />
                <q-icon
                  name="event"
                  color="primary"
                  class="cursor-pointer"
                  @click.stop.prevent="openDateToMenuFromIcon"
                />
              </template>
              <q-menu
                v-model="showDateToMenu"
                anchor="bottom left"
                self="top left"
                transition-show="scale"
                transition-hide="scale"
              >
                <q-date
                  v-model="dateTo"
                  mask="YYYY-MM-DD"
                  color="primary"
                  class="report-date-popup"
                  @update:model-value="showDateToMenu = false"
                >
                  <div class="row items-center justify-end q-pa-sm">
                    <q-btn v-close-popup flat label="Close" color="primary" />
                  </div>
                </q-date>
              </q-menu>
            </q-input>
          </div>
          <div class="col-12 col-md-3">
            <q-btn unelevated color="primary" icon="print" label="Print" :loading="generating" @click="handleGenerate" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="stat in summaryStats" :key="stat.label" class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="rounded-borders">
          <q-card-section class="row items-center">
            <q-icon :name="stat.icon" :color="stat.color" size="32px" class="q-mr-md" />
            <div>
              <div class="text-caption text-grey-7">{{ stat.label }}</div>
              <div class="text-h6">{{ stat.value }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { resolveApiErrorMessage } from 'src/utils/http-error-message'

const $q = useQuasar()
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const dateFrom = ref('')
const dateTo = ref('')
const generating = ref(false)
const showDateFromMenu = ref(false)
const showDateToMenu = ref(false)

function openDateFromMenuFromIcon() {
  // Delay opening until current click cycle ends to avoid immediate auto-close.
  window.setTimeout(() => {
    showDateFromMenu.value = true
  }, 0)
}

function openDateToMenuFromIcon() {
  // Delay opening until current click cycle ends to avoid immediate auto-close.
  window.setTimeout(() => {
    showDateToMenu.value = true
  }, 0)
}

const summary = ref({
  total_applications: 0,
  approval_rate: 0,
  avg_processing_days: 0,
  active_employees: 0
})

const deptStats = ref([])
const trendApplications = ref([])

function getApplicationDate(application) {
  return (
    application?.dateFiled ??
    application?.date_filed ??
    application?.created_at ??
    application?.startDate ??
    application?.start_date ??
    null
  )
}

function normalizeLeaveTypeName(value) {
  if (typeof value === 'string' && value.trim()) return value.trim()

  if (value && typeof value === 'object') {
    const nestedName = value.name ?? value.label ?? value.type
    if (typeof nestedName === 'string' && nestedName.trim()) return nestedName.trim()
  }

  return 'Unknown'
}

function getApplicationLeaveType(application) {
  const leaveTypeValue =
    application?.leaveType ??
    application?.leave_type_name ??
    application?.leaveTypeName ??
    application?.leave_type ??
    application?.leaveType?.name ??
    application?.leave?.name

  return normalizeLeaveTypeName(leaveTypeValue)
}

async function fetchTrendData() {
  try {
    const { data } = await api.get('/hr/dashboard')
    trendApplications.value = Array.isArray(data?.applications) ? data.applications : []
  } catch {
    trendApplications.value = []
  }
}

async function fetchSummary(params = {}) {
  try {
    const { data } = await api.get('/hr/reports/summary', { params })
    summary.value = data
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load summary statistics right now.')
    $q.notify({ type: 'negative', message: msg })
  }
}

async function fetchDeptStats(params = {}) {
  try {
    const { data } = await api.get('/hr/reports/departments', { params })
    deptStats.value = data
  } catch (err) {
    const msg = resolveApiErrorMessage(err, 'Unable to load department statistics right now.')
    $q.notify({ type: 'negative', message: msg })
  }
}

function buildReportFilterParams() {
  const hasFromDate = Boolean(dateFrom.value)
  const hasToDate = Boolean(dateTo.value)

  if (!hasFromDate || !hasToDate) return {}

  const fromDate = parseInputDate(dateFrom.value)
  const toDate = parseInputDate(dateTo.value)

  if (!fromDate || !toDate || fromDate > toDate) return {}

  return {
    date_from: dateFrom.value,
    date_to: dateTo.value,
  }
}

async function refreshReportStats() {
  const params = buildReportFilterParams()
  await Promise.all([
    fetchSummary(params),
    fetchDeptStats(params),
  ])
}

function parseInputDate(value, endOfDay = false) {
  if (!value) return null
  const parsed = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDateLabel(value) {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function resolveApplicationStatusLabel(application) {
  const raw = String(application?.rawStatus ?? application?.status ?? '').toUpperCase()
  if (raw.includes('PENDING_ADMIN')) return 'Pending Admin'
  if (raw.includes('PENDING_HR')) return 'Pending HR'
  if (raw.includes('PENDING')) return 'Pending'
  if (raw.includes('APPROVED')) return 'Approved'
  if (raw.includes('REJECTED') || raw.includes('DISAPPROVED')) return 'Rejected'
  return 'Unknown'
}

function getApplicationsForSelectedRange() {
  const fromDate = parseInputDate(dateFrom.value)
  const toDate = parseInputDate(dateTo.value, true)
  const sourceRows = Array.isArray(trendApplications.value) ? trendApplications.value : []

  if (!fromDate && !toDate) {
    return sourceRows
  }

  return sourceRows.filter((application) => {
    const rawDate = getApplicationDate(application)
    if (!rawDate) return false

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) return false
    if (fromDate && parsedDate < fromDate) return false
    if (toDate && parsedDate > toDate) return false
    return true
  })
}

function buildMonthlyTrendRows(applications) {
  const monthlyMap = new Map()

  for (const application of applications) {
    const rawDate = getApplicationDate(application)
    if (!rawDate) continue

    const parsedDate = new Date(rawDate)
    if (Number.isNaN(parsedDate.getTime())) continue

    const key = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`
    const label = parsedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const current = monthlyMap.get(key) ?? { label, total: 0 }
    current.total += 1
    monthlyMap.set(key, current)
  }

  return Array.from(monthlyMap.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, value]) => value)
}

function buildLeaveTypeRows(applications) {
  const leaveTypeMap = new Map()

  for (const application of applications) {
    const leaveTypeName = getApplicationLeaveType(application)
    leaveTypeMap.set(leaveTypeName, (leaveTypeMap.get(leaveTypeName) ?? 0) + 1)
  }

  return Array.from(leaveTypeMap.entries())
    .map(([leaveType, total]) => ({ leaveType, total }))
    .sort((left, right) => {
      if (right.total !== left.total) return right.total - left.total
      return left.leaveType.localeCompare(right.leaveType)
    })
}

async function loadImageDataUrl(path) {
  try {
    const response = await fetch(path)
    if (!response.ok) return null

    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => reject(new Error('Unable to read image file.'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function createReportPdf() {
  const applications = getApplicationsForSelectedRange()
  const statusCounts = applications.reduce((acc, application) => {
    const status = resolveApplicationStatusLabel(application)
    if (status.includes('Pending')) acc.pending += 1
    else if (status === 'Approved') acc.approved += 1
    else if (status === 'Rejected') acc.rejected += 1
    else acc.other += 1
    return acc
  }, { pending: 0, approved: 0, rejected: 0, other: 0 })

  const monthlyRows = buildMonthlyTrendRows(applications)
  const leaveTypeRows = buildLeaveTypeRows(applications)
  const totalApplications = applications.length
  const computedApprovalRate = totalApplications > 0
    ? ((statusCounts.approved / totalApplications) * 100).toFixed(2)
    : '0.00'
  const periodLabel = dateFrom.value && dateTo.value
    ? `${formatDateLabel(dateFrom.value)} to ${formatDateLabel(dateTo.value)}`
    : 'All available dates'
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  const logoDataUrl = await loadImageDataUrl('/images/CityOfTagumLogo.png')

  const monthlyTableBody = [
    [{ text: 'Month', style: 'tableHeader' }, { text: 'Applications', style: 'tableHeader' }],
    ...(monthlyRows.length
      ? monthlyRows.map((row) => [row.label, String(row.total)])
      : [['No monthly data available', '0']]),
  ]

  const leaveTypeTableBody = [
    [{ text: 'Leave Type', style: 'tableHeader' }, { text: 'Applications', style: 'tableHeader' }],
    ...(leaveTypeRows.length
      ? leaveTypeRows.map((row) => [row.leaveType, String(row.total)])
      : [['No leave type data available', '0']]),
  ]

  const departmentTableBody = [
    [
      { text: 'Department', style: 'tableHeader' },
      { text: 'Total', style: 'tableHeader' },
      { text: 'On Leave', style: 'tableHeader' },
      { text: 'Pending', style: 'tableHeader' },
      { text: 'Approved', style: 'tableHeader' },
      { text: 'Utilization %', style: 'tableHeader' },
    ],
    ...(deptStats.value.length
      ? deptStats.value.map((row) => [
        String(row?.dept ?? 'N/A'),
        String(row?.total ?? 0),
        String(row?.onLeave ?? 0),
        String(row?.pending ?? 0),
        String(row?.approved ?? 0),
        String(row?.rate ?? 0),
      ])
      : [['No department data available', '0', '0', '0', '0', '0']]),
  ]

  const documentDefinition = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [24, 24, 24, 24],
    content: [
      {
        columns: [
          ...(logoDataUrl ? [{ image: logoDataUrl, width: 58, margin: [0, 0, 10, 0] }] : []),
          {
            stack: [
              { text: 'HR Reports & Monitoring', style: 'title' },
              { text: 'Comprehensive Leave Report', style: 'subtitle' },
              { text: `Generated: ${generatedAt}`, style: 'meta' },
              { text: `Date range: ${periodLabel}`, style: 'meta' },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 12],
      },
      { text: 'Summary', style: 'section' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            ['Total Applications (selected range)', String(totalApplications)],
            ['Approved', String(statusCounts.approved)],
            ['Pending', String(statusCounts.pending)],
            ['Rejected', String(statusCounts.rejected)],
            ['Other Status', String(statusCounts.other)],
            ['Approval Rate (selected range)', `${computedApprovalRate}%`],
            ['Dashboard Approval Rate', `${summary.value.approval_rate}%`],
            ['Avg Processing Days', `${summary.value.avg_processing_days}d`],
            ['Active Employees', String(summary.value.active_employees)],
          ],
        },
        layout: 'lightHorizontalLines',
      },
      { text: 'Monthly Leave Trend', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 120],
          body: monthlyTableBody,
        },
        layout: 'lightHorizontalLines',
      },
      { text: 'Leave Type Breakdown', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 120],
          body: leaveTypeTableBody,
        },
        layout: 'lightHorizontalLines',
      },
      { text: 'Department Statistics', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 55, 55, 55, 70],
          body: departmentTableBody,
        },
        layout: 'lightHorizontalLines',
      },
    ],
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 12, color: '#37474f', margin: [0, 0, 0, 2] },
      meta: { fontSize: 9, color: '#607d8b', margin: [0, 0, 0, 2] },
      section: { fontSize: 12, bold: true, margin: [0, 12, 0, 6] },
      tableHeader: { bold: true, fillColor: '#eceff1' },
    },
    defaultStyle: {
      fontSize: 9,
    },
  }

  pdfMake.createPdf(documentDefinition).open()
}

async function handleGenerate() {
  const hasFromDate = Boolean(dateFrom.value)
  const hasToDate = Boolean(dateTo.value)

  if (hasFromDate !== hasToDate) {
    $q.notify({
      type: 'warning',
      message: 'Please select both Date From and Date To to filter by range.',
      position: 'top',
    })
    return
  }

  const fromDate = parseInputDate(dateFrom.value)
  const toDate = parseInputDate(dateTo.value)
  if (dateFrom.value && !fromDate) {
    $q.notify({ type: 'warning', message: 'Please provide a valid From date.', position: 'top' })
    return
  }
  if (dateTo.value && !toDate) {
    $q.notify({ type: 'warning', message: 'Please provide a valid To date.', position: 'top' })
    return
  }
  if (fromDate && toDate && fromDate > toDate) {
    $q.notify({ type: 'warning', message: 'Date From cannot be later than Date To.', position: 'top' })
    return
  }

  generating.value = true
  try {
    await createReportPdf()
  } catch {
    $q.notify({ type: 'negative', message: 'Unable to generate report right now.', position: 'top' })
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  refreshReportStats()
  fetchTrendData()
})

watch([dateFrom, dateTo], () => {
  refreshReportStats()
})

const summaryStats = computed(() => [
  { label: 'Total Applications', value: summary.value.total_applications, icon: 'description', color: 'primary' },
  { label: 'Approval Rate', value: `${summary.value.approval_rate}%`, icon: 'trending_up', color: 'green' },
  { label: 'Avg Processing', value: `${summary.value.avg_processing_days}d`, icon: 'schedule', color: 'warning' },
  { label: 'Active Employees', value: summary.value.active_employees, icon: 'people', color: 'purple' },
])

</script>

<style scoped>
.report-date-input :deep(.q-field__control) {
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.report-date-input :deep(.q-field__native) {
  font-weight: 500;
}

.report-date-input :deep(.q-field__prepend) {
  padding-right: 4px;
}

.report-date-input :deep(.q-field__control:before) {
  border-color: #c7d3e0;
}

.report-date-input:hover :deep(.q-field__control:before) {
  border-color: #9eb2c8;
}

.report-date-input :deep(.q-field__control:after) {
  border-color: #1976d2;
}

.report-date-popup :deep(.q-date) {
  border-radius: 12px;
  max-width: calc(100vw - 24px);
}

@media (max-width: 600px) {
  .report-date-popup :deep(.q-date) {
    width: calc(100vw - 24px);
  }
}
</style>
