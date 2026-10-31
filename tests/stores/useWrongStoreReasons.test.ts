import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock storage 持久化层（避免依赖真实 IndexedDB）
vi.mock('@/utils/storage', () => {
  let store: Record<string, unknown> = {}
  return {
    storage: {
      getDB: vi.fn(async (k: string) => store[k] ?? null),
      setDB: vi.fn(async (k: string, v: unknown) => {
        store[k] = v
      }),
      __reset: () => {
        store = {}
      },
    },
  }
})

import { useWrongStore } from '@/stores/useWrongStore'
import { normalizeReasons, WRONG_REASON_IDS } from '@/data/wrongReasons'

function reset() {
  useWrongStore.setState({ records: [], hydrated: false })
}

describe('useWrongStore · 错因归因', () => {
  beforeEach(() => reset())

  it('addWrong 带错因时写入 reasons，不带则留空（老数据形态）', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'], ['vector-sign'])
    s.addWrong('p2', ['k'])
    const [r1, r2] = useWrongStore.getState().records
    expect(r1.reasons).toEqual(['vector-sign'])
    expect(r2.reasons).toBeUndefined()
  })

  it('同一题重复 addWrong：错因取并集而不是覆盖', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'], ['vector-sign'])
    s.addWrong('p1', ['k'], ['conservation-condition'])
    const r = useWrongStore.getState().records[0]
    expect(r.reasons).toEqual(['conservation-condition', 'vector-sign'])
    expect(r.errorCount).toBe(2)
  })

  it('再次 addWrong 不传错因时，不清空已有归因', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'], ['vector-sign'])
    s.addWrong('p1', ['k'])
    expect(useWrongStore.getState().records[0].reasons).toEqual(['vector-sign'])
  })

  it('setReasons 覆盖写入，传空数组即清空', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'], ['vector-sign', 'graph-slope-area'])
    s.setReasons('p1', ['implicit-condition'])
    expect(useWrongStore.getState().records[0].reasons).toEqual(['implicit-condition'])
    s.setReasons('p1', [])
    expect(useWrongStore.getState().records[0].reasons).toBeUndefined()
  })

  it('setReasons 对未收录题目是无操作（不凭空造记录）', () => {
    useWrongStore.getState().setReasons('ghost', ['vector-sign'])
    expect(useWrongStore.getState().records).toHaveLength(0)
  })

  it('未登记的错因 id 不会写进记录（防旧数据/脏数据复活）', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'], ['vector-sign', 'not-a-real-reason' as never])
    const r = useWrongStore.getState().records[0]
    expect(r.reasons).toEqual(['vector-sign'])
  })
})

describe('normalizeReasons', () => {
  it('去重并按 WRONG_REASON_IDS 声明顺序排序', () => {
    const ids = [...WRONG_REASON_IDS].reverse()
    const result = normalizeReasons([...ids, ids[0]])
    expect(result).toEqual(WRONG_REASON_IDS)
    expect(result).toHaveLength(WRONG_REASON_IDS.length)
  })

  it('空数组 / undefined 归一为空数组', () => {
    expect(normalizeReasons(undefined)).toEqual([])
    expect(normalizeReasons([])).toEqual([])
  })
})
