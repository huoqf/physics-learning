import { Problem } from '../types'
import { kinematicsProblems } from './mechanics/kinematics-sample'
import { dynamicsProblems } from './mechanics/dynamics-sample'
import { energyProblems } from './mechanics/energy-sample'
import { momentumProblems } from './mechanics/momentum-sample'
import { projectileProblems } from './mechanics/projectile-sample'
import { celestialProblems } from './mechanics/celestial-sample'
import { prob2024Quanguo21 } from './mechanics/prob-2024-quanguo-21'
import { masterModelProblems } from './masterProblems'

export const allProblems: Problem[] = [
  prob2024Quanguo21,
  ...masterModelProblems,
  ...kinematicsProblems,
  ...dynamicsProblems,
  ...energyProblems,
  ...momentumProblems,
  ...projectileProblems,
  ...celestialProblems
]

export const problemIndex: Record<string, Problem> = {}
allProblems.forEach(p => {
  problemIndex[p.id] = p
})

export function getProblemById(id: string): Problem | undefined {
  return problemIndex[id]
}

export function getProblemsByKnowledgeId(knowledgeId: string): Problem[] {
  return allProblems.filter(p => p.knowledgeIds.includes(knowledgeId))
}

export function getProblemsByModule(module: string): Problem[] {
  return allProblems.filter(p => {
    return p.knowledgeIds.some(kid => kid.startsWith(module))
  })
}

export function getProblemsByDifficulty(difficulty: number): Problem[] {
  return allProblems.filter(p => p.difficulty === difficulty)
}
