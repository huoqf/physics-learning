#!/usr/bin/env node
/**
 * check-seg-wrap.mjs — 分段器折行实测的 CI 入口（§2.6.6 的强制层）
 *
 * 为什么需要它：`check-control-meta.mjs` 用字宽模型**估算**选项宽度，模型是约值；
 * 而真实字形渲染每字在 12.0~12.2px 之间浮动，实测出现过「模型算 111px、按钮可用
 * 111.5px，理论上放得下，实际却折成两行」的边界案例。静态模型只能拦明显超长，
 * 贴边折行只有真实 DOM 能抓——所以必须有人在真浏览器里跑。
 *
 * 此前 `audit:seg-wrap` 需要人手动 `npx vite --port 5199 &`，规范只能写"必须跑"，
 * 没有任何强制力。本脚本把它做成自包含：起 `vite preview`（读 `dist/`）→ 双视口实测
 * → 关服务 → 传退出码，因此可以进 `npm run check`。
 *
 * 用法：
 *   npm run check:seg-wrap              # 1440 + 1280 两个视口，默认态（CI 用）
 *   npm run check:seg-wrap -- --deep     # 额外点开每个分段器的每个选项（改动 options 后必跑）
 *   npm run check:seg-wrap -- --width 1600
 *
 * 前置：`npm run build`（preview 读 dist/）；Playwright 浏览器需已安装
 *      （`npx playwright install chromium`）。
 *
 * 退出码：0 全部不折行 / 1 存在折行或页面加载失败 / 2 环境不具备
 */
import { existsSync } from 'node:fs'
import { execSync, spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 5299
const BASE = `http://localhost:${PORT}`

const argv = process.argv.slice(2)
const DEEP = argv.includes('--deep')
const widthArg = argv.indexOf('--width')
const WIDTHS = widthArg > -1 && argv[widthArg + 1] ? [Number(argv[widthArg + 1])] : [1440, 1280]

if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('❌ 找不到 dist/index.html——请先 `npm run build`（preview 服务读的是构建产物）')
  process.exit(2)
}

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

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('close', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

const server = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: 'ignore', shell: process.platform === 'win32' },
)

/**
 * 关服务：必须真的把监听端口的进程收掉。
 *
 * 踩过的坑：`spawn('npx', ['vite','preview'], { shell: true })` 在 Windows 下会多套一层
 * cmd/node，`server.kill()` 只杀掉外壳，vite 仍占着 5299 继续跑——下一次 `npm run check`
 * 就会 `--strictPort` 端口冲突。所以这里按"端口上真实监听的 PID"来杀，并轮询确认已释放。
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
    /* netstat 不可用时只能靠 server.kill() */
  }
  return null
}

async function stopServer() {
  // 先给外壳进程一个体面的退出机会，再按端口上的真实 PID 补刀
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

let failed = 0
for (const width of WIDTHS) {
  const args = ['scripts/audit-seg-wrap.mjs', '--base', BASE, '--width', String(width)]
  if (DEEP) args.push('--deep')
  const code = await run(process.execPath, args)
  if (code !== 0) failed = code
}

const released = await stopServer()
if (!released) {
  console.error(`⚠️  端口 ${PORT} 仍被占用，未能回收 preview 进程，请手动检查（会阻塞下次运行）`)
}

if (failed) {
  console.error('\n❌ 分段器折行实测未通过：按上面的清单压缩标签，或对确需折行的一项加 `allowWrap: true` 并注释理由。')
  process.exit(1)
}
console.log(`\n✅ 分段器折行实测通过（视口 ${WIDTHS.join(' / ')}${DEEP ? '，深度模式' : ''}）`)
