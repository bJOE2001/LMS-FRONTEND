import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { enrichAppWithDepartmentHead, getDepartmentHeadSignature } from 'src/utils/department-head-signature'

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
  if (lower === 'mandatory' || lower === 'forced' || lower === 'mandatory forced leave')
    return 'Mandatory / Forced Leave'
  if (lower === 'mandatory / forced leave') return 'Mandatory / Forced Leave'
  if (lower === 'mco6' || lower === 'mco6 leave') return 'MCO6 Leave'
  if (lower === 'vacation') return 'Vacation Leave'
  if (lower === 'sick') return 'Sick Leave'
  if (lower === 'vacation leave') return 'Vacation Leave'
  if (lower === 'sick leave') return 'Sick Leave'
  if (lower === 'wellness' || lower === 'wellness leave') return 'Wellness Leave'
  if (lower === 'cto' || lower === 'cto leave' || lower === 'compensatory time off')
    return 'CTO Leave'

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
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
    .then(res => res.blob())
    .then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    }))
}

/**
 * Generate and open a CS Form No. 6 (Application for Leave) PDF.
 * @param {Object} app - The leave application object from the store.
 */
export async function generateLeaveFormPdf(app) {
  if (!app) return
  const printableApp = await enrichAppWithDepartmentHead(app)

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
  const lt = printableApp.leaveType || ''
  const office = normalizeOfficeDepartment(printableApp.office || '')
  const officeFontSize = getOfficeDepartmentFontSize(office)
  const dateFiled = formatDate(printableApp.dateFiled)
  const startDate = formatDate(printableApp.startDate)
  const endDate = formatDate(printableApp.endDate)
  const days = printableApp.days || ''
  const commutation = printableApp.commutation || 'Not Requested'
  const status = printableApp.status || ''
  const departmentHeadSignature = getDepartmentHeadSignature(printableApp)
  const cert = printableApp.certificationLeaveCredits || printableApp.certification_leave_credits || {}
  const asOfDate = cert.as_of_date || ''
  const certificationColumns = buildCertificationColumns(printableApp)

  // ── Checkbox helper: canvas rectangle + optional checkmark ──
  function cbLine(checked, label, opts = {}) {
    const fs = opts.fontSize || 6.5
    const boxSize = 7
    const canvasItems = [
      { type: 'rect', x: 0, y: 1, w: boxSize, h: boxSize, lineWidth: 0.5 },
    ]
    if (checked) {
      canvasItems.push(
        { type: 'line', x1: 1.2, y1: 4.5, x2: 2.8, y2: 7, lineWidth: 1 },
        { type: 'line', x1: 2.8, y1: 7, x2: 5.8, y2: 2, lineWidth: 1 },
      )
    }
    return {
      columns: [
        { canvas: canvasItems, width: 10 },
        { text: label, fontSize: fs, margin: [2, 0, 0, 0], width: '*' },
      ],
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
    { key: 'Vacation Leave', label: 'Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
    { key: 'Mandatory/Forced Leave', label: 'Mandatory/Forced Leave(Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
    { key: 'Sick Leave', label: 'Sick Leave (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
    { key: 'Maternity Leave', label: 'Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)' },
    { key: 'Paternity Leave', label: 'Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)' },
    { key: 'Special Privilege Leave', label: 'Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
    { key: 'Solo Parent Leave', label: 'Solo Parent Leave (RA No. 8972 / CSC MC No. 8, s. 2004)' },
    { key: 'Study Leave', label: 'Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
    { key: '10-Day VAWC Leave', label: '10-Day VAWC Leave (RA No. 9262 / CSC MC No. 15, s. 2005)' },
    { key: 'Rehabilitation Privilege', label: 'Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
    { key: 'Special Leave Benefits for Women', label: 'Special Leave Benefits for Women (RA No. 9710 / CSC MC No. 25, s. 2010)' },
    { key: 'Special Emergency (Calamity) Leave', label: 'Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)' },
    { key: 'Adoption Leave', label: 'Adoption Leave (R.A. No. 8552)' },
  ]
  const isKnownLeave = leaveTypes.some(t => t.key === lt)

  // ── Section 6.A: Type of Leave checkboxes ──
  const section6A = {
    stack: [
      { text: '6.A  TYPE OF LEAVE TO BE AVAILED OF', bold: true, fontSize: 7.5, margin: [0, 3, 0, 4] },
      ...leaveTypes.map(t => cbLine(lt === t.key, t.label)),
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

      { text: 'In case of Vacation/Special Privilege Leave:', fontSize: 7, italics: true, margin: [0, 2, 0, 2] },
      cbLine(false, 'Within the Philippines ___________________'),
      cbLine(false, 'Abroad (Specify) ________________________'),

      { text: 'In case of Sick Leave:', fontSize: 7, italics: true, margin: [0, 6, 0, 2] },
      cbLine(false, 'In Hospital (Specify Illness) ____________'),
      cbLine(lt === 'Sick Leave', 'Out Patient (Specify Illness)   Tootache'),

      { text: 'In case of Special Leave Benefits for Women:', fontSize: 7, italics: true, margin: [0, 6, 0, 2] },
      { text: '(Specify Illness) ___________________________', fontSize: 7, margin: [12, 0, 0, 0] },

      { text: 'In case of Study Leave:', fontSize: 7, italics: true, margin: [0, 6, 0, 2] },
      cbLine(false, 'Completion of Master\'s Degree'),
      cbLine(false, 'BAR/Board Examination Review'),

      { text: 'Other purpose:', fontSize: 7, italics: true, margin: [0, 6, 0, 2] },
      cbLine(false, 'Monetization Leave'),
      cbLine(false, 'Terminal Leave'),
    ],
    margin: [4, 0, 6, 6],
  }

  // ── Section 6.C: Working days + inclusive dates ──
  const section6C = {
    stack: [
      { text: '6.C  NUMBER OF WORKING DAYS APPLIED FOR', bold: true, fontSize: 7.5, margin: [0, 3, 0, 3] },
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
      { text: '(Signature of Applicant)', alignment: 'center', fontSize: 7, italics: true, margin: [0, 2, 0, 0] },
    ],
    margin: [4, 0, 6, 6],
  }

  // ── Section 7.A: Certification of Leave Credits ──
  const section7A = {
    stack: [
      { text: '7.A  CERTIFICATION OF LEAVE CREDITS', bold: true, fontSize: 7.5, margin: [0, 3, 0, 5] },
      { text: `       As of  ${asOfDate || '________________________'}`, fontSize: 7, margin: [0, 0, 0, 6] },
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
          body: [[{
            text: departmentHeadSignature.fullName || ' ',
            alignment: 'center',
            fontSize: 8,
            bold: true,
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
      { text: departmentHeadSignature.designation, alignment: 'center', fontSize: 7, margin: [0, 2, 0, 0] },
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
              { text: '         _________ days with pay', fontSize: 7, margin: [0, 2, 0, 2] },
              { text: '         _________ days without pay', fontSize: 7, margin: [0, 2, 0, 2] },
              { text: '         _________ others (Specify)', fontSize: 7, margin: [0, 2, 0, 2] },
            ],
            margin: [0, 0, 10, 0],
          },
          {
            width: '50%',
            stack: [
              { text: '7.D  DISAPPROVED DUE TO:', bold: true, fontSize: 7.5, margin: [0, 3, 0, 5] },
              { text: '     ______________________________________', fontSize: 7, margin: [0, 2, 0, 2] },
              { text: '     ______________________________________', fontSize: 7, margin: [0, 2, 0, 2] },
              { text: '     ______________________________________', fontSize: 7, margin: [0, 2, 0, 2] },
            ],
            margin: [10, 0, 0, 0],
          },
        ],
      },
      { text: '', margin: [0, 6, 0, 0] },
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'HON. REY T. UY',
            alignment: 'center',
            fontSize: 10,
            bold: true,
            margin: [0, 0, 0, 2],
            border: [false, false, false, true],
          }]],
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
      ...(logoBase64 ? [{ image: logoBase64, width: 45, absolutePosition: { x: 135, y: 18 } }] : []),
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
              { text: 'JV Ayala Avenue, Apokon, Tagum City', fontSize: 7, alignment: 'center', italics: true },
            ],
          },
          {
            width: '24%',
            table: {
              widths: ['*'],
              body: [
                [{ text: 'Stamp of Date of Receipt', fontSize: 7, alignment: 'center', margin: [3, 10, 3, 10] }],
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
                          { text: office, fontSize: officeFontSize, lineHeight: 1.05, margin: [0, 3, 0, 0] },
                        ],
                        margin: [2, 3, 2, 3],
                      },
                      {
                        stack: [
                          { text: [{ text: '2.  NAME :    ', bold: true, fontSize: 7 }, { text: '(Last)', fontSize: 6, color: '#555' }] },
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
                  vLineWidth: (i) => (i === 2) ? 0.3 : 0,
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

  pdfMake.createPdf(docDefinition).open()
}
