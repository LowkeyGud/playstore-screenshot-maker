import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
const PORT = 4174
const BASE = '/playstore-screenshot-maker/'
const URL = `http://localhost:${PORT}${BASE}`
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const child = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
for (let i = 0; i < 40; i++) { try { if ((await fetch(URL)).ok) break } catch {} await sleep(500) }

const { default: puppeteer } = await import('puppeteer-core')
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--window-size=1280,900'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

// capture right at DOMContentLoaded / first paint
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
await sleep(250)
const tmp = await mkdtemp(path.join(tmpdir(), 'pssm-flick-'))
await page.screenshot({ path: path.join(tmp, 'early.png'), fullPage: true })

// what large images/canvases exist?
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll('img, canvas')]
  return els.map((el) => ({
    tag: el.tagName,
    src: el.tagName === 'IMG' ? (el.src || '').slice(0, 120) : null,
    attrW: el.width ?? (el.tagName === 'IMG' ? el.naturalWidth : null),
    attrH: el.height ?? (el.tagName === 'IMG' ? el.naturalHeight : null),
    rectW: el.getBoundingClientRect().width,
    rectH: el.getBoundingClientRect().height,
    display: getComputedStyle(el).display,
  }))
})
console.log('elements after DOMContentLoaded:', JSON.stringify(info, null, 2))

await sleep(1200)
await page.screenshot({ path: path.join(tmp, 'late.png'), fullPage: true })
console.log('screenshots saved to', tmp)

await browser.close()
process.exit(0)