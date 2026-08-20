import { store } from './state'
import { toggleTheme } from './theme'

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function initKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (isEditable(e.target)) return

    const active = document.activeElement as HTMLElement | null

    if (e.key === ' ') {
      if (active?.classList.contains('thumb')) {
        e.preventDefault()
        store.toggleSelection(active.dataset.id!)
      } else if (active?.classList.contains('chip')) {
        e.preventDefault()
        store.toggleDevice(active.dataset.variantKey!)
      }
      return
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      store.undo()
      return
    }

    if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
      store.selectAll()
      return
    }

    if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
      toggleTheme()
      return
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (active?.classList.contains('thumb')) {
        store.removeScreenshot(active.dataset.id!)
      }
      return
    }

    if (e.key.startsWith('Arrow')) {
      const set = active?.classList.contains('chip') ? '.chip' : '.thumb'
      const items = Array.from(document.querySelectorAll<HTMLElement>(set))
      if (!items.length) return
      const idx = items.indexOf(active as HTMLElement)
      let next = idx
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % items.length
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + items.length) % items.length
      if (next !== idx && items[next]) {
        e.preventDefault()
        items[next].focus()
        items[next].scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
  })
}