import pdfMake from 'pdfmake/build/pdfmake.js'
import pdfFonts from 'pdfmake/build/vfs_fonts.js'
import { exportReportsMonitoringExcel } from 'src/utils/reports-monitoring-export.js'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_BAR_COLOR = '#0f6b3a'

function sanitizeFilenameSegment(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatEmployeeName(row) {
  if (row.employee?.surname && row.employee?.firstname) {
    const mi = row.employee.middlename ? ` ${row.employee.middlename.charAt(0)}.` : ''
    return `${row.employee.surname}, ${row.employee.firstname}${mi}`.toUpperCase()
  }
  
  const fullName = row.employee_name || ''
  if (!fullName) return ''
  
  const parts = fullName.trim().split(' ').filter(Boolean)
  if (parts.length < 2) return fullName
  
  const lastName = parts.pop()
  const firstName = parts.shift()
  const middleName = parts.length > 0 ? parts.join(' ') : ''
  const mi = middleName ? ` ${middleName.charAt(0)}.` : ''
  
  return `${lastName}, ${firstName}${mi}`.toUpperCase()
}

function formatDates(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return ''
  return dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })).join(', ')
}

function buildExportFilename(reportLabel, extension) {
  const reportSegment = sanitizeFilenameSegment(reportLabel) || 'report'
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${reportSegment}-${timestamp}.${extension}`
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
          },
        ],
      },
    ],
  }
}

export function exportReleasingExcel(applications, dateRangeLabel = 'Date Range') {
  const columns = [
    { name: 'no', label: 'No.' },
    { name: 'employee_control_no', label: 'Control No.', field: 'employee_control_no' },
    { name: 'employee_name', label: 'Employee Name', field: (row) => formatEmployeeName(row) },
    { name: 'office', label: 'Office', field: (row) => row.office_acronym || row.office || '' },
    { name: 'leave_type_name', label: 'Leave Type', field: 'leave_type_name' },
    { name: 'inclusive_dates', label: 'Inclusive Dates', field: (row) => formatDates(row.selected_dates) },
    { name: 'released_at', label: 'Date Released', field: (row) => {
        const releasedAt = row.released_at || row.releasedAt || row.hr_released_at
        if (!releasedAt) return ''
        return new Date(releasedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    } },
  ]
  
  exportReportsMonitoringExcel({
    columns,
    rows: applications,
    reportLabel: `Releasing Applications ${dateRangeLabel}`
  })
}

export async function exportReleasingPdf(applications, dateRangeLabel = 'Date Range') {
  const columns = [
    { name: 'no', label: 'No.', width: 'auto' },
    { name: 'employee_control_no', label: 'Control No.', width: 'auto' },
    { name: 'employee_name', label: 'Employee Name', width: '*' },
    { name: 'office', label: 'Office', width: 'auto' },
    { name: 'leave_type_name', label: 'Leave Type', width: 'auto' },
    { name: 'inclusive_dates', label: 'Inclusive Dates', width: 'auto' },
    { name: 'released_at', label: 'Date Released', width: 'auto' },
  ]

  const headers = columns.map(c => ({
    text: c.label,
    style: 'tableHeader',
    alignment: 'center'
  }))

  const body = applications.map((row, index) => {
    const releasedAt = row.released_at || row.releasedAt || row.hr_released_at
    return [
      { text: String(index + 1), alignment: 'center' },
      { text: row.employee_control_no || '', alignment: 'center' },
      { text: formatEmployeeName(row) },
      { text: row.office_acronym || row.office || '', alignment: 'center' },
      { text: row.leave_type_name || '', alignment: 'center' },
      { text: formatDates(row.selected_dates), alignment: 'center' },
      { 
        text: releasedAt ? new Date(releasedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '',
        alignment: 'center'
      },
    ]
  })

  const tableWidths = columns.map(c => c.width)

  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 40, 30, 40],
    content: [
      buildHeaderBlock(logoBase64),
      {
        text: 'RELEASING APPLICATIONS REPORT',
        style: 'subheader',
        alignment: 'center',
        margin: [0, 15, 0, 5]
      },
      {
        text: dateRangeLabel,
        style: 'dateRange',
        alignment: 'center',
        margin: [0, 0, 0, 15]
      },
      {
        table: {
          headerRows: 1,
          widths: tableWidths,
          body: [headers, ...body],
        },
        layout: {
          fillColor: function (rowIndex) {
            return rowIndex === 0 ? HEADER_BAR_COLOR : null
          },
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: (i) => (i === 0 || i === 1 ? HEADER_BAR_COLOR : '#cccccc'),
          vLineColor: () => '#cccccc',
        }
      }
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
      },
      subheader: {
        fontSize: 12,
        bold: true,
      },
      dateRange: {
        fontSize: 11,
        italics: true,
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'white',
        margin: [0, 4, 0, 4]
      }
    },
    defaultStyle: {
      fontSize: 9,
    }
  }

  const fileName = buildExportFilename(`Releasing Applications ${dateRangeLabel}`, 'pdf')
  pdfMake.createPdf(docDefinition).download(fileName)
}
