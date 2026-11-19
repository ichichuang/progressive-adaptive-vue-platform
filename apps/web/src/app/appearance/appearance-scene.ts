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

/** A picker opened or dismissed during a reveal must be visible exactly where it accepts input. */
export function trackAppearancePicker(surface: HTMLElement, signal: AbortSignal): () => void {
  const overlays = document.getElementById('pavp-overlay-root')
  if (!overlays) return () => undefined
  const following = new WeakSet<Element>()
  const picker = (root: ParentNode) =>
    root.querySelector('[data-pavp-quick-theme]')?.closest('[role="dialog"]')
  const visible = (dialog: Element | null | undefined) => Boolean(dialog?.getClientRects().length)
  let motionFrame: number | undefined
  const sync = (updateHost = true) => {
    const liveDialog = picker(overlays)
    const entering = liveDialog?.querySelector<HTMLElement>(':scope > div')
    for (const frame of surface.querySelectorAll('iframe')) {
      const doc = frame.contentDocument
      if (!doc) continue
      let paintedDialog = picker(doc)
      const id = (liveDialog ?? paintedDialog)?.closest('#pavp-overlay-root > [id]')?.id
      if (!id) continue
      const paintedHost = doc.getElementById(id)
      const liveHost = document.getElementById(id)
      if (!paintedHost || !liveHost) continue
      if (
        updateHost &&
        (following.has(paintedHost) || visible(liveDialog) !== visible(paintedDialog))
      ) {
        // Keep existing old/new colors until the user actually changes the open state.
        following.add(paintedHost)
        paintedHost.replaceChildren(
          ...Array.from(liveHost.children, (node) => doc.importNode(node, true)),
        )
        paintedDialog = picker(paintedHost)
      }
      const painted = paintedDialog?.querySelector<HTMLElement>(':scope > div')
      // cloneNode copies the entrance's inline opacity of zero, but not Motion's running animation.
      if (painted && entering) {
        const pose = getComputedStyle(entering)
        painted.style.opacity = pose.opacity
        painted.style.transform = pose.transform
      }
    }
    if (
      motionFrame === undefined &&
      entering?.getAnimations().some((a) => a.playState === 'running')
    ) {
      motionFrame = requestAnimationFrame(() => {
        motionFrame = undefined
        sync(false)
      })
    }
  }
  const observer = new MutationObserver(() => {
    sync()
  })
  observer.observe(overlays, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
  signal.addEventListener(
    'abort',
    () => {
      observer.disconnect()
      if (motionFrame !== undefined) cancelAnimationFrame(motionFrame)
    },
    { once: true },
  )
  return sync
}
