import { resolve } from 'node:path'
import { createServer, normalizePath } from 'vite'
import { administrationModules } from '../../apps/web/src/app/administration/administration-routes'
import { accessLifecycleBrowserProbe } from './access-lifecycle-browser-probe'

const mode = process.argv.includes('--readonly')
  ? 'readonly'
  : process.argv.includes('--missing')
    ? 'missing'
    : process.argv.includes('--deny')
      ? 'deny'
      : 'editable'
const lifecycle = process.argv.includes('--lifecycle')
const port = lifecycle
  ? 41819
  : process.argv.includes('--public')
    ? 41815
    : { editable: 41814, readonly: 41816, missing: 41817, deny: 41818 }[mode]
const configFile = process.argv.includes('--public')
  ? 'apps/web/vite.config.ts'
  : 'apps/web/vite.administration.config.ts'
const fixtureFile = `/@fs/${normalizePath(resolve('scripts/verify/administration-browser-fixture.ts'))}`
const server = await createServer({
  root: resolve('apps/web'),
  configFile: resolve(configFile),
  configLoader: 'runner',
  cacheDir: `node_modules/.vite-administration-probe-${String(port)}`,
  server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  plugins: lifecycle
    ? [accessLifecycleBrowserProbe()]
    : process.argv.includes('--public')
      ? []
      : [
          {
            name: 'administration-fixture-host',
            enforce: 'pre',
            transform(source, id) {
              if (!id.endsWith('/src/main.ts')) return undefined
              const anchor = '  retainedAppearanceSafetyRestorationAuthority,\n)'
              if (source.split(anchor).length !== 2)
                throw new Error(
                  'Administration fixture could not find the host bootstrap boundary.',
                )
              return `import { createAdministrationFixture } from '${fixtureFile}'
const administrationFixture = createAdministrationFixture('${mode}')
${source.replace(anchor, '  retainedAppearanceSafetyRestorationAuthority,\n  administrationFixture.accessHost,\n)')}
const controls = document.createElement('div')
controls.style.cssText = 'position:fixed;z-index:99999;right:0;top:0'
for (const [label, run] of [
  ['Revoke workbench', administrationFixture.revoke],
  ['Deny parent only', administrationFixture.denyParent],
  ['Fail next save', administrationFixture.failNextSave],
  ['Conflict next save', administrationFixture.conflictNextSave],
  ['Confirm policy effectiveness', administrationFixture.confirmEffectiveness],
]) {
  const button = document.createElement('button')
  button.textContent = 'Fixture: ' + label
  button.addEventListener('click', run)
  controls.append(button)
}
document.body.append(controls)
`
            },
          },
        ],
})
await server.listen()
console.log(
  process.argv.includes('--public') ? 'Public assembly' : administrationModules.join(', '),
)
server.printUrls()
