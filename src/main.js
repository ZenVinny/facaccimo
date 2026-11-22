import { createApp } from 'vue'
import { Buffer } from 'buffer'
import './theme.css'
import App from './App.vue'
import naive from 'naive-ui'
import { message, dialog, loadingBar, prompt, promptPair, confirmAction, linkDialog } from './ui'

// Tools like @isomorphic-git/lightning-fs read Buffer off the window object.
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.global = window;
}

const app = createApp(App)
app.use(naive)
app.config.globalProperties.$message = message
app.config.globalProperties.$dialog = dialog
app.config.globalProperties.$loadingBar = loadingBar
app.config.globalProperties.$prompt = prompt
app.config.globalProperties.$promptPair = promptPair
app.config.globalProperties.$confirm = confirmAction
app.config.globalProperties.$link = linkDialog
app.mount('#app')
