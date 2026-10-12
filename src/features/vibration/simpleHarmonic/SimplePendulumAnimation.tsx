import { useCallback, useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationFrame } from '@/utils/animation'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { PhysicsVectorArrow, PhysicsGround, Ball } from '@/components/Physics'
import {
  computeAngularFrequency,
  computePendulumState,
  computeRealPendulumPeriod,
  generateRealPendulumTrajectory,
  getPendulumStateFromTrajectory,
} from '@/physics/oscillation'
import { AnimationSvgCanvas } from '@/components/Layout'

export default function SimplePendulumAnimation() {
  const { params, isPlaying, time, speed, showVectors, showFormulas } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      isPlaying: s.isPlaying,
      time: s.time,
      speed: s.speed,
      showVectors: s.showVectors,
      showFormulas: s.showFormulas,
    })),
  )

  // 采用标准布局路径：useAnimationViewport 测量视口尺寸，使用 splitH 双栏预设
  const { containerRef, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitH,
  })

  // 模式与参数读取
  const mode = params.mode ?? 0 // 0: 简谐运动, 1: 大角对比, 2: 能量守恒, 3: 高考实验
  const l_line = params.l_line ?? 0.985
  const d_mm = params.d_mm ?? 20.0
  const n_cycles = Math.round(params.n_cycles ?? 40)
  const timing_err = params.timing_err ?? 0

  // 摆长计算：模式 3 使用有效摆长 L = l + d/2 (必须算至小球重心)
  const L = mode === 3 ? l_line + d_mm / 2000 : (params.L ?? 1.0)
  const g = params.g ?? 9.8
  const theta0Deg = mode === 3 ? Math.min(5, params.theta0_exp ?? params.theta0 ?? 4) : (params.theta0 ?? 8)
  const phiDeg = mode === 3 ? 0 : (params.phiDeg ?? 0)
  const phi = (phiDeg * Math.PI) / 180
  const showGraph = mode === 3 ? 0 : (params.showGraph ?? 1)

  const mass = 1.0 // 摆球质量，设定为 1.0 kg 用于受力展示

  // 1. 简谐摆周期与状态计算
  const T0 = useMemo(() => 2 * Math.PI * Math.sqrt(L / g), [L, g])
  const omega0 = useMemo(() => computeAngularFrequency(T0), [T0])
  const phase0 = omega0 * time + phi
  const stateSHM = useMemo(() => {
    return computePendulumState(mass, L, g, theta0Deg, phase0)
  }, [mass, L, g, theta0Deg, phase0])

  // 2. 真实大角轨迹预计算与状态插值
  const T_real = useMemo(() => computeRealPendulumPeriod(L, g, theta0Deg), [L, g, theta0Deg])
  const omegaReal = useMemo(() => computeAngularFrequency(T_real), [T_real])
  const realTrajectory = useMemo(
    () => generateRealPendulumTrajectory(L, g, theta0Deg),
    [L, g, theta0Deg],
  )

  const stateReal = useMemo(() => {
    const st = getPendulumStateFromTrajectory(realTrajectory, T_real, time, phiDeg, omegaReal)
    const angle = st.angle
    const vel = L * st.angularVelocity
    const acc = -g * Math.sin(angle)
    const tension = mass * (g * Math.cos(angle) + (vel * vel) / L)
    const restoringForce = -mass * g * Math.sin(angle)
    return {
      angle,
      displacement: L * angle,
      velocity: vel,
      acceleration: acc,
      tension,
      gravity: mass * g,
      restoringForce,
    }
  }, [realTrajectory, T_real, time, phiDeg, omegaReal, L, g, mass])

  // ── 动画时钟：以 store.time 为规范时钟 ──
  const handleFrame = useCallback((deltaMs: number) => {
    const dt = deltaMs / 1000
    if (dt <= 0 || dt > 0.1) return
    const store = useAnimationStore.getState()
    store.setTime(store.time + dt * store.direction)
  }, [])
  useAnimationFrame(handleFrame, { playing: isPlaying, speed })

  // 依据当前模式确定要渲染的主状态（模式 0 与 模式 3 均使用小角近似简谐状态）
  const activeState = mode === 1 ? stateReal : stateSHM

  // ── 设计坐标系布局参数 ──
  const pivotX = 175
  const pivotY = 80

  // 摆线长度的像素比例（固定 1 米 = 90 像素）
  const linePixelLength = 90
  const rPx = L * linePixelLength

  // ── 建立标准 SceneScale 物理缩放投影 ──
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitH,
    anchor: 'center',
    centerSource: 'custom',
    centerX: pivotX,
    centerY: pivotY,
    physicsScaleDesign: linePixelLength,
    refMagnitudes: {
      force: 10.0,
      gravity: 10.0,
      tension: 12.0,
      appliedForce: 10.0,
      velocity: 3.0,
    },
    maxVectorLength: 100,
  })

  // 摆球物理坐标（y 轴向上为正，挂点下方为负）
  const ballPhysPos = useMemo(
    () => ({
      x: L * Math.sin(activeState.angle),
      y: -L * Math.cos(activeState.angle),
    }),
    [L, activeState.angle],
  )

  // 摆球设计坐标
  const ballX = pivotX + ballPhysPos.x * linePixelLength
  const ballY = pivotY - ballPhysPos.y * linePixelLength

  // 简谐近似参考小球坐标 (仅在模式 1 对比下绘制)
  const ballPhysPos_SHM = useMemo(
    () => ({
      x: L * Math.sin(stateSHM.angle),
      y: -L * Math.cos(stateSHM.angle),
    }),
    [L, stateSHM.angle],
  )

  const ballX_SHM = pivotX + ballPhysPos_SHM.x * linePixelLength
  const ballY_SHM = pivotY - ballPhysPos_SHM.y * linePixelLength

  // ── 模式 3：累积计时与全振动次数计算 ──
  const idealTotalTime = useMemo(() => n_cycles * T0, [n_cycles, T0])
  const measuredTotalTime = useMemo(
    () => Math.max(0.1, idealTotalTime + timing_err),
    [idealTotalTime, timing_err],
  )
  const isCompleted = mode === 3 && time >= idealTotalTime
  const currentCycles = useMemo(() => {
    if (mode !== 3 || T0 <= 0) return 0
    if (time >= idealTotalTime) return n_cycles
    return Math.min(n_cycles, Math.floor(time / T0))
  }, [mode, time, T0, idealTotalTime, n_cycles])

  const displayTimer = useMemo(() => {
    if (mode !== 3) return 0
    if (time >= idealTotalTime) return measuredTotalTime
    return time + timing_err * (time / Math.max(0.1, idealTotalTime))
  }, [mode, time, idealTotalTime, measuredTotalTime, timing_err])

  // ── 滚动传送带 x-t 描迹（模式 0/1 支持；模式 3 专注真实实验场景） ──
  const isShowGraph = mode === 3 ? false : mode === 1 ? true : showGraph === 1
  const graphX = 10
  const graphY = 290
  const graphW = 330
  const graphH = 300
  const vy = 100 // 传送带向下滚动速度 (px/s)

  // 简谐波轨迹
  const shmWavePath = useMemo(() => {
    if (!isShowGraph) return ''
    const points: string[] = []
    const step = 4
    const theta0Rad = (theta0Deg * Math.PI) / 180
    const omega = computeAngularFrequency(T0)

    for (let py = graphY; py <= graphY + graphH; py += step) {
      const dy = py - graphY
      const tBack = time - dy / vy
      const phaseBack = omega * tBack + phi
      const angleBack = theta0Rad * Math.cos(phaseBack)
      const xBack = pivotX + L * Math.sin(angleBack) * 90
      if (py === graphY) {
        points.push(`M ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      } else {
        points.push(`L ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      }
    }
    return points.join(' ')
  }, [isShowGraph, time, theta0Deg, T0, phi, pivotX, vy, L])

  // 真实非线性轨迹 (模式 1)
  const realWavePath = useMemo(() => {
    if (!isShowGraph || mode !== 1) return ''
    const points: string[] = []
    const step = 4
    for (let py = graphY; py <= graphY + graphH; py += step) {
      const dy = py - graphY
      const tBack = time - dy / vy
      const stateBack = getPendulumStateFromTrajectory(
        realTrajectory,
        T_real,
        tBack,
        phiDeg,
        omegaReal,
      )
      const xBack = pivotX + L * Math.sin(stateBack.angle) * 90
      if (py === graphY) {
        points.push(`M ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      } else {
        points.push(`L ${xBack.toFixed(1)} ${py.toFixed(1)}`)
      }
    }
    return points.join(' ')
  }, [isShowGraph, mode, time, realTrajectory, T_real, omegaReal, phiDeg, pivotX, vy, L])

  return (
    <AnimationSvgCanvas
      containerRef={containerRef}
      transform={vp.transform}
      className="bg-slate-50 rounded-lg shadow-inner"
    >
      {/* ── 滚动传送带（沙摆模拟，仅模式 0/1） ── */}
      {isShowGraph && (
        <g>
          <rect
            x={graphX}
            y={graphY}
            width={graphW}
            height={graphH}
            rx={12}
            fill={CANVAS_COLORS.grid}
            stroke={CANVAS_COLORS.axis}
            strokeWidth={2}
          />

          {/* 两侧履带滚动线 */}
          <line
            x1={graphX + 8}
            y1={graphY + 6}
            x2={graphX + 8}
            y2={graphY + graphH - 6}
            stroke={CANVAS_COLORS.trackHistory}
            strokeWidth={2}
            strokeDasharray="6 6"
            strokeDashoffset={-vy * time}
          />
          <line
            x1={graphX + graphW - 8}
            y1={graphY + 6}
            x2={graphX + graphW - 8}
            y2={graphY + graphH - 6}
            stroke={CANVAS_COLORS.trackHistory}
            strokeWidth={2}
            strokeDasharray="6 6"
            strokeDashoffset={-vy * time}
          />

          {/* 履带滚动横向纹理 */}
          {Array.from({ length: 6 }).map((_, i) => {
            const ly = graphY + ((vy * time + i * (graphH / 6)) % graphH)
            return (
              <line
                key={i}
                x1={graphX + 12}
                y1={ly}
                x2={graphX + graphW - 12}
                y2={ly}
                stroke={CANVAS_COLORS.axis}
                strokeWidth={1}
                opacity={0.5}
              />
            )
          })}

          {/* 滚轴 */}
          <circle cx={graphX + 22} cy={graphY + graphH / 2} r={12} fill={CANVAS_COLORS.trackHistory} />
          <line
            x1={graphX + 22 - 12}
            y1={graphY + graphH / 2}
            x2={graphX + 22 + 12}
            y2={graphY + graphH / 2}
            stroke={CANVAS_COLORS.gridSubtle}
            strokeWidth={2}
            transform={`rotate(${(vy * time * 2) % 360}, ${graphX + 22}, ${graphY + graphH / 2})`}
          />
          <circle
            cx={graphX + graphW - 22}
            cy={graphY + graphH / 2}
            r={12}
            fill={CANVAS_COLORS.trackHistory}
          />
          <line
            x1={graphX + graphW - 22 - 12}
            y1={graphY + graphH / 2}
            x2={graphX + graphW - 22 + 12}
            y2={graphY + graphH / 2}
            stroke={CANVAS_COLORS.gridSubtle}
            strokeWidth={2}
            transform={`rotate(${(vy * time * 2) % 360}, ${graphX + graphW - 22}, ${graphY + graphH / 2})`}
          />

          {/* 余弦曲线 - 简谐近似波形 (模式 0/1) */}
          <path
            d={shmWavePath}
            fill="none"
            stroke={mode === 1 ? PHYSICS_COLORS.velocityX : PHYSICS_COLORS.displacement}
            strokeWidth={mode === 1 ? 2.5 : 3.5}
            strokeDasharray={mode === 1 ? '4 3' : undefined}
            strokeLinecap="round"
            opacity={mode === 1 ? 0.6 : 0.8}
          />

          {/* 真实大偏角轨迹波形 (仅模式 1) */}
          {mode === 1 && (
            <path
              d={realWavePath}
              fill="none"
              stroke={PHYSICS_COLORS.accelerationX}
              strokeWidth={3.5}
              strokeLinecap="round"
              opacity={0.9}
            />
          )}

          {/* 相切虚线与投影小圆点 */}
          <line
            x1={ballX}
            y1={ballY}
            x2={ballX}
            y2={graphY}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <circle cx={ballX} cy={graphY} r={4.5} fill={CANVAS_COLORS.annotation} />

          {mode === 1 && (
            <>
              <line
                x1={ballX_SHM}
                y1={ballY_SHM}
                x2={ballX_SHM}
                y2={graphY}
                stroke={PHYSICS_COLORS.velocityX}
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
              <circle cx={ballX_SHM} cy={graphY} r={3.5} fill={PHYSICS_COLORS.velocityX} />
            </>
          )}
        </g>
      )}

      {/* ── 单摆实物绘制 ── */}
      {/* 悬挂天花板平台 */}
      <PhysicsGround
        x={pivotX - 50}
        y={pivotY - 6}
        width={100}
        type="platform"
        appearance={{ thickness: 6 }}
      />
      {/* 悬挂销轴 */}
      <circle
        cx={pivotX}
        cy={pivotY}
        r={5}
        fill={SCENE_COLORS.pendulum.rodStroke}
        stroke={SCENE_COLORS.pendulum.pivotStroke}
        strokeWidth={1}
      />

      {/* 摆球偏角平衡位置辅助虚线 */}
      <line
        x1={pivotX}
        y1={pivotY}
        x2={pivotX}
        y2={pivotY + rPx + 40}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1.2}
        strokeDasharray="4 4"
      />

      {/* 模式 3 专有：平衡位置基准标志线 */}
      {mode === 3 && (
        <g>
          <line
            x1={pivotX - 25}
            y1={pivotY + rPx}
            x2={pivotX + 25}
            y2={pivotY + rPx}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
          <text
            x={pivotX}
            y={pivotY + rPx + 30}
            fontSize={11}
            fill={PHYSICS_COLORS.velocity}
            fontFamily={CANVAS_STYLE.FONT.family}
            textAnchor="middle"
          >
            平衡位置（计时基准线）
          </text>
        </g>
      )}

      {/* 1. 对比渲染：半透明简谐近似摆 (仅在模式 1 下绘制) */}
      {mode === 1 && (
        <g opacity={0.4}>
          <line
            x1={pivotX}
            y1={pivotY}
            x2={ballX_SHM}
            y2={ballY_SHM}
            stroke={PHYSICS_COLORS.velocityX}
            strokeWidth={1.8}
            strokeDasharray="3 2"
          />
          <Ball
            cx={ballX_SHM}
            cy={ballY_SHM}
            r={16}
            type="pendulumBob"
            stroke={PHYSICS_COLORS.velocityX}
            strokeWidth={1}
          />
          <text
            x={ballX_SHM}
            y={ballY_SHM - 22}
            fontSize={11}
            fill={PHYSICS_COLORS.velocityX}
            fontWeight="bold"
            fontFamily={CANVAS_STYLE.FONT.family}
            textAnchor="middle"
          >
            简谐摆
          </text>
        </g>
      )}

      {/* 2. 主摆渲染：真实运动单摆 */}
      {/* 摆线 */}
      <line
        x1={pivotX}
        y1={pivotY}
        x2={ballX}
        y2={ballY}
        stroke={mode === 1 ? PHYSICS_COLORS.accelerationX : SCENE_COLORS.pendulum.rodStroke}
        strokeWidth={2.4}
      />

      {/* 金属渐变摆球 */}
      <Ball
        cx={ballX}
        cy={ballY}
        r={18}
        type="pendulumBob"
        stroke={mode === 1 ? PHYSICS_COLORS.accelerationX : undefined}
        strokeWidth={1.5}
      />

      {/* 摆角数值和摆线文字 */}
      <text
        x={ballX}
        y={ballY - 24}
        fontSize={13}
        fontWeight="bold"
        fill={mode === 1 ? PHYSICS_COLORS.accelerationX : SCENE_COLORS.pendulum.rodStroke}
        fontFamily={CANVAS_STYLE.FONT.family}
        textAnchor="middle"
      >
        {mode === 1 ? '真实角 ' : ''}θ = {((activeState.angle * 180) / Math.PI).toFixed(1)}°
      </text>

      {/* 模式 3 专有：两段测定摆长尺寸标注 (l 与 L=l+d/2) */}
      {mode === 3 && (
        <g fontFamily={CANVAS_STYLE.FONT.family} fontSize={11}>
          {/* 米尺测量摆线长 l */}
          <line
            x1={pivotX - 35}
            y1={pivotY}
            x2={pivotX - 35}
            y2={pivotY + (rPx - 18)}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1.2}
          />
          <line
            x1={pivotX - 40}
            y1={pivotY}
            x2={pivotX - 30}
            y2={pivotY}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1.2}
          />
          <line
            x1={pivotX - 40}
            y1={pivotY + (rPx - 18)}
            x2={pivotX - 30}
            y2={pivotY + (rPx - 18)}
            stroke={CANVAS_COLORS.annotation}
            strokeWidth={1.2}
          />
          <text
            x={pivotX - 42}
            y={pivotY + rPx / 2 - 10}
            fill={CANVAS_COLORS.labelTextLight}
            textAnchor="end"
          >
            线长 l = {l_line.toFixed(3)} m
          </text>

          {/* 游标卡尺测球直径 d 与球心有效摆长 L */}
          <text
            x={ballX + 26}
            y={ballY - 4}
            fill={PHYSICS_COLORS.displacement}
            fontWeight="bold"
          >
            L = l + d/2 = {L.toFixed(3)} m
          </text>
          <text
            x={ballX + 26}
            y={ballY + 12}
            fill={CANVAS_COLORS.textMuted}
            fontSize={10}
          >
            (球径 d = {d_mm.toFixed(1)} mm)
          </text>

          {/* 累积计时状态卡片 */}
          <g transform="translate(18, 480)">
            <rect
              x={0}
              y={0}
              width={190}
              height={70}
              rx={8}
              fill={CANVAS_COLORS.objectFillNeutral}
              stroke={CANVAS_COLORS.grid}
              strokeWidth={1}
            />
            <text x={12} y={22} fill={CANVAS_COLORS.labelTextLight} fontSize={11}>
              累计计时 t:
            </text>
            <text x={90} y={22} fill={PHYSICS_COLORS.velocity} fontSize={13} fontWeight="bold">
              {displayTimer.toFixed(2)} s
            </text>
            <text x={12} y={42} fill={CANVAS_COLORS.labelTextLight} fontSize={11}>
              全振动计数:
            </text>
            <text x={90} y={42} fill={PHYSICS_COLORS.forceNet} fontSize={13} fontWeight="bold">
              {currentCycles} / {n_cycles} 次
            </text>
            <text
              x={12}
              y={60}
              fill={isCompleted ? PHYSICS_COLORS.gravity : CANVAS_COLORS.textMuted}
              fontSize={10}
              fontWeight={isCompleted ? 'bold' : 'normal'}
            >
              {isCompleted ? '✓ 已达预定全振动次数' : '● 单摆计时中…'}
            </text>
          </g>
        </g>
      )}

      {/* ── 力的动态矢量分析 ── */}
      {showVectors && (
        <g>
          {/* 重力 G */}
          <PhysicsVectorArrow
            origin={ballPhysPos}
            vector={{ x: 0, y: -activeState.gravity }}
            type="gravity"
            sceneScale={sceneScale}
            label={`G = ${activeState.gravity.toFixed(1)}N`}
            glow
          />
          {/* 绳子拉力 F_拉 */}
          <PhysicsVectorArrow
            origin={ballPhysPos}
            vector={{
              x: -activeState.tension * Math.sin(activeState.angle),
              y: activeState.tension * Math.cos(activeState.angle),
            }}
            type="tension"
            sceneScale={sceneScale}
            label={`F_拉 = ${activeState.tension.toFixed(1)}N`}
            glow
          />
          {/* 切向回复力 F_回 */}
          <PhysicsVectorArrow
            origin={ballPhysPos}
            vector={{
              x: activeState.restoringForce * Math.cos(activeState.angle),
              y: activeState.restoringForce * Math.sin(activeState.angle),
            }}
            type="appliedForce"
            color={PHYSICS_COLORS.accelerationX}
            sceneScale={sceneScale}
            label={`F_回 = ${Math.abs(activeState.restoringForce).toFixed(1)}N`}
            glow
          />
        </g>
      )}

      {/* 物理量图例 */}
      <g fontFamily={CANVAS_STYLE.FONT.family} fontSize={11}>
        <rect
          x={10}
          y={10}
          width={mode === 1 ? 240 : mode === 3 ? 200 : 260}
          height={26}
          rx={4}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1}
        />

        {mode === 1 ? (
          <>
            <circle cx={22} cy={23} r={4.5} fill={PHYSICS_COLORS.accelerationX} />
            <text x={32} y={27} fill={CANVAS_COLORS.labelTextLight}>
              真实轨迹 (实线)
            </text>
            <circle cx={136} cy={23} r={4.5} fill={PHYSICS_COLORS.velocityX} />
            <text x={146} y={27} fill={CANVAS_COLORS.labelTextLight}>
              简谐近似 (虚线)
            </text>
          </>
        ) : mode === 3 ? (
          <>
            <circle cx={22} cy={23} r={4.5} fill={PHYSICS_COLORS.displacement} />
            <text x={32} y={27} fill={CANVAS_COLORS.labelTextLight}>
              有效摆长 L
            </text>
            <circle cx={110} cy={23} r={4.5} fill={PHYSICS_COLORS.velocity} />
            <text x={120} y={27} fill={CANVAS_COLORS.labelTextLight}>
              基准计时
            </text>
          </>
        ) : (
          <>
            <circle cx={22} cy={23} r={4.5} fill={PHYSICS_COLORS.displacement} />
            <text x={32} y={27} fill={CANVAS_COLORS.labelTextLight}>
              水平位移 x
            </text>
            <circle cx={106} cy={23} r={4.5} fill={PHYSICS_COLORS.velocity} />
            <text x={116} y={27} fill={CANVAS_COLORS.labelTextLight}>
              速度 v
            </text>
            <circle cx={186} cy={23} r={4.5} fill={PHYSICS_COLORS.acceleration} />
            <text x={196} y={27} fill={CANVAS_COLORS.labelTextLight}>
              回复/加速度
            </text>
          </>
        )}
      </g>

      {/* 动态公式看板 */}
      {showFormulas && (
        <text
          x={10}
          y={635}
          fontSize={11}
          fill={CANVAS_COLORS.textMuted}
          fontFamily={CANVAS_STYLE.FONT.family}
        >
          {mode === 0 &&
            `简谐运动: θ = θ₀·cos(ω₀t) | 周期: T₀ = 2π√(L/g) = ${T0.toFixed(2)}s | ω₀ = ${omega0.toFixed(2)} rad/s`}
          {mode === 1 &&
            `真实周期 (大角修正): T_real = ${T_real.toFixed(2)}s | 简谐等时周期: T₀ = ${T0.toFixed(2)}s | 偏差: +${(((T_real - T0) / T0) * 100).toFixed(1)}%`}
          {mode === 2 &&
            `势能: Ep = mgL(1-cosθ) | 动能: Ek = ½mv² | 机械能: E = Ep + Ek = ${(mass * g * L * (1 - Math.cos((theta0Deg * Math.PI) / 180))).toFixed(3)} J (守恒)`}
          {mode === 3 &&
            `单摆测 g: L = l + d/2 = ${L.toFixed(3)}m | 理论周期 T = ${T0.toFixed(3)}s | 关系式 g = 4π²L/T²`}
        </text>
      )}
    </AnimationSvgCanvas>
  )
}
