import { useEffect } from 'react'
import { useAnimationViewport } from '@/hooks'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { AnimationSvgCanvas } from '@/components/Layout'
import { useAnimationStore } from '@/stores'
import { calculateExperimentEr } from '@/physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, CIRCUIT_COLORS, withAlpha } from '@/theme/physics'
import { DialMeter, Rheostat } from '@/components/Physics'

export default function ExperimentEr() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const setPhysicsState = useAnimationStore((s) => s.setPhysicsState)

  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const wiring = params.wiring ?? 0 // 0=电路甲:外接法, 1=电路乙:内接法
  const R_slider = params.R_slider ?? 10
  const E_real = 6.0
  const r_real = 2.0
  const RV = 10.0 // 教学型低阻电压表
  const RA = 1.5 // 教学型大阻值电流表

  const res = calculateExperimentEr(E_real, r_real, R_slider, wiring, RV, RA)

  // 当切换接线方式时，自动清除打点记录
  useEffect(() => {
    setPhysicsState((prev) => ({ ...prev, trajectory: [] }))
  }, [wiring, setPhysicsState])

  // ===== 粒子（电荷）沿精密折线路径流动算法 =====

  // 1. 主回路粒子插值计算
  // 从正极 (390, 240) 出发，逆时针流回负极 (220, 240)
  // 定义折线段
  const getPointOnPath = (d: number): { x: number; y: number; isGap?: boolean } => {
    const segments = [
      { p1: { x: 390, y: 240 }, p2: { x: 650, y: 240 }, len: 260 },
      { p1: { x: 650, y: 240 }, p2: { x: 650, y: 50 },  len: 190 },
      { p1: { x: 650, y: 50 },  p2: { x: 463, y: 50 },  len: 187 },
      { p1: { x: 463, y: 50 },  p2: { x: 317, y: 80 },  len: 30, isGap: true }, // 滑动变阻器内部 Gap
      { p1: { x: 317, y: 80 },  p2: { x: 317, y: 70 },  len: 10 },
      { p1: { x: 317, y: 70 },  p2: { x: 190, y: 70 },  len: 127 },
      { p1: { x: 190, y: 70 },  p2: { x: 190, y: 240 }, len: 170 },
      { p1: { x: 190, y: 240 }, p2: { x: 220, y: 240 }, len: 30 }
    ]
    let currentD = d % 1004
    for (const seg of segments) {
      if (currentD <= seg.len) {
        if (seg.isGap) return { x: -999, y: -999, isGap: true }
        const t = currentD / seg.len
        return {
          x: seg.p1.x + (seg.p2.x - seg.p1.x) * t,
          y: seg.p1.y + (seg.p2.y - seg.p1.y) * t
        }
      }
      currentD -= seg.len
    }
    return { ...segments[0].p1 }
  }

  // 2. 电路甲（外接法）电压表分流路径粒子插值计算
  // 从并联点 (450, 240) -> 经过电压表 -> 负极侧并联点 (210, 240)
  const getVShunt0Point = (d: number): { x: number; y: number; isGap?: boolean } => {
    const segments = [
      { p1: { x: 450, y: 240 }, p2: { x: 450, y: 155 }, len: 85 },
      { p1: { x: 450, y: 155 }, p2: { x: 440, y: 155 }, len: 10 },
      { p1: { x: 440, y: 155 }, p2: { x: 380, y: 155 }, len: 60, isGap: true }, // 电压表内部 Gap
      { p1: { x: 380, y: 155 }, p2: { x: 210, y: 155 }, len: 170 },
      { p1: { x: 210, y: 155 }, p2: { x: 210, y: 240 }, len: 85 }
    ]
    let currentD = d % 410
    for (const seg of segments) {
      if (currentD <= seg.len) {
        if (seg.isGap) return { x: -999, y: -999, isGap: true }
        const t = currentD / seg.len
        return {
          x: seg.p1.x + (seg.p2.x - seg.p1.x) * t,
          y: seg.p1.y + (seg.p2.y - seg.p1.y) * t
        }
      }
      currentD -= seg.len
    }
    return { ...segments[0].p1 }
  }

  // 3. 电路乙（内接法）电压表分流路径粒子插值计算
  // 从变阻器右侧并联点 (520, 50) -> 经过电压表 -> 变阻器左侧并联点 (320, 70)
  const getVShunt1Point = (d: number): { x: number; y: number; isGap?: boolean } => {
    const segments = [
      { p1: { x: 520, y: 50 },  p2: { x: 520, y: 155 }, len: 105 },
      { p1: { x: 520, y: 155 }, p2: { x: 440, y: 155 }, len: 80 },
      { p1: { x: 440, y: 155 }, p2: { x: 380, y: 155 }, len: 60, isGap: true }, // 电压表内部 Gap
      { p1: { x: 380, y: 155 }, p2: { x: 320, y: 155 }, len: 60 },
      { p1: { x: 320, y: 155 }, p2: { x: 320, y: 70 },  len: 85 }
    ]
    let currentD = d % 390
    for (const seg of segments) {
      if (currentD <= seg.len) {
        if (seg.isGap) return { x: -999, y: -999, isGap: true }
        const t = currentD / seg.len
        return {
          x: seg.p1.x + (seg.p2.x - seg.p1.x) * t,
          y: seg.p1.y + (seg.p2.y - seg.p1.y) * t
        }
      }
      currentD -= seg.len
    }
    return { ...segments[0].p1 }
  }

  // 粒子流动偏移量
  const mainSpeed = res.I_meas * 120
  const mainOffset = (time * mainSpeed) % 1004

  const vSpeed = (res.U_meas / RV) * 120
  const vOffset0 = (time * vSpeed) % 410
  const vOffset1 = (time * vSpeed) % 390

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} className="bg-white rounded-xl">
      <g>
        {/* ===== 主干路导线（拆分为精密路径，避免穿透表盘、接线完全贴合） ===== */}
        {/* 1. 左侧段：连接滑动变阻器左下接线柱(317, 80) -> 左上角(190, 70) -> 左下角(190, 240) */}
        <path 
          d="M 317 80 L 317 70 L 190 70 L 190 240" 
          fill="none" 
          stroke={withAlpha(CIRCUIT_COLORS.wire, 0.15)} 
          strokeWidth={8} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M 317 80 L 317 70 L 190 70 L 190 240" 
          fill="none" 
          stroke={CIRCUIT_COLORS.wire} 
          strokeWidth={3} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* 2. 右上段：连接滑动变阻器右上接线柱(463, 50) -> 右上角(650, 50) -> 电流表上边缘(650, 125) */}
        <path 
          d="M 463 50 L 650 50 L 650 125" 
          fill="none" 
          stroke={withAlpha(CIRCUIT_COLORS.wire, 0.15)} 
          strokeWidth={8} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M 463 50 L 650 50 L 650 125" 
          fill="none" 
          stroke={CIRCUIT_COLORS.wire} 
          strokeWidth={3} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* 3. 右下段：连接电池盒右端(390, 240) -> 右下角(650, 240) -> 电流表下边缘(650, 185) */}
        <path 
          d="M 390 240 L 650 240 L 650 185" 
          fill="none" 
          stroke={withAlpha(CIRCUIT_COLORS.wire, 0.15)} 
          strokeWidth={8} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M 390 240 L 650 240 L 650 185" 
          fill="none" 
          stroke={CIRCUIT_COLORS.wire} 
          strokeWidth={3} 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* 4. 左下段：连接左下角(190, 240) -> 电池盒左端(220, 240) */}
        <line 
          x1={190} 
          y1={240} 
          x2={220} 
          y2={240} 
          stroke={withAlpha(CIRCUIT_COLORS.wire, 0.15)} 
          strokeWidth={8} 
          strokeLinecap="round" 
        />
        <line 
          x1={190} 
          y1={240} 
          x2={220} 
          y2={240} 
          stroke={CIRCUIT_COLORS.wire} 
          strokeWidth={3} 
          strokeLinecap="round" 
        />

        {/* 待测电源电池盒区域 */}
        <rect 
          x={210} 
          y={200} 
          width={180} 
          height={60} 
          fill={withAlpha(SCENE_COLORS.materials.structBgLight, 0.4)} 
          stroke={CANVAS_COLORS.axis} 
          strokeWidth={1.5} 
          strokeDasharray="4,3" 
          rx={6} 
        />
        <text 
          x={300} 
          y={192} 
          fill={PHYSICS_COLORS.labelText} 
          fontSize={font(11)} 
          fontWeight="bold" 
          textAnchor="middle"
        >
          待测电源 (E, r)
        </text>
        
        {/* 内部电池与内阻 r */}
        <g transform="translate(220, 240)">
          <line x1={0} y1={0} x2={25} y2={0} stroke={CIRCUIT_COLORS.wire} strokeWidth={3} />
          {/* 负极 */}
          <line x1={25} y1={-10} x2={25} y2={10} stroke={CIRCUIT_COLORS.batteryNeg} strokeWidth={4} />
          <text x={25} y={-14} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} fontWeight="bold" textAnchor="middle">-</text>
          
          {/* 正极 */}
          <line x1={33} y1={-18} x2={33} y2={18} stroke={CIRCUIT_COLORS.batteryPos} strokeWidth={2.5} />
          <text x={33} y={-22} fill={CIRCUIT_COLORS.batteryPos} fontSize={font(10)} fontWeight="bold" textAnchor="middle">+</text>
          
          <line x1={33} y1={0} x2={60} y2={0} stroke={CIRCUIT_COLORS.wire} strokeWidth={3} />
          
          {/* 内阻 */}
          <rect 
            x={60} 
            y={-8} 
            width={30} 
            height={16} 
            fill={CIRCUIT_COLORS.resistorFill} 
            stroke={CIRCUIT_COLORS.resistorStroke} 
            strokeWidth={1.5} 
            rx={2}
          />
          <text 
            x={75} 
            y={4} 
            fill={CIRCUIT_COLORS.resistorStroke} 
            fontSize={font(9)} 
            fontWeight="bold" 
            textAnchor="middle"
          >
            r
          </text>
          <line x1={90} y1={0} x2={170} y2={0} stroke={CIRCUIT_COLORS.wire} strokeWidth={3} />
        </g>

        {/* 滑动变阻器 R (使用一上一下接线：左下 x=317,y=80，右上 x=463,y=50) */}
        <Rheostat x={390} y={70} value={R_slider} min={1.0} max={50} showLabel={false} />

        {/* 电流表 (A) - 串联连接在右上和右下线段之间，上边缘在(650,125)，下边缘在(650,185) */}
        <DialMeter type="A" value={res.I_meas} max={3} x={650} y={155} r={30} font={font} />
        {/* 电流表接线端子（红、黑） */}
        <circle cx={650} cy={125} r={2.5} fill={CIRCUIT_COLORS.batteryPos} />
        <circle cx={650} cy={185} r={2.5} fill={CIRCUIT_COLORS.batteryNeg} />

        {/* 根据接线方式绘制电压表连线及电表（修复悬空且增加接线柱） */}
        {wiring === 0 ? (
          // 电路甲（外接法）：电压表并联在电池两端
          <g>
            {/* 左并联线 */}
            <path d="M 210 240 L 210 155 L 380 155" fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth={2.5} />
            {/* 右并联线：从(450,240)向上折弯连接到电压表右侧(440,155) */}
            <path d="M 450 240 L 450 155 L 440 155" fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth={2.5} />
            
            {/* 并联节点圆点 */}
            <circle cx={210} cy={240} r={4} fill={CIRCUIT_COLORS.node} />
            <circle cx={450} cy={240} r={4} fill={CIRCUIT_COLORS.node} />
            
            <DialMeter type="V" value={res.U_meas} max={6} x={410} y={155} r={30} font={font} />
            
            {/* 电压表端子 */}
            <circle cx={380} cy={155} r={2.5} fill={CIRCUIT_COLORS.batteryNeg} />
            <circle cx={440} cy={155} r={2.5} fill={CIRCUIT_COLORS.batteryPos} />
          </g>
        ) : (
          // 电路乙（内接法）：电压表并联在滑动变阻器两端
          <g>
            {/* 左并联线 */}
            <path d="M 320 70 L 320 155 L 380 155" fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth={2.5} />
            {/* 右并联线：从(520,50)向下折弯连接到电压表右侧(440,155) */}
            <path d="M 520 50 L 520 155 L 440 155" fill="none" stroke={CIRCUIT_COLORS.wire} strokeWidth={2.5} />
            
            {/* 并联节点圆点 */}
            <circle cx={320} cy={70} r={4} fill={CIRCUIT_COLORS.node} />
            <circle cx={520} cy={50} r={4} fill={CIRCUIT_COLORS.node} />
            
            <DialMeter type="V" value={res.U_meas} max={6} x={410} y={155} r={30} font={font} />
            
            {/* 电压表端子 */}
            <circle cx={380} cy={155} r={2.5} fill={CIRCUIT_COLORS.batteryNeg} />
            <circle cx={440} cy={155} r={2.5} fill={CIRCUIT_COLORS.batteryPos} />
          </g>
        )}

        {/* ===== 主回路粒子流动动画（精确沿着折线插值，逆时针） ===== */}
        {res.I_meas > 0.01 && (
          <g>
            {[0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960].map((baseOffset) => {
              const curD = (baseOffset - mainOffset + 1004) % 1004
              const pt = getPointOnPath(curD)
              if (pt.isGap) return null
              const px = pt.x
              const py = pt.y

              // 过滤穿透仪器的多余像素
              if (px === 650 && py > 125 && py < 185) return null // 电流表
              if (py === 240 && px >= 218 && px <= 390) return null // 待测电源电池盒内

              return (
                <circle 
                  key={`main-pt-${baseOffset}`} 
                  cx={px} 
                  cy={py} 
                  r={3} 
                  fill={CIRCUIT_COLORS.wireActive} 
                  style={{ filter: `drop-shadow(0px 0px 2px ${CIRCUIT_COLORS.wireActive})` }} 
                />
              )
            })}
          </g>
        )}

        {/* ===== 电压表分流支路粒子流动动画（精确折线插值） ===== */}
        {res.I_meas > 0.01 && (
          <g>
            {wiring === 0 ? (
              // 1. 电路甲（外接法）电压表分流粒子
              [0, 100, 200, 300].map((baseOffset) => {
                const curD = (baseOffset - vOffset0 + 410) % 410
                const pt = getVShunt0Point(curD)
                if (pt.isGap) return null
                return (
                  <circle 
                    key={`v-shunt-0-${baseOffset}`} 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={2.5} 
                    fill={PHYSICS_COLORS.electricCurrent} 
                    style={{ filter: `drop-shadow(0px 0px 1.5px ${PHYSICS_COLORS.electricCurrent})` }} 
                  />
                )
              })
            ) : (
              // 2. 电路乙（内接法）电压表分流粒子
              [0, 130, 260].map((baseOffset) => {
                const curD = (baseOffset - vOffset1 + 390) % 390
                const pt = getVShunt1Point(curD)
                if (pt.isGap) return null
                return (
                  <circle 
                    key={`v-shunt-1-${baseOffset}`} 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={2.5} 
                    fill={PHYSICS_COLORS.electricCurrent} 
                    style={{ filter: `drop-shadow(0px 0px 1.5px ${PHYSICS_COLORS.electricCurrent})` }} 
                  />
                )
              })
            )}
          </g>
        )}
      </g>
    </AnimationSvgCanvas>
  )
}
