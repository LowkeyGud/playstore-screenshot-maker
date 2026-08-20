import { store } from './state'
import type { BackgroundSpec } from './types'
import { toast } from './toast'

const BG_KEY = 'pssm-bg'

const SOLIDS = ['#141633', '#0f0f1a', '#1b1e3a', '#3b3f66', '#f4f5fb', '#ffffff', '#0ea5e9', '#f43f5e', '#10b981']
const GRADIENTS: { label: string; angle: number; stops: { color: string; pos: number }[] }[] = [
  { label: 'Brand', angle: 160, stops: [{ color: '#0f1128', pos: 0 }, { color: '#1d2148', pos: 1 }] },
  { label: 'Midnight', angle: 150, stops: [{ color: '#141633', pos: 0 }, { color: '#3b2a5e', pos: 1 }] },
  { label: 'Aurora', angle: 135, stops: [{ color: '#0f2027', pos: 0 }, { color: '#2c5364', pos: 1 }] },
  { label: 'Sunset', angle: 120, stops: [{ color: '#ff9966', pos: 0 }, { color: '#ff5e62', pos: 1 }] },
  { label: 'Ocean', angle: 135, stops: [{ color: '#2193b0', pos: 0 }, { color: '#6dd5ed', pos: 1 }] },
  { label: 'Graphite', angle: 180, stops: [{ color: '#111111', pos: 0 }, { color: '#333333', pos: 1 }] },
]

const editorEl = () => document.getElementById('bg-editor') as HTMLDivElement

type Tab = 'solid' | 'gradient' | 'image' | 'transparent'

let currentTab: Tab = tabOf(store.get().background)

export function initBackgroundEditor() {
  persist(store.get().background)
  loadSaved()
  render()
  store.subscribe(() => {
    if (tabOf(store.get().background) !== currentTab) currentTab = tabOf(store.get().background)
    render()
  })
}

function tabOf(bg: BackgroundSpec): Tab {
  return bg.kind
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(BG_KEY)
    if (!raw) return
    const bg = JSON.parse(raw) as BackgroundSpec
    if (bg && bg.kind) store.setBackground(bg)
  } catch {
    /* ignore */
  }
}

function persist(bg: BackgroundSpec) {
  try {
    localStorage.setItem(BG_KEY, JSON.stringify(bg))
  } catch {
    /* ignore */
  }
}

function render() {
  const el = editorEl()
  el.textContent = ''

  const tabs = document.createElement('div')
  tabs.className = 'bg-tabs'
  ;(['solid', 'gradient', 'image', 'transparent'] as Tab[]).forEach((t) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'bg-tab' + (t === currentTab ? ' active' : '')
    b.textContent = t === 'solid' ? 'Solid' : t === 'gradient' ? 'Gradient' : t === 'image' ? 'Image' : 'Transparent'
    b.addEventListener('click', () => {
      currentTab = t
      render()
    })
    tabs.appendChild(b)
  })
  el.appendChild(tabs)

  const body = document.createElement('div')
  body.className = 'bg-body'
  body.appendChild(renderTab(currentTab))
  el.appendChild(body)
}

function renderTab(tab: Tab): HTMLElement {
  if (tab === 'solid') return renderSolid()
  if (tab === 'gradient') return renderGradient()
  if (tab === 'image') return renderImage()
  return renderTransparent()
}

function renderSolid(): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'bg-controls'
  const bg = store.get().background
  const current = bg.kind === 'solid' ? bg.color : '#141633'

  const presets = document.createElement('div')
  presets.className = 'swatches'
  for (const c of SOLIDS) {
    const sw = document.createElement('button')
    sw.type = 'button'
    sw.className = 'swatch' + (c === current ? ' active' : '')
    sw.style.background = c
    sw.title = c
    sw.setAttribute('aria-label', `Solid ${c}`)
    sw.addEventListener('click', () => setBg({ kind: 'solid', color: c }))
    presets.appendChild(sw)
  }
  const picker = document.createElement('label')
  picker.className = 'colorpick'
  picker.innerHTML = '<span>Custom</span>'
  const input = document.createElement('input')
  input.type = 'color'
  input.value = /^#([0-9a-f]{6})$/i.test(current) ? current : '#141633'
  input.addEventListener('input', () => setBg({ kind: 'solid', color: input.value }))
  picker.appendChild(input)
  presets.appendChild(picker)

  wrap.appendChild(presets)
  return wrap
}

