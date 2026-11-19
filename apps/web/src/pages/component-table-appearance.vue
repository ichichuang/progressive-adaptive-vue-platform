<script setup lang="ts">
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import WorkbenchSection from '../app/workbench/WorkbenchSection.vue'
import TableAppearanceSpecimen from '../app/workbench/tables/TableAppearanceSpecimen.vue'
import { tableAppearanceGroups } from '../app/workbench/tables/table-appearance-gallery'
import { useConsoleI18n } from '../shared/i18n'

defineOptions({ name: 'ComponentTableAppearancePage' })
defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <div
      class="grid min-w-0 gap-field-gap"
      data-table-example="appearance"
    >
      <WorkbenchSection
        v-for="group in tableAppearanceGroups"
        :key="group.id"
        :title="t(group.label)"
        :description="t(group.description)"
        :data-table-style-group="group.id"
      >
        <div
          class="grid grid-cols-1 min-w-0 items-start gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-3"
        >
          <TableAppearanceSpecimen
            v-for="specimen in group.specimens"
            :key="specimen.id"
            :specimen="specimen"
          />
        </div>
      </WorkbenchSection>
    </div>
  </WorkbenchPage>
</template>
