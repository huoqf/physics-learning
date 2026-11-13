#!/usr/bin/env node
/**
 * check-runtime-ui.mjs — 真机 DOM 联合质检门禁（单次 preview + 单次全站双视口遍历）
 *
 * 合并了原 `check-seg-wrap.mjs` 与 `check-text-overlap.mjs` 的浏览器巡检外壳：
 *   1. 分段器折行实测（`scanSegWrapOnPage` / `--deep`）；
 *   2. 中屏 SVG 标注字符级压字 & 被裁出画布/viewBox（硬门禁，`FAIL_ON_CLIP = true`）。
 *
 * 两项复用同一次 `vite preview` 与同一次页面打开等待，将真机遍历耗时压减一半。
 *
 * 用法：
 *   npm run check:runtime                              # 同时校验 seg-wrap + text-overlap（双视口 1440+1280）
 *   npm run check:seg-wrap                             # 等价于 --only seg-wrap
 *   npm run check:seg-wrap -- --deep                   # 深度模式：逐个点开分段器选项（含 showIf）
 *   npm run check:text-overlap                         # 等价于 --only text-overlap
 *   npm run check:text-overlap -- --report             # 打印全量重叠清单，不判失败
 *   npm run check:text-overlap -- --report --write-baseline
 *   npm run check:text-overlap -- --report --page anim-free-fall,anim-newton-second
 *   node scripts/check-runtime-ui.mjs --width 1280     # 仅调试单一视口
 *
 * 前置：必须先 `npm run build`（读 dist/）、Playwright Chromium 已安装、端口 5300 空闲。
 * 退出码：0 通过 / 1 发现违规或页面加载失败 / 2 环境或参数不具备
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync, spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectAnimIds, runDeepSegWrapOnPage, scanLeftOverflowOnPage, scanSegWrapOnPage } from './probe-seg-wrap.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_FILE = join(ROOT, 'scripts/text-overlap-baseline.json')
const PORT = 5300
const BASE = `http://localhost:${PORT}`

const argv = process.argv.slice(2)
const argVal = (flag) => {
  const eq = argv.find((a) => a.startsWith(`${flag}=`))
  if (eq) return eq.slice(flag.length + 1)
  const idx = argv.indexOf(flag)
  return idx > -1 && argv[idx + 1] ? argv[idx + 1] : null
}

const ONLY_KIND = argVal('--only') // 'seg-wrap' | 'text-overlap' | null
if (ONLY_KIND && ONLY_KIND !== 'seg-wrap' && ONLY_KIND !== 'text-overlap') {
  console.error(`❌ 未知的 --only 参数：${ONLY_KIND}（允许 seg-wrap | text-overlap）`)
  process.exit(2)
}
const RUN_SEG = !ONLY_KIND || ONLY_KIND === 'seg-wrap'
const RUN_OVERLAP = !ONLY_KIND || ONLY_KIND === 'text-overlap'

const DEEP = argv.includes('--deep')
const REPORT = argv.includes('--report')
const WRITE_BASELINE = argv.includes('--write-baseline')
const widthVal = argVal('--width')
const WIDTHS = widthVal ? [Number(widthVal)] : [1440, 1280]
const pageVal = argVal('--page')
const ONLY_PAGES = pageVal ? new Set(pageVal.split(',').map((s) => s.trim())) : null

const MIN_OVERLAP_W = 6
const MIN_OVERLAP_H_RATIO = 0.5
const CLIP_TOL = 3
const MAX_CONSECUTIVE_FAIL = 5
const FAIL_ON_CLIP = true
const CANVAS_ONLY_PAGES = new Set(['anim-alpha-scatter', 'anim-bohr-theory', 'anim-photoelectric'])

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('❌ 找不到 dist/index.html——请先 `npm run build`（preview 服务读的是构建产物）')
  process.exit(2)
}

const ids = collectAnimIds()
if (!ids.length) {
  console.error('未能在 src/data/registries 中找到任何 anim id')
  process.exit(2)
}

if (ONLY_PAGES) {
  if (WRITE_BASELINE) {
    console.error('❌ `--page` 与 `--write-baseline` 不能同时使用——单页结果不能当全库基线')
    process.exit(2)
  }
  const missing = [...ONLY_PAGES].filter((p) => !ids.includes(p))
  if (missing.length) {
    console.error(`❌ 注册表里没有这些动画 id：${missing.join(', ')}`)
    process.exit(2)
  }
}
const targets = ONLY_PAGES ? ids.filter((id) => ONLY_PAGES.has(id)) : ids

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitReady(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      /* 还没起来 */
    }
    await sleep(300)
  }
  return false
}

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' },
)

