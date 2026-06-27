import { create } from 'zustand'

interface KnowledgeState {
  currentNode: string | null
  expandedNodes: string[]
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
  expandedNodes: [],
  history: [],
  setCurrentNode: (nodeId) => {
    const state = get()
    const history = state.currentNode
      ? [...state.history, state.currentNode]
      : state.history
    const expandedNodes = nodeId && !state.expandedNodes.includes(nodeId)
      ? [...state.expandedNodes, nodeId]
      : state.expandedNodes
    set({ history, currentNode: nodeId, expandedNodes })
  },
  toggleNode: (nodeId) => set((state) => ({
    expandedNodes: state.expandedNodes.includes(nodeId)
      ? state.expandedNodes.filter((id) => id !== nodeId)
      : [...state.expandedNodes, nodeId]
  })),
  expandNode: (nodeId) => set((state) => ({
    expandedNodes: state.expandedNodes.includes(nodeId)
      ? state.expandedNodes
      : [...state.expandedNodes, nodeId]
  })),
  collapseNode: (nodeId) => set((state) => ({
    expandedNodes: state.expandedNodes.filter((id) => id !== nodeId)
  })),
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
    expandedNodes: [],
    history: []
  })
}))
