import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ProgressState {
  viewedAnimations: Set<string>
  masteredKnowledge: Set<string>
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
  viewedAnimations: new Set<string>(),
  masteredKnowledge: new Set<string>(),
  lastVisited: '/',
  totalAnimations: 0,
  totalKnowledge: 0,
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      markAnimationViewed: (animationId: string) =>
        set((state) => ({
          viewedAnimations: new Set([...state.viewedAnimations, animationId]),
        })),

      markKnowledgeMastered: (knowledgeId: string) =>
        set((state) => ({
          masteredKnowledge: new Set([...state.masteredKnowledge, knowledgeId]),
        })),

      unmarkKnowledgeMastered: (knowledgeId: string) =>
        set((state) => {
          const newSet = new Set(state.masteredKnowledge)
          newSet.delete(knowledgeId)
          return { masteredKnowledge: newSet }
        }),

      setLastVisited: (route: string) => set({ lastVisited: route }),

      setTotalCounts: (animations: number, knowledge: number) =>
        set({ totalAnimations: animations, totalKnowledge: knowledge }),

      getProgress: () => {
        const state = get()
        const animationProgress =
          state.totalAnimations > 0
            ? (state.viewedAnimations.size / state.totalAnimations) * 100
            : 0
        const knowledgeProgress =
          state.totalKnowledge > 0
            ? (state.masteredKnowledge.size / state.totalKnowledge) * 100
            : 0
        return { animationProgress, knowledgeProgress }
      },

      reset: () =>
        set({
          ...initialState,
          viewedAnimations: new Set(),
          masteredKnowledge: new Set(),
        }),
    }),
    {
      name: 'physics-progress-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        viewedAnimations: Array.from(state.viewedAnimations),
        masteredKnowledge: Array.from(state.masteredKnowledge),
        lastVisited: state.lastVisited,
        totalAnimations: state.totalAnimations,
        totalKnowledge: state.totalKnowledge,
      }),
      merge: (persistedState: unknown, currentState: ProgressState) => {
        const persisted = persistedState as Record<string, unknown> | undefined
        const merged = { ...currentState } as ProgressState
        if (persisted) {
          Object.assign(merged, persisted)
          if (Array.isArray(persisted.viewedAnimations)) {
            merged.viewedAnimations = new Set(persisted.viewedAnimations as string[])
          } else if (!(persisted.viewedAnimations instanceof Set)) {
            merged.viewedAnimations = new Set()
          }
          if (Array.isArray(persisted.masteredKnowledge)) {
            merged.masteredKnowledge = new Set(persisted.masteredKnowledge as string[])
          } else if (!(persisted.masteredKnowledge instanceof Set)) {
            merged.masteredKnowledge = new Set()
          }
        }
        return merged
      },
    }
  )
)

export default useProgressStore
