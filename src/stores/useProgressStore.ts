import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage, migrateFromLocalStorage } from '@/utils/storage'

interface ProgressState {
  viewedAnimations: string[]
  masteredKnowledge: string[]
  lastVisited: string
  totalAnimations: number
  totalKnowledge: number

  markAnimationViewed: (animationId: string) => void
  markKnowledgeMastered: (knowledgeId: string) => void
  unmarkKnowledgeMastered: (knowledgeId: string) => void
  setLastVisited: (route: string) => void
  setTotalCounts: (animations: number, knowledge: number) => void
  getProgress: () => { animationProgress: number; knowledgeProgress: number }
  reset: () => void
}

const initialState = {
  viewedAnimations: [] as string[],
  masteredKnowledge: [] as string[],
  lastVisited: '/',
  totalAnimations: 0,
  totalKnowledge: 0,
}

/** localStorage 持久化键名（用于迁移检测） */
const STORAGE_KEY = 'physics-progress-storage'

// ── 启动时执行一次性 localStorage → IndexedDB 迁移 ──
migrateFromLocalStorage(STORAGE_KEY)

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      markAnimationViewed: (animationId: string) =>
        set((state) => {
          if (state.viewedAnimations.includes(animationId)) return state
          return { viewedAnimations: [...state.viewedAnimations, animationId] }
        }),

      markKnowledgeMastered: (knowledgeId: string) =>
        set((state) => {
          if (state.masteredKnowledge.includes(knowledgeId)) return state
          return { masteredKnowledge: [...state.masteredKnowledge, knowledgeId] }
        }),

      unmarkKnowledgeMastered: (knowledgeId: string) =>
        set((state) => ({
          masteredKnowledge: state.masteredKnowledge.filter((id) => id !== knowledgeId),
        })),

      setLastVisited: (route: string) => set({ lastVisited: route }),

      setTotalCounts: (animations: number, knowledge: number) =>
        set({ totalAnimations: animations, totalKnowledge: knowledge }),

      getProgress: () => {
        const state = get()
        const animationProgress =
          state.totalAnimations > 0
            ? (state.viewedAnimations.length / state.totalAnimations) * 100
            : 0
        const knowledgeProgress =
          state.totalKnowledge > 0
            ? (state.masteredKnowledge.length / state.totalKnowledge) * 100
            : 0
        return { animationProgress, knowledgeProgress }
      },

      reset: () => set({ ...initialState }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => idbStorage),
    }
  )
)

export default useProgressStore
