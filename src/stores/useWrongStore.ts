import { create } from 'zustand'
import { storage } from '@/utils/storage'

/** 错题四态（见 ui/05_WRONGBOOK_RULES §1） */
export type WrongStatus = 'new' | 'viewed' | 'retrying' | 'mastered'

export interface WrongRecord {
  /** 题目 id，作为唯一键（同题累计 errorCount） */
  problemId: string
  /** 累计做错次数 */
  errorCount: number
  /** 连续答对次数（7天内），>=2 触发已掌握 */
  correctStreak: number
  /** 当前状态 */
  status: WrongStatus
  /** 关联知识点（用于按模块筛选） */
  knowledgeIds: string[]
  /** 首次收录时间戳 */
  createdAt: number
  /** 最近作答时间戳 */
  lastAttemptTime: number
  /** 掌握时间戳（连续答对2次后设置） */
  masteredAt?: number
  /** 用户笔记（≤200字） */
  note?: string
}

/** 连续答对达到此值判定为已掌握 */
const MASTERY_STREAK = 2
const MASTERY_WINDOW = 7 * 24 * 60 * 60 * 1000
/** 笔记字数上限 */
export const NOTE_MAX_LENGTH = 200
/** IndexedDB 持久化键 */
const STORAGE_KEY = 'wrong-records'

interface WrongState {
  records: WrongRecord[]
  /** 是否已从 IndexedDB 完成首次水合 */
  hydrated: boolean

  /** 从 IndexedDB 加载（应用启动/页面进入时调用一次） */
  hydrate: () => Promise<void>
  /** 收录错题：已存在则累计错误次数并重置连对、回到未复习 */
  addWrong: (problemId: string, knowledgeIds: string[]) => void
  /** 标记已查看解析 */
  markViewed: (problemId: string) => void
  /** 记录一次答对：连对+1，达阈值则已掌握，否则重练中 */
  recordCorrect: (problemId: string) => void
  /** 直接标记已掌握 */
  markMastered: (problemId: string) => void
  /** 添加/更新笔记（截断至 NOTE_MAX_LENGTH） */
  addNote: (problemId: string, note: string) => void
  /** 删除单条 */
  removeWrong: (problemId: string) => void
  /** 清空全部 */
  clearAll: () => void
}

function persist(records: WrongRecord[]): void {
  // 持久化为副作用，失败静默（storage 内部已 try/catch）
  void storage.setDB(STORAGE_KEY, records)
}

/** 防抖持久化：500ms 内多次 mutation 合并为一次写入 */
let persistTimer: ReturnType<typeof setTimeout> | null = null
function persistDebounced(records: WrongRecord[]): void {
  if (persistTimer !== null) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    persist(records)
  }, 500)
}

/** 页面关闭前刷出待写入的防抖队列 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (persistTimer !== null) {
      clearTimeout(persistTimer)
      persistTimer = null
      // 用当前 store 中的最新 records 同步写入
      const latest = useWrongStore.getState().records
      persist(latest)
    }
  })
}

export const useWrongStore = create<WrongState>((set, get) => ({
  records: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return
    const saved = await storage.getDB<WrongRecord[]>(STORAGE_KEY)
    set({ records: Array.isArray(saved) ? saved : [], hydrated: true })
  },

  addWrong: (problemId, knowledgeIds) =>
    set((state) => {
      const now = Date.now()
      const existing = state.records.find((r) => r.problemId === problemId)
      let records: WrongRecord[]
      if (existing) {
        records = state.records.map((r) =>
          r.problemId === problemId
            ? {
                ...r,
                errorCount: r.errorCount + 1,
                correctStreak: 0,
                status: 'new',
                masteredAt: undefined,
                lastAttemptTime: now,
              }
            : r
        )
      } else {
        records = [
          ...state.records,
          {
            problemId,
            knowledgeIds,
            errorCount: 1,
            correctStreak: 0,
            status: 'new',
            createdAt: now,
            lastAttemptTime: now,
          },
        ]
      }
      persistDebounced(records)
      return { records }
    }),

  markViewed: (problemId) =>
    set((state) => {
      const records = state.records.map((r) =>
        r.problemId === problemId && r.status === 'new'
          ? { ...r, status: 'viewed' as WrongStatus }
          : r
      )
      persistDebounced(records)
      return { records }
    }),

  recordCorrect: (problemId) =>
    set((state) => {
      const now = Date.now()
      const records = state.records.map((r) => {
        if (r.problemId !== problemId) return r
        const correctStreak = r.correctStreak + 1
        const withinWindow = (now - r.lastAttemptTime) <= MASTERY_WINDOW
        const mastered = correctStreak >= MASTERY_STREAK && withinWindow
        return {
          ...r,
          correctStreak: mastered ? correctStreak : (withinWindow ? correctStreak : 1),
          status: (mastered ? 'mastered' : 'retrying') as WrongStatus,
          masteredAt: mastered ? (r.masteredAt ?? now) : r.masteredAt,
          lastAttemptTime: now,
        }
      })
      persistDebounced(records)
      return { records }
    }),

  markMastered: (problemId) =>
    set((state) => {
      const now = Date.now()
      const records = state.records.map((r) =>
        r.problemId === problemId
          ? {
              ...r,
              status: 'mastered' as WrongStatus,
              correctStreak: Math.max(r.correctStreak, MASTERY_STREAK),
              masteredAt: r.masteredAt ?? now,
            }
          : r
      )
      persistDebounced(records)
      return { records }
    }),

  addNote: (problemId, note) =>
    set((state) => {
      const trimmed = note.slice(0, NOTE_MAX_LENGTH)
      const records = state.records.map((r) =>
        r.problemId === problemId ? { ...r, note: trimmed } : r
      )
      persistDebounced(records)
      return { records }
    }),

  removeWrong: (problemId) =>
    set((state) => {
      const records = state.records.filter((r) => r.problemId !== problemId)
      persistDebounced(records)
      return { records }
    }),

  clearAll: () => {
    persist([])
    set({ records: [] })
  },
}))

export default useWrongStore
