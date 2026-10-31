import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  MASTER_MODEL_COUNT,
  MASTER_MODEL_SERIES_LABEL,
  masterModels,
} from '@/data/masterModels'

/**
 * Master 模型数量一致性守卫。
 *
 * ══════════════════════════════════════════════════════════════════════
 *  为什么要这个测试：
 *  模型条目早已从 18 增到 20，但「高考 18 大模型」这句文案被硬编码在
 *  导航 / 首页入口 / 专区标题 / 真题解析点拨等 10+ 处，长期无人同步，
 *  与 ANIMATION_COUNT（98 → 102 漂移）是同一类问题。
 *  本测试从两个方向把「数字」锁死：
 *    ① 正向：MASTER_MODEL_COUNT 必须等于数组真实长度，标题编号必须连续；
 *    ② 反向：源码中不得再出现「N 大模型 / N 大 Master」这类字面数字，
 *            必须引用 MASTER_MODEL_COUNT —— 这样新增/删除模型时文案自动跟随。
 * ══════════════════════════════════════════════════════════════════════
 */
describe('masterModels · 数量与文案一致性守卫', () => {
  it('MASTER_MODEL_COUNT 等于模型数组真实长度', () => {
    expect(MASTER_MODEL_COUNT).toBe(masterModels.length)
    expect(MASTER_MODEL_COUNT).toBeGreaterThan(0)
  })

  it('专区称谓由常量派生，不手写数字', () => {
    expect(MASTER_MODEL_SERIES_LABEL).toBe(`高考 ${MASTER_MODEL_COUNT} 大 Master 压轴模型`)
  })

  it('模型 id 唯一', () => {
    const ids = masterModels.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('模型标题编号与数组顺序一致（1..N 连续）', () => {
    masterModels.forEach((model, index) => {
      const match = model.title.match(/^(\d+)\.\s*(.+)$/)
      expect(match, `模型 ${model.id} 的标题缺少「序号. 」前缀：${model.title}`).not.toBeNull()
      expect(Number(match![1]), `模型 ${model.id} 标题序号与数组位置不一致`).toBe(index + 1)
    })
  })

  it('源码中不存在硬编码的「N 大模型 / N 大 Master」字面数字', () => {
    const ROOT = process.cwd()
    const SRC = join(ROOT, 'src')
    const HARDCODED_RE = /\d+\s*大\s*(模型|Master)/
    // 注释行允许说明历史沿革，只检查真实渲染/数据代码
    const isCommentLine = (line: string) => {
      const t = line.trim()
      return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')
    }

    const walk = (dir: string): string[] => {
      const files: string[] = []
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) files.push(...walk(full))
        else if (/\.(ts|tsx)$/.test(entry)) files.push(full)
      }
      return files
    }

    const violations: string[] = []
    for (const file of walk(SRC)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (isCommentLine(line)) return
        if (HARDCODED_RE.test(line)) {
          violations.push(`${relative(ROOT, file).replaceAll('\\', '/')}:${i + 1} -> ${line.trim()}`)
        }
      })
    }

    expect(
      violations,
      `以下位置硬编码了 Master 模型数量，请改用 MASTER_MODEL_COUNT / MASTER_MODEL_SERIES_LABEL：\n${violations.join('\n')}`,
    ).toEqual([])
  })
})
