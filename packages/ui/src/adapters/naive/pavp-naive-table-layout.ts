/** Read the main table's native geometry without creating a second layout authority. */
export function observePavpNaiveTableColumns(
  element: HTMLElement,
  columns: readonly { readonly key?: string | number; readonly type?: string }[],
  onChange: (
    columns: readonly {
      readonly width: number
      readonly left: string
      readonly right: string
    }[],
  ) => void,
): () => void {
  function measure(): void {
    const headers = Array.from(element.querySelectorAll<HTMLElement>('.n-data-table-thead th'))
    const cells = columns.flatMap((column) => {
      const key = column.type === 'selection' ? '__n_selection__' : String(column.key)
      const cell = headers.find((header) => header.dataset['colKey'] === key)
      return cell ? [cell] : []
    })
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
