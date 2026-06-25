import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, ENERGY_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { Ball } from '@/components/Physics/Ball'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { RelationChart } from '@/components/Chart'
import { IDENTITY_SCENE_SCALE } from '@/scene/SceneScale'
import { precomputeLightRodRopeTrajectory, getLRRStateAtTime } from '@/physics/lightRodRope'
import { GRAVITY } from '@/physics/constants'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'

// 设计尺寸 (Viewport 架构)
const DESIGN_WIDTH = 800
const DESIGN_HEIGHT = 500

export default function LightRodRopeAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)
  const { font } = canvasSize

  // 1. 参数提取
  const m1 = params.m1 ?? 1.0 // A球质量 (kg)
  const m2 = params.m2 ?? 1.0 // B球质量 (kg)
  const L = params.L ?? 1.2 // 杆总长 (m)
  const g = GRAVITY
  const constraint = params.constraint ?? 0 // 0=杆, 1=绳
  const showParticles = params.showParticles !== 0 // 1=开, 0=关

  // 2. 预计算物理轨迹
  const trajectory = useMemo(() => {
    return precomputeLightRodRopeTrajectory(m1, m2, L, g, constraint, 15, 0.02)
  }, [m1, m2, L, constraint])

  // 当前时刻插值状态
  const state = useMemo(() => {
    return getLRRStateAtTime(trajectory, time)
  }, [trajectory, time])

  // 3. 布局像素计算
  const pivotX = 200 // 轴心 X
  const pivotY = 220 // 轴心 Y
  const L_pix = L * 130 // 摆长对应的像素长度

  const thetaA = state.thetaA
  const thetaB = state.thetaB

  const x_A = pivotX + (L_pix / 2) * Math.cos(thetaA)
  const y_A = pivotY + (L_pix / 2) * Math.sin(thetaA)

  const x_B = pivotX + L_pix * Math.cos(thetaB)
  const y_B = pivotY + L_pix * Math.sin(thetaB)

  // 4. 提取下摆段轨迹数据用于图表绘制
  const chartCurves = useMemo(() => {
    if (constraint === 0) {
      // 刚性杆：找出从 t=0 到第一次到达最低点 (thetaB = pi/2) 的数据点
      let stopIndex = trajectory.length - 1
      for (let i = 0; i < trajectory.length; i++) {
        if (trajectory[i].thetaB >= Math.PI / 2) {
          stopIndex = i
          break
        }
      }
      const slice = trajectory.slice(0, stopIndex + 1)
      return slice.map((pt) => ({
        theta: pt.thetaB,
        EA: pt.EA,
        EB: pt.EB,
        Etot: pt.Etot,
      }))
    } else {
      // 柔性绳：机械能恒定，退化为三条水平直线
      const angles = Array.from({ length: 50 }, (_, i) => (i * Math.PI) / 100) // 0 到 90度
      const EA0 = m1 * g * (L / 2)
      const EB0 = m2 * g * L
      return angles.map((ang) => ({
        theta: ang,
        EA: EA0,
        EB: EB0,
        Etot: EA0 + EB0,
      }))
    }
  }, [trajectory, constraint, m1, m2, L])

  // 5. 能量范围计算
  const E_max = (m1 * g * (L / 2) + m2 * g * L) * 1.15

  // 6. 能量传输粒子定位
  const particles = useMemo(() => {
    if (constraint !== 0 || !showParticles || state.powerB <= 0.05) return []
    const list = []
    const dx = x_B - x_A
    const dy = y_B - y_A
    for (let i = 0; i < 5; i++) {
      const offsetRatio = ((time * 2.5 + i * 0.2) % 1.0)
      list.push({
        x: x_A + dx * offsetRatio,
        y: y_A + dy * offsetRatio,
      })
    }
    return list
  }, [constraint, showParticles, time, x_A, y_A, x_B, y_B, state.powerB])

  // 构造 RelationChart 的曲线点（X 坐标用度数 0 ~ 90）
  const ep1Series = useMemo(() => {
    return chartCurves.map((pt) => ({ x: pt.theta * (180 / Math.PI), y: pt.EA }))
  }, [chartCurves])

  const ep2Series = useMemo(() => {
    return chartCurves.map((pt) => ({ x: pt.theta * (180 / Math.PI), y: pt.EB }))
  }, [chartCurves])

  const etotSeries = useMemo(() => {
    return chartCurves.map((pt) => ({ x: pt.theta * (180 / Math.PI), y: pt.Etot }))
  }, [chartCurves])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* ── 左半部分：动画区 ── */}
        <g>
          {/* 天花板 */}
          <rect x={pivotX - 40} y={198} width={80} height={10} fill={SCENE_COLORS.surface.wallFill} rx={1} />
          <line x1={pivotX - 50} y1={208} x2={pivotX + 50} y2={208} stroke={SCENE_COLORS.pendulum.arcPath} strokeWidth={1.5} />

          {/* 旋转轴 */}
          <circle cx={pivotX} cy={pivotY} r={4} fill={SCENE_COLORS.pendulum.pivotFill} />

          {/* 杆/绳渲染 */}
          {constraint === 0 ? (
            <line
              x1={pivotX}
              y1={pivotY}
              x2={x_B}
              y2={y_B}
              stroke={SCENE_COLORS.pendulum.rodFill}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ) : (
            <g>
              <line
                x1={pivotX}
                y1={pivotY}
                x2={x_A}
                y2={y_A}
                stroke={SCENE_COLORS.pendulum.rodFill}
                strokeWidth={1}
                strokeDasharray="2,1"
              />
              <line
                x1={pivotX}
                y1={pivotY}
                x2={x_B}
                y2={y_B}
                stroke={SCENE_COLORS.pendulum.rodFill}
                strokeWidth={1}
                strokeDasharray="2,1"
              />
            </g>
          )}

          {/* 能量转移粒子 */}
          {constraint === 0 && showParticles && particles.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={2.2}
              fill="white"
              stroke={PHYSICS_COLORS.kineticEnergy}
              strokeWidth={0.5}
              opacity={0.8}
            />
          ))}

          {/* 小球 A (m1) */}
          <Ball
            cx={x_A}
            cy={y_A}
            r={10}
            type="pendulumBob"
            stroke={SCENE_COLORS.sphere.pendulumBob.stroke}
            strokeWidth={1.5}
          />
          <text x={x_A} y={y_A - 14} fontSize={font(8.5)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
            A ({m1.toFixed(1)}kg)
          </text>

          {/* 小球 B (m2) */}
          <Ball
            cx={x_B}
            cy={y_B}
            r={13}
            type="pendulumBob"
            stroke={SCENE_COLORS.sphere.pendulumBob.stroke}
            strokeWidth={1.5}
          />
          <text x={x_B} y={y_B - 17} fontSize={font(8.5)} fill={CANVAS_COLORS.labelText} fontWeight="bold" textAnchor="middle">
            B ({m2.toFixed(1)}kg)
          </text>

          {/* 受力矢量箭头 */}
          <g>
            <VectorArrow
              origin={{ x: x_A, y: -y_A }}
              vector={{ x: 0, y: -m1 * g * 5 }}
              type="gravity"
              sceneScale={IDENTITY_SCENE_SCALE}
              label="G_A"
            />
            <VectorArrow
              origin={{ x: x_B, y: -y_B }}
              vector={{ x: 0, y: -m2 * g * 5 }}
              type="gravity"
              sceneScale={IDENTITY_SCENE_SCALE}
              label="G_B"
            />

            <VectorArrow
              origin={{ x: x_A, y: -y_A }}
              vector={{ x: state.F_A.x * 2.5, y: state.F_A.y * 2.5 }}
              type="force"
              sceneScale={IDENTITY_SCENE_SCALE}
              label={constraint === 0 ? "F_杆A" : "F_绳A"}
            />
            <VectorArrow
              origin={{ x: x_B, y: -y_B }}
              vector={{ x: state.F_B.x * 2.5, y: state.F_B.y * 2.5 }}
              type="force"
              sceneScale={IDENTITY_SCENE_SCALE}
              label={constraint === 0 ? "F_杆B" : "F_绳B"}
            />
          </g>
        </g>

        {/* ── 右半部分：关系图表区 (嵌入 RelationChart 满足复用规则) ── */}
        <foreignObject x={430} y={40} width={340} height={420}>
          <div className="w-full h-full p-1 bg-white rounded-lg border border-neutral-100 shadow-sm">
            <RelationChart
              points={ep1Series}
              additionalSeries={[
                {
                  points: ep2Series,
                  label: 'B球机械能 EB',
                  color: ENERGY_COLORS.potentialElastic,
                },
                {
                  points: etotSeries,
                  label: '系统总能 E总',
                  color: PHYSICS_COLORS.kineticEnergy,
                  strokeWidth: 2,
                },
              ]}
              xDomain={[0, 95]}
              yDomain={[0, E_max]}
              xLabel="角度 θ (°)"
              yLabel="能量 E (J)"
              title="连接体机械能-摆角变化曲线"
              cursorX={thetaB * (180 / Math.PI)}
            />
          </div>
        </foreignObject>
      </svg>
    </div>
  )
}
