<script setup lang="ts">
import { onDeactivated, ref } from 'vue'
import { tokens } from '@platform/design-system'
import { NAlert } from 'naive-ui/es/alert'
import { NButton } from 'naive-ui/es/button'
import { NDialog } from 'naive-ui/es/dialog'
import { NDrawer, NDrawerContent } from 'naive-ui/es/drawer'
import { NEmpty } from 'naive-ui/es/empty'
import { NLoadingBarProvider } from 'naive-ui/es/loading-bar'
import { NMessageProvider } from 'naive-ui/es/message'
import { NModal, NModalProvider } from 'naive-ui/es/modal'
import { NNotificationProvider } from 'naive-ui/es/notification'
import { NPopover } from 'naive-ui/es/popover'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { NProgress } from 'naive-ui/es/progress'
import { NResult } from 'naive-ui/es/result'
import { NSkeleton } from 'naive-ui/es/skeleton'
import { NSpin } from 'naive-ui/es/spin'
import { NTooltip } from 'naive-ui/es/tooltip'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'
import FeedbackProviderSpecimens from '../app/workbench/FeedbackProviderSpecimens.vue'

defineOptions({ name: 'ComponentFeedbackPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const modal = ref(false)
const drawer = ref(false)
const confirmed = ref(false)
const busy = ref(false)
const percentage = ref(40)
onDeactivated(() => {
  modal.value = false
  drawer.value = false
})
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
          {{ t('showcase.group.feedbackGlobal') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <NMessageProvider
            to="#pavp-overlay-root"
            :max="1"
          >
            <NNotificationProvider
              to="#pavp-overlay-root"
              :max="1"
            >
              <NModalProvider to="#pavp-overlay-root">
                <NLoadingBarProvider to="#pavp-overlay-root">
                  <FeedbackProviderSpecimens />
                </NLoadingBarProvider>
              </NModalProvider>
            </NNotificationProvider>
          </NMessageProvider>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.feedbackStates') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NAlert"
            :modes="['info', 'success']"
            span="wide"
          >
            <NAlert
              type="info"
              :title="t('showcase.info')"
            >
              {{ t('showcase.localNote') }}
            </NAlert>
            <NAlert
              type="success"
              :title="t('showcase.success')"
            >
              {{ t('showcase.preview') }}
            </NAlert>
          </ComponentSpecimen>
          <ComponentSpecimen name="NProgress">
            <NProgress
              type="line"
              :percentage="percentage"
            />
            <NButton
              size="small"
              @click="percentage = percentage >= 100 ? 0 : percentage + 20"
            >
              {{ t('showcase.next') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen name="NSpin · NSkeleton">
            <NSpin
              :show="busy"
              class="w-full"
            >
              <NSkeleton
                text
                :repeat="3"
              />
            </NSpin>
            <NButton @click="busy = !busy">
              {{ t('showcase.loading') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen name="NEmpty">
            <NEmpty :description="t('showcase.empty')" />
          </ComponentSpecimen>
          <ComponentSpecimen name="NResult">
            <NResult
              status="success"
              :title="t('showcase.success')"
              :description="t('showcase.localNote')"
              size="small"
            />
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.feedbackOverlays') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NTooltip"
            recreate-on-activate
          >
            <NTooltip :to="'#pavp-overlay-root'">
              <template #trigger>
                <NButton>{{ t('showcase.preview') }}</NButton>
              </template>
              {{ t('showcase.description') }}
            </NTooltip>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NPopover"
            recreate-on-activate
          >
            <NPopover
              trigger="click"
              :to="'#pavp-overlay-root'"
            >
              <template #trigger>
                <NButton>{{ t('showcase.open') }}</NButton>
              </template>
              {{ t('showcase.overlayBody') }}
            </NPopover>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NPopconfirm"
            recreate-on-activate
          >
            <NPopconfirm
              :to="'#pavp-overlay-root'"
              @positive-click="confirmed = !confirmed"
            >
              <template #trigger>
                <NButton>{{ t('showcase.confirm') }}</NButton>
              </template>
              {{ t('showcase.overlayBody') }}
            </NPopconfirm>
            <span class="text-text-secondary">{{
              confirmed ? t('showcase.success') : t('showcase.default')
            }}</span>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NModal · NDialog"
            span="wide"
          >
            <NButton @click="modal = true">
              {{ t('showcase.openDialog') }}
            </NButton>
            <NModal
              v-model:show="modal"
              :to="'#pavp-overlay-root'"
            >
              <NDialog
                :title="t('showcase.preview')"
                :content="t('showcase.overlayBody')"
                @close="modal = false"
              >
                <template #action>
                  <NButton
                    type="primary"
                    @click="modal = false"
                  >
                    {{ t('showcase.close') }}
                  </NButton>
                </template>
              </NDialog>
            </NModal>
          </ComponentSpecimen>
          <ComponentSpecimen name="NDrawer · NDrawerContent">
            <NButton @click="drawer = true">
              {{ t('showcase.openDrawer') }}
            </NButton>
            <NDrawer
              v-model:show="drawer"
              :width="tokens['layout.admin.drawer.maximum-inline-size']"
              :to="'#pavp-overlay-root'"
            >
              <NDrawerContent
                :title="t('showcase.preview')"
                :native-scrollbar="false"
                closable
              >
                {{ t('showcase.overlayBody') }}
              </NDrawerContent>
            </NDrawer>
          </ComponentSpecimen>
        </div>
      </section>
    </section>
  </WorkbenchPage>
</template>
