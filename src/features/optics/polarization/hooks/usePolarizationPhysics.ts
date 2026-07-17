import { useMemo } from 'react'
import { calculateMalusLaw, calculate3DGlassesTransmission, calculateReflectionPolarization } from '@/physics/optics'

interface UsePolarizationPhysicsParams {
  mode: number         // 0: 双偏振片演示, 1: 3D立体眼镜, 2: 消除反光
  polarizerAngle: number // 模式0：起偏角 theta_1 (度)
  analyzerAngle: number  // 模式0：检偏角 theta_2 (度)
  glassesAngle: number   // 模式1：眼镜倾角 alpha (度)
  filterAngle: number    // 模式2：偏振滤光镜夹角 theta (度)
  time: number          // 时间 s
}

export interface PolarizationWavePoint {
  x: number
  y: number
  opacity?: number
}

export interface PolarizationPhysicsResult {
  intensity: number        // 最终透射强度比例 I/I0 (0~1)
  angleDiff: number        // 夹角差度数
  // 模式0专属
  naturalWaves: PolarizationWavePoint[][] // 自然光段的几条交织波线
  polarizedWave: PolarizationWavePoint[]  // 起偏到检偏段的波线
  transmittedWave: PolarizationWavePoint[] // 检偏到屏幕段的波线
  
  // 模式1专属 (3D眼镜)
  leftWaveL: PolarizationWavePoint[]  // 左投影光(偏振角+45°)通过左眼镜片后的波
  leftWaveR: PolarizationWavePoint[]  // 右投影光(偏振角-45°)通过左眼镜片后的波 (漏光)
  rightWaveR: PolarizationWavePoint[] // 右投影光(偏振角-45°)通过右眼镜片后的波
  rightWaveL: PolarizationWavePoint[] // 左投影光(偏振角+45°)通过右眼镜片后的波 (漏光)
  intensityLL: number  // 左眼镜片透过左光强度
  intensityLR: number  // 左眼镜片透过右光强度 (漏光)
  intensityRR: number  // 右眼镜片透过右光强度
  intensityRL: number  // 右眼镜片透过左光强度 (漏光)

  // 模式2专属 (消除反光)
  reflectionWave: PolarizationWavePoint[] // 反射的眩光波段 (水平偏振)
  reflectionTransmitted: PolarizationWavePoint[] // 反射光透过偏振滤镜后的波
  fishWave: PolarizationWavePoint[] // 水底自然光段
  fishTransmitted: PolarizationWavePoint[] // 鱼光透过偏振滤镜后的波
  intensityRef: number // 反射眩光透射比例 (0~1)
  intensityFish: number // 鱼的光透射比例 (通常是恒定 0.5)
}

/**
 * 光的偏振物理模型计算
 */
