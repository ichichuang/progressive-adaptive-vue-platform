import type { UiG2ChartOptions } from '@platform/ui'
import type { ConsoleTranslate } from '../../../shared/i18n'

export type ChartTourKind = 'bar' | 'line' | 'donut'
const chartTourNames = ['09:00', '10:00', '11:00', '12:00', '13:00'] as const

export function chartTourRows(revision: number) {
  return chartTourNames.map((name, index) => ({
    name,
    value: Math.round(60 + index * 12 + Math.sin(index + revision) * 20),
  }))
}

export function chartTourExample(
  kind: ChartTourKind,
  revision: number,
  t: ConsoleTranslate,
): UiG2ChartOptions {
  const data = chartTourRows(revision)
  if (kind === 'line') {
    const points = data.flatMap((row) => [
      { ...row, channel: t('chartTour.direct'), key: `A-${row.name}` },
      {
        ...row,
        value: Math.round(row.value * 0.65),
        channel: t('chartTour.partner'),
        key: `B-${row.name}`,
      },
    ])
    return {
      type: 'view',
      data: points,
      encode: { x: 'name', y: 'value', color: 'channel' },
      axis: { x: { title: false }, y: { title: false } },
      children: [
        {
          type: 'line',
          encode: { shape: 'smooth' },
          tooltip: { title: 'name', items: [{ channel: 'y' }] },
        },
        { type: 'point', encode: { key: 'key' }, tooltip: false },
      ],
    }
  }
  if (kind === 'donut')
    return {
      type: 'interval',
      data,
      coordinate: { type: 'theta', innerRadius: 0.65 },
      transform: [{ type: 'stackY' }],
      encode: { y: 'value', color: 'name', key: 'name' },
      tooltip: { title: 'name', items: [{ field: 'value', name: t('chartExamples.value') }] },
      legend: false,
    }
  return {
    type: 'interval',
    data,
    encode: { x: 'name', y: 'value', color: 'name', key: 'name' },
    tooltip: { title: 'name', items: [{ field: 'value', name: t('chartExamples.value') }] },
    legend: false,
    axis: { x: { title: false }, y: { title: false } },
    scale: { y: { domain: [0, 160], nice: false } },
    labels: [{ text: 'value', position: 'top' }],
  }
}

export const chartTourConfiguration = {
  autoplay: true,
  intervalMs: 4000,
  loop: true,
  targets: chartTourNames.map((name) => ({ id: name, field: 'name', value: name })),
}
