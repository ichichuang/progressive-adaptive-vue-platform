<script setup lang="ts">
import { computed } from 'vue'
import type { TokenName } from '@platform/design-system'
import { useConsoleI18n } from '../../shared/i18n'
import TokenSpecimen from './TokenSpecimen.vue'

const props = defineProps<{ readonly names: readonly TokenName[]; readonly label: string }>()
const { t } = useConsoleI18n()
const groupLabels = {
  surfaces: 'workbench.tokenGroup.surfaces',
  foregrounds: 'workbench.tokenGroup.foregrounds',
  status: 'workbench.tokenGroup.status',
  controls: 'workbench.tokenGroup.controls',
  icons: 'workbench.tokenGroup.icons',
  layout: 'workbench.tokenGroup.layout',
  spacing: 'workbench.tokenGroup.spacing',
  typeSize: 'workbench.tokenGroup.typeSize',
  typeStyle: 'workbench.tokenGroup.typeStyle',
  interaction: 'workbench.tokenGroup.interaction',
} as const
const subgroupLabels = {
  textColors: 'workbench.tokenSubgroup.textColors',
  controlColors: 'workbench.tokenSubgroup.controlColors',
  statusInfo: 'workbench.tokenSubgroup.statusInfo',
  statusSuccess: 'workbench.tokenSubgroup.statusSuccess',
  statusWarning: 'workbench.tokenSubgroup.statusWarning',
  statusError: 'workbench.tokenSubgroup.statusError',
  controlSizes: 'workbench.tokenSubgroup.controlSizes',
  bordersAndCorners: 'workbench.tokenSubgroup.bordersAndCorners',
  iconSizes: 'workbench.tokenSubgroup.iconSizes',
  indicatorShapes: 'workbench.tokenSubgroup.indicatorShapes',
  indicatorLayout: 'workbench.tokenSubgroup.indicatorLayout',
  shellLayout: 'workbench.tokenSubgroup.shellLayout',
  contentLayout: 'workbench.tokenSubgroup.contentLayout',
  calendarAndTargets: 'workbench.tokenSubgroup.calendarAndTargets',
  generalSpacing: 'workbench.tokenSubgroup.generalSpacing',
  calendarSpacing: 'workbench.tokenSubgroup.calendarSpacing',
  indicatorSpacing: 'workbench.tokenSubgroup.indicatorSpacing',
  generalTypeSize: 'workbench.tokenSubgroup.generalTypeSize',
  controlTypeSize: 'workbench.tokenSubgroup.controlTypeSize',
  fontStyle: 'workbench.tokenSubgroup.fontStyle',
  lineHeight: 'workbench.tokenSubgroup.lineHeight',
  motion: 'workbench.tokenSubgroup.motion',
  depth: 'workbench.tokenSubgroup.depth',
} as const
const statusColors: Readonly<Partial<Record<keyof typeof subgroupLabels, string>>> = {
  statusInfo: 'text-control-info',
  statusSuccess: 'text-control-success',
  statusWarning: 'text-control-warning',
  statusError: 'text-control-error',
}

