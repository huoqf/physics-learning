import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart, useChartContext, ChartCursor } from '@/components/Chart'
import { PHYSICS_COLORS, ENERGY_COLORS, CANVAS_COLORS } from '@/theme/physics'
import {
  computeAngularFrequency,
  computeRealPendulumPeriod,
  generateRealPendulumTrajectory,
  getPendulumStateFromTrajectory,
} from '@/physics/oscillation'
import { computePendulumExperiment } from '@/physics/experimentPendulum'

// 缓存轨迹，避免重复计算
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trajectoryCache = new Map<string, any>()
function getCachedTrajectory(L: number, g: number, theta0: number) {
  const key = `${L}_${g}_${theta0}`
  if (!trajectoryCache.has(key)) {
    if (trajectoryCache.size > 20) trajectoryCache.clear()
    trajectoryCache.set(key, generateRealPendulumTrajectory(L, g, theta0))
  }
  return trajectoryCache.get(key)
}

// ─── 插件 1：绘制位移-时间（x-t）曲线 ───
function DisplacementPath({ points }: { points: { t: number; x: number }[] }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const pathData =
    'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.x).toFixed(1)}`).join(' L ')
  return (
    <path
      d={pathData}
      fill="none"
      stroke={PHYSICS_COLORS.displacement}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  )
}

// ─── 插件 2：模式 1 下绘制双位移-时间（x-t）对比曲线 ───
function ComparisonDisplacementPaths({
  realPoints,
  shmPoints,
}: {
  realPoints: { t: number; x: number }[]
  shmPoints: { t: number; x: number }[]
}) {
  const ctx = useChartContext()
  if (!ctx || realPoints.length < 2 || shmPoints.length < 2) return null
  const { toSvgX, toSvgY } = ctx
  const realPath =
    'M ' + realPoints.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.x).toFixed(1)}`).join(' L ')
  const shmPath =
    'M ' + shmPoints.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.x).toFixed(1)}`).join(' L ')
  return (
    <g>
      {/* 简谐近似波形（蓝色虚线） */}
      <path
        d={shmPath}
        fill="none"
        stroke={PHYSICS_COLORS.velocityX}
        strokeWidth={1.8}
        strokeDasharray="3 3"
        opacity={0.6}
      />
      {/* 真实大角波形（红色实线） */}
      <path
        d={realPath}
        fill="none"
        stroke={PHYSICS_COLORS.accelerationX}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  )
}

// ─── 插件 3：绘制能量-时间（E-t）实时曲线 ───
interface EnergyPoint {
  t: number
  ek: number
  ep: number
  etot: number
}
function EnergyPaths({ points }: { points: EnergyPoint[] }) {
  const ctx = useChartContext()
  if (!ctx || points.length < 2) return null
  const { toSvgX, toSvgY } = ctx

  const epPath =
    'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.ep).toFixed(1)}`).join(' L ')
  const ekPath =
    'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.ek).toFixed(1)}`).join(' L ')
  const etotPath =
    'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.etot).toFixed(1)}`).join(' L ')

  return (
    <g>
      {/* 重力势能 Ep（紫色） */}
      <path
        d={epPath}
        fill="none"
        stroke={ENERGY_COLORS.potentialEnergy}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* 动能 Ek（青色） */}
      <path
        d={ekPath}
        fill="none"
        stroke={ENERGY_COLORS.kineticEnergy}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* 总机械能 E（灰色） */}
      <path
        d={etotPath}
        fill="none"
        stroke={ENERGY_COLORS.mechanicalEnergy}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  )
}

