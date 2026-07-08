import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { BasePhysicsChart } from '@/components/Chart/BasePhysicsChart'
import { useChartContext } from '@/components/Chart/ChartContext'
import { ChartCursor } from '@/components/Chart/ChartCursor'
import { PHYSICS_COLORS, ENERGY_COLORS } from '@/theme/physics'
import {
  computeAngularFrequency,
  computeRealPendulumPeriod,
  generateRealPendulumTrajectory,
  getPendulumStateFromTrajectory
} from '@/physics/oscillation'

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
  const pathData = 'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.x).toFixed(1)}`).join(' L ')
  return <path d={pathData} fill="none" stroke={PHYSICS_COLORS.displacement} strokeWidth={2.5} strokeLinecap="round" />
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
  const realPath = 'M ' + realPoints.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.x).toFixed(1)}`).join(' L ')
  const shmPath = 'M ' + shmPoints.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.x).toFixed(1)}`).join(' L ')
  return (
    <g>
      {/* 简谐近似波形（蓝色虚线） */}
      <path d={shmPath} fill="none" stroke={PHYSICS_COLORS.velocityX} strokeWidth={1.8} strokeDasharray="3 3" opacity={0.6} />
      {/* 真实大角波形（红色实线） */}
      <path d={realPath} fill="none" stroke={PHYSICS_COLORS.accelerationX} strokeWidth={2} strokeLinecap="round" />
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

  const epPath = 'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.ep).toFixed(1)}`).join(' L ')
  const ekPath = 'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.ek).toFixed(1)}`).join(' L ')
  const etotPath = 'M ' + points.map((p) => `${toSvgX(p.t).toFixed(1)},${toSvgY(p.etot).toFixed(1)}`).join(' L ')

  return (
    <g>
      {/* 重力势能 Ep（紫色） */}
      <path d={epPath} fill="none" stroke={ENERGY_COLORS.potentialEnergy} strokeWidth={2} strokeLinecap="round" />
      {/* 动能 Ek（青色） */}
      <path d={ekPath} fill="none" stroke={ENERGY_COLORS.kineticEnergy} strokeWidth={2} strokeLinecap="round" />
      {/* 总机械能 E（灰色） */}
      <path d={etotPath} fill="none" stroke={ENERGY_COLORS.mechanicalEnergy} strokeWidth={2.5} strokeLinecap="round" />
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

  const L = params.L ?? 1.0
  const g = params.g ?? 9.8
  const theta0Deg = params.theta0 ?? 8
  const phiDeg = params.phiDeg ?? 0
  const phi = (phiDeg * Math.PI) / 180
  const mode = params.mode ?? 0 // 0: 简谐运动, 1: 大角对比, 2: 能量守恒
  const mass = 1.0 // 摆球质量

  const T0 = useMemo(() => 2 * Math.PI * Math.sqrt(L / g), [L, g])
  const T_real = useMemo(() => computeRealPendulumPeriod(L, g, theta0Deg), [L, g, theta0Deg])
  const omegaReal = useMemo(() => computeAngularFrequency(T_real), [T_real])
  const realTrajectory = useMemo(() => generateRealPendulumTrajectory(L, g, theta0Deg), [L, g, theta0Deg])

  // 1. 模式 0 简谐位移点生成 (固定展示 2 个简谐周期 0 ~ 2*T0)
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

  // 模式 0 游标点计算 (取模扫描)
  const shmCursorPoints = useMemo(() => {
    if (mode !== 0) return []
    const theta0Rad = (theta0Deg * Math.PI) / 180
    const xMax = L * Math.sin(theta0Rad)
    const omega0 = computeAngularFrequency(T0)
    const tCursor = time % (2 * T0)
    const curX = xMax * Math.cos(omega0 * tCursor + phi)
    return [{ y: curX, label: 'x', series: 'primary' as const }]
  }, [L, theta0Deg, phi, T0, time, mode])

  // 2. 模式 1 真实与简谐位移双曲线生成 (最近 6 周期滚动窗口)
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

  // 模式 1 游标点计算 (跟随真实时间，游标定在最右侧当前时间)
  const mode1CursorPoints = useMemo(() => {
    if (mode !== 1) return []
    const state = getPendulumStateFromTrajectory(realTrajectory, T_real, time, phiDeg, omegaReal)
    const curRealX = L * Math.sin(state.angle)

    const theta0Rad = (theta0Deg * Math.PI) / 180
    const xMax_shm = L * Math.sin(theta0Rad)
    const omega0 = computeAngularFrequency(T0)
    const curShmX = xMax_shm * Math.cos(omega0 * time + phi)

    return [
      { y: curRealX, label: '真实 x', series: 'warm' as const }, // 红色
      { y: curShmX, label: '简谐 x', series: 'primary' as const }, // 蓝色
    ]
  }, [L, realTrajectory, T_real, omegaReal, phiDeg, phi, T0, time, mode, theta0Deg])

  // 3. 模式 2 能量曲线点生成 (固定展示 2 个能量振动周期 0 ~ 2*T_real)
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
  }, [L, g, theta0Deg, phiDeg, T_real, omegaReal, mode])

  // 模式 2 能量游标点计算 (取模扫描)
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
  }, [L, g, theta0Deg, phiDeg, T_real, omegaReal, time, mode])

  // 最大位移量 (m)，模式 1 下取 60° 为最大振幅上限
  const xMax = L * Math.sin((theta0Deg * Math.PI) / 180)
  const xMaxLimit = mode === 1 ? L * Math.sin((60 * Math.PI) / 180) : xMax

  // 能量模式下，Y轴定标保护：避免极小能量下分度值浮点数标签溢出紊乱
  const maxEnergyValue = mass * g * L * (1 - Math.cos((theta0Deg * Math.PI) / 180))
  const yEnergyMax = Math.max(0.1, maxEnergyValue * 1.15)

  return (
    <div className="w-full h-full p-3 flex flex-col gap-3 bg-neutral-50/50">
      {mode === 0 && (
        <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-neutral-500">简谐运动分析</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                <span className="w-2.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: PHYSICS_COLORS.displacement }} />
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

      {mode === 1 && (
        <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-neutral-500">大角对比：位移随时间分叉图</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1" style={{ color: PHYSICS_COLORS.accelerationX }}>
                <span className="w-2.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: PHYSICS_COLORS.accelerationX }} />
                真实摆
              </span>
              <span className="flex items-center gap-1" style={{ color: PHYSICS_COLORS.velocityX }}>
                <span className="w-2.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: PHYSICS_COLORS.velocityX, borderStyle: 'dashed', borderWidth: '1px' }} />
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
              <ComparisonDisplacementPaths realPoints={mode1RealPoints} shmPoints={mode1ShmPoints} />
              <ChartCursor x={time} dataPoints={mode1CursorPoints} />
            </BasePhysicsChart>
          </div>
        </div>
      )}

      {mode === 2 && (
        <div className="flex-1 bg-white p-3 rounded-xl border border-neutral-100 shadow-sm flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-neutral-500">能量守恒分析</span>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1" style={{ color: ENERGY_COLORS.potentialEnergy }}>
                <span className="w-2.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: ENERGY_COLORS.potentialEnergy }} />
                Eₚ
              </span>
              <span className="flex items-center gap-1" style={{ color: ENERGY_COLORS.kineticEnergy }}>
                <span className="w-2.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: ENERGY_COLORS.kineticEnergy }} />
                Eₖ
              </span>
              <span className="flex items-center gap-1" style={{ color: ENERGY_COLORS.mechanicalEnergy }}>
                <span className="w-2.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: ENERGY_COLORS.mechanicalEnergy }} />
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
    </div>
  )
}

