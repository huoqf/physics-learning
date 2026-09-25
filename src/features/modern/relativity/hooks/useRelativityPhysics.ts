import { useMemo } from 'react'
import {
  calcLorentzFactor,
  calcLengthContraction,
  calcRelativisticEnergy,
} from '@/physics/relativity'

export interface UseRelativityPhysicsOptions {
  /** 速度与光速比 v/c，范围 0.1 ~ 0.95 */
  beta: number
  /** 静止质量 m0 (kg) */
  m0: number
  /** 当前动画进度时间 (秒) */
  time: number
  /** 模式: 0-光钟与时间延缓, 1-尺缩效应, 2-质速与质能方程 */
  mode: number
  /** 是否显示几何辅助线与勾股定理推导 */
  showGeometry: boolean
}

export function useRelativityPhysics({
  beta,
  m0,
  time,
  mode,
  showGeometry,
}: UseRelativityPhysicsOptions) {
  return useMemo(() => {
    const clampedBeta = Math.min(Math.max(beta, 0.05), 0.95)
    const gamma = calcLorentzFactor(clampedBeta)

    // 飞船静止长度（设计单位像素）
    const shipL0 = 180
    // 地面观测到的运动飞船长度
    const shipL = calcLengthContraction(shipL0, clampedBeta)

    // 光钟高度（两反光镜间距，像素）
    const clockH = 140

    // 光钟往返周期：飞船参考系中固有时间周期 T0 = 2h / c
    // 为配合动画平滑演示，将固有单程反弹时间标定为 tauHalf = 1.0 秒
    const tauHalf = 1.0
    const tauCycle = 2.0 * tauHalf

    // 飞船参考系内光脉冲位置 (y0 从 0 到底部 mirror，再到顶部 mirror)
    // 飞船光钟：光脉冲垂直往返
    // phase0 in [0, 1)
    const tauNormalized = (time % tauCycle) / tauCycle
    const tauPhase = tauNormalized < 0.5 ? tauNormalized * 2 : (1 - tauNormalized) * 2
    // y 坐标从下底镜 (y=clockH) 到上顶镜 (y=0)
    const pulseY0 = clockH * (1 - tauPhase)

    // 地面参考系内光脉冲与飞船位置：
    // 地面观测：周期为 tCycle = gamma * tauCycle
    // 飞船在地面系以速度 v = beta * c 水平向右运行
    // 设计水平总巡航跨度 680 px
    const cruiseWidth = 640
    // 飞船在水平方向匀速往返或平移巡航
    const shipSpeedPxPerSec = 160 * clampedBeta
    const shipDist = (time * shipSpeedPxPerSec) % cruiseWidth
    const shipX = 100 + shipDist

    // 地面系的光脉冲垂直坐标（同样经历单程与回程）
    // 地面时钟经历时间为 t = time
    // 但在地面系看来，飞船内部的事件变慢：飞船时钟走过的读数为 tau = time / gamma
    const groundObservedTau = time / gamma
    const groundTauNormalized = (groundObservedTau % tauCycle) / tauCycle
    const groundPulsePhase =
      groundTauNormalized < 0.5 ? groundTauNormalized * 2 : (1 - groundTauNormalized) * 2
    const pulseYGround = clockH * (1 - groundPulsePhase)

    // 地面系光走过的半程底边与斜边几何（用于勾股定理直角三角形展示）
    // 设半程飞船移动距离 deltaX_half = 140 * clampedBeta * gamma
    // 为美观教学展示，直接采用标准比例尺：
    // 竖直高度 H = clockH = 140
    // 水平底边 X = H * (beta / sqrt(1 - beta^2)) = H * beta * gamma
    const triangleH = clockH
    const triangleBase = triangleH * clampedBeta * gamma
    const triangleHypotenuse = triangleH * gamma

    // 时钟表盘角度（360度旋转）：
    // 地面时钟：按照标准时间每秒旋转 60 度
    const groundClockAngle = (time * 60) % 360
    // 飞船内部时钟（动钟走得慢）：每秒旋转 60 / gamma 度
    const shipClockAngle = ((time / gamma) * 60) % 360

    // 质能数据
    const energyData = calcRelativisticEnergy(m0, clampedBeta)

    return {
      beta: clampedBeta,
      gamma,
      shipL0,
      shipL,
      clockH,
      shipX,
      pulseY0,
      pulseYGround,
      triangleH,
      triangleBase,
      triangleHypotenuse,
      groundClockAngle,
      shipClockAngle,
      energyData,
      mode,
      showGeometry,
    }
  }, [beta, m0, time, mode, showGeometry])
}
