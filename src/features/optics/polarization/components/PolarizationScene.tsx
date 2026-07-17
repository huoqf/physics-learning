import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { PolarizationPhysicsResult, PolarizationWavePoint } from '../hooks/usePolarizationPhysics'

/** 暗色面板背景 (相机取景器) */
const DARK_VIEWFINDER_BG = '#090d16'
const DARK_VIEWFINDER_STROKE = '#2a354f'
const DARK_VIEWFINDER_SCREEN = '#1e3a34'

interface PolarizationSceneProps {
  physics: PolarizationPhysicsResult
  canvasSize: {
    font: (size: number) => number
    width: number
    height: number
  }
  mode: number
  polarizerAngle: number
  analyzerAngle: number
  glassesAngle: number
  filterAngle: number
  sceneScale: SceneScale
}

export function PolarizationScene({
  physics,
  canvasSize,
  mode,
  polarizerAngle,
  analyzerAngle,
  glassesAngle,
  filterAngle,
}: PolarizationSceneProps) {
  const { font } = canvasSize

  // 辅助：波浪点集转 SVG path string
  const pointsToPath = (points: PolarizationWavePoint[]) => {
    if (points.length === 0) return ''
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
  }

  // ────────────────────────────────────────────────────────
  // 渲染模式 0：起偏与检偏
  // ────────────────────────────────────────────────────────
  const renderMode0 = () => {
    const centerY = 200
    const polarizerX = 220
    const analyzerX = 460
    const screenX = 700

    // 生成马吕斯定律平面直角坐标图的曲线路径
    // 夹角 theta 从 -90° 到 90°，映射到图表内 (x: 580 ~ 780, y: 530 ~ 410)
    const chartW = 200
    const chartH = 100
    const chartOrgX = 580
    const chartOrgY = 530

    // 马吕斯定律曲线 (纯数学计算，无运行时依赖)
    const curvePath = (() => {
      const pts: string[] = []
      for (let deg = -90; deg <= 90; deg += 2) {
        const rad = (deg * Math.PI) / 180
        const I = Math.pow(Math.cos(rad), 2)
        const x = chartOrgX + chartW * ((deg + 90) / 180)
        const y = chartOrgY - chartH * I
        pts.push(`${x === chartOrgX ? 'M' : 'L'} ${x} ${y}`)
      }
      return pts.join(' ')
    })()

    // 当前红点在图表上的位置
    const currentAngleDiff = polarizerAngle - analyzerAngle
    // 将夹角归化到 [-90, 90] 区间以便图表展示
    let normalizedDiff = ((currentAngleDiff + 90) % 180) - 90
    if (normalizedDiff < -90) normalizedDiff += 180
    const currentRedX = chartOrgX + chartW * ((normalizedDiff + 90) / 180)
    const currentRedY = chartOrgY - chartH * physics.intensity

    return (
      <g>
        {/* 光传播轴线 */}
        <line x1={40} y1={centerY} x2={screenX} y2={centerY} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="4 4" />

        {/* 1. 光源 */}
        <g transform={`translate(40, ${centerY})`}>
          <rect x={-30} y={-20} width={30} height={40} rx={4} fill={PHYSICS_COLORS.candleBody} stroke={PHYSICS_COLORS.candleBodyStroke} strokeWidth={1.5} />
          <circle cx={-5} cy={0} r={6} fill={PHYSICS_COLORS.wavelengthRed} />
          <text x={-15} y={35} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="middle">自然光源</text>
        </g>

        {/* 2. 自然光段 (多束偏振方向不同的波交织) */}
        {physics.naturalWaves.map((wave, idx) => (
          <path
            key={idx}
            d={pointsToPath(wave)}
            fill="none"
            stroke={PHYSICS_COLORS.wavelengthRed}
            strokeWidth={1.2}
            opacity={0.35}
            transform={`translate(0, ${centerY})`}
          />
        ))}

        {/* 3. 起偏器 */}
        <g transform={`translate(${polarizerX}, ${centerY})`}>
          {/* 外圈支架 */}
          <circle cx={0} cy={0} r={35} fill={withAlpha(PHYSICS_COLORS.lens, 0.25)} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={2.5} />
          <line x1={0} y1={-45} x2={0} y2={-35} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={2} />
          {/* 透振栅栏 (在 rotate 作用下旋转) */}
          <g transform={`rotate(${polarizerAngle})`}>
            {/* 栅栏线 */}
            {[-25, -15, -5, 5, 15, 25].map(offset => (
              <line
                key={offset}
                x1={offset}
                y1={-Math.sqrt(35 * 35 - offset * offset)}
                x2={offset}
                y2={Math.sqrt(35 * 35 - offset * offset)}
                stroke={withAlpha(PHYSICS_COLORS.lensStroke, 0.45)}
                strokeWidth={1}
              />
            ))}
            {/* 透振方向红色指示箭头线 */}
            <line x1={0} y1={-30} x2={0} y2={30} stroke={PHYSICS_COLORS.dangerDark} strokeWidth={2} strokeDasharray="3 2" />
            <path d="M -4 -25 L 0 -30 L 4 -25 M -4 25 L 0 30 L 4 25" fill="none" stroke={PHYSICS_COLORS.dangerDark} strokeWidth={2} />
          </g>
          {/* 文字标注 */}
          <text x={0} y={55} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">起偏器 P</text>
          <text x={0} y={70} fontSize={font(11)} fill={PHYSICS_COLORS.dangerDark} textAnchor="middle">{`θ₁ = ${polarizerAngle}°`}</text>
        </g>

        {/* 4. 起偏后线偏振光段 */}
        <path
          d={pointsToPath(physics.polarizedWave)}
          fill="none"
          stroke={PHYSICS_COLORS.wavelengthRed}
          strokeWidth={2}
          opacity={0.8}
          transform={`translate(0, ${centerY})`}
        />

        {/* 5. 检偏器 */}
        <g transform={`translate(${analyzerX}, ${centerY})`}>
          {/* 外圈支架 */}
          <circle cx={0} cy={0} r={35} fill={withAlpha(PHYSICS_COLORS.lens, 0.25)} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={2.5} />
          <line x1={0} y1={-45} x2={0} y2={-35} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={2} />
          {/* 透振栅栏 */}
          <g transform={`rotate(${analyzerAngle})`}>
            {[-25, -15, -5, 5, 15, 25].map(offset => (
              <line
                key={offset}
                x1={offset}
                y1={-Math.sqrt(35 * 35 - offset * offset)}
                x2={offset}
                y2={Math.sqrt(35 * 35 - offset * offset)}
                stroke={withAlpha(PHYSICS_COLORS.lensStroke, 0.45)}
                strokeWidth={1}
              />
            ))}
            {/* 透振方向红色指示轴 */}
            <line x1={0} y1={-30} x2={0} y2={30} stroke={PHYSICS_COLORS.dangerDark} strokeWidth={2} strokeDasharray="3 2" />
            <path d="M -4 -25 L 0 -30 L 4 -25 M -4 25 L 0 30 L 4 25" fill="none" stroke={PHYSICS_COLORS.dangerDark} strokeWidth={2} />
          </g>
          {/* 文字标注 */}
          <text x={0} y={55} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">检偏器 A</text>
          <text x={0} y={70} fontSize={font(11)} fill={PHYSICS_COLORS.dangerDark} textAnchor="middle">{`θ₂ = ${analyzerAngle}°`}</text>
        </g>

        {/* 6. 检偏后透射光段 */}
        {physics.intensity > 0.01 && (
          <path
            d={pointsToPath(physics.transmittedWave)}
            fill="none"
            stroke={PHYSICS_COLORS.wavelengthRed}
            strokeWidth={2}
            opacity={0.8 * physics.intensity}
            transform={`translate(0, ${centerY})`}
          />
        )}

        {/* 7. 光屏接收端 */}
        <g transform={`translate(${screenX}, ${centerY})`}>
          <rect x={0} y={-45} width={12} height={90} fill={PHYSICS_COLORS.mirrorStroke} rx={2} />
          {/* 接收光屏发光斑 */}
          <circle
            cx={6}
            cy={0}
            r={16 + 8 * physics.intensity}
            fill={`url(#screenGlow)`}
            opacity={physics.intensity}
          />
          <text x={6} y={60} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">光屏</text>
        </g>

        {/* 8. 右下角马吕斯定律图表 */}
        <g>
          {/* 图表底座背景 */}
          <rect x={550} y={380} width={250} height={200} rx={6} fill={withAlpha(CANVAS_COLORS.gridSubtle, 0.3)} stroke={CANVAS_COLORS.grid} strokeWidth={1} />
          
          {/* 标题 */}
          <text x={675} y={402} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
            马吕斯定律: I = I₀ cos²(Δθ)
          </text>

          {/* 网格虚线 */}
          <line x1={chartOrgX} y1={chartOrgY - chartH / 2} x2={chartOrgX + chartW} y2={chartOrgY - chartH / 2} stroke={CANVAS_COLORS.grid} strokeDasharray="2 2" />
          <line x1={chartOrgX + chartW / 2} y1={chartOrgY} x2={chartOrgX + chartW / 2} y2={chartOrgY - chartH} stroke={CANVAS_COLORS.grid} strokeDasharray="2 2" />
          
          {/* 坐标轴 */}
          <line x1={chartOrgX - 10} y1={chartOrgY} x2={chartOrgX + chartW + 10} y2={chartOrgY} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} />
          <line x1={chartOrgX} y1={chartOrgY + 10} x2={chartOrgX} y2={chartOrgY - chartH - 10} stroke={CANVAS_COLORS.axis} strokeWidth={1.5} />

          {/* 轴向箭头 */}
          <path d={`M ${chartOrgX + chartW + 8} ${chartOrgY - 3} L ${chartOrgX + chartW + 12} ${chartOrgY} L ${chartOrgX + chartW + 8} ${chartOrgY + 3}`} fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1.2} />
          <path d={`M ${chartOrgX - 3} ${chartOrgY - chartH - 8} L ${chartOrgX} ${chartOrgY - chartH - 12} L ${chartOrgX + 3} ${chartOrgY - chartH - 8}`} fill="none" stroke={CANVAS_COLORS.axis} strokeWidth={1.2} />
          <text x={chartOrgX + chartW + 8} y={chartOrgY + 14} fontSize={font(10)} fill={CANVAS_COLORS.labelTextLight} textAnchor="end">Δθ</text>
          <text x={chartOrgX - 6} y={chartOrgY - chartH - 4} fontSize={font(10)} fill={CANVAS_COLORS.labelTextLight}>I/I₀</text>

          {/* 轴刻度 */}
          <text x={chartOrgX} y={chartOrgY + 14} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">-90°</text>
          <text x={chartOrgX + chartW / 2} y={chartOrgY + 14} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">0°</text>
          <text x={chartOrgX + chartW} y={chartOrgY + 14} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle">90°</text>
          <text x={chartOrgX - 6} y={chartOrgY + 3} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="end">0</text>
          <text x={chartOrgX - 6} y={chartOrgY - chartH / 2 + 3} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="end">0.5</text>
          <text x={chartOrgX - 6} y={chartOrgY - chartH + 3} fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight} textAnchor="end">1.0</text>

          {/* 理论曲线 */}
          <path d={curvePath} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={1.5} opacity={0.6} />

          {/* 实时工作红点 */}
          <circle cx={currentRedX} cy={currentRedY} r={4.5} fill={PHYSICS_COLORS.dangerDark} />
          <circle cx={currentRedX} cy={currentRedY} r={7.5} fill="none" stroke={PHYSICS_COLORS.dangerDark} strokeWidth={1} opacity={0.5} />

          {/* 实时数值 */}
          <text x={chartOrgX + 15} y={chartOrgY - 75} fontSize={font(10.5)} fill={CANVAS_COLORS.labelText} fontWeight="500">
            {`当前夹角: ${Math.abs(currentAngleDiff)}°`}
          </text>
          <text x={chartOrgX + 15} y={chartOrgY - 60} fontSize={font(10.5)} fill={PHYSICS_COLORS.dangerDark} fontWeight="600">
            {`透射强度: ${(physics.intensity * 100).toFixed(1)}%`}
          </text>
        </g>

        {/* 径向渐变定义 */}
        <defs>
          <radialGradient id="screenGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PHYSICS_COLORS.wavelengthRed} stopOpacity="1" />
            <stop offset="50%" stopColor={PHYSICS_COLORS.wavelengthRed} stopOpacity="0.5" />
            <stop offset="100%" stopColor={PHYSICS_COLORS.wavelengthRed} stopOpacity="0" />
          </radialGradient>
        </defs>
      </g>
    )
  }

  // ────────────────────────────────────────────────────────
  // 渲染模式 1：3D立体眼镜
  // ────────────────────────────────────────────────────────
  const renderMode1 = () => {
    const centerY_L = 170
    const centerY_R = 350
    const glassesX = 360
    const screenX = 640

    return (
      <g>
        {/* 双光路中心虚线 */}
        <line x1={50} y1={centerY_L} x2={screenX} y2={centerY_L} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={50} y1={centerY_R} x2={screenX} y2={centerY_R} stroke={CANVAS_COLORS.grid} strokeWidth={1} strokeDasharray="3 3" />

        {/* 1. 双路光源 (左眼画面红色，右眼画面绿色，透振方向交错) */}
        {/* 左眼发射源 (y: 170) */}
        <g transform={`translate(60, ${centerY_L})`}>
          <rect x={-20} y={-15} width={30} height={30} rx={2} fill={PHYSICS_COLORS.mirror} stroke={PHYSICS_COLORS.mirrorStroke} strokeWidth={1.5} />
          <line x1={-5} y1={-10} x2={5} y2={10} stroke={PHYSICS_COLORS.wavelengthRed} strokeWidth={3} />
          <path d="M -8 -6 L -5 -10 L 0 -8 M 8 6 L 5 10 L 0 8" fill="none" stroke={PHYSICS_COLORS.wavelengthRed} strokeWidth={1.5} />
          <text x={-25} y={5} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end" fontWeight="bold">L投影</text>
          <text x={-25} y={18} fontSize={font(9.5)} fill={CANVAS_COLORS.textMuted} textAnchor="end">偏振角: +45°</text>
        </g>
        {/* 右眼发射源 (y: 350) */}
        <g transform={`translate(60, ${centerY_R})`}>
          <rect x={-20} y={-15} width={30} height={30} rx={2} fill={PHYSICS_COLORS.mirror} stroke={PHYSICS_COLORS.mirrorStroke} strokeWidth={1.5} />
          <line x1={-5} y1={10} x2={5} y2={-10} stroke={PHYSICS_COLORS.wavelengthGreen} strokeWidth={3} />
          <path d="M -8 6 L -5 10 L 0 8 M 8 -6 L 5 -10 L 0 -8" fill="none" stroke={PHYSICS_COLORS.wavelengthGreen} strokeWidth={1.5} />
          <text x={-25} y={5} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="end" fontWeight="bold">R投影</text>
          <text x={-25} y={18} fontSize={font(9.5)} fill={CANVAS_COLORS.textMuted} textAnchor="end">偏振角: -45°</text>
        </g>

        {/* 2. 入射偏振波 (左眼: +45° 红色，右眼: -45° 绿色) */}
        <path
          d={pointsToPath(physics.leftWaveL)}
          fill="none"
          stroke={PHYSICS_COLORS.wavelengthRed}
          strokeWidth={1.8}
          opacity={0.85}
          transform={`translate(0, ${centerY_L})`}
        />
        <path
          d={pointsToPath(physics.rightWaveR)}
          fill="none"
          stroke={PHYSICS_COLORS.wavelengthGreen}
          strokeWidth={1.8}
          opacity={0.85}
          transform={`translate(0, ${centerY_R})`}
        />

        {/* 3. 3D 偏振眼镜 (受 glassesAngle 控制，围绕中心 (360, 260) 旋转) */}
        <g transform={`translate(${glassesX}, 260) rotate(${glassesAngle})`}>
          {/* 镜框轮廓 */}
          <rect x={-40} y={-110} width={80} height={56} rx={12} fill="none" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={4.5} />
          <rect x={-40} y={54} width={80} height={56} rx={12} fill="none" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={4.5} />
          {/* 中间梁 */}
          <rect x={-15} y={-10} width={30} height={20} rx={2} fill="none" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={4.5} />

          {/* 左眼镜片 (物理位置在眼镜容器 Y: -90 处) */}
          <g transform="translate(0, -90)">
            <ellipse cx={0} cy={0} rx={36} ry={24} fill={withAlpha(PHYSICS_COLORS.lens, 0.3)} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={1.5} />
            {/* 栅格：默认 +45° (竖直偏振眼镜片配合投影) */}
            <g transform="rotate(45)">
              {[-16, -8, 0, 8, 16].map(offset => (
                <line key={offset} x1={offset} y1={-18} x2={offset} y2={18} stroke={withAlpha(PHYSICS_COLORS.lensStroke, 0.45)} strokeWidth={1} />
              ))}
            </g>
            {/* 透振方向指示虚线 */}
            <line x1={-20} y1={-20} x2={20} y2={20} stroke={PHYSICS_COLORS.dangerDark} strokeWidth={1.5} strokeDasharray="3 2" />
            <text x={0} y={-28} fontSize={font(10.5)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">左镜片 (透振45°)</text>
          </g>

          {/* 右眼镜片 (物理位置在眼镜容器 Y: 90 处) */}
          <g transform="translate(0, 90)">
            <ellipse cx={0} cy={0} rx={36} ry={24} fill={withAlpha(PHYSICS_COLORS.lens, 0.3)} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={1.5} />
            {/* 栅格：默认 -45° */}
            <g transform="rotate(-45)">
              {[-16, -8, 0, 8, 16].map(offset => (
                <line key={offset} x1={offset} y1={-18} x2={offset} y2={18} stroke={withAlpha(PHYSICS_COLORS.lensStroke, 0.45)} strokeWidth={1} />
              ))}
            </g>
            {/* 透振方向指示虚线 */}
            <line x1={-20} y1={20} x2={20} y2={-20} stroke={PHYSICS_COLORS.dangerDark} strokeWidth={1.5} strokeDasharray="3 2" />
            <text x={0} y={35} fontSize={font(10.5)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">右镜片 (透振-45°)</text>
          </g>
        </g>

        {/* 4. 镜片后出射波 */}
        {/* 左镜片出射路：包含透过的左光 (红波，强) 以及混入的右光 (绿波，弱，代表漏光重影) */}
        {physics.intensityLL > 0.01 && (
          <path
            d={pointsToPath(physics.leftWaveR)}
            fill="none"
            stroke={PHYSICS_COLORS.wavelengthRed}
            strokeWidth={1.8}
            opacity={0.85 * physics.intensityLL}
            transform={`translate(0, ${centerY_L})`}
          />
        )}
        {/* 漏光波形 (右投影光漏入左眼) */}
        {physics.intensityLR > 0.01 && (
          <path
            d={pointsToPath(physics.leftWaveR)} // 形状是一样的，只是颜色和强度不同
            fill="none"
            stroke={PHYSICS_COLORS.wavelengthGreen}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            opacity={0.7 * physics.intensityLR}
            transform={`translate(0, ${centerY_L + 6})`} // 稍微偏移，体现交错
          />
        )}

        {/* 右镜片出射路：包含透过的右光 (绿波，强) 以及混入的左光 (红波，弱) */}
        {physics.intensityRR > 0.01 && (
          <path
            d={pointsToPath(physics.rightWaveL)}
            fill="none"
            stroke={PHYSICS_COLORS.wavelengthGreen}
            strokeWidth={1.8}
            opacity={0.85 * physics.intensityRR}
            transform={`translate(0, ${centerY_R})`}
          />
        )}
        {/* 漏光波形 (左投影光漏入右眼) */}
        {physics.intensityRL > 0.01 && (
          <path
            d={pointsToPath(physics.rightWaveL)}
            fill="none"
            stroke={PHYSICS_COLORS.wavelengthRed}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            opacity={0.7 * physics.intensityRL}
            transform={`translate(0, ${centerY_R - 6})`}
          />
        )}

        {/* 5. 眼睛接收视口 (右侧) */}
        {/* 左眼屏幕 (看到的是一朵红花) */}
        <g transform={`translate(${screenX}, ${centerY_L})`}>
          <circle cx={40} cy={0} r={40} fill={CANVAS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={2} />
          {/* 正常图像：红花 (由5个红色圆圈和黄色花芯组成) */}
          <g opacity={physics.intensityLL} transform="scale(0.8) translate(50, -5)">
            <circle cx={-12} cy={0} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={12} cy={0} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={0} cy={-12} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={0} cy={12} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={0} cy={0} r={8} fill={PHYSICS_COLORS.wavelengthYellow} />
          </g>
          {/* 重影：绿叶 (由两个半透明的绿色扁圆组成) */}
          <g opacity={physics.intensityLR} transform="scale(0.8) translate(50, -5) rotate(15)">
            <path d="M -15 0 C -15 -15 15 -15 15 0 C 15 15 -15 15 -15 0 Z" fill={PHYSICS_COLORS.wavelengthGreen} />
            <line x1={-15} y1={0} x2={15} y2={0} stroke={CANVAS_COLORS.white} strokeWidth={1} />
          </g>

          <text x={40} y={55} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">左眼视野</text>
          <text x={40} y={70} fontSize={font(10.5)} fill={physics.intensityLR > 0.05 ? PHYSICS_COLORS.dangerDark : CANVAS_COLORS.labelTextLight} textAnchor="middle">
            {physics.intensityLR > 0.05 ? `出现重影! (漏光${(physics.intensityLR*100).toFixed(0)}%)` : '视野清晰'}
          </text>
        </g>

        {/* 右眼屏幕 (看到的是一片绿叶) */}
        <g transform={`translate(${screenX}, ${centerY_R})`}>
          <circle cx={40} cy={0} r={40} fill={CANVAS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={2} />
          {/* 正常图像：绿叶 */}
          <g opacity={physics.intensityRR} transform="scale(0.8) translate(50, -5) rotate(15)">
            <path d="M -15 0 C -15 -15 15 -15 15 0 C 15 15 -15 15 -15 0 Z" fill={PHYSICS_COLORS.wavelengthGreen} />
            <line x1={-15} y1={0} x2={15} y2={0} stroke={CANVAS_COLORS.white} strokeWidth={1} />
          </g>
          {/* 重影：红花 */}
          <g opacity={physics.intensityRL} transform="scale(0.8) translate(50, -5)">
            <circle cx={-12} cy={0} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={12} cy={0} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={0} cy={-12} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={0} cy={12} r={12} fill={PHYSICS_COLORS.wavelengthRed} />
            <circle cx={0} cy={0} r={8} fill={PHYSICS_COLORS.wavelengthYellow} />
          </g>
          
          <text x={40} y={55} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">右眼视野</text>
          <text x={40} y={70} fontSize={font(10.5)} fill={physics.intensityRL > 0.05 ? PHYSICS_COLORS.dangerDark : CANVAS_COLORS.labelTextLight} textAnchor="middle">
            {physics.intensityRL > 0.05 ? `出现重影! (漏光${(physics.intensityRL*100).toFixed(0)}%)` : '视野清晰'}
          </text>
        </g>
      </g>
    )
  }

  // ────────────────────────────────────────────────────────
  // 渲染模式 2：消除反光应用
  // ────────────────────────────────────────────────────────
  const renderMode2 = () => {
    // 太阳 (100, 100) -> 水面反射点 (280, 270) -> 偏振滤镜 (520, 170) -> 相机 (680, 170)
    // 鱼位置在 (160, 370) -> 水面反射点 (280, 270) (折射出射) -> 偏振滤镜 (520, 170)
    const sunX = 100, sunY = 90
    const reflectX = 280, reflectY = 270
    const filterX = 520, filterY = 170
    const cameraX = 660, cameraY = 170

    return (
      <g>
        {/* 1. 绘制水体和池塘 (Y: 270 ~ 440，斜切三维水面) */}
        <g>
          {/* 池底 */}
          <polygon points="60,420 380,420 320,440 20,440" fill={withAlpha(PHYSICS_COLORS.waterFill, 0.4)} />
          {/* 水体侧面填充 */}
          <polygon points="20,270 20,440 320,440 320,270" fill={withAlpha(PHYSICS_COLORS.waterFill, 0.25)} />
          {/* 水体透视主体 */}
          <polygon points="20,270 380,270 320,440 20,440" fill={withAlpha(PHYSICS_COLORS.waterFill, 0.45)} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={1} />
          {/* 边界线 */}
          <line x1={20} y1={270} x2={380} y2={270} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={2} />
          <text x={30} y={290} fontSize={font(12)} fill={PHYSICS_COLORS.lensStroke} fontWeight="bold">水面</text>
        </g>

        {/* 2. 太阳光源 */}
        <g transform={`translate(${sunX}, ${sunY})`}>
          {/* 阳光光晕 */}
          <circle cx={0} cy={0} r={24} fill={withAlpha(PHYSICS_COLORS.wavelengthYellow, 0.25)} />
          <circle cx={0} cy={0} r={14} fill={PHYSICS_COLORS.wavelengthYellow} />
          <text x={0} y={35} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="middle">太阳 (自然光)</text>
        </g>

        {/* 3. 阳光斜照光路 (自然光：黄/白多向波) */}
        <line x1={sunX} y1={sunY} x2={reflectX} y2={reflectY} stroke={PHYSICS_COLORS.lightRay} strokeWidth={3} opacity={0.6} />
        {/* 指示光箭头 */}
        <line x1={sunX} y1={sunY} x2={reflectX} y2={reflectY} stroke={CANVAS_COLORS.white} strokeWidth={1} strokeDasharray="3 3" />

        {/* 4. 水底小鱼 */}
        <g transform="translate(180, 360)">
          {/* 鱼的路径绘制 (金鱼形状) */}
          <path
            d="M -20 0 C -10 -15 15 -10 25 -2 C 30 -5 35 -10 40 -8 C 38 -2 38 2 40 8 C 35 10 30 5 25 2 C 15 10 -10 15 -20 0 Z"
            fill={PHYSICS_COLORS.focalPoint}
            stroke={PHYSICS_COLORS.candleBodyStroke}
            strokeWidth={1}
          />
          {/* 鱼尾鳍线 */}
          <path d="M 25 0 L 35 -5 M 25 0 L 35 5" stroke={PHYSICS_COLORS.candleBodyStroke} strokeWidth={1} />
          {/* 鱼眼 */}
          <circle cx={-12} cy={-2} r={2} fill={CANVAS_COLORS.strokeDark} />
          <text x={-2} y={25} fontSize={font(11)} fill={PHYSICS_COLORS.candleBodyStroke} textAnchor="middle" fontWeight="bold">小鱼</text>
        </g>

        {/* 5. 鱼射出的折射光路 (自然光，在水下折射，水中 x: 180->280) */}
        <path
          d={pointsToPath(physics.fishWave)}
          fill="none"
          stroke={PHYSICS_COLORS.lightRayRefracted}
          strokeWidth={1.5}
          opacity={0.8}
          transform={`translate(40, -10)`} // 稍稍偏置显示出射
        />
        {/* 折射光路主干线 */}
        <line x1={180} y1={360} x2={reflectX} y2={reflectY} stroke={PHYSICS_COLORS.lightRayRefracted} strokeWidth={2} opacity={0.5} />

        {/* 6. 水面反射光波 (反射眩光：强水平偏振光，白色) */}
        <path
          d={pointsToPath(physics.reflectionWave)}
          fill="none"
          stroke={CANVAS_COLORS.white}
          strokeWidth={2}
          opacity={0.9}
        />
        {/* 反射光路主干线 */}
        <line x1={reflectX} y1={reflectY} x2={filterX} y2={filterY} stroke={CANVAS_COLORS.white} strokeWidth={2.5} opacity={0.4} />

        {/* 水面反光示意标示 */}
        <text x={(reflectX + filterX)/2 - 15} y={(reflectY + filterY)/2 + 25} fontSize={font(11)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
          反射眩光 (水平偏振)
        </text>

        {/* 7. 相机前镜头偏振镜 */}
        <g transform={`translate(${filterX}, ${filterY})`}>
          <circle cx={0} cy={0} r={32} fill={withAlpha(PHYSICS_COLORS.lens, 0.2)} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={3} />
          <line x1={0} y1={-42} x2={0} y2={-32} stroke={PHYSICS_COLORS.lensStroke} strokeWidth={2} />
          {/* 透振栅栏，可旋转 */}
          <g transform={`rotate(${filterAngle})`}>
            {[-22, -14, -6, 6, 14, 22].map(offset => (
              <line key={offset} x1={offset} y1={-Math.sqrt(32*32-offset*offset)} x2={offset} y2={Math.sqrt(32*32-offset*offset)} stroke={withAlpha(PHYSICS_COLORS.lensStroke, 0.45)} strokeWidth={1} />
            ))}
            {/* 透振指示箭头 */}
            <line x1={0} y1={-26} x2={0} y2={26} stroke={PHYSICS_COLORS.dangerDark} strokeWidth={1.5} strokeDasharray="3 2" />
            <path d="M -3 -22 L 0 -26 L 3 -22 M -3 22 L 0 26 L 3 22" fill="none" stroke={PHYSICS_COLORS.dangerDark} strokeWidth={1.5} />
          </g>
          <text x={0} y={50} fontSize={font(11.5)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">相机偏振镜</text>
          <text x={0} y={64} fontSize={font(10.5)} fill={PHYSICS_COLORS.dangerDark} textAnchor="middle">{`透振方向: ${filterAngle}°`}</text>
        </g>

        {/* 8. 滤镜后透射光 (反射眩光减弱，鱼光透过) */}
        {physics.intensityRef > 0.01 && (
          <path
            d={pointsToPath(physics.reflectionTransmitted)}
            fill="none"
            stroke={CANVAS_COLORS.white}
            strokeWidth={1.5}
            opacity={0.8 * physics.intensityRef}
          />
        )}
        <path
          d={pointsToPath(physics.fishTransmitted)}
          fill="none"
          stroke={PHYSICS_COLORS.lightRayRefracted}
          strokeWidth={1.5}
          opacity={0.8 * physics.intensityFish}
          transform={`translate(0, 5)`} // 稍稍偏置
        />
        {/* 光线射向照相机 */}
        <line x1={filterX} y1={filterY} x2={cameraX} y2={cameraY} stroke={PHYSICS_COLORS.lightRayRefracted} strokeWidth={2} opacity={0.5} />

        {/* 9. 最右侧照相机取景器画面 */}
        <g transform={`translate(${cameraX + 20}, 240)`}>
          {/* 取景器外框 */}
          <rect x={-10} y={-10} width={160} height={130} rx={4} fill={DARK_VIEWFINDER_BG} stroke={DARK_VIEWFINDER_STROKE} strokeWidth={3.5} />
          {/* 取景器屏幕背景 (池塘底景色) */}
          <rect x={0} y={0} width={140} height={110} rx={1} fill={DARK_VIEWFINDER_SCREEN} />
          
          {/* 渲染小鱼图像 (其清晰度/不透明度不受反光影响，但对比度受反光遮罩影响) */}
          <g transform="translate(70, 55) scale(0.9)">
            <path
              d="M -20 0 C -10 -15 15 -10 25 -2 C 30 -5 35 -10 40 -8 C 38 -2 38 2 40 8 C 35 10 30 5 25 2 C 15 10 -10 15 -20 0 Z"
              fill={PHYSICS_COLORS.focalPoint}
              stroke={PHYSICS_COLORS.candleBodyStroke}
              strokeWidth={1}
            />
            <circle cx={-12} cy={-2} r={2} fill={CANVAS_COLORS.strokeDark} />
            <text x={0} y={24} fontSize={font(9.5)} fill={CANVAS_COLORS.white} textAnchor="middle">水底小鱼</text>
          </g>

          {/* 反光遮罩 (眩光遮挡小鱼)：随着 intensityRef 变大，白色雾状遮罩变浓 */}
          <rect
            x={0}
            y={0}
            width={140}
            height={110}
            fill="url(#glareMask)"
            opacity={0.85 * physics.intensityRef}
          />

          <text x={70} y={138} fontSize={font(12)} fill={CANVAS_COLORS.labelText} textAnchor="middle" fontWeight="bold">照相机取景画幅</text>
          <text x={70} y={152} fontSize={font(10.5)} fill={physics.intensityRef > 0.1 ? PHYSICS_COLORS.dangerDark : PHYSICS_COLORS.gravity} textAnchor="middle" fontWeight="500">
            {physics.intensityRef > 0.1 ? `水面强反光遮挡 (眩光${(physics.intensityRef*100).toFixed(0)}%)` : '反光完全消除！鱼身清晰'}
          </text>
        </g>

        {/* 渐变遮罩定义 */}
        <defs>
          <linearGradient id="glareMask" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={CANVAS_COLORS.white} stopOpacity="0.9" />
            <stop offset="50%" stopColor={CANVAS_COLORS.white} stopOpacity="0.7" />
            <stop offset="100%" stopColor={CANVAS_COLORS.white} stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </g>
    )
  }

  return (
    <g>
      {/* 区分三种模式进行场景绘制 */}
      {mode === 0 && renderMode0()}
      {mode === 1 && renderMode1()}
      {mode === 2 && renderMode2()}
    </g>
  )
}
