import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

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

  // ── Load logo image ──
  let logoBase64 = null
  try {
    logoBase64 = await toBase64('/images/CityOfTagumLogo.png')
  } catch {
    // Logo not found — continue without it
  }

  // ── Parse application data ──
  const fullName = app.employeeName || ''
  const nameParts = fullName.trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
  const lt = app.leaveType || ''
  const office = app.office || ''
  const dateFiled = formatDate(app.dateFiled)
  const startDate = formatDate(app.startDate)
  const endDate = formatDate(app.endDate)
  const days = app.days || ''
  const commutation = app.commutation || 'Not Requested'
  const status = app.status || ''

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
      { text: '       As of  ________________________', fontSize: 7, margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ['38%', '31%', '31%'],
          body: [
            [
              { text: '', fontSize: 7 },
              { text: 'Vacation Leave', fontSize: 7, bold: true, alignment: 'center' },
              { text: 'Sick Leave', fontSize: 7, bold: true, alignment: 'center' },
            ],
            [
              { text: 'Total Earned', fontSize: 7, italics: true },
              { text: '', fontSize: 7 },
              { text: '', fontSize: 7 },
            ],
            [
              { text: 'Less this application', fontSize: 7, italics: true },
              { text: '', fontSize: 7 },
              { text: '', fontSize: 7 },
            ],
            [
              { text: 'Balance', fontSize: 7, bold: true },
              { text: '', fontSize: 7 },
              { text: '', fontSize: 7 },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.3,
          vLineWidth: () => 0.3,
        },
        margin: [8, 0, 8, 14],
      },
      { text: '______________________________________', alignment: 'center', fontSize: 8 },
      { text: '(Authorized Officer)', alignment: 'center', fontSize: 7, italics: true, margin: [0, 2, 0, 0] },
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
      { text: '______________________________________', alignment: 'center', fontSize: 8 },
      { text: 'Executive Assistant III', alignment: 'center', fontSize: 7, bold: true, margin: [0, 2, 0, 0] },
    ],
    margin: [4, 0, 6, 6],
  }

  // ── Section 7.C: Approved for ──
  const section7C = {
    stack: [
      { text: '7.C  APPROVED FOR:', bold: true, fontSize: 7.5, margin: [0, 3, 0, 5] },
      { text: '         _________ days with pay', fontSize: 7, margin: [0, 2, 0, 2] },
      { text: '         _________ days without pay', fontSize: 7, margin: [0, 2, 0, 2] },
      { text: '         _________ others (Specify)', fontSize: 7, margin: [0, 2, 0, 2] },
    ],
    margin: [6, 0, 4, 6],
  }

  // ── Section 7.D: Disapproved due to ──
  const section7D = {
    stack: [
      { text: '7.D  DISAPPROVED DUE TO:', bold: true, fontSize: 7.5, margin: [0, 3, 0, 5] },
      { text: '     ______________________________________', fontSize: 7, margin: [0, 2, 0, 2] },
      { text: '     ______________________________________', fontSize: 7, margin: [0, 2, 0, 2] },
      { text: '     ______________________________________', fontSize: 7, margin: [0, 2, 0, 2] },
    ],
    margin: [4, 0, 6, 6],
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
                          { text: office, fontSize: 9, margin: [0, 3, 0, 0] },
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
                  vLineWidth: (i) => (i === 0 || i === 3) ? 0 : 0.3,
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
                  vLineWidth: (i) => (i === 0 || i === 3) ? 0 : 0.3,
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

            // ── 7.C (left) | 7.D (right) ──
            [section7C, section7D],

            // ── Footer: City Mayor ──
            [
              {
                colSpan: 2,
                stack: [
                  { text: '', margin: [0, 20, 0, 0] },
                  { text: '______________________________________', alignment: 'center', fontSize: 8 },
                  { text: 'City Mayor', alignment: 'center', fontSize: 10, bold: true, margin: [0, 3, 0, 0] },
                ],
                margin: [0, 5, 0, 15],
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
