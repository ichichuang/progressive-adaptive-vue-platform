import { resolve } from 'node:path'
import { createServer } from 'vite'

const probeModule = 'virtual:pavp-controlled-form-probe'
const probeSource = String.raw`
import { h, ref, watch } from 'vue'
import { z } from 'zod'
import { UiForm, UiProvider, UiScrollArea } from '@platform/ui'
import { useConsoleI18n } from '/src/shared/i18n/index.ts'
import { useAppearanceReadBoundary } from '/src/app/appearance/appearance-read-boundary.ts'
import { useGuardedForm } from '/src/app/forms/use-guarded-form.ts'
import { useFormDraft } from '/src/app/forms/use-form-draft.ts'
import { useAccessBoundary } from '/src/app/access/access-boundary.ts'
import { createScopedApiRead } from '/src/app/api/scoped-api-read.ts'
import { createApiClient } from '/src/shared/api/index.ts'
import { createNativeGrantProvider } from '/src/app/access/native-grants.ts'

const domain = 'controlled-form-fixture'
const resource = 'profile'
const identity = { kind: 'known', principalId: 'form-fixture-principal' }
const scope = [{ kind: 'team', id: 'form-fixture-scope' }]
const allScopes = { kind: 'global' }
const record = (recordId, action) => ({ kind: 'record', domain, resource, action, recordId })
const field = (recordId, fieldPath, action) => ({ ...record(recordId, action), kind: 'field', fieldPath })
const native = (request) => ({ operator: 'all', scope: allScopes, requests: [request] })
const writes = new Set(['name', 'profile.label', 'key', 'custom', 'dependent'])
const reads = new Set(['name', 'profile.label', 'profile.owner', 'custom', 'dependent'])
const fields = Object.fromEntries([...new Set([...reads, ...writes])].map((name) => [
  name,
  { edit: {
    ...(reads.has(name) ? { read: 'read-field' } : {}),
    ...(writes.has(name) ? { write: 'write-field' } : {}),
  } },
]))
fields.name.create = { write: 'create-field' }
const ids = ['first', 'second', 'reserved']
const grants = ids.flatMap((id) => [
  record(id, 'read'), record(id, 'save'),
  ...[...reads].map((path) => field(id, path, 'read-field')),
  ...[...writes].map((path) => field(id, path, 'write-field')),
  ...(id === 'reserved' ? [field(id, 'name', 'create-field')] : []),
])
const capabilities = [...new Map(grants.map(({ kind, resource, action }) => [
  [kind, resource, action].join(':'), { kind, resource, action },
])).values()]
const provider = createNativeGrantProvider(domain, capabilities, {
  complete: true, revision: 'fixture-policy', roles: [],
  subjects: [{ identity, roles: [], groups: [],
    grants: grants.map((request) => ({ effect: 'allow', scope: allScopes, request })),
  }],
})
let fieldReadRevoked = false
let fieldWriteRevoked = false
let notify
export const accessHost = {
  resolveContext() { return { identity, scope } },
  decisions: [{
    ...provider,
    evaluate(binding) {
      const request = binding.request
      if (request.kind === 'field' && request.fieldPath === 'name' &&
          ((request.action === 'read-field' && fieldReadRevoked) ||
          (request.action === 'write-field' && fieldWriteRevoked))) return { status: 'deny' }
      return provider.evaluate(binding)
    },
  }],
  subscribe(listener) { notify = listener; return () => { notify = undefined } },
}
const schema = { fields: [
  { kind: 'text', name: 'name', label: 'Profile name', required: true },
  { kind: 'group', name: 'profile', label: 'Profile', fields: [
    { kind: 'text', name: 'label', label: 'Public label' },
    { kind: 'text', name: 'owner', label: 'Confirmed owner' },
    { kind: 'text', name: 'undisclosed', label: 'Undisclosed', defaultValue: 'fixture default that must not appear' },
  ] },
  { kind: 'text', name: 'key', label: 'Replacement key', required: true },
  { kind: 'custom', name: 'custom', label: 'Custom binding' },
  { kind: 'text', name: 'dependent', label: 'Dependent field', hidden: { field: 'key', operator: 'empty' } },
  { kind: 'repeat', name: 'rows', label: 'Private collection', fields: [
    { kind: 'text', name: 'label', label: 'Row label' },
  ] },
] }
const base = { policy: 'standard', authentication: 'provided' }
const readEndpoint = { ...base, id: 'controlled-form-read', method: 'GET', path: ['record'],
  response: { mode: 'json', mimeTypes: ['application/json'], schema: z.object({
    id: z.string(), values: z.record(z.string(), z.json()),
  }) },
}
const writeEndpoint = { ...base, id: 'controlled-form-submit', method: 'PATCH', path: ['record'],
  response: { mode: 'json', mimeTypes: ['application/json'], schema: z.literal('acknowledged') },
}
export function probeApp(App) {
  if (location.pathname !== '/') return App
  return { setup() {
    const appearance = useAppearanceReadBoundary()
    const { locale } = useConsoleI18n()
    const copy = {
      submit: () => 'Submit controlled form', reset: () => 'Reset controlled form',
      required: () => 'Required field', empty: () => 'Empty',
      validating: () => 'Validating', submitting: () => 'Submitting',
      submitSucceeded: () => 'Saved', submitFailed: () => 'Submission failed',
      validationUnavailable: () => 'Operation validation unavailable',
      inputIncomplete: () => 'Incomplete input', errorSummary: () => 'Validation errors',
      invalidValue: () => 'Invalid value',
    }
    const access = useAccessBoundary()
    const id = ref('first')
    const mode = ref('edit')
    const narrow = ref(false)
    const count = ref(0)
    const payloadStatus = ref('No command')
    const validationStatus = ref('Idle')
    const delayValidation = ref(false)
    let releaseValidation
    const client = createApiClient({
      configuration: { status: 'configured', baseUrl: 'https://example.test/' },
      authorize: async () => ({ headers: {}, credentials: 'omit' }),
      async fetch(url, options) {
        const recordId = url.searchParams.get('id')
        if (options.method === 'PATCH') {
          const body = JSON.parse(String(options.body))
          count.value += 1
          payloadStatus.value = (
            body.profile?.label === 'Updated label' &&
            !Object.hasOwn(body.profile, 'owner') && !Object.hasOwn(body.profile, 'undisclosed') &&
            !Object.hasOwn(body, 'key') &&
            url.searchParams.get('revision') === 'fixture-revision' &&
            url.searchParams.get('scope') === scope[0].id
          ) ? 'Exact nested patch and command metadata' :
            Object.keys(body).join(',') === 'key' ? 'Fresh key patch' : Object.keys(body).join(',')
          return Response.json('acknowledged')
        }
        return Response.json({ id: recordId, values: {
          name: recordId === 'first' ? 'Confirmed name' : 'Second confirmed name',
          profile: { label: 'Original label', owner: 'Readonly owner', undisclosed: 'fixture restricted sibling' },
          key: 'fixture confidential original key', custom: 'Custom initial',
          dependent: 'fixture protected derived label', rows: [{ label: 'fixture confidential row' }],
        } })
      },
    })
    const read = createScopedApiRead(access, {
      client, requirement: (query) => native(record(query.id, 'read')),
      plan({ query }) { return { status: 'ready', endpoint: readEndpoint, input: { query } } },
    })
    const guarded = useGuardedForm({
      form: { formId: 'controlled-form-fixture', schema, copy },
      access, source: { domain, resource, scope: allScopes, selection: 'all', fields },
      target: () => ({ id: id.value, mode: mode.value, revision: 'fixture-revision', idempotencyKey: 'fixture-' + id.value }),
      recordRead: (target) => native(record(target.id, 'read')),
      recordWrite: (target) => native(record(target.id, 'save')),
      confirmed(target) {
        const state = read.state.value
        if (state.status !== 'ready' || state.data.id !== target.id) return
        return { receipt: state.requestId, values: state.data.values, isCurrent: () => read.isCurrent(state.requestId) }
      },
      customFields: ['custom'],
      async validate() {
        if (delayValidation.value) {
          await new Promise((resolve) => {
            releaseValidation = resolve
            validationStatus.value = 'Waiting for validation'
          })
          delayValidation.value = false
          validationStatus.value = 'Validation released'
        }
        return 'valid'
      },
      action(_patch, payload) {
        return {
          isTargetCurrent: (target) => target.id === id.value,
          businessAllows: () => true,
          async dispatch(commands, signal) {
            const command = commands[0]
            const result = await client.request(writeEndpoint, {
              signal, isDispatchCurrent: command.isCurrent, body: { kind: 'json', value: payload },
              query: { id: command.target.id, revision: command.target.revision, scope: command.context.scope[0].id },
            })
            return [{ requestId: command.requestId, targetId: command.target.id,
              ...(result.status === 'success' ? { status: 'completed', value: result.data } : { status: 'failed' }),
            }]
          },
        }
      },
    })
    watch(() => [id.value, mode.value, access.readContext().status], () => {
      if (access.readContext().status === 'ready' && mode.value !== 'create') void read.run({ id: id.value })
      else read.clear()
    }, { immediate: true })
    let storageBlocked = false
    try {
      useFormDraft({ form: guarded.form, scope: 'controlled-form-fixture', maxAgeMs: 10000,
        includeFields: ['key'], enabled: () => true, automatic: true })
    } catch (error) {
      storageBlocked = error.message === 'Controlled forms cannot use unpartitioned draft storage.'
    }
    function invalidate(action) {
      return notify?.({
        kind: 'field', domain, resource, recordId: id.value, fieldPath: 'name', action,
      })
    }
    const actions = {
      'Toggle narrow form': () => { narrow.value = !narrow.value },
      'Revoke name write': () => { fieldWriteRevoked = true; return invalidate('write-field') },
      'Restore name write': () => { fieldWriteRevoked = false; return invalidate('write-field') },
      'Revoke name read': () => { fieldReadRevoked = true; return invalidate('read-field') },
      'Restore name read': () => { fieldReadRevoked = false; return invalidate('read-field') },
      'Load fresh record': () => read.run({ id: id.value }),
      'Delay next validation': () => { delayValidation.value = true },
      'Release validation': () => releaseValidation?.(),
      'Open second target': () => { id.value = 'second' },
      'Open creation candidate': () => { mode.value = 'create'; id.value = 'reserved' },
      'Clear scoped result': () => read.clear(),
    }
    return () => h(UiProvider, { appearance: appearance.snapshot.value, locale: locale.value }, {
      default: () => h('main', { 'aria-label': 'WP-06 form fixture', style: 'display:grid;gap:12px;padding:16px;' + (narrow.value ? 'max-width:390px;' : '') }, [
        h('div', { style: 'display:flex; flex-wrap:wrap; gap:8px' },
          Object.entries(actions).map(([label, run]) => h('button', { type: 'button', onClick: run }, label))),
        h('output', { 'aria-label': 'Probe result' },
          'Dispatches: ' + count.value + ' · ' + payloadStatus.value + ' · ' + validationStatus.value +
          ' · Storage blocked: ' + storageBlocked + ' · Repeat: ' + guarded.fieldStatus('rows', 'write')),
        h(UiScrollArea, { ownerId: 'fixture-field-scroll', style: 'height: min(58vh, 440px)', contained: true }, {
          default: () => h(UiForm, { form: guarded.form }, {
            field: (binding) => h('input', {
              id: binding.controlId, value: binding.value, 'aria-labelledby': binding.labelId,
              disabled: binding.disabled,
              onInput: (event) => binding.setValue(event.target.value),
              onBlur: binding.blur,
              ref: (element) => binding.setFocusTarget(element ? () => element.focus() : null),
            }),
          }),
        }),
      ]),
    })
  } }
}
`

