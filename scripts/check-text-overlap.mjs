#!/usr/bin/env node
/**
 * check-text-overlap.mjs — 中屏 SVG 标注「文字互相压字」的实测守卫
 *
 * 为什么需要它：`check-font-size` / `check-control-meta` 之类只能管静态代码，
 * 而中屏的每个标签坐标是各 Scene 手摆的，`<text>` 之间会不会互相压住，只有
 * 真渲染出来才知道。2026-10 普查发现 124 页里 40 页存在字符级碰撞，其中
 * `anim-connected-bodies` 把同一个 `T = 6.0N` 画了两遍、相距 1px——肉眼看着
 * 像"加粗了"，实际是重复渲染，靠人眼巡检根本抓不住。
 *
 * 判据（字符级碰撞，不含"贴边/紧行距"）：
 *   水平重叠 ≥ 6px  且  垂直重叠 ≥ 0.5 倍字号
 * 只要求垂直重叠 1~2px 的算"紧行距"，视觉上是正常的行间贴靠，不计。
 *
 * 第二判据（2026-11-01 起）：**文字被裁**——文字盒超出最近一层裁切盒
 * （自身向上的所有 `overflow != visible` 祖先，含 svg 根元素自身的 viewBox）
 * 超过 3px 即报。压字是"两个标注打架"，被裁是"标注跑出画布"，修法完全不同
 * （前者挪坐标、后者给画布留标注带），所以分两张清单。
 * 这一判据补的是个真实盲区：`anim-oblique-throw` 的横轴刻度数字整排画在
 * viewBox 之外、从来没显示过，但压字判据看不到（它们和轴名"相撞"时其实
 * 两个都不可见）——只靠人眼看图才发现。**2026-11-01 起已清到 0 并转为硬门禁**
 * （`FAIL_ON_CLIP = true`）：任何新出现的“画了但看不见”都会直接判失败。
 *
 * 豁免（合法手法，自动跳过）：
 *   - 同文案 + 有描边的"光晕对"（白描边 + 实色填充叠两层）
 *   - 同文案 + 整体偏移 ≤2px + 其一是白色填充的"描影对"（`anim-ac-generation`
 *     的磁极字母就是这么做的：白字压在深色字左上 1px 做立体感）
 * 基线（`scripts/text-overlap-baseline.json`）**2026-11-01 已清空为 0 条**，两个判据
 * 现在是硬门禁：出现任何一处即失败。机制本身保留着——万一将来某次重构一次牵动
 * 十几页、来不及当轮清完，还可以临时写基线把"存量"与"新增"分开看，但别让它长期
 * 挂账（那又是一张永久豁免表）。写基线时会打印未扫描/未覆盖率，有页没扫到就拒绝写。
 *
 * 用法：
 *   npm run check:text-overlap                  # 校验（CI 用）：出现基线外的重叠即失败
 *   npm run check:text-overlap -- --report      # 只打印全部重叠清单，不判失败
 *   npm run check:text-overlap -- --report --write-baseline   # 用当前结果重写基线
 *   npm run check:text-overlap -- --width 1280  # 只跑单一视口（调试用）
 *   npm run check:text-overlap -- --report --page anim-free-fall,anim-newton-second
 *                                               # 只扫指定动画，并打印重叠坐标（定位问题用）
 *
 * 单页调试（`--page`）不参与 CI 判定，也不能与 `--write-baseline` 同时使用——
 * 否则会把"只扫了一页"的残缺结果写成全库基线，下一轮 CI 全红。
 *
 * 视口（2026-10-31 起）：默认跑 **1440 与 1280 两个视口**，基线取并集。
 * 只跑 1440 会漏掉窄视口才出现的问题——实测 1280 下 `anim-friction`、
 * `anim-nuclear-decay` 各多出 1 处压字，且 63 条基线里有 18 条在 1280 不复现。
 * 与 `check-control-meta` 的"双视口取严"保持同一口径。
 *
 * 纳管范围（2026-10-31 起）：`width > 260` 且含可见 `<text>` 的 svg，**不再设高度门槛**。
 * 原门槛 `height > 200` 把 `MiniChart`（默认 300×130）整个家族挡在外面，而它正是
 * 坐标轴标题撞末位刻度的常发地。宽度判据已经排除了左屏 16px 图标，高度门槛属冗余。
 *
 * 前置：**必须先 `npm run build`**（preview 读的是 dist/，用旧产物会得到假绿）、
 *       Playwright 浏览器已安装、端口 5300 空闲（被占用会 `--strictPort` 直接崩）。
 * 退出码：0 通过 / 1 有页未能扫描（渲染失败）或出现基线外的新重叠 / 2 环境不具备
 *
 * 已知盲区（尚未覆盖，勿据本脚本判"全绿"）：Canvas 2D 的 `fillText`/`strokeText`
 * 共 84 处 / 7 个文件（`BoundaryMagneticField/canvasDrawing.ts`、`AlphaScatterAnimation`、
 * `BohrOrbits`、`drawExcitation`、`PhotoelectricSim`、`useExcitationSimulation`、
 * `PhototubeCanvas`），这些文字不在 DOM 里，`querySelectorAll('text')` 永远看不到。
 * 其中 `anim-alpha-scatter` / `anim-bohr-theory` / `anim-photoelectric` 整页只有 Canvas，
 * 已列入 `CANVAS_ONLY_PAGES`，每轮会打印"未覆盖"提醒但不判失败。
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync, spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REG_DIR = join(ROOT, 'src/data/registries')
const BASELINE_FILE = join(ROOT, 'scripts/text-overlap-baseline.json')
const PORT = 5300
const BASE = `http://localhost:${PORT}`

const argv = process.argv.slice(2)
const REPORT = argv.includes('--report')
const WRITE_BASELINE = argv.includes('--write-baseline')
const widthArg = argv.indexOf('--width')
/** 默认双视口取并集；`--width` 只用来做单视口调试 */
const WIDTHS =
  widthArg > -1 && argv[widthArg + 1] ? [Number(argv[widthArg + 1])] : [1440, 1280]

