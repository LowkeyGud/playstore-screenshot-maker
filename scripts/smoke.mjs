import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

const PORT = 4173
const BASE = '/playstore-screenshot-maker/'
const URL = `http://localhost:${PORT}${BASE}`
const EDGE =
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function startPreview() {
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
      stdio: 'ignore',
      shell: process.platform === 'win32',
    })
    const wait = () => resolve(child)
    // wait for server readiness by polling
    pollReady(wait, child)
  })
}

async function pollReady(resolve) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(URL)
      if (res.ok) return resolve()
    } catch {}
    await sleep(500)
  }
  throw new Error('preview server did not start')
}

async function main() {
  const tmp = await mkdtemp(path.join(tmpdir(), 'pssm-smoke-'))
  await startPreview()

  const { default: puppeteer } = await import('puppeteer-core')
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1400,1000'],
  })

  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text()) })
  page.on('pageerror', (e) => console.log('PAGE-ERROR:', e.message))
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 })

  // 1. meta + title
  const title = await page.title()
  if (!title.includes('PlayStoreScreenshotMaker')) throw new Error('bad title: ' + title)

  // 2. device picker populated
  const chipCount = await page.$$eval('.dp-group .chip', (n) => n.length)
  const variantTotal = await page.$$eval('.dp-pills .pill', (n) => n.length)
  console.log(`device chips: ${chipCount}, total variants: ${variantTotal}`)
  if (chipCount < 20) throw new Error('device picker seems empty')

  // 3. create a test screenshot + background and upload
  const shotPath = path.join(tmp, 'shot.png')
  const bgPath = path.join(tmp, 'bg.png')
  await sharp({ create: { width: 1080, height: 2340, channels: 4, background: '#2a6df4' } })
    .composite([{ input: await sharp({ create: { width: 400, height: 200, channels: 3, background: '#ffffff' } }).png().toBuffer() }])
    .png()
    .toFile(shotPath)
  await sharp({ create: { width: 800, height: 800, channels: 3, background: '#141633' } }).png().toFile(bgPath)

  const fileInput = await page.$('#file-input')
  await fileInput.uploadFile(shotPath)
  await page.waitForSelector('.thumb', { timeout: 8000 })
  console.log('screenshot uploaded, thumb rendered')

  // 4. pick a device: REAL mouse click on the Pixel 8 chip
  const chip = await page.$('.dp-group .chip[data-model-key="pixel-8"]')
  if (!chip) throw new Error('pixel-8 chip not found')
  await chip.click()
  await page.waitForSelector('.cell', { timeout: 8000 })
  console.log('device selected via real click, preview cell created')

  // 5. wait for a rendered preview and verify it drew real pixels
  await page.waitForSelector('.cell.rendered', { timeout: 25000 })
  const pixelData = await page.evaluate(() => {
    const cv = document.querySelector('.cell.rendered .cell-canvas')
    const t = document.createElement('canvas')
    t.width = cv.width; t.height = cv.height
    t.getContext('2d').drawImage(cv, 0, 0)
    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data
    let nonTransparent = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) nonTransparent++
    return { nonTransparent, total: d.length / 4 }
  })
  console.log(`preview rendered: ${pixelData.nonTransparent}/${pixelData.total} non-transparent px`)
  if (pixelData.nonTransparent < 1000) throw new Error('preview appears blank')

  // 6. capture ZIP download and verify a 2160x3840 PNG is inside
  const dlDir = path.join(tmp, 'dl')
  await (await import('node:fs/promises')).mkdir(dlDir, { recursive: true })
  const client = await page.createCDPSession()
  await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir })
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir })
  await page.click('#download-zip')
  let prev = ''
  for (let i = 0; i < 10; i++) {
    const t = await page.evaluate(() => document.getElementById('export-title')?.textContent)
    if (i === 0 || t !== prev) console.log(`  t+${i * 1}s export-title: ${t}`)
    prev = t
    await sleep(1000)
  }
  const debug = await page.evaluate(() => ({
    toast: document.getElementById('toast')?.textContent,
    exportTitle: document.getElementById('export-title')?.textContent,
    exportMeta: document.getElementById('export-meta')?.textContent,
  }))
  console.log('after-click debug:', debug)
  const { readdir } = await import('node:fs/promises')
  let zipPath = null
  for (let i = 0; i < 60; i++) {
    const files = await readdir(dlDir)
    const z = files.find((f) => f.endsWith('.zip'))
    if (z) { zipPath = path.join(dlDir, z); break }
    await sleep(700)
  }
  console.log('downloaded files:', await readdir(dlDir))
  if (!zipPath) throw new Error('no zip downloaded')

  const JSZip = (await import('jszip')).default
  const zipBuf = await readFile(zipPath)
  const zip = await JSZip.loadAsync(zipBuf)
  const names = Object.keys(zip.files)
  console.log('zip entries:', names)
  if (names.length !== 1) throw new Error('expected 1 PNG in zip')
  const pngBuf = await zip.file(names[0]).async('nodebuffer')
  const meta = await sharp(pngBuf).metadata()
  console.log(`exported PNG: ${meta.width}x${meta.height}`)
  if (meta.width !== 2160 || meta.height !== 3840) throw new Error('wrong export dimensions')

  await browser.close()
  console.log('\nSMOKE TEST PASSED')
}

main().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err.message)
  process.exit(1)
})