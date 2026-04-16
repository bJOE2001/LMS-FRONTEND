import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_BAR_COLOR = '#0f6b3a'

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

function buildHeader(logoBase64) {
  const headerBarHeight = 18
  const smallRectHeight = headerBarHeight
  const smallRectTopOffset = 35
  const headerTextSize = 10
  const leftInset = 6
  const officeBandPaddingTop = Math.max(0, Math.floor((headerBarHeight - headerTextSize) / 2))

  return {
    columns: [
      {
        width: 28,
        margin: [0, smallRectTopOffset, 8, 0],
        canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: smallRectHeight, color: HEADER_BAR_COLOR }],
      },
      logoBase64
        ? { width: 78, image: logoBase64, fit: [72, 72], margin: [0, 0, 8, 0] }
        : { width: 78, text: '' },
      {
        width: '*',
        stack: [
          { text: 'REPUBLIC OF THE PHILIPPINES', fontSize: 7, margin: [leftInset, 0, 0, 0] },
          { text: 'PROVINCE OF DAVAO DEL NORTE', fontSize: 7, margin: [leftInset, 0, 0, 0] },
          { text: 'CITY OF TAGUM', fontSize: 14, bold: true, margin: [leftInset, 0, 0, 0] },
          {
            table: {
              widths: ['*'],
              heights: [headerBarHeight],
              body: [
                [
                  {
                    text: 'CITY HUMAN RESOURCE MANAGEMENT OFFICE',
                    color: '#ffffff',
                    bold: true,
                    alignment: 'left',
                    fontSize: headerTextSize,
                    fillColor: HEADER_BAR_COLOR,
                    margin: [leftInset, officeBandPaddingTop, 4, 0],
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
            margin: [0, 2, 0, 0],
          },
        ],
      },
    ],
    columnGap: 0,
    margin: [0, 0, 0, 8],
  }
}

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

export async function printAdminApplicationsPdf({
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
  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

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
      buildHeader(logoBase64),
      {
        columns: [
          { width: '*', text: title, style: 'title', margin: [0, 0, 0, 0] },
          {
            width: 'auto',
            stack: [
              { text: `Printed: ${printedAt}`, style: 'meta', alignment: 'right' },
              {
                text: `Total Applications: ${rowsToPrint.length}`,
                style: 'meta',
                alignment: 'right',
              },
            ],
          },
        ],
        columnGap: 12,
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
