import { OPTICS_COLORS, PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { LaserPhysicsResult } from '../hooks/useLaserPhysics'

/** 暗色面板背景 (模拟接收屏/干涉屏暗室) */
const DARK_PANEL_BG = '#0B0F19'
const DARK_PANEL_STROKE = '#1E293B'
const DARK_SCREEN_BG = '#020617'

interface LaserSceneProps {
  physics: LaserPhysicsResult
  canvasSize: {
    font: (size: number) => number
    width: number
    height: number
  }
  sceneScale: SceneScale
  mode: number
  propagationDistance: number
  wavelength: number
  slitDistance: number
  screenDist: number
  laserPower: number
  focusDiameter: number
  material: number
}

export function LaserScene({
  physics,
  canvasSize,
  mode,
  propagationDistance,
  slitDistance,
  screenDist,
  focusDiameter,
  material,
}: LaserSceneProps) {
  const { font } = canvasSize

  // 1. 基准参考线和坐标
  const centerY = 162.5 // splitV 画布高度 325 的中线
  const normalY = 75    // 模式 0/1 的普通光通道中心
  const laserY = 250    // 模式 0/1 的激光通道中心

  // ==========================================
  // Mode 0: 平行性对比 (Directionality)
  // ==========================================
  const renderDirectionality = () => {
    const startX = 60
    const screenX = 540 // 侧视接收屏位置

    // 根据传播距离线性映射光斑的位置和尺寸
    // 虽然物理上是 0~100m，在视觉上我们从左边传播到右边的屏幕
    const maxR_laser = physics.laserSpotRadius * 1500  // 放大视觉效果
    const maxR_normal = physics.normalSpotRadius * 2.8 // 普通光发散极快，做折线缩放防止溢出

    const r0_laser = 5
    const r0_normal = 8

    const rEnd_laser = Math.min(25, r0_laser + maxR_laser)
    const rEnd_normal = Math.min(100, r0_normal + maxR_normal)

    // 光斑正视投影的坐标
    const projX = 680
    const projNormalY = 85
    const projLaserY = 240

    // 计算激光在正视图中的圆半径
    // 物理半径是 laserSpotRadius / normalSpotRadius
    // 激光束 1mm 到几 cm，普通光束 1mm 到十几米。我们使用 logarithmic 或者是合适的比例显示
    const projRadiusLaser = Math.max(3, Math.min(40, physics.laserSpotRadius * 800))
    const projRadiusNormal = Math.max(10, Math.min(75, physics.normalSpotRadius * 8))

    return (
      <g>
        {/* ── 通道分隔线 ── */}
        <line x1={0} y1={centerY} x2={screenX} y2={centerY} stroke={OPTICS_COLORS.mirrorStroke} strokeDasharray="5 5" opacity={0.3} />

        {/* ── 普通光路 ── */}
        <text x={startX} y={normalY - 45} fontSize={font(12)} fill={OPTICS_COLORS.lightRayNormal} fontWeight="bold">普通光源 (手电筒)</text>
        {/* 普通光发射器 */}
        <rect x={startX - 30} y={normalY - 20} width={30} height={40} rx={3} fill={OPTICS_COLORS.mirrorStroke} stroke={CANVAS_COLORS.strokeDark} strokeWidth={2} />
        <path d={`M ${startX} ${normalY - 12} L ${startX + 8} ${normalY - 18} L ${startX + 8} ${normalY + 18} L ${startX} ${normalY + 12} Z`} fill={CANVAS_COLORS.textMuted} />
        
        {/* 普通发散光束 */}
        <polygon
          points={`${startX + 8},${normalY - r0_normal} ${screenX},${normalY - rEnd_normal} ${screenX},${normalY + rEnd_normal} ${startX + 8},${normalY + r0_normal}`}
          fill={withAlpha(OPTICS_COLORS.lightRay, 0.12)}
          stroke={withAlpha(OPTICS_COLORS.lightRay, 0.25)}
          strokeWidth={1}
        />

        {/* ── 激光光路 ── */}
        <text x={startX} y={laserY - 45} fontSize={font(12)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">相干激光器</text>
        {/* 激光器结构 */}
        <rect x={startX - 40} y={laserY - 15} width={40} height={30} rx={2} fill={CANVAS_COLORS.strokeDark} stroke={CANVAS_COLORS.strokeDark} strokeWidth={2} />
        <rect x={startX} y={laserY - 8} width={8} height={16} fill={CANVAS_COLORS.textMuted} />
        
        {/* 激光平行光束 */}
        <polygon
          points={`${startX + 8},${laserY - r0_laser} ${screenX},${laserY - rEnd_laser} ${screenX},${laserY + rEnd_laser} ${startX + 8},${laserY + r0_laser}`}
          fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.35)}
          stroke={withAlpha(OPTICS_COLORS.wavelengthRed, 0.7)}
          strokeWidth={1.5}
        />

        {/* ── 接收屏侧视面 ── */}
        <line x1={screenX} y1={10} x2={screenX} y2={centerY - 10} stroke={CANVAS_COLORS.textMuted} strokeWidth={3} />
        <line x1={screenX} y1={centerY + 10} x2={screenX} y2={315} stroke={CANVAS_COLORS.textMuted} strokeWidth={3} />

        {/* ── 右侧光斑投影正视图 ── */}
        <rect x={projX - 90} y={15} width={180} height={295} rx={8} fill={DARK_PANEL_BG} stroke={DARK_PANEL_STROKE} strokeWidth={2} />
        <text x={projX} y={35} fontSize={font(13)} fill={OPTICS_COLORS.mirror} textAnchor="middle" fontWeight="bold">接收屏光斑正视图</text>

        {/* 普通光斑投影 */}
        <circle cx={projX} cy={projNormalY} r={projRadiusNormal} fill={withAlpha(OPTICS_COLORS.lightRay, 0.4)} stroke={OPTICS_COLORS.lightRay} strokeWidth={2} />
        <text x={projX} y={projNormalY + 5} fontSize={font(11)} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
          {physics.normalSpotRadius >= 1.0 ? `${(physics.normalSpotRadius * 2).toFixed(1)} m` : `${(physics.normalSpotRadius * 200).toFixed(1)} cm`}
        </text>
        <text x={projX - 80} y={projNormalY} fontSize={font(11)} fill={CANVAS_COLORS.textMuted} dominantBaseline="middle">普通光</text>

        <line x1={projX - 80} y1={155} x2={projX + 80} y2={155} stroke={DARK_PANEL_STROKE} strokeWidth={1} />

        {/* 激光光斑投影 */}
        <circle cx={projX} cy={projLaserY} r={projRadiusLaser} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.85)} stroke={withAlpha(OPTICS_COLORS.wavelengthRed, 0.6)} strokeWidth={1.5} />
        <text x={projX} y={projLaserY + 4} fontSize={font(10)} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
          {`${(physics.laserSpotRadius * 2000).toFixed(1)} mm`}
        </text>
        <text x={projX - 80} y={projLaserY} fontSize={font(11)} fill={PHYSICS_COLORS.velocity} dominantBaseline="middle">激光</text>

        {/* 标注当前传播距离 */}
        <text x={screenX - 10} y={centerY - 8} fontSize={font(11)} fill={CANVAS_COLORS.textMuted} textAnchor="end">
          {`传播距离: ${propagationDistance.toFixed(1)} m`}
        </text>
      </g>
    )
  }

  // ==========================================
  // Mode 1: 相干性对比 (Coherence)
  // ==========================================
  const renderCoherence = () => {
    const startX = 60
    const slitX = 220
    const screenX = 520

    // 计算双缝视觉高度 (缝间距 0.1~0.5mm 映射为 10~30px 间距)
    const visSlitDist = 10 + (slitDistance - 0.1) * 50
    
    // 干涉条纹屏，我们在右侧画出两个屏（激光屏在下方，普通屏在上方）
    // 渲染条纹细带：利用 line 序列进行密集渲染
    // 激光屏 Y 范围: [laserY - 45, laserY + 45]，高度 90
    // 普通屏 Y 范围: [normalY - 45, normalY + 45]，高度 90
    const lineCount = 120
    const stripeX = 650

    return (
      <g>
        {/* ── 通道分隔线 ── */}
        <line x1={0} y1={centerY} x2={screenX} y2={centerY} stroke={OPTICS_COLORS.mirrorStroke} strokeDasharray="5 5" opacity={0.3} />

        {/* ── 激光双缝干涉光路 ── */}
        {/* 激光器 */}
        <rect x={startX - 35} y={laserY - 12} width={35} height={24} rx={2} fill={CANVAS_COLORS.strokeDark} stroke={CANVAS_COLORS.strokeDark} strokeWidth={1.5} />
        {/* 出射光束（到双缝） */}
        <polygon points={`${startX},${laserY - 4} ${slitX},${laserY - visSlitDist/2} ${slitX},${laserY + visSlitDist/2} ${startX},${laserY + 4}`} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.2)} />
        {/* 双缝后相干叠加区域 */}
        <polygon points={`${slitX},${laserY - visSlitDist/2} ${screenX},${laserY - 50} ${screenX},${laserY + 50} ${slitX},${laserY + visSlitDist/2}`} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.12)} />
        <polygon points={`${slitX},${laserY - 3} ${screenX},${laserY - 30} ${screenX},${laserY + 30} ${slitX},${laserY + 3}`} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.16)} />
        
        {/* 双缝挡板 */}
        <line x1={slitX} y1={laserY - 60} x2={slitX} y2={laserY - visSlitDist/2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={3} />
        <line x1={slitX} y1={laserY - visSlitDist/2 + 2} x2={slitX} y2={laserY + visSlitDist/2 - 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={3} />
        <line x1={slitX} y1={laserY + visSlitDist/2} x2={slitX} y2={laserY + 60} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={3} />

        {/* ── 普通红光双缝干涉光路 ── */}
        {/* 普通光源 + 滤光片 */}
        <rect x={startX - 30} y={normalY - 15} width={30} height={30} rx={2} fill={OPTICS_COLORS.mirrorStroke} stroke={CANVAS_COLORS.strokeDark} strokeWidth={1.5} />
        {/* 红色滤光片 */}
        <rect x={startX - 3} y={normalY - 12} width={6} height={24} fill={OPTICS_COLORS.wavelengthRed} opacity={0.8} />
        {/* 发散光束（普通光方向性差，到双缝已经非常弱） */}
        <polygon points={`${startX + 3},${normalY - 8} ${slitX},${normalY - 40} ${slitX},${normalY + 40} ${startX + 3},${normalY + 8}`} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.08)} />
        {/* 双缝后非相干/极弱相干光传播 */}
        <polygon points={`${slitX},${normalY - visSlitDist/2} ${screenX},${normalY - 50} ${screenX},${normalY + 50} ${slitX},${normalY + visSlitDist/2}`} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.06)} />

        {/* 双缝挡板 */}
        <line x1={slitX} y1={normalY - 60} x2={slitX} y2={normalY - visSlitDist/2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={3} />
        <line x1={slitX} y1={normalY - visSlitDist/2 + 2} x2={slitX} y2={normalY + visSlitDist/2 - 2} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={3} />
        <line x1={slitX} y1={normalY + visSlitDist/2} x2={slitX} y2={normalY + 60} stroke={OPTICS_COLORS.mirrorStroke} strokeWidth={3} />

        {/* ── 侧视接收屏 ── */}
        <line x1={screenX} y1={10} x2={screenX} y2={centerY - 10} stroke={CANVAS_COLORS.textMuted} strokeWidth={3} />
        <line x1={screenX} y1={centerY + 10} x2={screenX} y2={315} stroke={CANVAS_COLORS.textMuted} strokeWidth={3} />

        {/* ── 右侧正面干涉图样 ── */}
        <rect x={stripeX - 60} y={15} width={130} height={295} rx={8} fill={DARK_SCREEN_BG} stroke={DARK_PANEL_STROKE} strokeWidth={2} />
        <text x={stripeX} y={35} fontSize={font(13)} fill={OPTICS_COLORS.mirror} textAnchor="middle" fontWeight="bold">干涉屏正面图样</text>
        
        {/* 普通红光干涉条纹 (平坦无条纹或极弱模糊) */}
        <g>
          <text x={stripeX} y={55} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">普通红光 (相干性差)</text>
          <rect x={stripeX - 40} y={65} width={80} height={75} fill={DARK_SCREEN_BG} stroke={DARK_PANEL_STROKE} />
          {Array.from({ length: lineCount }).map((_, idx) => {
            const h = 75 / lineCount
            const yOffset = 65 + idx * h
            // 将 [0, lineCount] 映射到物理量点的索引
            const ptIdx = Math.floor((idx / lineCount) * (physics.normalInterferencePoints.length - 1))
            const pt = physics.normalInterferencePoints[ptIdx]
            const intensity = pt ? pt.y : 1.0
            
            return (
              <rect
                key={`norm-${idx}`}
                x={stripeX - 40}
                y={yOffset}
                width={80}
                height={h + 0.5}
                fill={OPTICS_COLORS.wavelengthRed}
                opacity={Math.max(0, Math.min(1, intensity * 0.45))} // 普通光强基底亮度
              />
            )
          })}
        </g>

        {/* 激光相干干涉条纹 (清晰红黑交替) */}
        <g>
          <text x={stripeX} y={170} fontSize={font(10)} fill={PHYSICS_COLORS.velocity} textAnchor="middle">相干激光 (相干性好)</text>
          <rect x={stripeX - 40} y={180} width={80} height={110} fill={DARK_SCREEN_BG} stroke={DARK_PANEL_STROKE} />
          {Array.from({ length: lineCount }).map((_, idx) => {
            const h = 110 / lineCount
            const yOffset = 180 + idx * h
            const ptIdx = Math.floor((idx / lineCount) * (physics.laserInterferencePoints.length - 1))
            const pt = physics.laserInterferencePoints[ptIdx]
            const intensity = pt ? pt.y : 1.0
            
            return (
              <rect
                key={`laser-${idx}`}
                x={stripeX - 40}
                y={yOffset}
                width={80}
                height={h + 0.5}
                fill={OPTICS_COLORS.wavelengthRed}
                opacity={Math.max(0, Math.min(1, intensity * 0.5))} // 激光干涉明暗对比极大
              />
            )
          })}
        </g>

        {/* 物理标注 */}
        <text x={slitX} y={laserY + 55} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
          {`缝宽间距 d: ${slitDistance.toFixed(2)} mm`}
        </text>
        <text x={screenX - 10} y={centerY - 8} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="end">
          {`双缝-屏距 L: ${screenDist.toFixed(1)} m`}
        </text>
      </g>
    )
  }

  // ==========================================
  // Mode 2: 高能量应用 (High Intensity - 激光切割)
  // ==========================================
  const renderHighIntensity = () => {
    const startX = 60
    const lensX = 320
    const targetX = 540 // 靶材前表面位置

    // 靶材参数配置用于视觉渲染
    const materialLabels = ['纸张', '木板', '铁板']
    // 靶材外观材质色 (场景器材，非物理量)
    const materialColors = ['#FEF3C7', '#D97706', '#94A3B8'] as const
    const materialStroke = [OPTICS_COLORS.criticalAngle, '#B45309', OPTICS_COLORS.mirrorStroke] as const

    // 聚焦光束绘制
    // 透镜的 Y 范围 [centerY - 60, centerY + 60]
    // 普通聚焦光与激光聚焦对比
    const rLens = 55
    const laserSpotRadVis = Math.max(1.5, focusDiameter / 100 * 8) // 激光焦斑视觉半径

    // 切割深度的视觉映射 (meltDepth 单位: mm，最大约 30mm)
    // 映射到设计坐标 0 ~ 80px 凹陷
    const visDepth = Math.min(80, physics.meltDepth * 3)

    // 靶材的 path。如果在被烧蚀，左侧边界会向右收缩
    // 靶材高度: 140, 顶 centerY - 70, 底 centerY + 70
    // 烧蚀口宽度为 30px (Y 轴范围 centerY - 15 到 centerY + 15)
    let targetPath = ''
    if (visDepth > 0) {
      targetPath = `M ${targetX} ${centerY - 70} 
                    L ${targetX + 120} ${centerY - 70} 
                    L ${targetX + 120} ${centerY + 70} 
                    L ${targetX} ${centerY + 70} 
                    L ${targetX} ${centerY + 16}
                    Q ${targetX + visDepth} ${centerY} ${targetX} ${centerY - 16} 
                    Z`
    } else {
      targetPath = `M ${targetX} ${centerY - 70} 
                    L ${targetX + 120} ${centerY - 70} 
                    L ${targetX + 120} ${centerY + 70} 
                    L ${targetX} ${centerY + 70} 
                    Z`
    }

    // 焦点处的红热发光颜色，根据温度映射
    // 温度 temp 从 20°C 变到 boilingPoint
    const heatRatio = Math.min(1.0, (physics.temp - 20) / Math.max(100, physics.boilingPoint - 20))
    const glowRadius = 5 + heatRatio * 25
    const glowColor = heatRatio > 0.8 ? CANVAS_COLORS.white : heatRatio > 0.4 ? OPTICS_COLORS.criticalAngle : OPTICS_COLORS.wavelengthRed

    return (
      <g>
        {/* ── 光轴 ── */}
        <line x1={0} y1={centerY} x2={targetX} y2={centerY} stroke={OPTICS_COLORS.opticalAxis} strokeWidth={1} strokeDasharray="4 4" />

        {/* ── 1. 激光器 ── */}
        <text x={startX} y={centerY - 35} fontSize={font(12)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">工业聚焦激光器</text>
        <rect x={startX - 30} y={centerY - 20} width={45} height={40} rx={3} fill={CANVAS_COLORS.strokeDark} stroke={CANVAS_COLORS.strokeDark} strokeWidth={2} />
        <rect x={startX + 15} y={centerY - 10} width={12} height={20} fill={OPTICS_COLORS.mirrorStroke} />

        {/* 平行光束 (到透镜) */}
        <rect x={startX + 27} y={centerY - 15} width={lensX - startX - 27} height={30} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.18)} />
        <line x1={startX + 27} y1={centerY - 15} x2={lensX} y2={centerY - 15} stroke={withAlpha(OPTICS_COLORS.wavelengthRed, 0.4)} strokeWidth={1} />
        <line x1={startX + 27} y1={centerY + 15} x2={lensX} y2={centerY + 15} stroke={withAlpha(OPTICS_COLORS.wavelengthRed, 0.4)} strokeWidth={1} />

        {/* ── 2. 聚焦透镜 ── */}
        <path d={`M ${lensX} ${centerY - rLens} Q ${lensX + 12} ${centerY} ${lensX} ${centerY + rLens} Q ${lensX - 12} ${centerY} ${lensX} ${centerY - rLens}`} fill={OPTICS_COLORS.lens} stroke={OPTICS_COLORS.lensStroke} strokeWidth={2.5} />
        <text x={lensX} y={centerY + rLens + 16} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">聚焦凸透镜</text>

        {/* ── 3. 聚焦光束 (从透镜到靶材表面焦点) ── */}
        <polygon
          points={`${lensX + 5},${centerY - rLens + 5} ${targetX},${centerY - laserSpotRadVis} ${targetX},${centerY + laserSpotRadVis} ${lensX + 5},${centerY + rLens - 5}`}
          fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.35)}
        />
        {/* 极亮核心光束线 */}
        <polygon
          points={`${lensX + 5},${centerY - 10} ${targetX},${centerY - 0.5} ${targetX},${centerY + 0.5} ${lensX + 5},${centerY + 10}`}
          fill={withAlpha(CANVAS_COLORS.white, 0.65)}
        />

        {/* ── 4. 靶材块 ── */}
        <path
          d={targetPath}
          fill={materialColors[material]}
          stroke={materialStroke[material]}
          strokeWidth={3}
        />
        <text x={targetX + 60} y={centerY + 95} fontSize={font(12)} fill={OPTICS_COLORS.mirrorStroke} textAnchor="middle" fontWeight="bold">
          {`靶材: ${materialLabels[material]}`}
        </text>

        {/* ── 5. 焦点热力学视觉特效 ── */}
        {heatRatio > 0.05 && (
          <g>
            {/* 红热辉光 */}
            <circle cx={targetX + visDepth} cy={centerY} r={glowRadius} fill={`url(#glowGrad-${glowColor.replace('#', '')})`} opacity={0.8} />
            
            {/* 沸腾/熔化核心亮斑 */}
            <circle cx={targetX + visDepth} cy={centerY} r={Math.max(2, laserSpotRadVis + 2)} fill={CANVAS_COLORS.white} filter="url(#glowFilter)" />
          </g>
        )}

        {/* ── 6. 喷射火花粒子 ── */}
        {physics.sparks.map((spark) => (
          <circle
            key={spark.id}
            cx={targetX + visDepth + spark.cx}
            cy={centerY + spark.cy}
            r={1.5 + spark.life * 1.5}
            fill={spark.life > 0.6 ? CANVAS_COLORS.white : spark.life > 0.3 ? OPTICS_COLORS.criticalAngle : OPTICS_COLORS.wavelengthRed}
            opacity={spark.life}
          />
        ))}

        {/* ── 7. 烟雾飘散 ── */}
        {physics.isBoiled && Array.from({ length: 6 }).map((_, i) => {
          const smokeSeed = Math.sin(physics.temp * 0.1 + i * 43) * 100
          const smokeRand = () => {
            const v = Math.sin(smokeSeed)
            return v - Math.floor(v)
          }
          const life = (physics.temp * 0.02 + i * 0.18) % 1.0
          const sx = targetX + visDepth - life * 70 - smokeRand() * 20
          const sy = centerY + (smokeRand() * 30 - 15) - life * 30
          return (
            <circle
              key={`smoke-${i}`}
              cx={sx}
              cy={sy}
              r={4 + life * 10}
              fill={OPTICS_COLORS.mirror}
              opacity={(1 - life) * 0.25}
            />
          )
        })}

        {/* 定义渐变和滤镜 */}
        <defs>
          <radialGradient id={`glowGrad-${glowColor.replace('#', '')}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="1" />
            <stop offset="50%" stopColor={glowColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 标注 */}
        <text x={targetX - 10} y={centerY - 80} fontSize={font(11)} fill={CANVAS_COLORS.dangerText} textAnchor="end" fontWeight="bold">
          {`焦点温度: ${physics.temp.toFixed(0)} °C`}
        </text>
        {physics.meltDepth > 0 && (
          <text x={targetX + 60} y={centerY - 10} fontSize={font(10)} fill={CANVAS_COLORS.strokeDark} textAnchor="middle" fontWeight="bold">
            {`孔深: ${physics.meltDepth.toFixed(2)} mm`}
          </text>
        )}
      </g>
    )
  }

  // ==========================================
  // 主分流渲染
  // ==========================================
  return (
    <g>
      {mode === 0 && renderDirectionality()}
      {mode === 1 && renderCoherence()}
      {mode === 2 && renderHighIntensity()}
    </g>
  )
}
