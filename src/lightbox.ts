import { Compositor, getCtx } from './compositor/pipeline'
import { loadFrameAsset, getFrameGroups } from './frames'
import { store } from './state'
import type { Ctx2D, FrameAsset, Screenshot } from './types'

const LB_W = 1080
const LB_H = 1920

const lightboxEl = () => document.getElementById('lightbox') as HTMLDivElement
const frameEl = () => document.getElementById('lightbox-frame') as HTMLDivElement
const captionEl = () => document.getElementById('lightbox-caption') as HTMLParagraphElement
const closeBtn = () => document.getElementById('lightbox-close') as HTMLButtonElement

let open = false
const compositor = new Compositor()
const frameCache = new Map<string, FrameAsset>()

let gen = 0

export function initLightbox() {
  closeBtn().addEventListener('click', close)
  lightboxEl().addEventListener('click', (e) => {
    if (e.target === lightboxEl()) close()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
}

export async function openLightbox(screenshot: Screenshot, frameKey: string, deviceLabel: string) {
  const g = ++gen
  open = true
  lightboxEl().hidden = false
  frameEl().textContent = ''
  frameEl().classList.add('loading')
  captionEl().textContent = `${shortName(screenshot.name)} · ${deviceLabel}`
  document.body.classList.add('no-scroll')
  lightboxEl().classList.add('show')

  const canvas = document.createElement('canvas')
  canvas.width = LB_W
  canvas.height = LB_H
  frameEl().appendChild(canvas)

  try {
    const variant = findVariantByKey(frameKey)
    if (!variant) throw new Error('Device not found')
    const asset = await loadFrameAsset(variant, frameCache)
    const bg = store.get().background
    const bgImage = await resolveBackgroundImage(bg)

    const device = await compositor.composeDevice({
      frame: variant,
      frameAsset: asset,
      screenshot: await fetchBitmap(screenshot.url),
      background: { kind: 'solid', color: '#000000' },
    })
    const out = await compositor.composeExport(device, variant, bg, bgImage, { width: LB_W, height: LB_H }, store.get().shadow)
    if (g !== gen) return
    const ctx = getCtx(canvas)
    ctx.imageSmoothingQuality = 'high'
    if (bg.kind === 'transparent') drawChecker(ctx, LB_W, LB_H)
    ctx.drawImage(out as CanvasImageSource, 0, 0, LB_W, LB_H)
  } catch {
    frameEl().textContent = 'Could not render preview'
  } finally {
    frameEl().classList.remove('loading')
  }
}

function close() {
  if (!open) return
  open = false
  gen++
  lightboxEl().classList.remove('show')
  window.setTimeout(() => (lightboxEl().hidden = true), 220)
  document.body.classList.remove('no-scroll')
}

function drawChecker(ctx: Ctx2D, w: number, h: number) {
  const a = '#23264a'
  const b = '#2e3159'
  const s = 16
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      ctx.fillStyle = (Math.floor(x / s) + Math.floor(y / s)) % 2 === 0 ? a : b
      ctx.fillRect(x, y, s, s)
    }
  }
}

function shortName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')
  return base.length > 28 ? base.slice(0, 26) + '…' : base
}

async function resolveBackgroundImage(bg: { kind: string; url?: string }): Promise<ImageBitmap | undefined> {
  if (bg.kind !== 'image' || !bg.url) return undefined
  try {
    const res = await fetch(bg.url)
    const blob = await res.blob()
    return createImageBitmap(blob)
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