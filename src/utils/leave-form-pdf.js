/**
 * Civil Service Form No. 6 (Revised 2020)
 * APPLICATION FOR LEAVE — pdfmake document definition
 *
 * Replicates the official Philippine government leave application form.
 */
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import {
  getCityViceMayorSignature,
  enrichAppWithDepartmentHead,
  getChrmoLeaveInChargeSignatory,
  getMayorSignature,
  getRecommendationSignatory,
  isDepartmentHeadApplicant,
} from './department-head-signature'
import { mergeLocalLeaveApplicationDetails } from './leave-application-local-details'
import { isAbroadLeaveApplication } from './leave-application-details'
import {
  isCityViceMayorApplicant,
  isSangguniangPanlungsodMemberIApplicant,
} from './signatory-rules/applicant-role-utils'
import { resolveRecommendationSignatoryByApplicantType } from './signatory-rules/recommendation-signatory'
import { api } from 'boot/axios'

// pdfmake v0.3.x font initialization
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

// ─── helpers ───────────────────────────────────────────────────────────────
const BOX_SIZE = 7
const BOX_LW = 0.5
const HEADER_BAR_COLOR = '#0f6b3a'

function resolveDocumentVerification(app) {
  const verification =
    app?.document_verification ||
    app?.documentVerification ||
    app?.raw?.document_verification ||
    app?.raw?.documentVerification ||
    null
  const token = String(verification?.token || '').trim()

  if (!token.startsWith('LMS-LEAVE:')) return null

  return {
    token,
    reference: String(verification?.reference || '').trim(),
  }
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

function buildCocStyleLeaveHeader(
  logoBase64,
  borderWidth,
  employeeStatusLabel = '',
  documentVerification = null,
) {
  const compactHeaderBarHeight = 17
  const compactSmallBarTopOffset = 33
  const compactHeaderTextLeftInset = 6
  const compactHeaderTextSize = 10
  const receiptStampBarGap = 4
  const receiptStampHeight = compactSmallBarTopOffset - receiptStampBarGap
  const smallHeaderBarTopOffset = compactSmallBarTopOffset + receiptStampBarGap
  const compactOfficeBandPaddingTop = Math.max(
    0,
    Math.floor((compactHeaderBarHeight - compactHeaderTextSize) / 2),
  )

  return {
    columns: [
      {
        width: 28,
        margin: [0, smallHeaderBarTopOffset, 8, 0],
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 22,
            h: compactHeaderBarHeight,
            color: HEADER_BAR_COLOR,
          },
        ],
      },
      logoBase64
        ? { width: 78, image: logoBase64, fit: [72, 72], margin: [0, -1, 8, 0] }
        : { width: 78, text: '' },
      {
        width: '*',
        stack: [
          {
            columns: [
              {
                width: '*',
                stack: [
                  {
                    text: 'REPUBLIC OF THE PHILIPPINES',
                    fontSize: 7,
                    bold: false,
                    lineHeight: 1,
                    margin: [compactHeaderTextLeftInset, 0, 0, 0],
                  },
                  {
                    text: 'PROVINCE OF DAVAO DEL NORTE',
                    fontSize: 7,
                    bold: false,
                    lineHeight: 1,
                    margin: [compactHeaderTextLeftInset, 0, 0, 0],
                  },
                  {
                    text: 'CITY OF TAGUM',
                    fontSize: 14,
                    bold: true,
                    lineHeight: 1,
                    margin: [compactHeaderTextLeftInset, 0, 0, 0],
                  },
                ],
              },
              ...(documentVerification
                ? [
                    {
                      width: 64,
                      stack: [
                        {
                          qr: documentVerification.token,
                          fit: 64,
                          eccLevel: 'L',
                          alignment: 'center',
                        },
                      ],
                      margin: [0, -1, -12, 0],
                    },
                  ]
                : []),
              {
                width: 100,
                table: {
                  widths: ['*'],
                  heights: [receiptStampHeight],
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: 'Stamp of Date of Receipt',
                            fontSize: 7,
                            alignment: 'center',
                          },
                          ...(employeeStatusLabel
                            ? [
                                {
                                  text: employeeStatusLabel,
                                  fontSize: 8,
                                  bold: true,
                                  alignment: 'center',
                                  margin: [2, 5, 2, 0],
                                },
                              ]
                            : []),
                        ],
                        margin: [2, employeeStatusLabel ? 5 : 8, 2, 0],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => borderWidth,
                  vLineWidth: () => borderWidth,
                  hLineColor: () => '#000',
                  vLineColor: () => '#000',
                  paddingLeft: () => 0,
                  paddingRight: () => 0,
                  paddingTop: () => 0,
                  paddingBottom: () => 0,
                },
              },
            ],
            columnGap: 0,
            margin: [0, 0, 0, receiptStampBarGap],
          },
          {
            table: {
              widths: ['*'],
              heights: [compactHeaderBarHeight],
              body: [
                [
                  {
                    text: 'CITY GOVERNMENT OF TAGUM',
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
    columnGap: 0,
    margin: [0, 0, 0, 4],
  }
}

/** Draw a checkbox (empty or checked) + label as a row for the PDF. */
function checkboxRow(checked, label, opts = {}) {
  const left = opts.marginLeft ?? 4
  const vertical = opts.marginVertical ?? 1
  const bottom = opts.marginBottom ?? vertical
  const fs = opts.fontSize ?? 7
  const canvasItems = [{ type: 'rect', x: 0, y: 0.5, w: BOX_SIZE, h: BOX_SIZE, lineWidth: BOX_LW }]
  if (checked) {
    canvasItems.push(
      { type: 'line', x1: 1.5, y1: 4, x2: 3.2, y2: 6.2, lineWidth: 1 },
      { type: 'line', x1: 3.2, y1: 6.2, x2: 6.5, y2: 1.2, lineWidth: 1 },
    )
  }
  const labelNode =
    typeof label === 'string' || Array.isArray(label)
      ? { text: label, fontSize: fs, margin: [4, 0, 0, 0], width: '*' }
      : { ...label, width: label?.width ?? '*' }

  return {
    columns: [{ canvas: canvasItems, width: 12 }, labelNode],
    margin: [left, vertical, 0, bottom],
  }
}

function parseObjectCandidate(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) return null
    try {
      const parsedValue = JSON.parse(trimmedValue)
      return parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)
        ? parsedValue
        : null
    } catch {
      return null
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : null
}

function parseArrayCandidate(value) {
  if (!value) return null
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return null

  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    const parsedValue = JSON.parse(trimmedValue)
    return Array.isArray(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

const CONFIRMED_LEAVE_DETAIL_FIELDS = Object.freeze([
  'vacation_detail',
  'vacation_specify',
  'sick_detail',
  'sick_specify',
  'women_specify',
  'study_detail',
  'other_purpose',
  'spl_detail',
  'spl_specify',
])

function readConfirmedLeaveDetailField(sources, fieldName) {
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue

    const value = source[fieldName]
    if (value == null) continue

    const normalizedValue = String(value).trim()
    if (normalizedValue !== '') {
      return normalizedValue
    }
  }

  return ''
}

function resolveConfirmedLeaveDetails(app) {
  const detailsOfLeave = parseObjectCandidate(app?.details_of_leave)
  const pendingUpdate = parseObjectCandidate(app?.pending_update)
  const latestUpdatePayload = parseObjectCandidate(app?.latest_update_request_payload)
  const pendingUpdateDetailsOfLeave = parseObjectCandidate(pendingUpdate?.details_of_leave)
  const latestUpdateDetailsOfLeave = parseObjectCandidate(latestUpdatePayload?.details_of_leave)
  const detailsOfLeaveNestedDetails = parseObjectCandidate(detailsOfLeave?.details)
  const pendingUpdateNestedDetails = parseObjectCandidate(pendingUpdate?.details)
  const latestUpdateNestedDetails = parseObjectCandidate(latestUpdatePayload?.details)
  const sources = [
    app,
    detailsOfLeave,
    detailsOfLeaveNestedDetails,
    pendingUpdate,
    pendingUpdateNestedDetails,
    pendingUpdateDetailsOfLeave,
    latestUpdatePayload,
    latestUpdateNestedDetails,
    latestUpdateDetailsOfLeave,
  ].filter(Boolean)

  return CONFIRMED_LEAVE_DETAIL_FIELDS.reduce((resolvedDetails, fieldName) => {
    resolvedDetails[fieldName] = readConfirmedLeaveDetailField(sources, fieldName)
    return resolvedDetails
  }, {})
}

function buildSpecifiedDetailLabel(label, value, opts = {}) {
  const fs = opts.fontSize ?? 7
  const textValue = String(value || '').trim()
  const baseUnderline = opts.emptyLine ?? '_______________'
  const underlineLength = Math.max(baseUnderline.length, textValue.length + 2)
  const underline = opts.underlineText ?? '_'.repeat(underlineLength)
  const labelWidth = opts.labelWidth ?? 'auto'
  const fieldWidth = opts.fieldWidth ?? Math.round(underline.length * (fs * 0.62))
  const textTopOffset = opts.textTopOffset ?? fs + 2
  const textBottomOffset = opts.textBottomOffset ?? Math.max(fs - 2, 0)

  return {
    columns: [
      { text: label, fontSize: fs, margin: [4, 0, 4, 0], width: labelWidth },
      {
        width: fieldWidth,
        stack: [
          { text: underline, fontSize: fs, lineHeight: 1, margin: [0, 0, 0, 0] },
          ...(textValue
            ? [
                {
                  text: textValue,
                  fontSize: fs,
                  lineHeight: 1,
                  noWrap: true,
                  margin: [0, -textTopOffset, 0, -textBottomOffset],
                },
              ]
            : []),
        ],
      },
    ],
  }
}

function normalizeSickDetailValue(value) {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!normalizedValue) return ''
  if (normalizedValue.includes('hospital')) return 'In Hospital'
  if (normalizedValue.includes('out patient') || normalizedValue.includes('outpatient'))
    return 'Out Patient'
  return ''
}

function normalizeVacationDetailValue(value) {
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (!normalizedValue) return ''
  if (normalizedValue.includes('abroad')) return 'Abroad'
  if (normalizedValue.includes('within') && normalizedValue.includes('philippines')) {
    return 'Within the Philippines'
  }
  return ''
}

function resolveVacationDetailValue(value = '') {
  return normalizeVacationDetailValue(value)
}

function resolveVacationSpecifyValue(value = '') {
  return String(value || '').trim()
}

function resolveSickDetailValue(value = '') {
  return normalizeSickDetailValue(value)
}

function resolveSickSpecifyValue(value = '') {
  return String(value || '').trim()
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Long date for Date of Filing: e.g. "February 17, 2026" */
function fmtDateLong(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Parse name into last, first, middle. Prefer app.surname/firstname/middlename; else parse employee_name. */
function parseName(app) {
  const s = (app.surname ?? '').trim()
  const f = (app.firstname ?? '').trim()
  const m = (app.middlename ?? '').trim()
  if (s || f || m) {
    const full = (app.employee_name || '').trim() || [f, m, s].filter(Boolean).join(' ')
    return { last: s, first: f, middle: m, full }
  }
  const raw = (app.employee_name || '').trim()
  if (!raw) return { last: '', first: '', middle: '', full: '' }
  if (raw.includes(',')) {
    const parts = raw.split(',').map((p) => p.trim())
    const last = parts[0] ?? ''
    const first = parts[1] ?? ''
    const middle = parts[2] ?? ''
    return { last, first, middle, full: raw }
  }
  const words = raw.split(/\s+/).filter(Boolean)
  if (words.length <= 1) return { last: words[0] ?? '', first: '', middle: '', full: raw }
  const last = words[words.length - 1]
  const first = words.slice(0, -1).join(' ')
  return { last, first, middle: '', full: raw }
}

function formatEmployeeStatusForReceiptStamp(app) {
  const candidates = [
    app?.employment_status,
    app?.employment_status_key,
    app?.employmentStatus,
    app?.employmentStatusKey,
    app?.employment_type,
    app?.employmentType,
    app?.appointment_status,
    app?.appointmentStatus,
    app?.employee_status,
    app?.employeeStatus,
    app?.employee?.employment_status,
    app?.employee?.employment_status_key,
    app?.employee?.employmentStatus,
    app?.employee?.employmentStatusKey,
    app?.employee?.employment_type,
    app?.employee?.employmentType,
    app?.employee?.appointment_status,
    app?.employee?.appointmentStatus,
    app?.employee?.status,
    app?.user?.employment_status,
    app?.user?.employment_status_key,
    app?.user?.employmentStatus,
    app?.user?.employmentStatusKey,
    app?.user?.employment_type,
    app?.user?.employmentType,
    app?.user?.appointment_status,
    app?.user?.appointmentStatus,
  ]

  const rawStatus = candidates.find((value) => String(value || '').trim())
  const normalizedStatus = String(rawStatus || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')

  if (!normalizedStatus) return ''

  const upperStatus = normalizedStatus.toUpperCase()
  if (upperStatus.includes('REGULAR')) return 'Permanent'
  if (upperStatus.includes('ELECTIVE')) return 'Elective'
  if (upperStatus.includes('CASUAL')) return 'Casual'
  if (
    upperStatus.includes('CO TER') ||
    upperStatus.includes('COTER') ||
    upperStatus.includes('CO TERM')
  ) {
    return 'Co-Term'
  }

  return normalizedStatus.replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatMiddleInitial(value) {
  const normalizedValue = String(value || '')
    .trim()
    .replace(/\.+$/, '')

  return normalizedValue ? `${normalizedValue.charAt(0)}.` : ''
}

function isNameSuffix(value) {
  return /^(JR|SR|I|II|III|IV|V|VI)\.?$/i.test(String(value || '').trim())
}

function isSurnameParticleToken(value) {
  const token = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\.+$/, '')
  return ['D', 'DE', 'DEL', 'DELA', 'DELOS', 'DELAS', 'VON', 'VAN', 'BIN', 'IBN', 'AL'].includes(
    token,
  )
}

function normalizeSurnameToken(value) {
  const token = String(value || '').trim()
  const upperToken = token.toUpperCase().replace(/\.+$/, '')
  if (upperToken === 'D') return 'DE'
  return token
}

function splitNameTokensWithSurnameParticles(parts = []) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return { givenTokens: [], surnameTokens: [] }
  }

  if (parts.length === 1) {
    return { givenTokens: [parts[0]], surnameTokens: [] }
  }

  const workingParts = [...parts]
  const surnameTokens = [workingParts.pop()]

  while (workingParts.length > 0 && isSurnameParticleToken(workingParts[workingParts.length - 1])) {
    const candidate = String(workingParts[workingParts.length - 1] || '')
      .trim()
      .toUpperCase()
      .replace(/\.+$/, '')

    // Treat lone "D." / "D" as a surname particle only when we still
    // have at least first name + middle name tokens before it.
    if (candidate === 'D' && workingParts.length <= 2) {
      break
    }

    surnameTokens.unshift(workingParts.pop())
  }

  return {
    givenTokens: workingParts,
    surnameTokens,
  }
}

function formatSignatoryNameWithMiddleInitial(value) {
  const rawName = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!rawName) return ''

  if (rawName.includes(',')) {
    const [lastName = '', givenPart = '', middlePart = ''] = rawName
      .split(',')
      .map((part) => part.trim())
    const middleInitial = formatMiddleInitial(middlePart)
    return [givenPart, middleInitial, lastName].filter(Boolean).join(' ')
  }

  const parts = rawName.split(' ').filter(Boolean)
  if (parts.length < 2) return rawName

  const suffix = isNameSuffix(parts[parts.length - 1]) ? parts.pop() : ''
  const { givenTokens, surnameTokens } = splitNameTokensWithSurnameParticles(parts)
  if (givenTokens.length === 0 || surnameTokens.length === 0) {
    return rawName
  }

  const middleName = givenTokens.length > 1 ? givenTokens[givenTokens.length - 1] : ''
  const givenNames = givenTokens.length > 1 ? givenTokens.slice(0, -1).join(' ') : givenTokens[0]
  const middleInitial = formatMiddleInitial(middleName)
  const normalizedSurname = surnameTokens.map((token) => normalizeSurnameToken(token)).join(' ')

  return [givenNames, middleInitial, normalizedSurname, suffix].filter(Boolean).join(' ')
}

function fmtSalary(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (Number.isNaN(n)) return ''
  const formatted = n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `₱ ${formatted}`
}

function underlinedInfoValue(value, opts = {}) {
  const textValue = String(value || '').trim()
  return {
    text: textValue || ' ',
    fontSize: opts.fontSize ?? 9,
    bold: opts.bold ?? true,
    color: '#000000',
    lineHeight: opts.lineHeight ?? 1.05,
    decoration: textValue ? 'underline' : undefined,
    margin: opts.margin ?? [0, 3, 0, 0],
    noWrap: Boolean(opts.noWrap),
  }
}

function getSingleLineInfoFontSize(value) {
  const length = String(value || '').trim().length
  if (length > 60) return 6.6
  if (length > 50) return 7.2
  if (length > 40) return 7.8
  if (length > 32) return 8.4
  return 9
}

/** Format leave credit number for 7.A table (empty if null/undefined). */
function fmtCredit(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (Number.isNaN(n)) return ''
  return n.toFixed(3)
}

/** Format leave credit number for 7.A table without rounding (preserve stored decimals). */
function fmtCertificationCredit(val) {
  if (val == null || val === '') return ''
  const normalizedValue =
    typeof val === 'number'
      ? Number.isFinite(val)
        ? val.toFixed(12).replace(/\.?0+$/, '')
        : ''
      : String(val).trim().replace(/,/g, '')
  if (!normalizedValue) return ''

  const decimalMatch = normalizedValue.match(/^(-?\d+)(?:\.(\d+))?$/)
  if (!decimalMatch) {
    return ''
  }

  const integerPart = decimalMatch[1]
  const fractionalPart = (decimalMatch[2] || '').slice(0, 3).padEnd(3, '0')

  return `${integerPart}.${fractionalPart}`
}

function toCreditNumber(val) {
  if (val == null || val === '') return null
  const n = Number(val)
  if (!Number.isFinite(n)) return null
  return n
}

function computeCertificationBalance(totalEarned, lessThisApplication, fallbackBalance) {
  const totalEarnedNumber = toCreditNumber(totalEarned)
  const formattedTotalEarned = fmtCertificationCredit(totalEarned)
  const formattedFallbackBalance = fmtCertificationCredit(fallbackBalance)
  const normalizedLessThisApplication =
    lessThisApplication == null || lessThisApplication === ''
      ? totalEarnedNumber !== null
        ? 0
        : null
      : toCreditNumber(lessThisApplication)
  const formattedLessThisApplication = fmtCertificationCredit(
    normalizedLessThisApplication ?? lessThisApplication,
  )

  if (totalEarnedNumber !== null) {
    if (formattedFallbackBalance) {
      return {
        totalEarned: formattedTotalEarned,
        lessThisApplication: formattedLessThisApplication,
        balance: formattedFallbackBalance,
      }
    }

    const computedBalance = totalEarnedNumber - (normalizedLessThisApplication ?? 0)
    const normalizedBalance = Math.max(computedBalance, 0)
    return {
      totalEarned: formattedTotalEarned,
      lessThisApplication: formattedLessThisApplication,
      balance: fmtCertificationCredit(Math.abs(normalizedBalance) < 1e-9 ? 0 : normalizedBalance),
    }
  }

  return {
    totalEarned: formattedTotalEarned,
    lessThisApplication: formattedLessThisApplication,
    balance: formattedFallbackBalance,
  }
}

function prettifyLeaveBalanceLabel(value) {
  const label = String(value || '').trim()
  if (!label) return ''

  const normalized = label
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const lower = normalized.toLowerCase()
  if (lower === 'vl') return 'Vacation Leave'
  if (lower === 'sl') return 'Sick Leave'
  if (lower === 'fl') return 'Mandatory / Forced Leave'
  if (lower === 'spl' || lower === 'special privilege') return 'Special Privilege Leave'
  if (lower === 'wl' || lower === 'wlp' || lower === 'wellness leave policy')
    return 'Wellness Leave'
  if (lower === 'mandatory' || lower === 'forced' || lower === 'mandatory forced leave')
    return 'Mandatory / Forced Leave'
  if (lower === 'mandatory / forced leave') return 'Mandatory / Forced Leave'
  if (lower === 'mco6' || lower === 'mco6 leave' || lower === 'mc06' || lower === 'mo6 leave')
    return 'Special Privilege Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'
  if (lower === 'cto' || lower === 'cto leave' || lower === 'compensatory time off')
    return 'CTO Leave'

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

function resolvePrintableLeaveType(app) {
  const rawLeaveType = String(app?.leave_type_name || '').trim()

  if (!rawLeaveType) return ''

  const normalizedLeaveType = rawLeaveType.replace(/\s*\(monetization\)\s*$/i, '').trim()
  return prettifyLeaveBalanceLabel(normalizedLeaveType)
}

function getLeaveBalanceTypeKey(value) {
  return prettifyLeaveBalanceLabel(value).trim().toLowerCase()
}

function isMonetizationFlagEnabled(value) {
  if (value === true) return true
  if (value === 1) return true
  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
  return normalizedValue === '1' || normalizedValue === 'true' || normalizedValue === 'yes'
}

function normalizeMonetizationLeaveCreditComponents(sourceComponents) {
  if (!Array.isArray(sourceComponents) || sourceComponents.length === 0) return []

  const componentsByTypeKey = new Map()
  for (const rawComponent of sourceComponents) {
    if (!rawComponent || typeof rawComponent !== 'object' || Array.isArray(rawComponent)) continue

    const leaveTypeLabel = prettifyLeaveBalanceLabel(
      rawComponent.leave_type_name ?? rawComponent.leaveTypeName ?? rawComponent.leave_type ?? '',
    )
    const leaveTypeKey = getLeaveBalanceTypeKey(leaveTypeLabel)
    if (!leaveTypeKey) continue

    const days = toFiniteNumber(rawComponent.days ?? rawComponent.total_days ?? rawComponent.totalDays)
    if (days === null || days <= 0) continue

    const existingComponent = componentsByTypeKey.get(leaveTypeKey)
    if (existingComponent) {
      existingComponent.days = Math.round((existingComponent.days + days) * 1000) / 1000
      continue
    }

    componentsByTypeKey.set(leaveTypeKey, {
      key: leaveTypeKey,
      label: leaveTypeLabel,
      days,
    })
  }

  return [...componentsByTypeKey.values()]
}

function resolveMonetizationLeaveCreditComponents(app) {
  const sources = [
    app?.monetization_leave_credits,
    app?.monetizationLeaveCredits,
    app?.raw?.monetization_leave_credits,
    app?.raw?.monetizationLeaveCredits,
  ]

  for (const source of sources) {
    if (!source) continue

    const sourceComponents = Array.isArray(source) ? source : parseArrayCandidate(source)
    const normalizedComponents = normalizeMonetizationLeaveCreditComponents(sourceComponents)
    if (normalizedComponents.length > 0) {
      return normalizedComponents
    }
  }

  return []
}

function resolveCertificationSelectedTypeKey(typeKey) {
  const normalizedTypeKey = String(typeKey || '')
    .trim()
    .toLowerCase()
  if (!normalizedTypeKey) return ''

  const forcedLeaveKey = getLeaveBalanceTypeKey('Mandatory / Forced Leave')
  if (normalizedTypeKey === forcedLeaveKey) {
    return getLeaveBalanceTypeKey('Vacation Leave')
  }

  return normalizedTypeKey
}

function normalizeCertificationTypeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\d+\s*day[s]?\s+/i, '')
    .trim()
}

function areCertificationTypeKeysEquivalent(leftKey, rightKey) {
  const normalizedLeftKey = normalizeCertificationTypeKey(leftKey)
  const normalizedRightKey = normalizeCertificationTypeKey(rightKey)
  if (!normalizedLeftKey || !normalizedRightKey) return false
  if (normalizedLeftKey === normalizedRightKey) return true
  return (
    normalizedLeftKey.includes(normalizedRightKey) || normalizedRightKey.includes(normalizedLeftKey)
  )
}

function parseCertificationSourceCandidate(value) {
  if (value == null) return null
  if (typeof value !== 'string') return value

  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    return JSON.parse(trimmedValue)
  } catch {
    return null
  }
}

function findCertificationEntryByTypeKey(entryMap, targetTypeKey) {
  if (!entryMap?.size || !targetTypeKey) return null
  if (entryMap.has(targetTypeKey)) return entryMap.get(targetTypeKey)

  for (const [typeKey, entry] of entryMap.entries()) {
    if (areCertificationTypeKeysEquivalent(typeKey, targetTypeKey)) {
      return entry
    }
  }

  return null
}

function resolveCertificationDirectBalanceValue(app) {
  const directCandidates = [app?.leaveBalance]

  for (const candidate of directCandidates) {
    const parsedNumber = toCreditNumber(candidate)
    if (parsedNumber !== null) return parsedNumber
  }

  return null
}

function buildSelectedCertificationFallbackEntry(app, selectedLabel) {
  const selectedTypeLabel = selectedLabel || app?.leave_type_name || 'Leave Credits'
  const fallbackBalanceValue = resolveCertificationDirectBalanceValue(app)
  if (fallbackBalanceValue === null) return null

  return createCertificationEntry(selectedTypeLabel, {
    balance: fallbackBalanceValue,
    leave_balance: fallbackBalanceValue,
  })
}

function isCertificationEntryLikeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const knownKeys = [
    'leave_type_name',
    'total_earned',
    'total_credits',
    'less_this_application',
    'deducted_days',
    'balance_after_application',
    'balanceAfterApplication',
    'balance',
    'leave_balance',
    'remaining_balance',
    'available_balance',
    'current_balance',
    'credits',
  ]
  return knownKeys.some((key) => Object.prototype.hasOwnProperty.call(value, key))
}

function createEmptyCertificationEntry(label) {
  return {
    label: prettifyLeaveBalanceLabel(label),
    totalEarned: '',
    lessThisApplication: '',
    balance: '',
  }
}

function createCertificationEntry(label, value, options = {}) {
  const normalizedLabel = prettifyLeaveBalanceLabel(label)
  if (!normalizedLabel) return null

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const inferMissingTotalFromBalance = options?.inferMissingTotalFromBalance !== false
    let totalEarned = value.total_earned ?? value.total_credits
    let lessThisApplication = value.less_this_application ?? value.deducted_days
    const fallbackBalance =
      value.balance_after_application ??
      value.balanceAfterApplication ??
      value.balance ??
      value.leave_balance ??
      value.remaining_balance ??
      value.available_balance ??
      value.current_balance ??
      value.credits ??
      value.total_credits

    const totalEarnedNumber = toCreditNumber(totalEarned)
    const lessThisApplicationNumber = toCreditNumber(lessThisApplication)
    const fallbackBalanceNumber = toCreditNumber(fallbackBalance)

    // Some non-VL/SL payloads only provide current balance. Infer missing totals so 7.A remains complete.
    if (
      inferMissingTotalFromBalance &&
      totalEarnedNumber === null &&
      fallbackBalanceNumber !== null
    ) {
      if (lessThisApplicationNumber !== null) {
        totalEarned = fallbackBalanceNumber + lessThisApplicationNumber
      } else {
        totalEarned = fallbackBalanceNumber
        if (lessThisApplication == null || lessThisApplication === '') {
          lessThisApplication = 0
        }
      }
    }

    const computedEntry = computeCertificationBalance(
      totalEarned,
      lessThisApplication,
      fallbackBalance,
    )

    return {
      label: normalizedLabel,
      totalEarned: computedEntry.totalEarned,
      lessThisApplication: computedEntry.lessThisApplication,
      balance: computedEntry.balance,
    }
  }

  return {
    label: normalizedLabel,
    totalEarned: '',
    lessThisApplication: '',
    balance: fmtCertificationCredit(value),
  }
}