/** 判定阈值：字符级碰撞 */
const MIN_OVERLAP_W = 6
const MIN_OVERLAP_H_RATIO = 0.5

/**
 * 「文字被裁」的容差（px）。
 * 文字盒超出裁切盒超过这个值才算——抗锯齿与外框估算本身就有 1~2px 误差，
 * 取 0 会把一批贴边的正常排版也算进来。
 */
const CLIP_TOL = 3

/**
 * 连续这么多页都加载失败，就判定 preview 服务已经死了（被杀 / 被回收 / 端口冲突），
 * 立即中止而不是硬跑完。
 * 不加这条的实测代价：服务在第 40 秒挂掉，剩下 108 页每页烧满 15s×2 次重试，
 * 整轮要静默空转近一小时才吐出失败信息。
 */
const MAX_CONSECUTIVE_FAIL = 5

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('❌ 找不到 dist/index.html——请先 `npm run build`（preview 服务读的是构建产物）')
  process.exit(2)
}

/** 从注册表里收集全部动画 id（与 audit-seg-wrap 同一口径） */
const ids = (() => {
  const set = new Set()
  for (const f of readdirSync(REG_DIR)) {
    if (!f.endsWith('.ts')) continue
    const src = readFileSync(join(REG_DIR, f), 'utf8')
    for (const m of src.matchAll(/^ {2}'(anim-[a-z0-9-]+)'\s*:/gm)) set.add(m[1])
  }
  return [...set].sort()
})()
if (!ids.length) {
  console.error('未能在 src/data/registries 中找到任何 anim id')
  process.exit(2)
}

/**
 * `--page a,b` 只扫指定动画，用于单页调试。
 *
 * 【为什么必须有】清理压字是「改一处 → 看这一页有没有消掉」的循环，
 * 全库 108 页 × 双视口跑一轮要几分钟，盯着看根本迭代不动。
 * 单页调试不参与 CI：`--page` 与 `--write-baseline` 同时给会直接拒绝，
 * 否则会把"只扫了一页"的残缺结果写成全库基线，下一次 CI 全红。
 */
