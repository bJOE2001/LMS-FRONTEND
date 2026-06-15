import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_COLOR = '#0f6b3a'

function formatPrintedAt(value = new Date()) {
  return value.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatNumber(value, fractionDigits = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '0'
  return parsed.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

function normalizeSeriesTotal(series = []) {
  return series.reduce((sum, item) => {
    if (typeof item === 'number') return sum + Number(item || 0)
    if (Array.isArray(item?.data)) {
      return sum + item.data.reduce((itemSum, value) => itemSum + Number(value || 0), 0)
    }
    return sum
  }, 0)
}

function buildSimpleTable(title, labels = [], values = [], valueLabel = 'Total') {
  const body = [
    [
      { text: title, style: 'tableHeader' },
      { text: valueLabel, style: 'tableHeader', alignment: 'right' },
    ],
    ...labels.map((label, index) => [
      { text: label || 'N/A', style: 'tableCell' },
      { text: formatNumber(values[index]), style: 'tableCell', alignment: 'right' },
    ]),
  ]

  return {
    table: {
      widths: ['*', 70],
      body,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 12],
  }
}

function buildSeriesTable(title, chart, valueLabel = 'Total') {
  const labels = chart?.labels ?? []
  const series = chart?.series ?? []
  const body = [
    [
      { text: title, style: 'tableHeader' },
      ...series.map((item) => ({ text: item?.name || valueLabel, style: 'tableHeader', alignment: 'right' })),
    ],
    ...labels.map((label, index) => [
      { text: label || 'N/A', style: 'tableCell' },
      ...series.map((item) => ({
        text: formatNumber(item?.data?.[index] ?? 0, Number.isInteger(Number(item?.data?.[index] ?? 0)) ? 0 : 1),
        style: 'tableCell',
        alignment: 'right',
      })),
    ]),
  ]

  return {
    table: {
      widths: ['*', ...series.map(() => 'auto')],
      body,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 12],
  }
}

function buildSummaryRows(charts = {}) {
  const generationTotal = normalizeSeriesTotal(charts.generationDistribution?.series)
  const genderTotal = normalizeSeriesTotal(charts.genderDistribution?.series)
  const employmentTotal = normalizeSeriesTotal(charts.employmentStatusDistribution?.series)
  const generationLeaveUsage = normalizeSeriesTotal(charts.leaveUsageByGeneration?.series)
  const ageLeaveUsage = normalizeSeriesTotal(charts.leaveUsageByAgeGroup?.series)
  const employmentLeaveUsage = normalizeSeriesTotal(charts.leaveUsageByEmploymentStatus?.series)

  return [
    ['Total Employees by Generation', formatNumber(generationTotal)],
    ['Total Employees by Gender', formatNumber(genderTotal)],
    ['Total Employees by Employment Status', formatNumber(employmentTotal)],
    ['Total Leave Usage by Generation', formatNumber(generationLeaveUsage)],
    ['Total Leave Usage by Age Group', formatNumber(ageLeaveUsage)],
    ['Total Leave Usage by Employment Status', formatNumber(employmentLeaveUsage)],
  ]
}

function buildFilterText(filters = {}, dateRangeLabel = '') {
  const hasDateRange = filters?.dateRange?.from || filters?.dateRange?.to || dateRangeLabel
  return `Date Range: ${hasDateRange ? dateRangeLabel || 'Selected Range' : 'All Dates'}`
}

export function printAnalyticsDashboardPdf({
  charts = {},
  filters = {},
  dateRangeLabel = '',
  chartSearch = '',
} = {}) {
  const printedAt = formatPrintedAt()
  const summaryRows = buildSummaryRows(charts)
  const activeSearch = String(chartSearch || '').trim()

  const summaryTable = {
    table: {
      widths: ['*', 90],
      body: [
        [
          { text: 'Summary', style: 'tableHeader' },
          { text: 'Total', style: 'tableHeader', alignment: 'right' },
        ],
        ...summaryRows.map(([label, value]) => [
          { text: label, style: 'tableCell' },
          { text: value, style: 'tableCell', alignment: 'right' },
        ]),
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 14],
  }

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 28, 28, 28],
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'LEAVE ANALYTICS DASHBOARD', style: 'title' },
              { text: 'Employee Demographics and Workforce Analytics', style: 'subtitle' },
            ],
          },
          {
            width: 210,
            stack: [
              { text: `Printed: ${printedAt}`, style: 'meta', alignment: 'right' },
              activeSearch
                ? { text: `Chart Search: ${activeSearch}`, style: 'meta', alignment: 'right' }
                : { text: 'Chart Search: All Charts', style: 'meta', alignment: 'right' },
            ],
          },
        ],
      },
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 785, h: 6, color: HEADER_COLOR }],
        margin: [0, 8, 0, 12],
      },
      {
        columns: [
          {
            width: 240,
            stack: [
              { text: 'Active Filters', style: 'sectionTitle' },
              { text: buildFilterText(filters, dateRangeLabel), style: 'filterText' },
            ],
          },
          { width: '*', stack: [summaryTable] },
        ],
        columnGap: 18,
      },
      { text: 'Employee Demographics Analytics', style: 'sectionTitle', margin: [0, 6, 0, 8] },
      {
        columns: [
          {
            width: '33%',
            stack: [
              buildSimpleTable('Generation Distribution', charts.generationDistribution?.labels, charts.generationDistribution?.series, 'Employees'),
              buildSeriesTable('Leave Usage by Generation', charts.leaveUsageByGeneration, 'Leave Days'),
            ],
          },
          {
            width: '33%',
            stack: [
              buildSeriesTable('Age Group Distribution', charts.ageGroupDistribution, 'Employees'),
              buildSeriesTable('Leave Usage by Age Group', charts.leaveUsageByAgeGroup, 'Leave Days'),
            ],
          },
          {
            width: '34%',
            stack: [
              buildSimpleTable('Gender Distribution', charts.genderDistribution?.labels, charts.genderDistribution?.series, 'Employees'),
            ],
          },
        ],
        columnGap: 10,
      },
      { text: 'Workforce Analytics', style: 'sectionTitle', margin: [0, 8, 0, 8] },
      {
        columns: [
          {
            width: '33%',
            stack: [
              buildSimpleTable('Employment Status Distribution', charts.employmentStatusDistribution?.labels, charts.employmentStatusDistribution?.series, 'Employees'),
            ],
          },
          {
            width: '33%',
            stack: [
              buildSeriesTable('Leave Usage by Employment Status', charts.leaveUsageByEmploymentStatus, 'Leave Days'),
            ],
          },
          {
            width: '34%',
            stack: [
              buildSeriesTable('Employment Status Trend', charts.employmentStatusTrend, 'Employees'),
            ],
          },
        ],
        columnGap: 10,
      },
    ],
    styles: {
      title: {
        fontSize: 16,
        bold: true,
        color: '#0f172a',
      },
      subtitle: {
        fontSize: 9,
        color: '#475569',
        margin: [0, 2, 0, 0],
      },
      meta: {
        fontSize: 8,
        color: '#475569',
      },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: HEADER_COLOR,
      },
      filterText: {
        fontSize: 8,
        color: '#334155',
        lineHeight: 1.25,
      },
      tableHeader: {
        fontSize: 8,
        bold: true,
        color: '#ffffff',
        fillColor: HEADER_COLOR,
        margin: [4, 3, 4, 3],
      },
      tableCell: {
        fontSize: 7.5,
        color: '#1f2937',
        margin: [4, 2, 4, 2],
      },
    },
    defaultStyle: {
      font: 'Roboto',
    },
  }

  pdfMake.createPdf(docDefinition).open()
}
