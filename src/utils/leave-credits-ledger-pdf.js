import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

export const LEDGER_PAPER_PRESETS = {
  A4: {
    label: 'A4',
    previewWidth: 794,
    previewHeight: 1123,
    minimumRows: 46,
    pdfMinimumRows: 46,
    pageSize: 'A4',
    pageMargins: [8, 18, 8, 8],
    pdfHorizontalInset: 0,
    pdfGridLineWidth: 0.75,
    pdfActionColumnShrink: 10,
    pdfHeaderRowHeight: 14.5,
    pdfSubHeaderRowHeight: 24,
    pdfBodyRowHeight: 14.05,
  },
  LONG: {
    label: 'Long',
    previewWidth: 816,
    previewHeight: 1248,
    minimumRows: 56,
    pdfMinimumRows: 56,
    pageSize: {
      width: 612,
      height: 936,
    },
    pageMargins: [8, 18, 8, 8],
    pdfHorizontalInset: 0,
    pdfGridLineWidth: 0.75,
    pdfActionColumnShrink: 10,
    pdfHeaderRowHeight: 14.5,
    pdfSubHeaderRowHeight: 24,
    pdfBodyRowHeight: 14.2,
  },
}

export const LEDGER_COLUMN_WIDTH_UNITS = [10, 13, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 11]
export const LEDGER_COLUMN_WIDTH_TOTAL = LEDGER_COLUMN_WIDTH_UNITS.reduce(
  (total, width) => total + width,
  0,
)

export const LEDGER_LEAVE_TYPE_COLORS = Object.freeze({
  VL: '#000000',
  SL: '#000000',
  WL: '#1e5fbf',
  MC06: '#1b8f3a',
  MCO6: '#1b8f3a',
})

function resolveLedgerPdfIdentityFontSize(value) {
  const length = String(value || '').trim().length

  if (length > 72) return 6.3
  if (length > 60) return 6.7
  if (length > 54) return 7
  if (length > 42) return 7.5
  if (length > 30) return 8
  return 8.6
}

function getLedgerPdfPageWidth(preset) {
  if (preset?.pageSize === 'A4') return 595.28

  const customWidth = Number(preset?.pageSize?.width)
  return Number.isFinite(customWidth) && customWidth > 0 ? customWidth : 595.28
}

function buildLedgerPdfTableWidths(preset) {
  const pageWidth = getLedgerPdfPageWidth(preset)
  const leftMargin = Number(preset?.pageMargins?.[0] ?? 10)
  const rightMargin = Number(preset?.pageMargins?.[2] ?? 10)
  const horizontalInset = Number(preset?.pdfHorizontalInset ?? 0)
  const gridLineWidth = Number(preset?.pdfGridLineWidth ?? 0.75)
  const columnCount = LEDGER_COLUMN_WIDTH_UNITS.length
  const totalGridWidth = Math.max(0, (columnCount + 1) * gridLineWidth)
  const availableWidth = Math.max(
    460,
    pageWidth - leftMargin - rightMargin - horizontalInset * 2 - totalGridWidth,
  )

  const widths = LEDGER_COLUMN_WIDTH_UNITS.map((unit) =>
    Number(((availableWidth * unit) / LEDGER_COLUMN_WIDTH_TOTAL).toFixed(2)),
  )

  const actionColumnShrink = Number(preset?.pdfActionColumnShrink ?? 0)
  if (actionColumnShrink > 0) {
    const actionColumnIndex = widths.length - 1
    widths[actionColumnIndex] = Number(
      Math.max(30, widths[actionColumnIndex] - actionColumnShrink).toFixed(2),
    )
  }

  return widths
}

function hasLedgerDisplayValue(value) {
  return String(value ?? '').trim() !== ''
}

function resolveLedgerValueColorByLeaveCode(leaveCode) {
  const normalizedCode = String(leaveCode || '').toUpperCase()
  return LEDGER_LEAVE_TYPE_COLORS[normalizedCode] || '#000000'
}

