#!/usr/bin/env node
/**
 * check-formula-condition.mjs
 *
 * 右屏公式「适用条件」守卫脚本。
 *
 * 背景：docs/agent-rules/ui/08_THREE_PANEL_RULES.md §3.2 明确规定
 *      `condition`（适用条件）对守恒定律类公式「至关重要」——
 *      机械能守恒条件、动量守恒条件、闭合电路欧姆定律适用条件、
 *      法拉第电磁感应定律方向判断、全反射条件。
 *      但在类型层 `condition?: string` 是可选字段（src/components/Formula/PhysicsPanel.tsx），
 *      缺失时右屏静默不渲染，规范宣称的「强制」实际无人把关。
 *      本脚本把这条规范变成 CI 硬约束。
 *
 * 检测范围：src/data/quantities/**（递归，.ts/.tsx）
 * 检测规则：公式 `name` 命中守恒/定律类关键词时，同一公式对象内必须声明非空 `condition`。
 *          ——只对这些「有严格成立前提、学生最易乱套」的定律设卡，
 *            不对全部 266 条公式一刀切（例如 x=v₀t+½at² 之类的定义式无需条件）。
 *
 * 说明：采用「作用域邻近」匹配 —— 每个公式的作用域自其 `name:` 起、
 *      至下一个 `name:`（或 formulas 数组结束）为止，单行与多行写法均可覆盖。
 *
 * 用法：node scripts/check-formula-condition.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const TARGET_DIR = join(ROOT, 'src', 'data', 'quantities')
const FILE_EXTENSIONS = new Set(['.ts', '.tsx'])

/** 必须声明适用条件的定律类公式（name 命中即强制要求 condition） */
const LAW_RULES = [
  {
    id: 'mechanical-energy',
    match: /机械能守恒/,
    hint: '例：只有重力（或弹力）做功，其他力不做功',
  },
  {
    id: 'momentum',
    match: /动量守恒/,
    hint: '例：系统不受外力或所受合外力为零（某方向合外力为零则该方向守恒）',
  },
  {
    id: 'energy-conservation',
    match: /能量守恒/,
    hint: '例：孤立系统或明确转化参与方，总能量守恒',
  },
  {
    id: 'newton-second',
    match: /牛顿第二定律|牛二/,
    hint: '例：惯性参考系、宏观低速物体，a 与 F_合 同向瞬时对应',
  },
  {
    id: 'hooke',
    match: /胡克定律|弹性势能/,
    hint: '例：弹性限度内，x 为形变量（伸长量或压缩量）',
  },
  {
    id: 'universal-gravitation',
    match: /万有引力/,
    hint: '例：两质点或质量分布均匀的球体，r 为球心距',
  },
  {
    id: 'kinetic-theorem',
    match: /动能定理/,
    hint: '例：适用于恒力或变力、直线或曲线运动，W_总 为合外力总功',
  },
  {
    id: 'momentum-theorem',
    match: /动量定理/,
    hint: '例：选定正方向，I_合 为合外力的总冲量',
  },
  {
    id: 'coulomb',
    match: /库仑定律/,
    hint: '例：真空中静止点电荷（或均匀带电球体间）',
  },
  {
    id: 'closed-circuit-ohm',
    match: /闭合电路欧姆定律/,
    hint: '例：纯电阻外电路，电动势等于内外电压之和',
  },
  {
    id: 'ohm',
    match: /欧姆定律/,
    hint: '例：纯电阻线性元件（温度不变，电阻 R 恒定）',
  },
  {
    id: 'uniform-efield',
    match: /匀强电场|电势差与场强/,
    hint: '例：匀强电场，d 为沿电场方向的距离',
  },
  {
    id: 'lorentz-ampere',
    match: /洛伦兹力|安培力/,
    hint: '例：匀强磁场，标明速度/导线与磁场 B 的夹角关系',
  },
  {
    id: 'faraday',
    match: /法拉第电磁感应/,
    hint: '例：磁通量变化率取绝对值，方向另由楞次定律判断',
  },
  {
    id: 'transformer',
    match: /理想变压器|变压比|变流比/,
    hint: '例：理想变压器无漏磁与铜铁损；变流比仅适用于单一副线圈',
  },
  {
    id: 'ideal-gas',
    match: /理想气体|玻意耳|查理定律|盖-吕萨克|克拉珀龙/,
    hint: '例：一定质量的理想气体，T 为热力学温度（K）',
  },
  {
    id: 'thermo-laws',
    match: /热力学第[一二]定律/,
    hint: '例：第一定律明确 W 与 Q 正负号规定；第二定律孤立系统 ΔS ≥ 0',
  },
  {
    id: 'total-internal-reflection',
    match: /全反射/,
    hint: '例：光由光密介质射向光疏介质，且入射角不小于临界角',
  },
  {
    id: 'refraction',
    match: /折射定律|斯涅尔/,
    hint: '例：光从一种均匀透明介质斜射入另一种均匀介质',
  },
  {
    id: 'double-slit',
    match: /双缝干涉|条纹间距/,
    hint: '例：单色相干光源且满足 d ≪ L',
  },
  {
    id: 'photoelectric',
    match: /光电效应方程|爱因斯坦光电/,
    hint: '例：单光子吸收且入射光频率 ν ≥ 截止频率 ν₀',
  },
  {
    id: 'pendulum',
    match: /单摆周期/,
    hint: '例：小角度简谐近似（最大摆角 θ₀ < 5°）',
  },
]

