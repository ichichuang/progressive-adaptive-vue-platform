/** Read the main table's native geometry without creating a second layout authority. */
export function observePavpNaiveTableColumns(
  element: HTMLElement,
  onChange: (
    columns: readonly {
      readonly width: number
      readonly left: string
      readonly right: string
    }[],
  ) => void,
): () => void {
  function measure(): void {
    const cells = element.querySelectorAll<HTMLElement>('.n-data-table-thead th')
    if (!cells.length) return
    onChange(
      Array.from(cells, (cell) => ({
        width: cell.getBoundingClientRect().width,
        left: cell.style.left,
        right: cell.style.right,
      })),
    )
  }

  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(element)
  element.querySelectorAll('.n-data-table-thead th').forEach((cell) => {
    observer.observe(cell)
  })
  return () => {
    observer.disconnect()
  }
}
