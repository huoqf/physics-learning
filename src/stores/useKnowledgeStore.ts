import { create } from 'zustand'

interface KnowledgeState {
  currentNode: string | null
  expandedNodes: Set<string>
  history: string[]
  setCurrentNode: (nodeId: string | null) => void
  toggleNode: (nodeId: string) => void
  expandNode: (nodeId: string) => void
  collapseNode: (nodeId: string) => void
  goBack: () => void
  reset: () => void
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  currentNode: null,
  expandedNodes: new Set(),
  history: [],
  setCurrentNode: (nodeId) => {
    const state = get()
    if (state.currentNode) {
      set({ history: [...state.history, state.currentNode] })
    }
    set({ currentNode: nodeId })
    if (nodeId) {
      set((state) => ({
        expandedNodes: new Set(state.expandedNodes).add(nodeId)
      }))
    }
  },
  toggleNode: (nodeId) => set((state) => {
    const newExpanded = new Set(state.expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    return { expandedNodes: newExpanded }
  }),
  expandNode: (nodeId) => set((state) => {
    const newExpanded = new Set(state.expandedNodes)
    newExpanded.add(nodeId)
    return { expandedNodes: newExpanded }
  }),
  collapseNode: (nodeId) => set((state) => {
    const newExpanded = new Set(state.expandedNodes)
    newExpanded.delete(nodeId)
    return { expandedNodes: newExpanded }
  }),
  goBack: () => {
    const state = get()
    if (state.history.length > 0) {
      const newHistory = [...state.history]
      const previousNode = newHistory.pop()
      set({
        currentNode: previousNode || null,
        history: newHistory
      })
    }
  },
  reset: () => set({
    currentNode: null,
    expandedNodes: new Set(),
    history: []
  })
}))
