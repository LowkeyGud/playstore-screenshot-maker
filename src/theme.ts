import { store } from './state'

const STORAGE_KEY = 'pssm-theme'

type Theme = 'dark' | 'light'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  const theme = saved ?? systemTheme()
  applyTheme(theme)
  store.setTheme(theme)
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (localStorage.getItem(STORAGE_KEY) === null) {
      applyTheme(e.matches ? 'light' : 'dark')
      store.setTheme(e.matches ? 'light' : 'dark')
    }
  })
}

export function toggleTheme() {
  const next: Theme = store.get().theme === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, next)
  applyTheme(next)
  store.setTheme(next)
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#141633' : '#f4f5fb')
}