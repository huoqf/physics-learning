import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'

const font = (size: number) => size

interface DiagramProps {
  showAnalysis?: boolean
}

// 辅助原生 SVG 矢量箭头组件（绝无外部 Context/sceneScale 崩溃风险）
const SvgArrow: React.FC<{
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  strokeWidth?: number
  label?: string
  labelPos?: 'top' | 'bottom' | 'right' | 'left'
}> = ({ x1, y1, x2, y2, color = PHYSICS_COLORS.velocity, strokeWidth = 2.5, label, labelPos = 'top' }) => {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const arrowLength = 9
  const arrowAngle = Math.PI / 6

  const p1x = x2 - arrowLength * Math.cos(angle - arrowAngle)
  const p1y = y2 - arrowLength * Math.sin(angle - arrowAngle)
  const p2x = x2 - arrowLength * Math.cos(angle + arrowAngle)
  const p2y = y2 - arrowLength * Math.sin(angle + arrowAngle)

  let labelX = (x1 + x2) / 2
  let labelY = (y1 + y2) / 2
  if (labelPos === 'top') labelY -= 8
  else if (labelPos === 'bottom') labelY += 16
  else if (labelPos === 'right') labelX += 12
  else if (labelPos === 'left') labelX -= 12

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={strokeWidth} />
      <polygon points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />
      {label && (
        <text x={labelX} y={labelY} fill={color} fontSize={font(12)} fontWeight="bold" textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  )
}

// 2. 2023高考全国乙卷第19题 (单杆切割) 纯净原图
export const Prob2023Quanguo19Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[210px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 200" className="w-full h-full block select-none">
        {/* 平行长直导轨 */}
        <line x1={80} y1={70} x2={480} y2={70} stroke="#64748B" strokeWidth={4} />
        <line x1={80} y1={150} x2={480} y2={150} stroke="#64748B" strokeWidth={4} />
        <text x={490} y={115} fill="#475569" fontSize={font(12)} fontWeight="bold">间距 L</text>
        {/* 左端电阻 R */}
        <rect x={70} y={90} width={20} height={40} fill="#E2E8F0" stroke="#334155" strokeWidth={2} />
        <text x={80} y={115} fill="#334155" fontSize={font(12)} textAnchor="middle" fontWeight="bold">R</text>
        <line x1={80} y1={70} x2={80} y2={90} stroke="#334155" strokeWidth={2} />
        <line x1={80} y1={130} x2={80} y2={150} stroke="#334155" strokeWidth={2} />
        {/* 导体棒 m, r */}
        <rect x={240} y={55} width={16} height={110} rx={4} fill="#64748B" stroke="#1E293B" strokeWidth={2} />
        <text x={248} y={114} fill="#FFFFFF" fontSize={font(11)} textAnchor="middle" fontWeight="bold">m, r</text>
        {/* 水平向右恒力 F0 矢量 */}
        <SvgArrow x1={260} y1={110} x2={340} y2={110} color="#EF4444" label="恒力 F₀" labelPos="top" />
        {/* 磁场符号标记 (匀强磁场垂直向里) */}
        {[140, 200, 310, 370, 430].map((x) =>
          [90, 130].map((y) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r={7} fill="none" stroke="#8B5CF6" strokeWidth={1} />
              <path d={`M ${x - 4} ${y - 4} L ${x + 4} ${y + 4} M ${x + 4} ${y - 4} L ${x - 4} ${y + 4}`} stroke="#8B5CF6" strokeWidth={1.5} />
            </g>
          ))
        )}
        <text x={440} y={45} fill="#8B5CF6" fontSize={font(13)} fontWeight="bold">B (匀强磁场)</text>
      </svg>
    </div>
  )
}

