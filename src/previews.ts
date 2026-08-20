import { store } from './state'
import { Compositor, getCtx } from './compositor/pipeline'
import { loadFrameAsset, getFrameGroups } from './frames'
import type { Ctx2D, FrameAsset, Screenshot } from './types'
import { openLightbox } from './lightbox'

const PREVIEW_W = 396
const PREVIEW_H = 704

const compositor = new Compositor()
const frameCache = new Map<string, FrameAsset>()

const gridEl = () => document.getElementById('preview-grid') as HTMLDivElement

interface Cell {
  key: string
  screenshot: Screenshot
  frameKey: string
  deviceLabel: string
  tile: HTMLCanvasElement
  el: HTMLElement
}

let cells: Cell[] = []
let queue: Cell[] = []
let gen = 0
let scheduled = false
let idleHandle = 0

type IdleCb = (deadline: { timeRemaining: () => number; didTimeout: boolean }) => void

function requestIdle(cb: IdleCb, timeout = 300): number {
  const w = window as unknown as { requestIdleCallback?: (c: IdleCb, o?: { timeout: number }) => number }
  if (w.requestIdleCallback) return w.requestIdleCallback(cb, { timeout })
  return window.setTimeout(() => cb({ timeRemaining: () => 50, didTimeout: true }), 0) as unknown as number
}

function cancelIdle(handle: number) {
  const w = window as unknown as { cancelIdleCallback?: (h: number) => void }
  if (w.cancelIdleCallback) w.cancelIdleCallback(handle)
  else window.clearTimeout(handle)
}

export function initPreviews() {
  store.subscribe(() => scheduleRebuild())
}

function scheduleRebuild() {
  gen++
  cancelIdle(idleHandle)
  idleHandle = requestIdle(() => rebuild(gen), 800)
}

function rebuild(g: number) {
  if (g !== gen) return
  const state = store.get()
  const screenshots = state.screenshots.filter((s) => state.selected.has(s.id))
  const devices = state.devices

  const el = gridEl()
  el.textContent = ''
  cells = []

  if (!screenshots.length || !devices.length) {
    el.appendChild(emptyState(screenshots.length > 0 && devices.length === 0))
    return
  }

  for (const screenshot of screenshots) {
    for (const device of devices) {
      const cell = buildCell(screenshot, device.variant.key, device.variant.label)
      cells.push(cell)
      el.appendChild(cell.el)
    }
  }
  queue = [...cells]
  pump()
}

function emptyState(hasDeviceMsg: boolean): HTMLElement {
  const div = document.createElement('div')
  div.className = 'preview-empty'
  div.innerHTML = hasDeviceMsg
    ? '<strong>Pick a device</strong><span>Select frames in step 2 to preview them.</span>'
    : '<strong>No screenshots selected</strong><span>Upload and select screenshots to see framed previews.</span>'
  return div
}

function buildCell(screenshot: Screenshot, frameKey: string, deviceLabel: string): Cell {
  const tile = document.createElement('canvas')
  tile.width = PREVIEW_W
  tile.height = PREVIEW_H
  tile.className = 'cell-canvas'

  const caption = document.createElement('figcaption')
  caption.textContent = `${shortName(screenshot.name)} · ${deviceLabel}`

  const el = document.createElement('figure')
  el.className = 'cell'
  el.append(tile, caption)

  const key = `${screenshot.id}|${frameKey}`
  el.addEventListener('click', () => openLightbox(screenshot, frameKey, deviceLabel))
  return { key, screenshot, frameKey, deviceLabel, tile, el }
}

function shortName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  return base.length > 24 ? base.slice(0, 22) + '…' : base
}

function pump() {
  if (scheduled || !queue.length) return
  scheduled = true
  const run = () => {
    scheduled = false
    if (!queue.length) return
    const budget = Date.now() + 40
    const step = async () => {
      while (queue.length && Date.now() < budget) {
        const cell = queue.shift()!
        await renderCell(cell).catch(() => {
          /* skip failed cell */
        })
      }
      if (queue.length) requestIdle(() => pump(), 300)
    }
    void step()
  }
  requestIdle(run, 300)
}

async function renderCell(cell: Cell): Promise<void> {
  if (!document.body.contains(cell.el)) return
  const variant = findVariantByKey(cell.frameKey)
  if (!variant) return
  const asset = await loadFrameAsset(variant, frameCache)
  const backgroundImage = await resolveBackgroundImage()

  const device = await compositor.composeDevice({
    frame: variant,
    frameAsset: asset,
    screenshot: await fetchBitmap(cell.screenshot.url),
    background: { kind: 'solid', color: '#000000' },
  })
  const preview = await compositor.composeExport(
    device,
    variant,
    store.get().background,
    backgroundImage,
    { width: PREVIEW_W, height: PREVIEW_H },
    store.get().shadow,
  )
  const ctx = getCtx(cell.tile)
  ctx.imageSmoothingQuality = 'high'
  if (store.get().background.kind === 'transparent') drawChecker(ctx, PREVIEW_W, PREVIEW_H)
  ctx.drawImage(preview as CanvasImageSource, 0, 0, PREVIEW_W, PREVIEW_H)
  cell.el.classList.add('rendered')
}

function drawChecker(ctx: Ctx2D, w: number, h: number) {
  const a = '#23264a'
  const b = '#2e3159'
  const s = 12
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      ctx.fillStyle = (Math.floor(x / s) + Math.floor(y / s)) % 2 === 0 ? a : b
      ctx.fillRect(x, y, s, s)
    }
  }
}

let bgImageCache: { url: string; bitmap: ImageBitmap } | null = null

async function resolveBackgroundImage(): Promise<ImageBitmap | undefined> {
  const bg = store.get().background
  if (bg.kind !== 'image' || !bg.url) return undefined
  if (bgImageCache?.url === bg.url) return bgImageCache.bitmap
  try {
    const res = await fetch(bg.url)
    const blob = await res.blob()
    const bitmap = await createImageBitmap(blob)
    bgImageCache = { url: bg.url, bitmap }
    return bitmap
  } catch {
    return undefined
  }
}

async function fetchBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  const blob = await res.blob()
  return createImageBitmap(blob)
}

function findVariantByKey(key: string) {
  for (const g of getFrameGroups())
    for (const m of g.models)
      for (const v of m.variants) if (v.key === key) return v
  return null
}