import { allProblems, getProblemById } from './problems'

export interface AnalysisEntry {
  id: string
  title: string
  year: number
  province: string
  difficulty: 1 | 2 | 3 | 4 | 5
  knowledgeIds: string[]
  dataPath: string
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
    dataPath: `src/data/problems/mechanics/${getCategoryFileName(problem.id)}`
  }
})

function getCategoryFileName(problemId: string): string {
  if (problemId.startsWith('prob-m2')) return 'kinematics-sample.ts'
  if (problemId.startsWith('prob-m3') || problemId.startsWith('prob-m4')) return 'dynamics-sample.ts'
  if (problemId.startsWith('prob-m5')) return 'projectile-sample.ts'
  if (problemId.startsWith('prob-m6')) return 'celestial-sample.ts'
  if (problemId.startsWith('prob-m7')) return 'energy-sample.ts'
  if (problemId.startsWith('prob-m8')) return 'momentum-sample.ts'
  return 'index.ts'
}

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
