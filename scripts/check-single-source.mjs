#!/usr/bin/env node
/**
 * check-single-source.mjs — 物理事实「单一真源」守卫（只读，不改任何文件）。
 *
 * 位置：`npm run check:architecture` 的一环，因此 lefthook 预提交与 CI 都会跑。
 *
 * 背景：同一个动画的同一帧，物理状态会在三个地方各自按 (params, t) 重算 ——
 * 场景组件、CenterExtra 图表、data/quantities 的右屏看板。三处只要有一处
 * 对「当前处于哪个阶段」的理解不同（例如 isCut 取 0 还是 1），画面、图表、
 * 右屏数字就会互相打架，而现有守卫只查形状不查语义，全绿放行。
 *
 * 本脚本量化这个缺口，输出：
 *   ① 每个 quantities 构建器是否复用了物理层，还是自己重算（硬编码 g、裸公式）
 *   ② 每个动画目录里有多少个文件在调物理层（= 有多少个独立计算点）
 *   ③ 交叉表：动画组件在算、看板构建器也在算 → 高风险不一致
 *
 * 判定「是否复用物理层」必须解析 import 说明符，不能只看别名：
 *   `from '@/physics'`、`from '../../physics'`、`from '../../../physics/constants'`
 *   指向同一层。历史版本只匹配 `@/physics`，导致 38 个用相对路径复用的构建器被
 *   误判为「未复用」（复用率 39% vs 实际 82%），结论方向完全相反。
 *   —— 这个缺陷当年没有任何测试保护，所以现在把解析层导出为可测函数，
 *      单测在 `tests/scripts/singleSourceParser.test.ts`。
 *
 * 本模块被 import 时不产生任何副作用（不做扫描、不 process.exit）；
 * 只有直接 `node scripts/check-single-source.mjs` 执行时才跑分析。
 *
 * 用法：
 *   npm run check:single-source                    # 等同于下面的 --check，门禁口径
 *   node scripts/check-single-source.mjs           # 人读报告（含复用率与交叉表）
 *   node scripts/check-single-source.mjs --json    # 机读
 *   node scripts/check-single-source.mjs --check   # 门禁：存在真双源即退出码 1
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 默认项目根（供 CLI 与单测各自传参覆盖） */
const DEFAULT_ROOT = process.cwd()

const toPosix = (p) => p.split(sep).join('/')

/* ─── 可测的解析层（单测直接调用这些函数） ───────────────────────────── */

/**
 * 去掉注释，避免注释里的数字/函数名污染统计。
 * 保留 `://`（URL / 协议前缀里的双斜杠不是注释）。
 */
export function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

/** 取出所有静态 import / 动态 import() / export-from 说明符 */
export function importSpecs(code) {
  return [
    ...code.matchAll(/(?:from|import)\s*\(\s*['"]([^'"]+)['"]\s*\)|from\s+['"]([^'"]+)['"]/g),
  ]
    .map((m) => m[1] ?? m[2])
    .filter(Boolean)
}

/**
 * 把 import 说明符解析成**绝对路径**（posix 形式，去掉 .ts/.tsx 扩展名）。
 *
 * - 别名 `@/x` → `<root>/src/x`
 * - 相对路径 `./x` / `../x` → 相对 `fromAbsFile` 所在目录解析
 * - 裸包名（`react` 等）→ null（不属于仓库内模块）
 *
 * @param {string} spec import 说明符
 * @param {string} fromAbsFile 发起 import 的文件的绝对路径
 * @param {string} [root] 项目根（`@/` 的映射基准），默认 `process.cwd()`
 * @returns {string|null} 绝对路径（无扩展名、posix 分隔符）或 null
 */
export function resolveSpecifier(spec, fromAbsFile, root = DEFAULT_ROOT) {
  if (spec.startsWith('@/')) return toPosix(join(root, 'src', spec.slice(2)))
  if (spec.startsWith('.')) {
    const abs = resolve(dirname(fromAbsFile), spec)
    return toPosix(abs).replace(/\.(ts|tsx)$/, '')
  }
  return null
}

/** 该说明符是否指向物理层（`src/physics` 本身或其子模块） */
export function isPhysicsSpec(spec, fromAbsFile, root = DEFAULT_ROOT) {
  const target = resolveSpecifier(spec, fromAbsFile, root)
  if (!target) return false
  const physics = toPosix(join(root, 'src', 'physics'))
  return target === physics || target.startsWith(`${physics}/`)
}

