<script setup lang="ts">
import { UiCopyAction, UiScrollArea, type UiScrollController } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { inject, onScopeDispose } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useApplicationNavigation } from '../router/application-navigation'
import { routerScrollControllerKey } from '../router/router-scroll-controller'

defineProps<{
  readonly title: string
  readonly summary: string
  readonly copy: string
  readonly scrollOwnedByChild?: boolean
}>()
const { t, locale } = useConsoleI18n()
const navigation = useApplicationNavigation()
const register = inject(routerScrollControllerKey)
let release: (() => void) | undefined
function connect(controller: UiScrollController | null) {
  release?.()
  release = controller === null ? undefined : register?.(controller)
}
onScopeDispose(() => {
  connect(null)
})
</script>

<template>
  <section class="flex flex-1 flex-col min-h-0 min-w-0">
    <header class="shrink-0 p-panel-narrow px-page-inline">
      <h1
        data-route-focus="architecture-console-page-heading"
        tabindex="-1"
        class="m-0"
      >
        {{ title }}
      </h1>
      <p class="my-0">
        {{ summary }}
      </p>
    </header>
    <div
      v-if="scrollOwnedByChild"
      class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap px-page-inline"
    >
      <slot />
    </div>
    <UiScrollArea
      v-else
      class="flex-1 min-h-0"
      owner-id="architecture-console-content"
      contained
      @controller="connect"
    >
      <div class="grid min-w-0 gap-content-gap p-panel-narrow px-page-inline">
        <slot />
      </div>
    </UiScrollArea>
    <footer
      class="flex shrink-0 flex-wrap items-center gap-content-gap p-panel-narrow px-page-inline"
    >
      <NButton @click="() => void navigation.navigate({ name: 'access-showcase' })">
        {{ t('route-title.access-showcase') }}
      </NButton>
      <slot name="actions" />
      <UiCopyAction
        :value="copy"
        :label="locale === 'zh-CN' ? '复制能力说明' : 'Copy capability notes'"
        :copy-label="locale === 'zh-CN' ? '复制能力说明' : 'Copy capability notes'"
        :success-label="locale === 'zh-CN' ? '已复制' : 'Copied'"
        :failure-label="locale === 'zh-CN' ? '复制失败' : 'Copy failed'"
        variant="text"
      />
    </footer>
  </section>
</template>
