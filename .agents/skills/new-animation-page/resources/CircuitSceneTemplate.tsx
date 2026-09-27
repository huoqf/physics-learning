import React from 'react'
import { DialMeter, Rheostat, CircuitSwitch, DCSource, getDCSourceTerminals } from '@/components/Physics'
import { CIRCUIT_COLORS } from '@/theme/physics'
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
 * 1. 严格使用组件库真实 Props (DialMeter / Rheostat / CircuitSwitch / DCSource 的 symbolic 模式)
 * 2. 导出函数 getDCSourceTerminals 精确计算各元器件物理引脚端子坐标 (Terminal Coordinates Map)
 * 3. 分段正交布线直连端子，严禁通线穿透与背景伪遮挡
 * 4. 严格遵循高中物理教科书标准画法：红进黑出、横平竖直、零文字元件撞车
 */
export function CircuitSceneTemplate({
  physics,
  canvasSize,
  vp: _vp,
  onToggleSwitch,
}: CircuitSceneTemplateProps) {
  const { font } = canvasSize

  // 1. 布局边界几何（环形主回路）
  const loop = {
    top: 110,
    bottom: 310,
    left: 100,
    right: 580,
  }

  // 2. 元器件中心与端子坐标 (Terminals)
  // 左侧立边垂直放置直流电源 (x: loop.left, y: 210)
  const dc = { x: loop.left, y: 210 }
  const dcPos = getDCSourceTerminals(dc.x, dc.y, 'right-positive')

  // 电流表 A 放置于顶侧偏左 (260, loop.top)
  const am = { x: 260, y: loop.top, r: 28 }
  const amPos = {
    inTerm: { x: am.x - am.r, y: loop.top },  // 正接线柱流入端 (红标 +)
    outTerm: { x: am.x + am.r, y: loop.top }, // 负接线柱流出端 (黑标 -)
  }

  // 滑动变阻器放置于底侧偏右 (380, loop.bottom)
  const rhWidth = 120
  const rhScale = rhWidth / 140
  const rh = { x: 380, y: loop.bottom }
  const rhPos = {
    leftTerm: { x: rh.x - 73 * rhScale, y: loop.bottom },
    rightTerm: { x: rh.x + 73 * rhScale, y: loop.bottom },
  }

  // 开关 S 放置于底侧偏左 (200, loop.bottom)
  const sw = { x: 200, y: loop.bottom }
  const swPos = {
    inTerm: { x: sw.x - 18, y: loop.bottom },
    outTerm: { x: sw.x + 18, y: loop.bottom },
  }

  const wireWidth = 2.2

  return (
    <g className="circuit-diagram-root select-none">
      {/* 3. 分段正交导线（端子直连，横平竖直，顺时针闭合回路） */}
      <g stroke={CIRCUIT_COLORS.wire} strokeWidth={wireWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 电源正极 -> 左上拐角 -> 电流表左端正接线柱流入 (红标 +) */}
        <path d={`M ${dcPos.posTerm.x} ${dcPos.posTerm.y} L ${loop.left} ${loop.top} L ${amPos.inTerm.x} ${loop.top}`} />

        {/* 电流表右端负接线柱流出 (黑标 -) -> 右上拐角 -> 右下拐角 -> 变阻器右侧接入端 */}
        <path d={`M ${amPos.outTerm.x} ${loop.top} L ${loop.right} ${loop.top} L ${loop.right} ${loop.bottom} L ${rhPos.rightTerm.x} ${loop.bottom}`} />

        {/* 变阻器左侧输出端 -> 开关 S 右端 */}
        <line x1={rhPos.leftTerm.x} y1={loop.bottom} x2={swPos.outTerm.x} y2={loop.bottom} />

        {/* 开关 S 左端 -> 左下拐角 -> 电源负极 */}
        <path d={`M ${swPos.inTerm.x} ${loop.bottom} L ${loop.left} ${loop.bottom} L ${dcPos.negTerm.x} ${dcPos.negTerm.y}`} />
      </g>

      {/* 4. 标准元器件挂载（全部复用标准组件，声明 variant="symbolic"） */}

      {/* 直流电源：复用 DCSource 组件 */}
      <DCSource
        x={dc.x}
        y={dc.y}
        voltage={6.0}
        type="symbol"
        polarity="right-positive"
        label="E=6V"
      />

      {/* 电流表：复用 DialMeter 组件 */}
      <DialMeter
        type="A"
        variant="symbolic"
        value={physics.current}
        x={am.x}
        y={am.y}
        r={am.r}
        font={font}
      />

      {/* 开关：复用 CircuitSwitch 组件 */}
      <CircuitSwitch
        x={sw.x}
        y={sw.y}
        closed={physics.isClosed}
        onToggle={onToggleSwitch}
        label="S"
        variant="symbolic"
        font={font}
      />

      {/* 滑动变阻器：复用 Rheostat 组件 */}
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