/** 文件本身是否直接 import 物理层 */
export function importsPhysics(absFile, root = DEFAULT_ROOT, cache = new Map()) {
  if (cache.has(absFile)) return cache.get(absFile)
  // 必须先 stripComments：被注释掉的 import 不能算作「复用了物理层」，
  // 否则一个把物理实现整段注掉、自己重算的看板会被误判成合规。
  const code = stripComments(readFileSync(absFile, 'utf8'))
  const hit = importSpecs(code).some((s) => isPhysicsSpec(s, absFile, root))
  cache.set(absFile, hit)
  return hit
}

/** 该路径上是否真的存在文件（逐个试探 TS 的解析后缀） */
function firstExistingFile(targetAbs) {
  for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const p = targetAbs + ext
    try {
      if (statSync(p).isFile()) return p
    } catch {
      /* 继续试探下一个后缀 */
    }
  }
  return null
}

/** 把说明符解析成仓库内真实文件（绝对路径），解析不到返回 null */
export function resolveModule(spec, fromAbsFile, root = DEFAULT_ROOT) {
  const target = resolveSpecifier(spec, fromAbsFile, root)
  if (!target) return null
  return firstExistingFile(target)
}

/** 沿 import 传递链默认下钻层数上限 */
export const TOUCH_DEPTH = 4

/**
 * 该文件（沿 import 传递若干层）是否触及物理层。
 *
 * 必须多层：典型链路是 `XxxAnimation.tsx → hooks/useXxxPhysics.ts → model/xxxViewModel.ts
 * → @/physics`，只看一层会把「经 model 层间接复用物理层」的动画误判成「完全不碰物理层」，
 * 进而把它的看板算成「唯一实现」（正交分解就是这么被漏掉的）。
 */
export function touchesPhysics(
  absFile,
  root = DEFAULT_ROOT,
  cache = new Map(),
  seen = new Set(),
  depth = 0,
) {
  if (importsPhysics(absFile, root, cache)) return true
  if (depth >= TOUCH_DEPTH || seen.has(absFile)) return false
  seen.add(absFile)
  const code = stripComments(readFileSync(absFile, 'utf8'))
  for (const spec of importSpecs(code)) {
    const target = resolveSpecifier(spec, absFile, root)
    if (!target) continue
    const next = firstExistingFile(target)
    if (next && touchesPhysics(next, root, cache, seen, depth + 1)) return true
  }
  return false
}

/* ─── 分析主体（只在直接执行时运行） ─────────────────────────────────── */

