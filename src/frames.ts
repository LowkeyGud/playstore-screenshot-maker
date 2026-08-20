import { FRAME_GROUPS } from './generated/frames-catalog'
import type { FrameVariant } from './generated/frames-catalog'
import type { FrameAsset } from './types'
import { loadImageBitmap } from './util'

function assetUrl(rel: string): string {
  return `${import.meta.env.BASE_URL}${rel}`
}

export function frameVariantUrl(variant: FrameVariant, which: 'frame' | 'mask'): string {
  return assetUrl(which === 'frame' ? variant.frame : variant.mask)
}

export function getFrameGroups() {
  return FRAME_GROUPS
}

/** Lazy-load + cache the frame/mask assets (and precomputed alpha mask) for a variant. */
export async function loadFrameAsset(variant: FrameVariant, cache: Map<string, FrameAsset>): Promise<FrameAsset> {
  const hit = cache.get(variant.key)
  if (hit) return hit
  const [frame, mask] = await Promise.all([
    loadImageBitmap(frameVariantUrl(variant, 'frame')),
    loadImageBitmap(frameVariantUrl(variant, 'mask')),
  ])
  const asset: FrameAsset = { frame, mask, maskAlpha: null }
  cache.set(variant.key, asset)
  return asset
}