import React, { useState, useRef, useCallback } from 'react'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, EM_COLORS, SCENE_COLORS, CHART_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useAnimationFrame } from '@/utils/animation'
import { Solenoid, Galvanometer } from '@/components/Physics'

// 导入重构拆分后的独立功能子组件
import { InductionCutSandbox } from './components/InductionCutSandbox'
import { InductionMagnetSandbox } from './components/InductionMagnetSandbox'
import { InductionCoilSandbox } from './components/InductionCoilSandbox'

// 设计坐标系常量 (采用 SVG 缩放方式 A，固定 700 x 400 画布尺寸)
const DESIGN_W = 700
const DESIGN_H = 400

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
  const coilX = 420
  const coilY = 160
  const galvanometerX = 420
  const galvanometerY = 270

  // 3. 物理计算层（将复杂的物理微分公式计算与 JSX 渲染解耦）
  let phi = 0
  let dPhi = 0
  let currentI = 0 // 闭合回路瞬时感应电流

  const ironCoreFactor = hasIronCore ? 1.0 : 0.05
  const effectiveR = circuitSwitch ? resistance : 99999

  if (mode === 0) {
    // 实验一：导体切割磁感线 (回路磁通量与 x 成正比，dPhi/dt 与速度成正比)
    const B0 = 1.0
    phi = B0 * Math.max(0, (rodX - 80) / 400)
    dPhi = B0 * (rodSpeed / 400)
    currentI = subCircuitSwitch === 1 ? dPhi * 2.2 : 0
  } else if (mode === 1) {
    // 实验二：磁铁插拔穿过线圈
    const Phi0 = 1.0
    const alpha = 0.00015
    const dx = magnetX - coilX
    const denom = 1 + alpha * dx * dx
    phi = (Phi0 / denom) * magnetPole

    const dPhi_dx = (-2 * alpha * dx * Phi0) / (denom * denom)
    dPhi = dPhi_dx * magnetSpeed * magnetPole
    currentI = subCircuitSwitch === 1 ? -0.15 * 10 * dPhi : 0
  } else {
    // 实验三：双线圈同轴耦合
    const M0 = 0.8
    const alphaCoil = 0.00015
    const dx = primaryCoilX - coilX
    const denom = 1 + alphaCoil * dx * dx
    
    // 互感系数
    const M = (M0 / denom) * ironCoreFactor
    const I1 = circuitSwitch ? 10 / effectiveR : 0
    phi = M * I1

    // 动生项：原线圈运动引起的磁通变化
    const dM_dx = (-2 * alphaCoil * dx * M0 * ironCoreFactor) / (denom * denom)
    const dPhi_motion = dM_dx * I1 * primaryCoilSpeed

    // 感生项：原回路电流变化引起的磁通变化 (变阻 dR_dt)
    let dI1_dt = 0
    if (circuitSwitch && Math.abs(dR_dt) > 0.01) {
      dI1_dt = - (10 / (effectiveR * effectiveR)) * dR_dt
    }
    const dPhi_transformer = M * dI1_dt

    // 开关瞬间的电磁脉冲感应冲击 (正向或负向脉冲)
    const dPhi_pulse = switchPulse.current * 0.18

    dPhi = dPhi_motion + dPhi_transformer + dPhi_pulse
    currentI = subCircuitSwitch === 1 ? -0.8 * 10 * dPhi : 0
  }

  // 4. 定时渲染与物理积分帧循环
  const handleAnimationFrame = useCallback((deltaTime: number) => {
    const dt = deltaTime / 1000
    const now = performance.now()
    localTime.current += dt

    // A. 指针缓动过渡 (轻微阻尼回弹)
    setThetaVisual((prev) => {
      const target = Math.max(-1, Math.min(1, currentI * 1.5))
      const diff = target - prev
      return prev + diff * 0.15
    })

    // B. 开关瞬时脉冲衰减
    if (Math.abs(switchPulse.current) > 1e-4) {
      switchPulse.current *= Math.exp(-dt * 8) // 在 0.3s 内快速衰退
    } else {
      switchPulse.current = 0
    }

    // C. 实验二 (磁铁运动) 自动播放运动轨迹
    if (mode === 1 && isPlaying && dragType.current === null) {
      const nextX = magnetX + magnetSpeed * dt * 60
      if (nextX >= 580 || nextX <= 80) {
        // 碰壁，平滑停止自动播放
        setParams({
          ...params,
          magnetX: Math.max(80, Math.min(580, nextX)),
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
      if (dt_R > 0.005) {
        const dR = effectiveR - prevR.current
        const raw_dR_dt = dR / dt_R
        const next_dR_dt = dR_dt * 0.6 + raw_dR_dt * 0.4
        updateParam('dR_dt', Math.abs(next_dR_dt) < 0.1 ? 0 : next_dR_dt)

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
        const nextX = Math.max(100, Math.min(300, rodX + dx))
        updateParam('rodX', nextX)
        updateParam('rodSpeed', dx / dt)
      } else if (dragType.current === 'magnet') {
        const nextX = Math.max(80, Math.min(580, magnetX + dx))
        updateParam('magnetX', nextX)
        updateParam('magnetSpeed', dx / dt)
      } else if (dragType.current === 'coil') {
        const nextX = Math.max(220, Math.min(420, primaryCoilX + dx))
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
