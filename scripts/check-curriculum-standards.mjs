#!/usr/bin/env node
/**
 * check-curriculum-standards.mjs
 *
 * 高中物理课标边界、术语与公式分级守卫（GAOKAO_STANDARDS.md §1-§4 的自动化防线）：
 *   1. 大学数学/大物术语及过时口径禁令（quantities & registries 展示文案禁止出现高数/大物黑话）；
 *   2. 超纲数学形式 × 公式级别门禁（latex 含 \int / \oint / \partial / \nabla / 微商 / 指数衰减时，
 *      level 严禁标为 'core' 或 'important'，只允许 'supplementary' 或 'derived'）；
 *   3. 课标外单位（THz）与裸科学记数法（如 1.00e+3）门禁（字符串字面量层）。
 *
 * 用法：node scripts/check-curriculum-standards.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const QUANTITIES_DIR = join(ROOT, 'src', 'data', 'quantities')
const REGISTRIES_DIR = join(ROOT, 'src', 'data', 'registries')
const FEATURES_DIR = join(ROOT, 'src', 'features')
const FEATURE_EXEMPT_DIRS = new Set([
  'analysis',
  'practice',
  'master-models',
  'wrongbook',
  'knowledge',
])

const JARGON_RE =
  /泰勒|拉格朗日|哈密顿|偏导|旋度|散度|张量|薛定谔|微积分|微分方程|二阶导|傅里叶|拉普拉斯|本征|算符|相对论质量|质速关系|戴维南|雷诺数|基尔霍夫|导数/
const CONCEPT_REDLINE_RE =
  /(?<!无|非|不(?:存在|是))惯性力|(?<!无|不(?:存在|是))离心力|磁场强度\s*B|远小近大|内能损失最大|微波炉.*共振|最大放电半径|壳内带电体接地|非线性反比|(?<!误认为|不是|并非|绝非|不(?:应|能)认为)力是维持.*原因|(?<!误认为|不是|并非)速度越大.*惯性越大/
const ADV_MATH_RE =
  /\\{1,2}(?:int|oint|partial|nabla)(?![A-Za-z])|\\{1,2}frac\{\s*(?:\\{1,2}mathrm\{d\}|d)[A-Za-z_]*\s*\}\{\s*(?:\\{1,2}mathrm\{d\}|d)[A-Za-z_]*\s*\}|e\^\{-/
const FORBIDDEN_UNIT_RE = /\bTHz\b/
const RAW_SCI_RE = /(?<![A-Za-z_])\d+(?:\.\d+)?e[+-]\d+/
const RAW_TO_EXPONENTIAL_RE = /\.toExponential\s*\(/g
const ALLOWED_ADV_LEVELS = new Set(['supplementary', 'derived'])

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

function scanStringLiteral(src, start) {
  const quote = src[start]
  let i = start + 1
  let lines = 0
  if (quote === '`') {
    while (i < src.length) {
      const ch = src[i]
      if (ch === '\\') {
        if (src[i + 1] === '\n') lines++
        i += 2
        continue
      }
      if (ch === '$' && src[i + 1] === '{') {
        i += 2
        let braceDepth = 1
        while (i < src.length && braceDepth > 0) {
          const c = src[i]
          if (c === '\n') {
            lines++
            i++
          } else if (c === "'" || c === '"' || c === '`') {
            const inner = scanStringLiteral(src, i)
            lines += inner.lines
            i = inner.end
          } else if (c === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') i++
          } else if (c === '/' && src[i + 1] === '*') {
            i += 2
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
              if (src[i] === '\n') lines++
              i++
            }
            i += 2
          } else {
            if (c === '{') braceDepth++
            else if (c === '}') braceDepth--
            i++
          }
        }
        continue
      }
      if (ch === '`') {
        return { end: i + 1, raw: src.slice(start + 1, i), quote, lines }
      }
      if (ch === '\n') lines++
      i++
    }
    return { end: src.length, raw: src.slice(start + 1), quote, lines }
  }

  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\') {
      if (src[i + 1] === '\n') lines++
      i += 2
      continue
    }
    if (ch === quote) {
      return { end: i + 1, raw: src.slice(start + 1, i), quote, lines }
    }
    if (ch === '\n') {
      lines++
      break
    }
    i++
  }
  return { end: i + 1, raw: src.slice(start + 1, i), quote, lines }
}

/** 剥离注释（保留行号），返回纯净代码文本并提取全部字符串字面量 */
function stripCommentsAndCollectStrings(content) {
  let out = ''
  const strings = []
  let line = 1
  let i = 0
  while (i < content.length) {
    const ch = content[i]
    if (ch === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++
      continue
    }
    if (ch === '/' && content[i + 1] === '*') {
      i += 2
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) {
        if (content[i] === '\n') {
          line++
          out += '\n'
        }
        i++
      }
      i += 2
      out += ' '
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const litLine = line
      const str = scanStringLiteral(content, i)
      strings.push({ raw: str.raw, quote: str.quote, line: litLine })
      out += content.slice(i, str.end)
      line += str.lines
      i = str.end
      continue
    }
    if (ch === '\n') line++
    out += ch
    i++
  }
  return { stripped: out, strings }
}

