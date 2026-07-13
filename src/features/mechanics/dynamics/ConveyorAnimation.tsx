import { useMemo } from 'react'
import { AnimationSvgCanvas } from '@/components/Layout'
import { VectorArrow, Block, EnergyBars } from '@/components/Physics'
import { useAnimationViewport } from '@/hooks/useAnimationViewport'
import { useAnimationStore } from '@/stores'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { IDENTITY_SCENE_SCALE } from '@/scene/SceneScale'
import { getConveyorFrame, type ConveyorMode } from '@/physics/conveyor'

const MASS_KG = 1
const THETA_RAD = Math.PI / 12
const THETA_DEG = 15
const DESIGN = CANVAS_PRESETS.splitV
const SCENE = {
  leftX: 98,
  rightX: 742,
  baseY: 205,
  rollerRadius: 34,
  beltStroke: 26,
  blockW: 46,
  blockH: 30,
  dotCount: 13,
  dotRadius: 3,
  heatCount: 7,
  velocityScale: 14,
  frictionScale: 9,
  scratchScale: 42,
} as const

function pixelOrigin(x: number, y: number) {
  return { x, y }
}

function pixelVector(dx: number, dy: number) {
  return { x: dx, y: -dy }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

export default function ConveyorAnimation() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })
  const time = useAnimationStore((s) => s.time)
  const params = useAnimationStore((s) => s.params)

  const mode: ConveyorMode = (params.conveyorMode ?? 0) === 0 ? 'horizontal' : 'inclined'
  const vBelt = params.vBelt ?? 3
  const v0 = params.v0 ?? 0
  const mu = params.mu ?? 0.2
  const length = params.L ?? 6
  const showSyncLine = (params.showSyncLine ?? 1) === 1
  const showScratch = (params.showScratch ?? 1) === 1
  const theta = mode === 'inclined' ? THETA_RAD : 0
  const angleDeg = mode === 'inclined' ? THETA_DEG : 0

  const state = useMemo(
    () => getConveyorFrame({ vBelt, v0, mu, L: length, mode, thetaRad: THETA_RAD }, time, MASS_KG),
    [vBelt, v0, mu, length, mode, time],
  )

  const geometry = useMemo(() => {
    const beltLengthPx = SCENE.rightX - SCENE.leftX
    const leftY = SCENE.baseY + (mode === 'inclined' ? 38 : 0)
    const rightY = leftY - Math.tan(theta) * beltLengthPx
    const unit = { x: Math.cos(theta), y: -Math.sin(theta) }
    const normal = { x: Math.sin(theta), y: Math.cos(theta) }
    const xRatio = clamp(state.xObj / length, 0, 1)

    // 绝对相切法向偏移：滚轮半径 (34px) + 皮带半厚度 (3px) + 物块半高 (15px) = 52px
    const offsetNormal = SCENE.rollerRadius + 3 + SCENE.blockH / 2
    const blockCenter = {
      x: SCENE.leftX + beltLengthPx * xRatio + normal.x * offsetNormal,
      y: leftY + (rightY - leftY) * xRatio - normal.y * offsetNormal,
    }
    return { beltLengthPx, leftY, rightY, unit, normal, blockCenter }
  }, [length, mode, state.xObj, theta])

  const beltOffset = mod(time * vBelt * 22, geometry.beltLengthPx / SCENE.dotCount)
  const velocityLength = clamp(Math.abs(state.vObj) * SCENE.velocityScale, 0, 86)
  const velocitySign = state.vObj === 0 ? 1 : Math.sign(state.vObj)
  const frictionSign = state.friction === 0 ? 1 : Math.sign(state.friction)
  const isSliding = state.phase === 'sliding'

  // 1. 物理跟随皮带平移及截断划痕计算 (沿皮带表面 Y = center - R - 3px 绘制)
  const x1_phy = vBelt * time
  const x2_phy = state.xObj
  const xMin_phy = Math.min(x1_phy, x2_phy)
  const xMax_phy = Math.max(x1_phy, x2_phy)
  const xLeft_phy = clamp(xMin_phy, 0, length)
  const xRight_phy = clamp(xMax_phy, 0, length)
  const scratchActive = showScratch && (xRight_phy - xLeft_phy > 0.05) && (state.phase !== 'exitLeft' && state.phase !== 'exitRight' || state.relativeDistanceAbs > 0.05)

  const getSvgPos = (xPhy: number, offsetNormal = SCENE.rollerRadius + 3) => {
    const ratio = xPhy / length
    const bx = SCENE.leftX + ratio * geometry.beltLengthPx
    const by = geometry.leftY + (geometry.rightY - geometry.leftY) * ratio
    return {
      x: bx - geometry.normal.x * offsetNormal,
      y: by - geometry.normal.y * offsetNormal,
    }
  }

  const scratchStart = getSvgPos(xLeft_phy)
  const scratchEnd = getSvgPos(xRight_phy)

  // 2. 能量计算
  const energy = useMemo(() => {
    const m = MASS_KG
    const g = 9.8
    const dEk = 0.5 * m * (state.vObj * state.vObj - v0 * v0)
    const dEp = m * g * Math.sin(theta) * state.xObj
    const Q = state.heat
    const W = dEk + dEp + Q
    return { dEk, dEp, Q, W }
  }, [state.vObj, state.xObj, state.heat, v0, theta])

  return (
    <div className="w-full h-full relative overflow-hidden bg-white rounded-xl select-none">
      {/* ─── SVG 物理动画区（画布高度完全释放，传送带舒展居中） ─── */}
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
        <defs>
          <radialGradient id="roller-metal-gradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
          <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect width={DESIGN.width} height={DESIGN.height} fill={PHYSICS_COLORS.white} />

        {/* 传送带及滚轮主体（闭合机械结构相切绘制） */}
        <g>
          {/* 工作表面皮带（上皮带线），与滚轮顶端外侧绝对相切，规避 linearGradient bug */}
          <line
            x1={SCENE.leftX}
            y1={geometry.leftY - SCENE.rollerRadius}
            x2={SCENE.rightX}
            y2={geometry.rightY - SCENE.rollerRadius}
            stroke={PHYSICS_COLORS.strokeDark}
            strokeWidth={6}
            strokeLinecap="round"
          />
          {/* 回程皮带（下皮带线），与滚轮底端外侧绝对相切 */}
          <line
            x1={SCENE.leftX}
            y1={geometry.leftY + SCENE.rollerRadius}
            x2={SCENE.rightX}
            y2={geometry.rightY + SCENE.rollerRadius}
            stroke={withAlpha(PHYSICS_COLORS.strokeDark, 0.42)}
            strokeWidth={5}
            strokeLinecap="round"
          />

          {/* 旋转金属滑轮，物轮相切包裹 */}
          {[SCENE.leftX, SCENE.rightX].map((cx, index) => {
            const cy = index === 0 ? geometry.leftY : geometry.rightY
            const spin = time * vBelt * 110 * (index === 0 ? 1 : -1)
            return (
              <g key={cx} transform={`rotate(${spin}, ${cx}, ${cy})`}>
                {/* 外圈高质感金属轮 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={SCENE.rollerRadius}
                  fill="url(#roller-metal-gradient)"
                  stroke={PHYSICS_COLORS.strokeDark}
                  strokeWidth={2.5}
                />
                {/* 轮圈凹槽 */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={SCENE.rollerRadius - 6}
                  fill="none"
                  stroke={withAlpha(PHYSICS_COLORS.white, 0.35)}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                {/* 十字转动辐条 */}
                <line x1={cx - SCENE.rollerRadius + 4} y1={cy} x2={cx + SCENE.rollerRadius - 4} y2={cy} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={2.2} />
                <line x1={cx} y1={cy - SCENE.rollerRadius + 4} x2={cx} y2={cy + SCENE.rollerRadius - 4} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={2.2} />
                {/* 辐条刻度点 */}
                <circle cx={cx - SCENE.rollerRadius + 8} cy={cy} r={2} fill={PHYSICS_COLORS.strokeDark} />
                <circle cx={cx + SCENE.rollerRadius - 8} cy={cy} r={2} fill={PHYSICS_COLORS.strokeDark} />
                <circle cx={cx} cy={cy - SCENE.rollerRadius + 8} r={2} fill={PHYSICS_COLORS.strokeDark} />
                <circle cx={cx} cy={cy + SCENE.rollerRadius - 8} r={2} fill={PHYSICS_COLORS.strokeDark} />
                {/* 轴承 */}
                <circle cx={cx} cy={cy} r={10} fill="#475569" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1} />
                <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
              </g>
            )
          })}

          {/* 传送带表面小颗粒，贴合在上皮带表面上移动 */}
          {Array.from({ length: SCENE.dotCount }, (_, idx) => {
            const s = mod(idx * (geometry.beltLengthPx / SCENE.dotCount) + beltOffset, geometry.beltLengthPx)
            const x = SCENE.leftX + geometry.unit.x * s
            const y = geometry.leftY + geometry.unit.y * s - SCENE.rollerRadius - 3
            return <circle key={idx} cx={x} cy={y} r={2} fill={PHYSICS_COLORS.gridSubtle} opacity={0.7} />
          })}
        </g>

        {/* 跟随皮带平移的划痕绘制 */}
        {scratchActive && (
          <g filter="url(#glow-effect)">
            <line
              x1={scratchStart.x}
              y1={scratchStart.y}
              x2={scratchEnd.x}
              y2={scratchEnd.y}
              stroke={PHYSICS_COLORS.heatLoss}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.85}
            />
            <line
              x1={scratchStart.x}
              y1={scratchStart.y}
              x2={scratchEnd.x}
              y2={scratchEnd.y}
              stroke={withAlpha(PHYSICS_COLORS.heatLoss, 0.55)}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* 滑动时的摩擦热量微粒 */}
        {isSliding && showScratch && Array.from({ length: SCENE.heatCount }, (_, idx) => {
          const phase = (idx + time * 5) % SCENE.heatCount
          const offset = (phase - SCENE.heatCount / 2) * 5
          const baseX = geometry.blockCenter.x + geometry.normal.x * (SCENE.blockH / 2)
          const baseY = geometry.blockCenter.y + geometry.normal.y * (SCENE.blockH / 2)
          return (
            <circle
              key={idx}
              cx={baseX + geometry.normal.x * offset - geometry.unit.x * idx * 2}
              cy={baseY + geometry.normal.y * offset}
              r={1.5 + (idx % 2)}
              fill={PHYSICS_COLORS.heatLoss}
              opacity={0.28 + idx / (SCENE.heatCount * 1.6)}
            />
          )
        })}

        {/* 共速标记虚线 */}
        {showSyncLine && state.tSync != null && state.tSync <= time && (
          <g>
            <line
              x1={geometry.blockCenter.x}
              y1={geometry.blockCenter.y - 48}
              x2={geometry.blockCenter.x}
              y2={geometry.blockCenter.y + 44}
              stroke={PHYSICS_COLORS.annotation}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text
              x={geometry.blockCenter.x + 8}
              y={geometry.blockCenter.y - 40}
              fontSize={canvasSize.font(10)}
              fill={PHYSICS_COLORS.annotation}
              fontWeight="bold"
            >
              共速分段点
            </text>
          </g>
        )}

        {/* 物块 Block 组件绘制（绝对坐标定位并支持偏转，完全解决悬浮和错位） */}
        <g transform={`rotate(${-angleDeg}, ${geometry.blockCenter.x}, ${geometry.blockCenter.y})`}>
          <Block
            x={geometry.blockCenter.x - SCENE.blockW / 2}
            y={geometry.blockCenter.y - SCENE.blockH / 2}
            width={SCENE.blockW}
            height={SCENE.blockH}
            type="wood"
            label="物块"
            translucent={true}
            showCenterOfMass={true}
            font={canvasSize.font}
          />
        </g>

        {/* 规范受力分析图 FBD 绘制（作用点集中在质心） */}
        {/* 8.1 速度矢量 v (在物块上方，速度向右为正) */}
        <VectorArrow
          originPixel={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y - SCENE.blockH / 2 - 4)}
          vector={pixelVector(geometry.unit.x * velocitySign, geometry.unit.y * velocitySign)}
          type="velocity"
          sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={velocityLength}
          label="v"
          font={canvasSize.font}
          glow={true}
        />

        {/* 8.2 摩擦力矢量 f (从质心发出) */}
        {Math.abs(state.friction) > 0.01 && (
          <VectorArrow
            originPixel={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y)}
            vector={pixelVector(geometry.unit.x * frictionSign, geometry.unit.y * frictionSign)}
            type="friction"
            sceneScale={IDENTITY_SCENE_SCALE}
            pixelLength={50 * (Math.abs(state.friction) / (MASS_KG * 9.8))}
            color={PHYSICS_COLORS.friction}
            label="f"
            font={canvasSize.font}
            glow={true}
          />
        )}

        {/* 8.3 重力 G (从质心发出，垂直向下，物理 dy=1) */}
        <VectorArrow
          originPixel={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y)}
          vector={pixelVector(0, 1)}
          type="gravity"
          sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={50}
          label="G"
          font={canvasSize.font}
          glow={true}
        />

        {/* 8.4 支持力 F_N (从质心发出，垂直斜面向上) */}
        <VectorArrow
          originPixel={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y)}
          vector={pixelVector(-geometry.normal.x, -geometry.normal.y)}
          type="normalForce"
          sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={50 * (state.normalForce / (MASS_KG * 9.8))}
          label="Fn"
          font={canvasSize.font}
          glow={true}
        />

        {/* 8.5 重力沿斜面与垂直斜面的分解 (仅在倾斜模式下以虚线展示分力，从质心发出) */}
        {mode === 'inclined' && (
          <>
            {/* 沿斜面向下的重力分力 Gx = mg sinθ */}
            <VectorArrow
              originPixel={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y)}
              vector={pixelVector(-geometry.unit.x, -geometry.unit.y)}
              type="forceComponent"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={50 * Math.sin(THETA_RAD)}
              label="mg·sinθ"
              dashed={true}
              font={canvasSize.font}
            />
            {/* 垂直斜面向下的重力分力 Gy = mg cosθ */}
            <VectorArrow
              originPixel={pixelOrigin(geometry.blockCenter.x, geometry.blockCenter.y)}
              vector={pixelVector(geometry.normal.x, geometry.normal.y)}
              type="forceComponent"
              sceneScale={IDENTITY_SCENE_SCALE}
              pixelLength={50 * Math.cos(THETA_RAD)}
              label="mg·cosθ"
              dashed={true}
              font={canvasSize.font}
            />
          </>
        )}

        {/* x 轴位置参考刻度 */}
        <line
          x1={SCENE.leftX}
          y1={geometry.leftY + 52}
          x2={SCENE.leftX}
          y2={geometry.leftY + 86}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
        />
        <line
          x1={SCENE.rightX}
          y1={geometry.rightY + 52}
          x2={SCENE.rightX}
          y2={geometry.rightY + 86}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
        />
        <text x={SCENE.leftX} y={geometry.leftY + 102} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
          x=0
        </text>
        <text x={SCENE.rightX} y={geometry.rightY + 102} fontSize={canvasSize.font(10)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">
          x=L
        </text>
      </AnimationSvgCanvas>

      {/* ─── 3. 左上角 HTML 悬浮能量看板（复用 EnergyBars 组件，高清、带磨砂玻璃质感） ─── */}
      <div className="absolute top-3 left-3 w-[215px] h-[95px] pointer-events-none select-none">
        <EnergyBars
          items={[
            { key: 'W', label: 'W电', value: energy.W, color: PHYSICS_COLORS.power },
            { key: 'dEk', label: 'ΔEk', value: energy.dEk, color: PHYSICS_COLORS.kineticEnergy },
            { key: 'dEp', label: 'ΔEp', value: energy.dEp, color: PHYSICS_COLORS.potentialGravity },
            { key: 'Q', label: 'Q热', value: energy.Q, color: PHYSICS_COLORS.heatLoss },
          ]}
          compact={true}
          title="功与能转化 (J)"
          font={canvasSize.font}
        />
      </div>
    </div>
  )
}
