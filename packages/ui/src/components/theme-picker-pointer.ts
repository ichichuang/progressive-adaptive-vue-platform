type ThemePickerPointer = Readonly<{ x: number; y: number }>

/** Only track the pointer while the theme picker is open, including across paint snapshots. */
export function trackThemePickerPointer(
  update: (point: ThemePickerPointer | undefined) => void,
): () => void {
  const remember = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') update({ x: event.clientX, y: event.clientY })
  }
  const leave = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' && event.relatedTarget === null) update(undefined)
  }
  document.addEventListener('pointermove', remember, { capture: true, passive: true })
  document.addEventListener('pointerdown', remember, { capture: true, passive: true })
  document.addEventListener('pointerout', leave, { capture: true, passive: true })
  return () => {
    document.removeEventListener('pointermove', remember, true)
    document.removeEventListener('pointerdown', remember, true)
    document.removeEventListener('pointerout', leave, true)
    update(undefined)
  }
}
