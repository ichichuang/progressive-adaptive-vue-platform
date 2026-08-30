import type { HTMLAttributes } from 'vue'

export { type DropdownProps as PavpMenuDropdownProps } from 'naive-ui/es/dropdown'
export { NMenu as PavpMenuPrimitive, type MenuOption as PavpMenuOption } from 'naive-ui/es/menu'

import type { MenuNodeProps } from 'naive-ui/es/menu'

type PavpMenuHtmlNodeProps = (option: Parameters<MenuNodeProps>[0]) => HTMLAttributes

export function definePavpMenuNodeProps(nodeProps: PavpMenuHtmlNodeProps): MenuNodeProps {
  return nodeProps as MenuNodeProps
}
