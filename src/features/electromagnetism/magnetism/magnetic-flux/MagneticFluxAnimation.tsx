import { AnimationSvgCanvas } from '@/components/Layout'
import { RelationChart, useChartContext } from '@/components/Chart'
import type { RelationMarker } from '@/components/Chart'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import {
  CANVAS_COLORS,
  CHART_COLORS,
  EM_COLORS,
  PHYSICS_COLORS,
  withAlpha,
} from '@/theme/physics'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useShallow } from 'zustand/react/shallow'
import {
  useMagneticFluxPhysics,
  type MagneticFluxPhysicsResult,
} from './hooks/useMagneticFluxPhysics'
import { MagneticFluxScene } from './components/MagneticFluxScene'

/** mode=0：F-I / F-L / F-(IL) 曲线上的抽头散点与左上角斜率求解卡 */
function RatioChartOverlay({
  physics,
}: {
  physics: MagneticFluxPhysicsResult
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, plotOrigin, plotSize, font, px } = ctx
  const { ratioExp, chartAxis } = physics

  const cardX = plotOrigin.x + px(14)
  const cardY = plotOrigin.y + px(10)
  const cardW = px(304)
  const cardH = px(58)

  const sinTheta = Math.sin((ratioExp.thetaIB * Math.PI) / 180)
  const isParallel = ratioExp.thetaIB < 0.5 || sinTheta < 1e-4
  const isPerp = Math.abs(ratioExp.thetaIB - 90) < 0.5

  let slopeFormula = ''
  let slopeValueStr = ''
  if (chartAxis === 0) {
    slopeFormula = '斜率 k = F / I = B·sinθ_IB·L'
    slopeValueStr = isParallel
      ? 'θ_IB = 0° (I∥B)：F 恒为 0，无法由斜率测定 B'
      : isPerp
        ? `k = ${ratioExp.slopeFI.toFixed(3)} N/A  ⇒  测得 B = ${ratioExp.B.toFixed(2)} T`
        : `k = ${ratioExp.slopeFI.toFixed(3)} N/A  ⇒  B⊥ = ${ratioExp.B_perp.toFixed(2)} T (B = ${ratioExp.B.toFixed(2)} T)`
  } else if (chartAxis === 1) {
    slopeFormula = '斜率 k = F / L = B·sinθ_IB·I'
    slopeValueStr = isParallel
      ? 'θ_IB = 0° (I∥B)：F 恒为 0，无法由斜率测定 B'
      : isPerp
        ? `k = ${ratioExp.slopeFL.toFixed(2)} N/m  ⇒  测得 B = ${ratioExp.B.toFixed(2)} T`
        : `k = ${ratioExp.slopeFL.toFixed(2)} N/m  ⇒  B⊥ = ${ratioExp.B_perp.toFixed(2)} T (B = ${ratioExp.B.toFixed(2)} T)`
  } else {
    slopeFormula = '斜率 k = F / (IL) = B·sinθ_IB'
    slopeValueStr = isParallel
      ? 'θ_IB = 0° (I∥B)：F 恒为 0，无法由斜率测定 B'
      : isPerp
        ? `k = ${ratioExp.slopeFIL.toFixed(2)} T  ⇒  直接测得 B = ${ratioExp.B.toFixed(2)} T`
        : `k = ${ratioExp.slopeFIL.toFixed(2)} T  ⇒  B⊥ = ${ratioExp.B_perp.toFixed(2)} T (B = ${ratioExp.B.toFixed(2)} T)`
  }

  return (
    <g>
      {/* F–L 或 F–(IL) 图像下叠加当前电流对应的 5 档抽头实测点 */}
      {(chartAxis === 1 || chartAxis === 2) &&
        ratioExp.tapSamples.map((pt) => {
          const dataX = chartAxis === 1 ? pt.L : pt.x
          const cx = toSvgX(dataX)
          const cy = toSvgY(pt.F)
          const isCurrent = Math.abs(pt.L - ratioExp.L) < 0.005
          return (
            <g key={pt.L}>
              <circle
                cx={cx}
                cy={cy}
                r={px(isCurrent ? 5.5 : 3.8)}
                fill={isCurrent ? EM_COLORS.electricCurrent : PHYSICS_COLORS.velocity}
                stroke={CANVAS_COLORS.white}
                strokeWidth={px(isCurrent ? 1.8 : 1.2)}
              />
              {!isCurrent && (
                <text
                  x={cx}
                  y={cy + px(14)}
                  fontSize={font(9)}
                  fill={CANVAS_COLORS.labelTextLight}
                  textAnchor="middle"
                >
                  {pt.label}
                </text>
              )}
            </g>
          )
        })}

      {/* 左上角空白区斜率求解角标卡 */}
      <g>
        <rect
          x={cardX}
          y={cardY}
          width={Math.min(cardW, plotSize.width * 0.72)}
          height={cardH}
          rx={px(6)}
          fill={withAlpha(CANVAS_COLORS.white, 0.92)}
          stroke={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
          strokeWidth={px(1)}
        />
        <text
          x={cardX + px(10)}
          y={cardY + px(21)}
          fontSize={font(11)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          {slopeFormula}
        </text>
        <text
          x={cardX + px(10)}
          y={cardY + px(42)}
          fontSize={font(11)}
          fill={EM_COLORS.magneticField}
          fontWeight="bold"
        >
          {slopeValueStr}
        </text>
      </g>
    </g>
  )
}

/** mode=1：Φ-θ 曲线右上角（90°~180° 上半空白区）投影与 ΔΦ 辅助读数卡 */
function FluxChartOverlay({
  physics,
}: {
  physics: MagneticFluxPhysicsResult
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { plotOrigin, plotSize, font, px } = ctx
  const f = physics.fluxState

  const cardW = Math.min(px(238), plotSize.width * 0.44)
  const cardH = px(56)
  const cardX = plotOrigin.x + plotSize.width - cardW - px(12)
  const cardY = plotOrigin.y + px(10)

  return (
    <g>
      <rect
        x={cardX}
        y={cardY}
        width={cardW}
        height={cardH}
        rx={px(6)}
        fill={withAlpha(CANVAS_COLORS.white, 0.92)}
        stroke={withAlpha(CHART_COLORS.compareD, 0.35)}
        strokeWidth={px(1)}
      />
      <text
        x={cardX + px(10)}
        y={cardY + px(21)}
        fontSize={font(11)}
        fill={EM_COLORS.magneticField}
        fontWeight="bold"
      >
        {`S⊥ = S|cosθ| = ${f.projAreaSPerp.toFixed(3)} m²`}
      </text>
      <text
        x={cardX + px(10)}
        y={cardY + px(41)}
        fontSize={font(11)}
        fill={CHART_COLORS.highlight}
        fontWeight="bold"
      >
        {`0°→${f.thetaNormal.toFixed(0)}° 变化量 ΔΦ = ${f.deltaPhiFromZero.toFixed(3)} Wb`}
      </text>
    </g>
  )
}

export default function MagneticFluxAnimation() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params })),
  )

  const physics = useMagneticFluxPhysics({
    mode: params.mode ?? 0,
    chartAxis: params.chartAxis ?? 0,
    B: params.B ?? 1.0,
    I: params.I ?? 2.0,
    L: params.L ?? 0.15,
    thetaIB: params.thetaIB ?? 90,
    S: params.S ?? 0.4,
    thetaNormal: params.thetaNormal ?? 30,
    showProjGuide: params.showProjGuide ?? 1,
    showNormalVec: params.showNormalVec ?? 1,
  })

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const sceneScale = useSceneScale({
    vp,
    preset,
    anchor: 'center',
    centerSource: 'design',
    physicsScaleDesign: 100,
    maxVectorLength: 50,
    refMagnitudes: {
      lorentzForce: 1.5,
      gravity: 1.5,
      currentDirection: 5.0,
      magneticField: 2.0,
    },
  })

  const isMode0 = physics.mode === 0
  const { ratioExp, chartAxis, fluxState } = physics

  // mode=0 图表配置
  const ratioChartConfig = (() => {
    if (chartAxis === 1) {
      return {
        points: ratioExp.flPoints,
        xDomain: [0, 0.30] as [number, number],
        yDomain: [0, 2.7] as [number, number],
        xLabel: '接入长度 L (m)',
        yLabel: '安培力 F (N)',
        title: '控制 I 不变：F–L 图像（斜率 k = BI·sinθ_IB）',
        cursorX: ratioExp.L,
        cursorLabel: (x: number, y: number) =>
          `L=${x.toFixed(2)} m, F=${y.toFixed(2)} N`,
      }
    }
    if (chartAxis === 2) {
      return {
        points: ratioExp.filPoints,
        xDomain: [0, 1.50] as [number, number],
        yDomain: [0, 2.7] as [number, number],
        xLabel: '电流元 IL (A·m)',
        yLabel: '安培力 F (N)',
        title: '合并变量：F–(IL) 图像（斜率 k = F/(IL) = B·sinθ_IB）',
        cursorX: ratioExp.currentElementIL,
        cursorLabel: (x: number, y: number) =>
          `IL=${x.toFixed(2)} A·m, F=${y.toFixed(2)} N`,
      }
    }
    return {
      points: ratioExp.fiPoints,
      xDomain: [0, 5.2] as [number, number],
      yDomain: [0, 2.7] as [number, number],
      xLabel: '电流 I (A)',
      yLabel: '安培力 F (N)',
      title: '控制 L 不变：F–I 图像（斜率 k = BL·sinθ_IB）',
      cursorX: ratioExp.I,
      cursorLabel: (x: number, y: number) =>
        `I=${x.toFixed(1)} A, F=${y.toFixed(2)} N`,
    }
  })()

  // mode=1 磁通量余弦图参考点
  const fluxMarkers: RelationMarker[] = [
    {
      axis: 'vertical',
      x: 90,
      label: 'θ=90° (Φ=0)',
      color: CHART_COLORS.equilibrium,
      position: 'top',
    },
    {
      axis: 'point',
      x: 180,
      y: -fluxState.phiInitial,
      label: '翻转180° (Φ=-BS)',
      color: CHART_COLORS.highlight,
      labelSide: 'top-left',
    },
  ]

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 bg-slate-50 rounded-lg">
      {/* 上半屏：实验装置 / 倾斜投影三维透视 */}
      <div className="flex-1 min-h-0 relative bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
          <MagneticFluxScene
            physics={physics}
            canvasSize={canvasSize}
            sceneScale={sceneScale}
            vp={vp}
          />
        </AnimationSvgCanvas>
      </div>

      {/* 下半屏：定量图像区 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg p-2 border border-slate-200 shadow-sm flex flex-col">
        {isMode0 ? (
          <RelationChart
            points={ratioChartConfig.points}
            xDomain={ratioChartConfig.xDomain}
            yDomain={ratioChartConfig.yDomain}
            xLabel={ratioChartConfig.xLabel}
            yLabel={ratioChartConfig.yLabel}
            title={ratioChartConfig.title}
            cursorX={ratioChartConfig.cursorX}
            cursorLabel={ratioChartConfig.cursorLabel}
            color={PHYSICS_COLORS.velocity}
            strokeWidth={2.4}
            mainLabel="F 曲线"
          >
            <RatioChartOverlay physics={physics} />
          </RelationChart>
        ) : (
          <RelationChart
            points={fluxState.curvePoints}
            xDomain={[0, 180]}
            yDomain={[-1.1, 1.1]}
            xLabel="法线 n̂ 与磁场 B 夹角 θ (°)"
            yLabel="磁通量 Φ (Wb)"
            title="磁通量随倾角变化：Φ = B·S·cosθ"
            showZeroLine={true}
            markers={fluxMarkers}
            cursorX={fluxState.thetaNormal}
            cursorLabel={(x, y) => `θ=${x.toFixed(0)}°, Φ=${y.toFixed(3)} Wb`}
            color={EM_COLORS.magneticField}
            strokeWidth={2.4}
            mainLabel="Φ(θ)"
          >
            <FluxChartOverlay physics={physics} />
          </RelationChart>
        )}
      </div>
    </div>
  )
}
