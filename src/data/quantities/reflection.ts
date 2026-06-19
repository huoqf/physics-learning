import type { PhysicsPanelData } from './types'
import { calculateReflection, calculateMirrorRotationEffect } from '../../physics/reflection'

export function buildReflectionQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-reflection') return null

  const theta1 = params.theta1 ?? 45
  const mirrorRotation = params.mirrorRotation ?? 0
  const advancedMode = params.advancedMode ?? 0

  const { theta2_deg } = calculateReflection(theta1)

  const quantities: PhysicsPanelData['quantities'] = [
    { label: '入射角 θ₁', value: theta1, unit: '°' },
    { label: '反射角 θ₂', value: theta2_deg, unit: '°', highlight: 'positive' as const },
  ]

  if (advancedMode === 1) {
    const { normalDeflection, reflectedRayDeflection } = calculateMirrorRotationEffect(mirrorRotation)
    quantities.push(
      { label: '法线偏转', value: normalDeflection, unit: '°' },
      { label: '反射光偏转', value: reflectedRayDeflection, unit: '°', highlight: 'extreme' as const },
    )
  }

  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '反射定律',
      latex: '\\theta_1 = \\theta_2',
      condition: '入射光线、法线、反射光线在同一平面内，分居法线两侧',
      level: 'core',
    },
  ]

  if (advancedMode === 1) {
    formulas.push({
      name: '镜面旋转',
      latex: '\\Delta\\theta = 2\\Delta\\alpha',
      condition: '镜面旋转 Δα 时，法线同步转动 Δα，反射光线偏转 2Δα',
      level: 'important',
    })
  }

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    { text: '反射定律：反射角恒等于入射角', importance: 'core' },
  ]

  if (advancedMode === 1) {
    gaokaoPoints.push(
      { text: '平面镜旋转模型（★五星考点）：反射光偏转 2Δα', importance: 'gaokao' },
      { text: '入射光不动，镜面转 Δα → 法线转 Δα → 反射光偏 2Δα', importance: 'hard' },
    )
  }

  const warnings: PhysicsPanelData['warnings'] = advancedMode === 1 && Math.abs(mirrorRotation) > 0.5
    ? [{ text: '镜面转 Δα 时反射光偏转 2Δα，不是 Δα！', level: 'danger' }]
    : []

  return { quantities, formulas, gaokaoPoints, warnings }
}