function main() {
  const ROOT = DEFAULT_ROOT
  const SRC = join(ROOT, 'src')
  const asJson = process.argv.includes('--json')
  const asCheck = process.argv.includes('--check')
  const rel = (p) => relative(ROOT, p).split(sep).join('/')

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

  /* ─── ① 物理量构建器 ─────────────────────────────────────────────── */

  const quantityFiles = walk(join(SRC, 'data', 'quantities'), ['.ts'])
  /** 只做分派/类型声明、不含物理计算的入口 */
  const isDispatcher = (file) => /\/index\.ts$/.test(file) || /\/types\.ts$/.test(file)

  const builders = quantityFiles.map((file) => {
    const raw = readFileSync(file, 'utf8')
    const code = stripComments(raw)
    // 解析 import 说明符判断是否真正复用物理层（不能只看 @/physics 别名）
    const usesPhysics = importsPhysics(file, ROOT)
    // 硬编码重力常量：只认 9.8 / 9.81 两个具体取值。
    // 历史版本把裸 `10` 也算进来，于是 `v0 = 10`、`n = 10` 全部计成「重力常量」，
    // 本目录曾因此报出「87 处硬编码重力常量」这种无法据以行动的数字。
    const hardcodedG = (code.match(/(?<![\d.])(9\.8|9\.81)(?![\d.])/g) ?? []).length
    // 自算特征：开方、三角函数求分量、幂运算 —— 物理层里已有对应实现
    const selfMath = (code.match(/Math\.(sqrt|sin|cos|tan|atan2?|pow)/g) ?? []).length
    // 是否声明了「本文件自己算物理」的说明（有注释的不算无声重复）
    const hasPhysicsNote = /物理层|@\/physics|复用|单一真源/.test(raw)

    return { file: rel(file), usesPhysics, hardcodedG, selfMath, hasPhysicsNote }
  })

  /* ─── ② features 目录的物理层调用点 ──────────────────────────────── */

  const featureFiles = walk(join(SRC, 'features'), ['.ts', '.tsx'])
  /** @type {Map<string, {physicsCalls: number, files: Set<string>}>} */
  const featureDirs = new Map()

  for (const file of featureFiles) {
    const isPhysicsCall = importsPhysics(file, ROOT)
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

  /* ─── ③ 动画 → 构建器映射 ────────────────────────────────────────── */

  const pq = readFileSync(join(SRC, 'data', 'physicsQuantities.ts'), 'utf8')
  /** @type {Array<{animId: string, builderName: string, modulePath: string}>} */
  const animToBuilder = []
  const entryRe =
    /'(anim-[a-z0-9-]+)':\s*\{\s*loader:\s*\(\)\s*=>\s*import\('([^']+)'\),\s*builderName:\s*'([^']+)'/g
  let m
  while ((m = entryRe.exec(pq)) !== null) {
    animToBuilder.push({ animId: m[1], modulePath: m[2], builderName: m[3] })
  }

  /* ─── ④ 动画 → 组件 → 是否触及物理层 ─────────────────────────────── */

  const registryFiles = walk(join(SRC, 'data', 'registries'), ['.ts'])
  const componentByAnim = new Map()
  for (const file of registryFiles) {
    const code = readFileSync(file, 'utf8')
    // 形如：'anim-xxx': { ... Component: lazy(() => import('@/features/...')) ...
    const blockRe =
      /'(anim-[a-z0-9-]+)':\s*\{[\s\S]*?Component:\s*lazy\(\(\)\s*=>\s*import\('([^']+)'\)\)/g
    for (const mm of code.matchAll(blockRe)) componentByAnim.set(mm[1], mm[2])
  }

  /*
   * 难点：`dynamics/index.ts` 之类的聚合入口只是 dispatcher（`handleA() ?? handleB() ?? …`），
   * 本身不含物理计算。若按「构建器所在文件是否 import 物理层」判断，会把整批动画
   * 误报为不同源。所以要穿透 dispatcher：**按 animId 反查真正认领它的实现文件**
   * （各 handle 内部用 `animId === 'xxx'` / `animId !== 'xxx'` 认领）。
   *
   * 一个动画可能被多个文件提及（同上限判断等），取「路径最短且非 dispatcher」的那个
   * 作为主实现点 —— dispatcher 不含 animId 字面量，天然不会入选。
   */
  const animImplCandidates = new Map() // animId -> [file]
  for (const file of quantityFiles) {
    if (isDispatcher(file)) continue
    const code = readFileSync(file, 'utf8')
    for (const mm of code.matchAll(/'(anim-[a-z0-9-]+)'/g)) {
      const id = mm[1]
      if (!animImplCandidates.has(id)) animImplCandidates.set(id, [])
      animImplCandidates.get(id).push(rel(file))
    }
  }

  const implByAnim = new Map()
  for (const e of animToBuilder) {
    // 首选：physicsQuantities 里 loader 指向的模块就是该动画的看板构建器所在文件
    const base = join(SRC, 'data', e.modulePath)
    const file = firstExistingFile(base)
    if (file && !/\/index\.ts$/.test(file)) {
      implByAnim.set(e.animId, rel(file))
      continue
    }
    // 兜底：loader 指向聚合入口（dispatcher）时，用 animId 字面量反查真正认领它的子文件
    const candidates = animImplCandidates.get(e.animId)
    if (candidates?.length) {
      implByAnim.set(e.animId, [...new Set(candidates)].sort((a, b) => a.length - b.length)[0])
    }
  }

  const builderByFile = new Map(builders.map((b) => [b.file, b]))

  /** 每个动画的看板实现点是否复用物理层、是否自己算了物理 */
  const boardByAnim = animToBuilder.map((e) => {
    const impl = implByAnim.get(e.animId) ?? null
    const b = impl ? builderByFile.get(impl) : null
    return {
      animId: e.animId,
      builderName: e.builderName,
      implFile: impl,
      usesPhysics: b ? b.usesPhysics : null,
      selfMath: b ? b.selfMath : 0,
    }
  })

  /**
   * 真双源 = 三件事同时成立：
   *   ① 看板实现文件不 import 物理层     → 它在自己维护一套算法
   *   ② 看板实现文件确实在算物理          → 不是纯标签看板
   *   ③ 动画组件侧触及物理层              → 存在第二套实现可对照
   * 只满足 ①② 的是「唯一一套实现，没有第二份可对照」；只满足 ①③ 的是纯标签看板。
   */
  const realRisk = []
  const loneImplementation = []
  const labelOnlyBoard = []

  for (const x of boardByAnim) {
    if (x.usesPhysics !== false) continue
    const compSpec = componentByAnim.get(x.animId)
    const compFile = compSpec
      ? resolveModule(compSpec, join(SRC, 'data', 'registries', 'x.ts'), ROOT)
      : null
    const sceneComputes = compFile ? touchesPhysics(compFile, ROOT) : false
    const entry = { ...x, component: compFile ? rel(compFile) : null }
    if (x.selfMath > 0 && sceneComputes) realRisk.push(entry)
    else if (x.selfMath > 0) loneImplementation.push(x.animId)
    else labelOnlyBoard.push(x.animId)
  }

  const unmatched = boardByAnim.filter((x) => x.implFile === null).map((x) => x.animId)

  /* ─── 输出 ───────────────────────────────────────────────────────── */

  const reuseCount = builders.filter((b) => b.usesPhysics).length
  const riskyNoPhysics = builders.filter(
    (b) => !b.usesPhysics && b.selfMath > 0 && !isDispatcher(join(ROOT, b.file)),
  )
  const totalHardcodedG = builders.reduce((s, b) => s + b.hardcodedG, 0)

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          summary: {
            quantityFiles: builders.length,
            usesPhysics: reuseCount,
            riskyNoPhysics: riskyNoPhysics.length,
            realDualSource: realRisk.length,
            loneImplementation: loneImplementation.length,
            totalHardcodedG,
          },
          realRisk,
          loneImplementation,
          labelOnlyBoard,
          unmatched,
          riskyNoPhysics,
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
    process.exit(realRisk.length > 0 ? 1 : 0)
  }

  if (asCheck) {
    if (realRisk.length === 0) {
      console.log('✅ 物理事实单一真源检查通过：无「动画在算 + 看板又算一遍」的双实现。')
      process.exit(0)
    }
    console.error(`❌ 物理事实单一真源检查失败：${realRisk.length} 个动画存在两套实现\n`)
    for (const r of realRisk) {
      console.error(`  ⚠ ${r.animId}`)
      console.error(`     看板：${r.implFile ?? '?'}（未复用物理层，自算 ${r.selfMath} 处）`)
      console.error(`     动画：${r.component ?? '?'}（已触及物理层）`)
    }
    console.error('\n修法：把看板里的公式换成物理层的同名函数，不要两边各算一遍。')
    process.exit(1)
  }

  const pct = (a, b) => (b === 0 ? '0%' : `${((a / b) * 100).toFixed(0)}%`)

  console.log('══ 物理事实单一真源 · 体检报告 ══\n')
  console.log(`物理量构建器文件：${builders.length}`)
  console.log(`  复用物理层：${reuseCount}（${pct(reuseCount, builders.length)}）`)
  console.log(`  未复用且自算：${riskyNoPhysics.length}`)
  console.log(`  全目录硬编码重力常量：${totalHardcodedG} 处\n`)

  console.log('── 高风险构建器（未复用物理层 + 自己算了物理）──')
  for (const b of riskyNoPhysics.sort((a, b) => b.selfMath - a.selfMath)) {
    const g = b.hardcodedG ? `  g×${b.hardcodedG}` : ''
    console.log(`  ${b.file.replace('src/data/quantities/', '')}  selfMath=${b.selfMath}${g}`)
  }

  console.log('\n── 硬编码重力常量但已复用物理层的（可能是注释/局部常量）──')
  for (const b of builders.filter((x) => x.usesPhysics && x.hardcodedG > 0)) {
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

  console.log('\n══ 真双源：动画侧在算 + 看板自己又算一遍（两套并存）══\n')
  if (realRisk.length === 0) {
    console.log('  ✅ 0 个动画存在两套实现')
  } else {
    const byImpl = new Map()
    for (const r of realRisk) {
      const k = r.implFile ?? '?'
      if (!byImpl.has(k)) byImpl.set(k, [])
      byImpl.get(k).push(r.animId)
    }
    for (const [file, anims] of [...byImpl.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ⚠ ${file.replace('src/data/quantities/', '')}（${anims.length}）`)
      console.log(`     ${anims.join(', ')}`)
    }
  }
  console.log(`\n真双源合计：${realRisk.length} 个动画`)
  console.log(`只有一套实现（无第二份可对照，低优先）：${loneImplementation.length} 个`)
  if (labelOnlyBoard.length) console.log(`纯标签看板（不自算物理）：${labelOnlyBoard.length} 个`)
  if (unmatched.length) console.log(`无法定位实现文件的动画：${unmatched.join(', ')}`)

  process.exit(realRisk.length > 0 ? 1 : 0)
}

/** 只有被 `node scripts/check-single-source.mjs` 直接执行时才跑分析 */
function isDirectInvocation() {
  const entry = process.argv[1]
  if (!entry) return false
  return resolve(entry).toLowerCase() === resolve(fileURLToPath(import.meta.url)).toLowerCase()
}

if (isDirectInvocation()) main()
