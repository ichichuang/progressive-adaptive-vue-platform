export const themePickerSelector = '.pavp-admin-shell__theme-picker-popover'

/** A passive copy of the painted application, isolated from live IDs, forms and theme selectors. */
export function captureAppearanceScene(surface: HTMLElement) {
  const app = surface.closest<HTMLElement>('#app')
  if (!app) return undefined
  const root = document.documentElement.cloneNode(false)
  const body = document.body.cloneNode(false)
  const content = app.cloneNode(false) as HTMLElement
  content.classList.add('pavp-appearance-page')
  for (const child of app.children) {
    if (child !== surface) content.append(child.cloneNode(true))
  }
  // Embedded browsing contexts and media must not start a second application or playback.
  for (const embed of content.querySelectorAll('script, iframe, object, embed, audio, video')) {
    embed.remove()
  }
  // The live picker stays interactive above the reveal, including while it opens or closes.
  for (const popup of content.querySelectorAll(themePickerSelector)) {
    popup.remove()
  }
  const scrollSelector = '.pavp-scroll-area__viewport, textarea'
  const offsets = Array.from(
    app.querySelectorAll(scrollSelector),
    (node) => [node.scrollLeft, node.scrollTop] as const,
  )
  const canvases = content.querySelectorAll('canvas')
  app.querySelectorAll('canvas').forEach((live, index) => {
    if (live.width && live.height) canvases[index]?.getContext('2d')?.drawImage(live, 0, 0)
  })
  const scrollX = window.scrollX
  const scrollY = window.scrollY
  return (frame: HTMLIFrameElement): HTMLElement => {
    const doc = frame.contentDocument
    if (!doc) throw new Error('The appearance scene is unavailable.')
    const html = doc.importNode(root, false) as HTMLElement
    // Keep the existing, parsed stylesheets when the same scene opens on the new state.
    const head = doc.head
    if (!head.hasChildNodes()) {
      for (const sheet of document.styleSheets) {
        if (sheet.disabled) continue
        if (sheet.ownerNode instanceof HTMLStyleElement && sheet.ownerNode.textContent) {
          head.append(doc.importNode(sheet.ownerNode, true))
        } else {
          const style = doc.createElement('style')
          style.media = sheet.media.mediaText
          for (const rule of sheet.cssRules) style.append(rule.cssText)
          head.append(style)
        }
      }
    }
    const page = doc.importNode(body, false) as HTMLElement
    page.append(content)
    html.append(head, page)
    doc.replaceChild(html, doc.documentElement)
    content.querySelectorAll(scrollSelector).forEach((node, index) => {
      const offset = offsets[index]
      if (offset && (offset[0] || offset[1])) {
        node.scrollLeft = offset[0]
        node.scrollTop = offset[1]
      }
    })
    if (scrollX || scrollY) doc.defaultView?.scrollTo(scrollX, scrollY)
    return content
  }
}

export function mountAppearanceScene(surface: HTMLElement): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.className = 'pavp-appearance-scene'
  frame.setAttribute('sandbox', 'allow-same-origin')
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.inert = true
  surface.append(frame)
  return frame
}

/** Expose the live picker through the passive reveal so its input and paint stay together. */
export function trackAppearancePicker(surface: HTMLElement, signal: AbortSignal): void {
  const overlays = document.getElementById('pavp-overlay-root')
  if (!overlays) return
  let frame = 0
  function clearOpening(): void {
    surface.style.clipPath = ''
  }
  function sync(): void {
    frame = 0
    const popup = overlays?.querySelector<HTMLElement>(themePickerSelector)
    const box = popup?.getBoundingClientRect()
    if (!popup || !box?.width || !box.height) {
      clearOpening()
      return
    }
    const { left, top, right, bottom, width, height } = box
    const radius = Math.min(
      parseFloat(getComputedStyle(popup).borderTopLeftRadius) || 0,
      width / 2,
      height / 2,
    )
    const viewport = `M0 0 H${String(window.innerWidth)} V${String(window.innerHeight)} H0 Z`
    const point = (x: number, y: number) => `${String(x)} ${String(y)}`
    const opening = [
      `M${point(left + radius, top)} H${String(right - radius)}`,
      `Q${point(right, top)} ${point(right, top + radius)} V${String(bottom - radius)}`,
      `Q${point(right, bottom)} ${point(right - radius, bottom)} H${String(left + radius)}`,
      `Q${point(left, bottom)} ${point(left, bottom - radius)} V${String(top + radius)}`,
      `Q${point(left, top)} ${point(left + radius, top)} Z`,
    ].join(' ')
    surface.style.clipPath = `path(evenodd, "${viewport} ${opening}")`
    if (popup.getAnimations().some((animation) => animation.playState === 'running')) queue()
  }
  function queue(): void {
    if (!frame) frame = requestAnimationFrame(sync)
  }
  const observer = new MutationObserver(queue)
  observer.observe(overlays, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
  sync()
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      clearOpening()
    },
    { once: true },
  )
}