const pageArg = argv.indexOf('--page')
const ONLY =
  pageArg > -1 && argv[pageArg + 1] ? new Set(argv[pageArg + 1].split(',').map((s) => s.trim())) : null
if (ONLY) {
  if (WRITE_BASELINE) {
    console.error('❌ `--page` 与 `--write-baseline` 不能同时使用——单页结果不能当全库基线')
    process.exit(2)
  }
  const missing = [...ONLY].filter((p) => !ids.includes(p))
  if (missing.length) {
    console.error(`❌ 注册表里没有这些动画 id：${missing.join(', ')}`)
    process.exit(2)
  }
}
const targets = ONLY ? ids.filter((id) => ONLY.has(id)) : ids

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

/**
 * 关服务：必须按"端口上真实监听的 PID"杀。
 * Windows 下 `spawn(shell:true)` 会多套一层 cmd/node，`server.kill()` 只杀外壳，
 * 端口仍被占，下次运行必然 `--strictPort` 冲突。
 */
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

/** 扫描当前页面的中屏画布，返回字符级碰撞清单 */
const scan = (page) =>
  page.evaluate(
    ({ minW, hRatio, clipTol }) => {
      const out = []
      const clipped = []
      let textCount = 0
      // 只统计"中屏画布"量级的大 svg，排除左屏 16px 图标。
      // 不设高度门槛：`MiniChart` 默认 300×130，设 `height > 200` 会把它整族漏掉。
      const svgs = [...document.querySelectorAll('svg')].filter((s) => {
        const r = s.getBoundingClientRect()
        return r.width > 260
      })
      /**
       * 求一个节点实际被裁切的矩形：从自身向上收集所有「overflow 非 visible」盒子取交集。
       * `<svg>` 根元素默认 `overflow: hidden`，所以 svg 自身也算一层——这正是
       * `anim-oblique-throw` 的刻度整排消失的原因：它们画在 viewBox 之外。
       * 只取 border box（几像素的 padding 误差对"是否被裁"没有意义）。
       */
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
          // 有效不透明度：`opacity` × `fill-opacity` × 填充色自带的 alpha。
          // 低于 0.15 的文字当「背景水印」处理——它几乎不可见，不可能遮挡别人。
          // 必须把填充色里的 alpha 也算进来：项目里的水印是 `withAlpha(..., 0.08)`
          // 写进 fill 的，`fill-opacity` 仍然是 1，只看 `fill-opacity` 会漏判。
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
          // 「被裁」判据：文字盒超出最近一层裁切盒的任一边 ≥ 容差。
          // 与重叠判据互不影响——被裁的文字可能同时压着别人，两者都要报。
          //
          // ⚠️ 必须先扣掉「行高留白」：`getBoundingClientRect` / `getBBox` 给的都是
          // **排版盒**（含 font 的 ascent/descent 空白），不是字形墨迹。实测
          // `anim-binary-stars` 的竖排标题 `位置投影 x (m)` 排版盒左边超出卡片 5px，
          // 但字完整可见——那 5px 全是留白。竖排时留白跑到左右、横排时跑到上下，
          // 所以四个方向统一按 0.25 倍字号扣减，而不是只扣某一侧。
          // 代价：真正只切掉 5px 左右的轻微裁切会漏，这里要抓的是"半个标签没了"。
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
                clip: [
                  Math.round(clip.left),
                  Math.round(clip.top),
                  Math.round(clip.right),
                  Math.round(clip.bottom),
                ],
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
            // 背景水印对：一方几乎透明（如 `anim-multimeter-ohm` 的 `MF-47 MULTIMETER`
            // 是 8% 灰色铭牌），它不可能遮挡别人，也就谈不上"压字"。判据只在
            // 两者都足够不透明时才成立——遮挡是视觉问题，不是几何问题。
            const watermark = A.op < 0.15 || B.op < 0.15
            if (watermark) continue
            // 光晕对：同文案 + 有描边，属合法叠字
            const halo = same && (A.stroke !== 'none' || B.stroke !== 'none') && (A.sw >= 1 || B.sw >= 1)
            // 描影对：同文案 + 整体偏移 ≤2px + 其一是白色填充（立体感描影）
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
              // 视口坐标：改源码时靠它反查是哪个 Scene 的哪个 text，
              // 只给文案时同一页出现多组相似标签根本分不清。
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

/**
 * 已知"只画 Canvas、不产出可扫描 svg"的页面。
 * 这些页的标注文字由 `fillText`/`strokeText` 直接画在 Canvas 上，不在 DOM 里，
 * 本守卫**看不到**。列入此处是为了把盲区显式化：每轮都会打印"未覆盖"提醒，
 * 但不会因为它们而判失败（当前没有 Canvas 文字检测能力）。
 * ⚠️ 新增任何用 Canvas 画字的页面，必须加进这里并同步 `08_THREE_PANEL_RULES.md §2.7`；
 *    忘记加会导致守卫报"没有宽 > 260 的画布"，这是故意的——逼你做一次显式决定。
 */
const CANVAS_ONLY_PAGES = new Set(['anim-alpha-scatter', 'anim-bohr-theory', 'anim-photoelectric'])

/**
 * 导航成功 ≠ 动画渲染成功。
 * 路由解析失败时 `AnimationPage` 会渲染 `<h2>动画未找到</h2>`，组件抛错则留下一片空白——
 * 两种情况都是 0 个 text，如果只认 `goto()` 有没有抛异常，它们就会伪装成"零重叠"。
 * 实测：往 id 列表里塞一个不存在的 `anim-zzz-not-exist`，旧逻辑照样判"✅ 无新增重叠"。
 * 所以每次导航后都要探一次渲染状态。
 */
const probeRendered = (page) =>
  page.evaluate(() => ({
    notFound: (document.body.innerText || '').includes('动画未找到'),
    wideSvg: [...document.querySelectorAll('svg')].some(
      (s) => s.getBoundingClientRect().width > 260,
    ),
    hasCanvas: !!document.querySelector('canvas'),
  }))

/** 逐视口采集：命中并入 `found`（带 vw 标记），加载失败的页进 `unreachable`（带原因） */
const found = []
const clipFound = []
const unreachable = [] // { id, vw, reason }
const uncovered = [] // { id, vw } —— Canvas-only 页，已知盲区，不判失败
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
    // 加载失败必须重试一次再下定论：单次 timeout 多为 HMR/preview 抖动，
    // 但重试后仍失败就绝不放行——跳过等于该页"零重叠"，是最坏的假绿。
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

    // 已知的 Canvas-only 页：明说"没覆盖"，但不判失败（当前无检测能力）
    if (!notFound && !wideSvg && hasCanvas && CANVAS_ONLY_PAGES.has(id)) {
      uncovered.push({ id, vw: WIDTH })
      continue
    }
    if (notFound || !wideSvg) {
      unreachable.push({
        id,
        vw: WIDTH,
        reason: notFound
          ? '页面渲染了"动画未找到"'
          : hasCanvas
            ? '页面只有 Canvas 没有 svg——若确为 Canvas 渲染页，请加入 CANVAS_ONLY_PAGES'
            : '页面既无宽 > 260 的 svg 也无 canvas（未渲染 / 渲染崩溃）',
      })
      if (++consecutiveFail >= MAX_CONSECUTIVE_FAIL) {
        aborted = true
        break
      }
      continue
    }
    const { out, clipped, textCount } = await scan(page)
    vwText += textCount
    okPages++
    // 只有"导航 + 渲染 + 扫描"全过关才重置连败计数
    consecutiveFail = 0
    for (const o of out) found.push({ anim: id, vw: WIDTH, ...o })
    for (const c of clipped) clipFound.push({ anim: id, vw: WIDTH, ...c })
  }

  perViewport.push({ vw: WIDTH, pages: okPages, text: vwText, aborted })
  totalText += vwText
  await ctx.close()
  if (aborted) break // 服务已死，后一个视口不必再跑
}

