/// <reference lib="webworker" />
import type { ExportJob, ExportProgress } from './types'
import { Compositor, canvasToBlob } from './compositor/pipeline'
import { loadImageBitmap } from './util'

export interface WorkerRequest {
  type: 'export'
  jobs: ExportJob[]
}

export type WorkerResponse =
  | { type: 'progress'; payload: ExportProgress }
  | { type: 'result'; id: number; name: string; bytes: ArrayBuffer; mime: string }
  | { type: 'done'; count: number }
  | { type: 'error'; message: string }

const compositor = new Compositor()

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type !== 'export') return
  const { jobs } = e.data
  let done = 0

  try {
    for (const job of jobs) {
      postMessage({
        type: 'progress',
        payload: { done, total: jobs.length, current: job.deviceLabel },
      } satisfies WorkerResponse)

      const [screenshot, frame, mask] = await Promise.all([
        loadImageBitmap(job.screenshotUrl),
        loadImageBitmap(job.frameUrl),
        loadImageBitmap(job.maskUrl),
      ])

      let backgroundImage: ImageBitmap | undefined
      if (job.background.kind === 'image' && job.background.url) {
        try {
          backgroundImage = await loadImageBitmap(job.background.url)
        } catch {
          backgroundImage = undefined
        }
      }

      const frameVariant = {
        key: job.frameKey,
        modelKey: job.frameKey,
        groupKey: job.frameKey,
        label: job.deviceLabel,
        frame: job.frameUrl,
        mask: job.maskUrl,
        hexColor: null,
        screen: job.screen,
        frameSize: job.frameSize,
      }

      const device = await compositor.composeDevice({
        frame: frameVariant,
        frameAsset: { frame, mask, maskAlpha: null } as never,
        screenshot,
        background: { kind: 'solid', color: '#000000' },
      })

      const exportCanvas = await compositor.composeExport(device, frameVariant, job.background, backgroundImage, undefined, job.shadow)
      const blob = await canvasToBlob(exportCanvas)
      const bytes = await blob.arrayBuffer()

      screenshot.close()
      frame.close()
      mask.close()
      backgroundImage?.close()

      done++
      postMessage({
        type: 'result',
        id: job.id,
        name: job.screenshotName,
        bytes,
        mime: 'image/png',
      } satisfies WorkerResponse)
    }
    postMessage({ type: 'done', count: jobs.length } satisfies WorkerResponse)
  } catch (err) {
    postMessage({ type: 'error', message: (err as Error).message } satisfies WorkerResponse)
  }
}