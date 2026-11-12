#!/usr/bin/env node
/**
 * check-exam-isolation.mjs
 *
 * 动画学习与高考刷题严格隔离守卫：
 *   1. `src/features/`（排除 analysis / practice / master-models / wrongbook / knowledge 及测试目录）
 *      的可见代码与文案中，严禁嵌入高考真题、考点结论卡片、随堂测验、命题卷别或应试口号；
 *   2. `src/data/knowledge/` 节点 `title` 不得携带「高考 / 真题 / 压轴 / 母题 / 考点」前缀/后缀；
 *   3. `src/data/quantities/` 看板数据不得混入具体真题年份省份/卷别引用或「母题/真题」原题内容；
 *   4. `src/data/knowledge/` 声明的所有 `animationIds` 必须全部在 `src/data/registries/` 中有定义。
 *
 * 用法：node scripts/check-exam-isolation.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const FEATURES_DIR = join(ROOT, 'src', 'features')
const KNOWLEDGE_DIR = join(ROOT, 'src', 'data', 'knowledge')
const QUANTITIES_DIR = join(ROOT, 'src', 'data', 'quantities')
const REGISTRY_DIR = join(ROOT, 'src', 'data', 'registries')

const COMMENT_LINE_RE = /^\s*(\/\/|\/?\*|\*|\{\/\*)/
const EXAM_FEATURE_ALLOW_DIRS = new Set([
  'analysis',
  'practice',
  'master-models',
  'wrongbook',
  'knowledge',
])

const FEATURE_FORBIDDEN_RE =
  /高考|真题|压轴|母题|题眼|秒杀|解题专项|随堂小测|回答正确|答对了|通关模式|真题模式|考点结论|高考实验|(?:\d{2,4}\s*)?(?:全国|新课标|新高考)[一二三甲乙丙丁ⅠⅡⅢ]?\s*卷|山东卷|浙江卷|北京卷|江苏卷|广东卷|湖北卷/

const KNOWLEDGE_TITLE_FORBIDDEN_RE = /高考|真题|压轴|母题|考点/

const QUANTITY_EXAM_LEAK_RE =
  /真题|母题|高考图像斜率法|高考实验专题对应页面|\d{4}\s*(?:年)?\s*(?:全国|新课标|山东|浙江|北京|江苏|广东|湖北|湖南|河北|安徽|福建|四川|辽宁|重庆|天津|上海|海南|甲卷|乙卷)|(?:全国|新课标)[一二三甲乙]?卷/

function walkTs(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === '__tests__') continue
      files.push(...walkTs(full))
    } else if ((entry.endsWith('.ts') || entry.endsWith('.tsx')) && !/\.test\.tsx?$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

const violations = []
let checkedFeatures = 0
let checkedQuantities = 0
let checkedKnowledgeNodes = 0
let checkedAnimRefs = 0

// 1. 动画场景与功能模块（非刷题/析题页）隔离检查
for (const entry of readdirSync(FEATURES_DIR)) {
  if (EXAM_FEATURE_ALLOW_DIRS.has(entry)) continue
  const sub = join(FEATURES_DIR, entry)
  if (!statSync(sub).isDirectory()) continue
  for (const file of walkTs(sub)) {
    checkedFeatures += 1
    const rel = relative(ROOT, file).replaceAll('\\', '/')
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (COMMENT_LINE_RE.test(line)) continue
      const m = line.match(FEATURE_FORBIDDEN_RE)
      if (m) {
        violations.push({
          file: rel,
          line: i + 1,
          reason: `动画模块非注释代码出现应试/刷题词「${m[0]}」（应属 /practice 或 /master-models）：${line.trim().slice(0, 80)}`,
        })
      }
    }
  }
}

// 2. 物理看板数据 (quantities) 禁止混入具体真题来源与原题文案
for (const file of walkTs(QUANTITIES_DIR)) {
  checkedQuantities += 1
  const rel = relative(ROOT, file).replaceAll('\\', '/')
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (COMMENT_LINE_RE.test(line)) continue
    const m = line.match(QUANTITY_EXAM_LEAK_RE)
    if (m) {
      violations.push({
        file: rel,
        line: i + 1,
        reason: `右屏看板数据出现真题引用/具体卷别「${m[0]}」（真题与卷别归 /practice）：${line.trim().slice(0, 80)}`,
      })
    }
  }
}

// 3. 收集全部已注册 animId
const registeredAnimIds = new Set()
for (const file of walkTs(REGISTRY_DIR)) {
  const text = readFileSync(file, 'utf8')
  const re = /^\s*['"]?(anim-[a-z0-9-]+)['"]?\s*:\s*\{/gm
  let m
  while ((m = re.exec(text)) !== null) {
    registeredAnimIds.add(m[1])
  }
}

// 4. 知识树节点标题纯净度 + animationIds 引用完整性
for (const file of walkTs(KNOWLEDGE_DIR)) {
  const rel = relative(ROOT, file).replaceAll('\\', '/')
  const text = readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (COMMENT_LINE_RE.test(line)) continue
    const tm = line.match(/^\s*title\s*:\s*(['"])(.*?)\1/)
    if (tm) {
      checkedKnowledgeNodes += 1
      const bad = tm[2].match(KNOWLEDGE_TITLE_FORBIDDEN_RE)
      if (bad) {
        violations.push({
          file: rel,
          line: i + 1,
          reason: `知识节点 title「${tm[2]}」包含应试词「${bad[0]}」（请仅用学科名称，真题入口由「真题 (N)」按钮承担）`,
        })
      }
    }
    const am = line.match(/animationIds\s*:\s*\[([^\]]*)\]/)
    if (am) {
      const idRe = /['"](anim-[a-z0-9-]+)['"]/g
      let im
      while ((im = idRe.exec(am[1])) !== null) {
        checkedAnimRefs += 1
        if (!registeredAnimIds.has(im[1])) {
          violations.push({
            file: rel,
            line: i + 1,
            reason: `知识节点引用的 animationId「${im[1]}」在 src/data/registries/ 中不存在`,
          })
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('\n❌ check:exam-isolation 检测失败：\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> ${v.reason}`)
  }
  console.error(`\n共计 ${violations.length} 处违规。\n`)
  process.exit(1)
}

console.log(
  `✅ check:exam-isolation passed: ${checkedFeatures} 个动画模块文件 / ${checkedQuantities} 个看板文件 / ${checkedKnowledgeNodes} 个知识节点 / ${checkedAnimRefs} 条动画引用均保持学练严格隔离。`,
)
