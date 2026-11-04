const navigationKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'Enter',
  ' ',
  'ContextMenu',
])

export function installKeyboardFocusPolicy(host: Window): () => void {
  let keyboardInput = false
  const capture = { capture: true }

  function handleKeyboard(event: KeyboardEvent): void {
    if (event.type === 'keydown') keyboardInput = true
    const target = event
      .composedPath()
      .find(
        (item): item is HTMLElement | SVGElement =>
          item instanceof HTMLElement || item instanceof SVGElement,
      )
    const editing =
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable) ||
      (target instanceof HTMLInputElement &&
        ![
          'button',
          'checkbox',
          'color',
          'file',
          'hidden',
          'image',
          'radio',
          'range',
          'reset',
          'submit',
        ].includes(target.type))
    // A cancelled Tab must not turn the last pointer-focused control into :focus-visible.
    if (keyboardInput && !editing) target?.blur()
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const control = target?.closest(
      'a[href], button, input, select, summary, [tabindex], [role="button"], [role="tab"], [role="menu"], [role="menuitem"], [role="radio"], [role="switch"]',
    )

    if (
      event.key === 'Tab' ||
      (!editing &&
        control !== null &&
        control !== undefined &&
        (navigationKeys.has(event.key) || (event.shiftKey && event.key === 'F10')))
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
    } else if (editing && navigationKeys.has(event.key)) {
      // Keep native text editing while preventing composite widgets from navigating options.
      event.stopImmediatePropagation()
    }
  }

  function handlePointer(): void {
    keyboardInput = false
  }

  function handleFocus(event: FocusEvent): void {
    // Also reject vendor/programmatic focus transfers initiated by a keyboard event.
    if (
      keyboardInput &&
      (event.target instanceof HTMLElement || event.target instanceof SVGElement)
    )
      event.target.blur()
  }

  host.addEventListener('keydown', handleKeyboard, capture)
  host.addEventListener('keyup', handleKeyboard, capture)
  host.addEventListener('pointerdown', handlePointer, capture)
  host.addEventListener('focusin', handleFocus, capture)

  return () => {
    host.removeEventListener('keydown', handleKeyboard, capture)
    host.removeEventListener('keyup', handleKeyboard, capture)
    host.removeEventListener('pointerdown', handlePointer, capture)
    host.removeEventListener('focusin', handleFocus, capture)
  }
}
