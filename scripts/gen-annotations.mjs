/**
 * gen-annotations.mjs
 *
 * 扫描 src/data/registries/*.ts，提取每个动画的完整调用链：
 *   anim-id → title → entry(Animation) → scene → physics → centerExtra
 *
 * 输出：
 *   1. src/ANNOTATIONS.md — 完整映射表
 *   2. MEMORY.md — 用同一张表原位替换「## 动画映射表」小节（agent 检索用的权威副本）
 *
 * 用法：node scripts/gen-annotations.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, basename, dirname, extname, resolve, relative } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
/** 注册表目录（相对项目根）：本脚本只扫一层，不需要 glob 通配 */
const REGISTRIES_DIR = 'src/data/registries'
const FEATURES_DIR = resolve(ROOT, 'src', 'features')
const MEMORY_PATH = join(ROOT, 'src', 'ANNOTATIONS.md')
/** agent 检索用的权威副本，其「## 动画映射表」小节由本脚本原位替换 */
const MEMORY_DOC_PATH = join(ROOT, 'MEMORY.md')

const EM_OSCILLATION_BRANCHES = {
  'anim-lc-oscillation': ['./components/LCOscillationScene', './hooks/useLCPhysics'],
  'anim-em-wave': ['./components/EMWaveScene', './hooks/useEMWavePhysics'],
  'anim-em-spectrum': [
    './components/EMSpectrumScene',
    './components/RadioTuningScene',
    './components/RadioModulationScene',
    './hooks/useEMSpectrumLayout',
  ],
}

// ─── 解析工具 ───────────────────────────────────────────────

/** 去除 JS/TS 注释，保留字符串字面量与换行结构 */
function stripComments(content) {
  let out = ''
  let i = 0
  while (i < content.length) {
    const ch = content[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      out += ch
      i++
      while (i < content.length) {
        const c = content[i]
        out += c
        if (c === '\\') {
          if (i + 1 < content.length) {
            out += content[i + 1]
            i += 2
            continue
          }
        }
        if (c === quote) {
          i++
          break
        }
        i++
      }
      continue
    }
    if (ch === '/' && content[i + 1] === '/') {
      i += 2
      while (i < content.length && content[i] !== '\n') i++
      continue
    }
    if (ch === '/' && content[i + 1] === '*') {
      i += 2
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) {
        if (content[i] === '\n') out += '\n'
        i++
      }
      i += 2
      continue
    }
    out += ch
    i++
  }
  return out
}

function isFile(filePath) {
  return existsSync(filePath) && statSync(filePath).isFile()
}

/** 按原路径 → .tsx → .ts → /index.tsx → /index.ts 顺序解析真实模块文件 */
function resolveModuleFile(basePath) {
  if (isFile(basePath)) return basePath
  const candidates = [
    `${basePath}.tsx`,
    `${basePath}.ts`,
    join(basePath, 'index.tsx'),
    join(basePath, 'index.ts'),
  ]
  for (const candidate of candidates) {
    if (isFile(candidate)) return candidate
  }
  return null
}

/** 判断解析出的文件是否位于 src/features/ 目录内 */
function isInsideFeatures(filePath) {
  const rel = relative(FEATURES_DIR, filePath)
  return rel !== '' && !rel.startsWith('..') && !rel.includes(':')
}

/** 判断文件名是否为场景组件（*Scene，排除 *Scale / use*） */
function isSceneName(name) {
  return name.endsWith('Scene') && !name.includes('Scale') && !name.startsWith('use')
}

/**
 * 解析组件入口文件：若命中目录桶 index.ts/index.tsx，则沿默认导出穿透到真实组件文件。
 */