function mergeCertificationEntry(existing, next) {
  if (!existing) return next
  if (!next) return existing

  return {
    label: existing.label || next.label,
    totalEarned: existing.totalEarned || next.totalEarned,
    lessThisApplication: existing.lessThisApplication || next.lessThisApplication,
    balance: existing.balance || next.balance,
  }
}

function collectCertificationEntries(map, source, fallbackLabel = '', options = {}) {
  if (!source) return

  if (typeof source === 'string') {
    const parsedSource = parseCertificationSourceCandidate(source)
    if (parsedSource !== null) {
      collectCertificationEntries(map, parsedSource, fallbackLabel, options)
    }
    return
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      if (item == null || typeof item !== 'object') continue
      const entry = createCertificationEntry(item.leave_type_name || fallbackLabel, item, options)
      if (!entry) continue
      const key = getLeaveBalanceTypeKey(entry.label)
      map.set(key, mergeCertificationEntry(map.get(key), entry))
    }
    return
  }

  if (typeof source !== 'object') {
    const entry = createCertificationEntry(fallbackLabel, source, options)
    if (!entry) return
    const key = getLeaveBalanceTypeKey(entry.label)
    map.set(key, mergeCertificationEntry(map.get(key), entry))
    return
  }

  if (isCertificationEntryLikeObject(source)) {
    const entry = createCertificationEntry(source.leave_type_name || fallbackLabel, source, options)
    if (!entry) return
    const key = getLeaveBalanceTypeKey(entry.label)
    map.set(key, mergeCertificationEntry(map.get(key), entry))
    return
  }

  for (const [key, value] of Object.entries(source)) {
    if (value == null || key === 'as_of_date') continue

    const entryLabel =
      value && typeof value === 'object' && !Array.isArray(value)
        ? value.leave_type_name || key
        : key
    const entry = createCertificationEntry(entryLabel, value, options)
    if (!entry) continue
    const typeKey = getLeaveBalanceTypeKey(entry.label)
    map.set(typeKey, mergeCertificationEntry(map.get(typeKey), entry))
  }
}

