import { useMemo } from 'react'
import { wavelengthToHex } from '@/physics/optics'

export interface DiffractionPhysicsResult {
  wavelengthColor: string // 波长对应的 HEX 颜色
  wavefronts: number[][]  // 扩散波前数组。如果是单缝/圆孔是 [r]，如果是泊松亮斑是 [[r, y_offset]]
  intensityPath: string   // 光强曲线的 SVG Path
  fringeOffset: number    // 波前后移偏移量
}

interface UseDiffractionPhysicsParams {
  mode: 'single-slit' | 'circular' | 'poisson'
  wavelength: number      // 光的波长 nm (400 ~ 700)
  obstacleSize: number    // 缝宽/孔径/圆板直径 mm (0.04 ~ 0.25)
  screenDistance: number  // 缝屏距离 m (0.5 ~ 2.0)
  time: number            // 动画时间 s
}

/**
 * 一阶贝塞尔函数 J1(x) 的高精度数值逼近
 * @param x 输入参数
 */
function j1(x: number): number {
  const ax = Math.abs(x)
  if (ax < 8.0) {
    const y = x * x
    const ans1 = 1.0 - y / 8.0 + (y * y) / 192.0 - (y * y * y) / 9216.0 + (y * y * y * y) / 737280.0
    return x * 0.5 * ans1
  } else {
    const theta = ax - (3.0 * Math.PI) / 4.0
    return Math.sqrt(2.0 / (Math.PI * ax)) * Math.cos(theta) * (x < 0 ? -1 : 1)
  }
}

/**
 * 计算光的衍射物理状态 Hook
 */
export function useDiffractionPhysics({
  mode,
  wavelength,
  obstacleSize,
  screenDistance,
  time,
}: UseDiffractionPhysicsParams): DiffractionPhysicsResult {
  return useMemo(() => {
    // 1. 映射波长到 HEX 颜色
    const wavelengthColor = wavelengthToHex(wavelength)

    // 2. 根据模式计算屏上的物理特征条纹间距参数 (mm 转化为像素缩放量)
    // 基准参数下 (L = 1.0m, obstacleSize = 0.1mm, λ = 650nm) 亮斑/条纹特征宽度为 50 像素
    const baseSpacingPx = 50
    const specSpacingPx = (screenDistance / (obstacleSize * 10)) * (wavelength / 650) * baseSpacingPx

    // 条纹间距范围限制，防止图形渲染溢出或畸变
    const spacingPx = Math.max(8, Math.min(300, specSpacingPx))

    // 3. 计算光强分布曲线 (在 Y: 85 ~ 565，中心 325 之间采样，总高度 480px)
    const centerY = 325
    const startY = 85
    const endY = 565
    const intensityMaxX = 90 // 光强曲线最大突出宽度（像素）
    const curveBaseX = 690  // 光强曲线 Y 轴基线 X 坐标
    const points: string[] = []

    for (let y = startY; y <= endY; y += 1) {
      const dy = y - centerY
      let intensity = 0

      if (mode === 'single-slit') {
        // 单缝衍射光强: I = I0 * (sin(beta)/beta)^2
        // 第一个暗纹在 y - centerY = +/- spacingPx
        if (Math.abs(dy) < 1e-4) {
          intensity = 1.0
        } else {
          const beta = (Math.PI * dy) / spacingPx
          const s = Math.sin(beta) / beta
          intensity = s * s
        }
      } else if (mode === 'circular') {
        // 圆孔衍射 (艾里斑): I = I0 * (2 * J1(beta) / beta)^2
        // 第一个暗环在 beta = 3.8317 (约 1.22 * pi)，对应 dy = +/- spacingPx
        if (Math.abs(dy) < 1e-4) {
          intensity = 1.0
        } else {
          const beta = (3.8317 * dy) / spacingPx
          const j1Val = j1(beta)
          const s = (2 * j1Val) / beta
          intensity = s * s
        }
      } else if (mode === 'poisson') {
        // 泊松亮斑: 几何阴影半径为 R
        // 令阴影半径正比于圆板直径 obstacleSize，基准 (0.15mm) 对应 45 像素
        const R_shadow = (obstacleSize / 0.15) * 45
        const ady = Math.abs(dy)

        // 阴影内部光强 (ady < R_shadow)
        const w_spot = 2.5 // 极其尖锐的中心亮点宽度
        const I_spot = 0.85 * Math.exp(-(ady * ady) / (w_spot * w_spot)) // 中心极大值
        const I_shadow = I_spot + 0.05 * Math.cos((3 * Math.PI * ady) / R_shadow) * Math.cos((3 * Math.PI * ady) / R_shadow) * (1 - ady / R_shadow)

        // 阴影外部光强 (ady >= R_shadow)
        const w_period = 15.0 // 边缘条纹周期
        const I_outside = 1.0 + (0.35 * R_shadow) / Math.max(1, ady) * Math.cos((2 * Math.PI * (ady - R_shadow)) / w_period) * Math.exp(-(ady - R_shadow) / (2.5 * R_shadow))

        // 使用 Sigmoid 进行边界平滑过渡
        const t = 1 / (1 + Math.exp(-(ady - R_shadow) / 2))
        intensity = (1 - t) * I_shadow + t * I_outside
        intensity = Math.max(0, Math.min(1.5, intensity)) // 限制在合理范围
      }

      // 将光强映射为曲线上的 X 坐标 (曲线朝右突出)
      const x = curveBaseX + Math.min(1, intensity) * intensityMaxX
      points.push(`${x.toFixed(1)},${y}`)
    }
    const intensityPath = `M ${curveBaseX},${startY} L ` + points.join(' L ') + ` L ${curveBaseX},${endY} Z`

    // 4. 计算波前扩散轨迹 (随时间 time 变化)
    // 视觉波长随真实波长变大而变大，基准波长 650nm 对应 40px
    const visWavelength = (wavelength / 650) * 40
    const visSpeed = 40 // 40 像素/秒
    const waveOffset = (time * visSpeed) % visWavelength

    // 缝 (x=220) 到侧视屏 (screenX = 220 + 200 + (screenDistance - 0.5) * 120) 的物理距离
    const dynamicScreenDist = 200 + (screenDistance - 0.5) * 120
    const maxRadius = dynamicScreenDist
    const wavefronts: number[][] = []

    if (mode === 'poisson') {
      // 泊松亮斑波前：光波绕过圆盘边缘（即从圆盘上、下边缘出射）在几何阴影内外交相干涉
      // 障碍物在 x = 220，中心 y = 325。阻挡盘直径 d_vis
      const d_vis = (obstacleSize / 0.15) * 40

      let r = waveOffset
      while (r < maxRadius) {
        if (r > 0) {
          // 存储格式：[半径, y 轴偏移量 (相对于中心 325)]
          wavefronts.push([r, -d_vis / 2])
          wavefronts.push([r, d_vis / 2])
        }
        r += visWavelength
      }
    } else {
      // 单缝或圆孔：从缝中心 (x = 220, y = 325) 出射圆弧波前
      let r = waveOffset
      while (r < maxRadius) {
        if (r > 0) {
          wavefronts.push([r, 0])
        }
        r += visWavelength
      }
    }

    return {
      wavelengthColor,
      wavefronts,
      intensityPath,
      fringeOffset: waveOffset,
    }
  }, [mode, wavelength, obstacleSize, screenDistance, time])
}
