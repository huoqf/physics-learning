import React, { useState, useRef, useCallback } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, EM_COLORS, SCENE_COLORS, CHART_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useAnimationFrame } from '@/utils/animation'
import { Solenoid, Galvanometer } from '@/components/Physics'
import { computeInductionMode0, computeInductionMode1, computeInductionMode2 } from '@/physics/induction'

// 导入重构拆分后的独立功能子组件
import { InductionCutSandbox } from './components/InductionCutSandbox'
import { InductionMagnetSandbox } from './components/InductionMagnetSandbox'
import { InductionCoilSandbox } from './components/InductionCoilSandbox'

// ─── 设计坐标系与布局常量 ────────────────────────────────────────

/** SVG 画布设计尺寸（方式 A：固定 viewBox，preserveAspectRatio 自动居中） */
const DESIGN_W = 700
const DESIGN_H = 400

/** 场景布局常量：副线圈中心、电流计中心 */
const LAYOUT = {
  /** 副线圈中心 x (模式 1/2 共享固定位置) */
  coilX: 420,
  /** 副线圈中心 y */
  coilY: 160,
  /** 灵敏电流计中心 x */
  galvanometerX: 420,
  /** 灵敏电流计中心 y */
  galvanometerY: 270,
} as const

/** 各模式下拖拽坐标的有效范围 [min, max] */
const DRAG_BOUNDS = {
  rod: [100, 300] as const,
  magnet: [80, 580] as const,
  coil: [220, 420] as const,
} as const

/** 动画帧回调中的物理 / 动效常量 */
const ANIM = {
  /** 指针阻尼缓动系数 (每帧趋近比例) */
  thetaDamping: 0.15,
  /** 开关脉冲指数衰减速率 */
  pulseDecayRate: 8,
  /** 模式 1 自动播放帧速度倍率 */
  autoPlaySpeedFactor: 60,
  /** dR/dt 低通滤波器：旧值权重 */
  dRdtLowPassOld: 0.6,
  /** dR/dt 低通滤波器：新值权重 */
  dRdtLowPassNew: 0.4,
  /** dR/dt 零阈值：低于此值归零 */
  dRdtZeroThreshold: 0.1,
  /** dR/dt 最小采样间隔 (s) */
  dRdtMinSampleInterval: 0.005,
} as const

export interface InductionParams {
  /** 实验模式：0=导体切割, 1=磁铁穿过, 2=双线圈互感 */
  mode: number
  /** 是否显示磁感线 (0/1) */
  showLines: number
  /** 副回路开关 (0=断开, 1=闭合) */
  subCircuitSwitch: number
  // 模式 0 参数
  rodX: number
  rodSpeed: number
  // 模式 1 参数
  magnetX: number
  magnetSpeed: number
  magnetPole: number
  // 模式 2 参数
  primaryCoilX: number
  primaryCoilSpeed: number
  resistance: number
  dR_dt: number
  circuitSwitch: number
  hasIronCore: number
}

