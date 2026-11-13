import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parse } from 'vue/compiler-sfc'
const postcss = createRequire(import.meta.resolve('stylelint'))('postcss') as {
  parse(css: string): {
    walkRules(
      visitor: (rule: {
        selector: string
        parent?: { type: string; name?: string; params?: string }
        walkDecls(
          visitor: (declaration: { important?: boolean; prop: string; value: string }) => void,
        ): void
      }) => void,
    ): void
  }
}
import { createReportPrintSession } from '../../packages/ui/src/reports/report-print'
export function verifyReportPrint(): void {
  const bodyAttributes = new Map<string, string>()
  const hostAttributes = new Map<string, string>()
  const listeners = new Map<string, EventListenerOrEventListenerObject>()
  const element = (attributes: Map<string, string>) => ({
    setAttribute: (key: string, value: string) => {
      attributes.set(key, value)
    },
    removeAttribute: (key: string) => {
      attributes.delete(key)
    },
  })
  const host = {
    ...element(hostAttributes),
    ownerDocument: { body: element(bodyAttributes) },
  } as unknown as HTMLElement
  let fail = false
  const browser = {
    addEventListener: (name: string, listener: EventListenerOrEventListenerObject) => {
      listeners.set(name, listener)
    },
    removeEventListener: (name: string) => {
      listeners.delete(name)
    },
    print: () => {
      if (fail) throw new Error('Unavailable')
    },
  } as unknown as Window
  const first = createReportPrintSession(host, browser)
  const second = createReportPrintSession(host, browser)
  first.print()
  assert.equal(bodyAttributes.has('data-report-printing'), true)
  assert.throws(() => {
    second.print()
  })
  const afterPrint = listeners.get('afterprint')
  assert.equal(typeof afterPrint, 'function')
  if (typeof afterPrint !== 'function') throw new Error('Missing afterprint callback.')
  afterPrint(new Event('afterprint'))
  assert.equal(bodyAttributes.size, 0)
  assert.equal(hostAttributes.size, 0)
  assert.equal(listeners.size, 0)
  first.print()
  assert.equal(bodyAttributes.has('data-report-printing'), true)
  first.dispose()
  assert.equal(bodyAttributes.size, 0)
  assert.equal(hostAttributes.size, 0)
  assert.equal(listeners.size, 0)
  assert.throws(() => {
    first.print()
  })
  fail = true
  assert.throws(() => {
    second.print()
  })
  assert.equal(bodyAttributes.size, 0)
  assert.equal(listeners.size, 0)
  second.dispose()

  const preview = readFileSync('packages/ui/src/components/UiReportPreview.vue', 'utf8')
  const style = parse(preview).descriptor.styles[1]
  assert.ok(style)
  let unlocks = 0
  postcss.parse(style.content).walkRules((rule) => {
    if (rule.selector !== 'html:has(body[data-report-printing]),\n  body[data-report-printing]')
      return
    assert.equal(rule.parent?.type, 'atrule')
    assert.equal(rule.parent.name, 'media')
    assert.equal(rule.parent.params, 'print')
    const declarations: string[] = []
    rule.walkDecls((declaration) => {
      assert.equal(declaration.important, true)
      declarations.push(`${declaration.prop}:${declaration.value}`)
    })
    assert.deepEqual(declarations, ['overflow:visible', 'height:auto', 'max-height:none'])
    unlocks++
  })
  assert.equal(unlocks, 1)
}