const RAW_TEX_CMD_RE = /\\{1,2}[a-zA-Z]{2,}/
const RAW_TEX_DOLLAR_RE = /\$[^$\n]+\$/

function findRawTexInStringLiteral(rawLiteral, quote) {
  let sanitized = rawLiteral
    .replace(/\\{1,2}u[0-9a-fA-F]{4}/g, '')
    .replace(/\\{1,2}x[0-9a-fA-F]{2}/g, '')
  if (quote === '`') {
    sanitized = sanitized.replace(/\$\{[^}\r\n]*\}/g, ' ')
  }
  const cmdMatch = sanitized.match(RAW_TEX_CMD_RE)
  if (cmdMatch) return cmdMatch[0]
  const dollarMatch = sanitized.match(RAW_TEX_DOLLAR_RE)
  if (dollarMatch) return dollarMatch[0]
  return null
}

/** 扫描字符串字面量（支持单/双引号与含 ${...} 插值的模板字符串），返回结束下标、原始内容与换行数 */
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

/** 词法级提取所有 condition / note 属性值表达式中的字符串字面量（支持跨行、三元表达式与条件在 latex 前的写法） */
function extractPlainFieldStringLiterals(content) {
  const results = []
  let line = 1
  let i = 0

  while (i < content.length) {
    const ch = content[i]
    if (ch === '\n') {
      line++
      i++
      continue
    }
    if (ch === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++
      continue
    }
    if (ch === '/' && content[i + 1] === '*') {
      i += 2
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) {
        if (content[i] === '\n') line++
        i++
      }
      i += 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const str = scanStringLiteral(content, i)
      line += str.lines
      i = str.end
      continue
    }

    const prevCh = i > 0 ? content[i - 1] : ''
    if (!/[A-Za-z0-9_$.]/.test(prevCh)) {
      let field = null
      if (content.startsWith('condition', i) && !/[A-Za-z0-9_$]/.test(content[i + 9] ?? '')) {
        field = 'condition'
      } else if (content.startsWith('note', i) && !/[A-Za-z0-9_$]/.test(content[i + 4] ?? '')) {
        field = 'note'
      }
      if (field) {
        let j = i + field.length
        while (j < content.length && (content[j] === ' ' || content[j] === '\t')) j++
        if (content[j] === ':') {
          j++
          let depth = 0
          let exprLine = line
          while (j < content.length) {
            const c = content[j]
            if (c === '\n') {
              exprLine++
              j++
            } else if (c === '/' && content[j + 1] === '/') {
              while (j < content.length && content[j] !== '\n') j++
            } else if (c === '/' && content[j + 1] === '*') {
              j += 2
              while (j < content.length && !(content[j] === '*' && content[j + 1] === '/')) {
                if (content[j] === '\n') exprLine++
                j++
              }
              j += 2
            } else if (c === "'" || c === '"' || c === '`') {
              const litLine = exprLine
              const str = scanStringLiteral(content, j)
              results.push({ field, line: litLine, raw: str.raw, quote: str.quote })
              exprLine += str.lines
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
          line = exprLine
          i = j
          continue
        }
      }
    }
    i++
  }

  return results
}

/** 剥离注释（保留字符串与行号），提取所有包含 latex 属性的最内层公式对象块 */
function extractFormulaObjects(content) {
  let stripped = ''
  let line = 1
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++
      if (i < content.length) {
        line++
        stripped += '\n'
      }
      continue
    }
    if (ch === '/' && content[i + 1] === '*') {
      i += 2
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) {
        if (content[i] === '\n') {
          line++
          stripped += '\n'
        }
        i++
      }
      i++
      stripped += ' '
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const str = scanStringLiteral(content, i)
      stripped += content.slice(i, str.end)
      line += str.lines
      i = str.end - 1
      continue
    }
    if (ch === '\n') line++
    stripped += ch
  }

  const objects = []
  const stack = []
  line = 1
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const str = scanStringLiteral(stripped, i)
      line += str.lines
      i = str.end - 1
      continue
    }
    if (ch === '{') {
      stack.push({ start: i, startLine: line })
    } else if (ch === '}' && stack.length > 0) {
      const top = stack.pop()
      const block = stripped.slice(top.start, i + 1)
      if (/\blatex\s*:/.test(block) && !/\blatex\s*:\s*string\b/.test(block)) {
        const innerHasLatex = objects.some((o) => o.start > top.start && o.end < i + 1)
        if (!innerHasLatex) {
          objects.push({ start: top.start, end: i + 1, line: top.startLine, block })
        }
      }
    } else if (ch === '\n') {
      line++
    }
  }
  return objects
}

