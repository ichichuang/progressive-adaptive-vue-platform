import type { UiG2ChartOptions } from '@platform/ui'
import type { ConsoleTranslate } from '../../../shared/i18n'

export type ChartKind = keyof typeof chartKindCopy

export const chartKindCopy = {
  trend: { title: 'chartExamples.trend', description: 'chartExamples.trendDescription' },
  stackedArea: {
    title: 'chartExamples.stackedArea',
    description: 'chartExamples.stackedAreaDescription',
  },
  step: { title: 'chartExamples.step', description: 'chartExamples.stepDescription' },
  comparison: {
    title: 'chartExamples.comparison',
    description: 'chartExamples.comparisonDescription',
  },
  stackedBars: {
    title: 'chartExamples.stackedBars',
    description: 'chartExamples.stackedBarsDescription',
  },
  ranking: { title: 'chartExamples.ranking', description: 'chartExamples.rankingDescription' },
  composition: {
    title: 'chartExamples.composition',
    description: 'chartExamples.compositionDescription',
  },
  pie: { title: 'chartExamples.pie', description: 'chartExamples.pieDescription' },
  rose: { title: 'chartExamples.rose', description: 'chartExamples.roseDescription' },
  distribution: {
    title: 'chartExamples.distribution',
    description: 'chartExamples.distributionDescription',
  },
  scatter: { title: 'chartExamples.scatter', description: 'chartExamples.scatterDescription' },
  heatmap: { title: 'chartExamples.heatmap', description: 'chartExamples.heatmapDescription' },
  slider: { title: 'chartExamples.slider', description: 'chartExamples.sliderDescription' },
  brush: { title: 'chartExamples.brush', description: 'chartExamples.brushDescription' },
  timeline: { title: 'chartExamples.timeline', description: 'chartExamples.timelineDescription' },
} as const

export const chartGroups = [
  {
    id: 'trends',
    routeName: 'component-chart-trends',
    summary: 'chartExamples.trendsSummary',
    kinds: ['trend', 'stackedArea', 'step'],
  },
  {
    id: 'comparison',
    routeName: 'component-chart-comparison',
    summary: 'chartExamples.comparisonSummary',
    kinds: ['comparison', 'stackedBars', 'ranking'],
  },
  {
    id: 'composition',
    routeName: 'component-chart-composition',
    summary: 'chartExamples.compositionSummary',
    kinds: ['composition', 'pie', 'rose'],
  },
  {
    id: 'distribution',
    routeName: 'component-chart-distribution',
    summary: 'chartExamples.distributionSummary',
    kinds: ['distribution', 'scatter', 'heatmap'],
  },
  {
    id: 'interaction',
    routeName: 'component-chart-interaction',
    summary: 'chartExamples.interactionSummary',
    kinds: ['slider', 'brush', 'timeline'],
  },
] as const
export type ChartGroup = (typeof chartGroups)[number]['id']
export function getChartGroup(id: ChartGroup) {
  const group = chartGroups.find((group) => group.id === id)
  if (!group) throw new Error('Unknown chart example group.')
  return group
}

interface ChartDatum {
  readonly key: string
  readonly name: string
  readonly group: string
  readonly seriesKey?: string
  readonly hour?: number
  readonly value: number
  readonly amount: number
  readonly size: number
}

export const chartSampleHours = 96

export function chartHourLabel(hour: number, t: ConsoleTranslate, multiline = false): string {
  const wholeHour = Math.round(hour)
  const dayKeys = [
    'chartExamples.dayOne',
    'chartExamples.dayTwo',
    'chartExamples.dayThree',
    'chartExamples.dayFour',
  ] as const
  const day = t(
    dayKeys[Math.min(dayKeys.length - 1, Math.max(0, Math.floor(wholeHour / 24)))] ?? dayKeys[0],
  )
  return `${day}${multiline ? '\n' : ' · '}${String(wholeHour % 24).padStart(2, '0')}:00`
}