// 3. 2022高考全国乙卷第21题 (双杆切割) 纯净原图
export const Prob2022Quanguo21Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[210px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 200" className="w-full h-full block select-none">
        <line x1={60} y1={70} x2={500} y2={70} stroke="#64748B" strokeWidth={4} />
        <line x1={60} y1={150} x2={500} y2={150} stroke="#64748B" strokeWidth={4} />
        {/* 导体棒 a */}
        <rect x={170} y={55} width={16} height={110} rx={4} fill="#64748B" stroke="#1E293B" strokeWidth={2} />
        <text x={178} y={114} fill="#FFFFFF" fontSize={font(11)} textAnchor="middle" fontWeight="bold">棒 a (R)</text>
        <SvgArrow x1={190} y1={110} x2={260} y2={110} color="#3B82F6" label="v₀" labelPos="top" />
        {/* 导体棒 b */}
        <rect x={360} y={55} width={16} height={110} rx={4} fill="#64748B" stroke="#1E293B" strokeWidth={2} />
        <text x={368} y={114} fill="#FFFFFF" fontSize={font(11)} textAnchor="middle" fontWeight="bold">棒 b (R)</text>
        <text x={368} y={180} fill="#94A3B8" fontSize={font(12)} textAnchor="middle">(初始静止)</text>
        {/* 磁场标记 */}
        {[100, 280, 440].map((x) =>
          [90, 130].map((y) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r={7} fill="none" stroke="#8B5CF6" strokeWidth={1} />
              <path d={`M ${x - 3} ${y - 3} L ${x + 3} ${y + 3} M ${x + 3} ${y - 3} L ${x - 3} ${y + 3}`} stroke="#8B5CF6" strokeWidth={1.2} />
            </g>
          ))
        )}
        <text x={450} y={45} fill="#8B5CF6" fontSize={font(13)} fontWeight="bold">B (匀强磁场)</text>
      </svg>
    </div>
  )
}

// 4. 2023高考湖北卷第15题 (复合场) 纯净原图
export const Prob2023Hubei15Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[220px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 210" className="w-full h-full block select-none">
        {/* 坐标轴 x 与 y */}
        <line x1={40} y1={100} x2={500} y2={100} stroke="#475569" strokeWidth={2} />
        <text x={512} y={104} fill="#1E293B" fontSize={font(13)} fontWeight="bold">x</text>
        <line x1={150} y1={200} x2={150} y2={20} stroke="#475569" strokeWidth={2} />
        <text x={150} y={15} fill="#1E293B" fontSize={font(13)} fontWeight="bold">y</text>
        <text x={135} y={115} fill="#475569" fontSize={font(12)}>O</text>
        {/* y > 0 电场 E */}
        <text x={320} y={40} fill="#F59E0B" fontSize={font(12)} fontWeight="bold">y &gt; 0 匀强电场 E (沿 -y 方向)</text>
        {[200, 270, 340, 410, 480].map((x) => (
          <SvgArrow key={x} x1={x} y1={30} x2={x} y2={85} color="#F59E0B" strokeWidth={1.5} />
        ))}
        {/* y < 0 磁场 B (垂直向外) */}
        <text x={320} y={170} fill="#8B5CF6" fontSize={font(12)} fontWeight="bold">y &lt; 0 匀强磁场 B (垂直向外)</text>
        {[200, 270, 340, 410, 480].map((x) =>
          [130, 165].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="#8B5CF6" />
          ))
        )}
        {/* 粒子入射点 P(0, d) */}
        <circle cx={150} cy={50} r={5} fill="#EF4444" />
        <text x={100} y={54} fill="#1E293B" fontSize={font(12)} fontWeight="bold">P(0, d)</text>
        <SvgArrow x1={150} y1={50} x2={220} y2={50} color="#3B82F6" label="v₀" labelPos="top" />
      </svg>
    </div>
  )
}

