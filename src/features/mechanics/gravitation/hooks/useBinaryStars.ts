import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import {
  evaluateBinaryStarsState,
  evaluateTripleStarsState,
  MULTI_STAR_DEFAULT_PARAMS,
  MULTI_STAR_DISTANCE_UNIT_M,
  MULTI_STAR_TIME_SCALE,
  type CelestialVec2,
} from '@/physics/celestial'
import { SECONDS_PER_DAY, SOLAR_MASS } from '@/physics/constants'

export type BinaryStarsState =
  | {
      mode: 0
      /** 间距 L (×10¹⁰ m) */
      L: number
      /** 间距 L (m) */
      LMeters: number
      massRatio: number
      /** 轨道周期 (s) */
      T: number
      /** 轨道周期 (d) */
      TDays: number
      /** 当前物理时刻 (s) */
      tPhys: number
      /** 当前物理时刻在一个周期内的相位对应天数 (d) */
      curTDays: number
      r1: number
      r2: number
      pos1: CelestialVec2
      pos2: CelestialVec2
      forceDir1: CelestialVec2
      forceDir2: CelestialVec2
      vel1: CelestialVec2
      vel2: CelestialVec2
      v1: number
      v2: number
      omega: number
      F: number
      a1: number
      a2: number
      m1: number
      m2: number
      m1Solar: number
      m2Solar: number
    }
  | {
      mode: 1
      /** 边长 L (×10¹⁰ m) */
      L: number
      /** 边长 L (m) */
      LMeters: number
      starMass: number
      starMassSolar: number
      /** 轨道周期 (s) */
      T: number
      /** 轨道周期 (d) */
      TDays: number
      /** 当前物理时刻 (s) */
      tPhys: number
      /** 当前物理时刻在一个周期内的相位对应天数 (d) */
      curTDays: number
      r: number
      pos1: CelestialVec2
      pos2: CelestialVec2
      pos3: CelestialVec2
      vel1: CelestialVec2
      vel2: CelestialVec2
      vel3: CelestialVec2
      forceNetDir1: CelestialVec2
      forceNetDir2: CelestialVec2
      forceNetDir3: CelestialVec2
      force12Dir: CelestialVec2
      force13Dir: CelestialVec2
      v: number
      omega: number
      fNet: number
      fPair: number
      a: number
    }

/**
 * 双星 / 三星系统派生物理状态 Hook（纯物理量，不返回任何像素或缩放系数）。
 */
export function useBinaryStars(): BinaryStarsState {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  const mode = params.mode ?? MULTI_STAR_DEFAULT_PARAMS.mode
  const L = params.L ?? MULTI_STAR_DEFAULT_PARAMS.L
  const massRatio = params.massRatio ?? MULTI_STAR_DEFAULT_PARAMS.massRatio

  return useMemo(() => {
    const LMeters = L * MULTI_STAR_DISTANCE_UNIT_M
    const tPhys = time * MULTI_STAR_TIME_SCALE

    if (mode === 1) {
      const s = evaluateTripleStarsState(LMeters, tPhys)
      const curTPhys = s.T > 0 ? tPhys % s.T : 0
      return {
        mode: 1 as const,
        L,
        LMeters,
        starMass: s.starMass,
        starMassSolar: s.starMass / SOLAR_MASS,
        T: s.T,
        TDays: s.T / SECONDS_PER_DAY,
        tPhys,
        curTDays: curTPhys / SECONDS_PER_DAY,
        r: s.r,
        pos1: s.pos1,
        pos2: s.pos2,
        pos3: s.pos3,
        vel1: s.vel1,
        vel2: s.vel2,
        vel3: s.vel3,
        forceNetDir1: s.forceNetDir1,
        forceNetDir2: s.forceNetDir2,
        forceNetDir3: s.forceNetDir3,
        force12Dir: s.force12Dir,
        force13Dir: s.force13Dir,
        v: s.v,
        omega: s.omega,
        fNet: s.fNet,
        fPair: s.fPair,
        a: s.a,
      }
    }

    const s = evaluateBinaryStarsState(LMeters, massRatio, tPhys)
    const curTPhys = s.T > 0 ? tPhys % s.T : 0
    return {
      mode: 0 as const,
      L,
      LMeters,
      massRatio,
      T: s.T,
      TDays: s.T / SECONDS_PER_DAY,
      tPhys,
      curTDays: curTPhys / SECONDS_PER_DAY,
      r1: s.r1,
      r2: s.r2,
      pos1: s.pos1,
      pos2: s.pos2,
      forceDir1: s.forceDir1,
      forceDir2: s.forceDir2,
      vel1: s.vel1,
      vel2: s.vel2,
      v1: s.v1,
      v2: s.v2,
      omega: s.omega,
      F: s.F,
      a1: s.a1,
      a2: s.a2,
      m1: s.m1,
      m2: s.m2,
      m1Solar: s.m1 / SOLAR_MASS,
      m2Solar: s.m2 / SOLAR_MASS,
    }
  }, [mode, L, massRatio, time])
}
