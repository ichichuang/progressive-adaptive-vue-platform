import type { UiG2ChartOptions } from '@platform/ui'
import type { ConsoleTranslate } from '../../../shared/i18n'

export type LiveChartKind = 'stream' | 'ranking' | 'distribution'
export const liveChartExamples = [
  {
    kind: 'stream',
    routeName: 'component-chart-live-stream',
    summary: 'chartLive.streamDescription',
  },
  {
    kind: 'ranking',
    routeName: 'component-chart-live-ranking',
    summary: 'chartLive.rankingDescription',
  },
  {
    kind: 'distribution',
    routeName: 'component-chart-live-distribution',
    summary: 'chartLive.distributionDescription',
  },
] as const
const channelKeys = ['chartLive.web', 'chartLive.mobile', 'chartLive.api'] as const
const regionKeys = [
  'chartLive.east',
  'chartLive.south',
  'chartLive.north',
  'chartLive.west',
  'chartLive.central',
  'chartLive.overseas',
] as const
const windowSize = 36
const distributionSize = 120

/** A repeatable, bounded local signal. No network, clock or business metrics. */
export function liveStreamSamples(tick: number) {
  return channelKeys.flatMap((_, channel) =>
    Array.from({ length: windowSize }, (_, offset) => {
      const second = tick + offset
      return {
        key: `${String(channel)}-${String(second)}`,
        series: String(channel),
        channel,
        second,
        value: Math.round(
          65 +
            channel * 18 +
            Math.sin(second / 6 + channel * 2) * 24 +
            Math.cos(second / 2.7 + channel) * 8,
        ),
      }
    }),
  )
}
export function liveRankingSamples(tick: number) {
  return regionKeys
    .map((_, index) => ({
      key: String(index),
      index,
      value: Math.round(
        80 + Math.sin(tick / 3.5 + index * 1.2) * 42 + Math.cos(tick / 7 + index) * 16,
      ),
    }))
    .sort((left, right) => right.value - left.value || left.index - right.index)
}
export function liveDistributionSamples(tick: number) {
  const samples = Array.from({ length: distributionSize }, (_, offset) => {
    const sample = tick * 6 + offset
    return Math.round(
      300 +
        Math.sin(sample / 31) * 140 +
        Math.sin(sample * 1.71) * 95 +
        Math.cos(sample * 0.7) * 35,
    )
  })
  const sorted = [...samples].sort((left, right) => left - right)
  return {
    samples,
    bins: Array.from({ length: 6 }, (_, index) => ({
      key: String(index),
      name: `${String(index * 100)}–${String((index + 1) * 100)}`,
      value: samples.filter((value) => Math.floor(value / 100) === index).length,
    })),
    mean: Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length),
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0,
  }
}
export function liveSampleTime(second: number): string {
  return `${String(Math.floor(second / 60)).padStart(2, '0')}:${String(second % 60).padStart(2, '0')}`
}

