import { useUniformAccelerationPhysics } from './useUniformAccelerationPhysics'
import { VTChart } from '@/components/Physics/VTChart'
import { useAnimationStore } from '@/stores'

export default function UniformAccelerationCenterExtra() {
  const { params, time } = useAnimationStore()
  const v0 = params.v0 ?? 0
  const a = params.a ?? 1.5

  const physics = useUniformAccelerationPhysics(v0, a, time, 100)

  return (
    <div className="h-[60%] w-full flex flex-row gap-4 mb-4">
      {/* 左侧公式面板 */}
      <div className="w-[40%] h-full bg-white rounded-xl shadow-md p-6 flex flex-col justify-center">
        <h3 className="text-lg font-bold text-neutral-800 mb-6">匀变速直线运动</h3>
        <div className="text-sm text-neutral-700 space-y-4">
          <p>初速度 v₀ = {v0} m/s</p>
          <p>加速度 a = {a} m/s²</p>
          <p>时间 t = {time.toFixed(2)} s</p>
          <p className="font-bold text-blue-700 pt-2 border-t">v = v₀ + at = {(v0 + a * time).toFixed(2)} m/s</p>
          <p className="font-bold text-green-700">s = v₀t + ½at² = {(v0 * time + 0.5 * a * Math.pow(time, 2)).toFixed(2)} m</p>
        </div>
      </div>
      {/* 右侧 V-T 图 */}
      <div className="w-[60%] h-full bg-white rounded-xl shadow-md p-2">
        <VTChart
          physics={physics}
          params={{ v0, a }}
          time={time}
        />
      </div>
    </div>
  )
}
