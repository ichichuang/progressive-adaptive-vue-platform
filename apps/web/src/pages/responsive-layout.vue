<script setup lang="ts">
import { NDescriptions, NDescriptionsItem } from 'naive-ui/es/descriptions'
import { UiPageHeader, UiSection, responsiveLayoutConsoleProjection } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()

defineOptions({ name: 'ResponsiveLayoutInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const profileItems = responsiveLayoutConsoleProjection.profiles.map((profile) => ({
  label: profile.id,
  value: `${profile.minimumInclusive?.resolvedValue ?? '−∞'} → ${profile.maximumExclusive?.resolvedValue ?? '+∞'}`,
}))
const sizeItems = responsiveLayoutConsoleProjection.sizeTokens.map((record) => ({
  label: record.tokenId,
  value: record.resolvedValue,
}))
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    :description="responsiveLayoutConsoleProjection.profileThresholdPolicyId"
    :title="t('console.responsive.profiles')"
  >
    <NDescriptions
      bordered
      :column="1"
      label-placement="left"
    >
      <NDescriptionsItem
        v-for="item in profileItems"
        :key="item.label"
        :label="item.label"
      >
        {{ item.value }}
      </NDescriptionsItem>
    </NDescriptions>
  </UiSection>
  <UiSection
    :description="`${responsiveLayoutConsoleProjection.minimumTargetPolicyId} · ${responsiveLayoutConsoleProjection.safeAreaPolicyId}`"
    :title="t('console.responsive.sizes')"
  >
    <NDescriptions
      bordered
      :column="1"
      label-placement="left"
    >
      <NDescriptionsItem
        v-for="item in sizeItems"
        :key="item.label"
        :label="item.label"
      >
        {{ item.value }}
      </NDescriptionsItem>
    </NDescriptions>
  </UiSection>
</template>
