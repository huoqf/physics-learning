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

// ── 2. 检查 COMPONENT_REGISTRY.md 索引登记 ─────────────────
function checkRegistryIndexing() {
  const registryPath = join(ROOT, 'docs', 'agent-rules', 'ui', 'COMPONENT_REGISTRY.md')
  if (!existsSync(registryPath)) return []

  const registryContent = readFileSync(registryPath, 'utf8')
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

      if (!registryContent.includes(`\`${compName}\``)) {
        errors.push(`[unindexed-component] 组件 \`${compName}\` (src/components/Physics/${entry}) 未在 COMPONENT_REGISTRY.md 登记`)
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