function buildCertificationEntryMap(app, options = {}) {
  const entries = new Map()

  collectCertificationEntries(entries, app?.certificationLeaveCredits, '', options)
  collectCertificationEntries(entries, app?.certification_leave_credits, '', options)

  if (!entries.size) {
    const fallbackEntry = createCertificationEntry(
      app?.leave_type_name || 'Leave Credits',
      app?.leaveBalance,
      options,
    )
    if (fallbackEntry) {
      entries.set(getLeaveBalanceTypeKey(fallbackEntry.label), fallbackEntry)
    }
  }

  return entries
}

function buildCertificationColumns(app, options = {}) {
  const entryMap = buildCertificationEntryMap(app, options)
  const selectedLabel = prettifyLeaveBalanceLabel(app?.leave_type_name || 'Leave Credits')
  const rawSelectedKey = getLeaveBalanceTypeKey(selectedLabel)
  const selectedKey = resolveCertificationSelectedTypeKey(rawSelectedKey)
  const vacationKey = getLeaveBalanceTypeKey('Vacation Leave')
  const sickKey = getLeaveBalanceTypeKey('Sick Leave')
  const forcedLeaveKey = getLeaveBalanceTypeKey('Mandatory / Forced Leave')
  const isForcedLeaveSelection = rawSelectedKey === forcedLeaveKey
  const forceDualVacationSick = options?.forceDualVacationSick === true
  const showDualColumns =
    forceDualVacationSick || (!isForcedLeaveSelection && (selectedKey === vacationKey || selectedKey === sickKey))

  if (showDualColumns) {
    return [
      entryMap.get(vacationKey) || createEmptyCertificationEntry('Vacation Leave'),
      entryMap.get(sickKey) || createEmptyCertificationEntry('Sick Leave'),
    ]
  }

  const resolvedSelectedEntry =
    findCertificationEntryByTypeKey(entryMap, selectedKey) ||
    (entryMap.size === 1 ? entryMap.values().next().value : null)
  const selectedFallbackLabel = selectedKey === vacationKey ? 'Vacation Leave' : selectedLabel
  const selectedFallbackEntry = buildSelectedCertificationFallbackEntry(app, selectedFallbackLabel)
  const mergedSelectedEntry = mergeCertificationEntry(resolvedSelectedEntry, selectedFallbackEntry)

  return [
    mergedSelectedEntry ||
      createEmptyCertificationEntry(selectedFallbackLabel || selectedLabel || 'Leave Credits'),
  ]
}

