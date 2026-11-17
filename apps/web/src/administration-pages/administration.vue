<script setup lang="ts">
import { useConsoleI18n } from '../shared/i18n'

const { t } = useConsoleI18n()
defineOptions({ name: 'AdministrationAdministrationRoute' })
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component
      :is="Component"
      v-if="Component"
    />
    <section
      v-else
      class="p-page-inline"
    >
      <h1
        tabindex="-1"
        data-route-focus="architecture-console-page-heading"
      >
        {{ t('route-title.administration-shell') }}
      </h1>
    </section>
  </RouterView>
</template>