/** 提取公式对象内指定属性的文本字面量或原始表达式值 */
function extractBlockField(block, fieldName) {
  const values = []
  const re = new RegExp(`(^|[,{\\s])${fieldName}\\s*:`, 'g')
  let m
  while ((m = re.exec(block)) !== null) {
    let j = m.index + m[0].length
    let depth = 0
    const exprStart = j
    const literals = []
    while (j < block.length) {
      const c = block[j]
      if (c === "'" || c === '"' || c === '`') {
        const str = scanStringLiteral(block, j)
        literals.push(str.raw)
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
    values.push({ rawExpr: block.slice(exprStart, j).trim(), literals })
  }
  return values
}

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walk(full))
    else if (FILE_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) files.push(full)
  }
  return files
}

const violations = []
const rawTexViolations = []
let checked = 0
let checkedPlainFields = 0

for (const file of walk(TARGET_DIR)) {
  const relPath = relative(ROOT, file).replaceAll('\\', '/')
  const content = readFileSync(file, 'utf8')

  // 1. 扫描所有 condition / note 纯文本字段，禁止出现原始 LaTeX（PhysicsPanel 用普通 <span> 渲染）
  for (const lit of extractPlainFieldStringLiterals(content)) {
    checkedPlainFields += 1
    const badTex = findRawTexInStringLiteral(lit.raw, lit.quote)
    if (badTex) {
      rawTexViolations.push({
        file: relPath,
        line: lit.line,
        field: lit.field,
        badTex,
        sample: lit.raw.slice(0, 60),
      })
    }
  }

  // 2. 基于大括号层级提取每条公式对象，校验定律类公式的 condition 字段
  for (const obj of extractFormulaObjects(content)) {
    const nameEntries = extractBlockField(obj.block, 'name')
    const candidateNames = nameEntries.flatMap((e) => e.literals)
    if (candidateNames.length === 0) continue

    const matched = candidateNames
      .map((name) => ({ name: name.trim(), rule: LAW_RULES.find((r) => r.match.test(name)) }))
      .find((x) => x.rule)
    if (!matched) continue

    checked += 1
    const condEntries = extractBlockField(obj.block, 'condition')
    const hasValidCond = condEntries.some((e) => {
      const v = e.rawExpr
      return v && v !== "''" && v !== '""' && v !== '``' && v !== 'undefined' && v !== 'null'
    })

    if (!hasValidCond) {
      violations.push({
        file: relPath,
        line: obj.line,
        reason: `公式「${matched.name}」命中 ${matched.rule.id}，缺少 condition。${matched.rule.hint}`,
      })
    }
  }
}

if (violations.length > 0 || rawTexViolations.length > 0) {
  if (violations.length > 0) {
    console.error('\n❌ check:formula-condition 检测失败：守恒/定律类公式缺少「适用条件」：\n')
    for (const v of violations) console.error(`  ${v.file}:${v.line} -> ${v.reason}`)
    console.error(
      `\n共计 ${violations.length} 处缺失（本脚本覆盖 ${checked} 条定律类公式）。` +
        '\n右屏 FormulaSection 只在 condition 存在时渲染条件行，缺失即学生看不到成立前提。\n',
    )
  }
  if (rawTexViolations.length > 0) {
    console.error('\n❌ check:formula-condition 检测失败：condition / note 中出现原始 LaTeX（请改用 Unicode 纯文本）：\n')
    for (const v of rawTexViolations) {
      console.error(`  ${v.file}:${v.line} [${v.field}] -> 命中「${v.badTex}」: ${v.sample}`)
    }
    console.error(
      `\n共计 ${rawTexViolations.length} 处原始 TeX（PhysicsPanel 用普通 <span> 渲染 condition/note，必须写 ≤ ≥ θ ° √ 等纯文本）。\n`,
    )
  }
  process.exit(1)
} else {
  console.log(
    `✅ check:formula-condition check passed: ${checked} 条守恒/定律类公式均已声明适用条件；${checkedPlainFields} 处 condition/note 纯文本无原始 LaTeX。`,
  )
}
