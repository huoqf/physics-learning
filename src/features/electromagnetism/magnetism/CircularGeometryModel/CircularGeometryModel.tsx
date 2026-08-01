import { useEffect, useMemo, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, withAlpha } from '@/theme/physics'
import { worldToDesign } from '@/scene'
import { PhysicsVectorArrow, ParticleTrajectory } from '@/components/Physics'
import { AnimationSvgCanvas } from '@/components/Layout'

export default function CircularGeometryModel() {
  const { containerRef, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.splitH })
  
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

  // 5. SVG 顶层辅助参数与 SceneScale 对象（设计坐标单位）
  const DESIGN_W = preset.width
  const DESIGN_H = preset.height
  const sceneScale = useSceneScale({
    vp,
    preset: CANVAS_PRESETS.splitH,
    anchor: 'custom',
    customOriginX: DESIGN_W / 2,
    customOriginY: DESIGN_H * 0.8,
    customScaleX: DESIGN_W / 7,
    customScaleY: DESIGN_H / 13,
    refMagnitudes: {
      force: 20,
      velocity: 3.0,
      lorentzForce: 20,
    },
    intentionalNonUniformScale: true,
  })

  // 坐标转换辅助函数: xw, yw -> 设计坐标
  const dx = useCallback((xw: number) => worldToDesign(xw, 0, sceneScale).px, [sceneScale])
  const dy = useCallback((yw: number) => worldToDesign(0, yw, sceneScale).py, [sceneScale])

  // 粒子历史轨迹点集（完整路径，用于 ParticleTrajectory 渲染）
  const historyPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const dt = 0.01
    const tEnd = Math.max(time, 0)
    for (let t = 0; t <= tEnd + 1e-9; t += dt) {
      const s = getParticleState(t)
      pts.push({ x: dx(s.px), y: dy(s.py) })
    }
    return pts
  }, [time, getParticleState, dx, dy])

  // 短拖尾点集（最近 20 个采样点，用于运动增强拖尾）
  const tailPoints = useMemo(() => {
    const tailLen = Math.min(20, historyPoints.length)
    return historyPoints.slice(-tailLen)
  }, [historyPoints])

  // 完整理论预测轨迹（全路径，用于底层虚线参考）
  const predictedPoints = useMemo(() => {
    const tEnd = tOut + 2.0
    const steps = 200
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * tEnd
      const s = getParticleState(t)
      pts.push({ x: dx(s.px), y: dy(s.py) })
    }
    return pts
  }, [tOut, getParticleState, dx, dy])

  // 6. 特征直角三角形顶点设计坐标计算
  const trianglePoints = useMemo(() => {
    if (boundaryType === 0) {
      return {
        p1: `${dx(xc)},${dy(yc)}`,
        p2: `${dx(0)},${dy(0)}`,
        p3: `${dx(exitState.xOut / 2)},${dy(0)}`,
        formula: '(R - d)^2 + \\left(\\frac{L}{2}\\right)^2 = R^2 \\implies R^2\\cos^2\\alpha + R^2\\sin^2\\alpha = R^2',
      }
    } else if (boundaryType === 1) {
      return {
        p1: `${dx(xc)},${dy(yc)}`,
        p2: `${dx(exitState.xOut)},${dy(exitState.yOut)}`,
        p3: `${dx(exitState.xOut)},${dy(yc)}`,
        formula: `(R - d)^2 + x_{\\text{offset}}^2 = R^2 \\implies (R - 4.0)^2 + (${Math.abs(exitState.xOut - xc).toFixed(2)})^2 = R^2`,
      }
    } else {
      return {
        p1: `${dx(xc)},${dy(yc)}`,
        p2: `${dx(0)},${dy(3.5)}`,
        p3: `${dx(exitState.xOut)},${dy(exitState.yOut)}`,
        formula: '\\Delta\\varphi = 2\\arctan\\left(\\frac{R_b}{R}\\right)',
      }
    }
  }, [boundaryType, xc, yc, exitState, dx, dy])

  const currentParticleState = getParticleState(time)

  return (
    <div className="w-full h-full relative select-none overflow-hidden">
      <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="relative">
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

        {/* 1. 磁场边界图形与背景填充 */}
        {boundaryType === 0 && (
          <>
            <rect x="0" y="0" width={DESIGN_W} height={dy(0)} fill="rgba(22, 163, 74, 0.05)" />
            <rect x="0" y="0" width={DESIGN_W} height={dy(0)} fill="url(#bfield-pattern)" />
            <line x1="0" y1={dy(0)} x2={DESIGN_W} y2={dy(0)} stroke="rgba(22, 163, 74, 0.4)" strokeWidth="3" />
            <text x="16" y={dy(0) + 20} fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">磁场边界 y = 0</text>
          </>
        )}

        {boundaryType === 1 && (
          <>
            <rect x={dx(-3)} y={dy(4)} width={dx(3) - dx(-3)} height={dy(0) - dy(4)} fill="rgba(22, 163, 74, 0.05)" />
            <rect x={dx(-3)} y={dy(4)} width={dx(3) - dx(-3)} height={dy(0) - dy(4)} fill="url(#bfield-pattern)" />
            <rect x={dx(-3)} y={dy(4)} width={dx(3) - dx(-3)} height={dy(0) - dy(4)} stroke="rgba(22, 163, 74, 0.4)" strokeWidth="3" fill="none" />
            <text x={dx(-3)} y={dy(0) + 20} fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">磁场底界 y = 0</text>
            <text x={dx(-3)} y={dy(4) - 10} fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">磁场顶界 y = 4.0m</text>
          </>
        )}

        {boundaryType === 2 && (
          <>
            <circle cx={dx(0)} cy={dy(3.5)} r={3.5 * sceneScale.scale} fill="rgba(22, 163, 74, 0.05)" />
            <circle cx={dx(0)} cy={dy(3.5)} r={3.5 * sceneScale.scale} fill="url(#bfield-pattern)" />
            <circle cx={dx(0)} cy={dy(3.5)} r={3.5 * sceneScale.scale} stroke="rgba(22, 163, 74, 0.4)" strokeWidth="3" fill="none" />
            <text x={dx(0)} y={dy(3.5) - 3.5 * sceneScale.scale - 10} textAnchor="middle" fill="rgba(22, 163, 74, 0.8)" fontSize="12" fontWeight="bold">圆形磁场边界 R_b = 3.5m</text>
          </>
        )}

        {/* 2. 粒子轨迹 + 实时几何线及矢量箭头 */}
        <g>
          {/* 粒子轨迹（统一组件：预测虚线 + 历史虚线 + 拖尾 + 本体） */}
          <ParticleTrajectory
            historyPoints={historyPoints}
            predictedPoints={predictedPoints}
            tailPoints={tailPoints}
            isFocus={true}
            chargeSign={particleSign > 0 ? '+' : '-'}
          />

          {/* Step 1: 速度垂线 */}
          {step1_showPerp && (
            <>
              <line 
                x1={dx(0)} y1={dy(0)} 
                x2={dx(xc)} y2={dy(yc)} 
                stroke={PHYSICS_COLORS.annotation} strokeWidth="1.5" strokeDasharray="4 4" 
              />
              {time > 0 && (
                <line 
                  x1={dx(time <= tOut ? currentParticleState.px : exitState.xOut)} 
                  y1={dy(time <= tOut ? currentParticleState.py : exitState.yOut)} 
                  x2={dx(xc)} y2={dy(yc)} 
                  stroke={PHYSICS_COLORS.annotation} strokeWidth="1.5" strokeDasharray="4 4" 
                />
              )}
            </>
          )}

          {/* Step 2: 锁定圆心 O 及半径 R */}
          {step2_showCenter && (
            <>
              <circle cx={dx(xc)} cy={dy(yc)} r="4" fill={PHYSICS_COLORS.annotation} />
              <text x={dx(xc) + 8} y={dy(yc) + 4} fill={PHYSICS_COLORS.annotation} fontSize="13" fontWeight="bold">O</text>
              
              <line x1={dx(xc)} y1={dy(yc)} x2={dx(0)} y2={dy(0)} stroke={PHYSICS_COLORS.annotation} strokeWidth="1" strokeDasharray="2 2" />
              <line x1={dx(xc)} y1={dy(yc)} x2={dx(exitState.xOut)} y2={dy(exitState.yOut)} stroke={PHYSICS_COLORS.annotation} strokeWidth="1" strokeDasharray="2 2" />
              
              <text x={(dx(xc) + dx(0)) / 2 + 10} y={(dy(yc) + dy(0)) / 2 + 5} fill={PHYSICS_COLORS.annotation} fontSize="11" fontStyle="italic">R={R.toFixed(2)}m</text>
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
          <PhysicsVectorArrow
            vector={{ x: velocity * Math.cos(angleRad), y: velocity * Math.sin(angleRad) }}
            type="velocity"
            sceneScale={sceneScale}
            color={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
            label="v0"
          />

          {/* 出射切线处的速度参考矢量（弱化底色） */}
          <PhysicsVectorArrow
            originDesign={{ x: exitState.xOut, y: exitState.yOut }}
            vector={{ x: exitState.vxOut, y: exitState.vyOut }}
            type="velocity"
            sceneScale={sceneScale}
            color={withAlpha(PHYSICS_COLORS.velocity, 0.35)}
            label="vt"
          />

          {/* 实时粒子上的动态速度矢量 */}
          <PhysicsVectorArrow
            originDesign={{ x: currentParticleState.px, y: currentParticleState.py }}
            vector={{ x: currentParticleState.vx, y: currentParticleState.vy }}
            type="velocity"
            sceneScale={sceneScale}
            color={PHYSICS_COLORS.velocity}
            label="v"
          />

          {/* 实时粒子上的动态洛伦兹力向心力矢量 */}
          {currentParticleState.inField && (
            <PhysicsVectorArrow
              originDesign={{ x: currentParticleState.px, y: currentParticleState.py }}
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
        </g>
      </AnimationSvgCanvas>
    </div>
  )
}
