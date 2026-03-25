import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_BAR_COLOR = '#0f6b3a'
const A4_PORTRAIT_WIDTH = 595.28
const A4_LANDSCAPE_WIDTH = 841.89
const DEFAULT_MONTH_NAMES = [
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

const DEFAULT_PREPARED_BY = {
  label: 'PREPARED BY:',
  name: 'REYNALDO D. CASAS',
  title: 'HRMO III',
}

const DEFAULT_REVIEWED_BY = {
  label: 'REVIEWED BY:',
  name: 'WARREN JAMES D. NAVARRO, CPA',
  title: 'Supervising Administrative Officer',
}

const DEFAULT_NOTED_BY = {
  label: 'NOTED BY:',
  name: 'JANYLENE A. PALERMO, MM',
  title: 'City Human Resource Mgt. Officer',
}

const REPORT_TITLE_MAP = {
  lwop: 'LEAVE WITHOUT PAY (LWOP) REPORT',
  leaveBalances: 'REPORT OF LEAVE BALANCES OF EMPLOYEES PER OFFICE',
  monetization: 'REPORT OF AVAILMENT FOR MONETIZATION',
  ctoAvailment: 'REPORT FOR COMPENSATORY TIME OFF (CTO) AVAILMENT',
  cocBalances: 'REPORT OF COMPENSATORY OVERTIME CREDIT (COC) BALANCES',
  leaveAvailmentPerOffice: 'REPORT OF AVAILMENT FOR LEAVE APPLICATION PER OFFICE',
}

const PDF_CENTERED_VALUE_COLUMNS = {
  lwop: ['totalDaysLWOP'],
  leaveBalances: [
    'runningBalanceVl',
    'runningBalanceSl',
    'annualBalanceMcCo',
    'annualBalanceWlp',
    'annualBalanceOthers',
    'daysVlFl',
    'daysSl',
    'daysMcCo',
    'daysWlp',
    'daysOthers',
    'balanceVl',
    'balanceSl',
    'balanceFl',
    'balanceMcCo',
    'balanceWlp',
    'balanceOthers',
  ],
  monetization: ['totalDays'],
  ctoAvailment: [
    'totalDaysApplied',
    'earnedCocHoursAsOf',
    'runningCocBalance',
    'totalHoursFiled',
    'cocBalanceApproved',
  ],
  cocBalances: ['totalBalanceHours'],
  leaveAvailmentPerOffice: ['vlFl', 'sl', 'mcCo', 'wlp', 'others', 'totalNoLeave'],
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toBase64(url) {
  return fetch(url)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        }),
    )
}

function formatGeneratedDate(value = new Date()) {
  return value.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function resolveReportTitle(reportType, reportLabel) {
  return normalizeText(REPORT_TITLE_MAP[reportType] || reportLabel).toUpperCase()
}

function resolveMonthContextLine(filters = {}, rows = [], monthNames = DEFAULT_MONTH_NAMES) {
  if (filters.month && filters.year) {
    const month = monthNames[filters.month - 1] || String(filters.month)
    return `FOR THE MONTH OF ${month.toUpperCase()} ${filters.year}`
  }

  if (filters.month && !filters.year) {
    const month = monthNames[filters.month - 1] || String(filters.month)
    return `FOR THE MONTH OF ${month.toUpperCase()}`
  }

  if (filters.year && !filters.month) {
    return `FOR THE YEAR ${filters.year}`
  }

  const uniquePeriods = Array.from(
    new Set(
      rows
        .map((row) => {
          if (!row || !row.month || !row.year) return ''
          return `${row.month}-${row.year}`
        })
        .filter(Boolean),
    ),
  )

  if (uniquePeriods.length === 1) {
    const [monthRaw, yearRaw] = uniquePeriods[0].split('-')
    const month = monthNames[Number(monthRaw) - 1] || monthRaw
    return `FOR THE MONTH OF ${String(month).toUpperCase()} ${yearRaw}`
  }

  return 'FOR ALL PERIODS'
}

function resolveValueByColumn(row, column, rowIndex) {
  if (column?.name === 'no') {
    return row?.no ?? rowIndex + 1
  }

  const field = column?.field
  if (typeof field === 'function') return field(row)
  if (typeof field === 'string') return row?.[field]
  return row?.[column?.name]
}

function formatCellValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(2)
  }
  return String(value)
}

