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
  if (!Array.isArray(dates) || dates.length === 0) return 'N/A'
  return dates
    .map((d) =>
      new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
    )
    .join(', ')
}

function formatDateDisplay(dateValue) {
  if (!dateValue) return 'N/A'
  const parsed = new Date(dateValue)
  if (isNaN(parsed.getTime())) return String(dateValue)
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function buildExportFilename(reportLabel, extension) {
  const reportSegment = sanitizeFilenameSegment(reportLabel) || 'cancelled-applications'
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

function getHeaderConfig(logoLeft, logoRight) {
  const compactHeaderBarHeight = 16
  const compactHeaderTextSize = 7.5
  const compactHeaderTextLeftInset = 6
  const compactOfficeBandPaddingTop = 3.5

  return {
    margin: [0, 0, 0, 10],
    stack: [
      {
        columns: [
          {
            image: logoLeft,
            width: 44,
            height: 44,
            alignment: 'left',
          },
          {
            width: '*',
            margin: [0, -2, 0, 0],
            stack: [
              { text: 'Republic of the Philippines', alignment: 'center', fontSize: 8 },
              { text: 'PROVINCE OF DAVAO DEL NORTE', bold: true, alignment: 'center', fontSize: 8.5 },
              { text: 'CITY OF TAGUM', bold: true, alignment: 'center', fontSize: 9.5 },
            ],
          },
          {
            image: logoRight,
            width: 44,
            height: 44,
            alignment: 'right',
          },
        ],
      },
      {
        margin: [0, -18, 0, 0],
        stack: [
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

export function exportCancelledApplicationsExcel(applications, dateRangeLabel = 'All') {
  const columns = [
    { name: 'no', label: 'No.' },
    { name: 'id', label: 'App ID', field: 'id' },
    { name: 'employee_control_no', label: 'Control No.', field: 'employee_control_no' },
    { name: 'employee_name', label: 'Employee Name', field: (row) => formatEmployeeName(row) },
    { name: 'office', label: 'Office', field: (row) => row.office_acronym || row.office || '' },
    { name: 'leave_type_name', label: 'Leave Type', field: (row) => row.leave_type_name || row.leave_type?.name || '' },
    { name: 'total_days', label: 'Days', field: (row) => row.total_days || '' },
    { name: 'inclusive_dates', label: 'Inclusive Dates', field: (row) => formatDates(row.selected_dates) },
    {
      name: 'cancellation_type',
      label: 'Cancellation Type',
      field: (row) => row.cancellation_type_label || (row.cancellation_type === 'APPROVED_CANCELLATION' ? 'Approved Cancellation' : 'Cancelled While Pending'),
    },
    { name: 'cancellation_date', label: 'Cancellation Date', field: (row) => formatDateDisplay(row.cancellation_date) },
    { name: 'cancellation_reason', label: 'Reason / Remarks', field: (row) => row.cancellation_reason || row.remarks || '' },
  ]

  exportReportsMonitoringExcel({
    columns,
    rows: applications,
    reportLabel: `Cancelled Applications ${dateRangeLabel}`,
  })
}

export async function exportCancelledApplicationsPdf(applications, dateRangeLabel = 'All') {
  const columns = [
    { name: 'no', label: 'No.', width: 'auto' },
    { name: 'id', label: 'ID', width: 'auto' },
    { name: 'employee_control_no', label: 'Control #', width: 'auto' },
    { name: 'employee_name', label: 'Employee Name', width: '*' },
    { name: 'office', label: 'Office', width: 'auto' },
    { name: 'leave_type_name', label: 'Leave Type', width: 'auto' },
    { name: 'total_days', label: 'Days', width: 'auto' },
    { name: 'cancellation_type', label: 'Cancellation Type', width: 'auto' },
    { name: 'cancellation_date', label: 'Date Cancelled', width: 'auto' },
    { name: 'cancellation_reason', label: 'Reason', width: 90 },
  ]

  let logoTagum = null
  let logoChrmo = null
  try {
    logoTagum = await toBase64('/tagum-logo.png')
    logoChrmo = await toBase64('/chrmo.png')
  } catch {
    // Continue without logos if unavailable
  }

  const tableHeader = columns.map((col) => ({
    text: col.label,
    bold: true,
    fontSize: 8,
    fillColor: '#f1f5f9',
    color: '#1e293b',
    alignment: col.name === 'no' || col.name === 'id' || col.name === 'total_days' ? 'center' : 'left',
  }))

  const tableRows = applications.map((app, index) => {
    return [
      { text: String(index + 1), fontSize: 7.5, alignment: 'center' },
      { text: String(app.id || ''), fontSize: 7.5, alignment: 'center' },
      { text: String(app.employee_control_no || ''), fontSize: 7.5 },
      { text: formatEmployeeName(app), fontSize: 7.5, bold: true },
      { text: String(app.office_acronym || app.office || ''), fontSize: 7.5 },
      { text: String(app.leave_type_name || app.leave_type?.name || ''), fontSize: 7.5 },
      { text: String(app.total_days || ''), fontSize: 7.5, alignment: 'center' },
      {
        text: app.cancellation_type_label || (app.cancellation_type === 'APPROVED_CANCELLATION' ? 'Approved Cancel' : 'Pending Cancel'),
        fontSize: 7.5,
        color: app.cancellation_type === 'APPROVED_CANCELLATION' ? '#6b21a8' : '#b45309',
        bold: true,
      },
      { text: formatDateDisplay(app.cancellation_date), fontSize: 7.5 },
      { text: String(app.cancellation_reason || app.remarks || 'N/A'), fontSize: 7 },
    ]
  })

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 24, 28, 24],
    content: [
      logoTagum && logoChrmo ? getHeaderConfig(logoTagum, logoChrmo) : {},
      {
        text: `CANCELLED LEAVE APPLICATIONS REPORT (${dateRangeLabel.toUpperCase()})`,
        fontSize: 11,
        bold: true,
        alignment: 'center',
        margin: [0, 8, 0, 4],
        color: '#0f6b3a',
      },
      {
        text: `Total Records: ${applications.length} | Generated on ${new Date().toLocaleString()}`,
        fontSize: 8,
        alignment: 'center',
        color: '#64748b',
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: columns.map((col) => col.width),
          body: [tableHeader, ...tableRows],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.75 : 0.4),
          vLineWidth: () => 0,
          hLineColor: (i) => (i <= 1 ? '#0f6b3a' : '#e2e8f0'),
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ],
    defaultStyle: {
      fontSize: 8,
    },
  }

  const fileName = buildExportFilename(`Cancelled Applications ${dateRangeLabel}`, 'pdf')
  pdfMake.createPdf(docDefinition).download(fileName)
}
