#!/usr/bin/env node
/**
 * check-naming.mjs — 模块命名与解析歧义守卫（ARCHITECTURE_RULES §10 的自动项）
 *
 * 为什么需要它：§10 的三条命名约束此前只写在文档里，没有任何自动检查。
 * 2026-11 审计时 `src/data/quantities/thermodynamics.ts`（内容是布朗运动看板）
 * 与 `thermodynamics/`（真热力学子模块）并存，命名完全误导，正是这条防线缺位的结果。
 *
 * 检查四条（前三条是 §10 明文，第四条是"名字必须与内容相符"里唯一能自动判的部分）：
 *   ① 同目录同基名双后缀：`foo.ts` 与 `foo.tsx` 并存 → TS 隐式扩展解析歧义
 *   ② `foo.ts|tsx` 与 `foo/index.ts|tsx` 并存 → `import('./foo')` 命中谁不确定（真会咬人）
 *   ③ 同目录内仅大小写不同的两名（同类：文件比文件、目录比目录）→ Windows/macOS 不敏感、
 *      Linux 敏感，跨平台必炸；磁盘上抓不到的（Windows 无法共存）再从 git index 补一轮
 *   ④ barrel 自述：`foo.ts` 与 `foo/` 并存且目录内有 index 时，已在 ② 拦下；
 *      并存的非 index 情形（页面组件 + 其 components/hooks/model 子目录）属 §10 允许，
 *      不报错
 *
 * 用法：
 *   npm run check:naming          # 门禁
 *   node scripts/check-naming.mjs --report   # 只打印扫描概况
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const REPORT_ONLY = process.argv.includes('--report')

const rel = (p) => relative(ROOT, p).split(sep).join('/')
const isTs = (name) => name.endsWith('.ts') || name.endsWith('.tsx')
/** `foo.ts` / `foo.tsx` → `foo`；`foo.d.ts` 不参与（手写声明不构成运行时模块） */
const baseOf = (name) => (name.endsWith('.tsx') ? name.slice(0, -4) : name.slice(0, -3))

const violations = []
let dirCount = 0
let fileCount = 0

function report(dir, message) {
  violations.push(`${rel(dir)}/：${message}`)
}

function checkDirectory(dir) {
  const entries = readdirSync(dir)
  dirCount += 1
  const files = entries.filter((n) => statSync(join(dir, n)).isFile())
  const dirs = entries.filter((n) => statSync(join(dir, n)).isDirectory())
  fileCount += files.filter(isTs).length

  // ① 同基名 .ts 与 .tsx 并存
  const byBase = new Map()
  for (const f of files.filter(isTs)) {
    const b = baseOf(f)
    if (!byBase.has(b)) byBase.set(b, [])
    byBase.get(b).push(f)
  }
  for (const [base, names] of byBase) {
    const hasTs = names.includes(`${base}.ts`)
    const hasTsx = names.includes(`${base}.tsx`)
    if (hasTs && hasTsx) {
      report(dir, `\`${base}.ts\` 与 \`${base}.tsx\` 并存（隐式扩展解析歧义）`)
    }
  }

  // ② foo.ts|tsx 与 foo/index.ts|tsx 并存
  for (const d of dirs) {
    const hasDirEntry = ['index.ts', 'index.tsx'].some((i) => existsSync(join(dir, d, i)))
    if (!hasDirEntry) continue // 无 index 的目录不构成解析歧义（§10 明确允许）
    for (const ext of ['.ts', '.tsx']) {
      if (files.includes(d + ext)) {
        report(
          dir,
          `\`${d}${ext}\` 与 \`${d}/index.*\` 并存（\`import('./${d}')\` 命中不确定，§10 禁止）`,
        )
      }
    }
  }

  // ③ 仅大小写不同（同类比较：文件↔文件、目录↔目录）
  for (const [kind, group] of [
    ['文件', files],
    ['目录', dirs],
  ]) {
    const seen = new Map()
    for (const name of group) {
      const key = name.toLowerCase()
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key).push(name)
    }
    for (const [key, names] of seen) {
      if (names.length > 1) {
        report(dir, `${kind}名仅大小写不同：${names.join(' / ')}（跨平台必炸，键 ${key}）`)
      }
    }
  }

  for (const d of dirs) {
    if (d === '__tests__' || d === 'node_modules') continue
    checkDirectory(join(dir, d))
  }
}

checkDirectory(SRC)

// ④ 磁盘上抓不到的大小写碰撞：Windows/macOS 无法让 `Foo.ts` 与 `foo.ts` 共存，
//    但 git index 里可以有（从 Linux 提交进来的）。这种情况在 Windows 检出时会静默丢文件。
const caseCollisions = []
try {
  const listed = execFileSync('git', ['ls-files', '-z', '--', 'src'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 32 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean)
  const byLower = new Map()
  for (const p of listed) {
    const key = p.toLowerCase()
    if (!byLower.has(key)) byLower.set(key, new Set())
    byLower.get(key).add(p)
  }
  for (const [, paths] of byLower) {
    if (paths.size > 1) caseCollisions.push([...paths].join(' / '))
  }
} catch {
  // 非 git 环境（如打包后的 CI 检出）：跳过这一轮，其余三条仍然生效
  if (!REPORT_ONLY) console.log('⚠️  跳过 git index 大小写检查（当前不在 git 仓库内或 git 不可用）')
}

for (const c of caseCollisions) {
  violations.push(`git index：同一路径仅大小写不同 → ${c}（在 Linux 提交会炸 Windows 检出）`)
}

if (REPORT_ONLY) {
  console.log(`扫描 ${dirCount} 个目录 / ${fileCount} 个 TS 文件，问题 ${violations.length} 处`)
  for (const v of violations) console.log(`  ${v}`)
  process.exit(0)
}

if (violations.length) {
  console.error('❌ 命名/解析歧义检查未通过：')
  for (const v of violations) console.error(`   · ${v}`)
  console.error('\n规则见 ARCHITECTURE_RULES §10：同基名不得双后缀；不得 `foo.ts` + `foo/index.ts`；')
  console.error('同目录不得出现仅大小写不同的同名。改文件名时记得同步改 import。')
  process.exit(1)
}

console.log(
  `✅ 命名/解析歧义检查通过：${dirCount} 个目录 / ${fileCount} 个 TS 文件，无同基名双后缀、无 index 入口冲突、无大小写碰撞。`,
)