// 5. 2022高考湖南卷第14题 (竖直弹簧) 纯净原图
export const Prob2022Hunan14Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[220px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 210" className="w-full h-full block select-none">
        {/* 地面 */}
        <line x1={150} y1={190} x2={390} y2={190} stroke="#334155" strokeWidth={3} />
        {[170, 210, 250, 290, 330, 370].map((x) => (
          <line key={x} x1={x} y1={190} x2={x - 10} y2={202} stroke="#64748B" strokeWidth={1.5} />
        ))}
        {/* 弹簧 */}
        <path d="M 270 190 L 270 150 L 282 145 L 258 135 L 282 125 L 258 115 L 270 110" fill="none" stroke="#475569" strokeWidth={3} />
        <text x={295} y={145} fill="#475569" fontSize={font(12)}>劲度系数 k</text>
        {/* 下落小球 */}
        <circle cx={270} cy={35} r={14} fill="#3B82F6" stroke="#1E293B" strokeWidth={2} />
        <text x={270} y={39} fill="#FFFFFF" fontSize={font(11)} textAnchor="middle" fontWeight="bold">m</text>
        {/* 高度 h 标注 */}
        <line x1={220} y1={35} x2={220} y2={110} stroke="#64748B" strokeWidth={1.5} strokeDasharray="3 3" />
        <line x1={215} y1={35} x2={225} y2={35} stroke="#64748B" strokeWidth={1.5} />
        <line x1={215} y1={110} x2={225} y2={110} stroke="#64748B" strokeWidth={1.5} />
        <text x={205} y={75} fill="#475569" fontSize={font(12)} textAnchor="end">高度 h</text>
      </svg>
    </div>
  )
}

// 6. 2024高考广东卷第13题 (弧形槽与滑块) 纯净原图
export const Prob2024Guangdong13Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[200px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 190" className="w-full h-full block select-none">
        {/* 地面 */}
        <line x1={60} y1={160} x2={480} y2={160} stroke="#334155" strokeWidth={3} />
        <text x={380} y={180} fill="#64748B" fontSize={font(12)}>光滑水平地面</text>
        {/* 光滑弧形槽 M */}
        <path d="M 160 50 Q 160 160 300 160 L 300 160 L 160 160 Z" fill="#E2E8F0" stroke="#334155" strokeWidth={3} />
        <text x={220} y={135} fill="#1E293B" fontSize={font(13)} fontWeight="bold">弧形槽 M</text>
        {/* 顶端小球 m */}
        <circle cx={170} cy={62} r={12} fill="#3B82F6" stroke="#1E293B" strokeWidth={2} />
        <text x={170} y={66} fill="#FFFFFF" fontSize={font(11)} textAnchor="middle" fontWeight="bold">m</text>
        {/* 高度 h 标注 */}
        <line x1={130} y1={50} x2={130} y2={160} stroke="#64748B" strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={115} y={110} fill="#475569" fontSize={font(12)}>高度 h</text>
      </svg>
    </div>
  )
}

// 7. 2023高考江苏卷第14题 (传送带) 纯净原图
export const Prob2023Jiangsu14Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[180px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 170" className="w-full h-full block select-none">
        {/* 传送带两轮与皮带 */}
        <circle cx={140} cy={100} r={24} fill="#CBD5E1" stroke="#334155" strokeWidth={2} />
        <circle cx={400} cy={100} r={24} fill="#CBD5E1" stroke="#334155" strokeWidth={2} />
        <line x1={140} y1={76} x2={400} y2={76} stroke="#334155" strokeWidth={4} />
        <line x1={140} y1={124} x2={400} y2={124} stroke="#334155" strokeWidth={4} />
        {/* A, B 端点与长度 L */}
        <text x={140} y={55} fill="#1E293B" fontSize={font(12)} fontWeight="bold" textAnchor="middle">A端</text>
        <text x={400} y={55} fill="#1E293B" fontSize={font(12)} fontWeight="bold" textAnchor="middle">B端</text>
        <line x1={140} y1={145} x2={400} y2={145} stroke="#64748B" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={270} y={160} fill="#475569" fontSize={font(12)} textAnchor="middle">传送带长度 L = 6m</text>
        {/* 物块 */}
        <rect x={140} y={46} width={36} height={30} fill="#64748B" stroke="#1E293B" strokeWidth={2} rx={2} />
        <text x={158} y={65} fill="#FFFFFF" fontSize={font(11)} textAnchor="middle" fontWeight="bold">m</text>
        {/* 传送带运行速度 v */}
        <SvgArrow x1={410} y1={100} x2={470} y2={100} color={PHYSICS_COLORS.velocity} label="v = 4m/s" labelPos="right" />
      </svg>
    </div>
  )
}

