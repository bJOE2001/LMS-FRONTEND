import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_BAR_COLOR = '#0f6b3a'
const DEFAULT_MAYOR_NAME = 'REY T. UY'
const DEFAULT_MAYOR_TITLE = 'City Mayor'

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

function formatDateLong(value) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return normalizeText(value)

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildHeader(logoBase64) {
  const headerBarHeight = 18
  const smallRectTopOffset = 35
  const headerTextSize = 10
  const leftInset = 6
  const officeBandPaddingTop = Math.max(0, Math.floor((headerBarHeight - headerTextSize) / 2))

  return {
    columns: [
      {
        width: 28,
        margin: [0, smallRectTopOffset, 8, 0],
        canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: headerBarHeight, color: HEADER_BAR_COLOR }],
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
                    text: 'OFFICE OF THE CITY MAYOR',
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
    margin: [0, 0, 0, 16],
  }
}

function detailRow(label, value) {
  return {
    columns: [
      { width: 72, text: label, fontSize: 10 },
      { width: 12, text: ':', fontSize: 10, alignment: 'center' },
      {
        width: '*',
        text: normalizeText(value),
        bold: true,
        fontSize: 10,
        characterSpacing: 0.1,
      },
    ],
    margin: [0, 0, 0, 12],
  }
}

function paragraph(text, options = {}) {
  return {
    text,
    fontSize: 10,
    alignment: 'justify',
    lineHeight: 1.15,
    margin: options.margin || [38, 0, 38, 14],
  }
}

function resolveRecallFormData(source = {}) {
  const inclusiveDates =
    normalizeText(source.inclusiveDates || source.inclusive_dates) || 'November 25 - 29, 2026'

  return {
    officeOrderNo: normalizeText(source.officeOrderNo || source.office_order_no) || '___',
    seriesYear: normalizeText(source.seriesYear || source.series_year) || '2026',
    date: formatDateLong(source.date || source.orderDate || source.order_date) || 'November 13, 2026',
    recipientName:
      normalizeText(source.recipientName || source.recipient_name || source.employeeName || source.employee_name) ||
      'REYNALDO D. CASAS, HRMO III',
    from:
      normalizeText(source.from || source.fromOffice || source.from_office) ||
      'CITY HUMAN RESOURCE MANAGEMENT OFFICER',
    subject: normalizeText(source.subject) || 'RECALL ORDER',
    firstParagraph:
      normalizeText(source.firstParagraph || source.first_paragraph) ||
      `In view of the exigency of services at the City Human Resource Management Office, you are hereby recalled from your scheduled and approved forced leave with inclusive dates on ${inclusiveDates}.`,
    secondParagraph:
      normalizeText(source.secondParagraph || source.second_paragraph) ||
      'As such, your unused leave credits shall be restored in accordance to the Civil Service Rules and Regulations.',
    thirdParagraph:
      normalizeText(source.thirdParagraph || source.third_paragraph) ||
      'For your information and guidance.',
    mayorName:
      normalizeText(source.mayorName || source.mayor_name || source.signatoryName || source.signatory_name) ||
      DEFAULT_MAYOR_NAME,
    mayorTitle:
      normalizeText(source.mayorTitle || source.mayor_title || source.signatoryTitle || source.signatory_title) ||
      DEFAULT_MAYOR_TITLE,
  }
}

export function buildRecallFormDocDefinition(formData = {}, logoBase64 = null) {
  const data = resolveRecallFormData(formData)

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [24, 18, 24, 34],
    content: [
      buildHeader(logoBase64),
      {
        stack: [
          {
            text: [
              { text: 'OFFICE ORDER NO. ', bold: true },
              { text: `${data.officeOrderNo}, S. ${data.seriesYear}`, bold: true },
            ],
            fontSize: 10,
            margin: [0, 0, 0, 2],
          },
          { text: data.date, fontSize: 10, margin: [0, 0, 0, 18] },
          detailRow('To', data.recipientName),
          detailRow('From', data.from),
          detailRow('Subject', data.subject),
        ],
        margin: [48, 0, 36, 2],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 547, y2: 0, lineWidth: 1, lineColor: '#111111' },
          { type: 'line', x1: 0, y1: 3, x2: 547, y2: 3, lineWidth: 1, lineColor: '#111111' },
        ],
        margin: [0, 0, 0, 24],
      },
      paragraph(data.firstParagraph),
      paragraph(data.secondParagraph),
      paragraph(data.thirdParagraph, { margin: [76, 4, 38, 46] }),
      {
        stack: [
          { text: data.mayorName.toUpperCase(), bold: true, fontSize: 10 },
          { text: data.mayorTitle, fontSize: 10, margin: [0, 2, 0, 0] },
        ],
        margin: [390, 0, 0, 0],
      },
    ],
    defaultStyle: {
      font: 'Roboto',
    },
  }
}

export async function generateRecallFormPdf(formData = {}) {
  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

  pdfMake.createPdf(buildRecallFormDocDefinition(formData, logoBase64)).open()
}
