import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

function resolvePrintedTimestamp(value = new Date()) {
  return value.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function resolveReportTitle(searchText) {
  const normalizedSearchText = String(searchText || '').trim()
  return normalizedSearchText
    ? `Applications Report (Filtered: ${normalizedSearchText})`
    : 'Applications Report (All)'
}

function resolveInclusiveDatesDisplay(app, resolver) {
  if (typeof resolver !== 'function') return 'N/A'

  const resolved = resolver(app)
  if (Array.isArray(resolved)) return resolved.join('\n')

  const normalized = String(resolved || '').trim()
  return normalized || 'N/A'
}

function resolveTextValue(app, resolver, fallback = 'N/A') {
  if (typeof resolver !== 'function') return fallback

  const resolved = String(resolver(app) || '').trim()
  return resolved || fallback
}

export function printAdminApplicationsPdf({
  rows = [],
  searchText = '',
  formatDate,
  getApplicationInclusiveDateLines,
  getApplicationDurationDisplay,
  getApplicationStatusLabel,
  resolveProcessedBy,
  formatReviewedDate,
} = {}) {
  const rowsToPrint = Array.isArray(rows) ? rows : []
  if (!rowsToPrint.length) return false

  const resolveDate = typeof formatDate === 'function' ? formatDate : () => 'N/A'
  const printedAt = resolvePrintedTimestamp()
  const title = resolveReportTitle(searchText)

  const tableBody = [
    [
      { text: 'Employee', style: 'tableHeader' },
      { text: 'Leave Type', style: 'tableHeader' },
      { text: 'Date Filed', style: 'tableHeader' },
      { text: 'Inclusive Dates', style: 'tableHeader' },
      { text: 'Duration', style: 'tableHeader' },
      { text: 'Status', style: 'tableHeader' },
      { text: 'Processed By', style: 'tableHeader' },
      { text: 'Reviewed Date', style: 'tableHeader' },
    ],
    ...rowsToPrint.map((app) => [
      `${app?.employeeName || ''}${app?.employee_control_no ? `\n${app.employee_control_no}` : ''}`,
      app?.is_monetization ? `${app?.leaveType || 'N/A'} (Monetization)` : app?.leaveType || 'N/A',
      resolveDate(app?.dateFiled) || 'N/A',
      resolveInclusiveDatesDisplay(app, getApplicationInclusiveDateLines),
      resolveTextValue(app, getApplicationDurationDisplay),
      resolveTextValue(app, getApplicationStatusLabel),
      resolveTextValue(app, resolveProcessedBy),
      resolveTextValue(app, formatReviewedDate),
    ]),
  ]

  const docDefinition = {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    pageMargins: [24, 24, 24, 24],
    content: [
      { text: title, style: 'title' },
      { text: `Printed: ${printedAt}`, style: 'meta' },
      {
        text: `Total Applications: ${rowsToPrint.length}`,
        style: 'meta',
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 72, 125, 38, 68, 100, 82],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? '#ECEFF1' : null),
          hLineColor: () => '#CFD8DC',
          vLineColor: () => '#CFD8DC',
        },
      },
    ],
    styles: {
      title: { fontSize: 15, bold: true, color: '#263238', margin: [0, 0, 0, 4] },
      meta: { fontSize: 10, color: '#455A64', margin: [0, 0, 0, 2] },
      tableHeader: { bold: true, color: '#263238', fontSize: 10 },
    },
    defaultStyle: {
      fontSize: 9,
    },
  }

  pdfMake.createPdf(docDefinition).open()
  return true
}