function pidListeningOnPort(port) {
  try {
    const lines = execSync('netstat -ano', { encoding: 'utf8' }).split('\n')
    for (const line of lines) {
      if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue
      const pid = Number(line.trim().split(/\s+/).pop())
      if (Number.isInteger(pid) && pid > 0) return pid
    }
  } catch {
    /* ignore */
  }
  return null
}

async function stopServer() {
  try {
    server.kill()
  } catch {
    /* ignore */
  }
  for (let i = 0; i < 25; i++) {
    const pid = pidListeningOnPort(PORT)
    if (!pid) return true
    try {
      if (process.platform === 'win32') execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
      else execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
    } catch {
      /* 进程可能已退出 */
    }
    await sleep(150)
  }
  return pidListeningOnPort(PORT) === null
}

process.on('SIGINT', () => {
  try {
    const pid = pidListeningOnPort(PORT)
    if (pid) execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
  } catch {
    /* ignore */
  }
  process.exit(130)
})

if (!(await waitReady(BASE))) {
  console.error(`❌ vite preview 未能在 30s 内监听 ${BASE}（端口 ${PORT} 是否被占用？）`)
  await stopServer()
  process.exit(2)
}

const { chromium } = await import('playwright')
const browser = await chromium.launch()

const probeRendered = (page) =>
  page.evaluate(() => ({
    notFound: (document.body.innerText || '').includes('动画未找到'),
    wideSvg: [...document.querySelectorAll('svg')].some((s) => s.getBoundingClientRect().width > 260),
    hasCanvas: !!document.querySelector('canvas'),
  }))

const scanTextOverlapOnPage = (page) =>
  page.evaluate(
    ({ minW, hRatio, clipTol }) => {
      const out = []
      const clipped = []
      let textCount = 0
      const svgs = [...document.querySelectorAll('svg')].filter((s) => s.getBoundingClientRect().width > 260)

      const clipRectOf = (el) => {
        let clip = null
        let n = el
        while (n && n !== document.body && n !== document.documentElement) {
          const cs = getComputedStyle(n)
          if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
            const r = n.getBoundingClientRect()
            if (!clip) {
              clip = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
            } else {
              clip = {
                left: Math.max(clip.left, r.left),
                top: Math.max(clip.top, r.top),
                right: Math.min(clip.right, r.right),
                bottom: Math.min(clip.bottom, r.bottom),
              }
            }
          }
          n = n.parentElement
        }
        return clip
      }

      const alphaOf = (color) => {
        if (!color || color === 'none') return 1
        const rgb = /rgba?\(([^)]+)\)/.exec(color)
        if (rgb) {
          const p = rgb[1].split(/[,\s/]+/).filter(Boolean)
          return p.length >= 4 ? Number(p[3]) : 1
        }
        const slash = /\/\s*([\d.]+)\s*\)/.exec(color)
        return slash ? Number(slash[1]) : 1
      }

      for (const svg of svgs) {
        const nodes = []
        for (const t of svg.querySelectorAll('text')) {
          if (t.closest('defs')) continue
          if (t.parentElement && t.parentElement.closest('text')) continue
          const txt = t.textContent.replace(/\s+/g, ' ').trim()
          if (!txt) continue
          const r = t.getBoundingClientRect()
          if (r.width <= 1 || r.height <= 1) continue
          const cs = getComputedStyle(t)
          if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') continue
          const fsOf = parseFloat(cs.fontSize) || 12
          const op =
            (Number(cs.opacity) || (cs.opacity === '0' ? 0 : 1)) *
            (Number(cs.fillOpacity) || (cs.fillOpacity === '0' ? 0 : 1)) *
            alphaOf(cs.fill)
          nodes.push({
            txt,
            r,
            fs: fsOf,
            op,
            sw: parseFloat(cs.strokeWidth) || 0,
            stroke: cs.stroke,
            fill: cs.fill,
          })

          const slack = fsOf * 0.25
          const clip = clipRectOf(t)
          if (clip) {
            const over = {
              left: clip.left - (r.left + slack),
              right: r.right - slack - clip.right,
              top: clip.top - (r.top + slack),
              bottom: r.bottom - slack - clip.bottom,
            }
            const worst = Math.max(over.left, over.right, over.top, over.bottom)
            if (worst > clipTol) {
              const sides = Object.entries(over)
                .filter(([, v]) => v > clipTol)
                .map(([k, v]) => `${k}${Math.round(v)}`)
              clipped.push({
                txt: txt.slice(0, 40),
                over: Math.round(worst),
                sides: sides.join('+'),
                at: [Math.round(r.left), Math.round(r.top)],
                box: [Math.round(r.width), Math.round(r.height)],
                clip: [Math.round(clip.left), Math.round(clip.top), Math.round(clip.right), Math.round(clip.bottom)],
              })
            }
          }
        }
        textCount += nodes.length
        const isWhite = (f) => /^rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(f) || f === '#FFFFFF' || f === 'white'
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const A = nodes[i]
            const B = nodes[j]
            const same = A.txt === B.txt
            if (A.op < 0.15 || B.op < 0.15) continue
            const halo = same && (A.stroke !== 'none' || B.stroke !== 'none') && (A.sw >= 1 || B.sw >= 1)
            const shift = same && Math.abs(A.r.left - B.r.left) <= 2 && Math.abs(A.r.top - B.r.top) <= 2
            const shadow = shift && (isWhite(A.fill) || isWhite(B.fill))
            if (halo || shadow) continue
            const ow = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left)
            const oh = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top)
            if (ow < minW) continue
            if (oh < hRatio * Math.min(A.fs, B.fs)) continue
            out.push({
              a: A.txt.slice(0, 40),
              b: B.txt.slice(0, 40),
              ow: Math.round(ow),
              oh: Math.round(oh),
              fs: Math.round(Math.min(A.fs, B.fs)),
              at: [Math.round(A.r.left), Math.round(A.r.top)],
              bt: [Math.round(B.r.left), Math.round(B.r.top)],
            })
          }
        }
      }
      return { out, clipped, textCount }
    },
    { minW: MIN_OVERLAP_W, hRatio: MIN_OVERLAP_H_RATIO, clipTol: CLIP_TOL },
  )

