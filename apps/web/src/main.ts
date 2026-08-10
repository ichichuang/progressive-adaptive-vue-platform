import { createPinia } from 'pinia'
import { createApp } from 'vue'

import './app/styles/layers.css'
import 'virtual:uno.css'
import App from './App.vue'
import { bootstrapAppearance } from './app/appearance/appearance-bootstrap'
import { useAppearanceStore } from './app/appearance/appearance.store'

const application = createApp(App)
const pinia = createPinia()

application.use(pinia)
const appearanceStore = useAppearanceStore(pinia)
const disposeAppearance = bootstrapAppearance(appearanceStore)
application.mount('#app')

if (import.meta.hot !== undefined) {
  import.meta.hot.dispose(disposeAppearance)
}
