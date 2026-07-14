import { useMemo } from 'react'

export interface ParticleFamilyItem {
  initX: number
  vVal: number
  theta: number
  isFocus: boolean
}

export function useParticleFamily(
  mode: number,
  dynamicType: number,
  v: number,
  activeTheta: number,
  R: number
): ParticleFamilyItem[] {
  return useMemo(() => {
    if (mode === 0) return []

    const list: ParticleFamilyItem[] = []
    if (dynamicType === 0) {
      // 旋转圆：同速不同向
      const angles = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165]
      const uniqueAngles = Array.from(new Set([...angles, activeTheta])).sort((a, b) => a - b)
      for (const ang of uniqueAngles) {
        list.push({
          initX: 0,
          vVal: v,
          theta: ang,
          isFocus: ang === activeTheta
        })
      }
    } else if (dynamicType === 1) {
      // 缩放圆：同向不同速
      const speeds = [v * 0.4, v * 0.6, v * 0.8, v * 1.0, v * 1.2, v * 1.4, v * 1.6]
      const uniqueSpeeds = Array.from(new Set([...speeds, v])).sort((a, b) => a - b)
      for (const spd of uniqueSpeeds) {
        list.push({
          initX: 0,
          vVal: spd,
          theta: activeTheta,
          isFocus: Math.abs(spd - v) < 1e-3
        })
      }
    } else {
      // 平移圆：同速同向不同入射点
      const positions = [-2.0 * R, -1.3 * R, -0.6 * R, 0, 0.6 * R, 1.3 * R, 2.0 * R]
      for (const pos of positions) {
        list.push({
          initX: pos,
          vVal: v,
          theta: activeTheta,
          isFocus: pos === 0
        })
      }
    }
    return list
  }, [mode, dynamicType, v, activeTheta, R])
}
