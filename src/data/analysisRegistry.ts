import { allProblems, getProblemById } from './problems'

export interface AnalysisEntry {
  id: string
  title: string
  year: number
  province: string
  difficulty: 1 | 2 | 3 | 4 | 5
  knowledgeIds: string[]
}

export const analysisRegistry: Record<string, AnalysisEntry> = {}

allProblems.forEach(problem => {
  analysisRegistry[problem.id] = {
    id: problem.id,
    title: problem.title,
    year: problem.year,
    province: problem.province,
    difficulty: problem.difficulty,
    knowledgeIds: problem.knowledgeIds,
  }
})

export { getProblemById }

export function getAnalysisEntry(id: string): AnalysisEntry | undefined {
  return analysisRegistry[id]
}

export function getAllAnalysisEntries(): AnalysisEntry[] {
  return Object.values(analysisRegistry)
}

export function getEntriesByKnowledgeId(knowledgeId: string): AnalysisEntry[] {
  return Object.values(analysisRegistry).filter(entry =>
    entry.knowledgeIds.includes(knowledgeId)
  )
}

export function getEntriesByDifficulty(difficulty: number): AnalysisEntry[] {
  return Object.values(analysisRegistry).filter(
    entry => entry.difficulty === difficulty
  )
}

export function getEntriesByYear(year: number): AnalysisEntry[] {
  return Object.values(analysisRegistry).filter(entry => entry.year === year)
}

export function getEntriesByProvince(province: string): AnalysisEntry[] {
  return Object.values(analysisRegistry).filter(
    entry => entry.province === province
  )
}
