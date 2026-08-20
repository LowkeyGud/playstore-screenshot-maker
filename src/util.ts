export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function sanitizeFilename(name: string): string {
  const base = name.replace(/\.[^/.]+$/, '')
  return (
    base
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'screenshot'
  )
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: number | undefined
  return (...args: Parameters<T>) => {
    window.clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}

export async function loadImageBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}`)
  const blob = await res.blob()
  return createImageBitmap(blob)
}

export function resizeImageData(img: ImageBitmap, scale: number, smooth = true): ImageBitmap {
  if (scale >= 1) return img
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const off = new OffscreenCanvas(w, h)
  const ctx = off.getContext('2d')!
  ctx.imageSmoothingQuality = smooth ? 'high' : 'low'
  ctx.drawImage(img, 0, 0, w, h)
  return off.transferToImageBitmap()
}

/** Cover-fit scale + offsets so a source fills a target rect (object-fit: cover). */
export function coverRect(
  srcW: number,
  srcH: number,
  dstX: number,
  dstY: number,
  dstW: number,
  dstH: number,
): { sx: number; sy: number; sw: number; sh: number; scale: number } {
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const drawW = srcW * scale
  const drawH = srcH * scale
  return {
    sx: dstX + (dstW - drawW) / 2,
    sy: dstY + (dstH - drawH) / 2,
    sw: drawW,
    sh: drawH,
    scale,
  }
}

/** Fit-scale + offsets so a source fits inside a target rect (object-fit: contain), centered. */
export function fitRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { dx: number; dy: number; dw: number; dh: number; scale: number } {
  const scale = Math.min(dstW / srcW, dstH / srcH)
  const dw = srcW * scale
  const dh = srcH * scale
  return { dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh, scale }
}