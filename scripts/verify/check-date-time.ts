import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { useDateTimeStore } from '../../apps/web/src/app/date-time/date-time.store'
import {
  dateTimeSettingsSchema,
  type DateTimePreferencePort,
} from '../../apps/web/src/app/date-time/date-time-preference'
import assert from 'node:assert/strict'
import {
  formatUiDateTime,
  formatUiRelativeTime,
  isUiDateOnly,
  isUiTimeOnly,
} from '../../packages/ui/src/date-time/date-time'
import { parseUiTableSchema } from '../../packages/ui/src/components/table-schema'
import { resolveTableColumnDisplay } from '../../packages/ui/src/components/table-column-display'
export function verifyDateTime(): void {
  assert.equal(
    dateTimeSettingsSchema.safeParse({ timeZone: 'system', hourCycle: 'h23' }).success,
    true,
  )
  assert.equal(
    dateTimeSettingsSchema.safeParse({ timeZone: 'Invalid/Zone', hourCycle: 'h23' }).success,
    false,
  )
  assert.equal(
    dateTimeSettingsSchema.safeParse({ timeZone: 'UTC', hourCycle: 'h11' }).success,
    false,
  )
  const fromWeb = createRequire(resolve('apps/web/package.json'))
  const piniaLibrary = fromWeb('pinia') as {
    createPinia(): NonNullable<Parameters<typeof useDateTimeStore>[0]>
  }
  const store = useDateTimeStore(piniaLibrary.createPinia())
  let record: ReturnType<DateTimePreferencePort['read']> = { status: 'missing' }
  let callback: (() => void) | undefined
  let writable = true
  const port: DateTimePreferencePort = {
    read: () => record,
    subscribe: (listener) => {
      callback = listener
      return () => {
        callback = undefined
      }
    },
    write: (preference) => {
      if (!writable) return { status: 'failed' }
      record = { status: 'found', preference }
      return { status: 'saved' }
    },
  }
  const dispose = store.initialize(port, { timeZone: 'Asia/Shanghai', hourCycle: 'h23' })
  assert.equal(store.preference.timeZone, 'Asia/Shanghai')
  store.update({ schemaVersion: 1, timeZone: 'America/New_York', hourCycle: 'h12' })
  assert.equal(store.preference.timeZone, 'America/New_York')
  assert.equal(store.persistenceFailed, false)
  const second = useDateTimeStore(piniaLibrary.createPinia())
  const disposeSecond = second.initialize(port, { timeZone: 'UTC', hourCycle: 'h23' })
  assert.equal(
    second.preference.timeZone,
    'America/New_York',
    'Saved preference wins over deployment default.',
  )
  record = { status: 'missing' }
  callback?.()
  assert.equal(second.preference.timeZone, 'UTC', 'Deleting preference restores deployment policy.')
  writable = false
  second.update({ schemaVersion: 1, timeZone: 'Europe/London', hourCycle: 'h23' })
  assert.equal(second.persistenceFailed, true)
  writable = true
  record = { status: 'found', preference: { schemaVersion: 1, timeZone: 'UTC', hourCycle: 'h12' } }
  callback?.()
  assert.equal(second.persistenceFailed, false)
  assert.equal(second.preference.hourCycle, 'h12')
  second.update({ schemaVersion: 1, timeZone: 'Invalid/Zone', hourCycle: 'h12' })
  assert.equal(second.preference.timeZone, 'UTC')
  disposeSecond()
  dispose()
  assert.equal(callback, undefined)

  // Exercise the exported JavaScript boundary as well as statically typed consumers.
  const unchecked: (value: unknown, context: unknown, preset?: unknown) => string | null =
    formatUiDateTime as (value: unknown, context: unknown, preset?: unknown) => string | null
  const shanghai = { locale: 'en-GB', timeZone: 'Asia/Shanghai', hourCycle: 'h23' } as const
  for (const value of [null, '0', undefined])
    assert.equal(unchecked({ kind: 'timestamp', value, unit: 'seconds' }, shanghai), null)
  assert.equal(unchecked({ kind: 'timestamp', value: 1000, unit: 'invalid' }, shanghai), null)
  assert.equal(
    unchecked({ kind: 'timestamp', value: 1000, unit: 'seconds' }, shanghai, 'bad'),
    null,
  )
  assert.equal(
    unchecked(
      { kind: 'timestamp', value: 1000, unit: 'seconds' },
      { ...shanghai, hourCycle: 'bad' },
    ),
    null,
  )
  const ny = { ...shanghai, timeZone: 'America/New_York' }
  const sample = { kind: 'instant', value: '2026-01-01T00:30:00Z' } as const
  assert.equal(formatUiDateTime(sample, shanghai), '01/01/2026, 08:30:00')
  assert.equal(formatUiDateTime(sample, ny), '31/12/2025, 19:30:00')
  for (const timeZone of ['UTC', 'America/New_York', 'Pacific/Kiritimati', 'Asia/Shanghai']) {
    assert.equal(
      formatUiDateTime({ kind: 'date', value: '2026-01-01' }, { ...shanghai, timeZone }),
      '01/01/2026',
    )
    assert.equal(
      formatUiDateTime({ kind: 'time', value: '09:30' }, { ...shanghai, timeZone }),
      '09:30:00',
    )
  }
  assert.equal(
    formatUiDateTime({ kind: 'instant', value: '2026-03-08T06:59:59Z' }, ny, 'time'),
    '01:59:59',
  )
  assert.equal(
    formatUiDateTime({ kind: 'instant', value: '2026-03-08T07:00:00Z' }, ny, 'time'),
    '03:00:00',
  )
  assert.equal(
    formatUiDateTime({ kind: 'instant', value: '2026-11-01T05:30:00Z' }, ny, 'time'),
    '01:30:00',
  )
  assert.equal(
    formatUiDateTime({ kind: 'instant', value: '2026-11-01T06:30:00Z' }, ny, 'time'),
    '01:30:00',
  )
  assert.equal(
    formatUiDateTime({ kind: 'timestamp', value: 0, unit: 'seconds' }, shanghai),
    formatUiDateTime({ kind: 'timestamp', value: 0, unit: 'milliseconds' }, shanghai),
  )
  assert.equal(formatUiDateTime({ kind: 'timestamp', value: NaN, unit: 'seconds' }, shanghai), null)
  assert.equal(
    formatUiDateTime({ kind: 'timestamp', value: 1e20, unit: 'seconds' }, shanghai),
    null,
  )
  assert.equal(formatUiDateTime(sample, { ...shanghai, timeZone: 'Invalid/Zone' }), null)
  assert.equal(formatUiDateTime(sample, { ...shanghai, locale: '' }), null)
  for (const value of [
    '2026-01-01T00:30:00',
    '2026-02-30T00:30:00Z',
    'invalid',
    '2026-01-01',
    '2026-01-01T24:00:00Z',
  ])
    assert.equal(formatUiDateTime({ kind: 'instant', value }, shanghai), null)
  assert.equal(isUiDateOnly('2024-02-29'), true)
  assert.equal(isUiDateOnly('2025-02-29'), false)
  assert.equal(isUiDateOnly('0000-01-01'), false)
  assert.equal(isUiDateOnly('0099-01-01'), true)
  assert.equal(isUiTimeOnly('24:00'), false)
  assert.equal(isUiTimeOnly('09:60:00'), false)
  assert.equal(formatUiDateTime({ kind: 'date', value: '2026-01-01' }, shanghai, 'datetime'), null)
  assert.equal(
    formatUiRelativeTime({ kind: 'timestamp', value: 0, unit: 'seconds' }, shanghai, 60_000),
    '1 minute ago',
  )
  assert.equal(
    formatUiRelativeTime({ kind: 'timestamp', value: 120, unit: 'seconds' }, shanghai, 60_000),
    'in 1 minute',
  )
  const schema = {
    id: 'date-test',
    rowKey: 'id',
    columns: [{ key: 'at', title: 'When', dateTime: { kind: 'timestamp', unit: 'seconds' } }],
    source: { kind: 'local' },
  }
  const parsed = parseUiTableSchema(schema)
  const column = parsed.columns[0]
  assert.ok(column)
  assert.equal(
    resolveTableColumnDisplay(
      column,
      0,
      () => '—',
      (v) => v,
      shanghai,
    ).text,
    '01/01/1970, 08:00:00',
  )
  assert.equal(
    resolveTableColumnDisplay(
      column,
      'not-number',
      () => '—',
      (v) => v,
      shanghai,
    ).text,
    '—',
  )
  assert.equal(
    resolveTableColumnDisplay(
      column,
      0,
      () => '—',
      (v) => v,
    ).text,
    '—',
  )
  for (const dateTime of [
    { kind: 'timestamp' },
    { kind: 'date', unit: 'seconds' },
    { kind: 'date', preset: 'datetime' },
    { kind: 'time', preset: 'date' },
    { kind: 'script' },
    { kind: 'instant', extra: true },
  ])
    assert.throws(() =>
      parseUiTableSchema({ ...schema, columns: [{ key: 'at', title: 'When', dateTime }] }),
    )
  assert.deepEqual(schema.columns[0]?.dateTime, { kind: 'timestamp', unit: 'seconds' })
}
