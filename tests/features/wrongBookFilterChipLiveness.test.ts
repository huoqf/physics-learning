import { describe, it, expect } from 'vitest'
import { filterKeepingSelected } from '@/features/wrongbook/hooks/useWrongBookFilter'

/**
 * 回归：「选中即隐身」死锁。
 *
 * 错题本的错因 / 模块两排 chip 都是从 `records` 现算出来的。若筛选器里压着 key A，
 * 而带 A 的最后一条记录被删掉，A 的 chip 会凭空消失 —— 选中态却依然生效，
 * 列表恒空，学生也找不到胶囊可点。修法：可见性与选中态同源（本函数），
 * 外加页面空态的「清除全部筛选」兜底。
 */
interface Chip {
  id: string
  label: string
}

const ALL: Chip[] = [
  { id: 'friction-mutation', label: '漏判摩擦力突变' },
  { id: 'vector-sign', label: '矢量方向/正负号' },
  { id: 'equation-target', label: '方程选错对象' },
]

/** 当前数据里"真的出现过"的错因 */
const present = (...ids: string[]) => (chip: Chip) => ids.includes(chip.id)

describe('filterKeepingSelected · chip 可见性', () => {
  it('数据里没有、也没选中 → 不出现（不制造点不出结果的死胶囊）', () => {
    const visible = filterKeepingSelected(ALL, present('vector-sign'), new Set<string>(), (c) => c.id)
    expect(visible.map((c) => c.id)).toEqual(['vector-sign'])
  })

  it('删掉最后一条带该错因的记录后，已选中的 chip 仍然可见（死锁回归）', () => {
    // 场景：选中 friction-mutation，随后那道题被删除 → 数据里已无该错因
    const selected = new Set<string>(['friction-mutation'])
    const visible = filterKeepingSelected(ALL, present('vector-sign'), selected, (c) => c.id)
    expect(visible.map((c) => c.id)).toEqual(['friction-mutation', 'vector-sign'])
    // 关键：chip 还在，学生就能再点一次取消选中
    expect(visible.some((c) => c.id === 'friction-mutation')).toBe(true)
  })

  it('既是选中又真的出现时只出现一次（不能拼成两份）', () => {
    const selected = new Set<string>(['vector-sign'])
    const visible = filterKeepingSelected(ALL, present('vector-sign'), selected, (c) => c.id)
    expect(visible.map((c) => c.id)).toEqual(['vector-sign'])
  })

  it('多选同时存在时按声明顺序输出', () => {
    const selected = new Set<string>(['equation-target', 'friction-mutation'])
    const visible = filterKeepingSelected(ALL, present('vector-sign'), selected, (c) => c.id)
    expect(visible.map((c) => c.id)).toEqual(['friction-mutation', 'vector-sign', 'equation-target'])
  })

  it('模块维度同样成立（同一处死锁换个维度）', () => {
    const modules = ['mechanics', 'electromagnetism', 'optics']
    const selected = new Set<string>(['optics'])
    const visible = filterKeepingSelected(modules, (m) => m === 'mechanics', selected, (m) => m)
    expect(visible).toEqual(['mechanics', 'optics'])
  })

  it('全空时返回空数组，不会因选中集合为空而漏项', () => {
    expect(filterKeepingSelected([], present(), new Set<string>(), (c) => c.id)).toEqual([])
  })
})
