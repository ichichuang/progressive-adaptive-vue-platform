let active: symbol | undefined
/** One owned print projection; never changes or removes application nodes. */
export function createReportPrintSession(host: HTMLElement, browser: Window = window) {
  const owner = Symbol('report-print')
  const body = host.ownerDocument.body
  let disposed = false
  function finish() {
    if (active !== owner) return
    host.removeAttribute('data-report-print-active')
    body.removeAttribute('data-report-printing')
    browser.removeEventListener('afterprint', finish)
    active = undefined
  }
  return {
    print() {
      if (disposed || active !== undefined) throw new Error('Report printing is unavailable.')
      active = owner
      body.setAttribute('data-report-printing', '')
      host.setAttribute('data-report-print-active', '')
      browser.addEventListener('afterprint', finish)
      try {
        browser.print()
      } catch (error) {
        finish()
        throw error
      }
    },
    dispose() {
      disposed = true
      finish()
    },
  }
}
