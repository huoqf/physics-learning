#!/usr/bin/env node
/**
 * check-component-reuse.mjs
 *
 * 架构检查门禁：组件复用、导出完整性与模块隔离检查
 * 1. 检查 src/components/{Physics,Chart,Formula} 下的公共组件是否均在 barrel index.ts 中导出；
 * 2. 检查 src/components/Physics/ 下的组件是否已在 COMPONENT_REGISTRY.md 中登记；
 * 3. 检查 src/features/ 下是否私自创建了与核心物理组件重名的私有组件（防止重复造轮子）；
 * 4. 检查 src/components/UI/index.ts 是否泄露引入 Formula/KaTeX 模块（防止 CSS 副作用渗入首屏）。
 *
 * 用法：node scripts/check-component-reuse.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = process.cwd()

const IGNORE_FILES = new Set(['index.ts', 'index.tsx', 'types.ts', 'types.tsx', 'vite-env.d.ts'])

function isComponentFile(file) {
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx') || file.endsWith('.spec.ts') || file.endsWith('.spec.tsx')) {
    return false
  }
  const name = basename(file).replace(/\.tsx?$/, '')
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

  for (const entry of readdirSync(dirFullPath)) {
    if (IGNORE_FILES.has(entry)) continue
    const full = join(dirFullPath, entry)
    if (statSync(full).isDirectory()) continue
    if (!isComponentFile(entry)) continue

    const compName = entry.replace(/\.tsx?$/, '')
    const exportPattern = new RegExp(`from\\s+['"]\\.\\/${compName}['"]`)
    if (!exportPattern.test(indexContent)) {
      errors.push(`[unexported-component] ${dirRelPath}/${entry} 未在 ${dirRelPath}/index.ts 中导出`)
    }
  }

  return errors
}

// ── 2. 检查 COMPONENT_REGISTRY.md 索引存在性 ────────────────
function checkRegistryIndexing() {
  const registryPath = join(ROOT, 'docs', 'agent-rules', 'ui', 'COMPONENT_REGISTRY.md')
  if (!existsSync(registryPath)) return []

  const registryContent = readFileSync(registryPath, 'utf8')
  const registered = new Set()
  for (const line of registryContent.split('\n')) {
    if (!line.trim().startsWith('|')) continue
    const cols = line.split('|').map((s) => s.trim())
    if (cols.length >= 4) {
      for (const m of cols[1].matchAll(/`([A-Za-z0-9_]+)`/g)) {
        registered.add(m[1])
      }
    }
  }

  const physicsDir = join(ROOT, 'src', 'components', 'Physics')
  const errors = []

  if (existsSync(physicsDir)) {
    for (const entry of readdirSync(physicsDir)) {
      if (IGNORE_FILES.has(entry) || !entry.endsWith('.tsx')) continue
      if (entry.includes('.test.') || entry.includes('.spec.')) continue

      const compName = basename(entry, '.tsx')
      if (!/^[A-Z]/.test(compName)) continue
      if (compName.startsWith('draw') || compName === 'SVGSingleBar') continue

      if (!registered.has(compName)) {
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
    for (const entry of readdirSync(dir)) {
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

// ── 4. 检查 UI barrel 隔离性（防止 KaTeX CSS 模块级副作用渗入首屏） ────────
function checkUIBarrelIsolation() {
  const uiIndex = join(ROOT, 'src/components/UI/index.ts')
  if (!existsSync(uiIndex)) return []
  const content = readFileSync(uiIndex, 'utf8')
  const errors = []
  if (/export\s+.*?(KatexFormula|PhysicsPanel)/.test(content) || /from\s+['"].*?(Formula|katex)['"]/.test(content)) {
    errors.push('[barrel-leak] src/components/UI/index.ts 禁止导出 KatexFormula/PhysicsPanel 或引入 Formula 模块（防 KaTeX 渗入首屏）')
  }
  return errors
}

// ── 执行所有检查 ───────────────────────────────────────────
const allErrors = [
  ...checkBarrelExports('src/components/Physics'),
  ...checkBarrelExports('src/components/Chart'),
  ...checkBarrelExports('src/components/Formula'),
  ...checkRegistryIndexing(),
  ...checkFeatureShadowing(),
  ...checkUIBarrelIsolation(),
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
