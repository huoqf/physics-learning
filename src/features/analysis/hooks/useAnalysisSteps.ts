import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAnalysisEntry, getProblemById } from '@/data/analysisRegistry'
import { useWrongStore } from '@/stores'

export function useAnalysisSteps() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]))
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const analysisEntry = id ? getAnalysisEntry(id) : undefined
  const problem = id ? getProblemById(id) : undefined

  const wrongRecord = useWrongStore((s) => s.records.find((r) => r.problemId === id))
  const hydrateWrong = useWrongStore((s) => s.hydrate)
  const addWrong = useWrongStore((s) => s.addWrong)
  const markViewed = useWrongStore((s) => s.markViewed)
  const markMastered = useWrongStore((s) => s.markMastered)

  useEffect(() => {
    void hydrateWrong()
  }, [hydrateWrong])

  // 进入已收录错题的解析页 → 标记"已查看"
  useEffect(() => {
    if (wrongRecord && wrongRecord.status === 'new') {
      markViewed(wrongRecord.problemId)
    }
  }, [wrongRecord, markViewed])

  const completedKnowledgeIds = useMemo(() => {
    const completed = new Set<string>()
    for (let i = 0; i < currentStepIndex; i++) {
      const step = problem?.steps[i]
      if (step?.knowledgeId) {
        completed.add(step.knowledgeId)
      }
    }
    return completed
  }, [problem, currentStepIndex])

  const currentStepKnowledgeId = useMemo(() => {
    return problem?.steps[currentStepIndex]?.knowledgeId
  }, [problem, currentStepIndex])

  const toggleStep = useCallback((index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        if (next.size >= 2) {
          const firstItem = next.values().next().value as number | undefined
          if (firstItem !== undefined) {
            next.delete(firstItem)
          }
        }
        next.add(index)
      }
      return next
    })
  }, [])

  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1
      setCurrentStepIndex(newIndex)
      setExpandedSteps(new Set([newIndex]))
    }
  }, [currentStepIndex])

  const goToNextStep = useCallback(() => {
    if (problem && currentStepIndex < problem.steps.length - 1) {
      const newIndex = currentStepIndex + 1
      setCurrentStepIndex(newIndex)
      setExpandedSteps(new Set([newIndex]))
    }
  }, [problem, currentStepIndex])

  const handleAnimationClick = useCallback(
    (animId: string) => {
      window.open(`/#/animation/${animId}`, '_blank')
    },
    []
  )

  const getStepStatus = useCallback((index: number): 'unreached' | 'current' | 'completed' => {
    if (index < currentStepIndex) return 'completed'
    if (index === currentStepIndex) return 'current'
    return 'unreached'
  }, [currentStepIndex])

  return {
    id,
    navigate,
    problem,
    analysisEntry,
    wrongRecord,
    addWrong,
    markMastered,
    expandedSteps,
    currentStepIndex,
    completedKnowledgeIds,
    currentStepKnowledgeId,
    toggleStep,
    goToPrevStep,
    goToNextStep,
    handleAnimationClick,
    getStepStatus,
    hydrateWrong,
  }
}