/** Deterministic local demonstration data, never a service or production metric. */
export function chartExample(kind: ChartKind, revision: number, t: ConsoleTranslate) {
  const groups = [t('chartExamples.direct'), t('chartExamples.partner')]
  const month = [
    t('chartExamples.jan'),
    t('chartExamples.feb'),
    t('chartExamples.mar'),
    t('chartExamples.apr'),
    t('chartExamples.may'),
    t('chartExamples.jun'),
  ]
  const categories = [
    t('chartExamples.design'),
    t('chartExamples.research'),
    t('chartExamples.development'),
    t('chartExamples.content'),
    t('chartExamples.operations'),
  ]
  const values = [36, 48, 41, 68, 59, 83]
  const variation = (index: number) => Math.round(Math.sin(index * 1.7 + revision * 2.1) * 12)
  let data: ChartDatum[]
  const continuous = ['trend', 'stackedArea', 'step', 'slider', 'brush'].includes(kind)
  if (continuous) {
    data = groups.flatMap((group, series) =>
      Array.from({ length: chartSampleHours }, (_, hour) => ({
        key: `${String(series)}-${String(hour)}`,
        seriesKey: String(series),
        hour,
        name: chartHourLabel(hour, t),
        group,
        value: Math.max(
          8,
          Math.round(
            47 +
              series * 16 +
              hour * 0.22 +
              Math.sin(hour / 8 + series * 1.8 + revision * 0.65) * 17 +
              Math.cos(hour / 3.8 + revision * 0.8) * 6,
          ),
        ),
        amount: 0,
        size: 0,
      })),
    )
  } else if (kind === 'comparison' || kind === 'stackedBars') {
    data = groups.flatMap((group, series) =>
      month.map((name, index) => ({
        key: `${String(series)}-${String(index)}`,
        name,
        group,
        value: Math.max(8, (values[index] ?? 40) - series * 15 + variation(index + series)),
        amount: 0,
        size: 0,
      })),
    )
  } else if (kind === 'heatmap') {
    const days = [
      t('chartExamples.mon'),
      t('chartExamples.tue'),
      t('chartExamples.wed'),
      t('chartExamples.thu'),
      t('chartExamples.fri'),
      t('chartExamples.sat'),
      t('chartExamples.sun'),
    ]
    const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']
    data = days.flatMap((name, day) =>
      times.map((group, slot) => ({
        key: `${String(day)}-${String(slot)}`,
        name,
        group,
        value: 20 + ((day * 17 + slot * 23 + revision * 13) % 80),
        amount: 0,
        size: 0,
      })),
    )
  } else if (kind === 'distribution' || kind === 'scatter') {
    data = Array.from({ length: 24 }, (_, index) => ({
      key: String(index),
      name: `${t('chartExamples.sample')} ${String(index + 1)}`,
      group: groups[index % 2] ?? '',
      value: 18 + ((index * 17) % 75) + variation(index),
      amount: 12 + ((index * 11) % 68),
      size: 10 + ((index * 7) % 24),
    }))
  } else {
    data = categories.map((name, index) => ({
      key: String(index),
      name,
      group: name,
      value: 25 + index * 6 + variation(index),
      amount: 0,
      size: 0,
    }))
  }
  const common = {
    data,
    axis: {
      x: {
        title: false,
        ...(continuous
          ? {
              labelFormatter: (value: number) => chartHourLabel(value, t, true),
              labelAutoRotate: false,
              labelAutoHide: true,
            }
          : {}),
      },
      y: { title: false },
    },
    legend: { color: { position: 'bottom' as const } },
    tooltip: { title: 'name', items: [{ field: 'value', name: t('chartExamples.value') }] },
  }
  let options: UiG2ChartOptions
  switch (kind) {
    case 'trend':
    case 'step':
    case 'slider':
    case 'brush':
      options = {
        ...common,
        type: 'view',
        encode: { x: 'hour', y: 'value', color: 'group' },
        clip: true,
        scale: {
          x: { type: 'linear', domain: [0, chartSampleHours - 1], tickCount: 5, nice: false },
          y: { domainMin: 0, nice: true },
        },
        interaction: {
          tooltip: { shared: true },
          ...(kind === 'brush' ? { brushXHighlight: true } : {}),
        },
        children: [
          {
            type: 'area',
            encode: { shape: kind === 'step' ? 'hv' : 'smooth', key: 'seriesKey' },
            style: { fillOpacity: 0.12 },
            animate: { enter: { type: 'waveIn' } },
            tooltip: false,
          },
          {
            type: 'line',
            tooltip: common.tooltip,
            encode: { shape: kind === 'step' ? 'hv' : 'smooth', key: 'seriesKey' },
            animate: { enter: { type: 'waveIn' } },
          },
          {
            type: 'point',
            data: data.filter(
              (row) =>
                row.hour !== undefined &&
                (row.hour % 12 === 0 || row.hour === chartSampleHours - 1),
            ),
            encode: { key: 'key' },
            tooltip: false,
          },
        ],
      }
      break
    case 'stackedArea':
      options = {
        ...common,
        type: 'area',
        encode: { x: 'hour', y: 'value', color: 'group', shape: 'smooth', key: 'seriesKey' },
        scale: {
          x: { type: 'linear', domain: [0, chartSampleHours - 1], tickCount: 5, nice: false },
          y: { domainMin: 0, nice: true },
        },
        transform: [{ type: 'stackY' }],
        interaction: { tooltip: { shared: true } },
        animate: { enter: { type: 'waveIn' } },
      }
      break
    case 'comparison':
    case 'stackedBars':
      options = {
        ...common,
        type: 'interval',
        encode: { x: 'name', y: 'value', color: 'group', key: 'key' },
        transform: [{ type: kind === 'stackedBars' ? 'stackY' : 'dodgeX' }],
        interaction: { elementHighlight: true },
        animate: { enter: { type: 'growInY' } },
      }
      break
    case 'composition':
    case 'pie':
      options = {
        ...common,
        type: 'interval',
        axis: false,
        legend: false,
        coordinate: { type: 'theta', innerRadius: kind === 'pie' ? 0 : 0.68 },
        transform: [{ type: 'stackY' }],
        encode: { y: 'value', color: 'name', key: 'key' },
        interaction: { elementHighlight: true },
      }
      break
    case 'rose':
      options = {
        ...common,
        type: 'interval',
        axis: false,
        legend: false,
        coordinate: { type: 'polar' },
        encode: { x: 'name', y: 'value', color: 'name', key: 'key' },
        interaction: { elementHighlight: true },
        animate: { enter: { type: 'fadeIn' } },
      }
      break
    case 'distribution':
    case 'scatter':
      options = {
        ...common,
        type: 'point',
        tooltip: {
          title: 'name',
          items: [
            { field: 'amount', name: t('chartExamples.investment') },
            { field: 'value', name: t('chartExamples.return') },
            { field: 'size', name: t('chartExamples.sampleSize') },
          ],
        },
        encode: {
          x: 'amount',
          y: 'value',
          ...(kind === 'distribution' ? { size: 'size' } : {}),
          color: 'group',
          key: 'key',
        },
        scale: { x: { domain: [0, 90] }, y: { domain: [0, 110] } },
        axis: {
          x: { title: t('chartExamples.investment') },
          y: { title: t('chartExamples.return') },
        },
        legend: { ...common.legend, size: false },
        style: { fillOpacity: 0.65 },
        interaction: { elementHighlight: true },
      }
      break
    case 'heatmap':
      options = {
        ...common,
        type: 'cell',
        tooltip: {
          title: 'name',
          items: [
            { field: 'group', name: t('chartExamples.time') },
            { field: 'value', name: t('chartExamples.activity') },
          ],
        },
        legend: false,
        encode: { x: 'name', y: 'group', opacity: 'value', key: 'key' },
        scale: { opacity: { domain: [0, 100], range: [0.12, 1] } },
        interaction: { elementHighlight: true },
      }
      break
    case 'timeline': {
      const frames = Array.from({ length: 4 }, (_, frame) =>
        data.map((row, index) => ({
          ...row,
          value: 30 + index * 3 + Math.round(Math.sin(index * 1.7 + revision + frame * 1.4) * 18),
        })),
      )
      const lastFrame = frames.at(-1)
      if (lastFrame) data = lastFrame
      options = {
        type: 'timingKeyframe',
        iterationCount: 1,
        children: frames.map((frameData) => ({
          ...common,
          data: frameData,
          type: 'interval',
          legend: false,
          coordinate: { transform: [{ type: 'transpose' }] },
          encode: { x: 'name', y: 'value', color: 'name', key: 'key' },
          scale: { y: { domain: [0, 70] } },
          transform: [{ type: 'sortX', by: 'y', reverse: true }],
        })),
      }
      break
    }
    case 'ranking':
      options = {
        ...common,
        type: 'interval',
        legend: false,
        coordinate: { transform: [{ type: 'transpose' }] },
        encode: { x: 'name', y: 'value', color: 'name', key: 'key' },
        scale: { y: { domain: [0, 70] } },
        transform: [{ type: 'sortX', by: 'y', reverse: true }],
        animate: { enter: { type: 'growInX' }, update: { type: 'morphing' } },
      }
  }
  return { data, options }
}