await browser.close()
const released = await stopServer()
if (!released) console.error(`⚠️  端口 ${PORT} 仍被占用，未能回收 preview 进程`)

/**
 * 稳定 key：同一页同一对文案只算一处。
 * 跨视口同名条目合并成一条（基线因此天然是两视口的**并集**），
 * 但保留 `widths` 供排查"只在窄视口出现"的位置差异。
 */
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
  // 展示取更严重的那一处（先比垂直重叠，再比水平）
  if (r.oh > prev.oh || (r.oh === prev.oh && r.ow > prev.ow)) {
    const widths = prev.widths
    Object.assign(prev, r, { widths })
  }
}
const rows = [...uniq.values()].sort((x, y) => (x.anim === y.anim ? 0 : x.anim < y.anim ? -1 : 1))

/**
 * 「被裁」条目按 页 + 文案 + 裁切方向 去重（同一排刻度会被裁 9 次，但根因只有一个）。
 * 与压字基线**分开**：压字是"两个标注打架"，被裁是"标注跑出画布"，
 * 前者靠挪坐标，后者靠给画布留出标注带，修法不同不该混在一张清单里。
 */
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
const clipRows = [...clipUniq.values()].sort((x, y) =>
  x.anim === y.anim ? 0 : x.anim < y.anim ? -1 : 1,
)

