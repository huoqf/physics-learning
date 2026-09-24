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
    waveSpeed,
    lambdaFront,
    lambdaBack,
    fFront,
    fBack,
    wavefronts,
    mode,
    isSupersonic,
  } = physics

  // 波源在设计画布中的中心位置
  const sourceCenter = worldToDesign(sourceX, sourceY, sceneScale)

  // 观察者物理坐标（左侧后方与右侧前方）
  const observerBackPos = worldToDesign(-20, 0, sceneScale)
  const observerFrontPos = worldToDesign(20, 0, sceneScale)

  // 器材外壳主色与描边 (SCENE_COLORS)
  const apparatusBody = SCENE_COLORS.circuit.node
  const apparatusBase = SCENE_COLORS.circuit.meterFrame

  return (
    <g>
      {/* ── 1. 水平基准运动导轨/航道 ── */}
      <line
        x1={vp.designLeft}
        y1={sourceCenter.py}
        x2={vp.designLeft + vp.designVisibleW}
        y2={sourceCenter.py}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={STROKE.guide}
        strokeDasharray="6,4"
      />

      {/* ── 2. 动态偏心圆波阵面 ── */}
      <g>
        {wavefronts.map((w, idx) => {
          const center = worldToDesign(w.sourceX, w.sourceY, sceneScale)
          const pixelRadius = w.radius * sceneScale.scaleX
          if (pixelRadius <= 1) return null

          return (
            <circle
              key={idx}
              cx={center.px}
              cy={center.py}
              r={pixelRadius}
              fill="none"
              stroke={WAVE_COLORS.soundWave}
              strokeWidth={idx === 0 ? 2 : STROKE.reference}
              opacity={w.opacity * 0.75}
            />
          )
        })}
      </g>

      {/* ── 3. 后方观察者 (左) ── */}
      <g transform={`translate(${observerBackPos.px}, ${observerBackPos.py})`}>
        {/* 探测接收仪底座与天线 */}
        <circle cx={0} cy={0} r={14} fill={withAlpha(apparatusBody, 0.15)} stroke={apparatusBase} strokeWidth={2} />
        <circle cx={0} cy={0} r={4} fill={apparatusBody} />
        <line x1={0} y1={-14} x2={0} y2={-26} stroke={apparatusBase} strokeWidth={1.5} />
        <circle cx={0} cy={-26} r={3} fill={WAVE_COLORS.waveform} />

        <text x={0} y={30} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
          观察者 B (后方)
        </text>
        <text x={0} y={44} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.labelText}>
          {`λ' = ${lambdaBack.toFixed(2)} m`}
        </text>
        <text x={0} y={57} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.labelTextLight}>
          {`听觉音调低沉 (f'=${fBack.toFixed(0)}Hz)`}
        </text>
      </g>

      {/* ── 4. 前方观察者 (右) ── */}
      <g transform={`translate(${observerFrontPos.px}, ${observerFrontPos.py})`}>
        {/* 探测接收仪底座与天线 */}
        <circle cx={0} cy={0} r={14} fill={withAlpha(apparatusBody, 0.15)} stroke={apparatusBase} strokeWidth={2} />
        <circle cx={0} cy={0} r={4} fill={apparatusBody} />
        <line x1={0} y1={-14} x2={0} y2={-26} stroke={apparatusBase} strokeWidth={1.5} />
        <circle cx={0} cy={-26} r={3} fill={WAVE_COLORS.waveformB} />

        <text x={0} y={30} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.labelText} fontWeight="bold">
          观察者 A (前方)
        </text>
        {isSupersonic ? (
          <text x={0} y={44} textAnchor="middle" fontSize={font(10)} fill={WAVE_COLORS.waveformB} fontWeight="bold">
            激波波前 (马赫锥)
          </text>
        ) : (
          <>
            <text x={0} y={44} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.labelText}>
              {`λ' = ${lambdaFront.toFixed(2)} m`}
            </text>
            <text x={0} y={57} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.labelTextLight}>
              {`听觉音调尖锐 (f'=${fFront.toFixed(0)}Hz)`}
            </text>
          </>
        )}
      </g>

      {/* ── 5. 运动波源主体 ── */}
      <g>
        {/* 呼吸发光外圈 */}
        <circle
          cx={sourceCenter.px}
          cy={sourceCenter.py}
          r={18 + Math.sin(time * 20) * 3}
          fill={withAlpha(WAVE_COLORS.doppler, 0.25)}
        />
        {/* 波源小球 */}
        <Ball
          cx={sourceCenter.px}
          cy={sourceCenter.py}
          r={10}
          type="steel"
        />

        {/* 波源运动速度矢量 (PhysicsVectorArrow) */}
        {sourceSpeed > 0 && mode !== 1 && (
          <PhysicsVectorArrow
            originDesign={{ x: sourceCenter.px, y: sourceCenter.py }}
            vector={{ x: sourceSpeed * 0.1, y: 0 }}
            type="velocity"
            sceneScale={sceneScale}
            strokeWidth={STROKE.vectorMain}
          />
        )}

        <text
          x={sourceCenter.px}
          y={sourceCenter.py - 22}
          textAnchor="middle"
          fontSize={font(11)}
          fill={CANVAS_COLORS.labelText}
          fontWeight="bold"
        >
          {`波源 S (vₛ = ${sourceSpeed} m/s)`}
        </text>
      </g>

      {/* ── 6. 介质波速标注提示 ── */}
      <text
        x={vp.designLeft + 20}
        y={30}
        fontSize={font(11)}
        fill={CANVAS_COLORS.labelTextLight}
      >
        {`介质波速 v = ${waveSpeed} m/s  |  声速比 vs/v = ${(sourceSpeed / waveSpeed).toFixed(2)}`}
      </text>
    </g>
  )
}
