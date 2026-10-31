#!/usr/bin/env node
/**
 * 体检脚本：物理事实「单一真源」检查（只读，不改任何文件）。
 *
 * 背景：同一个动画的同一帧，物理状态会在三个地方各自按 (params, t) 重算 ——
 * 场景组件、CenterExtra 图表、data/quantities 的右屏看板。三处只要有一处
 * 对「当前处于哪个阶段」的理解不同（例如 isCut 取 0 还是 1），画面、图表、
 * 右屏数字就会互相打架，而现有守卫只查形状不查语义，全绿放行。
 *
 * 本脚本量化这个缺口，输出：
 *   ① 每个 quantities 构建器是否复用了物理层，还是自己重算（硬编码 g、裸公式）
 *   ② 每个动画目录里有多少个文件在调物理层（= 有多少个独立计算点）
 *   ③ 交叉表：动画的组件调了物理层、但它的看板构建器没调 → 高风险不一致
 *
 * 用法：node scripts/audit-physics-single-source.mjs [--json]
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const asJson = process.argv.includes('--json')

/** 递归收集指定后缀的文件 */
function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, exts, out)
    else if (exts.some((e) => name.endsWith(e))) out.push(p)
  }
  return out
}

const rel = (p) => relative(ROOT, p).split(sep).join('/')

/* ─── ① 物理量构建器 ───────────────────────────────────────────────── */

const quantityFiles = walk(join(SRC, 'data', 'quantities'), ['.ts'])

const builders = quantityFiles.map((file) => {
  const code = readFileSync(file, 'utf8')
  // import 了物理层（不论具体函数），说明至少有可能复用
  const importsPhysics = /from\s+['"]@\/physics[^'"]*['"]/.test(code)
  // 硬编码重力常量：9.8 / 10 作为数值出现（排除注释里的说明）
  const hardcodedG = (code.match(/(?<![\d.])(9\.8|9\.81|10)(?![\d.])/g) ?? []).length
  // 自算特征：开方、三角函数求分量、幂运算 —— 物理层里已有对应实现
  const selfMath = (code.match(/Math\.(sqrt|sin|cos|tan|atan2?|pow)/g) ?? []).length
  // 是否声明了「本文件自己算物理」的说明（有注释的不算无声重复）
  const hasPhysicsNote = /物理层|@\/physics|复用|单一真源/.test(code)

  return {
    file: rel(file),
    importsPhysics,
    hardcodedG,
    selfMath,
    hasPhysicsNote,
  }
})

/* ─── ② features 目录的物理层调用点 ────────────────────────────────── */

const featureFiles = walk(join(SRC, 'features'), ['.ts', '.tsx'])
/** @type {Map<string, {physicsCalls: number, files: Set<string>}>} */
const featureDirs = new Map()

for (const file of featureFiles) {
  const code = readFileSync(file, 'utf8')
  const isPhysicsCall = /from\s+['"]@\/physics[^'"]*['"]/.test(code)
  // 目录取 features 下前两层（features/<domain>/<anim>/）
  const parts = rel(file).split('/')
  const key = parts.slice(0, 3).join('/')
  if (!featureDirs.has(key)) featureDirs.set(key, { physicsCalls: 0, files: new Set() })
  if (isPhysicsCall) {
    const entry = featureDirs.get(key)
    entry.physicsCalls += 1
    entry.files.add(parts[parts.length - 1])
  }
}

/* ─── ③ 动画 → 构建器映射 ─────────────────────────────────────────── */