// ── 基线 ────────────────────────────────────────────────────────────────
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

const known = rows.filter((r) => baseKeys.has(`${r.anim}|${[r.a, r.b].sort().join(' || ')}`))
const fresh = rows.filter((r) => !baseKeys.has(`${r.anim}|${[r.a, r.b].sort().join(' || ')}`))
const curKeys = new Set(rows.map((r) => `${r.anim}|${[r.a, r.b].sort().join(' || ')}`))
const stale = (baseline.entries || []).filter((e) => !curKeys.has(`${e.anim}|${e.key}`))

const fmt = (r) =>
  `  「${r.a}」×「${r.b}」  ${r.ow}×${r.oh}px  字号 ${r.fs}` +
  (ONLY ? `  @(${r.at?.[0]},${r.at?.[1]})/@(${r.bt?.[0]},${r.bt?.[1]})` : '') +
  (WIDTHS.length > 1 && r.widths.length === 1 ? `  仅 ${r.widths[0]}px` : '')

const vwLabel = perViewport
  .map((v) => `${v.vw}px:${v.pages}页/${v.text}text${v.aborted ? '(中止)' : ''}`)
  .join(' · ')

/**
 * 「被裁」清单：这些文字画出来了但看不见（或只露一半）。
 * 比压字更隐蔽——压字至少还能看见两个标签打架，被裁的标签干脆不存在，
 * 于是"这页怎么没有刻度数字"这种问题只能靠人眼发现。
 *
 * 2026-11-01 已清到 0 处，转为**硬门禁**：再出现即判失败。
 * 这条守着"别让标注跑出画布"——被裁的标签和压字一样属于"学生看不到的信息"。
 */
const FAIL_ON_CLIP = true

function printClipped() {
  if (!clipRows.length) return
  const pages = new Set(clipRows.map((c) => c.anim))
  console.log(
    `\n⚠️  ${clipRows.length} 处文字被裁/溢出画布（${pages.size} 页）——画出来了但看不见，需给画布留出标注带：`,
  )
  for (const c of clipRows) {
    console.log(
      `  ${c.anim}  「${c.txt}」  ${c.box[0]}×${c.box[1]}px  超出 ${c.over}px（${c.sides}）` +
        (ONLY ? `  @(${c.at[0]},${c.at[1]})  裁切盒=${c.clip.join(',')}` : '') +
        (WIDTHS.length > 1 && c.widths.length === 1 ? `  仅 ${c.widths[0]}px` : ''),
    )
  }
}