/** 提取每个包含 `latex:` 属性的最内层对象字面量块（忽略注释与字符串内部的括号） */
function extractFormulaObjects(stripped) {
  const objects = []
  const stack = []
  let line = 1
  let i = 0

  while (i < stripped.length) {
    const ch = stripped[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const str = scanStringLiteral(stripped, i)
      line += str.lines
      i = str.end
      continue
    }
    if (ch === '{') {
      stack.push({ start: i, startLine: line })
    } else if (ch === '}' && stack.length > 0) {
      const top = stack.pop()
      const block = stripped.slice(top.start, i + 1)
      if (/\blatex\s*:/.test(block) && !/\blatex\s*:\s*string\b/.test(block)) {
        // 仅检查当前最内层公式对象（若内层已有 latex 则跳过外层容器块）
        const innerHasLatex = objects.some(
          (o) => o.start > top.start && o.end < i + 1,
        )
        if (!innerHasLatex) {
          objects.push({
            start: top.start,
            end: i + 1,
            line: top.startLine,
            block,
          })
        }
      }
    } else if (ch === '\n') {
      line++
    }
    i++
  }
  return objects
}

/** 从公式对象块内提取顶层属性字面量（跳过内层无意义对象干扰） */
function extractFieldStringsFromBlock(block, fieldName) {
  const found = []
  const re = new RegExp(`\\b${fieldName}\\s*:`, 'g')
  let m
  while ((m = re.exec(block)) !== null) {
    let j = m.index + m[0].length
    let depth = 0
    while (j < block.length) {
      const c = block[j]
      if (c === "'" || c === '"' || c === '`') {
        const str = scanStringLiteral(block, j)
        found.push(str.raw)
        j = str.end
      } else if (c === '(' || c === '[' || c === '{') {
        depth++
        j++
      } else if (c === ')' || c === ']') {
        if (depth > 0) depth--
        j++
      } else if (c === '}') {
        if (depth === 0) break
        depth--
        j++
      } else if ((c === ',' || c === ';') && depth === 0) {
        break
      } else {
        j++
      }
    }
  }
  return found
}

const violations = []
let checkedFiles = 0
let checkedFormulas = 0
let checkedStrings = 0

