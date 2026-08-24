import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import {
  enrichAppWithDepartmentHead,
  getDepartmentHeadSignature,
  getMayorSignature,
} from './department-head-signature'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const HEADER_BAR_COLOR = '#0f6b3a'
const DEFAULT_MAYOR_NAME = 'REY T. UY'
const DEFAULT_MAYOR_TITLE = 'City Mayor'
const DEFAULT_FROM = 'THE LOCAL CHIEF EXECUTIVE'

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
  const headerBarHeight = 17
  const smallRectTopOffset = 38
  const headerTextSize = 11
  const leftInset = 6
  const officeBandPaddingTop = Math.max(0, Math.floor((headerBarHeight - headerTextSize) / 2))

  return {
    columns: [
      {
        width: 34,
        margin: [0, smallRectTopOffset, 8, 0],
        canvas: [{ type: 'rect', x: 0, y: 0, w: 28, h: headerBarHeight, color: HEADER_BAR_COLOR }],
      },
      logoBase64
        ? { width: 82, image: logoBase64, fit: [76, 76], margin: [0, 0, 8, 0] }
        : { width: 82, text: '' },
      {
        width: '*',
        stack: [
          {
            text: 'REPUBLIC OF THE PHILIPPINES',
            color: HEADER_BAR_COLOR,
            bold: true,
            fontSize: 7,
            margin: [leftInset, 1, 0, 0],
          },
          {
            text: 'PROVINCE OF DAVAO DEL NORTE',
            color: HEADER_BAR_COLOR,
            bold: true,
            fontSize: 7,
            margin: [leftInset, 0, 0, 0],
          },
          { text: 'CITY OF TAGUM', fontSize: 16, bold: true, margin: [leftInset, 0, 0, 0] },
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
    margin: [0, 0, 0, 20],
  }
}

function detailRow(label, value, options = {}) {
  return {
    columns: [
      { width: 72, text: label, fontSize: 10 },
      { width: 12, text: ':', fontSize: 10, alignment: 'center' },
      {
        width: '*',
        text: normalizeText(value),
        bold: options.bold !== false,
        fontSize: 10,
        characterSpacing: 0.1,
      },
    ],
    margin: [0, 0, 0, options.marginBottom ?? 12],
  }
}

function recipientDetailRow(name, position, label = 'To') {
  return {
    columns: [
      { width: 72, text: label, fontSize: 10 },
      { width: 12, text: ':', fontSize: 10, alignment: 'center' },
      {
        width: '*',
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: normalizeText(name).toUpperCase(),
                bold: true,
                fontSize: 10,
                margin: [4, 0, 4, 1],
              },
            ],
            [
              {
                text: normalizeText(position) || ' ',
                fontSize: 9,
                margin: [4, 1, 4, 1],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (index) => (index > 0 ? 0.7 : 0),
          vLineWidth: () => 0,
          hLineColor: () => '#333333',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    margin: [0, 0, 0, 12],
  }
}

function paragraph(content, options = {}) {
  const text = Array.isArray(content) ? content : [{ text: content }]
  const paragraphText = options.indent === false ? text : [{ text: '          ' }, ...text]

  return {
    text: paragraphText,
    preserveLeadingSpaces: true,
    fontSize: 10,
    alignment: 'justify',
    lineHeight: 1.15,
    margin: options.margin || [48, 0, 36, 14],
  }
}

function normalizeRecallLeaveType(value) {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized.includes('mandatory') && normalized.includes('forced')) return 'forced leave'

  return normalized || 'leave'
}

function buildFirstParagraph(data) {
  if (data.firstParagraph) return data.firstParagraph

  return [
    { text: 'In view of the exigency of services at the ' },
    { text: data.officeName, decoration: 'underline' },
    { text: ', you are hereby recalled from your scheduled and approved ' },
    { text: data.leaveType },
    { text: ' with inclusive dates on ' },
    { text: data.inclusiveDates, decoration: 'underline' },
    { text: '.' },
  ]
}

function buildFooterIcon(type) {
  const iconPaths = {
    location: `
      <path d="M9 3.4a3.8 3.8 0 0 0-3.8 3.8c0 2.8 3.8 7.1 3.8 7.1s3.8-4.3 3.8-7.1A3.8 3.8 0 0 0 9 3.4Z" fill="#ffffff"/>
      <circle cx="9" cy="7.2" r="1.4" fill="#d8df2a"/>
    `,
    phone: `
      <path d="M5.1 3.9 7 3.4l1.3 3.1-1.5 1c.8 1.8 2 3 3.8 3.8l1-1.5 3.1 1.3-.5 1.9c-.2.8-1 1.3-1.8 1.2-4.5-.8-8-4.3-8.8-8.8-.1-.7.6-1.4 1.5-1.5Z" fill="#ffffff"/>
    `,
    email: `
      <rect x="4" y="5.2" width="10" height="7.6" rx="1.1" fill="none" stroke="#ffffff" stroke-width="1.4"/>
      <path d="m4.7 6.1 4.3 3.3 4.3-3.3" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  }

  return `
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="8.2" fill="${HEADER_BAR_COLOR}"/>
      ${iconPaths[type] || ''}
    </svg>
  `
}

function footerContact(icon, text, width) {
  return {
    width,
    columns: [
      {
        width: 21,
        svg: buildFooterIcon(icon),
        fit: [17, 17],
        margin: [0, 0, 4, 0],
      },
      {
        width: '*',
        text,
      },
    ],
    columnGap: 0,
  }
}

function buildFooter() {
  return {
    columns: [
      footerContact('location', '2nd Floor, City Hall of Tagum,\nJV Ayala Ave., Brgy. Apokon', 220),
      footerContact('phone', '(084) 645 3300\nLocal 203', 125),
      footerContact('email', 'mayoruytagumcity@gmail.com', '*'),
    ],
    color: HEADER_BAR_COLOR,
    bold: true,
    fontSize: 7.5,
    lineHeight: 1.1,
    columnGap: 10,
    margin: [45, 0, 30, 0],
  }
}

function resolveDepartmentHeadName(source) {
  const candidates = [
    source?.departmentHeadName,
    source?.department_head_name,
    source?.departmentHeadFullName,
    source?.department_head_full_name,
    source?.departmentHead?.fullName,
    source?.departmentHead?.full_name,
    source?.department_head?.fullName,
    source?.department_head?.full_name,
    source?.departmentHead?.name,
    source?.department_head?.name,
    source?.departmentHead,
    source?.department_head,
    source?.application?.departmentHead?.fullName,
    source?.application?.departmentHead?.full_name,
    source?.application?.department_head?.fullName,
    source?.application?.department_head?.full_name,
    source?.application?.departmentHeadName,
    source?.application?.department_head_name,
    source?.application?.departmentHead,
    source?.application?.department_head,
    source?.app?.departmentHead?.fullName,
    source?.app?.departmentHead?.full_name,
    source?.raw?.departmentHeadName,
  ]

  for (const c of candidates) {
    if (typeof c === 'string' && normalizeText(c)) return normalizeText(c)
    if (c && typeof c === 'object') {
      const objName = normalizeText(c.fullName || c.full_name || c.name)
      if (objName) return objName
    }
  }

  return ''
}

function resolveDepartmentHeadPosition(source) {
  const candidates = [
    source?.departmentHeadPosition,
    source?.department_head_position,
    source?.departmentHeadDesignation,
    source?.department_head_designation,
    source?.departmentHead?.designation,
    source?.department_head?.designation,
    source?.departmentHead?.position,
    source?.department_head?.position,
    source?.application?.departmentHead?.designation,
    source?.application?.department_head?.designation,
    source?.app?.departmentHead?.designation,
    source?.raw?.departmentHeadPosition,
  ]

  for (const c of candidates) {
    const text = normalizeText(c)
    if (text) return text
  }

  return 'Department Head'
}

function resolveRecallFormData(source = {}) {
  const inclusiveDates = normalizeText(source.inclusiveDates || source.inclusive_dates)

  return {
    memorandumOrderNo:
      normalizeText(
        source.memorandumOrderNo ||
          source.memorandum_order_no ||
          source.officeOrderNo ||
          source.office_order_no,
      ) || '___',
    seriesYear:
      normalizeText(source.seriesYear || source.series_year) || String(new Date().getFullYear()),
    date:
      formatDateLong(source.date || source.orderDate || source.order_date) ||
      formatDateLong(new Date()),
    recipientName: normalizeText(
      source.recipientName || source.recipient_name || source.employeeName || source.employee_name,
    ),
    recipientPosition: normalizeText(
      source.recipientPosition ||
        source.recipient_position ||
        source.employeePosition ||
        source.employee_position ||
        source.designation,
    ),
    departmentHeadName: resolveDepartmentHeadName(source),
    departmentHeadPosition: resolveDepartmentHeadPosition(source),
    departmentHeadLabel:
      normalizeText(source.departmentHeadLabel || source.department_head_label) ||
      'Recommending Approval:',
    from: normalizeText(source.from) || DEFAULT_FROM,
    subject: normalizeText(source.subject) || 'RECALL ORDER',
    officeName:
      normalizeText(
        source.officeName ||
          source.office_name ||
          source.requestingOffice ||
          source.requesting_office,
      ) || 'REQUESTING OFFICE',
    inclusiveDates,
    leaveType: normalizeRecallLeaveType(source.leaveType || source.leave_type),
    firstParagraph: normalizeText(source.firstParagraph || source.first_paragraph),
    secondParagraph:
      normalizeText(source.secondParagraph || source.second_paragraph) ||
      'As such, your unused leave credits shall be restored in accordance to the Civil Service Rules and Regulations.',
    thirdParagraph:
      normalizeText(source.thirdParagraph || source.third_paragraph) ||
      'For your information and guidance.',
    mayorName:
      normalizeText(
        source.mayorName || source.mayor_name || source.signatoryName || source.signatory_name,
      ) || DEFAULT_MAYOR_NAME,
    mayorTitle:
      normalizeText(
        source.mayorTitle || source.mayor_title || source.signatoryTitle || source.signatory_title,
      ) || DEFAULT_MAYOR_TITLE,
    mayorLabel:
      normalizeText(source.mayorLabel || source.mayor_label) ||
      (resolveDepartmentHeadName(source) ? 'Approved by:' : ''),
  }
}

export function buildRecallFormDocDefinition(formData = {}, logoBase64 = null) {
  const data = resolveRecallFormData(formData)

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [30, 18, 30, 68],
    footer: buildFooter,
    content: [
      buildHeader(logoBase64),
      {
        stack: [
          {
            text: [
              { text: 'MEMORANDUM ORDER NO. ', bold: true },
              { text: `${data.memorandumOrderNo}, S. ${data.seriesYear}`, bold: true },
            ],
            fontSize: 10,
            margin: [0, 0, 0, 2],
          },
          { text: data.date, fontSize: 10, margin: [0, 0, 0, 20] },
          recipientDetailRow(data.recipientName, data.recipientPosition, 'To'),
          detailRow('From', data.from, { marginBottom: 14 }),
          detailRow('Subject', data.subject, { marginBottom: 0 }),
        ],
        margin: [48, 0, 36, 12],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1, lineColor: '#111111' },
          { type: 'line', x1: 0, y1: 3, x2: 535, y2: 3, lineWidth: 1, lineColor: '#111111' },
        ],
        margin: [0, 0, 0, 22],
      },
      paragraph(buildFirstParagraph(data)),
      paragraph(data.secondParagraph),
      paragraph(data.thirdParagraph, { margin: [48, 6, 36, 40] }),
      {
        columns: [
          data.departmentHeadName
            ? {
                width: '*',
                stack: [
                  ...(data.departmentHeadLabel
                    ? [{ text: data.departmentHeadLabel, fontSize: 10, margin: [0, 0, 0, 24] }]
                    : []),
                  { text: data.departmentHeadName.toUpperCase(), bold: true, fontSize: 10 },
                  {
                    text: data.departmentHeadPosition || 'Department Head',
                    fontSize: 10,
                    margin: [0, 2, 0, 0],
                  },
                ],
                margin: [48, 0, 0, 0],
              }
            : { width: '*', text: '' },
          {
            width: 175,
            stack: [
              ...(data.mayorLabel
                ? [{ text: data.mayorLabel, fontSize: 10, margin: [0, 0, 0, 24] }]
                : []),
              { text: data.mayorName.toUpperCase(), bold: true, fontSize: 10 },
              { text: data.mayorTitle, fontSize: 10, margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 24, 0],
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

  let enrichedFormData = { ...formData }
  const rawApp = formData.application || (formData.id || formData.employee ? formData : null)
  if (rawApp) {
    try {
      const enrichedApp = await enrichAppWithDepartmentHead(rawApp)
      const deptHeadSig = getDepartmentHeadSignature(enrichedApp)
      const mayorSig = getMayorSignature(enrichedApp)

      if (!enrichedFormData.departmentHeadName && deptHeadSig?.fullName) {
        enrichedFormData.departmentHeadName = deptHeadSig.fullName
        enrichedFormData.departmentHeadPosition = deptHeadSig.designation || 'Department Head'
      }
      if (!enrichedFormData.mayorName && mayorSig?.fullName) {
        enrichedFormData.mayorName = mayorSig.fullName
        enrichedFormData.mayorTitle = mayorSig.designation || 'City Mayor'
      }
    } catch {
      // Keep existing form data if lookup fails
    }
  }

  pdfMake.createPdf(buildRecallFormDocDefinition(enrichedFormData, logoBase64)).open()
}
