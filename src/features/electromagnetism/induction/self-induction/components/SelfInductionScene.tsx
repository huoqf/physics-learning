import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene'
import {
  DCSource,
  CoilBase,
  LightBulb,
  Rheostat,
  MagneticFieldGrid,
  CircuitSwitch,
  PhysicsVectorArrow,
} from '@/components/Physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  withAlpha,
} from '@/theme/physics'
import type { SelfInductionPhysicsResult } from '../hooks/useSelfInductionPhysics'

export interface SelfInductionSceneProps {
  physics: SelfInductionPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  time: number
}

export function SelfInductionScene({
  physics,
  canvasSize,
  sceneScale,
  time,
}: SelfInductionSceneProps) {
  const { font } = canvasSize
  const {
    mode,
    iCoil,
    powerLamp1,
    powerLamp2,
    switchClosed,
    theta,
    isSlottedBool,
    isInMagneticField,
  } = physics

  if (mode === 2) {
    // Mode 2: 电磁阻尼摆动场景
    const pivotX = 420
    const pivotY = 30
    const armLength = 190
    const bobX = pivotX + armLength * Math.sin(theta)
    const bobY = pivotY + armLength * Math.cos(theta)
    const plateWidth = 60
    const plateHeight = 44

    return (
      <g>
        {/* 匀强磁场区 */}
        <rect
          x={360}
          y={170}
          width={120}
          height={90}
          fill={withAlpha(PHYSICS_COLORS.negativeCharge, 0.08)}
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <MagneticFieldGrid x={360} y={170} w={120} h={90} direction="in" />
        <text
          x={420}
          y={164}
          fill={PHYSICS_COLORS.magneticField}
          fontSize={font(11)}
          textAnchor="middle"
          fontWeight={600}
        >
          匀强磁场区 B
        </text>

        {/* 摆杆与悬挂支架 */}
        <circle cx={pivotX} cy={pivotY} r={5} fill={SCENE_COLORS.materials.structStrokeMid} />
        <line
          x1={pivotX}
          x2={bobX}
          y1={pivotY}
          y2={bobY}
          stroke={CANVAS_COLORS.textMuted}
          strokeWidth={2.5}
        />

        {/* 摆锤金属板 (整体板 vs 梳齿开缝板) */}
        <g transform={`translate(${bobX}, ${bobY}) rotate(${(-theta * 180) / Math.PI})`}>
          <rect
            x={-plateWidth / 2}
            y={-plateHeight / 2}
            width={plateWidth}
            height={plateHeight}
            fill={SCENE_COLORS.materials.structStrokePale}
            stroke={SCENE_COLORS.materials.structStrokeMid}
            strokeWidth={1.8}
            rx={2}
          />
          {/* 梳齿开缝纹理 */}
          {isSlottedBool && (
            <g stroke={CANVAS_COLORS.white} strokeWidth={2}>
              <line x1={-18} y1={-plateHeight / 2} x2={-18} y2={10} />
              <line x1={-6} y1={-plateHeight / 2} x2={-6} y2={10} />
              <line x1={6} y1={-plateHeight / 2} x2={6} y2={10} />
              <line x1={18} y1={-plateHeight / 2} x2={18} y2={10} />
            </g>
          )}

          {/* 涡流示意环路 (仅在处于磁场区且未开缝时显现) */}
          {!isSlottedBool && isInMagneticField && Math.abs(physics.omega) > 0.05 && (
            <ellipse
              cx={0}
              cy={0}
              rx={18}
              ry={12}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
        </g>

        {/* 阻尼安培力矢量：必须在磁场内且具有相对速度时才存在 */}
        {isInMagneticField && Math.abs(physics.omega) > 0.05 && (
          <PhysicsVectorArrow
            originDesign={{ x: bobX, y: bobY }}
            vector={{ x: -physics.omega * (isSlottedBool ? 0.15 : 0.8), y: 0 }}
            type="force"
            sceneScale={sceneScale}
          />
        )}

        {/* 状态与考点提示 */}
        <text
          x={140}
          y={60}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(12)}
        >
          {isSlottedBool ? '【梳齿片】：切断大涡流回路，阻尼微弱' : '【完整铜片】：感应强涡流，安培力强阻尼'}
        </text>
        <text
          x={140}
          y={85}
          fill={PHYSICS_COLORS.kineticEnergy}
          fontSize={font(11)}
        >
          {`机械能保留率: ${(physics.energyRatio * 100).toFixed(1)}%`}
        </text>
        <text
          x={140}
          y={105}
          fill={isInMagneticField ? SCENE_COLORS.coil.activeGlow : CANVAS_COLORS.trackHistory}
          fontSize={font(11)}
        >
          {isInMagneticField ? '● 处于磁场切割区：受阻尼安培力' : '○ 离开磁场：仅受重力与拉力，安培力为零'}
        </text>
      </g>
    )
  }

  // Mode 0 与 Mode 1: 电路场景
  const wireColor = CANVAS_COLORS.trackHistory
  const wireActiveColor = PHYSICS_COLORS.electricCurrent
  const dischargeColor = PHYSICS_COLORS.alertRed

  // 坐标定义 (splitV 预设设计尺寸 840 x 325)
  // 通电自感 Mode 0：标准日字型双支路并联电路
  const mode0Layout = {
    xLeft: 220,
    xRight: 640,
    yTop: 75,
    yBot: 165,
    yBase: 257,
    pPos: { x: 308, y: 257 },
    pNeg: { x: 352, y: 257 },
    dcSource: { x: 330, y: 235 },
    switchPos: { x: 460, y: 257 },
    rhCenter: { x: 390, y: 75, w: 90 },
    coilCenter: { x: 390, y: 165, w: 100 },
    bulb1: { x: 540, y: 75 },
    bulb2: { x: 540, y: 165 },
  } as const

  return (
    <g>
      {/* ────────────────── 1. Mode 0: 通电自感（高考标准·日字型对称拓扑） ────────────────── */}
      {mode === 0 && (() => {
        const { xLeft, xRight, yTop, yBot, yBase, pPos, pNeg, dcSource, switchPos, rhCenter, coilCenter, bulb1, bulb2 } = mode0Layout

        // 变阻器端子 (x=390, y=75, w=90, scale=90/140=0.643)
        // 限流式接法输入输出端子在变阻器中心水平线上 (yTop = 75)
        const rhScale = rhCenter.w / 140
        const rhInX = rhCenter.x - 73 * rhScale // 343
        const rhOutX = rhCenter.x + 73 * rhScale // 437

        // 线圈端子 (x=390, y=165, w=100)
        const coilLeftX = coilCenter.x - 50  // 340
        const coilRightX = coilCenter.x + 50 // 440

        // 灯泡底座接入高度统一水平平齐
        const bulb1BaseY = yTop
        const bulb2BaseY = yBot

        return (
          <g>
            {/* A. 基础导线网格 (端子级精准对接，零穿透、零多余拐弯) */}
            <g stroke={wireColor} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none">
              {/* 底部外干路：电源正极 -> 左下拐角 */}
              <line x1={pPos.x} y1={yBase} x2={xLeft} y2={yBase} />
              {/* 底部外干路：电源负极 -> 开关左端子 */}
              <line x1={pNeg.x} y1={yBase} x2={switchPos.x - 18} y2={yBase} />
              {/* 底部外干路：开关右端子 -> 右下拐角 */}
              <line x1={switchPos.x + 18} y1={yBase} x2={xRight} y2={yBase} />

              {/* 左竖分流干路：左下拐角 -> 垂直上升至上支路分流点 */}
              <line x1={xLeft} y1={yBase} x2={xLeft} y2={yTop} />

              {/* 右竖汇流干路：右上汇流点 -> 垂直下降至右下拐角 */}
              <line x1={xRight} y1={yTop} x2={xRight} y2={yBase} />

              {/* 上支路 1 (纯阻)：分流点 -> 变阻器左接线柱 */}
              <line x1={xLeft} y1={yTop} x2={rhInX} y2={yTop} />
              {/* 上支路 2：变阻器右接线柱 -> 灯泡 A1 左底座 */}
              <line x1={rhOutX} y1={yTop} x2={bulb1.x - 12} y2={yTop} />
              {/* 上支路 3：灯泡 A1 右底座 -> 右汇流竖线 */}
              <line x1={bulb1.x + 12} y1={yTop} x2={xRight} y2={yTop} />

              {/* 下支路 1 (电感)：分流点 -> 线圈左端子 */}
              <line x1={xLeft} y1={yBot} x2={coilLeftX} y2={yBot} />
              {/* 下支路 2：线圈右端子 -> 灯泡 A2 左底座 */}
              <line x1={coilRightX} y1={yBot} x2={bulb2.x - 12} y2={bulb2BaseY} />
              {/* 下支路 3：灯泡 A2 右底座 -> 右汇流竖线 */}
              <line x1={bulb2.x + 12} y1={bulb2BaseY} x2={xRight} y2={bulb2BaseY} />
            </g>

            {/* 关键电气分流/汇流节点小圆点 */}
            <circle cx={xLeft} cy={yTop} r={3.5} fill={PHYSICS_COLORS.labelText} />
            <circle cx={xLeft} cy={yBot} r={3.5} fill={PHYSICS_COLORS.labelText} />
            <circle cx={xRight} cy={yTop} r={3.5} fill={PHYSICS_COLORS.labelText} />
            <circle cx={xRight} cy={yBot} r={3.5} fill={PHYSICS_COLORS.labelText} />

            {/* B. 器件层 */}
            {/* 1. 稳压直流电源 (标准长正短负符号) */}
            <DCSource
              type="symbol"
              orientation="horizontal"
              x={dcSource.x}
              y={yBase}
              voltage={12}
              polarity="left-positive"
              label="E = 12V"
            />

            {/* 2. 电键开关 S (底路上居中偏右) */}
            <CircuitSwitch
              x={switchPos.x}
              y={switchPos.y}
              closed={switchClosed}
              variant="symbolic"
              label="S"
              font={font}
            />

            {/* 3. 上支路变阻器 R (标准原理图符号) */}
            <Rheostat
              x={rhCenter.x}
              y={yTop}
              width={rhCenter.w}
              value={10}
              min={0}
              max={20}
              variant="symbolic"
              font={font}
              label="R"
              unit="Ω"
              showLabel={false}
            />

            {/* 4. 上支路灯泡 A1 */}
            <LightBulb
              x={bulb1.x}
              y={yTop}
              power={powerLamp1}
              time={time}
              showLabel={false}
              font={font}
            />
            {/* 灯泡 A1 说明标签：置于灯泡上方 */}
            <text
              x={bulb1.x}
              y={yTop - 28}
              fontSize={font(10.5)}
              fill={CANVAS_COLORS.labelText}
              textAnchor="middle"
              fontWeight="bold"
            >
              A₁ 灯 (纯阻·瞬亮)
            </text>

            {/* 5. 下支路线圈 L */}
            <CoilBase
              x={coilCenter.x}
              y={yBot}
              width={coilCenter.w}
              height={44}
              turns={5}
              current={iCoil}
              time={time}
              leadType="horizontal"
              animated={false}
            />
            <text
              x={coilCenter.x}
              y={yBot + 36}
              fontSize={font(10.5)}
              fill={PHYSICS_COLORS.magneticField}
              textAnchor="middle"
              fontWeight="bold"
            >
              电感线圈 L (含铁芯)
            </text>

            {/* 6. 下支路灯泡 A2 */}
            <LightBulb
              x={bulb2.x}
              y={yBot}
              power={powerLamp2}
              time={time}
              showLabel={false}
              font={font}
            />
            {/* 灯泡 A2 说明标签：置于灯泡下方，远离灯座 */}
            <text
              x={bulb2.x}
              y={yBot + 36}
              fontSize={font(10.5)}
              fill={CANVAS_COLORS.labelText}
              textAnchor="middle"
              fontWeight="bold"
            >
              A₂ 灯 (电感·渐亮)
            </text>

            {/* C. 高中物理规范电流矢量指示 */}
            {switchClosed && (
              <g fill={wireActiveColor} stroke={wireActiveColor}>
                {/* 左干路电流上升箭头 */}
                <polygon
                  points={`${xLeft},${(yBase + yBot) / 2 - 5} ${xLeft - 3.5},${(yBase + yBot) / 2 + 3} ${xLeft + 3.5},${(yBase + yBot) / 2 + 3}`}
                />
                <text
                  x={xLeft - 10}
                  y={(yBase + yBot) / 2 + 4}
                  fontSize={font(10)}
                  fill={wireActiveColor}
                  textAnchor="end"
                  fontWeight="bold"
                  stroke="none"
                >
                  I
                </text>

                {/* 上支路电流向右箭头 */}
                {powerLamp1 > 0.05 && (
                  <g>
                    <polygon
                      points={`${(rhOutX + bulb1.x - 12) / 2 + 5},${bulb1BaseY} ${(rhOutX + bulb1.x - 12) / 2 - 3},${bulb1BaseY - 3.5} ${(rhOutX + bulb1.x - 12) / 2 - 3},${bulb1BaseY + 3.5}`}
                    />
                    <text
                      x={(rhOutX + bulb1.x - 12) / 2}
                      y={bulb1BaseY - 7}
                      fontSize={font(10)}
                      fill={wireActiveColor}
                      textAnchor="middle"
                      fontWeight="bold"
                      stroke="none"
                    >
                      I₁
                    </text>
                  </g>
                )}

                {/* 下支路电流向右箭头 */}
                {iCoil > 0.05 && (
                  <g>
                    <polygon
                      points={`${(coilRightX + bulb2.x - 12) / 2 + 5},${yBot} ${(coilRightX + bulb2.x - 12) / 2 - 3},${yBot - 3.5} ${(coilRightX + bulb2.x - 12) / 2 - 3},${yBot + 3.5}`}
                    />
                    <text
                      x={(coilRightX + bulb2.x - 12) / 2}
                      y={yBot - 7}
                      fontSize={font(10)}
                      fill={wireActiveColor}
                      textAnchor="middle"
                      fontWeight="bold"
                      stroke="none"
                    >
                      I₂={iCoil.toFixed(2)}A
                    </text>
                  </g>
                )}

                {/* 右竖汇流干路下降箭头 */}
                <polygon
                  points={`${xRight},${(yBase + yBot) / 2 + 5} ${xRight - 3.5},${(yBase + yBot) / 2 - 3} ${xRight + 3.5},${(yBase + yBot) / 2 - 3}`}
                />
              </g>
            )}
          </g>
        )
      })()}

      {/* ────────────────── 3. Mode 1: 断电自感（高考核心考点·教科书级标准规范拓扑） ────────────────── */}
      {mode === 1 && (() => {
        // 核心对称几何参数 (splitV 预设设计尺寸 840 x 325)
        const xLeft = 260
        const xRight = 640
        const yCoil = 68
        const yBulb = 156
        const yBottom = 268
        const centerX = 450

        // 器件端子坐标
        const coilW = 120
        const coilLeftX = centerX - coilW / 2 // 390
        const coilRightX = centerX + coilW / 2 // 510
        const bulbX = centerX
        const bulbY = yBulb - 12
        const bulbLeadW = 12

        // 电源与开关 (底部水平居中对称布局)
        const sourceX = 480
        const pPosM1 = { x: 458, y: yBottom }
        const pNegM1 = { x: 502, y: yBottom }
        const swM1X = 350
        const swM1Y = yBottom
        const swM1LeftX = 332
        const swM1RightX = 368

        const isDischarging = !switchClosed && iCoil > 0.02
        const isSteadyOn = switchClosed && time === 0

        return (
          <g>
            {/* ── 1. 外部供电主干路（底部标准矩形包围，横平竖直，仅有两个90°角） ── */}
            {/* 左干线：左并联节点(260, 195) -> 垂直向下至底角(260, 267) -> 水平向右至开关左端(342, 267) */}
            <path
              d={`M ${xLeft} ${yBulb} V ${yBottom} H ${swM1LeftX}`}
              fill="none"
              stroke={wireColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* 开关右端(378, 267) -> 水平向右至电源正极(458, 267) */}
            <path
              d={`M ${swM1RightX} ${yBottom} H ${pPosM1.x}`}
              fill="none"
              stroke={wireColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* 电源负极(502, 267) -> 水平向右至右底角(640, 267) -> 垂直向上至右并联节点(640, 195) */}
            <path
              d={`M ${pNegM1.x} ${yBottom} H ${xRight} V ${yBulb}`}
              fill="none"
              stroke={wireColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            {/* 底部直流电源 DCSource (标准长正短负符号) */}
            <DCSource
              type="symbol"
              orientation="horizontal"
              x={sourceX}
              y={yBottom}
              voltage={12}
              polarity="left-positive"
              label="E = 12V"
            />

            {/* 底部标准电键开关 S */}
            <CircuitSwitch
              x={swM1X}
              y={swM1Y}
              closed={switchClosed}
              variant="symbolic"
              label="S"
              font={font}
            />

            {/* ── 2. 核心并联自感放电回路（线圈 L 与灯泡 A，纵向间距100px，舒展宽阔） ── */}
            {/* 上支路：线圈支路导线 */}
            <path
              d={`M ${xLeft} ${yCoil} H ${coilLeftX}`}
              fill="none"
              stroke={isDischarging ? dischargeColor : wireColor}
              strokeWidth={isDischarging ? 3 : 2.5}
              strokeLinecap="round"
            />
            <path
              d={`M ${coilRightX} ${yCoil} H ${xRight}`}
              fill="none"
              stroke={isDischarging ? dischargeColor : wireColor}
              strokeWidth={isDischarging ? 3 : 2.5}
              strokeLinecap="round"
            />

            {/* 下支路：灯泡支路导线 */}
            <path
              d={`M ${xLeft} ${yBulb} H ${bulbX - bulbLeadW}`}
              fill="none"
              stroke={isDischarging ? dischargeColor : wireColor}
              strokeWidth={isDischarging ? 3 : 2.5}
              strokeLinecap="round"
            />
            <path
              d={`M ${bulbX + bulbLeadW} ${yBulb} H ${xRight}`}
              fill="none"
              stroke={isDischarging ? dischargeColor : wireColor}
              strokeWidth={isDischarging ? 3 : 2.5}
              strokeLinecap="round"
            />

            {/* 并联回路左右两侧垂直闭合导线 */}
            <path
              d={`M ${xLeft} ${yCoil} V ${yBulb}`}
              fill="none"
              stroke={isDischarging ? dischargeColor : wireColor}
              strokeWidth={isDischarging ? 3 : 2.5}
              strokeLinecap="round"
            />
            <path
              d={`M ${xRight} ${yCoil} V ${yBulb}`}
              fill="none"
              stroke={isDischarging ? dischargeColor : wireColor}
              strokeWidth={isDischarging ? 3 : 2.5}
              strokeLinecap="round"
            />

            {/* 四个规范并联角节点 */}
            <circle cx={xLeft} cy={yCoil} r={3.5} fill={isDischarging ? dischargeColor : PHYSICS_COLORS.labelText} />
            <circle cx={xRight} cy={yCoil} r={3.5} fill={isDischarging ? dischargeColor : PHYSICS_COLORS.labelText} />
            <circle cx={xLeft} cy={yBulb} r={3.5} fill={isDischarging ? dischargeColor : PHYSICS_COLORS.labelText} />
            <circle cx={xRight} cy={yBulb} r={3.5} fill={isDischarging ? dischargeColor : PHYSICS_COLORS.labelText} />

            {/* ── 3. 元器件渲染 ── */}
            {/* 上支路：电感线圈 L */}
            <CoilBase
              x={centerX}
              y={yCoil}
              width={coilW}
              height={44}
              turns={6}
              current={iCoil}
              time={time}
              leadType="horizontal"
              animated={false}
            />
            <text x={centerX} y={yCoil - 28} fontSize={font(11)} fill={PHYSICS_COLORS.magneticField} textAnchor="middle" fontWeight="bold">
              电感线圈 L (直流内阻 RL={physics.emfL > 0 ? '小' : 'RL'})
            </text>

            {/* 下支路：小灯泡 A (关闭内部重复label) */}
            <LightBulb x={bulbX} y={bulbY} power={powerLamp1} time={time} showLabel={false} font={font} />
            <text x={bulbX} y={yBulb + 28} fontSize={font(11)} fill={CANVAS_COLORS.textMuted} textAnchor="middle" fontWeight="bold">
              小灯泡 A (阻值 RA)
            </text>

            {/* ── 4. 瞬态闪亮动效徽标（置于线圈与灯泡正中空白区 y=112，绝不遮挡器件） ── */}
            {physics.willFlash && powerLamp1 > 1.1 && (
              <g transform={`translate(${centerX}, 112)`}>
                <rect x={-86} y={-13} width={172} height={26} rx={13} fill={withAlpha(CANVAS_COLORS.referencePoint, 0.16)} stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.5} />
                <text x={0} y={4} fontSize={font(11)} fill={CANVAS_COLORS.referencePoint} fontWeight={700} textAnchor="middle">
                  ⚡ 瞬态反向大电流闪亮！
                </text>
              </g>
            )}

            {/* ── 5. 高考核心考点：两种状态下的电流矢量对比 ── */}
            {/* 状态 A：稳定通电时，自左向右分流 */}
            {isSteadyOn && (
              <g>
                {/* 底部干路供电电流向左 */}
                <polygon
                  points={`${(pPosM1.x + swM1RightX) / 2 - 4},${yBottom} ${(pPosM1.x + swM1RightX) / 2 + 4},${yBottom - 3.5} ${(pPosM1.x + swM1RightX) / 2 + 4},${yBottom + 3.5}`}
                  fill={wireActiveColor}
                />
                {/* 左竖干线电流向上 */}
                <polygon
                  points={`${xLeft},${(yBulb + yBottom) / 2 - 4} ${xLeft - 3.5},${(yBulb + yBottom) / 2 + 4} ${xLeft + 3.5},${(yBulb + yBottom) / 2 + 4}`}
                  fill={wireActiveColor}
                />
                {/* 线圈支路电流向右 */}
                <polygon
                  points={`${(coilRightX + xRight) / 2 + 4},${yCoil} ${(coilRightX + xRight) / 2 - 4},${yCoil - 3.5} ${(coilRightX + xRight) / 2 - 4},${yCoil + 3.5}`}
                  fill={wireActiveColor}
                />
                <text x={(coilRightX + xRight) / 2} y={yCoil - 8} fontSize={font(10)} fill={wireActiveColor} textAnchor="middle" fontWeight="bold">
                  IL(向右)
                </text>
                {/* 灯泡支路电流向右 */}
                <polygon
                  points={`${(bulbX + bulbLeadW + xRight) / 2 + 4},${yBulb} ${(bulbX + bulbLeadW + xRight) / 2 - 4},${yBulb - 3.5} ${(bulbX + bulbLeadW + xRight) / 2 - 4},${yBulb + 3.5}`}
                  fill={wireActiveColor}
                />
                <text x={(bulbX + bulbLeadW + xRight) / 2} y={yBulb - 8} fontSize={font(10)} fill={wireActiveColor} textAnchor="middle" fontWeight="bold">
                  IA(向右)
                </text>
                {/* 右竖干线电流向下回流 */}
                <polygon
                  points={`${xRight},${(yBulb + yBottom) / 2 + 4} ${xRight - 3.5},${(yBulb + yBottom) / 2 - 4} ${xRight + 3.5},${(yBulb + yBottom) / 2 - 4}`}
                  fill={wireActiveColor}
                />
              </g>
            )}

            {/* 状态 B：电键切断瞬间，L-A 局部回路反向放电 (高考命题眼！) */}
            {isDischarging && (
              <g>
                {/* 1. 线圈自感阻碍电流减小，维持原方向向右（标在右侧开阔导线上） */}
                <polygon
                  points={`${(coilRightX + xRight) / 2 + 5},${yCoil} ${(coilRightX + xRight) / 2 - 5},${yCoil - 4} ${(coilRightX + xRight) / 2 - 5},${yCoil + 4}`}
                  fill={dischargeColor}
                />
                <text x={(coilRightX + xRight) / 2} y={yCoil - 9} fontSize={font(10.5)} fill={dischargeColor} textAnchor="middle" fontWeight="bold">
                  IL={iCoil.toFixed(2)}A (自感原向)
                </text>

                {/* 2. 右侧垂直支路向下流向灯泡 */}
                <polygon
                  points={`${xRight},${(yCoil + yBulb) / 2 + 5} ${xRight - 4},${(yCoil + yBulb) / 2 - 5} ${xRight + 4},${(yCoil + yBulb) / 2 - 5}`}
                  fill={dischargeColor}
                />

                {/* 3. 反向穿过小灯泡 A (从右向左！) */}
                <polygon
                  points={`${(bulbX + bulbLeadW + xRight) / 2 - 5},${yBulb} ${(bulbX + bulbLeadW + xRight) / 2 + 5},${yBulb - 4} ${(bulbX + bulbLeadW + xRight) / 2 + 5},${yBulb + 4}`}
                  fill={dischargeColor}
                />
                <text x={(bulbX + bulbLeadW + xRight) / 2} y={yBulb + 19} fontSize={font(10.5)} fill={dischargeColor} textAnchor="middle" fontWeight="bold">
                  【反向电流！】
                </text>

                {/* 4. 左侧垂直支路向上流回线圈 */}
                <polygon
                  points={`${xLeft},${(yCoil + yBulb) / 2 - 5} ${xLeft - 4},${(yCoil + yBulb) / 2 + 5} ${xLeft + 4},${(yCoil + yBulb) / 2 + 5}`}
                  fill={dischargeColor}
                />
              </g>
            )}
          </g>
        )
      })()}

      {/* ────────────────── 4. 实时物理状态与考点看板（自适应避让场景主体） ────────────────── */}
      <g transform={mode === 0 ? 'translate(24, 24)' : 'translate(560, 24)'}>
        <rect
          x={-8}
          y={-14}
          width={mode === 0 ? 186 : 260}
          height={66}
          rx={6}
          fill={withAlpha(CANVAS_COLORS.white, 0.92)}
          stroke={CANVAS_COLORS.trackHistory}
          strokeWidth={1}
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.04))"
        />
        <text x={0} y={2} fontSize={font(11.5)} fill={CANVAS_COLORS.labelText} fontWeight={700}>
          {mode === 0 ? '【通电自感】阻碍电流增加' : '【断电自感】阻碍电流减小'}
        </text>
        <text x={0} y={21} fontSize={font(10.5)} fill={PHYSICS_COLORS.electricCurrent} fontWeight={600}>
          {`线圈支路 IL = ${iCoil.toFixed(2)} A`}
        </text>
        <text x={0} y={38} fontSize={font(10.5)} fill={PHYSICS_COLORS.emf} fontWeight={600}>
          {mode === 0
            ? `A₂ 相对亮度 = ${(powerLamp2 * 100).toFixed(0)}%`
            : `小灯泡相对亮度 = ${(powerLamp1 * 100).toFixed(0)}% ${physics.willFlash && powerLamp1 > 1.0 ? '(超额定闪亮)' : ''}`}
        </text>
      </g>
    </g>
  )
}
