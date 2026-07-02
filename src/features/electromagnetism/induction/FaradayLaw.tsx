/**
 * FaradayLaw.tsx — 法拉第电磁感应定律交互动画（薄壳）
 *
 * 职责：Store 订阅 + 参数提取 + 布局计算 + 组合子组件
 */
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { useFaradayPhysics } from './hooks/useFaradayPhysics'
import { FaradayMagnetSandbox } from './FaradayMagnetSandbox'
import { FaradayFieldSandbox } from './FaradayFieldSandbox'
import { FaradayChartPanel } from './FaradayChartPanel'

export default function FaradayLaw() {
  const { params, time, isPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      isPlaying: s.isPlaying,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { font } = canvasSize

  // ── 物理参数提取 ──────────────────────────────────────────────────────
  const mode = params.mode ?? 0
  const N = params.N ?? 50
  const B_magnet = params.B ?? 1.2
  const magnetV = params.magnetV ?? 140
  const dBdt = params.dBdt ?? 0.5
  const B0 = 0

  // ── 布局参数 ────────────────────────────────────────────────────────
  const W = canvasSize.width
  const H = canvasSize.height
  const sandboxW = W * 0.53
  const dashLeft = sandboxW + 16
  const dashRight = W - 12
  const dashW = dashRight - dashLeft
  const coilY = H / 2 - 50

  // ── 物理计算 ────────────────────────────────────────────────────────
  const physics = useFaradayPhysics(
    { mode, N, B_magnet, magnetV, dBdt, B0, time },
    { sandboxW, H, dashLeft, dashRight }
  )

  return (
    <div ref={containerRef} className="w-full h-full select-none">
      <svg width={W} height={H}
        className="bg-white rounded-xl shadow-md overflow-hidden"
        style={{ fontFamily: CANVAS_STYLE.font.family }}>
        <defs>
          <clipPath id="sandboxClip">
            <rect x="0" y="0" width={sandboxW} height={H} />
          </clipPath>
          <clipPath id="chartClip">
            <rect x={dashLeft} y="0" width={dashW} height={H} />
          </clipPath>
        </defs>

        {/* 中间分界隔离线 */}
        <line x1={sandboxW} y1={0} x2={sandboxW} y2={H}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />

        {/* 左屏：物理仿真沙盒 */}
        <g clipPath="url(#sandboxClip)">
          {mode === 0 ? (
            <FaradayMagnetSandbox
              N={N} magnetV={magnetV} time={time} isPlaying={isPlaying}
              currentState={physics.currentState}
              H={H} coilY={coilY}
              solenoidW={physics.solenoidW} solenoidH={physics.solenoidH}
              circuitRightX={physics.circuitRightX} circuitLeftX={physics.circuitLeftX}
              bulbY={physics.bulbY} bulbScale={physics.bulbScale}
              meterTopY={physics.meterTopY} meterY={physics.meterY}
              wirePointsA={physics.wirePointsA} wirePointsB={physics.wirePointsB}
              wirePointsC={physics.wirePointsC}
              electronParticles={physics.electronParticles}
              font={font}
            />
          ) : (
            <FaradayFieldSandbox
              N={N} dBdt={dBdt} time={time}
              sandboxW={sandboxW} coilY={coilY}
              fieldDots={physics.fieldDots}
              currentB={physics.currentB} B_is_in={physics.B_is_in}
              magneticFieldOpacity={physics.magneticFieldOpacity}
              glowOpacity={physics.glowOpacity} glowWidth={physics.glowWidth}
              inducedCurrentDir={physics.inducedCurrentDir}
              font={font}
            />
          )}

          {/* 底部定理说明板 */}
          <g transform={`translate(12, ${H - 46})`}>
            <rect width={sandboxW - 24} height="36" rx="6"
              fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.grid}
              strokeWidth={CANVAS_STYLE.stroke.grid} opacity="0.9" />
            <text x="12" y="15" fontSize={CANVAS_STYLE.font.axisSize}
              fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              法拉第电磁感应定律：E = n · (ΔΦ/Δt)
            </text>
            <text x="12" y="29" fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight}>
              电动势大小取决于磁通量变化率，而不是磁通量大小的值。
            </text>
          </g>
        </g>

        {/* 右侧：图像与数据看板 */}
        <FaradayChartPanel
          mode={mode}
          chartPoints={physics.chartPoints}
          currentState={physics.currentState}
          dashLeft={dashLeft} dashRight={dashRight} dashW={dashW} H={H}
          chartPadTop={physics.chartPadTop} chartH={physics.chartH}
          yPhiMid={physics.yPhiMid} yEmfMid={physics.yEmfMid} chartHalfH={physics.chartHalfH}
          phiMinVal={physics.phiMinVal} phiMaxVal={physics.phiMaxVal}
          maxEmfVal={physics.maxEmfVal} emfIsZero={physics.emfIsZero}
          toPhiY={physics.toPhiY} yPhiZero={physics.yPhiZero}
          toChartX={physics.toChartX} toEmfY={physics.toEmfY}
          phiPathD={physics.phiPathD} emfPathD={physics.emfPathD}
          indicatorX={physics.indicatorX} tNow={physics.tNow}
          font={font}
        />
      </svg>
    </div>
  )
}