/** 未能加载的页：绝不放行，且必须把失败原因打出来（区分"页面坏了"和"服务没了"） */
function printUnreachable() {
  if (!unreachable.length) return
  console.log(`\n❌ ${unreachable.length} 页未能扫描（不允许跳过，否则等同于该页"零重叠"的假绿）：`)
  for (const u of unreachable) console.log(`  [${u.vw}px] ${u.id}  —— ${u.reason}`)
}

/** 已知的 Canvas-only 页：每轮都要露一次脸，别让"绿"掩盖掉盲区 */
function printUncovered() {
  if (!uncovered.length) return
  const uniqIds = [...new Set(uncovered.map((u) => u.id))]
  console.log(
    `\n⚠️  ${uniqIds.length} 页未覆盖（Canvas 绘制文字，本守卫看不见，需人工看图）：${uniqIds.join(', ')}`,
  )
}

if (REPORT || WRITE_BASELINE) {
  for (const r of rows) console.log(`${r.anim}\n${fmt(r)}`)
  console.log(
    `\n共 ${rows.length} 处字符级碰撞（${new Set(rows.map((r) => r.anim)).size} 页）/ ` +
      `${totalText} 个 text 已扫描  [${vwLabel}]`,
  )
  if (WIDTHS.length > 1) {
    const narrowOnly = rows.filter((r) => r.widths.length === 1)
    if (narrowOnly.length) console.log(`ℹ️  其中 ${narrowOnly.length} 处只在单一视口出现（已标"仅 Npx"）`)
  }
}

if (WRITE_BASELINE) {
  printUnreachable()
  printUncovered()
  printClipped()
  // 有页没扫到就写基线 = 把盲区固化成"当前状态"，下次这些页恢复反而全变"新增"。
  if (unreachable.length) {
    console.log('\n拒绝写基线：存在未能加载的页面，此时写入会把盲区当成基线。请先修好加载问题。')
    process.exit(2)
  }
  const entries = rows.map((r) => ({
    anim: r.anim,
    key: [r.a, r.b].sort().join(' || '),
    reason: '存量：中屏标注由各 Scene 手摆坐标，尚未引入统一避让机制',
    targetDate: '2026-12-31',
  }))
  const out = {
    _comment: 'check-text-overlap.mjs 基线白名单。2026-11-01 已清空为 0 条——两个判据都是硬门禁。仅在"一次重构牵动十几页、当轮清不完"时临时挂账，别长期开着。',
    _format: { anim: '动画 id', key: '两个标签文案按字典序以 " || " 连接', reason: '为何豁免', targetDate: '计划清除日（YYYY-MM-DD）' },
    _reviewNote:
      `2026-10-31 建立，同日扩为双视口（1440+1280，基线取并集）；同日三批清理 65 → 38。` +
      `2026-11-01 根因治理第 0/1 层把「被裁/溢出画布」立为第二判据，38 → 27；` +
      `同日第 2/3 层收尾把两个判据一起清到 0：压字 27 → 0、被裁 23 → 0。` +
      `**基线已清空（entries 为空），两个判据都是硬门禁**（压字默认判失败、` +
      `被裁见 FAIL_ON_CLIP）——现在只剩"新增即失败"这一种状态，不再有存量豁免。` +
      `\n\n` +
      `清零的四条口径（下次再遇到时照这个排序处理，别先从"挪几像素"下手）：` +
      `\n① 「箭尖标签」让位：` +
      `VectorArrow 的标签恒打箭尖外 10px，凡"箭头 + 标签"的压字都源于此。` +
      `同起点、同方向、像素长度又相近的多支箭头（竖直圆周最高/最低点的 F_T 与 a_合）` +
      `必然叠字 → 用 labelPlacement="side" 把其中一枚挪到箭杆 3/4 处的外法线方向。` +
      `若箭尖恒落在某个有自己标注的对象上（简谐运动的位移矢量恒指滑块球心），` +
      `则箭头**不标字**，量与身份交给同色读数行——「一量一标」。` +
      `\n② 标注换带，不挪像素：与"会动的对象"重叠的标注只能整条带搬走。` +
      `滑块中央的 m、绕球球心的 v 读数、板内的 M 都属于这类——对象会动，` +
      `任何固定偏移最终都会撞上（block-board 的 M 左端赔 mg、右端赔滑块，` +
      `最后落在板外下方的标尺标注列才稳）。` +
      `\n③ 刻度行/坐标轴是固定设施，标注自己躲：轴上的刻度值是轴的固有部分，` +
      `不能为了给标注腾地方而挪轴。曲线贴到横轴时下方标签就翻到上方` +
      `（SpringEnergyChartContent 的 belowOrAbove）；导轨下沿已有刻度行时，` +
      `尺寸线另开一条独立标注带（ThinLensAnimation 的物距/像距）。` +
      `\n④ 长文本拆行、容器像素 ≠ 设计单位：单行超宽就拆成两行左对齐（图例）；` +
      `HTML 覆盖层不参加 <g transform> 的缩放，必须显式做 scale/tx/ty 乘算` +
      `（FaradayChartPanel 的 overlayTransform）；` +
      `场景组件在 <g transform> 内排版时只能收 preset.width/height，` +
      `传 vp.visibleW/H（容器像素）会让底部文字整体掉出面板。`,
    entries,
  }
  writeFileSync(BASELINE_FILE, JSON.stringify(out, null, 2) + '\n')
  console.log(`\n✅ 已写入基线 ${rows.length} 条 → scripts/text-overlap-baseline.json`)
  process.exit(0)
}

