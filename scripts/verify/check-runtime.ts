import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { projectConfig } from '../../project.config'

export const runtimePreflightAuthority = {
  node: projectConfig.runtime.node,
  pnpm: projectConfig.runtime.pnpm,
} as const

function currentPnpmVersion(): string | undefined {
  const userAgent = process.env['npm_config_user_agent']
  return userAgent === undefined ? undefined : /^pnpm\/([^\s]+)(?:\s|$)/u.exec(userAgent)?.[1]
}

function validateRuntime(): void {
  const receivedNode = process.versions.node
  const receivedPnpm = currentPnpmVersion()

  if (
    receivedNode !== runtimePreflightAuthority.node ||
    receivedPnpm !== runtimePreflightAuthority.pnpm
  ) {
    throw new Error(
      `Runtime preflight failed: required Node=${runtimePreflightAuthority.node}, received Node=${receivedNode}; required pnpm=${runtimePreflightAuthority.pnpm}, received pnpm=${receivedPnpm ?? 'unavailable'}.`,
    )
  }

  console.log(
    `Runtime preflight: Node ${runtimePreflightAuthority.node}; pnpm ${runtimePreflightAuthority.pnpm}`,
  )
}

const entryPath = process.argv[1]

if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  validateRuntime()
}
