#!/usr/bin/env node
/**
 * check-component-reuse.mjs
 *
 * 架构检查第 6 条门禁：组件复用与导出一致性检查
 * 1. 检查 src/components/Physics 和 src/components/Chart 下的公共组件是否均在 barrel index.ts 中导出；
 * 2. 检查核心物理组件是否在 COMPONENT_REGISTRY.md 中有索引登记；
 * 3. 检查 src/features/ 下是否私自创建了与公共物理组件重名的私有组件（防止重复造轮子）。
 *
 * 用法：node scripts/check-component-reuse.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = process.cwd()

// 忽略的文件名
const IGNORE_FILES = new Set(['index.ts', 'index.tsx', 'types.ts', 'types.tsx', 'vite-env.d.ts'])

function isComponentFile(file) {
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx') || file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) {
    return false
  }
  const name = basename(file).replace(/\.tsx?$/, '')
  // 仅针对 PascalCase 首字母大写的公共组件文件
  if (!/^[A-Z]/.test(name)) return false
  return file.endsWith('.tsx') || file.endsWith('.ts')
}

// ── 1. 检查公共目录导出完整性 ─────────────────────────────
function checkBarrelExports(dirRelPath) {
  const dirFullPath = join(ROOT, dirRelPath)
  if (!existsSync(dirFullPath)) return []

  const indexFile = join(dirFullPath, 'index.ts')
  if (!existsSync(indexFile)) {
    return [`[barrel-missing] ${dirRelPath}/index.ts 未找到`]
  }

  const indexContent = readFileSync(indexFile, 'utf8')
  const errors = []

  const entries = readdirSync(dirFullPath)
  for (const entry of entries) {
    if (IGNORE_FILES.has(entry)) continue
    const full = join(dirFullPath, entry)
    if (statSync(full).isDirectory()) continue
    if (!isComponentFile(entry)) continue

    const compName = entry.replace(/\.tsx?$/, '')
    // 检查 index.ts 中是否有关于该模块或组件的导出
    const exportPattern = new RegExp(`from\\s+['"]\\.\\/${compName}['"]`)
    if (!exportPattern.test(indexContent)) {
      errors.push(`[unexported-component] ${dirRelPath}/${entry} 未在 ${dirRelPath}/index.ts 中导出`)
    }
  }

  return errors
}

// ── 2. 检查 COMPONENT_REGISTRY.md 索引登记与 Props 签名 ──────
const INTERFACE_ALIASES = {
  ParametricMagneticField: ['MagneticFieldProps', 'ParametricMagneticFieldProps'],
  // 文件名为 SkeletalHand.tsx，但组件与 interface 用的是 SkeletonHand 命名，两套写法都要认
  SkeletalHand: ['SkeletonHandProps', 'SkeletalHandProps'],
  SkeletonHand: ['SkeletonHandProps', 'SkeletalHandProps'],
}

function extractInterfaceBody(src, possibleNames) {
  for (const name of possibleNames) {
    const re = new RegExp(`(?:interface|type)\\s+${name}\\s*(?:extends[^{]*)?\\{`, 's')
    const match = src.match(re)
    if (!match) continue

    const startIdx = match.index + match[0].length
    let depth = 1
    let endIdx = startIdx
    while (depth > 0 && endIdx < src.length) {
      if (src[endIdx] === '{') depth++
      else if (src[endIdx] === '}') depth--
      endIdx++
    }
    return src.slice(startIdx, endIdx - 1)
  }
  return null
}

function parseTopLevelProps(body) {
  let cleaned = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  let prev
  do {
    prev = cleaned
    cleaned = cleaned.replace(/\{[^{}]*\}/g, '__BLOCK__')
  } while (cleaned !== prev)

  do {
    prev = cleaned
    cleaned = cleaned.replace(/\([^()]*\)/g, '__PAREN__')
  } while (cleaned !== prev)

  const props = []
  const lines = cleaned.split(/[\n;]/)
  for (const l of lines) {
    const trimmed = l.trim()
    if (!trimmed) continue
    const pm = trimmed.match(/^([a-zA-Z0-9_]+)(\??)\s*:/)
    if (pm) {
      props.push({
        name: pm[1],
        required: pm[2] !== '?',
      })
    }
  }
  return props
}

function checkRegistryIndexing() {
  const registryPath = join(ROOT, 'docs', 'agent-rules', 'ui', 'COMPONENT_REGISTRY.md')
  if (!existsSync(registryPath)) return []

  const registryContent = readFileSync(registryPath, 'utf8')
  const regLines = registryContent.split('\n')
  const regMap = new Map()
  for (const line of regLines) {
    if (!line.trim().startsWith('|')) continue
    const cols = line.split('|').map((s) => s.trim())
    if (cols.length >= 4) {
      const compCell = cols[1]
      const matches = [...compCell.matchAll(/`([A-Za-z0-9_]+)`/g)]
      for (const m of matches) {
        regMap.set(m[1], cols[3])
      }
    }
  }

  const physicsDir = join(ROOT, 'src', 'components', 'Physics')
  const errors = []

  if (existsSync(physicsDir)) {
    const entries = readdirSync(physicsDir)
    for (const entry of entries) {
      if (IGNORE_FILES.has(entry) || !entry.endsWith('.tsx')) continue
      if (entry.includes('.test.') || entry.includes('.spec.')) continue

      const compName = basename(entry, '.tsx')
      if (!/^[A-Z]/.test(compName)) continue
      // 工具类或纯内部组件跳过
      if (compName.startsWith('draw') || compName === 'SVGSingleBar') continue

      if (!regMap.has(compName)) {
        errors.push(`[unindexed-component] 组件 \`${compName}\` (src/components/Physics/${entry}) 未在 COMPONENT_REGISTRY.md 登记`)
        continue
      }

      // 签名级双向校验：校验必填 Props 是否在表格中如实登记，且无幽灵属性
      const propsCol = regMap.get(compName)
      if (propsCol && !propsCol.includes('—')) {
        const registeredTokens = new Set([...propsCol.matchAll(/`([a-zA-Z0-9_]+)`/g)].map((m) => m[1]))
        const src = readFileSync(join(physicsDir, entry), 'utf8')
        // 匹配优先级：组件名对应接口 → 显式别名 → 文件内裸 Props（避免误取内联子组件的 Props）
        const possibleNames = [compName + 'Props', ...(INTERFACE_ALIASES[compName] || []), 'Props']
        const body = extractInterfaceBody(src, possibleNames)

        if (body) {
          const topProps = parseTopLevelProps(body)
          const requiredProps = topProps.filter((p) => p.required).map((p) => p.name)
          const allPropNames = new Set(topProps.map((p) => p.name))

          for (const rp of requiredProps) {
            if (!registeredTokens.has(rp)) {
              errors.push(`[missing-required-prop] 组件 \`${compName}\` 的必填属性 \`${rp}\` 未在 COMPONENT_REGISTRY.md 登记`)
            }
          }
          for (const token of registeredTokens) {
            if (!allPropNames.has(token)) {
              if (compName === 'VectorArrow' && token === 'origin') continue // 兼容历史别名
              errors.push(`[ghost-prop] 组件 \`${compName}\` 在 COMPONENT_REGISTRY.md 登记了源码不存在的属性 \`${token}\``)
            }
          }
        }
      }
    }
  }

  return errors
}

// ── 3. 检查 features 目录下的重名阴影组件 (Shadowing) ───────
function checkFeatureShadowing() {
  const CORE_PHYSICS_COMPONENTS = new Set([
    'Ball',
    'Block',
    'VectorArrow',
    'PhysicsVectorArrow',
    'PhysicsGround',
    'Incline',
    'Spring',
    'Pulley',
    'Solenoid',
    'CoilBase',
    'EnergyBars',
    'ParticleTrajectory',
  ])

  const featuresDir = join(ROOT, 'src', 'features')
  if (!existsSync(featuresDir)) return []

  const errors = []

  function walk(dir) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '__tests__') continue
        walk(full)
      } else if (entry.endsWith('.tsx')) {
        const compName = basename(entry, '.tsx')
        if (CORE_PHYSICS_COMPONENTS.has(compName)) {
          const relPath = relative(ROOT, full).replaceAll('\\', '/')
          errors.push(`[shadowed-component] 私有组件 ${relPath} 与公共物理组件 \`${compName}\` 重名，严禁私造同名轮子`)
        }
      }
    }
  }

  walk(featuresDir)
  return errors
}

// ── 执行所有检查 ───────────────────────────────────────────
const allErrors = [
  ...checkBarrelExports('src/components/Physics'),
  ...checkBarrelExports('src/components/Chart'),
  ...checkRegistryIndexing(),
  ...checkFeatureShadowing(),
]

if (allErrors.length > 0) {
  console.error('\n❌ component-reuse architecture check failed:')
  for (const err of allErrors) {
    console.error(`  - ${err}`)
  }
  console.error('\n请确保公共组件已在 index.ts 导出、已在 COMPONENT_REGISTRY.md 登记，且未在 feature 中私造同名组件。\n')
  process.exit(1)
} else {
  console.log('✅ component-reuse check passed: all public components exported and registered, no duplicate private components.')
}
