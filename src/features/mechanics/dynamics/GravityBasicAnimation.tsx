import { VectorDefs } from '@/components/Physics'
import { FC, useMemo } from 'react'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { useSuspendedPlatePhysics } from './hooks/useSuspendedPlatePhysics'
import { EarthGravityScene } from './components/EarthGravityScene'
import { SuspendedPlateScene } from './components/SuspendedPlateScene'

export const GravityBasicAnimation: FC = () => {
    const {params, time, showVectors, isPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    isPlaying: s.isPlaying,
    }))
  )
  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full, presetCompensation: 1.2 })
  const { font } = canvasSize

  // 参数解析
  const mode = params.mode ?? 0 // 0=地球自转重力分解, 1=悬挂重心实验
  const latitude = params.latitude ?? 45 // 纬度 (0~90度)
  const omegaScale = params.omegaScale ?? 80 // 向心力放大倍数
  const activeHoleIdx = Math.max(0, Math.min(params.suspendPoint ?? 0, 2)) // 悬挂孔索引 (0~2)
  const showWeight = params.showWeight ?? 0 // 是否启用配重
  const weightX = params.weightX ?? 25 // 配重本地 X 坐标 (-50 ~ 50)
  const weightY = params.weightY ?? 25 // 配重本地 Y 坐标 (-40 ~ 40)
  const weightMass = params.weightMass ?? 1.2 // 配重相对质量 (0.2 ~ 2.0)
  const showLines = params.showLines ?? 1 // 是否显示悬挂垂线

  const cx = vp.centerX
  const cy = vp.centerY

  const gravBasicSceneScale = useSceneScale({ vp, preset, anchor: 'viewport', physicsWidth: preset.width, physicsHeight: preset.height })

  // ─── 物理引擎计算 ───

  // 1. 模式一：地球自转重力分解数据
  const earthData = useMemo(() => {
    if (mode !== 0) return null

    // ── 动画驱动：播放时纬度在 0°~85° 之间正弦变化 ──
    const effectiveLat = isPlaying
      ? ((Math.sin(time * 0.3) + 1) / 2) * 85
      : latitude
    const latRad = (effectiveLat * Math.PI) / 180

    const R_earth = 135 // 地球绘制半径

    // 物体在地球表面上的坐标 (物理坐标系：原点地心，Y轴向上)
    const objX = cx + R_earth * Math.cos(latRad)
    const objY = cy - R_earth * Math.sin(latRad) // Canvas 坐标，Y向下

    // 计算三力大小 (基准万有引力设为 110 像素长度)
    const F_gravitation = 110
    const ratioAtEquator = 0.00346 * omegaScale // 赤道离心力比例（真实值约 0.00346）
    const F_centrifugal = F_gravitation * ratioAtEquator * Math.cos(latRad)

    // 矢量分量 (物理坐标系，Y 轴向上；渲染时通过 objY - Fy 转换为 Canvas Y 向下)
    // 万有引力：指向地心
    const Fx_grav = -F_gravitation * Math.cos(latRad)
    const Fy_grav = -F_gravitation * Math.sin(latRad)

    // 离心力（非惯性系）：背离自转轴，水平向外
    const Fx_centrifugal = +F_centrifugal
    const Fy_centrifugal = 0

    // 重力 G = F_grav + F_离心（非惯性系中矢量合成）
    const Gx = Fx_grav + Fx_centrifugal
    const Gy = Fy_grav + Fy_centrifugal
    const G_force = Math.sqrt(Gx * Gx + Gy * Gy)

    // 夹角偏角：重力与万有引力的夹角
    const dotProduct = Gx * Fx_grav + Gy * Fy_grav
    const cosTheta = Math.max(-1, Math.min(1, dotProduct / (G_force * F_gravitation)))
    const angleDeviation = (Math.acos(cosTheta) * 180) / Math.PI

    return {
      objX, objY, R_earth, effectiveLat,
      Fx_grav, Fy_grav,
      Fx_centrifugal, Fy_centrifugal,
      Gx, Gy, G_force,
      F_centrifugal, F_gravitation,
      angleDeviation
    }
  }, [mode, latitude, omegaScale, cx, cy, isPlaying, time])

  // 2. 模式二：薄板重心与悬挂平衡数据
  const plateData = useSuspendedPlatePhysics({
    activeHoleIdx,
    showWeight,
    weightX,
    weightY,
    weightMass,
    time,
    cx,
    cy,
  })
  // 仅在 mode 1 时使用 plateData，mode 0 时传 null 给子组件
  const effectivePlateData = mode === 1 ? plateData : null

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          {/* 地球剖面径向高光渐变 */}
          <radialGradient id="earth-grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[0]} />
            <stop offset="65%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.earthTech.oceanGradient[2]} />
          </radialGradient>
          {/* 不锈钢薄板金属质感渐变 */}
          <linearGradient id="plate-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.earthTech.landGradient[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.sphere.earthTech.landGradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.earthTech.landGradient[2]} />
          </linearGradient>
          {/* 黄铜配重渐变 */}
          <radialGradient id="brass-grad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[0]} />
            <stop offset="50%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[1]} />
            <stop offset="100%" stopColor={SCENE_COLORS.sphere.brassWeight.gradient[2]} />
          </radialGradient>
          {/* 力的箭头定义 */}
          <VectorDefs colors={[PHYSICS_COLORS.gravity, PHYSICS_COLORS.forceNet]} />
        </defs>

        {/* ─── 模式一：地球自转重力分解渲染 ─── */}
        {mode === 0 && earthData && (
          <EarthGravityScene
            earthData={earthData}
            cx={cx}
            cy={cy}
            showVectors={showVectors}
            font={font}
            gravBasicSceneScale={gravBasicSceneScale}
          />
        )}

        {/* ─── 模式二：悬挂法重心实验渲染 ─── */}
        {mode === 1 && effectivePlateData && (
          <SuspendedPlateScene
            plateData={effectivePlateData}
            activeHoleIdx={activeHoleIdx}
            showWeight={showWeight}
            weightMass={weightMass}
            showLines={showLines}
            cx={cx}
            font={font}
          />
        )}
      </svg>
    </div>
  )
}

export default GravityBasicAnimation
