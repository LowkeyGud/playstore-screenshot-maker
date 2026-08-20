import { getFrameGroups } from './frames'
import { store } from './state'
import type { FrameGroup } from './generated/frames-catalog'

const pickerEl = () => document.getElementById('device-picker') as HTMLDivElement

export function initDevicePicker() {
  pickerEl().textContent = ''
  const groups = getFrameGroups()
  for (const group of groups) pickerEl().appendChild(renderGroup(group))
  store.subscribe(renderSelected)
}

function renderGroup(group: FrameGroup): HTMLElement {
  const section = document.createElement('section')
  section.className = 'dp-group'

  const title = document.createElement('h3')
  title.className = 'dp-group-title'
  title.textContent = group.label
  section.appendChild(title)

  const chips = document.createElement('div')
  chips.className = 'dp-chips'
  for (const model of group.models) chips.appendChild(renderModel(model))
  section.appendChild(chips)

  const variantRows = document.createElement('div')
  variantRows.className = 'dp-variants'
  for (const model of group.models) variantRows.appendChild(renderVariantRow(model))
  section.appendChild(variantRows)
  return section
}

function renderModel(model: FrameGroup['models'][number]): HTMLElement {
  const chip = document.createElement('button')
  chip.className = 'chip'
  chip.type = 'button'
  chip.dataset.modelKey = model.key
  chip.textContent = model.label
  chip.addEventListener('click', () => store.toggleModel(model.key, model.variants))
  return chip
}

function renderVariantRow(model: FrameGroup['models'][number]): HTMLElement {
  const row = document.createElement('div')
  row.className = 'dp-variant-row'
  row.dataset.modelKey = model.key
  row.hidden = true

  const label = document.createElement('span')
  label.className = 'dp-variant-label'
  label.textContent = model.label
  row.appendChild(label)

  const pills = document.createElement('div')
  pills.className = 'dp-pills'
  for (const v of model.variants) {
    const pill = document.createElement('button')
    pill.className = 'pill'
    pill.type = 'button'
    pill.dataset.variantKey = v.key
    pill.dataset.modelKey = model.key
    if (v.hexColor) pill.style.setProperty('--swatch', v.hexColor)
    pill.innerHTML = `<span class="swatch"></span>${v.label}`
    pill.addEventListener('click', () => store.setModelVariant(model.key, model.variants, v.key))
    pills.appendChild(pill)
  }
  row.appendChild(pills)
  return row
}

function renderSelected() {
  const state = store.get()
  const deviceKeys = new Set(state.devices.map((d) => d.variant.key))
  const byModel = new Map<string, string>()
  for (const d of state.devices) byModel.set(d.variant.modelKey, d.variant.key)

  document.querySelectorAll<HTMLElement>('.dp-group').forEach((section) => {
    section.querySelectorAll<HTMLElement>('.chip').forEach((chip) => {
      const mk = chip.dataset.modelKey!
      const modelActive = byModel.has(mk)
      chip.classList.toggle('active', modelActive)
      chip.setAttribute('aria-pressed', String(modelActive))
    })
    section.querySelectorAll<HTMLElement>('.dp-variant-row').forEach((row) => {
      const mk = row.dataset.modelKey!
      row.hidden = !byModel.has(mk)
      row.querySelectorAll<HTMLElement>('.pill').forEach((pill) => {
        const vk = pill.dataset.variantKey!
        pill.classList.toggle('active', deviceKeys.has(vk))
      })
    })
  })
}

export function getChosenVariantKey(modelKey: string): string | null {
  return store.get().devices.find((d) => d.variant.modelKey === modelKey)?.variant.key ?? null
}