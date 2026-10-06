import { FC } from 'react'
import { Ball, PhysicsVectorArrow } from '@/components/Physics'
import {
  WAVE_COLORS,
  CANVAS_COLORS,
  SCENE_COLORS,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import { worldToDesign, type SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils'
import type { DopplerPhysicsResult } from '../hooks/useDopplerPhysics'

interface DopplerWavefrontSceneProps {
  physics: DopplerPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  time: number
}

export const DopplerWavefrontScene: FC<DopplerWavefrontSceneProps> = ({
  physics,
  canvasSize,
  sceneScale,
  vp,
  time,
}) => {
  const { font } = canvasSize
  const {
    sourceX,
    sourceY,
    sourceSpeed,
    observerX,
    observerY,
    observerSpeed,
    lambdaFront,
    lambdaBack,
    fFront,
    fBack,
    fObserver,
    hasPassedCentral,
    wavefronts,
    mode,
    isSupersonic,
    machCone,
    pulseFront,
    pulseBack,
    pulseObserver,
    frontLambdaRange,
    backLambdaRange,
  } = physics

  // 波源在设计画布中的中心位置 (原点居中于可视区中央)
  const sourceCenter = worldToDesign(sourceX, sourceY, sceneScale)

  // 轨道基准水平线 Y 坐标
  const trackY = worldToDesign(0, 0, sceneScale).py

  // 固定监测站坐标 (x = ±18m，位于波源活动范围外侧，留出清晰视觉呼吸距离)
  const stationLeftPos = worldToDesign(-18, 0, sceneScale)
  const stationRightPos = worldToDesign(18, 0, sceneScale)
  const stationCenterPos = worldToDesign(0, 0, sceneScale)

  // 模式1运动观察者设计坐标
  const movingObsPos = worldToDesign(observerX, observerY, sceneScale)

  // 器材外壳主色与描边 (SCENE_COLORS)
  const apparatusBody = SCENE_COLORS.circuit.node
  const apparatusBase = SCENE_COLORS.circuit.meterFrame

  return (
    <g>
      {/* ── 1. 水平基准运动导轨与刻度 ── */}
      <g>
        {/* 导轨基础阴影与虚线 */}
        <line
          x1={vp.designLeft}
          y1={trackY}
          x2={vp.designLeft + vp.designVisibleW}
          y2={trackY}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={STROKE.axis}
          strokeDasharray="6,4"
        />
        {/* 导轨正中央零点标记 */}
        <line
          x1={stationCenterPos.px}
          y1={trackY - 6}
          x2={stationCenterPos.px}
          y2={trackY + 6}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1.5}
        />
      </g>

      {/* ── 2. 超音速马赫锥包络面与切线 (Mode 2) ── */}
      {isSupersonic && machCone && (
        <g>
          {(() => {
            const pApex = worldToDesign(machCone.upperLine.x1, machCone.upperLine.y1, sceneScale)
            const pUpper = worldToDesign(machCone.upperLine.x2, machCone.upperLine.y2, sceneScale)
            const pLower = worldToDesign(machCone.lowerLine.x2, machCone.lowerLine.y2, sceneScale)

            return (
              <>
                {/* 激波锥半透明受扰动区填充 */}
                <polygon
                  points={`${pApex.px},${pApex.py} ${pUpper.px},${pUpper.py} ${pLower.px},${pLower.py}`}
                  fill={withAlpha(WAVE_COLORS.waveformB, 0.14)}
                />
                {/* 上激波切线 */}
                <line
                  x1={pApex.px}
                  y1={pApex.py}
                  x2={pUpper.px}
                  y2={pUpper.py}
                  stroke={WAVE_COLORS.waveformB}
                  strokeWidth={2.2}
                />
                {/* 下激波切线 */}
                <line
                  x1={pApex.px}
                  y1={pApex.py}
                  x2={pLower.px}
                  y2={pLower.py}
                  stroke={WAVE_COLORS.waveformB}
                  strokeWidth={2.2}
                />
                {/* 马赫角半顶角标注 (向左伸展于锥体内部) */}
                <text
                  x={pApex.px - 16}
                  y={pApex.py - 32}
                  textAnchor="end"
                  fontSize={font(11)}
                  fill={WAVE_COLORS.waveformB}
                  fontWeight="bold"
                >
                  {`马赫锥激波面 (Ma=${machCone.machNumber.toFixed(2)}, θ=${machCone.halfAngleDeg.toFixed(1)}°)`}
                </text>
                {/* 静默区标注 (向右伸展于前方面积) */}
                <text
                  x={pApex.px + 24}
                  y={pApex.py - 32}
                  textAnchor="start"
                  fontSize={font(10)}
                  fill={CANVAS_COLORS.labelTextLight}
                >
                  静默区
                </text>
              </>
            )
          })()}
        </g>
      )}

      {/* ── 3. 动态偏心扩散波前圆环族 ── */}
      <g>
        {wavefronts.map((w, idx) => {
          const center = worldToDesign(w.sourceX, w.sourceY, sceneScale)
          const pixelRadius = w.radius * sceneScale.scaleX
          if (pixelRadius <= 2) return null

          const isLatest = idx === 0
          return (
            <g key={idx}>
              <circle
                cx={center.px}
                cy={center.py}
                r={pixelRadius}
                fill={isLatest ? withAlpha(WAVE_COLORS.soundWave, 0.12) : 'none'}
                stroke={isLatest ? WAVE_COLORS.doppler : WAVE_COLORS.soundWave}
                strokeWidth={isLatest ? 2.5 : 1.8}
                opacity={w.opacity}
              />
            </g>
          )
        })}
      </g>

      {/* ── 4. 空间波长尺寸标注双箭头 (直击高考核心) ── */}
      {mode === 0 && !isSupersonic && (
        <g>
          {/* 前方波长标注 */}
          {frontLambdaRange && (
            (() => {
              const p1 = worldToDesign(frontLambdaRange.x1, 0, sceneScale)
              const p2 = worldToDesign(frontLambdaRange.x2, 0, sceneScale)
              const markY = trackY - 26
              const midX = (p1.px + p2.px) / 2
              return (
                <g opacity={0.9}>
                  <line x1={p1.px} y1={markY} x2={p2.px} y2={markY} stroke={WAVE_COLORS.waveformB} strokeWidth={1.5} />
                  <line x1={p1.px} y1={markY - 3} x2={p1.px} y2={markY + 3} stroke={WAVE_COLORS.waveformB} strokeWidth={1.5} />
                  <line x1={p2.px} y1={markY - 3} x2={p2.px} y2={markY + 3} stroke={WAVE_COLORS.waveformB} strokeWidth={1.5} />
                  <text x={midX} y={markY - 5} textAnchor="middle" fontSize={font(9)} fill={WAVE_COLORS.waveformB} fontWeight="bold">
                    {`λ' = ${lambdaFront.toFixed(1)}m (压缩)`}
                  </text>
                </g>
              )
            })()
          )}

          {/* 后方波长标注 */}
          {backLambdaRange && (
            (() => {
              const p1 = worldToDesign(backLambdaRange.x1, 0, sceneScale)
              const p2 = worldToDesign(backLambdaRange.x2, 0, sceneScale)
              const markY = trackY - 26
              const midX = (p1.px + p2.px) / 2
              return (
                <g opacity={0.9}>
                  <line x1={p1.px} y1={markY} x2={p2.px} y2={markY} stroke={WAVE_COLORS.waveform} strokeWidth={1.5} />
                  <line x1={p1.px} y1={markY - 3} x2={p1.px} y2={markY + 3} stroke={WAVE_COLORS.waveform} strokeWidth={1.5} />
                  <line x1={p2.px} y1={markY - 3} x2={p2.px} y2={markY + 3} stroke={WAVE_COLORS.waveform} strokeWidth={1.5} />
                  <text x={midX} y={markY - 5} textAnchor="middle" fontSize={font(9)} fill={WAVE_COLORS.waveform} fontWeight="bold">
                    {`λ'' = ${lambdaBack.toFixed(1)}m (拉伸)`}
                  </text>
                </g>
              )
            })()
          )}
        </g>
      )}

      {/* ── 5. 观察者站点与脉冲截获反馈 ── */}
      {mode === 1 ? (
        /* ══════════ 模式 1：观察者运动场景 ══════════ */
        <g>
          {/* 运动观察者小车 (带脉冲指示灯与速度箭头) */}
          <g transform={`translate(${movingObsPos.px}, ${trackY})`}>
            {/* 脉冲到达高亮波纹 (扫过波峰瞬间闪烁) */}
            {pulseObserver && (
              <circle cx={0} cy={-16} r={22} fill="none" stroke={WAVE_COLORS.doppler} strokeWidth={2.5} opacity={0.8} />
            )}

            {/* 小车车身底盘 */}
            <rect x={-14} y={-8} width={28} height={12} rx={3} fill={apparatusBody} stroke={apparatusBase} strokeWidth={1.5} />
            {/* 车轮 */}
            <circle cx={-9} cy={6} r={4} fill={CANVAS_COLORS.labelText} />
            <circle cx={9} cy={6} r={4} fill={CANVAS_COLORS.labelText} />

            {/* 探测天线与信号灯 */}
            <line x1={0} y1={-8} x2={0} y2={-20} stroke={apparatusBase} strokeWidth={2} />
            <circle cx={0} cy={-20} r={4.5} fill={pulseObserver ? WAVE_COLORS.doppler : CANVAS_COLORS.textMuted} stroke={CANVAS_COLORS.white} strokeWidth={1.5} />

            <text x={0} y={24} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
              运动观察者
            </text>
            <text x={0} y={37} textAnchor="middle" fontSize={font(10)} fill={WAVE_COLORS.doppler} fontWeight="bold">
              {`接收 f' = ${fObserver.toFixed(1)} Hz`}
            </text>
            <text x={0} y={49} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight}>
              迎面相对波速 v+vₒ
            </text>
          </g>

          {/* 观察者速度矢量 (PhysicsVectorArrow) */}
          {observerSpeed !== 0 && (
            <PhysicsVectorArrow
              originDesign={{ x: movingObsPos.px, y: trackY - 26 }}
              vector={{ x: observerSpeed * 0.12, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
          )}
        </g>
      ) : (
        /* ══════════ 模式 0 & 2：波源运动场景 ══════════ */
        <g>
          {/* 左侧后方固定站台 */}
          <g transform={`translate(${stationLeftPos.px}, ${trackY})`}>
            {/* 脉冲到达光环 */}
            {pulseBack && (
              <circle cx={0} cy={-16} r={20} fill="none" stroke={WAVE_COLORS.waveform} strokeWidth={2.5} opacity={0.8} />
            )}
            <rect x={-12} y={-6} width={24} height={12} rx={2} fill={withAlpha(apparatusBody, 0.15)} stroke={apparatusBase} strokeWidth={1.5} />
            <line x1={0} y1={-6} x2={0} y2={-18} stroke={apparatusBase} strokeWidth={1.5} />
            <circle cx={0} cy={-18} r={4} fill={pulseBack ? WAVE_COLORS.waveform : CANVAS_COLORS.textMuted} stroke={CANVAS_COLORS.white} strokeWidth={1} />

            <text x={0} y={22} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
              后方监测站
            </text>
            <text x={0} y={35} textAnchor="middle" fontSize={font(10)} fill={WAVE_COLORS.waveform} fontWeight="bold">
              {`f' = ${fBack.toFixed(1)} Hz`}
            </text>
          </g>

          {/* 中央站台（展示由迎面靠近到背离远去的阶跃过程） */}
          <g transform={`translate(${stationCenterPos.px}, ${trackY - 32})`}>
            <circle cx={0} cy={0} r={7} fill={withAlpha(apparatusBody, 0.15)} stroke={apparatusBase} strokeWidth={1.2} />
            <circle cx={0} cy={0} r={2.5} fill={hasPassedCentral ? WAVE_COLORS.waveform : WAVE_COLORS.waveformB} />

            <text x={0} y={15} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight}>
              x = 0
            </text>
          </g>

          {/* 右侧前方固定站台 */}
          <g transform={`translate(${stationRightPos.px}, ${trackY})`}>
            {/* 脉冲到达光环 */}
            {pulseFront && (
              <circle cx={0} cy={-16} r={20} fill="none" stroke={WAVE_COLORS.waveformB} strokeWidth={2.5} opacity={0.8} />
            )}
            <rect x={-12} y={-6} width={24} height={12} rx={2} fill={withAlpha(apparatusBody, 0.15)} stroke={apparatusBase} strokeWidth={1.5} />
            <line x1={0} y1={-6} x2={0} y2={-18} stroke={apparatusBase} strokeWidth={1.5} />
            <circle cx={0} cy={-18} r={4} fill={pulseFront ? WAVE_COLORS.waveformB : CANVAS_COLORS.textMuted} stroke={CANVAS_COLORS.white} strokeWidth={1} />

            <text x={0} y={22} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
              前方监测站
            </text>
            <text x={0} y={35} textAnchor="middle" fontSize={font(10)} fill={WAVE_COLORS.waveformB} fontWeight="bold">
              {isSupersonic ? '激波面' : `f' = ${fFront.toFixed(1)} Hz`}
            </text>
          </g>
        </g>
      )}

      {/* ── 6. 运动波源主体 (发光呼吸波源 + 速度矢量) ── */}
      <g>
        {/* 呼吸发光外圈 */}
        <circle
          cx={sourceCenter.px}
          cy={trackY}
          r={16 + Math.sin(time * 16) * 3}
          fill={withAlpha(WAVE_COLORS.doppler, 0.3)}
        />
        {/* 波源小球 */}
        <Ball
          cx={sourceCenter.px}
          cy={trackY}
          r={9}
          type="steel"
        />

        {/* 波源运动速度矢量 (PhysicsVectorArrow) */}
        {sourceSpeed > 0 && mode !== 1 && (
          <PhysicsVectorArrow
            originDesign={{ x: sourceCenter.px, y: trackY }}
            vector={{ x: sourceSpeed * 0.12, y: 0 }}
            type="velocity"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
          />
        )}

        {/* 波源下方清晰标注 (避免与上方波长标注和速度箭头冲突) */}
        <text
          x={sourceCenter.px}
          y={trackY + 22}
          textAnchor="middle"
          fontSize={font(10)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          {mode === 1 ? `静止波源 S (f₀=${physics.frequency}Hz)` : `运动波源 S (vₛ=${sourceSpeed}m/s)`}
        </text>
      </g>
    </g>
  )
}