// ── 判定 ────────────────────────────────────────────────────────────────
// 先报"没扫到的页"：一旦跑不完整，下面的存量/清零统计都失去意义，
// 先列出来才不会让人盯着"65 处已归零"的假象。
printUnreachable()
printUncovered()
printClipped()

if (fresh.length) {
  console.log('❌ 出现基线之外的新重叠：')
  for (const r of fresh) console.log(`  ${r.anim}\n${fmt(r)}`)
}
if (known.length) {
  console.log(`ℹ️  基线内仍存在 ${known.length} 处（存量，见 scripts/text-overlap-baseline.json）`)
}
// 数据不完整时不谈"已不再复现"——那只说明这几页没扫到
if (stale.length && !unreachable.length) {
  console.log(`⚠️  基线里 ${stale.length} 条已不再复现，建议从基线移除：`)
  for (const e of stale.slice(0, 10)) console.log(`  ${e.anim}  ${e.key}`)
  if (stale.length > 10) console.log(`  ……另 ${stale.length - 10} 条`)
}

console.log(
  `\n实测 ${totalText} 个 text / 重叠 ${rows.length} 处（新增 ${fresh.length}）  [${vwLabel}]`,
)

if (unreachable.length) {
  // 中止 / 整视口零页 → 是环境问题（preview 被回收、端口冲突），不是页面问题
  const envDead = perViewport.some((v) => v.aborted || v.pages === 0)
  if (envDead) {
    const v = perViewport.find((x) => x.aborted || x.pages === 0)
    console.log(
      `判定：${v.vw}px 视口在连续 ${MAX_CONSECUTIVE_FAIL} 页加载失败后中止（已扫 ${v.pages} 页）。\n` +
        `      这不是标注问题，而是 preview 服务中断或端口冲突——先排查环境再重跑。`,
    )
  } else {
    console.log('判定：存在未能扫描的页面，视为未通过（不跳过、不放行）。')
  }
  process.exit(envDead ? 2 : 1)
}

if (fresh.length) {
  console.log('判定：新增重叠未通过。把两个标注的坐标/锚点错开，或（确属合法叠字时）补进基线并注明理由。')
  process.exit(1)
}
if (FAIL_ON_CLIP && clipRows.length) {
  console.log(
    '判定：存在被裁/溢出画布的文字。给画布底部（或其他被裁的一侧）留出标注带，' +
      '而不是把标注往外挪——挪出去只会更看不见。',
  )
  process.exit(1)
}
console.log('判定：无新增重叠 ✅')
