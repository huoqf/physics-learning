import { describe, it, expect, beforeEach, vi } from 'vitest'

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

import { usePracticeStore, type ScoreRecord } from '@/stores/usePracticeStore'

const sample: Omit<ScoreRecord, 'id' | 'timestamp'> = {
  mode: 'practice',
  total: 3,
  correct: 2,
  durationSec: 90,
  wrongProblemIds: ['p3'],
  byModule: { mechanics: { correct: 2, total: 3 } },
}

function reset() {
  usePracticeStore.setState({ history: [], hydrated: false })
}

describe('usePracticeStore', () => {
  beforeEach(() => reset())

  it('addRecord 添加成绩，最新在前并补全 id/timestamp', () => {
    usePracticeStore.getState().addRecord(sample)
    const h = usePracticeStore.getState().history
    expect(h.length).toBe(1)
    expect(h[0].id).toMatch(/^score-/)
    expect(h[0].timestamp).toBeTypeOf('number')
    expect(h[0].correct).toBe(2)
  })

  it('多条记录按最新在前排序', () => {
    const s = usePracticeStore.getState()
    s.addRecord({ ...sample, correct: 1 })
    s.addRecord({ ...sample, correct: 3 })
    const h = usePracticeStore.getState().history
    expect(h[0].correct).toBe(3)
    expect(h[1].correct).toBe(1)
  })

  it('clearHistory 清空', () => {
    const s = usePracticeStore.getState()
    s.addRecord(sample)
    s.clearHistory()
    expect(usePracticeStore.getState().history).toEqual([])
  })

  it('hydrate 从持久化层加载', async () => {
    const { storage } = await import('@/utils/storage')
    await storage.setDB('practice-history', [
      { ...sample, id: 'score-x', timestamp: 1 },
    ])
    await usePracticeStore.getState().hydrate()
    expect(usePracticeStore.getState().history[0].id).toBe('score-x')
    expect(usePracticeStore.getState().hydrated).toBe(true)
  })
})
