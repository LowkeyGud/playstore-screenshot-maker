import { EXPORT_HEIGHT, EXPORT_WIDTH } from '../types'
import type { BackgroundSpec, CanvasLike, Ctx2D, FrameAsset } from '../types'
import type { FrameVariant } from '../generated/frames-catalog'
import { coverRect, fitRect } from '../util'

export type ScreenshotSource = ImageBitmap | CanvasLike | HTMLImageElement

export interface StageMeta {
  frame: FrameVariant
  frameAsset?: FrameAsset
  screenshot: ScreenshotSource
  background: BackgroundSpec
  backgroundImage?: ImageBitmap | CanvasLike
}

export interface PipelineStage {
  readonly name: string
  apply(canvas: CanvasLike, ctx: Ctx2D, meta: StageMeta): Promise<void> | void
}

export function getCtx(canvas: CanvasLike): Ctx2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context unavailable')
  return ctx as Ctx2D
}

export function createCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

export function canvasToBlob(canvas: CanvasLike, type = 'image/png'): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type })
  }
  return new Promise((resolve, reject) => {
    ;(canvas as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type)
  })
}

/* ------------------------------------------------------------------ */
/* Default device-phase stages (order matters)                         */
/* ------------------------------------------------------------------ */

/** 1. Cover-crop the screenshot into the screen cutout rect. */
class ScreenshotFillStage implements PipelineStage {
  readonly name = 'screenshot-fill'
  apply(_canvas: CanvasLike, ctx: Ctx2D, meta: StageMeta): void {
    const { screen } = meta.frame
    const img = meta.screenshot as ScreenshotSource & { width: number; height: number }
    const r = coverRect(img.width, img.height, screen.x, screen.y, screen.width, screen.height)
    ctx.drawImage(img as CanvasImageSource, r.sx, r.sy, r.sw, r.sh)
  }
}

