import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { openPdfLoadingTab } from 'src/utils/pdf-loading-tab'

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts

const CODE39_PATTERNS = {
  0: '000110100',
  1: '100100001',
  2: '001100001',
  3: '101100000',
  4: '000110001',
  5: '100110000',
  6: '001110000',
  7: '000100101',
  8: '100100100',
  9: '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  $: '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100',
}

/**
 * Generate a Code 39 SVG barcode for the CSC Form 48 footer.
 */
export function generateCscBarcodeSvg(controlNumber) {
  const rawText = String(controlNumber || '132354249')
  const text = `*${rawText.toUpperCase()}*`

  const narrowWidth = 1.2
  const wideWidth = 2.8
  const barHeight = 22
  const rects = []
  let x = 0

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['*']
    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0
      const isWide = pattern[p] === '1'
      const w = isWide ? wideWidth : narrowWidth
      if (isBar) {
        rects.push(
          `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${barHeight}" fill="#000" />`
        )
      }
      x += w
    }
    x += narrowWidth
  }

  return `<svg viewBox="0 0 ${Math.ceil(x)} ${barHeight}" preserveAspectRatio="none" style="width: 100%; height: ${barHeight}px; display: block; margin: 0 auto;">${rects.join('')}</svg>`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function extractCleanText(el) {
  if (!el) return ''
  const clone = el.cloneNode(true)
  clone.querySelectorAll('.no-print, .q-icon').forEach((node) => node.remove())
  return String(clone.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildPanelColumns(leftNode, rightNode, isSingleCentered) {
  if (isSingleCentered) {
    return {
      columns: [
        { width: 268, stack: [leftNode] },
        { width: '*', text: '' },
      ],
    }
  }
  return {
    columns: [
      { width: 268, stack: [leftNode] },
      { width: 23, text: '' },
      { width: 268, stack: [rightNode || { text: '' }] },
    ],
  }
}

function buildUnderlineBlock(valueText, subLabelText, fontSize = 10, bold = true, uppercase = false) {
  const display = uppercase ? String(valueText || '').toUpperCase() : String(valueText || '')
  return {
    margin: [8, 0, 8, 0],
    stack: [
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: display || ' ',
                fontSize,
                bold,
                alignment: 'center',
                border: [false, false, false, true],
                margin: [0, 0, 0, 1],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0,
          hLineColor: () => '#000000',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 1,
        },
      },
      {
        text: subLabelText,
        fontSize: 7.2,
        alignment: 'center',
        margin: [0, 1.5, 0, 0],
      },
    ],
  }
}

function buildInlineRuleSvg(width = 62) {
  return {
    svg: `<svg width="${width}" height="6" viewBox="0 0 ${width} 6"><line x1="0" y1="5" x2="${width}" y2="5" stroke="#000000" stroke-width="0.6" /></svg>`,
    width,
    height: 6,
  }
}

