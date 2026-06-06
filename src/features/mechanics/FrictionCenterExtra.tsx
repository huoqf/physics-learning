import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { calculateFrictionPullModel, calculateFrictionInclineModel } from '@/physics'

export const FrictionCenterExtra: FC = () => {
  const { params } = useAnimationStore()

  const mode = params.mode ?? 0
  const m = params.m ?? 5
  const mu = params.mu ?? 0.3
  const g = params.g ?? 9.8
  const F_applied = params.F_applied ?? 15
  const angle = params.angle ?? 15

  const weight = m * g
  const mu_static = mu * 1.12

  const pullResult = calculateFrictionPullModel(m, mu, F_applied, g)
  const inclineResult = calculateFrictionInclineModel(m, mu, angle, g)

  const margin = { left: 18, right: 14, top: 18, bottom: 18 }
  const plotW = 100 - margin.left - margin.right
  const plotH = 100 - margin.top - margin.bottom
  const originX = margin.left
  const originY = margin.top + plotH

  const model1Data = useMemo(() => {
    if (mode !== 0) return null
    const { f_max, f_slip, f_actual, isSliding } = calculateFrictionPullModel(m, mu, F_applied, g)
    const toSvgX = (F: number) => originX + (F / 60) * plotW
    const toSvgY = (f: number) => originY - (f / 40) * plotH
    const p0 = `${toSvgX(0)},${toSvgY(0)}`
    const p1 = `${toSvgX(f_max)},${toSvgY(f_max)}`
    const p2 = `${toSvgX(f_max + 0.1)},${toSvgY(f_slip)}`
    const p3 = `${toSvgX(60)},${toSvgY(f_slip)}`
    const linePath = `M ${p0} L ${p1} L ${p2} L ${p3}`
    return { f_max, f_slip, f_actual, isSliding, toSvgX, toSvgY, linePath }
  }, [mode, m, mu, g, F_applied])

  const model2Data = useMemo(() => {
    if (mode !== 1) return null
    const { criticalAngle, f_actual, isSliding } = calculateFrictionInclineModel(m, mu, angle, g)
    const toSvgX = (deg: number) => originX + (deg / 90) * plotW
    const toSvgY = (f: number) => originY - (f / 40) * plotH
    const points: string[] = []
    const step = 1.5
    const criticalAngleRad = (criticalAngle * Math.PI) / 180
    for (let deg = 0; deg <= 90; deg += step) {
      const { f_actual: fVal } = calculateFrictionInclineModel(m, mu, deg, g)
      if (Math.abs(deg - criticalAngle) < step) {
        const fMaxCritical = mu_static * weight * Math.cos(criticalAngleRad)
        points.push(`${toSvgX(criticalAngle - 0.1)},${toSvgY(fMaxCritical)}`)
        const fSlipCritical = mu * weight * Math.cos(criticalAngleRad)
        points.push(`${toSvgX(criticalAngle + 0.1)},${toSvgY(fSlipCritical)}`)
      } else {
        points.push(`${toSvgX(deg)},${toSvgY(fVal)}`)
      }
    }
    const linePath = `M ` + points.join(' L ')
    return { criticalAngle, f_actual, isSliding, toSvgX, toSvgY, linePath }
  }, [mode, m, mu, g, weight, angle, mu_static])

  const fs = 3.6
  const sfs = 2.8

  // 浮动状态卡片数据
  const statusCard = mode === 0 ? {
    title: '水平拉力模型',
    items: [
      { label: '状态', value: pullResult.isSliding ? '滑动' : '静止', color: pullResult.isSliding ? 'text-amber-600' : 'text-emerald-600' },
      { label: '摩擦力 f', value: `${pullResult.f_actual.toFixed(1)} N` },
      { label: '加速度 a', value: `${pullResult.a.toFixed(2)} m/s²` },
    ]
  } : {
    title: '斜面倾角模型',
    items: [
      { label: '状态', value: inclineResult.isSliding ? '下滑' : '静止', color: inclineResult.isSliding ? 'text-amber-600' : 'text-emerald-600' },
      { label: '摩擦力 f', value: `${inclineResult.f_actual.toFixed(1)} N` },
      { label: '临界角 θ_c', value: `${inclineResult.criticalAngle.toFixed(1)}°` },
    ]
  }

  return (
    <div className="w-full h-full flex gap-3 px-1.5 py-1.5 border-b border-neutral-200/60 bg-neutral-50/50">
      {/* 全宽图表区域 */}
      <div className="flex-1 bg-white rounded-xl shadow-sm p-3 border border-neutral-200/80 flex items-center justify-center min-w-0 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="chart-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M1,1 L5,3 L1,5 Z" fill={PHYSICS_COLORS.labelText} />
            </marker>
          </defs>

          {/* 标题 */}
          <text x={margin.left} y={margin.top - 7} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            {mode === 0 ? 'f - F 图像' : 'f - θ 图像'}
          </text>

          {/* Y轴网格 */}
          {[10, 20, 30].map((val) => {
            const y = mode === 0 ? model1Data!.toSvgY(val) : model2Data!.toSvgY(val)
            return (
              <line
                key={`grid-y-${val}`}
                x1={originX} y1={y} x2={originX + plotW} y2={y}
                stroke={PHYSICS_COLORS.grid} strokeWidth={0.25} strokeDasharray="1,1"
              />
            )
          })}
          {/* X轴网格 */}
          {mode === 0 ? (
            [15, 30, 45].map((val) => {
              const x = model1Data!.toSvgX(val)
              return (
                <line
                  key={`grid-x-mode1-${val}`}
                  x1={x} y1={margin.top} x2={x} y2={originY}
                  stroke={PHYSICS_COLORS.grid} strokeWidth={0.25} strokeDasharray="1,1"
                />
              )
            })
          ) : (
            [30, 60].map((val) => {
              const x = model2Data!.toSvgX(val)
              return (
                <line
                  key={`grid-x-mode2-${val}`}
                  x1={x} y1={margin.top} x2={x} y2={originY}
                  stroke={PHYSICS_COLORS.grid} strokeWidth={0.25} strokeDasharray="1,1"
                />
              )
            })
          )}

          {/* 坐标轴 */}
          <line x1={originX - 2} y1={originY} x2={originX + plotW + 3} y2={originY}
            stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} markerEnd="url(#chart-arrow)" />
          <line x1={originX} y1={originY + 2} x2={originX} y2={margin.top - 3}
            stroke={PHYSICS_COLORS.labelText} strokeWidth={0.4} markerEnd="url(#chart-arrow)" />

          <text x={originX + plotW + 4} y={originY + 1.2} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            {mode === 0 ? 'F (N)' : 'θ (°)'}
          </text>
          <text x={originX - 5} y={margin.top - 4} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            f (N)
          </text>

          {/* 刻度值 */}
          {[10, 20, 30].map((val) => {
            const y = mode === 0 ? model1Data!.toSvgY(val) : model2Data!.toSvgY(val)
            return (
              <g key={`tick-y-${val}`}>
                <line x1={originX - 1} y1={y} x2={originX} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                <text x={originX - 2.5} y={y + 1} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">{val}</text>
              </g>
            )
          })}
          {mode === 0 ? (
            [15, 30, 45, 60].map((val) => {
              const x = model1Data!.toSvgX(val)
              return (
                <g key={`tick-x-m1-${val}`}>
                  <line x1={x} y1={originY} x2={x} y2={originY + 1} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                  <text x={x} y={originY + 4.2} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">{val}</text>
                </g>
              )
            })
          ) : (
            [30, 60, 90].map((val) => {
              const x = model2Data!.toSvgX(val)
              return (
                <g key={`tick-x-m2-${val}`}>
                  <line x1={x} y1={originY} x2={x} y2={originY + 1} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                  <text x={x} y={originY + 4.2} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">{val}</text>
                </g>
              )
            })
          )}
          <text x={originX - 2.5} y={originY + 3.5} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">0</text>

          {/* 曲线 */}
          {mode === 0 && model1Data && (
            <path d={model1Data.linePath} fill="none" stroke={PHYSICS_COLORS.friction} strokeWidth={0.7} />
          )}
          {mode === 1 && model2Data && (
            <path d={model2Data.linePath} fill="none" stroke={PHYSICS_COLORS.friction} strokeWidth={0.7} />
          )}

          {/* 游标 */}
          {mode === 0 && model1Data && (
            <g>
              <line x1={model1Data.toSvgX(F_applied)} y1={originY} x2={model1Data.toSvgX(F_applied)} y2={model1Data.toSvgY(model1Data.f_actual)}
                stroke={PHYSICS_COLORS.axis} strokeWidth={0.25} strokeDasharray="1,1" />
              <line x1={originX} y1={model1Data.toSvgY(model1Data.f_actual)} x2={model1Data.toSvgX(F_applied)} y2={model1Data.toSvgY(model1Data.f_actual)}
                stroke={PHYSICS_COLORS.friction} strokeWidth={0.25} strokeDasharray="1,1" />
              <line x1={model1Data.toSvgX(model1Data.f_max)} y1={margin.top} x2={model1Data.toSvgX(model1Data.f_max)} y2={originY}
                stroke={PHYSICS_COLORS.frictionStatic} strokeWidth={0.3} strokeDasharray="2,2" opacity={0.5} />
              <text x={model1Data.toSvgX(model1Data.f_max) + 1.5} y={margin.top + 5} fontSize={2.5} fill={PHYSICS_COLORS.frictionStatic} fontWeight="bold">
                f_max
              </text>
              <circle cx={model1Data.toSvgX(F_applied)} cy={model1Data.toSvgY(model1Data.f_actual)} r={2.2} fill={PHYSICS_COLORS.friction} opacity={0.25} />
              <circle cx={model1Data.toSvgX(F_applied)} cy={model1Data.toSvgY(model1Data.f_actual)} r={1.2} fill={PHYSICS_COLORS.friction} stroke="#FFFFFF" strokeWidth={0.35} />
              <text x={model1Data.toSvgX(F_applied) + 3} y={model1Data.toSvgY(model1Data.f_actual) - 2} fontSize={3.2} fill={PHYSICS_COLORS.friction} fontWeight="bold">
                {model1Data.isSliding ? '滑动' : '静摩擦'} f = {model1Data.f_actual.toFixed(1)} N
              </text>
            </g>
          )}

          {mode === 1 && model2Data && (
            <g>
              <line x1={model2Data.toSvgX(angle)} y1={originY} x2={model2Data.toSvgX(angle)} y2={model2Data.toSvgY(model2Data.f_actual)}
                stroke={PHYSICS_COLORS.axis} strokeWidth={0.25} strokeDasharray="1,1" />
              <line x1={originX} y1={model2Data.toSvgY(model2Data.f_actual)} x2={model2Data.toSvgX(angle)} y2={model2Data.toSvgY(model2Data.f_actual)}
                stroke={PHYSICS_COLORS.friction} strokeWidth={0.25} strokeDasharray="1,1" />
              <line x1={model2Data.toSvgX(model2Data.criticalAngle)} y1={margin.top} x2={model2Data.toSvgX(model2Data.criticalAngle)} y2={originY}
                stroke={PHYSICS_COLORS.frictionStatic} strokeWidth={0.3} strokeDasharray="2,2" opacity={0.5} />
              <text x={model2Data.toSvgX(model2Data.criticalAngle) + 1.5} y={margin.top + 5} fontSize={2.5} fill={PHYSICS_COLORS.frictionStatic} fontWeight="bold">
                θ_c ≈ {model2Data.criticalAngle.toFixed(1)}°
              </text>
              <circle cx={model2Data.toSvgX(angle)} cy={model2Data.toSvgY(model2Data.f_actual)} r={2.2} fill={PHYSICS_COLORS.friction} opacity={0.25} />
              <circle cx={model2Data.toSvgX(angle)} cy={model2Data.toSvgY(model2Data.f_actual)} r={1.2} fill={PHYSICS_COLORS.friction} stroke="#FFFFFF" strokeWidth={0.35} />
              <text x={model2Data.toSvgX(angle) + (angle > 50 ? -28 : 3)} y={model2Data.toSvgY(model2Data.f_actual) - 2} fontSize={3.2} fill={PHYSICS_COLORS.friction} fontWeight="bold">
                {model2Data.isSliding ? '滑动' : '静摩擦'} f = {model2Data.f_actual.toFixed(1)} N
              </text>
            </g>
          )}
        </svg>

        {/* 浮动状态卡片 */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-neutral-200/80 shadow-sm px-3 py-2">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            {statusCard.title}
          </div>
          <div className="flex flex-col gap-0.5">
            {statusCard.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-neutral-500">{item.label}</span>
                <span className={`font-bold ${item.color || 'text-neutral-800'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FrictionCenterExtra
