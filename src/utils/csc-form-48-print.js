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

export const CSC_FORM_48_PRINT_STYLES = `
  @page {
    size: portrait;
    margin: 5mm 6mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  }
  .no-print {
    display: none !important;
  }
  .text-center {
    text-align: center;
  }
  .text-weight-bold {
    font-weight: 700;
  }
  .text-uppercase {
    text-transform: uppercase;
  }
  .text-caption {
    font-size: 7.5pt;
  }
  .font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .row {
    display: flex;
    flex-direction: row;
  }
  .items-center {
    align-items: center;
  }
  .justify-between {
    justify-content: space-between;
  }
  .q-mt-xs {
    margin-top: 4px;
  }
  .csc-sheet-wrapper {
    background: #ffffff;
    padding: 0;
    margin: 0 auto;
    width: 100%;
    max-width: 920px;
  }
  .csc-sheet-wrapper.has-page-break {
    page-break-after: always;
    break-after: page;
  }
  .dtr-dual-page-sheet {
    width: 100%;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    color: #000000;
    background: #ffffff;
    page-break-inside: avoid;
  }
  .csc-header-band,
  .csc-footer-band {
    display: flex;
    flex-direction: row;
    width: 100%;
    align-items: flex-end;
  }
  .csc-panel-col {
    width: 48%;
    flex: 0 0 48%;
  }
  .csc-panel-gutter {
    width: 4%;
    flex: 0 0 4%;
  }
  .csc-top-tag {
    font-size: 8.5pt;
    color: #000000;
    line-height: 1.1;
    margin-bottom: 4px;
  }
  .csc-main-title {
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.4px;
    line-height: 1.2;
  }
  .csc-identity-band {
    margin-top: 12px;
  }
  .csc-name-underline {
    width: 94%;
    margin: 0 auto;
    border-bottom: 1px solid #000000;
    padding-bottom: 2px;
    font-size: 10.5pt;
    font-weight: 700;
    line-height: 1.2;
    min-height: 18px;
  }
  .csc-charges-underline {
    width: 94%;
    margin: 0 auto;
    border-bottom: 1px solid #000000;
    padding-bottom: 2px;
    font-size: 8pt;
    font-weight: 400;
    text-transform: uppercase;
    line-height: 1.2;
    min-height: 18px;
  }
  .csc-sub-label {
    font-size: 7.5pt;
    letter-spacing: 0.5px;
    color: #000000;
    margin-top: 2px;
  }
  .csc-meta-band {
    margin-top: 6px;
    margin-bottom: 2px;
    align-items: flex-start;
  }
  .csc-meta-line {
    font-size: 8pt;
    line-height: 1.3;
  }
  .csc-period-underline {
    display: inline-block;
    border-bottom: 1px solid #000000;
    font-weight: 700;
    line-height: 1.05;
    padding: 0 12px 1px;
    margin-left: 2px;
  }
  .csc-hours-statement {
    font-size: 8pt;
    line-height: 1.35;
    margin-top: 1px;
  }
  .csc-hours-subline {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }
  .csc-inline-rule {
    display: inline-block;
    width: 72px;
    border-bottom: 1px solid #000000;
    margin-left: 3px;
    transform: translateY(1px);
  }
  .csc-prn-col {
    padding-top: 14px;
  }
  .csc-prn-line {
    font-size: 8pt;
    line-height: 1.35;
    padding-left: 14px;
  }
  .csc-prn-underline {
    display: inline-block;
    width: 240px;
    border-bottom: 1px solid #000000;
    margin-left: 4px;
    line-height: 1.05;
    transform: translateY(1px);
  }
  .csc-master-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    table-layout: fixed;
  }
  .col-date {
    width: 4.8%;
  }
  .col-punch {
    width: 10.8%;
  }
  .col-gutter {
    width: 4%;
  }
  .col-workload {
    width: 38.4%;
  }
  .col-quantity {
    width: 9.6%;
  }
  .csc-master-table th,
  .csc-master-table td {
    padding: 0 2px;
    height: 18px;
    text-align: center;
    vertical-align: middle;
  }
  .tr-am-pm th {
    height: 15px;
    border: none !important;
    background: transparent !important;
    font-size: 7.5pt;
    font-weight: 700;
    padding-bottom: 1px;
  }
  .tr-col-headers .th-boxed {
    height: 20px;
    background: #ffffff;
    color: #000000;
    font-weight: 700;
    font-size: 7pt;
    letter-spacing: -0.1px;
    border: 1px solid #000000;
  }
  .csc-master-table tbody td {
    border: 1px solid #000000;
  }
  .th-gutter,
  .td-gutter {
    border: none !important;
    background: #ffffff !important;
    padding: 0 !important;
  }
  .td-date {
    font-weight: 400;
    font-size: 8pt;
  }
  .td-date-weekend {
    font-weight: 700;
  }
  .td-time {
    font-size: 8pt;
    font-weight: 400;
    font-family: Arial, sans-serif;
  }
  .td-dash {
    color: #333333;
    font-size: 8pt;
    font-weight: 400;
  }
  .td-x {
    color: #555555;
    font-size: 7.5pt;
    font-weight: 400;
  }
  .td-merged-status {
    font-weight: 400;
    font-size: 8pt;
    text-transform: uppercase;
  }
  .td-spaced-day {
    letter-spacing: 3px;
    font-weight: 400;
    font-size: 8pt;
  }
  .td-absent {
    letter-spacing: 0.5px;
    font-weight: 400;
    font-size: 8pt;
  }
  .td-workload {
    text-align: center;
    font-size: 7.5pt;
    font-weight: 400;
    padding: 0 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .workload-text-span {
    display: inline-block;
    white-space: nowrap;
  }
  .td-quantity {
    font-size: 8pt;
  }
  .csc-barcode-wrap {
    width: 88%;
    margin: 2px auto 2px;
    text-align: center;
  }
  .csc-cert-statement {
    font-size: 7pt;
    line-height: 1.2;
    text-align: left;
    text-indent: 18px;
  }
  .csc-verify-band {
    margin-top: 18px;
    align-items: flex-start;
  }
  .csc-sig-line {
    border-bottom: 1px solid #000000;
    width: 92%;
    margin: 0 auto 2px;
  }
  .csc-sig-caption {
    font-size: 7.5pt;
    line-height: 1.2;
  }
  .csc-incharge-band {
    margin-top: 18px;
    align-items: flex-end;
  }
  .csc-sig-name {
    font-size: 8.5pt;
    font-weight: 700;
    line-height: 1.2;
  }
  .csc-sig-title {
    font-size: 8pt;
    font-weight: 400;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .csc-incharge-line {
    margin-top: 2px;
  }
  .csc-sig-sub {
    font-size: 7.5pt;
    line-height: 1.2;
  }
  .csc-summary-band {
    margin-top: 2px;
  }
  .csc-summary-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 7.5pt;
    gap: 64px;
  }
`

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

