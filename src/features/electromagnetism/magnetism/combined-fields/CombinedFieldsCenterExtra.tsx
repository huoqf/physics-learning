import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { RelationChart, VelocityTimeChart } from '@/components/Chart'
import { PHYSICS_COLORS } from '@/theme/physics'
import {
  PARTICLES,
  DEFLECT,
  buildSpectrometerSimulation,
  buildCyclotronSimulation,
  buildDeflectSimulation,
} from './model/combinedFieldsModel'

export default function CombinedFieldsCenterExtra() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    })),
  )

  // ── 获取交互参数 ──
  const activeStage = params.mode ?? 0
  const E = params.electricE ?? 300
  const B1 = params.magneticB1 ?? 0.2
  const B2 = params.magneticB2 ?? 1.5
  const acFreqkHz = params.acFrequency ?? 24
  const U = (params.acVoltage ?? 5) * 1000 // kV → V
  const resonanceLock = !!(params.resonanceLock ?? 0)
  const particleType = params.particleType ?? 0
  const vParticle = params.vParticle ?? 1500

  const p = PARTICLES[particleType] ?? PARTICLES[0]

  // ── 预计算仿真 ──
  const spectrometer = useMemo(() => {
    return buildSpectrometerSimulation(E, B1, B2, vParticle, particleType)
  }, [E, B1, B2, vParticle, particleType])

  const cyclotron = useMemo(() => {
    return buildCyclotronSimulation(B2, U, acFreqkHz * 1000, resonanceLock)
  }, [B2, U, acFreqkHz, resonanceLock])

  const deflect = useMemo(() => {
    return buildDeflectSimulation(E, B2, vParticle, particleType)
  }, [E, B2, vParticle, particleType])

  // 计算回旋加速器的理论最大能量 (keV)
  const maxEkKeV = useMemo(() => {
    const q = 6.0e-18
    const m = 6.0e-23
    const rMax = 0.5
    const maxEkJ = (q * q * B2 * B2 * rMax * rMax) / (2 * m)
    return maxEkJ / 1.602e-16
  }, [B2])

  // 动态计算各模式的最大时间（微秒），用于图表 xDomain
  const maxTimeUs = useMemo(() => {
    if (activeStage === 0) return Math.ceil(spectrometer.endTime * 1e6) || 50
    if (activeStage === 1) return Math.ceil(cyclotron.endTime * 1e6) || 100
    return Math.ceil(deflect.endTime * 1e6) || 50
  }, [activeStage, spectrometer.endTime, cyclotron.endTime, deflect.endTime])

  // 与注册表 maxTime 一致，全局 time 范围 0~10 秒
  const MAX_TIME = 10
  // 全局 time (0~10 秒) → 微秒（与图表 xDomain 一致）
  const cursorTimeUs = (time / MAX_TIME) * maxTimeUs

  // 将物理秒转换为微秒单位的数据点转换器
  const spectrometerEkPointsU = useMemo(() => {
    return spectrometer.ekPoints.map(pt => ({ x: pt.x * 1e6, y: pt.y }))
  }, [spectrometer.ekPoints])

  const cyclotronEkPointsU = useMemo(() => {
    return cyclotron.ekPoints.map(pt => ({ x: pt.x * 1e6, y: pt.y }))
  }, [cyclotron.ekPoints])

  const deflectVPointsU = useMemo(() => {
    return deflect.vPoints.map(pt => ({ x: pt.x * 1e6, y: pt.y }))
  }, [deflect.vPoints])

  // VelocityTimeChart 需要的 {t, v} 格式（微秒, km/s）
  const deflectVTPoints = useMemo(() => {
    return deflect.vPoints.map(pt => ({ t: pt.x * 1e6, v: pt.y }))
  }, [deflect.vPoints])

  // 电场区结束时间（μs），用于"进入磁场"标记位置
  const deflectElectricEndUs = useMemo(() => {
    const electricEndPt = deflect.trajectory.filter(pt => pt.x <= DEFLECT.magneticB2StartX).pop()
    return electricEndPt ? electricEndPt.t * 1e6 : maxTimeUs * 0.5
  }, [deflect.trajectory, maxTimeUs])

  // v-t 图表 yDomain：基于实际数据范围动态计算，留 10% 余量
  const deflectVYDomain = useMemo<[number, number]>(() => {
    if (deflectVPointsU.length === 0) return [0, 2.5]
    const vMin = Math.min(...deflectVPointsU.map(p => p.y))
    const vMax = Math.max(...deflectVPointsU.map(p => p.y))
    const range = vMax - vMin
    if (range < 0.01) return [vMin - 0.2, vMax + 0.2]
    return [vMin - range * 0.2, vMax + range * 0.2]
  }, [deflectVPointsU])

  return (
    <div className="grid grid-cols-2 gap-2 w-full h-full p-2 bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm">
      {activeStage === 0 && (
        <>
          <div className="h-full">
            <RelationChart
              points={spectrometerEkPointsU}
              xDomain={[0, maxTimeUs]}
              yDomain={[0, 500]} // eV 动能范围
              xLabel="时间 t (μs)"
              yLabel="动能 Ek (eV)"
              cursorX={cursorTimeUs}
              title="粒子动能随时间变化 (Ek - t)"
              series="primary"
              variant="mini"
            />
          </div>
          <div className="h-full">
            <RelationChart
              points={spectrometer.filmCurve}
              xDomain={[4.0, 26.0]}
              yDomain={[40, 300]}
              xLabel="质量 m (×10⁻²³ kg)"
              yLabel="落点 x 坐标 (px)"
              cursorX={p.m * 1e23}
              title="底片落点与质量关系"
              series="secondary"
              variant="mini"
              markers={spectrometer.filmMarkers.map(fm => ({
                axis: 'point' as const,
                x: fm.x,
                y: fm.y,
                label: fm.label,
                color: PHYSICS_COLORS.velocity,
              }))}
            />
          </div>
        </>
      )}

      {activeStage === 1 && (
        <>
          <div className="h-full">
            <RelationChart
              points={cyclotronEkPointsU}
              xDomain={[0, maxTimeUs]}
              yDomain={[0, 3000]} // keV
              xLabel="时间 t (μs)"
              yLabel="动能 Ek (keV)"
              cursorX={cursorTimeUs}
              title="台阶加速动能 (Ek - t)"
              series="primary"
              variant="mini"
              markers={[
                {
                  axis: 'horizontal',
                  y: maxEkKeV,
                  label: `限值 ${maxEkKeV.toFixed(1)} keV`,
                  color: PHYSICS_COLORS.acceleration
                }
              ]}
            />
          </div>
          <div className="h-full">
            <RelationChart
              points={cyclotron.ekMaxVsUPoints}
              xDomain={[1.0, 10.0]}
              yDomain={[0, 3000]} // keV
              xLabel="加速电压 U (kV)"
              yLabel="最大动能 (keV)"
              cursorX={params.acVoltage ?? 5}
              title="末动能与电压无关 (Ek - U)"
              series="accent"
              variant="mini"
              cursorLabel={(_x, y) => `${y.toFixed(1)} keV (恒定)`}
            />
          </div>
        </>
      )}

      {activeStage === 2 && (
        <>
          <div className="h-full">
            <VelocityTimeChart
              mode="animated"
              points={deflectVTPoints}
              domainPoints={deflectVTPoints}
              currentTime={cursorTimeUs}
              tMax={maxTimeUs}
              vRange={deflectVYDomain}
              title="速度大小随时间变化 (v - t)"
              xLabel="时间 t (μs)"
              yLabel="速度 v (km/s)"
              showReferenceLine
              showArea
              showCursor
              stages={[
                {
                  from: 0,
                  to: deflectElectricEndUs,
                  color: PHYSICS_COLORS.electricField,
                  label: '电场区',
                },
                {
                  from: deflectElectricEndUs,
                  to: maxTimeUs,
                  color: PHYSICS_COLORS.magneticField,
                  label: '磁场区',
                },
              ]}
            />
          </div>
          <div className="h-full">
            <RelationChart
              points={deflect.tanThetaVsEPoints}
              xDomain={[100, 1000]}
              yDomain={[0, 1.5]}
              xLabel="电场 E (N/C)"
              yLabel="偏角正切 tan θ"
              cursorX={E}
              title="出射偏角与电场关系"
              series="secondary"
              variant="mini"
            />
          </div>
        </>
      )}
    </div>
  )
}
