import { watch, type ComputedRef } from 'vue'
import type { UiG2ChartOptions } from '@platform/ui'
import type { ConsoleTranslate } from '../../../shared/i18n'

export const linkedChannels = ['web', 'mobile', 'api'] as const
export const linkedChannelKeys = {
  web: 'chartLive.web',
  mobile: 'chartLive.mobile',
  api: 'chartLive.api',
} as const
export type LinkedChannel = (typeof linkedChannels)[number]
export const linkedHours = 72
export interface LinkedSample {
  readonly key: string
  readonly channel: LinkedChannel
  readonly name: string
  readonly hour: number
  readonly value: number
}
export function linkedSamples(revision: number, t: ConsoleTranslate): LinkedSample[] {
  return linkedChannels.flatMap((channel, index) =>
    Array.from({ length: linkedHours }, (_, hour) => ({
      key: `${channel}-${String(hour)}`,
      channel,
      name: t(linkedChannelKeys[channel]),
      hour,
      value: Math.round(
        80 +
          index * 25 +
          Math.sin(hour / 7 + index + revision / 3) * 35 +
          Math.cos(hour / 3 + index) * 12,
      ),
    })),
  )
}
export function linkedChannelOf(event: unknown): LinkedChannel | null {
  if (!event || typeof event !== 'object' || !('data' in event)) return null
  const envelope: unknown = event.data
  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) return null
  const payload: unknown = envelope.data
  const datum: unknown = Array.isArray(payload) ? payload[0] : payload
  if (!datum || typeof datum !== 'object' || !('channel' in datum)) return null
  return linkedChannels.find((channel) => channel === datum.channel) ?? null
}
interface EventEmitter {
  on(name: string, listener: (event: unknown) => void): unknown
  off(name: string, listener: (event: unknown) => void): unknown
}
interface MarkAnimation {
  playState: string
  finished: Promise<unknown>
  cancel(): void
  onfinish: (() => void) | null
}
interface LinkedMark {
  __data__?: { markKey?: unknown; index?: number; seriesIndex?: number[] }
  getAttribute(name: string): unknown
  setAttribute(name: string, value: unknown): void
  animate(
    frames: { opacity: number }[],
    options: { duration: number; easing: string; fill: string },
  ): MarkAnimation | null
  getAnimations(): MarkAnimation[]
}
interface LinkedView {
  container: { querySelectorAll(selector: string): LinkedMark[] }
  view: { markState: Map<{ key?: unknown; data?: unknown[] }, unknown> }
}
/** This demo's native G2 interaction changes only mark emphasis, never data geometry.
 * Keep pointer feedback outside options updates so hovering cannot replace a click target.
 */
