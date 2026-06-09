import { AnimationConfig } from './types'

export function defineAnimations(
  configs: Record<string, Omit<AnimationConfig, 'id'>>
): Record<string, AnimationConfig> {
  return Object.fromEntries(
    Object.entries(configs).map(([id, config]) => [id, { ...config, id }])
  )
}
