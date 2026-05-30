import { create } from 'zustand'
import { storage } from '@/utils/storage'

export type PracticeMode = 'practice' | 'test'

/** 一次练习/测试的成绩记录 */
export interface ScoreRecord {
  id: string
  mode: PracticeMode
  timestamp: number
  total: number
  correct: number
  /** 用时（秒）；练习模式不计时则为 undefined */
  durationSec?: number
  /** 错题 problemId（用于薄弱知识点统计） */
  wrongProblemIds: string[]
  /** 各模块正确率：module -> { correct, total } */
  byModule: Record<string, { correct: number; total: number }>
}

const STORAGE_KEY = 'practice-history'
const MAX_HISTORY = 50

interface PracticeState {
  history: ScoreRecord[]
  hydrated: boolean
  hydrate: () => Promise<void>
  addRecord: (record: Omit<ScoreRecord, 'id' | 'timestamp'>) => void
  clearHistory: () => void
}

function persist(history: ScoreRecord[]): void {
  void storage.setDB(STORAGE_KEY, history)
}

export const usePracticeStore = create<PracticeState>((set, get) => ({
  history: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return
    const saved = await storage.getDB<ScoreRecord[]>(STORAGE_KEY)
    set({ history: Array.isArray(saved) ? saved : [], hydrated: true })
  },

  addRecord: (record) =>
    set((state) => {
      const entry: ScoreRecord = {
        ...record,
        id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      }
      // 最新在前，最多保留 MAX_HISTORY 条
      const history = [entry, ...state.history].slice(0, MAX_HISTORY)
      persist(history)
      return { history }
    }),

  clearHistory: () => {
    persist([])
    set({ history: [] })
  },
}))

export default usePracticeStore
