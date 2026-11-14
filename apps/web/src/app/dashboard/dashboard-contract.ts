import { z } from 'zod'
import { inject, type InjectionKey } from 'vue'
const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u)
export const dashboardDestinations = [
  'component-form-overview',
  'component-table-overview',
  'component-charts',
  'api-overview',
  'component-showcase',
  'workbench-colors',
  'workbench-motion',
  'workbench-date-time',
] as const
export type DashboardDestination = (typeof dashboardDestinations)[number]
export const dashboardDestinationLabels = {
  'component-form-overview': 'dashboardBoard.linkForms',
  'component-table-overview': 'dashboardBoard.linkTables',
  'component-charts': 'dashboardBoard.linkCharts',
  'api-overview': 'dashboardBoard.linkApi',
  'component-showcase': 'dashboardBoard.linkComponents',
  'workbench-colors': 'dashboardBoard.linkColors',
  'workbench-motion': 'dashboardBoard.linkMotion',
  'workbench-date-time': 'dashboardBoard.linkDateTime',
} as const satisfies Record<DashboardDestination, string>
export const defaultDashboardDestinations = [
  'component-form-overview',
  'component-table-overview',
  'component-charts',
] as const satisfies readonly DashboardDestination[]
export const dashboardStyleIds = ['theme', 'brand', 'soft', 'contrast'] as const
export type DashboardStyle = (typeof dashboardStyleIds)[number]
export const dashboardEntranceIds = [
  'balanced',
  'curtain',
  'card-expand',
  'camera-push',
  'iris',
  'ink-reveal',
  'none',
] as const
export type DashboardEntrance = (typeof dashboardEntranceIds)[number]
export const dashboardToneIds = [
  'theme',
  'accent-a',
  'accent-b',
  'brand',
  'accent-a-strong',
  'accent-b-strong',
  'quiet',
] as const
export type DashboardTone = (typeof dashboardToneIds)[number]
const presentation = {
  id,
  title: z.string().trim().min(1).max(60).optional(),
  tone: z.enum(dashboardToneIds).optional(),
  entrance: z.enum(dashboardEntranceIds).optional(),
}
const dashboardPanelSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...presentation, type: z.literal('clock'), config: z.strictObject({}) }),
  z.strictObject({
    ...presentation,
    type: z.literal('capabilities'),
    config: z.strictObject({
      destinations: z
        .array(z.enum(dashboardDestinations))
        .max(8)
        .refine((values) => new Set(values).size === values.length, 'Duplicate destination.')
        .optional(),
    }),
  }),
  z.strictObject({
    ...presentation,
    type: z.literal('chart'),
    config: z.strictObject({ series: z.enum(['traffic', 'delivery']) }),
  }),
  z.strictObject({
    ...presentation,
    type: z.literal('notes'),
    config: z.strictObject({ text: z.string().max(500) }),
  }),
])
const position = z.strictObject({
  id,
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0).max(126),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(2).max(128),
})
export const dashboardSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    style: z.enum(dashboardStyleIds).optional(),
    entrance: z.enum(dashboardEntranceIds).optional(),
    panels: z.array(dashboardPanelSchema).max(24),
    layouts: z.strictObject({ wide: z.array(position).max(24), narrow: z.array(position).max(24) }),
  })
  .superRefine((value, context) => {
    const ids = new Set(value.panels.map((panel) => panel.id))
    if (ids.size !== value.panels.length)
      context.addIssue({ code: 'custom', message: 'Duplicate panel ID.' })
    for (const mode of ['wide', 'narrow'] as const) {
      const layout = value.layouts[mode]
      if (
        layout.length !== ids.size ||
        new Set(layout.map((item) => item.id)).size !== ids.size ||
        layout.some((item) => !ids.has(item.id))
      )
        context.addIssue({
          code: 'custom',
          path: ['layouts', mode],
          message: 'Layout must contain every panel exactly once.',
        })
      for (let index = 0; index < layout.length; index += 1) {
        const item = layout[index]
        if (!item) continue
        if (
          layout
            .slice(index + 1)
            .some(
              (other) =>
                item.x < other.x + other.w &&
                item.x + item.w > other.x &&
                item.y < other.y + other.h &&
                item.y + item.h > other.y,
            )
        )
          context.addIssue({
            code: 'custom',
            path: ['layouts', mode],
            message: 'Panel rectangles must not overlap.',
          })
      }
      for (const item of layout) {
        if (item.x + item.w > (mode === 'wide' ? 12 : 1) || item.y + item.h > 128)
          context.addIssue({
            code: 'custom',
            path: ['layouts', mode],
            message: 'Panel exceeds layout bounds.',
          })
      }
    }
  })
export type DashboardDocument = z.infer<typeof dashboardSchema>
export type DashboardPanel = z.infer<typeof dashboardPanelSchema>
export const dashboardPresetTones: Readonly<
  Record<DashboardStyle, Readonly<Record<DashboardPanel['type'], DashboardTone>>>
> = {
  theme: { capabilities: 'accent-b', clock: 'accent-a', notes: 'theme', chart: 'theme' },
  brand: { capabilities: 'brand', clock: 'accent-a-strong', notes: 'theme', chart: 'accent-b' },
  soft: { capabilities: 'accent-a', clock: 'accent-b', notes: 'accent-b', chart: 'accent-a' },
  contrast: {
    capabilities: 'accent-b-strong',
    clock: 'quiet',
    notes: 'accent-a-strong',
    chart: 'brand',
  },
}
export function createDefaultDashboard(): DashboardDocument {
  return {
    schemaVersion: 1,
    panels: [
      { id: 'capabilities', type: 'capabilities', config: {} },
      { id: 'notes', type: 'notes', config: { text: '' } },
      { id: 'clock', type: 'clock', config: {} },
    ],
    layouts: {
      wide: [
        { id: 'capabilities', x: 0, y: 0, w: 7, h: 3 },
        { id: 'notes', x: 7, y: 0, w: 5, h: 5 },
        { id: 'clock', x: 0, y: 3, w: 4, h: 2 },
      ],
      narrow: [
        { id: 'capabilities', x: 0, y: 0, w: 1, h: 3 },
        { id: 'notes', x: 0, y: 3, w: 1, h: 3 },
        { id: 'clock', x: 0, y: 6, w: 1, h: 2 },
      ],
    },
  }
}
export interface DashboardStoragePort {
  read():
    | { readonly status: 'missing' }
    | { readonly status: 'unusable'; readonly reason: 'invalid' | 'unavailable' | 'disposed' }
    | { readonly status: 'found'; readonly document: DashboardDocument }
  write(document: DashboardDocument): {
    readonly status: 'saved' | 'failed'
    readonly reason?: 'disposed'
  }
}
export const dashboardStoragePortKey: InjectionKey<DashboardStoragePort> =
  Symbol('DashboardStoragePort')
export function useDashboardStoragePort(): DashboardStoragePort {
  const port = inject(dashboardStoragePortKey)
  if (!port) throw new Error('Dashboard storage is unavailable.')
  return port
}
