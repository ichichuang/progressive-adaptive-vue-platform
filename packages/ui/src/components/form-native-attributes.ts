/** Native presentation attributes only; never an open vendor-props forwarding bag. */
export function formNativeAttributes(attrs: Readonly<Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(attrs).filter(
      ([name]) =>
        ['class', 'style', 'id', 'title', 'lang', 'dir', 'autocomplete', 'name'].includes(name) ||
        name.startsWith('aria-') ||
        name.startsWith('data-'),
    ),
  )
}
