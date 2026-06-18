import { useEffect, useRef, useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { computeRodConstants, computeRodStateAtTime, calculateCuttingEMF } from '@/physics'
import { PHYSICS_COLORS, CHART_COLORS, STROKE, VT_CHART_COLORS, AT_CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { physicsToCanvasWithOrigin, computeScale } from '@/utils/coordinate'
import { Rails, ConductorRod, VectorArrow, VectorDefs } from '@/components/Physics'
import { CuttingEMFHandRule } from './CuttingEMFHandRule'

// 物理世界坐标边界 (物理单位：米)
// x: 从 -1.0 到 11.0m (有效轨道 0 ~ 10.0m，两侧预留边距)
// y: 从 -1.5 到 1.5m (轨道间距 L 为 0.5 ~ 2.0m，关于 0 对称)
const WORLD = { xMin: -1.0, xMax: 11.0, yMin: -1.5, yMax: 1.5 } as const
const X_LIMIT = 10.0 // 轨道最右端限位

export default function CuttingEMF() {
  const { params, time, isPlaying, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const {
    mode = 0, // 0=基础: 恒速, 1=进阶: 自由释放
    B = 1.5,
    L = 1.0,
    v = 2.0,
    R = 2.0,
    F_ext = 2.0,
    m = 0.2,
    showForceAnalysis = 1,
    B_out = 0,
  } = params

  // 1. 动态画布测量与响应式
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 440 })
  const { px, font } = canvasSize

  const chartHeight = px(190)
  const sceneHeight = px(234)

  // 2. 动态比例尺计算 (基于下方运动区域的尺寸)
  const scale = computeScale(canvasSize.width, sceneHeight, WORLD)

  // 3. 计算导体棒当前帧的物理状态
  let x_current = 0
  let v_current = 0
  let a_current = 0
  let F_amp_current = 0
  let I_current = 0
  let EMF_current = 0

  // 特征常数
  const { terminalVelocity: v_m, timeConstant: tau, initialAcceleration: a_0 } = useMemo(
    () => computeRodConstants(B, L, R, m, F_ext),
    [B, L, R, m, F_ext]
  )

  if (mode === 0) {
    // 基础模式：恒速切割
    v_current = v
    a_current = 0
    // 如果速度为负，初始在右端(10.0)，向左移动；如果速度为正，初始在左端(0)，向右移动
    if (v >= 0) {
      x_current = v * time
    } else {
      x_current = X_LIMIT + v * time
    }
    const res = calculateCuttingEMF(B, L, v_current, R, 90, 0, B_out)
    EMF_current = res.EMF
    I_current = res.I
    F_amp_current = res.F_ampere
  } else {
    // 进阶模式：自由释放(变加速)
    const res = computeRodStateAtTime(time, B, L, R, m, F_ext)
    x_current = res.x
    v_current = res.v
    a_current = res.a
    F_amp_current = res.F_amp
    const dirFactor = B_out === 0 ? 1 : -1
    EMF_current = B * L * v_current * dirFactor
    I_current = R > 0 ? EMF_current / R : 0
  }

  // 限位切断
  const hasHitLimit = v_current >= 0 ? x_current >= X_LIMIT : x_current <= 0
  const finalX = Math.max(0, Math.min(X_LIMIT, x_current))
  const finalV = hasHitLimit ? 0 : v_current
  const finalA = hasHitLimit ? 0 : a_current
  const finalFamp = hasHitLimit ? 0 : Math.abs(F_amp_current)
  const finalI = hasHitLimit ? 0 : I_current

  // 计算外力和安培力大小及方向分量 (根据速度方向确定阻碍/驱动受力)
  const ampForceX = finalV > 0 ? -finalFamp : (finalV < 0 ? finalFamp : 0)
  const extForceX = mode === 1 ? F_ext : (finalV > 0 ? finalFamp : (finalV < 0 ? -finalFamp : 0))

  // 监听限位并自动暂停
  useEffect(() => {
    if (isPlaying && hasHitLimit) {
      setIsPlaying(false)
    }
  }, [hasHitLimit, isPlaying, setIsPlaying])

  // 4. 像素定位与坐标系映射
  const originX = 1.0 * scale
  const originY = sceneHeight / 2
  const toCanvas = (wx: number, wy: number) => {
    return physicsToCanvasWithOrigin(wx, wy, originX, originY, scale)
  }

  const railLeftPos = toCanvas(0, 0)
  const railRightPos = toCanvas(X_LIMIT, 0)
  const rodPos = toCanvas(finalX, 0)
  
  const railSpacing = L * scale
  const railLength = railRightPos.cx - railLeftPos.cx
  const railCx = (railLeftPos.cx + railRightPos.cx) / 2
  const railCy = railLeftPos.cy

  // 5. Canvas 粒子与发光残影高频更新
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prevParamsKey = `${B}-${L}-${R}-${mode}-${canvasSize.width}-${canvasSize.height}`
    const isReset = time === 0 || !isPlaying

    // 重置或参数改变时清空尾迹
    if (isReset || canvas.dataset.prevParams !== prevParamsKey) {
      ctx.clearRect(0, 0, canvasSize.width, sceneHeight)
      canvas.dataset.prevParams = prevParamsKey
    }

    // 绘制残影
    if (isPlaying && time > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
      ctx.fillRect(0, 0, canvasSize.width, sceneHeight)

      // 在当前位置绘制半透明淡蓝色棒影
      const rodW = px(6)
      const topY = railCy - railSpacing / 2 - px(6)
      const bottomY = railCy + railSpacing / 2 + px(6)
      ctx.fillStyle = 'rgba(37, 99, 235, 0.35)' // 速度蓝发光
      ctx.fillRect(rodPos.cx - rodW / 2, topY, rodW, bottomY - topY)
    }
  }, [time, isPlaying, B, L, R, mode, finalX, railSpacing, railCy, rodPos.cx, canvasSize.width, canvasSize.height, px])

  // 6. 辅助网格
  const gridLines = useMemo(() => {
    if (!useAnimationStore.getState().showGrid) return null
    const lines = []
    const spacing = px(40)
    const cols = Math.floor(canvasSize.width / spacing)
    const rows = Math.floor(sceneHeight / spacing)

    for (let i = 0; i <= cols; i++) {
      lines.push(
        <line key={`gx-${i}`} x1={i * spacing} y1={0} x2={i * spacing} y2={sceneHeight}
          stroke={PHYSICS_COLORS.grid} strokeWidth={0.5} strokeDasharray="2,3" />
      )
    }
    for (let j = 0; j <= rows; j++) {
      lines.push(
        <line key={`gy-${j}`} x1={0} y1={j * spacing} x2={canvasSize.width} y2={j * spacing}
          stroke={PHYSICS_COLORS.grid} strokeWidth={0.5} strokeDasharray="2,3" />
      )
    }
    return lines
  }, [canvasSize.width, px])

  // 7. 匀强磁场点阵格
  const fieldSymbols = useMemo(() => {
    const symbols = []
    const symbol = B_out === 1 ? '⊙' : '⊗'
    const stepX = px(30)
    const stepY = px(25)

    const xStart = railLeftPos.cx + px(10)
    const xEnd = railRightPos.cx - px(10)
    const yStart = railCy - railSpacing / 2 + px(10)
    const yEnd = railCy + railSpacing / 2 - px(10)

    let idx = 0
    for (let sx = xStart; sx <= xEnd; sx += stepX) {
      for (let sy = yStart; sy <= yEnd; sy += stepY) {
        symbols.push(
          <text
            key={`b-sym-${idx++}`}
            x={sx}
            y={sy}
            fontSize={font(14)}
            fill={PHYSICS_COLORS.magneticField}
            opacity={Math.min(0.45, 0.2 + (B / 3.0) * 0.25)}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {symbol}
          </text>
        )
      }
    }
    return symbols
  }, [B, B_out, railLeftPos.cx, railRightPos.cx, railSpacing, railCy, px, font])

  // 8. 物理量矢量归一化比例尺
  const localSceneScale = useMemo(() => {
    return {
      originX: originX,
      originY: originY,
      scaleX: scale,
      scaleY: scale,
      maxVectorLength: px(60),
      refMagnitudes: {
        velocity: 3.0,
        acceleration: 10.0,
        force: 5.0,
      },
    } as any
  }, [rodPos.cx, railCy, scale, px])

  // 9. 图表解析解采样与自适应轴
  // 时间轴上限
  const T_max = mode === 0 ? 5.0 : Math.max(5.0, Math.min(20.0, 4 * tau))
  // 采样点
  const samplePoints = useMemo(() => {
    const pts = []
    const count = 60
    for (let i = 0; i <= count; i++) {
      const tVal = (i / count) * T_max
      let vVal = 0
      let aVal = 0
      if (mode === 0) {
        vVal = v
        aVal = 0
      } else {
        const exp = Math.exp(-tVal / tau)
        vVal = v_m * (1 - exp)
        aVal = a_0 * exp
      }
      pts.push({ t: tVal, v: vVal, a: aVal })
    }
    return pts
  }, [mode, T_max, v, v_m, a_0, tau])

  // v-t 图 Y 轴上限
  const vYMax = mode === 0 ? Math.max(1.0, Math.abs(v)) * 1.2 : v_m * 1.2
  // a-t 图 Y 轴上限
  const aYMax = mode === 0 ? 1.0 : a_0 * 1.2

  const chartW = (canvasSize.width - px(24)) / 2
  const chartH = chartHeight - px(12)

  // 刻度转换
  const toChartX = (t: number, innerLeft: number, innerW: number) => innerLeft + (t / T_max) * innerW
  const toChartY = (val: number, maxVal: number, innerTop: number, innerH: number, isVelocity = false) => {
    if (isVelocity) {
      const zeroY = innerTop + innerH / 2
      return zeroY - (val / (maxVal || 1.0)) * (innerH / 2)
    }
    return innerTop + innerH - (val / (maxVal || 1.0)) * innerH
  }

  const renderChart = (
    title: string,
    yLabel: string,
    curveColor: string,
    getVal: (p: typeof samplePoints[0]) => number,
    yMax: number,
    curVal: number,
    isVelocity: boolean
  ) => {
    const padL = px(40)
    const padR = px(15)
    const padT = px(24)
    const padB = px(22)

    const innerW = chartW - padL - padR
    const innerH = chartH - padT - padB

    const ptsStr = samplePoints
      .map((p) => `${toChartX(p.t, padL, innerW).toFixed(1)},${toChartY(getVal(p), yMax, padT, innerH, isVelocity).toFixed(1)}`)
      .join(' L ')

    const activePts = samplePoints.filter((p) => p.t <= time)
    const activePtsStr = activePts.length >= 2
      ? 'M ' + activePts.map((p) => `${toChartX(p.t, padL, innerW).toFixed(1)},${toChartY(getVal(p), yMax, padT, innerH, isVelocity).toFixed(1)}`).join(' L ')
      : ''

    const curPtX = toChartX(time, padL, innerW)
    const curPtY = toChartY(curVal, yMax, padT, innerH, isVelocity)

    return (
      <svg width={chartW} height={chartH} className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-visible">
        <rect width={chartW} height={chartH} fill="none" />
        {/* 标题 */}
        <text x={chartW / 2} y={px(18)} fontSize={font(10)} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
          {title}
        </text>

        {/* 坐标轴 */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
        <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

        {/* 坐标轴箭头 */}
        <polygon points={`${padL + innerW} ${padT + innerH - 3}, ${padL + innerW + 4} ${padT + innerH}, ${padL + innerW} ${padT + innerH + 3}`} fill={CHART_COLORS.axisArrow} />
        <polygon points={`${padL - 3} ${padT}, ${padL} ${padT - 4}, ${padL + 3} ${padT}`} fill={CHART_COLORS.axisArrow} />

        {/* 坐标轴标签 */}
        <text x={padL + innerW - 5} y={padT + innerH + 12} fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="end">t / s</text>
        <text x={padL - 10} y={padT - 6} fontSize={font(8)} fill={CHART_COLORS.labelText} textAnchor="start">{yLabel}</text>

        {/* 收尾速度渐近线 */}
        {isVelocity && mode === 1 && (
          <g>
            <line
              x1={padL}
              y1={toChartY(v_m, yMax, padT, innerH, isVelocity)}
              x2={padL + innerW}
              y2={toChartY(v_m, yMax, padT, innerH, isVelocity)}
              stroke={CHART_COLORS.asymptote}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            <text x={padL + innerW - 10} y={toChartY(v_m, yMax, padT, innerH, isVelocity) - 4} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">
              收尾速度 v_m = {v_m.toFixed(2)} m/s
            </text>
          </g>
        )}

        {/* X 轴刻度 (时间) */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
          const tVal = ratio * T_max
          const tx = toChartX(tVal, padL, innerW)
          return (
            <g key={`tx-${idx}`}>
              <line x1={tx} y1={padT + innerH} x2={tx} y2={padT + innerH + 4} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={tx} y={padT + innerH + 12} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">
                {tVal.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* v=0 中间参考线 */}
        {isVelocity && (
          <line
            x1={padL}
            y1={padT + innerH / 2}
            x2={padL + innerW}
            y2={padT + innerH / 2}
            stroke={CHART_COLORS.tickMark}
            strokeWidth={0.6}
            strokeDasharray="2,2"
            opacity={0.65}
          />
        )}

        {/* Y 轴刻度 */}
        {(isVelocity ? [-1.0, -0.5, 0, 0.5, 1.0] : [0, 0.33, 0.66, 1.0]).map((ratio, idx) => {
          const val = ratio * yMax
          const ty = toChartY(val, yMax, padT, innerH, isVelocity)
          return (
            <g key={`ty-${idx}`}>
              <line x1={padL - 4} y1={ty} x2={padL} y2={ty} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={padL - 6} y={ty + 2.5} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">
                {val.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* 预测虚线 */}
        <path d={`M ${ptsStr}`} fill="none" stroke={curveColor} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />

        {/* 动态实线 */}
        {activePtsStr && (
          <path d={activePtsStr} fill="none" stroke={curveColor} strokeWidth={1.8} />
        )}

        {/* 动态游标点 */}
        {time <= T_max && (
          <g>
            <circle cx={curPtX} cy={curPtY} r={3} fill={curveColor} />
            <circle cx={curPtX} cy={curPtY} r={6} fill="none" stroke={curveColor} strokeWidth={0.8} opacity={0.6}>
              <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-neutral-50 p-2 gap-2 relative">
      {/* 上方：v-t 和 a-t 自适应采样图表 */}
      <div className="w-full shrink-0 flex items-center justify-between gap-4" style={{ height: chartHeight }}>
        {renderChart(
          '速度－时间图像 (v-t 图)',
          'v / (m·s⁻¹)',
          VT_CHART_COLORS.velocityCurve,
          (p) => p.v,
          vYMax,
          finalV,
          true
        )}
        {renderChart(
          '加速度－时间图像 (a-t 图)',
          'a / (m·s⁻²)',
          AT_CHART_COLORS.accelCurve,
          (p) => p.a,
          aYMax,
          finalA,
          false
        )}
      </div>

      {/* 下方：Canvas 高频运动轨迹 + SVG 静态与矢量叠加区域 */}
      <div className="w-full relative bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm flex-1 min-h-0" style={{ height: sceneHeight }}>
        {/* 1. 底层高频残影 Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={sceneHeight}
          className="absolute inset-0 z-0 pointer-events-none"
        />

        {/* 2. 上层 SVG 静态、矢量及辅助线层 */}
        <svg
          width={canvasSize.width}
          height={sceneHeight}
          className="absolute inset-0 z-10 w-full h-full bg-transparent"
        >
          <defs>
            <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration, PHYSICS_COLORS.forceNet]} />
          </defs>

          {/* 网格参考背景 */}
          {gridLines}

          {/* 双导轨 */}
          <Rails
            type="horizontal"
            width={canvasSize.width}
            height={sceneHeight}
            cx={railCx}
            cy={railCy}
            length={railLength}
            spacing={railSpacing}
          />

          {/* 磁场背景格 */}
          {fieldSymbols}

          {/* 匀强磁场上方标注 */}
          <text
            x={px(20)}
            y={px(20)}
            fontSize={font(11)}
            fill={PHYSICS_COLORS.magneticField}
            fontWeight="extrabold"
            alignmentBaseline="middle"
          >
            匀强磁场 B = {B.toFixed(1)} T {B_out === 1 ? '(⊙ 垂直纸面向外)' : '(⊗ 垂直纸面向里)'}
          </text>

          {/* 电阻符号与阻值标注 (在轨道左侧端点) */}
          <g>
            {/* 上轨左端和下轨左端到电阻的连线 */}
            <path
              d={`M ${railLeftPos.cx} ${railCy - railSpacing / 2} L ${railLeftPos.cx - px(16)} ${railCy - railSpacing / 2} L ${railLeftPos.cx - px(16)} ${railCy - px(20)} M ${railLeftPos.cx - px(16)} ${railCy + px(20)} L ${railLeftPos.cx - px(16)} ${railCy + railSpacing / 2} L ${railLeftPos.cx} ${railCy + railSpacing / 2}`}
              fill="none"
              stroke={colors.neutral[800]}
              strokeWidth="2.5"
            />
            {/* 电阻框 */}
            <rect
              x={railLeftPos.cx - px(26)}
              y={railCy - px(20)}
              width={px(20)}
              height={px(40)}
              fill="white"
              stroke={colors.neutral[800]}
              strokeWidth="2.5"
              rx={px(2)}
            />
            <text
              x={railLeftPos.cx - px(16)}
              y={railCy}
              fontSize={font(11)}
              fill={colors.neutral[800]}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              R
            </text>
            <text
              x={railLeftPos.cx - px(38)}
              y={railCy}
              fontSize={font(9.5)}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="end"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              电阻 R = {R.toFixed(1)} Ω
            </text>
          </g>

          {/* 导体棒 */}
          <ConductorRod
            type="horizontal"
            x={rodPos.cx}
            currentDir={finalI > 1e-4 ? 'in' : finalI < -1e-4 ? 'out' : 'none'}
            spacing={railSpacing}
            height={sceneHeight}
          />

          {/* 导体棒电动势标注 */}
          {Math.abs(EMF_current) > 0.01 && (
            <text
              x={rodPos.cx - px(15)}
              y={railCy - px(10)}
              fontSize={font(9.5)}
              fill={PHYSICS_COLORS.electricCurrent}
              fontWeight="bold"
              textAnchor="end"
              dominantBaseline="middle"
              style={{ userSelect: 'none' }}
            >
              E_感 = {Math.abs(EMF_current).toFixed(2)} V
            </text>
          )}

          {/* 导体棒电势极性标注 (+ / −) */}
          {Math.abs(EMF_current) > 0.01 && (
            <g>
              {/* 顶端电势极性 (高电势为红正，低电势为蓝负) */}
              <text
                x={rodPos.cx + px(10)}
                y={railCy - railSpacing / 2 - px(8)}
                fontSize={font(12)}
                fill={EMF_current > 0 ? colors.danger[500] : colors.primary[500]}
                fontWeight="extrabold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none' }}
              >
                {EMF_current > 0 ? '+' : '−'}
              </text>
              {/* 底端电势极性 */}
              <text
                x={rodPos.cx + px(10)}
                y={railCy + railSpacing / 2 + px(8)}
                fontSize={font(12)}
                fill={EMF_current > 0 ? colors.primary[500] : colors.danger[500]}
                fontWeight="extrabold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none' }}
              >
                {EMF_current > 0 ? '−' : '+'}
              </text>
            </g>
          )}

          {/* 闭合回路电流流光特效 (顺/逆时针根据电流方向流动) */}
          {Math.abs(finalI) > 1e-4 && (
            <path
              d={`M ${railLeftPos.cx - px(16)} ${railCy - railSpacing / 2} 
                  L ${rodPos.cx} ${railCy - railSpacing / 2} 
                  L ${rodPos.cx} ${railCy + railSpacing / 2} 
                  L ${railLeftPos.cx - px(16)} ${railCy + railSpacing / 2} 
                  Z`}
              fill="none"
              stroke={colors.warning[400]} // 亮黄色电荷流光
              strokeWidth={px(3)}
              strokeDasharray={`${px(1)}, ${px(15)}`}
              strokeLinecap="round"
              strokeDashoffset={finalI >= 0 ? time * px(35) : -time * px(35)}
              opacity={0.85}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* 左右手骨骼手联动 (叠放在通电导体棒下方并随之移动) */}
          {showForceAnalysis === 1 && (
            <g opacity={0.85}>
              <CuttingEMFHandRule
                svgRef={undefined}
                vDir={finalV > 0 ? 1 : finalV < 0 ? -1 : 0}
                B_out={(B_out === 1 ? 1 : 0) as 0 | 1}
                isBack={B_out === 1}
                rule={mode === 1 ? 'left' : 'right'} // 变加速用左手，匀速用右手
                fist={false}
                cx={rodPos.cx}
                cy={railCy + railSpacing / 2 + px(45)}
                scale={canvasSize.scale * 0.42}
                draggable={false}
              />
            </g>
          )}

          {/* 矢量箭头 (只在 showForceAnalysis 开启时渲染) */}
          {showForceAnalysis === 1 && (
            <g>
              {/* 1. 速度 v 箭头 (蓝色，朝右/朝左，垂直向上偏置 0.6) */}
              <VectorArrow
                origin={{ x: finalX, y: L / 2 + 0.3 }}
                vector={{ x: finalV, y: 0 }}
                type="velocity"
                sceneScale={localSceneScale}
                strokeWidth={2.5}
              />
              {Math.abs(finalV) > 0.05 && (
                <text
                  x={rodPos.cx + (finalV > 0 ? px(30) : -px(35))}
                  y={railCy - railSpacing / 2 - px(25)}
                  fontSize={font(10)}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  v = {finalV.toFixed(2)} m/s
                </text>
              )}

              {/* 2. 加速度 a 箭头 (红色，朝右/朝左，移至上轨道上方以腾出下方手势空间) */}
              <VectorArrow
                origin={{ x: finalX, y: L / 2 + 0.7 }}
                vector={{ x: finalA, y: 0 }}
                type="acceleration"
                sceneScale={localSceneScale}
                strokeWidth={2.5}
              />
              {Math.abs(finalA) > 0.05 && (
                <text
                  x={rodPos.cx + (finalA > 0 ? px(30) : -px(35))}
                  y={railCy - railSpacing / 2 - px(55)}
                  fontSize={font(10)}
                  fill={PHYSICS_COLORS.acceleration}
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ userSelect: 'none' }}
                >
                  a = {finalA.toFixed(2)} m/s²
                </text>
              )}

              {/* 3. 外力 F_外 (橙色，垂直向上偏置 0.15) */}
              {((mode === 1 && F_ext > 0) || (mode === 0 && Math.abs(extForceX) > 0.01)) && (
                <g>
                  <VectorArrow
                    origin={{ x: finalX, y: 0.15 }}
                    vector={{ x: extForceX, y: 0 }}
                    type="force"
                    sceneScale={localSceneScale}
                    strokeWidth={2.5}
                  />
                  <text
                    x={rodPos.cx + (extForceX > 0 ? px(35) : -px(35))}
                    y={railCy - px(20)}
                    fontSize={font(9.5)}
                    fill={PHYSICS_COLORS.forceNet}
                    fontWeight="bold"
                    textAnchor={extForceX > 0 ? 'start' : 'end'}
                    style={{ userSelect: 'none' }}
                  >
                    F_外 = {Math.abs(extForceX).toFixed(2)} N
                  </text>
                </g>
              )}

              {/* 4. 安培力 F_安 (橙色，垂直向上偏置 0.15) */}
              {Math.abs(ampForceX) > 0.01 && (
                <g>
                  <VectorArrow
                    origin={{ x: finalX, y: 0.15 }}
                    vector={{ x: ampForceX, y: 0 }}
                    type="force"
                    sceneScale={localSceneScale}
                    strokeWidth={2.5}
                  />
                  <text
                    x={rodPos.cx + (ampForceX > 0 ? px(35) : -px(35))}
                    y={railCy - px(20)}
                    fontSize={font(9.5)}
                    fill={PHYSICS_COLORS.forceNet}
                    fontWeight="bold"
                    textAnchor={ampForceX > 0 ? 'start' : 'end'}
                    style={{ userSelect: 'none' }}
                  >
                    F_安 = {Math.abs(ampForceX).toFixed(2)} N
                  </text>
                </g>
              )}

              {/* 5. 合力 F_合 (橙色，仅在变加速 mode === 1 时渲染，垂直向下偏置 0.15) */}
              {mode === 1 && (
                <g>
                  <VectorArrow
                    origin={{ x: finalX, y: -0.15 }}
                    vector={{ x: F_ext + ampForceX, y: 0 }}
                    type="force"
                    sceneScale={localSceneScale}
                    strokeWidth={2.5}
                  />
                  <text
                    x={rodPos.cx + (F_ext + ampForceX > 0 ? px(25) : -px(25))}
                    y={railCy + px(20)}
                    fontSize={font(9.5)}
                    fill={PHYSICS_COLORS.forceNet}
                    fontWeight="bold"
                    textAnchor={F_ext + ampForceX > 0 ? 'start' : 'end'}
                    style={{ userSelect: 'none' }}
                  >
                    F_合 = {Math.abs(F_ext + ampForceX).toFixed(2)} N
                  </text>
                </g>
              )}

              {/* 匀速运动受力平衡状态说明文字 (置于上轨道左侧，避开下方手势空间) */}
              {mode === 0 && Math.abs(finalV) > 0.05 && (
                <text
                  x={rodPos.cx - px(25)}
                  y={railCy - railSpacing / 2 - px(8)}
                  fontSize={font(9.5)}
                  fill={PHYSICS_COLORS.labelText}
                  fontWeight="bold"
                  textAnchor="end"
                  style={{ userSelect: 'none' }}
                >
                  外力驱动匀速运动 (F_外 = F_安，受力平衡)
                </text>
              )}
            </g>
          )}

          {/* 边缘限位警示图层 */}
          {hasHitLimit && (
            <g>
              <rect
                x={canvasSize.width / 2 - px(100)}
                y={px(15)}
                width={px(200)}
                height={px(25)}
                fill={colors.danger[50]}
                stroke={colors.danger[300]}
                strokeWidth={1.5}
                rx={px(4)}
              />
              <text
                x={canvasSize.width / 2}
                y={px(27.5)}
                fontSize={font(10)}
                fill={colors.danger[600]}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                ⚠️ 已到达导轨边缘限位
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
