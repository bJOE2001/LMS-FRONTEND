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

function buildExportFilename(reportLabel, extension) {
  const reportSegment = sanitizeFilenameSegment(reportLabel) || 'report'
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${reportSegment}-${timestamp}.${extension}`
}

function buildExportDataset(columns, rows) {
  const exportColumns = Array.isArray(columns) ? columns : []
  const exportRows = Array.isArray(rows) ? rows : []

  const headers = exportColumns.map((column) => normalizeExportLabel(column.label || column.name || ''))
  const exportDatasetRows = exportRows.map((row, rowIndex) =>
    exportColumns.map((column) => resolveExportCellValue(row, column, rowIndex)),
  )

  return { headers, rows: exportDatasetRows }
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

export function exportReportsMonitoringCsv({ columns = [], rows = [], reportLabel = 'Report' } = {}) {
  const { headers, rows: datasetRows } = buildExportDataset(columns, rows)
  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...datasetRows.map((row) => row.map(escapeCsvValue).join(',')),
  ]
  const csvContent = `${csvRows.join('\n')}\n`
  const fileName = buildExportFilename(reportLabel, 'csv')

  downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;', true)
  return fileName
}

export function exportReportsMonitoringExcel({ columns = [], rows = [], reportLabel = 'Report' } = {}) {
  const { headers, rows: datasetRows } = buildExportDataset(columns, rows)
  const worksheetName = escapeXmlValue(normalizeWorksheetName(reportLabel))
  const headerCells = headers
    .map((header) => `<Cell><Data ss:Type="String">${escapeXmlValue(header)}</Data></Cell>`)
    .join('')

  const dataRowsXml = datasetRows
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

  const fileName = buildExportFilename(reportLabel, 'xls')
  downloadFile(workbookXml, fileName, 'application/vnd.ms-excel;charset=utf-8;', true)
  return fileName
}