function resolveEntryFile(componentPath) {
  let current = resolveModuleFile(join(ROOT, 'src', componentPath))
  if (!current) return null

  const seen = new Set()
  for (let hop = 0; hop < 3; hop++) {
    const fileName = basename(current)
    if (fileName !== 'index.ts' && fileName !== 'index.tsx') break
    if (seen.has(current)) break
    seen.add(current)

    const clean = stripComments(readFileSync(current, 'utf-8'))
    let targetSpec = null

    // 1. export { default } from './Xxx' 或 export { Foo as default } from './Xxx'
    const reexportMatch = clean.match(
      /export\s+\{\s*(?:default|\w+\s+as\s+default)\s*\}\s+from\s+['"]([^'"]+)['"]/,
    )
    if (reexportMatch) {
      targetSpec = reexportMatch[1]
    }

    // 2. import Xxx from './Xxx' ... export default Xxx
    if (!targetSpec) {
      const defExportMatch = clean.match(/export\s+default\s+(\w+)/)
      if (defExportMatch) {
        const sym = defExportMatch[1]
        const impMatch = clean.match(
          new RegExp(`import\\s+${sym}\\s+from\\s+['"]([^'"]+)['"]`),
        )
        if (impMatch) targetSpec = impMatch[1]
      }
    }

    // 3. fallback: export { default as Xxx } from './Xxx'
    if (!targetSpec) {
      const namedDefMatch = clean.match(
        /export\s+\{\s*default\s+as\s+\w+\s*\}\s+from\s+['"]([^'"]+)['"]/,
      )
      if (namedDefMatch) targetSpec = namedDefMatch[1]
    }

    if (!targetSpec || !targetSpec.startsWith('.')) break
    const nextFile = resolveModuleFile(resolve(dirname(current), targetSpec))
    if (!nextFile) break
    current = nextFile
  }

  return current
}

/** 从去注释源码中提取所有静态 import/export 与动态 import() 的模块路径 */
function extractModuleSpecifiers(cleanContent) {
  const specs = []
  const stmtRegex =
    /(?:import|export)\s+(?:type\s+)?(?:\*\s+as\s+\w+|\{[^}]*\}|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)\s+from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = stmtRegex.exec(cleanContent)) !== null) {
    specs.push(m[1])
  }

  const sideEffectRegex = /(?:^|[;\n])\s*import\s+['"]([^'"]+)['"]/g
  while ((m = sideEffectRegex.exec(cleanContent)) !== null) {
    specs.push(m[1])
  }

  const dynamicRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = dynamicRegex.exec(cleanContent)) !== null) {
    specs.push(m[1])
  }

  return specs
}

/** 若 specifier 指向物理层，返回规范化模块名；否则返回 null */
function normalizePhysicsSpecifier(spec) {
  if (spec === '@/physics') return 'physics'
  if (spec.startsWith('@/physics/')) {
    const sub = spec
      .slice('@/physics/'.length)
      .replace(/\/index\.(?:tsx?|js)$/, '')
      .replace(/\.(?:tsx?|js)$/, '')
    return sub || 'physics'
  }
  const relMatch = spec.match(/^(?:\.\.\/)+physics(?:\/(.*))?$/)
  if (relMatch) {
    const sub = (relMatch[1] || '')
      .replace(/\/index\.(?:tsx?|js)$/, '')
      .replace(/\.(?:tsx?|js)$/, '')
    return sub || 'physics'
  }
  return null
}

/**
 * 从一组起始文件递归收集 Scene 组件与 physics 模块。
 * 仅沿着 src/features/ 内部的相对路径或 @/features/ 路径穿透，避免进入公共组件/hooks。
 */
function collectFromFiles(startFiles, { maxDepth = 4 } = {}) {
  const visited = new Set()
  const scenes = []
  const physics = []
  const sceneSet = new Set()
  const physicsSet = new Set()

  function addScene(name) {
    if (!sceneSet.has(name)) {
      sceneSet.add(name)
      scenes.push(name)
    }
  }

  function addPhysics(name) {
    if (!physicsSet.has(name)) {
      physicsSet.add(name)
      physics.push(name)
    }
  }

  function walk(filePath, depth) {
    if (!filePath || depth > maxDepth || visited.has(filePath) || !isFile(filePath)) return
    visited.add(filePath)

    const baseName = basename(filePath, extname(filePath))
    if (isSceneName(baseName)) {
      addScene(baseName)
    }

    const clean = stripComments(readFileSync(filePath, 'utf-8'))
    const specs = extractModuleSpecifiers(clean)

    for (const spec of specs) {
      const phy = normalizePhysicsSpecifier(spec)
      if (phy) {
        addPhysics(phy)
        continue
      }

      let targetBase = null
      if (spec.startsWith('./') || spec.startsWith('../')) {
        targetBase = resolve(dirname(filePath), spec)
      } else if (spec.startsWith('@/features/')) {
        targetBase = join(ROOT, 'src', spec.slice(2))
      }

      if (!targetBase) continue
      const resolved = resolveModuleFile(targetBase)
      if (!resolved || !isInsideFeatures(resolved)) continue

      const childName = basename(resolved, extname(resolved))
      if (isSceneName(childName)) {
        addScene(childName)
      }

      walk(resolved, depth + 1)
    }
  }

  for (const file of startFiles) {
    walk(file, 0)
  }

  return { scenes, physics }
}

