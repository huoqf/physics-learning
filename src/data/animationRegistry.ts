import { AnimationConfig } from './types'

export const animationRegistry: Record<string, AnimationConfig> = {}

export function getAnimationConfig(id: string): AnimationConfig | undefined {
  return animationRegistry[id]
}
