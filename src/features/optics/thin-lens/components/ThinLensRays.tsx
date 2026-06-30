import { OPTICS_COLORS, STROKE } from '@/theme/physics'

interface Point {
  x: number
  y: number
}

interface Ray {
  incident: Point[]
  refracted: Point[]
  extended: Point[]
  guide?: Point[]
}

interface ThinLensRaysProps {
  rays: {
    r1: Ray
    r2: Ray
    r3: Ray
    imgTopY: number
  } | null
  dashGuide: string
}

export function ThinLensRays({ rays, dashGuide }: ThinLensRaysProps) {
  if (!rays) return null
  return (
    <g>
      {/* 光线1 */}
      <path d={`M ${rays.r1.incident[0].x} ${rays.r1.incident[0].y} L ${rays.r1.incident[1].x} ${rays.r1.incident[1].y}`}
        stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
      {rays.r1.refracted.length > 0 && (
        <path d={'M ' + rays.r1.refracted.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
      )}
      {rays.r1.extended.length > 0 && (
        <path d={'M ' + rays.r1.extended.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray={dashGuide} opacity={0.65} />
      )}

      {/* 光线2 */}
      <path d={`M ${rays.r2.incident[0].x} ${rays.r2.incident[0].y} L ${rays.r2.incident[1].x} ${rays.r2.incident[1].y}`}
        stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
      {rays.r2.refracted.length > 0 && (
        <path d={'M ' + rays.r2.refracted.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
      )}
      {rays.r2.extended.length > 0 && (
        <path d={'M ' + rays.r2.extended.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray={dashGuide} opacity={0.65} />
      )}

      {/* 光线3 */}
      {rays.r3.incident.length > 0 && (
        <path d={'M ' + rays.r3.incident.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRay} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
      )}
      {rays.r3.refracted.length > 0 && (
        <path d={'M ' + rays.r3.refracted.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={STROKE.vectorMain} filter="url(#optics-glow)" />
      )}
      {rays.r3.extended.length > 0 && (
        <path d={'M ' + rays.r3.extended.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRayRefracted} strokeWidth={1.5} strokeDasharray={dashGuide} opacity={0.65} />
      )}
      {rays.r3.guide && rays.r3.guide.length > 0 && (
        <path d={'M ' + rays.r3.guide.map((p) => `${p.x} ${p.y}`).join(' L ')}
          stroke={OPTICS_COLORS.lightRay} strokeWidth={1.5} strokeDasharray={dashGuide} opacity={0.5} />
      )}
    </g>
  )
}
