<script lang="ts">
import type { DashboardLibraryPreview } from './dashboard-card-presentation'

export interface DashboardLibraryEntry {
  readonly id: string
  readonly title: string
  readonly category: 'module' | 'route'
  readonly preview: DashboardLibraryPreview
  readonly description?: string
  readonly added: boolean
}
</script>

<script setup lang="ts">
import { computed, ref, watch, type ButtonHTMLAttributes, type HTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NDrawer, NDrawerContent } from 'naive-ui/es/drawer'
import { NInput } from 'naive-ui/es/input'
import { NEmpty } from 'naive-ui/es/empty'
import { UiScrollArea } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
import DashboardLibraryArtwork from './DashboardLibraryArtwork.vue'

const props = defineProps<{
  readonly show: boolean
  readonly entries: readonly DashboardLibraryEntry[]
  readonly canAdd: boolean
  readonly rejected?: boolean
}>()
const emit = defineEmits<{
  close: []
  'after-leave': []
  add: [id: string]
}>()
const { t } = useConsoleI18n()
const search = ref('')
const cardTheme = Object.freeze({
  heightMedium: 'auto',
  paddingMedium: '0',
  colorSecondary: 'var(--ui-color-surface-panel)',
})
const groups = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return (['module', 'route'] as const)
    .map((category) => ({
      category,
      title: t(
        category === 'module' ? 'dashboardBoard.libraryModules' : 'dashboardBoard.libraryRoutes',
      ),
      entries: props.entries.filter(
        (entry) =>
          entry.category === category &&
          (!query ||
            `${entry.title} ${entry.description ?? ''}`.toLocaleLowerCase().includes(query)),
      ),
    }))
    .filter((group) => group.entries.length > 0)
})
watch(
  () => props.show,
  (show) => {
    if (show) search.value = ''
  },
)
function updateShow(show: boolean): void {
  if (!show) emit('close')
}
</script>

<template>
  <NDrawer
    :show="show"
    placement="right"
    class="dashboard-library-shell"
    width="min(100vw, calc(var(--ui-layout-admin-drawer-maximum-inline-size) * 1.75))"
    to="#pavp-overlay-root"
    v-bind="{ 'aria-label': t('dashboardBoard.add') } satisfies HTMLAttributes"
    @update:show="updateShow"
    @after-leave="emit('after-leave')"
  >
    <NDrawerContent
      :title="t('dashboardBoard.add')"
      closable
      :body-style="{ overflow: 'hidden' }"
      body-content-class="flex h-full min-h-0 min-w-0 flex-col gap-content-gap"
    >
      <div class="shrink-0 grid min-w-0 gap-component-unit">
        <NInput
          v-model:value="search"
          :placeholder="t('dashboardBoard.librarySearch')"
          :input-props="{ 'aria-label': t('dashboardBoard.librarySearch') }"
          clearable
        >
          <template #prefix>
            <span
              class="i-lucide-search text-text-secondary"
              aria-hidden="true"
            />
          </template>
        </NInput>
      </div>
      <UiScrollArea
        owner-id="dashboard-card-library"
        class="flex-1 min-h-0"
        :enabled="show"
        contained
      >
        <div
          class="grid min-w-0 gap-content-gap"
          :class="{ 'flex-1': groups.length === 0 }"
        >
          <section
            v-for="group in groups"
            :key="group.category"
            class="grid min-w-0 gap-content-gap"
            :aria-label="group.title"
          >
            <header class="flex items-center justify-between gap-component-unit">
              <h3 class="m-0 text-subheading">
                {{ group.title }}
              </h3>
              <span class="text-caption text-text-secondary">{{ group.entries.length }}</span>
            </header>
            <div class="dashboard-library-grid grid min-w-0 gap-content-gap">
              <NButton
                v-for="entry in group.entries"
                :key="entry.id"
                class="dashboard-library-card wb-dashboard-choice rounded-panel min-w-0"
                :theme-overrides="cardTheme"
                :disabled="!canAdd"
                :bordered="false"
                secondary
                type="primary"
                v-bind="
                  {
                    'aria-label': `${entry.title} · ${t(entry.added ? 'dashboardBoard.libraryAddAgain' : 'dashboardBoard.add')}`,
                  } satisfies ButtonHTMLAttributes
                "
                :data-dashboard-catalog-entry="entry.id"
                @click="emit('add', entry.id)"
              >
                <span class="text-left grid min-w-0 w-full gap-component-unit p-panel-narrow">
                  <DashboardLibraryArtwork :preview="entry.preview" />
                  <span class="flex min-w-0 items-center justify-between gap-component-unit">
                    <span
                      v-if="entry.category === 'route'"
                      class="i-lucide-arrow-up-right shrink-0"
                      aria-hidden="true"
                    />
                    <span class="font-title-weight min-w-0 whitespace-normal text-body">{{
                      entry.title
                    }}</span>
                    <span
                      class="i-lucide-plus shrink-0"
                      aria-hidden="true"
                    />
                  </span>
                  <span
                    v-if="entry.description"
                    class="whitespace-normal text-caption text-text-secondary"
                  >
                    {{ entry.description }}
                  </span>
                  <span
                    :class="{ 'opacity-0': !entry.added }"
                    :aria-hidden="!entry.added"
                    class="flex items-center gap-component-unit text-caption text-text-secondary"
                  >
                    <span
                      class="i-lucide-check"
                      aria-hidden="true"
                    />
                    {{ t('dashboardBoard.libraryAdded') }}
                  </span>
                </span>
              </NButton>
            </div>
          </section>
          <NEmpty
            v-if="groups.length === 0"
            class="text-center justify-center px-page-inline"
            :description="t('dashboardBoard.libraryEmpty')"
          >
            <template #icon>
              <span
                class="i-lucide-search-x block"
                aria-hidden="true"
              />
            </template>
          </NEmpty>
        </div>
      </UiScrollArea>
      <p
        v-if="rejected || !canAdd"
        role="status"
        class="text-status-warning m-0 shrink-0 text-caption"
      >
        {{ t('dashboardBoard.full') }}
      </p>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
:global(html:is([data-motion='reduced'], [data-motion='none']) .dashboard-library-shell) {
  transition: none !important;
}
.dashboard-library-grid {
  grid-template-columns: repeat(
    auto-fit,
    minmax(
      min(100%, max(40%, calc(var(--ui-layout-target-enhanced-minimum-inline-size) * 3.5))),
      1fr
    )
  );
}
.dashboard-library-preview {
  aspect-ratio: 30 / 17;
  pointer-events: none;
  transition: transform var(--ui-motion-duration) var(--ui-motion-easing);
}
html[data-motion='full']
  .dashboard-library-card:not(:disabled):is(:hover, :focus-visible)
  .dashboard-library-preview {
  transform: translateY(calc(var(--ui-space-component-unit) * -1));
}
</style>