function buildMetaPanelBlock(colEl) {
  if (!colEl) return { text: '' }
  const prnLine = colEl.querySelector('.csc-prn-line')
  if (prnLine) {
    const prnValue = extractCleanText(prnLine.querySelector('.csc-prn-underline'))
    return {
      margin: [0, 14, 0, 0],
      columns: [
        { width: 26, text: 'PRN:', fontSize: 7.8, noWrap: true, margin: [0, 1, 2, 0] },
        {
          width: '*',
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: prnValue || ' ',
                  fontSize: 7.8,
                  bold: true,
                  border: [false, false, false, true],
                  margin: [2, 0, 2, 1],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.6,
            vLineWidth: () => 0,
            hLineColor: () => '#000000',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0.5,
          },
        },
      ],
    }
  }

  const periodText = extractCleanText(colEl.querySelector('.csc-period-underline'))
  return {
    stack: [
      {
        columns: [
          { width: 'auto', text: 'For the month of ', fontSize: 7.8, margin: [0, 1, 4, 0] },
          {
            width: 'auto',
            table: {
              widths: ['auto'],
              body: [
                [
                  {
                    text: periodText || ' ',
                    fontSize: 7.8,
                    bold: true,
                    border: [false, false, false, true],
                    margin: [8, 0, 8, 0.5],
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.6,
              vLineWidth: () => 0,
              hLineColor: () => '#000000',
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
          },
        ],
      },
      {
        text: 'Office Hours for Arrival (Regular Days) and',
        fontSize: 7.8,
        margin: [0, 2, 0, 0],
      },
      {
        margin: [0, 1, 0, 0],
        columns: [
          { width: 'auto', text: 'Departure', fontSize: 7.8, noWrap: true, margin: [0, 0, 3, 0] },
          { width: 48, ...buildInlineRuleSvg(48), margin: [0, 2, 0, 0] },
          { width: 6, text: '' },
          { width: 'auto', text: 'Saturday', fontSize: 7.8, noWrap: true, margin: [0, 0, 3, 0] },
          { width: 48, ...buildInlineRuleSvg(48), margin: [0, 2, 0, 0] },
        ],
      },
    ],
  }
}

function buildMasterTableNode(tableEl, mode) {
  if (!tableEl) return { text: '' }

  let widths = [21, 57, 57, 57, 57, 23, 208, 52]
  let gutterColIndex = 5
  if (mode === 'single-centered') {
    widths = [21, 57, 57, 57, 57]
    gutterColIndex = -1
  } else if (mode === 'bimonthly-side-by-side') {
    widths = [21, 57, 57, 57, 57, 23, 21, 57, 57, 57, 57]
    gutterColIndex = 5
  }

  const body = []
  let hasAmPmRow = false

  const amPmRow = tableEl.querySelector('thead tr.tr-am-pm')
  if (amPmRow) {
    const pdfRow = []
    amPmRow.querySelectorAll('th').forEach((th) => {
      const colSpan = Math.max(1, Number(th.getAttribute('colspan') || 1))
      const text = extractCleanText(th)
      const cell = {
        text,
        fontSize: 7.5,
        bold: true,
        alignment: 'center',
        border: [false, false, false, false],
        margin: [0, 0, 0, 1.5],
      }
      if (colSpan > 1) cell.colSpan = colSpan
      pdfRow.push(cell)
      for (let i = 1; i < colSpan; i++) {
        pdfRow.push({ text: '', border: [false, false, false, false] })
      }
    })
    if (pdfRow.length === widths.length) {
      body.push(pdfRow)
      hasAmPmRow = true
    }
  }

  const headerRow = tableEl.querySelector('thead tr.tr-col-headers')
  if (headerRow) {
    const pdfRow = []
    headerRow.querySelectorAll('th').forEach((th) => {
      const colSpan = Math.max(1, Number(th.getAttribute('colspan') || 1))
      const isGutter = th.classList.contains('th-gutter')
      const cellBorder = isGutter ? [false, false, false, false] : [true, true, true, true]
      const cell = {
        text: isGutter ? '' : extractCleanText(th),
        fontSize: 6.8,
        bold: true,
        alignment: 'center',
        border: cellBorder,
        margin: [0, 2, 0, 2],
      }
      if (colSpan > 1) cell.colSpan = colSpan
      pdfRow.push(cell)
      for (let i = 1; i < colSpan; i++) {
        pdfRow.push({ text: '', border: [...cellBorder] })
      }
    })
    if (pdfRow.length === widths.length) {
      body.push(pdfRow)
    }
  }

  tableEl.querySelectorAll('tbody tr').forEach((tr) => {
    const pdfRow = []
    tr.querySelectorAll('td').forEach((td) => {
      const colSpan = Math.max(1, Number(td.getAttribute('colspan') || 1))
      const isGutter = td.classList.contains('td-gutter')
      const cellBorder = isGutter ? [false, false, false, false] : [true, true, true, true]

      if (isGutter) {
        pdfRow.push({ text: '', border: cellBorder })
        for (let i = 1; i < colSpan; i++) {
          pdfRow.push({ text: '', border: [...cellBorder] })
        }
        return
      }

      const rawText = extractCleanText(td)
      const isWorkload = td.classList.contains('td-workload')
      const isMergedStatus = td.classList.contains('td-merged-status')
      const isLate = td.classList.contains('td-late-slot')
      const isOverridden = td.classList.contains('td-overridden-slot')
      const isWeekendDate = td.classList.contains('td-date-weekend')
      const isDash = td.classList.contains('td-dash')
      const isX = td.classList.contains('td-x')
      const upperText = rawText.trim().toUpperCase()
      const isWeekendLabel = (isMergedStatus || isWorkload) && (upperText === 'SATURDAY' || upperText === 'SUNDAY')

      const cell = {
        text: isMergedStatus && !isWorkload ? upperText : rawText,
        fontSize: isX ? 7.4 : 8.2,
        bold: isLate || isOverridden || isWeekendDate,
        color: isLate ? '#c62828' : isX ? '#555555' : isDash ? '#333333' : '#000000',
        alignment: 'center',
        border: cellBorder,
      }
      if (isWeekendLabel) cell.characterSpacing = 2.2
      if (colSpan > 1) cell.colSpan = colSpan
      pdfRow.push(cell)
      for (let i = 1; i < colSpan; i++) {
        pdfRow.push({ text: '', border: [...cellBorder] })
      }
    })
    if (pdfRow.length === widths.length) {
      body.push(pdfRow)
    }
  })

  const tableNode = {
    margin: [0, 3, 0, 4],
    table: {
      widths,
      dontBreakRows: true,
      body,
    },
    layout: {
      hLineWidth: (i) => (i === 0 && hasAmPmRow ? 0 : 0.45),
      vLineWidth: () => 0.45,
      hLineColor: () => '#000000',
      vLineColor: () => '#000000',
      paddingLeft: (i) => (i === gutterColIndex ? 0 : 1.5),
      paddingRight: (i) => (i === gutterColIndex ? 0 : 1.5),
      paddingTop: (rowIndex) => (rowIndex === 0 && hasAmPmRow ? 0.5 : 2.05),
      paddingBottom: (rowIndex) => (rowIndex === 0 && hasAmPmRow ? 1 : 2.05),
    },
  }

  if (mode === 'single-centered') {
    return {
      columns: [
        { width: 268, stack: [tableNode] },
        { width: '*', text: '' },
      ],
    }
  }

  return tableNode
}

function buildBarcodeCertBlock(colEl) {
  if (!colEl) return { text: '' }
  const stack = []
  const svgEl = colEl.querySelector('.csc-barcode-wrap svg')
  if (svgEl) {
    const viewBox = svgEl.getAttribute('viewBox') || '0 0 218 22'
    const cleanSvg = `<svg viewBox="${escapeHtml(viewBox)}" width="246" height="15" preserveAspectRatio="none">${svgEl.innerHTML}</svg>`
    stack.push({
      svg: cleanSvg,
      width: 246,
      height: 15,
      alignment: 'center',
      margin: [0, 1, 0, 3],
    })
  }

  const certEl = colEl.querySelector('.csc-cert-statement')
  if (certEl) {
    stack.push({
      text: extractCleanText(certEl),
      fontSize: 7.2,
      lineHeight: 1.2,
      alignment: 'left',
      leadingIndent: 14,
      margin: [4, 0, 4, 0],
    })
  }

  return stack.length > 0 ? { stack } : { text: '' }
}

function buildVerifyBlock(colEl) {
  if (!colEl) return { text: '' }
  const caption = extractCleanText(colEl.querySelector('.csc-sig-caption'))
  if (!caption) return { text: '' }
  return {
    margin: [8, 22, 8, 0],
    stack: [
      {
        table: {
          widths: ['*'],
          body: [[{ text: ' ', fontSize: 1, border: [false, false, false, true] }]],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0,
          hLineColor: () => '#000000',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
      {
        text: caption,
        fontSize: 7.2,
        alignment: 'center',
        margin: [0, 2.5, 0, 0],
      },
    ],
  }
}

function buildInChargeBlock(colEl) {
  if (!colEl) return { text: '' }
  const sigName = extractCleanText(colEl.querySelector('.csc-sig-name'))
  const sigTitle = extractCleanText(colEl.querySelector('.csc-sig-title'))
  const sigSub = extractCleanText(colEl.querySelector('.csc-sig-sub')) || 'IN-CHARGE'

  return {
    margin: [8, 18, 8, 0],
    stack: [
      {
        text: sigName || ' ',
        fontSize: 8.4,
        bold: true,
        alignment: 'center',
      },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: sigTitle || ' ',
                fontSize: 7.6,
                alignment: 'center',
                border: [false, false, false, true],
                margin: [0, 0, 0, 1],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.6,
          vLineWidth: () => 0,
          hLineColor: () => '#000000',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
      {
        text: sigSub,
        fontSize: 7.2,
        alignment: 'center',
        margin: [0, 2, 0, 0],
      },
    ],
  }
}

function buildSummaryRowBlock(colEl) {
  if (!colEl) return { text: '' }
  const spans = Array.from(colEl.querySelectorAll('span')).map((sp) => extractCleanText(sp)).filter(Boolean)
  if (spans.length === 0) return { text: '' }
  return {
    margin: [6, 5, 0, 0],
    columns: spans.map((label, idx) => ({
      width: idx === 0 ? 120 : '*',
      text: label,
      fontSize: 7.5,
    })),
  }
}

function buildPdfSheetStack(sheetEl, isFirstPage) {
  const dualSheet = sheetEl.querySelector('.dtr-dual-page-sheet') || sheetEl
  const headerBands = Array.from(dualSheet.querySelectorAll('.csc-header-band'))
  const footerBands = Array.from(dualSheet.querySelectorAll('.csc-footer-band'))
  const tableEl = dualSheet.querySelector('table.csc-master-table')

  const boxedHeaderCount = tableEl
    ? tableEl.querySelectorAll('thead tr.tr-col-headers th.th-boxed').length
    : 0
  let mode = 'contractual'
  if (dualSheet.classList.contains('single-left-layout') || boxedHeaderCount === 5) {
    mode = 'single-centered'
  } else if (boxedHeaderCount === 10) {
    mode = 'bimonthly-side-by-side'
  }
  const isSingleCentered = mode === 'single-centered'

  const stack = []

  // Band 0: Form 48
  const topCols = headerBands[0] ? Array.from(headerBands[0].querySelectorAll('.csc-panel-col')) : []
  stack.push(
    buildPanelColumns(
      { text: extractCleanText(topCols[0]) || 'Form 48', fontSize: 8, margin: [0, 0, 0, 2] },
      topCols[1] ? { text: extractCleanText(topCols[1]), fontSize: 8, margin: [0, 0, 0, 2] } : null,
      isSingleCentered,
    ),
  )

  // Band 1: DAILY TIME RECORD | ACCOMPLISHMENT REPORT
  const titleCols = headerBands[1] ? Array.from(headerBands[1].querySelectorAll('.csc-panel-col')) : []
  stack.push({
    margin: [0, 0, 0, 8],
    ...buildPanelColumns(
      { text: extractCleanText(titleCols[0]) || 'DAILY TIME RECORD', fontSize: 10, bold: true, alignment: 'center' },
      titleCols[1]
        ? { text: extractCleanText(titleCols[1]), fontSize: 10, bold: true, alignment: 'center' }
        : null,
      isSingleCentered,
    ),
  })

  // Band 2: Employee Name & Charges
  const idCols = headerBands[2] ? Array.from(headerBands[2].querySelectorAll('.csc-panel-col')) : []
  const leftName = extractCleanText(idCols[0]?.querySelector('.csc-name-underline'))
  const leftSub = extractCleanText(idCols[0]?.querySelector('.csc-sub-label')) || 'NAME'
  let rightIdNode = null
  if (idCols[1]) {
    const rightNameEl = idCols[1].querySelector('.csc-name-underline')
    const rightChargesEl = idCols[1].querySelector('.csc-charges-underline')
    const rightSub = extractCleanText(idCols[1].querySelector('.csc-sub-label'))
    if (rightNameEl) {
      rightIdNode = buildUnderlineBlock(extractCleanText(rightNameEl), rightSub || 'NAME', 10, true, false)
    } else if (rightChargesEl) {
      rightIdNode = buildUnderlineBlock(extractCleanText(rightChargesEl), rightSub || 'CHARGES', 7.8, false, true)
    }
  }
  stack.push({
    margin: [0, 0, 0, 4],
    ...buildPanelColumns(
      buildUnderlineBlock(leftName, leftSub, 10, true, false),
      rightIdNode,
      isSingleCentered,
    ),
  })

  // Band 3: Month / Office Hours / PRN
  const metaCols = headerBands[3] ? Array.from(headerBands[3].querySelectorAll('.csc-panel-col')) : []
  stack.push({
    margin: [0, 0, 0, 4],
    ...buildPanelColumns(
      buildMetaPanelBlock(metaCols[0]),
      metaCols[1] ? buildMetaPanelBlock(metaCols[1]) : null,
      isSingleCentered,
    ),
  })

  // Master Table
  stack.push(buildMasterTableNode(tableEl, mode))

  // Footer Band 0: Barcode + Certification
  const f0Cols = footerBands[0] ? Array.from(footerBands[0].querySelectorAll('.csc-panel-col')) : []
  stack.push(
    buildPanelColumns(
      buildBarcodeCertBlock(f0Cols[0]),
      f0Cols[1] ? buildBarcodeCertBlock(f0Cols[1]) : null,
      isSingleCentered,
    ),
  )

  // Footer Band 1: Verified / Prepared by
  const f1Cols = footerBands[1] ? Array.from(footerBands[1].querySelectorAll('.csc-panel-col')) : []
  stack.push(
    buildPanelColumns(
      buildVerifyBlock(f1Cols[0]),
      f1Cols[1] ? buildVerifyBlock(f1Cols[1]) : null,
      isSingleCentered,
    ),
  )

  // Footer Band 2: In-Charge Signatory
  const f2Cols = footerBands[2] ? Array.from(footerBands[2].querySelectorAll('.csc-panel-col')) : []
  stack.push(
    buildPanelColumns(
      buildInChargeBlock(f2Cols[0]),
      f2Cols[1] ? buildInChargeBlock(f2Cols[1]) : null,
      isSingleCentered,
    ),
  )

  // Footer Band 3: Summary Counters
  const f3Cols = footerBands[3] ? Array.from(footerBands[3].querySelectorAll('.csc-panel-col')) : []
  stack.push(
    buildPanelColumns(
      buildSummaryRowBlock(f3Cols[0]),
      f3Cols[1] ? buildSummaryRowBlock(f3Cols[1]) : null,
      isSingleCentered,
    ),
  )

  return isFirstPage
    ? { stack }
    : { stack, pageBreak: 'before' }
}

function collectSheetElements(elementOrElements) {
  const list = Array.isArray(elementOrElements) ? elementOrElements : [elementOrElements]
  const sheets = []
  list.forEach((el) => {
    if (!el) return
    if (el.classList?.contains('csc-sheet-wrapper')) {
      sheets.push(el)
      return
    }
    const nested = el.querySelectorAll?.('.csc-sheet-wrapper')
    if (nested && nested.length > 0) {
      nested.forEach((sheet) => sheets.push(sheet))
    } else {
      sheets.push(el)
    }
  })
  return sheets
}

/**
 * Open a new browser tab synchronously before an async fetch so popup blockers allow it.
 */
export function openCscForm48PrintTab(title = 'Preparing CSC Form 48...') {
  return openPdfLoadingTab(title, 'Generating CSC Form No. 48 PDF...')
}

function openCscForm48PdfBlob({ sheetElements, title, fileName = 'csc-form-48.pdf', targetWindow = null }) {
  const sheets = collectSheetElements(sheetElements)
  if (sheets.length === 0) {
    if (targetWindow && !targetWindow.closed) {
      targetWindow.close()
    }
    window.print()
    return Promise.resolve()
  }

  const printWin = targetWindow && !targetWindow.closed ? targetWindow : openCscForm48PrintTab(title)

  const docDefinition = {
    pageSize: 'LETTER',
    pageOrientation: 'portrait',
    pageMargins: [24, 18, 24, 18],
    info: {
      title: String(title || 'CSC Form 48'),
    },
    defaultStyle: {
      fontSize: 7.8,
      lineHeight: 1.05,
      color: '#000000',
    },
    content: sheets.map((sheetEl, idx) => buildPdfSheetStack(sheetEl, idx === 0)),
  }

  const pdfDocument = pdfMake.createPdf(docDefinition)

  return pdfDocument
    .getBlob()
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob)

      if (printWin && !printWin.closed) {
        printWin.location.replace(objectUrl)
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
    .catch((err) => {
      if (printWin && !printWin.closed) {
        printWin.close()
      }
      throw err
    })
}

/**
 * Generate a real application/pdf Blob for a single CSC Form 48 container and open it in a new tab.
 */
export function printCscForm48({
  element,
  employeeName = 'Employee',
  periodLabel = '',
  targetWindow = null,
} = {}) {
  if (!element) {
    window.print()
    return Promise.resolve()
  }

  const titleSuffix = periodLabel ? ` (${periodLabel})` : ''
  const title = `CSC Form 48 - ${employeeName}${titleSuffix}`
  const safeFile = `${title}.pdf`.replace(/[\\/:*?"<>|]+/g, '_')

  return openCscForm48PdfBlob({
    sheetElements: element,
    title,
    fileName: safeFile,
    targetWindow,
  })
}

/**
 * Generate a real application/pdf Blob for multiple CSC Form 48 containers and open it in a new tab.
 */
export function printBatchCscForm48({
  elements = [],
  title = 'CSC Form 48 Batch',
  targetWindow = null,
} = {}) {
  const safeFile = `${title || 'CSC Form 48 Batch'}.pdf`.replace(/[\\/:*?"<>|]+/g, '_')
  return openCscForm48PdfBlob({
    sheetElements: elements,
    title,
    fileName: safeFile,
    targetWindow,
  })
}

