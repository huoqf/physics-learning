/**
 * FaradayLaw.tsx — 法拉第电磁感应定律交互动画（[M4-1]）
 *
 * 布局：左侧物理仿真沙盒（左右分区，左为动画，右为图表）
 *       右侧数据与图像看板（Φ-t / E-t 实时滚动双图表）
 *
 * 物理模型：
 *   1. 基础模式 (mode = 0)：磁铁匀速往返穿过线圈，产生非线性磁通量与脉冲式感应电动势。
 *   2. 进阶模式 (mode = 1)：匀变磁场 ΔB/Δt，产生线性变化的磁通量与恒定的感应电动势。
 *
 * @agent-rule 遵循 useCanvasSize + theme token（CANVAS_STYLE / PHYSICS_COLORS / SCENE_COLORS / CHART_COLORS）
 * @agent-rule 禁止组件内裸调 requestAnimationFrame（使用 store 中的 time 驱动）
 */
import { useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, SCENE_COLORS } from '@/theme/physics'
import { CHART_COLORS } from '@/theme/physics/chartColors'
import { colors } from '@/theme/colors'
import { computeFaradayMagnetFlux, FaradayChartPoint } from '@/physics/electromagnetism'

// ─── 引入物理通用组件 ───────────────────────────────────────────────────────
import { BarMagnet } from '@/components/Physics/BarMagnet'
import { LightBulb } from '@/components/Physics/LightBulb'
import { Galvanometer } from '@/components/Physics/Galvanometer'
import { Solenoid } from '@/components/Physics/Solenoid'
import { ParametricMagneticField } from '@/components/Physics/ParametricMagneticField'

// ─── 物理与几何常量 ─────────────────────────────────────────────────────────
const MAGNET_MIN_X = 60
const COIL_X = 220              // 线圈在沙盒中的水平中心 px
const COIL_RX = 35              // 线圈水平半径 px
const COIL_RY = 60              // 线圈垂直半径 px
const MAGNET_LEN = 100          // 条形磁铁水平长度 px
const MAGNET_H = 30             // 条形磁铁高度 px
const MAGNET_MAX_X = 360        // 磁铁移动右边界 px
const RANGE_X = MAGNET_MAX_X - MAGNET_MIN_X

const COIL_AREA_M2 = 0.02       // 线圈等效面积 S = 0.02 m^2
const CHART_DURATION = 10       // 图表采样总时长 10 秒
const CHART_STEPS = 120         // 采样步数

// ─── 辅助计算函数（往返运动与磁通量计算） ──────────────────────────────────────
/**
 * 获取磁铁在给定时间 t 时的物理状态。
 * @param t 当前播放时间 (s)
 * @param N 线圈匝数 n
 * @param B 磁铁磁感感应强度 (T)
 * @param v 磁铁移动物理速度 (px/s)
 */
function getMagnetStateAt(t: number, N: number, B: number, v: number) {
  if (v <= 0) {
    // 磁铁静止在初始位置
    const x = MAGNET_MIN_X
    const phi = computeFaradayMagnetFlux(x, B)
    return { x, phi, emf: 0, B }
  }

  const cycle = 2 * RANGE_X
  const dist = (v * t) % cycle
  const goingForward = dist < RANGE_X
  const x = goingForward ? MAGNET_MIN_X + dist : MAGNET_MAX_X - (dist - RANGE_X)

  // 瞬时磁通量
  const phi = computeFaradayMagnetFlux(x, B)

  // 通过微元数值求导获取瞬时感应电动势 E = -N * dPhi/dt
  const dt = 0.001
  const nextDist = (v * (t + dt)) % cycle
  const nextGoingForward = nextDist < RANGE_X
  const nextX = nextGoingForward ? MAGNET_MIN_X + nextDist : MAGNET_MAX_X - (nextDist - RANGE_X)
  const nextPhi = computeFaradayMagnetFlux(nextX, B)
  const dPhi_dt = (nextPhi - phi) / dt
  const emf = -N * dPhi_dt

  return { x, phi, emf, B }
}

/**
 * 获取匀变磁场模式下给定时间 t 的物理状态。
 * @param t 当前播放时间 (s)
 * @param N 线圈匝数 n
 * @param dBdt 磁感应强度变化率 k (T/s)
 * @param B0 初始磁场强度 (T)
 */