export function usePolarizationPhysics({
  mode,
  polarizerAngle,
  analyzerAngle,
  glassesAngle,
  filterAngle,
  time,
}: UsePolarizationPhysicsParams): PolarizationPhysicsResult {
  return useMemo(() => {
    // 基础常数
    const waveLength = 40 // 波长 px
    const omega = 12 // 角速度
    const k = (2 * Math.PI) / waveLength // 波数

    // ──────────────────────────────────────────────
    // 辅助函数：根据偏振角 phi 和起止 X 坐标生成 3D 偏振正弦波路径点
    // 3D 投影模型：设振幅为 A，振动方向为 phi（与垂直轴夹角）
    // 垂直位移: dy = A * cos(phi)
    // 深度(水平斜向)位移: dz = A * sin(phi)
    // 屏幕投影 Y 偏移: y_proj = -dy + 0.35 * dz * sin(30度) = -A * cos(phi) + 0.175 * A * sin(phi)
    // 屏幕投影 X 偏移: x_proj = x + 0.35 * dz * cos(30度) = x + 0.3 * A * sin(phi)
    // 这里的 phi 是与竖直方向（90度）的夹角
    // ──────────────────────────────────────────────
    const generate3DWave = (
      startX: number,
      endX: number,
      phiDeg: number,
      amplitude: number,
      phaseOffset: number = 0,
      t: number = time,
    ): PolarizationWavePoint[] => {
      const points: PolarizationWavePoint[] = []
      const phi = (phiDeg * Math.PI) / 180
      const step = 2 // 采样步长

      for (let x = startX; x <= endX; x += step) {
        // 波前前行相位
        const phase = k * (x - startX) - omega * t + phaseOffset
        const disp = amplitude * Math.sin(phase)

        // 偏振振动在 Y 轴 (竖直) 和 Z 轴 (进出纸面) 的分量
        const uy = disp * Math.cos(phi)
        const uz = disp * Math.sin(phi)

        // 3D 投影到屏幕上
        // 沿 X 轴方向加上向右上方的投影深度
        const xProj = x + uz * 0.25
        const yProj = -uy + uz * 0.15

        points.push({ x: xProj, y: yProj })
      }
      return points
    }

    // 初始化默认返回对象
    let intensity = 0
    let angleDiff = 0

    let naturalWaves: PolarizationWavePoint[][] = []
    let polarizedWave: PolarizationWavePoint[] = []
    let transmittedWave: PolarizationWavePoint[] = []

    let leftWaveL: PolarizationWavePoint[] = []
    let leftWaveR: PolarizationWavePoint[] = []
    let rightWaveR: PolarizationWavePoint[] = []
    let rightWaveL: PolarizationWavePoint[] = []
    let intensityLL = 1
    let intensityLR = 0
    let intensityRR = 1
    let intensityRL = 0

    let reflectionWave: PolarizationWavePoint[] = []
    let reflectionTransmitted: PolarizationWavePoint[] = []
    let fishWave: PolarizationWavePoint[] = []
    let fishTransmitted: PolarizationWavePoint[] = []
    let intensityRef = 0
    let intensityFish = 0.5

    if (mode === 0) {
      // 模式 0：双偏振片演示
      // 起偏和检偏
      angleDiff = Math.abs(analyzerAngle - polarizerAngle)
      intensity = calculateMalusLaw(angleDiff)
      const radDiff = (angleDiff * Math.PI) / 180

      const amp = 16 // 振幅

      // 自然光段 (x: 40 ~ 220)：包含 4 个不同偏振角正弦波的叠加，体现各向同性
      // 使用 0°, 45°, 90°, 135° 的四个波段，相位稍加错开
      naturalWaves = [
        generate3DWave(40, 220, 0, amp * 0.75, 0),
        generate3DWave(40, 220, 45, amp * 0.75, Math.PI / 3),
        generate3DWave(40, 220, 90, amp * 0.75, (2 * Math.PI) / 3),
        generate3DWave(40, 220, 135, amp * 0.75, Math.PI),
      ]

      // 起偏后线偏振光段 (x: 220 ~ 460)：偏振角为起偏角 polarizerAngle
      polarizedWave = generate3DWave(220, 460, polarizerAngle, amp)

      // 检偏后偏振光段 (x: 460 ~ 700)：偏振角为检偏角 analyzerAngle，振幅减小为 amp * cos(radDiff)
      const transAmp = amp * Math.cos(radDiff)
      transmittedWave = generate3DWave(460, 700, analyzerAngle, Math.abs(transAmp))
    } else if (mode === 1) {
      // 模式 1：3D 立体眼镜
      // 左投影机发出偏振角为 +45° 的左眼偏振光
      // 右投影机发出偏振角为 -45° 的右眼偏振光
      // 戴在头上的偏振眼镜，当头部倾斜 glassesAngle (alpha) 时，
      // 左镜片透振方向为 +45° + alpha，右镜片为 -45° + alpha
      const alphaRad = (glassesAngle * Math.PI) / 180
      const { intensityMain, intensityLeak } = calculate3DGlassesTransmission(glassesAngle)
      intensityLL = intensityMain
      intensityLR = intensityLeak
      intensityRR = intensityMain
      intensityRL = intensityLeak

      const baseAmp = 12

      // 生成波段 (光源到镜片：100 ~ 360 px，镜片到眼睛：360 ~ 540 px)
      // 1. 左眼通道（上路，Y 轴在 200px 附近）
      // 光源发出偏振角为 45° 的光
      leftWaveL = generate3DWave(100, 360, 45, baseAmp, 0)
      // 镜片后透射出 +45 + alpha 方向的左画面波 (振幅 baseAmp * cos(alpha))
      leftWaveR = generate3DWave(360, 540, 45 + glassesAngle, baseAmp * Math.cos(alphaRad))

      // 2. 右眼通道（下路，Y 轴在 400px 附近）
      // 光源发出偏振角为 -45° 的光
      rightWaveR = generate3DWave(100, 360, -45, baseAmp, 0)
      // 镜片后透射出 -45 + alpha 方向的右画面波 (振幅 baseAmp * cos(alpha))
      rightWaveL = generate3DWave(360, 540, -45 + glassesAngle, baseAmp * Math.cos(alphaRad))
    } else {
      // 模式 2：消除反光应用 (照相机偏振镜)
      // 太阳光斜射到水面，反射光是水平偏振的（振动方向平行于水面，偏振角设为 0° 或 180°）
      // 水底小鱼散发出自然光（无偏振），水中折射穿过水面，进入相机
      // 偏振滤光镜旋转角度为 filterAngle（相对于水平方向，所以 0° 是水平，90° 是竖直）
      
      const filterRad = (filterAngle * Math.PI) / 180
      const { intensityRef: refI, intensityFish: fishI } = calculateReflectionPolarization(filterAngle)
      intensityRef = refI
      intensityFish = fishI

      const ampRef = 14
      const ampFish = 8

      // 反射光路 (水平偏振 0°)：从反射点 (x: 280) 到滤镜 (x: 520)
      reflectionWave = generate3DWave(280, 520, 0, ampRef, 0)
      // 透过镜片后的反射光 (偏振角 filterAngle，振幅 ampRef * cos(filterAngle))
      reflectionTransmitted = generate3DWave(520, 680, filterAngle, ampRef * Math.cos(filterRad))

      // 鱼的发散光 (自然光，在水下 x: 140 到水面 x: 280)
      // 这里简画为水底向上的自然光，用 45° 和 -45° 两个波叠加表示
      fishWave = generate3DWave(140, 280, 45, ampFish, 0)
      
      // 折射出射后 (x: 280 ~ 520) 也是自然光，在滤镜前依然具有各个偏振分量，折射斜向上
      // 滤镜后折射鱼光 (x: 520 ~ 680)：只剩下 filterAngle 偏振，振幅为 ampFish * cos(filterAngle - 某个分量)
      // 简单起见，鱼光在滤镜后的振幅就显示为常数 (约占 0.7 振幅) 且偏振方向为 filterAngle
      fishTransmitted = generate3DWave(520, 680, filterAngle, ampFish * 0.7)
    }

    return {
      intensity,
      angleDiff,
      naturalWaves,
      polarizedWave,
      transmittedWave,
      leftWaveL,
      leftWaveR,
      rightWaveR,
      rightWaveL,
      intensityLL,
      intensityLR,
      intensityRR,
      intensityRL,
      reflectionWave,
      reflectionTransmitted,
      fishWave,
      fishTransmitted,
      intensityRef,
      intensityFish,
    }
  }, [mode, polarizerAngle, analyzerAngle, glassesAngle, filterAngle, time])
}
