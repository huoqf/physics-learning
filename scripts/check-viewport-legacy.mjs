import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const targetDir = join(root, 'src', 'features')
const forbiddenCalls = [
  {
    name: "createSceneScaleFromViewport(..., 'visibleArea')",
    regex: /createSceneScaleFromViewport\s*\([\s\S]*?['"]visibleArea['"]/g,
  },
  {
    name: "createSceneScaleFromViewport(..., 'centerScale')",
    regex: /createSceneScaleFromViewport\s*\([\s\S]*?['"]centerScale['"]/g,
  },
]

function walk(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) files.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full)
  }
  return files
}

const violations = []
for (const file of walk(targetDir)) {
  const text = readFileSync(file, 'utf8')
  for (const rule of forbiddenCalls) {
    rule.regex.lastIndex = 0
    if (rule.regex.test(text)) {
      violations.push({ file: relative(root, file), rule: rule.name })
    }
  }
}

if (violations.length > 0) {
  console.error('[viewport-legacy] Deprecated viewport SceneScale modes found:')
  for (const v of violations) {
    console.error(`  - ${v.file}: ${v.rule}`)
  }
  console.error('\nUse useSceneScale({ anchor: ... }) instead. See docs/agent-rules/process/VIEWPORT_ARCHITECTURE.md')
  process.exit(1)
}

console.log('[viewport-legacy] OK: no deprecated visibleArea/centerScale calls in src/features')