function getUniformStateAt(t: number, N: number, dBdt: number, B0: number) {
  const B = B0 + dBdt * t
  const phi = B * COIL_AREA_M2
  const emf = -N * dBdt * COIL_AREA_M2 // E = -N * dPhi/dt
  return { B, phi, emf }
}

export default function FaradayLaw() {
  const { params, time, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize({ width: 800, height: 440 })
  const { font } = canvasSize

  // ── 物理参数提取 ──────────────────────────────────────────────────────
  const mode = params.mode ?? 0 // 0: 磁铁变速, 1: 匀变磁场
  const N = params.N ?? 50
  const B_magnet = params.B ?? 1.2
  const magnetV = params.magnetV ?? 140
  const dBdt = params.dBdt ?? 0.5
  const B0 = -dBdt * 5 // 初始磁强设为 -k*5，使得第 5 秒时磁通量恰好为 0

  const tNow = time % CHART_DURATION // 图像指示线时间限制在 0~10s 循环

  // ── 解析生成图表背景曲线数据 ──────────────────────────────────────────
  const chartPoints = useMemo<FaradayChartPoint[]>(() => {
    const pts: FaradayChartPoint[] = []
    for (let i = 0; i <= CHART_STEPS; i++) {
      const t = (i / CHART_STEPS) * CHART_DURATION
      if (mode === 0) {
        const state = getMagnetStateAt(t, N, B_magnet, magnetV)
        pts.push({ t, phi: state.phi, emf: state.emf })
      } else {
        const state = getUniformStateAt(t, N, dBdt, B0)
        pts.push({ t, phi: state.phi, emf: state.emf })
      }
    }
    return pts
  }, [mode, N, B_magnet, magnetV, dBdt, B0])

  // 获取当前指示时刻的精确插值状态
  const currentState = useMemo(() => {
    if (mode === 0) {
      return getMagnetStateAt(tNow, N, B_magnet, magnetV)
    } else {
      const uState = getUniformStateAt(tNow, N, dBdt, B0)
      return { x: 0, phi: uState.phi, emf: uState.emf, B: uState.B }
    }
  }, [mode, tNow, N, B_magnet, magnetV, dBdt, B0])

  // ── 布局与绘制参数 ──────────────────────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height
  const sandboxW = W * 0.53         // 左侧沙盒宽度约 424 px
  const dashLeft = sandboxW + 16    // 右侧图表起点 px
  const dashRight = W - 12          // 右侧图表终点 px
  const dashW = dashRight - dashLeft

  const sandboxCy = H / 2
  const coilY = sandboxCy - 50      // 线圈中心上移，下方留出电路图

  // ── 图表映射比例 ────────────────────────────────────────────────────
  // 磁通量最大范围，纵向对称
  const maxPhiVal = useMemo(() => {
    const maxVal = Math.max(...chartPoints.map(p => Math.abs(p.phi)))
    return maxVal > 1e-5 ? maxVal : 0.05
  }, [chartPoints])

  // 电动势最大范围，纵向对称
  const maxEmfVal = useMemo(() => {
    const maxVal = Math.max(...chartPoints.map(p => Math.abs(p.emf)))
    return maxVal > 1e-5 ? maxVal : 1.0
  }, [chartPoints])

  const chartPadTop = 26
  const chartH = (H - chartPadTop * 3) / 2
  const yPhiMid = chartPadTop + chartH / 2
  const yEmfMid = chartPadTop * 2 + chartH + chartH / 2
  const chartHalfH = chartH * 0.42

  const toChartX = (t: number) => {
    return dashLeft + (t / CHART_DURATION) * dashW
  }
  const toPhiY = (phi: number) => {
    return yPhiMid - (phi / maxPhiVal) * chartHalfH
  }
  const toEmfY = (emf: number) => {
    return yEmfMid - (emf / maxEmfVal) * chartHalfH
  }

  // ── 生成图像的 SVG 路径 ────────────────────────────────────────────────
  const phiPathD = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return chartPoints.map((p, i) => {
      const x = toChartX(p.t).toFixed(1)
      const y = toPhiY(p.phi).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }, [chartPoints, maxPhiVal])

  const emfPathD = useMemo(() => {
    if (chartPoints.length < 2) return ''
    return chartPoints.map((p, i) => {
      const x = toChartX(p.t).toFixed(1)
      const y = toEmfY(p.emf).toFixed(1)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }, [chartPoints, maxEmfVal])

  // 当前播放点的指示线 x
  const indicatorX = toChartX(tNow)

  // ── 基础模式电路结构及电子流动（参数化计算，消灭死像素） ────────────────
  const circuitRightX = Math.min(COIL_X + COIL_RX + 50, sandboxW - 24)
  const circuitLeftX = Math.max(COIL_X - COIL_RX - 50, 24)
  const bulbY = coilY + COIL_RY + 35
  const meterY = coilY + COIL_RY + 35

  const solenoidW = 60
  const solenoidH = COIL_RY * 2
  const solenoidLeftX = COIL_X - solenoidW / 2
  const solenoidRightX = COIL_X + solenoidW / 2
  const solenoidWireY = coilY + 120

  const bulbScale = 0.85
  const bulbPinY = bulbY + 18 * bulbScale

  const meterScale = 50 / 120
  const meterTopY = meterY - 22
  const meterPinY = meterTopY + 100 * meterScale
  const meterPinLeftX = circuitLeftX - 30 * meterScale
  const meterPinRightX = circuitLeftX + 30 * meterScale

  const bottomWireY = Math.max(meterPinY, bulbPinY) + 10

  // 闭合回路导线 A、B、C 节点串
  const wirePointsA = `${solenoidLeftX},${solenoidWireY} ${meterPinLeftX},${solenoidWireY} ${meterPinLeftX},${meterPinY}`
  const wirePointsB = `${meterPinRightX},${meterPinY} ${meterPinRightX},${bottomWireY} ${circuitRightX},${bottomWireY} ${circuitRightX},${bulbPinY}`
  const wirePointsC = `${circuitRightX},${bulbPinY} ${circuitRightX},${solenoidWireY} ${solenoidRightX},${solenoidWireY}`

  // 导线段定义，用于自由电子动画（完全参数化折线回路，对接通用组件引脚）
  const circuitPath = [
    { x: solenoidLeftX, y: solenoidWireY },
    { x: meterPinLeftX, y: solenoidWireY },
    { x: meterPinLeftX, y: meterPinY },
    { x: meterPinRightX, y: meterPinY },
    { x: meterPinRightX, y: bottomWireY },
    { x: circuitRightX, y: bottomWireY },
    { x: circuitRightX, y: bulbPinY },
    { x: circuitRightX, y: solenoidWireY },
    { x: solenoidRightX, y: solenoidWireY },
  ]

  // 计算回路总长度与电子插值
  const totalPathLen = useMemo(() => {
    let len = 0
    for (let i = 1; i < circuitPath.length; i++) {
      const dx = circuitPath[i].x - circuitPath[i - 1].x
      const dy = circuitPath[i].y - circuitPath[i - 1].y
      len += Math.hypot(dx, dy)
    }
    return len
  }, [])

  const getElectronicPos = (fraction: number) => {
    const target = ((fraction % 1) + 1) % 1 * totalPathLen
    let acc = 0
    for (let i = 1; i < circuitPath.length; i++) {
      const dx = circuitPath[i].x - circuitPath[i - 1].x
      const dy = circuitPath[i].y - circuitPath[i - 1].y
      const segLen = Math.hypot(dx, dy)
      if (acc + segLen >= target) {
        const ratio = (target - acc) / segLen
        return {
          x: circuitPath[i - 1].x + dx * ratio,
          y: circuitPath[i - 1].y + dy * ratio,
        }
      }
      acc += segLen
    }
    return circuitPath[0]
  }

  // 电子漂移：由 EMF 的正负驱动方向与速度
  const electronFlowSpeed = currentState.emf * 25
  const electronCount = 10
  const electronParticles = useMemo(() => {
    if (mode !== 0 || Math.abs(currentState.emf) < 0.005) return []
    return Array.from({ length: electronCount }, (_, i) => {
      // 漂移量随时间累加
      const drift = (i / electronCount + time * electronFlowSpeed / 100) % 1
      return getElectronicPos(drift)
    })
  }, [mode, currentState.emf, time])

  // ── 电力参数和仪表偏转等均由通用组件内部自适应计算 ─────────────────────

  // ── 进阶模式背景 6x5 磁感线阵列 ───────────────────────────────────────
  const fieldDots = useMemo(() => {
    const rows = 5
    const cols = 6
    const grid: { x: number; y: number }[] = []
    const xSpacing = sandboxW / (cols + 1)
    const ySpacing = H / (rows + 1)
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        grid.push({ x: c * xSpacing, y: r * ySpacing })
      }
    }
    return grid
  }, [sandboxW, H])

  // 瞬时磁感应强度 B，以及它的正负极性
  const currentB = mode === 1 ? (currentState.B ?? 0) : 0
  const B_is_in = currentB >= 0 // B >= 0 代表穿过向里 ⊗，B < 0 代表向外 ⊙
  const magneticFieldOpacity = Math.min(0.85, Math.abs(currentB) * 0.7)

  // 线圈边缘高亮圈的亮度与线宽
  const glowOpacity = Math.min(0.95, Math.abs(currentState.emf) * 0.8)
  const glowWidth = 3 + Math.min(6, Math.abs(currentState.emf) * 4)

  // 进阶模式电流方向：E 的符号决定。当 E > 0 (磁场向里减小或向外增加)，电流为顺时针 (方向1)；E < 0 时为逆时针。
  const inducedCurrentDir = currentState.emf > 0.001 ? 1 : currentState.emf < -0.001 ? -1 : 0

  return (
    <div ref={containerRef} className="w-full h-full select-none">
      <svg
        width={W}
        height={H}
        className="bg-white rounded-xl shadow-md overflow-hidden"
        style={{ fontFamily: CANVAS_STYLE.font.family }}
      >
        <defs>
          {/* 仿真区与图表区分割用 clipPath */}
          <clipPath id="sandboxClip">
            <rect x="0" y="0" width={sandboxW} height={H} />
          </clipPath>
          <clipPath id="chartClip">
            <rect x={dashLeft} y="0" width={dashW} height={H} />
          </clipPath>
        </defs>

        {/* ═══════════════════ 中间分界隔离线 ═══════════════════ */}
        <line
          x1={sandboxW}
          y1={0}
          x2={sandboxW}
          y2={H}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.reference}
        />

        {/* ═══════════════════ 左屏：物理仿真沙盒 ═══════════════════ */}
        <g clipPath="url(#sandboxClip)">
          {mode === 0 ? (
            // ───────────────── 基础模式：磁铁变速 ─────────────────
            <g>
              {/* 1. 磁铁的磁场分布（使用通用参数化磁场组件） */}
              {(() => {
                const curMagnetX = currentState.x ?? MAGNET_MIN_X
                const mCenterX = curMagnetX + MAGNET_LEN / 2
                const mCenterY = coilY
                const overlapRatio = Math.max(0, 1 - Math.abs(COIL_X - mCenterX) / (COIL_RX + MAGNET_LEN / 2))
                const extOpacity = 0.12 + Math.min(1, overlapRatio * 2) * 0.48

                return (
                  <g transform={`translate(${mCenterX}, ${mCenterY})`} opacity={extOpacity}>
                    <ParametricMagneticField
                      w={MAGNET_LEN}
                      h={MAGNET_H}
                      pole={-1} // 左N右S
                      canvasHeight={H}
                      lineColor={PHYSICS_COLORS.magneticField}
                    />
                  </g>
                )
              })()}

              {/* 2. 参数化闭合电路连线 */}
              <polyline
                points={wirePointsA}
                fill="none"
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={wirePointsB}
                fill="none"
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={wirePointsC}
                fill="none"
                stroke={PHYSICS_COLORS.objectStroke}
                strokeWidth={CANVAS_STYLE.stroke.objectLine}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 3. 多匝铜线圈（使用通用螺线管组件，隐藏铁芯以供磁铁穿过） */}
              <Solenoid
                x={COIL_X}
                y={coilY}
                width={solenoidW}
                height={solenoidH}
                rx={COIL_RX}
                turns={N}
                current={currentState.emf * 1.5}
                time={time}
                showIronCore={false}
              />
              <text
                x={COIL_X}
                y={coilY + COIL_RY + 18}
                fontSize={CANVAS_STYLE.font.axisSize}
                fill={PHYSICS_COLORS.labelText}
                textAnchor="middle"
                fontWeight="bold"
              >
                N = {N} 匝
              </text>

              {/* 4. 灯泡与发光效果（使用通用灯泡组件） */}
              <LightBulb
                x={circuitRightX}
                y={bulbY}
                power={currentState.emf * currentState.emf * 2.5}
                time={time}
                scale={bulbScale}
                showLabel={true}
                label="灯泡"
              />

              {/* 5. 电流表仪表盘（使用通用电流计组件） */}
              <Galvanometer
                x={circuitLeftX}
                y={meterTopY}
                value={currentState.emf * 10 / 45}
                width={50}
                height={46}
              />
              <text
                x={circuitLeftX}
                y={meterY + 32}
                fontSize={font(9)}
                fill={PHYSICS_COLORS.labelText}
                textAnchor="middle"
                fontWeight="bold"
              >
                G 电流计
              </text>

              {/* 6. 自由电子漂移颗粒 */}
              {electronParticles.map((p, i) => (
                <circle
                  key={`electron-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="2.8"
                  fill={PHYSICS_COLORS.negativeCharge}
                  opacity={0.8}
                />
              ))}

              {/* 7. 条形磁铁（使用通用磁铁组件） */}
              {(() => {
                const curMagnetX = currentState.x ?? MAGNET_MIN_X
                return (
                  <g>
                    <BarMagnet
                      x={curMagnetX + MAGNET_LEN / 2}
                      y={coilY}
                      width={MAGNET_LEN}
                      height={MAGNET_H}
                      pole={-1} // 左N右S
                    />
                    {/* 速度指示矢量 */}
                    {isPlaying && Math.abs(magnetV) > 0 && (
                      <path
                        d={`M ${curMagnetX + MAGNET_LEN / 2} ${coilY - 22} L ${curMagnetX + MAGNET_LEN / 2 + (magnetV > 0 ? 30 : -30)} ${coilY - 22}`}
                        stroke={PHYSICS_COLORS.velocity}
                        strokeWidth="2.5"
                        markerEnd="url(#arrFluxGold)"
                      />
                    )}
                  </g>
                )
              })()}
            </g>
          ) : (
            // ───────────────── 进阶模式：匀变磁场 ─────────────────
            <g>
              {/* 1. 动态磁场 6x5 阵列 */}
              {fieldDots.map((pt, i) => (
                <g
                  key={`fdot-${i}`}
                  transform={`translate(${pt.x}, ${pt.y})`}
                  opacity={magneticFieldOpacity}
                >
                  {B_is_in ? (
                    // ⊗ 磁感线垂直纸面向里
                    <g>
                      <circle
                        cx="0"
                        cy="0"
                        r="6"
                        fill="none"
                        stroke={PHYSICS_COLORS.magneticFieldCross}
                        strokeWidth="1.2"
                      />
                      <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth="1.2" />
                      <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth="1.2" />
                    </g>
                  ) : (
                    // ⊙ 磁感线垂直纸面向外
                    <g>
                      <circle
                        cx="0"
                        cy="0"
                        r="6"
                        fill="none"
                        stroke={PHYSICS_COLORS.magneticFieldDot}
                        strokeWidth="1.2"
                      />
                      <circle cx="0" cy="0" r="1.8" fill={PHYSICS_COLORS.magneticFieldDot} />
                    </g>
                  )}
                </g>
              ))}

              {/* 2. 磁感应强度状态条 */}
              <text
                x="16"
                y="30"
                fontSize={CANVAS_STYLE.font.axisSize}
                fill={PHYSICS_COLORS.magneticFieldCross}
                fontWeight="bold"
              >
                B(t) = B₀ + k·t
              </text>
              <text
                x="16"
                y="46"
                fontSize={font(10)}
                fill={PHYSICS_COLORS.labelText}
              >
                当前 B = {currentB.toFixed(2)} T ({B_is_in ? '向里 ⊗' : '向外 ⊙'})
              </text>
              <text
                x="16"
                y="62"
                fontSize={font(10)}
                fill={PHYSICS_COLORS.trackHistory}
              >
                变化率 k = {dBdt.toFixed(1)} T/s
              </text>

              {/* 3. 线圈圆环 (处于正中心) */}
              <ellipse
                cx={sandboxW / 2}
                cy={coilY + 10}
                rx={COIL_RX * 1.5}
                ry={COIL_RY * 1.5}
                fill="none"
                stroke={SCENE_COLORS.coil.copperBase}
                strokeWidth={CANVAS_STYLE.stroke.objectLine * 1.8}
              />

              {/* 4. 黄色高亮环 (电流激活发光) */}
              {glowOpacity > 0.02 && (
                <ellipse
                  cx={sandboxW / 2}
                  cy={coilY + 10}
                  rx={COIL_RX * 1.5}
                  ry={COIL_RY * 1.5}
                  fill="none"
                  stroke={colors.accent[400]}
                  strokeWidth={glowWidth}
                  strokeLinecap="round"
                  strokeDasharray="14, 18"
                  // 随时间改变虚线偏移，模拟电流流向
                  strokeDashoffset={inducedCurrentDir !== 0 ? time * 140 * inducedCurrentDir : 0}
                  opacity={glowOpacity}
                  style={{
                    filter: `drop-shadow(0px 0px 4px ${colors.accent[300]})`,
                  }}
                />
              )}

              {/* 电流方向辅助指示箭头 */}
              {inducedCurrentDir !== 0 && (
                <g transform={`translate(${sandboxW / 2}, ${coilY - COIL_RY * 1.5 + 10})`}>
                  <path
                    d={inducedCurrentDir > 0 ? "M -15 -10 L 15 -10" : "M 15 -10 L -15 -10"}
                    stroke={colors.accent[600]}
                    strokeWidth="2"
                    markerEnd="url(#arrFluxGold)"
                  />
                  <text
                    x="0"
                    y="-15"
                    fontSize={font(9)}
                    fill={colors.accent[700]}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    感应电流 {inducedCurrentDir > 0 ? '顺时针' : '逆时针'}
                  </text>
                </g>
              )}

              {/* 线圈匝数回显 */}
              <text
                x={sandboxW / 2}
                y={coilY + COIL_RY * 1.5 + 32}
                fontSize={CANVAS_STYLE.font.axisSize}
                fill={PHYSICS_COLORS.labelText}
                textAnchor="middle"
                fontWeight="bold"
              >
                线圈: {N} 匝
              </text>
            </g>
          )}

          {/* 底部定理说明板 (统一) */}
          <g transform={`translate(12, ${H - 46})`}>
            <rect
              width={sandboxW - 24}
              height="36"
              rx="6"
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={CANVAS_STYLE.stroke.grid}
              opacity="0.9"
            />
            <text x="12" y="15" fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              法拉第电磁感应定律：E = n · (ΔΦ/Δt)
            </text>
            <text x="12" y="29" fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight}>
              电动势大小取决于磁通量变化率，而不是磁通量大小的值。
            </text>
          </g>
        </g>

        {/* ═══════════════════ 右侧：图像与数据看板 ═══════════════════ */}
        <g clipPath="url(#chartClip)">
          {/* 标题 */}
          <text
            x={dashLeft + dashW / 2}
            y={chartPadTop - 8}
            fontSize={CANVAS_STYLE.font.labelSize}
            fill={PHYSICS_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            实时数据看板 (t = 0 ~ 10s)
          </text>

          {/* ── Φ-t 图 (磁通量) ── */}
          <g>
            {/* 网格网格背景 */}
            {[-1, -0.5, 0, 0.5, 1].map((ratio) => {
              const y = yPhiMid + ratio * chartHalfH
              return (
                <line
                  key={`phigrid-${ratio}`}
                  x1={dashLeft}
                  y1={y}
                  x2={dashRight}
                  y2={y}
                  stroke={CHART_COLORS.gridLine}
                  strokeWidth="0.5"
                  strokeDasharray={ratio === 0 ? undefined : '2,3'}
                />
              )
            })}
            {/* 坐标轴 */}
            <line
              x1={dashLeft}
              y1={yPhiMid}
              x2={dashRight}
              y2={yPhiMid}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={CANVAS_STYLE.stroke.axis}
            />
            <line
              x1={dashLeft}
              y1={yPhiMid - chartHalfH - 4}
              x2={dashLeft}
              y2={yPhiMid + chartHalfH + 4}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={CANVAS_STYLE.stroke.axis}
            />
            {/* 坐标轴标签 */}
            <text
              x={dashLeft}
              y={yPhiMid - chartHalfH - 6}
              fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.magneticField}
              fontWeight="bold"
            >
              Φ − t 图 (Wb)
            </text>
            {/* 曲线 */}
            <path
              d={phiPathD}
              fill="none"
              stroke={CHART_COLORS.primary}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* 焦点球与垂直红指示线 */}
            <line
              x1={indicatorX}
              y1={yPhiMid - chartHalfH}
              x2={indicatorX}
              y2={yPhiMid + chartHalfH}
              stroke={CHART_COLORS.reference}
              strokeWidth={CANVAS_STYLE.stroke.chartRef}
              strokeDasharray="4,3"
            />
            <circle
              cx={indicatorX}
              cy={toPhiY(currentState.phi)}
              r="4"
              fill={CHART_COLORS.primary}
              stroke="white"
              strokeWidth="1.5"
            />
            <text
              x={indicatorX + 6}
              y={Math.max(yPhiMid - chartHalfH + 10, Math.min(yPhiMid + chartHalfH - 4, toPhiY(currentState.phi) - 6))}
              fontSize={font(10)}
              fill={CHART_COLORS.primary}
              fontWeight="bold"
            >
              Φ={currentState.phi.toFixed(3)} Wb
            </text>
          </g>

          {/* ── E-t 图 (感应电动势) ── */}
          <g>
            {/* 网格背景 */}
            {[-1, -0.5, 0, 0.5, 1].map((ratio) => {
              const y = yEmfMid + ratio * chartHalfH
              return (
                <line
                  key={`emfgrid-${ratio}`}
                  x1={dashLeft}
                  y1={y}
                  x2={dashRight}
                  y2={y}
                  stroke={CHART_COLORS.gridLine}
                  strokeWidth="0.5"
                  strokeDasharray={ratio === 0 ? undefined : '2,3'}
                />
              )
            })}
            {/* 坐标轴 */}
            <line
              x1={dashLeft}
              y1={yEmfMid}
              x2={dashRight}
              y2={yEmfMid}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={CANVAS_STYLE.stroke.axis}
            />
            <line
              x1={dashLeft}
              y1={yEmfMid - chartHalfH - 4}
              x2={dashLeft}
              y2={yEmfMid + chartHalfH + 4}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={CANVAS_STYLE.stroke.axis}
            />
            {/* 坐标轴标签 */}
            <text
              x={dashLeft}
              y={yEmfMid - chartHalfH - 6}
              fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.electricCurrent}
              fontWeight="bold"
            >
              E − t 图 (V)
            </text>
            <text
              x={dashRight + 2}
              y={yEmfMid + 4}
              fontSize={font(9)}
              fill={CHART_COLORS.tickLabel}
            >
              t/s
            </text>
            {/* 曲线 */}
            <path
              d={emfPathD}
              fill="none"
              stroke={CHART_COLORS.compareC}
              strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* 焦点球与垂直指示线 */}
            <line
              x1={indicatorX}
              y1={yEmfMid - chartHalfH}
              x2={indicatorX}
              y2={yEmfMid + chartHalfH}
              stroke={CHART_COLORS.reference}
              strokeWidth={CANVAS_STYLE.stroke.chartRef}
              strokeDasharray="4,3"
            />
            <circle
              cx={indicatorX}
              cy={toEmfY(currentState.emf)}
              r="4"
              fill={CHART_COLORS.compareC}
              stroke="white"
              strokeWidth="1.5"
            />
            <text
              x={indicatorX + 6}
              y={Math.max(yEmfMid - chartHalfH + 10, Math.min(yEmfMid + chartHalfH - 4, toEmfY(currentState.emf) - 6))}
              fontSize={font(10)}
              fill={CHART_COLORS.compareC}
              fontWeight="bold"
            >
              E={currentState.emf.toFixed(2)} V
            </text>

            {/* 时间轴刻度数字 */}
            <g fontSize={font(9)} fill={CHART_COLORS.tickLabel}>
              {[0, 2.5, 5.0, 7.5, 10.0].map((tVal) => (
                <text
                  key={`tick-${tVal}`}
                  x={toChartX(tVal)}
                  y={yEmfMid + chartHalfH + 12}
                  textAnchor="middle"
                >
                  {tVal.toFixed(1)}
                </text>
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
