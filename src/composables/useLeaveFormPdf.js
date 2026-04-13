import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import {
  enrichAppWithDepartmentHead,
  getDepartmentHeadSignature,
} from 'src/utils/department-head-signature'
import { mergeLocalLeaveApplicationDetails } from 'src/utils/leave-application-local-details'

// Register fonts for pdfmake 0.3.x
pdfMake.addVirtualFileSystem(pdfFonts)

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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

function normalizeDetailKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function collectDetailValueEntries(source, targetMap, path = []) {
  if (!source) return

  if (typeof source === 'string') {
    const parsedValue = parseObjectCandidate(source)
    if (parsedValue) collectDetailValueEntries(parsedValue, targetMap, path)
    return
  }

  if (Array.isArray(source)) {
    source.forEach((entry) => {
      if (entry && typeof entry === 'object') {
        const entryKeyRaw =
          entry.key ?? entry.name ?? entry.field ?? entry.id ?? entry.slug ?? entry.label
        const entryKey = normalizeDetailKey(entryKeyRaw)
        const entryValue = entry.value ?? entry.answer ?? entry.text ?? entry.selected ?? entry.data

        if (entryKey && entryValue != null && !targetMap.has(entryKey)) {
          const normalizedValue = typeof entryValue === 'string' ? entryValue.trim() : entryValue
          if (normalizedValue !== '') {
            targetMap.set(entryKey, normalizedValue)
            const parentPathKey = normalizeDetailKey([...path, entryKeyRaw].join('_'))
            if (parentPathKey && !targetMap.has(parentPathKey)) {
              targetMap.set(parentPathKey, normalizedValue)
            }
          }
        }
      }

      collectDetailValueEntries(entry, targetMap, path)
    })
    return
  }

  if (typeof source !== 'object') return

  Object.entries(source).forEach(([key, value]) => {
    const normalizedKey = normalizeDetailKey(key)
    const normalizedPathKey = normalizeDetailKey([...path, key].join('_'))
    const normalizedTailPathKey = normalizeDetailKey([...path.slice(-2), key].join('_'))

    if (
      normalizedKey &&
      value != null &&
      typeof value !== 'object' &&
      !Array.isArray(value) &&
      !targetMap.has(normalizedKey)
    ) {
      const normalizedValue = typeof value === 'string' ? value.trim() : value
      if (normalizedValue !== '') {
        targetMap.set(normalizedKey, normalizedValue)
        if (normalizedPathKey && !targetMap.has(normalizedPathKey)) {
          targetMap.set(normalizedPathKey, normalizedValue)
        }
        if (normalizedTailPathKey && !targetMap.has(normalizedTailPathKey)) {
          targetMap.set(normalizedTailPathKey, normalizedValue)
        }
      }
    }

    collectDetailValueEntries(value, targetMap, [...path, key])
  })
}

