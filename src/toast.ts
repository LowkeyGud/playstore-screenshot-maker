let toastEl: HTMLDivElement | null = null
let hideTimer: number | undefined

export function toast(message: string, ms = 2600) {
  if (!toastEl) toastEl = document.getElementById('toast') as HTMLDivElement
  if (!toastEl) return
  toastEl.textContent = message
  toastEl.hidden = false
  toastEl.classList.add('show')
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    toastEl!.classList.remove('show')
    window.setTimeout(() => (toastEl!.hidden = true), 300)
  }, ms)
}