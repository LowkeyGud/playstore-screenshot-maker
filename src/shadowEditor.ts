import { store } from './state'
import type { ShadowSpec } from './types'

const SHADOW_KEY = 'pssm-shadow'

const editorEl = () => document.getElementById('shadow-editor') as HTMLDivElement

export function initShadowEditor() {
  loadSaved()
  render()
  store.subscribe(render)
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(SHADOW_KEY)
    if (!raw) return
    const s = JSON.parse(raw) as ShadowSpec
    if (s && typeof s.enabled === 'boolean') store.setShadow({ ...store.get().shadow, ...s })
  } catch {
    /* ignore */
  }
}

function persist(s: ShadowSpec) {
  try {
    localStorage.setItem(SHADOW_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function set(patch: Partial<ShadowSpec>) {
  const next = { ...store.get().shadow, ...patch }
  store.setShadow(next)
  persist(next)
}

function render() {
  const el = editorEl()
  el.textContent = ''
  const s = store.get().shadow

  // toggle row
  const toggleRow = document.createElement('div')
  toggleRow.className = 'shadow-toggle-row'

  const label = document.createElement('span')
  label.textContent = 'Drop shadow'

  const switchBtn = document.createElement('button')
  switchBtn.type = 'button'
  switchBtn.className = 'switch' + (s.enabled ? ' on' : '')
  switchBtn.setAttribute('role', 'switch')
  switchBtn.setAttribute('aria-checked', String(s.enabled))
  switchBtn.setAttribute('aria-label', 'Toggle drop shadow')
  switchBtn.innerHTML = '<span class="knob"></span>'
  switchBtn.addEventListener('click', () => set({ enabled: !s.enabled }))

  toggleRow.append(label, switchBtn)
  el.appendChild(toggleRow)

  const controls = document.createElement('div')
  controls.className = 'shadow-controls'
  controls.hidden = !s.enabled

  controls.appendChild(slider('Strength', 0, 1, s.alpha, 0.01, (v) => set({ alpha: v }), (v) => `${Math.round(v * 100)}%`))
  controls.appendChild(slider('Blur', 0, 0.15, s.blur, 0.001, (v) => set({ blur: v }), (v) => `${Math.round(v * 1000)}`))
  controls.appendChild(slider('Offset', -0.06, 0.1, s.offsetY, 0.001, (v) => set({ offsetY: v }), (v) => `${v > 0 ? '+' : ''}${Math.round(v * 1000)}`))

  el.appendChild(controls)
}

function slider(
  labelText: string,
  min: number,
  max: number,
  value: number,
  step: number,
  onChange: (v: number) => void,
  fmt: (v: number) => string,
): HTMLElement {
  const row = document.createElement('label')
  row.className = 'slider-row'

  const name = document.createElement('span')
  name.textContent = labelText

  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = String(value)

  const out = document.createElement('span')
  out.className = 'slider-val'
  out.textContent = fmt(value)

  input.addEventListener('input', () => {
    const v = Number(input.value)
    onChange(v)
    out.textContent = fmt(v)
  })

  row.append(name, input, out)
  return row
}