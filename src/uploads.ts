import { store } from './state'
import type { Screenshot } from './types'
import { uid } from './util'
import { toast } from './toast'
import { icon } from './icons'

const dropzone = () => document.getElementById('dropzone') as HTMLDivElement
const fileInput = () => document.getElementById('file-input') as HTMLInputElement
const thumbbar = () => document.getElementById('thumbbar') as HTMLDivElement
const thumbsEl = () => document.getElementById('thumbs') as HTMLDivElement
const thumbCount = () => document.getElementById('thumb-count') as HTMLSpanElement

export function initUploads() {
  const dz = dropzone()
  const input = fileInput()

  // A single user gesture must trigger input.click() exactly ONCE.
  // The input is nested inside #dropzone, so its own click() would bubble back
  // up to the dropzone's click handler and re-fire. Two synchronous click()
  // calls make Chromium suppress the file dialog entirely. stopPropagation
  // (both here and on the input itself) prevents that recursion cleanly.
  const openPicker = (e?: Event) => {
    e?.preventDefault()
    e?.stopPropagation()
    input.click()
  }
  // Stop the file input's own click event from bubbling into the dropzone handler.
  input.addEventListener('click', (e) => e.stopPropagation())

  document.getElementById('pick-files')!.addEventListener('click', openPicker)
  dz.addEventListener('click', openPicker)
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openPicker()
    }
  })

  input.addEventListener('change', () => {
    if (input.files?.length) void handleFiles(Array.from(input.files))
    input.value = ''
  })

  ;['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault()
      dz.classList.add('dragging')
    }),
  )
  ;['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault()
      dz.classList.remove('dragging')
    }),
  )
  dz.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files ?? []).filter(isImage)
    if (files.length) void handleFiles(files)
  })

  document.getElementById('clear-all')!.addEventListener('click', () => {
    if (!store.get().screenshots.length) return
    store.clearScreenshots()
    toast('Cleared all screenshots')
  })

  store.subscribe(render)
}

function isImage(f: File): boolean {
  return /^image\/(png|jpe?g|webp)/i.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name)
}

async function handleFiles(files: File[]) {
  const images = files.filter(isImage)
  if (!images.length) {
    toast('Only PNG, JPEG or WebP images are supported')
    return
  }
  const added: Screenshot[] = []
  for (const file of images) {
    try {
      const url = URL.createObjectURL(file)
      const dims = await getImageSize(url)
      added.push({ id: uid(), name: file.name, url, width: dims.width, height: dims.height })
    } catch {
      toast(`Could not read ${file.name}`)
    }
  }
  store.addScreenshots(added)
  toast(added.length > 1 ? `Added ${added.length} screenshots` : 'Added 1 screenshot')
}

function getImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}

function render() {
  const { screenshots, selected } = store.get()
  thumbbar().hidden = screenshots.length === 0
  thumbCount().textContent = `${screenshots.length} screenshot${screenshots.length === 1 ? '' : 's'}`

  const el = thumbsEl()
  el.textContent = ''
  for (const s of screenshots) el.appendChild(renderThumb(s, selected.has(s.id)))
}

function renderThumb(s: Screenshot, isSelected: boolean): HTMLElement {
  const tile = document.createElement('div')
  tile.className = 'thumb' + (isSelected ? ' selected' : '')
  tile.setAttribute('role', 'option')
  tile.setAttribute('aria-selected', String(isSelected))
  tile.tabIndex = 0
  tile.dataset.id = s.id

  const img = document.createElement('img')
  img.src = s.url
  img.alt = s.name
  img.loading = 'lazy'

  const remove = document.createElement('button')
  remove.className = 'thumb-remove'
  remove.type = 'button'
  remove.innerHTML = icon('close', 14)
  remove.setAttribute('aria-label', `Remove ${s.name}`)
  remove.addEventListener('click', (e) => {
    e.stopPropagation()
    store.removeScreenshot(s.id)
  })

  const dims = document.createElement('span')
  dims.className = 'thumb-dims'
  dims.textContent = `${s.width}×${s.height}`

  tile.append(img, dims, remove)
  tile.addEventListener('click', () => store.toggleSelection(s.id))
  return tile
}