// 8. 2024高考山东卷第12题 (平抛斜面) 纯净原图
export const Prob2024Shandong12Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[200px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 190" className="w-full h-full block select-none">
        {/* 斜面 θ = 37° */}
        <polygon points="100,160 450,160 100,40" fill="#F1F5F9" stroke="#334155" strokeWidth={2} />
        <text x={140} y={152} fill="#334155" fontSize={font(12)}>θ = 37°</text>
        {/* 顶端抛出小球 */}
        <circle cx={100} cy={40} r={10} fill="#3B82F6" stroke="#1E293B" strokeWidth={2} />
        <SvgArrow x1={100} y1={40} x2={180} y2={40} color={PHYSICS_COLORS.velocity} label="v₀ = 10m/s" labelPos="top" />
      </svg>
    </div>
  )
}

// 9. 2023高考浙江卷第18题 (竖直圆周) 纯净原图
export const Prob2023Zhejiang18Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[210px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 200" className="w-full h-full block select-none">
        {/* 圆周轨迹虚线 */}
        <circle cx={270} cy={105} r={65} fill="none" stroke="#CBD5E1" strokeWidth={2} strokeDasharray="4 4" />
        <circle cx={270} cy={105} r={4} fill="#1E293B" />
        <text x={270} y={95} fill="#1E293B" fontSize={font(12)} textAnchor="middle" fontWeight="bold">O</text>
        {/* 轻绳与最高点小球 */}
        <line x1={270} y1={105} x2={270} y2={40} stroke="#64748B" strokeWidth={2} />
        <circle cx={270} cy={40} r={11} fill="#3B82F6" stroke="#1E293B" strokeWidth={2} />
        <text x={270} y={44} fill="#FFFFFF" fontSize={font(10)} textAnchor="middle">最高点</text>
        {/* 最低点小球 */}
        <circle cx={270} cy={170} r={11} fill="#94A3B8" stroke="#1E293B" strokeWidth={1.5} />
        <text x={270} y={174} fill="#FFFFFF" fontSize={font(10)} textAnchor="middle">最低点</text>
      </svg>
    </div>
  )
}

// 10. 2024高考全国新课标卷第14题 (航天变轨) 纯净原图
export const Prob2024Quanguo14Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[210px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 200" className="w-full h-full block select-none">
        {/* 地球 */}
        <circle cx={200} cy={100} r={40} fill="#3B82F6" stroke="#1D4ED8" strokeWidth={2} />
        <text x={200} y={104} fill="#FFFFFF" fontSize={font(12)} textAnchor="middle" fontWeight="bold">地球 (R)</text>
        {/* 圆形轨道 */}
        <circle cx={200} cy={100} r={75} fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 4" />
        <text x={200} y={20} fill="#475569" fontSize={font(11)} textAnchor="middle">圆轨道 (高度 h)</text>
        {/* 天宫空间站 */}
        <circle cx={200} cy={25} r={7} fill="#F59E0B" stroke="#B45309" strokeWidth={1.5} />
        <text x={235} y={28} fill="#B45309" fontSize={font(11)} fontWeight="bold">天宫空间站</text>
        {/* 椭圆转移轨道 */}
        <ellipse cx={250} cy={100} rx={125} ry={75} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={1.5} strokeDasharray="2 2" />
        <text x={380} y={104} fill={PHYSICS_COLORS.velocity} fontSize={font(11)}>椭圆转移轨道</text>
      </svg>
    </div>
  )
}