/** 优先级选择 physics 显示文本：真实子模块 > physics 桶 > constants > — */
function formatPhysics(physicsList) {
  if (!physicsList || physicsList.length === 0) return '—'
  const specific = physicsList.filter((p) => p !== 'constants' && p !== 'physics')
  if (specific.length > 0) return specific.join(', ')
  if (physicsList.includes('physics')) return 'physics'
  if (physicsList.includes('constants')) return 'constants'
  return '—'
}

/** 从 registry 文件中提取所有动画条目 */
function parseRegistry(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const entries = []

  // 匹配所有 'anim-xxx': { 开头
  const keyRegex = /'([\w-]+)':\s*\{/g
  let match
  while ((match = keyRegex.exec(content)) !== null) {
    const animId = match[1]
    const startIndex = match.index + match[0].length
    let depth = 1
    let i = startIndex
    while (i < content.length && depth > 0) {
      const char = content[i]
      if (char === '{') {
        depth++
      } else if (char === '}') {
        depth--
      } else if (char === "'" || char === '"' || char === '`') {
        const quote = char
        i++
        while (i < content.length) {
          if (content[i] === '\\') {
            i += 2
            continue
          }
          if (content[i] === quote) break
          i++
        }
      } else if (char === '/' && content[i + 1] === '/') {
        i += 2
        while (i < content.length && content[i] !== '\n') i++
      } else if (char === '/' && content[i + 1] === '*') {
        i += 2
        while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) i++
        i++
      }
      i++
    }

    const block = content.slice(startIndex, i - 1)

    // 提取 title
    const titleMatch = block.match(/title:\s*['"]([^'"]+)['"]/)
    const title = titleMatch ? titleMatch[1] : ''

    // 提取 Component 路径（支持单行和多行 lazy import）
    const compMatch = block.match(
      /Component:\s*lazy\(\(\)\s*=>\s*(?:import\(['"]@\/(.+?)['"]\)|[\r\n\s]*import\(['"]@\/(.+?)['"]\)\s*\))/,
    )
    const componentPath = compMatch ? compMatch[1] || compMatch[2] : null

    // 提取 CenterExtra 路径（支持单行和多行 lazy import）
    const ceMatch = block.match(
      /CenterExtra:\s*lazy\(\(\)\s*=>\s*(?:import\(['"]@\/(.+?)['"]\)|[\r\n\s]*import\(['"]@\/(.+?)['"]\)\s*\))/,
    )
    const centerExtraPath = ceMatch ? ceMatch[1] || ceMatch[2] : null

    if (componentPath) {
      entries.push({ animId, title, componentPath, centerExtraPath })
    }
  }

  return entries
}

// ─── 主流程 ─────────────────────────────────────────────────

/** 列出注册表文件（相对项目根，按名排序以保证输出稳定）*/
function listRegistryFiles() {
  return readdirSync(join(ROOT, REGISTRIES_DIR))
    .filter((f) => f.endsWith('.ts'))
    .sort()
    .map((f) => join(REGISTRIES_DIR, f))
}

function main() {
  const registryFiles = listRegistryFiles()
  const results = []

  for (const regFile of registryFiles) {
    const entries = parseRegistry(join(ROOT, regFile))
    for (const entry of entries) {
      const entryFile = resolveEntryFile(entry.componentPath)
      const entryName = entryFile
        ? basename(entryFile, extname(entryFile))
        : basename(entry.componentPath)

      let startFiles = entryFile ? [entryFile] : []
      if (entry.componentPath.includes('EMOscillationAnimation') && entryFile) {
        const branchRelPaths = EM_OSCILLATION_BRANCHES[entry.animId]
        if (branchRelPaths) {
          startFiles = branchRelPaths
            .map((rel) => resolveModuleFile(resolve(dirname(entryFile), rel)))
            .filter(Boolean)
        }
      }

      const { scenes, physics } = collectFromFiles(startFiles)
      const physicsText = formatPhysics(physics)

      results.push({
        animId: entry.animId,
        title: entry.title,
        entry: entryName,
        scenes,
        physics: physicsText === '—' ? null : physicsText,
        centerExtra: entry.centerExtraPath ? basename(entry.centerExtraPath) : null,
      })
    }
  }

  // 表格行只生成一次，ANNOTATIONS.md 与 MEMORY.md 共用，杜绝两处各自漂移
  const rowLines = results.map((r) => {
    const sceneCol = r.scenes.length > 0 ? r.scenes.join(', ') : '—'
    const physicsCol = r.physics || '—'
    const ceCol = r.centerExtra || '—'
    return `| ${r.animId} | ${r.title} | ${r.entry} | ${sceneCol} | ${physicsCol} | ${ceCol} |`
  })

  const tableHeader = [
    '| anim-id | title | entry | scene | physics | centerExtra |',
    '|---------|-------|-------|-------|---------|-------------|',
  ]

  // 输出 ANNOTATIONS.md
  const lines = [
    '# 动画映射表',
    '',
    '> 自动生成，请勿手动编辑。运行 `node scripts/gen-annotations.mjs` 重新生成。',
    '',
    ...tableHeader,
    ...rowLines,
    '',
    `共 ${results.length} 个动画条目。`,
    '',
  ]

  writeFileSync(MEMORY_PATH, lines.join('\n'), 'utf-8')
  console.log(`✓ 已生成 ${MEMORY_PATH}`)

  // 同步 MEMORY.md 的「## 动画映射表」小节
  syncMemoryDoc([...tableHeader, ...rowLines], results.length)

  const withScene = results.filter((r) => r.scenes.length > 0).length
  const withPhysics = results.filter((r) => r.physics).length
  console.log(`  共 ${results.length} 个动画，其中 ${withScene} 有 Scene，${withPhysics} 有 physics`)
}

/**
 * 用最新表格原位替换 MEMORY.md 的「## 动画映射表」小节。
 * 只动该小节（从标题行到紧随其后的 `---` 分隔符之前），文件其余内容原样保留。
 * 找不到该小节或其后没有 `---` 时只告警、不写入，避免破坏文件。
 */
function syncMemoryDoc(tableLines, count) {
  if (!existsSync(MEMORY_DOC_PATH)) {
    console.warn(`⚠ 未找到 ${MEMORY_DOC_PATH}，跳过同步`)
    return
  }
  const lines = readFileSync(MEMORY_DOC_PATH, 'utf-8').split(/\r?\n/)
  const startIdx = lines.findIndex((l) => /^##\s*动画映射表\s*$/.test(l))
  if (startIdx === -1) {
    console.warn('⚠ MEMORY.md 中未找到「## 动画映射表」小节，跳过同步（请检查文件结构）')
    return
  }
  const endIdx = lines.findIndex((l, i) => i > startIdx && /^---\s*$/.test(l))
  if (endIdx === -1) {
    console.warn('⚠ MEMORY.md 中「## 动画映射表」小节之后未找到 `---` 分隔符，跳过同步')
    return
  }

  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  const section = [
    '## 动画映射表',
    '',
    `> **生成时间**：${stamp}`,
    '> **生成命令**：`node scripts/gen-annotations.mjs`',
    '> **数据来源**：`src/data/registries/*.ts`（与 `src/ANNOTATIONS.md` 同步生成，请勿手动编辑）',
    '> **更新方式**：修改 `src/data/registries/*.ts` 后运行 `node scripts/gen-annotations.mjs` 重新生成',
    '',
    ...tableLines,
    '',
    `共 ${count} 个动画条目。`,
    '',
  ]

  const out = [
    ...lines.slice(0, startIdx),
    ...section,
    ...lines.slice(endIdx),
  ].map((l) =>
    /^\*最后更新：/.test(l) ? `*最后更新：${stamp} | 生成命令：\`node scripts/gen-annotations.mjs\`*` : l,
  )

  writeFileSync(MEMORY_DOC_PATH, out.join('\n'), 'utf-8')
  console.log(`✓ 已同步 ${MEMORY_DOC_PATH} 的「动画映射表」小节（${count} 条）`)
}

main()
