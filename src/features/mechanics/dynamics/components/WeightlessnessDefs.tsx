import { SCENE_COLORS } from '@/theme/physics'

export function WeightlessnessDefs() {
  return (
    <defs>
      {/* 电梯金属材质 */}
      <linearGradient id="elevator-metal-grad" x1="0" y1="0" x2="1" y2="0">
        {SCENE_COLORS.materials.sliderMetalGrad.map((color, idx) => (
          <stop
            key={`emg-${idx}`}
            offset={`${(idx / (SCENE_COLORS.materials.sliderMetalGrad.length - 1)) * 100}%`}
            stopColor={color}
          />
        ))}
      </linearGradient>

      {/* 观光电梯半透明玻璃 */}
      <linearGradient id="elevator-glass-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={SCENE_COLORS.materials.glassGrad[0]} stopOpacity="0.22" />
        <stop offset="100%" stopColor={SCENE_COLORS.materials.glassGrad[1]} stopOpacity="0.06" />
      </linearGradient>

      {/* 体重计金属底座 */}
      <linearGradient id="scale-metal-grad" x1="0" y1="0" x2="0" y2="1">
        {SCENE_COLORS.materials.sliderMetalGrad.map((color, idx) => (
          <stop
            key={`smg-${idx}`}
            offset={`${(idx / (SCENE_COLORS.materials.sliderMetalGrad.length - 1)) * 100}%`}
            stopColor={color}
          />
        ))}
      </linearGradient>

      {/* 砝码不锈钢渐变 */}
      <radialGradient id="weight-metal-grad" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
        <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
        <stop offset="85%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
        <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
      </radialGradient>
    </defs>
  )
}