// ── 双视口联合采集 ───────────────────────────────────────────────────────
const segFailures = []
const leftOverflows = []
let segTotalBtns = 0
let segTotalStates = 0

const found = []
const clipFound = []
const unreachable = []
const uncovered = []
const perViewport = []
let totalText = 0

for (const WIDTH of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 900 } })
  const page = await ctx.newPage()
  let vwText = 0
  let okPages = 0
  let consecutiveFail = 0
  let aborted = false

  for (const id of targets) {
    let ok = false
    let reason = ''
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      try {
        const res = await page.goto(`${BASE}/#/animation/${id}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        })
        if (res && res.status() >= 400) throw new Error(`HTTP ${res.status()}`)
        ok = true
      } catch (err) {
        reason = String(err?.message ?? err).split('\n')[0].slice(0, 120)
        if (attempt === 1) await sleep(400)
      }
    }
    if (!ok) {
      unreachable.push({ id, vw: WIDTH, reason })
      if (++consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
        aborted = true
        break
      }
      continue
    }
    await page.waitForTimeout(900)

    const { notFound, wideSvg, hasCanvas } = await probeRendered(page)

    if (notFound) {
      unreachable.push({ id, vw: WIDTH, reason: '页面渲染了"动画未找到"' })
      if (++consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
        aborted = true
        break
      }
      continue
    }

    if (!wideSvg && !hasCanvas) {
      unreachable.push({ id, vw: WIDTH, reason: '页面既无宽 > 260 的 svg 也无 canvas（未渲染 / 渲染崩溃）' })
      if (++consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
        aborted = true
        break
      }
      continue
    }

    // 1. 分段器折行 & 左屏横向溢出实测（含 Canvas-only 页面的左屏控件，不能跳过）
    if (RUN_SEG) {
      const rows = await scanSegWrapOnPage(page)
      segTotalBtns += rows.length
      for (const r of rows) {
        if (r.lines > 1.35) segFailures.push({ id, vw: WIDTH, state: 'default', ...r })
      }
      const leftOv = await scanLeftOverflowOnPage(page)
      if (leftOv) leftOverflows.push({ id, vw: WIDTH, ...leftOv })
      if (DEEP) {
        const res = await runDeepSegWrapOnPage(page, id)
        segTotalStates += res.states
        for (const f of res.failures) segFailures.push({ vw: WIDTH, ...f })
      }
    }

    // 2. 中屏 SVG 压字与裁切实测
    if (RUN_OVERLAP) {
      if (!wideSvg && hasCanvas) {
        if (CANVAS_ONLY_PAGES.has(id)) {
          uncovered.push({ id, vw: WIDTH })
          okPages++
          consecutiveFail = 0
        } else {
          unreachable.push({
            id,
            vw: WIDTH,
            reason: '页面只有 Canvas 没有 svg——若确为 Canvas 渲染页，请加入 CANVAS_ONLY_PAGES',
          })
          if (++consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
            aborted = true
            break
          }
        }
        continue
      }
      const { out, clipped, textCount } = await scanTextOverlapOnPage(page)
      vwText += textCount
      for (const o of out) found.push({ anim: id, vw: WIDTH, ...o })
      for (const c of clipped) clipFound.push({ anim: id, vw: WIDTH, ...c })
    }

    okPages++
    consecutiveFail = 0
  }

  perViewport.push({ vw: WIDTH, pages: okPages, text: vwText, aborted })
  totalText += vwText
  await ctx.close()
  if (aborted) break
}

await browser.close()
const released = await stopServer()
if (!released) console.error(`⚠️  端口 ${PORT} 仍被占用，未能回收 preview 进程`)

const vwLabel = perViewport
  .map((v) => `${v.vw}px:${v.pages}页${RUN_OVERLAP ? `/${v.text}text` : ''}${v.aborted ? '(中止)' : ''}`)
  .join(' · ')

// ── 汇总与判定 ───────────────────────────────────────────────────────────
let exitCode = 0

if (unreachable.length) {
  console.log(`\n❌ ${unreachable.length} 页未能扫描（不允许跳过，否则等同于假绿）：`)
  for (const u of unreachable) console.log(`  [${u.vw}px] ${u.id}  —— ${u.reason}`)
  const envDead = perViewport.some((v) => v.aborted || v.pages === 0)
  if (envDead) {
    const v = perViewport.find((x) => x.aborted || x.pages === 0)
    console.log(
      `判定：${v.vw}px 视口在连续 ${MAX_CONSECUTIVE_FAIL} 页加载失败后中止（已扫 ${v.pages} 页）。` +
        '先排查 preview 服务中断或端口冲突再重跑。',
    )
    process.exit(2)
  }
  exitCode = 1
}

if (RUN_SEG) {
  for (const f of segFailures) {
    console.log(`❌ [seg-wrap ${f.vw}px] ${f.id}  「${f.text}」  折 ${f.lines} 行  单格 ${f.cellW}px  [${f.state}]`)
  }
  for (const o of leftOverflows) {
    console.log(`❌ [left-overflow ${o.vw}px] ${o.id}  scrollDiff=${o.scrollDiff}px  元素「${o.culprit}」超出 ${o.over}px`)
  }
  const deepNote = DEEP ? ` / 深度切换 ${segTotalStates} 次` : ''
  console.log(
    `[seg-wrap] 实测 ${segTotalBtns} 个分段器按钮${deepNote} / ${segFailures.length} 处折行 / ${leftOverflows.length} 处左屏横向溢出  [${vwLabel}]`,
  )
  if (segFailures.length || leftOverflows.length) {
    console.error('❌ 左屏布局实测未通过：存在分段器折行或左屏横向溢出。')
    exitCode = 1
  }
}

if (RUN_OVERLAP) {
  const keyOf = (r) => `${r.anim}|${[r.a, r.b].sort().join(' || ')}`
  const uniq = new Map()
  for (const r of found) {
    const k = keyOf(r)
    const prev = uniq.get(k)
    if (!prev) {
      uniq.set(k, { ...r, widths: [r.vw] })
      continue
    }
    if (!prev.widths.includes(r.vw)) prev.widths.push(r.vw)
    if (r.oh > prev.oh || (r.oh === prev.oh && r.ow > prev.ow)) {
      const widths = prev.widths
      Object.assign(prev, r, { widths })
    }
  }
  const rows = [...uniq.values()].sort((x, y) => (x.anim === y.anim ? 0 : x.anim < y.anim ? -1 : 1))

  const clipUniq = new Map()
  for (const c of clipFound) {
    const k = `${c.anim}|${c.txt}|${c.sides}`
    const prev = clipUniq.get(k)
    if (!prev) {
      clipUniq.set(k, { ...c, widths: [c.vw] })
      continue
    }
    if (!prev.widths.includes(c.vw)) prev.widths.push(c.vw)
    if (c.over > prev.over) {
      const widths = prev.widths
      Object.assign(prev, c, { widths })
    }
  }
  const clipRows = [...clipUniq.values()].sort((x, y) => (x.anim === y.anim ? 0 : x.anim < y.anim ? -1 : 1))

  let baseline = { entries: [] }
  if (existsSync(BASELINE_FILE)) {
    try {
      baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'))
    } catch {
      console.error('❌ 基线文件解析失败，请检查 scripts/text-overlap-baseline.json')
      process.exit(2)
    }
  }
  const baseKeys = new Set((baseline.entries || []).map((e) => `${e.anim}|${e.key}`))
  const known = rows.filter((r) => baseKeys.has(keyOf(r)))
  const fresh = rows.filter((r) => !baseKeys.has(keyOf(r)))
  const curKeys = new Set(rows.map(keyOf))
  const stale = (baseline.entries || []).filter((e) => !curKeys.has(`${e.anim}|${e.key}`))

  const fmt = (r) =>
    `  「${r.a}」×「${r.b}」  ${r.ow}×${r.oh}px  字号 ${r.fs}` +
    (ONLY_PAGES ? `  @(${r.at?.[0]},${r.at?.[1]})/@(${r.bt?.[0]},${r.bt?.[1]})` : '') +
    (WIDTHS.length > 1 && r.widths.length === 1 ? `  仅 ${r.widths[0]}px` : '')

  if (uncovered.length) {
    const uniqIds = [...new Set(uncovered.map((u) => u.id))]
    console.log(`\n⚠️  ${uniqIds.length} 页未覆盖（Canvas 绘制文字，本守卫看不见）：${uniqIds.join(', ')}`)
  }
  if (clipRows.length) {
    const pages = new Set(clipRows.map((c) => c.anim))
    console.log(`\n⚠️  ${clipRows.length} 处文字被裁/溢出画布（${pages.size} 页）：`)
    for (const c of clipRows) {
      console.log(
        `  ${c.anim}  「${c.txt}」  ${c.box[0]}×${c.box[1]}px  超出 ${c.over}px（${c.sides}）` +
          (ONLY_PAGES ? `  @(${c.at[0]},${c.at[1]})  裁切盒=${c.clip.join(',')}` : '') +
          (WIDTHS.length > 1 && c.widths.length === 1 ? `  仅 ${c.widths[0]}px` : ''),
      )
    }
  }

  if (REPORT || WRITE_BASELINE) {
    for (const r of rows) console.log(`${r.anim}\n${fmt(r)}`)
    console.log(
      `\n共 ${rows.length} 处字符级碰撞（${new Set(rows.map((r) => r.anim)).size} 页）/ ` +
        `${totalText} 个 text 已扫描  [${vwLabel}]`,
    )
    if (WRITE_BASELINE) {
      if (unreachable.length) {
        console.log('\n拒绝写基线：存在未能加载的页面，请先修好加载问题。')
        process.exit(2)
      }
      const entries = rows.map((r) => ({
        anim: r.anim,
        key: [r.a, r.b].sort().join(' || '),
        reason: '存量：中屏标注由各 Scene 手摆坐标，尚未引入统一避让机制',
        targetDate: '2026-12-31',
      }))
      const out = {
        _comment: 'check-runtime-ui.mjs 基线白名单（当前已清空为 0 条硬门禁）。',
        entries,
      }
      writeFileSync(BASELINE_FILE, JSON.stringify(out, null, 2) + '\n')
      console.log(`\n✅ 已写入基线 ${rows.length} 条 → scripts/text-overlap-baseline.json`)
      process.exit(0)
    }
  } else {
    if (fresh.length) {
      console.log('❌ 出现基线之外的新重叠：')
      for (const r of fresh) console.log(`  ${r.anim}\n${fmt(r)}`)
      exitCode = 1
    }
    if (known.length) {
      console.log(`ℹ️  基线内仍存在 ${known.length} 处（见 scripts/text-overlap-baseline.json）`)
    }
    if (stale.length && !unreachable.length) {
      console.log(`⚠️  基线里 ${stale.length} 条已不再复现，建议移除`)
    }
    if (FAIL_ON_CLIP && clipRows.length) {
      console.log('判定：存在被裁/溢出画布的文字。')
      exitCode = 1
    }
    console.log(`[text-overlap] 实测 ${totalText} 个 text / 重叠 ${rows.length} 处（新增 ${fresh.length}）  [${vwLabel}]`)
  }
}

if (exitCode !== 0) process.exit(exitCode)
console.log('\n✅ 真机 DOM 巡检全部通过。')