function resolveExplicitCertificationLessThisApplicationValue(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null

  const candidates = [
    source.less_this_application,
    source.lessThisApplication,
    source.deducted_days,
    source.deductedDays,
  ]

  for (const candidate of candidates) {
    const parsedNumber = toCreditNumber(candidate)
    if (parsedNumber !== null) return parsedNumber
  }

  return null
}

function hasExplicitCertificationLessThisApplication(source) {
  if (!source) return false

  if (typeof source === 'string') {
    const parsedSource = parseCertificationSourceCandidate(source)
    return parsedSource !== null
      ? hasExplicitCertificationLessThisApplication(parsedSource)
      : false
  }

  if (Array.isArray(source)) {
    return source.some((item) => hasExplicitCertificationLessThisApplication(item))
  }

  if (typeof source !== 'object') return false

  if (resolveExplicitCertificationLessThisApplicationValue(source) !== null) {
    return true
  }

  return Object.entries(source).some(([key, value]) => {
    if (key === 'as_of_date' || value == null) return false
    return hasExplicitCertificationLessThisApplication(value)
  })
}

function applyCertificationLessThisApplicationOverride(
  columns,
  selectedLeaveType,
  lessThisApplicationDays,
  options = {},
) {
  if (!Array.isArray(columns) || columns.length === 0) return columns

  const normalizedLessThisApplicationDays = toFiniteNumber(lessThisApplicationDays)
  if (normalizedLessThisApplicationDays === null) return columns

  const preserveExistingBalance = options?.preserveExistingBalance === true
  const selectedLeaveTypeKey = resolveCertificationSelectedTypeKey(
    getLeaveBalanceTypeKey(selectedLeaveType),
  )
  if (!selectedLeaveTypeKey) return columns

  return columns.map((column) => {
    const columnTypeKey = getLeaveBalanceTypeKey(column?.label)
    if (
      !columnTypeKey ||
      !areCertificationTypeKeysEquivalent(columnTypeKey, selectedLeaveTypeKey)
    ) {
      return column
    }

    return applyCertificationLessThisApplicationToColumn(
      column,
      normalizedLessThisApplicationDays,
      preserveExistingBalance,
    )
  })
}

function applyCertificationLessThisApplicationToColumn(
  column,
  normalizedLessThisApplicationDays,
  preserveExistingBalance,
) {
  const existingTotalEarnedNumber = toCreditNumber(column?.totalEarned)
  const existingBalanceNumber = toCreditNumber(column?.balance)
  const nextColumn = {
    ...column,
    lessThisApplication: fmtCertificationCredit(normalizedLessThisApplicationDays),
  }
  // For approved reprints, keep persisted balance values to avoid double deduction.
  if (preserveExistingBalance && existingBalanceNumber !== null) {
    if (
      existingTotalEarnedNumber !== null &&
      normalizedLessThisApplicationDays > 0 &&
      existingTotalEarnedNumber <= existingBalanceNumber + 1e-9
    ) {
      nextColumn.totalEarned = fmtCertificationCredit(
        existingBalanceNumber + normalizedLessThisApplicationDays,
      )
    }
    return nextColumn
  }

  if (existingTotalEarnedNumber !== null) {
    const computedBalance = existingTotalEarnedNumber - normalizedLessThisApplicationDays
    const normalizedBalance = Math.max(computedBalance, 0)
    nextColumn.balance = fmtCertificationCredit(Math.abs(normalizedBalance) < 1e-9 ? 0 : normalizedBalance)
    return nextColumn
  }

  if (existingBalanceNumber !== null) {
    nextColumn.totalEarned = fmtCertificationCredit(existingBalanceNumber)
    const computedBalance = existingBalanceNumber - normalizedLessThisApplicationDays
    const normalizedBalance = Math.max(computedBalance, 0)
    nextColumn.balance = fmtCertificationCredit(Math.abs(normalizedBalance) < 1e-9 ? 0 : normalizedBalance)
  }

  return nextColumn
}

function applyMonetizationCertificationLessThisApplicationOverride(columns, components, options = {}) {
  if (!Array.isArray(columns) || columns.length === 0) return columns
  if (!Array.isArray(components) || components.length === 0) return columns

  const preserveExistingBalance = options?.preserveExistingBalance === true

  return columns.map((column) => {
    const columnTypeKey = getLeaveBalanceTypeKey(column?.label)
    if (!columnTypeKey) return column

    const matchedComponent = components.find((component) =>
      areCertificationTypeKeysEquivalent(columnTypeKey, component?.key),
    )
    if (!matchedComponent) return column

    const normalizedComponentDays = toFiniteNumber(matchedComponent.days)
    if (normalizedComponentDays === null) return column

    return applyCertificationLessThisApplicationToColumn(
      column,
      normalizedComponentDays,
      preserveExistingBalance,
    )
  })
}


function isCtoLeaveCertificationColumn(column) {
  const normalized = String(column?.label || column?.leave_type || column?.leaveType || '')
    .trim()
    .toLowerCase()
  return (
    normalized.includes('cto') ||
    normalized.includes('compensatory time off') ||
    normalized.includes('compensatory time-off') ||
    normalized.includes('compensatory overtime credit') ||
    normalized.includes('compensatory leave')
  )
}

function formatCtoHoursAndMinutesFromCredit(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return ''
  }

  const rawStr = String(value).trim()
  if (/[a-zA-Z]/.test(rawStr)) {
    return rawStr
  }

  const num = Number(rawStr.replace(/,/g, ''))
  if (!Number.isFinite(num) || num < 0) {
    return rawStr
  }

  const totalHours = num * 8.0
  const totalMinutes = Math.round(totalHours * 60)
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  if (hrs > 0 && mins > 0) {
    return `${hrs} hrs ${mins} mins`
  }
  if (hrs > 0) {
    return `${hrs} hrs`
  }
  if (mins > 0) {
    return `${mins} mins`
  }
  return '0 hr'
}

function formatCertificationCellValue(column, key) {
  const rawValue = column?.[key]
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return ''
  }

  if (isCtoLeaveCertificationColumn(column)) {
    return formatCtoHoursAndMinutesFromCredit(rawValue)
  }

  return String(rawValue)
}

function buildCertificationTable(columns) {
  const isDualColumns = columns.length > 1
  const widths = isDualColumns ? ['40%', '30%', '30%'] : ['52%', '48%']
  const lineWidth = 0.5
  const headerRow = [{ text: '', fontSize: 7 }]

  for (const column of columns) {
    headerRow.push({
      text: column.label,
      fontSize: 7,
      bold: true,
      alignment: 'center',
    })
  }

  const rows = [
    ['Total Earned', 'totalEarned', true],
    ['Less this application', 'lessThisApplication', true],
    ['Balance', 'balance', true],
  ]

  return {
    table: {
      widths,
      body: [
        headerRow,
        ...rows.map(([label, key, emphasized]) => [
          { text: label, fontSize: 7, bold: emphasized, italics: true },
          ...columns.map((column) => ({
            text: formatCertificationCellValue(column, key),
            fontSize: 7,
            alignment: 'center',
          })),
        ]),
      ],
    },
    layout: {
      hLineWidth: () => lineWidth,
      vLineWidth: () => lineWidth,
      hLineColor: () => '#000',
      vLineColor: () => '#000',
    },
    margin: [12, 0, 12, 8],
  }
}

function normalizeOfficeDepartment(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getOfficeDepartmentLayoutConfig(value) {
  const officeText = normalizeOfficeDepartment(value)

  if (officeText.length > 85) {
    return {
      cellMargin: [6, 5, 6, 4],
      columnWidth: '39%',
      fontSize: 6.2,
      lineHeight: 0.92,
      valueMargin: [0, 2, 0, 0],
    }
  }

  if (officeText.length > 70) {
    return {
      cellMargin: [6, 6, 6, 5],
      columnWidth: '38%',
      fontSize: 6.6,
      lineHeight: 0.95,
      valueMargin: [0, 2, 0, 0],
    }
  }

  if (officeText.length > 55) {
    return {
      cellMargin: [7, 7, 7, 6],
      columnWidth: '37%',
      fontSize: 7.1,
      lineHeight: 0.98,
      valueMargin: [0, 3, 0, 0],
    }
  }

  if (officeText.length > 40) {
    return {
      cellMargin: [8, 7, 8, 6],
      columnWidth: '36%',
      fontSize: 7.8,
      lineHeight: 1.02,
      valueMargin: [0, 3, 0, 0],
    }
  }

  return {
    cellMargin: [8, 8, 8, 8],
    columnWidth: '35%',
    fontSize: 9,
    lineHeight: 1.05,
    valueMargin: [0, 4, 0, 0],
  }
}

const CITY_VICE_MAYOR_APPROVED_FOR_OFFICE_ACRONYMS = new Set([
  'SP LEGISLATIVE',
  'SP SECRETARIAT',
  'CVMO',
])

function normalizeOfficeAcronymToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function resolveLeaveApplicantOfficeAcronym(app) {
  const candidates = [
    app?.officeAcronym,
    app?.office_acronym,
    app?.hrisOfficeAcronym,
    app?.hris_office_acronym,
    app?.departmentOfficeAbbr,
    app?.department_office_abbr,
    app?.employee?.officeAcronym,
    app?.employee?.office_acronym,
    app?.employee?.hrisOfficeAcronym,
    app?.employee?.hris_office_acronym,
    app?.employee?.departmentOfficeAbbr,
    app?.employee?.department_office_abbr,
    app?.raw?.officeAcronym,
    app?.raw?.office_acronym,
    app?.raw?.hrisOfficeAcronym,
    app?.raw?.hris_office_acronym,
    app?.raw?.departmentOfficeAbbr,
    app?.raw?.department_office_abbr,
    app?.raw?.employee?.officeAcronym,
    app?.raw?.employee?.office_acronym,
    app?.raw?.employee?.hrisOfficeAcronym,
    app?.raw?.employee?.hris_office_acronym,
    app?.raw?.employee?.departmentOfficeAbbr,
    app?.raw?.employee?.department_office_abbr,
  ]

  for (const candidate of candidates) {
    const normalizedOfficeAcronym = normalizeOfficeAcronymToken(candidate)
    if (normalizedOfficeAcronym) {
      return normalizedOfficeAcronym
    }
  }

  return ''
}

function shouldUseCityViceMayorApprovedForSignatory(app) {
  return CITY_VICE_MAYOR_APPROVED_FOR_OFFICE_ACRONYMS.has(resolveLeaveApplicantOfficeAcronym(app))
}

function toFiniteNumber(value) {
  if (value == null || value === '') return null
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return null
  return numericValue
}

function pickFirstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = toFiniteNumber(value)
    if (parsed !== null) return parsed
  }
  return null
}