// 11. 2022高考全国甲卷第16题 (小球完全弹性碰撞) 纯净原图
export const Prob2022Quanguo16Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[180px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 170" className="w-full h-full block select-none">
        {/* 光滑水平面 */}
        <line x1={60} y1={130} x2={480} y2={130} stroke="#334155" strokeWidth={3} />
        <text x={400} y={150} fill="#64748B" fontSize={font(12)}>光滑水平面</text>
        {/* 小球 A */}
        <circle cx={160} cy={112} r={18} fill="#64748B" stroke="#1E293B" strokeWidth={2} />
        <text x={160} y={116} fill="#FFFFFF" fontSize={font(12)} textAnchor="middle" fontWeight="bold">A (m₁)</text>
        <SvgArrow x1={180} y1={112} x2={250} y2={112} color={PHYSICS_COLORS.velocity} label="v₀ = 6m/s" labelPos="top" />
        {/* 小球 B */}
        <circle cx={340} cy={108} r={22} fill="#D97706" stroke="#1E293B" strokeWidth={2} />
        <text x={340} y={112} fill="#FFFFFF" fontSize={font(12)} textAnchor="middle" fontWeight="bold">B (m₂)</text>
        <text x={340} y={150} fill={CANVAS_COLORS.labelTextLight} fontSize={font(12)} textAnchor="middle">(静止)</text>
      </svg>
    </div>
  )
}

// 12. 2023高考全国甲卷第20题 (电场偏转) 纯净原图
export const Prob2023Quanguo20Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[190px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 180" className="w-full h-full block select-none">
        {/* 平行极板 M 和 N */}
        <rect x={120} y={40} width={300} height={12} fill="#94A3B8" stroke="#1E293B" strokeWidth={1.5} />
        <text x={100} y={50} fill="#1E293B" fontSize={font(12)} fontWeight="bold">M极板 (+)</text>
        <rect x={120} y={135} width={300} height={12} fill="#94A3B8" stroke="#1E293B" strokeWidth={1.5} />
        <text x={100} y={145} fill="#1E293B" fontSize={font(12)} fontWeight="bold">N极板 (-)</text>
        {/* 中央中线 */}
        <line x1={80} y1={93} x2={460} y2={93} stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4 2" />
        {/* 入射带电粒子 */}
        <circle cx={100} cy={93} r={6} fill="#EF4444" />
        <SvgArrow x1={100} y1={93} x2={170} y2={93} color={PHYSICS_COLORS.velocity} label="v₀" labelPos="top" />
        <text x={270} y={118} fill={PHYSICS_COLORS.electricField} fontSize={font(12)}>偏转电场 U</text>
      </svg>
    </div>
  )
}

// 13. 2022高考北京卷第14题 (回旋加速器) 纯净原图
export const Prob2022Beijing14Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[210px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 200" className="w-full h-full block select-none">
        {/* D形盒 1 与 D形盒 2 */}
        <path d="M 260 30 A 70 70 0 0 0 260 170 Z" fill="#E2E8F0" stroke="#334155" strokeWidth={2} />
        <path d="M 275 30 A 70 70 0 0 1 275 170 Z" fill="#E2E8F0" stroke="#334155" strokeWidth={2} />
        <text x={220} y={105} fill="#334155" fontSize={font(12)} fontWeight="bold">D₁盒</text>
        <text x={300} y={105} fill="#334155" fontSize={font(12)} fontWeight="bold">D₂盒</text>
        {/* 缝隙交变电源 */}
        <line x1={260} y1={15} x2={275} y2={15} stroke="#8B5CF6" strokeWidth={2} />
        <text x={268} y={12} fill="#8B5CF6" fontSize={font(11)} textAnchor="middle">高频交变电压 U</text>
        <text x={360} y={50} fill={PHYSICS_COLORS.magneticField} fontSize={font(12)} fontWeight="bold">匀强磁场 B</text>
      </svg>
    </div>
  )
}

