import React from 'react'
import { DialMeter, Rheostat, CircuitSwitch } from '@/components/Physics'
import { CANVAS_COLORS } from '@/theme/physics'
import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CircuitPhysicsResult } from './useCircuitPhysicsTemplate'

interface CircuitSceneTemplateProps {
  physics: CircuitPhysicsResult
  canvasSize: CanvasSize
  vp: ViewportInfo
  onToggleSwitch?: () => void
}

/**
 * 标准电路图场景模板 (CircuitSceneTemplate)
 * 核心机制：
 * 1. 严格使用组件库真实 Props (DialMeter / Rheostat / CircuitSwitch 的 symbolic 模式)
 * 2. 精确计算各元器件物理引脚端子坐标 (Terminal Coordinates Map)
 * 3. 分段正交布线直连端子，严禁通线穿透与背景伪遮挡
 * 4. 交叉节点标准绘制实心 T 型接点圆
 */
export function CircuitSceneTemplate({
  physics,
  canvasSize,
  vp,
  onToggleSwitch,
}: CircuitSceneTemplateProps) {
  const { font } = canvasSize

  // 1. 布局边界几何（环形主回路）
  const loop = {
    top: 120,
    bottom: 340,
    left: 100,
    right: 580,
  }

  // 2. 元器件中心与端子坐标 (Terminals)
  // 直流电源放置于顶侧偏左 (260, loop.top)
  const bat = { cx: 260, cy: loop.top }
  const batPos = {
    posTerm: { x: bat.cx - 6, y: loop.top }, // 正极端子
    negTerm: { x: bat.cx + 6, y: loop.top }, // 负极端子
  }

  // 电流表 A 放置于顶侧偏右 (440, loop.top)
  const am = { x: 440, y: loop.top, r: 28 }
  const amPos = {
    inTerm: { x: am.x - am.r, y: loop.top },
    outTerm: { x: am.x + am.r, y: loop.top },
  }

  // 开关 S 放置于底侧偏右 (440, loop.bottom)
  const sw = { x: 440, y: loop.bottom }
  const swPos = {
    inTerm: { x: sw.x + 18, y: loop.bottom },
    outTerm: { x: sw.x - 18, y: loop.bottom },
  }

  // 滑动变阻器放置于底侧偏左 (240, loop.bottom)
  const rhWidth = 140
  const rhScale = rhWidth / 140
  const rh = { x: 240, y: loop.bottom }
  const rhPos = {
    leftTerm: { x: rh.x - 73 * rhScale, y: loop.bottom },
    rightTerm: { x: rh.x + 73 * rhScale, y: loop.bottom },
  }

  const wireColor = '#334155'
  const wireWidth = 2.5

  return (
    <g className="circuit-diagram-root select-none">
      {/* 3. 分段正交导线（端子直连，拒绝一通到底） */}
      <g stroke={wireColor} strokeWidth={wireWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 电源正极 -> 左上拐角 -> 左下拐角 -> 变阻器左侧接入端 */}
        <path d={`M ${batPos.posTerm.x} ${loop.top} L ${loop.left} ${loop.top} L ${loop.left} ${loop.bottom} L ${rhPos.leftTerm.x} ${loop.bottom}`} />

        {/* 电源负极 -> 电流表左端输入 */}
        <line x1={batPos.negTerm.x} y1={loop.top} x2={amPos.inTerm.x} y2={loop.top} />

        {/* 电流表右端输出 -> 右上拐角 -> 右下拐角 -> 开关右侧输入 */}
        <path d={`M ${amPos.outTerm.x} ${loop.top} L ${loop.right} ${loop.top} L ${loop.right} ${loop.bottom} L ${swPos.inTerm.x} ${loop.bottom}`} />

        {/* 开关左侧输出 -> 变阻器右侧接入端 */}
        <line x1={swPos.outTerm.x} y1={loop.bottom} x2={rhPos.rightTerm.x} y2={loop.bottom} />
      </g>

      {/* 4. 标准元器件挂载（全部使用真实 Props 与 variant="symbolic"） */}

      {/* 直流电源符号 */}
      <g>
        <line x1={batPos.posTerm.x} y1={loop.top - 20} x2={batPos.posTerm.x} y2={loop.top + 20} stroke="#0F172A" strokeWidth={1.5} />
        <line x1={batPos.negTerm.x} y1={loop.top - 12} x2={batPos.negTerm.x} y2={loop.top + 12} stroke="#0F172A" strokeWidth={3.5} />
        <text x={bat.cx} y={loop.top - 26} fill={CANVAS_COLORS.label} fontSize={font(12)} textAnchor="middle" fontWeight="bold">
          E, r
        </text>
      </g>

      {/* 电流表 */}
      <DialMeter
        type="A"
        variant="symbolic"
        value={physics.current}
        x={am.x}
        y={am.y}
        r={am.r}
        font={font}
      />

      {/* 开关 */}
      <CircuitSwitch
        x={sw.x}
        y={sw.y}
        closed={physics.isClosed}
        onToggle={onToggleSwitch}
        label="S"
        variant="symbolic"
        font={font}
      />

      {/* 滑动变阻器 */}
      <Rheostat
        x={rh.x}
        y={rh.y}
        width={rhWidth}
        value={physics.resistance}
        min={0}
        max={physics.maxResistance}
        variant="symbolic"
        font={font}
        label="变阻器 R"
        showLabel={true}
      />
    </g>
  )
}
