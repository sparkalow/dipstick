import { createApp } from 'vue'
// Self-hosted brand fonts (see CLAUDE.md "Typography"). Weight sets mirror the design comp:
// Space Grotesk for headings/buttons, Inter for body/inputs, JetBrains Mono for stats/data.
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './style.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
