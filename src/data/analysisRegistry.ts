import { Problem } from './types'

export const analysisRegistry: Record<string, Problem> = {}

export function getProblem(id: string): Problem | undefined {
  return analysisRegistry[id]
}
