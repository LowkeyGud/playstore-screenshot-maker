import { describe, expect, it } from 'vitest'
import { coverRect, fitRect } from './util'

describe('coverRect', () => {
  it('covers a wider target by scaling height and centering horizontally', () => {
    // screenshot 1000x500 into screen 400x400 (portrait target wider ratio)
    const r = coverRect(1000, 500, 0, 0, 400, 400)
    expect(r.scale).toBeCloseTo(0.8, 5) // max(400/1000, 400/500) = 0.8
    expect(r.sw).toBeCloseTo(800, 5)
    expect(r.sh).toBeCloseTo(400, 5)
    expect(r.sx).toBeCloseTo(-200, 5) // centered: (400-800)/2
    expect(r.sy).toBeCloseTo(0, 5)
  })

  it('covers a taller target by scaling width', () => {
    const r = coverRect(1000, 2000, 10, 20, 300, 400)
    expect(r.scale).toBeCloseTo(0.3, 5) // max(300/1000, 400/2000) = max(0.3, 0.2) = 0.3
    expect(r.sw).toBeCloseTo(300, 5)
    expect(r.sh).toBeCloseTo(600, 5)
    expect(r.sx).toBeCloseTo(10, 5)
    expect(r.sy).toBeCloseTo(20 + (400 - 600) / 2, 5) // 20 - 100
  })

  it('always fills the target (no gaps)', () => {
    const r = coverRect(1920, 1080, 0, 0, 2160, 3840)
    expect(r.sw).toBeGreaterThanOrEqual(2160)
    expect(r.sh).toBeGreaterThanOrEqual(3840)
  })
})

describe('fitRect', () => {
  it('fits a phone frame into 2160x3840, centered, keeping aspect', () => {
    // Pixel 8: 1511x2896
    const r = fitRect(1511, 2896, 2160, 3840)
    expect(r.dw / r.dh).toBeCloseTo(1511 / 2896, 4)
    expect(r.dw).toBeLessThanOrEqual(2160 + 0.001)
    expect(r.dh).toBeLessThanOrEqual(3840 + 0.001)
    expect(r.dx).toBeCloseTo((2160 - r.dw) / 2, 4)
    expect(r.dy).toBeCloseTo((3840 - r.dh) / 2, 4)
  })

  it('fits a landscape tablet, centered vertically', () => {
    const r = fitRect(3147, 2131, 2160, 3840)
    expect(r.dw / r.dh).toBeCloseTo(3147 / 2131, 4)
    expect(r.dw).toBeLessThanOrEqual(2160 + 0.001)
    expect(r.dh).toBeLessThanOrEqual(3840 + 0.001)
  })
})