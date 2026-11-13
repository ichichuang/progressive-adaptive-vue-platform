<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { computed, onActivated, onDeactivated, ref } from 'vue'
import { LazyMotion, MotionConfig, domMax, m } from 'motion-v'
import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../router/application-navigation'
import { registeredRouteDestination } from '../router/route-input'
import WelcomeCapabilityStage from './WelcomeCapabilityStage.vue'

defineOptions({ name: 'WelcomeExperience' })
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const active = ref(true)
const selectedExpression = ref<'a' | 'b'>('a')
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
})
const full = computed(() => active.value && appearance.snapshot.value.motion === 'full')
const instant = computed(() => appearance.snapshot.value.motion === 'none')
const transition = computed(() => ({ duration: instant.value ? 0 : full.value ? 0.75 : 0.12 }))
const dashboard = registeredRouteDestination({ name: 'workbench-dashboard' })
const showcase = registeredRouteDestination({ name: 'component-showcase' })
</script>

<template>
  <div class="wb-page wb-home grid min-w-0">
    <LazyMotion :features="domMax">
      <MotionConfig
        :reduced-motion="full ? 'never' : 'always'"
        :skip-animations="instant"
      >
        <div class="wb-home-first-screen grid min-w-0">
          <section
            class="wb-home-hero rounded-panel relative isolate"
            :aria-label="t('welcomeArt.intro')"
          >
            <div class="wb-home-hero-grid grid items-center relative gap-content-gap">
              <div class="wb-home-editorial grid content-center">
                <m.p
                  class="wb-home-eyebrow m-0 text-caption text-expression-accent-a-foreground"
                  :initial="full ? { opacity: 0, y: 12 } : false"
                  :animate="{ opacity: 1, y: 0 }"
                  :transition="transition"
                >
                  Progressive Adaptive Vue Platform
                </m.p>
                <m.h2
                  class="wb-home-headline font-title-weight m-0"
                  :initial="full ? { opacity: 0, y: 24 } : false"
                  :animate="{ opacity: 1, y: 0 }"
                  :transition="{ ...transition, delay: full ? 0.1 : 0 }"
                >
                  <span class="block">PAVP</span>
                  <span
                    class="wb-home-subtitle"
                    v-text="t('welcomeArt.titleTwo')"
                  />
                </m.h2>
                <m.p
                  class="wb-home-description m-0 text-body text-text-secondary"
                  :initial="full ? { opacity: 0, y: 16 } : false"
                  :animate="{ opacity: 1, y: 0 }"
                  :transition="{ ...transition, delay: full ? 0.2 : 0 }"
                >
                  {{ t('welcomeArt.description') }}
                </m.p>
                <div class="flex flex-wrap items-center gap-content-gap">
                  <NButton
                    type="primary"
                    size="large"
                    tag="a"
                    :href="navigation.resolveHref(dashboard)"
                    @click="activate($event, dashboard)"
                  >
                    {{ t('welcomeArt.enter') }}
                    <template #icon>
                      <span
                        class="i-lucide-arrow-right"
                        aria-hidden="true"
                      />
                    </template>
                  </NButton>
                  <NButton
                    quaternary
                    size="large"
                    tag="a"
                    :href="navigation.resolveHref(showcase)"
                    @click="activate($event, showcase)"
                  >
                    {{ t('welcomeArt.explore') }}
                  </NButton>
                </div>
                <div
                  class="wb-home-signature flex-wrap items-center gap-content-gap text-caption text-text-secondary"
                >
                  <span>Vue 3</span>
                  <span>TypeScript</span>
                  <span>Naive UI</span>
                  <span>Motion</span>
                  <span>AntV G2</span>
                </div>
              </div>
              <WelcomeCapabilityStage />
            </div>
          </section>
          <section
            class="wb-home-manifesto grid gap-content-gap"
            :aria-label="t('welcomeArt.philosophy')"
          >
            <div class="wb-home-feature-grid grid gap-content-gap">
              <m.article
                class="wb-home-feature grid text-expression-accent-a-soft-foreground"
                :while-hover="full ? { y: -6 } : {}"
                :transition="transition"
              >
                <h3 class="font-title-weight m-0 text-subheading">
                  {{ t('welcomeArt.systemTitle') }}
                </h3>
                <p class="m-0 text-body">
                  {{ t('welcomeArt.systemBody') }}
                </p>
                <div
                  class="wb-home-swatch-ribbon flex"
                  aria-hidden="true"
                >
                  <span class="bg-data-viz-categorical-series-1" />
                  <span class="bg-data-viz-categorical-series-2" />
                  <span class="bg-data-viz-categorical-series-3" />
                  <span class="bg-data-viz-categorical-series-4" />
                  <span class="bg-data-viz-categorical-series-5" />
                  <span class="bg-data-viz-categorical-series-6" />
                  <span class="bg-data-viz-categorical-series-7" />
                  <span class="bg-data-viz-categorical-series-8" />
                </div>
              </m.article>
              <m.article
                class="wb-home-feature grid"
                :while-hover="full ? { y: -6 } : {}"
                :transition="transition"
              >
                <h3 class="font-title-weight m-0 text-subheading">
                  {{ t('welcomeArt.composeTitle') }}
                </h3>
                <p class="m-0 text-body text-text-secondary">
                  {{ t('welcomeArt.composeBody') }}
                </p>
                <div class="wb-home-flow flex items-center gap-component-unit text-caption">
                  <span
                    class="rounded-control bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground"
                    v-text="t('welcomeArt.configure')"
                  />
                  <span
                    class="i-lucide-arrow-right"
                    aria-hidden="true"
                  />
                  <span
                    class="rounded-control bg-expression-accent-b-soft-background text-expression-accent-b-soft-foreground"
                    v-text="t('welcomeArt.compose')"
                  />
                  <span
                    class="i-lucide-arrow-right"
                    aria-hidden="true"
                  />
                  <span
                    class="rounded-control bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground"
                    v-text="t('welcomeArt.create')"
                  />
                </div>
              </m.article>
              <m.article
                class="wb-home-feature grid text-expression-accent-b-soft-foreground"
                :while-hover="full ? { y: -6 } : {}"
                :transition="transition"
              >
                <h3 class="font-title-weight m-0 text-subheading">
                  {{ t('welcomeArt.motionTitle') }}
                </h3>
                <p class="m-0 text-body">
                  {{ t('welcomeArt.motionBody') }}
                </p>
                <div
                  class="wb-home-motion-wave flex items-end gap-component-unit"
                  aria-hidden="true"
                >
                  <m.span
                    v-for="n in 12"
                    :key="n"
                    class="rounded-control bg-expression-accent-b-solid-background"
                    :animate="
                      full
                        ? { scaleY: [0.3 + (n % 3) * 0.2, 1, 0.3 + (n % 3) * 0.2] }
                        : { scaleY: 0.3 + (n % 4) * 0.2 }
                    "
                    :transition="{
                      duration: 3,
                      repeat: full ? Infinity : 0,
                      delay: n * 0.12,
                      ease: 'easeInOut',
                    }"
                  />
                </div>
              </m.article>
            </div>
          </section>
        </div>
        <section
          class="wb-home-expression rounded-panel grid min-w-0 gap-content-gap"
          :aria-label="t('welcomeArt.expressionTitle')"
        >
          <div class="grid content-center gap-content-gap">
            <p
              class="m-0 text-caption text-expression-accent-b-foreground"
              v-text="'PAVP · DESIGN SYSTEM'"
            />
            <h2 class="font-title-weight m-0 text-title">
              {{ t('welcomeArt.expressionTitle') }}
            </h2>
            <p class="m-0 text-body text-text-secondary">
              {{ t('welcomeArt.expressionBody') }}
            </p>
            <div class="flex flex-wrap gap-component-unit">
              <NButton
                :type="selectedExpression === 'a' ? 'primary' : 'default'"
                :aria-pressed="selectedExpression === 'a'"
                @click="selectedExpression = 'a'"
              >
                {{ t('welcomeArt.expressionA') }}
              </NButton>
              <NButton
                :type="selectedExpression === 'b' ? 'primary' : 'default'"
                :aria-pressed="selectedExpression === 'b'"
                @click="selectedExpression = 'b'"
              >
                {{ t('welcomeArt.expressionB') }}
              </NButton>
            </div>
          </div>
          <m.div
            class="wb-home-expression-preview rounded-panel grid gap-content-gap"
            :class="
              selectedExpression === 'a'
                ? 'bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground'
                : 'bg-expression-accent-b-soft-background text-expression-accent-b-soft-foreground'
            "
            :animate="{ opacity: 1 }"
            :transition="transition"
          >
            <div
              class="wb-home-expression-mark rounded-panel grid place-items-center"
              :class="
                selectedExpression === 'a'
                  ? 'bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground'
                  : 'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground'
              "
            >
              <m.span
                :key="selectedExpression"
                class="i-lucide-layers"
                :initial="full ? { rotate: -20, scale: 0.75 } : false"
                :animate="{ rotate: 0, scale: 1 }"
                :transition="transition"
                aria-hidden="true"
              />
            </div>
            <h3 class="font-title-weight m-0 text-subheading">
              {{ t('welcomeArt.expressionPreview') }}
            </h3>
            <p class="m-0 text-body">
              {{ t('welcomeArt.expressionDetail') }}
            </p>
            <div
              class="wb-home-swatch-ribbon flex"
              aria-hidden="true"
            >
              <span class="bg-data-viz-categorical-series-1" /><span
                class="bg-data-viz-categorical-series-2"
              /><span class="bg-data-viz-categorical-series-3" /><span
                class="bg-data-viz-categorical-series-4"
              /><span class="bg-data-viz-categorical-series-5" />
            </div>
          </m.div>
        </section>
      </MotionConfig>
    </LazyMotion>
  </div>
</template>
