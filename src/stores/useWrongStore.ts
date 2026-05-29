import { create } from 'zustand'

interface WrongItem {
  id: string
  problemId: string
  wrongAnswer: string
  correctAnswer: string
  timestamp: number
  knowledgeIds: string[]
  retryCount: number
}

interface WrongStats {
  total: number
  byModule: Record<string, number>
  byDifficulty: Record<number, number>
  recent: WrongItem[]
}

interface WrongState {
  wrongs: WrongItem[]
  stats: WrongStats
  addWrong: (item: Omit<WrongItem, 'id' | 'timestamp' | 'retryCount'>) => void
  removeWrong: (id: string) => void
  incrementRetry: (id: string) => void
  clearAllWrongs: () => void
  updateStats: () => void
}

const initialStats: WrongStats = {
  total: 0,
  byModule: {},
  byDifficulty: {},
  recent: []
}

export const useWrongStore = create<WrongState>((set, get) => ({
  wrongs: [],
  stats: initialStats,
  addWrong: (item) => {
    const id = `wrong-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newItem: WrongItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retryCount: 0
    }
    set((state) => {
      const newWrongs = [...state.wrongs, newItem]
      const newStats = calculateStats(newWrongs)
      return { wrongs: newWrongs, stats: newStats }
    })
  },
  removeWrong: (id) => {
    set((state) => {
      const newWrongs = state.wrongs.filter(w => w.id !== id)
      const newStats = calculateStats(newWrongs)
      return { wrongs: newWrongs, stats: newStats }
    })
  },
  incrementRetry: (id) => {
    set((state) => {
      const newWrongs = state.wrongs.map(w => 
        w.id === id ? { ...w, retryCount: w.retryCount + 1 } : w
      )
      const newStats = calculateStats(newWrongs)
      return { wrongs: newWrongs, stats: newStats }
    })
  },
  clearAllWrongs: () => set({ wrongs: [], stats: initialStats }),
  updateStats: () => {
    const state = get()
    const newStats = calculateStats(state.wrongs)
    set({ stats: newStats })
  }
}))

function calculateStats(wrongs: WrongItem[]): WrongStats {
  const byModule: Record<string, number> = {}
  const byDifficulty: Record<number, number> = {}
  const recent = wrongs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)

  wrongs.forEach(item => {
    item.knowledgeIds.forEach(kid => {
      const module = kid.split('-')[0]
      byModule[module] = (byModule[module] || 0) + 1
    })
  })

  return {
    total: wrongs.length,
    byModule,
    byDifficulty,
    recent
  }
}