export function liveChartExample(kind: LiveChartKind, tick: number, t: ConsoleTranslate) {
  if (kind === 'stream') {
    const data = liveStreamSamples(tick).map((row) => ({
      ...row,
      group: t(channelKeys[row.channel] ?? channelKeys[0]),
      name: liveSampleTime(row.second),
    }))
    const latest = data.filter((row) => row.second === tick + windowSize - 1)
    const options: UiG2ChartOptions = {
      type: 'view',
      data,
      clip: true,
      encode: { x: 'second', y: 'value', color: 'group' },
      scale: {
        x: { type: 'linear', domain: [tick, tick + windowSize - 1], tickCount: 6, nice: false },
        y: { domain: [0, 160], nice: false },
        color: { domain: channelKeys.map((key) => t(key)) },
      },
      axis: {
        x: {
          title: t('chartLive.simulationTime'),
          labelFormatter: (value: number) => liveSampleTime(Math.round(value)),
          labelAutoRotate: false,
        },
        y: { title: t('chartLive.rateUnit') },
      },
      legend: { color: { position: 'top' } },
      interaction: { tooltip: { shared: true } },
      children: [
        {
          type: 'area',
          encode: { key: 'series', shape: 'smooth' },
          style: { fillOpacity: 0.08 },
          tooltip: false,
        },
        {
          type: 'line',
          encode: { key: 'series', shape: 'smooth' },
          tooltip: { title: 'name', items: [{ field: 'value', name: t('chartLive.rateUnit') }] },
        },
      ],
    }
    return {
      options,
      rows: data.map((row) => ({
        key: row.key,
        name: `${row.name} · ${row.group}`,
        value: row.value,
      })),
      unit: t('chartLive.rateUnit'),
      metrics: [
        {
          label: t('chartLive.currentTotal'),
          value: String(latest.reduce((sum, row) => sum + row.value, 0)),
          unit: t('chartLive.rateUnit'),
        },
        { label: t('chartLive.window'), value: String(windowSize), unit: t('chartLive.seconds') },
        {
          label: t('chartLive.series'),
          value: String(channelKeys.length),
          unit: t('chartLive.channels'),
        },
      ],
    }
  }
  if (kind === 'ranking') {
    const data = liveRankingSamples(tick).map((row) => ({
      ...row,
      name: t(regionKeys[row.index] ?? regionKeys[0]),
    }))
    const options: UiG2ChartOptions = {
      type: 'interval',
      data,
      coordinate: { transform: [{ type: 'transpose' }] },
      encode: { x: 'name', y: 'value', color: 'name', key: 'key' },
      scale: {
        x: { domain: data.map((row) => row.name) },
        y: { domain: [0, 160], nice: false },
        color: { domain: regionKeys.map((key) => t(key)) },
      },
      axis: {
        // Keep G2's measured category gutter while the keyed labels travel with each bar.
        x: { title: false, labelFillOpacity: 0, tick: false, line: false },
        y: { title: t('chartLive.rateUnit') },
      },
      legend: false,
      tooltip: { title: 'name', items: [{ field: 'value', name: t('chartLive.rateUnit') }] },
      labels: [
        { text: 'name', position: 'left' },
        { text: 'value', position: 'right' },
      ],
      animate: { enter: { type: 'fadeIn' } },
      interaction: { elementHighlight: true },
    }
    return {
      options,
      rows: data,
      unit: t('chartLive.rateUnit'),
      metrics: [
        { label: t('chartLive.leader'), value: data[0]?.name ?? '', unit: '' },
        {
          label: t('chartLive.leadingRate'),
          value: String(data[0]?.value ?? 0),
          unit: t('chartLive.rateUnit'),
        },
        {
          label: t('chartLive.regions'),
          value: String(regionKeys.length),
          unit: t('chartLive.groups'),
        },
      ],
    }
  }
  const distribution = liveDistributionSamples(tick)
  const options: UiG2ChartOptions = {
    type: 'interval',
    data: distribution.bins,
    encode: { x: 'name', y: 'value', key: 'key' },
    scale: { x: { padding: 0.24 }, y: { domain: [0, 80], nice: false, tickCount: 5 } },
    axis: {
      x: { title: t('chartLive.latencyUnit'), labelAutoRotate: false, labelAutoHide: true },
      y: { title: t('chartLive.samples') },
    },
    legend: false,
    tooltip: { title: 'name', items: [{ field: 'value', name: t('chartLive.samples') }] },
    labels: [{ text: 'value', position: 'top' }],
    animate: { enter: { type: 'fadeIn' } },
    interaction: { elementHighlight: true },
  }
  return {
    options,
    rows: distribution.bins,
    unit: t('chartLive.samples'),
    metrics: [
      { label: t('chartLive.mean'), value: String(distribution.mean), unit: 'ms' },
      { label: t('chartLive.p95'), value: String(distribution.p95), unit: 'ms' },
      {
        label: t('chartLive.rollingSamples'),
        value: String(distributionSize),
        unit: t('chartLive.samples'),
      },
    ],
  }
}
