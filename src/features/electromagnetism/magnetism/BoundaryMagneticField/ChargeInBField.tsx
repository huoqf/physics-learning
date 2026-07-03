import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { SimulationView } from './SimulationView'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { RelationChart, type RelationMarker } from '@/components/Chart'
import { calcParticleRadius } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physics'

export default function ChargeInBField() {
  const params = useAnimationStore((s) => s.params)
  const mode = params.mode ?? 0 // 0: 基础, 1: 进阶
  const [sizeRef, size] = useCanvasSize(CANVAS_PRESETS.wide)

  const isWide = size.width > size.height * 1.1

  if (mode === 0) {
    return (
      <div ref={sizeRef} className={`w-full h-full flex overflow-hidden ${isWide ? 'flex-row' : 'flex-col'}`}>
        <div className="flex-1 relative min-w-0 min-h-0 border-neutral-200" style={{ borderRightWidth: isWide ? 1 : 0, borderBottomWidth: isWide ? 0 : 1 }}>
          <SimulationView />
        </div>
        <div className={`relative bg-white flex flex-col p-4 shrink-0 min-w-0 min-h-0 ${isWide ? 'w-80 h-full' : 'w-full h-64'}`}>
          <h3 className="text-sm font-bold text-neutral-700 mb-2">物理量关联曲线</h3>
          <div className="flex-1 min-h-0 relative">
            <BoundaryRelationChart />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={sizeRef} className="w-full h-full relative min-w-0 min-h-0">
      <SimulationView />
    </div>
  )
}

function BoundaryRelationChart() {
  const params = useAnimationStore((s) => s.params)
  const boundaryType = params.boundaryType ?? 0

  if (boundaryType === 0) {
    return <SingleBoundaryChart params={params} />
  }
  if (boundaryType === 1) {
    return <DoubleBoundaryChart params={params} />
  }
  return <CircularBoundaryChart params={params} />
}

interface ChartProps {
  params: Record<string, number>
}

function SingleBoundaryChart({ params }: ChartProps) {
  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 12
  const B = params.B ?? 1.2
  const theta = params.theta ?? 60

  const R = calcParticleRadius(m, v, q, B)

  // 1. 单边界：射出点距离 x_out 与射入夹角 theta 的正弦关系
  const points = useMemo(() => {
    const list = []
    for (let th = 15; th <= 165; th += 2) {
      const thRad = (th * Math.PI) / 180
      const xOut = 2 * R * Math.sin(thRad)
      list.push({ x: th, y: xOut })
    }
    return list
  }, [R])

  return (
    <div className="w-full h-full min-h-0 min-w-0 relative bg-neutral-50 rounded-lg p-2">
      <RelationChart
        points={points}
        xDomain={[15, 165]}
        xLabel="射入夹角 θ (°)"
        yLabel="射出距离 x_out (m)"
        title=""
        cursorX={theta}
        cursorLabel={(_x, y) => `${y.toFixed(2)}m`}
        showZeroLine={false}
      />
    </div>
  )
}

function DoubleBoundaryChart({ params }: ChartProps) {
  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 12
  const B = params.B ?? 1.2
  const theta = params.theta ?? 60
  const d = params.magneticWidth ?? 5.0

  const sign = (q * B) >= 0 ? -1 : 1
  const sign_y = sign === -1 ? 1 : -1
  const thetaRad = (theta * Math.PI) / 180
  const R_crit = Math.abs(d / (1 - sign_y * Math.cos(thetaRad)))
  const v_crit = (Math.abs(q * B) * R_crit) / m

  // 2. 双平行边界：最大偏转高度 y_max 与速度 v 的折线关系
  const points = useMemo(() => {
    const list = []
    for (let vVal = 2.0; vVal <= 20.0; vVal += 0.2) {
      const R_val = calcParticleRadius(m, vVal, q, B)
      const yMaxPossible = R_val * (1 - sign_y * Math.cos(thetaRad))
      const yMax = Math.min(d, yMaxPossible)
      list.push({ x: vVal, y: yMax })
    }
    if (v_crit >= 2.0 && v_crit <= 20.0) {
      const R_crit_val = calcParticleRadius(m, v_crit, q, B)
      const yMaxPossible = R_crit_val * (1 - sign_y * Math.cos(thetaRad))
      const yMax = Math.min(d, yMaxPossible)
      list.push({ x: v_crit, y: yMax })
    }
    return list.sort((a, b) => a.x - b.x)
  }, [m, q, B, sign_y, thetaRad, d, v_crit])

  const markers: RelationMarker[] = [
    { y: d, label: `边界 d = ${d.toFixed(1)}m`, color: PHYSICS_COLORS.magneticField },
  ]
  if (v_crit >= 2.0 && v_crit <= 20.0) {
    markers.push({ x: v_crit, label: `临界 v = ${v_crit.toFixed(1)}m/s`, color: PHYSICS_COLORS.appliedForce })
  }

  return (
    <div className="w-full h-full min-h-0 min-w-0 relative bg-neutral-50 rounded-lg p-2">
      <RelationChart
        points={points}
        xDomain={[2.0, 20.0]}
        yDomain={[0, Math.max(d * 1.25, 7.5)]}
        xLabel="速度 v (m/s)"
        yLabel="偏转最大高度 y_max (m)"
        title=""
        cursorX={v}
        cursorLabel={(_x, y) => `${y.toFixed(2)}m`}
        markers={markers}
      />
    </div>
  )
}

function CircularBoundaryChart({ params }: ChartProps) {
  const q = params.q ?? 1
  const m = params.m ?? 1
  const v = params.v ?? 12
  const B = params.B ?? 1.2
  const Rb = params.magneticRadius ?? 4.0

  // 3. 圆形边界：偏转角 Δφ 与速度 v 的非线性递减关系
  const points = useMemo(() => {
    const list = []
    for (let vVal = 2.0; vVal <= 20.0; vVal += 0.2) {
      const R_val = calcParticleRadius(m, vVal, q, B)
      const deltaPhi = 2 * Math.atan(Rb / R_val)
      const deltaPhiDeg = (deltaPhi * 180) / Math.PI
      list.push({ x: vVal, y: deltaPhiDeg })
    }
    return list
  }, [m, q, B, Rb])

  return (
    <div className="w-full h-full min-h-0 min-w-0 relative bg-neutral-50 rounded-lg p-2">
      <RelationChart
        points={points}
        xDomain={[2.0, 20.0]}
        yDomain={[0, 180]}
        xLabel="速度 v (m/s)"
        yLabel="偏转角 Δφ (°)"
        title=""
        cursorX={v}
        cursorLabel={(_x, y) => `${y.toFixed(1)}°`}
      />
    </div>
  )
}
