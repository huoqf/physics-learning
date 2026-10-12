import type { SceneScale } from '@/scene'
import { PhysicsVectorArrow } from '@/components/Physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
} from '@/theme/physics'
import type { MomentumExperimentResult, computeTrackSlidersAtTime } from '@/physics/experimentMomentum'

export interface AirTrackExperimentSceneProps {
  time: number
  groundY: number
  designWidth: number
  canvasSize: { font: (size: number) => number }
  showVectors: boolean
  vectorSceneScale: SceneScale
  experiment: MomentumExperimentResult
  trackSliders: ReturnType<typeof computeTrackSlidersAtTime>
  p1: number
  p2: number
  pTotal: number
  toTrackPx: (m: number) => number
}

/**
 * 高考实验模式：气垫导轨双滑块光电门碰撞测速场景
 */
export function AirTrackExperimentScene({
  time,
  groundY,
  designWidth,
  canvasSize,
  showVectors,
  vectorSceneScale,
  experiment,
  trackSliders,
  p1,
  p2,
  pTotal,
  toTrackPx,
}: AirTrackExperimentSceneProps) {
  return (
    <g id="air-track-experiment-scene">
      {/* 1. 气垫导轨基座与水平微调脚垫 */}
      <g id="air-track-assembly">
        {/* 地面支柱与水平旋钮脚垫 */}
        <rect x={120} y={groundY + 28} width={16} height={20} fill={SCENE_COLORS.mechanicsApparatus.airTrackPillar} rx={2} />
        <rect x={110} y={groundY + 44} width={36} height={6} fill={SCENE_COLORS.mechanicsApparatus.airTrackFoot} rx={3} />
        <rect x={704} y={groundY + 28} width={16} height={20} fill={SCENE_COLORS.mechanicsApparatus.airTrackPillar} rx={2} />
        <rect x={694} y={groundY + 44} width={36} height={6} fill={SCENE_COLORS.mechanicsApparatus.airTrackFoot} rx={3} />

        {/* 导轨主梁 (760px 对应 1.2m) */}
        <rect
          x={40}
          y={groundY}
          width={760}
          height={28}
          fill="url(#air-track-grad)"
          stroke={SCENE_COLORS.mechanicsApparatus.airTrackBeam}
          strokeWidth={1.5}
          rx={2}
        />
        {/* 导轨上表面微孔排气口模拟点阵 */}
        {Array.from({ length: 30 }).map((_, i) => (
          <circle
            key={`air-hole-${i}`}
            cx={52 + i * 25.5}
            cy={groundY + 4}
            r={1}
            fill={SCENE_COLORS.mechanicsApparatus.airTrackHole}
            opacity={0.6}
          />
        ))}

        {/* 两端防脱挡块 */}
        <rect x={36} y={groundY - 14} width={8} height={42} fill={SCENE_COLORS.mechanicsApparatus.airTrackBumper} rx={2} />
        <rect x={796} y={groundY - 14} width={8} height={42} fill={SCENE_COLORS.mechanicsApparatus.airTrackBumper} rx={2} />

        {/* 毫米/厘米刻度标尺 (0 ~ 120 cm) */}
        <rect x={40} y={groundY + 14} width={760} height={12} fill={SCENE_COLORS.mechanicsApparatus.scaleBg} opacity={0.9} />
        <line x1={40} y1={groundY + 14} x2={800} y2={groundY + 14} stroke={SCENE_COLORS.mechanicsApparatus.scaleStroke} strokeWidth={0.8} />
        {Array.from({ length: 13 }).map((_, i) => {
          const tickX = 40 + i * (760 / 12)
          return (
            <g key={`cm-tick-${i}`}>
              <line x1={tickX} y1={groundY + 14} x2={tickX} y2={groundY + 22} stroke={SCENE_COLORS.mechanicsApparatus.scaleTick} strokeWidth={1} />
              <text
                x={tickX}
                y={groundY + 25}
                fontSize={canvasSize.font(7)}
                fill={SCENE_COLORS.mechanicsApparatus.scaleText}
                textAnchor="middle"
                fontWeight="bold"
              >
                {i * 10}
              </text>
            </g>
          )
        })}
      </g>

      {/* 2. 两个 U 型光电门探头 */}
      {/* 光电门 1 (x = 0.35m) */}
      {(() => {
        const gate1Px = toTrackPx(experiment.gate1Pos)
        const isG1Active = trackSliders.gate1Active
        return (
          <g id="photogate-1">
            <path
              d={`M ${gate1Px - 14} ${groundY + 14} L ${gate1Px - 14} ${groundY - 50} Q ${gate1Px} ${groundY - 55} ${gate1Px + 14} ${groundY - 50} L ${gate1Px + 14} ${groundY + 14} Z`}
              fill="url(#photogate-grad)"
              stroke={SCENE_COLORS.mechanicsApparatus.photogateBody}
              strokeWidth={1.2}
            />
            <rect x={gate1Px - 8} y={groundY - 42} width={16} height={40} fill={SCENE_COLORS.mechanicsApparatus.photogateSlot} opacity={0.15} />

            <line
              x1={gate1Px - 8}
              y1={groundY - 34}
              x2={gate1Px + 8}
              y2={groundY - 34}
              stroke={isG1Active ? SCENE_COLORS.mechanicsApparatus.photogateBeam : SCENE_COLORS.mechanicsApparatus.photogateBeamIdle}
              strokeWidth={isG1Active ? 3 : 1.2}
              strokeDasharray={isG1Active ? 'none' : '3 2'}
              opacity={isG1Active ? 1 : 0.6}
            />
            {isG1Active && (
              <circle cx={gate1Px} cy={groundY - 34} r={6} fill={SCENE_COLORS.mechanicsApparatus.photogateBeam} opacity={0.4} />
            )}

            <g transform={`translate(${gate1Px}, ${groundY - 70})`}>
              {experiment.isRebounded === 1 ? (
                <>
                  <rect x={-40} y={-14} width={80} height={28} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                  <text x={0} y={-4} fontSize={canvasSize.font(6.5)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                    碰前 Δt₁: {trackSliders.gate1BeforeTime > 0 ? `${trackSliders.gate1BeforeTime.toFixed(4)}s` : '--'}
                  </text>
                  <text
                    x={0}
                    y={8}
                    fontSize={canvasSize.font(7.5)}
                    fill={trackSliders.gate1ReboundTime > 0 ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextMuted}
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    反弹: {trackSliders.gate1ReboundTime > 0 ? `${trackSliders.gate1ReboundTime.toFixed(4)}s` : '--'}
                  </text>
                </>
              ) : (
                <>
                  <rect x={-32} y={-10} width={64} height={20} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                  <text x={0} y={-2} fontSize={canvasSize.font(7)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                    光电门 1
                  </text>
                  <text
                    x={0}
                    y={7}
                    fontSize={canvasSize.font(9)}
                    fill={isG1Active ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextDone}
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {trackSliders.gate1DisplayTime > 0 ? `${trackSliders.gate1DisplayTime.toFixed(4)}s` : '0.0000s'}
                  </text>
                </>
              )}
            </g>
          </g>
        )
      })()}

      {/* 光电门 2 (x = 0.85m) */}
      {(() => {
        const gate2Px = toTrackPx(experiment.gate2Pos)
        const isG2Active = trackSliders.gate2Active
        return (
          <g id="photogate-2">
            <path
              d={`M ${gate2Px - 14} ${groundY + 14} L ${gate2Px - 14} ${groundY - 50} Q ${gate2Px} ${groundY - 55} ${gate2Px + 14} ${groundY - 50} L ${gate2Px + 14} ${groundY + 14} Z`}
              fill="url(#photogate-grad)"
              stroke={SCENE_COLORS.mechanicsApparatus.photogateBody}
              strokeWidth={1.2}
            />
            <rect x={gate2Px - 8} y={groundY - 42} width={16} height={40} fill={SCENE_COLORS.mechanicsApparatus.photogateSlot} opacity={0.15} />

            <line
              x1={gate2Px - 8}
              y1={groundY - 34}
              x2={gate2Px + 8}
              y2={groundY - 34}
              stroke={isG2Active ? SCENE_COLORS.mechanicsApparatus.photogateBeam : SCENE_COLORS.mechanicsApparatus.photogateBeamIdle}
              strokeWidth={isG2Active ? 3 : 1.2}
              strokeDasharray={isG2Active ? 'none' : '3 2'}
              opacity={isG2Active ? 1 : 0.6}
            />
            {isG2Active && (
              <circle cx={gate2Px} cy={groundY - 34} r={6} fill={SCENE_COLORS.mechanicsApparatus.photogateBeam} opacity={0.4} />
            )}

            <g transform={`translate(${gate2Px}, ${groundY - 70})`}>
              {experiment.collisionType === 0 && experiment.isRebounded === 0 && experiment.v1_after > 1e-4 ? (
                <>
                  <rect x={-40} y={-14} width={80} height={28} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                  <text x={0} y={-4} fontSize={canvasSize.font(6.5)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                    滑块2 Δt₂': {trackSliders.gate2S2Time > 0 ? `${trackSliders.gate2S2Time.toFixed(4)}s` : '--'}
                  </text>
                  <text
                    x={0}
                    y={8}
                    fontSize={canvasSize.font(7.5)}
                    fill={trackSliders.gate2S1Time > 0 ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextMuted}
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    滑块1: {trackSliders.gate2S1Time > 0 ? `${trackSliders.gate2S1Time.toFixed(4)}s` : '--'}
                  </text>
                </>
              ) : experiment.collisionType === 1 ? (
                <>
                  <rect x={-36} y={-10} width={72} height={20} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                  <text x={0} y={-2} fontSize={canvasSize.font(7)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                    粘合共速 Δt'
                  </text>
                  <text
                    x={0}
                    y={7}
                    fontSize={canvasSize.font(9)}
                    fill={isG2Active ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextDone}
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {trackSliders.gate2DisplayTime > 0 ? `${trackSliders.gate2DisplayTime.toFixed(4)}s` : '0.0000s'}
                  </text>
                </>
              ) : (
                <>
                  <rect x={-32} y={-10} width={64} height={20} rx={4} fill={SCENE_COLORS.mechanicsApparatus.meterBg} stroke={SCENE_COLORS.mechanicsApparatus.meterBorder} strokeWidth={1} />
                  <text x={0} y={-2} fontSize={canvasSize.font(7)} fill={SCENE_COLORS.mechanicsApparatus.meterTextMuted} textAnchor="middle">
                    滑块2 Δt₂'
                  </text>
                  <text
                    x={0}
                    y={7}
                    fontSize={canvasSize.font(9)}
                    fill={isG2Active ? SCENE_COLORS.mechanicsApparatus.meterTextActive : SCENE_COLORS.mechanicsApparatus.meterTextDone}
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {trackSliders.gate2DisplayTime > 0 ? `${trackSliders.gate2DisplayTime.toFixed(4)}s` : '0.0000s'}
                  </text>
                </>
              )}
            </g>
          </g>
        )
      })()}

      {/* 3. 两辆滑块小车 */}
      {/* 滑块 1 (主碰滑块) */}
      {(() => {
        const slider1Px = toTrackPx(trackSliders.x1)
        const sliderW = (experiment.sliderLength / 1.2) * 760
        const plateW = Math.max(8, (experiment.plateWidth_m / 1.2) * 760)
        const s1H = 22
        const isColNow = Math.abs(time - experiment.t_collision) < 0.15

        return (
          <g id="slider-1">
            <rect
              x={slider1Px}
              y={groundY - s1H}
              width={sliderW}
              height={s1H}
              rx={3}
              fill={SCENE_COLORS.mechanicsApparatus.slider1Body}
              stroke={SCENE_COLORS.mechanicsApparatus.slider1Stroke}
              strokeWidth={1.5}
            />
            <line x1={slider1Px + 16} y1={groundY - s1H + 4} x2={slider1Px + 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider1Slot} strokeWidth={1} />
            <line x1={slider1Px + sliderW - 16} y1={groundY - s1H + 4} x2={slider1Px + sliderW - 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider1Slot} strokeWidth={1} />

            {/* 挡光片 */}
            <rect
              x={slider1Px + sliderW / 2 - plateW / 2}
              y={groundY - s1H - 18}
              width={plateW}
              height={18}
              fill={SCENE_COLORS.mechanicsApparatus.plateBody}
              stroke={SCENE_COLORS.mechanicsApparatus.plateBorder}
              strokeWidth={0.8}
              rx={1}
            />
            <text
              x={slider1Px + sliderW / 2}
              y={groundY - s1H - 21}
              fontSize={canvasSize.font(7)}
              fill={SCENE_COLORS.mechanicsApparatus.slider1Stroke}
              textAnchor="middle"
              fontWeight="bold"
            >
              Δx={experiment.plateWidth_mm}mm
            </text>

            <text
              x={slider1Px + sliderW / 2}
              y={groundY - 7}
              fontSize={canvasSize.font(9)}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              m₁={experiment.m1.toFixed(2)}kg
            </text>

            {experiment.collisionType === 0 ? (
              <path
                d={`M ${slider1Px + sliderW} ${groundY - 17} Q ${slider1Px + sliderW + (isColNow ? 3 : 8)} ${groundY - 11} ${slider1Px + sliderW} ${groundY - 5}`}
                fill="none"
                stroke={SCENE_COLORS.mechanicsApparatus.springBumper}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            ) : (
              <g>
                <line x1={slider1Px + sliderW} y1={groundY - 11} x2={slider1Px + sliderW + 6} y2={groundY - 11} stroke={SCENE_COLORS.mechanicsApparatus.puttyNeedle} strokeWidth={2} />
                <circle cx={slider1Px + sliderW + 6} cy={groundY - 11} r={3} fill={SCENE_COLORS.mechanicsApparatus.puttyClay} />
              </g>
            )}

            {showVectors && trackSliders.v1 !== 0 && (
              <g>
                <PhysicsVectorArrow
                  originDesign={{ x: slider1Px + sliderW / 2, y: groundY - s1H - 30 }}
                  vector={{ x: trackSliders.v1, y: 0 }}
                  type="velocity"
                  sceneScale={vectorSceneScale}
                />
                <text
                  x={slider1Px + sliderW / 2 + (trackSliders.v1 > 0 ? 15 : -15)}
                  y={groundY - s1H - 32}
                  fontSize={canvasSize.font(9)}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v₁={trackSliders.v1.toFixed(2)}m/s
                </text>
              </g>
            )}
          </g>
        )
      })()}

      {/* 滑块 2 (被碰滑块) */}
      {(() => {
        const slider2Px = toTrackPx(trackSliders.x2)
        const sliderW = (experiment.sliderLength / 1.2) * 760
        const plateW = Math.max(8, (experiment.plateWidth_m / 1.2) * 760)
        const s2H = 22

        return (
          <g id="slider-2">
            <rect
              x={slider2Px}
              y={groundY - s2H}
              width={sliderW}
              height={s2H}
              rx={3}
              fill={SCENE_COLORS.mechanicsApparatus.slider2Body}
              stroke={SCENE_COLORS.mechanicsApparatus.slider2Stroke}
              strokeWidth={1.5}
            />
            <line x1={slider2Px + 16} y1={groundY - s2H + 4} x2={slider2Px + 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider2Slot} strokeWidth={1} />
            <line x1={slider2Px + sliderW - 16} y1={groundY - s2H + 4} x2={slider2Px + sliderW - 16} y2={groundY - 4} stroke={SCENE_COLORS.mechanicsApparatus.slider2Slot} strokeWidth={1} />

            <rect
              x={slider2Px + sliderW / 2 - plateW / 2}
              y={groundY - s2H - 18}
              width={plateW}
              height={18}
              fill={SCENE_COLORS.mechanicsApparatus.plateBody}
              stroke={SCENE_COLORS.mechanicsApparatus.plateBorder}
              strokeWidth={0.8}
              rx={1}
            />
            <text
              x={slider2Px + sliderW / 2}
              y={groundY - s2H - 21}
              fontSize={canvasSize.font(7)}
              fill={SCENE_COLORS.mechanicsApparatus.slider2Stroke}
              textAnchor="middle"
              fontWeight="bold"
            >
              Δx={experiment.plateWidth_mm}mm
            </text>

            <text
              x={slider2Px + sliderW / 2}
              y={groundY - 7}
              fontSize={canvasSize.font(9)}
              fill="white"
              textAnchor="middle"
              fontWeight="bold"
            >
              m₂={experiment.m2.toFixed(2)}kg
            </text>

            <rect x={slider2Px - 2} y={groundY - 18} width={3} height={14} fill={SCENE_COLORS.mechanicsApparatus.airTrackBeam} rx={1} />

            {showVectors && trackSliders.v2 !== 0 && (
              <g>
                <PhysicsVectorArrow
                  originDesign={{ x: slider2Px + sliderW / 2, y: groundY - s2H - 30 }}
                  vector={{ x: trackSliders.v2, y: 0 }}
                  type="velocity"
                  sceneScale={vectorSceneScale}
                  color={PHYSICS_COLORS.elasticForce}
                />
                <text
                  x={slider2Px + sliderW / 2 + 15}
                  y={groundY - s2H - 32}
                  fontSize={canvasSize.font(9)}
                  fill={PHYSICS_COLORS.elasticForce}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  v₂={trackSliders.v2.toFixed(2)}m/s
                </text>
              </g>
            )}
          </g>
        )
      })()}

      {/* 碰撞瞬间火花/冲击波特效 */}
      {Math.abs(time - experiment.t_collision) < 0.18 && (
        <g transform={`translate(${toTrackPx(experiment.collisionPos)}, ${groundY - 11})`}>
          <circle r={12} fill={SCENE_COLORS.mechanicsApparatus.collisionSpark} opacity={0.4} />
          <circle r={6} fill={SCENE_COLORS.mechanicsApparatus.collisionSparkCore} opacity={0.8} />
        </g>
      )}

      {/* 4. 动量守恒矢量对比指示条 (下方独立悬浮卡片) */}
      {(() => {
        const cardW = 560
        const cardH = 26
        const cardX = (designWidth - cardW) / 2
        const cardY = groundY + 62

        const maxRefP = Math.max(0.2, pTotal, Math.abs(p1), Math.abs(p2))
        const scaleBar = (val: number) => (Math.abs(val) / maxRefP) * 180

        const w1 = scaleBar(p1)
        const w2 = scaleBar(p2)
        const barStartX = 72
        const barY = 9
        const barH = 8

        const isRebound = p1 < 0
        const hasErr = Math.abs(experiment.timing_err) > 1e-4

        return (
          <g transform={`translate(${cardX}, ${cardY})`}>
            <rect
              x={0}
              y={0}
              width={cardW}
              height={cardH}
              rx={6}
              fill={SCENE_COLORS.labels.glassPanelBg}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={1}
            />

            <text
              x={12}
              y={16}
              fontSize={canvasSize.font(8.5)}
              fill={SCENE_COLORS.mechanicsApparatus.scaleText}
              fontWeight="bold"
            >
              动量分配
            </text>

            <g transform={`translate(${barStartX}, ${barY})`}>
              <rect x={0} y={0} width={180} height={barH} rx={2} fill={CANVAS_COLORS.grid} opacity={0.6} />

              {isRebound ? (
                <>
                  <rect x={0} y={0} width={w2} height={barH} fill={PHYSICS_COLORS.impulse} opacity={0.85} rx={2} />
                  <rect x={Math.max(0, w2 - w1)} y={0} width={w1} height={barH} fill={PHYSICS_COLORS.forceArrowRed} opacity={0.9} rx={1} />
                </>
              ) : (
                <>
                  <rect x={0} y={0} width={w1} height={barH} fill={PHYSICS_COLORS.momentum} opacity={0.85} rx={2} />
                  <rect x={w1} y={0} width={w2} height={barH} fill={PHYSICS_COLORS.impulse} opacity={0.85} rx={2} />
                </>
              )}
            </g>

            <text
              x={barStartX + 190}
              y={16}
              fontSize={canvasSize.font(8.5)}
              fill={PHYSICS_COLORS.momentum}
              fontWeight="bold"
            >
              {hasErr
                ? `p_测 = ${experiment.p_total_after_measured.toFixed(3)} kg·m/s (相对误差 ${experiment.momentumErrorPercent >= 0 ? '+' : ''}${experiment.momentumErrorPercent.toFixed(1)}%)`
                : `p_总 = ${pTotal.toFixed(3)} kg·m/s (严格守恒)`}
            </text>
          </g>
        )
      })()}

      {/* 5. 顶部实验阶段提示徽章 */}
      <g transform={`translate(${designWidth / 2}, 20)`}>
        {(() => {
          let statusText = '① 滑块 1 匀速滑向光电门 1'
          if (time >= experiment.t_gate1_enter && time <= experiment.t_gate1_leave) {
            statusText = '② 光电门 1 正在挡光测速 (Δt₁)'
          } else if (time < experiment.t_collision) {
            statusText = '③ 滑块 1 接近静止滑块 2'
          } else if (Math.abs(time - experiment.t_collision) < 0.2) {
            statusText = '④ 💥 两滑块发生碰撞，系统内力相互作用'
          } else if (time <= (experiment.isRebounded ? experiment.t_gate1_rebound_leave : experiment.t_gate2_leave)) {
            statusText = experiment.isRebounded
              ? '⑤ 碰后滑块 1 反弹向左回穿门 1，滑块 2 向右穿过门 2'
              : '⑤ 碰后两滑块同向运动，滑块 2 穿过光电门 2'
          } else {
            statusText = '✓ 实验完成：比对碰前总动量与碰后总动量'
          }

          return (
            <g>
              <rect x={-150} y={-11} width={300} height={22} rx={11} fill={SCENE_COLORS.labels.glassPanelBg} stroke={SCENE_COLORS.mechanicsApparatus.puttyNeedle} strokeWidth={1} />
              <text fontSize={canvasSize.font(9.5)} fill={SCENE_COLORS.mechanicsApparatus.airTrackFoot} fontWeight="bold" textAnchor="middle" y={3}>
                {statusText}
              </text>
            </g>
          )
        })()}
      </g>
    </g>
  )
}