type Group = keyof typeof groupLabels
type Subgroup = keyof typeof subgroupLabels
function groupFor(name: TokenName): Group {
  if (name.startsWith('color.status.')) return 'status'
  if (name.startsWith('color.text.') || name.startsWith('color.control.')) return 'foregrounds'
  if (name.startsWith('color.')) return 'surfaces'
  if (name.startsWith('typography.size.')) return 'typeSize'
  if (name.startsWith('typography.')) return 'typeStyle'
  if (name.startsWith('spacing.')) return 'spacing'
  if (
    name.startsWith('layout.z.') ||
    name.startsWith('interaction.motion.') ||
    name === 'interaction.shadow.panel'
  )
    return 'interaction'
  if (name.startsWith('layout.')) return 'layout'
  if (name.startsWith('interaction.icon.') || name.startsWith('interaction.indicator.'))
    return 'icons'
  return 'controls'
}
function subgroupFor(name: TokenName, group: Group): Subgroup | null {
  if (group === 'surfaces') return null
  if (group === 'foregrounds')
    return name.startsWith('color.text.') ? 'textColors' : 'controlColors'
  if (group === 'status') {
    if (name.startsWith('color.status.info')) return 'statusInfo'
    if (name.startsWith('color.status.success')) return 'statusSuccess'
    if (name.startsWith('color.status.warning')) return 'statusWarning'
    if (name.startsWith('color.status.error')) return 'statusError'
    return null
  }
  if (group === 'controls')
    return name.startsWith('interaction.radius.') || name === 'interaction.border.width'
      ? 'bordersAndCorners'
      : 'controlSizes'
  if (group === 'icons') {
    if (name.startsWith('interaction.icon.')) return 'iconSizes'
    if (
      name.startsWith('interaction.indicator.rail.') ||
      name.startsWith('interaction.indicator.slot.') ||
      name === 'interaction.indicator.label.height'
    )
      return 'indicatorLayout'
    return 'indicatorShapes'
  }
  if (group === 'layout') {
    if (name.startsWith('layout.admin.')) return 'shellLayout'
    if (name.startsWith('layout.content.') || name.startsWith('layout.profile.'))
      return 'contentLayout'
    return 'calendarAndTargets'
  }
  if (group === 'spacing') {
    if (name.startsWith('spacing.calendar.')) return 'calendarSpacing'
    if (name.startsWith('spacing.indicator.')) return 'indicatorSpacing'
    return 'generalSpacing'
  }
  if (group === 'typeSize')
    return name.startsWith('typography.size.control.') ? 'controlTypeSize' : 'generalTypeSize'
  if (group === 'typeStyle')
    return name.startsWith('typography.line-height.') ? 'lineHeight' : 'fontStyle'
  return name.startsWith('interaction.motion.') ? 'motion' : 'depth'
}
const groups = computed(() => {
  const result = new Map<Group, Map<Subgroup | null, TokenName[]>>()
  for (const name of props.names) {
    const group = groupFor(name)
    const subgroup = subgroupFor(name, group)
    const parts = result.get(group) ?? new Map<Subgroup | null, TokenName[]>()
    const names = parts.get(subgroup) ?? []
    names.push(name)
    parts.set(subgroup, names)
    result.set(group, parts)
  }
  const order = Object.keys(subgroupLabels) as Subgroup[]
  return [...result].map(([group, parts]) => ({
    group,
    parts: [...parts]
      .map(([subgroup, names]) => ({ subgroup, names }))
      .sort(
        (a, b) =>
          (a.subgroup === null ? -1 : order.indexOf(a.subgroup)) -
          (b.subgroup === null ? -1 : order.indexOf(b.subgroup)),
      ),
  }))
})
</script>
<template>
  <div
    class="wb-page grid min-w-0"
    :aria-label="label"
  >
    <section
      v-for="{ group, parts } in groups"
      :key="group"
      class="grid min-w-0 gap-content-gap"
    >
      <h2 class="font-title-weight m-0 text-subheading text-text-primary">
        {{ t(groupLabels[group]) }}
      </h2>
      <section
        v-for="{ subgroup, names: groupedNames } in parts"
        :key="subgroup ?? group"
        class="grid min-w-0 gap-content-gap"
      >
        <h3
          v-if="subgroup"
          class="font-title-weight m-0 text-body"
          :class="statusColors[subgroup]"
        >
          {{ t(subgroupLabels[subgroup]) }}
        </h3>
        <div
          class="wb-specimen-grid grid items-start gap-content-gap"
          :class="{
            'layout-regular:grid-cols-2 layout-wide:grid-cols-3': group === 'surfaces',
            'layout-regular:grid-cols-3 layout-wide:grid-cols-3': group === 'status',
            'grid-cols-1 layout-regular:grid-cols-2 layout-wide:grid-cols-2':
              group === 'typeSize' || group === 'typeStyle',
          }"
        >
          <TokenSpecimen
            v-for="name in groupedNames"
            :key="name"
            :name="name"
          />
        </div>
      </section>
    </section>
  </div>
</template>
