<script setup lang="ts">
import {
  UiDescriptionList,
  UiPageHeader,
  UiSection,
  responsiveLayoutConsoleProjection,
  type UiDescriptionItem,
} from '@platform/ui'

defineOptions({ name: 'ResponsiveLayoutInspectorPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const profileItems: readonly UiDescriptionItem[] = responsiveLayoutConsoleProjection.profiles.map(
  (profile) => ({
    label: profile.id,
    value: `${profile.minimumInclusive?.resolvedValue ?? '−∞'} → ${profile.maximumExclusive?.resolvedValue ?? '+∞'}`,
  }),
)
const sizeItems: readonly UiDescriptionItem[] = responsiveLayoutConsoleProjection.sizeTokens.map(
  (record) => ({ label: record.tokenId, value: record.resolvedValue }),
)
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />
  <UiSection
    :description="responsiveLayoutConsoleProjection.profileThresholdPolicyId"
    title="布局 Profile"
  >
    <UiDescriptionList :items="profileItems" />
  </UiSection>
  <UiSection
    :description="`${responsiveLayoutConsoleProjection.minimumTargetPolicyId} · ${responsiveLayoutConsoleProjection.safeAreaPolicyId}`"
    title="尺寸权威"
  >
    <UiDescriptionList :items="sizeItems" />
  </UiSection>
</template>