/**
 * Print the rendered CSC Form 48 container inside an isolated offscreen iframe.
 */
export function printCscForm48({ element, employeeName = 'Employee', periodLabel = '' } = {}) {
  if (!element) {
    window.print()
    return
  }

  const existingFrame = document.getElementById('csc-form-48-print-iframe')
  if (existingFrame) {
    existingFrame.remove()
  }

  const iframe = document.createElement('iframe')
  iframe.id = 'csc-form-48-print-iframe'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    window.print()
    return
  }

  const titleSuffix = periodLabel ? ` (${periodLabel})` : ''
  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CSC Form 48 - ${employeeName}${titleSuffix}</title>
    <style>${CSC_FORM_48_PRINT_STYLES}</style>
  </head>
  <body>
    ${element.innerHTML}
  </body>
</html>`)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }, 150)
}

/**
 * Print multiple rendered CSC Form 48 containers inside an isolated offscreen iframe.
 */
export function printBatchCscForm48({ elements = [], htmlContent = '', title = 'CSC Form 48 Batch' } = {}) {
  const existingFrame = document.getElementById('csc-form-48-print-iframe')
  if (existingFrame) {
    existingFrame.remove()
  }

  const iframe = document.createElement('iframe')
  iframe.id = 'csc-form-48-print-iframe'
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    window.print()
    return
  }

  let bodyHtml = htmlContent
  if (!bodyHtml && elements.length > 0) {
    bodyHtml = elements
      .map((el, idx) => {
        const isLast = idx === elements.length - 1
        const breakClass = isLast ? '' : 'has-page-break'
        return `<div class="csc-sheet-wrapper ${breakClass}">${el.innerHTML}</div>`
      })
      .join('\n')
  }

  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${CSC_FORM_48_PRINT_STYLES}</style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  }, 200)
}