export async function serveControlledFormBrowserProbe(): Promise<void> {
  const server = await createServer({
    root: resolve('apps/web'),
    configFile: resolve('apps/web/vite.config.ts'),
    configLoader: 'runner',
    cacheDir: 'node_modules/.vite-controlled-form-probe',
    server: { host: '127.0.0.1', port: 41801, strictPort: true },
    plugins: [
      {
        name: 'pavp-controlled-form-probe',
        enforce: 'pre',
        resolveId: (id) => (id === probeModule ? '\0' + id : undefined),
        load: (id) => (id === '\0' + probeModule ? probeSource : undefined),
        transform(source, id) {
          if (!id.endsWith('/src/main.ts')) return undefined
          const appStart = 'startRuntimeKernel(\n  App,'
          const appEnd = '  retainedAppearanceSafetyRestorationAuthority,\n  selectedAccessHost,\n)'
          if (source.split(appStart).length !== 2 || source.split(appEnd).length !== 2)
            throw new Error('The controlled form probe entry changed.')
          return (
            "import { accessHost, probeApp } from '" +
            probeModule +
            "'\n" +
            source
              .replace(appStart, 'startRuntimeKernel(\n  probeApp(App),')
              .replace(appEnd, '  retainedAppearanceSafetyRestorationAuthority,\n  accessHost,\n)')
          )
        },
      },
    ],
  })
  await server.listen()
  server.printUrls()
}
