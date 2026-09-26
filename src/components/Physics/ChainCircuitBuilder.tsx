import React, { useMemo } from 'react'
import { CIRCUIT_COLORS, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculateCircuitState, type CircuitType, type MeterWiring } from '@/physics'
import { CircuitSwitch } from './CircuitSwitch'
import { DCSource } from './DCSource'
import { DialMeter } from './DialMeter'
import { Rheostat } from './Rheostat'

export type { CircuitType, MeterWiring }

export interface CircuitBranchWire {
  from: { x: number; y: number }
  to: { x: number; y: number }
  active?: boolean
  dashed?: boolean
  label?: string
}

export interface ChainCircuitBuilderProps {
  /** 电路类型：分压式 (0~E连续可调) 或 限流式 */
  circuitType: CircuitType
  /** 电流表接法：外接法 (适合小电阻) 或 内接法 (适合大电阻) */
  meterWiring: MeterWiring
  /** 滑动变阻器滑片相对位置 0~1 (0 在最左侧/0V起调端，1 在最右侧) */
  sliderRatio: number
  /** 电源电动势 (V) */
  E?: number
  /** 电源内阻 (Ω) */
  r?: number
  /** 变阻器总阻值 (Ω) */
  R_slider_max?: number
  /** 待测元件标称阻值 (Ω) */
  Rx?: number
  /** 电压表内阻 (Ω) */
  RV?: number
  /** 电流表内阻 (Ω) */
  RA?: number
  /** 是否处于通路通电状态 (电键闭合) */
  closed?: boolean
  /** 切换电键状态 */
  onToggleSwitch?: () => void
  /** 自定义元件插槽渲染 */
  renderLoad?: (pos: { x: number; y: number }) => React.ReactNode
  /** 自定义变阻器插槽渲染 */
  renderRheostat?: (pos: { x: number; y: number; ratio: number }) => React.ReactNode
  /** 自定义电表插槽渲染 */
  renderMeters?: (params: {
    voltmeterPos: { x: number; y: number }
    ammeterPos: { x: number; y: number }
    U_val: number
    I_val: number
  }) => React.ReactNode
  /** 自定义电源插槽渲染 */
  renderSource?: (pos: { x: number; y: number }) => React.ReactNode
  className?: string
  font?: (size: number) => number
}

/**
 * 通用电路拓扑构建器（ChainCircuitBuilder）
 * 严格对齐高中物理实验标准器材（变阻器真实接线柱、电键S、稳压电源、电表）
 */
