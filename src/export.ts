import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { WorkerRequest, WorkerResponse } from './worker'
import { store } from './state'
import { frameVariantUrl } from './frames'
import type { ExportJob } from './types'
import { sanitizeFilename } from './util'

let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

export function buildJobs(): ExportJob[] {
  const state = store.get()
  const screenshots = state.screenshots.filter((s) => state.selected.has(s.id))
  const devices = state.devices
  const jobs: ExportJob[] = []
  let id = 0
  for (const s of screenshots) {
    for (const d of devices) {
      jobs.push({
        id: id++,
        frameKey: d.variant.key,
        screenshotUrl: s.url,
        screenshotName: sanitizeFilename(s.name),
        deviceSlug: sanitizeFilename(d.variant.label),
        deviceLabel: d.variant.label,
        frameUrl: frameVariantUrl(d.variant, 'frame'),
        maskUrl: frameVariantUrl(d.variant, 'mask'),
        screen: d.variant.screen,
        frameSize: d.variant.frameSize,
        background: state.background,
        shadow: state.shadow,
      })
    }
  }
  return jobs
}

export function runExport(onDone?: (blobs: { name: string; blob: Blob }[]) => void): Promise<{ name: string; blob: Blob }[]> {
  return new Promise((resolve, reject) => {
    const jobs = buildJobs()
    if (!jobs.length) {
      reject(new Error('Nothing to export. Add screenshots and pick a device.'))
      return
    }
    const results: { id: number; name: string; blob: Blob }[] = []
    const w = getWorker()
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        store.setExporting(true, msg.payload)
      } else if (msg.type === 'result') {
        results.push({ id: msg.id, name: msg.name, blob: new Blob([msg.bytes], { type: msg.mime }) })
      } else if (msg.type === 'done') {
        const out = results
          .sort((a, b) => a.id - b.id)
          .map((r) => ({ name: r.name, blob: r.blob }))
        store.setExporting(false)
        onDone?.(out)
        resolve(out)
      } else if (msg.type === 'error') {
        store.setExporting(false)
        reject(new Error(msg.message))
      }
    }
    w.onerror = (e) => {
      store.setExporting(false)
      reject(new Error(e.message || 'Worker failed'))
    }
    w.postMessage({ type: 'export', jobs } satisfies WorkerRequest)
  })
}

export async function downloadZip(): Promise<void> {
  const results = await runExport()
  const zip = new JSZip()
  for (const r of results) zip.file(`${r.name}.png`, r.blob)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  saveAs(blob, `playstore-screenshots-${Date.now()}.zip`)
}

export async function downloadSingle(): Promise<void> {
  const results = await runExport()
  const r = results[0]
  if (!r) return
  saveAs(r.blob, `${r.name}.png`)
}

export function exportFilename(job: ExportJob): string {
  return `${job.screenshotName}-${job.deviceSlug}.png`
}