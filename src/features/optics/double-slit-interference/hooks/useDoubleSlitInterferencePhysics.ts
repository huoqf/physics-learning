import { useMemo } from 'react'

interface UseDoubleSlitInterferencePhysicsParams {
  wavelength: number      // 波长 nm (400 ~ 700)
  slitDistance: number    // 双缝间距 mm (0.1 ~ 0.5)
  screenDistance: number  // 缝屏距离 m (0.5 ~ 2.0)
  time: number            // 时间 s
}

export interface DoubleSlitInterferencePhysicsResult {
  fringeSpacing: number   // 条纹物理间距 mm
  wavelengthColor: string // 波长对应的 HEX 颜色
  wavefronts: number[]    // 波前半圆半径数组 (像素)
  intensityPath: string   // 光强曲线的 SVG Path
  fringeOffset: number    // 光波波动相位偏移 (像素)
}

/**
 * 简易光谱波长到 RGB hex 的物理映射 (400nm - 700nm)
 */
export function wavelengthToHex(wl: number): string {
  let r = 0, g = 0, b = 0
  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / (440 - 380)
    g = 0
    b = 1.0
  } else if (wl >= 440 && wl < 490) {
    r = 0
    g = (wl - 440) / (490 - 440)
    b = 1.0
  } else if (wl >= 490 && wl < 510) {
    r = 0
    g = 1.0
    b = -(wl - 510) / (510 - 490)
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / (580 - 510)
    g = 1.0
    b = 0
  } else if (wl >= 580 && wl < 645) {
    r = 1.0
    g = -(wl - 645) / (645 - 580)
    b = 0
  } else if (wl >= 645 && wl <= 780) {
    r = 1.0
    g = 0
    b = 0
  } else {
    r = 1.0
    g = 1.0
    b = 1.0
  }

  // 边缘波长强度衰减
  let factor = 1.0
  if (wl >= 380 && wl < 420) {
    factor = 0.3 + 0.7 * (wl - 380) / (420 - 380)
  } else if (wl >= 700 && wl <= 780) {
    factor = 0.3 + 0.7 * (780 - wl) / (780 - 700)
  }

  const to255 = (val: number) => Math.round(Math.min(255, Math.max(0, val * factor * 255)))
  const hexR = to255(r).toString(16).padStart(2, '0')
  const hexG = to255(g).toString(16).padStart(2, '0')
  const hexB = to255(b).toString(16).padStart(2, '0')
  return `#${hexR}${hexG}${hexB}`
}

/**
 * 计算光的双缝干涉物理状态
 */
export function useDoubleSlitInterferencePhysics({
  wavelength,
  slitDistance,
  screenDistance,
  time,
}: UseDoubleSlitInterferencePhysicsParams): DoubleSlitInterferencePhysicsResult {
  return useMemo(() => {
    // 1. 物理条纹间距: Δx = (L / d) * λ
    // L(m) / d(mm) * λ(nm) * 10^-3 = Δx(mm)
    const fringeSpacing = (screenDistance / slitDistance) * wavelength * 1e-3

    // 2. 映射波长到颜色
    const wavelengthColor = wavelengthToHex(wavelength)

    // 3. 计算视觉条纹间距像素大小
    // 以默认参数（L=1.0, d=0.2, λ=650）为基准，像素间距为 150px
    const baseSpacingPx = 30
    let fringeSpacingPx = (screenDistance / slitDistance) * (wavelength / 650) * baseSpacingPx
    // 限制在合理范围，防止图形超出或渲染异常
    fringeSpacingPx = Math.max(6, Math.min(400, fringeSpacingPx))

    // 4. 计算光强分布曲线 (垂直分布)
    // 屏中心 y = 325，采样高度 y 从 120 到 530 (高 410px)
    const centerY = 325
    const startY = 120
    const endY = 530
    const intensityMaxX = 70 // 光强曲线的最大宽度（像素）
    const curveBaseX = 720  // 光强曲线基线 X 坐标
    const points: string[] = []

    for (let y = startY; y <= endY; y += 2) {
      const dy = y - centerY
      const val = Math.cos((Math.PI * dy) / fringeSpacingPx)
      const intensity = val * val // 相对光强 I/I_0 = cos^2(π*y/Δy)
      const x = curveBaseX + intensity * intensityMaxX
      points.push(`${x.toFixed(1)},${y}`)
    }
    const intensityPath = `M ${curveBaseX},${startY} L ` + points.join(' L ') + ` L ${curveBaseX},${endY} Z`

    // 5. 波前扩散计算 (动画)
    // 视觉波长随真实波长变大而变大，基准波长 650nm 对应 40px
    const visWavelength = (wavelength / 650) * 40
    const visSpeed = 40 // 40 像素/秒
    const waveOffset = (time * visSpeed) % visWavelength

    // 计算双缝到光屏之间的扩散波前半径
    // 双缝在 x = 240，光屏在 x = 640，物理传播距离视觉上为 400px
    const maxRadius = 400
    const wavefronts: number[] = []
    let r = waveOffset
    while (r < maxRadius) {
      if (r > 0) {
        wavefronts.push(r)
      }
      r += visWavelength
    }

    return {
      fringeSpacing,
      wavelengthColor,
      wavefronts,
      intensityPath,
      fringeOffset: waveOffset,
    }
  }, [wavelength, slitDistance, screenDistance, time])
}
