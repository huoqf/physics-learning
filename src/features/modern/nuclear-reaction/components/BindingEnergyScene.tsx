import { Ball } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { NuclearParticle } from '../model/constants'
import type { BindingEnergyPhysicsResult } from '../hooks/useBindingEnergyPhysics'

interface BindingEnergySceneProps {
  bp: BindingEnergyPhysicsResult
  showMassDefectWeight: number
  canvasSize: { font: (size: number) => number }
  sceneScale: SceneScale
}

export function BindingEnergyScene({
  bp,
  showMassDefectWeight,
  canvasSize,
  sceneScale,
}: BindingEnergySceneProps) {
  const { font } = canvasSize

  const theta = (bp.balanceAngle * Math.PI) / 180
  const { pivot, beamL, leftPlateCenter, rightPlateCenter } = bp

  const leftBeamEnd = {
    x: pivot.x - beamL * Math.cos(theta),
    y: pivot.y - beamL * Math.sin(theta),
  }
  const rightBeamEnd = {
    x: pivot.x + beamL * Math.cos(theta),
    y: pivot.y + beamL * Math.sin(theta),
  }

  const { px: pivotPx, py: pivotPy } = worldToDesign(pivot.x, pivot.y, sceneScale)
  const dPivot = { x: pivotPx, y: pivotPy }

  const { px: lbePx, py: lbePy } = worldToDesign(leftBeamEnd.x, leftBeamEnd.y, sceneScale)
  const dLeftBeamEnd = { x: lbePx, y: lbePy }

  const { px: rbePx, py: rbePy } = worldToDesign(rightBeamEnd.x, rightBeamEnd.y, sceneScale)
  const dRightBeamEnd = { x: rbePx, y: rbePy }

  const { px: lpcPx, py: lpcPy } = worldToDesign(leftPlateCenter.x, leftPlateCenter.y, sceneScale)
  const dLeftPlateCenter = { x: lpcPx, y: lpcPy }

  const { px: rpcPx, py: rpcPy } = worldToDesign(rightPlateCenter.x, rightPlateCenter.y, sceneScale)
  const dRightPlateCenter = { x: rpcPx, y: rpcPy }

  const { px: bbPx, py: bbPy } = worldToDesign(0, bp.plateY - 0.2, sceneScale)
  const dBaseBottom = { x: bbPx, y: bbPy }

  const plateW = 1.4
  const halfPlateW = plateW / 2
  const { px: lplPx, py: lplPy } = worldToDesign(leftPlateCenter.x - halfPlateW, leftPlateCenter.y, sceneScale)
  const dLeftPlateL = { x: lplPx, y: lplPy }
  const { px: lprPx, py: lprPy } = worldToDesign(leftPlateCenter.x + halfPlateW, leftPlateCenter.y, sceneScale)
  const dLeftPlateR = { x: lprPx, y: lprPy }
  const { px: rplPx, py: rplPy } = worldToDesign(rightPlateCenter.x - halfPlateW, rightPlateCenter.y, sceneScale)
  const dRightPlateL = { x: rplPx, y: rplPy }
  const { px: rprPx, py: rprPy } = worldToDesign(rightPlateCenter.x + halfPlateW, rightPlateCenter.y, sceneScale)
  const dRightPlateR = { x: rprPx, y: rprPy }

  const { px: wpPx, py: wpPy } = worldToDesign(rightPlateCenter.x, bp.weightY, sceneScale)
  const dWeightPos = { x: wpPx, y: wpPy }

  const [metal0, metal1, metal2, metal3] = SCENE_COLORS.materials.sliderMetalGrad
  const [copper0, copper1, copper2, copper3] = SCENE_COLORS.materials.anodizedCopperGrad

  return (
    <g>
      <defs>
        <linearGradient id="balance-metal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={metal1} />
          <stop offset="30%" stopColor={metal0} />
          <stop offset="70%" stopColor={metal2} />
          <stop offset="100%" stopColor={metal3} />
        </linearGradient>
        <linearGradient id="balance-metal-vertical" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={metal0} />
          <stop offset="50%" stopColor={metal2} />
          <stop offset="100%" stopColor={metal3} />
        </linearGradient>
        <linearGradient id="balance-dark-metal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={metal2} />
          <stop offset="50%" stopColor={metal3} />
          <stop offset="100%" stopColor={colors.neutral[900]} />
        </linearGradient>
        <radialGradient id="balance-copper-knob" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={copper0} />
          <stop offset="40%" stopColor={copper1} />
          <stop offset="80%" stopColor={copper2} />
          <stop offset="100%" stopColor={copper3} />
        </radialGradient>
        <radialGradient id="flash-glow">
          <stop offset="0%" stopColor={PHYSICS_COLORS.alertRed} stopOpacity={0.8} />
          <stop offset="50%" stopColor={PHYSICS_COLORS.photon} stopOpacity={0.4} />
          <stop offset="100%" stopColor={PHYSICS_COLORS.photon} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* 底座 */}
      <rect x={dBaseBottom.x - 70} y={dBaseBottom.y - 12} width={140} height={12} rx={2} fill="url(#balance-metal)" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
      <rect x={dBaseBottom.x - 50} y={dBaseBottom.y} width={100} height={8} rx={1} fill="url(#balance-dark-metal)" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1} />

      {/* 刻度盘 */}
      <path d={`M ${dPivot.x - 25} ${dPivot.y + 40} A 50 50 0 0 0 ${dPivot.x + 25} ${dPivot.y + 40}`} fill="none" stroke={CANVAS_COLORS.gridSubtle} strokeWidth={6} />
      {[-16, -8, 0, 8, 16].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x1 = dPivot.x + 36 * Math.sin(rad)
        const y1 = dPivot.y + 36 * Math.cos(rad)
        const x2 = dPivot.x + 44 * Math.sin(rad)
        const y2 = dPivot.y + 44 * Math.cos(rad)
        return (
          <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={deg === 0 ? PHYSICS_COLORS.alertRed : PHYSICS_COLORS.strokeDark} strokeWidth={deg === 0 ? 1.5 : 1} />
        )
      })}

      {/* 立柱 */}
      <rect x={dPivot.x - 6} y={dPivot.y} width={12} height={dBaseBottom.y - 12 - dPivot.y} fill="url(#balance-metal-vertical)" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
      <circle cx={dPivot.x} cy={dPivot.y} r={9} fill="url(#balance-copper-knob)" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
      <circle cx={dPivot.x} cy={dPivot.y} r={3} fill={PHYSICS_COLORS.strokeDark} />

      {/* 横梁 */}
      <line x1={dLeftBeamEnd.x} y1={dLeftBeamEnd.y} x2={dRightBeamEnd.x} y2={dRightBeamEnd.y} stroke="url(#balance-metal)" strokeWidth={6} strokeLinecap="round" />
      <line x1={dLeftBeamEnd.x} y1={dLeftBeamEnd.y} x2={dRightBeamEnd.x} y2={dRightBeamEnd.y} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1} strokeLinecap="round" fill="none" opacity={0.8} />

      {/* 指针 */}
      <line x1={dPivot.x} y1={dPivot.y} x2={dPivot.x - 42 * Math.sin(theta)} y2={dPivot.y + 42 * Math.cos(theta)} stroke={PHYSICS_COLORS.alertRed} strokeWidth={2} strokeLinecap="round" />
      <polygon
        points={`${dPivot.x - 42 * Math.sin(theta)},${dPivot.y + 42 * Math.cos(theta)} ${dPivot.x - 46 * Math.sin(theta) - 3 * Math.cos(theta)},${dPivot.y + 46 * Math.cos(theta) - 3 * Math.sin(theta)} ${dPivot.x - 46 * Math.sin(theta) + 3 * Math.cos(theta)},${dPivot.y + 46 * Math.cos(theta) + 3 * Math.sin(theta)}`}
        fill={PHYSICS_COLORS.alertRed}
      />

      {/* 左秤盘 */}
      <line x1={dLeftBeamEnd.x} y1={dLeftBeamEnd.y} x2={dLeftPlateL.x} y2={dLeftPlateL.y} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
      <line x1={dLeftBeamEnd.x} y1={dLeftBeamEnd.y} x2={dLeftPlateR.x} y2={dLeftPlateR.y} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
      <rect x={dLeftPlateL.x} y={dLeftPlateL.y} width={dLeftPlateR.x - dLeftPlateL.x} height={6} rx={2} fill="url(#balance-metal)" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />

      {/* 右秤盘 */}
      <line x1={dRightBeamEnd.x} y1={dRightBeamEnd.y} x2={dRightPlateL.x} y2={dRightPlateL.y} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
      <line x1={dRightBeamEnd.x} y1={dRightBeamEnd.y} x2={dRightPlateR.x} y2={dRightPlateR.y} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
      <rect x={dRightPlateL.x} y={dRightPlateL.y} width={dRightPlateR.x - dRightPlateL.x} height={6} rx={2} fill="url(#balance-metal)" stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />

      {/* 左盘核子 */}
      {bp.leftParticles.map((p: NuclearParticle) => {
        const { px, py } = worldToDesign(p.x, p.y, sceneScale)
        return (
          <Ball key={p.id} cx={px} cy={py} r={10} type={p.type === 'proton' ? 'planetWarm' : 'steel'} chargeSign={p.type === 'proton' ? '+' : 'none'} />
        )
      })}

      {/* 右盘核子 */}
      {bp.rightParticles.map((p: NuclearParticle) => {
        const { px, py } = worldToDesign(p.x, p.y, sceneScale)
        return (
          <Ball key={p.id} cx={px} cy={py} r={10} type={p.type === 'proton' ? 'planetWarm' : 'steel'} chargeSign={p.type === 'proton' ? '+' : 'none'} />
        )
      })}

      {/* 质量亏损砝码 */}
      {showMassDefectWeight === 1 && (
        <g transform={`translate(${dWeightPos.x}, ${dWeightPos.y - 12})`}>
          <rect x={-16} y={-14} width={32} height={26} rx={3} fill={PHYSICS_COLORS.gravity} fillOpacity={0.9} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
          <rect x={-6} y={-18} width={12} height={5} rx={1} fill={PHYSICS_COLORS.gravity} stroke={PHYSICS_COLORS.strokeDark} strokeWidth={1.5} />
          <text x={0} y={4} fontSize={font(10)} fontWeight="bold" fill={CANVAS_COLORS.white} textAnchor="middle">Δm</text>
        </g>
      )}

      {/* 闪光 */}
      {bp.showFlash && (
        <circle cx={dRightPlateCenter.x} cy={dRightPlateCenter.y - 20} r={70} fill="url(#flash-glow)" opacity={0.7} pointerEvents="none" />
      )}

      {/* 光子辐射 */}
      {bp.showPhotonEmitted && (
        <g>
          {[0, 60, 120, 180, 240, 300].map((angle, idx) => {
            const r = bp.photonProgress * 180
            const rad = (angle * Math.PI) / 180
            const cx = dRightPlateCenter.x + r * Math.cos(rad)
            const cy = dRightPlateCenter.y - 25 + r * Math.sin(rad)
            const wavePath = `M ${cx - 15 * Math.cos(rad + Math.PI/2)} ${cy - 15 * Math.sin(rad + Math.PI/2)} Q ${cx - 7 * Math.cos(rad + Math.PI/2) + 5 * Math.cos(rad)} ${cy - 7 * Math.sin(rad + Math.PI/2) + 5 * Math.sin(rad)} ${cx} ${cy} T ${cx + 15 * Math.cos(rad + Math.PI/2)} ${cy + 15 * Math.sin(rad + Math.PI/2)}`
            return (
              <g key={idx} opacity={1 - bp.photonProgress}>
                <path d={wavePath} stroke={PHYSICS_COLORS.photonUltraviolet} strokeWidth={2} fill="none" />
                <line x1={cx} y1={cy} x2={cx + 10 * Math.cos(rad)} y2={cy + 10 * Math.sin(rad)} stroke={PHYSICS_COLORS.photonUltraviolet} strokeWidth={1.5} markerEnd="url(#arrow-velocity)" />
              </g>
            )
          })}
        </g>
      )}

      {/* 质量标识 */}
      <text x={dLeftPlateCenter.x} y={dLeftPlateCenter.y + 25} fontSize={font(11)} fill={PHYSICS_COLORS.strokeDark} textAnchor="middle" fontWeight="bold">
        {`M = Z·m_p + N·m_n`}
      </text>
      <text x={dRightPlateCenter.x} y={dRightPlateCenter.y + 25} fontSize={font(11)} fill={PHYSICS_COLORS.strokeDark} textAnchor="middle" fontWeight="bold">
        {bp.isBound ? `M = M_nuc (更轻)` : `M = Z·m_p + N·m_n`}
      </text>
    </g>
  )
}
