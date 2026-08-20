import './generated/frames-catalog'
import '@fontsource/montserrat/latin-400.css'
import '@fontsource/montserrat/latin-500.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/latin-800.css'
import './style.css'

import { initTheme, toggleTheme } from './theme'
import { initKeyboard } from './keyboard'
import { initUploads } from './uploads'
import { initDevicePicker } from './devicePicker'
import { initBackgroundEditor } from './backgroundEditor'
import { initShadowEditor } from './shadowEditor'
import { initPreviews } from './previews'
import { initLightbox } from './lightbox'
import { downloadSingle, downloadZip } from './export'
import { store } from './state'
import { toast } from './toast'
import { icon } from './icons'

const exportBar = () => document.getElementById('export-bar') as HTMLElement
const exportMeta = () => document.getElementById('export-meta') as HTMLElement
const exportTitle = () => document.getElementById('export-title') as HTMLElement
const themeToggle = () => document.getElementById('theme-toggle') as HTMLButtonElement

function initThemeToggle() {
  const setIcon = () => {
    const dark = store.get().theme === 'dark'
    themeToggle().innerHTML = icon(dark ? 'sun' : 'moon', 20)
  }
  setIcon()
  themeToggle().addEventListener('click', () => toggleTheme())
  store.subscribe(() => setIcon())
}

function initAbout() {
  const openBtn = document.getElementById('about-open')
  const modal = document.getElementById('about-modal')
  const close = document.getElementById('about-close')
  if (!openBtn || !modal || !close) return
  openBtn.addEventListener('click', () => {
    modal.hidden = false
    document.body.classList.add('no-scroll')
    requestAnimationFrame(() => modal.classList.add('show'))
  })
  const dismiss = () => {
    modal.classList.remove('show')
    window.setTimeout(() => (modal.hidden = true), 220)
    document.body.classList.remove('no-scroll')
  }
  close.addEventListener('click', dismiss)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) dismiss()
  })
  document.getElementById('about-link')?.addEventListener('click', () => openBtn.click())
}

function initExportBar() {
  document.getElementById('download-single')!.addEventListener('click', async () => {
    try {
      await downloadSingle()
      toast('PNG downloaded')
    } catch (err) {
      toast((err as Error).message)
    }
  })
  document.getElementById('download-zip')!.addEventListener('click', async () => {
    try {
      toast('Preparing ZIP…')
      await downloadZip()
      toast('ZIP downloaded')
    } catch (err) {
      toast((err as Error).message)
    }
  })

  store.subscribe(() => {
    const state = store.get()
    const selectedCount = state.screenshots.filter((s) => state.selected.has(s.id)).length
    const deviceCount = state.devices.length
    const ready = selectedCount > 0 && deviceCount > 0
    exportBar().hidden = !ready
    if (ready) {
      const count = selectedCount * deviceCount
      exportMeta().textContent = `${count} ${count === 1 ? 'image' : 'images'} · 2160×3840 PNG`
      exportTitle().textContent = state.exporting
        ? `Exporting ${state.progress?.done ?? 0}/${state.progress?.total ?? count}…`
        : 'Ready to export'
    }
  })
}

function boot() {
  initTheme()
  initThemeToggle()
  initKeyboard()
  initUploads()
  initDevicePicker()
  initBackgroundEditor()
  initShadowEditor()
  initPreviews()
  initLightbox()
  initExportBar()
  initAbout()
}

boot()