// ─── 插件 4：模式 3 下绘制 T²-L 理论拟合直线与数据采样点 ───
interface T2LChartProps {
  theorySlope: number
  measuredSlope: number
  points: Array<{ L: number; T2_measured: number }>
  currentL: number
  currentT2: number
}
function T2LPlotPlugin({
  theorySlope,
  measuredSlope,
  points,
  currentL,
  currentT2,
}: T2LChartProps) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const x0 = 0
  const y0 = 0
  const x1 = 1.35
  const y1_theory = theorySlope * x1
  const y1_meas = measuredSlope * x1

  return (
    <g>
      {/* 理论基准直线（虚线） */}
      <line
        x1={toSvgX(x0)}
        y1={toSvgY(y0)}
        x2={toSvgX(x1)}
        y2={toSvgY(y1_theory)}
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth={1.8}
        strokeDasharray="4 3"
        opacity={0.65}
      />

      {/* 实测数据拟合直线（实线） */}
      <line
        x1={toSvgX(x0)}
        y1={toSvgY(y0)}
        x2={toSvgX(x1)}
        y2={toSvgY(y1_meas)}
        stroke={PHYSICS_COLORS.accelerationX}
        strokeWidth={2.2}
        opacity={0.9}
      />

      {/* 拟合参考散点 */}
      {points.map((pt, i) => (
        <circle
          key={i}
          cx={toSvgX(pt.L)}
          cy={toSvgY(pt.T2_measured)}
          r={3.5}
          fill={PHYSICS_COLORS.position}
          opacity={0.7}
        />
      ))}

      {/* 当前测量实验点 */}
      <circle
        cx={toSvgX(currentL)}
        cy={toSvgY(currentT2)}
        r={6}
        fill={PHYSICS_COLORS.accelerationX}
        stroke={CANVAS_COLORS.white}
        strokeWidth={1.5}
      />
      {/* 当前点坐标文字 */}
      <text
        x={toSvgX(currentL) + 8}
        y={toSvgY(currentT2) - 8}
        fontSize={10}
        fill={PHYSICS_COLORS.accelerationX}
        fontWeight="bold"
      >
        ({currentL.toFixed(3)}m, {currentT2.toFixed(3)}s²)
      </text>
    </g>
  )
}

