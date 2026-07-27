import { createApp } from 'vue'

import 'virtual:uno.css'
import './app/styles/layers.css'
import App from './App.vue'

const application = createApp(App)

application.mount('#app')
