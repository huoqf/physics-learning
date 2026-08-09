import { OPTICS_COLORS, PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { LaserPhysicsResult } from '../hooks/useLaserPhysics'

/** 科学实验室清爽明亮面板调色 (引自统一 Theme Token) */
const PANEL_BG = CANVAS_COLORS.gridSubtle
const PANEL_STROKE = CANVAS_COLORS.axis
const PLOT_BG = CANVAS_COLORS.white
const STRIPE_DARK_BOX = CANVAS_COLORS.strokeDark

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
  divergenceAngleNormal: number
  wavelength: number
  slitDistance: number
  screenDist: number
  laserPower: number
  focusDiameter: number
  material: number
  time: number
}

export function LaserScene({
  physics,
  canvasSize,
  mode,
  propagationDistance,
  divergenceAngleNormal,
  slitDistance,
  screenDist,
  focusDiameter,
  material,
  time,
}: LaserSceneProps) {
  const { font } = canvasSize

  const modeVal = Number(mode ?? 0)
  const materialVal = Number(material ?? 0)

  // 1. 基准参考线和坐标
  const centerY = 162.5 // splitV 画布高度 325 的中线
  const normalY = 75    // 模式 0/1 的普通光通道中心
  const laserY = 250    // 模式 0/1 的激光通道中心
  // ==========================================
  // 矢量 Mini-Plot 图表卡片 (嵌入 840 × 325 矢量坐标)
  // ==========================================
  const renderMiniPlotMode0 = () => {
    const boxX = 570
    const boxY = 15
    const boxW = 250
    const boxH = 140
    
    const plotX = boxX + 35
    const plotY = boxY + 28
    const plotW = 200
    const plotH = 88

    const pts = physics.divergenceChartPoints
    const laserDPath = pts.map((pt, idx) => {
      const px = plotX + (pt.x / 100) * plotW
      const py = plotY + plotH - Math.min(1.0, pt.y / 25) * plotH
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
    }).join(' ')

    const normalPath = Array.from({ length: 20 }).map((_, idx) => {
      const d = (idx / 19) * 100
      const r0 = 1.0
      const thetaNorm = (divergenceAngleNormal * Math.PI / 180) / 2
      const rN = (r0 + d * Math.tan(thetaNorm) * 1000)
      const px = plotX + (d / 100) * plotW
      const py = plotY + plotH - Math.min(1.0, rN / 25) * plotH
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
    }).join(' ')

    const curX = plotX + (propagationDistance / 100) * plotW
    const curR_Laser = physics.laserSpotRadius * 1000 // mm
    const curY = plotY + plotH - Math.min(1.0, curR_Laser / 25) * plotH

    return (
      <g>
        <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={6} fill={PLOT_BG} stroke={PANEL_STROKE} strokeWidth={1} />
        <text x={boxX + 10} y={boxY + 18} fontSize={font(11)} fill={CANVAS_COLORS.labelText} fontWeight="bold">光斑半径 R - 传播距离 d 关系</text>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />

        <text x={plotX - 4} y={plotY + 8} fontSize={font(8)} fill={CANVAS_COLORS.textMuted} textAnchor="end">R(mm)</text>
        <text x={plotX + plotW} y={plotY + plotH + 10} fontSize={font(8)} fill={CANVAS_COLORS.textMuted} textAnchor="end">d(m)</text>

        <path d={normalPath} fill="none" stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray="3 3" />
        <path d={laserDPath} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={2} />

        <circle cx={curX} cy={curY} r={3.5} fill={CANVAS_COLORS.white} stroke={PHYSICS_COLORS.velocity} strokeWidth={2} />
        <line x1={curX} y1={plotY} x2={curX} y2={plotY + plotH} stroke={CANVAS_COLORS.textMuted} strokeDasharray="2 2" opacity={0.6} />

        {/* 图例 */}
        <line x1={boxX + 160} y1={boxY + 15} x2={boxX + 175} y2={boxY + 15} stroke={PHYSICS_COLORS.velocity} strokeWidth={2} />
        <text x={boxX + 180} y={boxY + 18} fontSize={font(8)} fill={CANVAS_COLORS.textMuted}>激光</text>
        <line x1={boxX + 205} y1={boxY + 15} x2={boxX + 220} y2={boxY + 15} stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray="2 2" />
        <text x={boxX + 225} y={boxY + 18} fontSize={font(8)} fill={CANVAS_COLORS.textMuted}>普通光</text>
      </g>
    )
  }

  const renderMiniPlotMode1 = () => {
    const boxX = 570
    const boxY = 15
    const boxW = 250
    const boxH = 140
    
    const plotX = boxX + 35
    const plotY = boxY + 28
    const plotW = 200
    const plotH = 88

    const laserPath = physics.laserInterferencePoints.map((pt, idx) => {
      const px = plotX + ((pt.x + 5) / 10) * plotW
      const py = plotY + plotH - Math.min(1.0, pt.y / 2.2) * plotH
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
    }).join(' ')

    const normalPath = physics.normalInterferencePoints.map((pt, idx) => {
      const px = plotX + ((pt.x + 5) / 10) * plotW
      const py = plotY + plotH - Math.min(1.0, pt.y / 2.2) * plotH
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
    }).join(' ')

    return (
      <g>
        <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={6} fill={PLOT_BG} stroke={PANEL_STROKE} strokeWidth={1} />
        <text x={boxX + 10} y={boxY + 18} fontSize={font(11)} fill={CANVAS_COLORS.labelText} fontWeight="bold">双缝干涉相对光强分布 I(y)</text>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />

        <text x={plotX - 4} y={plotY + 8} fontSize={font(8)} fill={CANVAS_COLORS.textMuted} textAnchor="end">I</text>
        <text x={plotX + plotW} y={plotY + plotH + 10} fontSize={font(8)} fill={CANVAS_COLORS.textMuted} textAnchor="end">y(mm)</text>

        <path d={normalPath} fill="none" stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray="3 3" />
        <path d={laserPath} fill="none" stroke={OPTICS_COLORS.wavelengthRed} strokeWidth={2} />
      </g>
    )
  }

  const renderMiniPlotMode2 = () => {
    const boxX = 570
    const boxY = 15
    const boxW = 250
    const boxH = 295
    
    const plotX = boxX + 40
    const plotY = boxY + 35
    const plotW = 195
    const plotH = 235

    const maxT = Math.max(400, physics.boilingPoint + 300)
    const pts = physics.tempChartPoints

    const tPath = pts.map((pt, idx) => {
      const px = plotX + (pt.x / 10) * plotW
      const py = plotY + plotH - Math.min(1.0, pt.y / maxT) * plotH
      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`
    }).join(' ')

    const curX = plotX + Math.min(1.0, time / 10) * plotW
    const curY = plotY + plotH - Math.min(1.0, physics.temp / maxT) * plotH

    return (
      <g>
        <rect x={boxX} y={boxY} width={boxW} height={boxH} rx={8} fill={PLOT_BG} stroke={PANEL_STROKE} strokeWidth={1.5} />
        <text x={boxX + 12} y={boxY + 22} fontSize={font(12)} fill={CANVAS_COLORS.labelText} fontWeight="bold">焦点区域温度 T(t) 变化曲线</text>

        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} />

        <text x={plotX - 4} y={plotY + 8} fontSize={font(9)} fill={CANVAS_COLORS.textMuted} textAnchor="end">T(°C)</text>
        <text x={plotX + plotW} y={plotY + plotH + 12} fontSize={font(9)} fill={CANVAS_COLORS.textMuted} textAnchor="end">t(s)</text>

        {/* 熔点线 */}
        {physics.meltingPoint > 0 && (
          <g>
            <line
              x1={plotX}
              y1={plotY + plotH - (physics.meltingPoint / maxT) * plotH}
              x2={plotX + plotW}
              y2={plotY + plotH - (physics.meltingPoint / maxT) * plotH}
              stroke={OPTICS_COLORS.wavelengthBlue}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={plotX + 5}
              y={plotY + plotH - (physics.meltingPoint / maxT) * plotH - 3}
              fontSize={font(8)}
              fill={OPTICS_COLORS.wavelengthBlue}
            >
              {`熔点: ${physics.meltingPoint}°C`}
            </text>
          </g>
        )}

        {/* 沸点线 */}
        {physics.boilingPoint > 0 && (
          <g>
            <line
              x1={plotX}
              y1={plotY + plotH - (physics.boilingPoint / maxT) * plotH}
              x2={plotX + plotW}
              y2={plotY + plotH - (physics.boilingPoint / maxT) * plotH}
              stroke={OPTICS_COLORS.wavelengthRed}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={plotX + 5}
              y={plotY + plotH - (physics.boilingPoint / maxT) * plotH - 3}
              fontSize={font(8)}
              fill={OPTICS_COLORS.wavelengthRed}
            >
              {`${materialVal === 2 ? '沸点' : '热分解/汽化点'}: ${physics.boilingPoint}°C`}
            </text>
          </g>
        )}

        {/* T-t 温度曲线 */}
        <path d={tPath} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={2} />

        {/* 实时游标指示 */}
        <circle cx={curX} cy={curY} r={4} fill={CANVAS_COLORS.white} stroke={OPTICS_COLORS.criticalAngle} strokeWidth={2} />
      </g>
    )
  }

  // ==========================================
  // Mode 0: 平行性对比 (Directionality)
  // ==========================================
  const renderDirectionality = () => {
    const startX = 60
    const screenX = 540 // 侧视接收屏位置

    const maxR_laser = physics.laserSpotRadius * 1500
    const maxR_normal = physics.normalSpotRadius * 2.8

    const r0_laser = 5
    const r0_normal = 8

    const rEnd_laser = Math.min(25, r0_laser + maxR_laser)
    const rEnd_normal = Math.min(100, r0_normal + maxR_normal)

    const projX = 690
    const projNormalY = 205
    const projLaserY = 265

    const projRadiusLaser = Math.max(3, Math.min(25, physics.laserSpotRadius * 500))
    const projRadiusNormal = Math.max(10, Math.min(45, physics.normalSpotRadius * 5))

    return (
      <g>
        {/* ── 通道分隔线 ── */}
        <line x1={0} y1={centerY} x2={screenX} y2={centerY} stroke={OPTICS_COLORS.mirrorStroke} strokeDasharray="5 5" opacity={0.3} />

        {/* ── 普通光路 ── */}
        <text x={startX} y={normalY - 45} fontSize={font(12)} fill={OPTICS_COLORS.lightRayNormal} fontWeight="bold">普通光源 (手电筒)</text>
        <rect x={startX - 30} y={normalY - 20} width={30} height={40} rx={3} fill={OPTICS_COLORS.mirrorStroke} stroke={CANVAS_COLORS.strokeDark} strokeWidth={2} />
        <path d={`M ${startX} ${normalY - 12} L ${startX + 8} ${normalY - 18} L ${startX + 8} ${normalY + 18} L ${startX} ${normalY + 12} Z`} fill={CANVAS_COLORS.textMuted} />
        
        <polygon
          points={`${startX + 8},${normalY - r0_normal} ${screenX},${normalY - rEnd_normal} ${screenX},${normalY + rEnd_normal} ${startX + 8},${normalY + r0_normal}`}
          fill={withAlpha(OPTICS_COLORS.lightRay, 0.12)}
          stroke={withAlpha(OPTICS_COLORS.lightRay, 0.25)}
          strokeWidth={1}
        />

        {/* ── 激光光路 ── */}
        <text x={startX} y={laserY - 45} fontSize={font(12)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">相干激光器</text>
        <rect x={startX - 40} y={laserY - 15} width={40} height={30} rx={2} fill={CANVAS_COLORS.strokeDark} stroke={CANVAS_COLORS.strokeDark} strokeWidth={2} />
        <rect x={startX} y={laserY - 8} width={8} height={16} fill={CANVAS_COLORS.textMuted} />
        
        <polygon
          points={`${startX + 8},${laserY - r0_laser} ${screenX},${laserY - rEnd_laser} ${screenX},${laserY + rEnd_laser} ${startX + 8},${laserY + r0_laser}`}
          fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.35)}
          stroke={withAlpha(OPTICS_COLORS.wavelengthRed, 0.7)}
          strokeWidth={1.5}
        />

        {/* ── 接收屏侧视面 ── */}
        <line x1={screenX} y1={10} x2={screenX} y2={centerY - 10} stroke={CANVAS_COLORS.textMuted} strokeWidth={3} />
        <line x1={screenX} y1={centerY + 10} x2={screenX} y2={315} stroke={CANVAS_COLORS.textMuted} strokeWidth={3} />

        {/* ── 右上：矢量 R-d 关系曲线 Mini-Plot ── */}
        {renderMiniPlotMode0()}

        {/* ── 右下：光斑投影正视图 ── */}
        <rect x={projX - 120} y={165} width={250} height={140} rx={6} fill={PANEL_BG} stroke={PANEL_STROKE} strokeWidth={1.5} />
        <text x={projX + 5} y={183} fontSize={font(11)} fill={OPTICS_COLORS.mirror} textAnchor="middle" fontWeight="bold">接收屏光斑正视图</text>

        <circle cx={projX - 45} cy={projNormalY + 30} r={projRadiusNormal} fill={withAlpha(OPTICS_COLORS.lightRay, 0.4)} stroke={OPTICS_COLORS.lightRay} strokeWidth={1.5} />
        <text x={projX - 45} y={projNormalY + 34} fontSize={font(9)} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
          {physics.normalSpotRadius >= 1.0 ? `${(physics.normalSpotRadius * 2).toFixed(1)} m` : `${(physics.normalSpotRadius * 200).toFixed(1)} cm`}
        </text>

        <circle cx={projX + 55} cy={projLaserY - 30} r={projRadiusLaser} fill={withAlpha(OPTICS_COLORS.wavelengthRed, 0.85)} stroke={withAlpha(OPTICS_COLORS.wavelengthRed, 0.6)} strokeWidth={1.5} />
        <text x={projX + 55} y={projLaserY - 26} fontSize={font(9)} fill={CANVAS_COLORS.white} textAnchor="middle" fontWeight="bold">
          {`${(physics.laserSpotRadius * 2000).toFixed(1)} mm`}
        </text>

        {/* 标注传播距离 */}
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

        {/* ── 右上：矢量 I-y 干涉光强分布 Mini-Plot ── */}
        {renderMiniPlotMode1()}

        {/* ── 右下：正面干涉图样面板 ── */}
        <rect x={stripeX - 80} y={165} width={250} height={140} rx={6} fill={PANEL_BG} stroke={PANEL_STROKE} strokeWidth={1.5} />
        <text x={stripeX + 45} y={183} fontSize={font(11)} fill={OPTICS_COLORS.mirror} textAnchor="middle" fontWeight="bold">干涉屏正面图样</text>

        {/* 普通红光干涉条纹 (微弱) */}
        <g>
          <text x={stripeX - 35} y={200} fontSize={font(9)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">普通红光</text>
          <rect x={stripeX - 70} y={208} width={70} height={85} fill={STRIPE_DARK_BOX} stroke={PANEL_STROKE} />
          {Array.from({ length: lineCount }).map((_, idx) => {
            const h = 85 / lineCount
            const yOffset = 208 + idx * h
            const ptIdx = Math.floor((idx / lineCount) * (physics.normalInterferencePoints.length - 1))
            const pt = physics.normalInterferencePoints[ptIdx]
            const intensity = pt ? pt.y : 1.0
            return (
              <rect key={`norm-${idx}`} x={stripeX - 70} y={yOffset} width={70} height={h + 0.5} fill={OPTICS_COLORS.wavelengthRed} opacity={Math.max(0, Math.min(1, intensity * 0.45))} />
            )
          })}
        </g>

        {/* 激光相干干涉条纹 */}
        <g>
          <text x={stripeX + 45} y={200} fontSize={font(9)} fill={PHYSICS_COLORS.velocity} textAnchor="middle">相干激光</text>
          <rect x={stripeX + 10} y={208} width={70} height={85} fill={STRIPE_DARK_BOX} stroke={PANEL_STROKE} />
          {Array.from({ length: lineCount }).map((_, idx) => {
            const h = 85 / lineCount
            const yOffset = 208 + idx * h
            const ptIdx = Math.floor((idx / lineCount) * (physics.laserInterferencePoints.length - 1))
            const pt = physics.laserInterferencePoints[ptIdx]
            const intensity = pt ? pt.y : 1.0
            return (
              <rect key={`laser-${idx}`} x={stripeX + 10} y={yOffset} width={70} height={85 / lineCount + 0.5} fill={OPTICS_COLORS.wavelengthRed} opacity={Math.max(0, Math.min(1, intensity * 0.5))} />
            )
          })}
        </g>

        {/* 物理标注 */}
        <text x={slitX} y={laserY + 55} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">
          {`缝宽间距 d: ${slitDistance.toFixed(2)} mm`}
        </text>
        <text x={screenX - 10} y={centerY - 8} fontSize={font(10)} fill={CANVAS_COLORS.textMuted} textAnchor="end">
          {`缝屏距离 L: ${screenDist.toFixed(1)} m`}
        </text>
      </g>
    )
  }

  // ==========================================
  // Mode 2: 高能量应用 (High Intensity - 激光切割)
  // ==========================================
  const renderHighIntensity = () => {
    const startX = 50
    const lensX = 260
    const targetX = 440 // 靶材前表面位置

    const materialLabels = ['纸张', '木板', '铁板']
    const materialFills = ['url(#materialPaperGrad)', 'url(#materialWoodGrad)', 'url(#materialIronGrad)'] as const
    const materialStrokes = [OPTICS_COLORS.criticalAngle, SCENE_COLORS.materials.labWoodGrad[3], CANVAS_COLORS.strokeDark] as const

    const rLens = 55
    const laserSpotRadVis = Math.max(1.5, focusDiameter / 100 * 8)
    const visDepth = Math.min(60, physics.meltDepth * 2.5)

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
        {/* ── 材质渐变与特效定义 ── */}
        <defs>
          {/* 0: 纸张材质 (柔和纸色) */}
          <linearGradient id="materialPaperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF7ED" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </linearGradient>

          {/* 1: 木板材质 (自然木纹，引用 SCENE_COLORS.materials.labWoodGrad) */}
          <linearGradient id="materialWoodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.labWoodGrad[0]} />
            <stop offset="35%" stopColor={SCENE_COLORS.materials.labWoodGrad[1]} />
            <stop offset="70%" stopColor={SCENE_COLORS.materials.labWoodGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.labWoodGrad[3]} />
          </linearGradient>

          {/* 2: 铁板材质 (金属重色，引用 SCENE_COLORS.materials.castIronGrad) */}
          <linearGradient id="materialIronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.castIronGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.castIronGrad[1]} />
            <stop offset="75%" stopColor={SCENE_COLORS.materials.castIronGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.castIronGrad[3]} />
          </linearGradient>

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
          fill={materialFills[materialVal]}
          stroke={materialStrokes[materialVal]}
          strokeWidth={3}
        />
        <text x={targetX + 60} y={centerY + 95} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          {`靶材: ${materialLabels[materialVal]}`}
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

        {/* ── 右侧：矢量 T-t 温度变化曲线 Mini-Plot ── */}
        {renderMiniPlotMode2()}

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
      {/* 充满 840 x 325 splitV 视口的纯白底盘 */}
      <rect x={0} y={0} width={840} height={325} fill="#FFFFFF" rx={8} />

      {modeVal === 0 && renderDirectionality()}
      {modeVal === 1 && renderCoherence()}
      {modeVal === 2 && renderHighIntensity()}
    </g>
  )
}