export default function SimplePendulumCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  const mode = params.mode ?? 0 // 0: 简谐运动, 1: 大角对比, 2: 能量守恒, 3: 高考实验
  const l_line = params.l_line ?? 0.985
  const d_mm = params.d_mm ?? 20.0
  const effectiveL = mode === 3 ? l_line + d_mm / 2000 : (params.L ?? 1.0)
  const L = effectiveL
  const g = params.g ?? 9.8
  const theta0Deg = mode === 3 ? Math.min(5, params.theta0_exp ?? params.theta0 ?? 4) : (params.theta0 ?? 8)
  const phiDeg = mode === 3 ? 0 : (params.phiDeg ?? 0)
  const phi = (phiDeg * Math.PI) / 180
  const mass = 1.0

  const T0 = useMemo(() => 2 * Math.PI * Math.sqrt(L / g), [L, g])
  const T_real = useMemo(() => computeRealPendulumPeriod(L, g, theta0Deg), [L, g, theta0Deg])
  const omegaReal = useMemo(() => computeAngularFrequency(T_real), [T_real])
  const realTrajectory = useMemo(
    () => generateRealPendulumTrajectory(L, g, theta0Deg),
    [L, g, theta0Deg],
  )

  // 1. 模式 0 简谐位移点生成
  const shmPoints = useMemo(() => {
    if (mode !== 0) return []
    const pts = []
    const theta0Rad = (theta0Deg * Math.PI) / 180
    const xMax = L * Math.sin(theta0Rad)
    const omega0 = computeAngularFrequency(T0)
    const duration = 2 * T0
    const steps = 100
    const step = duration / steps
    for (let i = 0; i <= steps; i++) {
      const t = i * step
      pts.push({ t, x: xMax * Math.cos(omega0 * t + phi) })
    }
    return pts
  }, [L, theta0Deg, phi, T0, mode])

  const shmCursorPoints = useMemo(() => {
    if (mode !== 0) return []
    const theta0Rad = (theta0Deg * Math.PI) / 180
    const xMax = L * Math.sin(theta0Rad)
    const omega0 = computeAngularFrequency(T0)
    const tCursor = time % (2 * T0)
    const curX = xMax * Math.cos(omega0 * tCursor + phi)
    return [{ y: curX, label: 'x', series: 'primary' as const }]
  }, [L, theta0Deg, phi, T0, time, mode])

  // 2. 模式 1 真实与简谐位移双曲线生成
  const tMin = useMemo(() => (time <= 6 * T_real ? 0 : time - 6 * T_real), [time, T_real])
  const tMax = useMemo(() => (time <= 6 * T_real ? 6 * T_real : time), [time, T_real])

  const mode1RealPoints = useMemo(() => {
    if (mode !== 1) return []
    const pts = []
    const steps = 120
    const step = (tMax - tMin) / steps
    for (let i = 0; i <= steps; i++) {
      const t = tMin + i * step
      const state = getPendulumStateFromTrajectory(realTrajectory, T_real, t, phiDeg, omegaReal)
      pts.push({ t, x: L * Math.sin(state.angle) })
    }
    return pts
  }, [L, realTrajectory, T_real, omegaReal, phiDeg, tMin, tMax, mode])

  const mode1ShmPoints = useMemo(() => {
    if (mode !== 1) return []
    const pts = []
    const theta0Rad = (theta0Deg * Math.PI) / 180
    const xMax_shm = L * Math.sin(theta0Rad)
    const omega0 = computeAngularFrequency(T0)
    const steps = 120
    const step = (tMax - tMin) / steps
    for (let i = 0; i <= steps; i++) {
      const t = tMin + i * step
      pts.push({ t, x: xMax_shm * Math.cos(omega0 * t + phi) })
    }
    return pts
  }, [L, theta0Deg, phi, T0, tMin, tMax, mode])

  const mode1CursorPoints = useMemo(() => {
    if (mode !== 1) return []
    const state = getPendulumStateFromTrajectory(realTrajectory, T_real, time, phiDeg, omegaReal)
    const curRealX = L * Math.sin(state.angle)

    const theta0Rad = (theta0Deg * Math.PI) / 180
    const xMax_shm = L * Math.sin(theta0Rad)
    const omega0 = computeAngularFrequency(T0)
    const curShmX = xMax_shm * Math.cos(omega0 * time + phi)

    return [
      { y: curRealX, label: '真实 x', series: 'warm' as const },
      { y: curShmX, label: '简谐 x', series: 'primary' as const },
    ]
  }, [L, realTrajectory, T_real, omegaReal, phiDeg, phi, T0, time, mode, theta0Deg])

  // 3. 模式 2 能量曲线点生成
  const energyPoints = useMemo<EnergyPoint[]>(() => {
    if (mode !== 2) return []
    const pts: EnergyPoint[] = []
    const traj = getCachedTrajectory(L, g, theta0Deg)
    const duration = 2 * T_real
    const steps = 120
    const step = duration / steps

    for (let i = 0; i <= steps; i++) {
      const t = i * step
      const state = getPendulumStateFromTrajectory(traj, T_real, t, phiDeg, omegaReal)
      const ep = mass * g * L * (1 - Math.cos(state.angle))
      const ek = 0.5 * mass * (L * state.angularVelocity) * (L * state.angularVelocity)
      pts.push({ t, ek, ep, etot: ek + ep })
    }
    return pts
  }, [L, g, theta0Deg, phiDeg, T_real, omegaReal, mode, mass])

  const energyCursorPoints = useMemo(() => {
    if (mode !== 2) return []
    const traj = getCachedTrajectory(L, g, theta0Deg)
    const tCursor = time % (2 * T_real)
    const state = getPendulumStateFromTrajectory(traj, T_real, tCursor, phiDeg, omegaReal)

    const ep = mass * g * L * (1 - Math.cos(state.angle))
    const ek = 0.5 * mass * (L * state.angularVelocity) * (L * state.angularVelocity)
    const etot = ep + ek
    return [
      { y: ep, label: 'Eₚ', series: 'primary' as const },
      { y: ek, label: 'Eₖ', series: 'success' as const },
      { y: etot, label: 'E_总', series: 'warm' as const },
    ]
  }, [L, g, theta0Deg, phiDeg, T_real, omegaReal, time, mode, mass])

  // 4. 模式 3 高考实验 T²-L 数据分析
  const expData = useMemo(() => {
    if (mode !== 3) return null
    return computePendulumExperiment({
      l_line: params.l_line,
      d_mm: params.d_mm,
      n_cycles: params.n_cycles,
      g_true: params.g ?? 9.8,
      timing_err: params.timing_err,
      theta0: theta0Deg,
    })
  }, [mode, params.l_line, params.d_mm, params.n_cycles, params.g, params.timing_err, theta0Deg])

  const xMax = L * Math.sin((theta0Deg * Math.PI) / 180)
  const xMaxLimit = mode === 1 ? L * Math.sin((60 * Math.PI) / 180) : xMax
  const maxEnergyValue = mass * g * L * (1 - Math.cos((theta0Deg * Math.PI) / 180))
  const yEnergyMax = Math.max(0.1, maxEnergyValue * 1.15)

  return (
    <div className="w-full h-full p-3 flex flex-col gap-3 bg-neutral-50/50">
      {/* ── 模式 0: 简谐运动分析 ── */}
      {mode === 0 && (
        <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-neutral-500">简谐运动分析</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{ backgroundColor: PHYSICS_COLORS.displacement }}
                />
                水平位移 x (m)
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <BasePhysicsChart
              xDomain={[0, 2 * T0]}
              yDomain={[-xMax * 1.15, xMax * 1.15]}
              xLabel="时间 t (s)"
              yLabel="位移 x (m)"
              yBaseline={0}
              variant="mini"
            >
              <DisplacementPath points={shmPoints} />
              <ChartCursor x={time % (2 * T0)} dataPoints={shmCursorPoints} />
            </BasePhysicsChart>
          </div>
        </div>
      )}

      {/* ── 模式 1: 大角对比 ── */}
      {mode === 1 && (
        <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-neutral-500">大角对比：位移随时间分叉图</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1" style={{ color: PHYSICS_COLORS.accelerationX }}>
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{ backgroundColor: PHYSICS_COLORS.accelerationX }}
                />
                真实摆
              </span>
              <span className="flex items-center gap-1" style={{ color: PHYSICS_COLORS.velocityX }}>
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{
                    backgroundColor: PHYSICS_COLORS.velocityX,
                    borderStyle: 'dashed',
                    borderWidth: '1px',
                  }}
                />
                简谐摆
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <BasePhysicsChart
              xDomain={[tMin, tMax]}
              yDomain={[-xMaxLimit * 1.15, xMaxLimit * 1.15]}
              xLabel="时间 t (s)"
              yLabel="位移 x (m)"
              yBaseline={0}
              variant="mini"
            >
              <ComparisonDisplacementPaths
                realPoints={mode1RealPoints}
                shmPoints={mode1ShmPoints}
              />
              <ChartCursor x={time} dataPoints={mode1CursorPoints} />
            </BasePhysicsChart>
          </div>
        </div>
      )}

      {/* ── 模式 2: 能量守恒分析 ── */}
      {mode === 2 && (
        <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-neutral-500">能量守恒分析</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1" style={{ color: ENERGY_COLORS.potentialEnergy }}>
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{ backgroundColor: ENERGY_COLORS.potentialEnergy }}
                />
                Eₚ
              </span>
              <span className="flex items-center gap-1" style={{ color: ENERGY_COLORS.kineticEnergy }}>
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{ backgroundColor: ENERGY_COLORS.kineticEnergy }}
                />
                Eₖ
              </span>
              <span className="flex items-center gap-1" style={{ color: ENERGY_COLORS.mechanicalEnergy }}>
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{ backgroundColor: ENERGY_COLORS.mechanicalEnergy }}
                />
                E_总
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <BasePhysicsChart
              xDomain={[0, 2 * T_real]}
              yDomain={[0, yEnergyMax]}
              xLabel="时间 t (s)"
              yLabel="能量 E (J)"
              variant="mini"
            >
              <EnergyPaths points={energyPoints} />
              <ChartCursor x={time % (2 * T_real)} dataPoints={energyCursorPoints} />
            </BasePhysicsChart>
          </div>
        </div>
      )}

      {/* ── 模式 3: 高考实验 T²-L 图像与数据拟合 ── */}
      {mode === 3 && expData && (
        <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-neutral-600">
              高考实验：T²-L 图像斜率法求 g
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1" style={{ color: PHYSICS_COLORS.accelerationX }}>
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{ backgroundColor: PHYSICS_COLORS.accelerationX }}
                />
                实测拟合线
              </span>
              <span className="flex items-center gap-1 text-neutral-400">
                <span
                  className="w-2.5 h-1.5 rounded-sm inline-block"
                  style={{ backgroundColor: PHYSICS_COLORS.velocity, opacity: 0.7 }}
                />
                理论基准
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <BasePhysicsChart
              xDomain={[0, 1.4]}
              yDomain={[0, 6.0]}
              xLabel="有效摆长 L (m)"
              yLabel="周期平方 T² (s²)"
              variant="mini"
            >
              <T2LPlotPlugin
                theorySlope={expData.slopeT2_L}
                measuredSlope={expData.slopeT2_L_measured}
                points={expData.comparisonPoints}
                currentL={expData.effectiveLength}
                currentT2={expData.measuredPeriod * expData.measuredPeriod}
              />
            </BasePhysicsChart>
          </div>

          {/* 图像特征指标栏 */}
          <div className="mt-2 pt-2 border-t border-neutral-100 flex flex-col gap-1 text-[11px]">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-50 p-1.5 rounded border border-neutral-100">
                <span className="text-neutral-400">实测斜率 k_测: </span>
                <span className="font-mono font-bold text-neutral-800">
                  {expData.slopeT2_L_measured.toFixed(3)} s²/m
                </span>
              </div>
              <div className="bg-neutral-50 p-1.5 rounded border border-neutral-100">
                <span className="text-neutral-400">反求 g: </span>
                <span className="font-mono font-bold text-emerald-600">
                  {expData.measuredG.toFixed(3)} m/s²
                </span>
              </div>
            </div>
            <div className="text-[10px] text-neutral-400 px-0.5">
              理论基准 k_理 = {expData.slopeT2_L.toFixed(3)} s²/m | 图像法关系 g = 4π²/k_测
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
