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

function reset() {
  useWrongStore.setState({ records: [], hydrated: false })
}

describe('useWrongStore', () => {
  beforeEach(() => reset())

  it('addWrong 收录新错题，初始状态为 new、errorCount=1', () => {
    useWrongStore.getState().addWrong('p1', ['mechanics-1-1'])
    const r = useWrongStore.getState().records[0]
    expect(r.problemId).toBe('p1')
    expect(r.errorCount).toBe(1)
    expect(r.status).toBe('new')
    expect(r.correctStreak).toBe(0)
  })

  it('同题再次 addWrong 累计错误次数并重置为 new', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'])
    s.recordCorrect('p1')
    s.addWrong('p1', ['k'])
    const r = useWrongStore.getState().records[0]
    expect(useWrongStore.getState().records.length).toBe(1)
    expect(r.errorCount).toBe(2)
    expect(r.status).toBe('new')
    expect(r.correctStreak).toBe(0)
  })

  it('markViewed 将 new → viewed', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'])
    s.markViewed('p1')
    expect(useWrongStore.getState().records[0].status).toBe('viewed')
  })

  it('连续答对 2 次自动判定已掌握', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'])
    s.recordCorrect('p1')
    expect(useWrongStore.getState().records[0].status).toBe('retrying')
    s.recordCorrect('p1')
    const r = useWrongStore.getState().records[0]
    expect(r.status).toBe('mastered')
    expect(r.masteredAt).toBeTypeOf('number')
  })

  it('markMastered 直接标记已掌握', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'])
    s.markMastered('p1')
    expect(useWrongStore.getState().records[0].status).toBe('mastered')
  })

  it('addNote 截断到 200 字', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'])
    s.addNote('p1', 'x'.repeat(250))
    expect(useWrongStore.getState().records[0].note?.length).toBe(200)
  })

  it('removeWrong / clearAll', () => {
    const s = useWrongStore.getState()
    s.addWrong('p1', ['k'])
    s.addWrong('p2', ['k'])
    s.removeWrong('p1')
    expect(useWrongStore.getState().records.map((r) => r.problemId)).toEqual(['p2'])
    s.clearAll()
    expect(useWrongStore.getState().records).toEqual([])
  })

  it('hydrate 从持久化层加载', async () => {
    const { storage } = await import('@/utils/storage')
    await storage.setDB('wrong-records', [
      { problemId: 'px', errorCount: 1, correctStreak: 0, status: 'new', knowledgeIds: [], createdAt: 1, lastAttemptTime: 1 },
    ])
    await useWrongStore.getState().hydrate()
    expect(useWrongStore.getState().records[0].problemId).toBe('px')
    expect(useWrongStore.getState().hydrated).toBe(true)
  })

  describe('recordCorrect 7 天窗口边界', () => {
    const DAY = 24 * 60 * 60 * 1000

    it('窗口内连续答对 2 次 → mastered', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      const s = useWrongStore.getState()
      s.addWrong('p1', ['k'])
      s.recordCorrect('p1')
      expect(useWrongStore.getState().records[0].status).toBe('retrying')
      expect(useWrongStore.getState().records[0].correctStreak).toBe(1)

      // 3 天后再答对，仍在 7 天窗口内
      vi.setSystemTime(now + 3 * DAY)
      s.recordCorrect('p1')
      const r = useWrongStore.getState().records[0]
      expect(r.status).toBe('mastered')
      expect(r.correctStreak).toBe(2)
      vi.useRealTimers()
    })

    it('窗口外（>7 天）答对 → streak 重置为 1，不进入 mastered', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      const s = useWrongStore.getState()
      s.addWrong('p1', ['k'])
      s.recordCorrect('p1')
      expect(useWrongStore.getState().records[0].correctStreak).toBe(1)

      // 8 天后答对，超出 7 天窗口
      vi.setSystemTime(now + 8 * DAY)
      s.recordCorrect('p1')
      const r = useWrongStore.getState().records[0]
      expect(r.correctStreak).toBe(1) // 重置为 1（本次答对计数）
      expect(r.status).toBe('retrying')
      vi.useRealTimers()
    })

    it('恰好 7 天边界（7*DAY）仍在窗口内', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      const s = useWrongStore.getState()
      s.addWrong('p1', ['k'])
      s.recordCorrect('p1')

      // 恰好 7 天后
      vi.setSystemTime(now + 7 * DAY)
      s.recordCorrect('p1')
      const r = useWrongStore.getState().records[0]
      expect(r.status).toBe('mastered')
      vi.useRealTimers()
    })

    it('mastered 后超窗口再答对 → 降级为 retrying', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      const s = useWrongStore.getState()
      s.addWrong('p1', ['k'])
      s.recordCorrect('p1')
      s.recordCorrect('p1')
      expect(useWrongStore.getState().records[0].status).toBe('mastered')

      // 30 天后再次答对，超出窗口 → 降级为 retrying
      vi.setSystemTime(now + 30 * DAY)
      s.recordCorrect('p1')
      const r = useWrongStore.getState().records[0]
      expect(r.status).toBe('retrying')
      expect(r.correctStreak).toBe(1)
      vi.useRealTimers()
    })
  })
})
