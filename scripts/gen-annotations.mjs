/**
 * gen-annotations.mjs
 *
 * 扫描 src/data/registries/*.ts，提取每个动画的完整调用链：
 *   anim-id → title → entry(Animation) → scene → physics → centerExtra
 *
 * 输出：
 *   1. src/ANNOTATIONS.md — 完整映射表
 *   2. 更新 src/data/knowledge/MEMORY.md — 写入映射表供 agent 检索
 *
 * 用法：node scripts/gen-annotations.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { globSync } from 'glob'
import { join, basename, dirname, resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
const REGISTRIES_GLOB = 'src/data/registries/*.ts'
const MEMORY_PATH = join(ROOT, 'src', 'ANNOTATIONS.md')

// ─── 解析工具 ───────────────────────────────────────────────

/** 从 registry 文件中提取所有动画条目 */
function parseRegistry(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const entries = []

  // 匹配 'anim-xxx': { ... }, 块（注意逗号）
  const animBlockRegex = /'([\w-]+)':\s*\{([\s\S]*?)\n\s*\},/g
  let match
  while ((match = animBlockRegex.exec(content)) !== null) {
    const animId = match[1]
    const block = match[2]

    // 提取 title
    const titleMatch = block.match(/title:\s*'([^']+)'/)
    const title = titleMatch ? titleMatch[1] : ''

    // 提取 Component 路径（支持单行和多行 lazy import）
    const compMatch = block.match(/Component:\s*lazy\(\(\)\s*=>\s*(?:import\('@\/(.+?)'\)|\n\s*import\('@\/(.+?)'\)\s*\))/)
    const componentPath = compMatch ? (compMatch[1] || compMatch[2]) : null

    // 提取 CenterExtra 路径（支持单行和多行 lazy import）
    const ceMatch = block.match(/CenterExtra:\s*lazy\(\(\)\s*=>\s*(?:import\('@\/(.+?)'\)|\n\s*import\('@\/(.+?)'\)\s*\))/)
    const centerExtraPath = ceMatch ? (ceMatch[1] || ceMatch[2]) : null

    if (componentPath) {
      entries.push({ animId, title, componentPath, centerExtraPath })
    }
  }

  return entries
}

/** 从 Scene/Animation/CenterExtra 文件中提取 physics import */
function extractPhysics(filePath) {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')
  const patterns = [
    { regex: /import\s+\{[^}]*\}\s+from\s+'@\/physics\/([^']+)'/, group: 1 },
    { regex: /import\s+\w+\s+from\s+'@\/physics\/([^']+)'/, group: 1 },
    { regex: /import\s+\{[^}]*\}\s+from\s+'@\/physics'/, group: 0 },
    { regex: /import\s+\w+\s+from\s+'@\/physics'/, group: 0 },
    { regex: /import\s+\{[^}]*\}\s+from\s+'\.\.\/\.\.\/\.\.\/physics\/([^']+)'/, group: 1 },
  ]
  for (const { regex, group } of patterns) {
    const match = content.match(regex)
    if (match) return group === 0 ? 'physics' : match[group]
  }
  return null
}

/** 从 Scene/Animation 文件中提取 hook import（useXxx），支持任意相对路径和 import type */
function extractHook(filePath) {
  if (!existsSync(filePath)) return null
  const content = readFileSync(filePath, 'utf-8')
  // 匹配所有 import 语句（包括 import type），提取相对路径中以 use 开头的文件名
  const importRegex = /import\s+(?:type\s+)?(?:\w+|\{[^}]+\})\s+from\s+['"]\.\/([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    const fileName = importPath.split('/').pop().replace(/\.tsx?$/, '')
    if (fileName.startsWith('use')) {
      return importPath.replace(/\.tsx?$/, '')
    }
  }
  return null
}

/** 从 Animation 文件中提取 Scene import（支持任意相对路径） */
function extractScene(animationPath) {
  if (!existsSync(animationPath)) return null
  const content = readFileSync(animationPath, 'utf-8')
  // 匹配所有 import 语句，提取相对路径中以 Scene 结尾的文件名
  const importRegex = /import\s+(?:\w+|\{[^}]+\})\s+from\s+['"]\.\/([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    // 提取文件名（不含扩展名）
    const fileName = importPath.split('/').pop().replace(/\.tsx?$/, '')
    // 如果文件名以 Scene 结尾，返回完整相对路径（不含扩展名）
    if (fileName.endsWith('Scene') && !fileName.includes('Scale') && !fileName.includes('use')) {
      return importPath.replace(/\.tsx?$/, '')
    }
  }
  return null
}

