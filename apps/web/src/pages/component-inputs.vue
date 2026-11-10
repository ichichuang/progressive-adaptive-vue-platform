<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { NAutoComplete } from 'naive-ui/es/auto-complete'
import { NButton } from 'naive-ui/es/button'
import { NColorPicker } from 'naive-ui/es/color-picker'
import { NDatePicker } from 'naive-ui/es/date-picker'
import { NDynamicInput } from 'naive-ui/es/dynamic-input'
import { NDynamicTags } from 'naive-ui/es/dynamic-tags'
import { NForm, NFormItem, NFormItemCol, NFormItemGi, NFormItemRow } from 'naive-ui/es/form'
import { NGrid } from 'naive-ui/es/grid'
import { NInput, NInputGroup, NInputGroupLabel } from 'naive-ui/es/input'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NInputOtp } from 'naive-ui/es/input-otp'
import { NMention } from 'naive-ui/es/mention'
import { NRow } from 'naive-ui/es/legacy-grid'
import { NTimePicker } from 'naive-ui/es/time-picker'
import { NUpload, NUploadDragger, NUploadFileList, NUploadTrigger } from 'naive-ui/es/upload'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'
import ConfiguredFormSpecimen from '../app/workbench/ConfiguredFormSpecimen.vue'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'

