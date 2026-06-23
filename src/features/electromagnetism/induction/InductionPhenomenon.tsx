import React, { useState, useRef, useCallback } from 'react'
import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, EM_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { calculateMagnetInduction, calculateCoilInduction } from '@/physics'
import { useAnimationFrame } from '@/utils/animation'
import {
  BarMagnet,
  Solenoid,
  Galvanometer,
  PrimaryCoil,
  DCSource,
  Rheostat,
  ParametricMagneticField,
  CoupledCoilField,
} from '@/components/Physics'
import { VectorArrow } from '@/components/Physics'

export default function InductionPhenomenon() {
    const {params, isPlaying, setIsPlaying, updateParam, setParams} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    updateParam: s.updateParam,
    setParams: s.setParams,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { font } = canvasSize

  // 自变量提取
  const mode = params.mode ?? 0 // 0=基础, 1=进阶
  const showLines = params.showLines ?? 1
  const magnetX = params.magnetX ?? 160
  const magnetSpeed = params.magnetSpeed ?? 0
  const magnetPole = params.magnetPole ?? 1
  const resistance = params.resistance ?? 50
  const dR_dt = params.dR_dt ?? 0
  const circuitSwitch = params.circuitSwitch ?? 1 // 0=断开, 1=闭合
  const hasIronCore = params.hasIronCore ?? 1 // 0=无铁芯, 1=有铁芯

  // 局部动画与交互状态
  const [isDragging, setIsDragging] = useState(false)
  const [thetaVisual, setThetaVisual] = useState(0) // 视觉平滑后的电流计偏转角度比例 (-1 到 1)
  const [, setForceUpdate] = useState(0) // 强制渲染器

  const lastPointerX = useRef(0)
  const lastTime = useRef(0)
  const dragVelocity = useRef(0)
  const localTime = useRef(0) // 粒子流动的累加时间

  // 变阻器变化率计算 Refs
  const prevR = useRef(resistance)
  const prevTime = useRef(performance.now())

  // 1. 根据当前参数，计算理想物理量的瞬时状态
  const N_turns = 10
  const coilX = 420 // 副线圈在右侧 (420)
  const coilY = 160
  const galvanometerX = 420
  const galvanometerY = 270

  let currentTheta = 0
  let phi = 0
  let currentI = 0 // 流光粒子流动速度/方向对应的大小

  const ironCoreFactor = hasIronCore ? 1.0 : 0.05
  const effectiveR = circuitSwitch ? resistance : 99999 // 断路等效极大阻值

  if (mode === 0) {
    const res = calculateMagnetInduction(magnetX, magnetSpeed, coilX, N_turns, magnetPole)
    currentTheta = res.theta
    phi = res.phi
    currentI = res.theta // 基础模式下，感应电流大小和偏转成正比
  } else {
    const res = calculateCoilInduction(effectiveR, dR_dt, 10, N_turns, ironCoreFactor)
    currentTheta = res.theta
    phi = res.phi
    currentI = res.theta
  }

  // 2. 动画帧循环：驱动粒子流动、物理位置累加、微分计算、指针平滑
  const handleAnimationFrame = useCallback((deltaTime: number) => {
    const dt = deltaTime / 1000
    const now = performance.now()
    localTime.current += dt

    // A. 指针偏转的缓动过度 (ease-out 回弹)
    setThetaVisual((prev) => {
      const diff = currentTheta - prev
      return prev + diff * 0.15 // 平滑逼近
    })

    // B. 基础模式下的自动运动 (播放状态下)
    if (mode === 0 && isPlaying && !isDragging) {
      const nextX = magnetX + magnetSpeed * dt * 60 // 速度映射位移
      if (nextX >= 390 || nextX <= 100) {
        // 碰壁：速度平滑归零，停止播放
        setParams({
          ...params,
          magnetX: Math.max(100, Math.min(390, nextX)),
          magnetSpeed: 0,
        })
        setIsPlaying(false)
      } else {
        updateParam('magnetX', nextX)
      }
    }

    // C. 进阶模式下的滑动变阻器阻值变化率 dR/dt 瞬时计算
    if (mode === 1) {
      const dt_R = (now - prevTime.current) / 1000
      if (dt_R > 0.005) {
        const dR = effectiveR - prevR.current
        const raw_dR_dt = dR / dt_R

        // 使用低通滤波平滑 dR_dt 变化率，避免滑块数据瞬时抖动
        const next_dR_dt = dR_dt * 0.6 + raw_dR_dt * 0.4
        updateParam('dR_dt', Math.abs(next_dR_dt) < 0.1 ? 0 : next_dR_dt)

        prevR.current = effectiveR
        prevTime.current = now
      }
    }

    setForceUpdate((x) => x + 1)
  }, [mode, isPlaying, isDragging, magnetX, magnetSpeed, effectiveR, dR_dt, currentTheta, params, setParams, setIsPlaying, updateParam])

  useAnimationFrame(handleAnimationFrame, { playing: true }) // 始终激活 rAF 以便手指拖动、回弹和微分计算时刻生效

  // 3. 基础模式下的拖拽事件
  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (isPlaying) return
    e.currentTarget.setPointerCapture(e.pointerId)
    lastPointerX.current = e.clientX
    lastTime.current = performance.now()
    dragVelocity.current = 0
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return
    const now = performance.now()
    const dt = (now - lastTime.current) / 1000
    const dx = e.clientX - lastPointerX.current

    if (dt > 0.005) {
      const nextX = Math.max(100, Math.min(390, magnetX + dx))
      const speed = dx / dt // 像素/秒

      updateParam('magnetX', nextX)
      updateParam('magnetSpeed', speed * 0.3) // 缩放到合适物理速度量级

      lastPointerX.current = e.clientX
      lastTime.current = now
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsDragging(false)
    updateParam('magnetSpeed', 0) // 拖起手后，速度立刻归0
  }

  // 4. 二次贝塞尔曲线参数方程，用于渲染导线流光点坐标
  const getBezierPoint = (t: number, p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const mt = 1 - t
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    }
  }

  // 二次贝塞尔控制点
  // 螺线管左端 x=340, y=280 连到 电流计左端 x=390, y=370
  // 螺线管右端 x=500, y=280 连到 电流计右端 x=450, y=370
  const wireLeftP0 = { x: 340, y: 280 }
  const wireLeftP1 = { x: 300, y: 340 }
  const wireLeftP2 = { x: 390, y: 370 }

  const wireRightP0 = { x: 500, y: 280 }
  const wireRightP1 = { x: 540, y: 340 }
  const wireRightP2 = { x: 450, y: 370 }

  // 5. 进阶模式下的原线圈回路导线贝塞尔曲线配置
  // 原线圈左端 x=170, y=280 连到 电源正极 x=58, y=352
  // 电源负极 x=102, y=352 连到 变阻器左端 x=150, y=340
  // 变阻器右端 x=290, y=340 连到 原线圈右端 x=270, y=280
  const primaryWireLeftP0 = { x: 170, y: 280 }
  const primaryWireLeftP1 = { x: 100, y: 310 }
  const primaryWireLeftP2 = { x: 58, y: 352 }

  const primaryWireRightP0 = { x: 290, y: 340 }
  const primaryWireRightP1 = { x: 310, y: 310 }
  const primaryWireRightP2 = { x: 270, y: 280 }

  const batteryToRheostatP0 = { x: 102, y: 352 }
  const batteryToRheostatP1 = { x: 125, y: 348 }
  const batteryToRheostatP2 = { x: 150, y: 340 }

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center p-2">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        viewBox="0 0 700 400"
        className="bg-slate-50/50 rounded-xl shadow-inner border border-neutral-100"
        style={{ contentVisibility: 'auto' }}
      >
        <defs>
        </defs>

        {/* ================= 物理元件与回路绘制 ================= */}

        {/* 1. 副回路：右侧感应线圈 + 灵敏电流计 */}
        {/* 感应线圈连线导线 (贝塞尔曲线) */}
        <path
          d={`M ${wireLeftP0.x} ${wireLeftP0.y} C ${wireLeftP1.x} ${wireLeftP1.y}, ${wireLeftP2.x} ${wireLeftP2.y}, ${wireLeftP2.x} ${wireLeftP2.y}`}
          fill="none"
          stroke={SCENE_COLORS.circuit.wire}
          strokeWidth="3.5"
        />
        <path
          d={`M ${wireRightP0.x} ${wireRightP0.y} C ${wireRightP1.x} ${wireRightP1.y}, ${wireRightP2.x} ${wireRightP2.y}, ${wireRightP2.x} ${wireRightP2.y}`}
          fill="none"
          stroke={SCENE_COLORS.circuit.wire}
          strokeWidth="3.5"
        />

        {/* 连线导线感应流光点 (青色，当有感应电流时沿着回路流动) */}
        {Math.abs(currentI) > 0.05 && (
          <g>
            {[0, 0.33, 0.66].map((offset, i) => {
              const flowSpeed = currentI * 3
              // 左右导线的流动方向应相反以形成闭合回路圈
              const tLeft = (((localTime.current * flowSpeed + offset) % 1 + 1) % 1)
              const tRight = (((localTime.current * -flowSpeed + offset) % 1 + 1) % 1)

              const pLeft = getBezierPoint(tLeft, wireLeftP0, wireLeftP1, wireLeftP2)
              const pRight = getBezierPoint(tRight, wireRightP0, wireRightP1, wireRightP2)

              return (
                <g key={`glow-wire-${i}`}>
                  <circle cx={pLeft.x} cy={pLeft.y} r="4" fill={PHYSICS_COLORS.kineticEnergy} filter="drop-shadow(0 0 2px #06B6D4)" />
                  <circle cx={pRight.x} cy={pRight.y} r="4" fill={PHYSICS_COLORS.kineticEnergy} filter="drop-shadow(0 0 2px #06B6D4)" />
                </g>
              )
            })}
          </g>
        )}

        {/* 副线圈 Solenoid */}
        <Solenoid
          x={coilX}
          y={coilY}
          width={160}
          height={76}
          turns={6}
          current={currentI}
          time={localTime.current}
        />

        {/* 灵敏电流计 Galvanometer */}
        <Galvanometer
          x={galvanometerX}
          y={galvanometerY}
          value={thetaVisual} // 采用平滑缓动后的角度比例
        />

        {/* 科学仪表看板：磁通量大小 */}
        <g transform="translate(560, 30)" opacity="0.85">
          <rect x="0" y="0" width="110" height="42" rx="6" fill={SCENE_COLORS.labels.panelBg} stroke={colors.neutral[700]} strokeWidth="1" />
          <text x="10" y="16" fill={colors.neutral[400]} fontSize={font(9)} fontWeight="bold">磁通量 Φ</text>
          <text x="10" y="32" fill={EM_COLORS.magneticField} fontSize={font(12)} fontWeight="bold" style={{ fontFamily: 'monospace' }}>
            {phi.toFixed(3)} Wb
          </text>
        </g>

        {/* ================= 模式特异元件绘制 ================= */}

        {mode === 0 ? (
          // ── 模式0：基础条形磁铁 ──
          <g>
            {/* 磁铁速度蓝色矢量箭头 */}
            {Math.abs(magnetSpeed) > 0.1 && (
              <>
                <VectorArrow
                  origin={{ x: magnetX, y: -(coilY - 30) }}
                  vector={{ x: magnetSpeed * 15, y: 0 }}
                  type="velocity"
                  sceneScale={{ originX: 0, originY: 0, scaleX: 1, scaleY: 1, scale: 1, maxVectorLength: 999 }}
                  color={PHYSICS_COLORS.velocity}
                  pixelLength={Math.abs(magnetSpeed * 15)}
                />
                <text
                  x={magnetX + magnetSpeed * 15 + 10}
                  y={coilY - 40}
                  fontSize="14"
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                  style={{ userSelect: 'none' }}
                >
                  {`v = ${magnetSpeed.toFixed(1)} px/s`}
                </text>
              </>
            )}

            {/* 条形磁铁 BarMagnet (支持鼠标拖拽) */}
            <BarMagnet
              x={magnetX}
              y={coilY}
              width={120}
              height={36}
              pole={magnetPole as 1 | -1}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="cursor-grab active:cursor-grabbing select-none"
            />
          </g>
        ) : (
          // ── 模式1：原回路（原线圈、电源、滑动变阻器） ──
          <g>
            {/* 原线圈 PrimaryCoil */}
            <PrimaryCoil
              x={220}
              y={coilY}
              width={110}
              height={62}
              turns={5}
              current={10 / effectiveR} // 电流大小
              time={localTime.current}
              showIronCore={!!hasIronCore}
            />

            {/* 原回路导线连接 (电源、变阻器与原线圈) */}
            <path
              d={`M ${primaryWireLeftP0.x} ${primaryWireLeftP0.y} C ${primaryWireLeftP1.x} ${primaryWireLeftP1.y}, ${primaryWireLeftP2.x} ${primaryWireLeftP2.y}, ${primaryWireLeftP2.x} ${primaryWireLeftP2.y}`}
              fill="none"
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth="3"
            />
            <path
              d={`M ${batteryToRheostatP0.x} ${batteryToRheostatP0.y} C ${batteryToRheostatP1.x} ${batteryToRheostatP1.y}, ${batteryToRheostatP2.x} ${batteryToRheostatP2.y}, ${batteryToRheostatP2.x} ${batteryToRheostatP2.y}`}
              fill="none"
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth="3"
            />
            <path
              d={`M ${primaryWireRightP0.x} ${primaryWireRightP0.y} C ${primaryWireRightP1.x} ${primaryWireRightP1.y}, ${primaryWireRightP2.x} ${primaryWireRightP2.y}, ${primaryWireRightP2.x} ${primaryWireRightP2.y}`}
              fill="none"
              stroke={SCENE_COLORS.circuit.wire}
              strokeWidth="3"
            />

            {/* 原回路导线流光点 (红色，代表回路中有稳恒电流，流速正比于 10/R) */}
            {effectiveR < 99999 && 10 / effectiveR > 0.05 && (
              <g>
                {[0, 0.5].map((offset, i) => {
                  const flowSpeed = (10 / effectiveR) * 3
                  const tLeft = (((localTime.current * flowSpeed + offset) % 1 + 1) % 1)
                  const tBatToR = (((localTime.current * flowSpeed + offset) % 1 + 1) % 1)
                  const tRight = (((localTime.current * -flowSpeed + offset) % 1 + 1) % 1)

                  const pLeft = getBezierPoint(tLeft, primaryWireLeftP0, primaryWireLeftP1, primaryWireLeftP2)
                  const pBatToR = getBezierPoint(tBatToR, batteryToRheostatP0, batteryToRheostatP1, batteryToRheostatP2)
                  const pRight = getBezierPoint(tRight, primaryWireRightP0, primaryWireRightP1, primaryWireRightP2)

                  return (
                    <g key={`pri-wire-glow-${i}`}>
                      <circle cx={pLeft.x} cy={pLeft.y} r="3.5" fill={PHYSICS_COLORS.electricCurrent} filter="drop-shadow(0 0 2px #EF4444)" />
                      <circle cx={pBatToR.x} cy={pBatToR.y} r="3.5" fill={PHYSICS_COLORS.electricCurrent} filter="drop-shadow(0 0 2px #EF4444)" />
                      <circle cx={pRight.x} cy={pRight.y} r="3.5" fill={PHYSICS_COLORS.electricCurrent} filter="drop-shadow(0 0 2px #EF4444)" />
                    </g>
                  )
                })}
              </g>
            )}

            {/* 直流稳压电源 (instrument) */}
            <DCSource type="instrument" x={80} y={330} width={80} height={80} voltage={10} label="E = 10V" polarity="left-positive" />

            {/* 电路开关 (刀闸开关样式，可点击切换) */}
            <g
              transform="translate(125, 345)"
              className="cursor-pointer"
              onClick={() => updateParam('circuitSwitch', circuitSwitch ? 0 : 1)}
              style={{ userSelect: 'none' }}
            >
              {/* 底座 */}
              <rect x={-12} y={-5} width={24} height={10} rx={2} fill={colors.neutral[50]} stroke={colors.neutral[500]} strokeWidth={1} />
              {/* 左触点 */}
              <circle cx={-10} cy={0} r={3} fill={circuitSwitch ? PHYSICS_COLORS.electricCurrent : colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth={1} />
              {/* 右触点 */}
              <circle cx={10} cy={0} r={3} fill={circuitSwitch ? PHYSICS_COLORS.electricCurrent : colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth={1} />
              {/* 刀闸横杆 */}
              <line
                x1={-10} y1={0}
                x2={circuitSwitch ? 10 : 6}
                y2={circuitSwitch ? 0 : -12}
                stroke={circuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.objectStroke}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              {/* 手柄 */}
              <circle
                cx={circuitSwitch ? 10 : 6}
                cy={circuitSwitch ? 0 : -12}
                r={3}
                fill={circuitSwitch ? PHYSICS_COLORS.electricCurrent : CANVAS_COLORS.objectStroke}
                stroke={colors.neutral[800]}
                strokeWidth={0.8}
              />
              {/* 开关标签 */}
              <text
                x={0}
                y={18}
                fill={colors.neutral[500]}
                fontSize={font(8)}
                fontWeight="bold"
                textAnchor="middle"
              >
                {circuitSwitch ? '闭合' : '断开'}
              </text>
            </g>

            {/* 滑动变阻器 R */}
            <Rheostat x={220} y={330} value={resistance} min={5} max={100} label="滑动变阻器 R" disabled={!circuitSwitch} />
          </g>
        )}

        {/* ================= 磁感线 (GREEN FIELD LINES) ================= */}
        {showLines === 1 && (
          <g>
            {mode === 0 ? (
              // 1. 基础模式磁感线：条形磁铁的偶极场
              <g transform={`translate(${magnetX}, ${coilY})`}>
                <ParametricMagneticField
                  w={120}
                  h={36}
                  pole={magnetPole as 1 | -1}
                  canvasHeight={400}
                  lineColor={EM_COLORS.magneticFieldLine}
                />
              </g>
            ) : (
              // 2. 进阶模式磁感线：双线圈耦合场
              <CoupledCoilField
                primaryX={220}
                primaryW={110}
                primaryH={62}
                secondaryX={coilX}
                secondaryW={160}
                secondaryH={76}
                y={coilY}
                current={(10 / effectiveR) * ironCoreFactor}
                canvasHeight={400}
                lineColor={EM_COLORS.magneticFieldLine}
              />
            )}
          </g>
        )}

        {/* ================= 视觉标注文字 ================= */}
        <text
          x={galvanometerX}
          y={galvanometerY + 124}
          fill={SCENE_COLORS.labels.panelTextMuted}
          fontSize={font(11)}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          {mode === 0 ? '感应回路：线圈 - 电流计' : '感应回路（副线圈侧）'}
        </text>

        {mode === 1 && (
          <text
            x="220"
            y="374"
            fill={SCENE_COLORS.labels.panelTextMuted}
            fontSize={font(11)}
            fontWeight="bold"
            textAnchor="middle"
            style={{ userSelect: 'none' }}
          >
            激励回路（原线圈侧）
          </text>
        )}
      </svg>
    </div>
  )
}
