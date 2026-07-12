import { useEffect, useMemo, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { useAnimationViewport, useCanvasViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { worldToPixel } from '@/scene'
import { VectorArrow } from '@/components/Physics'

export default function CircularGeometryModel() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({ preset: CANVAS_PRESETS.splitH })
  const { canvasRef, setupFrame } = useCanvasViewport({ vp, canvasSize, mode: 'raw' })
  
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const setTime = useAnimationStore((s) => s.setTime)
  const isPlaying = useAnimationStore((s) => s.isPlaying)

  // 1. 获取物理与控制参数
  const boundaryType = params.boundaryType ?? 0 // 0: 单边界, 1: 矩形边界, 2: 圆形边界
  const particleSign = params.particleSign ?? 1 // 1: 正电荷, -1: 负电荷
  const velocity = params.velocity ?? 3.0 // 1.0 ~ 5.0 m/s
  const angle = params.angle ?? 60 // 0° ~ 180°
  const B = params.magneticB ?? 1.0 // 0.2 ~ 2.0 T
  
  const step1_showPerp = params.step1_showPerp === 1
  const step2_showCenter = params.step2_showCenter === 1
  const step3_lockTriangle = params.step3_lockTriangle === 1

  const angleRad = (angle * Math.PI) / 180

  // 2. 物理常量与计算
  const R = velocity / B // 轨道半径 R = mv / (qB)
  const omega = B // 角速度大小
  
  // 圆心坐标计算 (物理坐标，以 (0,0) 为发射点)
  const xc = particleSign * R * Math.sin(angleRad)
  const yc = -particleSign * R * Math.cos(angleRad)

  // 3. 高精度出射时刻迭代计算 (dt = 1ms)
  const tOut = useMemo(() => {
    const dt = 0.001
    const maxT = 12.0
    let t = 0.005 // 略微偏离初始时刻以避免边界浮点判定误差
    const omegaDir = -particleSign * omega
    const theta0 = angleRad + particleSign * Math.PI / 2

    while (t < maxT) {
      const curTheta = theta0 + omegaDir * t
      const curX = xc + R * Math.cos(curTheta)
      const curY = yc + R * Math.sin(curTheta)

      let inB = false
      if (boundaryType === 0) {
        inB = curY >= 0
      } else if (boundaryType === 1) {
        inB = curX >= -3.0 && curX <= 3.0 && curY >= 0 && curY <= 4.0
      } else {
        inB = curX * curX + (curY - 3.5) * (curY - 3.5) <= 3.5 * 3.5
      }

      if (!inB) {
        return t - dt / 2
      }
      t += dt
    }
    return maxT
  }, [boundaryType, particleSign, omega, R, xc, yc, angleRad])

  // 出射状态
  const exitState = useMemo(() => {
    const omegaDir = -particleSign * omega
    const theta0 = angleRad + particleSign * Math.PI / 2
    const curTheta = theta0 + omegaDir * tOut
    const xOut = xc + R * Math.cos(curTheta)
    const yOut = yc + R * Math.sin(curTheta)
    const vxOut = -omegaDir * R * Math.sin(curTheta)
    const vyOut = omegaDir * R * Math.cos(curTheta)
    return { xOut, yOut, vxOut, vyOut }
  }, [tOut, omega, particleSign, angleRad, xc, yc, R])

  // 粒子实时运动状态计算
  const getParticleState = useCallback((tVal: number) => {
    const omegaDir = -particleSign * omega
    const theta0 = angleRad + particleSign * Math.PI / 2

    if (tVal <= 0) {
      const vx0 = velocity * Math.cos(angleRad)
      const vy0 = velocity * Math.sin(angleRad)
      return {
        px: vx0 * tVal,
        py: vy0 * tVal,
        vx: vx0,
        vy: vy0,
        inField: false,
      }
    } else if (tVal <= tOut) {
      const curTheta = theta0 + omegaDir * tVal
      return {
        px: xc + R * Math.cos(curTheta),
        py: yc + R * Math.sin(curTheta),
        vx: -omegaDir * R * Math.sin(curTheta),
        vy: omegaDir * R * Math.cos(curTheta),
        inField: true,
      }
    } else {
      const dt = tVal - tOut
      return {
        px: exitState.xOut + exitState.vxOut * dt,
        py: exitState.yOut + exitState.vyOut * dt,
        vx: exitState.vxOut,
        vy: exitState.vyOut,
        inField: false,
      }
    }
  }, [omega, particleSign, angleRad, velocity, tOut, exitState, xc, yc, R])

  // 动画时间复位逻辑：如果粒子飞出太远，循环发射
  useEffect(() => {
    if (isPlaying && time > tOut + 2.0) {
      setTime(0)
    }
  }, [time, tOut, isPlaying, setTime])

  // 5. SVG 顶层辅助参数与 SceneScale 对象（用于 VectorArrow 渲染）
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitH,
    anchor: 'custom',
    customOriginX: vp.centerX,
    customOriginY: vp.visibleH * 0.8,
    customScaleX: vp.visibleW / 7,
    customScaleY: vp.visibleH / 13,
    refMagnitudes: {
      force: 20,
      velocity: 3.0,
      lorentzForce: 20,
    },
    intentionalNonUniformScale: true,
  })

  // 坐标转换辅助函数 xw, yw -> pixel
  const px = useCallback((xw: number) => worldToPixel(xw, 0, sceneScale).px, [sceneScale])
  const py = useCallback((yw: number) => worldToPixel(0, yw, sceneScale).py, [sceneScale])

  // 4. Canvas 层绘图逻辑（粒子偏转本体与 300ms 拖尾）
  useEffect(() => {
    const ctx = setupFrame()
    if (!ctx) return

    // 绘制 300ms (0.3s) 淡出拖尾轨迹
    const tailSteps = 20
    const tailDuration = 0.3
    
    ctx.save()
    for (let i = 1; i <= tailSteps; i++) {
      const t1 = time - tailDuration * (1 - (i - 1) / tailSteps)
      const t2 = time - tailDuration * (1 - i / tailSteps)

      // 粒子进入磁场（t >= 0）后开始记录拖尾
      if (t1 >= 0) {
        const s1 = getParticleState(t1)
        const s2 = getParticleState(t2)

        ctx.beginPath()
        ctx.moveTo(px(s1.px), py(s1.py))
        ctx.lineTo(px(s2.px), py(s2.py))

        const alpha = (i / tailSteps) * 0.8
        ctx.strokeStyle = particleSign > 0
          ? withAlpha(PHYSICS_COLORS.positiveCharge, alpha)
          : withAlpha(PHYSICS_COLORS.negativeCharge, alpha)
        ctx.lineWidth = 3.5 * (i / tailSteps)
        ctx.stroke()
      }
    }
    ctx.restore()

    // 绘制粒子本体圆球
    const curState = getParticleState(time)

    ctx.beginPath()
    ctx.arc(px(curState.px), py(curState.py), 7, 0, 2 * Math.PI)
    ctx.fillStyle = particleSign > 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
    ctx.strokeStyle = PHYSICS_COLORS.white
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
  }, [time, velocity, B, angle, particleSign, boundaryType, xc, yc, R, tOut, exitState, getParticleState, sceneScale, px, py, setupFrame])

  // 6. 特征直角三角形顶点像素坐标计算
  const trianglePoints = useMemo(() => {
    if (boundaryType === 0) {
      return {
        p1: `${px(xc)},${py(yc)}`,
        p2: `${px(0)},${py(0)}`,
        p3: `${px(exitState.xOut / 2)},${py(0)}`,
        formula: '(R - d)^2 + \\left(\\frac{L}{2}\\right)^2 = R^2 \\implies R^2\\cos^2\\alpha + R^2\\sin^2\\alpha = R^2',
      }
    } else if (boundaryType === 1) {
      return {
        p1: `${px(xc)},${py(yc)}`,
        p2: `${px(exitState.xOut)},${py(exitState.yOut)}`,
        p3: `${px(exitState.xOut)},${py(yc)}`,
        formula: `(R - d)^2 + x_{\\text{offset}}^2 = R^2 \\implies (R - 4.0)^2 + (${Math.abs(exitState.xOut - xc).toFixed(2)})^2 = R^2`,
      }
    } else {
      return {
        p1: `${px(xc)},${py(yc)}`,
        p2: `${px(0)},${py(3.5)}`,
        p3: `${px(exitState.xOut)},${py(exitState.yOut)}`,
        formula: '\\Delta\\varphi = 2\\arctan\\left(\\frac{R_b}{R}\\right)',
      }
    }
  }, [boundaryType, xc, yc, exitState, px, py])

  const currentParticleState = getParticleState(time)

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none overflow-hidden"
    >
      {/* 1. 底层 SVG 渲染磁场边界图形与背景填充 */}
      <svg
        className="absolute top-0 left-0 w-full h-full"
        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* 磁场向里 ⊗ 填充图案 */}
          <pattern id="bfield-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <g transform="translate(20, 20)">
              {/* 底部白色描边保护层 */}
              <circle cx={0} cy={0} r={6.5} fill="none" stroke={PHYSICS_COLORS.white} strokeWidth={2.4} opacity={0.12} />
              <line x1={-3.9} y1={-3.9} x2={3.9} y2={3.9} stroke={PHYSICS_COLORS.white} strokeWidth={2.4} opacity={0.12} strokeLinecap="round" />
              <line x1={3.9} y1={-3.9} x2={-3.9} y2={3.9} stroke={PHYSICS_COLORS.white} strokeWidth={2.4} opacity={0.12} strokeLinecap="round" />
              
              {/* 彩色主体 */}
              <circle cx={0} cy={0} r={6.5} fill="none" stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth={1.2} opacity={0.22} />
              <line x1={-3.9} y1={-3.9} x2={3.9} y2={3.9} stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth={1.2} opacity={0.22} strokeLinecap="round" />
              <line x1={3.9} y1={-3.9} x2={-3.9} y2={3.9} stroke={PHYSICS_COLORS.magneticFieldCross} strokeWidth={1.2} opacity={0.22} strokeLinecap="round" />
            </g>
          </pattern>
        </defs>

        {/* 边界图形背景填充 */}
        {boundaryType === 0 && (
          <>
            <rect x="0" y="0" width={canvasSize.width} height={py(0)} fill="rgba(22, 163, 74, 0.05)" />
            <rect x="0" y="0" width={canvasSize.width} height={py(0)} fill="url(#bfield-pattern)" />
            <line x1="0" y1={py(0)} x2={canvasSize.width} y2={py(0)} stroke="rgba(22, 163, 74, 0.4)" strokeWidth="3" />
            <text x="16" y={py(0) + 20} fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">磁场边界 y = 0</text>
          </>
        )}

        {boundaryType === 1 && (
          <>
            <rect x={px(-3)} y={py(4)} width={px(3) - px(-3)} height={py(0) - py(4)} fill="rgba(22, 163, 74, 0.05)" />
            <rect x={px(-3)} y={py(4)} width={px(3) - px(-3)} height={py(0) - py(4)} fill="url(#bfield-pattern)" />
            <rect x={px(-3)} y={py(4)} width={px(3) - px(-3)} height={py(0) - py(4)} stroke="rgba(22, 163, 74, 0.4)" strokeWidth="3" fill="none" />
            <text x={px(-3)} y={py(0) + 20} fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">磁场底界 y = 0</text>
            <text x={px(-3)} y={py(4) - 10} fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">磁场顶界 y = 4.0m</text>
          </>
        )}

        {boundaryType === 2 && (
          <>
            <circle cx={px(0)} cy={py(3.5)} r={3.5 * sceneScale.scale} fill="rgba(22, 163, 74, 0.05)" />
            <circle cx={px(0)} cy={py(3.5)} r={3.5 * sceneScale.scale} fill="url(#bfield-pattern)" />
            <circle cx={px(0)} cy={py(3.5)} r={3.5 * sceneScale.scale} stroke="rgba(22, 163, 74, 0.4)" strokeWidth="3" fill="none" />
            <text x={px(0)} y={py(3.5) - 3.5 * sceneScale.scale - 10} textAnchor="middle" fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">圆形磁场边界 R_b = 3.5m</text>
          </>
        )}
      </svg>

      {/* 2. 中层 Canvas 渲染高频粒子及轨迹 */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute top-0 left-0 w-full h-full object-contain"
      />

      {/* 3. 顶层 SVG Overlay 实时几何线及矢量箭头 */}
      <svg
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Step 1: 速度垂线 */}
        {step1_showPerp && (
          <>
            <line 
              x1={px(0)} y1={py(0)} 
              x2={px(xc)} y2={py(yc)} 
              stroke={PHYSICS_COLORS.annotation} strokeWidth="1.5" strokeDasharray="4 4" 
            />
            {time > 0 && (
              <line 
                x1={px(time <= tOut ? currentParticleState.px : exitState.xOut)} 
                y1={py(time <= tOut ? currentParticleState.py : exitState.yOut)} 
                x2={px(xc)} y2={py(yc)} 
                stroke={PHYSICS_COLORS.annotation} strokeWidth="1.5" strokeDasharray="4 4" 
              />
            )}
          </>
        )}

        {/* Step 2: 锁定圆心 O 及半径 R */}
        {step2_showCenter && (
          <>
            <circle cx={px(xc)} cy={py(yc)} r="4" fill={PHYSICS_COLORS.annotation} />
            <text x={px(xc) + 8} y={py(yc) + 4} fill={PHYSICS_COLORS.annotation} fontSize="13" fontWeight="bold">O</text>
            
            <line x1={px(xc)} y1={py(yc)} x2={px(0)} y2={py(0)} stroke={PHYSICS_COLORS.annotation} strokeWidth="1" strokeDasharray="2 2" />
            <line x1={px(xc)} y1={py(yc)} x2={px(exitState.xOut)} y2={py(exitState.yOut)} stroke={PHYSICS_COLORS.annotation} strokeWidth="1" strokeDasharray="2 2" />
            
            <text x={(px(xc) + px(0)) / 2 + 10} y={(py(yc) + py(0)) / 2 + 5} fill={PHYSICS_COLORS.annotation} fontSize="11" fontStyle="italic">R={R.toFixed(2)}m</text>
          </>
        )}

        {/* Step 3: 高亮特征三角形 */}
        {step3_lockTriangle && (
          <polygon 
            points={trianglePoints.p1 + ' ' + trianglePoints.p2 + ' ' + trianglePoints.p3}
            fill={withAlpha(PHYSICS_COLORS.annotation, 0.15)}
            stroke={PHYSICS_COLORS.annotation}
            strokeWidth="2"
          />
        )}

        {/* 入射切线处的速度参考矢量（弱化底色） */}
        <VectorArrow
          origin={{ x: 0, y: 0 }}
          vector={{ x: velocity * Math.cos(angleRad), y: velocity * Math.sin(angleRad) }}
          type="velocity"
          sceneScale={sceneScale}
          color={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
          label="v0"
        />

        {/* 出射切线处的速度参考矢量（弱化底色） */}
        <VectorArrow
          origin={{ x: exitState.xOut, y: exitState.yOut }}
          vector={{ x: exitState.vxOut, y: exitState.vyOut }}
          type="velocity"
          sceneScale={sceneScale}
          color={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
          label="vt"
        />

        {/* 实时粒子上的动态速度矢量 */}
        <VectorArrow
          origin={{ x: currentParticleState.px, y: currentParticleState.py }}
          vector={{ x: currentParticleState.vx, y: currentParticleState.vy }}
          type="velocity"
          sceneScale={sceneScale}
          color={PHYSICS_COLORS.velocity}
          label="v"
        />

        {/* 实时粒子上的动态洛伦兹力向心力矢量 */}
        {currentParticleState.inField && (
          <VectorArrow
            origin={{ x: currentParticleState.px, y: currentParticleState.py }}
            vector={{
              x: ((xc - currentParticleState.px) / R) * (velocity * B),
              y: ((yc - currentParticleState.py) / R) * (velocity * B),
            }}
            type="lorentzForce"
            sceneScale={sceneScale}
            color={PHYSICS_COLORS.lorentzForce}
            label="F_L"
          />
        )}
      </svg>
    </div>
  )
}
