import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, MODERN_COLORS, withAlpha } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { Nucleon, ParticlePoint } from '../hooks/useNuclearDecayPhysics'

interface NuclearDecaySceneProps {
  mode: number
  nuclide: number
  nucleonDistance: number
  fieldType: number
  bField: number
  eField: number
  showObstacles: number
  time: number
  physics: {
    nucleons: Nucleon[]
    alphaPath: ParticlePoint[]
    betaPath: ParticlePoint[]
    gammaPath: ParticlePoint[]
    alphaPos: { x: number; y: number }
    betaPos: { x: number; y: number }
    gammaPos: { x: number; y: number }
    alphaHit: boolean
    betaHit: boolean
    gammaHit: boolean
  }
  canvasSize: {
    width: number
    height: number
    font: (size: number) => number
  }
  sceneScale: SceneScale
}

export const NuclearDecayScene: React.FC<NuclearDecaySceneProps> = ({
  mode,
  nuclide,
  nucleonDistance,
  fieldType,
  bField,
  eField,
  showObstacles,
  physics,
  canvasSize,
  sceneScale,
}) => {
  const { font } = canvasSize

  // 1. 绘制模式0：原子核的组成与强核力
  const renderMode0 = () => {
    const { nucleons } = physics

    // 判断铀-238特殊情况 (大核)
    if (nuclide === 6) {
      const center = worldToDesign(0, 0, sceneScale)
      const lines = []
      // 在核子极其靠近时绘制强相互作用金光连线 (距离小于 1.1 fm)
      for (let i = 0; i < nucleons.length; i++) {
        for (let j = i + 1; j < nucleons.length; j++) {
          const dx = nucleons[i].x - nucleons[j].x
          const dy = nucleons[i].y - nucleons[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 1.1) {
            const p1 = worldToDesign(nucleons[i].x, nucleons[i].y, sceneScale)
            const p2 = worldToDesign(nucleons[j].x, nucleons[j].y, sceneScale)
            lines.push(
              <line
                key={`line-${i}-${j}`}
                x1={p1.px}
                y1={p1.py}
                x2={p2.px}
                y2={p2.py}
                stroke={withAlpha(CANVAS_COLORS.referencePoint, 0.25)}
                strokeWidth={2}
              />
            )
          }
        }
      }

      return (
        <g>
          <circle cx={center.px} cy={center.py} r={95} fill="url(#strongForceGlow)" opacity={0.65} />
          {lines}
          {nucleons.map((n) => {
            const pos = worldToDesign(n.x, n.y, sceneScale)
            const isProton = n.type === 'proton'
            return (
              <circle
                key={n.id}
                cx={pos.px}
                cy={pos.py}
                r={13}
                fill={isProton ? 'url(#protonGrad)' : 'url(#neutronGrad)'}
                stroke={isProton ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.appliedForce}
                strokeWidth={1}
                filter="url(#sphereShadow)"
              />
            )
          })}

          <circle cx={center.px} cy={center.py} r={46} fill={withAlpha(CANVAS_COLORS.labelText, 0.85)} stroke={PHYSICS_COLORS.white} strokeWidth={2} />
          <text
            x={center.px}
            y={center.py + 6}
            fill={PHYSICS_COLORS.white}
            fontSize={font(16)}
            fontWeight="bold"
            textAnchor="middle"
          >
            ²³⁸₉₂U
          </text>

          <line x1={center.px + 40} y1={center.py - 20} x2={center.px + 130} y2={center.py - 70} stroke={CANVAS_COLORS.axis} strokeWidth={1} strokeDasharray="3,3" />
          <text x={center.px + 140} y={center.py - 75} fontSize={font(12)} fill={CANVAS_COLORS.labelText} fontWeight="bold">铀-238 原子核</text>
          <text x={center.px + 140} y={center.py - 58} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>质子数 Z = 92 (红色)</text>
          <text x={center.px + 140} y={center.py - 42} fontSize={font(11)} fill={CANVAS_COLORS.labelTextLight}>中子数 N = 146 (蓝色)</text>
        </g>
      )
    }

    // 其它核种 (A <= 14)
    const renderConnectionsAndForce = () => {
      const elements: React.ReactNode[] = []
      for (let i = 0; i < nucleons.length; i++) {
        for (let j = i + 1; j < nucleons.length; j++) {
          const dx = nucleons[i].x - nucleons[j].x
          const dy = nucleons[i].y - nucleons[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 2.5) {
            const p1 = worldToDesign(nucleons[i].x, nucleons[i].y, sceneScale)
            const p2 = worldToDesign(nucleons[j].x, nucleons[j].y, sceneScale)
            let opacity = 0
            if (dist < 0.8) {
              opacity = 0.7
            } else if (dist <= 2.0) {
              opacity = 0.9 * (1.0 - (dist - 0.8) / 1.2)
            } else {
              opacity = 0.1
            }

            elements.push(
              <line
                key={`strong-${i}-${j}`}
                x1={p1.px}
                y1={p1.py}
                x2={p2.px}
                y2={p2.py}
                stroke={dist < 0.8 ? PHYSICS_COLORS.alertRed : CANVAS_COLORS.referencePoint}
                strokeWidth={dist < 0.8 ? 2.5 : 1.8}
                strokeDasharray={dist > 2.0 ? '2,2' : undefined}
                opacity={opacity}
              />
            )
          }
        }
      }

      const protons = nucleons.filter(n => n.type === 'proton')
      if (protons.length >= 2) {
        const p1 = protons[0]
        const p2 = protons[1]
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        const forceMag = Math.min(10, 1.2 / (dist * dist))
        const dirX = dx / dist
        const dirY = dy / dist

        if (dist < 3.2) {
          elements.push(
            <g key="coulomb-force" opacity={0.85}>
              <VectorArrow
                origin={p1}
                vector={{ x: -dirX * forceMag, y: -dirY * forceMag }}
                type="force"
                sceneScale={sceneScale}
                label="F_库仑排斥"
                font={font}
              />
              <VectorArrow
                origin={p2}
                vector={{ x: dirX * forceMag, y: dirY * forceMag }}
                type="force"
                sceneScale={sceneScale}
                font={font}
              />
            </g>
          )
        }
      }

      return elements
    }

    return (
      <g>
        {nucleons.length > 1 && (
          <circle
            cx={420}
            cy={162.5}
            r={nucleons.length * 9 + 40}
            fill="url(#strongForceGlow)"
            opacity={Math.max(0.1, 0.7 * (1.0 - (nucleonDistance - 0.8) / 2.0))}
          />
        )}

        {renderConnectionsAndForce()}

        {nucleons.map((n) => {
          const pos = worldToDesign(n.x, n.y, sceneScale)
          const isProton = n.type === 'proton'
          return (
            <g key={n.id} filter="url(#sphereShadow)">
              <circle
                cx={pos.px}
                cy={pos.py}
                r={16}
                fill={isProton ? 'url(#protonGrad)' : 'url(#neutronGrad)'}
                stroke={isProton ? PHYSICS_COLORS.forceArrowRed : PHYSICS_COLORS.appliedForce}
                strokeWidth={1.2}
              />
              <text
                x={pos.px}
                y={pos.py + 4}
                fill={PHYSICS_COLORS.white}
                fontSize={font(12)}
                fontWeight="bold"
                textAnchor="middle"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {isProton ? '+' : 'n'}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  // 2. 绘制模式1：天然放射线在电磁场中偏转
  const renderMode1 = () => {
    const {
      alphaPath,
      betaPath,
      gammaPath,
      alphaPos,
      betaPos,
      gammaPos,
      alphaHit,
      betaHit,
      gammaHit,
    } = physics

    const startFieldPos = worldToDesign(-4.5, 2.5, sceneScale)
    const endFieldPos = worldToDesign(4.5, -1.5, sceneScale)
    const fieldW = endFieldPos.px - startFieldPos.px
    const fieldH = endFieldPos.py - startFieldPos.py

    const aPos = worldToDesign(alphaPos.x, alphaPos.y, sceneScale)
    const bPos = worldToDesign(betaPos.x, betaPos.y, sceneScale)
    const gPos = worldToDesign(gammaPos.x, gammaPos.y, sceneScale)

    const mapPathToDesign = (path: ParticlePoint[]) => {
      return path.map(pt => worldToDesign(pt.x, pt.y, sceneScale))
    }

    const aPathDesign = mapPathToDesign(alphaPath)
    const bPathDesign = mapPathToDesign(betaPath)
    const gPathDesign = mapPathToDesign(gammaPath)

    const getPathD = (pts: { px: number; py: number }[]) => {
      return pts.reduce((acc, pt, i) => (i === 0 ? `M ${pt.px} ${pt.py}` : `${acc} L ${pt.px} ${pt.py}`), '')
    }

    const renderFieldBackground = () => {
      if (fieldType === 2) return null

      if (fieldType === 0) {
        const isInto = bField > 0
        const markers = []
        const symbol = isInto ? '×' : '·'
        const color = isInto ? PHYSICS_COLORS.magneticFieldCross : PHYSICS_COLORS.magneticFieldDot
        
        for (let x = startFieldPos.px + 30; x < endFieldPos.px; x += 60) {
          for (let y = startFieldPos.py + 25; y < endFieldPos.py; y += 45) {
            markers.push(
              <g key={`b-${x}-${y}`} opacity={0.25}>
                {isInto ? (
                  <text x={x} y={y} fill={color} fontSize={font(16)} textAnchor="middle" fontWeight="bold">{symbol}</text>
                ) : (
                  <circle cx={x} cy={y} r={3} fill={color} />
                )}
              </g>
            )
          }
        }

        return (
          <g>
            <rect
              x={startFieldPos.px}
              y={startFieldPos.py}
              width={fieldW}
              height={fieldH}
              fill={withAlpha(PHYSICS_COLORS.magneticField, 0.05)}
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth={1}
              strokeDasharray="4,4"
              rx={6}
            />
            <text x={startFieldPos.px + 10} y={startFieldPos.py + 18} fill={PHYSICS_COLORS.magneticField} fontSize={font(11)} fontWeight="bold">
              {isInto ? '均匀磁场 B (垂直纸面向里)' : '均匀磁场 B (垂直纸面向外)'}
            </text>
            {markers}
          </g>
        )
      } else {
        const isRight = eField > 0
        const plateLeftColor = isRight ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
        const plateRightColor = isRight ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge

        return (
          <g>
            <rect
              x={startFieldPos.px}
              y={startFieldPos.py}
              width={fieldW}
              height={fieldH}
              fill={withAlpha(PHYSICS_COLORS.electricField, 0.04)}
              stroke={PHYSICS_COLORS.electricField}
              strokeWidth={1}
              strokeDasharray="4,4"
              rx={6}
            />
            <rect x={startFieldPos.px - 6} y={startFieldPos.py} width={6} height={fieldH} fill={plateLeftColor} rx={2} />
            <rect x={endFieldPos.px} y={startFieldPos.py} width={6} height={fieldH} fill={plateRightColor} rx={2} />
            
            <text x={startFieldPos.px - 12} y={startFieldPos.py + 20} fill={plateLeftColor} fontSize={font(12)} fontWeight="bold" textAnchor="end">{isRight ? '+' : '-'}</text>
            <text x={startFieldPos.px - 12} y={endFieldPos.py - 10} fill={plateLeftColor} fontSize={font(12)} fontWeight="bold" textAnchor="end">{isRight ? '+' : '-'}</text>
            <text x={endFieldPos.px + 12} y={startFieldPos.py + 20} fill={plateRightColor} fontSize={font(12)} fontWeight="bold" textAnchor="start">{isRight ? '-' : '+'}</text>
            <text x={endFieldPos.px + 12} y={endFieldPos.py - 10} fill={plateRightColor} fontSize={font(12)} fontWeight="bold" textAnchor="start">{isRight ? '-' : '+'}</text>

            <text x={startFieldPos.px + 10} y={startFieldPos.py + 18} fill={PHYSICS_COLORS.electricField} fontSize={font(11)} fontWeight="bold">
              {isRight ? '均匀电场 E (水平向右)' : '均匀电场 E (水平向左)'}
            </text>
          </g>
        )
      }
    }

    const renderObstacles = () => {
      if (showObstacles !== 1) return null

      const dPaper = worldToDesign(0, 0.0, sceneScale)
      const dAlum = worldToDesign(0, 1.0, sceneScale)
      const dLead = worldToDesign(0, 2.0, sceneScale)

      const xPaperStart = worldToDesign(-4.0, 0, sceneScale).px
      const xPaperEnd = worldToDesign(-0.8, 0, sceneScale).px

      const xAlumStart = worldToDesign(0.8, 0, sceneScale).px
      const xAlumEnd = worldToDesign(4.0, 0, sceneScale).px

      const xLeadStart = worldToDesign(-0.8, 0, sceneScale).px
      const xLeadEnd = worldToDesign(0.8, 0, sceneScale).px

      return (
        <g>
          <g>
            <line x1={xPaperStart} y1={dPaper.py} x2={xPaperEnd} y2={dPaper.py} stroke={CANVAS_COLORS.grid} strokeWidth={5} strokeLinecap="round" />
            <line x1={xPaperStart} y1={dPaper.py} x2={xPaperEnd} y2={dPaper.py} stroke={CANVAS_COLORS.trackHistory} strokeWidth={1} strokeLinecap="round" />
            <text x={(xPaperStart + xPaperEnd) / 2} y={dPaper.py - 6} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle" fontWeight="bold">纸板 (阻挡 α)</text>
          </g>

          <g>
            <line x1={xAlumStart} y1={dAlum.py} x2={xAlumEnd} y2={dAlum.py} stroke={CANVAS_COLORS.trackHistory} strokeWidth={6} strokeLinecap="round" />
            <line x1={xAlumStart} y1={dAlum.py} x2={xAlumEnd} y2={dAlum.py} stroke={CANVAS_COLORS.textMuted} strokeWidth={1} strokeLinecap="round" />
            <text x={(xAlumStart + xAlumEnd) / 2} y={dAlum.py - 6} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle" fontWeight="bold">铝板 (阻挡 β)</text>
          </g>

          <g>
            <line x1={xLeadStart} y1={dLead.py} x2={xLeadEnd} y2={dLead.py} stroke={CANVAS_COLORS.labelTextLight} strokeWidth={9} strokeLinecap="round" />
            <line x1={xLeadStart} y1={dLead.py} x2={xLeadEnd} y2={dLead.py} stroke={CANVAS_COLORS.labelText} strokeWidth={1} strokeLinecap="round" />
            <text x={(xLeadStart + xLeadEnd) / 2} y={dLead.py - 8} fill={CANVAS_COLORS.labelTextLight} fontSize={font(10)} textAnchor="middle" fontWeight="bold">厚铅板 (阻挡 γ)</text>
          </g>
        </g>
      )
    }

    return (
      <g>
        {renderFieldBackground()}
        {renderObstacles()}

        {aPathDesign.length > 1 && (
          <path d={getPathD(aPathDesign)} fill="none" stroke={PHYSICS_COLORS.positiveCharge} strokeWidth={2} opacity={0.8} />
        )}
        {bPathDesign.length > 1 && (
          <path d={getPathD(bPathDesign)} fill="none" stroke={PHYSICS_COLORS.negativeCharge} strokeWidth={1.8} opacity={0.8} strokeDasharray="3,2" />
        )}
        {gPathDesign.length > 1 && (
          <path d={getPathD(gPathDesign)} fill="none" stroke={MODERN_COLORS.photon} strokeWidth={1.6} opacity={0.8} />
        )}

        {(() => {
          const leadBoxPos = worldToDesign(0, -2.8, sceneScale)
          return (
            <g>
              <path
                d={`M ${leadBoxPos.px - 20} ${leadBoxPos.py + 40} 
                   L ${leadBoxPos.px - 20} ${leadBoxPos.py} 
                   L ${leadBoxPos.px - 5} ${leadBoxPos.py} 
                   L ${leadBoxPos.px - 5} ${leadBoxPos.py + 12} 
                   L ${leadBoxPos.px + 5} ${leadBoxPos.py + 12} 
                   L ${leadBoxPos.px + 5} ${leadBoxPos.py} 
                   L ${leadBoxPos.px + 20} ${leadBoxPos.py} 
                   L ${leadBoxPos.px + 20} ${leadBoxPos.py + 40} Z`}
                fill={CANVAS_COLORS.labelTextLight}
                stroke={CANVAS_COLORS.labelText}
                strokeWidth={2}
              />
              <path
                d={`M ${leadBoxPos.px} ${leadBoxPos.py + 16}
                   L ${leadBoxPos.px - 10} ${leadBoxPos.py + 32}
                   L ${leadBoxPos.px + 10} ${leadBoxPos.py + 32} Z`}
                fill={MODERN_COLORS.photon}
                stroke={CANVAS_COLORS.labelText}
                strokeWidth={1}
              />
              <circle cx={leadBoxPos.px} cy={leadBoxPos.py + 25} r={3} fill={CANVAS_COLORS.labelText} />
              <text x={leadBoxPos.px} y={leadBoxPos.py + 52} fill={CANVAS_COLORS.labelText} fontSize={font(10)} textAnchor="middle" fontWeight="bold">铅盒放射源</text>
            </g>
          )
        })()}

        <g opacity={alphaHit ? 0.35 : 1.0}>
          <circle cx={aPos.px} cy={aPos.py} r={8} fill="url(#protonGrad)" stroke={PHYSICS_COLORS.forceArrowRed} strokeWidth={1} filter="url(#sphereShadow)" />
          <text x={aPos.px} y={aPos.py + 3} fill={PHYSICS_COLORS.white} fontSize={font(9)} fontWeight="bold" textAnchor="middle">α</text>
        </g>

        <g opacity={betaHit ? 0.35 : 1.0}>
          <circle cx={bPos.px} cy={bPos.py} r={5} fill="url(#neutronGrad)" stroke={PHYSICS_COLORS.negativeCharge} strokeWidth={1} filter="url(#sphereShadow)" />
          <text x={bPos.px} y={bPos.py + 2.5} fill={PHYSICS_COLORS.white} fontSize={font(7)} fontWeight="bold" textAnchor="middle">β</text>
        </g>

        <g opacity={gammaHit ? 0.35 : 1.0}>
          <circle cx={gPos.px} cy={gPos.py} r={6} fill={MODERN_COLORS.photon} stroke={PHYSICS_COLORS.electricField} strokeWidth={1} />
          <line x1={gPos.px - 9} y1={gPos.py} x2={gPos.px + 9} y2={gPos.py} stroke={MODERN_COLORS.photon} strokeWidth={1} />
          <line x1={gPos.px} y1={gPos.py - 9} x2={gPos.px} y2={gPos.py + 9} stroke={MODERN_COLORS.photon} strokeWidth={1} />
          <text x={gPos.px} y={gPos.py + 2.5} fill={CANVAS_COLORS.labelText} fontSize={font(7)} fontWeight="bold" textAnchor="middle">γ</text>
        </g>
      </g>
    )
  }

  return (
    <g>
      <defs>
        <radialGradient id="protonGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={withAlpha(PHYSICS_COLORS.positiveCharge, 0.6)} />
          <stop offset="40%" stopColor={PHYSICS_COLORS.positiveCharge} />
          <stop offset="85%" stopColor={PHYSICS_COLORS.forceArrowRed} />
          <stop offset="100%" stopColor={CANVAS_COLORS.dangerGradient} />
        </radialGradient>

        <radialGradient id="neutronGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor={withAlpha(PHYSICS_COLORS.negativeCharge, 0.6)} />
          <stop offset="40%" stopColor={PHYSICS_COLORS.negativeCharge} />
          <stop offset="85%" stopColor={withAlpha(PHYSICS_COLORS.appliedForce, 0.85)} />
          <stop offset="100%" stopColor={PHYSICS_COLORS.appliedForce} />
        </radialGradient>

        <radialGradient id="strongForceGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CANVAS_COLORS.referencePoint} stopOpacity="0.4" />
          <stop offset="60%" stopColor={CANVAS_COLORS.referencePoint} stopOpacity="0.1" />
          <stop offset="100%" stopColor={CANVAS_COLORS.referencePoint} stopOpacity="0" />
        </radialGradient>

        <filter id="sphereShadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      {mode === 0 && renderMode0()}
      {mode === 1 && renderMode1()}
    </g>
  )
}
