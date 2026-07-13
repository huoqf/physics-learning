import React from 'react'
import { PrimaryCoil, DCSource, Rheostat, CoupledCoilField, DragHandle } from '@/components/Physics'
import { PHYSICS_COLORS, EM_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { INDUCTION_LAYOUT } from '../utils'

interface InductionCoilSandboxProps {
  primaryCoilX: number     // 原线圈在设计坐标系下的 x 坐标 (220 - 420)
  resistance: number       // 滑动变阻器当前阻值 (5 - 100)
  circuitSwitch: number    // 原回路开关 (0=断开, 1=闭合)
  hasIronCore: number      // 是否插入铁芯 (0=无, 1=有)
  showLines: number        // 是否显示磁感线
  time: number             // 动画时间
  coilX: number            // 副线圈中心 (420)
  coilY: number            // 副线圈中心 y (160)
  font: (base: number) => number
  onDragCoil: (e: React.PointerEvent<SVGGElement>) => void
  onToggleSwitch: () => void
}

/**
 * 实验三：双线圈耦合回路沙盒组件
 * 
 * 职责：
 * 1. 渲染可水平拖拽的原线圈 (复用 PrimaryCoil) 与联动铁芯
 * 2. 渲染原回路中的稳压电源、开关与变阻器 (复用 DCSource、Rheostat)
 * 3. 渲染原线圈随位置动态拉伸变形的柔软引出导线
 * 4. 渲染随原副线圈相对位移而自适应改变的耦合磁场线 (复用 CoupledCoilField)
 */
export const InductionCoilSandbox: React.FC<InductionCoilSandboxProps> = ({
  primaryCoilX,
  resistance,
  circuitSwitch,
  hasIronCore,
  showLines,
  time,
  coilX,
  coilY,
  font,
  onDragCoil,
  onToggleSwitch,
}) => {
  const effectiveR = circuitSwitch ? resistance : 99999
  const primaryCurrent = effectiveR < 99999 ? 10 / effectiveR : 0
  const ironCoreFactor = hasIronCore ? 1.0 : 0.05

  // 导线端点全局坐标 (根据原线圈 x 自适应)
  // 原线圈引出引脚的坐标在 (x - 55, coilY + 120) 与 (x + 55, coilY + 120)
  const leftPinX = primaryCoilX - 55
  const rightPinX = primaryCoilX + 55
  const pinY = coilY + 120 // 320

  // 底部实验平台高度 (由原来约 330 下移至 520，在 650 视口底部舒展布局)
  const baseY = 520

  // 稳压电源正负端点坐标: 左正(58, baseY + 22), 右负(102, baseY + 22)
  const batPos = { x: 58, y: baseY + 22 }
  const batNeg = { x: 102, y: baseY + 22 }

  // 开关左触点 (115, baseY + 15), 右触点 (135, baseY + 15)
  const swLeft = { x: 115, y: baseY + 15 }
  const swRight = { x: 135, y: baseY + 15 }

  // 滑阻左侧接线柱 (150, baseY + 10), 右侧滑片接线柱 (290, baseY + 10)
  const rheoLeft = { x: 150, y: baseY + 10 }
  const rheoRight = { x: 290, y: baseY + 10 }

  // 动态引线路径（控制点距离根据纵向高差自适应，防止拉开距离后折弯过硬或反向）
  const dyLeft = batPos.y - pinY
  const wireLeftD = `M ${leftPinX} ${pinY} C ${leftPinX - 40} ${pinY + dyLeft * 0.4}, 100 ${pinY + dyLeft * 0.4}, ${batPos.x} ${batPos.y}`
  
  // 电源负极 -> 开关左触点
  const wireBatToSwD = `M ${batNeg.x} ${batNeg.y} C ${batNeg.x + 8} ${batNeg.y - 2}, ${swLeft.x - 8} ${swLeft.y + 4}, ${swLeft.x} ${swLeft.y}`
  
  // 开关右触点 -> 滑阻左端点
  const wireSwToRheoD = `M ${swRight.x} ${swRight.y} C ${swRight.x + 8} ${swRight.y - 2}, ${rheoLeft.x - 8} ${rheoLeft.y + 2}, ${rheoLeft.x} ${rheoLeft.y}`

  // 右端引线：滑阻滑片右端点 -> 原线圈右脚
  const dyRight = rheoRight.y - pinY
  const wireRightD = `M ${rheoRight.x} ${rheoRight.y} C ${rheoRight.x + 40} ${pinY + dyRight * 0.6}, ${rightPinX + 30} ${pinY + dyRight * 0.6}, ${rightPinX} ${pinY}`

  // 辅助二次贝塞尔求点函数，用以在动态连线上画流光
  const getBezierPoint = (t: number, p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const mt = 1 - t
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    }
  }

  // 贝塞尔控制点估算 (与 wireLeftD / wireRightD 保持动态同步)
  const pLeft0 = { x: leftPinX, y: pinY }
  const pLeft1 = { x: leftPinX - 40, y: pinY + dyLeft * 0.4 }
  const pLeft2 = { x: batPos.x, y: batPos.y }

  const pRight0 = { x: rheoRight.x, y: rheoRight.y }
  const pRight1 = { x: rheoRight.x + 40, y: pinY + dyRight * 0.6 }
  const pRight2 = { x: rightPinX, y: pinY }

  return (
    <g>
      {/* 1. 双线圈耦合磁感线 (随着原线圈移动而自适应形变) */}
      {showLines === 1 && (
        <CoupledCoilField
          primaryX={primaryCoilX}
          primaryW={110}
          primaryH={62}
          secondaryX={coilX}
          secondaryW={160}
          secondaryH={76}
          y={coilY}
          current={primaryCurrent * ironCoreFactor}
          canvasHeight={INDUCTION_LAYOUT.DESIGN_H}
          lineColor={EM_COLORS.magneticFieldLine}
        />
      )}

      {/* 2. 原回路导线连接 */}
      <path d={wireLeftD} fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth="3" />
      <path d={wireBatToSwD} fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth="3" />
      <path d={wireSwToRheoD} fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth="3" />
      <path d={wireRightD} fill="none" stroke={SCENE_COLORS.circuit.wire} strokeWidth="3" />

      {/* 3. 稳压直流电源 */}
      <DCSource
        type="instrument"
        x={80}
        y={baseY}
        width={80}
        height={80}
        voltage={10}
        label="E = 10V"
        polarity="left-positive"
      />

      {/* 4. 电路刀闸开关 */}
      <g
        transform={`translate(${(swLeft.x + swRight.x) / 2}, ${swLeft.y})`}
        className="cursor-pointer"
        onClick={onToggleSwitch}
      >
        {/* 底座 */}
        <rect x={-12} y={-5} width={24} height={10} rx={2} fill={CANVAS_COLORS.objectFillNeutral} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />
        {/* 触点 */}
        <circle cx={-10} cy={0} r={3} fill={circuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.trackHistory} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        <circle cx={10} cy={0} r={3} fill={circuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.trackHistory} stroke={CANVAS_COLORS.labelText} strokeWidth={1} />
        {/* 闸刀 */}
        <line
          x1={-10}
          y1={0}
          x2={circuitSwitch ? 10 : 6}
          y2={circuitSwitch ? 0 : -12}
          stroke={circuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.objectStroke}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle
          cx={circuitSwitch ? 10 : 6}
          cy={circuitSwitch ? 0 : -12}
          r={3}
          fill={circuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.objectStroke}
          stroke={CANVAS_COLORS.labelText}
          strokeWidth={0.8}
        />
        <text x="0" y="18" fill={CANVAS_COLORS.textMuted} fontSize={font(7)} fontWeight="bold" textAnchor="middle">
          {circuitSwitch ? '闭合' : '断开'}
        </text>
      </g>

      {/* 5. 滑动变阻器 */}
      <Rheostat
        x={220}
        y={baseY}
        value={resistance}
        min={5}
        max={100}
        label="滑动变阻器 R"
        disabled={!circuitSwitch}
      />

      {/* 6. 原回路电流流光点 (顺着回路循环流动) */}
      {circuitSwitch === 1 && primaryCurrent > 0.05 && (
        <g style={{ filter: `drop-shadow(0 0 2px ${PHYSICS_COLORS.electricCurrent})` }}>
          {[0, 0.5].map((offset, i) => {
            const speedFactor = primaryCurrent * 3.5
            const tLeft = (((time * speedFactor + offset) % 1 + 1) % 1)
            const tRight = (((time * -speedFactor + offset) % 1 + 1) % 1)

            const pL = getBezierPoint(tLeft, pLeft0, pLeft1, pLeft2)
            const pR = getBezierPoint(tRight, pRight0, pRight1, pRight2)

            return (
              <g key={`pri-wire-glow-${i}`}>
                <circle cx={pL.x} cy={pL.y} r="3.2" fill={PHYSICS_COLORS.electricCurrent} />
                <circle cx={pR.x} cy={pR.y} r="3.2" fill={PHYSICS_COLORS.electricCurrent} />
              </g>
            )
          })}
        </g>
      )}

      {/* 7. 原线圈物理组件复用 (支持手动水平拖动，包含内置铁芯渲染) */}
      <PrimaryCoil
        x={primaryCoilX}
        y={coilY}
        width={110}
        height={62}
        turns={5}
        current={primaryCurrent}
        time={time}
        showIronCore={!!hasIronCore}
      />
      <DragHandle cx={primaryCoilX} cy={coilY} color={PHYSICS_COLORS.electricCurrent}
        cursor="grab" onPointerDown={onDragCoil} />
    </g>
  )
}

export default InductionCoilSandbox
