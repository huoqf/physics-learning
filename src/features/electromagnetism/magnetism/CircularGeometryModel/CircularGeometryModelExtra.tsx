import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { RelationChart } from '@/components/Chart'
import { Card } from '@/components/UI'
import { computeCircularGeometryOrbit, type MagBoundaryType } from '@/physics'

export default function CircularGeometryModelExtra() {
  const params = useAnimationStore((s) => s.params)
  
  const particleSign = params.particleSign ?? 1 // 1: 正电荷, -1: 负电荷
  const velocity = params.velocity ?? 3.0 // 1.0 ~ 5.0 m/s
  const angle = params.angle ?? 60 // 0° ~ 180°
  const B = params.magneticB ?? 1.0 // 0.2 ~ 2.0 T
  const boundaryType = params.boundaryType ?? 0 // 0: 单边界, 1: 矩形, 2: 圆形

  // 图表一: R-v 关系 (R = v/B)
  const rVsVPoints = useMemo(() => {
    const pts = []
    for (let vel = 1.0; vel <= 5.01; vel += 0.1) {
      pts.push({ x: vel, y: vel / B })
    }
    return pts
  }, [B])

  // 图表二: t-v 关系 (偏转时间 t 随速度 v 的响应)
  // 逐点调用与中屏、看板同一个物理函数，避免出现第三份独立实现
  const tVsVPoints = useMemo(() => {
    const pts = []
    for (let vel = 1.0; vel <= 5.01; vel += 0.1) {
      const { tOut } = computeCircularGeometryOrbit({
        particleSign,
        velocity: vel,
        angleDeg: angle,
        B,
        boundaryType: boundaryType as MagBoundaryType,
      })
      pts.push({ x: vel, y: tOut })
    }
    return pts
  }, [boundaryType, particleSign, B, angle])

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 gap-4 overflow-y-auto bg-neutral-50/20">
      {/* 图表一: R-v */}
      <Card className="flex flex-col flex-1 min-h-[220px] relative p-4 bg-white shadow-sm border border-neutral-200/60 rounded-xl">
        <h3 className="text-xs font-bold text-neutral-700 mb-1.5">轨道半径与初速度关系 (R - v)</h3>
        <div className="flex-1 min-h-0 relative">
          <RelationChart
            points={rVsVPoints}
            xDomain={[1.0, 5.0]}
            yDomain={[0, 6.0]}
            xLabel="速度 v (m/s)"
            yLabel="半径 R (m)"
            cursorX={velocity}
            cursorLabel={(_x, y) => `R = ${y.toFixed(2)}m`}
            showZeroLine={false}
          />
        </div>
      </Card>

      {/* 图表二: t-v */}
      <Card className="flex flex-col flex-1 min-h-[220px] relative p-4 bg-white shadow-sm border border-neutral-200/60 rounded-xl">
        <h3 className="text-xs font-bold text-neutral-700 mb-1.5">磁场穿过时间与初速度关系 (t - v)</h3>
        <div className="flex-1 min-h-0 relative">
          <RelationChart
            points={tVsVPoints}
            xDomain={[1.0, 5.0]}
            yDomain={[0, 8.0]}
            xLabel="速度 v (m/s)"
            yLabel="时间 t (s)"
            cursorX={velocity}
            cursorLabel={(_x, y) => `t = ${y.toFixed(2)}s`}
            showZeroLine={false}
          />
        </div>
      </Card>
    </div>
  )
}
