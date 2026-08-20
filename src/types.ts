import type { FrameVariant } from './generated/frames-catalog'

export type CanvasLike =
  | HTMLCanvasElement
  | OffscreenCanvas

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export interface Screenshot {
  id: string
  name: string
  url: string
  width: number
  height: number
}

export type BackgroundSpec =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; angle: number; stops: { color: string; pos: number }[] }
  | { kind: 'image'; url: string }

export interface ChosenDevice {
  variant: FrameVariant
}

export type FrameAssetCache = Map<string, FrameAsset>

export interface FrameAsset {
  frame: ImageBitmap | HTMLImageElement
  mask: ImageBitmap | HTMLImageElement
  maskAlpha: CanvasLike | null
}

export const EXPORT_WIDTH = 2160
export const EXPORT_HEIGHT = 3840

export type ExportJob = {
  id: number
  frameKey: string
  screenshotUrl: string
  screenshotName: string
  deviceSlug: string
  deviceLabel: string
  frameUrl: string
  maskUrl: string
  screen: { x: number; y: number; width: number; height: number }
  frameSize: { width: number; height: number }
  background: BackgroundSpec
}

export type ExportProgress = { done: number; total: number; current: string }