function normalizeHeaderLabel(label) {
  return normalizeText(String(label || '').replace(/\n+/g, ' '))
}

function resolveBodyAlignment(column, reportType) {
  const centeredColumns = PDF_CENTERED_VALUE_COLUMNS[reportType]
  if (Array.isArray(centeredColumns) && centeredColumns.includes(column?.name)) return 'center'

  if (column?.align === 'right') return 'right'
  if (column?.align === 'center') return 'center'
  if (column?.name === 'no') return 'center'
  return 'left'
}

function buildTableWidths(columns, reportType) {
  if (!Array.isArray(columns) || columns.length === 0) return []

  if (reportType === 'leaveBalances') {
    return columns.map((column) => {
      const name = column?.name

      if (name === 'no') return 20
      if (name === 'name') return 72
      if (name === 'designation') return 70
      if (name === 'status') return 52
      if (name === 'totalNoLeave') return 36
      if (name === 'remarks') return 62

      return 28
    })
  }

  const columnWidthByName = {
    no: 28,
    name: 92,
    designation: 90,
    status: 66,
    office: reportType === 'ctoAvailment' ? 62 : 74,
    remarks: 104,
    periodIncurred: 100,
    inclusiveDates: 100,
    dateReceivedHRMO: 88,
    dateReceivedCHRMO: 88,
    dateOfFiling: 84,
    dateFiled: 76,
    monthYearEarned: 86,
    monthYearExpired: 86,
    typeOfLeave: 66,
    totalDaysLWOP: 68,
    totalDays: 60,
    totalNoLeave: 56,
    totalDaysApplied: 78,
    earnedCocHoursAsOf: 84,
    runningCocBalance: 84,
    totalHoursFiled: 82,
    cocBalanceApproved: 84,
    totalBalanceHours: 74,
    vlFl: 40,
    sl: 40,
    mcCo: 44,
    wlp: 40,
    others: 46,
  }

  return columns.map((column) => {
    const name = column?.name
    const mappedWidth = columnWidthByName[name]
    return Number.isFinite(mappedWidth) ? mappedWidth : 68
  })
}

function resolvePageOrientation(reportType) {
  if (reportType === 'ctoAvailment' || reportType === 'leaveBalances') return 'landscape'
  return 'portrait'
}

function resolvePageMargins(reportType) {
  if (reportType === 'leaveBalances') return [16, 16, 16, 28]
  return [24, 16, 24, 28]
}

function resolvePageWidth(pageOrientation) {
  return pageOrientation === 'landscape' ? A4_LANDSCAPE_WIDTH : A4_PORTRAIT_WIDTH
}

function fitTableWidthsToContent(widths, pageOrientation, pageMargins) {
  if (!Array.isArray(widths) || widths.length === 0) return widths

  const hasFlexibleWidth = widths.some(
    (width) => width === '*' || width === 'auto' || typeof width === 'string',
  )
  if (hasFlexibleWidth) return widths

  const numericWidths = widths.map((width) => Number(width))
  if (numericWidths.some((width) => !Number.isFinite(width) || width < 0)) return widths

  const leftMargin = Number(pageMargins?.[0] || 0)
  const rightMargin = Number(pageMargins?.[2] || 0)
  const availableWidth = resolvePageWidth(pageOrientation) - leftMargin - rightMargin
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return widths

  const totalWidth = numericWidths.reduce((sum, width) => sum + width, 0)
  if (!Number.isFinite(totalWidth) || totalWidth <= 0) return widths

  const scale = availableWidth / totalWidth
  const scaledWidths = []
  let consumed = 0

  for (let index = 0; index < numericWidths.length; index += 1) {
    if (index === numericWidths.length - 1) {
      scaledWidths.push(Number(Math.max(0, availableWidth - consumed).toFixed(2)))
      break
    }

    const scaledWidth = Number((numericWidths[index] * scale).toFixed(2))
    scaledWidths.push(scaledWidth)
    consumed += scaledWidth
  }

  return scaledWidths
}