function getApplicationDetailValue(app, ...keys) {
  const raw = app?.raw && typeof app.raw === 'object' ? app.raw : null
  const details = parseObjectCandidate(
    app?.details ?? app?.application_details ?? app?.applicationDetails,
  )
  const rawDetails = parseObjectCandidate(
    raw?.details ?? raw?.application_details ?? raw?.applicationDetails,
  )
  const sources = [app, raw, details, rawDetails].filter(Boolean)
  const detailValueMap = new Map()

  sources.forEach((source) => collectDetailValueEntries(source, detailValueMap))

  for (const key of keys) {
    const normalizedKey = normalizeDetailKey(key)
    if (!normalizedKey) continue

    if (detailValueMap.has(normalizedKey)) {
      return detailValueMap.get(normalizedKey)
    }

    for (const [mapKey, mapValue] of detailValueMap.entries()) {
      if (mapKey.endsWith(normalizedKey) || normalizedKey.endsWith(mapKey)) {
        return mapValue
      }
    }
  }

  return ''
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
      { text: label, fontSize: fs, margin: [2, 0, 4, 0], width: labelWidth },
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

function firstNonEmptyDetailValue(app, ...groups) {
  for (const keys of groups) {
    const value = String(getApplicationDetailValue(app, ...keys) || '').trim()
    if (value) return value
  }
  return ''
}

function resolveVacationDetailValue(app, fallbackValue = '') {
  const normalizedExplicitValue = normalizeVacationDetailValue(fallbackValue)
  if (normalizedExplicitValue) return normalizedExplicitValue

  const normalizedDerivedValue = normalizeVacationDetailValue(
    firstNonEmptyDetailValue(
      app,
      [
        'vacation_detail',
        'vacationDetail',
        'vacation_type',
        'vacation_location_type',
        'destination_type',
        'location_type',
      ],
      ['abroad', 'abroad_specify', 'abroadspecify'],
      ['within_the_philippines', 'withinphilippines', 'withinthephilippines', 'local'],
    ),
  )

  if (normalizedDerivedValue) return normalizedDerivedValue

  const abroadSpecifyValue = firstNonEmptyDetailValue(app, [
    'abroad_specify',
    'abroadspecify',
    'specify_destination',
    'specifydestination',
    'abroad_destination',
    'abroad_location',
  ])
  if (abroadSpecifyValue) return 'Abroad'

  const localSpecifyValue = firstNonEmptyDetailValue(app, [
    'within_the_philippines_specify',
    'withinthephilippinesspecify',
    'specify_location',
    'specifylocation',
    'local_destination',
    'local_location',
  ])
  if (localSpecifyValue) return 'Within the Philippines'

  return ''
}

function resolveVacationSpecifyValue(app, normalizedVacationDetail, fallbackValue = '') {
  if (String(fallbackValue || '').trim()) return String(fallbackValue || '').trim()

  if (normalizedVacationDetail === 'Abroad') {
    return firstNonEmptyDetailValue(
      app,
      ['vacation_specify', 'vacationSpecify', 'abroad_specify', 'abroadspecify'],
      ['specify_destination', 'specifydestination', 'abroad_destination', 'destination'],
      ['abroad_location', 'location'],
    )
  }

  if (normalizedVacationDetail === 'Within the Philippines') {
    return firstNonEmptyDetailValue(
      app,
      [
        'vacation_specify',
        'vacationSpecify',
        'within_the_philippines_specify',
        'withinthephilippinesspecify',
      ],
      ['specify_location', 'specifylocation', 'local_location', 'location'],
      ['local_destination', 'destination'],
    )
  }

  return firstNonEmptyDetailValue(
    app,
    ['vacation_specify', 'vacationSpecify'],
    ['specify_destination', 'specifydestination', 'destination'],
    ['specify_location', 'specifylocation', 'location'],
  )
}

function resolveSickDetailValue(app, fallbackValue = '', fallbackSpecify = '') {
  const normalizedExplicitValue = normalizeSickDetailValue(fallbackValue)
  if (normalizedExplicitValue) return normalizedExplicitValue

  const normalizedDerivedValue = normalizeSickDetailValue(
    firstNonEmptyDetailValue(
      app,
      [
        'sick_detail',
        'sickDetail',
        'sick_leave_detail',
        'sick_leave_type',
        'illness_type',
        'patient_type',
      ],
      ['in_hospital', 'inhospital', 'inhospitalspecifyillness', 'hospital_illness'],
      ['out_patient', 'outpatient', 'outpatientspecifyillness', 'outpatient_illness'],
    ),
  )

  if (normalizedDerivedValue) return normalizedDerivedValue

  const hospitalSpecifyValue = firstNonEmptyDetailValue(app, [
    'in_hospital_specify_illness',
    'inhospitalspecifyillness',
    'hospital_illness',
    'hospital_sickness',
  ])
  if (hospitalSpecifyValue) return 'In Hospital'

  const outpatientSpecifyValue = firstNonEmptyDetailValue(app, [
    'out_patient_specify_illness',
    'outpatientspecifyillness',
    'outpatient_illness',
    'outpatient_sickness',
  ])
  if (outpatientSpecifyValue || String(fallbackSpecify || '').trim()) return 'Out Patient'

  return ''
}

function resolveSickSpecifyValue(app, normalizedSickDetail, fallbackValue = '') {
  if (String(fallbackValue || '').trim()) return String(fallbackValue || '').trim()

  if (normalizedSickDetail === 'In Hospital') {
    return firstNonEmptyDetailValue(
      app,
      ['sick_specify', 'sickSpecify', 'in_hospital_specify_illness', 'inhospitalspecifyillness'],
      ['hospital_illness', 'hospital_sickness'],
      [
        'specified_illness',
        'specify_illness',
        'illness',
        'illness_name',
        'sickness',
        'other_illness',
        'diagnosis',
      ],
    )
  }

  if (normalizedSickDetail === 'Out Patient') {
    return firstNonEmptyDetailValue(
      app,
      ['sick_specify', 'sickSpecify', 'out_patient_specify_illness', 'outpatientspecifyillness'],
      ['outpatient_illness', 'outpatient_sickness'],
      [
        'specified_illness',
        'specify_illness',
        'illness',
        'illness_name',
        'sickness',
        'other_illness',
        'diagnosis',
      ],
    )
  }

  return firstNonEmptyDetailValue(
    app,
    ['sick_specify', 'sickSpecify'],
    ['specified_illness', 'specify_illness', 'illness', 'illness_name'],
    ['sickness', 'other_illness', 'diagnosis'],
  )
}

function normalizeOfficeDepartment(value) {
  return String(value || '')
    .replace(/^office\s+of\s+the\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getOfficeDepartmentFontSize(value) {
  const officeText = normalizeOfficeDepartment(value)
  if (officeText.length > 55) return 7.2
  if (officeText.length > 40) return 7.8
  return 9
}

function formatCredit(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (Number.isNaN(n)) return ''
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2)
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
    return normalizeCoverage(
      value.coverage ??
        value.selected_date_coverage ??
        value.selectedDateCoverage ??
        value.value ??
        '',
    )
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

function resolveApprovedForSectionValues(app) {
  const raw = app?.raw && typeof app.raw === 'object' ? app.raw : null

  const resolvePayMode = (value) => {
    const normalizedValue = String(value || '')
      .trim()
      .toUpperCase()
    if (normalizedValue === 'WOP' || normalizedValue === 'WITHOUT PAY') return 'WOP'
    if (normalizedValue === 'WP' || normalizedValue === 'WITH PAY') return 'WP'
    return ''
  }

  const totalDays = pickFirstFiniteNumber(
    app?.days,
    app?.total_days,
    app?.totalDays,
    raw?.days,
    raw?.total_days,
    raw?.totalDays,
  )

  let withPayDays = pickFirstFiniteNumber(
    app?.with_pay_days,
    app?.withPayDays,
    raw?.with_pay_days,
    raw?.withPayDays,
  )

  let withoutPayDays = pickFirstFiniteNumber(
    app?.without_pay_days,
    app?.withoutPayDays,
    raw?.without_pay_days,
    raw?.withoutPayDays,
  )
  let derivedFromPayStatus = false

  const payStatusMap = toStatusMap(
    app?.selected_date_pay_status ??
      app?.selectedDatePayStatus ??
      raw?.selected_date_pay_status ??
      raw?.selectedDatePayStatus,
  )

  const coverageMap = toCoverageMap(
    app?.selected_date_coverage ??
      app?.selectedDateCoverage ??
      raw?.selected_date_coverage ??
      raw?.selectedDateCoverage,
  )

  if (payStatusMap) {
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

  const deductibleDays = pickFirstFiniteNumber(
    app?.deductible_days,
    app?.deductibleDays,
    raw?.deductible_days,
    raw?.deductibleDays,
  )
  if (!derivedFromPayStatus && deductibleDays !== null) {
    withPayDays = deductibleDays
    if (totalDays !== null) {
      withoutPayDays = Math.max(totalDays - deductibleDays, 0)
    }
  }

  const normalizedPayMode = resolvePayMode(
    app?.pay_mode ?? app?.payMode ?? raw?.pay_mode ?? raw?.payMode,
  )
  const withPayFlag = app?.with_pay ?? app?.withPay ?? raw?.with_pay ?? raw?.withPay
  const withoutPayFlag = app?.without_pay ?? app?.withoutPay ?? raw?.without_pay ?? raw?.withoutPay

  if (totalDays !== null && withPayDays !== null && withoutPayDays !== null) {
    const accountedDays = withPayDays + withoutPayDays
    const missingDays = Math.round((totalDays - accountedDays) * 100) / 100
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

  if (withPayDays !== null) withPayDays = Math.max(0, Math.round(withPayDays * 100) / 100)
  if (withoutPayDays !== null) withoutPayDays = Math.max(0, Math.round(withoutPayDays * 100) / 100)

  const others =
    String(
      app?.approved_for_others ??
        app?.approved_for_other ??
        app?.others_specify ??
        raw?.approved_for_others ??
        raw?.approved_for_other ??
        raw?.others_specify ??
        '',
    ).trim() || (app?.is_monetization || raw?.is_monetization ? 'Monetization' : '')

  return {
    withPayDays,
    withoutPayDays,
    others,
  }
}

function formatApprovedForDays(value) {
  const formatted = formatCredit(value)
  return formatted === '' ? '_______' : formatted
}

function formatApprovedForOthers(value) {
  return String(value || '').trim() || '_______'
}

function toCreditNumber(val) {
  if (val == null || val === '') return null
  const n = Number(val)
  if (!Number.isFinite(n)) return null
  return n
}

function computeCertificationBalance(totalEarned, lessThisApplication, fallbackBalance) {
  const totalEarnedNumber = toCreditNumber(totalEarned)
  const normalizedLessThisApplication =
    lessThisApplication == null || lessThisApplication === ''
      ? totalEarnedNumber !== null
        ? 0
        : null
      : toCreditNumber(lessThisApplication)

  if (totalEarnedNumber !== null) {
    const computedBalance = totalEarnedNumber - (normalizedLessThisApplication ?? 0)
    return {
      totalEarned: formatCredit(totalEarnedNumber),
      lessThisApplication: formatCredit(normalizedLessThisApplication),
      balance: formatCredit(Math.abs(computedBalance) < 1e-9 ? 0 : computedBalance),
    }
  }

  return {
    totalEarned: formatCredit(totalEarned),
    lessThisApplication: formatCredit(normalizedLessThisApplication ?? lessThisApplication),
    balance: formatCredit(fallbackBalance),
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
  const rawLeaveType = String(
    app?.leaveType ??
      app?.leave_type_name ??
      app?.leave_type ??
      app?.leaveTypeName ??
      app?.raw?.leave_type_name ??
      app?.raw?.leaveType ??
      app?.raw?.leave_type ??
      '',
  ).trim()

  if (!rawLeaveType) return ''

  const normalizedLeaveType = rawLeaveType.replace(/\s*\(monetization\)\s*$/i, '').trim()
  return prettifyLeaveBalanceLabel(normalizedLeaveType)
}

function getLeaveBalanceTypeKey(value) {
  return prettifyLeaveBalanceLabel(value).trim().toLowerCase()
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
    normalizedLeftKey.includes(normalizedRightKey) ||
    normalizedRightKey.includes(normalizedLeftKey)
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
  const directCandidates = [
    app?.leaveBalance,
    app?.leave_balance,
    app?.balance,
    app?.remaining_balance,
    app?.available_balance,
    app?.remainingBalance,
    app?.availableBalance,
    app?.current_balance,
    app?.currentBalance,
    app?.credits,
    app?.raw?.leaveBalance,
    app?.raw?.leave_balance,
    app?.raw?.balance,
    app?.raw?.remaining_balance,
    app?.raw?.available_balance,
    app?.raw?.remainingBalance,
    app?.raw?.availableBalance,
    app?.raw?.current_balance,
    app?.raw?.currentBalance,
    app?.raw?.credits,
  ]

  for (const candidate of directCandidates) {
    const parsedNumber = toCreditNumber(candidate)
    if (parsedNumber !== null) return parsedNumber
  }

  return null
}

function buildSelectedCertificationFallbackEntry(app, selectedLabel) {
  const selectedTypeLabel = selectedLabel || app?.leaveType || 'Leave Credits'
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
    'leave_type',
    'type_name',
    'type',
    'name',
    'label',
    'total_earned',
    'totalEarned',
    'earned',
    'total',
    'total_credits',
    'totalCredits',
    'less_this_application',
    'lessThisApplication',
    'applied',
    'used',
    'deducted',
    'deducted_days',
    'deductedDays',
    'days_used',
    'daysUsed',
    'application_days',
    'applicationDays',
    'balance',
    'leave_balance',
    'leaveBalance',
    'remaining_balance',
    'available_balance',
    'remainingBalance',
    'availableBalance',
    'current_balance',
    'currentBalance',
    'credits',
    'value',
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

function createCertificationEntry(label, value) {
  const normalizedLabel = prettifyLeaveBalanceLabel(label)
  if (!normalizedLabel) return null

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    let totalEarned =
      value.total_earned ??
      value.totalEarned ??
      value.earned ??
      value.total ??
      value.total_credits ??
      value.totalCredits
    let lessThisApplication =
      value.less_this_application ??
      value.lessThisApplication ??
      value.applied ??
      value.used ??
      value.deducted ??
      value.deducted_days ??
      value.deductedDays ??
      value.days_used ??
      value.daysUsed ??
      value.application_days ??
      value.applicationDays
    const fallbackBalance =
      value.balance ??
      value.leave_balance ??
      value.leaveBalance ??
      value.remaining_balance ??
      value.available_balance ??
      value.remainingBalance ??
      value.availableBalance ??
      value.current_balance ??
      value.currentBalance ??
      value.credits ??
      value.total_credits ??
      value.totalCredits ??
      value.value

    const totalEarnedNumber = toCreditNumber(totalEarned)
    const lessThisApplicationNumber = toCreditNumber(lessThisApplication)
    const fallbackBalanceNumber = toCreditNumber(fallbackBalance)

    // Some non-VL/SL payloads only provide current balance. Infer missing totals so 7.A remains complete.
    if (totalEarnedNumber === null && fallbackBalanceNumber !== null) {
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
    balance: formatCredit(value),
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

function collectCertificationEntries(map, source, fallbackLabel = '') {
  if (!source) return

  if (typeof source === 'string') {
    const parsedSource = parseCertificationSourceCandidate(source)
    if (parsedSource !== null) {
      collectCertificationEntries(map, parsedSource, fallbackLabel)
    }
    return
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      if (item == null || typeof item !== 'object') continue
      const entry = createCertificationEntry(
        item.leave_type_name ||
          item.leave_type ||
          item.type_name ||
          item.type ||
          item.name ||
          item.label ||
          fallbackLabel,
        item,
      )
      if (!entry) continue
      const key = getLeaveBalanceTypeKey(entry.label)
      map.set(key, mergeCertificationEntry(map.get(key), entry))
    }
    return
  }

  if (typeof source !== 'object') {
    const entry = createCertificationEntry(fallbackLabel, source)
    if (!entry) return
    const key = getLeaveBalanceTypeKey(entry.label)
    map.set(key, mergeCertificationEntry(map.get(key), entry))
    return
  }

  if (isCertificationEntryLikeObject(source)) {
    const entry = createCertificationEntry(
      source.leave_type_name ||
        source.leave_type ||
        source.type_name ||
        source.type ||
        source.name ||
        source.label ||
        fallbackLabel,
      source,
    )
    if (!entry) return
    const key = getLeaveBalanceTypeKey(entry.label)
    map.set(key, mergeCertificationEntry(map.get(key), entry))
    return
  }

  for (const [key, value] of Object.entries(source)) {
    if (value == null || key === 'as_of_date') continue

    const entryLabel =
      value && typeof value === 'object' && !Array.isArray(value)
        ? value.leave_type_name ||
          value.leave_type ||
          value.type_name ||
          value.type ||
          value.name ||
          value.label ||
          key
        : key
    const entry = createCertificationEntry(entryLabel, value)
    if (!entry) continue
    const typeKey = getLeaveBalanceTypeKey(entry.label)
    map.set(typeKey, mergeCertificationEntry(map.get(typeKey), entry))
  }
}

function buildCertificationEntryMap(app) {
  const entries = new Map()

  collectCertificationEntries(entries, app?.certificationLeaveCredits)
  collectCertificationEntries(entries, app?.certification_leave_credits)
  collectCertificationEntries(entries, app?.leaveBalances)
  collectCertificationEntries(entries, app?.leave_balances)
  collectCertificationEntries(entries, app?.leaveCredits)
  collectCertificationEntries(entries, app?.leave_credits)
  collectCertificationEntries(entries, app?.balances)
  collectCertificationEntries(entries, app?.leave_balance)
  collectCertificationEntries(entries, app?.leave_balance_summary)
  collectCertificationEntries(entries, app?.employee_leave_balances)
  collectCertificationEntries(entries, app?.leaveBalance)

  if (!entries.size) {
    const fallbackEntry = createCertificationEntry(
      app?.leaveType || 'Leave Credits',
      app?.balance ??
        app?.leave_balance ??
        app?.remaining_balance ??
        app?.available_balance ??
        app?.credits ??
        app?.leaveBalance,
    )
    if (fallbackEntry) {
      entries.set(getLeaveBalanceTypeKey(fallbackEntry.label), fallbackEntry)
    }
  }

  return entries
}

function buildCertificationColumns(app) {
  const entryMap = buildCertificationEntryMap(app)
  const selectedLabel = prettifyLeaveBalanceLabel(app?.leaveType || 'Leave Credits')
  const selectedKey = getLeaveBalanceTypeKey(selectedLabel)
  const vacationKey = getLeaveBalanceTypeKey('Vacation Leave')
  const sickKey = getLeaveBalanceTypeKey('Sick Leave')
  const showDualColumns = selectedKey === vacationKey || selectedKey === sickKey

  if (showDualColumns) {
    return [
      entryMap.get(vacationKey) || createEmptyCertificationEntry('Vacation Leave'),
      entryMap.get(sickKey) || createEmptyCertificationEntry('Sick Leave'),
    ]
  }

  const resolvedSelectedEntry =
    findCertificationEntryByTypeKey(entryMap, selectedKey) ||
    (entryMap.size === 1 ? entryMap.values().next().value : null)
  const selectedFallbackEntry = buildSelectedCertificationFallbackEntry(app, selectedLabel)
  const mergedSelectedEntry = mergeCertificationEntry(resolvedSelectedEntry, selectedFallbackEntry)

  return [
    mergedSelectedEntry || createEmptyCertificationEntry(selectedLabel || 'Leave Credits'),
  ]
}

function applyCertificationLessThisApplicationOverride(
  columns,
  selectedLeaveType,
  lessThisApplicationDays,
) {
  if (!Array.isArray(columns) || columns.length === 0) return columns

  const normalizedLessThisApplicationDays = toFiniteNumber(lessThisApplicationDays)
  if (normalizedLessThisApplicationDays === null) return columns

  const selectedLeaveTypeKey = getLeaveBalanceTypeKey(selectedLeaveType)
  if (!selectedLeaveTypeKey) return columns

  return columns.map((column) => {
    const columnTypeKey = getLeaveBalanceTypeKey(column?.label)
    if (!columnTypeKey || !areCertificationTypeKeysEquivalent(columnTypeKey, selectedLeaveTypeKey)) {
      return column
    }

    const existingTotalEarnedNumber = toCreditNumber(column?.totalEarned)
    const existingBalanceNumber = toCreditNumber(column?.balance)
    const nextColumn = {
      ...column,
      lessThisApplication: formatCredit(normalizedLessThisApplicationDays),
    }

    const resolvedTotalEarnedNumber =
      existingTotalEarnedNumber !== null
        ? existingTotalEarnedNumber
        : existingBalanceNumber !== null
          ? existingBalanceNumber + normalizedLessThisApplicationDays
          : null

    if (resolvedTotalEarnedNumber !== null && !nextColumn.totalEarned) {
      nextColumn.totalEarned = formatCredit(resolvedTotalEarnedNumber)
    }

    if (resolvedTotalEarnedNumber !== null) {
      const computedBalance = resolvedTotalEarnedNumber - normalizedLessThisApplicationDays
      nextColumn.balance = formatCredit(Math.abs(computedBalance) < 1e-9 ? 0 : computedBalance)
    }

    return nextColumn
  })
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

function buildCertificationTable(columns) {
  const isDualColumns = columns.length > 1
  const widths = isDualColumns ? ['38%', '31%', '31%'] : ['52%', '48%']
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
    ['Total Earned', 'totalEarned', false, false],
    ['Less this application', 'lessThisApplication', false, false],
    ['Balance', 'balance', true, false],
  ]

  return {
    table: {
      widths,
      body: [
        headerRow,
        ...rows.map(([label, key, bold, italics]) => [
          { text: label, fontSize: 7, bold, italics },
          ...columns.map((column) => ({
            text: column[key] || '',
            fontSize: 7,
            alignment: 'center',
          })),
        ]),
      ],
    },
    layout: {
      hLineWidth: () => 0.3,
      vLineWidth: () => 0.3,
    },
    margin: [8, 0, 8, 14],
  }
}

/**
 * Convert an image URL to a base64 data URL for pdfmake.
 */
function toBase64(url) {
  return fetch(url)
    .then((res) => res.blob())
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

/**
 * Generate and open a CS Form No. 6 (Application for Leave) PDF.
 * @param {Object} app - The leave application object from the store.
 */
export async function generateLeaveFormPdf(app, options = {}) {
  if (!app) return
  const printableApp = await enrichAppWithDepartmentHead(mergeLocalLeaveApplicationDetails(app))

  // ── Load logo image ──
  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    // Logo not found — continue without it
  }

  // ── Parse application data ──
  const fullName = printableApp.employeeName || ''
  const nameParts = fullName.trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
  const lt = resolvePrintableLeaveType(printableApp)
  const office = normalizeOfficeDepartment(printableApp.office || '')
  const officeFontSize = getOfficeDepartmentFontSize(office)
  const dateFiled = formatDate(printableApp.dateFiled)
  const startDate = formatDate(printableApp.startDate)
  const endDate = formatDate(printableApp.endDate)
  const days = printableApp.days || ''
  const commutation = printableApp.commutation || 'Not Requested'
  const status = printableApp.status || ''
  const departmentHeadSignature = getDepartmentHeadSignature(printableApp)
  const approvedForSection = resolveApprovedForSectionValues(printableApp)
  const cert =
    printableApp.certificationLeaveCredits || printableApp.certification_leave_credits || {}
  const asOfDate = cert.as_of_date || ''
  const certificationColumns = applyCertificationLessThisApplicationOverride(
    buildCertificationColumns(printableApp),
    lt,
    approvedForSection.withPayDays,
  )
  const vacationDetail = resolveVacationDetailValue(
    printableApp,
    getApplicationDetailValue(printableApp, 'vacation_detail', 'vacationDetail', 'vacation_type'),
  )
  const vacationSpecify = resolveVacationSpecifyValue(
    printableApp,
    vacationDetail,
    getApplicationDetailValue(
      printableApp,
      'vacation_specify',
      'vacationSpecify',
      'destination',
      'location',
    ),
  )
  const sickDetail = resolveSickDetailValue(
    printableApp,
    getApplicationDetailValue(
      printableApp,
      'sick_detail',
      'sickDetail',
      'sick_leave_detail',
      'sick_leave_type',
      'illness_type',
    ),
    getApplicationDetailValue(
      printableApp,
      'sick_specify',
      'sickSpecify',
      'specified_illness',
      'specify_illness',
      'illness',
      'illness_name',
    ),
  )
  const sickSpecify = resolveSickSpecifyValue(
    printableApp,
    sickDetail,
    getApplicationDetailValue(
      printableApp,
      'sick_specify',
      'sickSpecify',
      'specified_illness',
      'specify_illness',
      'illness',
      'illness_name',
    ),
  )
  const womenSpecify = String(
    getApplicationDetailValue(
      printableApp,
      'women_specify',
      'womenSpecify',
      'specified_illness',
      'specify_illness',
    ),
  ).trim()
  const studyDetail = String(
    getApplicationDetailValue(printableApp, 'study_detail', 'studyDetail', 'study_leave_detail'),
  ).trim()
  const otherPurpose = String(
    getApplicationDetailValue(printableApp, 'other_purpose', 'otherPurpose', 'purpose'),
  ).trim()
  const normalizedVacationDetail = normalizeVacationDetailValue(vacationDetail)
  const isVacation = lt === 'Vacation Leave'
  const isSpecialPrivilege = lt === 'Special Privilege Leave'
  const isSick = lt === 'Sick Leave'
  const isStudy = lt === 'Study Leave'
  const normalizedSickDetail = normalizeSickDetailValue(sickDetail)
  const resolvedSickSpecify =
    sickSpecify || (isSick ? String(printableApp.reason || '').trim() : '')
  const showWithinPhilippines =
    (isVacation || isSpecialPrivilege) && normalizedVacationDetail === 'Within the Philippines'
  const showAbroad = isVacation && normalizedVacationDetail === 'Abroad'
  const showInHospital = isSick && normalizedSickDetail === 'In Hospital'
  const showOutPatient =
    isSick &&
    (normalizedSickDetail === 'Out Patient' ||
      (!normalizedSickDetail && Boolean(resolvedSickSpecify)))
  const showMastersDegree = isStudy && studyDetail === 'Masters Degree'
  const showBarReview = isStudy && studyDetail === 'BAR Review'
  const showMonetizationPurpose = lt === 'Monetization Leave' || otherPurpose === 'Monetization'
  const showTerminalPurpose = otherPurpose === 'Terminal Leave'

  // ── Checkbox helper: canvas rectangle + optional checkmark ──
  function cbLine(checked, label, opts = {}) {
    const fs = opts.fontSize || 6.5
    const boxSize = 7
    const canvasItems = [{ type: 'rect', x: 0, y: 1, w: boxSize, h: boxSize, lineWidth: 0.5 }]
    if (checked) {
      canvasItems.push(
        { type: 'line', x1: 1.2, y1: 4.5, x2: 2.8, y2: 7, lineWidth: 1 },
        { type: 'line', x1: 2.8, y1: 7, x2: 5.8, y2: 2, lineWidth: 1 },
      )
    }
    const labelNode =
      typeof label === 'string' || Array.isArray(label)
        ? { text: label, fontSize: fs, margin: [2, 0, 0, 0], width: '*' }
        : { ...label, width: label?.width ?? '*' }

    return {
      columns: [{ canvas: canvasItems, width: 10 }, labelNode],
      margin: opts.margin || [0, 1.2, 0, 1.2],
    }
  }

  // ── Section header (dark background bar) ──
  function sectionHeader(label) {
    return [
      {
        colSpan: 2,
        text: label,
        bold: true,
        alignment: 'center',
        fillColor: '#1a1a1a',
        color: '#ffffff',
        fontSize: 9,
        margin: [0, 2, 0, 2],
      },
      {},
    ]
  }

  // ── Leave type definitions with legal references ──
  const leaveTypes = [
    {
      key: 'Vacation Leave',
      label: 'Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    },
    {
      key: 'Mandatory/Forced Leave',
      label: 'Mandatory/Forced Leave(Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    },
    {
      key: 'Sick Leave',
      label: 'Sick Leave (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    },
    { key: 'Wellness Leave', label: 'Wellness Leave Policy (CSC Resolution No. 2501292)' },
    {
      key: 'CTO Leave',
      label: 'Compensatory Time Off (CTO) (CSC-DBM Joint Circular No. 2, s. 2004)',
    },
    {
      key: 'Maternity Leave',
      label: 'Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)',
    },
    {
      key: 'Paternity Leave',
      label: 'Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)',
    },
    {
      key: 'Special Privilege Leave',
      label:
        'Special Privilege Leave(MC06) (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    },
    { key: 'Solo Parent Leave', label: 'Solo Parent Leave (RA No. 8972 / CSC MC No. 8, s. 2004)' },
    {
      key: 'Study Leave',
      label: 'Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    },
    { key: '10-Day VAWC Leave', label: '10-Day VAWC Leave (RA No. 9262 / CSC MC No. 15, s. 2005)' },
    {
      key: 'Rehabilitation Privilege',
      label:
        'Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)',
    },
    {
      key: 'Special Leave Benefits for Women',
      label: 'Special Leave Benefits for Women (RA No. 9710 / CSC MC No. 25, s. 2010)',
    },
    {
      key: 'Special Emergency (Calamity) Leave',
      label: 'Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)',
    },
    { key: 'Adoption Leave', label: 'Adoption Leave (R.A. No. 8552)' },
  ]
  const isKnownLeave = leaveTypes.some((t) => t.key === lt)

  // ── Section 6.A: Type of Leave checkboxes ──
  const section6A = {
    stack: [
      {
        text: '6.A  TYPE OF LEAVE TO BE AVAILED OF',
        bold: true,
        fontSize: 7.5,
        margin: [0, 3, 0, 4],
      },
      ...leaveTypes.map((t) => cbLine(lt === t.key, t.label)),
      {
        text: [
          { text: '\nOthers:  ', fontSize: 7 },
          { text: !isKnownLeave && lt ? lt : '________________________________', fontSize: 7 },
        ],
        margin: [0, 3, 0, 0],
      },
    ],
    margin: [6, 0, 4, 6],
  }

  // ── Section 6.B: Details of Leave ──
  const section6B = {
    stack: [
      { text: '6.B  DETAILS OF LEAVE', bold: true, fontSize: 7.5, margin: [0, 3, 0, 4] },

      {
        text: 'In case of Vacation/Special Privilege Leave(MC06):',
        fontSize: 7,
        italics: true,
        margin: [0, 2, 0, 2],
      },
      cbLine(
        showWithinPhilippines,
        buildSpecifiedDetailLabel(
          'Within the Philippines',
          showWithinPhilippines ? vacationSpecify : '',
          {
            emptyLine: '___________________',
          },
        ),
      ),
      cbLine(
        showAbroad,
        buildSpecifiedDetailLabel('Abroad (Specify)', showAbroad ? vacationSpecify : '', {
          emptyLine: '______________________',
        }),
      ),

      { text: 'In case of Sick Leave:', fontSize: 7, italics: true, margin: [0, 6, 0, 2] },
      cbLine(
        showInHospital,
        buildSpecifiedDetailLabel(
          'In Hospital (Specify Illness)',
          showInHospital ? resolvedSickSpecify : '',
          {
            emptyLine: '_______________',
          },
        ),
      ),
      cbLine(
        showOutPatient,
        buildSpecifiedDetailLabel(
          'Out Patient (Specify Illness)',
          showOutPatient ? resolvedSickSpecify : '',
          {
            emptyLine: '_______________',
          },
        ),
      ),

      {
        text: 'In case of Special Leave Benefits for Women:',
        fontSize: 7,
        italics: true,
        margin: [0, 6, 0, 2],
      },
      {
        ...buildSpecifiedDetailLabel('(Specify Illness)', womenSpecify, {
          fontSize: 7,
          emptyLine: '___________________________',
        }),
        margin: [12, 0, 0, 0],
      },

      { text: 'In case of Study Leave:', fontSize: 7, italics: true, margin: [0, 6, 0, 2] },
      cbLine(showMastersDegree, "Completion of Master's Degree"),
      cbLine(showBarReview, 'BAR/Board Examination Review'),

      { text: 'Other purpose:', fontSize: 7, italics: true, margin: [0, 6, 0, 2] },
      cbLine(showMonetizationPurpose, 'Monetization Leave'),
      cbLine(showTerminalPurpose, 'Terminal Leave'),
    ],
    margin: [4, 0, 6, 6],
  }

  // ── Section 6.C: Working days + inclusive dates ──
  const section6C = {
    stack: [
      {
        text: '6.C  NUMBER OF WORKING DAYS APPLIED FOR',
        bold: true,
        fontSize: 7.5,
        margin: [0, 3, 0, 3],
      },
      { text: `         ${days} day(s)`, fontSize: 8, margin: [0, 0, 0, 8] },
      { text: '       INCLUSIVE DATES', bold: true, fontSize: 7, margin: [0, 0, 0, 3] },
      { text: `         ${startDate}  to  ${endDate}`, fontSize: 8 },
    ],
    margin: [6, 0, 4, 6],
  }

  // ── Section 6.D: Commutation + signature ──
  const section6D = {
    stack: [
      { text: '6.D  COMMUTATION', bold: true, fontSize: 7.5, margin: [0, 3, 0, 3] },
      cbLine(commutation !== 'Requested', 'Not Requested'),
      cbLine(commutation === 'Requested', 'Requested'),
      { text: '', margin: [0, 18, 0, 0] },
      { text: '______________________________________', alignment: 'center', fontSize: 8 },
      {
        text: '(Signature of Applicant)',
        alignment: 'center',
        fontSize: 7,
        italics: true,
        margin: [0, 2, 0, 0],
      },
    ],
    margin: [4, 0, 6, 6],
  }

  // ── Section 7.A: Certification of Leave Credits ──
  const section7A = {
    stack: [
      {
        text: '7.A  CERTIFICATION OF LEAVE CREDITS',
        bold: true,
        fontSize: 7.5,
        margin: [0, 3, 0, 5],
      },
      {
        text: `       As of  ${asOfDate || '________________________'}`,
        fontSize: 7,
        margin: [0, 0, 0, 6],
      },
      buildCertificationTable(certificationColumns),
      { text: '______________________________________', alignment: 'center', fontSize: 8 },
      { text: 'CHRMO Leave In-charge', alignment: 'center', fontSize: 7, margin: [0, 2, 0, 0] },
    ],
    margin: [6, 0, 4, 6],
  }

  // ── Section 7.B: Recommendation ──
  const section7B = {
    stack: [
      { text: '7.B  RECOMMENDATION', bold: true, fontSize: 7.5, margin: [0, 3, 0, 5] },
      cbLine(status === 'Approved' || status === 'Pending', 'For approval'),
      { text: '', margin: [0, 4, 0, 0] },
      cbLine(status === 'Disapproved', 'For disapproval due to'),
      { text: '     ______________________________________', fontSize: 7 },
      { text: '     ______________________________________', fontSize: 7, margin: [0, 3, 0, 0] },
      { text: '', margin: [0, 28, 0, 0] },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: departmentHeadSignature.fullName || ' ',
                alignment: 'center',
                fontSize: 8,
                bold: true,
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
        text: departmentHeadSignature.designation,
        alignment: 'center',
        fontSize: 7,
        margin: [0, 2, 0, 0],
      },
    ],
    margin: [4, 0, 6, 6],
  }

  // ── Section 7.C and 7.D: combined action box ──
  const section7Combined = {
    stack: [
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: '7.C  APPROVED FOR:', bold: true, fontSize: 7.5, margin: [0, 3, 0, 5] },
              {
                text: `         ${formatApprovedForDays(approvedForSection.withPayDays)} days with pay`,
                fontSize: 7,
                margin: [0, 2, 0, 2],
              },
              {
                text: `         ${formatApprovedForDays(approvedForSection.withoutPayDays)} days without pay`,
                fontSize: 7,
                margin: [0, 2, 0, 2],
              },
              {
                text: `         ${formatApprovedForOthers(approvedForSection.others)} others (Specify)`,
                fontSize: 7,
                margin: [0, 2, 0, 2],
              },
            ],
            margin: [0, 0, 10, 0],
          },
          {
            width: '50%',
            stack: [
              { text: '7.D  DISAPPROVED DUE TO:', bold: true, fontSize: 7.5, margin: [0, 3, 0, 5] },
              {
                text: '     ______________________________________',
                fontSize: 7,
                margin: [0, 2, 0, 2],
              },
              {
                text: '     ______________________________________',
                fontSize: 7,
                margin: [0, 2, 0, 2],
              },
              {
                text: '     ______________________________________',
                fontSize: 7,
                margin: [0, 2, 0, 2],
              },
            ],
            margin: [10, 0, 0, 0],
          },
        ],
      },
      { text: '', margin: [0, 6, 0, 0] },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: 'HON. REY T. UY',
                alignment: 'center',
                fontSize: 10,
                bold: true,
                margin: [0, 0, 0, 2],
                border: [false, false, false, true],
              },
            ],
          ],
        },
        margin: [185, 0, 185, 0],
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
      { text: 'City Mayor', alignment: 'center', fontSize: 9, margin: [0, 2, 0, 0] },
    ],
    margin: [6, 0, 6, 10],
  }

  // ══════════════════════════════════════════════════════
  // Document Definition
  // ══════════════════════════════════════════════════════
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [28, 18, 28, 18],
    defaultStyle: { fontSize: 8 },
    content: [
      // ═══════ HEADER ═══════
      // Logo positioned absolutely so it doesn't shift the centered text
      ...(logoBase64
        ? [{ image: logoBase64, width: 45, absolutePosition: { x: 135, y: 18 } }]
        : []),
      {
        columns: [
          {
            width: '24%',
            stack: [
              { text: 'Civil Service Form No. 6', fontSize: 7, italics: true, color: '#cc0000' },
              { text: 'Revised 2020', fontSize: 7, italics: true, color: '#cc0000' },
            ],
          },
          {
            width: '52%',
            stack: [
              { text: 'Republic of the Philippines', fontSize: 9, alignment: 'center' },
              { text: 'Province of Davao del Norte', fontSize: 8, alignment: 'center' },
              { text: 'CITY GOVERNMENT OF TAGUM', fontSize: 11, bold: true, alignment: 'center' },
              {
                text: 'JV Ayala Avenue, Apokon, Tagum City',
                fontSize: 7,
                alignment: 'center',
                italics: true,
              },
            ],
          },
          {
            width: '24%',
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    text: 'Stamp of Date of Receipt',
                    fontSize: 7,
                    alignment: 'center',
                    margin: [3, 10, 3, 10],
                  },
                ],
              ],
            },
          },
        ],
        margin: [0, 0, 0, 5],
      },

      // ═══════ TITLE ═══════
      {
        text: 'APPLICATION FOR LEAVE',
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 3, 0, 8],
      },

      // ═══════ MAIN FORM TABLE ═══════
      {
        table: {
          widths: ['*', '*'],
          body: [
            // ── Employee Info Row 1: Office + Name ──
            [
              {
                colSpan: 2,
                table: {
                  widths: ['28%', '36%', '36%'],
                  body: [
                    [
                      {
                        stack: [
                          { text: '1.  OFFICE/DEPARTMENT', bold: true, fontSize: 7 },
                          {
                            text: office,
                            fontSize: officeFontSize,
                            lineHeight: 1.05,
                            margin: [0, 3, 0, 0],
                          },
                        ],
                        margin: [2, 3, 2, 3],
                      },
                      {
                        stack: [
                          {
                            text: [
                              { text: '2.  NAME :    ', bold: true, fontSize: 7 },
                              { text: '(Last)', fontSize: 6, color: '#555' },
                            ],
                          },
                          { text: lastName, fontSize: 9, margin: [0, 3, 0, 0] },
                        ],
                        margin: [2, 3, 2, 3],
                      },
                      {
                        stack: [
                          { text: '(First)', fontSize: 6, color: '#555' },
                          { text: firstName, fontSize: 9, margin: [0, 3, 0, 0] },
                        ],
                        margin: [2, 3, 2, 3],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: (i) => (i === 2 ? 0.3 : 0),
                  vLineColor: () => '#000',
                },
              },
              {},
            ],

            // ── Employee Info Row 2: Date, Position, Salary ──
            [
              {
                colSpan: 2,
                table: {
                  widths: ['33%', '34%', '33%'],
                  body: [
                    [
                      {
                        text: [
                          { text: '3.  DATE OF FILING       ', bold: true, fontSize: 7 },
                          { text: dateFiled, fontSize: 8 },
                        ],
                        margin: [2, 5, 2, 5],
                      },
                      {
                        text: [
                          { text: '4.  POSITION       ', bold: true, fontSize: 7 },
                          { text: '________________________', fontSize: 8 },
                        ],
                        margin: [2, 5, 2, 5],
                      },
                      {
                        text: [
                          { text: '5. SALARY       ', bold: true, fontSize: 7 },
                          { text: '________________________', fontSize: 8 },
                        ],
                        margin: [2, 5, 2, 5],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: () => 0,
                  vLineColor: () => '#000',
                },
              },
              {},
            ],

            // ── Section 6 Header ──
            sectionHeader('6.  DETAILS OF APPLICATION'),

            // ── 6.A (left) | 6.B (right) ──
            [section6A, section6B],

            // ── 6.C (left) | 6.D (right) ──
            [section6C, section6D],

            // ── Section 7 Header ──
            sectionHeader('7.  DETAILS OF ACTION ON APPLICATION'),

            // ── 7.A (left) | 7.B (right) ──
            [section7A, section7B],

            // ── 7.C and 7.D combined, with mayor signature inside the same box ──
            [
              {
                colSpan: 2,
                ...section7Combined,
              },
              {},
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#000',
          vLineColor: () => '#000',
        },
      },
    ],
  }

  await openPdfDocument(pdfMake.createPdf(docDefinition), options)
}