export default function InductionPhenomenon() {
  const { params, isPlaying, setIsPlaying, updateParam, setParams } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      setIsPlaying: s.setIsPlaying,
      updateParam: s.updateParam,
      setParams: s.setParams,
    }))
  )

  // 使用 wide 预设尺寸 (700 x 400)
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const vp = useViewport(canvasSize, { designWidth: DESIGN_W, designHeight: DESIGN_H })
  void vp // 显式声明以符合无 overlay 模式 A 视口规范
  const { font } = canvasSize

  const svgRef = useRef<SVGSVGElement | null>(null)

  // 1. 物理参数解析与后备默认值
  const mode = params.mode ?? 0                  // 0=切割, 1=穿过, 2=双线圈
  const showLines = params.showLines ?? 1
  const subCircuitSwitch = params.subCircuitSwitch ?? 1 // 0=断开, 1=闭合

  // 模式 0 参数
  const rodX = params.rodX ?? 200
  const rodSpeed = params.rodSpeed ?? 0

  // 模式 1 参数
  const magnetX = params.magnetX ?? 160
  const magnetSpeed = params.magnetSpeed ?? 0
  const magnetPole = params.magnetPole ?? 1

  // 模式 2 参数
  const primaryCoilX = params.primaryCoilX ?? 220
  const primaryCoilSpeed = params.primaryCoilSpeed ?? 0
  const resistance = params.resistance ?? 50
  const dR_dt = params.dR_dt ?? 0
  const circuitSwitch = params.circuitSwitch ?? 1
  const hasIronCore = params.hasIronCore ?? 1

  // 2. 指针与过渡的局部动效状态
  const [thetaVisual, setThetaVisual] = useState(0) // 指针缓动值
  const [, setForceUpdate] = useState(0)

  // 拖动状态 Refs
  const dragType = useRef<'rod' | 'magnet' | 'coil' | null>(null)
  const lastTime = useRef(0)
  const lastX = useRef(0)
  const localTime = useRef(0) // 动画时间积累

  // 瞬时微分与开关脉冲 Refs
  const switchPulse = useRef(0) // 记录开关通断瞬间的电动势冲击脉冲 (1.0 到 0)
  const prevR = useRef(resistance)
  const prevTime = useRef(performance.now())

  // 定位常量
  const { coilX, coilY, galvanometerX, galvanometerY } = LAYOUT

  // 3. 物理计算层（调用 src/physics/induction.ts 共享纯函数）
  const inductionResult =
    mode === 0 ? computeInductionMode0(rodX, rodSpeed, subCircuitSwitch) :
    mode === 1 ? computeInductionMode1(magnetX, magnetSpeed, magnetPole, coilX, subCircuitSwitch) :
    computeInductionMode2(
      primaryCoilX, resistance, circuitSwitch, hasIronCore,
      primaryCoilSpeed, dR_dt, switchPulse.current,
      coilX, subCircuitSwitch
    )

  const { phi, dPhi, currentI } = inductionResult

  // 模式二低通微分计算需要的辅助值
  const effectiveR = circuitSwitch ? resistance : 99999

  // 4. 定时渲染与物理积分帧循环
  const handleAnimationFrame = useCallback((deltaTime: number) => {
    const dt = deltaTime / 1000
    const now = performance.now()
    localTime.current += dt

    // A. 指针缓动过渡 (轻微阻尼回弹)
    setThetaVisual((prev) => {
      const target = Math.max(-1, Math.min(1, currentI * 1.5))
      const diff = target - prev
      return prev + diff * ANIM.thetaDamping
    })

    // B. 开关瞬时脉冲衰减
    if (Math.abs(switchPulse.current) > 1e-4) {
      switchPulse.current *= Math.exp(-dt * ANIM.pulseDecayRate)
    } else {
      switchPulse.current = 0
    }

    // C. 实验二 (磁铁运动) 自动播放运动轨迹
    if (mode === 1 && isPlaying && dragType.current === null) {
      const [magnetMin, magnetMax] = DRAG_BOUNDS.magnet
      const nextX = magnetX + magnetSpeed * dt * ANIM.autoPlaySpeedFactor
      if (nextX >= magnetMax || nextX <= magnetMin) {
        // 碰壁，平滑停止自动播放
        setParams({
          ...params,
          magnetX: Math.max(magnetMin, Math.min(magnetMax, nextX)),
          magnetSpeed: 0,
        })
        setIsPlaying(false)
      } else {
        updateParam('magnetX', nextX)
      }
    }

    // D. 实验三 (双线圈变阻) 阻值变化率低通微分计算
    if (mode === 2) {
      const dt_R = (now - prevTime.current) / 1000
      if (dt_R > ANIM.dRdtMinSampleInterval) {
        const dR = effectiveR - prevR.current
        const raw_dR_dt = dR / dt_R
        const next_dR_dt = dR_dt * ANIM.dRdtLowPassOld + raw_dR_dt * ANIM.dRdtLowPassNew
        updateParam('dR_dt', Math.abs(next_dR_dt) < ANIM.dRdtZeroThreshold ? 0 : next_dR_dt)

        prevR.current = effectiveR
        prevTime.current = now
      }
    }

    setForceUpdate((x) => x + 1)
  }, [mode, isPlaying, magnetX, magnetSpeed, effectiveR, dR_dt, currentI, params, setParams, setIsPlaying, updateParam])

  useAnimationFrame(handleAnimationFrame, { playing: true })

  // 5. 拖拽坐标映射：使用 CTM 逆矩阵，严禁手动偏置换算
  const clientToDesign = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    return pt.matrixTransform(ctm.inverse())
  }

  const handlePointerDown = (e: React.PointerEvent<SVGGElement>, type: 'rod' | 'magnet' | 'coil') => {
    if (isPlaying) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = clientToDesign(e.clientX, e.clientY)
    if (!pt) return

    dragType.current = type
    lastX.current = pt.x
    lastTime.current = performance.now()
  }

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!dragType.current) return
    const pt = clientToDesign(e.clientX, e.clientY)
    if (!pt) return

    const now = performance.now()
    const dt = (now - lastTime.current) / 1000
    const dx = pt.x - lastX.current

    if (dt > 0.005) {
      if (dragType.current === 'rod') {
        const [rodMin, rodMax] = DRAG_BOUNDS.rod
        const nextX = Math.max(rodMin, Math.min(rodMax, rodX + dx))
        updateParam('rodX', nextX)
        updateParam('rodSpeed', dx / dt)
      } else if (dragType.current === 'magnet') {
        const [magnetMin, magnetMax] = DRAG_BOUNDS.magnet
        const nextX = Math.max(magnetMin, Math.min(magnetMax, magnetX + dx))
        updateParam('magnetX', nextX)
        updateParam('magnetSpeed', dx / dt)
      } else if (dragType.current === 'coil') {
        const [coilMin, coilMax] = DRAG_BOUNDS.coil
        const nextX = Math.max(coilMin, Math.min(coilMax, primaryCoilX + dx))
        updateParam('primaryCoilX', nextX)
        updateParam('primaryCoilSpeed', dx / dt)
      }
      lastX.current = pt.x
      lastTime.current = now
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (dragType.current === 'rod') {
      updateParam('rodSpeed', 0)
    } else if (dragType.current === 'magnet') {
      updateParam('magnetSpeed', 0)
    } else if (dragType.current === 'coil') {
      updateParam('primaryCoilSpeed', 0)
    }
    dragType.current = null
  }

  // 双线圈开关瞬时脉冲触发
  const handleToggleCoilSwitch = () => {
    const nextState = circuitSwitch ? 0 : 1
    // 脉冲朝向：闭合产生正脉冲，断开产生负脉冲
    switchPulse.current = nextState ? 1.0 : -1.0
    updateParam('circuitSwitch', nextState)
  }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-1 select-none">
      <svg
        ref={svgRef}
        width={canvasSize.width}
        height={canvasSize.height}
        viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="bg-white rounded-xl shadow-md overflow-hidden"
      >
        {/* ================= 右侧接收端回路 (电流计、副螺螺线管、副开关) ================= */}
        
        {/* 副回路公共连线 (螺线管左端插座 340 到电流表，右端插座 500 到电流表) */}
        {/* 上导线连线 (含有副回路开关) */}
        <path
          d={`M 340 280 L 340 330 L 390 330 L 390 370`}
          fill="none"
          stroke={SCENE_COLORS.circuit.wire}
          strokeWidth="3.5"
        />
        {/* 下导线连线 */}
        <path
          d={`M 500 280 L 500 370 L 450 370`}
          fill="none"
          stroke={SCENE_COLORS.circuit.wire}
          strokeWidth="3.5"
        />

        {/* 灵敏电流计 (公共接收仪表) */}
        <Galvanometer
          x={galvanometerX}
          y={galvanometerY}
          value={thetaVisual}
        />
        <text
          x={galvanometerX}
          y={galvanometerY + 120}
          fill={SCENE_COLORS.labels.panelTextMuted}
          fontSize={font(10)}
          fontWeight="bold"
          textAnchor="middle"
        >
          G 灵敏电流计 (检测感应电流)
        </text>

        {/* 副回路开关 (电流计开关，可直接点击断开以对比闭合条件) */}
        <g
          transform="translate(365, 330)"
          className="cursor-pointer"
          onClick={() => updateParam('subCircuitSwitch', subCircuitSwitch ? 0 : 1)}
        >
          {/* 底座 */}
          <rect x={-8} y={-4} width={16} height={8} rx={1} fill={CANVAS_COLORS.objectFillNeutral} stroke={CANVAS_COLORS.textMuted} strokeWidth={0.8} />
          {/* 两侧接脚 */}
          <circle cx={-6} cy={0} r={2} fill={subCircuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.trackHistory} />
          <circle cx={6} cy={0} r={2} fill={subCircuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.trackHistory} />
          {/* 闸刀 */}
          <line
            x1={-6} y1={0}
            x2={subCircuitSwitch ? 6 : 3}
            y2={subCircuitSwitch ? 0 : -8}
            stroke={subCircuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.objectStroke}
            strokeWidth={2}
          />
          <text x="0" y="14" fill={CANVAS_COLORS.textMuted} fontSize={font(7)} fontWeight="bold" textAnchor="middle">
            {subCircuitSwitch ? '闭合' : '断开'}
          </text>
        </g>

        {/* 模式 1 和模式 2 共享固定在 420 px 处的副螺线管线圈 */}
        {mode !== 0 && (
          <g>
            <Solenoid
              x={coilX}
              y={coilY}
              width={160}
              height={76}
              turns={6}
              current={currentI}
              time={localTime.current}
            />
            <text x={coilX} y={coilY + 54} fontSize={font(9)} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
              副线圈 N = 6 匝
            </text>
          </g>
        )}

        {/* 右侧公共科学仪表盘 (增加变化状态指示灯) */}
        <g transform="translate(560, 24)">
          <rect x="0" y="0" width="112" height="54" rx="6" fill={SCENE_COLORS.labels.glassPanelBg} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
          <text x="10" y="15" fill={CHART_COLORS.labelText} fontSize={font(9)} fontWeight="bold">磁通量 Φ</text>
          <text x="10" y="31" fill={EM_COLORS.magneticField} fontSize={font(12)} fontWeight="bold" style={{ fontFamily: 'monospace' }}>
            {phi.toFixed(3)} Wb
          </text>
          {/* 状态诊断指示灯 */}
          <g transform="translate(10, 43)">
            <circle cx="4" cy="-3" r="3.5" fill={Math.abs(dPhi) > 0.002 ? colors.success[600] : PHYSICS_COLORS.electricField} />
            <text x="12" y="1" fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} fontWeight="bold">
              {Math.abs(dPhi) > 0.002 ? (dPhi > 0 ? '变化中 ↗' : '变化中 ↘') : '恒定不变 ⏸'}
            </text>
          </g>
        </g>

        {/* ================= 模式特异性沙盒渲染 ================= */}
        
        {mode === 0 && (
          <InductionCutSandbox
            rodX={rodX}
            currentI={currentI}
            time={localTime.current}
            font={font}
            onPointerDown={(e) => handlePointerDown(e, 'rod')}
          />
        )}

        {mode === 1 && (
          <InductionMagnetSandbox
            magnetX={magnetX}
            magnetSpeed={magnetSpeed}
            magnetPole={magnetPole}
            showLines={showLines}
            coilX={coilX}
            coilY={coilY}
            font={font}
            onPointerDown={(e) => handlePointerDown(e, 'magnet')}
          />
        )}

        {mode === 2 && (
          <InductionCoilSandbox
            primaryCoilX={primaryCoilX}
            resistance={resistance}
            circuitSwitch={circuitSwitch}
            hasIronCore={hasIronCore}
            showLines={showLines}
            time={localTime.current}
            coilX={coilX}
            coilY={coilY}
            font={font}
            onDragCoil={(e) => handlePointerDown(e, 'coil')}
            onToggleSwitch={handleToggleCoilSwitch}
          />
        )}

        {/* 全局统一挂载的指针移动辅助处理层 */}
        {dragType.current !== null && (
          <rect
            x="0"
            y="0"
            width={DESIGN_W}
            height={DESIGN_H}
            fill="none"
            pointerEvents="all"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        )}

      </svg>
    </div>
  )
}
