import {
  Block,
  PhysicsGround,
  PaperTape,
  TickerTimer,
  Photogate,
  TimerDisplay,
  LabRuler,
  LabStand,
  PhysicsVectorArrow,
  Ball,
} from '@/components/Physics'
import { Spring } from '@/components/UI'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { worldToDesign, type SceneScale } from '@/scene'
import type { MechanicsExperimentPhysicsResult } from '../hooks/useMechanicsExperimentPhysics'

interface MechanicsExperimentSceneProps {
  mode: number
  physics: MechanicsExperimentPhysicsResult
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
  time?: number
}

/**
 * 高考力学实验基础 - SVG 场景渲染组件 (MechanicsExperimentScene)
 * 根据 mode 切换打点纸带分析、光电门测速、胡克定律三大高考实验场景
 */
export function MechanicsExperimentScene({
  mode,
  physics,
  canvasSize,
  sceneScale,
  time = 0,
}: MechanicsExperimentSceneProps) {
  const { font } = canvasSize
  const groundY = 240

  // 安全数值保护
  const safeX = Number.isFinite(physics?.x) ? physics.x : 0
  const safeV = Number.isFinite(physics?.v) ? physics.v : 0
  const safeA = Number.isFinite(physics?.aCalculated) ? physics.aCalculated : 0
  const safeDt1 = Number.isFinite(physics?.dt1Ms) ? physics.dt1Ms : 0
  const safeDt2 = Number.isFinite(physics?.dt2Ms) ? physics.dt2Ms : 0
  const safeDeltaX = Number.isFinite(physics?.deltaX) ? physics.deltaX : 0
  const safeF = Number.isFinite(physics?.F) ? physics.F : 0

  // 物体位置由物理坐标转换 (worldToDesign(x, y, sceneScale) 返回 { px, py })
  const carDesignPos = worldToDesign(safeX, 0, sceneScale)
  const gate1Pos = worldToDesign(0.3, 0, sceneScale)
  const gate2Pos = worldToDesign(0.8, 0, sceneScale)

  const carPx = carDesignPos?.px ?? 115
  const gate1Px = gate1Pos?.px ?? 150
  const gate2Px = gate2Pos?.px ?? 300

  return (
    <g className="mechanics-experiment-scene">
      {/* 1. 实验模式 0：打点计时器与纸带分析 */}
      {mode === 0 && (
        <g className="mode-ticker-tape">
          {/* 实验长木板轨道与末端防冲卡块 */}
          <PhysicsGround x={30} y={groundY} width={780} type="ground" />
          <rect x={750} y={groundY - 26} width={12} height={26} fill="#475569" stroke="#1E293B" strokeWidth={1} rx={2} />

          {/* 打点计时器 */}
          <TickerTimer
            x={70}
            y={groundY - 32}
            type="electromagnetic"
            isVibrating={safeV > 0}
            frequency={50}
          />

          {/* 打点纸带 (后端精准固定在计时器出口 x=115，前端连接小车) */}
          <PaperTape
            x={115}
            y={groundY - 20}
            width={Math.max(0, carPx - 115)}
            dots={physics.tapeDots || []}
            showLabels
            highlightInterval={[0, 6]}
            highlightLabel={`逐差法 a = ${safeA} m/s²`}
            fontFamily="sans-serif"
          />

          {/* 高中物理课本经典木质带轮小车 (Block woodCart 还原自然协调组件比例 width=56, height=26) */}
          <Block
            x={carPx}
            y={groundY - 26}
            width={56}
            height={26}
            type="woodCart"
            velocity={safeV}
            time={time}
          />

          {/* 小车速度矢量标注 */}
          <PhysicsVectorArrow
            originDesign={{ x: carPx + 28, y: groundY - 13 }}
            vector={{ x: safeV, y: 0 }}
            type="velocity"
            sceneScale={sceneScale}
            label={`v = ${safeV.toFixed(2)} m/s`}
            font={font}
          />

          {/* 测量刻度尺 */}
          <LabRuler
            x={115}
            y={groundY + 12}
            length={600}
            domain={[0, 60]}
            showMagnifier
            magnifierPos={Math.min(580, Math.max(0, carPx - 115))}
            fontFamily="monospace"
          />
        </g>
      )}

      {/* 2. 实验模式 1：光电门测速与测加速度 */}
      {mode === 1 && (
        <g className="mode-photogate">
          {/* 导轨轨道 */}
          <PhysicsGround x={30} y={groundY} width={780} type="ground" />

          {/* U 型光电门 1 与 光电门 2 */}
          <Photogate
            x={gate1Px}
            y={groundY}
            isBlocked={!!physics.isBlocked1}
            beamVisible
            label="光电门 A"
          />
          <Photogate
            x={gate2Px}
            y={groundY}
            isBlocked={!!physics.isBlocked2}
            beamVisible
            label="光电门 B"
          />

          {/* 带有遮光条的高中物理课本经典木质小车 */}
          <g transform={`translate(${carPx}, ${groundY - 26})`}>
            <Block
              x={0}
              y={0}
              width={56}
              height={26}
              type="woodCart"
              velocity={safeV}
              time={time}
            />
            {/* 车顶 1cm 宽遮光片 (位于车身中央 x=23~33) */}
            <rect x={23} y={-16} width={10} height={16} fill="#0F172A" stroke="#38BDF8" strokeWidth={1} rx={1} />
          </g>

          {/* 双通道毫秒数字计时器 */}
          <TimerDisplay
            x={50}
            y={30}
            timeMs={safeDt1}
            channel="CH A (v1)"
            title="光电门 A 遮光时间"
            fontFamily="monospace"
          />
          <TimerDisplay
            x={180}
            y={30}
            timeMs={safeDt2}
            channel="CH B (v2)"
            title="光电门 B 遮光时间"
            fontFamily="monospace"
          />

          {/* 瞬时速度计算标注 */}
          <text
            x={gate1Px}
            y={groundY - 90}
            fill={PHYSICS_COLORS.velocity}
            fontSize={font(11)}
            fontFamily="monospace"
            textAnchor="middle"
          >
            {`v1 = (d/Δt1) = ${safeDt1 > 0 ? (0.01 / (safeDt1 / 1000)).toFixed(2) : '0.00'} m/s`}
          </text>
        </g>
      )}

      {/* 3. 实验模式 2：胡克定律探究 (弹簧伸长量与弹力) */}
      {mode === 2 && (
        <g className="mode-hooke-law">
          {/* 铁架台支架 (clampY=248 使夹爪精准固定在 y=72 处的弹簧顶端) */}
          <LabStand x={420} y={320} height={280} clampY={248} attachment="clamp" />

          {/* 悬挂弹簧 (初始 80px 对应 8.0cm，拉伸 Δx * 1000px) */}
          <Spring
            x1={480}
            y1={72}
            x2={480}
            y2={72 + 80 + safeDeltaX * 1000}
            coils={10}
            radius={14}
          />

          {/* 弹簧下端挂钩与钩码 */}
          <g transform={`translate(480, ${72 + 80 + safeDeltaX * 1000})`}>
            <Ball cx={0} cy={14} r={12} type="steel" />
            {/* 钩码标注 */}
            <text
              x={20}
              y={18}
              fill={CANVAS_COLORS.labelText}
              fontSize={font(11)}
              fontFamily="sans-serif"
            >
              {`F = ${safeF} N`}
            </text>
          </g>

          {/* 旁侧测量直尺 (1cm = 10px，1m = 1000px) */}
          <LabRuler
            x={530}
            y={72}
            length={220}
            height={30}
            orientation="vertical"
            domain={[0, 22]}
            showMagnifier
            magnifierPos={80 + safeDeltaX * 1000}
            fontFamily="monospace"
          />
        </g>
      )}
    </g>
  )
}
