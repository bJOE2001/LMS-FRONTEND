/**
 * Civil Service Form No. 6 (Revised 2020)
 * APPLICATION FOR LEAVE — pdfmake document definition
 *
 * Replicates the official Philippine government leave application form.
 */
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { enrichAppWithDepartmentHead, getDepartmentHeadSignature } from './department-head-signature'

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
    return {
        columns: [
            { canvas: canvasItems, width: 12 },
            { text: label, fontSize: fs, margin: [4, 0, 0, 0], width: '*' },
        ],
        margin: [left, vertical, 0, bottom],
    }
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

// ─── main builder ──────────────────────────────────────────────────────────
export async function generateLeaveFormPdf(sourceApp) {
    const app = await enrichAppWithDepartmentHead(sourceApp)
    const lt = (app.leaveType || '').toLowerCase()
    const rawStatus = String(app.rawStatus || '').toUpperCase()
    const statusLabel = String(app.status || '').toUpperCase()

    // Determine which leave type checkbox to tick
    const isVacation = lt.includes('vacation')
    const isMandatory = lt.includes('mandatory') || lt.includes('forced')
    const isSick = lt.includes('sick')
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
    const isOther = !(isVacation || isMandatory || isSick || isMaternity || isPaternity || isSpecPriv || isSoloParent || isStudy || isVAWC || isRehab || isSLBW || isCalamity || isAdoption)

    const isCommutationRequested = String(app.commutation || '').toLowerCase().trim() === 'requested'
    const isForApproval = rawStatus === 'PENDING_HR' || rawStatus === 'APPROVED' || statusLabel === 'APPROVED' || statusLabel === 'PENDING HR'
    const isForDisapproval = rawStatus === 'REJECTED' || rawStatus === 'DISAPPROVED' || statusLabel === 'REJECTED' || statusLabel === 'DISAPPROVED'
    const disapprovalReason = isForDisapproval
        ? (app.remarks || app.reason || '________________')
        : '________________'

    const cert = app.certificationLeaveCredits || {}
    const vac = cert.vacation || {}
    const sick = cert.sick || {}
    const asOfDate = cert.as_of_date || ''

    const inclusiveDates = `${fmtDate(app.startDate)} - ${fmtDate(app.endDate)}`
    const b = 0.5 // border width
    const name = parseName(app)
    const departmentHeadSignature = getDepartmentHeadSignature(app)

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
                                    { text: app.office || '', fontSize: 9, bold: true, margin: [0, 4, 0, 0] },
                                ],
                                border: [true, true, true, true],
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
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
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
                                border: [true, false, true, true],
                                margin: [8, 8],
                            },
                            {
                                text: [
                                    { text: '4.  POSITION: ', bold: true, fontSize: 8 },
                                    { text: app.position || '', fontSize: 9, bold: true, decoration: 'underline' },
                                ],
                                border: [false, false, true, true],
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
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
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
                                    checkboxRow(isMaternity, 'Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)'),
                                    checkboxRow(isPaternity, 'Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)'),
                                    checkboxRow(isSpecPriv, 'Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isSoloParent, 'Solo Parent Leave (RA No. 8972 / CSC MC No. 8, s. 2004)'),
                                    checkboxRow(isStudy, 'Study Leave (Sec. 53, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isVAWC, '10-Day VAWC Leave (RA No. 9262 / CSC MC No. 15, s. 2005)'),
                                    checkboxRow(isRehab, 'Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)'),
                                    checkboxRow(isSLBW, 'Special Leave Benefits for Women (RA No. 9710 / CSC MC No. 25, s. 2010)'),
                                    checkboxRow(isCalamity, 'Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)'),
                                    checkboxRow(isAdoption, 'Adoption Leave (R.A. No. 8552)'),
                                    { text: ' ', fontSize: 4 },
                                    checkboxRow(isOther, `Others: ${isOther ? (app.leaveType || '') : '_______________'}`, { marginVertical: 1, marginBottom: 4 }),
                                ],
                                border: [true, false, true, true],
                            },

                            // ─── 6.B ───
                            {
                                stack: [
                                    { text: '6.B  DETAILS OF LEAVE', bold: true, fontSize: 8, margin: [4, 4, 0, 4] },
                                    { text: '   In case of Vacation/Special Privilege Leave:', fontSize: 7, italics: true, margin: [4, 0] },
                                    checkboxRow(isVacation, 'Within the Philippines', { marginLeft: 8 }),
                                    checkboxRow(false, 'Abroad (Specify) _______________', { marginLeft: 8 }),
                                    { text: ' ', fontSize: 4 },
                                    { text: '   In case of Sick Leave:', fontSize: 7, italics: true, margin: [4, 1] },
                                    checkboxRow(false, 'In Hospital (Specify Illness) _______________', { marginLeft: 8 }),
                                    checkboxRow(isSick, `Out Patient (Specify Illness) ${isSick && app.reason ? app.reason : '_______________'}`, { marginLeft: 8 }),
                                    { text: ' ', fontSize: 4 },
                                    { text: '   In case of Special Leave Benefits for Women:', fontSize: 7, italics: true, margin: [4, 1] },
                                    { text: '      (Specify Illness) _______________', fontSize: 7, margin: [8, 1] },
                                    { text: ' ', fontSize: 4 },
                                    { text: '   In case of Study Leave:', fontSize: 7, italics: true, margin: [4, 1] },
                                    checkboxRow(false, "Completion of Master's Degree", { marginLeft: 8 }),
                                    checkboxRow(false, 'BAR/Board Examination Review', { marginLeft: 8 }),
                                    { text: ' ', fontSize: 4 },
                                    { text: '   Other purpose:', fontSize: 7, italics: true, margin: [4, 1] },
                                    checkboxRow(false, 'Monetization Leave', { marginLeft: 8 }),
                                    checkboxRow(false, 'Terminal Leave', { marginLeft: 8, marginVertical: 1, marginBottom: 4 }),
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
                                    checkboxRow(!isCommutationRequested, 'Not Requested'),
                                    checkboxRow(isCommutationRequested, 'Requested'),
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
                                    {
                                        table: {
                                            widths: ['40%', '30%', '30%'],
                                            body: [
                                                [{ text: '', fontSize: 7 }, { text: 'Vacation Leave', fontSize: 7, bold: true, alignment: 'center' }, { text: 'Sick Leave', fontSize: 7, bold: true, alignment: 'center' }],
                                                [{ text: 'Total Earned', fontSize: 7, bold: true, italics: true }, { text: fmtCredit(vac.total_earned), fontSize: 7, alignment: 'center' }, { text: fmtCredit(sick.total_earned), fontSize: 7, alignment: 'center' }],
                                                [{ text: 'Less this application', fontSize: 7, bold: true, italics: true }, { text: fmtCredit(vac.less_this_application), fontSize: 7, alignment: 'center' }, { text: fmtCredit(sick.less_this_application), fontSize: 7, alignment: 'center' }],
                                                [{ text: 'Balance', fontSize: 7, bold: true, italics: true }, { text: fmtCredit(vac.balance), fontSize: 7, alignment: 'center' }, { text: fmtCredit(sick.balance), fontSize: 7, alignment: 'center' }],
                                            ],
                                        },
                                        layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
                                        margin: [12, 0, 12, 8],
                                    },
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
                                                { text: '         _______ days with pay', fontSize: 8, margin: [4, 2] },
                                                { text: '         _______ days without pay', fontSize: 8, margin: [4, 2] },
                                                { text: '         _______ others (Specify)', fontSize: 8, margin: [4, 2, 0, 4] },
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
                layout: { hLineWidth: () => b, vLineWidth: () => b, hLineColor: () => '#000', vLineColor: () => '#000' },
            },
        ],

        defaultStyle: {
            font: 'Roboto',
        },
    }

    pdfMake.createPdf(docDefinition).open()
}