/** 2. Clip to the device mask (luminance→alpha) for pixel-perfect corners/notch. */
class MaskClipStage implements PipelineStage {
  readonly name = 'mask-clip'
  constructor(private owner: Compositor) {}
  apply(canvas: CanvasLike, ctx: Ctx2D, meta: StageMeta): void {
    const alpha = this.owner.getMaskAlpha(meta.frame, meta.frameAsset!.mask)
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(alpha as CanvasImageSource, 0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
}

/** 3. Paste the transparent frame PNG on top so bezels/cameras look authentic. */
class FrameOverlayStage implements PipelineStage {
  readonly name = 'frame-overlay'
  apply(canvas: CanvasLike, ctx: Ctx2D, meta: StageMeta): void {
    ctx.drawImage(meta.frameAsset!.frame as CanvasImageSource, 0, 0, canvas.width, canvas.height)
  }
}

/* ------------------------------------------------------------------ */
/* Default export-phase stages (2160×3840)                             */
/* ------------------------------------------------------------------ */

/** A. Fill the export canvas with the user background. */
class BackgroundStage implements PipelineStage {
  readonly name = 'background'
  apply(canvas: CanvasLike, ctx: Ctx2D, meta: StageMeta): void {
    const { background, backgroundImage } = meta
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (background.kind === 'solid') {
      ctx.fillStyle = background.color
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (background.kind === 'gradient') {
      const stops = [...background.stops].sort((a, b) => a.pos - b.pos)
      const rad = (background.angle * Math.PI) / 180
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const len = Math.abs(canvas.width * Math.cos(rad)) + Math.abs(canvas.height * Math.sin(rad))
      const g = ctx.createLinearGradient(
        cx - (Math.cos(rad) * len) / 2,
        cy - (Math.sin(rad) * len) / 2,
        cx + (Math.cos(rad) * len) / 2,
        cy + (Math.sin(rad) * len) / 2,
      )
      for (const s of stops) g.addColorStop(s.pos, s.color)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (background.kind === 'image' && backgroundImage) {
      const img = backgroundImage as ImageBitmap
      const r = coverRect(img.width, img.height, 0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh)
    } else {
      ctx.fillStyle = '#141633'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }
}

/** B. Fit the framed device into the canvas, centered, with a soft shadow + glow. */
class FitDeviceStage implements PipelineStage {
  readonly name = 'fit-device'
  apply(canvas: CanvasLike, ctx: Ctx2D, meta: StageMeta): void {
    const device = meta.screenshot as CanvasLike
    const f = fitRect(device.width, device.height, canvas.width, canvas.height)
    const shadowBlur = Math.max(24, f.dw * 0.03)

    // ambient glow behind the device
    const glow = ctx.createRadialGradient(
      canvas.width / 2,
      f.dy + f.dh / 2,
      Math.min(f.dw, f.dh) * 0.2,
      canvas.width / 2,
      f.dy + f.dh / 2,
      Math.max(f.dw, f.dh) * 0.62,
    )
    glow.addColorStop(0, 'rgba(139,147,255,0.16)')
    glow.addColorStop(1, 'rgba(139,147,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // soft drop shadow behind the device body
    ctx.save()
    ctx.filter = `blur(${shadowBlur}px)`
    ctx.globalAlpha = 0.45
    ctx.fillStyle = '#000000'
    const s = roundRectPath(f.dx + shadowBlur * 0.4, f.dy + shadowBlur * 0.8, f.dw, f.dh, f.dw * 0.11)
    ctx.fill(s)
    ctx.restore()

    // the device
    ctx.drawImage(device as CanvasImageSource, f.dx, f.dy, f.dw, f.dh)
  }
}

function roundRectPath(x: number, y: number, w: number, h: number, r: number): Path2D {
  const path = new Path2D()
  const rr = Math.min(r, w / 2, h / 2)
  path.moveTo(x + rr, y)
  path.arcTo(x + w, y, x + w, y + h, rr)
  path.arcTo(x + w, y + h, x, y + h, rr)
  path.arcTo(x, y + h, x, y, rr)
  path.arcTo(x, y, x + w, y, rr)
  path.closePath()
  return path
}

/* ------------------------------------------------------------------ */
/* Compositor                                                          */
/* ------------------------------------------------------------------ */

export class Compositor {
  private deviceStages: PipelineStage[] = []
  private exportStages: PipelineStage[] = []
  private maskAlphaCache = new Map<string, CanvasLike>()

  constructor() {
    this.deviceStages.push(new ScreenshotFillStage())
    this.deviceStages.push(new MaskClipStage(this))
    this.deviceStages.push(new FrameOverlayStage())
    this.exportStages.push(new BackgroundStage())
    this.exportStages.push(new FitDeviceStage())
  }

  /**
   * ===================== V2 HOOK =====================
   * Register extra pipeline stages without touching the core.
   *   compositor.addStage(new TextOverlayStage())          // on the device canvas
   *   compositor.addExportStage(new ScreenshotTemplateStage()) // on the 2160x3840 canvas
   * A V2 TextOverlayStage could read text/anchor from StageMeta
   * and paint it over the screenshot before the mask/frame stages.
   * ===================================================
   */
  addStage(stage: PipelineStage): void {
    this.deviceStages.push(stage)
  }

  addExportStage(stage: PipelineStage): void {
    this.exportStages.push(stage)
  }

  /** Convert a grayscale mask to a white-with-alpha screen-shaped layer (cached per variant). */
  getMaskAlpha(frame: FrameVariant, mask: ImageBitmap | HTMLImageElement): CanvasLike {
    const cached = this.maskAlphaCache.get(frame.key)
    if (cached) return cached
    const c = createCanvas(mask.width, mask.height)
    const ctx = getCtx(c)
    ctx.drawImage(mask as CanvasImageSource, 0, 0)
    const img = ctx.getImageData(0, 0, c.width, c.height)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      d[i + 3] = d[i] // luminance → alpha (white=screen opaque, black=bezel transparent)
      d[i] = 255
      d[i + 1] = 255
      d[i + 2] = 255
    }
    ctx.putImageData(img, 0, 0)
    this.maskAlphaCache.set(frame.key, c)
    return c
  }

  /** Composite a single framed device at native frame resolution. */
  async composeDevice(meta: StageMeta): Promise<CanvasLike> {
    const canvas = createCanvas(meta.frame.frameSize.width, meta.frame.frameSize.height)
    const ctx = getCtx(canvas)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const stage of this.deviceStages) await stage.apply(canvas, ctx, meta)
    return canvas
  }

  /** Place the framed device onto an export canvas at the given size (default 2160×3840). */
  async composeExport(
    deviceCanvas: CanvasLike,
    frame: FrameVariant,
    background: BackgroundSpec,
    backgroundImage?: ImageBitmap | CanvasLike,
    dims: { width: number; height: number } = { width: EXPORT_WIDTH, height: EXPORT_HEIGHT },
  ): Promise<CanvasLike> {
    const canvas = createCanvas(dims.width, dims.height)
    const ctx = getCtx(canvas)
    const meta: StageMeta = {
      frame,
      screenshot: deviceCanvas,
      background,
      backgroundImage,
    }
    for (const stage of this.exportStages) await stage.apply(canvas, ctx, meta)
    return canvas
  }
}

export const exportDim = { width: EXPORT_WIDTH, height: EXPORT_HEIGHT }