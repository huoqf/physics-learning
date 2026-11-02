#!/usr/bin/env node
/**
 * probe-seg-wrap.mjs — 分段器折行实测的**底层探针**（§2.6.6 的兜底验证层）
 *
 * 层次关系（两个脚本不是重复实现，是上下两层）：
 *   · `check-seg-wrap.mjs` = 门禁入口：起 `vite preview` + 遍历视口 + 回收端口 + 传退出码
 *   · 本文件               = 单一视口的 DOM 探针：给定 --base/--width，量出折行并报告
 * 门禁只调探针，不重复实现测量；探针也可单独对着已起的 dev server 反复调试。
 *
 * 为什么需要真实 DOM：`check-control-meta.mjs` 用字宽模型估算选项宽度，模型是"约值"，
 * 而浏览器字形渲染每字可能在 12.0~12.2px 之间浮动。实测出现过「模型算 111px、
 * 按钮可用 111.5px，理论上放得下，实际却折成两行」的边界案例。
 * 静态守卫负责快速拦截明显超长，本探针负责用真实 DOM 抓出边界漏网。
 *
 * 用法（人工调试时）：
 *   npx vite --port 5199 --strictPort &        # 先起 dev server
 *   npm run probe:seg-wrap                     # 默认 http://localhost:5199
 *   node scripts/probe-seg-wrap.mjs --base http://localhost:5199 --width 1440
 *
 * 常规入口是 `npm run check:seg-wrap`（CI/本地门禁），不需要手动跑本文件。
 *
 * 退出码：0 全部不折行 / 1 存在折行
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REG_DIR = join(ROOT, 'src/data/registries')

const argOf = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt
}
const BASE = argOf('base', 'http://localhost:5199')
const WIDTH = Number(argOf('width', '1440'))
/** 深度模式：逐个点开分段器的每个选项，覆盖 `showIf` 切换后才渲染的控件 */
const DEEP = process.argv.includes('--deep')

function collectAnimIds() {
  const ids = new Set()
  for (const f of readdirSync(REG_DIR)) {
    if (!f.endsWith('.ts')) continue
    const src = readFileSync(join(REG_DIR, f), 'utf8')
    for (const m of src.matchAll(/^ {2}'(anim-[a-z0-9-]+)'\s*:/gm)) ids.add(m[1])
  }
  return [...ids].sort()
}

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

/** 扫描当前 DOM 里所有分段器按钮是否折行 */
const scanPage = (page) =>
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

for (const id of ids) {
  try {
    await page.goto(`${BASE}/#/animation/${id}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  } catch {
    unreachable.push(id)
    continue
  }
  await page.waitForTimeout(900)

  const rows = await scanPage(page)
  totalBtns += rows.length
  for (const r of rows) {
    if (r.lines > 1.35) failures.push({ id, state: 'default', ...r })
  }

  if (!DEEP) continue

  // 深度模式：逐个点击分段器的每个选项，覆盖 showIf 切换后才出现的控件
  // （默认态看不到的组同样可能折行，静态守卫虽按双视口卡住宽度，
  //   但只有真点开才能确认渲染结果，2026-10 有 10 处正是这样才暴露的）
  const groupSizes = await page.evaluate(() =>
    [...document.querySelectorAll('div.grid.bg-neutral-100.rounded-lg')].map((t) => t.children.length)
  )
  for (let gi = 0; gi < groupSizes.length; gi++) {
    for (let oi = 0; oi < groupSizes[gi]; oi++) {
      const btn = page.locator('div.grid.bg-neutral-100.rounded-lg').nth(gi).locator('> button').nth(oi)
      if (!(await btn.count())) continue
      await btn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(250)
      totalStates++
      const sub = await scanPage(page)
      for (const r of sub) {
        if (r.lines > 1.35) failures.push({ id, state: `mode#${gi}.${oi}`, ...r })
      }
    }
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
  `\n实测 ${pages} 个页面 / ${totalBtns} 个分段器按钮${deepNote} / ${failures.length} 处折行（视口 ${WIDTH}px）`
)

if (failures.length) {
  console.log('判定：存在折行，按 §2.6.6 压缩选项或补 allowWrap 理由后重测。')
  process.exit(1)
}
console.log('判定：全部不折行 ✅')
