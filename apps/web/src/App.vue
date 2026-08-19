<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import { getRoutePresentation } from './app/router/route-registry'

const route = useRoute()
const presentation = computed(() => getRoutePresentation(route.name))
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component
      :is="Component"
      :message="presentation.message"
      :title="presentation.title"
    />
  </RouterView>
</template>
