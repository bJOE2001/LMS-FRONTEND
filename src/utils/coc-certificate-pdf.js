import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const MAYOR_NAME = 'HON. REY T. UY'
const MAYOR_TITLE = 'City Mayor'
const HRMO_VALIDATOR_FALLBACK = 'City Human Resource Management Officer'
const HEADER_BAR_COLOR = '#0f6b3a'
const CERTIFICATES_PER_PAGE = 2
const CERTIFICATE_TITLE_FONT_SIZE = 20
const CERTIFICATE_LABEL_FONT_SIZE = 12
const CERTIFICATE_VALUE_FONT_SIZE = 13
const CERTIFICATE_MAYOR_FONT_SIZE = 12
const CERTIFICATE_VALIDATION_FONT_SIZE = 11
const CERTIFICATE_VALIDATOR_NAME_FONT_SIZE = 12
const CERTIFICATE_VALIDATOR_TITLE_FONT_SIZE = 12

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstPresentValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && normalizeText(value) === '') continue
    return value
  }
  return ''
}

function toFiniteNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function parseDurationTextToMinutes(value) {
  if (value === undefined || value === null || value === '') return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  const rawValue = normalizeText(value)
  if (!rawValue) return null

  const numericValue = toFiniteNumber(rawValue)
  if (numericValue !== null) return Math.max(0, Math.round(numericValue))

  const hhMmMatch = rawValue.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/)
  if (hhMmMatch) {
    const hours = Number(hhMmMatch[1])
    const minutes = Number(hhMmMatch[2])
    if (minutes >= 60) return null
    return Math.max(0, hours * 60 + minutes)
  }

  const hoursMatch = rawValue.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i)
  const minutesMatch = rawValue.match(/(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/i)

  if (!hoursMatch && !minutesMatch) return null

  const parsedHours = hoursMatch ? Number(hoursMatch[1]) : 0
  const parsedMinutes = minutesMatch ? Number(minutesMatch[1]) : 0
  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) return null

  return Math.max(0, Math.round(parsedHours * 60 + parsedMinutes))
}

function tryParseDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function formatDateLong(value) {
  const parsed = tryParseDate(value)
  if (!parsed) return normalizeText(value)

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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

function buildNameFromParts(source) {
  if (!source || typeof source !== 'object') return ''

  const parts = [
    normalizeText(source.firstname),
    normalizeText(source.middlename),
    normalizeText(source.surname),
  ].filter(Boolean)

  return parts.join(' ').trim()
}

function resolveEmployeeName(app) {
  const direct = firstPresentValue(
    app?.employeeName,
    app?.employee_name,
    app?.full_name,
    app?.name,
    app?.employee?.full_name,
    app?.employee?.employee_name,
    app?.employee?.name,
  )
  if (direct) return normalizeText(direct)

  const nameFromRoot = buildNameFromParts(app)
  if (nameFromRoot) return nameFromRoot

  const nameFromEmployee = buildNameFromParts(app?.employee)
  if (nameFromEmployee) return nameFromEmployee

  return ''
}

function resolveTotalHours(app) {
  const explicitMinuteCandidates = [
    app?.total_no_of_coc_applied_minutes,
    app?.totalNoOfCocAppliedMinutes,
    app?.total_minutes,
    app?.totalMinutes,
    app?.applied_minutes,
    app?.appliedMinutes,
  ]

  for (const candidate of explicitMinuteCandidates) {
    const numericMinutes = toFiniteNumber(candidate)
    if (numericMinutes !== null) return Math.max(0, numericMinutes) / 60

    const parsedMinutes = parseDurationTextToMinutes(candidate)
    if (parsedMinutes !== null) return parsedMinutes / 60
  }

  const explicitHourCandidates = [
    app?.days,
    app?.total_days,
    app?.duration_value,
    app?.total_hours,
    app?.totalHours,
    app?.total_no_of_coc_applied_hours,
    app?.totalNoOfCocAppliedHours,
  ]

  for (const candidate of explicitHourCandidates) {
    const numericHours = toFiniteNumber(candidate)
    if (numericHours !== null) return Math.max(0, numericHours)
  }

  const mixedDurationCandidates = [
    app?.total_no_of_coc_applied,
    app?.totalNoOfCocApplied,
    app?.duration_label,
    app?.durationLabel,
  ]

  for (const candidate of mixedDurationCandidates) {
    const parsedMinutes = parseDurationTextToMinutes(candidate)
    if (parsedMinutes !== null) return parsedMinutes / 60
  }

  return 0
}

function resolveMonthLabel(app) {
  const explicit = normalizeText(
    firstPresentValue(
      app?.for_the_month,
      app?.forTheMonth,
      app?.month,
      app?.month_label,
      app?.monthLabel,
      app?.coc_month,
      app?.cocMonth,
      app?.overtime_month,
      app?.overtimeMonth,
    ),
  )
  if (explicit) return explicit

  const fallbackDate = firstPresentValue(
    app?.startDate,
    app?.start_date,
    app?.dateFiled,
    app?.date_filed,
    app?.hrActionAt,
    app?.hr_action_at,
    app?.updated_at,
    app?.updatedAt,
    new Date(),
  )

  const parsed = tryParseDate(fallbackDate)
  if (!parsed) return ''
  return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function resolveDateIssued(app) {
  return firstPresentValue(
    app?.date_issued,
    app?.dateIssued,
    app?.issued_at,
    app?.issuedAt,
    app?.hrActionAt,
    app?.hr_action_at,
    app?.updated_at,
    app?.updatedAt,
    new Date(),
  )
}

function resolveValidUntil(app, dateIssued) {
  const explicit = firstPresentValue(
    app?.valid_until,
    app?.validUntil,
    app?.validity_end,
    app?.validityEnd,
    app?.expiration_date,
    app?.expirationDate,
  )
  if (explicit) return explicit

  const issued = tryParseDate(dateIssued)
  if (!issued) return ''

  const validUntil = new Date(issued.getFullYear() + 1, 11, 31)
  return validUntil
}

function resolveHrmoValidatorName(app) {
  return normalizeText(
    firstPresentValue(
      app?.hrmo_validator_name,
      app?.hrmoValidatorName,
      app?.hrActionBy,
      app?.hr_action_by,
      app?.validated_by,
      app?.validatedBy,
      app?.hrmo_validation_name,
      app?.hrmoValidationName,
    ),
  )
}

function numberToWords(value) {
  const units = [
    'ZERO',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ]
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

  if (!Number.isFinite(value) || value < 0) return ''
  if (value < 20) return units[value]
  if (value < 100) {
    const tenPart = Math.floor(value / 10)
    const unitPart = value % 10
    return unitPart ? `${tens[tenPart]} ${units[unitPart]}` : tens[tenPart]
  }
  if (value < 1000) {
    const hundredPart = Math.floor(value / 100)
    const remainder = value % 100
    return remainder
      ? `${units[hundredPart]} HUNDRED ${numberToWords(remainder)}`
      : `${units[hundredPart]} HUNDRED`
  }
  if (value < 1000000) {
    const thousandPart = Math.floor(value / 1000)
    const remainder = value % 1000
    return remainder
      ? `${numberToWords(thousandPart)} THOUSAND ${numberToWords(remainder)}`
      : `${numberToWords(thousandPart)} THOUSAND`
  }
  return String(value)
}

function formatHoursWords(totalHours) {
  const safeHours = Number.isFinite(totalHours) ? Math.max(0, totalHours) : 0
  const fixed = safeHours.toFixed(2)
  const [whole, decimal] = fixed.split('.')
  const wholeWords = numberToWords(Number(whole)) || 'ZERO'
  return `${wholeWords} AND ${decimal}/100`
}

function compactUnderlineLayout() {
  return {
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 0,
    paddingBottom: () => 0,
    hLineColor: () => '#111111',
    vLineColor: () => '#111111',
  }
}

function underlinedCell(text, options = {}) {
  return {
    text: text || ' ',
    bold: Boolean(options.bold),
    alignment: options.alignment || 'center',
    border: [false, false, false, true],
    margin: options.margin || [0, 0, 0, 2],
    fontSize: options.fontSize || 13,
    noWrap: Boolean(options.noWrap),
  }
}

function resolveNameFontSizeForSingleLine(name, baseFontSize = CERTIFICATE_VALUE_FONT_SIZE) {
  const length = normalizeText(name).length
  if (length > 58) return Math.max(11, baseFontSize - 4)
  if (length > 50) return Math.max(11, baseFontSize - 3)
  if (length > 44) return Math.max(11, baseFontSize - 2)
  if (length > 36) return Math.max(11, baseFontSize - 1)
  return baseFontSize
}

function buildCertificateSection(data, options = {}) {
  const sectionIndex = options.sectionIndex || 0
  const sectionBottomMargin = sectionIndex < CERTIFICATES_PER_PAGE - 1 ? 6 : 0
  const contentWidth = options.contentWidth || 559
  const certificateTitle = options.certificateTitle || 'Certificate of COC Earned'

  const compactHeaderBarHeight = 17
  const compactSmallBarTopOffset = 30
  const compactHeaderTextLeftInset = 6
  const compactHeaderTextSize = 10
  const compactOfficeBandPaddingTop = Math.max(0, Math.floor((compactHeaderBarHeight - compactHeaderTextSize) / 2))
  const compactValueFontSize = CERTIFICATE_VALUE_FONT_SIZE
  const employeeNameFontSize = resolveNameFontSizeForSingleLine(data.employeeName, compactValueFontSize)

  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              {
                columns: [
                  {
                    width: 28,
                    margin: [0, compactSmallBarTopOffset, 8, 0],
                    canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: compactHeaderBarHeight, color: HEADER_BAR_COLOR }],
                  },
                  data.logoBase64
                    ? { width: 78, image: data.logoBase64, fit: [72, 72], margin: [0, -1, 8, 0] }
                    : { width: 78, text: '' },
                  {
                    width: '*',
                    stack: [
                      {
                        text: 'REPUBLIC OF THE PHILIPPINES',
                        fontSize: 7,
                        bold: false,
                        margin: [compactHeaderTextLeftInset, 0, 0, 0],
                      },
                      {
                        text: 'PROVINCE OF DAVAO DEL NORTE',
                        fontSize: 7,
                        bold: false,
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
                          body: [[{
                            text: 'CITY HUMAN RESOURCE MANAGEMENT OFFICE',
                            color: '#ffffff',
                            bold: true,
                            alignment: 'left',
                            fontSize: compactHeaderTextSize,
                            fillColor: HEADER_BAR_COLOR,
                            margin: [compactHeaderTextLeftInset, compactOfficeBandPaddingTop, 4, 0],
                          }]],
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
                margin: [0, 0, 0, 6],
              },
              {
                text: certificateTitle,
                fontSize: CERTIFICATE_TITLE_FONT_SIZE,
                bold: true,
                alignment: 'center',
                margin: [0, 2, 0, 7],
              },
              {
                table: {
                  widths: ['auto', '*', 'auto'],
                  body: [
                    [
                      {
                        text: 'This certificate entitles Mr./Ms.',
                        fontSize: CERTIFICATE_LABEL_FONT_SIZE,
                        border: [false, false, false, false],
                        margin: [0, 0, 8, 2],
                      },
                      underlinedCell(data.employeeName, {
                        bold: true,
                        fontSize: employeeNameFontSize,
                        noWrap: true,
                      }),
                      {
                        text: 'to',
                        fontSize: CERTIFICATE_LABEL_FONT_SIZE,
                        border: [false, false, false, false],
                        margin: [8, 0, 0, 2],
                      },
                    ],
                  ],
                },
                layout: compactUnderlineLayout(),
                margin: [0, 0, 0, 0],
              },
              {
                table: {
                  widths: ['*'],
                  body: [[underlinedCell(`${data.totalHoursWords} (${data.totalHoursFixed}) HOURS`, { bold: true, fontSize: compactValueFontSize })]],
                },
                layout: compactUnderlineLayout(),
                margin: [0, 0, 0, 0],
              },
              {
                table: {
                  widths: ['auto', '*'],
                  body: [
                    [
                      {
                        text: 'of Compensatory Overtime Credits for the month of',
                        fontSize: CERTIFICATE_LABEL_FONT_SIZE,
                        border: [false, false, false, false],
                        margin: [0, 0, 10, 2],
                      },
                      underlinedCell(data.monthLabel, { bold: true, fontSize: compactValueFontSize }),
                    ],
                  ],
                },
                layout: compactUnderlineLayout(),
                margin: [0, 0, 0, 8],
              },
              {
                text: MAYOR_NAME,
                fontSize: CERTIFICATE_MAYOR_FONT_SIZE,
                bold: true,
                alignment: 'center',
                margin: [0, 8, 0, 1],
              },
              {
                text: MAYOR_TITLE,
                fontSize: CERTIFICATE_MAYOR_FONT_SIZE,
                alignment: 'center',
                margin: [0, 0, 0, 10],
              },
              {
                table: {
                  widths: [88, 170, '*'],
                  body: [
                    [
                      {
                        text: 'Date Issued:',
                        bold: true,
                        fontSize: CERTIFICATE_LABEL_FONT_SIZE,
                        border: [false, false, false, false],
                        margin: [0, 0, 10, 2],
                      },
                      underlinedCell(data.dateIssuedText, { alignment: 'left', fontSize: compactValueFontSize }),
                      { text: '', border: [false, false, false, false] },
                    ],
                    [
                      {
                        text: 'Valid Until:',
                        bold: true,
                        fontSize: CERTIFICATE_LABEL_FONT_SIZE,
                        border: [false, false, false, false],
                        margin: [0, 0, 10, 2],
                      },
                      underlinedCell(data.validUntilText, { alignment: 'left', fontSize: compactValueFontSize }),
                      { text: '', border: [false, false, false, false] },
                    ],
                  ],
                },
                layout: compactUnderlineLayout(),
                margin: [0, 0, 0, 8],
              },
              {
                text: 'HRMO Validation:',
                bold: true,
                fontSize: CERTIFICATE_VALIDATION_FONT_SIZE,
                margin: [0, 0, 0, 4],
              },
              {
                text: data.hrmoValidatorName || '____________________________',
                fontSize: CERTIFICATE_VALIDATOR_NAME_FONT_SIZE,
                bold: true,
                margin: [0, 0, 0, 1],
              },
              {
                text: HRMO_VALIDATOR_FALLBACK,
                fontSize: CERTIFICATE_VALIDATOR_TITLE_FONT_SIZE,
              },
            ],
            margin: [8, 8, 8, 8],
            border: [false, false, false, false],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#111111',
      vLineColor: () => '#111111',
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, sectionBottomMargin],
    dontBreakRows: true,
    keepWithHeaderRows: 1,
    unbreakable: true,
    width: contentWidth,
  }
}

export async function generateCocCertificatePdf(app) {
  if (!app) return

  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

  const employeeName = resolveEmployeeName(app).toUpperCase()
  const totalHours = resolveTotalHours(app)
  const totalHoursFixed = totalHours.toFixed(2)
  const totalHoursWords = formatHoursWords(totalHours)
  const monthLabel = resolveMonthLabel(app).toUpperCase()
  const dateIssued = resolveDateIssued(app)
  const validUntil = resolveValidUntil(app, dateIssued)
  const dateIssuedText = formatDateLong(dateIssued)
  const validUntilText = formatDateLong(validUntil)
  const hrmoValidatorName = resolveHrmoValidatorName(app).toUpperCase()
  const certificateData = {
    logoBase64,
    employeeName,
    totalHoursFixed,
    totalHoursWords,
    monthLabel,
    dateIssuedText,
    validUntilText,
    hrmoValidatorName,
  }
  const pageMargins = [18, 14, 18, 14]
  const contentWidth = 595 - pageMargins[0] - pageMargins[2]

  const docDefinition = {
    pageSize: 'A4',
    pageMargins,
    content: [
      buildCertificateSection(certificateData, { sectionIndex: 0, contentWidth }),
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: contentWidth,
            y2: 0,
            lineWidth: 0.6,
            lineColor: '#7a7a7a',
            dash: { length: 4, space: 3 },
          },
        ],
        margin: [0, 0, 0, 6],
      },
      buildCertificateSection(certificateData, { sectionIndex: 1, contentWidth }),
    ],
    defaultStyle: {
      font: 'Roboto',
    },
  }

  pdfMake.createPdf(docDefinition).open()
}
