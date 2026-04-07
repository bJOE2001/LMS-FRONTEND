/**
 * Civil Service Form No. 6 (Revised 2020)
 * APPLICATION FOR LEAVE — pdfmake document definition
 *
 * Replicates the official Philippine government leave application form.
 */
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { enrichAppWithDepartmentHead, getDepartmentHeadSignature } from './department-head-signature'
import { mergeLocalLeaveApplicationDetails } from './leave-application-local-details'

// pdfmake v0.3.x font initialization
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

// ─── helpers ───────────────────────────────────────────────────────────────
const BOX_SIZE = 7
const BOX_LW = 0.5

/** Draw a checkbox (empty or checked) + label as a row for the PDF. */
function checkboxRow(checked, label, opts = {}) {
    const left = opts.marginLeft ?? 4
    const vertical = opts.marginVertical ?? 1
    const bottom = opts.marginBottom ?? vertical
    const fs = opts.fontSize ?? 7
    const canvasItems = [
        { type: 'rect', x: 0, y: 0.5, w: BOX_SIZE, h: BOX_SIZE, lineWidth: BOX_LW },
    ]
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
        columns: [
            { canvas: canvasItems, width: 12 },
            labelNode,
        ],
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
                    entry.key ??
                    entry.name ??
                    entry.field ??
                    entry.id ??
                    entry.slug ??
                    entry.label
                const entryKey = normalizeDetailKey(entryKeyRaw)
                const entryValue =
                    entry.value ??
                    entry.answer ??
                    entry.text ??
                    entry.selected ??
                    entry.data

                if (entryKey && entryValue != null && !targetMap.has(entryKey)) {
                    const normalizedValue =
                        typeof entryValue === 'string' ? entryValue.trim() : entryValue
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

        if (normalizedKey && value != null && typeof value !== 'object' && !Array.isArray(value) && !targetMap.has(normalizedKey)) {
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
    const details = parseObjectCandidate(app?.details ?? app?.application_details ?? app?.applicationDetails)
    const rawDetails = parseObjectCandidate(raw?.details ?? raw?.application_details ?? raw?.applicationDetails)
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
    const textTopOffset = opts.textTopOffset ?? (fs + 2)
    const textBottomOffset = opts.textBottomOffset ?? Math.max(fs - 2, 0)

    return {
        columns: [
            { text: label, fontSize: fs, margin: [4, 0, 4, 0], width: labelWidth },
            {
                width: fieldWidth,
                stack: [
                    { text: underline, fontSize: fs, lineHeight: 1, margin: [0, 0, 0, 0] },
                    ...(textValue
                        ? [{
                            text: textValue,
                            fontSize: fs,
                            lineHeight: 1,
                            noWrap: true,
                            margin: [0, -textTopOffset, 0, -textBottomOffset],
                        }]
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
    if (normalizedValue.includes('out patient') || normalizedValue.includes('outpatient')) return 'Out Patient'
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

function fmtDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    })
}

/** Long date for Date of Filing: e.g. "February 17, 2026" */
function fmtDateLong(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    })
}

/** Parse name into last, first, middle. Prefer app.surname/firstname/middlename; else parse employeeName. */
function parseName(app) {
    const s = (app.surname ?? '').trim()
    const f = (app.firstname ?? '').trim()
    const m = (app.middlename ?? '').trim()
    if (s || f || m) {
        const full = (app.employeeName || '').trim() || [f, m, s].filter(Boolean).join(' ')
        return { last: s, first: f, middle: m, full }
    }
    const raw = (app.employeeName || '').trim()
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

function fmtSalary(val) {
    if (val == null || val === '') return ''
    const n = Number(val)
    if (Number.isNaN(n)) return ''
    const formatted = n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `₱ ${formatted}`
}

/** Format leave credit number for 7.A table (empty if null/undefined). */
function fmtCredit(val) {
    if (val == null || val === '') return ''
    const n = Number(val)
    if (Number.isNaN(n)) return ''
    return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2)
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
            ? totalEarnedNumber !== null ? 0 : null
            : toCreditNumber(lessThisApplication)

    if (totalEarnedNumber !== null) {
        const computedBalance = totalEarnedNumber - (normalizedLessThisApplication ?? 0)
        return {
            totalEarned: fmtCredit(totalEarnedNumber),
            lessThisApplication: fmtCredit(normalizedLessThisApplication),
            balance: fmtCredit(Math.abs(computedBalance) < 1e-9 ? 0 : computedBalance),
        }
    }

    return {
        totalEarned: fmtCredit(totalEarned),
        lessThisApplication: fmtCredit(normalizedLessThisApplication ?? lessThisApplication),
        balance: fmtCredit(fallbackBalance),
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
    if (lower === 'wl' || lower === 'wlp' || lower === 'wellness leave policy') return 'Wellness Leave'
    if (lower === 'mandatory' || lower === 'forced' || lower === 'mandatory forced leave')
        return 'Mandatory / Forced Leave'
    if (lower === 'mandatory / forced leave') return 'Mandatory / Forced Leave'
    if (lower === 'mco6' || lower === 'mco6 leave' || lower === 'mc06' || lower === 'mo6 leave') return 'Special Privilege Leave'
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
        const totalEarned =
            value.total_earned ?? value.totalEarned ?? value.earned
        const lessThisApplication =
            value.less_this_application ?? value.lessThisApplication ?? value.applied ?? value.used
        const fallbackBalance =
            value.balance ??
            value.remaining_balance ??
            value.available_balance ??
            value.remainingBalance ??
            value.availableBalance ??
            value.value
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
        balance: fmtCredit(value),
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

    for (const [key, value] of Object.entries(source)) {
        if (value == null || key === 'as_of_date') continue
        const entry = createCertificationEntry(key, value)
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

    return [entryMap.get(selectedKey) || createEmptyCertificationEntry(selectedLabel || 'Leave Credits')]
}

function applyCertificationLessThisApplicationOverride(columns, selectedLeaveType, lessThisApplicationDays) {
    if (!Array.isArray(columns) || columns.length === 0) return columns

    const normalizedLessThisApplicationDays = toFiniteNumber(lessThisApplicationDays)
    if (normalizedLessThisApplicationDays === null) return columns

    const selectedLeaveTypeKey = getLeaveBalanceTypeKey(selectedLeaveType)
    if (!selectedLeaveTypeKey) return columns

    return columns.map((column) => {
        const columnTypeKey = getLeaveBalanceTypeKey(column?.label)
        if (!columnTypeKey || columnTypeKey !== selectedLeaveTypeKey) {
            return column
        }

        const totalEarnedNumber = toCreditNumber(column?.totalEarned)
        const nextColumn = {
            ...column,
            lessThisApplication: fmtCredit(normalizedLessThisApplicationDays),
        }

        if (totalEarnedNumber !== null) {
            const computedBalance = totalEarnedNumber - normalizedLessThisApplicationDays
            nextColumn.balance = fmtCredit(Math.abs(computedBalance) < 1e-9 ? 0 : computedBalance)
        }

        return nextColumn
    })
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
                        text: column[key] || '',
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
            value.pay_status ??
            value.payStatus ??
            value.status ??
            value.code ??
            value.value ??
            '',
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

    const normalizedValue = String(value || '').trim().toLowerCase()
    if (normalizedValue === 'half' || normalizedValue === 'halfday' || normalizedValue === 'half-day') {
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
        const normalizedValue = String(value || '').trim().toUpperCase()
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
        app?.pay_mode ??
        app?.payMode ??
        raw?.pay_mode ??
        raw?.payMode,
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
        ).trim() ||
        ((app?.is_monetization || raw?.is_monetization) ? 'Monetization' : '')

    return {
        withPayDays,
        withoutPayDays,
        others,
    }
}

function formatApprovedForDays(value) {
    const formatted = fmtCredit(value)
    return formatted === '' ? '_______' : formatted
}

function formatApprovedForOthers(value) {
    return String(value || '').trim() || '_______'
}

function openPdfDocument(pdfDocument, options = {}) {
    const targetWindow = options?.targetWindow && !options.targetWindow.closed
        ? options.targetWindow
        : null
    const fileName = String(options?.fileName || 'leave-application.pdf').trim() || 'leave-application.pdf'

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
    const office = normalizeOfficeDepartment(app.office || '')
    const officeFontSize = getOfficeDepartmentFontSize(office)
    const resolvedLeaveType = resolvePrintableLeaveType(app)
    const lt = resolvedLeaveType.toLowerCase()
    const rawStatus = String(app.rawStatus || '').toUpperCase()
    const statusLabel = String(app.status || '').toUpperCase()

    // Determine which leave type checkbox to tick
    const isMonetization = app?.is_monetization === true || lt.includes('monetization')
    const isVacation = lt.includes('vacation') && !isMonetization
    const isMandatory = lt.includes('mandatory') || lt.includes('forced')
    const isSick = lt.includes('sick')
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
    const isOtherBase = !(isVacation || isMandatory || isSick || isWellness || isCTO || isMaternity || isPaternity || isSpecPriv || isSoloParent || isStudy || isVAWC || isRehab || isSLBW || isCalamity || isAdoption)
    const isOther = isOtherBase || isMonetization
    const otherLeaveLabel = isMonetization
        ? 'Monetization Leave'
        : (isOtherBase ? (app.leaveType || '') : '')

    const isCommutationRequested = String(app.commutation || '').toLowerCase().trim() === 'requested'
    const isCommutationRequestedForPrint = isMonetization || isCommutationRequested
    const isForApproval = rawStatus === 'PENDING_HR' || rawStatus === 'APPROVED' || statusLabel === 'APPROVED' || statusLabel === 'PENDING HR'
    const isForDisapproval = rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED' || statusLabel === 'REJECTED' || statusLabel === 'DISAPPROVED'
    const disapprovalReason = isForDisapproval
        ? (app.remarks || app.reason || '________________')
        : '________________'

    const approvedForSection = resolveApprovedForSectionValues(app)
    const cert = app.certificationLeaveCredits || {}
    const asOfDate = cert.as_of_date || ''
    const certificationColumns = applyCertificationLessThisApplicationOverride(
        buildCertificationColumns(app),
        resolvedLeaveType,
        approvedForSection.withPayDays,
    )

    const inclusiveDates = `${fmtDate(app.startDate)} - ${fmtDate(app.endDate)}`
    const b = 0.5 // border width
    const name = parseName(app)
    const departmentHeadSignature = getDepartmentHeadSignature(app)
    const vacationDetail = String(
        getApplicationDetailValue(app, 'vacation_detail', 'vacationDetail', 'vacation_type'),
    ).trim()
    const vacationSpecify = String(
        getApplicationDetailValue(app, 'vacation_specify', 'vacationSpecify', 'destination', 'location'),
    ).trim()
    const sickDetail = String(
        getApplicationDetailValue(app, 'sick_detail', 'sickDetail', 'sick_leave_detail', 'sick_leave_type', 'illness_type'),
    ).trim()
    const sickSpecify = String(
        getApplicationDetailValue(app, 'sick_specify', 'sickSpecify', 'specified_illness', 'specify_illness', 'illness', 'illness_name'),
    ).trim()
    const womenSpecify = String(
        getApplicationDetailValue(app, 'women_specify', 'womenSpecify', 'specified_illness', 'specify_illness'),
    ).trim()
    const studyDetail = String(
        getApplicationDetailValue(app, 'study_detail', 'studyDetail', 'study_leave_detail'),
    ).trim()
    const otherPurpose = String(
        getApplicationDetailValue(app, 'other_purpose', 'otherPurpose', 'purpose'),
    ).trim()
    const normalizedVacationDetail = normalizeVacationDetailValue(vacationDetail)
    const normalizedSickDetail = normalizeSickDetailValue(sickDetail)
    const resolvedSickSpecify = sickSpecify || (isSick ? String(app.reason || '').trim() : '')
    const showWithinPhilippines = (isVacation || isSpecPriv) && normalizedVacationDetail === 'Within the Philippines'
    const showAbroad = isVacation && normalizedVacationDetail === 'Abroad'
    const showInHospital = isSick && normalizedSickDetail === 'In Hospital'
    const showOutPatient = isSick && (normalizedSickDetail === 'Out Patient' || (!normalizedSickDetail && Boolean(resolvedSickSpecify)))
    const showMastersDegree = isStudy && studyDetail === 'Masters Degree'
    const showBarReview = isStudy && studyDetail === 'BAR Review'
    const showMonetizationPurpose = isMonetization || otherPurpose === 'Monetization'
    const showTerminalPurpose = otherPurpose === 'Terminal Leave'

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [28, 20, 28, 20],

        content: [
            // ═══ TOP HEADER ═══
            {
                columns: [
                    {
                        width: 100,
                        stack: [
                            { text: 'Civil Service Form No. 6', fontSize: 7, italics: true, color: '#333' },
                            { text: 'Revised 2020', fontSize: 7, italics: true, color: '#333' },
                        ],
                    },
                    {
                        width: '*',
                        stack: [
                            { text: 'Republic of the Philippines', fontSize: 9, italics: true, alignment: 'center' },
                            { text: 'Province of Davao del Norte', fontSize: 9, italics: true, alignment: 'center' },
                            { text: 'CITY GOVERNMENT OF TAGUM', fontSize: 10, bold: true, alignment: 'center' },
                            { text: 'JV Ayala Avenue, Apokon, Tagum City', fontSize: 8, italics: true, alignment: 'center' },
                        ],
                    },
                    {
                        width: 100,
                        table: {
                            widths: ['*'],
                            body: [[{ text: 'Stamp of Date of Receipt', fontSize: 7, alignment: 'center', margin: [2, 8, 2, 8] }]],
                        },
                        layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
                    },
                ],
                margin: [0, 0, 0, 4],
            },

            // Title
            { text: 'APPLICATION FOR LEAVE', fontSize: 14, bold: true, alignment: 'center', margin: [0, 4, 0, 6] },

            // ═══ SECTION 1–5: Basic info (sample layout: uppercase labels, values bold/underlined) ═══
            {
                table: {
                    widths: ['35%', '65%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: '1.  OFFICE/DEPARTMENT:', bold: true, fontSize: 8 },
                                    { text: office, fontSize: officeFontSize, bold: true, lineHeight: 1.05, margin: [0, 4, 0, 0] },
                                ],
                                border: [true, true, false, true],
                                margin: [8, 8],
                            },
                            {
                                table: {
                                    widths: ['auto', '*', '*', '*'],
                                    body: [
                                        [
                                            { text: '2. NAME:', bold: true, fontSize: 8, margin: [0, 0, 12, 0] },
                                            { text: '(Lastname)', fontSize: 7, color: '#666', margin: [0, 0, 0, 0] },
                                            { text: '(Firstname)', fontSize: 7, color: '#666', margin: [0, 0, 0, 0] },
                                            { text: '(Middlename)', fontSize: 7, color: '#666', margin: [0, 0, 0, 0] },
                                        ],
                                        [
                                            { text: '', margin: [0, 4, 12, 0] },
                                            { text: name.last, fontSize: 9, bold: true, color: '#000000', margin: [0, 0, 0, 0] },
                                            { text: name.first, fontSize: 9, bold: true, color: '#000000', margin: [0, 0, 0, 0] },
                                            { text: name.middle, fontSize: 9, bold: true, color: '#000000', margin: [0, 0, 0, 0] },
                                        ],
                                    ],
                                },
                                layout: 'noBorders',
                                border: [false, true, true, true],
                                margin: [8, 8],
                            },
                        ],
                    ],
                },
                layout: {
                    hLineWidth: () => b,
                    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? b : 0,
                    hLineColor: () => '#000',
                    vLineColor: () => '#000',
                },
            },
            {
                table: {
                    widths: ['38%', '31%', '31%'],
                    body: [
                        [
                            {
                                text: [
                                    { text: '3.  DATE OF FILING: ', bold: true, fontSize: 8 },
                                    { text: fmtDateLong(app.dateFiled), fontSize: 9, bold: true, decoration: 'underline' },
                                ],
                                border: [true, false, false, true],
                                margin: [8, 8],
                            },
                            {
                                text: [
                                    { text: '4.  POSITION: ', bold: true, fontSize: 8 },
                                    {
                                        text: app?.userInfo?.position || app?.user_info?.position || app.position || '',
                                        fontSize: 9,
                                        bold: true,
                                        decoration: 'underline',
                                    },
                                ],
                                border: [false, false, false, true],
                                margin: [8, 8],
                            },
                            {
                                text: [
                                    { text: '5.  SALARY: ', bold: true, fontSize: 8 },
                                    { text: fmtSalary(app.salary), fontSize: 9, bold: true, decoration: 'underline' },
                                ],
                                border: [false, false, true, true],
                                margin: [8, 8],
                            },
                        ],
                    ],
                },
                layout: {
                    hLineWidth: () => b,
                    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? b : 0,
                    hLineColor: () => '#000',
                    vLineColor: () => '#000',
                },
                margin: [0, 4, 0, 0],
            },

            // ═══ SECTION 6: DETAILS OF APPLICATION ═══
            {
                table: {
                    widths: ['*'],
                    body: [[{
                        text: '6.  DETAILS OF APPLICATION',
                        bold: true, fontSize: 9, alignment: 'center',
                        margin: [0, 3, 0, 3],
                    }]],
                },
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
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
                                    { text: '6.A  TYPE OF LEAVE TO BE AVAILED OF', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                                    checkboxRow(isVacation, 'Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)', { marginVertical: 0 }),
                                    checkboxRow(isMandatory, 'Mandatory/Forced Leave (Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isSick, 'Sick Leave  (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isWellness, 'Wellness Leave Policy (CSC Resolution No. 2501292)'),
                                    checkboxRow(isCTO, 'Compensatory Time Off (CTO) (CSC-DBM Joint Circular No. 2, s. 2004)'),
                                    checkboxRow(isMaternity, 'Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)'),
                                    checkboxRow(isPaternity, 'Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)'),
                                    checkboxRow(isSpecPriv, 'Special Privilege Leave(MC06) (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isSoloParent, 'Solo Parent Leave (RA No. 8972 / CSC MC No. 8, s. 2004)'),
                                    checkboxRow(isStudy, 'Study Leave (Sec. 53, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isVAWC, '10-Day VAWC Leave (RA No. 9262 / CSC MC No. 15, s. 2005)'),
                                    checkboxRow(isRehab, 'Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isSLBW, 'Special Leave Benefits for Women (RA No. 9710 / CSC MC No. 25, s. 2010)'),
                                    checkboxRow(isCalamity, 'Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)'),
                                    checkboxRow(isAdoption, 'Adoption Leave (R.A. No. 8552)'),
                                    { text: ' ', fontSize: 4 },
                                    checkboxRow(isOther, `Others: ${isOther ? (otherLeaveLabel || '_______________') : '_______________'}`, { marginVertical: 1, marginBottom: 4 }),
                                ],
                                border: [true, false, true, true],
                            },

                            // ─── 6.B ───
                            {
                                stack: [
                                    { text: '6.B  DETAILS OF LEAVE', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                                    { text: '   In case of Vacation/Special Privilege Leave(MC06):', fontSize: 7, italics: true, margin: [4, 0] },
                                    checkboxRow(
                                        showWithinPhilippines,
                                        buildSpecifiedDetailLabel('Within the Philippines', showWithinPhilippines ? vacationSpecify : '', {
                                            emptyLine: '___________________',
                                        }),
                                        { marginLeft: 8 },
                                    ),
                                    checkboxRow(
                                        showAbroad,
                                        buildSpecifiedDetailLabel('Abroad (Specify)', showAbroad ? vacationSpecify : '', {
                                            emptyLine: '______________________',
                                        }),
                                        { marginLeft: 8 },
                                    ),
                                    { text: ' ', fontSize: 4 },
                                    { text: '   In case of Sick Leave:', fontSize: 7, italics: true, margin: [4, 1] },
                                    checkboxRow(
                                        showInHospital,
                                        buildSpecifiedDetailLabel('In Hospital (Specify Illness)', showInHospital ? resolvedSickSpecify : '', {
                                            emptyLine: '_______________',
                                        }),
                                        { marginLeft: 8 },
                                    ),
                                    checkboxRow(
                                        showOutPatient,
                                        buildSpecifiedDetailLabel('Out Patient (Specify Illness)', showOutPatient ? resolvedSickSpecify : '', {
                                            emptyLine: '_______________',
                                        }),
                                        { marginLeft: 8 },
                                    ),
                                    { text: ' ', fontSize: 4 },
                                    { text: '   In case of Special Leave Benefits for Women:', fontSize: 7, italics: true, margin: [4, 1] },
                                    {
                                        ...buildSpecifiedDetailLabel('(Specify Illness)', womenSpecify, {
                                            fontSize: 7,
                                            emptyLine: '___________________________',
                                        }),
                                        margin: [8, 1, 0, 0],
                                    },
                                    { text: ' ', fontSize: 4 },
                                    { text: '   In case of Study Leave:', fontSize: 7, italics: true, margin: [4, 1] },
                                    checkboxRow(showMastersDegree, "Completion of Master's Degree", { marginLeft: 8 }),
                                    checkboxRow(showBarReview, 'BAR/Board Examination Review', { marginLeft: 8 }),
                                    { text: ' ', fontSize: 4 },
                                    { text: '   Other purpose:', fontSize: 7, italics: true, margin: [4, 1] },
                                    checkboxRow(showMonetizationPurpose, 'Monetization Leave', { marginLeft: 8 }),
                                    checkboxRow(showTerminalPurpose, 'Terminal Leave', { marginLeft: 8, marginVertical: 1, marginBottom: 4 }),
                                ],
                                border: [false, false, true, true],
                            },
                        ],
                    ],
                },
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
            },

            // ═══ 6.C and 6.D ═══
            {
                table: {
                    widths: ['50%', '50%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: '6.C  NUMBER OF WORKING DAYS APPLIED FOR', bold: true, fontSize: 8, margin: [4, 4, 0, 2] },
                                    { text: `${app.days} ${app.days === 1 ? 'Day' : 'day(s)'}`, fontSize: 9, bold: true, decoration: 'underline', margin: [12, 2, 4, 4] },
                                    { text: 'INCLUSIVE DATES', bold: true, fontSize: 8, margin: [4, 4, 0, 2] },
                                    { text: inclusiveDates, fontSize: 8, bold: true, decoration: 'underline', margin: [12, 2, 4, 4] },
                                ],
                                border: [true, false, true, true],
                            },
                            {
                                stack: [
                                    { text: '6.D  COMMUTATION', bold: true, fontSize: 8, margin: [4, 4, 0, 2] },
                                    checkboxRow(!isCommutationRequestedForPrint, 'Not Requested'),
                                    checkboxRow(isCommutationRequestedForPrint, 'Requested'),
                                    { text: ' ', fontSize: 6 },
                                    { text: '________________________________________', fontSize: 8, alignment: 'center', margin: [0, 4, 0, 0] },
                                    { text: '(Signature of Applicant)', fontSize: 7, italics: true, alignment: 'center', margin: [0, 1, 0, 4] },
                                ],
                                border: [false, false, true, true],
                            },
                        ],
                    ],
                },
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
            },

            // ═══ SECTION 7: DETAILS OF ACTION ON APPLICATION ═══
            {
                table: {
                    widths: ['*'],
                    body: [[{
                        text: '7.  DETAILS OF ACTION ON APPLICATION',
                        bold: true, fontSize: 9, alignment: 'center',
                        margin: [0, 3, 0, 3],
                    }]],
                },
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
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
                                    { text: '7.A  CERTIFICATION OF LEAVE CREDITS', bold: true, fontSize: 8, margin: [4, 4, 0, 2] },
                                    { text: `        As of ${asOfDate || '_______________'}`, fontSize: 8, margin: [4, 2, 0, 6] },
                                    buildCertificationTable(certificationColumns),
                                    { text: ' ', fontSize: 8 },
                                    { text: '________________________________________', fontSize: 8, alignment: 'center' },
                                    { text: 'CHRMO Leave In-charge', fontSize: 7, alignment: 'center', margin: [0, 1, 0, 4] },
                                ],
                                border: [true, false, true, true],
                            },

                            // ─── 7.B ───
                            {
                                stack: [
                                    { text: '7.B  RECOMMENDATION', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                                    checkboxRow(isForApproval, 'For approval', { marginVertical: 2 }),
                                    { text: ' ', fontSize: 3 },
                                    checkboxRow(isForDisapproval, `For disapproval due to ${disapprovalReason}`, { marginVertical: 2 }),
                                    { text: ' ', fontSize: 14 },
                                    { text: ' ', fontSize: 14 },
                                    {
                                        table: {
                                            widths: ['*'],
                                            body: [[{
                                                text: departmentHeadSignature.fullName || ' ',
                                                fontSize: 8,
                                                bold: true,
                                                alignment: 'center',
                                                margin: [0, 0, 0, 2],
                                                border: [false, false, false, true],
                                            }]],
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
                                    { text: departmentHeadSignature.designation, fontSize: 7, alignment: 'center', margin: [0, 2, 0, 4] },
                                ],
                                border: [false, false, true, true],
                            },
                        ],
                    ],
                },
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
            },

            // 7.C and 7.D combined into one box with mayor signature
            {
                table: {
                    widths: ['*'],
                    body: [
                        [{
                            stack: [
                                {
                                    columns: [
                                        {
                                            width: '50%',
                                            stack: [
                                                { text: '7.C  APPROVED FOR:', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                                                { text: `         ${formatApprovedForDays(approvedForSection.withPayDays)} days with pay`, fontSize: 8, margin: [4, 2] },
                                                { text: `         ${formatApprovedForDays(approvedForSection.withoutPayDays)} days without pay`, fontSize: 8, margin: [4, 2] },
                                                { text: `         ${formatApprovedForOthers(approvedForSection.others)} others (Specify)`, fontSize: 8, margin: [4, 2, 0, 4] },
                                            ],
                                        },
                                        {
                                            width: '50%',
                                            stack: [
                                                { text: '7.D  DISAPPROVED DUE TO:', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                                                { text: '   _______________________________________________', fontSize: 8, margin: [4, 2] },
                                                { text: '   _______________________________________________', fontSize: 8, margin: [4, 2] },
                                                { text: '   _______________________________________________', fontSize: 8, margin: [4, 2, 0, 4] },
                                            ],
                                        },
                                    ],
                                },
                                { text: ' ', fontSize: 6, margin: [0, 5, 0, 0] },
                                {
                                    table: {
                                        widths: ['*'],
                                        body: [[{
                                            text: 'HON. REY T. UY',
                                            fontSize: 10,
                                            bold: true,
                                            alignment: 'center',
                                            margin: [0, 0, 0, 2],
                                            border: [false, false, false, true],
                                        }]],
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
                                { text: 'City Mayor', fontSize: 9, alignment: 'center', margin: [0, 2, 0, 6] },
                            ],
                        }],
                    ],
                },
                layout: {
                    hLineWidth: () => b,
                    vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? b : 0,
                    hLineColor: () => '#000',
                    vLineColor: () => '#000',
                },
            },
        ],

        defaultStyle: {
            font: 'Roboto',
        },
    }

    await openPdfDocument(pdfMake.createPdf(docDefinition), options)
}
