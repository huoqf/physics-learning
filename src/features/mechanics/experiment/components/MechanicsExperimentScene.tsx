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
  Spring,
} from '@/components/Physics'

import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import { worldToDesign, type SceneScale } from '@/scene'
import { DIFF_METHOD_MIN_DOTS, SPRING_NATURAL_M } from '@/physics/experimentMechanics'
import type { MechanicsExperimentPhysicsResult } from '../hooks/useMechanicsExperimentPhysics'
import {
  CART_HEIGHT_PX,
  CART_LENGTH_PX,
  FLAG_HEIGHT_PX,
  FLAG_OFFSET_PX,
  FREEFALL_PX_PER_M,
  FREEFALL_READOUT_X,
  FREEFALL_RULER_DOMAIN_CM,
  FREEFALL_RULER_LENGTH_PX,
  FREEFALL_RULER_X,
  FREEFALL_STAND_BASE_WIDTH,
  FREEFALL_STAND_CLAMP_OFFSET_Y,
  FREEFALL_STAND_HEIGHT,
  FREEFALL_STAND_X,
  FREEFALL_STAND_BASE_Y,
  FREEFALL_TAPE_TOP_Y,
  FREEFALL_TAPE_WIDTH,
  FREEFALL_TICKER_X,
  FREEFALL_TICKER_Y,
  FREEFALL_WEIGHT_OFFSET_Y,
  FREEFALL_WEIGHT_SIZE,
  PHOTOGATE_GAP_PX,
  SPRING_ANCHOR_X,
  SPRING_NATURAL_PX,
  SPRING_PX_PER_M,
  SPRING_RULER_DOMAIN_CM,
  SPRING_RULER_LENGTH_PX,
  SPRING_RULER_X,
  SPRING_STAND_BASE_Y,
  SPRING_STAND_CLAMP_OFFSET_Y,
  SPRING_STAND_HEIGHT,
  SPRING_STAND_X,
  SPRING_TOP_Y,
  TRACK_BOARD_WIDTH,
  TRACK_BOARD_X,
  TRACK_GROUND_Y,
  TRACK_ORIGIN_DESIGN_X,
  TRACK_PX_PER_M,
  TRACK_RULER_DOMAIN_CM,
  TRACK_RULER_LENGTH_PX,
  TRACK_RULER_Y,
  TRACK_STOP_DESIGN_X,
} from '../mechanicsExperimentLayout'

interface MechanicsExperimentSceneProps {
  mode: number
  physics: MechanicsExperimentPhysicsResult
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
  /** 遮光条宽度 d (m)：决定车顶遮光片的绘制宽度与速度标注口径 */
  d: number
  time?: number
}

/**
 * 高考力学实验基础 - SVG 场景渲染组件 (MechanicsExperimentScene)
 *
 * 按 mode 切换四大高考实验场景：打点纸带分析、光电门测速、胡克定律、验证机械能守恒。
 * 所有几何位置均由 `mechanicsExperimentLayout` 的常量派生；该模块按**两个设计盒**分节
 * （轨道类 splitV 840×325 / 竖直类 splitH 420×650），与物理层
 * (`@/physics/experimentMechanics`) 的行程上限、设计比例、刻度尺量程保持同源。
 */