function resolveTableLayoutSettings(reportType) {
  const isDenseTable = reportType === 'leaveBalances'
  return {
    isDenseTable,
    lineWidth: isDenseTable ? 0.5 : 0.6,
    horizontalPadding: isDenseTable ? 1 : 2,
    verticalPadding: isDenseTable ? 1 : 2,
  }
}

function estimateTableDecorationWidth(columnCount, layoutSettings) {
  if (!Number.isFinite(columnCount) || columnCount <= 0) return 0

  const horizontalPadding = Number(layoutSettings?.horizontalPadding || 0)
  const lineWidth = Number(layoutSettings?.lineWidth || 0)

  const paddingWidth = columnCount * horizontalPadding * 2
  const borderWidth = (columnCount + 1) * lineWidth

  return paddingWidth + borderWidth
}

function buildHeaderBlock(logoBase64) {
  const compactHeaderBarHeight = 17
  const compactSmallBarTopOffset = 33
  const compactHeaderTextLeftInset = 6
  const compactHeaderTextSize = 10
  const compactOfficeBandPaddingTop = Math.max(0, Math.floor((compactHeaderBarHeight - compactHeaderTextSize) / 2))

  return {
    columns: [
      {
        width: 26,
        margin: [0, compactSmallBarTopOffset, 8, 0],
        canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: compactHeaderBarHeight, color: HEADER_BAR_COLOR }],
      },
      logoBase64
        ? { width: 78, image: logoBase64, fit: [72, 72], margin: [0, -1, 8, 0] }
        : { width: 80, text: '' },
      {
        width: '*',
        stack: [
          {
            text: 'REPUBLIC OF THE PHILIPPINES',
            fontSize: 7,
            margin: [compactHeaderTextLeftInset, 0, 0, 0],
          },
          {
            text: 'PROVINCE OF DAVAO DEL NORTE',
            fontSize: 7,
            margin: [compactHeaderTextLeftInset, 0, 0, 0],
          },
          {
            text: 'CITY OF TAGUM',
            fontSize: 14,
            bold: true,
            margin: [compactHeaderTextLeftInset, 0, 0, 0],
          },
          {
            table: {
              widths: ['*'],
              heights: [compactHeaderBarHeight],
              body: [
                [
                  {
                    text: 'CITY HUMAN RESOURCE MANAGEMENT OFFICE',
                    color: '#ffffff',
                    bold: true,
                    alignment: 'left',
                    fontSize: compactHeaderTextSize,
                    fillColor: HEADER_BAR_COLOR,
                    margin: [compactHeaderTextLeftInset, compactOfficeBandPaddingTop, 4, 0],
                  },
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
            margin: [0, 1, 0, 0],
          },
        ],
      },
    ],
    margin: [0, 0, 0, 8],
  }
}

function buildLegend(reportType) {
  if (reportType !== 'lwop') return null

  return {
    stack: [
      { text: 'LEGEND:', fontSize: 8, bold: true, margin: [0, 0, 0, 1] },
      { text: 'LF   LATE FILING', fontSize: 7, margin: [10, 0, 0, 0] },
      { text: 'LS   LATE SUBMISSION', fontSize: 7, margin: [10, 0, 0, 0] },
      { text: 'NMLC   NO MORE LEAVE CREDITS', fontSize: 7, margin: [10, 0, 0, 0] },
    ],
    margin: [0, 6, 0, 10],
  }
}

function resolveSignatories(input = {}) {
  const preparedBy = {
    label: DEFAULT_PREPARED_BY.label,
    name: normalizeText(input.preparedByName) || DEFAULT_PREPARED_BY.name,
    title: normalizeText(input.preparedByPosition) || DEFAULT_PREPARED_BY.title,
  }

  const reviewedBy = {
    label: DEFAULT_REVIEWED_BY.label,
    name: normalizeText(input.reviewedByName) || DEFAULT_REVIEWED_BY.name,
    title: normalizeText(input.reviewedByPosition) || DEFAULT_REVIEWED_BY.title,
  }

  const notedBy = {
    label: DEFAULT_NOTED_BY.label,
    name: normalizeText(input.notedByName) || DEFAULT_NOTED_BY.name,
    title: normalizeText(input.notedByPosition) || DEFAULT_NOTED_BY.title,
  }

  return { preparedBy, reviewedBy, notedBy }
}

function buildSignatureBlock(signatories) {
  return {
    table: {
      widths: ['*', '*', '*'],
      body: [
        [
          { text: signatories.preparedBy.label, style: 'signatureLabel' },
          { text: signatories.reviewedBy.label, style: 'signatureLabel' },
          { text: signatories.notedBy.label, style: 'signatureLabel' },
        ],
        [
          { text: signatories.preparedBy.name, style: 'signatureName', noWrap: true },
          { text: signatories.reviewedBy.name, style: 'signatureName', noWrap: true },
          { text: signatories.notedBy.name, style: 'signatureName', noWrap: true },
        ],
        [
          { text: signatories.preparedBy.title, style: 'signatureTitle' },
          { text: signatories.reviewedBy.title, style: 'signatureTitle' },
          { text: signatories.notedBy.title, style: 'signatureTitle' },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 2,
      paddingBottom: () => 0,
    },
    margin: [0, 10, 0, 0],
  }
}

function buildTableHeaderRows(columns, reportType) {
  const buildFlatHeaderRow = () => [
    columns.map((column) => ({
      text: normalizeHeaderLabel(column?.label),
      style: 'tableHeader',
      alignment: 'center',
    })),
  ]

  if (reportType === 'leaveAvailmentPerOffice') {
    const leaveTypeColumnNames = ['vlFl', 'sl', 'mcCo', 'wlp', 'others']
    const leaveTypeColumnSet = new Set(leaveTypeColumnNames)
    const firstLeaveIndex = columns.findIndex((column) => leaveTypeColumnSet.has(column?.name))
    const lastLeaveIndex = firstLeaveIndex + leaveTypeColumnNames.length - 1

    if (firstLeaveIndex < 0 || lastLeaveIndex >= columns.length) {
      return buildFlatHeaderRow()
    }

    const topRow = []
    const bottomRow = []

    columns.forEach((column, index) => {
      const columnLabel = normalizeHeaderLabel(column?.label)

      if (index < firstLeaveIndex || index > lastLeaveIndex) {
        topRow.push({
          text: columnLabel,
          style: 'tableHeader',
          alignment: 'center',
          rowSpan: 2,
        })
        bottomRow.push({})
        return
      }

      if (index === firstLeaveIndex) {
        topRow.push({
          text: 'TYPE OF LEAVE',
          style: 'tableHeader',
          alignment: 'center',
          colSpan: leaveTypeColumnNames.length,
        })
      } else {
        topRow.push({})
      }

      bottomRow.push({
        text: columnLabel,
        style: 'tableHeader',
        alignment: 'center',
      })
    })

    return [topRow, bottomRow]
  }

  if (reportType === 'leaveBalances') {
    const groupedColumnDefinitions = [
      {
        label: 'RUNNING BALANCE OF EARNED LEAVE CREDITS',
        columns: ['runningBalanceVl', 'runningBalanceSl'],
      },
      {
        label: 'ANNUAL BALANCE',
        columns: ['annualBalanceMcCo', 'annualBalanceWlp', 'annualBalanceOthers'],
      },
      {
        label: 'TOTAL NO. OF DAYS PER TYPE OF LEAVE AVAILMENT',
        columns: ['daysVlFl', 'daysSl', 'daysMcCo', 'daysWlp', 'daysOthers'],
      },
      {
        label: 'TOTAL NO. OF BALANCES PER TYPE OF LEAVE',
        columns: ['balanceVl', 'balanceSl', 'balanceFl', 'balanceMcCo', 'balanceWlp', 'balanceOthers'],
      },
    ]

    const groupedColumnLookup = new Map()
    const groupedColumnSubLabels = {
      runningBalanceVl: 'VL',
      runningBalanceSl: 'SL',
      annualBalanceMcCo: 'MCO6',
      annualBalanceWlp: 'WLP',
      annualBalanceOthers: 'OTHERS',
      daysVlFl: 'VL/FL',
      daysSl: 'SL',
      daysMcCo: 'MCO6',
      daysWlp: 'WLP',
      daysOthers: 'OTHERS',
      balanceVl: 'VL',
      balanceSl: 'SL',
      balanceFl: 'FL',
      balanceMcCo: 'MCO6',
      balanceWlp: 'WLP',
      balanceOthers: 'OTHERS',
    }
    groupedColumnDefinitions.forEach((group) => {
      group.columns.forEach((columnName, index) => {
        groupedColumnLookup.set(columnName, {
          label: group.label,
          span: group.columns.length,
          index,
        })
      })
    })

    const hasAllGroupedColumns = groupedColumnDefinitions.every((group) =>
      group.columns.every((columnName) => columns.some((column) => column?.name === columnName)),
    )

    if (!hasAllGroupedColumns) {
      return buildFlatHeaderRow()
    }

    const topRow = []
    const bottomRow = []

    columns.forEach((column) => {
      const columnLabel = normalizeHeaderLabel(column?.label)
      const groupedMeta = groupedColumnLookup.get(column?.name)

      if (!groupedMeta) {
        topRow.push({
          text: columnLabel,
          style: 'tableHeader',
          alignment: 'center',
          rowSpan: 2,
        })
        bottomRow.push({})
        return
      }

      if (groupedMeta.index === 0) {
        topRow.push({
          text: groupedMeta.label,
          style: 'tableHeader',
          alignment: 'center',
          colSpan: groupedMeta.span,
        })
      } else {
        topRow.push({})
      }

      bottomRow.push({
        text: groupedColumnSubLabels[column?.name] || columnLabel,
        style: 'tableHeader',
        alignment: 'center',
      })
    })

    return [topRow, bottomRow]
  }

  return buildFlatHeaderRow()
}

function buildTableBody(columns, rows, reportType) {
  const headerRows = buildTableHeaderRows(columns, reportType)

  const dataRows = rows.length
    ? rows.map((row, rowIndex) =>
        columns.map((column) => ({
          text: formatCellValue(resolveValueByColumn(row, column, rowIndex)),
          style: 'tableCell',
          alignment: resolveBodyAlignment(column, reportType),
        })),
      )
    : [
        [
          {
            text: 'No records found for the selected filters.',
            colSpan: columns.length,
            alignment: 'center',
            style: 'tableCell',
            margin: [0, 6, 0, 6],
          },
          ...Array.from({ length: Math.max(columns.length - 1, 0) }, () => ({})),
        ],
      ]

  return [...headerRows, ...dataRows]
}

function buildFilename(reportTitle) {
  const safeTitle = normalizeText(reportTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${safeTitle || 'report'}-${Date.now()}.pdf`
}

function buildDocDefinition(params, logoBase64) {
  const reportTitle = resolveReportTitle(params.reportType, params.reportLabel)
  const monthLine = resolveMonthContextLine(params.filters, params.rows, params.monthNames)
  const generatedDate = formatGeneratedDate(new Date())
  const pageOrientation = resolvePageOrientation(params.reportType)
  const pageMargins = resolvePageMargins(params.reportType)
  const tableLayoutSettings = resolveTableLayoutSettings(params.reportType)
  const tableDecorationWidth = estimateTableDecorationWidth(params.columns.length, tableLayoutSettings)
  const widths = fitTableWidthsToContent(
    buildTableWidths(params.columns, params.reportType).map((width) => width),
    pageOrientation,
    [pageMargins[0], pageMargins[1], pageMargins[2] + tableDecorationWidth, pageMargins[3]],
  )
  const legendBlock = buildLegend(params.reportType)
  const signatories = resolveSignatories(params.signatories)
  const headerRowsCount =
    params.reportType === 'leaveAvailmentPerOffice' || params.reportType === 'leaveBalances' ? 2 : 1
  const isDenseTable = tableLayoutSettings.isDenseTable

  return {
    pageSize: 'A4',
    pageOrientation,
    pageMargins,
    content: [
      buildHeaderBlock(logoBase64),
      { text: reportTitle, style: 'reportTitle', margin: [0, 0, 0, 1] },
      { text: monthLine, style: 'reportSubTitle', margin: [0, 0, 0, 1] },
      { text: `DATE GENERATED AS OF ${generatedDate.toUpperCase()}`, style: 'generatedDate', margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: headerRowsCount,
          widths,
          body: buildTableBody(params.columns, params.rows, params.reportType),
        },
        layout: {
          hLineWidth: () => tableLayoutSettings.lineWidth,
          vLineWidth: () => tableLayoutSettings.lineWidth,
          hLineColor: () => '#111111',
          vLineColor: () => '#111111',
          paddingLeft: () => tableLayoutSettings.horizontalPadding,
          paddingRight: () => tableLayoutSettings.horizontalPadding,
          paddingTop: () => tableLayoutSettings.verticalPadding,
          paddingBottom: () => tableLayoutSettings.verticalPadding,
        },
      },
      ...(legendBlock ? [legendBlock] : []),
      buildSignatureBlock(signatories),
    ],
    styles: {
      reportTitle: {
        fontSize: 16,
        bold: true,
        alignment: 'center',
      },
      reportSubTitle: {
        fontSize: 11,
        bold: true,
        alignment: 'center',
      },
      generatedDate: {
        fontSize: 10,
        alignment: 'center',
      },
      tableHeader: {
        bold: true,
        fontSize: isDenseTable ? 7 : 8,
      },
      tableCell: {
        fontSize: isDenseTable ? 7 : 8,
      },
      signatureLabel: {
        fontSize: 9,
        bold: true,
      },
      signatureName: {
        fontSize: 10,
        bold: true,
        margin: [0, 10, 0, 0],
      },
      signatureTitle: {
        fontSize: 9,
      },
    },
    defaultStyle: {
      font: 'Roboto',
    },
  }
}

export async function generateReportsMonitoringPdf(params = {}) {
  const rows = Array.isArray(params.rows) ? params.rows : []
  const columns = Array.isArray(params.columns) ? params.columns : []

  const normalizedParams = {
    action: params.action || 'open',
    reportType: params.reportType || '',
    reportLabel: params.reportLabel || 'Report',
    filters: params.filters || {},
    monthNames: Array.isArray(params.monthNames) && params.monthNames.length ? params.monthNames : DEFAULT_MONTH_NAMES,
    rows,
    columns,
    signatories: params.signatories || {},
  }

  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

  const docDefinition = buildDocDefinition(normalizedParams, logoBase64)
  const pdf = pdfMake.createPdf(docDefinition)
  const filename = buildFilename(resolveReportTitle(normalizedParams.reportType, normalizedParams.reportLabel))

  if (normalizedParams.action === 'print') {
    pdf.print()
    return
  }

  if (normalizedParams.action === 'download') {
    pdf.download(filename)
    return
  }

  pdf.open()
}