// 14. 2024高考广东卷第8题 (远距离输电) 纯净原图
export const Prob2024Guangdong8Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[190px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 180" className="w-full h-full block select-none">
        {/* 发电站 */}
        <rect x={50} y={70} width={60} height={50} fill="#E2E8F0" stroke="#334155" strokeWidth={2} rx={4} />
        <text x={80} y={98} fill="#1E293B" fontSize={font(11)} textAnchor="middle" fontWeight="bold">发电机</text>
        <text x={80} y={112} fill="#64748B" fontSize={font(10)} textAnchor="middle">P, U₁</text>
        {/* 升压变压器 */}
        <rect x={170} y={65} width={40} height={60} fill="#FEF08A" stroke="#CA8A04" strokeWidth={2} rx={2} />
        <text x={190} y={98} fill="#854D0E" fontSize={font(11)} textAnchor="middle" fontWeight="bold">n₁:n₂</text>
        {/* 输电线 R线 */}
        <line x1={210} y1={75} x2={410} y2={75} stroke={PHYSICS_COLORS.forceNet} strokeWidth={3} />
        <line x1={210} y1={115} x2={410} y2={115} stroke={PHYSICS_COLORS.forceNet} strokeWidth={3} />
        <rect x={290} y={68} width={40} height={14} fill="#FCA5A5" stroke="#DC2626" strokeWidth={1.5} />
        <text x={310} y={79} fill="#991B1B" fontSize={font(10)} textAnchor="middle">R线 = 4Ω</text>
        {/* 用户端 */}
        <rect x={410} y={70} width={60} height={50} fill="#E2E8F0" stroke="#334155" strokeWidth={2} rx={4} />
        <text x={440} y={98} fill="#1E293B" fontSize={font(11)} textAnchor="middle" fontWeight="bold">用户网络</text>
      </svg>
    </div>
  )
}

// 15. 2023高考湖南卷第7题 (波的干涉) 纯净原图
export const Prob2023Hunan7Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[190px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 180" className="w-full h-full block select-none">
        {/* 波源 S1 与 S2 */}
        <circle cx={100} cy={130} r={8} fill="#3B82F6" />
        <text x={100} y={155} fill="#1E293B" fontSize={font(12)} textAnchor="middle" fontWeight="bold">波源 S₁</text>
        <circle cx={420} cy={130} r={8} fill="#10B981" />
        <text x={420} y={155} fill="#1E293B" fontSize={font(12)} textAnchor="middle" fontWeight="bold">波源 S₂</text>
        {/* 质点 P */}
        <circle cx={240} cy={40} r={6} fill="#EF4444" />
        <text x={240} y={28} fill="#1E293B" fontSize={font(12)} textAnchor="middle" fontWeight="bold">质点 P</text>
        {/* 连线与距离 r1, r2 */}
        <line x1={100} y1={130} x2={240} y2={40} stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={155} y={75} fill="#475569" fontSize={font(11)}>r₁ = 6m</text>
        <line x1={420} y1={130} x2={240} y2={40} stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={345} y={75} fill="#475569" fontSize={font(11)}>r₂ = 5m</text>
      </svg>
    </div>
  )
}