export function MechanicsExperimentScene({
  mode,
  physics,
  canvasSize,
  sceneScale,
  d,
  time = 0,
}: MechanicsExperimentSceneProps) {
  const { font } = canvasSize
  const groundY = TRACK_GROUND_Y

  // 安全数值保护
  const safeX = Number.isFinite(physics?.x) ? physics.x : 0
  const safeV = Number.isFinite(physics?.v) ? physics.v : 0
  const safeDt1 = Number.isFinite(physics?.dt1Ms) ? physics.dt1Ms : 0
  const safeDt2 = Number.isFinite(physics?.dt2Ms) ? physics.dt2Ms : 0
  const safeVA = Number.isFinite(physics?.vA) ? physics.vA : 0
  const safeVB = Number.isFinite(physics?.vB) ? physics.vB : 0
  const safeDeltaX = Number.isFinite(physics?.deltaX) ? physics.deltaX : 0
  const safeF = Number.isFinite(physics?.F) ? physics.F : 0
  // 计时器铭牌频率必须与 T₀ = 1/f 同源：f 可调时若把铭牌写死 50 Hz，
  // 学生按「50 Hz ⇒ T₀ = 0.02 s」去读纸带就会与看板的 T₀ 打架。
  const tickerFreqHz =
    Number.isFinite(physics?.tickerPeriodS) && physics.tickerPeriodS > 0
      ? Math.round(1 / physics.tickerPeriodS)
      : 50
  const tapeDots = physics?.tapeDots ?? []
  const aCalculated = physics?.aCalculated ?? null

  // 小车位置由物理坐标转换 (worldToDesign(x, y, sceneScale) 返回 { px, py })
  const carDesignPos = worldToDesign(safeX, 0, sceneScale)
  const gate1Pos = worldToDesign(0.3, 0, sceneScale)
  const gate2Pos = worldToDesign(0.8, 0, sceneScale)

  const carPx = carDesignPos?.px ?? TRACK_ORIGIN_DESIGN_X
  const gate1Px = gate1Pos?.px ?? TRACK_ORIGIN_DESIGN_X + 90
  const gate2Px = gate2Pos?.px ?? TRACK_ORIGIN_DESIGN_X + 240

  // 遮光片绘制宽度 = 遮光条真实宽度 d（下限 3 design-unit 保证可见）
  const flagWidthPx = Math.max(3, d * TRACK_PX_PER_M)

  // 胡克定律模式的弹簧几何
  const springBottomY = SPRING_TOP_Y + SPRING_NATURAL_PX + safeDeltaX * SPRING_PX_PER_M
  const naturalLengthY = SPRING_TOP_Y + SPRING_NATURAL_PX

  // 验证机械能守恒模式（竖直自由下落）的几何与读数
  const fallPx = Math.max(0, safeX) * FREEFALL_PX_PER_M
  const weightCenterY =
    FREEFALL_TAPE_TOP_Y + fallPx + FREEFALL_WEIGHT_OFFSET_Y + FREEFALL_WEIGHT_SIZE / 2
  // 取「最后一个已落过的计数点」作为当前读数——不插值，因为真实实验只在打点处有数据
  const energyPoints = physics?.energyPoints ?? []
  const lastPoint = [...energyPoints].reverse().find((p) => p.h <= safeX + 1e-9)
  const currentEp = lastPoint?.deltaEp ?? 0
  const currentEk = lastPoint?.deltaEk ?? 0

  return (
    <g className="mechanics-experiment-scene">
      {/* 1. 实验模式 0：打点计时器与纸带分析 */}
      {mode === 0 && (
        <g className="mode-ticker-tape">
          {/* 实验长木板轨道与末端防冲挡块 */}
          <PhysicsGround x={TRACK_BOARD_X} y={groundY} width={TRACK_BOARD_WIDTH} type="ground" />
          <rect
            x={TRACK_STOP_DESIGN_X}
            y={groundY - CART_HEIGHT_PX}
            width={12}
            height={CART_HEIGHT_PX}
            fill={SCENE_COLORS.mechanicsApparatus.bumperRubber}
            stroke={CANVAS_COLORS.strokeDark}
            strokeWidth={1}
            rx={2}
          />

          {/* 打点计时器 */}
          <TickerTimer
            x={70}
            y={groundY - 32}
            type="electromagnetic"
            isVibrating={safeV > 0}
            frequency={tickerFreqHz}
          />

          {/* 打点纸带 (后端精准固定在计时器出口，前端连接小车) */}
          <PaperTape
            x={TRACK_ORIGIN_DESIGN_X}
            y={groundY - 20}
            width={Math.max(0, carPx - TRACK_ORIGIN_DESIGN_X)}
            dots={tapeDots}
            showLabels={tapeDots.length <= 12}
            highlightInterval={[0, DIFF_METHOD_MIN_DOTS - 1]}
            highlightLabel={
              aCalculated === null
                ? '逐差法：计数点不足'
                : `逐差法 a = ${aCalculated.toFixed(2)} m/s²`
            }
            fontFamily="sans-serif"
          />

          {/* 高中物理课本经典木质带轮小车 */}
          <Block
            x={carPx}
            y={groundY - CART_HEIGHT_PX}
            width={CART_LENGTH_PX}
            height={CART_HEIGHT_PX}
            type="woodCart"
            velocity={safeV}
            time={time}
          />

          {/* 小车速度矢量标注 */}
          <PhysicsVectorArrow
            originDesign={{ x: carPx + CART_LENGTH_PX / 2, y: groundY - CART_HEIGHT_PX / 2 }}
            vector={{ x: safeV, y: 0 }}
            type="velocity"
            sceneScale={sceneScale}
            label={`v = ${safeV.toFixed(2)} m/s`}
            font={font}
          />

          {/* 测量刻度尺：量程与轨道长度同源（0 ~ 2.00 m ⇔ 0 ~ 200 cm） */}
          <LabRuler
            x={TRACK_ORIGIN_DESIGN_X}
            y={TRACK_RULER_Y}
            length={TRACK_RULER_LENGTH_PX}
            domain={TRACK_RULER_DOMAIN_CM}
            showMagnifier
            magnifierPos={Math.max(
              0,
              Math.min(TRACK_RULER_LENGTH_PX - 20, carPx - TRACK_ORIGIN_DESIGN_X)
            )}
            fontFamily="monospace"
          />
        </g>
      )}

      {/* 2. 实验模式 1：光电门测速与测加速度 */}
      {mode === 1 && (
        <g className="mode-photogate">
          {/* 导轨轨道 */}
          <PhysicsGround x={TRACK_BOARD_X} y={groundY} width={TRACK_BOARD_WIDTH} type="ground" />

          {/* U 型光电门 1 与 光电门 2（门隙需大于车宽，使小车可真实穿过） */}
          <Photogate
            x={gate1Px}
            y={groundY}
            gap={PHOTOGATE_GAP_PX}
            isBlocked={!!physics.isBlocked1}
            beamVisible
            label="光电门 A"
          />
          <Photogate
            x={gate2Px}
            y={groundY}
            gap={PHOTOGATE_GAP_PX}
            isBlocked={!!physics.isBlocked2}
            beamVisible
            label="光电门 B"
          />

          {/* 带有遮光条的高中物理课本经典木质小车 */}
          <g transform={`translate(${carPx}, ${groundY - CART_HEIGHT_PX})`}>
            <Block
              x={0}
              y={0}
              width={CART_LENGTH_PX}
              height={CART_HEIGHT_PX}
              type="woodCart"
              velocity={safeV}
              time={time}
            />
            {/* 车顶遮光片：中心距车左端 FLAG_OFFSET_PX，宽度即遮光条宽度 d，高度须越过红外光束 */}
            <rect
              x={FLAG_OFFSET_PX - flagWidthPx / 2}
              y={-FLAG_HEIGHT_PX}
              width={flagWidthPx}
              height={FLAG_HEIGHT_PX}
              fill={SCENE_COLORS.mechanicsApparatus.tapeDotActive}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={1}
              rx={1}
            />
          </g>

          {/* 双通道毫秒数字计时器 */}
          <TimerDisplay
            x={45}
            y={18}
            timeMs={safeDt1}
            channel="CH A"
            title="光电门 A 遮光时间 Δt1"
            fontFamily="monospace"
          />
          <TimerDisplay
            x={175}
            y={18}
            timeMs={safeDt2}
            channel="CH B"
            title="光电门 B 遮光时间 Δt2"
            fontFamily="monospace"
          />

          {/* 瞬时速度计算标注：v = d/Δt，口径与看板同源 */}
          <g transform={`translate(${gate1Px}, ${groundY - 85})`}>
            <rect
              x={-72}
              y={-14}
              width={144}
              height={20}
              rx={4}
              fill={withAlpha(CANVAS_COLORS.white, 0.9)}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={0.8}
            />
            <text
              x={0}
              y={0}
              fill={PHYSICS_COLORS.velocity}
              fontSize={font(10)}
              fontFamily="monospace"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {`vA = d/Δt1 = ${safeVA.toFixed(2)} m/s`}
            </text>
          </g>
          <g transform={`translate(${gate2Px}, ${groundY - 85})`}>
            <rect
              x={-72}
              y={-14}
              width={144}
              height={20}
              rx={4}
              fill={withAlpha(CANVAS_COLORS.white, 0.9)}
              stroke={CANVAS_COLORS.axis}
              strokeWidth={0.8}
            />
            <text
              x={0}
              y={0}
              fill={PHYSICS_COLORS.velocity}
              fontSize={font(10)}
              fontFamily="monospace"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {`vB = d/Δt2 = ${safeVB.toFixed(2)} m/s`}
            </text>
          </g>
        </g>
      )}

      {/* 3. 实验模式 2：胡克定律探究 (弹簧伸长量与弹力)
          竖直运动 → 左右分区设计盒 420×650（见 07_CANVAS_SVG_CHART_RULES §2.8） */}
      {mode === 2 && (
        <g className="mode-hooke-law">
          {/* 铁架台：底座靠左，铁夹向右伸出夹住弹簧顶端 */}
          <LabStand
            x={SPRING_STAND_X}
            y={SPRING_STAND_BASE_Y}
            height={SPRING_STAND_HEIGHT}
            clampY={SPRING_STAND_CLAMP_OFFSET_Y}
            attachment="clamp"
          />

          {/* 弹簧自然长度 L₀ 基准虚线：把"总长 L"换算到"伸长量 Δx"的读数基准。
              标注落在虚线中段上方——左边是弹簧本体、右边是竖尺与放大镜，都不许压。 */}
          <line
            x1={SPRING_ANCHOR_X - 44}
            y1={naturalLengthY}
            x2={SPRING_RULER_X + 30}
            y2={naturalLengthY}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={1}
            strokeDasharray="5 4"
          />
          <text
            x={SPRING_ANCHOR_X + 26}
            y={naturalLengthY - 9}
            fill={CANVAS_COLORS.labelTextLight}
            fontSize={font(10)}
            fontFamily="monospace"
          >
            {`L₀ = ${(SPRING_NATURAL_M * 100).toFixed(1)} cm`}
          </text>

          {/* 悬挂弹簧 (自然长度 L₀ 对应 SPRING_NATURAL_PX) */}
          <Spring
            x1={SPRING_ANCHOR_X}
            y1={SPRING_TOP_Y}
            x2={SPRING_ANCHOR_X}
            y2={springBottomY}
            coils={10}
            radius={14}
          />

          {/* 弹簧下端挂钩与钩码 */}
          <g transform={`translate(${SPRING_ANCHOR_X}, ${springBottomY})`}>
            <Ball cx={0} cy={14} r={12} type="steel" />
          </g>

          {/* 弹力与伸长量标注：挂在钩码右侧的空列。
              不放在弹簧下端之上——那里紧贴 L₀ 基准虚线与钩码，三样东西会挤成一团；
              放在球心同高，学生一眼就能把「力/伸长量」与「挂着的钩码」对上。 */}
          <g transform={`translate(${SPRING_ANCHOR_X + 30}, ${springBottomY + 2})`}>
            <text
              x={0}
              y={0}
              fill={PHYSICS_COLORS.forceNet}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {`F = ${safeF.toFixed(2)} N`}
            </text>
            <text
              x={0}
              y={16}
              fill={PHYSICS_COLORS.displacement}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {`Δx = ${safeDeltaX.toFixed(3)} m`}
            </text>
          </g>

          {/* 旁侧竖直刻度尺 (1 cm = SPRING_PX_PER_CM design-unit)，放大镜跟随弹簧下端读数 */}
          <LabRuler
            x={SPRING_RULER_X}
            y={SPRING_TOP_Y}
            length={SPRING_RULER_LENGTH_PX}
            height={30}
            orientation="vertical"
            domain={SPRING_RULER_DOMAIN_CM}
            showMagnifier
            magnifierPos={SPRING_NATURAL_PX + safeDeltaX * SPRING_PX_PER_M}
            fontFamily="monospace"
          />
        </g>
      )}
      {/* 4. 实验模式 3：验证机械能守恒（竖直自由下落打点）
          竖直运动 → 左右分区设计盒 420×650（见 07_CANVAS_SVG_CHART_RULES §2.8） */}
      {mode === 3 && (
        <g className="mode-free-fall-energy">
          {/* 铁架台：底座靠左，铁夹向右伸出夹持打点计时器（限位孔竖直） */}
          <LabStand
            x={FREEFALL_STAND_X}
            y={FREEFALL_STAND_BASE_Y}
            height={FREEFALL_STAND_HEIGHT}
            baseWidth={FREEFALL_STAND_BASE_WIDTH}
            clampY={FREEFALL_STAND_CLAMP_OFFSET_Y}
            attachment="clamp"
          />

          {/* 打点计时器：纸带从其限位孔竖直垂下 */}
          <TickerTimer
            x={FREEFALL_TICKER_X}
            y={FREEFALL_TICKER_Y}
            type="electromagnetic"
            isVibrating={safeX > 0}
            frequency={tickerFreqHz}
          />

          {/* 竖直纸带：随重物下落而延长，点迹按纸带实测点集绘制（点越大=越早打） */}
          <rect
            x={FREEFALL_TICKER_X - FREEFALL_TAPE_WIDTH / 2}
            y={FREEFALL_TAPE_TOP_Y}
            width={FREEFALL_TAPE_WIDTH}
            height={fallPx + FREEFALL_WEIGHT_OFFSET_Y + 30}
            fill={SCENE_COLORS.mechanicsApparatus.tapeBg}
            stroke={SCENE_COLORS.mechanicsApparatus.tapeBorder}
            strokeWidth={1}
            rx={1}
          />
          {tapeDots.map((dotPx, i) => (
            <circle
              key={`ff-dot-${i}`}
              cx={FREEFALL_TICKER_X}
              cy={FREEFALL_TAPE_TOP_Y + dotPx}
              r={2.4}
              fill={
                i === 0
                  ? SCENE_COLORS.mechanicsApparatus.tapeDotActive
                  : SCENE_COLORS.mechanicsApparatus.tapeDotHistory
              }
            />
          ))}
          {/* 计数点序号：连续打点口径下相邻点只隔 ½gT₀² ≈ 1.96 mm（≈1.4 design-unit），
              逐点标号必然压字。故只标两端——首点 0 与当前读数点，正好与右侧读数块对上。 */}
          {[0, lastPoint?.index ?? -1]
            .filter((i, idx, arr) => i >= 0 && i < tapeDots.length && arr.indexOf(i) === idx)
            .map((i) => (
              <text
                key={`ff-dot-label-${i}`}
                x={FREEFALL_TICKER_X + FREEFALL_TAPE_WIDTH / 2 + 5}
                y={FREEFALL_TAPE_TOP_Y + tapeDots[i] + 3}
                fill={CANVAS_COLORS.labelTextLight}
                fontSize={font(9)}
                fontFamily="monospace"
              >
                {i}
              </text>
            ))}

          {/* 重物（带夹子的重锤）：与纸带同步下落 */}
          <g transform={`translate(${FREEFALL_TICKER_X}, ${weightCenterY})`}>
            <Ball cx={0} cy={0} r={FREEFALL_WEIGHT_SIZE / 2} type="steel" />
          </g>

          {/* 下落速度矢量（竖直向下，取负 y 表示向下）。起点贴球右侧，
              箭头长度受 maxVectorLength 限制，端不会顶到竖尺（RULER_X - 40 以内）。 */}
          <PhysicsVectorArrow
            originDesign={{ x: FREEFALL_TICKER_X + 30, y: weightCenterY }}
            vector={{ x: 0, y: -safeV }}
            type="velocity"
            sceneScale={sceneScale}
            label={`v = ${safeV.toFixed(2)} m/s`}
            font={font}
          />

          {/* 旁侧竖直刻度尺：量程 0~60 cm 与 FREEFALL_MAX_M 同源，放大镜随重物读数 */}
          <LabRuler
            x={FREEFALL_RULER_X}
            y={FREEFALL_TAPE_TOP_Y}
            length={FREEFALL_RULER_LENGTH_PX}
            height={30}
            orientation="vertical"
            domain={FREEFALL_RULER_DOMAIN_CM}
            showMagnifier
            magnifierPos={Math.min(FREEFALL_RULER_LENGTH_PX, fallPx)}
            fontFamily="monospace"
          />

          {/* 末个可测计数点的能量比对读数，排在竖尺右侧的空白列。
              注意：不显示「重物当前高度」——重物落地点通常落在两次打点之间，
              其位置必然比纸带末点更低，两者并排会让学生误以为读数错了。
              因此这里只报「第 n 点」的 h 与能量，与右屏看板严格同一口径。 */}
          <g transform={`translate(${FREEFALL_READOUT_X}, ${FREEFALL_TAPE_TOP_Y + 36})`}>
            <text
              x={0}
              y={0}
              fill={CANVAS_COLORS.labelTextLight}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {lastPoint ? `第 ${lastPoint.index} 点  h = ${(lastPoint.h * 100).toFixed(1)} cm` : '计数点不足'}
            </text>
            <text
              x={0}
              y={18}
              fill={PHYSICS_COLORS.displacement}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {`ΔEₚ = ${currentEp.toFixed(3)} J`}
            </text>
            <text
              x={0}
              y={36}
              fill={CANVAS_COLORS.labelText}
              fontSize={font(11)}
              fontFamily="monospace"
            >
              {`ΔEₖ = ${currentEk.toFixed(3)} J`}
            </text>
          </g>
        </g>
      )}
    </g>
  )
}
