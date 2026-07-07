import { useEffect, useMemo, useRef } from 'react'
import { calculateVelocitySelectorTrajectory } from '@/physics'
import { worldToPixel } from '@/scene'
import type { SceneScale } from '@/scene'
import { CANVAS_STYLE, PHYSICS_COLORS } from '@/theme/physics'
import { setupCanvasDPR } from '@/hooks/useCanvasDPR'
import {
  VELOCITY_SELECTOR_PHYSICS,
  type ParticleState,
  type VelocitySelectorParams,
} from '../model/velocitySelectorModel'

export function useVelocitySelectorCanvas({
  params,
  time,
  isPlaying,
  sceneScale,
  canvasSize,
}: {
  params: VelocitySelectorParams
  time: number
  isPlaying: boolean
  sceneScale: SceneScale
  canvasSize: { width: number; height: number }
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<ParticleState[]>([])
  const lastEmitTimeRef = useRef<number>(0)
  const nextParticleIdRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(time)

  const { plateLength, plateGap, mass } = VELOCITY_SELECTOR_PHYSICS

  useEffect(() => {
    if (time === 0 || time < lastTimeRef.current) {
      particlesRef.current = []
      lastEmitTimeRef.current = 0
      nextParticleIdRef.current = 0
    }
    lastTimeRef.current = time

    if (params.mode !== 1 || !isPlaying) return

    const emitInterval = 0.16
    if (time - lastEmitTimeRef.current < emitInterval) return

    const vFilter = params.B > 0.01 ? params.E / params.B : 0
    const ratios = [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6]
    const newParticles = ratios.map((r) => {
      const id = nextParticleIdRef.current++
      return {
        id,
        tEmit: time,
        v0: vFilter * r,
        q: params.qOverM,
      }
    })
    particlesRef.current = [...particlesRef.current, ...newParticles]
    lastEmitTimeRef.current = time
  }, [time, isPlaying, params.mode, params.B, params.E, params.qOverM])

  const singleParticle = useMemo(() => {
    if (params.mode !== 0) return null
    return calculateVelocitySelectorTrajectory(
      params.q,
      mass,
      params.v0,
      0,
      -params.B,
      plateLength * 3,
      plateGap * 3,
      time,
    )
  }, [params.mode, params.q, params.v0, params.B, time, mass, plateLength, plateGap])

  useEffect(() => {
    const ctx = setupCanvasDPR(canvasRef, canvasSize.width, canvasSize.height)
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    if (params.mode === 0 && singleParticle) {
      const { point } = singleParticle
      const { px, py } = worldToPixel(point.x, point.y, sceneScale)

      if (params.keepTrack && time > 0) {
        ctx.beginPath()
        ctx.lineWidth = CANVAS_STYLE.stroke.reference
        ctx.strokeStyle = PHYSICS_COLORS.trackHistory
        ctx.setLineDash([4, 3])

        for (let i = 0; i <= 80; i++) {
          const sampleTime = (time * i) / 80
          const res = calculateVelocitySelectorTrajectory(
            params.q,
            mass,
            params.v0,
            0,
            -params.B,
            plateLength * 3,
            plateGap * 3,
            sampleTime,
          )
          const { px: sx, py: sy } = worldToPixel(res.point.x, res.point.y, sceneScale)
          if (i === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.beginPath()
      ctx.arc(px, py, CANVAS_STYLE.object.pointMassRadius, 0, 2 * Math.PI)
      ctx.fillStyle = params.q >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge
      ctx.fill()
      ctx.strokeStyle = PHYSICS_COLORS.objectStroke
      ctx.lineWidth = CANVAS_STYLE.stroke.objectLine
      ctx.stroke()
      return
    }

    if (params.mode !== 1) return

    const updatedParticles: ParticleState[] = []

    particlesRef.current.forEach((particle) => {
      const particleTime = time - particle.tEmit
      if (particleTime < 0) return

      const res = calculateVelocitySelectorTrajectory(
        particle.q,
        mass,
        particle.v0,
        params.showElectricField ? -params.E : 0,
        -params.B,
        plateLength,
        plateGap,
        particleTime,
      )
      const { px, py } = worldToPixel(res.point.x, res.point.y, sceneScale)

      const isOutOfScreen = px > canvasSize.width + 100 || py < -100 || py > canvasSize.height + 100
      const isExpiredHit = res.hitsPlate && res.tHit !== null && particleTime > res.tHit + 0.3
      if (isOutOfScreen || isExpiredHit) return

      updatedParticles.push(particle)

      ctx.beginPath()
      ctx.lineWidth = 2
      ctx.strokeStyle = particle.q >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge

      let alpha = 0.45
      if (res.hitsPlate && res.tHit !== null && particleTime > res.tHit) {
        alpha = Math.max(0, 0.45 * (1 - (particleTime - res.tHit) / 0.3))
      }
      ctx.globalAlpha = alpha

      const tEndTrace = res.hitsPlate && res.tHit !== null ? Math.min(particleTime, res.tHit) : particleTime
      const tStartTrace = Math.max(0, tEndTrace - 0.25)

      for (let i = 0; i <= 10; i++) {
        const sampleTime = tStartTrace + ((tEndTrace - tStartTrace) * i) / 10
        const traceRes = calculateVelocitySelectorTrajectory(
          particle.q,
          mass,
          particle.v0,
          params.showElectricField ? -params.E : 0,
          -params.B,
          plateLength,
          plateGap,
          sampleTime,
        )
        const { px: sx, py: sy } = worldToPixel(traceRes.point.x, traceRes.point.y, sceneScale)
        if (i === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      }
      ctx.stroke()
      ctx.globalAlpha = 1.0

      ctx.beginPath()
      ctx.arc(px, py, CANVAS_STYLE.object.pointMassRadius - 1.5, 0, 2 * Math.PI)
      ctx.fillStyle = particle.q >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge

      let particleAlpha = 1.0
      if (res.hitsPlate && res.tHit !== null && particleTime > res.tHit) {
        particleAlpha = Math.max(0, 1.0 - (particleTime - res.tHit) / 0.3)
      }
      ctx.globalAlpha = particleAlpha
      ctx.fill()
      ctx.strokeStyle = PHYSICS_COLORS.objectStroke
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.globalAlpha = 1.0
    })

    particlesRef.current = updatedParticles
  }, [
    params.mode,
    params.keepTrack,
    params.q,
    params.v0,
    params.B,
    params.E,
    params.showElectricField,
    singleParticle,
    time,
    canvasSize,
    sceneScale,
    mass,
    plateLength,
    plateGap,
  ])

  return { canvasRef, singleParticle }
}