export function linkedChartEvents(
  select: (channel: LinkedChannel) => void,
  hover: (channel: LinkedChannel | null) => void,
  focus: ComputedRef<LinkedChannel | null>,
  timing: () => { duration: number; easing: string },
) {
  return () => (target: LinkedView, _views: unknown, emitter?: EventEmitter) => {
    const click = (event: unknown): void => {
      const channel = linkedChannelOf(event)
      if (channel) select(channel)
    }
    const enter = (event: unknown): void => {
      const channel = linkedChannelOf(event)
      if (channel) hover(channel)
    }
    const marks = target.container.querySelectorAll('.element')
    const animations = new Map<LinkedMark, MarkAnimation>()
    const pending = new Set<MarkAnimation>()
    let disposed = false
    function update(): void {
      for (const mark of marks) {
        const existing = animations.get(mark)
        const foreign = mark
          .getAnimations()
          .filter(
            (animation) =>
              animation !== existing &&
              (animation.playState === 'running' || animation.playState === 'paused'),
          )
        if (foreign.length) {
          for (const animation of foreign) {
            if (pending.has(animation)) continue
            pending.add(animation)
            void animation.finished.then(
              () => {
                pending.delete(animation)
                if (!disposed) update()
              },
              () => pending.delete(animation),
            )
          }
          continue
        }
        const binding = mark.__data__
        const owner = Array.from(target.view.markState.keys()).find(
          (candidate) => candidate.key === binding?.markKey,
        )
        const datum: unknown = owner?.data?.[binding?.seriesIndex?.[0] ?? binding?.index ?? 0]
        const channel =
          datum && typeof datum === 'object' && 'channel' in datum ? datum.channel : null
        const to = !focus.value || channel === focus.value ? 1 : 0.25
        const value = mark.getAttribute('opacity')
        const from = typeof value === 'number' && Number.isFinite(value) ? value : 1
        if (existing) {
          existing.onfinish = null
          existing.cancel()
          animations.delete(mark)
        }
        mark.setAttribute('opacity', from)
        const { duration, easing } = timing()
        if (duration <= 0 || Math.abs(from - to) < 0.001) {
          mark.setAttribute('opacity', to)
          continue
        }
        const animation = mark.animate([{ opacity: from }, { opacity: to }], {
          duration,
          easing,
          fill: 'both',
        })
        if (!animation) {
          mark.setAttribute('opacity', to)
          continue
        }
        animations.set(mark, animation)
        animation.onfinish = () => {
          if (animations.get(mark) !== animation) return
          animation.onfinish = null
          animation.cancel()
          animations.delete(mark)
          mark.setAttribute('opacity', to)
        }
      }
    }
    const stop = watch(focus, update, { flush: 'post' })
    update()
    emitter?.on('element:click', click)
    emitter?.on('element:pointerover', enter)
    return () => {
      disposed = true
      stop()
      emitter?.off('element:click', click)
      emitter?.off('element:pointerover', enter)
      for (const animation of animations.values()) {
        animation.onfinish = null
        animation.cancel()
      }
      animations.clear()
      pending.clear()
    }
  }
}
export function linkedChartOptions(
  samples: readonly LinkedSample[],
  range: readonly [number, number],
  colors: readonly string[],
  events: ReturnType<typeof linkedChartEvents>,
  tracking: boolean,
): { trend: UiG2ChartOptions; ranking: UiG2ChartOptions; composition: UiG2ChartOptions } {
  const visible = samples.filter((row) => row.hour >= range[0] && row.hour <= range[1])
  const totals = linkedChannels.map((channel) => ({
    channel,
    key: channel,
    name: samples.find((row) => row.channel === channel)?.name ?? channel,
    value: visible
      .filter((row) => row.channel === channel)
      .reduce((sum, row) => sum + row.value, 0),
  }))
  const scale = { color: { domain: totals.map((row) => row.name), range: [...colors] } }
  const shared = {
    legend: false as const,
    scale,
    interaction: { tooltip: true, elementHighlight: false, linkedEvents: { type: events } },
    ...(tracking ? { animate: false as const } : {}),
  }
  return {
    trend: {
      ...shared,
      type: 'line',
      data: visible,
      encode: { x: 'hour', y: 'value', color: 'name', key: 'key', shape: 'smooth' },
      scale: {
        ...scale,
        x: { type: 'linear', domain: [...range], nice: false, tickCount: 5 },
        y: { domain: [0, 200], nice: false },
      },
      axis: {
        x: {
          title: false,
          labelFormatter: (hour: number) =>
            `${String(Math.floor(hour / 24) + 1)} / ${String(Math.round(hour) % 24).padStart(2, '0')}:00`,
        },
        y: { title: false },
      },
    },
    ranking: {
      ...shared,
      type: 'interval',
      data: [...totals].sort((a, b) => b.value - a.value),
      coordinate: { transform: [{ type: 'transpose' }] },
      encode: { x: 'name', y: 'value', color: 'name', key: 'key' },
      axis: { x: { title: false }, y: { title: false } },
      labels: [{ text: 'value', position: 'inside', style: { textAlign: 'right' } }],
    },
    composition: {
      ...shared,
      type: 'interval',
      data: totals,
      coordinate: { type: 'theta', innerRadius: 0.68 },
      transform: [{ type: 'stackY' }],
      encode: { y: 'value', color: 'name', key: 'key' },
      axis: false,
    },
  }
}