// ─── 主流程 ─────────────────────────────────────────────────

function main() {
  const registryFiles = globSync(REGISTRIES_GLOB, { cwd: ROOT })
  const results = []

  for (const regFile of registryFiles) {
    const entries = parseRegistry(join(ROOT, regFile))
    for (const entry of entries) {
      const animPath = join(ROOT, 'src', `${entry.componentPath}.tsx`)

      // 1. 提取 Scene
      const sceneRelativePath = extractScene(animPath)
      // sceneRelativePath 是相对于 Animation 文件的路径，如 './components/SpringForceHookeLawScene'
      // 需要转换为相对于 src 的路径
      let scenePath = null
      let sceneFullPath = null
      if (sceneRelativePath) {
        // 去掉开头的 './'
        const relativePath = sceneRelativePath.replace(/^\.\//, '')
        // entry.componentPath 是 features/mechanics/dynamics/SpringForceAnimation
        // 需要提取目录部分：features/mechanics/dynamics
        const animDir = entry.componentPath.replace(/\/[^/]+$/, '')
        scenePath = `${animDir}/${relativePath}`
        sceneFullPath = join(ROOT, 'src', `${scenePath}.tsx`)
        
        // 如果找不到，尝试 .ts 扩展名
        if (!existsSync(sceneFullPath)) {
          sceneFullPath = join(ROOT, 'src', `${scenePath}.ts`)
        }
        if (!existsSync(sceneFullPath)) {
          scenePath = null
          sceneFullPath = null
        }
      }

      // 2. 提取 physics（优先 Scene → hook → Animation）
      let physicsPath = null

      // Step 1: Scene 直接 import physics
      if (sceneFullPath) {
        physicsPath = extractPhysics(sceneFullPath)
      }

      // Step 2: Scene → hook → physics
      if (!physicsPath && sceneFullPath) {
        const hookName = extractHook(sceneFullPath)
        if (hookName) {
          const hookDir = dirname(sceneFullPath)
          const hookFullPath = join(hookDir, `${hookName}.ts`)
          if (existsSync(hookFullPath)) {
            physicsPath = extractPhysics(hookFullPath)
          }
        }
      }

      // Step 3: Animation 直接 import physics（合并模式兜底）
      if (!physicsPath) {
        physicsPath = extractPhysics(animPath)
      }

      // 3. 提取 CenterExtra → physics
      let centerExtraPhysics = null
      if (entry.centerExtraPath) {
        const ceFullPath = join(ROOT, 'src', `${entry.centerExtraPath}.tsx`)
        if (existsSync(ceFullPath)) {
          centerExtraPhysics = extractPhysics(ceFullPath)
          // 穿透 hook
          if (!centerExtraPhysics) {
            const hookName = extractHook(ceFullPath)
            if (hookName) {
              const hookDir = dirname(ceFullPath)
              const hookFullPath = join(hookDir, `${hookName}.ts`)
              if (existsSync(hookFullPath)) {
                centerExtraPhysics = extractPhysics(hookFullPath)
              }
            }
          }
        }
      }

      results.push({
        animId: entry.animId,
        title: entry.title,
        entry: basename(entry.componentPath),
        scene: scenePath ? basename(scenePath) : null,
        physics: physicsPath || null,
        centerExtra: entry.centerExtraPath ? basename(entry.centerExtraPath) : null,
        centerExtraPhysics: centerExtraPhysics || null,
      })
    }
  }

  // 4. 输出 ANNOTATIONS.md
  const lines = [
    '# 动画映射表',
    '',
    '> 自动生成，请勿手动编辑。运行 `node scripts/gen-annotations.mjs` 重新生成。',
    '',
    '| anim-id | title | entry | scene | physics | centerExtra |',
    '|---------|-------|-------|-------|---------|-------------|',
  ]

  for (const r of results) {
    const sceneCol = r.scene || '—'
    const physicsCol = r.physics || '—'
    const ceCol = r.centerExtra || '—'
    lines.push(`| ${r.animId} | ${r.title} | ${r.entry} | ${sceneCol} | ${physicsCol} | ${ceCol} |`)
  }

  lines.push('')
  lines.push(`共 ${results.length} 个动画条目。`)
  lines.push('')

  writeFileSync(MEMORY_PATH, lines.join('\n'), 'utf-8')
  console.log(`✓ 已生成 ${MEMORY_PATH}`)
  console.log(`  共 ${results.length} 个动画，其中 ${results.filter(r => r.scene).length} 有 Scene，${results.filter(r => r.physics).length} 有 physics`)
}

main()