function sanitizeLedgerPdfFilenamePart(value) {
  return String(value ?? '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getLedgerPdfFilename(employeeFullName) {
  const safeName = sanitizeLedgerPdfFilenamePart(
    String(employeeFullName || '').replace(/,\s*/g, ' '),
  )
  return `${safeName || 'employee'} leave credits ledger.pdf`
}

function buildLedgerPdfIdentityCell(text, options = {}) {
  return {
    text: String(text || ' ').trim() || ' ',
    fontSize: options.fontSize ?? 8.6,
    bold: options.bold ?? true,
    color: '#000000',
    alignment: options.alignment || 'center',
    margin: options.margin || [2, 1, 2, 1],
    noWrap: options.noWrap ?? true,
  }
}

function buildLedgerPdfIdentityServiceCell(value, options = {}) {
  return {
    text: String(value || 'N/A').trim() || 'N/A',
    fontSize: options.fontSize ?? 8.6,
    bold: true,
    color: '#000000',
    alignment: options.alignment || 'center',
    noWrap: options.noWrap ?? true,
    margin: options.margin || [2, 1, 2, 1],
  }
}

function buildLedgerPdfTopLabelCell(text) {
  return {
    text: String(text || '').toUpperCase(),
    fontSize: 8.6,
    bold: true,
    color: '#000000',
    alignment: 'center',
    margin: [0, 1.8, 0, 1.8],
  }
}

function estimateLedgerPdfTextWidth(text, fontSize) {
  let total = 0
  for (const ch of String(text || '')) {
    if (' iltrfj.,-:/()'.includes(ch)) {
      total += 0.34
    } else if ('MWmw@%'.includes(ch)) {
      total += 0.82
    } else if (ch >= 'A' && ch <= 'Z') {
      total += 0.66
    } else if (ch >= '0' && ch <= '9') {
      total += 0.58
    } else {
      total += 0.54
    }
  }
  return total * fontSize
}

function estimateLedgerPdfWrappedLineCount(text, fontSize, maxWidth, noWrap = false) {
  const paragraphs = String(text || ' ').split('\n')
  if (noWrap || !Number.isFinite(maxWidth) || maxWidth <= 0) {
    return Math.max(1, paragraphs.length)
  }

  const usableWidth = Math.max(12, maxWidth - 0.8)
  let lineCount = 0

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) {
      lineCount += 1
      continue
    }

    const tokens = trimmed.split(/(\s+)/).filter(Boolean)
    let currentLine = ''

    for (const token of tokens) {
      if (/^\s+$/.test(token)) {
        if (currentLine) currentLine += token
        continue
      }

      const candidate = currentLine ? `${currentLine}${token}` : token
      if (currentLine && estimateLedgerPdfTextWidth(candidate.trimEnd(), fontSize) > usableWidth) {
        lineCount += 1
        currentLine = token
      } else {
        currentLine = candidate
      }
    }

    if (currentLine.trim()) {
      lineCount += 1
    }
  }

  return Math.max(1, lineCount)
}

function buildLedgerPdfBodyCellMargin(text, options = {}) {
  if (Array.isArray(options.margin)) return options.margin

  const fontSize = Number(options.fontSize ?? 6.85)
  const lineHeight = Number(options.lineHeight ?? 0.95)
  const rowHeight = Number(options.rowHeight ?? 14.05)
  const lineCount = estimateLedgerPdfWrappedLineCount(
    text,
    fontSize,
    Number(options.maxWidth),
    Boolean(options.noWrap),
  )
  // pdfMake uses the font's internal ascender/descender which adds about ~1.2x height
  const estimatedTextHeight = fontSize * lineHeight * 1.2 * lineCount
  const verticalMargin = Math.max(0, (rowHeight - estimatedTextHeight) / 2)

  return [0.2, verticalMargin, 0.2, verticalMargin]
}

