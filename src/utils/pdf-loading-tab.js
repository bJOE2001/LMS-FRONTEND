function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Open a new browser tab immediately inside the user click gesture and render a
 * centered loading bar while the PDF document is being generated asynchronously.
 */
export function openPdfLoadingTab(title = 'Preparing PDF...', message = 'Generating PDF...') {
  const printWin = window.open('', '_blank')
  if (!printWin) return null

  try {
    const safeTitle = escapeHtml(title)
    const safeMessage = escapeHtml(message)
    printWin.document.open()
    printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        color: #1e293b;
        font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      }
      .loader-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 24px;
      }
      .progress-track {
        width: 240px;
        height: 5px;
        background: #cbd5e1;
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 14px;
        position: relative;
      }
      .progress-bar {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 42%;
        background: #2e7d32;
        border-radius: 999px;
        animation: pdfSlide 1.25s ease-in-out infinite;
      }
      .loader-text {
        font-size: 14px;
        font-weight: 500;
        color: #1e293b;
      }
      @keyframes pdfSlide {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(260%);
        }
      }
    </style>
  </head>
  <body>
    <div class="loader-wrap">
      <div class="progress-track">
        <div class="progress-bar"></div>
      </div>
      <div class="loader-text">${safeMessage}</div>
    </div>
  </body>
</html>`)
    printWin.document.close()
  } catch {
    // Ignore cross-window write errors and let caller fall back cleanly
  }

  return printWin
}
