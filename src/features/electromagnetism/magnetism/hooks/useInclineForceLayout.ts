import { useMemo } from 'react'
import { computeScale } from '@/utils/coordinate'
import { GRAVITY } from '@/physics/constants'
import type { AdvancedAmperePhysicsResult } from '../ampereForceModel'
import type { SceneScale } from '@/scene'

export interface UseInclineForceLayoutParams {
  w: number
  h: number
  physicsResult: AdvancedAmperePhysicsResult
  theta: number
}

/** 物理矢量→屏幕偏移（y 轴翻转） */
export const toScreenOffset = (v: { x: number; y: number }, forceScale: number) => ({
  x: v.x * forceScale,
  y: -v.y * forceScale,
})

export interface ProjectionResult {
  end: { x: number; y: number }
  slope: { x: number; y: number }
  normal: { x: number; y: number }
}

/** 将力矢量投影到斜面坐标系（沿斜面 x' + 垂直斜面 y'） */
export const projectForce = (
  v: { x: number; y: number },
  thetaRad: number,
  forceScale: number,
): ProjectionResult => {
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)
  const slopeAxis = { x: cosT, y: sinT }
  const normalAxis = { x: -sinT, y: cosT }
  const slopeComp = v.x * slopeAxis.x + v.y * slopeAxis.y
  const normalComp = v.x * normalAxis.x + v.y * normalAxis.y
  const slopeVector = { x: slopeComp * slopeAxis.x, y: slopeComp * slopeAxis.y }
  const normalVector = { x: normalComp * normalAxis.x, y: normalComp * normalAxis.y }
  return {
    end: toScreenOffset(v, forceScale),
    slope: toScreenOffset(slopeVector, forceScale),
    normal: toScreenOffset(normalVector, forceScale),
  }
}

export interface InclineForceLayoutResult {
  thetaRad: number
  m: number
  g: number
  padX: number
  padY: number
  slopeW: number
  slopeH: number
  xMin: number
  xMax: number
  rodRatio: number
  G_phys: { x: number; y: number }
  N_phys: { x: number; y: number }
  Fa_phys: { x: number; y: number }
  f_phys: { x: number; y: number }
  F_max: number
  forceScale: number
  x0: number
  y0: number
  px: number
  py: number
  rightX: number
  topY: number
  localScale: SceneScale
  G_mag: number
  G_projection: ProjectionResult
  Fa_projection: ProjectionResult
  signAxisStart: { x: number; y: number }
  signAxisEnd: { x: number; y: number }
  signAxisAngleDeg: number
}

export const useInclineForceLayout = (params: UseInclineForceLayoutParams): InclineForceLayoutResult => {
  const { w, h, physicsResult, theta } = params

  const thetaRad = (theta * Math.PI) / 180
  const m = 0.5
  const g = GRAVITY

  // 1. 初始斜面几何
  const padX = 25
  const padY = 25
  const slopeW = w - 2 * padX
  const slopeH = slopeW * Math.tan(thetaRad)

  // 2. 导体棒在斜面上的物理→像素映射
  const xMin = -1.1
  const xMax = 1.1
  const rodRatio = Math.max(0.08, Math.min(0.92, (physicsResult.x - xMin) / (xMax - xMin)))

  // 3. 力矢量（物理坐标，无缩放）
  const F_max = Math.max(
    m * g,
    Math.abs(physicsResult.F_ampere),
    Math.abs(physicsResult.f),
    Math.abs(physicsResult.N),
    5.0,
  )
  const forceScale = computeScale(w, h, { xMin: -F_max, xMax: F_max, yMin: -F_max, yMax: F_max })

  const G_phys = { x: 0, y: -m * g }
  const N_phys = {
    x: -physicsResult.N * Math.sin(thetaRad),
    y: physicsResult.N * Math.cos(thetaRad),
  }
  const Fa_phys = { x: physicsResult.F_ampere_x, y: physicsResult.F_ampere_y }
  const f_phys = {
    x: physicsResult.f * Math.cos(thetaRad),
    y: physicsResult.f * Math.sin(thetaRad),
  }

  // 4. 先用默认斜面位置算棒的像素坐标，再检测力矢量是否溢出 viewBox。
  //    若溢出则整体平移斜面（x0/y0），让棒心始终留足力矢量伸展空间。
  const PAD = 12
  const rawX0 = padX
  const rawY0 = h - padY
  const rawPx = rawX0 + rodRatio * slopeW
  const rawPy = rawY0 - rodRatio * slopeH

  // 力 tip 在 viewBox 坐标中的位置（以 rawPx, rawPy 为原点）
  const tipDown = m * g * forceScale
  const tipUp = Math.max(0, N_phys.y, Fa_phys.y, f_phys.y) * forceScale
  const tipLeft = Math.max(0, -N_phys.x, -Fa_phys.x, -f_phys.x) * forceScale
  const tipRight = Math.max(0, N_phys.x, Fa_phys.x, f_phys.x) * forceScale

  // 需要的平移量，使力 tip 不超出 [PAD, edge-PAD]
  let shiftX = 0
  let shiftY = 0
  if (rawPx - tipLeft < PAD) shiftX = PAD - (rawPx - tipLeft)
  if (rawPx + tipRight > w - PAD) shiftX = Math.min(shiftX, -(rawPx + tipRight - (w - PAD)))
  if (rawPy - tipUp < PAD) shiftY = PAD - (rawPy - tipUp)
  if (rawPy + tipDown > h - PAD) shiftY = Math.min(shiftY, -(rawPy + tipDown - (h - PAD)))

  // 应用平移到斜面原点（斜面超出 viewBox 无碍，棒区可见即可）
  const x0 = rawX0 + shiftX
  const y0 = rawY0 + shiftY
  const px = x0 + rodRatio * slopeW
  const py = y0 - rodRatio * slopeH

  const rightX = x0 + slopeW
  const topY = y0 - slopeH

  const localScale = useMemo<SceneScale>(() => {
    return {
      originX: px,
      originY: py,
      scaleX: forceScale,
      scaleY: forceScale,
      scale: forceScale,
      maxVectorLength: 60,
      refMagnitudes: { force: 2.0 },
    }
  }, [px, py, forceScale])

  // 正交分解
  const G_mag = m * g * forceScale
  const G_projection = projectForce(G_phys, thetaRad, forceScale)
  const Fa_projection = projectForce(Fa_phys, thetaRad, forceScale)

  // 正方向约定轴
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)
  const signAxisLen = 34
  const signAxisStart = { x: x0 + Math.min(70, slopeW * 0.25), y: y0 - 12 }
  const signAxisEnd = {
    x: signAxisStart.x + signAxisLen * cosT,
    y: signAxisStart.y - signAxisLen * sinT,
  }
  const signAxisAngleDeg =
    (Math.atan2(signAxisEnd.y - signAxisStart.y, signAxisEnd.x - signAxisStart.x) * 180) / Math.PI

  return {
    thetaRad,
    m,
    g,
    padX,
    padY,
    slopeW,
    slopeH,
    xMin,
    xMax,
    rodRatio,
    G_phys,
    N_phys,
    Fa_phys,
    f_phys,
    F_max,
    forceScale,
    x0,
    y0,
    px,
    py,
    rightX,
    topY,
    localScale,
    G_mag,
    G_projection,
    Fa_projection,
    signAxisStart,
    signAxisEnd,
    signAxisAngleDeg,
  }
}