function buildLedgerPdfBodyCell(value, options = {}) {
  const text = String(value ?? '').trim()
  const fontSize = options.fontSize ?? 6.85
  const lineHeight = options.lineHeight ?? 0.95

  return {
    text: text || ' ',
    alignment: options.alignment || 'center',
    bold: options.bold ?? false,
    color: options.color || '#000000',
    fillColor: options.fillColor,
    fontSize,
    lineHeight,
    margin: buildLedgerPdfBodyCellMargin(text, {
      ...options,
      fontSize,
      lineHeight,
    }),
    noWrap: options.noWrap ?? false,
  }
}

function buildLedgerPdfValueCell(
  value,
  fillColor,
  options = {},
  entry = null,
  section = '',
  resolveCellLeaveCode = null,
) {
  const hasValue = hasLedgerDisplayValue(value)
  const leaveCode =
    typeof resolveCellLeaveCode === 'function' ? resolveCellLeaveCode(entry, section) : ''
  const color = hasValue ? resolveLedgerValueColorByLeaveCode(leaveCode) : '#000000'

  return buildLedgerPdfBodyCell(value, {
    color,
    bold: hasValue,
    fillColor,
    noWrap: hasValue,
    ...options,
  })
}

function buildLedgerPdfTableBody(
  rows,
  preset = {},
  tableWidths = [],
  resolveCellLeaveCode = null,
) {
  const resolvedWidths =
    Array.isArray(tableWidths) && tableWidths.length > 0
      ? tableWidths
      : buildLedgerPdfTableWidths(preset)
  const periodColumnWidth = Number(resolvedWidths[0] ?? 0)
  const actionColumnWidth = Number(resolvedWidths[resolvedWidths.length - 1] ?? 0)
  const bodyRowHeight = Number(preset?.pdfBodyRowHeight ?? 14.05)
  const tableBody = [
    [
      {
        text: 'INCLUSIVE\nDATES',
        rowSpan: 2,
        style: 'ledgerPdfRowSpanHead',
      },
      {
        text: 'PARTICULARS',
        rowSpan: 2,
        style: 'ledgerPdfRowSpanHead',
      },
      {
        text: 'VACATION LEAVE',
        colSpan: 4,
        style: 'ledgerPdfGroupHead',
      },
      {},
      {},
      {},
      {
        text: 'SICK LEAVE',
        colSpan: 4,
        style: 'ledgerPdfGroupHead',
      },
      {},
      {},
      {},
      {
        text: 'OTHER TYPE OF LEAVE',
        colSpan: 4,
        style: 'ledgerPdfGroupHead',
      },
      {},
      {},
      {},
      {
        text: 'DATE &\nACTION\nTAKEN ON\nAPPLICATION\nFOR LEAVE',
        rowSpan: 2,
        style: 'ledgerPdfActionHead',
      },
    ],
    [
      {},
      {},
      { text: 'EARNED', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/P', style: 'ledgerPdfSubHead' },
      { text: 'BAL.', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/oP', style: 'ledgerPdfSubHead' },
      { text: 'EARNED', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.', style: 'ledgerPdfSubHead' },
      { text: 'BAL.', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/oP', style: 'ledgerPdfSubHead' },
      { text: 'EARNED', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.', style: 'ledgerPdfSubHead' },
      { text: 'BAL.', style: 'ledgerPdfSubHead' },
      { text: 'ABS.\nUND.\nW/oP', style: 'ledgerPdfSubHead' },
      {},
    ],
  ]

  rows.forEach((entry) => {
    tableBody.push([
      buildLedgerPdfBodyCell(entry.period, {
        bold: Boolean(String(entry.period || '').trim()),
        fontSize: 5.4,
        lineHeight: 0.92,
        noWrap: false,
        maxWidth: periodColumnWidth,
        rowHeight: bodyRowHeight,
      }),
      buildLedgerPdfBodyCell(entry.particulars, {
        bold: Boolean(String(entry.particulars || '').trim()),
        fontSize: 5.6,
        lineHeight: 1,
        noWrap: true,
        rowHeight: bodyRowHeight,
      }),
      buildLedgerPdfValueCell(
        entry.vacationEarned,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.vacationAbsUndWp,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.vacationBalance,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.vacationAbsUndWop,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'VL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.sickEarned,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.sickAbsUnd,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.sickBalance,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.sickAbsUndWop,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'SL',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.otherEarned,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.otherAbsUndWp,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.otherBalance,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfValueCell(
        entry.otherAbsUndWop,
        undefined,
        {
          fontSize: 6.85,
          rowHeight: bodyRowHeight,
        },
        entry,
        'OTHER',
        resolveCellLeaveCode,
      ),
      buildLedgerPdfBodyCell(entry.actionTaken, {
        bold: Boolean(String(entry.actionTaken || '').trim()),
        fontSize: 5.4,
        lineHeight: 0.92,
        noWrap: false,
        maxWidth: actionColumnWidth,
        rowHeight: bodyRowHeight,
      }),
    ])
  })

  return tableBody
}

function buildLedgerPdfPageHeader(
  headingName,
  headingStatus,
  headingOffice,
  firstDayOfService,
  identityNameFontSize,
  identityStatusFontSize,
  identityOfficeFontSize,
  identityServiceFontSize,
  horizontalInset,
  gridLineWidth,
  headerUnderlineRightTrim,
) {
  return [
    {
      table: {
        widths: ['34%', '13%', '29%', '24%'],
        body: [
          [
            buildLedgerPdfIdentityCell(headingName, {
              fontSize: identityNameFontSize,
              alignment: 'center',
            }),
            buildLedgerPdfIdentityCell(headingStatus, {
              fontSize: identityStatusFontSize,
              alignment: 'center',
            }),
            buildLedgerPdfIdentityCell(headingOffice, {
              fontSize: identityOfficeFontSize,
              alignment: 'center',
            }),
            buildLedgerPdfIdentityServiceCell(firstDayOfService, {
              fontSize: identityServiceFontSize,
              alignment: 'center',
            }),
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [horizontalInset, 0, horizontalInset + headerUnderlineRightTrim, 2],
    },
    {
      table: {
        widths: ['34%', '13%', '29%', '24%'],
        body: [
          [
            buildLedgerPdfTopLabelCell('Name'),
            buildLedgerPdfTopLabelCell('Status'),
            buildLedgerPdfTopLabelCell('Division Office'),
            buildLedgerPdfTopLabelCell('1st Day of Service'),
          ],
        ],
      },
      layout: {
        hLineWidth: () => gridLineWidth,
        vLineWidth: () => 0,
        hLineColor: () => '#000000',
        vLineColor: () => '#000000',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [horizontalInset, 0, horizontalInset + headerUnderlineRightTrim, 0],
    },
  ]
}

export function buildLeaveCreditsLedgerDocDefinition({
  displayName = 'N/A',
  headingName = 'N/A',
  headingStatus = 'N/A',
  headingOffice = 'N/A',
  firstDayOfService = 'N/A',
  renderedPages = [[]],
  paperSize = 'A4',
  preset: customPreset = null,
  resolveCellLeaveCode = null,
} = {}) {
  const preset = customPreset || LEDGER_PAPER_PRESETS[paperSize] || LEDGER_PAPER_PRESETS.A4
  const identityNameFontSize = resolveLedgerPdfIdentityFontSize(headingName)
  const identityStatusFontSize = resolveLedgerPdfIdentityFontSize(headingStatus)
  const identityOfficeFontSize = resolveLedgerPdfIdentityFontSize(headingOffice)
  const identityServiceFontSize = resolveLedgerPdfIdentityFontSize(firstDayOfService)
  const horizontalInset = Number(preset?.pdfHorizontalInset ?? 0)
  const gridLineWidth = Number(preset?.pdfGridLineWidth ?? 0.75)
  const headerUnderlineRightTrim = Number(preset?.pdfActionColumnShrink ?? 0) * 0.45
  const pages = Array.isArray(renderedPages) && renderedPages.length ? renderedPages : [[]]
  const tableWidths = buildLedgerPdfTableWidths(preset)
  const content = pages.map((pageRows, pageIndex) => {
    const pageHeader = buildLedgerPdfPageHeader(
      headingName,
      headingStatus,
      headingOffice,
      firstDayOfService,
      identityNameFontSize,
      identityStatusFontSize,
      identityOfficeFontSize,
      identityServiceFontSize,
      horizontalInset,
      gridLineWidth,
      headerUnderlineRightTrim,
    )

    return {
      stack: [
        ...pageHeader,
        {
          table: {
            headerRows: 2,
            widths: tableWidths,
            heights: (rowIndex) => {
              if (rowIndex === 0) return preset.pdfHeaderRowHeight
              if (rowIndex === 1) return preset.pdfSubHeaderRowHeight
              return preset.pdfBodyRowHeight
            },
            body: buildLedgerPdfTableBody(pageRows, preset, tableWidths, resolveCellLeaveCode),
          },
          dontBreakRows: true,
          keepWithHeaderRows: 2,
          layout: {
            hLineWidth: (lineIndex) => (lineIndex === 0 ? 0 : gridLineWidth),
            vLineWidth: () => gridLineWidth,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
            paddingLeft: () => 0.2,
            paddingRight: () => 0.2,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [horizontalInset, 0, horizontalInset, 0],
        },
      ],
      pageBreak: pageIndex > 0 ? 'before' : undefined,
    }
  })

  return {
    pageSize: preset.pageSize,
    pageOrientation: 'portrait',
    pageMargins: preset.pageMargins,
    info: {
      title: `Leave Credits Ledger - ${displayName}`,
      author: 'LMS Frontend',
      subject: 'Employee leave credits ledger',
    },
    content,
    styles: {
      ledgerPdfRowSpanHead: {
        color: '#000000',
        fontSize: 6.8,
        bold: true,
        alignment: 'center',
        margin: [0.8, 10.8, 0.8, 0],
        lineHeight: 1.01,
      },
      ledgerPdfActionHead: {
        color: '#000000',
        fontSize: 5.8,
        bold: true,
        alignment: 'center',
        margin: [0.35, 2.5, 0.35, 0],
        lineHeight: 0.93,
      },
      ledgerPdfGroupHead: {
        color: '#000000',
        fontSize: 6.8,
        bold: true,
        alignment: 'center',
        margin: [0.8, 3.2, 0.8, 0],
        lineHeight: 1,
      },
      ledgerPdfSubHead: {
        color: '#000000',
        fontSize: 6.72,
        bold: true,
        alignment: 'center',
        margin: [0.6, 2.4, 0.6, 0],
        lineHeight: 0.96,
      },
    },
    defaultStyle: {
      fontSize: 7.2,
      color: '#000000',
    },
  }
}

export function printLeaveCreditsLedgerPdf({
  employeeFullName = '',
  displayName = 'N/A',
  headingName = 'N/A',
  headingStatus = 'N/A',
  headingOffice = 'N/A',
  firstDayOfService = 'N/A',
  renderedPages = [[]],
  paperSize = 'A4',
  preset = null,
  resolveCellLeaveCode = null,
} = {}) {
  const docDefinition = buildLeaveCreditsLedgerDocDefinition({
    displayName,
    headingName,
    headingStatus,
    headingOffice,
    firstDayOfService,
    renderedPages,
    paperSize,
    preset,
    resolveCellLeaveCode,
  })

  pdfMake.createPdf(docDefinition).print()

  return {
    filename: getLedgerPdfFilename(employeeFullName || displayName),
    docDefinition,
  }
}
