#!/usr/bin/env node
/**
 * probe-seg-wrap.mjs — 分段器折行实测的底层探针（§2.6.6 的真实 DOM 测量层）
 *
 * 复用关系：
 *   · 导出 `collectAnimIds` / `scanSegWrapOnPage` / `runDeepSegWrapOnPage`，供联合门禁 `check-runtime-ui.mjs` 复用；
 *   · 直接执行本文件时（`npm run probe:seg-wrap`），对着已启动的 dev server 跑单视口调试。
 *
 * 用法（人工调试时）：
 *   npx vite --port 5199 --strictPort &
 *   npm run probe:seg-wrap
 *   node scripts/probe-seg-wrap.mjs --base http://localhost:5199 --width 1440 --deep
 *
 * 退出码：0 全部不折行 / 1 存在折行
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REG_DIR = join(ROOT, 'src/data/registries')

export function collectAnimIds() {
  const ids = new Set()
  for (const f of readdirSync(REG_DIR)) {
    if (!f.endsWith('.ts')) continue
    const src = readFileSync(join(REG_DIR, f), 'utf8')
    for (const m of src.matchAll(/^ {2}'(anim-[a-z0-9-]+)'\s*:/gm)) ids.add(m[1])
  }
  return [...ids].sort()
}

/** 扫描当前 DOM 里左屏是否存在水平滚动条或内容横向溢出 */
export const scanLeftOverflowOnPage = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('.overflow-y-auto')
    if (!panel) return null
    const scrollDiff = panel.scrollWidth - panel.clientWidth
    const pRect = panel.getBoundingClientRect()
    const overflows = []
    for (const el of panel.querySelectorAll('span, button, label, input')) {
      if (el instanceof HTMLInputElement && el.type === 'range') continue
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) continue
      const overRight = Math.round(r.right - pRect.right)
      const overLeft = Math.round(pRect.left - r.left)
      if (overRight > 1 || overLeft > 1) {
        overflows.push({
          text: (el.textContent || '').trim().slice(0, 30) || el.tagName,
          over: Math.max(overRight, overLeft),
        })
      }
    }
    if (scrollDiff <= 1 && overflows.length === 0) return null
    return {
      scrollDiff: Math.max(0, scrollDiff),
      culprit: overflows[0]?.text ?? 'panel',
      over: overflows[0]?.over ?? scrollDiff,
    }
  })

/** 扫描当前 DOM 里所有分段器按钮是否折行 */
export const scanSegWrapOnPage = (page) =>
  page.evaluate(() => {
    const out = []
    for (const btn of document.querySelectorAll('button')) {
      const span = btn.querySelector('.line-clamp-2')
      if (!span) continue
      const cs = getComputedStyle(btn)
      const lineH = parseFloat(cs.lineHeight) || 15
      const h = span.getBoundingClientRect().height
      const track = btn.parentElement
      out.push({
        text: span.textContent.trim(),
        lines: Math.round((h / lineH) * 10) / 10,
        cellW: Math.round(btn.getBoundingClientRect().width * 10) / 10,
        cols: track ? track.children.length : 0,
      })
    }
    return out
  })

/** 深度模式：逐个点击分段器选项，覆盖 `showIf` 切换后才渲染的控件 */
export async function runDeepSegWrapOnPage(page, id) {
  const failures = []
  let states = 0
  const groupSizes = await page.evaluate(() =>
    [...document.querySelectorAll('div.grid.bg-neutral-100.rounded-lg')].map((t) => t.children.length),
  )
  for (let gi = 0; gi < groupSizes.length; gi++) {
    for (let oi = 0; oi < groupSizes[gi]; oi++) {
      const btn = page.locator('div.grid.bg-neutral-100.rounded-lg').nth(gi).locator('> button').nth(oi)
      if (!(await btn.count())) continue
      await btn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(250)
      states++
      const sub = await scanSegWrapOnPage(page)
      for (const r of sub) {
        if (r.lines > 1.35) failures.push({ id, state: `mode#${gi}.${oi}`, ...r })
      }
    }
  }
  return { failures, states }
}

function isDirectInvocation() {
  const entry = process.argv[1]
  if (!entry) return false
  return resolve(entry).toLowerCase() === resolve(fileURLToPath(import.meta.url)).toLowerCase()
}

async function runCli() {
  const argOf = (name, dflt) => {
    const i = process.argv.indexOf(`--${name}`)
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt
  }
  const BASE = argOf('base', 'http://localhost:5199')
  const WIDTH = Number(argOf('width', '1440'))
  const DEEP = process.argv.includes('--deep')

  const ids = collectAnimIds()
  if (!ids.length) {
    console.error('未能在 src/data/registries 中找到任何 anim id')
    process.exit(2)
  }

  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    console.error('缺少 playwright 依赖，无法执行实测审计')
    process.exit(2)
  }

  const browser = await chromium.launch()
  const page = await (await browser.newContext({ viewport: { width: WIDTH, height: 900 } })).newPage()

  let totalBtns = 0
  let totalStates = 0
  const failures = []
  const unreachable = []

  for (const id of ids) {
    try {
      await page.goto(`${BASE}/#/animation/${id}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    } catch {
      unreachable.push(id)
      continue
    }
    await page.waitForTimeout(900)

    const rows = await scanSegWrapOnPage(page)
    totalBtns += rows.length
    for (const r of rows) {
      if (r.lines > 1.35) failures.push({ id, state: 'default', ...r })
    }

    if (DEEP) {
      const res = await runDeepSegWrapOnPage(page, id)
      totalStates += res.states
      failures.push(...res.failures)
    }
  }

  await browser.close()

  for (const f of failures) {
    console.log(`❌ ${f.id}  「${f.text}」  折 ${f.lines} 行  单格 ${f.cellW}px  [${f.state}]`)
  }
  if (unreachable.length) {
    console.log(`\n⚠️  ${unreachable.length} 个页面未能加载：${unreachable.join(', ')}`)
  }

  const pages = ids.length - unreachable.length
  const deepNote = DEEP ? ` / 深度切换 ${totalStates} 次` : ''
  console.log(
    `\n实测 ${pages} 个页面 / ${totalBtns} 个分段器按钮${deepNote} / ${failures.length} 处折行（视口 ${WIDTH}px）`,
  )

  if (failures.length) {
    console.log('判定：存在折行，按 §2.6.6 压缩选项或补 allowWrap 理由后重测。')
    process.exit(1)
  }
  console.log('判定：全部不折行 ✅')
}

if (isDirectInvocation()) {
  await runCli()
}