function normalizePayStatus(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizePayStatus(
      value.pay_status ?? value.payStatus ?? value.status ?? value.code ?? value.value ?? '',
    )
  }

  const normalizedValue = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, '')

  if (normalizedValue === 'WP' || normalizedValue === 'WITHPAY') return 'WP'
  if (normalizedValue === 'WOP' || normalizedValue === 'WITHOUTPAY') return 'WOP'
  return ''
}

function toStatusMap(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) return null
    try {
      const parsedValue = JSON.parse(trimmedValue)
      return toStatusMap(parsedValue)
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) {
    const map = {}
    value.forEach((entry, index) => {
      const normalized = normalizePayStatus(entry)
      if (normalized) {
        map[String(index)] = normalized
      }
    })
    return Object.keys(map).length ? map : null
  }
  if (typeof value === 'object') {
    const map = {}
    for (const [key, entry] of Object.entries(value)) {
      const normalized = normalizePayStatus(entry)
      if (normalized) {
        map[key] = normalized
      }
    }
    return Object.keys(map).length ? map : null
  }
  return null
}

function normalizeCoverage(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeCoverage(value.selected_date_coverage)
  }

  const normalizedValue = String(value || '')
    .trim()
    .toLowerCase()
  if (
    normalizedValue === 'half' ||
    normalizedValue === 'halfday' ||
    normalizedValue === 'half-day'
  ) {
    return 'half'
  }
  if (!normalizedValue) return ''
  return 'whole'
}

function toCoverageMap(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) return null
    try {
      const parsedValue = JSON.parse(trimmedValue)
      return toCoverageMap(parsedValue)
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) {
    const map = {}
    value.forEach((entry, index) => {
      const normalized = normalizeCoverage(entry)
      if (normalized) {
        map[String(index)] = normalized
      }
    })
    return Object.keys(map).length ? map : null
  }
  if (typeof value === 'object') {
    const map = {}
    for (const [key, entry] of Object.entries(value)) {
      const normalized = normalizeCoverage(entry)
      if (normalized) {
        map[key] = normalized
      }
    }
    return Object.keys(map).length ? map : null
  }
  return null
}

function normalizeHalfDayPortion(value) {
  const normalizedValue = String(value || '')
    .trim()
    .toUpperCase()
  if (normalizedValue === 'AM' || normalizedValue === 'PM') return normalizedValue
  return ''
}

function toHalfDayPortionMap(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) return null
    try {
      const parsedValue = JSON.parse(trimmedValue)
      return toHalfDayPortionMap(parsedValue)
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) {
    const map = {}
    value.forEach((entry, index) => {
      const normalized = normalizeHalfDayPortion(entry)
      if (normalized) {
        map[String(index)] = normalized
      }
    })
    return Object.keys(map).length ? map : null
  }
  if (typeof value === 'object') {
    const map = {}
    for (const [key, entry] of Object.entries(value)) {
      const normalized = normalizeHalfDayPortion(entry)
      if (normalized) {
        map[key] = normalized
      }
    }
    return Object.keys(map).length ? map : null
  }
  return null
}

function toDateKey(value) {
  if (!value) return null
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return null
  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateKeyMap(value) {
  if (!value) return {}

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    if (!trimmedValue) return {}

    try {
      const parsedValue = JSON.parse(trimmedValue)
      return toDateKeyMap(parsedValue)
    } catch {
      const dateKey = toDateKey(trimmedValue)
      return dateKey ? { [dateKey]: true } : {}
    }
  }

  if (Array.isArray(value)) {
    return value.reduce((map, entry) => {
      const dateKey = toDateKey(entry)
      if (dateKey) map[dateKey] = true
      return map
    }, {})
  }

  if (typeof value === 'object') {
    const map = {}
    for (const [key, entry] of Object.entries(value)) {
      const dateKey = toDateKey(key) || toDateKey(entry)
      if (dateKey) map[dateKey] = true
    }
    return map
  }

  return {}
}