function renderTransparent(): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'bg-controls'
  const isActive = store.get().background.kind === 'transparent'

  const hint = document.createElement('p')
  hint.className = 'bg-hint'
  hint.textContent = 'Export with a transparent backdrop (PNG), ideal for overlays or store-builder templates.'
  wrap.appendChild(hint)

  const row = document.createElement('div')
  row.className = 'swatches'
  const sw = document.createElement('button')
  sw.type = 'button'
  sw.className = 'swatch swatch-transparent' + (isActive ? ' active' : '')
  sw.title = 'Transparent'
  sw.setAttribute('aria-label', 'Transparent background')
  sw.addEventListener('click', () => setBg({ kind: 'transparent' }))
  row.appendChild(sw)
  wrap.appendChild(row)
  return wrap
}

function renderGradient(): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'bg-controls'
  const bg = store.get().background
  const g = bg.kind === 'gradient' ? bg : { angle: 160, stops: [{ color: '#0f1128', pos: 0 }, { color: '#1d2148', pos: 1 }] }

  const presets = document.createElement('div')
  presets.className = 'swatches swatches-grad'
  for (const p of GRADIENTS) {
    const sw = document.createElement('button')
    sw.type = 'button'
    sw.className = 'swatch swatch-grad'
    sw.style.background = `linear-gradient(${p.angle}deg, ${p.stops.map((s) => s.color).join(', ')})`
    sw.title = p.label
    sw.setAttribute('aria-label', `Gradient ${p.label}`)
    sw.addEventListener('click', () =>
      setBg({ kind: 'gradient', angle: p.angle, stops: p.stops.map((s) => ({ ...s })) }),
    )
    presets.appendChild(sw)
  }
  wrap.appendChild(presets)

  const sliders = document.createElement('div')
  sliders.className = 'grad-sliders'

  const angle = labelSlider(sliders, 'Angle', 0, 360, g.angle, (v) => {
    const next = { kind: 'gradient' as const, angle: v, stops: g.stops }
    setBg(next)
  })
  sliders.appendChild(angle)

  const stops = document.createElement('div')
  stops.className = 'grad-stops'
  for (const s of g.stops) {
    const lbl = document.createElement('label')
    lbl.className = 'colorpick small'
    lbl.innerHTML = `<span>${s.pos === 0 ? 'Start' : 'End'}</span>`
    const ip = document.createElement('input')
    ip.type = 'color'
    ip.value = s.color
    ip.addEventListener('input', () => {
      const idx = g.stops.indexOf(s)
      const nextStops = g.stops.map((x, i) => (i === idx ? { ...x, color: ip.value } : x))
      setBg({ kind: 'gradient', angle: g.angle, stops: nextStops })
    })
    lbl.appendChild(ip)
    stops.appendChild(lbl)
  }
  sliders.appendChild(stops)
  wrap.appendChild(sliders)
  return wrap
}

function labelSlider(
  parent: HTMLElement,
  label: string,
  min: number,
  max: number,
  value: number,
  onChange: (v: number) => void,
): HTMLElement {
  const wrap = document.createElement('label')
  wrap.className = 'slider-row'
  wrap.innerHTML = `<span>${label}</span>`
  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.value = String(value)
  input.addEventListener('input', () => onChange(Number(input.value)))
  wrap.appendChild(input)
  parent.appendChild(wrap)
  return wrap
}

function renderImage(): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'bg-controls'
  const bg = store.get().background
  const has = bg.kind === 'image' && !!bg.url

  const hint = document.createElement('p')
  hint.className = 'bg-hint'
  hint.textContent = has
    ? 'Your image is tiled as the backdrop (cover-fit).'
    : 'Upload an image to use it as the export backdrop.'
  wrap.appendChild(hint)

  const row = document.createElement('div')
  row.className = 'bg-image-row'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'btn btn-ghost'
  btn.textContent = has ? 'Replace image' : 'Choose image'
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.hidden = true
  input.addEventListener('change', () => {
    const f = input.files?.[0]
    if (f) void handleBgImage(f)
  })
  btn.addEventListener('click', () => input.click())
  row.append(btn, input)

  if (has) {
    const clear = document.createElement('button')
    clear.type = 'button'
    clear.className = 'btn btn-danger'
    clear.textContent = 'Remove'
    clear.addEventListener('click', () => setBg({ kind: 'solid', color: '#141633' }))
    row.appendChild(clear)
  }
  wrap.appendChild(row)
  return wrap
}

async function handleBgImage(file: File) {
  const url = await downscaleToDataUrl(file)
  if (!url) {
    toast('Could not load that image')
    return
  }
  setBg({ kind: 'image', url })
  toast('Background image set')
}

async function downscaleToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const maxDim = 1600
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp'
  return c.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', 0.85)
}

function setBg(bg: BackgroundSpec) {
  store.setBackground(bg)
  persist(bg)
}