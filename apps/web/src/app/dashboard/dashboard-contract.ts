import { z } from 'zod'
import { inject, type InjectionKey } from 'vue'
const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u)
const dashboardPanelSchema = z.discriminatedUnion('type', [
  z.strictObject({ id, type: z.literal('clock'), config: z.strictObject({}) }),
  z.strictObject({ id, type: z.literal('capabilities'), config: z.strictObject({}) }),
  z.strictObject({
    id,
    type: z.literal('chart'),
    config: z.strictObject({ series: z.enum(['traffic', 'delivery']) }),
  }),
  z.strictObject({
    id,
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
export function createDefaultDashboard(): DashboardDocument {
  return {
    schemaVersion: 1,
    panels: [
      { id: 'clock', type: 'clock', config: {} },
      { id: 'capabilities', type: 'capabilities', config: {} },
      { id: 'chart', type: 'chart', config: { series: 'traffic' } },
      { id: 'notes', type: 'notes', config: { text: '' } },
    ],
    layouts: {
      wide: [
        { id: 'clock', x: 0, y: 0, w: 4, h: 3 },
        { id: 'capabilities', x: 4, y: 0, w: 8, h: 3 },
        { id: 'chart', x: 0, y: 3, w: 8, h: 5 },
        { id: 'notes', x: 8, y: 3, w: 4, h: 5 },
      ],
      narrow: [
        { id: 'clock', x: 0, y: 0, w: 1, h: 4 },
        { id: 'capabilities', x: 0, y: 4, w: 1, h: 4 },
        { id: 'chart', x: 0, y: 8, w: 1, h: 6 },
        { id: 'notes', x: 0, y: 14, w: 1, h: 4 },
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