for (const dir of [QUANTITIES_DIR, REGISTRIES_DIR]) {
  for (const file of walkTs(dir)) {
    checkedFiles += 1
    const rel = relative(ROOT, file).replaceAll('\\', '/')
    const raw = readFileSync(file, 'utf8')
    const { stripped, strings } = stripCommentsAndCollectStrings(raw)

    // 1. 大学术语 & 课标外单位 & 裸科学记数法（基于字符串字面量，不误伤 TS 数值常量）
    for (const str of strings) {
      checkedStrings += 1
      let textForUnitSci = str.raw
      if (str.quote === '`') {
        textForUnitSci = textForUnitSci.replace(/\$\{[^}\r\n]*\}/g, ' ')
      }
      const jm = textForUnitSci.match(JARGON_RE)
      if (jm) {
        violations.push({
          file: rel,
          line: str.line,
          reason: `出现超纲/过时物理或高数术语「${jm[0]}」（见 GAOKAO_STANDARDS.md §3）：${textForUnitSci.slice(0, 60)}`,
        })
      }
      const cm = textForUnitSci.match(CONCEPT_REDLINE_RE)
      if (cm) {
        violations.push({
          file: rel,
          line: str.line,
          reason: `触犯高中物理概念红线「${cm[0]}」（见 GAOKAO_STANDARDS.md §5）：${textForUnitSci.slice(0, 60)}`,
        })
      }
      const um = textForUnitSci.match(FORBIDDEN_UNIT_RE)
      if (um) {
        violations.push({
          file: rel,
          line: str.line,
          reason: `出现高中课标外单位「${um[0]}」（请换算为 nm/μm 或 ×10¹⁴ Hz）`,
        })
      }
      const sm = textForUnitSci.match(RAW_SCI_RE)
      if (sm) {
        violations.push({
          file: rel,
          line: str.line,
          reason: `字符串中出现裸科学记数法「${sm[0]}」（请改用标准 Unicode 上标形式）`,
        })
      }
    }

    // 2. 高数符号 × 公式分级门禁 + 禁用 .toExponential()（仅针对 quantities 目录）
    if (file.startsWith(QUANTITIES_DIR)) {
      const strippedLines = stripped.split(/\r?\n/)
      for (let i = 0; i < strippedLines.length; i++) {
        if (RAW_TO_EXPONENTIAL_RE.test(strippedLines[i])) {
          RAW_TO_EXPONENTIAL_RE.lastIndex = 0
          violations.push({
            file: rel,
            line: i + 1,
            reason: `禁止调用 .toExponential() 向右屏输出裸科学记数法（请改用 formatScientific / splitScientific）`,
          })
        }
      }
      const formulaObjs = extractFormulaObjects(stripped)
      for (const obj of formulaObjs) {
        checkedFormulas += 1
        const latexVals = extractFieldStringsFromBlock(obj.block, 'latex')
        const advHit = latexVals.map((l) => l.match(ADV_MATH_RE)).find(Boolean)
        if (!advHit) continue

        const levels = extractFieldStringsFromBlock(obj.block, 'level')
        const names = extractFieldStringsFromBlock(obj.block, 'name')
        const formulaName = names[0] || '<未命名公式>'
        const invalidLevels = levels.filter((lv) => !ALLOWED_ADV_LEVELS.has(lv))

        if (levels.length === 0 || invalidLevels.length > 0) {
          violations.push({
            file: rel,
            line: obj.line,
            reason: `公式「${formulaName}」含高数/暂态解析符号「${advHit[0]}」，level=${invalidLevels[0] ?? '未声明'}；高中看板仅允许标为 'supplementary' 或 'derived'，或改写为高中标准式`,
          })
        }
      }
    }
  }
}

// 3. 动画展示层（非刷题/析题页）可见文案的大学术语与概念红线扫查
for (const entry of readdirSync(FEATURES_DIR)) {
  if (FEATURE_EXEMPT_DIRS.has(entry)) continue
  const sub = join(FEATURES_DIR, entry)
  if (!statSync(sub).isDirectory()) continue
  for (const file of walkTs(sub)) {
    checkedFiles += 1
    const rel = relative(ROOT, file).replaceAll('\\', '/')
    const raw = readFileSync(file, 'utf8')
    const { stripped } = stripCommentsAndCollectStrings(raw)
    const lines = stripped.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const jm = line.match(JARGON_RE)
      if (jm) {
        violations.push({
          file: rel,
          line: i + 1,
          reason: `动画场景出现超纲/大学物理或高数术语「${jm[0]}」（见 GAOKAO_STANDARDS.md §3）：${line.trim().slice(0, 60)}`,
        })
      }
      const cm = line.match(CONCEPT_REDLINE_RE)
      if (cm) {
        violations.push({
          file: rel,
          line: i + 1,
          reason: `动画场景触犯高中物理概念红线「${cm[0]}」（见 GAOKAO_STANDARDS.md §5）：${line.trim().slice(0, 60)}`,
        })
      }
    }
  }
}

if (violations.length > 0) {
  console.error('\n❌ check:curriculum 检测失败：\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> ${v.reason}`)
  }
  console.error(`\n共计 ${violations.length} 处课标规范违规。\n`)
  process.exit(1)
}

console.log(
  `✅ check:curriculum passed: ${checkedFiles} 个模块/数据文件 / ${checkedStrings} 条数据文案 / ${checkedFormulas} 条公式对象均符合高中课标与术语分级规范。`,
)