function toDateFromIsoKey(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function isContinuousDateRange(dateKeys) {
  if (!Array.isArray(dateKeys) || dateKeys.length <= 1) return true

  for (let index = 1; index < dateKeys.length; index += 1) {
    const previousDate = toDateFromIsoKey(dateKeys[index - 1])
    const currentDate = toDateFromIsoKey(dateKeys[index])
    if (!previousDate || !currentDate) return false

    const expectedNextDate = new Date(
      previousDate.getFullYear(),
      previousDate.getMonth(),
      previousDate.getDate() + 1,
    )

    if (expectedNextDate.getTime() !== currentDate.getTime()) {
      return false
    }
  }

  return true
}

function isTwoConsecutiveDateRange(dateKeys) {
  if (!Array.isArray(dateKeys) || dateKeys.length !== 2) return false

  const firstDate = toDateFromIsoKey(dateKeys[0])
  const secondDate = toDateFromIsoKey(dateKeys[1])
  if (!firstDate || !secondDate) return false

  const expectedNextDate = new Date(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate() + 1,
  )

  return expectedNextDate.getTime() === secondDate.getTime()
}

function enumerateInclusiveDateKeys(startDateKey, endDateKey) {
  const startDate = toDateFromIsoKey(startDateKey)
  const endDate = toDateFromIsoKey(endDateKey)
  if (!startDate || !endDate) return []

  const firstDate = startDate <= endDate ? startDate : endDate
  const lastDate = startDate <= endDate ? endDate : startDate
  const dateKeys = []
  const cursor = new Date(firstDate)

  while (cursor <= lastDate) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    const day = String(cursor.getDate()).padStart(2, '0')
    dateKeys.push(`${year}-${month}-${day}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  return dateKeys
}

function resolveSelectedDateKeys(app) {
  const dateKeyMap = toDateKeyMap(app?.selected_dates)

  return Object.keys(dateKeyMap).sort()
}

function formatGroupedSelectedDateRanges(dateKeys, expandConsecutiveDays = false) {
  if (!Array.isArray(dateKeys) || dateKeys.length === 0) return ''

  const groupedByMonthYear = new Map()
  const sortedKeys = [...new Set(dateKeys.filter(Boolean))].sort()

  for (const dateKey of sortedKeys) {
    const date = toDateFromIsoKey(dateKey)
    if (!date) continue

    const monthName = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    const day = date.getDate()
    const groupKey = `${year}-${date.getMonth()}`

    if (!groupedByMonthYear.has(groupKey)) {
      groupedByMonthYear.set(groupKey, { monthName, year, days: [] })
    }

    groupedByMonthYear.get(groupKey).days.push(day)
  }

  return Array.from(groupedByMonthYear.values())
    .map((group) => {
      const uniqueDays = [...new Set(group.days)].sort((left, right) => left - right)
      if (!uniqueDays.length) return ''

      if (expandConsecutiveDays) {
        return `${group.monthName} ${uniqueDays.join(', ')}, ${group.year}`
      }

      const dayRanges = []
      let rangeStart = uniqueDays[0]
      let rangeEnd = uniqueDays[0]

      for (let index = 1; index < uniqueDays.length; index += 1) {
        const currentDay = uniqueDays[index]
        if (currentDay === rangeEnd + 1) {
          rangeEnd = currentDay
          continue
        }

        dayRanges.push([rangeStart, rangeEnd])
        rangeStart = currentDay
        rangeEnd = currentDay
      }

      dayRanges.push([rangeStart, rangeEnd])

      const rangeLabels = dayRanges.map(([startDay, endDay]) =>
        startDay === endDay
          ? `${group.monthName} ${startDay}`
          : endDay === startDay + 1
            ? `${group.monthName} ${startDay}, ${endDay}`
            : `${group.monthName} ${startDay}-${endDay}`,
      )

      return `${rangeLabels.join(', ')} ${group.year}`
    })
    .filter(Boolean)
    .join(', ')
}

function resolveInclusiveDatesLabel(app) {
  const selectedDateKeys = resolveSelectedDateKeys(app)
  const expandConsecutiveDays = isAbroadLeaveApplication(app)

  if (!selectedDateKeys.length) {
    const startDate = app.start_date || app.startDate
    const endDate = app.end_date || app.endDate || startDate
    const startDateKey = toDateKey(startDate)
    const endDateKey = toDateKey(endDate)

    if (startDateKey && endDateKey) {
      const sortedDateKeys = [startDateKey, endDateKey].sort()

      if (expandConsecutiveDays) {
        const rangedDateKeys = enumerateInclusiveDateKeys(sortedDateKeys[0], sortedDateKeys[1])
        const groupedDateRanges = formatGroupedSelectedDateRanges(rangedDateKeys, true)
        if (groupedDateRanges) return groupedDateRanges
      }

      if (startDateKey === endDateKey) return fmtDate(startDateKey)

      if (isTwoConsecutiveDateRange(sortedDateKeys)) {
        const groupedDateRanges = formatGroupedSelectedDateRanges(sortedDateKeys)
        if (groupedDateRanges) return groupedDateRanges
      }

      return `${fmtDate(sortedDateKeys[0])} to ${fmtDate(sortedDateKeys[1])}`
    }

    return `${fmtDate(startDate)} - ${fmtDate(endDate)}`
  }

  const coverageMap = toCoverageMap(app?.selected_date_coverage)

  const halfDayPortionMap = toHalfDayPortionMap(app?.selected_date_half_day_portion)

  const formattedDates = selectedDateKeys.map((dateKey, index) => {
    const coverage = normalizeCoverage(coverageMap?.[dateKey] ?? coverageMap?.[String(index)] ?? '')
    if (coverage !== 'half') return fmtDate(dateKey)

    const halfDayPortion = normalizeHalfDayPortion(
      halfDayPortionMap?.[dateKey] ?? halfDayPortionMap?.[String(index)] ?? '',
    )

    return halfDayPortion
      ? `${fmtDate(dateKey)} (${halfDayPortion})`
      : `${fmtDate(dateKey)} (Half Day)`
  })

  const hasHalfDaySelection = formattedDates.some(
    (label) => label.includes('(Half Day)') || label.includes('(AM)') || label.includes('(PM)'),
  )
  if (!hasHalfDaySelection && expandConsecutiveDays) {
    const groupedDateRanges = formatGroupedSelectedDateRanges(selectedDateKeys, true)
    if (groupedDateRanges) return groupedDateRanges
  }

  if (!hasHalfDaySelection && isContinuousDateRange(selectedDateKeys)) {
    if (selectedDateKeys.length === 1) return fmtDate(selectedDateKeys[0])
    if (isTwoConsecutiveDateRange(selectedDateKeys)) {
      const groupedDateRanges = formatGroupedSelectedDateRanges(selectedDateKeys)
      if (groupedDateRanges) return groupedDateRanges
    }
    return `${fmtDate(selectedDateKeys[0])} to ${fmtDate(selectedDateKeys[selectedDateKeys.length - 1])}`
  }

  if (!hasHalfDaySelection) {
    const groupedDateRanges = formatGroupedSelectedDateRanges(selectedDateKeys)
    if (groupedDateRanges) return groupedDateRanges
  }

  return formattedDates.join(', ')
}

function resolveApprovedForSectionValues(app) {
  const resolvePayMode = (value) => {
    const normalizedValue = String(value || '')
      .trim()
      .toUpperCase()
    if (normalizedValue === 'WOP' || normalizedValue === 'WITHOUT PAY') return 'WOP'
    if (normalizedValue === 'WP' || normalizedValue === 'WITH PAY') return 'WP'
    return ''
  }

  const totalDays = pickFirstFiniteNumber(app?.total_days)

  let withPayDays = pickFirstFiniteNumber(app?.with_pay_days, app?.withPayDays)

  let withoutPayDays = pickFirstFiniteNumber(app?.without_pay_days, app?.withoutPayDays)
  let derivedFromPayStatus = false

  const deductibleDays = pickFirstFiniteNumber(app?.deductible_days)
  const shouldDeriveFromPayStatus =
    withPayDays === null && withoutPayDays === null && deductibleDays === null

  const payStatusMap = toStatusMap(app?.selected_date_pay_status)

  const coverageMap = toCoverageMap(app?.selected_date_coverage)

  if (shouldDeriveFromPayStatus && payStatusMap) {
    let computedWithPayDays = 0
    let computedWithoutPayDays = 0
    let hasComputedPayStatus = false

    for (const [dateKey, statusValue] of Object.entries(payStatusMap)) {
      const normalizedStatus = normalizePayStatus(statusValue)
      if (!normalizedStatus) continue

      hasComputedPayStatus = true
      const normalizedCoverage = normalizeCoverage(coverageMap?.[dateKey] ?? '')
      const weight = normalizedCoverage === 'half' ? 0.5 : 1
      if (normalizedStatus === 'WOP') {
        computedWithoutPayDays += weight
      } else {
        computedWithPayDays += weight
      }
    }

    if (hasComputedPayStatus) {
      withPayDays = computedWithPayDays
      withoutPayDays = computedWithoutPayDays
      derivedFromPayStatus = true
    }
  }

  if (!derivedFromPayStatus && deductibleDays !== null && withPayDays === null) {
    withPayDays = deductibleDays
    if (withoutPayDays === null && totalDays !== null) {
      withoutPayDays = Math.max(totalDays - deductibleDays, 0)
    }
  }

  const normalizedPayMode = resolvePayMode(app?.pay_mode)
  const withPayFlag = app?.with_pay
  const withoutPayFlag = app?.without_pay

  if (totalDays !== null && withPayDays !== null && withoutPayDays !== null) {
    const accountedDays = withPayDays + withoutPayDays
    const missingDays = Math.round((totalDays - accountedDays) * 1000) / 1000
    if (missingDays > 0) {
      if (normalizedPayMode === 'WOP') {
        withoutPayDays += missingDays
      } else {
        withPayDays += missingDays
      }
    }
  }

  if (totalDays !== null && withPayDays === null && withoutPayDays === null) {
    if (normalizedPayMode === 'WP' || withPayFlag === true) {
      withPayDays = totalDays
      withoutPayDays = 0
    } else if (normalizedPayMode === 'WOP' || withoutPayFlag === true) {
      withPayDays = 0
      withoutPayDays = totalDays
    }
  }

  if (withoutPayDays === null && totalDays !== null && withPayDays !== null) {
    withoutPayDays = totalDays - withPayDays
  }
  if (withPayDays === null && totalDays !== null && withoutPayDays !== null) {
    withPayDays = totalDays - withoutPayDays
  }

  if (withPayDays !== null) withPayDays = Math.max(0, Math.round(withPayDays * 1000) / 1000)
  if (withoutPayDays !== null)
    withoutPayDays = Math.max(0, Math.round(withoutPayDays * 1000) / 1000)

  const others = String(app?.approved_for_others || '').trim()

  return {
    withPayDays,
    withoutPayDays,
    others,
  }
}

function formatApprovedForDays(value) {
  const numericValue = Number(value)
  if (Number.isFinite(numericValue) && Math.abs(numericValue) < 0.0005) {
    return ''
  }

  const formatted = fmtCredit(value)
  return formatted === '' ? '' : formatted
}

function formatApprovedForOthers(value) {
  const resolvedValue = String(value || '').trim()
  return resolvedValue === '0' || resolvedValue === '0.000' ? '' : resolvedValue
}

function getApprovedForFieldWidth() {
  return 28
}

function buildApprovedForLine(value, label, margin = [4, 2]) {
  const resolvedValue = String(value || '').trim()
  const fieldWidth = getApprovedForFieldWidth(resolvedValue)
  return {
    columns: [
      { text: '         ', width: 'auto' },
      {
        width: fieldWidth,
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: resolvedValue || ' ',
                fontSize: 8,
                bold: true,
                margin: [0, 0, 0, 2],
                border: [false, false, false, true],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 0,
          hLineColor: () => '#000',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
      { text: ' ', width: 4 },
      { text: label, width: '*', fontSize: 8, margin: [0, 2, 0, 0] },
    ],
    margin,
  }
}

function openPdfDocument(pdfDocument, options = {}) {
  const targetWindow =
    options?.targetWindow && !options.targetWindow.closed ? options.targetWindow : null
  const fileName =
    String(options?.fileName || 'leave-application.pdf').trim() || 'leave-application.pdf'

  return pdfDocument.getBlob().then((blob) => {
    const objectUrl = URL.createObjectURL(blob)

    if (targetWindow) {
      targetWindow.location.replace(objectUrl)
    } else {
      const opened = window.open(objectUrl, '_blank')
      if (!opened) {
        const anchor = document.createElement('a')
        anchor.href = objectUrl
        anchor.download = fileName
        anchor.rel = 'noopener noreferrer'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  })
}

// ─── main builder ──────────────────────────────────────────────────────────
export async function generateLeaveFormPdf(sourceApp, options = {}) {
  const app = await enrichAppWithDepartmentHead(mergeLocalLeaveApplicationDetails(sourceApp))
  const documentVerification = resolveDocumentVerification(app)
  const office = normalizeOfficeDepartment(app.office || '')
  const officeLayout = getOfficeDepartmentLayoutConfig(office)
  const resolvedLeaveType = resolvePrintableLeaveType(app)
  const lt = resolvedLeaveType.toLowerCase()
  const monetizationComponents = resolveMonetizationLeaveCreditComponents(app)
  const vacationLeaveKey = getLeaveBalanceTypeKey('Vacation Leave')
  const sickLeaveKey = getLeaveBalanceTypeKey('Sick Leave')
  const includesVacationMonetization = monetizationComponents.some(
    (component) => component.key === vacationLeaveKey && component.days > 0,
  )
  const includesSickMonetization = monetizationComponents.some(
    (component) => component.key === sickLeaveKey && component.days > 0,
  )
  const rawStatus = String(app.raw_status || '').toUpperCase()
  const statusLabel = String(app.status || '').toUpperCase()

  // Determine which leave type checkbox to tick
  const isMonetization =
    isMonetizationFlagEnabled(app?.is_monetization) ||
    isMonetizationFlagEnabled(app?.raw?.is_monetization) ||
    lt.includes('monetization')
  const isVacation = (lt.includes('vacation') && !isMonetization) || (isMonetization && includesVacationMonetization)
  const isMandatory = lt.includes('mandatory') || lt.includes('forced')
  const isSick = (lt.includes('sick') && !isMonetization) || (isMonetization && includesSickMonetization)
  const isWellness = lt.includes('wellness')
  const isCTO = lt.includes('cto') || lt.includes('compensatory time off')
  const isMaternity = lt.includes('maternity')
  const isPaternity = lt.includes('paternity')
  const isSpecPriv = lt.includes('special privilege')
  const isSoloParent = lt.includes('solo parent')
  const isStudy = lt.includes('study')
  const isVAWC = lt.includes('vawc')
  const isRehab = lt.includes('rehabilitation')
  const isSLBW = lt.includes('special leave benefit')
  const isCalamity = lt.includes('calamity') || lt.includes('emergency')
  const isAdoption = lt.includes('adoption')
  const isCommutationRequested =
    String(app.commutation || '')
      .toLowerCase()
      .trim() === 'requested'
  const isCommutationRequestedForPrint = isMonetization || isCommutationRequested
  const isForApproval =
    rawStatus === 'PENDING_HR' ||
    rawStatus === 'APPROVED' ||
    statusLabel === 'APPROVED' ||
    statusLabel === 'PENDING HR'
  const isApproved = rawStatus === 'APPROVED' || statusLabel === 'APPROVED'
  const isForDisapproval =
    rawStatus === 'REJECTED' ||
    rawStatus === 'DISAPPROVED' ||
    statusLabel === 'REJECTED' ||
    statusLabel === 'DISAPPROVED'
  const disapprovalReason = isForDisapproval
    ? app.remarks || app.reason || '________________'
    : '________________'

  const approvedForSection = resolveApprovedForSectionValues(app)
  const certificationSource =
    app.certificationLeaveCredits ||
    app.certification_leave_credits ||
    {}
  const cert = certificationSource
  const asOfDate = cert.as_of_date || ''
  const certificationLessThisApplicationDays =
    pickFirstFiniteNumber(app?.deductible_days) ?? approvedForSection.withPayDays
  const hasExplicitCertificationLessThisApplicationValues =
    hasExplicitCertificationLessThisApplication(certificationSource)
  const baseCertificationColumns = buildCertificationColumns(app, {
    inferMissingTotalFromBalance: !isApproved,
    forceDualVacationSick:
      isMonetization && (includesVacationMonetization || includesSickMonetization),
  })
  let certificationColumns = baseCertificationColumns

  if (isMonetization && monetizationComponents.length > 0) {
    certificationColumns = applyMonetizationCertificationLessThisApplicationOverride(
      baseCertificationColumns,
      monetizationComponents,
      {
        preserveExistingBalance: isApproved,
      },
    )
  } else if (!hasExplicitCertificationLessThisApplicationValues) {
    certificationColumns = applyCertificationLessThisApplicationOverride(
      baseCertificationColumns,
      resolvedLeaveType,
      certificationLessThisApplicationDays,
      {
        preserveExistingBalance: isApproved,
      },
    )
  }

  const inclusiveDates = resolveInclusiveDatesLabel(app)
  const b = 0.5 // border width
  const name = parseName(app)
  const employeeStatusLabel = formatEmployeeStatusForReceiptStamp(app)
  const position = String(app?.position || '').trim()
  const positionFontSize = getSingleLineInfoFontSize(position)
  const baseRecommendationSignatory = getRecommendationSignatory(app)
  const cityViceMayorSignatory = getCityViceMayorSignature(app)
  const mayorSignatory = getMayorSignature(app)
  const chrmoLeaveInChargeSignatory = getChrmoLeaveInChargeSignatory(app)
  const chrmoLeaveInChargeSignatoryName = formatSignatoryNameWithMiddleInitial(
    chrmoLeaveInChargeSignatory.fullName,
  )
  const leaveDetails = resolveConfirmedLeaveDetails(app)
  const vacationDetail = resolveVacationDetailValue(leaveDetails.vacation_detail)
  const vacationSpecify = resolveVacationSpecifyValue(leaveDetails.vacation_specify)
  const sickDetail = resolveSickDetailValue(leaveDetails.sick_detail)
  const sickSpecify = resolveSickSpecifyValue(leaveDetails.sick_specify)
  const womenSpecify = leaveDetails.women_specify
  const studyDetail = leaveDetails.study_detail
  const otherPurpose = leaveDetails.other_purpose
  const splDetail = leaveDetails.spl_detail
  const splSpecify = leaveDetails.spl_specify
  const resolvedSplText = [splDetail, splSpecify].filter(Boolean).join(' - ')
  const normalizedVacationDetail = normalizeVacationDetailValue(vacationDetail)
  const normalizedSickDetail = normalizeSickDetailValue(sickDetail)
  const resolvedSickSpecify = sickSpecify
  const showWithinPhilippines =
    ((isVacation || isWellness) && normalizedVacationDetail === 'Within the Philippines') || isSpecPriv
  const showAbroad = (isVacation || isWellness) && normalizedVacationDetail === 'Abroad'
  const useCityViceMayorApprovedForSignatory =
    shouldUseCityViceMayorApprovedForSignatory(app) &&
    !isDepartmentHeadApplicant(app) &&
    !isCityViceMayorApplicant(app) &&
    !isSangguniangPanlungsodMemberIApplicant(app)
  const recommendationSignatory = resolveRecommendationSignatoryByApplicantType({
    app,
    isAbroad: showAbroad,
    isWithinPhilippines: showWithinPhilippines,
    mayorSignatory,
    cityViceMayorSignatory,
    baseRecommendationSignatory,
  })
  const approvedForSignatory = useCityViceMayorApprovedForSignatory
    ? cityViceMayorSignatory
    : mayorSignatory
  const approvedForSignatoryFallbackDesignation = useCityViceMayorApprovedForSignatory
    ? 'City Vice Mayor'
    : 'City Mayor'
  const recommendationSignatoryName = formatSignatoryNameWithMiddleInitial(
    recommendationSignatory.fullName,
  )
  const approvedForSignatoryName = formatSignatoryNameWithMiddleInitial(
    approvedForSignatory.fullName,
  )
  const showInHospital = isSick && normalizedSickDetail === 'In Hospital'
  const showOutPatient = isSick && normalizedSickDetail === 'Out Patient'
  const showMastersDegree = isStudy && studyDetail === 'Masters Degree'
  const showBarReview = isStudy && studyDetail === 'BAR Review'
  const showMonetizationPurpose = isMonetization || otherPurpose === 'Monetization'
  const showTerminalPurpose = otherPurpose === 'Terminal Leave'
  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    logoBase64 = null
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [28, 20, 28, 20],

    content: [
      // ═══ TOP HEADER ═══
      buildCocStyleLeaveHeader(logoBase64, b, employeeStatusLabel, documentVerification),

      // Title
      {
        text: 'APPLICATION FOR LEAVE',
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 4, 0, 6],
      },

      // ═══ SECTION 1–5: Basic info (sample layout: uppercase labels, values bold/underlined) ═══
      {
        table: {
          widths: [officeLayout.columnWidth, '*'],
          body: [
            [
              {
                stack: [
                  { text: '1.  OFFICE/DEPARTMENT:', bold: true, fontSize: 8 },
                  underlinedInfoValue(office, {
                    fontSize: officeLayout.fontSize,
                    lineHeight: officeLayout.lineHeight,
                    margin: officeLayout.valueMargin,
                  }),
                ],
                border: [true, true, false, true],
                margin: officeLayout.cellMargin,
              },
              {
                table: {
                  widths: ['auto', '*', '*', '*'],
                  body: [
                    [
                      {
                        text: '2. NAME:',
                        bold: true,
                        fontSize: 8,
                        margin: [0, 0, 12, 0],
                        border: [false, false, false, false],
                      },
                      {
                        text: '(Lastname)',
                        fontSize: 7,
                        color: '#666',
                        margin: [0, 0, 0, 0],
                        border: [false, false, false, false],
                      },
                      {
                        text: '(Firstname)',
                        fontSize: 7,
                        color: '#666',
                        margin: [0, 0, 0, 0],
                        border: [false, false, false, false],
                      },
                      {
                        text: '(Middlename)',
                        fontSize: 7,
                        color: '#666',
                        margin: [0, 0, 0, 0],
                        border: [false, false, false, false],
                      },
                    ],
                    [
                      { text: '', margin: [0, 4, 12, 0], border: [false, false, false, false] },
                      {
                        text: name.last,
                        fontSize: 9,
                        bold: true,
                        color: '#000000',
                        decoration: name.last ? 'underline' : undefined,
                        margin: [0, 0, 0, 0],
                        border: [false, false, false, false],
                      },
                      {
                        text: name.first,
                        fontSize: 9,
                        bold: true,
                        color: '#000000',
                        decoration: name.first ? 'underline' : undefined,
                        margin: [0, 0, 0, 0],
                        border: [false, false, false, false],
                      },
                      {
                        text: name.middle,
                        fontSize: 9,
                        bold: true,
                        color: '#000000',
                        decoration: name.middle ? 'underline' : undefined,
                        margin: [0, 0, 0, 0],
                        border: [false, false, false, false],
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
                border: [false, true, true, true],
                margin: [8, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? b : 0),
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
      },
      {
        table: {
          widths: ['26%', '52%', '22%'],
          body: [
            [
              {
                stack: [
                  { text: '3.  DATE OF FILING:', bold: true, fontSize: 8 },
                  underlinedInfoValue(fmtDateLong(app.date_filed), {
                    margin: [0, 4, 0, 0],
                  }),
                ],
                border: [true, false, false, true],
                margin: [8, 8],
              },
              {
                stack: [
                  { text: '4.  POSITION:', bold: true, fontSize: 8 },
                  underlinedInfoValue(position, {
                    fontSize: positionFontSize,
                    margin: [0, 4, 0, 0],
                    noWrap: true,
                  }),
                ],
                border: [false, false, false, true],
                margin: [8, 8],
              },
              {
                stack: [
                  { text: '5.  SALARY:', bold: true, fontSize: 8 },
                  underlinedInfoValue(fmtSalary(app.salary), {
                    margin: [0, 4, 0, 0],
                    noWrap: true,
                  }),
                ],
                border: [false, false, true, true],
                margin: [8, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? b : 0),
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
        margin: [0, 4, 0, 0],
      },

      // ═══ SECTION 6: DETAILS OF APPLICATION ═══
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: '6.  DETAILS OF APPLICATION',
                bold: true,
                fontSize: 9,
                alignment: 'center',
                margin: [0, 3, 0, 3],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: () => b,
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
        margin: [0, 0, 0, 0],
      },

      // 6.A and 6.B side by side
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              // ─── 6.A ───
              {
                stack: [
                  {
                    text: '6.A  TYPE OF LEAVE TO BE AVAILED OF',
                    bold: true,
                    fontSize: 8,
                    margin: [4, 4, 0, 4],
                  },
                  checkboxRow(
                    isVacation,
                    'VACATION LEAVE (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
                    { marginVertical: 0 },
                  ),
                  checkboxRow(
                    isMandatory,
                    'MANDATORY/FORCED LEAVE (Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
                  ),
                  checkboxRow(
                    isSick,
                    'SICK LEAVE  (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
                  ),
                  checkboxRow(isWellness, 'WELLNESS LEAVE POLICY (CSC Resolution No. 2501292)'),
                  checkboxRow(
                    isCTO,
                    'COMPENSATORY TIME OFF (CTO) (CSC-DBM Joint Circular No. 2, s. 2004)',
                  ),
                  checkboxRow(
                    isMaternity,
                    'MATERNITY LEAVE (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)',
                  ),
                  checkboxRow(
                    isPaternity,
                    'PATERNITY LEAVE (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)',
                  ),
                  checkboxRow(
                    isSpecPriv,
                    'SPECIAL PRIVILEGE LEAVE(MC06) (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
                  ),
                  checkboxRow(
                    isSoloParent,
                    'SOLO PARENT LEAVE (RA No. 8972 / CSC MC No. 8, s. 2004)',
                  ),
                  checkboxRow(
                    isStudy,
                    'STUDY LEAVE (Sec. 53, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
                  ),
                  checkboxRow(isVAWC, '10-DAY VAWC LEAVE (RA No. 9262 / CSC MC No. 15, s. 2005)'),
                  checkboxRow(
                    isRehab,
                    'REHABILITATION PRIVILEGE (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
                  ),
                  checkboxRow(
                    isSLBW,
                    'SPECIAL LEAVE BENEFITS FOR WOMEN (RA No. 9710 / CSC MC No. 25, s. 2010)',
                  ),
                  checkboxRow(
                    isCalamity,
                    'SPECIAL EMERGENCY (CALAMITY) LEAVE (CSC MC No. 2, s. 2012, as amended)',
                  ),
                  checkboxRow(isAdoption, 'ADOPTION LEAVE (R.A. No. 8552)'),
                ],
                border: [true, false, true, true],
              },

              // ─── 6.B ───
              {
                stack: [
                  { text: '6.B  DETAILS OF LEAVE', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                  {
                    text: '   In case of Vacation/Special Privilege/Wellness Leave:',
                    fontSize: 7,
                    italics: true,
                    margin: [4, 0],
                  },
                  checkboxRow(
                    showWithinPhilippines,
                    buildSpecifiedDetailLabel(
                      'Within the Philippines',
                      isSpecPriv ? resolvedSplText : (showWithinPhilippines ? vacationSpecify : ''),
                      {
                        emptyLine: '___________________',
                      },
                    ),
                    { marginLeft: 8 },
                  ),
                  checkboxRow(
                    showAbroad,
                    buildSpecifiedDetailLabel(
                      'Abroad (Specify)',
                      showAbroad ? vacationSpecify : '',
                      {
                        emptyLine: '______________________',
                      },
                    ),
                    { marginLeft: 8 },
                  ),
                  { text: ' ', fontSize: 4 },
                  { text: '   In case of Sick Leave:', fontSize: 7, italics: true, margin: [4, 1] },
                  checkboxRow(
                    showInHospital,
                    buildSpecifiedDetailLabel(
                      'In Hospital (Specify Illness)',
                      showInHospital ? resolvedSickSpecify : '',
                      {
                        emptyLine: '_______________',
                      },
                    ),
                    { marginLeft: 8 },
                  ),
                  checkboxRow(
                    showOutPatient,
                    buildSpecifiedDetailLabel(
                      'Out Patient (Specify Illness)',
                      showOutPatient ? resolvedSickSpecify : '',
                      {
                        emptyLine: '_______________',
                      },
                    ),
                    { marginLeft: 8 },
                  ),
                  { text: ' ', fontSize: 4 },
                  {
                    text: '   In case of Special Leave Benefits for Women:',
                    fontSize: 7,
                    italics: true,
                    margin: [4, 1],
                  },
                  {
                    ...buildSpecifiedDetailLabel('(Specify Illness)', womenSpecify, {
                      fontSize: 7,
                      emptyLine: '___________________________',
                    }),
                    margin: [8, 1, 0, 0],
                  },
                  { text: ' ', fontSize: 4 },
                  {
                    text: '   In case of Study Leave:',
                    fontSize: 7,
                    italics: true,
                    margin: [4, 1],
                  },
                  checkboxRow(showMastersDegree, "Completion of Master's Degree", {
                    marginLeft: 8,
                  }),
                  checkboxRow(showBarReview, 'BAR/Board Examination Review', { marginLeft: 8 }),
                  { text: ' ', fontSize: 4 },
                  { text: '   Other purpose:', fontSize: 7, italics: true, margin: [4, 1] },
                  checkboxRow(showMonetizationPurpose, 'Monetization Leave', { marginLeft: 8 }),
                  checkboxRow(showTerminalPurpose, 'Terminal Leave', {
                    marginLeft: 8,
                    marginVertical: 1,
                    marginBottom: 4,
                  }),
                ],
                border: [false, false, true, true],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: () => b,
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
      },

      // ═══ 6.C and 6.D ═══
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                stack: [
                  {
                    text: '6.C  NUMBER OF WORKING DAYS APPLIED FOR',
                    bold: true,
                    fontSize: 8,
                    margin: [4, 4, 0, 2],
                  },
                  {
                    ...underlinedInfoValue(
                      `${app.total_days} ${app.total_days === 1 ? 'Day' : 'day(s)'}`,
                      { fontSize: 9, margin: [12, 2, 4, 4] },
                    ),
                  },
                  { text: 'INCLUSIVE DATES', bold: true, fontSize: 8, margin: [4, 4, 0, 2] },
                  {
                    ...underlinedInfoValue(inclusiveDates, {
                      fontSize: 8,
                      margin: [12, 2, 4, 4],
                    }),
                  },
                ],
                border: [true, false, true, true],
              },
              {
                stack: [
                  { text: '6.D  COMMUTATION', bold: true, fontSize: 8, margin: [4, 4, 0, 2] },
                  checkboxRow(!isCommutationRequestedForPrint, 'Not Requested'),
                  checkboxRow(isCommutationRequestedForPrint, 'Requested'),
                  { text: ' ', fontSize: 6 },
                  {
                    text: '________________________________________',
                    fontSize: 8,
                    alignment: 'center',
                    margin: [0, 4, 0, 0],
                  },
                  {
                    text: '(Signature of Applicant)',
                    fontSize: 7,
                    italics: true,
                    alignment: 'center',
                    margin: [0, 1, 0, 4],
                  },
                ],
                border: [false, false, true, true],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: () => b,
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
      },

      // ═══ SECTION 7: DETAILS OF ACTION ON APPLICATION ═══
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: '7.  DETAILS OF ACTION ON APPLICATION',
                bold: true,
                fontSize: 9,
                alignment: 'center',
                margin: [0, 3, 0, 3],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: () => b,
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
      },

      // 7.A and 7.B side by side
      {
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              // ─── 7.A ───
              {
                stack: [
                  {
                    text: '7.A  CERTIFICATION OF LEAVE CREDITS',
                    bold: true,
                    fontSize: 8,
                    margin: [4, 4, 0, 2],
                  },
                  {
                    text: `        As of ${asOfDate || '_______________'}`,
                    fontSize: 8,
                    margin: [4, 2, 0, 6],
                  },
                  buildCertificationTable(certificationColumns),
                  { text: ' ', fontSize: 8 },
                  {
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            text: chrmoLeaveInChargeSignatoryName || ' ',
                            fontSize: 8,
                            bold: true,
                            alignment: 'center',
                            margin: [0, 0, 0, 2],
                            border: [false, false, false, true],
                          },
                        ],
                      ],
                    },
                    margin: [36, 0, 36, 0],
                    layout: {
                      hLineWidth: () => 0.6,
                      vLineWidth: () => 0,
                      hLineColor: () => '#000',
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                      paddingTop: () => 0,
                      paddingBottom: () => 0,
                    },
                  },
                  {
                    text: 'CHRMO Leave In-charge',
                    fontSize: 7,
                    alignment: 'center',
                    margin: [0, 1, 0, 4],
                  },
                ],
                border: [true, false, true, true],
              },

              // ─── 7.B ───
              {
                stack: [
                  { text: '7.B  RECOMMENDATION', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                  checkboxRow(isForApproval, 'For approval', { marginVertical: 2 }),
                  { text: ' ', fontSize: 3 },
                  checkboxRow(isForDisapproval, `For disapproval due to ${disapprovalReason}`, {
                    marginVertical: 2,
                  }),
                  { text: ' ', fontSize: 14 },
                  { text: ' ', fontSize: 14 },
                  {
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            text: recommendationSignatoryName || ' ',
                            fontSize: 8,
                            bold: true,
                            alignment: 'center',
                            margin: [0, 0, 0, 2],
                            border: [false, false, false, true],
                          },
                        ],
                      ],
                    },
                    margin: [36, 0, 36, 0],
                    layout: {
                      hLineWidth: () => 0.6,
                      vLineWidth: () => 0,
                      hLineColor: () => '#000',
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                      paddingTop: () => 0,
                      paddingBottom: () => 0,
                    },
                  },
                  {
                    text: recommendationSignatory.designation,
                    fontSize: 7,
                    alignment: 'center',
                    margin: [0, 2, 0, 4],
                  },
                ],
                border: [false, false, true, true],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: () => b,
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
      },

      // 7.C and 7.D combined into one box with mayor signature
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      {
                        width: '50%',
                        stack: [
                          {
                            text: '7.C  APPROVED FOR:',
                            bold: true,
                            fontSize: 8,
                            margin: [4, 4, 0, 4],
                          },
                          buildApprovedForLine(
                            formatApprovedForDays(approvedForSection.withPayDays),
                            'days with pay',
                          ),
                          buildApprovedForLine(
                            formatApprovedForDays(approvedForSection.withoutPayDays),
                            'days without pay',
                          ),
                          buildApprovedForLine(
                            formatApprovedForOthers(approvedForSection.others),
                            'others (Specify)',
                            [4, 2, 0, 4],
                          ),
                        ],
                      },
                      {
                        width: '50%',
                        stack: [
                          {
                            text: '7.D  DISAPPROVED DUE TO:',
                            bold: true,
                            fontSize: 8,
                            margin: [4, 4, 0, 4],
                          },
                          {
                            text: '   _______________________________________________',
                            fontSize: 8,
                            margin: [4, 2],
                          },
                          {
                            text: '   _______________________________________________',
                            fontSize: 8,
                            margin: [4, 2],
                          },
                          {
                            text: '   _______________________________________________',
                            fontSize: 8,
                            margin: [4, 2, 0, 4],
                          },
                        ],
                      },
                    ],
                  },
                  { text: ' ', fontSize: 6, margin: [0, 5, 0, 0] },
                  {
                    table: {
                      widths: ['*'],
                      body: [
                        [
                          {
                            text: approvedForSignatoryName || ' ',
                            fontSize: 10,
                            bold: true,
                            alignment: 'center',
                            margin: [0, 0, 0, 2],
                            border: [false, false, false, true],
                          },
                        ],
                      ],
                    },
                    margin: [185, 0, 185, 0],
                    layout: {
                      hLineWidth: () => 0.8,
                      vLineWidth: () => 0,
                      hLineColor: () => '#000',
                      paddingLeft: () => 0,
                      paddingRight: () => 0,
                      paddingTop: () => 0,
                      paddingBottom: () => 0,
                    },
                  },
                  {
                    text:
                      approvedForSignatory.designation || approvedForSignatoryFallbackDesignation,
                    fontSize: 9,
                    alignment: 'center',
                    margin: [0, 2, 0, 6],
                  },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => b,
          vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? b : 0),
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
      },
    ],

    defaultStyle: {
      font: 'Roboto',
    },
  }

  const appId =
    app?.id ||
    app?.leave_application_id ||
    app?.application_id ||
    sourceApp?.id ||
    sourceApp?.leave_application_id ||
    sourceApp?.application_id
  if (appId) {
    const endpoint = options?.isErms
      ? `/erms/leave-applications/${appId}/log-print`
      : `/leave-applications/${appId}/log-print`
    api
      .post(endpoint, {
        remarks: options?.remarks || 'Printed leave form PDF',
        printed_by_name: app?.employee_name || sourceApp?.employee_name || null,
        printed_by_id:
          app?.employee_control_no ||
          app?.employeeControlNo ||
          sourceApp?.employee_control_no ||
          sourceApp?.employeeControlNo ||
          null,
      })
      .catch((err) => {
        console.warn('Failed to log print action:', err)
      })
  }

  await openPdfDocument(pdfMake.createPdf(docDefinition), options)
}
