<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NButtonGroup } from 'naive-ui/es/button-group'
import { NFloatButton } from 'naive-ui/es/float-button'
import { NFloatButtonGroup } from 'naive-ui/es/float-button-group'
import { NIcon } from 'naive-ui/es/icon'
import { NIconWrapper } from 'naive-ui/es/icon-wrapper'
import { NGradientText } from 'naive-ui/es/gradient-text'
import { tokens } from '@platform/design-system'
import { UiCopyAction } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'

defineOptions({ name: 'ComponentActionsPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const clicks = ref(0)
const floatClicks = ref(0)
const groupSelection = ref('first')
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <section
      class="wb-page grid min-w-0"
      :aria-label="title"
    >
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.actionsButtons') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="UiCopyAction"
            pavp
          >
            <div class="flex w-full justify-center">
              <UiCopyAction
                variant="primary"
                :value="t('showcase.purpose.UiCopyAction')"
                :label="t('showcase.copyPurpose')"
                copy-label="UiCopyAction"
                :success-label="t('workbench.copied')"
                :failure-label="t('workbench.copyFailed')"
              />
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButton · type"
            :modes="['primary', 'info', 'success', 'warning', 'error']"
            span="wide"
          >
            <NButton
              type="primary"
              @click="clicks++"
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton
              type="info"
              @click="clicks++"
            >
              {{ t('showcase.info') }}
            </NButton>
            <NButton
              type="success"
              @click="clicks++"
            >
              {{ t('showcase.success') }}
            </NButton>
            <NButton
              type="warning"
              @click="clicks++"
            >
              {{ t('showcase.warning') }}
            </NButton>
            <NButton
              type="error"
              @click="clicks++"
            >
              {{ t('showcase.error') }}
            </NButton>
            <template #detail>
              {{ t('showcase.buttonCount') + ': ' + clicks }}
            </template>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButton · variant"
            :modes="['secondary', 'tertiary', 'ghost', 'text', 'disabled', 'loading']"
          >
            <NButton
              type="primary"
              secondary
            >
              {{ t('showcase.secondary') }}
            </NButton>
            <NButton
              type="primary"
              tertiary
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton
              type="primary"
              ghost
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton
              type="primary"
              text
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton disabled>
              {{ t('showcase.disabled') }}
            </NButton>
            <NButton loading>
              {{ t('showcase.loading') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButton · size"
            :modes="['small', 'medium', 'large']"
            span="medium"
          >
            <NButton size="small">
              {{ t('showcase.small') }}
            </NButton>
            <NButton size="medium">
              {{ t('showcase.medium') }}
            </NButton>
            <NButton size="large">
              {{ t('showcase.large') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButtonGroup"
            span="medium"
            :modes="['small']"
          >
            <NButtonGroup size="small">
              <NButton
                :type="groupSelection === 'first' ? 'primary' : 'default'"
                :aria-pressed="groupSelection === 'first'"
                @click="groupSelection = 'first'"
              >
                {{ t('showcase.first') }}
              </NButton>
              <NButton
                :type="groupSelection === 'second' ? 'primary' : 'default'"
                :aria-pressed="groupSelection === 'second'"
                @click="groupSelection = 'second'"
              >
                {{ t('showcase.second') }}
              </NButton>
            </NButtonGroup>
          </ComponentSpecimen>
          <ComponentSpecimen name="NFloatButton · NFloatButtonGroup">
            <NFloatButtonGroup position="relative">
              <NFloatButton
                type="primary"
                :aria-label="t('showcase.primary')"
                @click="floatClicks++"
              >
                <span
                  class="i-lucide-sparkles"
                  aria-hidden="true"
                />
              </NFloatButton>
              <NFloatButton
                :aria-label="t('showcase.secondary')"
                @click="floatClicks++"
              >
                <span
                  class="i-lucide-component"
                  aria-hidden="true"
                />
              </NFloatButton>
            </NFloatButtonGroup>
            <template #detail>
              {{ t('showcase.buttonCount') + ': ' + floatClicks }}
            </template>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.actionsVisual') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen name="NIcon · NIconWrapper · Lucide">
            <NIcon size="small">
              <span class="i-lucide-component inline-block" />
            </NIcon>
            <NIcon><span class="i-lucide-palette inline-block" /></NIcon>
            <NIcon size="large">
              <span class="i-lucide-sparkles inline-block" />
            </NIcon>
            <NIconWrapper
              :color="tokens['color.action.primary']"
              :icon-color="tokens['color.text.on-action']"
            >
              <NIcon><span class="i-lucide-check inline-block" /></NIcon>
            </NIconWrapper>
            <NButton type="primary">
              <template #icon>
                <NIcon><span class="i-lucide-check inline-block" /></NIcon>
              </template>
              {{ t('showcase.confirm') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen name="NGradientText">
            <NGradientText type="primary">
              {{ t('showcase.primary') }}
            </NGradientText>
            <NGradientText type="success">
              {{ t('showcase.success') }}
            </NGradientText>
            <NGradientText type="warning">
              {{ t('showcase.warning') }}
            </NGradientText>
          </ComponentSpecimen>
        </div>
      </section>
    </section>
  </WorkbenchPage>
</template>
