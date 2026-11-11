interface Bounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

// G2 copies plain option objects, but retains native/prototype-bearing values. Keep
// its supported bounding contract live after scroll, resize and layout movement.
class ViewportBounds implements Bounds {
  private readonly read: () => Bounds

  constructor(read: () => Bounds) {
    this.read = read
  }
  get x() {
    return this.read().x
  }
  get y() {
    return this.read().y
  }
  get width() {
    return this.read().width
  }
  get height() {
    return this.read().height
  }
}

/** The native HTML tooltip escapes the canvas and every ancestor scroll clip. */
export interface G2TooltipViewport {
  readonly mount: HTMLElement
  readonly bounding: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
}

export function createG2TooltipViewport(host: HTMLElement, mount: HTMLElement, hide: () => void) {
  const document = host.ownerDocument
  const window = document.defaultView
  if (!window) throw new Error('UiG2Chart requires a browser viewport.')
  let margin = 0
  const observer = new MutationObserver(constrain)
  const bounding = new ViewportBounds(() => {
    const bounds = viewport()
    const origin = host.getBoundingClientRect()
    return { ...bounds, x: bounds.x - origin.left, y: bounds.y - origin.top }
  })

  function viewport() {
    const visual = window?.visualViewport
    return {
      x: (visual?.offsetLeft ?? 0) + margin,
      y: (visual?.offsetTop ?? 0) + margin,
      width: Math.max(0, (visual?.width ?? document.documentElement.clientWidth) - margin * 2),
      height: Math.max(0, (visual?.height ?? document.documentElement.clientHeight) - margin * 2),
    }
  }

  function constrain(): void {
    const bounds = viewport()
    // G2 only flips once. A popup wider than either side of the pointer still needs
    // a final viewport clamp. Read its destination, not its animated intermediate rect.
    for (const tooltip of mount.querySelectorAll<HTMLElement>('.g2-tooltip')) {
      const left = Number.parseFloat(tooltip.style.left)
      const top = Number.parseFloat(tooltip.style.top)
      if (!Number.isFinite(left) || !Number.isFinite(top)) continue
      const x = Math.max(bounds.x, Math.min(left, bounds.x + bounds.width - tooltip.offsetWidth))
      const y = Math.max(bounds.y, Math.min(top, bounds.y + bounds.height - tooltip.offsetHeight))
      if (x !== left) tooltip.style.left = `${String(x)}px`
      if (y !== top) tooltip.style.top = `${String(y)}px`
    }
  }

  function invalidate(event: Event): void {
    // Local tooltip scrolling must not dismiss its own content.
    if (event.target instanceof Node && mount.contains(event.target)) return
    constrain()
    hide()
  }

  observer.observe(mount, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style'],
  })
  document.addEventListener('scroll', invalidate, true)
  window.addEventListener('resize', invalidate)
  window.visualViewport?.addEventListener('resize', invalidate)
  window.visualViewport?.addEventListener('scroll', invalidate)

  return {
    options(spacing: number): G2TooltipViewport {
      margin = spacing * 2
      return { mount, bounding }
    },
    constrain,
    destroy(): void {
      observer.disconnect()
      document.removeEventListener('scroll', invalidate, true)
      window.removeEventListener('resize', invalidate)
      window.visualViewport?.removeEventListener('resize', invalidate)
      window.visualViewport?.removeEventListener('scroll', invalidate)
      mount.replaceChildren()
    },
  }
}
