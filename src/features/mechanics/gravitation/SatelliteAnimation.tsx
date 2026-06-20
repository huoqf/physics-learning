import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateOrbitalSpeed } from '@/physics'
import { GRAVITATIONAL_CONSTANT, EARTH_MASS, EARTH_RADIUS } from '@/physics/constants'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'
import { PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

const LAYOUT = {
  // 地球与比例尺
  earth: {
    radiusPx: 55, // 地球渲染像素半径
  },
  // 卫星大小
  satellite: {
    size: 24,
  },
  // 模式 0 (多轨道对比) 参数
  mode0: {
    rMin: 6.37,  // 轨道半径相对单位最小值
    rMax: 22.0,  // 轨道半径相对单位最大值
    rNear: EARTH_RADIUS,  // 近地轨道实际半径 (m)
    rMedium: 13.0e6, // 中轨道实际半径 (m)
    rSync: 21.0e6,   // 同步轨道实际半径 (m)
    timeScale: 500,  // 物理时间加速比例
  },
  // 模式 1 (发射模式) 参数 — 方案A：低轨快速轨道演示
  mode1: {
    rLaunchRatio: 1.05, // 起抛高度比例 (1.05 * EARTH_RADIUS ≈ 320km 低轨)
    timeScale: 400,     // 入轨后物理时间加速（400×，约10秒可见1~2圈）
    maxPhysicsTime: 7200, // 最大物理时间（秒），低轨可跑约2圈
    dt: 0.05,
    launchDuration: 3,   // 垂直起飞持续时间（秒）
    turnDuration: 5,     // 重力转弯持续时间（秒）
    orbitEntryTime: 8,   // 入轨总时刻（秒）
    orbitEndAngle: Math.PI / 2, // 重力转弯终点：水平切向（90°）
  },
  // 画中画卡片参数（统一比例系数驱动）
  card: {
    scaleFactor: 1.5,  // 统一缩放系数
    // 基准尺寸（×scaleFactor后作为最小值）
    base: {
      width: 225,
      height: 145,
      padLeft: 42,
      padRight: 18,
      padTop: 28,
      padBottom: 28,
    },
    // 相对画布自适应（最小尺寸不超过画布的此比例）
    canvasRatio: 0.38,  // 最小宽度占画布宽度比例
    canvasRatioH: 0.36, // 最小高度占画布高度比例
    x: 20, // 离右侧边缘距离
    y: 20, // 离顶部边缘距离
  },
  // 轨道线条的物理线宽、虚线样式和不透明度
  orbit: {
    // 模式 0 对比背景轨道 (近地、中轨、同步)
    background: {
      strokeWidth: 0.8,
      strokeDasharray: '4,4',
      opacity: 0.25,
    },
    // 模式 0 当前选中轨道环
    active: {
      strokeWidth: 1.5,
      strokeDasharray: '5,3',
      opacity: 0.6,
    },
    // 模式 1 预测轨道线 (虚线)
    predict: {
      strokeWidth: 1.2,
      strokeDasharray: '4,4',
      opacity: 0.6,
    },
    // 模式 1 发射轨道轨迹 (实线)
    history: {
      strokeWidth: 1.2,
      opacity: 0.8,
    },
    reference: {
      strokeWidth: 1.5,
      opacity: 0.4,
    }
  }
} as const

// ─── v-t曲线卡片配置（统一比例系数驱动）────────────────────────────
const VTCARD = {
  scaleFactor: LAYOUT.card.scaleFactor,  // 与主卡片统一缩放系数
  // 基准尺寸
  base: {
    width: 240,
    height: 160,
    padLeft: 34,
    padRight: 12,
    padTop: 30,
    padBottom: 26,
  },
  // 相对画布自适应
  canvasRatio: 0.38,
  canvasRatioH: 0.38,
}

export default function SatelliteAnimation() {
    const {params, updateParam, showVectors, time, isPlaying, setIsPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    updateParam: s.updateParam,
    showVectors: s.showVectors,
    time: s.time,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })
  const { font } = canvasSize

  const {
    r = 7.0,
    mode = 0,
    v0 = 7.7,
    isLaunched = 0,
    showChart = 1,
    showCompare = 1
  } = params

  // 全局播放按钮联动：发射模式下未发射时，点播放自动触发发射
  useEffect(() => {
    if (mode === 1 && isPlaying && isLaunched === 0) {
      updateParam('isLaunched', 1)
    }
  }, [mode, isPlaying, isLaunched, updateParam])

  // 模式1入轨后居中，让完整轨道对称显示
  const centerX = mode === 1 ? canvasSize.width * 0.5 : canvasSize.width / 2
  const centerY = canvasSize.height / 2

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: {
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
    },
    originX: centerX,
    originY: centerY,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height, centerX, centerY]);

  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  // ── 模式 1：发射轨道三阶段物理计算与状态机 ──
  const launchData = useMemo(() => {
    if (mode !== 1) return null

    const r0 = LAYOUT.mode1.rLaunchRatio * EARTH_RADIUS // 目标在轨半径
    const v0_m = v0 * 1000
    const v_c = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / r0)
    const alpha = (r0 * v0_m * v0_m) / (GRAVITATIONAL_CONSTANT * EARTH_MASS)
    const e = Math.abs(alpha - 1)
    const isFarOrigin = v0_m < v_c
    const p = isFarOrigin ? r0 * (1 - e) : r0 * (1 + e)
    const h = r0 * v0_m
    const orbitEntryAngle = LAYOUT.mode1.orbitEndAngle // π/2

    // 如果未发射，固定在文昌发射场 (theta = 0, r = EARTH_RADIUS)
    if (isLaunched === 0) {
      return {
        crashed: false,
        phase: 'liftoff' as const,
        theta: 0,
        r_phys: EARTH_RADIUS,
        satAngle: 0,
        orbitPoints: [] as [number, number][],
        r0, v_c, e, p, h, isFarOrigin, alpha
      }
    }

    let phase: 'liftoff' | 'gravityTurn' | 'orbit' = 'liftoff'
    let r_phys = EARTH_RADIUS
    let theta = 0
    let satAngle = 0
    let crashed = false
    let crashTheta = 0

    const t_animation = time
    const entryT = LAYOUT.mode1.orbitEntryTime

    if (t_animation < LAYOUT.mode1.launchDuration) {
      // 1. 垂直起飞阶段 (0 <= t < 3)
      phase = 'liftoff'
      const progress = t_animation / LAYOUT.mode1.launchDuration
      // smoothstep 缓动，更自然
      const eased = progress * progress * (3 - 2 * progress)
      r_phys = EARTH_RADIUS + eased * (r0 - EARTH_RADIUS)
      theta = 0
      satAngle = 0 // 径向向外，火箭头部默认朝右（0°）
    } else if (t_animation < entryT) {
      // 2. 重力转弯阶段 (3 <= t < 8)
      phase = 'gravityTurn'
      const progress = (t_animation - LAYOUT.mode1.launchDuration) / LAYOUT.mode1.turnDuration
      const eased = 1 - Math.pow(1 - progress, 2) // ease-out

      // 极角从 0 匀速转到 π/2（水平切向）
      theta = orbitEntryAngle * eased
      // 半径保持入轨半径（低轨，简化教学模型）
      r_phys = r0
      // 姿态偏转：火箭从垂直向上（0）偏转至水平向左（-π/2）
      // 因为火箭头部默认朝右（0°），垂直向上需要旋转 -π/2；水平切向（逆时针轨道）需要旋转 -π
      satAngle = -Math.PI / 2 - (Math.PI / 2) * eased
    } else {
      // 3. 在轨环绕阶段 (t >= 8)
      phase = 'orbit'
      const orbitTime = (t_animation - entryT) * LAYOUT.mode1.timeScale

      theta = orbitEntryAngle
      let simT = 0
      const maxPhysicsTime = LAYOUT.mode1.maxPhysicsTime
      const minDt = 0.001
      const maxDt = 0.05
      let dt = 0.005

      while (simT < orbitTime && simT < maxPhysicsTime) {
        const curR = isFarOrigin
          ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
          : p / (1 + e * Math.cos(theta - orbitEntryAngle))
        if (curR < EARTH_RADIUS * 0.99) {
          crashed = true
          crashTheta = theta
          break
        }

        // 自适应步长
        const rRatio = curR / r0
        if (rRatio < 0.5) {
          dt = Math.max(minDt, dt * 0.5)
        } else if (rRatio > 1.5) {
          dt = Math.min(maxDt, dt * 1.05)
        }

        const dTheta = (h / (curR * curR)) * dt
        theta += dTheta
        simT += dt
      }

      r_phys = crashed
        ? EARTH_RADIUS
        : isFarOrigin
          ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
          : p / (1 + e * Math.cos(theta - orbitEntryAngle))

      // 卫星在轨阶段，旋转角 = theta（沿切向）
      satAngle = crashed ? crashTheta : theta
    }

    // ── 预渲染完整轨道（2圈，供主画面和 CAM-01 共用）──
    const orbitPoints: [number, number][] = []
    const orbitSteps = 240
    const maxTheta = v0_m >= Math.sqrt(2 * GRAVITATIONAL_CONSTANT * EARTH_MASS / r0)
      ? Math.PI * 0.85  // 逃逸：只画一段双曲线
      : Math.PI * 4.0    // 环绕：画2圈完整椭圆

    for (let i = 0; i <= orbitSteps; i++) {
      const thetaOffset = -maxTheta + (i / orbitSteps) * (2 * maxTheta)
      const curR = isFarOrigin
        ? p / (1 - e * Math.cos(thetaOffset))
        : p / (1 + e * Math.cos(thetaOffset))
      if (curR >= EARTH_RADIUS * 0.98) {
        orbitPoints.push([orbitEntryAngle + thetaOffset, curR])
      }
    }

    return {
      crashed,
      phase,
      theta: crashed ? crashTheta : theta,
      r_phys,
      satAngle,
      orbitPoints,
      r0, v_c, e, p, h, isFarOrigin, alpha
    }
  }, [mode, v0, isLaunched, time])

  // 轨道崩溃时自动暂停
  if (launchData?.crashed && isLaunched === 1) {
    setIsPlaying(false)
  }

  // ── 模式 1：v-t 实时速度曲线采样 ──
  const vtSamplePoints = useMemo(() => {
    if (mode !== 1) return []
    const pts: [number, number][] = []
    const steps = 120
    const r0 = LAYOUT.mode1.rLaunchRatio * EARTH_RADIUS
    const v0_m = v0 * 1000
    const v_c = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / r0)
    const alpha = (r0 * v0_m * v0_m) / (GRAVITATIONAL_CONSTANT * EARTH_MASS)
    const e = Math.abs(alpha - 1)
    const isFarOrigin = v0_m < v_c
    const p = isFarOrigin ? r0 * (1 - e) : r0 * (1 + e)
    const h = r0 * v0_m
    const orbitEntryAngle = LAYOUT.mode1.orbitEndAngle
    const entryT = LAYOUT.mode1.orbitEntryTime

    for (let i = 0; i <= steps; i++) {
      const t_sim = (i / steps) * 15
      let v_val = 0
      if (t_sim < entryT) {
        // 发射阶段：速度从 0 线性增加到 v0
        v_val = v0 * (t_sim / entryT)
      } else {
        // 轨道阶段：按开普勒力学积分求瞬时速度
        let theta = orbitEntryAngle
        let simT = 0
        const timeScale = LAYOUT.mode1.timeScale
        const targetT = (t_sim - entryT) * timeScale
        const maxPhysicsTime = LAYOUT.mode1.maxPhysicsTime
        const minDt = 0.001
        const maxDt = 0.05
        let dt = 0.005
        let crashed = false

        while (simT < targetT && simT < maxPhysicsTime) {
          const curR = isFarOrigin
            ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
            : p / (1 + e * Math.cos(theta - orbitEntryAngle))
          if (curR < EARTH_RADIUS * 0.99) {
            crashed = true
            break
          }
          const rRatio = curR / r0
          if (rRatio < 0.5) {
            dt = Math.max(minDt, dt * 0.5)
          } else if (rRatio > 1.5) {
            dt = Math.min(maxDt, dt * 1.05)
          }
          const dTheta = (h / (curR * curR)) * dt
          theta += dTheta
          simT += dt
        }

        if (!crashed) {
          const curR = isFarOrigin
            ? p / (1 - e * Math.cos(theta - orbitEntryAngle))
            : p / (1 + e * Math.cos(theta - orbitEntryAngle))
          const v_sq = v0_m * v0_m + 2 * GRAVITATIONAL_CONSTANT * EARTH_MASS * (1 / curR - 1 / r0)
          v_val = v_sq > 0 ? Math.sqrt(v_sq) / 1000 : 0
        } else {
          v_val = 0
        }
      }
      pts.push([t_sim, v_val])
    }
    return pts
  }, [mode, v0])

  // ── 像素映射比例尺 ──
  const scale = LAYOUT.earth.radiusPx / EARTH_RADIUS // 像素/米 比例尺
  const earthRadiusPx = EARTH_RADIUS * scale

  // ── 模式 0 轨道及坐标 ──
  const r_meters = r * 1e6
  const orbitRadiusPx = r_meters * scale

  // 卫星 0 运动角度 (由物理周期计算)
  const { v: v_圆, T: T_圆 } = calculateOrbitalSpeed(EARTH_MASS, r_meters, GRAVITATIONAL_CONSTANT)
  const omega_圆 = (2 * Math.PI) / T_圆
  const timeScale圆 = LAYOUT.mode0.timeScale
  const angle_圆 = omega_圆 * time * timeScale圆

  const sat0X = centerX + orbitRadiusPx * Math.cos(angle_圆)
  const sat0Y = centerY - orbitRadiusPx * Math.sin(angle_圆)

  // 对比轨道坐标
  // 1. 近地卫星 (轨道半径 EARTH_RADIUS)
  const r_近 = LAYOUT.mode0.rNear
  const { T: T_近 } = calculateOrbitalSpeed(EARTH_MASS, r_近, GRAVITATIONAL_CONSTANT)
  const angle_近 = ((2 * Math.PI) / T_近) * time * timeScale圆
  const sat近X = centerX + r_近 * scale * Math.cos(angle_近)
  const sat近Y = centerY - r_近 * scale * Math.sin(angle_近)

  // 2. 中轨道卫星
  const r_中 = LAYOUT.mode0.rMedium
  const { T: T_中 } = calculateOrbitalSpeed(EARTH_MASS, r_中, GRAVITATIONAL_CONSTANT)
  const angle_中 = ((2 * Math.PI) / T_中) * time * timeScale圆
  const sat中X = centerX + r_中 * scale * Math.cos(angle_中)
  const sat中Y = centerY - r_中 * scale * Math.sin(angle_中)

  // 3. 同步轨道卫星
  const r_同步 = LAYOUT.mode0.rSync
  const { T: T_同步 } = calculateOrbitalSpeed(EARTH_MASS, r_同步, GRAVITATIONAL_CONSTANT)
  const angle_同步 = ((2 * Math.PI) / T_同步) * time * timeScale圆
  const sat同步X = centerX + r_同步 * scale * Math.cos(angle_同步)
  const sat同步Y = centerY - r_同步 * scale * Math.sin(angle_同步)

  // ── 模式 1 发射卫星/火箭位置 ──
  let satLaunchX = centerX
  let satLaunchY = centerY
  let satAngle = 0
  let isRocket = false

  if (mode === 1 && launchData) {
    const { theta, r_phys, phase } = launchData
    satLaunchX = centerX + r_phys * scale * Math.cos(theta)
    satLaunchY = centerY - r_phys * scale * Math.sin(theta)
    satAngle = launchData.satAngle
    isRocket = phase === 'liftoff' || phase === 'gravityTurn'
  }

  // ── 鼠标与图表拖拽交互 ──
  const [dragTarget, setDragTarget] = useState<'none' | 'sat'>('none')
  const isDraggingChartRef = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // ─── 画中画卡片尺寸动态计算（比例系数驱动）────────────────────
  // 卡片1：v-r & T-r 曲线
  const cardScale = LAYOUT.card.scaleFactor
  const cardWidth = Math.max(
    LAYOUT.card.base.width * cardScale,
    canvasSize.width * LAYOUT.card.canvasRatio
  )
  const cardHeight = Math.max(
    LAYOUT.card.base.height * cardScale,
    canvasSize.height * LAYOUT.card.canvasRatioH
  )
  const cardX = canvasSize.width - cardWidth - LAYOUT.card.x
  const cardY = LAYOUT.card.y

  const padLeft = LAYOUT.card.base.padLeft * cardScale
  const padRight = LAYOUT.card.base.padRight * cardScale
  const padTop = LAYOUT.card.base.padTop * cardScale
  const padBottom = LAYOUT.card.base.padBottom * cardScale

  const innerW = cardWidth - padLeft - padRight
  const innerH = cardHeight - padTop - padBottom

  // 将 r [LAYOUT.mode0.rMin, LAYOUT.mode0.rMax] 映射 to X 轴
  const toCardX = useCallback((valR: number) => {
    return padLeft + ((valR - LAYOUT.mode0.rMin) / (LAYOUT.mode0.rMax - LAYOUT.mode0.rMin)) * innerW
  }, [innerW, padLeft])

  // 将归一化物理量 [0, 1] 映射 to Y 轴
  const toCardY = useCallback((valNorm: number) => {
    return padTop + innerH - valNorm * innerH
  }, [innerH, padTop])

  // 图表拖拽反向调距
  const handleDragChart = useCallback((clientX: number, svgRect: DOMRect) => {
    const clickX = clientX - svgRect.left - cardX - padLeft
    const rRatio = clickX / innerW
    const targetR = LAYOUT.mode0.rMin + rRatio * (LAYOUT.mode0.rMax - LAYOUT.mode0.rMin)
    const finalR = Math.max(LAYOUT.mode0.rMin, Math.min(LAYOUT.mode0.rMax, targetR))
    updateParam('r', finalR)
  }, [cardX, padLeft, innerW, updateParam])

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    if (dragTarget === 'sat' && mode === 0) {
      // 拖拽卫星改变轨道半径
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const distPx = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2)
      const distMeters = distPx / scale
      const distKM = distMeters / 1e6
      const finalR = Math.max(LAYOUT.mode0.rMin, Math.min(LAYOUT.mode0.rMax, distKM))
      updateParam('r', finalR)
    } else if (isDraggingChartRef.current && mode === 0) {
      handleDragChart(e.clientX, rect)
    }
  }

  const handleSvgMouseUp = () => {
    setDragTarget('none')
    isDraggingChartRef.current = false
  }

  const handleChartMouseDown = (e: React.MouseEvent<SVGElement>) => {
    if (mode !== 0) return
    isDraggingChartRef.current = true
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    handleDragChart(e.clientX, rect)
  }

  // ── 产生画中画曲线路径 ──
  const v_max_val = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / (LAYOUT.mode0.rMin * 1e6)) // r_min 时的速度
  const T_max_val = 2 * Math.PI * Math.pow(LAYOUT.mode0.rMax * 1e6, 1.5) / Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS) // r_max 时的周期

  const generateVChartPath = () => {
    const steps = 30
    const pts: string[] = []
    for (let i = 0; i <= steps; i++) {
      const curR_M = (LAYOUT.mode0.rMin + (i / steps) * (LAYOUT.mode0.rMax - LAYOUT.mode0.rMin)) * 1e6
      const curV = Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS / curR_M)
      const normV = curV / v_max_val
      pts.push(`${toCardX(curR_M / 1e6)},${toCardY(normV)}`)
    }
    return `M ${pts.join(' L ')}`
  }

  const generateTChartPath = () => {
    const steps = 30
    const pts: string[] = []
    for (let i = 0; i <= steps; i++) {
      const curR_M = (LAYOUT.mode0.rMin + (i / steps) * (LAYOUT.mode0.rMax - LAYOUT.mode0.rMin)) * 1e6
      const curT = 2 * Math.PI * Math.pow(curR_M, 1.5) / Math.sqrt(GRAVITATIONAL_CONSTANT * EARTH_MASS)
      const normT = curT / T_max_val
      pts.push(`${toCardX(curR_M / 1e6)},${toCardY(normT)}`)
    }
    return `M ${pts.join(' L ')}`
  }

  const curVNorm = v_圆 / v_max_val
  const curTNorm = T_圆 / T_max_val
  const dotPx = toCardX(r)
  const dotPyV = toCardY(curVNorm)
  const dotPyT = toCardY(curTNorm)

  // ── 手绘太阳翼飞船卫星组件 ──
  const renderSatelliteSvg = (angleRad: number, drawScale: number = 1.0) => {
    const angleDeg = (-angleRad * 180) / Math.PI
    return (
      <g transform={`rotate(${angleDeg}) scale(${drawScale})`}>
        {/* 太阳翼电池板 (左) */}
        <rect x={-18} y={-3} width={10} height={6} fill={SCENE_COLORS.circuit.capacitorPlate} stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
        {/* 太阳翼电池板 (右) */}
        <rect x={8} y={-3} width={10} height={6} fill={SCENE_COLORS.circuit.capacitorPlate} stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
        {/* 连接轴线 */}
        <line x1={-8} y1={0} x2={8} y2={0} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
        {/* 卫星主体 (金属灰) */}
        <circle cx={0} cy={0} r={4.5} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
        {/* 天线 */}
        <path d="M -2 2 Q 0 4 2 2" fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={0.8} />
        <line x1={0} y1={3} x2={0} y2={5} stroke={PHYSICS_COLORS.axis} strokeWidth={0.6} />
      </g>
    )
  }

  // ── 手绘火箭组件 ──
  const renderRocketSvg = (angleRad: number, drawScale: number = 1.0) => {
    const angleDeg = (angleRad * 180) / Math.PI
    // 动态尾焰高度
    const flameHeight = 6 + Math.sin(time * 40) * 3

    return (
      <g transform={`rotate(${angleDeg}) scale(${drawScale})`}>
        {/* 火箭尾焰（喷火） */}
        <path
          d={`M -8 -2 L -${8 + flameHeight} 0 L -8 2 Z`}
          fill="url(#rocket-fire-grad)"
          opacity={0.95}
        />
        {/* 火箭主体 */}
        <rect
          x={-8}
          y={-2.5}
          width={16}
          height={5}
          rx={1}
          fill={colors.neutral[200]}
          stroke={colors.neutral[600]}
          strokeWidth={0.6}
        />
        {/* 火箭头部整流罩 */}
        <path
          d="M 8 -2.5 L 13 0 L 8 2.5 Z"
          fill={SCENE_COLORS.circuit.meterNeedle}
          stroke={SCENE_COLORS.circuit.meterFrame}
          strokeWidth={0.6}
        />
        {/* 尾翼 */}
        <path
          d="M -8 -2.5 L -11 -5 L -6 -2.5 Z"
          fill={colors.neutral[600]}
          stroke={colors.neutral[600]}
          strokeWidth={0.5}
        />
        <path
          d="M -8 2.5 L -11 5 L -6 2.5 Z"
          fill={colors.neutral[600]}
          stroke={colors.neutral[600]}
          strokeWidth={0.5}
        />
      </g>
    )
  }

  // ── 手绘科技地球组件 ──
  const renderEarth = () => {
    return (
      <g>
        {/* 1. 大气发光层 (玻璃Grad 3D) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={earthRadiusPx + 6}
          fill="none"
          stroke={SCENE_COLORS.sphere.earthTech.atmosphereOuter}
          strokeWidth={2}
          opacity={0.3}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={earthRadiusPx + 3}
          fill="none"
          stroke={SCENE_COLORS.sphere.earthTech.atmosphereInner}
          strokeWidth={2}
          opacity={0.5}
        />

        {/* 2. 地球主体海洋 (冷蓝渐变) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={earthRadiusPx}
          fill="url(#earth-ocean-grad)"
          stroke={SCENE_COLORS.sphere.earthTech.stroke}
          strokeWidth={1}
        />

        {/* 3. 大陆剪影 (科技灰拼贴，零颜色硬编码) */}
        <path
          d={`M ${centerX - 12} ${centerY - 18}
              Q ${centerX - 5} ${centerY - 22} ${centerX + 8} ${centerY - 14}
              Q ${centerX + 18} ${centerY - 5} ${centerX + 10} ${centerY + 8}
              Q ${centerX - 2} ${centerY + 18} ${centerX - 10} ${centerY + 10}
              Q ${centerX - 18} ${centerY - 2} ${centerX - 12} ${centerY - 18} Z`}
          fill={SCENE_COLORS.sphere.earthTech.landGradient[1]}
          opacity={0.3}
        />
        <path
          d={`M ${centerX - 24} ${centerY + 5}
              Q ${centerX - 15} ${centerY + 2} ${centerX - 10} ${centerY + 12}
              Q ${centerX - 14} ${centerY + 22} ${centerX - 22} ${centerY + 18} Z`}
          fill={SCENE_COLORS.sphere.earthTech.landGradient[2]}
          opacity={0.3}
        />
      </g>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="bg-white rounded-lg shadow-inner select-none"
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseUp}
      >
        <defs>
          {/* 地球蔚蓝海洋渐变 */}
          <radialGradient id="earth-ocean-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[0]} />
            <stop offset="60%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[2]} />
          </radialGradient>
          {/* 火箭尾焰渐变 */}
          <linearGradient id="rocket-fire-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.6" />
          </linearGradient>
          {/* 卡片阴影滤镜 */}
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* 1. 辅助网格（已移除） */}

        {/* 2. 地球绘制 */}
        {renderEarth()}

        {/* 3. 模式 0 渲染 */}
        {mode === 0 && (
          <g>
            {/* 对比背景轨道线 (当 showCompare === 1 时展示) */}
            {showCompare === 1 && (
              <g>
                {/* 近地轨道 */}
                <circle cx={centerX} cy={centerY} r={r_近 * scale} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.background.strokeWidth} strokeDasharray={LAYOUT.orbit.background.strokeDasharray} opacity={LAYOUT.orbit.background.opacity} />
                {/* 中轨道 */}
                <circle cx={centerX} cy={centerY} r={r_中 * scale} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.background.strokeWidth} strokeDasharray={LAYOUT.orbit.background.strokeDasharray} opacity={LAYOUT.orbit.background.opacity} />
                {/* 同步轨道 */}
                <circle cx={centerX} cy={centerY} r={r_同步 * scale} fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={LAYOUT.orbit.background.strokeWidth} strokeDasharray={LAYOUT.orbit.background.strokeDasharray} opacity={LAYOUT.orbit.background.opacity} />
              </g>
            )}

            {/* 当前主选轨道环 */}
            <circle
              cx={centerX}
              cy={centerY}
              r={orbitRadiusPx}
              fill="none"
              stroke={PHYSICS_COLORS.trackHistory}
              strokeWidth={LAYOUT.orbit.active.strokeWidth}
              strokeDasharray={LAYOUT.orbit.active.strokeDasharray}
              opacity={LAYOUT.orbit.active.opacity}
            />

            {/* 对比卫星公转 (当 showCompare === 1 时展示) */}
            {showCompare === 1 && (
              <g>
                {/* 近地卫星 */}
                <g transform={`translate(${sat近X}, ${sat近Y})`}>
                  {renderSatelliteSvg(angle_近)}
                </g>
                <text x={sat近X} y={sat近Y - 14} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">近地</text>

                {/* 中轨卫星 */}
                <g transform={`translate(${sat中X}, ${sat中Y})`}>
                  {renderSatelliteSvg(angle_中)}
                </g>
                <text x={sat中X} y={sat中Y - 14} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">GPS</text>

                {/* 同步卫星 */}
                <g transform={`translate(${sat同步X}, ${sat同步Y})`}>
                  {renderSatelliteSvg(angle_同步)}
                </g>
                <text x={sat同步X} y={sat同步Y - 14} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">同步</text>
              </g>
            )}

            {/* 当前可拖拽主卫星 */}
            <g
              transform={`translate(${sat0X}, ${sat0Y})`}
              onMouseDown={() => setDragTarget('sat')}
              style={{ cursor: dragTarget === 'sat' ? 'grabbing' : 'grab' }}
            >
              {renderSatelliteSvg(angle_圆)}
              {/* 高亮大选外圈 */}
              <circle cx={0} cy={0} r={12} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={1} strokeDasharray="2,2" opacity={0.7} />
            </g>
            <text
              x={sat0X}
              y={sat0Y - 18}
              fontSize="11"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
              textAnchor="middle"
            >
              研究星 (r = {r.toFixed(1)})
            </text>

            {/* 模式 0 矢量箭头 */}
            {showVectors && (
              <g>
                {/* 万有引力 (指向地心) */}
                <VectorArrow
                  origin={{ x: sat0X - centerX, y: centerY - sat0Y }}
                  vector={{ x: centerX - sat0X, y: sat0Y - centerY }}
                  type="gravity"
                  sceneScale={sceneScale}
                  pixelLength={0.45 * Math.sqrt((sat0X - centerX) ** 2 + (sat0Y - centerY) ** 2)}
                />
                <text
                  x={sat0X - (sat0X - centerX) * 0.25 - 12}
                  y={sat0Y - (sat0Y - centerY) * 0.25 - 4}
                  fontSize="10"
                  fill={PHYSICS_COLORS.gravity}
                  fontWeight="bold"
                >
                  F引
                </text>

                {/* 线速度 v (沿切线方向) */}
                <VectorArrow
                  origin={{ x: sat0X - centerX, y: centerY - sat0Y }}
                  vector={{ x: sat0Y - centerY, y: sat0X - centerX }}
                  type="velocity"
                  sceneScale={sceneScale}
                  pixelLength={0.45 * Math.sqrt((sat0X - centerX) ** 2 + (sat0Y - centerY) ** 2)}
                />
                <text
                  x={sat0X + (sat0Y - centerY) * 0.45 + 5}
                  y={sat0Y - (sat0X - centerX) * 0.45}
                  fontSize="10"
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                >
                  v
                </text>
              </g>
            )}
          </g>
        )}

        {/* 4. 模式 1 宇宙速度抛射渲染 */}
        {mode === 1 && launchData && (
          <g>
            {/* 地面发射场标记 (文昌发射场) */}
            <g transform={`translate(${centerX + earthRadiusPx}, ${centerY})`}>
              <path d="M 0 0 L 6 -10 L 10 -10 L 4 0 Z" fill="none" stroke={colors.neutral[600]} strokeWidth={1} />
              <path d="M 4 -10 L 1 -15 L 4 -15 L 7 -10 Z" fill="none" stroke={colors.neutral[600]} strokeWidth={1} />
              <line x1={0} y1={0} x2={0} y2={-15} stroke={colors.neutral[600]} strokeWidth={1.2} />
              <circle cx={0} cy={0} r={1.5} fill={colors.neutral[700]} />
            </g>
            <text x={centerX + earthRadiusPx + 10} y={centerY + 12} fontSize="9" fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">文昌发射场</text>

            {/* 预定入轨点标记 (绿色) — 改为 π/2 正上方 */}
            {(() => {
              const targetOrbitRadiusPx = launchData.r0 * scale
              const targetAngle = LAYOUT.mode1.orbitEndAngle
              const targetX = centerX + targetOrbitRadiusPx * Math.cos(targetAngle)
              const targetY = centerY - targetOrbitRadiusPx * Math.sin(targetAngle)
              return (
                <g>
                  {/* 连接线 */}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={targetX}
                    y2={targetY}
                    stroke={PHYSICS_COLORS.trackHistory}
                    strokeWidth={0.8}
                    strokeDasharray="2,2"
                    opacity={0.3}
                  />
                  <circle cx={targetX} cy={targetY} r={3.5} fill={CANVAS_COLORS.referencePoint} />
                  <text x={targetX + 8} y={targetY - 5} fontSize="9" fill={CANVAS_COLORS.referencePoint} fontWeight="bold" textAnchor="start">预定入轨点</text>
                </g>
              )
            })()}

            {/* 预测轨道线（2圈完整预渲染） */}
            {launchData.orbitPoints.length > 1 && (
              <path
                d={`M ${launchData.orbitPoints.map(([thetaVal, rPhys]) => {
                  const px = centerX + rPhys * scale * Math.cos(thetaVal)
                  const py = centerY - rPhys * scale * Math.sin(thetaVal)
                  return `${px},${py}`
                }).join(' L ')}`}
                fill="none"
                stroke={PHYSICS_COLORS.trackHistory}
                strokeWidth={LAYOUT.orbit.predict.strokeWidth}
                strokeDasharray={LAYOUT.orbit.predict.strokeDasharray}
                opacity={LAYOUT.orbit.predict.opacity}
              />
            )}

            {/* 发射小卫星或火箭 */}
            <g transform={`translate(${satLaunchX}, ${satLaunchY})`}>
              {isRocket
                ? renderRocketSvg(satAngle, 0.65)
                : renderSatelliteSvg(satAngle, 0.65)}
            </g>

            {/* 坠毁时撞地爆炸特效 */}
            {launchData.crashed && (
              <g transform={`translate(${satLaunchX}, ${satLaunchY})`}>
                <circle cx={0} cy={0} r={12} fill={CHART_COLORS.criticalPt} opacity={0.4} />
                <circle cx={0} cy={0} r={6} fill={CHART_COLORS.criticalPt} opacity={0.8} />
                <text x={15} y={15} fontSize="11" fill={CHART_COLORS.criticalPt} fontWeight="bold">撞击坠毁</text>
              </g>
            )}

            {/* 发射模式下的受力与速度矢量 */}
            {showVectors && !launchData.crashed && isLaunched === 1 && !isRocket && (
              <g>
                {/* 引力 */}
                <VectorArrow
                  origin={{ x: satLaunchX - centerX, y: centerY - satLaunchY }}
                  vector={{ x: centerX - satLaunchX, y: satLaunchY - centerY }}
                  type="gravity"
                  sceneScale={sceneScale}
                  pixelLength={0.45 * Math.sqrt((satLaunchX - centerX) ** 2 + (satLaunchY - centerY) ** 2)}
                />
                {/* 速度 */}
                <VectorArrow
                  origin={{ x: satLaunchX - centerX, y: centerY - satLaunchY }}
                  vector={{ x: satLaunchY - centerY, y: satLaunchX - centerX }}
                  type="velocity"
                  sceneScale={sceneScale}
                  pixelLength={0.45 * Math.sqrt((satLaunchX - centerX) ** 2 + (satLaunchY - centerY) ** 2)}
                />
              </g>
            )}
          </g>
        )}

        {/* 5. 画中画：线速度/周期-半径关系曲线 (对齐圆周运动精密毛玻璃与刻度，仅模式0显示) */}
        {showChart === 1 && mode === 0 && (
          <g transform={`translate(${cardX}, ${cardY})`}>
            {/* 毛玻璃卡片背景 */}
            <rect
              width={cardWidth}
              height={cardHeight}
              fill={SCENE_COLORS.labels.glassPanelBg}
              rx={8}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={0.8}
              filter="url(#card-shadow)"
            />

            {/* 标题 */}
            <text
              x={cardWidth / 2}
              y={16}
              fontSize={font(8)}
              fill={CHART_COLORS.titleText}
              textAnchor="middle"
              fontWeight="bold"
              fontFamily="PingFang SC, sans-serif"
            >
              轨道物理量-半径关系曲线 (v-r / T-r)
            </text>

            {/* 坐标轴 (CHART_COLORS.axisLine) */}
            {/* X 轴 */}
            <line x1={padLeft - 5} y1={padTop + innerH} x2={padLeft + innerW + 10} y2={padTop + innerH} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
            {/* Y 轴 */}
            <line x1={padLeft} y1={padTop - 8} x2={padLeft} y2={padTop + innerH + 5} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />

            {/* 坐标轴箭头 */}
            <polygon points={`${padLeft + innerW + 10} ${padTop + innerH - 2.5}, ${padLeft + innerW + 14} ${padTop + innerH}, ${padLeft + innerW + 10} ${padTop + innerH + 2.5}`} fill={CHART_COLORS.axisArrow} />
            <polygon points={`${padLeft - 2.5} ${padTop - 8}, ${padLeft} ${padTop - 12}, ${padLeft + 2.5} ${padTop - 8}`} fill={CHART_COLORS.axisArrow} />

            {/* 轴标签 */}
            <text x={padLeft + innerW + 10} y={padTop + innerH + 11} fontSize={font(7)} fill={CHART_COLORS.labelText} textAnchor="end">半径 r</text>
            <text x={padLeft - 6} y={padTop - 8} fontSize={font(7)} fill={CHART_COLORS.labelText} textAnchor="middle">v / T</text>

            {/* X 轴起止刻度线与标注 */}
            <line x1={toCardX(LAYOUT.mode0.rMin)} y1={padTop + innerH} x2={toCardX(LAYOUT.mode0.rMin)} y2={padTop + innerH + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
            <text x={toCardX(LAYOUT.mode0.rMin)} y={padTop + innerH + 10} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">{LAYOUT.mode0.rMin.toFixed(2)}</text>

            <line x1={toCardX(LAYOUT.mode0.rMax)} y1={padTop + innerH} x2={toCardX(LAYOUT.mode0.rMax)} y2={padTop + innerH + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
            <text x={toCardX(LAYOUT.mode0.rMax)} y={padTop + innerH + 10} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">{LAYOUT.mode0.rMax.toFixed(1)}</text>

            {/* v 曲线 (速度随 r 递减，用经典蓝表示) */}
            <path
              d={generateVChartPath()}
              fill="none"
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={1.2}
              opacity={0.85}
            />

            {/* T 曲线 (周期随 r 递增，用向心力品红或对照线表示) */}
            <path
              d={generateTChartPath()}
              fill="none"
              stroke={CHART_COLORS.compareD}
              strokeWidth={1.2}
              opacity={0.85}
            />

            {/* 曲线文本标签 */}
            <text x={toCardX(8.5)} y={toCardY(0.85)} fontSize={font(7)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">速度 v(r)</text>
            <text x={toCardX(15.0)} y={toCardY(0.70)} fontSize={font(7)} fill={CHART_COLORS.compareD} fontWeight="bold">周期 T(r)</text>

            {/* 拖动图表横轴热区 */}
            <rect
              x={padLeft}
              y={padTop}
              width={innerW}
              height={innerH}
              fill="transparent"
              className="cursor-ew-resize"
              onMouseDown={handleChartMouseDown}
            />

            {/* 当前状态投影线 */}
            <line x1={dotPx} y1={dotPyV} x2={dotPx} y2={padTop + innerH} stroke={CHART_COLORS.reference} strokeWidth={0.6} strokeDasharray="2,2" />
            <line x1={padLeft} y1={dotPyV} x2={dotPx} y2={dotPyV} stroke={CHART_COLORS.reference} strokeWidth={0.6} strokeDasharray="2,2" />
            <line x1={padLeft} y1={dotPyT} x2={dotPx} y2={dotPyT} stroke={CHART_COLORS.reference} strokeWidth={0.6} strokeDasharray="2,2" />

            {/* 状态游标指示点 */}
            <circle cx={dotPx} cy={dotPyV} r={2.5} fill={PHYSICS_COLORS.velocity} />
            <circle cx={dotPx} cy={dotPyT} r={2.5} fill={CHART_COLORS.compareD} />
          </g>
        )}

        {/* 6. 发射模式下的双画中画卡片 (仅在 mode === 1 且 showChart === 1 且 launchData 存在时显示) */}
        {showChart === 1 && mode === 1 && launchData && (
          <g>
            {/* ── 卡片 1：微观起飞/在轨特写监控 (右上角，Y = 20) ── */}
            <g transform={`translate(${canvasSize.width - 240 - 15}, 20)`}>
              {/* 毛玻璃卡片背景 */}
              <rect
                width={240}
                height={160}
                fill={SCENE_COLORS.labels.glassPanelBg}
                rx={8}
                stroke={CHART_COLORS.axisLine}
                strokeWidth={0.8}
                filter="url(#card-shadow)"
              />
              {/* 标题 */}
              <text
                x={120}
                y={18}
                fontSize={font(9)}
                fill={CANVAS_COLORS.labelText}
                textAnchor="middle"
                fontWeight="bold"
                fontFamily="PingFang SC, sans-serif"
              >
                CAM-01: 发射与并轨特写监控
              </text>

              {/* 裁剪视图，只在卡片内部显示特写 */}
              <g transform="translate(10, 28)">
                <rect width={220} height={120} fill="#020617" rx={4} />
                <g style={{ clipPath: 'inset(0px round 4px)' }}>
                  {(() => {
                    const zoomLevel = 4.0
                    // 特写框内部尺寸 220x120, 局部中心点为 (110, 60)
                    const dx = 110 - satLaunchX * zoomLevel
                    const dy = 60 - satLaunchY * zoomLevel
                    return (
                      <g transform={`translate(${dx}, ${dy}) scale(${zoomLevel})`}>
                        {/* 1. 地球背景 */}
                        <g transform={`translate(${-centerX}, ${-centerY})`}>
                          {renderEarth()}
                        </g>

                        {/* 2. 地面发射架 */}
                        <g transform={`translate(${centerX + earthRadiusPx}, ${centerY})`}>
                          <path d="M 0 0 L 6 -10 L 10 -10 L 4 0 Z" fill="none" stroke={colors.neutral[300]} strokeWidth={0.8} opacity={0.6} />
                          <path d="M 4 -10 L 1 -15 L 4 -15 L 7 -10 Z" fill="none" stroke={colors.neutral[300]} strokeWidth={0.8} opacity={0.6} />
                          <line x1={0} y1={0} x2={0} y2={-15} stroke={colors.neutral[300]} strokeWidth={1.0} opacity={0.6} />
                        </g>

                        {/* 3. 预定入轨点 — 与主画同步：π/2 正上方 */}
                        {(() => {
                          const targetOrbitRadiusPx = launchData.r0 * scale
                          const targetAngle = LAYOUT.mode1.orbitEndAngle
                          const targetX = centerX + targetOrbitRadiusPx * Math.cos(targetAngle)
                          const targetY = centerY - targetOrbitRadiusPx * Math.sin(targetAngle)
                          return (
                            <g>
                              <circle cx={targetX} cy={targetY} r={3.5} fill={colors.success[500]} />
                            </g>
                          )
                        })()}

                        {/* 4. 预测轨道线 — 与主画共用 orbitPoints */}
                        {launchData.orbitPoints.length > 1 && (
                          <path
                            d={`M ${launchData.orbitPoints.map(([thetaVal, rPhys]) => {
                              const px = centerX + rPhys * scale * Math.cos(thetaVal)
                              const py = centerY - rPhys * scale * Math.sin(thetaVal)
                              return `${px},${py}`
                            }).join(' L ')}`}
                            fill="none"
                            stroke={PHYSICS_COLORS.trackHistory}
                            strokeWidth={0.6}
                            strokeDasharray="2,2"
                            opacity={0.3}
                          />
                        )}

                        {/* 5. 渲染火箭或卫星 — 与主画同步 */}
                        <g transform={`translate(${satLaunchX}, ${satLaunchY})`}>
                          {isRocket
                            ? renderRocketSvg(satAngle, 0.6)
                            : renderSatelliteSvg(satAngle, 0.6)}
                        </g>

                        {/* 坠毁特效 */}
                        {launchData.crashed && (
                          <g transform={`translate(${satLaunchX}, ${satLaunchY})`}>
                            <circle cx={0} cy={0} r={6} fill={CHART_COLORS.criticalPt} opacity={0.6} />
                          </g>
                        )}
                      </g>
                    )
                  })()}
                </g>
                <rect width={220} height={120} fill="none" stroke={colors.neutral[700]} strokeWidth={1} rx={4} pointerEvents="none" />
                <text x={8} y={14} fontSize={font(6)} fill={CANVAS_COLORS.labelTextLight} fontFamily="monospace" opacity={0.85}>
                  ZOOM: 4.0X
                </text>
                <text x={212} y={14} fontSize={font(6)} fill={CANVAS_COLORS.labelTextLight} fontFamily="monospace" textAnchor="end" opacity={0.85}>
                  {launchData.phase === 'liftoff' ? 'LIFTOFF' : launchData.phase === 'gravityTurn' ? 'G-TURN' : 'IN_ORBIT'}
                </text>
              </g>
            </g>
            {/* ── 卡片 2：v-t 实时速度曲线（比例系数驱动）────────── */}
            {(() => {
              // 动态计算vt卡片尺寸
              const vtScale = VTCARD.scaleFactor
              const vtCardWidth = Math.max(
                VTCARD.base.width * vtScale,
                canvasSize.width * VTCARD.canvasRatio
              )
              const vtCardHeight = Math.max(
                VTCARD.base.height * vtScale,
                canvasSize.height * VTCARD.canvasRatioH
              )
              const vtCardX = canvasSize.width - vtCardWidth - 15
              const vtCardY = canvasSize.height - vtCardHeight - 20
              const vtPL = VTCARD.base.padLeft * vtScale
              const vtPT = VTCARD.base.padTop * vtScale
              const fontScale = vtScale

              // 计算曲线坐标
              const vtIW = vtCardWidth - vtPL - VTCARD.base.padRight * vtScale
              const vtIH = vtCardHeight - vtPT - VTCARD.base.padBottom * vtScale
              const mapX = (t: number) => vtPL + (t / 15) * vtIW
              const mapY = (vVal: number) => vtPT + vtIH - (vVal / 12) * vtIH

              // 当前游标位置
              const curT = Math.min(15, time)
              let curVVal = 0
              if (curT < LAYOUT.mode1.orbitEntryTime) {
                curVVal = v0 * (curT / LAYOUT.mode1.orbitEntryTime)
              } else if (launchData) {
                curVVal = launchData.crashed ? 0 : (() => {
                  const r0 = LAYOUT.mode1.rLaunchRatio * EARTH_RADIUS
                  const v0_m = v0 * 1000
                  const v_sq = v0_m * v0_m + 2 * GRAVITATIONAL_CONSTANT * EARTH_MASS * (1 / launchData.r_phys - 1 / r0)
                  return v_sq > 0 ? Math.sqrt(v_sq) / 1000 : 0
                })()
              }

              const dotX = mapX(curT)
              const dotY = mapY(curVVal)
              const x0 = mapX(0)
              const x3 = mapX(LAYOUT.mode1.launchDuration)
              const x8 = mapX(LAYOUT.mode1.orbitEntryTime)
              const x15 = mapX(15)

              // 曲线路径
              let curvePath = ''
              if (vtSamplePoints.length > 1) {
                const ptsStr = vtSamplePoints.map(([t, vVal]) => `${mapX(t)},${mapY(vVal)}`)
                curvePath = `M ${ptsStr.join(' L ')}`
              }

              return (
                <g transform={`translate(${vtCardX}, ${vtCardY})`}>
                  {/* 毛玻璃卡片背景 */}
                  <rect
                    width={vtCardWidth}
                    height={vtCardHeight}
                    fill={SCENE_COLORS.labels.glassPanelBg}
                    rx={8}
                    stroke={CHART_COLORS.axisLine}
                    strokeWidth={0.8}
                    filter="url(#card-shadow)"
                  />
                  {/* 标题 */}
                  <text x={vtCardWidth / 2} y={vtPT - 4} fontSize={8 * fontScale} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold" fontFamily="PingFang SC, sans-serif">
                    线速度-时间变化曲线 (v-t)
                  </text>
                  {/* 物理模型说明 */}
                  <text x={vtCardWidth / 2} y={vtPT + 6} fontSize={5 * fontScale} fill={colors.neutral[400]} textAnchor="middle" fontFamily="PingFang SC, sans-serif">
                    (前8秒发射示意，后为开普勒轨道)
                  </text>

                  {/* 三阶段背景填充 */}
                  <rect x={x0} y={vtPT} width={x3 - x0} height={vtIH} fill={colors.neutral[50]} opacity={0.5} />
                  <rect x={x3} y={vtPT} width={x8 - x3} height={vtIH} fill={CHART_COLORS.areaFill} opacity={0.5} />
                  <rect x={x8} y={vtPT} width={x15 - x8} height={vtIH} fill={CHART_COLORS.areaFillAlt} opacity={0.5} />

                  {/* 阶段垂直线 */}
                  <line x1={x3} y1={vtPT} x2={x3} y2={vtPT + vtIH} stroke={colors.neutral[300]} strokeWidth={0.8} strokeDasharray="2,2" />
                  <line x1={x8} y1={vtPT} x2={x8} y2={vtPT + vtIH} stroke={colors.neutral[300]} strokeWidth={0.8} strokeDasharray="2,2" />

                  {/* 区域文字 */}
                  <text x={x0 + (x3 - x0)/2} y={vtPT + 10 * fontScale} fontSize={6 * fontScale} fill={colors.neutral[500]} textAnchor="middle">发射示意</text>
                  <text x={x3 + (x8 - x3)/2} y={vtPT + 10 * fontScale} fontSize={6 * fontScale} fill={CHART_COLORS.primary} textAnchor="middle">转弯示意</text>
                  <text x={x8 + (x15 - x8)/2} y={vtPT + 10 * fontScale} fontSize={6 * fontScale} fill={CHART_COLORS.compareA} textAnchor="middle">轨道运动</text>

                  {/* 坐标轴 */}
                  <line x1={vtPL - 4 * fontScale} y1={vtPT + vtIH} x2={vtPL + vtIW + 6 * fontScale} y2={vtPT + vtIH} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
                  <line x1={vtPL} y1={vtPT - 6 * fontScale} x2={vtPL} y2={vtPT + vtIH + 4 * fontScale} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />

                  {/* 坐标轴方向箭头 */}
                  <polygon points={`${vtPL + vtIW + 6 * fontScale} ${vtPT + vtIH - 2}, ${vtPL + vtIW + 9 * fontScale} ${vtPT + vtIH}, ${vtPL + vtIW + 6 * fontScale} ${vtPT + vtIH + 2}`} fill={CHART_COLORS.axisArrow} />
                  <polygon points={`${vtPL - 2} ${vtPT - 6 * fontScale}, ${vtPL} ${vtPT - 9 * fontScale}, ${vtPL + 2} ${vtPT - 6 * fontScale}`} fill={CHART_COLORS.axisArrow} />

                  {/* 轴标签 */}
                  <text x={vtPL + vtIW + 6 * fontScale} y={vtPT + vtIH + 8 * fontScale} fontSize={6 * fontScale} fill={CHART_COLORS.labelText} textAnchor="end">时间 t (s)</text>
                  <text x={vtPL - 4 * fontScale} y={vtPT - 4 * fontScale} fontSize={6 * fontScale} fill={CHART_COLORS.labelText} textAnchor="end">v (km/s)</text>

                  {/* 刻度 */}
                  <line x1={vtPL - 2} y1={mapY(0)} x2={vtPL} y2={mapY(0)} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
                  <text x={vtPL - 4 * fontScale} y={mapY(0) + 2} fontSize={6 * fontScale} fill={CHART_COLORS.tickLabel} textAnchor="end">0</text>

                  <line x1={vtPL - 2} y1={mapY(7.9)} x2={vtPL} y2={mapY(7.9)} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
                  <text x={vtPL - 4 * fontScale} y={mapY(7.9) + 2} fontSize={6 * fontScale} fill={CHART_COLORS.tickLabel} textAnchor="end">7.9</text>

                  <line x1={vtPL - 2} y1={mapY(11.2)} x2={vtPL} y2={mapY(11.2)} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
                  <text x={vtPL - 4 * fontScale} y={mapY(11.2) + 2} fontSize={6 * fontScale} fill={CHART_COLORS.tickLabel} textAnchor="end">11.2</text>

                  {/* v-t 实时曲线 */}
                  {curvePath && (
                    <path d={curvePath} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={1.2} opacity={0.85} />
                  )}

                  {/* 投影线与游标 */}
                  {isLaunched === 1 && (
                    <g>
                      <line x1={dotX} y1={dotY} x2={dotX} y2={vtPT + vtIH} stroke={CHART_COLORS.reference} strokeWidth={0.5} strokeDasharray="1.5,1.5" />
                      <line x1={vtPL} y1={dotY} x2={dotX} y2={dotY} stroke={CHART_COLORS.reference} strokeWidth={0.5} strokeDasharray="1.5,1.5" />
                      <circle cx={dotX} cy={dotY} r={2.5} fill={PHYSICS_COLORS.velocity} />
                      <circle cx={dotX} cy={dotY} r={4.5} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={0.8} opacity={0.6}>
                        <animate attributeName="r" values="2.5;6;2.5" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  )}
                </g>
              )
            })()}
          </g>
        )}
      </svg>
    </div>
  )
}
