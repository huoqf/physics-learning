import { FC, useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { useAnimationStore } from '@/stores'
import { calculateFrictionPullModel, calculateFrictionInclineModel } from '@/physics'

export const FrictionCenterExtra: FC = () => {
  const { params } = useAnimationStore()

  const mode = params.mode ?? 0 // 0=水平外力驱动, 1=斜面倾角变化
  const m = params.m ?? 5
  const mu = params.mu ?? 0.3
  const g = params.g ?? 9.8
  const F_applied = params.F_applied ?? 15
  const angle = params.angle ?? 15

  const weight = m * g // 重力
  // 最大静摩擦系数设为动摩擦系数的 1.12 倍，以产生清晰的最大静摩擦力突跳现象，符合高考真实受力规律
  const mu_static = mu * 1.12 

  // ── 布局与坐标定义 ──
  const margin = { left: 16, right: 12, top: 15, bottom: 15 }
  const plotW = 100 - margin.left - margin.right // 72
  const plotH = 100 - margin.top - margin.bottom // 70
  
  const originX = margin.left
  const originY = margin.top + plotH

  // ─── 物理量计算及坐标映射 ───

  // 1. 模式一：水平面拉力模型的数据与路径
  const model1Data = useMemo(() => {
    if (mode !== 0) return null

    // 最大静摩擦力与滑动摩擦力
    const { f_max, f_slip, f_actual, isSliding } = calculateFrictionPullModel(m, mu, F_applied, g)

    // 坐标轴映射范围
    // 横轴外力 F_applied: [0, 60] N
    // 纵轴摩擦力 f: [0, 40] N
    const toSvgX = (F: number) => originX + (F / 60) * plotW
    const toSvgY = (f: number) => originY - (f / 40) * plotH

    // 生成 f - F 的折线路径 (0,0) -> (f_max, f_max) -> (f_max, f_slip) -> (60, f_slip)
    const p0 = `${toSvgX(0)},${toSvgY(0)}`
    const p1 = `${toSvgX(f_max)},${toSvgY(f_max)}`
    const p2 = `${toSvgX(f_max + 0.1)},${toSvgY(f_slip)}`
    const p3 = `${toSvgX(60)},${toSvgY(f_slip)}`
    const linePath = `M ${p0} L ${p1} L ${p2} L ${p3}`

    return {
      f_max,
      f_slip,
      f_actual,
      isSliding,
      toSvgX,
      toSvgY,
      linePath
    }
  }, [mode, m, mu, g, F_applied])

  // 2. 模式二：斜面倾角模型的数据与路径
  const model2Data = useMemo(() => {
    if (mode !== 1) return null

    const { criticalAngle, f_actual, isSliding } = calculateFrictionInclineModel(m, mu, angle, g)

    // 坐标轴映射范围
    // 横轴倾角 angle: [0, 90] 度
    // 纵轴摩擦力 f: [0, 40] N
    const toSvgX = (deg: number) => originX + (deg / 90) * plotW
    const toSvgY = (f: number) => originY - (f / 40) * plotH

    // 采样生成 f - theta 的曲线路径
    const points: string[] = []
    const step = 1.5 // 采样步长 (度)
    const criticalAngleRad = (criticalAngle * Math.PI) / 180
    
    for (let deg = 0; deg <= 90; deg += step) {
      const { f_actual: fVal } = calculateFrictionInclineModel(m, mu, deg, g)
      
      // 在临界点处生成一个急剧下降的台阶
      if (Math.abs(deg - criticalAngle) < step) {
        // 在临界角之前的一刹那，值为最大静摩擦力
        const fMaxCritical = mu_static * weight * Math.cos(criticalAngleRad)
        points.push(`${toSvgX(criticalAngle - 0.1)},${toSvgY(fMaxCritical)}`)
        // 在临界角之后的一刹那，突降到滑动摩擦力
        const fSlipCritical = mu * weight * Math.cos(criticalAngleRad)
        points.push(`${toSvgX(criticalAngle + 0.1)},${toSvgY(fSlipCritical)}`)
      } else {
        points.push(`${toSvgX(deg)},${toSvgY(fVal)}`)
      }
    }
    
    const linePath = `M ` + points.join(' L ')

    return {
      criticalAngle,
      f_actual,
      isSliding,
      toSvgX,
      toSvgY,
      linePath
    }
  }, [mode, m, mu, g, weight, angle, mu_static])

  // ── SVG 文本大小 ──
  const fs = 3.6
  const sfs = 2.8

  return (
    <div className="w-full flex justify-center bg-neutral-50 py-1 border-b border-neutral-100 shrink-0">
      <div className="w-full max-w-[420px] aspect-[4/3] bg-white rounded-lg shadow-sm p-3 border border-neutral-200/60">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* 渐变与箭头 */}
            <marker id="chart-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M1,1 L5,3 L1,5 Z" fill={PHYSICS_COLORS.labelText} />
            </marker>
          </defs>

          {/* 标题 */}
          <text x={margin.left} y={margin.top - 7} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            {mode === 0 ? 'f - F 图像 (摩擦力与拉力关系)' : 'f - θ 图像 (摩擦力与斜面倾角)'}
          </text>
          <text x={margin.left + 42} y={margin.top - 7} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight}>
            木箱质量 m = {m} kg
          </text>

          {/* 1. 精密科学网格底图 */}
          {/* Y轴网格 (0, 10, 20, 30, 40 N) */}
          {[10, 20, 30].map((val) => {
            const y = mode === 0 ? model1Data!.toSvgY(val) : model2Data!.toSvgY(val)
            return (
              <line
                key={`grid-y-${val}`}
                x1={originX} y1={y} x2={originX + plotW} y2={y}
                stroke={PHYSICS_COLORS.grid}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
            )
          })}
          {/* X轴网格 */}
          {mode === 0 ? (
            // 水平面模式横轴拉力 (15, 30, 45, 60 N)
            [15, 30, 45].map((val) => {
              const x = model1Data!.toSvgX(val)
              return (
                <line
                  key={`grid-x-mode1-${val}`}
                  x1={x} y1={margin.top} x2={x} y2={originY}
                  stroke={PHYSICS_COLORS.grid}
                  strokeWidth={0.25}
                  strokeDasharray="1,1"
                />
              )
            })
          ) : (
            // 斜面模式横轴倾角 (30, 60 度)
            [30, 60].map((val) => {
              const x = model2Data!.toSvgX(val)
              return (
                <line
                  key={`grid-x-mode2-${val}`}
                  x1={x} y1={margin.top} x2={x} y2={originY}
                  stroke={PHYSICS_COLORS.grid}
                  strokeWidth={0.25}
                  strokeDasharray="1,1"
                />
              )
            })
          )}

          {/* 2. 坐标轴线 */}
          {/* 横轴 */}
          <line
            x1={originX - 2} y1={originY} x2={originX + plotW + 3} y2={originY}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.4}
            markerEnd="url(#chart-arrow)"
          />
          {/* 纵轴 */}
          <line
            x1={originX} y1={originY + 2} x2={originX} y2={margin.top - 3}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.4}
            markerEnd="url(#chart-arrow)"
          />

          <text x={originX + plotW + 4} y={originY + 1.2} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            {mode === 0 ? 'F (N)' : 'θ (°)'}
          </text>
          <text x={originX - 5} y={margin.top - 4} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            f (N)
          </text>

          {/* 3. 刻度值 */}
          {/* Y轴刻度 */}
          {[10, 20, 30].map((val) => {
            const y = mode === 0 ? model1Data!.toSvgY(val) : model2Data!.toSvgY(val)
            return (
              <g key={`tick-y-${val}`}>
                <line x1={originX - 1} y1={y} x2={originX} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                <text x={originX - 2.5} y={y + 1} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
                  {val}
                </text>
              </g>
            )
          })}
          {/* X轴刻度 */}
          {mode === 0 ? (
            [15, 30, 45, 60].map((val) => {
              const x = model1Data!.toSvgX(val)
              return (
                <g key={`tick-x-m1-${val}`}>
                  <line x1={x} y1={originY} x2={x} y2={originY + 1} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                  <text x={x} y={originY + 4.2} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
                    {val}
                  </text>
                </g>
              )
            })
          ) : (
            [30, 60, 90].map((val) => {
              const x = model2Data!.toSvgX(val)
              return (
                <g key={`tick-x-m2-${val}`}>
                  <line x1={x} y1={originY} x2={x} y2={originY + 1} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.3} />
                  <text x={x} y={originY + 4.2} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
                    {val}
                  </text>
                </g>
              )
            })
          )}
          <text x={originX - 2.5} y={originY + 3.5} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end">0</text>

          {/* 4. 绘制摩擦力变化曲线 (模式一: 折线, 模式二: 正弦/余弦曲线) */}
          {mode === 0 && model1Data && (
            <path
              d={model1Data.linePath}
              fill="none"
              stroke={PHYSICS_COLORS.friction}
              strokeWidth={0.7}
            />
          )}
          {mode === 1 && model2Data && (
            <path
              d={model2Data.linePath}
              fill="none"
              stroke={PHYSICS_COLORS.friction}
              strokeWidth={0.7}
            />
          )}

          {/* 5. 绘制当前状态游标点及引线 */}
          {mode === 0 && model1Data && (
            <g>
              {/* 垂直投影虚线 */}
              <line
                x1={model1Data.toSvgX(F_applied)} y1={originY}
                x2={model1Data.toSvgX(F_applied)} y2={model1Data.toSvgY(model1Data.f_actual)}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
              {/* 水平投影虚线 */}
              <line
                x1={originX} y1={model1Data.toSvgY(model1Data.f_actual)}
                x2={model1Data.toSvgX(F_applied)} y2={model1Data.toSvgY(model1Data.f_actual)}
                stroke={PHYSICS_COLORS.friction}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
              {/* 临界最大静摩擦力标注虚线 */}
              <line
                x1={model1Data.toSvgX(model1Data.f_max)} y1={margin.top}
                x2={model1Data.toSvgX(model1Data.f_max)} y2={originY}
                stroke={PHYSICS_COLORS.frictionStatic}
                strokeWidth={0.3}
                strokeDasharray="2,2"
                opacity={0.5}
              />
              <text
                x={model1Data.toSvgX(model1Data.f_max) + 1.5}
                y={margin.top + 5}
                fontSize={2.5}
                fill={PHYSICS_COLORS.frictionStatic}
                fontWeight="bold"
              >
                最大静摩擦力 f_max
              </text>

              {/* 游标定位点 */}
              <circle
                cx={model1Data.toSvgX(F_applied)}
                cy={model1Data.toSvgY(model1Data.f_actual)}
                r={2.2}
                fill={PHYSICS_COLORS.friction}
                opacity={0.25}
              />
              <circle
                cx={model1Data.toSvgX(F_applied)}
                cy={model1Data.toSvgY(model1Data.f_actual)}
                r={1.2}
                fill={PHYSICS_COLORS.friction}
                stroke="#FFFFFF"
                strokeWidth={0.35}
              />

              {/* 看板标注 */}
              <text
                x={model1Data.toSvgX(F_applied) + 3}
                y={model1Data.toSvgY(model1Data.f_actual) - 2}
                fontSize={3.2}
                fill={PHYSICS_COLORS.friction}
                fontWeight="bold"
              >
                {model1Data.isSliding ? '滑动摩擦' : '静摩擦'} f = {model1Data.f_actual.toFixed(1)} N
              </text>
            </g>
          )}

          {mode === 1 && model2Data && (
            <g>
              {/* 垂直投影虚线 */}
              <line
                x1={model2Data.toSvgX(angle)} y1={originY}
                x2={model2Data.toSvgX(angle)} y2={model2Data.toSvgY(model2Data.f_actual)}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
              {/* 水平投影虚线 */}
              <line
                x1={originX} y1={model2Data.toSvgY(model2Data.f_actual)}
                x2={model2Data.toSvgX(angle)} y2={model2Data.toSvgY(model2Data.f_actual)}
                stroke={PHYSICS_COLORS.friction}
                strokeWidth={0.25}
                strokeDasharray="1,1"
              />
              {/* 临界下滑倾斜角标注 */}
              <line
                x1={model2Data.toSvgX(model2Data.criticalAngle)} y1={margin.top}
                x2={model2Data.toSvgX(model2Data.criticalAngle)} y2={originY}
                stroke={PHYSICS_COLORS.frictionStatic}
                strokeWidth={0.3}
                strokeDasharray="2,2"
                opacity={0.5}
              />
              <text
                x={model2Data.toSvgX(model2Data.criticalAngle) + 1.5}
                y={margin.top + 5}
                fontSize={2.5}
                fill={PHYSICS_COLORS.frictionStatic}
                fontWeight="bold"
              >
                临界下滑角 θ_c ≈ {model2Data.criticalAngle.toFixed(1)}°
              </text>

              {/* 游标定位点 */}
              <circle
                cx={model2Data.toSvgX(angle)}
                cy={model2Data.toSvgY(model2Data.f_actual)}
                r={2.2}
                fill={PHYSICS_COLORS.friction}
                opacity={0.25}
              />
              <circle
                cx={model2Data.toSvgX(angle)}
                cy={model2Data.toSvgY(model2Data.f_actual)}
                r={1.2}
                fill={PHYSICS_COLORS.friction}
                stroke="#FFFFFF"
                strokeWidth={0.35}
              />

              {/* 看板标注 */}
              <text
                x={model2Data.toSvgX(angle) + (angle > 50 ? -28 : 3)}
                y={model2Data.toSvgY(model2Data.f_actual) - 2}
                fontSize={3.2}
                fill={PHYSICS_COLORS.friction}
                fontWeight="bold"
              >
                {model2Data.isSliding ? '滑动摩擦' : '静摩擦'} f = {model2Data.f_actual.toFixed(1)} N
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}

export default FrictionCenterExtra