const pq = readFileSync(join(SRC, 'data', 'physicsQuantities.ts'), 'utf8')
/** @type {Array<{animId: string, builderName: string, modulePath: string}>} */
const animToBuilder = []
const entryRe =
  /'(anim-[a-z0-9-]+)':\s*\{\s*loader:\s*\(\)\s*=>\s*import\('([^']+)'\),\s*builderName:\s*'([^']+)'/g
let m
while ((m = entryRe.exec(pq)) !== null) {
  animToBuilder.push({ animId: m[1], modulePath: m[2], builderName: m[3] })
}

/* ─── 输出 ─────────────────────────────────────────────────────────── */

const riskyBuilders = builders.filter((b) => !b.importsPhysics && b.selfMath > 0)
const cleanBuilders = builders.filter((b) => b.importsPhysics)

if (asJson) {
  console.log(
    JSON.stringify(
      {
        summary: {
          quantityFiles: builders.length,
          importsPhysics: cleanBuilders.length,
          riskyNoPhysics: riskyBuilders.length,
          totalHardcodedG: builders.reduce((s, b) => s + b.hardcodedG, 0),
        },
        riskyBuilders,
        builders,
        featureDirs: [...featureDirs.entries()].map(([dir, v]) => ({
          dir,
          physicsCalls: v.physicsCalls,
          files: [...v.files],
        })),
        animToBuilder,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const pct = (a, b) => `${((a / b) * 100).toFixed(0)}%`

console.log('══ 物理事实单一真源 · 体检报告 ══\n')
console.log(`物理量构建器文件：${builders.length}`)
console.log(`  复用物理层：${cleanBuilders.length}（${pct(cleanBuilders.length, builders.length)}）`)
console.log(`  未复用且自算：${riskyBuilders.length}（${pct(riskyBuilders.length, builders.length)}）`)
console.log(`  全目录硬编码重力常量：${builders.reduce((s, b) => s + b.hardcodedG, 0)} 处\n`)

console.log('── 高风险构建器（未复用物理层 + 自己算了物理）──')
for (const b of riskyBuilders.sort((a, b) => b.selfMath - a.selfMath)) {
  const g = b.hardcodedG ? `  g×${b.hardcodedG}` : ''
  console.log(`  ${b.file.replace('src/data/quantities/', '')}  selfMath=${b.selfMath}${g}`)
}

console.log('\n── 硬编码重力常量但已复用物理层的（可能是注释/局部常量）──')
for (const b of cleanBuilders.filter((x) => x.hardcodedG > 0)) {
  console.log(`  ${b.file.replace('src/data/quantities/', '')}  g×${b.hardcodedG}`)
}

console.log('\n── 动画目录的物理层调用点（>1 即存在多个独立计算点）──')
const heavy = [...featureDirs.entries()]
  .filter(([, v]) => v.physicsCalls > 1)
  .sort((a, b) => b[1].physicsCalls - a[1].physicsCalls)
for (const [dir, v] of heavy.slice(0, 12)) {
  console.log(`  ${dir.replace('src/features/', '')}  ${v.physicsCalls} 个文件`)
}
console.log(`  … 共 ${heavy.length} 个目录存在多处物理层调用`)

/* ─── ④ 关键交叉表：右屏看板与物理层不同源的动画 ───────────────────── */

/*
 * 难点：`dynamics/index.ts` 之类的聚合入口只是 dispatcher（`handleA() ?? handleB() ?? …`），
 * 本身不含物理计算。若按「builder 所在文件是否 import 物理层」判断，会把 28 个电磁学
 * 动画全部误报。所以要穿透 dispatcher：**按 animId 反查真正认领它的实现文件**
 * （各 handle 内部用 `animId === 'xxx'` / `animId !== 'xxx'` 认领）。
 *
 * 一个动画可能被多个文件提及（同上限判断等），取「提及次数最少且非 dispatcher」的那个
 * 作为主实现点 —— dispatcher 不含 animId 字面量，天然不会入选。
 */
const animImplCandidates = new Map() // animId -> [{file, hits}]
/** 文件 → 该文件是否 import 了物理层 */
const fileUsesPhysics = new Map(builders.map((b) => [b.file, b.importsPhysics]))
for (const file of quantityFiles) {
  // 聚合入口（index.ts）只做 `handleA() ?? handleB() ?? …` 分派，本身没有物理计算，
  // 不能算作「实现点」，否则一眼看上去一堆动画都不同源（实际是同目录子文件在算）。
  if (/\/index\.ts$/.test(file)) continue
  const code = readFileSync(file, 'utf8')
  for (const b of code.matchAll(/'(anim-[a-z0-9-]+)'/g)) {
    const id = b[1]
    if (!animImplCandidates.has(id)) animImplCandidates.set(id, [])
    animImplCandidates.get(id).push(rel(file))
  }
}

const implByAnim = new Map()
for (const [animId, files] of animImplCandidates) {
  // 同一 animId 在多文件出现时，取路径最短（最靠近具体实现）的一个
  const pick = [...new Set(files)].sort((a, b) => a.length - b.length)[0]
  implByAnim.set(animId, pick)
}

const boardByAnim = animToBuilder.map((e) => {
  const impl = implByAnim.get(e.animId) ?? null
  return {
    animId: e.animId,
    builderName: e.builderName,
    implFile: impl,
    usesPhysics: impl ? (fileUsesPhysics.get(impl) ?? null) : null,
  }
})

const orphanBoard = boardByAnim.filter((x) => x.usesPhysics === false)
const unmatched = boardByAnim.filter((x) => x.implFile === null)

console.log('\n══ 右屏看板与物理层不同源的动画 ══')
console.log('（这些动画的右屏数值是独立算的，与画面/图表可能打架）\n')
const byImpl = new Map()
for (const x of orphanBoard) {
  const k = x.implFile ?? '?'
  if (!byImpl.has(k)) byImpl.set(k, [])
  byImpl.get(k).push(x.animId)
}
for (const [file, anims] of [...byImpl.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${file.replace('src/data/quantities/', '')}  →  ${anims.length} 个动画`)
  console.log(`    ${anims.join(', ')}`)
}
console.log(`\n合计：${orphanBoard.length} / ${boardByAnim.length} 个动画的右屏不同源`)
if (unmatched.length) {
  console.log(`无法定位实现文件的动画：${unmatched.map((x) => x.animId).join(', ')}`)
}

/* ─── ⑤ 收敛：右屏不同源 + 动画侧另有物理实现 = 真风险 ─────────────── */

/*
 * 「不 import 物理层」本身不等于错：纯几何动画（反射、折射、透镜）只有一个实现，
 * 没有第二份可对照。真正的风险是**两套并存**：
 *   动画组件那边在算（调物理层），右屏看板这边又自己算一遍。
 * 所以补一层：animId → registry 里的 Component 文件 → 跟一层 import →
 * 看动画侧是否触及物理层。
 */

// animId → Component 模块路径
const registryFiles = walk(join(SRC, 'data', 'registries'), ['.ts'])
const componentByAnim = new Map()
for (const file of registryFiles) {
  const code = readFileSync(file, 'utf8')
  // 形如：'anim-xxx': { ... Component: lazy(() => import('@/features/...')) ...
  const blockRe = /'(anim-[a-z0-9-]+)':\s*\{[\s\S]*?Component:\s*lazy\(\(\)\s*=>\s*import\('([^']+)'\)\)/g
  for (const m of code.matchAll(blockRe)) {
    componentByAnim.set(m[1], m[2])
  }
}

/** 把 '@/' 别名与相对路径解析成仓库内绝对路径（仅处理 .ts/.tsx） */
function resolveModule(spec, fromFile) {
  const tryExts = ['', '.tsx', '.ts', '/index.tsx', '/index.ts']
  const base = spec.startsWith('@/')
    ? join(SRC, spec.slice(2))
    : spec.startsWith('.')
      ? join(fromFile, '..', spec)
      : null
  if (!base) return null
  for (const ext of tryExts) {
    const p = base + ext
    try {
      if (statSync(p).isFile()) return p
    } catch {
      /* 继续试探下一个后缀 */
    }
  }
  return null
}

/** 该文件（含一层 import）是否触及物理层 */
function touchesPhysics(file) {
  const code = readFileSync(file, 'utf8')
  if (/from\s+['"]@\/physics/.test(code)) return true
  const specs = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
  for (const spec of specs) {
    const dep = resolveModule(spec, file)
    if (!dep) continue
    try {
      if (/from\s+['"]@\/physics/.test(readFileSync(dep, 'utf8'))) return true
    } catch {
      /* 忽略不可读依赖 */
    }
  }
  return false
}

const realRisk = []
const singleSource = []
for (const x of orphanBoard) {
  const compSpec = componentByAnim.get(x.animId)
  if (!compSpec) continue
  const compFile = resolveModule(compSpec, join(SRC, 'data', 'registries', 'x.ts'))
  if (!compFile) continue
  if (touchesPhysics(compFile)) realRisk.push({ ...x, component: rel(compFile) })
  else singleSource.push(x.animId)
}

console.log('\n══ 真风险：动画侧在算 + 右屏自己又算一遍（两套并存）══\n')
const riskByImpl = new Map()
for (const r of realRisk) {
  const k = r.implFile ?? '?'
  if (!riskByImpl.has(k)) riskByImpl.set(k, [])
  riskByImpl.get(k).push(r.animId)
}
for (const [file, anims] of [...riskByImpl.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ⚠ ${file.replace('src/data/quantities/', '')}（${anims.length}）`)
  console.log(`     ${anims.join(', ')}`)
}
console.log(`\n真风险合计：${realRisk.length} 个动画`)
console.log(`只有一套实现（无第二份可对照，低优先）：${singleSource.length} 个`)