export const ChainCircuitBuilder: React.FC<ChainCircuitBuilderProps> = ({
  circuitType,
  meterWiring,
  sliderRatio,
  E = 6.0,
  r = 0.5,
  R_slider_max = 20,
  Rx = 5.0,
  RV = 3000,
  RA = 0.5,
  closed = true,
  onToggleSwitch,
  renderLoad,
  renderRheostat,
  renderMeters,
  renderSource,
  className = '',
  font = (n) => n,
}) => {
  const state = useMemo(
    () =>
      calculateCircuitState({
        circuitType,
        meterWiring,
        sliderRatio,
        E,
        r,
        R_slider_max,
        Rx,
        RV,
        RA,
        closed,
      }),
    [circuitType, meterWiring, sliderRatio, E, r, R_slider_max, Rx, RV, RA, closed]
  )

  // 坐标骨架定义（基于 840×325 视口）
  // 底部水平主回路 (y=260)：电源 (x=110) -> 电键 S (x=210)
  // 中层滑动变阻器 (x: 230, y: 140)，接线柱真实相对坐标：
  //   左下 A: (-73, +10) -> (157, 150)
  //   右下 B: (+73, +10) -> (303, 150)
  //   左上 C: (-73, -20) -> (157, 120)
  //   右上 D: (+73, -20) -> (303, 120)
  // 右侧测量区 (x: 420~740, y: 90~210)：待测负载 + 电流表 + 电压表
  const layout = useMemo(() => {
    const sourcePos = { x: 100, y: 260 }
    const switchPos = { x: 220, y: 260 }
    const rheostatPos = { x: 230, y: 140 }
    const ammeterPos = { x: 500, y: 95 }
    const loadPos = { x: 640, y: 95 }
    const voltmeterPos = { x: 570, y: 200 }

    // 变阻器真实物理接线柱位置
    const termA = { x: rheostatPos.x - 73, y: rheostatPos.y + 10 } // 左下 (零电位基准端)
    const termB = { x: rheostatPos.x + 73, y: rheostatPos.y + 10 } // 右下 (高电位端)
    const termC = { x: rheostatPos.x - 73, y: rheostatPos.y - 20 } // 左上 (滑杆引出端)

    // 电源正负极接线柱
    const sourcePlus = { x: sourcePos.x + 35, y: sourcePos.y }
    const sourceMinus = { x: sourcePos.x - 35, y: sourcePos.y }

    // 电键左右端子
    const switchLeft = { x: switchPos.x - 18, y: switchPos.y }
    const switchRight = { x: switchPos.x + 18, y: switchPos.y }

    const wires: CircuitBranchWire[] = []

    // 1. 电源负极 -> 变阻器左下接线柱 A (0V 零电位基准线)
    wires.push({ from: sourceMinus, to: { x: 45, y: sourcePos.y } })
    wires.push({ from: { x: 45, y: sourcePos.y }, to: { x: 45, y: termA.y } })
    wires.push({ from: { x: 45, y: termA.y }, to: termA })

    // 2. 电源正极 -> 电键 S
    wires.push({ from: sourcePlus, to: switchLeft })

    // 3. 电键 S -> 变阻器高电位端
    wires.push({ from: switchRight, to: { x: 335, y: switchPos.y } })
    wires.push({ from: { x: 335, y: switchPos.y }, to: { x: 335, y: termB.y } })
    wires.push({ from: { x: 335, y: termB.y }, to: termB })

    if (circuitType === 'voltage-divider') {
      // ── 分压式接法（高中物理规范）：
      // 变阻器两下端 A、B 跨接电源全电压；
      // 1. 电源负极 -> 负极母线 -> 变阻器左下接线柱 A (0V 零电位基准端)
      wires.push({ from: sourceMinus, to: { x: 45, y: sourcePos.y } })
      wires.push({ from: { x: 45, y: sourcePos.y }, to: { x: 45, y: termA.y } })
      wires.push({ from: { x: 45, y: termA.y }, to: termA })

      // 2. 电源正极 -> 电键 S -> 变阻器右下接线柱 B (高电位端)
      wires.push({ from: sourcePlus, to: switchLeft })
      wires.push({ from: switchRight, to: { x: 335, y: switchPos.y } })
      wires.push({ from: { x: 335, y: switchPos.y }, to: { x: 335, y: termB.y } })
      wires.push({ from: { x: 335, y: termB.y }, to: termB })

      // 3. 高电位输出线 (滑杆左上 C 接线柱 termC -> 测量支路入口 x=420, y=95)
      wires.push({ from: termC, to: { x: termC.x, y: 65 } })
      wires.push({ from: { x: termC.x, y: 65 }, to: { x: 420, y: 65 } })
      wires.push({ from: { x: 420, y: 65 }, to: { x: 420, y: 95 } })

      // 4. 低电位返回线 (测量支路出口 x=730, y=95 -> 返回负极母线)
      wires.push({ from: { x: 730, y: 95 }, to: { x: 755, y: 95 } })
      wires.push({ from: { x: 755, y: 95 }, to: { x: 755, y: 285 } })
      wires.push({ from: { x: 755, y: 285 }, to: { x: 45, y: 285 } })
      wires.push({ from: { x: 45, y: 285 }, to: { x: 45, y: sourcePos.y } })
    } else {
      // ── 限流式接法（高中物理规范“一上一下”串联）：
      // 变阻器接入右下接线柱 B 与左上接线柱 C；左下 A 端悬空不接线！
      // 滑片在最左端时，整根电阻丝接入（阻值最大），起开机限流保护作用；
      // 1. 电源正极 -> 电键 S
      wires.push({ from: sourcePlus, to: switchLeft })

      // 2. 电键 S -> 变阻器右下接线柱 B
      wires.push({ from: switchRight, to: { x: 335, y: switchPos.y } })
      wires.push({ from: { x: 335, y: switchPos.y }, to: { x: 335, y: termB.y } })
      wires.push({ from: { x: 335, y: termB.y }, to: termB })

      // 3. 变阻器滑杆左上接线柱 C -> 测量支路入口 (420, 95)
      wires.push({ from: termC, to: { x: termC.x, y: 95 } })
      wires.push({ from: { x: termC.x, y: 95 }, to: { x: 420, y: 95 } })

      // 4. 测量支路出口 (730, 95) -> 经底座返回线直接回电源负极（不连变阻器任何接线柱！）
      wires.push({ from: { x: 730, y: 95 }, to: { x: 755, y: 95 } })
      wires.push({ from: { x: 755, y: 95 }, to: { x: 755, y: 285 } })
      wires.push({ from: { x: 755, y: 285 }, to: { x: 45, y: 285 } })
      wires.push({ from: { x: 45, y: 285 }, to: { x: 45, y: sourcePos.y } })
      wires.push({ from: { x: 45, y: sourcePos.y }, to: sourceMinus })
    }

    // 测量支路 (外接法 vs 内接法)
    if (meterWiring === 'external') {
      // 外接法：测量入口 (420, 95) -> 电流表 (500) -> 节点A (565) -> 负载 (640) -> 节点B (730)
      wires.push({ from: { x: 420, y: 95 }, to: { x: ammeterPos.x - 28, y: 95 } })
      wires.push({ from: { x: ammeterPos.x + 28, y: 95 }, to: { x: 565, y: 95 } })
      wires.push({ from: { x: 565, y: 95 }, to: { x: loadPos.x - 25, y: 95 } })
      wires.push({ from: { x: loadPos.x + 25, y: 95 }, to: { x: 730, y: 95 } })

      // 电压表并联在待测负载两端 (565 -> V -> 730)
      wires.push({ from: { x: 565, y: 95 }, to: { x: 565, y: voltmeterPos.y } })
      wires.push({ from: { x: 565, y: voltmeterPos.y }, to: { x: voltmeterPos.x - 28, y: voltmeterPos.y } })
      wires.push({ from: { x: voltmeterPos.x + 28, y: voltmeterPos.y }, to: { x: 730, y: voltmeterPos.y } })
      wires.push({ from: { x: 730, y: voltmeterPos.y }, to: { x: 730, y: 95 } })
    } else {
      // 内接法：测量入口 (420, 95) -> 节点A (450) -> 电流表 (500) -> 负载 (640) -> 节点B (730)
      wires.push({ from: { x: 420, y: 95 }, to: { x: 450, y: 95 } })
      wires.push({ from: { x: 450, y: 95 }, to: { x: ammeterPos.x - 28, y: 95 } })
      wires.push({ from: { x: ammeterPos.x + 28, y: 95 }, to: { x: loadPos.x - 25, y: 95 } })
      wires.push({ from: { x: loadPos.x + 25, y: 95 }, to: { x: 730, y: 95 } })

      // 电压表并联在 (电流表+待测负载) 两端 (450 -> V -> 730)
      wires.push({ from: { x: 450, y: 95 }, to: { x: 450, y: voltmeterPos.y } })
      wires.push({ from: { x: 450, y: voltmeterPos.y }, to: { x: voltmeterPos.x - 28, y: voltmeterPos.y } })
      wires.push({ from: { x: voltmeterPos.x + 28, y: voltmeterPos.y }, to: { x: 730, y: voltmeterPos.y } })
      wires.push({ from: { x: 730, y: voltmeterPos.y }, to: { x: 730, y: 95 } })
    }

    // 动态生成关键并联节点小圆点（只在真实有分流汇流的交叉点渲染）
    const nodes: Array<{ x: number; y: number }> = []
    if (circuitType === 'voltage-divider') {
      nodes.push({ x: 45, y: sourcePos.y }) // 负极母线汇流点
    }
    if (meterWiring === 'external') {
      nodes.push({ x: 565, y: 95 }) // 外接法电压表前端分流点
    } else {
      nodes.push({ x: 450, y: 95 }) // 内接法电压表前端分流点
    }
    nodes.push({ x: 730, y: 95 }) // 测量支路出口电压表汇流点

    return {
      sourcePos,
      switchPos,
      rheostatPos,
      ammeterPos,
      loadPos,
      voltmeterPos,
      wires,
      nodes,
    }
  }, [circuitType, meterWiring])

  return (
    <g className={`chain-circuit-builder ${className}`}>
      {/* 1. 渲染连接导线 */}
      <g className="wires">
        {layout.wires.map((wire, idx) => (
          <line
            key={`wire-${idx}`}
            x1={wire.from.x}
            y1={wire.from.y}
            x2={wire.to.x}
            y2={wire.to.y}
            stroke={closed ? CIRCUIT_COLORS.wireActive : CIRCUIT_COLORS.wire}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}

        {/* 关键并联节点小圆点 */}
        {layout.nodes.map((pt, i) => (
          <circle
            key={`node-point-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill={CIRCUIT_COLORS.node}
            stroke={withAlpha(CIRCUIT_COLORS.wire, 0.6)}
            strokeWidth={1}
          />
        ))}
      </g>

      {/* 2. 稳压直流电源 (直接复用 DCSource 组件) */}
      {renderSource ? (
        renderSource(layout.sourcePos)
      ) : (
        <DCSource
          type="instrument"
          x={layout.sourcePos.x}
          y={layout.sourcePos.y}
          voltage={E}
          polarity="right-positive"
        />
      )}

      {/* 3. 实验电键开关 S (直接复用 CircuitSwitch 组件) */}
      <CircuitSwitch
        x={layout.switchPos.x}
        y={layout.switchPos.y}
        closed={closed}
        onToggle={onToggleSwitch}
        font={font}
      />

      {/* 4. 滑动变阻器 (直接复用 Rheostat 组件) */}
      {renderRheostat ? (
        renderRheostat({ ...layout.rheostatPos, ratio: sliderRatio })
      ) : (
        <Rheostat
          x={layout.rheostatPos.x}
          y={layout.rheostatPos.y}
          value={sliderRatio * R_slider_max}
          min={0}
          max={R_slider_max}
          font={font}
        />
      )}

      {/* 5. 待测负载插槽 (默认为未知电阻 Rx) */}
      {renderLoad ? (
        renderLoad(layout.loadPos)
      ) : (
        <g transform={`translate(${layout.loadPos.x}, ${layout.loadPos.y})`}>
          <rect x={-22} y={-14} width={44} height={28} rx={2} fill={colors.accent[100]} stroke={colors.accent[600]} strokeWidth={1.5} />
          <text x={0} y={4} textAnchor="middle" fontSize={font(11)} fontWeight="bold" fill={colors.accent[800]}>
            Rx
          </text>
        </g>
      )}

      {/* 6. 电流表与电压表 (直接复用 DialMeter 组件) */}
      {renderMeters ? (
        renderMeters({
          voltmeterPos: layout.voltmeterPos,
          ammeterPos: layout.ammeterPos,
          U_val: state.U_meas,
          I_val: state.I_meas,
        })
      ) : (
        <>
          <DialMeter
            type="A"
            x={layout.ammeterPos.x}
            y={layout.ammeterPos.y}
            value={state.I_meas}
            max={0.6}
            font={font}
          />
          <DialMeter
            type="V"
            x={layout.voltmeterPos.x}
            y={layout.voltmeterPos.y}
            value={state.U_meas}
            max={5.0}
            font={font}
          />
        </>
      )}
    </g>
  )
}
