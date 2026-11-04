import { describe, expect, it } from 'vitest'
import { allProblems } from '@/data/problems'

/**
 * 题库文案的「TeX 必须在 `$` 里」守卫。
 *
 * ══════════════════════════════════════════════════════════════════════
 *  为什么需要它：
 *    `InlineMath` 只有在文本**含 `$`** 时才分段渲染；不含 `$` 的字符串只按两级判据
 *    猜「是不是整段公式」——有 `\cmd` 就算公式（否则 `t_{\text{共}} = …` 这类
 *    结论式渲染不出来），仅有 `_ ^ { }` 且无汉字才算公式。
 *
 *    于是有一个静默失败面：**中文句子里混进裸 `\cmd`**（例如把答案括号写成
 *    `（\quad）`），整句会被当成一条公式丢进 KaTeX —— 汉字在数学模式下退化成
 *    字体回退文本，学生看到的是一行乱七八糟的斜体。
 *
 *    这类错误不会报错、不会抛异常，页面只是「看着坏」。
 *    2026-11-04 就抓到两处（`problems/nuclear.ts` 的两道题把答案括号写成
 *    `（\quad）`，全句无 `$`）。
 *
 *  守卫口径：
 *    1. 只查**叙述类**字段（题干 / 选项 / 步骤描述 / 关键条件 / 解析）——
 *       这些字段的正常形态是「中文 + `$...$`」；
 *    2. `formula` / `keyCondition` 之外的整体公式字段允许整段是 TeX（设计如此），
 *       不在此列；
 *    3. 判法：先剥掉 `$$...$$` 与 `$...$` 片段，剩下的自然语言里**不得再有
 *       `\命令`**。剥完还有，说明这个命令没被 `$` 包住。
 * ══════════════════════════════════════════════════════════════════════
 */

/** 剥掉成对的公式片段，只留自然语言（落单的 `$` 不算公式，保留原样） */
function stripMath(text: string): string {
  return text.replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$[^$\n]*?\$/g, ' ')
}

/** 自然语言里残留的 TeX 命令（`\alpha`、`\quad`、`\text`） */
const BARE_TEX_RE = /\\[a-zA-Z]{2,}/

interface Labeled {
  where: string
  text: string
}

function collectTexts(): Labeled[] {
  const out: Labeled[] = []
  for (const p of allProblems) {
    out.push({ where: `${p.id} · 题干`, text: p.content })
    for (const [key, opt] of Object.entries(p.optionExplanations ?? {})) {
      out.push({ where: `${p.id} · 选项 ${key}`, text: opt.explanation })
    }
    for (const step of p.steps) {
      out.push({ where: `${p.id} · 步骤 ${step.id} 描述`, text: step.description })
      out.push({ where: `${p.id} · 步骤 ${step.id} 解析`, text: step.explanation })
      if (step.keyCondition) {
        out.push({ where: `${p.id} · 步骤 ${step.id} 关键条件`, text: step.keyCondition })
      }
    }
  }
  return out
}

describe('题库文案 · TeX 必须写在 $ 里', () => {
  it('叙述字段剥掉公式后不应残留 TeX 命令（否则整句会被当公式渲染）', () => {
    const bad = collectTexts()
      .map((item) => ({ ...item, rest: stripMath(item.text) }))
      .filter((item) => BARE_TEX_RE.test(item.rest))
      .map((item) => {
        const hit = item.rest.match(BARE_TEX_RE)?.[0]
        return `${item.where}：裸 ${hit} —— ${item.text.slice(0, 60)}…`
      })

    expect(bad, `发现 ${bad.length} 处 TeX 命令没被 $ 包住：\n${bad.join('\n')}`).toEqual([])
  })
})