defineOptions({ name: 'ComponentInputsPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const formId = useId()
const formSource = ref<'code' | 'json'>('code')
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const formCapabilities = registeredRouteDestination({ name: 'component-form-basics' })
const textValue = ref('')
const formItemValue = ref('')
const formColumnValue = ref('')
const formGridValue = ref('')
const formRowValue = ref('')
const numberValue = ref<number | null>(12)
const otpValue = ref<string[]>([])
const autoValue = ref('')
const mentionValue = ref('')
const dateValue = ref<number | null>(null)
const timeValue = ref<number | null>(null)
const colorValue = ref<string | null>(null)
const dynamicValue = ref<string[]>([])
const tags = ref<string[]>([])
const componentOptions = ['NButton', 'NInput', 'NSelect']
const autoOptions = computed(() =>
  componentOptions.filter((option) => option.toLowerCase().includes(autoValue.value.toLowerCase())),
)
const mentions = componentOptions.map((value) => ({ label: value, value }))
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <div class="flex flex-wrap min-w-0 items-center justify-between gap-content-gap">
      <p class="m-0 text-caption text-text-secondary">
        {{ t('showcase.formNote') }}
      </p>
      <NButton
        tag="a"
        text
        type="primary"
        :href="navigation.resolveHref(formCapabilities)"
        @click="activate($event, formCapabilities)"
      >
        {{ t('formShowcase.openCapabilities') }} ↗
      </NButton>
    </div>
    <section
      class="wb-page grid min-w-0"
      :aria-label="title"
    >
      <ConfiguredFormSpecimen
        :key="formSource"
        :source="formSource"
        @source="formSource = $event"
      />
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.inputsText') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NInput"
            span="wide"
          >
            <NInput
              v-model:value="textValue"
              clearable
              :placeholder="t('showcase.placeholder')"
              :input-props="{ 'aria-label': t('showcase.placeholder') }"
            />
            <NInput
              disabled
              :placeholder="t('showcase.disabled')"
              :input-props="{ 'aria-label': t('showcase.disabled') }"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NInput · size"
            :modes="['small', 'medium', 'large']"
          >
            <NInput
              size="small"
              :placeholder="t('showcase.small')"
              :input-props="{ 'aria-label': t('showcase.small') }"
            />
            <NInput
              size="medium"
              :placeholder="t('showcase.medium')"
              :input-props="{ 'aria-label': t('showcase.medium') }"
            />
            <NInput
              size="large"
              :placeholder="t('showcase.large')"
              :input-props="{ 'aria-label': t('showcase.large') }"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NInputGroup · NInputGroupLabel"
            span="wide"
          >
            <NInputGroup>
              <NInputGroupLabel>PAVP</NInputGroupLabel>
              <NInput :input-props="{ 'aria-label': t('showcase.placeholder') }" />
            </NInputGroup>
          </ComponentSpecimen>
          <ComponentSpecimen name="NInputNumber">
            <NInputNumber
              v-model:value="numberValue"
              :input-props="{ 'aria-label': t('showcase.placeholder') }"
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NInputOtp">
            <NInputOtp
              v-model:value="otpValue"
              :length="4"
              :aria-label="t('showcase.placeholder')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NAutoComplete"
            recreate-on-activate
          >
            <NAutoComplete
              v-model:value="autoValue"
              :options="autoOptions"
              :to="'#pavp-overlay-root'"
              :placeholder="t('showcase.autoPlaceholder')"
              :input-props="{ 'aria-label': t('showcase.autoPlaceholder') }"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NMention"
            recreate-on-activate
          >
            <NMention
              v-model:value="mentionValue"
              :options="mentions"
              :to="'#pavp-overlay-root'"
              :placeholder="t('showcase.mentionPlaceholder')"
              :aria-label="t('showcase.mentionPlaceholder')"
            />
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.inputsDateColor') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NDatePicker"
            recreate-on-activate
          >
            <NDatePicker
              v-model:value="dateValue"
              type="date"
              clearable
              :to="'#pavp-overlay-root'"
              :aria-label="t('showcase.placeholder')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NTimePicker"
            recreate-on-activate
          >
            <NTimePicker
              v-model:value="timeValue"
              clearable
              :to="'#pavp-overlay-root'"
              :aria-label="t('showcase.placeholder')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NColorPicker"
            recreate-on-activate
          >
            <NColorPicker
              v-model:value="colorValue"
              :to="'#pavp-overlay-root'"
              :aria-label="t('showcase.placeholder')"
            />
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.inputsFormFiles') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NDynamicInput"
            span="wide"
            reserved
          >
            <NDynamicInput
              v-model:value="dynamicValue"
              :max="3"
              :on-create="() => ''"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NDynamicTags"
            reserved
          >
            <NDynamicTags
              v-model:value="tags"
              :max="3"
              :input-props="{ maxlength: 20 }"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NForm · NFormItem"
            span="full"
          >
            <NForm class="w-full">
              <div class="wb-specimen-grid grid min-w-0 gap-content-gap">
                <NFormItem
                  :label-props="{ for: `${formId}-project` }"
                  :label="t('showcase.formProject')"
                >
                  <NInput
                    v-model:value="formItemValue"
                    :input-props="{ id: `${formId}-project` }"
                    :placeholder="t('showcase.placeholder')"
                  />
                </NFormItem>
                <NRow>
                  <NFormItemCol
                    :label-props="{ for: `${formId}-owner` }"
                    :span="24"
                    :label="t('showcase.formOwner')"
                  >
                    <NInput
                      v-model:value="formColumnValue"
                      :input-props="{ id: `${formId}-owner` }"
                    />
                  </NFormItemCol>
                </NRow>
                <NGrid :cols="1">
                  <NFormItemGi
                    :label-props="{ for: `${formId}-category` }"
                    :label="t('showcase.formCategory')"
                  >
                    <NInput
                      v-model:value="formGridValue"
                      :input-props="{ id: `${formId}-category` }"
                    />
                  </NFormItemGi>
                </NGrid>
                <NFormItemRow
                  :label-props="{ for: `${formId}-notes` }"
                  :label="t('showcase.formNotes')"
                >
                  <NInput
                    v-model:value="formRowValue"
                    :input-props="{ id: `${formId}-notes` }"
                  />
                </NFormItemRow>
              </div>
            </NForm>
            <template #detail>
              {{ t('showcase.formNote') }}
            </template>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NUpload · NUploadDragger"
            span="full"
            reserved
          >
            <div class="wb-specimen-grid grid min-w-0 w-full gap-content-gap">
              <div class="grid min-w-0 content-start gap-content-gap">
                <span class="text-text-secondary">{{ t('showcase.uploadSelect') }}</span>
                <NUpload
                  abstract
                  file-list-class="min-h-target-enhanced"
                  :default-upload="false"
                  :max="1"
                >
                  <NUploadTrigger>
                    <NButton>{{ t('showcase.upload') }}</NButton>
                  </NUploadTrigger>
                  <NUploadFileList />
                </NUpload>
              </div>
              <div class="grid min-w-0 content-start gap-content-gap">
                <span class="text-text-secondary">{{ t('showcase.uploadDrop') }}</span>
                <NUpload
                  file-list-class="min-h-target-enhanced"
                  :default-upload="false"
                  :max="1"
                >
                  <NUploadDragger>{{ t('showcase.upload') }}</NUploadDragger>
                </NUpload>
              </div>
            </div>
            <template #detail>
              {{ t('showcase.uploadNote') }}
            </template>
          </ComponentSpecimen>
        </div>
      </section>
    </section>
  </WorkbenchPage>
</template>
