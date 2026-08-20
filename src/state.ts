import type { BackgroundSpec, ChosenDevice, Screenshot, ShadowSpec } from './types'
import { FRAME_GROUPS } from './generated/frames-catalog'

type Theme = 'dark' | 'light'

export interface AppState {
  theme: Theme
  screenshots: Screenshot[]
  selected: Set<string>
  lastSelection: Set<string>
  devices: ChosenDevice[]
  background: BackgroundSpec
  shadow: ShadowSpec
  exporting: boolean
  progress: { done: number; total: number; current: string } | null
}

type Listener = () => void

const initialState: AppState = {
  theme: 'dark',
  screenshots: [],
  selected: new Set(),
  lastSelection: new Set(),
  devices: [],
  background: { kind: 'gradient', angle: 160, stops: [{ color: '#0f1128', pos: 0 }, { color: '#1d2148', pos: 1 }] },
  shadow: { enabled: true, alpha: 0.45, blur: 0.03, offsetY: 0.012 },
  exporting: false,
  progress: null,
}

class Store {
  private state: AppState = initialState
  private listeners = new Set<Listener>()

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  get(): AppState {
    return this.state
  }

  private set(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((fn) => fn())
  }

  addScreenshots(screenshots: Screenshot[]) {
    const existing = new Set(this.state.screenshots.map((s) => s.id))
    const fresh = screenshots.filter((s) => !existing.has(s.id))
    if (!fresh.length) return
    const merged = [...this.state.screenshots, ...fresh]
    const selected = new Set([...this.state.selected, ...fresh.map((s) => s.id)])
    this.set({ screenshots: merged, selected, lastSelection: selected })
  }

  toggleSelection(id: string) {
    const selected = new Set(this.state.selected)
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    this.set({ selected, lastSelection: selected })
  }

  selectAll() {
    this.set({
      selected: new Set(this.state.screenshots.map((s) => s.id)),
      lastSelection: this.state.selected,
    })
  }

  selectNone() {
    this.set({ selected: new Set(), lastSelection: this.state.selected })
  }

  undo() {
    this.set({ selected: new Set(this.state.lastSelection), lastSelection: this.state.selected })
  }

  removeScreenshot(id: string) {
    const screenshots = this.state.screenshots.filter((s) => s.id !== id)
    const selected = new Set(this.state.selected)
    selected.delete(id)
    this.set({ screenshots, selected })
  }

  clearScreenshots() {
    this.set({ screenshots: [], selected: new Set(), lastSelection: new Set() })
  }

  toggleDevice(variantKey: string) {
    const devices = [...this.state.devices]
    const idx = devices.findIndex((d) => d.variant.key === variantKey)
    if (idx >= 0) devices.splice(idx, 1)
    else {
      const v = findVariant(variantKey)
      if (v) devices.push({ variant: v })
    }
    this.set({ devices })
  }

  /** Toggle a whole model on/off. `modelKey` is the model slug; `variants` its variants. */
  toggleModel(modelKey: string, variants: import('./generated/frames-catalog').FrameVariant[]) {
    const deviceKeys = new Set(this.state.devices.map((d) => d.variant.key))
    const inModel = (v: import('./generated/frames-catalog').FrameVariant) => v.modelKey === modelKey
    const active = variants.some((v) => deviceKeys.has(v.key))
    const devices = this.state.devices.filter((d) => !inModel(d.variant))
    if (!active) {
      const chosen = variants.find((v) => deviceKeys.has(v.key)) ?? variants[0]
      if (chosen) devices.push({ variant: chosen })
    }
    this.set({ devices })
  }

  /** Pick a specific color variant for a model, replacing any other variant of that model. */
  setModelVariant(modelKey: string, variants: import('./generated/frames-catalog').FrameVariant[], chosenKey: string) {
    const devices = this.state.devices.filter((d) => d.variant.modelKey !== modelKey)
    const chosen = variants.find((v) => v.key === chosenKey) ?? variants[0]
    if (chosen) devices.push({ variant: chosen })
    this.set({ devices })
  }

  setBackground(background: BackgroundSpec) {
    this.set({ background })
  }

  setShadow(shadow: ShadowSpec) {
    this.set({ shadow })
  }

  setTheme(theme: Theme) {
    this.set({ theme })
  }

  setExporting(exporting: boolean, progress?: AppState['progress']) {
    this.set({ exporting, progress: exporting ? progress ?? this.state.progress : null })
  }
}

const variantIndex = (() => {
  const index: { key: string; v: import('./generated/frames-catalog').FrameVariant }[] = []
  for (const g of FRAME_GROUPS)
    for (const m of g.models)
      for (const v of m.variants) index.push({ key: v.key, v })
  return index
})()

function findVariant(key: string) {
  return variantIndex.find((x) => x.key === key)?.v
}

export const store = new Store()