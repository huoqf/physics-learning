import { Problem } from '../types'
import { kinematicsProblems } from './mechanics/kinematics-sample'
import { dynamicsProblems } from './mechanics/dynamics-sample'
import { energyProblems } from './mechanics/energy-sample'
import { momentumProblems } from './mechanics/momentum-sample'
import { projectileProblems } from './mechanics/projectile-sample'
import { celestialProblems } from './mechanics/celestial-sample'
import { probBlockBoardModel } from './mechanics/prob-block-board-model'
import { masterModelProblems } from './masterProblems'
import { opticsGaokaoProblems } from './optics'
import { electromagnetismGaokaoProblems } from './electromagnetism'
import { vibrationGaokaoProblems } from './vibration'
import { experimentProblems } from './experiment'
import { inductionProblems } from './induction'
import { nuclearGaokaoProblems } from './nuclear'

export const allProblems: Problem[] = [
  probBlockBoardModel,
  ...masterModelProblems,
  ...nuclearGaokaoProblems,
  ...opticsGaokaoProblems,
  ...electromagnetismGaokaoProblems,
  ...vibrationGaokaoProblems,
  ...experimentProblems,
  ...inductionProblems,
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