// 16. 2024高考湖北卷第10题 (光学全反射) 纯净原图
export const Prob2024Hubei10Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[190px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 180" className="w-full h-full block select-none">
        {/* 半圆形玻璃砖 */}
        <path d="M 200 140 A 80 80 0 0 1 360 140 Z" fill="#E0F2FE" stroke="#0284C7" strokeWidth={2} />
        <line x1={200} y1={140} x2={360} y2={140} stroke="#0284C7" strokeWidth={2.5} />
        <text x={280} y={100} fill="#0369A1" fontSize={font(12)} textAnchor="middle" fontWeight="bold">折射率 n = √2</text>
        {/* 垂直入射单色光线 */}
        <SvgArrow x1={250} y1={175} x2={250} y2={140} color="#EF4444" strokeWidth={2} />
        <SvgArrow x1={310} y1={175} x2={310} y2={140} color="#EF4444" strokeWidth={2} />
        <text x={280} y={170} fill="#EF4444" fontSize={font(11)} textAnchor="middle">平行单色光束</text>
      </svg>
    </div>
  )
}

// 17. 2023高考山东卷第13题 (理想气体状态变化) 纯净原图
export const Prob2023Shandong13Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[210px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 200" className="w-full h-full block select-none">
        {/* 竖直气缸 */}
        <rect x={220} y={45} width={120} height={140} fill="#F8FAFC" stroke="#334155" strokeWidth={3} rx={2} />
        {/* 活塞 */}
        <rect x={223} y={85} width={114} height={16} fill="#64748B" stroke="#1E293B" strokeWidth={1.5} />
        <text x={280} y={97} fill="#FFFFFF" fontSize={font(11)} textAnchor="middle" fontWeight="bold">活塞 m</text>
        {/* 封闭气体 */}
        <text x={280} y={140} fill="#0F172A" fontSize={font(12)} textAnchor="middle" fontWeight="bold">封闭理想气体 (V₁, T₁)</text>
        <text x={280} y={30} fill="#475569" fontSize={font(12)} textAnchor="middle">大气压强 p₀</text>
      </svg>
    </div>
  )
}

// 18. 2024高考浙江卷第6题 (光电效应实验) 纯净原图
export const Prob2024Zhejiang6Diagram: React.FC<DiagramProps> = () => {
  return (
    <div className="w-full h-[210px] bg-white rounded-xl border border-neutral-200 p-2 overflow-hidden shadow-sm flex items-center justify-center">
      <svg viewBox="0 0 540 200" className="w-full h-full block select-none">
        {/* 光电管真空管 */}
        <ellipse cx={260} cy={85} rx={90} ry={48} fill="#F8FAFC" stroke="#0284C7" strokeWidth={2} />
        {/* 阴极 K 与 阳极 A */}
        <line x1={200} y1={55} x2={200} y2={115} stroke="#334155" strokeWidth={4} />
        <text x={190} y={89} fill="#1E293B" fontSize={font(12)} textAnchor="end" fontWeight="bold">阴极 K</text>
        <line x1={320} y1={60} x2={320} y2={110} stroke="#334155" strokeWidth={3} />
        <text x={332} y={89} fill="#1E293B" fontSize={font(12)} fontWeight="bold">阳极 A</text>
        {/* 入射单色光 */}
        <SvgArrow x1={120} y1={35} x2={190} y2={80} color="#EAB308" strokeWidth={2.5} label="单色光 ν₁" labelPos="top" />
        {/* 外电路电源与伏特表 */}
        <line x1={200} y1={115} x2={200} y2={160} stroke="#475569" strokeWidth={2} />
        <line x1={320} y1={110} x2={320} y2={160} stroke="#475569" strokeWidth={2} />
        <line x1={200} y1={160} x2={320} y2={160} stroke="#475569" strokeWidth={2} />
        <circle cx={260} cy={160} r={12} fill="#FFFFFF" stroke="#475569" strokeWidth={1.5} />
        <text x={260} y={164} fill="#1E293B" fontSize={font(11)} textAnchor="middle" fontWeight="bold">V</text>
        <text x={260} y={185} fill="#64748B" fontSize={font(10)} textAnchor="middle">遏止电压 Uc₁</text>
      </svg>
    </div>
  )
}
