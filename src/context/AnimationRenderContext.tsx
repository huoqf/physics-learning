import React, { createContext, useContext, useMemo } from 'react'

export type AnimationRenderRole = 'normal' | 'ghost' | 'strobe'

export interface AnimationStoreOverride {
  params?: Record<string, number>
  time?: number
  renderRole: Exclude<AnimationRenderRole, 'normal'>
}

const AnimationStoreOverrideContext = createContext<AnimationStoreOverride | null>(null)

/**
 * 为对照组（Ghost）或频闪残影（Strobe）提供隔离的只读参数/时刻上下文，
 * 由 useAnimationStore 读取并屏蔽副本内的写入动作。
 */
export const AnimationStoreOverrideProvider: React.FC<{
  params?: Record<string, number>
  time?: number
  renderRole: Exclude<AnimationRenderRole, 'normal'>
  children: React.ReactNode
}> = ({ params, time, renderRole, children }) => {
  const value = useMemo<AnimationStoreOverride>(
    () => ({ params, time, renderRole }),
    [params, time, renderRole],
  )
  return (
    <AnimationStoreOverrideContext.Provider value={value}>
      {children}
    </AnimationStoreOverrideContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnimationStoreOverride(): AnimationStoreOverride | null {
  return useContext(AnimationStoreOverrideContext)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnimationRenderRole(): AnimationRenderRole {
  return useContext(AnimationStoreOverrideContext)?.renderRole ?? 'normal'
}
