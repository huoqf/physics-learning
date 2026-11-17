import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { allProblems, problemIndex } from '@/data/problems'
import { knowledgeTree } from '@/data/knowledgeTree'
import { masterModels } from '@/data/masterModels'

/**
 * 题库真题溯源与防伪守卫（Anti-Fake-Gaokao Guard）。
 *
 * 历史教训：
 *   过去部分测试和 Skill 模板强迫题目填写年份/考区/verified: true 与 ABCD 选项，
 *   导致大量模型练题与自编题挂上了「2023 全国甲卷第 14 题」「2024 新课标卷第 21 题」
 *   等虚假考源，甚至给实验填空题硬凑不存在的 ABCD 选项。
 *
 * 本守卫确保：
 *   1. ID 全局唯一，无静默覆盖；
 *   2. 每道题必须显式声明 `verified` 与 `questionType`；
 *   3. `verified: false` 的题目严禁冒用真实考区名、官方原卷来源文案、`高考真题` 标签或真题预设文案；
 *   4. `verified: true` 的题目必须提供真实考区与正式原卷出处，不得混入模型/模拟字样；
 *   5. 仅 `choice` 选择题允许携带 `optionExplanations`，且多选与单选语干一致；
 *   6. 声明的静态图片路径必须真实存在，知识树与 Master 模型引用零断链。
 */

const REAL_REGION_RE =
  /^(全国|全国卷|全国甲|全国乙|全国甲卷|全国乙卷|新课标|新课标卷|新课标Ⅰ卷|新课标Ⅱ卷|北京|北京卷|上海|上海卷|天津|天津卷|重庆|重庆卷|浙江|浙江卷|江苏|江苏卷|山东|山东卷|广东|广东卷|湖南|湖南卷|湖北|湖北卷|河北|河北卷|辽宁|辽宁卷|福建|福建卷|海南|海南卷|安徽|安徽卷|江西|江西卷|广西|广西卷|贵州|贵州卷|甘肃|甘肃卷|黑龙江|黑龙江卷|吉林|吉林卷)$/

const OFFICIAL_SOURCE_RE = /^\d{4}年.*(?:普通高等学校|高考).*(?:第\d+题|试题|物理卷|理综)/

const NON_VERIFIED_WORD_RE = /模型|模拟|演练|巩固|改编/

describe('题库溯源与防伪真题守卫', () => {
  it('所有题目 ID 全局唯一且与 problemIndex 一致', () => {
    const ids = allProblems.map((p) => p.id)
    const counts = new Map<string, number>()
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
    const dups = [...counts.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} (×${n})`)

    expect(dups, `发现重复题目 ID：${dups.join(', ')}`).toEqual([])
    expect(Object.keys(problemIndex).length).toBe(allProblems.length)
  })

  it('每道题显式声明 verified 与合法 questionType', () => {
    const bad: string[] = []
    for (const p of allProblems) {
      if (typeof p.verified !== 'boolean') {
        bad.push(`${p.id}: 缺少显式 verified: boolean`)
      }
      if (p.questionType !== 'choice' && p.questionType !== 'calculation' && p.questionType !== 'experiment') {
        bad.push(`${p.id}: 缺少或非法 questionType="${String(p.questionType)}"`)
      }
    }
    expect(bad).toEqual([])
  })

  it('verified === false 的非原卷题不得冒充真实高考卷别、题号或真题标签', () => {
    const violations: string[] = []
    for (const p of allProblems) {
      if (p.verified !== false) continue

      if (REAL_REGION_RE.test(p.province.trim())) {
        violations.push(`${p.id}: verified=false 但 province="${p.province}" 冒用了真实考区`)
      }
      if (!p.source?.trim()) {
        violations.push(`${p.id}: verified=false 时必须明确标注 source 来源`)
      } else if (OFFICIAL_SOURCE_RE.test(p.source.trim()) && !/改编自/.test(p.source)) {
        violations.push(`${p.id}: verified=false 但 source="${p.source}" 冒充官方原卷出处`)
      }
      if (p.tags?.includes('高考真题')) {
        violations.push(`${p.id}: verified=false 不得携带 "高考真题" 标签`)
      }
      if (p.targetAnimation?.presetDescription && /真题/.test(p.targetAnimation.presetDescription)) {
        violations.push(
          `${p.id}: verified=false 但 targetAnimation.presetDescription 含"真题"字样`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('verified === true 的真题必须具备真实考区与正式原卷来源', () => {
    const violations: string[] = []
    for (const p of allProblems) {
      if (p.verified !== true) continue

      if (!REAL_REGION_RE.test(p.province.trim())) {
        violations.push(`${p.id}: verified=true 但 province="${p.province}" 不是规范考区`)
      }
      if (!p.source?.trim()) {
        violations.push(`${p.id}: verified=true 缺少 source 官方出处`)
      } else if (NON_VERIFIED_WORD_RE.test(p.source)) {
        violations.push(`${p.id}: verified=true 但 source="${p.source}" 包含模型/改编字样`)
      }
    }
    expect(violations).toEqual([])
  })

  it('题型与 optionExplanations 严格一致（非选择题不得伪造 ABCD；多选必须明示）', () => {
    const violations: string[] = []
    for (const p of allProblems) {
      const opts = p.optionExplanations ? Object.values(p.optionExplanations) : []

      if (p.questionType === 'choice') {
        if (opts.length === 0) {
          violations.push(`${p.id}: choice 选择题缺少 optionExplanations`)
          continue
        }
        const correctCount = opts.filter((o) => o.isCorrect).length
        if (correctCount === 0) {
          violations.push(`${p.id}: choice 选择题没有正确选项`)
        }
        if (correctCount > 1 && !/多选|不定项/.test(p.content)) {
          violations.push(`${p.id}: 有 ${correctCount} 个正确选项但题干未标注"多选"或"不定项"`)
        }
      } else if (opts.length > 0) {
        violations.push(`${p.id}: questionType="${p.questionType}" 非选择题不得挂载 optionExplanations`)
      }
    }
    expect(violations).toEqual([])
  })

  it('声明的静态图片文件在 public/ 下真实存在', () => {
    const missing: string[] = []
    for (const p of allProblems) {
      for (const img of p.images ?? []) {
        const rel = img.replace(/^\/+/, '')
        const full = join(process.cwd(), 'public', rel)
        if (!existsSync(full)) {
          missing.push(`${p.id}: 图片不存在 -> ${img}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('知识树与 Master 模型引用的题目 ID 全部有效', () => {
    const broken: string[] = []
    for (const node of knowledgeTree) {
      for (const pid of node.problemIds) {
        if (!problemIndex[pid]) broken.push(`knowledgeTree[${node.id}].problemIds -> ${pid}`)
      }
    }
    for (const model of masterModels) {
      for (const pid of model.relatedProblemIds) {
        if (!problemIndex[pid]) broken.push(`masterModels[${model.id}].relatedProblemIds -> ${pid}`)
      }
    }
    expect(broken).toEqual([])
  })
})
