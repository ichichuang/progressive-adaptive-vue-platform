import messages from './messages/zh-CN/common.json'
import type { ConsoleCommonMessageKey } from './message-schema'

export function getDefaultConsoleMessage(key: ConsoleCommonMessageKey): string {
  return messages[key]
}
