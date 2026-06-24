import { createContext, useContext } from 'react'
import type { SceneLayoutProfile } from '@/scene'

export const AnimationLayoutContext = createContext<SceneLayoutProfile | undefined>(undefined)

export function useAnimationLayout(): SceneLayoutProfile | undefined {
  return useContext(AnimationLayoutContext)
}
