import { AnimationConfig } from './types'

// ─── Core: 力学 6 子模块（同步加载） ───

import { mechanicsKinematicsAnimations } from './registries/mechanics-kinematics'
import { mechanicsDynamicsAnimations } from './registries/mechanics-dynamics'
import { mechanicsCircularGravitationAnimations } from './registries/mechanics-circular-gravitation'
import { mechanicsForceMotionAnimations } from './registries/mechanics-force-motion'
import { mechanicsEnergyAnimations } from './registries/mechanics-energy'
import { mechanicsMomentumAnimations } from './registries/mechanics-momentum'

const coreRegistry: Record<string, AnimationConfig> = {
  ...mechanicsKinematicsAnimations,
  ...mechanicsDynamicsAnimations,
  ...mechanicsCircularGravitationAnimations,
  ...mechanicsForceMotionAnimations,
  ...mechanicsEnergyAnimations,
  ...mechanicsMomentumAnimations,
}

// ─── Extended: 电磁学 5 + 热学 4 + 光学 4 + 振动 1 + 组合场 1（懒加载） ───

let fullRegistry: Record<string, AnimationConfig> = { ...coreRegistry }
let extendedLoaded = false
let extendedPromise: Promise<void> | null = null

async function loadExtendedRegistry(): Promise<void> {
  if (extendedLoaded) return
  if (!extendedPromise) {
    extendedPromise = (async () => {
      const [
        { electromagnetismElectrostaticsAnimations: emElectrostatics },
        { electromagnetismDcCircuitsAnimations: emDcCircuits },
        { electromagnetismMagnetismAnimations: emMagnetism },
        { electromagnetismInductionAnimations: emInduction },
        { electromagnetismAcAnimations: emAc },
        { thermodynamicsKinematicsAnimations: thermoKinematics },
        { thermodynamicsGasLawsAnimations: thermoGasLaws },
        { thermodynamicsFirstLawAnimations: thermoFirstLaw },
        { thermodynamicsSecondLawAnimations: thermoSecondLaw },
        { opticsReflectionAnimations: opticsReflection },
        { opticsRefractionAnimations: opticsRefraction },
        { opticsTotalInternalReflectionAnimations: opticsTotalInternalReflection },
        { opticsThinLensAnimations: opticsThinLens },
        { opticsInterferenceAnimations: opticsInterference },
        { opticsDiffractionAnimations: opticsDiffraction },
        { opticsPolarizationAnimations: opticsPolarization },
        { opticsLaserAnimations: opticsLaser },
        { modernPhysicsAnimations: modernPhysics },
        { vibrationOscillationAnimations: vibrationOsc },
        { combinedFieldsAnimations: combinedFields },
      ] = await Promise.all([
        import('./registries/electromagnetism-electrostatics'),
        import('./registries/electromagnetism-dc-circuits'),
        import('./registries/electromagnetism-magnetism'),
        import('./registries/electromagnetism-induction'),
        import('./registries/electromagnetism-ac'),
        import('./registries/thermodynamics-kinematics'),
        import('./registries/thermodynamics-gas-laws'),
        import('./registries/thermodynamics-first-law'),
        import('./registries/thermodynamics-second-law'),
        import('./registries/optics-reflection'),
        import('./registries/optics-refraction'),
        import('./registries/optics-total-internal-reflection'),
        import('./registries/optics-thin-lens'),
        import('./registries/optics-interference'),
        import('./registries/optics-diffraction'),
        import('./registries/optics-polarization'),
        import('./registries/optics-laser'),
        import('./registries/modern-physics'),
        import('./registries/vibration-oscillation'),
        import('./registries/electromagnetism-combined-fields'),
      ])

      Object.assign(
        fullRegistry,
        emElectrostatics, emDcCircuits, emMagnetism, emInduction, emAc,
        thermoKinematics, thermoGasLaws, thermoFirstLaw, thermoSecondLaw,
        opticsReflection, opticsRefraction, opticsTotalInternalReflection, opticsThinLens, opticsInterference,
        opticsDiffraction, opticsPolarization, opticsLaser,
        modernPhysics,
        vibrationOsc,
        combinedFields,
      )
      extendedLoaded = true
    })()
  }
  await extendedPromise
}

// ─── 公共 API ───

/** 静态总动画数（含 core + 懒加载 extended registry），新增/删除动画时需同步更新 */
export const ANIMATION_COUNT = 98

/** 同步获取 config（core 动画立即命中，extended 动画未加载时返回 undefined） */
export function getAnimationConfig(id: string): AnimationConfig | undefined {
  return fullRegistry[id]
}

/** 异步获取 config（extended 动画自动触发懒加载） */
export async function getAnimationConfigAsync(id: string): Promise<AnimationConfig | undefined> {
  if (!fullRegistry[id]) {
    await loadExtendedRegistry()
  }
  return fullRegistry[id]
}

/** 预加载 extended registry（进入电磁/热学/光学模块页时调用） */
export function preloadExtendedRegistry(): void {
  if (!extendedLoaded && !extendedPromise) {
    extendedPromise = loadExtendedRegistry()
  }
}

export { defineAnimations } from './defineAnimations'
