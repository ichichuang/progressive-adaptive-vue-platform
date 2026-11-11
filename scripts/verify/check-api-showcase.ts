import assert from 'node:assert/strict'
import {
  apiDemoScenarioGroups,
  runApiDemo,
  type ApiDemoScenario,
} from '../../apps/web/src/app/workbench/api/api-demo-scenarios'
import type { ApiErrorCategory } from '../../apps/web/src/shared/api'

const failures: Partial<Record<ApiDemoScenario, ApiErrorCategory>> = {
  'get-body': 'request',
  'bad-path': 'request',
  'form-content-type': 'request',
  mime: 'protocol',
  parse: 'parse',
  schema: 'schema',
  timeout: 'timeout',
  network: 'network',
  'not-found': 'http',
  'rate-limit': 'http',
  unavailable: 'http',
  'missing-provider': 'authorization',
  'failed-provider': 'authorization',
  'header-override': 'request',
  'path-escape': 'request',
  oversized: 'protocol',
}
let count = 0
for (const scenario of Object.values(apiDemoScenarioGroups).flat()) {
  // These are live, public GET endpoints and are deliberately excluded from deterministic tests.
  if (scenario === 'product' || scenario === 'search') continue
  const outcome = await runApiDemo(scenario, {
    signal: new AbortController().signal,
    productId: 3,
    search: 'PAVP & Vue 中文',
  })
  assert.equal(outcome.evidence.transport, 'local')
  const category = failures[scenario]
  if (category) {
    assert.equal(outcome.result.status, 'failure', scenario)
    assert.equal(outcome.result.error.category, category, scenario)
    if (scenario === 'rate-limit') assert.equal(outcome.result.error.retryAfterSeconds, 3)
    if (category === 'request' || category === 'authorization')
      assert.equal(outcome.evidence.calls, 0, scenario)
  } else {
    assert.equal(outcome.result.status, scenario === 'accepted' ? 'accepted' : 'success', scenario)
    assert.equal(outcome.evidence.calls, 1, scenario)
  }
  if (scenario === 'query') {
    const url = new URL(outcome.evidence.url ?? '')
    assert.equal(url.searchParams.get('q'), 'PAVP & Vue 中文')
    assert.deepEqual(url.searchParams.getAll('tag'), ['design', 'vue'])
    assert.equal(url.searchParams.has('optional'), false)
  }
  if (scenario === 'provided')
    assert.equal(outcome.evidence.authorization?.origin, 'https://pavp-demo.invalid')
  if (scenario === 'timeout') assert.ok(outcome.elapsedMilliseconds >= 9900)
  if (scenario === 'delay' && outcome.result.status === 'success')
    assert.equal(Reflect.get(outcome.result.data as object, 'id'), 3)
  count++
}
const cancellation = new AbortController()
const pending = runApiDemo('delay', { signal: cancellation.signal, productId: 1, search: '' })
cancellation.abort()
const cancelled = await pending
assert.equal(cancelled.result.status, 'failure')
assert.equal(cancelled.result.error.category, 'caller-abort')
assert.ok(cancelled.elapsedMilliseconds < 1500)
const alreadyCancelled = await runApiDemo('delay', {
  signal: cancellation.signal,
  productId: 1,
  search: '',
})
assert.equal(alreadyCancelled.evidence.calls, 0)
console.log(
  `API showcase: ${String(count)} deterministic scenarios, cancellation and pre-abort passed; public networking not exercised.`,
)
