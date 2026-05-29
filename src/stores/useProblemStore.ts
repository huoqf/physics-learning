import { create } from 'zustand'

interface Answer {
  stepId: string
  value: string
  isCorrect?: boolean
}

interface ProblemState {
  currentProblem: string | null
  currentStep: number
  answers: Record<string, Answer>
  setCurrentProblem: (problemId: string | null) => void
  setCurrentStep: (step: number) => void
  saveAnswer: (stepId: string, value: string, isCorrect?: boolean) => void
  clearAnswers: () => void
  reset: () => void
}

export const useProblemStore = create<ProblemState>((set) => ({
  currentProblem: null,
  currentStep: 0,
  answers: {},
  setCurrentProblem: (problemId) => set({ currentProblem: problemId }),
  setCurrentStep: (step) => set({ currentStep: step }),
  saveAnswer: (stepId, value, isCorrect) => set((state) => ({
    answers: {
      ...state.answers,
      [stepId]: { stepId, value, isCorrect }
    }
  })),
  clearAnswers: () => set({ answers: {} }),
  reset: () => set({
    currentProblem: null,
    currentStep: 0,
    answers: {}
  })
}))
